'use client';

import { useEffect, useRef, useState } from "react";
import { getSupabase, isConfigured, REGISTRATIONS_TABLE } from "@/lib/supabase";
import {
  MESSAGES,
  SUCCESS_LINES,
  normalizeEmail,
  outcomeFor,
  type Outcome,
} from "@/lib/registration-outcome";

// Deliberately loose: this catches the empty and the obviously-malformed, and
// leaves anything arguable to the database. A form that rejects a real address
// on stage is far worse than one that accepts a typo.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { name?: string; email?: string };

export default function RegistrationForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // Spec §5: move focus to the success headline so the state change is
  // announced and the keyboard user is not left on a button that vanished.
  useEffect(() => {
    if (outcome === "success") successHeadingRef.current?.focus();
  }, [outcome]);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (name.trim() === "") errors.name = "Enter your name.";
    if (email.trim() === "") errors.email = "Enter your email address.";
    else if (!EMAIL_SHAPE.test(email.trim()))
      errors.email = "Enter a valid email address.";
    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // noValidate is set on the form: the native validation bubble is small,
    // light grey, and unreadable from the back of a room. These inline errors
    // replace it.
    const errors = validate();
    setFieldErrors(errors);
    setOutcome(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    const supabase = getSupabase();
    if (!supabase) {
      setOutcome("error");
      setSubmitting(false);
      return;
    }

    // No `.select()` on the insert: RLS grants anon INSERT only, so asking for
    // the inserted row back would turn every success into a permission error.
    const { error } = await supabase
      .from(REGISTRATIONS_TABLE)
      .insert({ name: name.trim(), email: normalizeEmail(email) });

    setOutcome(outcomeFor(error));
    setSubmitting(false);
  }

  function reset() {
    setName("");
    setEmail("");
    setFieldErrors({});
    setOutcome(null);
  }

  const formError =
    outcome === "duplicate" || outcome === "error" ? MESSAGES[outcome] : "";

  return (
    <div id="register" className="card">
      {!isConfigured && (
        <p className="msg" role="alert">
          ✕ Supabase is not configured for this build. Set the two NEXT_PUBLIC_
          env vars and rebuild — they are inlined at build time, not read at
          runtime.
        </p>
      )}

      {outcome === "success" ? (
        <div className="success" role="status" aria-live="polite">
          <div className="disc" aria-hidden="true">
            ✓
          </div>
          <h2 ref={successHeadingRef} tabIndex={-1}>
            {SUCCESS_LINES.headline}
          </h2>
          <p>{SUCCESS_LINES.detail}</p>
          <button type="button" className="btn-reset" onClick={reset}>
            Register someone else
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h2 className="card-heading">Save your seat.</h2>

          <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={fieldErrors.name ? "true" : undefined}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name && (
                <p className="msg" id="name-error">
                  ✕ {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fieldErrors.email ? "true" : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p className="msg" id="email-error">
                  ✕ {fieldErrors.email}
                </p>
              )}
            </div>

            <button type="submit" className="btn-register" disabled={submitting}>
              {submitting ? "Registering…" : "Register"}
            </button>

          {/* Reserved row -- always present so nothing jumps mid-demo. */}
          <p className="msg" role="alert">
            {formError && `✕ ${formError}`}
          </p>
        </form>
      )}
    </div>
  );
}
