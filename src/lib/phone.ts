// Phone numbers on User.phone can be stored in whichever form the person
// signed up with — Clerk hands us E.164 (+2547XXXXXXXX), while a hand-typed
// number from an invite-accept form or a Sheets row might be local
// (07XXXXXXXX / 01XXXXXXXX) or missing the "+". Rather than requiring every
// existing row to already match, we generate the small set of forms a given
// number could plausibly be stored as, and match against any of them.
//
// Used by /api/savings/sync and /api/member-reports/sync to look members up
// by phone when the email on their Sheets row doesn't resolve to an account
// (e.g. a phone-only sign-up).
export function phoneLookupVariants(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = String(raw).replace(/[\s-]+/g, '');
  if (!trimmed) return [];

  let local = trimmed; // target: 0-prefixed local form, e.g. 0712345678
  if (trimmed.startsWith('+254')) local = `0${trimmed.slice(4)}`;
  else if (trimmed.startsWith('254') && trimmed.length === 12) local = `0${trimmed.slice(3)}`;

  if (!/^0[17]\d{8}$/.test(local)) {
    // Not a recognizable Kenyan mobile number — just try it verbatim rather
    // than guessing at a format.
    return [trimmed];
  }

  const withoutLeadingZero = local.slice(1);
  return [...new Set([local, `+254${withoutLeadingZero}`, `254${withoutLeadingZero}`])];
}
