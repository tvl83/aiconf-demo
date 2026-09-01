'use client';

import { useState, type FormEvent } from 'react';
import {
  createBrowserClient,
  isSupabaseConfigured,
  MissingSupabaseConfigError,
} from '../lib/supabase';

/** Postgres unique_violation — the email column has a unique constraint. */
const UNIQUE_VIOLATION = '23505';

type Status = 'idle' | 'submitting' | 'registered';

export default function RegistrationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus('submitting');

    try {
      const supabase = createBrowserClient();
      const { error: insertError } = await supabase
        .from('registrations')
        .insert({ name: name.trim(), email: email.trim() });

      if (!insertError) {
        setStatus('registered');
        return;
      }

      setStatus('idle');
      setError(
        insertError.code === UNIQUE_VIOLATION
          ? "You're already registered."
          : 'Something went wrong. Please try again.'
      );
    } catch (err) {
      setStatus('idle');
      setError(
        err instanceof MissingSupabaseConfigError
          ? 'This build is missing its Supabase keys — set them in Vercel and redeploy.'
          : 'Something went wrong. Please try again.'
      );
    }
  }

  // Build-time constant, so this renders into the prerendered HTML: an unconfigured
  // deploy is obvious on page open rather than only when someone submits the form.
  // Vercel still reports a green build — the page just says so out loud.
  if (!isSupabaseConfigured()) {
    return (
      <section id="register" className="mx-auto max-w-md px-6 py-16">
        <div
          role="alert"
          className="rounded-lg border border-amber-500/60 bg-amber-950/40 p-8 text-amber-200"
        >
          <h2 className="text-2xl font-bold tracking-tight text-amber-100">
            Registration is not configured
          </h2>
          <p className="mt-3 text-sm">
            This build went out without <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Set both in the Vercel project and
            trigger a <strong>rebuild</strong> — a static export bakes them in at build time,
            so a rollback or re-alias will keep serving this same broken bundle.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8">
        {status === 'registered' ? (
          <p className="text-center text-lg font-semibold text-white">
            You&apos;re registered! See you September 6.
          </p>
        ) : (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-white">Register</h2>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-gray-300">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-rose-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="mt-2 rounded-md bg-indigo-500 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'submitting' ? 'Registering…' : 'Register'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
