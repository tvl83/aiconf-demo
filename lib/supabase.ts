import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Thrown when the bundle was built without the Supabase env vars.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so a deploy that built before the vars
 * were set stays broken until it is rebuilt — setting them afterwards is not enough.
 * Distinct from an insert failure so the UI can say which one happened.
 */
export class MissingSupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingSupabaseConfigError';
  }
}

/**
 * Whether this bundle was built with both Supabase env vars present.
 *
 * Both names are written out in full so Next inlines them at build time — a computed
 * lookup like `process.env[name]` is not replaced and would always read as undefined
 * in the browser. Call this to render the misconfiguration up front, on page load,
 * instead of waiting for a form submit to fail.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Browser Supabase client, created lazily on first use.
 *
 * Lazy on purpose: this is a static export (`output: 'export'`), so every page is
 * prerendered at build time. Creating the client at module scope would throw during
 * `next build` whenever the env vars are absent — which is exactly the state the repo
 * is in before Vercel injects them. Deferring to first call keeps the build green and
 * moves any misconfiguration to a visible runtime error instead.
 */
export function createBrowserClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new MissingSupabaseConfigError(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set both in the Vercel project settings and redeploy.'
    );
  }

  client = createClient(url, anonKey);
  return client;
}
