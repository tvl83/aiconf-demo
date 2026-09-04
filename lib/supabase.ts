import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Both values are public by design -- they are inlined into the browser bundle,
// which is what the NEXT_PUBLIC_ prefix means. The security boundary is the RLS
// policy on `registrations` (anon may INSERT, nobody may SELECT), not the
// secrecy of these strings. The service_role key plays no part in this app; if
// it ever appears here, something has gone wrong.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * NEXT_PUBLIC_* values are inlined at build time, not read at runtime, so this
 * reflects what was set when `next build` ran -- not the deploy target's
 * current env. Changing the vars requires a rebuild.
 */
export const isConfigured = Boolean(url && anonKey);

// Created lazily so a missing env var surfaces as a readable message on screen
// instead of a blank page from a module-load throw.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/**
 * Postgres unique_violation. The RLS policy grants anon INSERT only -- there is
 * no SELECT policy, so the client cannot pre-check whether an email exists. A
 * repeat registration is detected from the insert error code instead.
 */
export const DUPLICATE_EMAIL = "23505";

/** The table the PRD's DDL creates. Not `signups`. */
export const REGISTRATIONS_TABLE = "registrations";
