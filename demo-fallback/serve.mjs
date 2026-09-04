#!/usr/bin/env node
// AIC-5 — offline demo fallback server. Demo Producer owns this file.
//
// Zero dependencies, zero network. `node demo-fallback/serve.mjs` and the whole
// demo runs on a laptop with the wifi switched off. It does three jobs:
//
//   1. GET  /                  the registration page, PRD-exact, self-contained
//   2. GET  /db                a Supabase-dashboard-shaped view of the rows
//   3. POST /rest/v1/:table    a PostgREST-compatible stub, so the REAL Next
//                              app can run against it offline by pointing
//                              NEXT_PUBLIC_SUPABASE_URL at http://localhost:54321
//
// (3) is why this is not just a mock page: with it, `next dev` exercises the
// actual @supabase/supabase-js code path -- real insert, real 23505 duplicate,
// real RLS-denied read -- with no Supabase project in existence.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const STORE = path.join(HERE, '.rows.json')
const PORT = Number(process.env.FALLBACK_PORT || 54321)

// ---------------------------------------------------------------- the "table"
// Persisted to disk so restarting the server mid-demo does not lose the row the
// founder just created on stage. `--reset` clears it; do that before you go on.
let rows = []
try {
  if (!process.argv.includes('--reset')) rows = JSON.parse(fs.readFileSync(STORE, 'utf8'))
} catch {
  rows = []
}
if (process.argv.includes('--reset')) save()

function save() {
  try {
    fs.writeFileSync(STORE, JSON.stringify(rows, null, 2))
  } catch {
    /* read-only disk is not a reason to fail the demo */
  }
}

let counter = 0
function uuid() {
  // Not cryptographic. It only has to look like a uuid on a projector.
  const hex = (n) => (counter++ + n * 0x9e3779b1).toString(16).padStart(8, '0').slice(-8)
  return `${hex(1)}-${hex(2).slice(0, 4)}-4${hex(3).slice(0, 3)}-a${hex(4).slice(0, 3)}-${hex(5)}${hex(6).slice(0, 4)}`
}

// The unique constraint the demo depends on. Case-insensitive on purpose:
// "Thomas@x.com" and "thomas@x.com" are the same person, and the second submit
// must land on the "already registered" branch, not create a junk row.
function findDuplicate(email) {
  const key = String(email || '').trim().toLowerCase()
  return rows.find((r) => String(r.email || '').toLowerCase() === key)
}

function insert(table, body) {
  const records = Array.isArray(body) ? body : [body]
  for (const rec of records) {
    if (findDuplicate(rec.email)) {
      return {
        status: 409,
        payload: {
          code: '23505',
          details: `Key (lower(email))=(${String(rec.email).toLowerCase()}) already exists.`,
          hint: null,
          message: `duplicate key value violates unique constraint "${table}_email_key"`,
        },
      }
    }
    rows.push({
      id: uuid(),
      name: rec.name ?? null,
      email: rec.email,
      created_at: new Date().toISOString(),
      _table: table,
    })
  }
  save()
  return { status: 201, payload: null }
}

// ------------------------------------------------------------------- plumbing
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PATCH,DELETE',
  'Access-Control-Expose-Headers': '*',
}

function send(res, status, body, type = 'application/json', extra = {}) {
  const payload = type === 'application/json' ? (body === null ? '' : JSON.stringify(body)) : body
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...CORS, ...extra })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || 'null'))
      } catch {
        resolve(null)
      }
    })
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const p = url.pathname

  if (req.method === 'OPTIONS') return send(res, 204, null)

  // --- PostgREST stub -------------------------------------------------------
  const rest = p.match(/^\/rest\/v1\/([A-Za-z0-9_]+)$/)
  if (rest) {
    const table = rest[1]
    if (req.method === 'POST') {
      const { status, payload } = insert(table, await readBody(req))
      log(status === 201 ? `INSERT ${table} -> 201` : `INSERT ${table} -> 409 duplicate (23505)`)
      return send(res, status, payload)
    }
    // No SELECT policy exists on the real table, so anon reads are denied.
    // The stub denies them too -- otherwise the fallback would quietly prove
    // something the production table does not do.
    log(`SELECT ${table} -> 401 (RLS: no select policy)`)
    return send(res, 401, {
      code: '42501',
      message: `permission denied for table ${table}`,
      hint: null,
      details: null,
    })
  }

  // --- founder's on-stage table view ---------------------------------------
  // Equivalent of running the SELECT in the Supabase SQL editor, which runs as
  // the table owner and therefore bypasses RLS.
  if (p === '/admin/rows') return send(res, 200, rows)
  if (p === '/admin/reset' && req.method === 'POST') {
    rows = []
    save()
    log('table truncated')
    return send(res, 200, { ok: true })
  }

  // --- pages ----------------------------------------------------------------
  if (p === '/' || p === '/index.html') return file(res, 'offline.html', 'text/html')
  if (p === '/db') return file(res, 'db.html', 'text/html')
  if (p === '/recording' || p === '/recording/') return file(res, 'recording/index.html', 'text/html')
  if (p.startsWith('/recording/')) {
    const name = path.basename(p)
    const type = name.endsWith('.gif') ? 'image/gif' : name.endsWith('.png') ? 'image/png' : 'text/html'
    return file(res, path.join('recording', name), type)
  }

  send(res, 404, { error: 'not found' })
})

function file(res, rel, type) {
  const full = path.join(HERE, rel)
  fs.readFile(full, (err, buf) => {
    if (err) return send(res, 404, { error: `missing ${rel}` })
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', ...CORS })
    res.end(buf)
  })
}

function log(msg) {
  const t = new Date().toISOString().slice(11, 19)
  process.stdout.write(`  ${t}  ${msg}\n`)
}

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(
    [
      '',
      '  AI Conf 2025 — offline demo fallback',
      '  ────────────────────────────────────────────────',
      `  Registration page   http://localhost:${PORT}/`,
      `  Database view       http://localhost:${PORT}/db`,
      `  Recording           http://localhost:${PORT}/recording`,
      '',
      `  Supabase stub       http://localhost:${PORT}  (point NEXT_PUBLIC_SUPABASE_URL here)`,
      `  Rows on disk        ${rows.length} loaded`,
      '',
      '  No internet required. Ctrl-C to stop.',
      '',
    ].join('\n')
  )
})
