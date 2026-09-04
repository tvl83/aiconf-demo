// Drives the exact insert RegistrationForm performs against a fake PostgREST
// that behaves the way the PRD's DDL + RLS policy say the real one will:
// anon may INSERT, nobody may SELECT, and the unique index on email raises
// 23505 on a repeat. Then feeds each result through the same outcome mapper the
// component uses and asserts the three user-facing strings.
//
// Run: npm test        (no credentials, no network beyond localhost)

import http from 'node:http'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import {
  MESSAGES,
  SUCCESS_LINES,
  normalizeEmail,
  outcomeFor,
} from '../lib/registration-outcome.ts'

const seen = new Set()
const requests = []
let failNext = false

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    requests.push({ method: req.method, url: req.url, prefer: req.headers.prefer, body })
    const json = (code, payload) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(payload))
    }

    // No SELECT policy exists for anon, so a read is a permission error.
    if (req.method === 'GET') {
      return json(401, { message: 'permission denied for table registrations' })
    }
    if (req.method !== 'POST') return json(405, {})

    if (failNext) {
      failNext = false
      return json(500, { code: 'XX000', message: 'internal error' })
    }

    const rows = JSON.parse(body || '[]')
    const row = Array.isArray(rows) ? rows[0] : rows
    // `email text unique` is case-SENSITIVE, so the fake compares raw strings.
    // Case folding is the client's job -- see normalizeEmail.
    const key = String(row.email)
    if (seen.has(key)) {
      return json(409, {
        code: '23505',
        message: 'duplicate key value violates unique constraint "registrations_email_key"',
      })
    }
    seen.add(key)
    return json(201, null)
  })
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const supabase = createClient(base, 'fake-anon-key-for-test', {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Mirrors exactly what RegistrationForm sends.
const register = (name, email) =>
  supabase
    .from('registrations')
    .insert({ name: name.trim(), email: normalizeEmail(email) })

let failures = 0
const check = (label, fn) => {
  try {
    fn()
    console.log(`  ok   ${label}`)
  } catch (err) {
    failures++
    console.log(`  FAIL ${label}\n       ${err.message}`)
  }
}

// 1 - first registration succeeds
const first = await register('Jane Smith', 'jane@example.com')
check('new email -> success message', () => {
  assert.equal(outcomeFor(first.error), 'success')
  assert.equal(MESSAGES.success, "You're registered! See you September 6.")
})

// 2 - same email again is a unique violation, not a generic failure
const second = await register('Jane Smith', 'jane@example.com')
check('duplicate email -> 23505 -> already-registered message', () => {
  assert.equal(second.error?.code, '23505')
  assert.equal(outcomeFor(second.error), 'duplicate')
  assert.equal(MESSAGES.duplicate, "You're already registered.")
})

// 2b - and a different-cased spelling of the same address is still a duplicate,
//      because the client lowercases before insert. The column's UNIQUE is
//      case-sensitive, so without normalizeEmail this would register twice.
const recased = await register('Jane Smith', '  JANE@Example.COM ')
check('case/whitespace variant of the same email -> duplicate', () => {
  assert.equal(outcomeFor(recased.error), 'duplicate')
})

// 3 - anything else falls through to the generic error
failNext = true
const broken = await register('Marcus Lee', 'marcus@example.com')
check('other error -> generic try-again message', () => {
  assert.notEqual(broken.error, null)
  assert.notEqual(broken.error?.code, '23505')
  assert.equal(outcomeFor(broken.error), 'error')
  assert.equal(MESSAGES.error, 'Something went wrong. Please try again.')
})

// 4 - the insert must not ask for the row back; `return=representation` would
//     trigger a SELECT that RLS denies, turning every success into an error.
check('insert does not request the inserted row back', () => {
  const posts = requests.filter((r) => r.method === 'POST')
  assert.ok(posts.length >= 3)
  for (const post of posts) {
    assert.ok(
      !String(post.prefer ?? '').includes('return=representation'),
      `insert asked for the row back: Prefer: ${post.prefer}`,
    )
  }
})

// 5 - the client never reads the table
check('client never issues a SELECT against registrations', () => {
  assert.equal(requests.filter((r) => r.method === 'GET').length, 0)
})

// 6 - the success screen line-breaks the locked string. Guards against a
//     "tidy-up" that silently rewords the PRD copy.
check('success lines rejoin to the locked string exactly', () => {
  assert.equal(
    `${SUCCESS_LINES.headline} ${SUCCESS_LINES.detail}`,
    MESSAGES.success,
  )
})

server.close()
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
