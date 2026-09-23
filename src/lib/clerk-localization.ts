/**
 * Clerk's <SignIn> / <SignUp> widgets render their own error text — we
 * don't control that markup, but Clerk lets a host app override specific
 * message strings via ClerkProvider's `localization` prop (it deep-merges
 * this over Clerk's built-in English copy, so only the keys listed below
 * need to be present). These overrides replace Clerk's terse defaults
 * with an explanation of *why* the error happened, in the same plain
 * language used elsewhere in the app (see src/lib/errors.ts for the
 * equivalent on our own forms).
 *
 * Typed loosely on purpose: ClerkProvider accepts a deep-partial
 * localization object, and pulling in the full generated
 * LocalizationResource type here would force us to fill in every locale
 * key instead of just the handful we're overriding.
 */
export const clerkLocalization: Record<string, unknown> = {
  unstable__errors: {
    // The #1 source of "why won't it let me sign up" confusion: the
    // person (often without realising it) already has an account under
    // this email/phone, usually from a previous sign-up attempt.
    form_identifier_exists__email_address:
      "This email address already has an L-CHAMA account. That usually means you've signed up before — try signing in instead. If you're sure this is your first time, use a different email address.",
    form_identifier_exists__phone_number:
      "This phone number already has an L-CHAMA account. That usually means you've signed up before — try signing in instead. If you're sure this is your first time, use a different phone number.",
    form_identifier_exists__username:
      "That username is already taken by another L-CHAMA account. Try signing in if it's yours, or choose a different username.",

    // Sign-in with an email/phone that has no account at all.
    form_identifier_not_found:
      "We couldn't find an L-CHAMA account with those details. Double-check for typos, or create a new account if you haven't signed up yet.",

    // Wrong password / wrong OTP code.
    form_password_or_identifier_incorrect:
      "That email/phone and password combination doesn't match any L-CHAMA account. Check for typos, or use \"Forgot password\" if you're not sure.",
    form_code_incorrect:
      "That verification code doesn't match, or it's expired. Codes are only valid for a short time — request a new one and enter it as soon as it arrives.",

    // Formatting issues that otherwise show as generic "invalid" errors.
    form_param_format_invalid__email_address:
      "That doesn't look like a valid email address — check for missing letters or an @ symbol.",
    form_param_format_invalid__phone_number:
      'That phone number doesn\'t look complete — include your country code, e.g. +254 7XX XXX XXX.',
  },
};
