#!/usr/bin/env node
// AIC-3 — proves the data layer behaves, against the real project.
// No dependencies; plain fetch against PostgREST.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=... node supabase/verify.mjs
//
// Use the anon/publishable key. The service_role key would bypass RLS and make
// every check below pass for the wrong reason.
//
// Exits 0 only if every check passes. Exit 1 means do not go on stage.

const URL_ = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const ANON = process.env.SUPABASE_ANON_KEY;
const TABLE = 'registrations';

if (!URL_ || !ANON) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (anon/publishable key — never the service_role key).');
  process.exit(1);
}
if (/service_role/.test(ANON) || /^sb_secret_/.test(ANON)) {
  console.error('That looks like a service_role/secret key. It bypasses RLS, so these checks would prove nothing. Use the anon key.');
  process.exit(1);
}

const rest = (path, init = {}) =>
  fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

// Sentinel address so the check is self-identifying and never collides with a
// real attendee. Timestamped so reruns don't trip the unique constraint.
const sentinel = `aic-verify+${Date.now()}@example.com`;
const row = { name: 'AIC Verify', email: sentinel };

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n        ${detail}` : ''}`);
};

// 1. Anonymous INSERT must succeed.
//    Note: no `Prefer: return=representation`. Asking for the row back makes
//    PostgREST read it, and there is no SELECT policy — so the insert fails.
//    Same trap as chaining .select() onto .insert() in supabase-js. Don't.
//    `name` is included because the PRD makes it NOT NULL; omitting it fails
//    with 23502, not 23505.
const ins = await rest(TABLE, { method: 'POST', body: JSON.stringify(row) });
const insBody = await ins.text();
check('anonymous INSERT is allowed', ins.status === 201, `HTTP ${ins.status} ${insBody.slice(0, 200)}`);

// 2. Anonymous SELECT must be denied.
//    Filtered on the row we just wrote, so an empty result cannot be explained
//    away by the table being empty. That row definitely exists.
const sel = await rest(`${TABLE}?select=*&email=eq.${encodeURIComponent(sentinel)}`);
const selBody = await sel.text();
let leaked = 0;
try { const j = JSON.parse(selBody); leaked = Array.isArray(j) ? j.length : 0; } catch { /* error body, not rows */ }
check('anonymous SELECT returns no rows', leaked === 0,
  `HTTP ${sel.status} ${selBody.slice(0, 200)}` +
  (sel.status === 200 && leaked === 0
    ? '\n        (empty 200 = RLS denied it. Protected, but quietly. See the revoke note in the migration.)'
    : ''));

// 3. Belt and braces: an unfiltered read must not return the attendee list.
const dump = await rest(`${TABLE}?select=email`);
const dumpBody = await dump.text();
let dumpRows = 0;
try { const j = JSON.parse(dumpBody); dumpRows = Array.isArray(j) ? j.length : 0; } catch { /* denied */ }
check('attendee list is not dumpable', dumpRows === 0, `HTTP ${dump.status}, ${dumpRows} rows returned`);

// 4. Double-submit must not create a junk row. The demo's second-best moment
//    depends on this being exactly 23505 (unique_violation), which PostgREST
//    surfaces as HTTP 409 with the code in the JSON body. supabase-js exposes
//    it as error.code, which is what the page branches on.
const dupe = await rest(TABLE, { method: 'POST', body: JSON.stringify(row) });
const dupeBody = await dupe.text();
let dupeCode = null;
try { dupeCode = JSON.parse(dupeBody).code; } catch { /* not json */ }
check('duplicate email is rejected with 23505', dupe.status === 409 && dupeCode === '23505',
  `HTTP ${dupe.status}, code ${dupeCode ?? '(none)'} ${dupeBody.slice(0, 200)}`);

// Checks 5 and 6 need care. With the verbatim DDL there is no DELETE or UPDATE
// policy, so RLS makes zero rows visible to modify -- and PostgREST reports
// "successfully modified nothing" as HTTP 204. A 204 therefore does NOT mean
// the write landed, and asserting `status !== 204` would fail on a table that
// is in fact perfectly safe. Nor can we read the row back to check: that is the
// whole point of the policy set.
//
// So prove SURVIVAL through the one channel anon does have -- the unique
// constraint. If the sentinel row still exists, re-inserting its email still
// collides with 23505. If a tamper had actually landed, it would not.

// 5. Anonymous DELETE must not remove the row.
const del = await rest(`${TABLE}?email=eq.${encodeURIComponent(sentinel)}`, { method: 'DELETE' });
const afterDel = await rest(TABLE, { method: 'POST', body: JSON.stringify(row) });
let afterDelCode = null;
try { afterDelCode = JSON.parse(await afterDel.text()).code; } catch { /* not json */ }
check('anonymous DELETE does not remove the row', afterDelCode === '23505',
  `DELETE returned HTTP ${del.status}; re-insert then gave HTTP ${afterDel.status} code ${afterDelCode ?? '(none)'}` +
  (afterDelCode === '23505'
    ? ' -> row survived, so the delete affected 0 rows'
    : ' -> the row is GONE. Anon can wipe the attendee list.'));

// 6. Anonymous UPDATE must not alter the row. Tamper with `email` specifically,
//    because a changed email is detectable: the collision would disappear.
const upd = await rest(`${TABLE}?email=eq.${encodeURIComponent(sentinel)}`, {
  method: 'PATCH', body: JSON.stringify({ email: `tampered+${Date.now()}@example.com` }),
});
const afterUpd = await rest(TABLE, { method: 'POST', body: JSON.stringify(row) });
let afterUpdCode = null;
try { afterUpdCode = JSON.parse(await afterUpd.text()).code; } catch { /* not json */ }
check('anonymous UPDATE does not alter the row', afterUpdCode === '23505',
  `PATCH returned HTTP ${upd.status}; re-insert then gave HTTP ${afterUpd.status} code ${afterUpdCode ?? '(none)'}` +
  (afterUpdCode === '23505'
    ? ' -> email unchanged, so the update affected 0 rows'
    : ' -> the row was MODIFIED. Anon can tamper with registrations.'));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('DO NOT SHIP: ' + failed.map((r) => r.name).join(', '));
  process.exit(1);
}
console.log(`Data layer verified. Sentinel row written: ${sentinel}`);
console.log(`Confirm it landed in the dashboard: Table Editor → ${TABLE}.`);
console.log('Then delete the sentinel from the dashboard before the founder shows the table on stage.');
