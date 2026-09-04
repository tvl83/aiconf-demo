// Scan git-tracked files for real secret VALUES before a push.
//
//   node secret-scan.mjs          # exits 1 if anything is found
//
// Deliberately does not grep for the word "service_role": this repo is full of
// code whose job is to reject service_role keys, and matching the word flags
// the guards instead of the secret. It matches shapes that only a live
// credential has — a JWT whose payload really says role=service_role, or an
// sb_secret_ key with an actual key body after the prefix.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files', '-z'], { maxBuffer: 64 << 20 })
  .toString()
  .split('\0')
  .filter((p) => p && !p.startsWith('node_modules/'));

const JWT = /eyJ[A-Za-z0-9_-]{8,}\.([A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g;
const SB_SECRET = /sb_secret_[A-Za-z0-9_-]{8,}/g;
const PLACEHOLDER = /^(x{3,}|\.\.\.|<[^>]+>)$/i;

const findings = [];

for (const file of tracked) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // binary or unreadable — nothing to leak in a PNG
  }
  if (text.includes('\0')) continue;

  for (const m of text.matchAll(JWT)) {
    let role = null;
    try {
      role = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role;
    } catch {
      continue; // not a real JWT payload
    }
    if (role === 'service_role') {
      findings.push({ file, line: lineOf(text, m.index), why: 'JWT with role=service_role' });
    } else if (role) {
      findings.push({ file, line: lineOf(text, m.index), why: `JWT with role=${role} (key committed)` });
    }
  }

  for (const m of text.matchAll(SB_SECRET)) {
    const body = m[0].slice('sb_secret_'.length);
    if (PLACEHOLDER.test(body)) continue;
    findings.push({ file, line: lineOf(text, m.index), why: 'sb_secret_ key value' });
  }
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

if (findings.length) {
  console.error('Secret-shaped values in tracked files:\n');
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.why}`);
  console.error('\nRemove them and rewrite history before pushing.');
  process.exit(1);
}

console.log(`clean — ${tracked.length} tracked files, no credential values`);
