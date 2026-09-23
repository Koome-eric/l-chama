import { Prisma } from '@prisma/client';

/**
 * Turns a database or third-party error into a message a non-technical
 * member can actually act on, instead of a raw Prisma/Clerk error
 * leaking into a toast (e.g. "Unique constraint failed on the fields:
 * (`clerkId`)"). Used across sign-up, sign-in and onboarding server
 * actions so every step of "create an account" fails the same, friendly
 * way.
 *
 * `fieldLabels` lets a call site say what a given column means to the
 * person filling the form, e.g. { clerkId: 'account', phone: 'phone
 * number' }. Falls back to a generic "these details" explanation for
 * anything not covered.
 */
export function friendlyAccountError(
  err: unknown,
  fieldLabels: Record<string, string> = {}
): Error {
  // Already a plain-language error we (or a call site) threw on purpose —
  // pass it straight through.
  if (err instanceof Error && (err as any).__friendly) {
    return err;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: unique constraint violation — almost always means this
    // person (or someone using the same phone/email) already has an
    // L-CHAMA account.
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[])
        : typeof err.meta?.target === 'string'
        ? [err.meta.target]
        : [];

      const label = target.map((t) => fieldLabels[t]).find(Boolean);

      if (label) {
        return markFriendly(
          `This ${label} is already linked to an L-CHAMA account. This usually happens when you've signed up before and are trying to create a new account instead of signing in — try signing in instead, or use a different ${label} if this really is your first time here.`
        );
      }

      return markFriendly(
        "Some of these details are already used by another L-CHAMA account — most likely one you (or someone else) created earlier. Try signing in instead, or double check you haven't already registered before creating a new account."
      );
    }

    // P2025: the record this action expected to find/update is gone —
    // e.g. an invite or account was deleted between page load and submit.
    if (err.code === 'P2025') {
      return markFriendly(
        "We couldn't find the record this action needed — it may have been removed or already used. Refresh the page and try again."
      );
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError || err instanceof Prisma.PrismaClientRustPanicError) {
    return markFriendly(
      "We're having trouble reaching L-CHAMA's servers right now. This isn't something wrong with your details — please wait a moment and try again."
    );
  }

  // Clerk SDK errors carry a `.errors[]` array with a longMessage.
  const clerkMessage = (err as any)?.errors?.[0]?.longMessage || (err as any)?.errors?.[0]?.message;
  if (clerkMessage) {
    return markFriendly(clerkMessage);
  }

  // A plain Error we (a call site) already wrote in plain language.
  if (err instanceof Error && err.message) {
    return markFriendly(err.message);
  }

  return markFriendly('Something unexpected went wrong on our end. Please try again in a moment.');
}

function markFriendly(message: string): Error {
  const e = new Error(message);
  (e as any).__friendly = true;
  return e;
}

/**
 * Same idea as friendlyAccountError but for M-Pesa/card charge attempts
 * (accounts, deposit, give actions). Paystack's own `display_text` is
 * already written for end users and passed through as-is; what we guard
 * against is a raw axios/network failure ("Request failed with status
 * code 401", a stack trace, etc.) reaching the toast.
 */
export function friendlyPaymentError(err: unknown, action: string = 'payment'): Error {
  if (err instanceof Error && (err as any).__friendly) {
    return err;
  }

  const message = err instanceof Error ? err.message : String(err ?? '');

  const looksTechnical =
    !message ||
    /request failed|status code|ECONN|ETIMEDOUT|fetch failed|undefined is not|cannot read propert|network error|5\d\d\b/i.test(
      message
    );

  if (looksTechnical) {
    return markFriendly(
      `We couldn't reach the payment provider to start this ${action}. This isn't a problem with your account or balance — please check your connection and try again in a moment.`
    );
  }

  // A message from Paystack/M-Pesa meant for the end user (e.g. "Insufficient funds in the M-Pesa account").
  return markFriendly(message);
}
