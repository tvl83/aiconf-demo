#!/usr/bin/env node
// Proves supabase/verify.mjs is correct, with no Supabase project and no
// credential. Run it any time:
//
//   node supabase/selftest.mjs
//
// Two passes:
//   1. SAFE   — a table matching the PRD §4 DDL exactly. verify.mjs must pass.
//   2. LEAKY  — the same table with a permissive SELECT policy and write
//               policies, i.e. the mistake this task exists to prevent.
//               verify.mjs must FAIL, and must fail on the read checks.
//
// Pass 2 is the important one. A suite that cannot fail proves nothing, and
// "anonymous read is denied" is the check the founder is trusting.
//
// What this DOES prove: the verifier's assertions, and that the PRD DDL
// produces the behaviour the page depends on (201 insert, no readable rows,
// 23505 on duplicate).
// What this does NOT prove: that a real aiconf-demo project exists, or that the
// migration was applied to it. Only verify.mjs against real credentials shows
// that.
import { spawn } from 'node:child_process';
import { createFake } from './fake-postgrest.mjs';

async function runVerifier({ leaky, label }) {
  const marker = `selftest-${process.pid}-${label}`;
  const { server } = createFake({ marker, leaky });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;

  // Guard against the exact mistake that produced a false green earlier: a
  // green run against somebody else's server on a guessed port. The demo
  // fallback server (AIC-5) speaks this same shape on :54321.
  const who = await fetch(`${url}/__whoami`).then((r) => r.json()).catch(() => ({}));
  if (who.marker !== marker) {
    server.close();
    throw new Error(`Wrong server: marker ${who.marker}, expected ${marker}`);
  }

  const child = spawn(process.execPath, [new URL('./verify.mjs', import.meta.url).pathname], {
    env: { ...process.env, SUPABASE_URL: url, SUPABASE_ANON_KEY: 'fake-anon-key' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (c) => (out += c));
  child.stderr.on('data', (c) => (out += c));
  const code = await new Promise((r) => child.on('close', r));
  server.close();
  return { code, out, url, marker };
}

const results = [];
const expect = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'BAD '} ${name}${detail ? ` — ${detail}` : ''}`);
};

// ---- Pass 1: the table as the PRD specifies it. Must pass. -----------------
console.log('=== pass 1: SAFE table (PRD §4 DDL verbatim) ===');
const safe = await runVerifier({ leaky: false, label: 'safe' });
console.log(safe.out.trimEnd() + '\n');
console.log(`(marker verified: ${safe.marker})`);
expect('verifier exited 0', safe.code === 0);
expect('all checks reported passed', /\b(\d+)\/\1 checks passed\./.test(safe.out));
expect('no FAIL lines', !/^FAIL/m.test(safe.out));
expect('duplicate check asserted 23505', /PASS {2}duplicate email is rejected with 23505/.test(safe.out));
expect('insert check passed', /PASS {2}anonymous INSERT is allowed/.test(safe.out));
expect('row survived the delete attempt', /PASS {2}anonymous DELETE does not remove the row/.test(safe.out));
expect('row survived the update attempt', /PASS {2}anonymous UPDATE does not alter the row/.test(safe.out));

// ---- Pass 2: a leaky table. Must fail, and for the right reason. -----------
console.log('\n=== pass 2: LEAKY table (permissive SELECT + write policies) ===');
const leaky = await runVerifier({ leaky: true, label: 'leaky' });
console.log(leaky.out.trimEnd() + '\n');
expect('verifier exited non-zero on a leaky table', leaky.code !== 0);
expect('caught the readable row', /FAIL {2}anonymous SELECT returns no rows/.test(leaky.out));
expect('caught the dumpable list', /FAIL {2}attendee list is not dumpable/.test(leaky.out));
expect('caught the successful delete', /FAIL {2}anonymous DELETE does not remove the row/.test(leaky.out));
expect('said DO NOT SHIP', /DO NOT SHIP/.test(leaky.out));

const bad = results.filter((r) => !r).length;
console.log(`\n--- selftest: ${results.length - bad}/${results.length} ---`);
if (bad) {
  console.log('verify.mjs is not trustworthy yet. Fix it before pointing it at the real project.');
  process.exit(1);
}
console.log('verify.mjs passes a correct table and fails a leaky one. It is trustworthy.');
console.log('Still required before stage: run it against the real aiconf-demo project.');
