#!/usr/bin/env node
// A stand-in for PostgREST that enforces exactly what the PRD §4 DDL enforces,
// and nothing more. Its only job is to prove supabase/verify.mjs is correct
// before a real project exists — so the moment credentials land, verifying is
// mechanical rather than exploratory.
//
// Run supabase/selftest.mjs to use it. Do not point verify.mjs at a
// hand-typed port: the demo fallback server (AIC-5) also speaks this shape on
// :54321, and a green run against the wrong server proves nothing. selftest
// binds port 0 and checks a per-process marker to make that mistake impossible.
//
// Modelled on the verbatim DDL:
//   - name NOT NULL           -> 23502 on omission
//   - email NOT NULL UNIQUE   -> 23505 (HTTP 409) on repeat, case-SENSITIVE
//   - RLS on, "anon insert" policy only
//       -> INSERT allowed (201)
//       -> SELECT matches no policy -> 200 with [] (Supabase's default grants
//          are still in place, so it is a quiet deny, not a 401)
//       -> UPDATE / DELETE match no policy -> 0 rows affected, 204
//
// The 200-[] and 204-on-zero-rows behaviours are the honest, least favourable
// reading: they are what an unhardened table does. verify.mjs has to call those
// cases correctly, so this is the version worth testing against.
import http from 'node:http';

// `leaky: true` models the mistake this whole task exists to prevent: someone
// adds a permissive SELECT policy (or forgets to enable RLS), and the attendee
// list becomes world-readable. selftest.mjs runs against this variant too, to
// confirm verify.mjs actually FAILS on it. Checks that cannot fail prove nothing.
export function createFake({ marker = 'fake-postgrest', leaky = false } = {}) {
  const rows = [];
  const emails = new Set();

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const json = (code, obj) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(obj === undefined ? '' : JSON.stringify(obj));
      };
      const url = new URL(req.url, 'http://x');

      // Identity probe, so a caller can prove it is talking to THIS process.
      if (url.pathname === '/__whoami') return json(200, { marker });

      if (!url.pathname.startsWith('/rest/v1/registrations')) return json(404, { message: 'no such table' });

      if (req.method === 'GET') {
        // No SELECT policy -> RLS filters every row out. Empty array, HTTP 200.
        if (!leaky) return json(200, []);
        // Leaky variant: a permissive SELECT policy exists, so anon reads the
        // whole table (honouring the ?email=eq. filter, as PostgREST would).
        const want = url.searchParams.get('email')?.replace(/^eq\./, '');
        return json(200, want ? rows.filter((r) => r.email === want) : rows);
      }
      if (req.method === 'DELETE' || req.method === 'PATCH') {
        if (leaky) {
          // Leaky variant also grants write policies, so the tamper lands.
          const want = url.searchParams.get('email')?.replace(/^eq\./, '');
          const hit = rows.findIndex((r) => r.email === want);
          if (hit !== -1) {
            if (req.method === 'DELETE') {
              emails.delete(rows[hit].email);
              rows.splice(hit, 1);
            } else {
              const patch = JSON.parse(body || '{}');
              if (patch.email) { emails.delete(rows[hit].email); emails.add(patch.email); }
              Object.assign(rows[hit], patch);
            }
          }
          res.writeHead(204);
          return res.end();
        }
        // No policy -> zero rows visible to modify. PostgREST reports success
        // over an empty set.
        res.writeHead(204);
        return res.end();
      }
      if (req.method !== 'POST') return json(405, {});

      const payload = JSON.parse(body || '{}');
      const row = Array.isArray(payload) ? payload[0] : payload;

      if (row.name === undefined || row.name === null) {
        return json(400, {
          code: '23502',
          message: 'null value in column "name" of relation "registrations" violates not-null constraint',
        });
      }
      if (row.email === undefined || row.email === null) {
        return json(400, { code: '23502', message: 'null value in column "email" violates not-null constraint' });
      }
      if (emails.has(row.email)) {
        return json(409, {
          code: '23505',
          message: 'duplicate key value violates unique constraint "registrations_email_key"',
        });
      }
      emails.add(row.email);
      rows.push({ id: `uuid-${rows.length + 1}`, ...row, created_at: new Date().toISOString() });

      // Default Prefer is return=minimal -> 201 with an empty body. If the
      // caller had asked for the representation, RLS would deny the read behind
      // it — which is the .select()-on-.insert() trap.
      if (String(req.headers.prefer || '').includes('return=representation')) {
        return json(401, { code: '42501', message: 'permission denied for table registrations' });
      }
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end('');
    });
  });

  return { server, rows };
}

// Direct invocation: bind port 0 and print the URL.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { server } = createFake();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  console.log(`http://127.0.0.1:${server.address().port}`);
}
