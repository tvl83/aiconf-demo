import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

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
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set both in the Vercel project settings and redeploy.'
    );
  }

  client = createClient(url, anonKey);
  return client;
}
