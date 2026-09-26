// Cloudflare Turnstile server-side verification (ESP-002 / ADR-134 / ADR-135).
//
// Server-only: the secret key NEVER reaches the client bundle (BR7 / AC-11).
// `verifyTurnstile` POSTs the client-solved response token to Cloudflare's
// siteverify endpoint and returns a typed verdict. `fetch` is injectable so the
// pure response-parsing logic is unit-testable without a network call (AC-07).
//
// Degradation when the secret is absent is EXPLICIT (R7 / A3): non-production
// allows (so local dev is not blocked), production rejects (the CAPTCHA gate
// cannot verify and must not silently pass). Never a silent always-pass in prod.

import "server-only";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerdict =
  | { ok: true }
  | {
      ok: false;
      reason: "missing-token" | "missing-secret" | "rejected" | "verify-error";
      errorCodes?: string[];
    };

// Subset of the siteverify JSON response we rely on.
type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

type FetchLike = typeof fetch;

/**
 * Server-verify a Turnstile response token.
 *
 * @param token   the widget's response token from the submitted form (may be empty)
 * @param ip      the client IP for the optional `remoteip` field (null to omit)
 * @param fetchImpl injectable fetch (defaults to global `fetch`) — for testing
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip: string | null,
  fetchImpl: FetchLike = fetch,
): Promise<TurnstileVerdict> {
  // No token → reject without a network round-trip (AC-07 short-circuit).
  if (!token) return { ok: false, reason: "missing-token" };

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY absent in production — rejecting " +
          "(CAPTCHA gate cannot verify). Set the secret before relying on it.",
      );
      return { ok: false, reason: "missing-secret" };
    }
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY absent — allowing in non-production " +
        "(dev degradation, R7/A3).",
    );
    return { ok: true };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);

    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await res.json()) as SiteverifyResponse;
    if (data.success) return { ok: true };
    return { ok: false, reason: "rejected", errorCodes: data["error-codes"] };
  } catch (err) {
    // Network/parse failure: reject (the gate could not confirm proof-of-human)
    // and surface a retryable error to the caller. Logged for the operator.
    console.warn("[turnstile] siteverify request failed", err);
    return { ok: false, reason: "verify-error" };
  }
}
