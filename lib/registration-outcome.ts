// Kept free of imports and of the `@/` alias so the contract test can load it
// directly under Node's type stripping. Everything here is erasable types.

/** Postgres unique_violation -- a second registration of the same email. */
export const DUPLICATE_EMAIL_CODE = "23505";

/**
 * The three user-facing strings from PRD 5d. Verbatim -- the Product Designer
 * may restyle these but not reword them.
 */
export const MESSAGES = {
  success: "You're registered! See you September 6.",
  duplicate: "You're already registered.",
  error: "Something went wrong. Please try again.",
} as const;

/**
 * The success message rendered as two lines (AIC-7 spec §5) so the payoff line
 * is the biggest thing on the wall. Same words, verbatim, just line-broken --
 * the contract test asserts these rejoin to MESSAGES.success exactly.
 */
export const SUCCESS_LINES = {
  headline: "You're registered!",
  detail: "See you September 6.",
} as const;

export type Outcome = "success" | "duplicate" | "error";

/** Shape of the `error` field supabase-js returns from a failed insert. */
export type InsertError = { code?: string | null } | null | undefined;

/**
 * Maps the result of the insert to one of the three outcomes. The RLS policy
 * grants anon INSERT only -- with no SELECT policy the client cannot pre-check
 * for an existing email, so the duplicate is identified from the error code.
 */
export function outcomeFor(error: InsertError): Outcome {
  if (!error) return "success";
  return error.code === DUPLICATE_EMAIL_CODE ? "duplicate" : "error";
}

export function messageFor(outcome: Outcome): string {
  return MESSAGES[outcome];
}

/**
 * The column's UNIQUE constraint is case-sensitive, so `Jane@x.com` and
 * `jane@x.com` would register twice. Normalising in the client closes that gap
 * without deviating from the PRD's verbatim DDL.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
