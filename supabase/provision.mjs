#!/usr/bin/env node
// AIC-3 — the whole of Track B in one command, for the moment the token lands.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node supabase/provision.mjs
//
// Creates (or reuses) the free-tier project `aiconf-demo`, runs the PRD §4 DDL,
// fetches the anon key, writes .env.local, and then runs supabase/verify.mjs so
// nothing is taken on trust. Exits non-zero if any of that fails.
//
// On the "SQL Editor, not `supabase db push`" instruction: this posts the DDL to
// the Management API's database/query endpoint, which is the same endpoint the
// dashboard SQL Editor posts to. It is not a migration push — no CLI, no
// migration history, no diffing against the remote. If you would rather paste by
// hand, run with --print-sql and copy the output into the dashboard.
//
// Safety rails:
//   - refuses to touch the production project ref
//   - never prints or stores the service_role key
//   - will not re-run the DDL over an existing table

const PROJECT_NAME = process.env.AIC_PROJECT_NAME || 'aiconf-demo';
const REGION = process.env.AIC_REGION || 'us-east-1';
const PROD_REF = 'cunsawtvsyxiqrgtlulr'; // live: 22 real registrants. Never touch.

const DDL = `create table registrations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null unique,
  created_at timestamptz not null default now()
);

alter table registrations enable row level security;

create policy "anon insert"
  on registrations
  for insert
  to anon
  with check (true);`;

if (process.argv.includes('--print-sql')) {
  console.log(DDL);
  process.exit(0);
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is not set. This is the blocker on AIC-3.');
  console.error('Get one at https://supabase.com/dashboard/account/tokens (starts sbp_).');
  process.exit(1);
}

const step = (m) => console.log(`\n→ ${m}`);
const ok = (m) => console.log(`  ok   ${m}`);
const die = (m) => { console.error(`\n✗ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mgmt(path, init = {}) {
  const res = await fetch(`https://api.supabase.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === 'string' ? body : body?.message || JSON.stringify(body);
    die(`${init.method || 'GET'} ${path} -> HTTP ${res.status}\n  ${String(msg).slice(0, 400)}`);
  }
  return body;
}

// --- 1. find or create the project ------------------------------------------
step(`Looking for an existing project named "${PROJECT_NAME}"`);
const projects = await mgmt('/v1/projects');
let project = projects.find((p) => p.name === PROJECT_NAME);

if (project) {
  ok(`found ${project.id} (${project.status}) — reusing, not creating a second one`);
} else {
  const orgs = await mgmt('/v1/organizations');
  if (!orgs.length) die('That token can see no organizations. Wrong account?');
  if (orgs.length > 1 && !process.env.AIC_ORG_ID) {
    console.log('  Multiple orgs visible:');
    for (const o of orgs) console.log(`    ${o.id}  ${o.name}`);
    die('Set AIC_ORG_ID to pick one, so this does not land in the wrong org.');
  }
  const orgId = process.env.AIC_ORG_ID || orgs[0].id;

  // Generated here and never reused elsewhere. Direct Postgres access is not
  // part of this demo; the page talks to PostgREST with the anon key.
  const dbPass = `Aic-${crypto.randomUUID()}`;

  step(`Creating free-tier project "${PROJECT_NAME}" in org ${orgId} (${REGION})`);
  project = await mgmt('/v1/projects', {
    method: 'POST',
    body: JSON.stringify({ name: PROJECT_NAME, organization_id: orgId, region: REGION, db_pass: dbPass, plan: 'free' }),
  });
  ok(`created ${project.id}`);
  console.log('  (db password was generated and not persisted — the page does not need it)');
}

const REF = project.id;
if (REF === PROD_REF) die(`Refusing to continue: ${REF} is the PRODUCTION project. Nothing was changed.`);

// --- 2. wait for it to come up ----------------------------------------------
if (project.status !== 'ACTIVE_HEALTHY') {
  step('Waiting for the project to become ACTIVE_HEALTHY (new projects take ~2 min)');
  const deadline = Date.now() + 8 * 60 * 1000;
  let status = project.status;
  while (Date.now() < deadline) {
    await sleep(5000);
    const p = await mgmt(`/v1/projects/${REF}`);
    if (p.status !== status) { status = p.status; console.log(`  ${status}`); }
    if (status === 'ACTIVE_HEALTHY') break;
    if (/FAILED|REMOVED/.test(status)) die(`Project entered ${status}. Check the dashboard.`);
  }
  if (status !== 'ACTIVE_HEALTHY') die(`Still ${status} after 8 minutes. Check the dashboard.`);
}
ok('project is ACTIVE_HEALTHY');

const query = (sql) =>
  mgmt(`/v1/projects/${REF}/database/query`, { method: 'POST', body: JSON.stringify({ query: sql }) });

// --- 3. the DDL, once --------------------------------------------------------
step('Checking whether the registrations table already exists');
const [{ reg }] = await query(`select to_regclass('public.registrations')::text as reg;`);
if (reg) {
  ok('registrations already exists — skipping the DDL rather than erroring on it');
} else {
  step('Running the PRD §4 DDL verbatim');
  await query(DDL);
  ok('table created, RLS enabled, "anon insert" policy applied');
}

// --- 4. confirm the shape server-side, not from memory -----------------------
step('Reading back the schema and policies from the catalog');
const cols = await query(
  `select column_name, data_type, is_nullable, column_default
     from information_schema.columns
    where table_schema='public' and table_name='registrations'
    order by ordinal_position;`);
console.table(cols);

const [{ rls }] = await query(
  `select relrowsecurity as rls from pg_class where oid='public.registrations'::regclass;`);
const policies = await query(
  `select policyname, cmd, roles::text from pg_policies
    where schemaname='public' and tablename='registrations';`);
console.table(policies);

if (!rls) die('Row level security is OFF on registrations. The table is wide open. Fix before stage.');
ok('RLS is enabled');
if (policies.some((p) => p.cmd === 'SELECT')) {
  die('There is a SELECT policy on registrations. That leaks every attendee email. Drop it.');
}
ok('no SELECT policy exists — reads are denied by absence, which is the control');

// --- 5. the anon key, and only the anon key ---------------------------------
step('Fetching the anon/publishable key');
const keys = await mgmt(`/v1/projects/${REF}/api-keys?reveal=true`);
const isSecret = (k) => k.name === 'service_role' || k.type === 'secret' || /^sb_secret_/.test(k.api_key || '');
const anon = keys.find((k) => !isSecret(k) && (k.name === 'anon' || k.type === 'publishable'));
if (!anon) die(`No anon/publishable key found. Keys visible: ${keys.map((k) => k.name || k.type).join(', ')}`);
ok(`using the "${anon.name || anon.type}" key (service_role deliberately never read into a variable)`);

const URL_ = `https://${REF}.supabase.co`;

// --- 6. write .env.local (gitignored) ---------------------------------------
const { writeFileSync } = await import('node:fs');
const envPath = new URL('../.env.local', import.meta.url);
writeFileSync(envPath, `NEXT_PUBLIC_SUPABASE_URL=${URL_}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon.api_key}\n`);
step('Wrote .env.local (gitignored) with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');

// --- 7. prove it, do not assume it ------------------------------------------
step('Running supabase/verify.mjs against the real project');
const { spawnSync } = await import('node:child_process');
const v = spawnSync(process.execPath, [new URL('./verify.mjs', import.meta.url).pathname], {
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_URL: URL_, SUPABASE_ANON_KEY: anon.api_key },
});

console.log(`\nProject URL:  ${URL_}`);
console.log(`Project ref:  ${REF}`);
console.log('Anon key:     in .env.local — register it with POST /api/agents/me/secret-proposals, never paste it into a comment.');
console.log('\nFounder\'s on-stage view (paste into the SQL Editor — runs as owner, so RLS does not hide the rows):');
console.log('  select name, email, created_at from registrations order by created_at desc;');

if (v.status !== 0) die('verify.mjs failed. Do not go on stage until it is green.');
console.log('\n✓ aiconf-demo is provisioned and verified.');
