// Drives the exported page in a real browser against the Supabase Engineer's
// fake PostgREST, which enforces exactly what the PRD DDL + RLS policy enforce.
// Proves the three outcome branches on the rendered UI, not just in the client.
//
// Needs Playwright and a Chromium binary. Skips cleanly when either is absent,
// so it never becomes the reason a build goes red -- test/registration-contract
// .test.mjs is the check that must always run.
//
// Usage: node test/e2e.mjs <exported-dir> <screenshot-dir> <api-port>
//   The app must have been built with NEXT_PUBLIC_SUPABASE_URL pointing at
//   http://127.0.0.1:<api-port>, because NEXT_PUBLIC_* is inlined at build time.

let chromium, executablePath
try {
  ;({ chromium } = await import('playwright'))
} catch {
  try {
    const mod = await import(
      '/app/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.js'
    )
    chromium = (mod.default ?? mod).chromium
  } catch {
    console.log('skip: playwright not installed')
    process.exit(0)
  }
}
for (const candidate of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
  if (fsSync.existsSync(candidate)) { executablePath = candidate; break }
}
if (!executablePath) { console.log('skip: no chromium binary'); process.exit(0) }
import http from 'node:http'
import fs from 'node:fs'
import fsSync from 'node:fs'
import path from 'node:path'
import { createFake } from '../supabase/fake-postgrest.mjs'

const root = process.argv[2], outDir = process.argv[3], apiPort = Number(process.argv[4])

// The Supabase Engineer's fake, fronted with CORS so a real browser on a
// different origin can talk to it.
const { server: fake, rows } = createFake()
const handler = fake.listeners('request')[0]
const api = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  handler(req, res)
})
await new Promise(r => api.listen(apiPort, '127.0.0.1', r))

const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.ico':'image/x-icon', '.txt':'text/plain' }
const site = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p.endsWith('/')) p += 'index.html'
  const f = path.join(root, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope') }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] ?? 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
await new Promise(r => site.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${site.address().port}/`

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
page.on('pageerror', e => errs.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })

const fail = []
const check = (label, cond, extra='') => {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`)
  if (!cond) fail.push(label)
}

await page.goto(base, { waitUntil: 'networkidle' })
check('no not-configured banner when env vars are set',
  !(await page.content()).includes('not configured'))
await page.screenshot({ path: path.join(outDir, 'p-fold.png') })

// --- success ---------------------------------------------------------------
await page.fill('#name', 'Jane Smith')
await page.fill('#email', 'Jane@Example.com')
await page.click('.btn-register')
await page.waitForSelector('.success', { timeout: 5000 })
const successText = (await page.locator('.success h2').innerText()) + ' ' + (await page.locator('.success p').first().innerText())
check('success screen shows the locked string',
  successText === "You're registered! See you September 6.", JSON.stringify(successText))
check('row landed with lowercased email and trimmed name',
  rows.length === 1 && rows[0].email === 'jane@example.com' && rows[0].name === 'Jane Smith',
  JSON.stringify(rows))
check('focus moved to the success headline',
  await page.evaluate(() => document.activeElement?.tagName) === 'H2')
await page.screenshot({ path: path.join(outDir, 'p-success.png') })

// --- duplicate (via the reset button, as a presenter would) ------------------
await page.click('.btn-reset')
await page.fill('#name', 'Jane Smith')
await page.fill('#email', 'jane@example.com')
await page.click('.btn-register')
await page.waitForTimeout(600)
const dupText = await page.locator('form .msg[role=alert]').innerText()
check('duplicate email shows the locked duplicate string',
  dupText.trim() === "✕ You're already registered.", JSON.stringify(dupText))
check('no second row was written', rows.length === 1)
check('form is still on screen (not the success card)',
  await page.locator('.btn-register').isVisible())
await page.screenshot({ path: path.join(outDir, 'p-duplicate.png') })

// --- other error ------------------------------------------------------------
await page.fill('#email', 'someone@example.com')
api.close()                       // API unreachable -> generic branch
await page.click('.btn-register')
await page.waitForTimeout(1500)
const errText = await page.locator('form .msg[role=alert]').innerText()
check('unreachable API shows the generic error string',
  errText.trim() === '✕ Something went wrong. Please try again.', JSON.stringify(errText))
await page.screenshot({ path: path.join(outDir, 'p-error.png') })

// --- agenda rule is continuous ---------------------------------------------
const ruleWidths = await page.evaluate(() =>
  [...document.querySelectorAll('.agenda-row')].map(r => Math.round(r.getBoundingClientRect().width)))
check('agenda rules span the full row', new Set(ruleWidths).size === 1, ruleWidths.join(','))

await page.screenshot({ path: path.join(outDir, 'p-full.png'), fullPage: true })
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mob.goto(base, { waitUntil: 'networkidle' })
await mob.screenshot({ path: path.join(outDir, 'p-mobile.png'), fullPage: true })

console.log('page errors:', errs.length ? errs : 'none')
await browser.close(); site.close(); try { api.close() } catch {}
console.log(fail.length ? `\n${fail.length} FAILED` : '\nall e2e checks passed')
process.exit(fail.length ? 1 : 0)
