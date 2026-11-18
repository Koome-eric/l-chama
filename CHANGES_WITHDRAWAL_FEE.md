# Withdrawal fee: flat 2.5% for everyone

Was: 0% for VERIFIED Ludeva members, 5% for everyone else (campaign page copy said 3%).
Now: 2.5% flat for every user, regardless of Ludeva membership status.

Core change: `src/lib/withdrawal-fee.ts` -> single `WITHDRAWAL_FEE_RATE = 0.025`;
`withdrawalFeeRateFor()` ignores its argument, so `withdrawals.ts` and `panel/page.tsx` are unchanged.

Unchanged on purpose: Ludeva-member chamas (Team.isLudevaMember) still withdraw by email with no in-app fee.
Existing WithdrawalRequest rows keep the feeAmount/netAmount they were created with.

Copy updated: landing-content.ts (home + /loans), fundraising, terms, give/[id], profile + onboarding,
admin badges/notifications, withdraw + campaign + panel calculators, schema comment.

---
# MMF removed entirely

- Public catalog: "MMF" card in landing-content.ts is now "Shares Account" (Above 9%, /invest?type=STOCK); home copy + FAQ updated.
- Code: `MMF` removed from the FundType enum (schema.prisma), admin + invest types/labels, the "Legacy investment" special cases, seed.ts and update-products.ts.
- `scripts/mmf-push.gs` renamed to `scripts/member-data-push.gs` (same logic; it feeds /api/member-reports/sync).
- **Deploy step:** run `npx tsx prisma/remove-mmf.ts` BEFORE `npx prisma db push`. It moves any existing MMF products to
  FIXED_DEPOSIT, renamed "Legacy investment", inactive — so old chama investments stay intact. Without it, db push will refuse
  to drop the enum value.

---
# Investment report tables: Period removed, ROI -> Return

- Admin > Member reports (investments table): "Period" column removed, "ROI" header now "Return" (the column was already "Contribution").
- Member Reports page > "Member Performance — Investments": rows now read "Contribution X · Return Y" (period text removed).
- Not changed: the savings table's Period column, product ROI-rate labels, and the CSV/sync field names (principal, roi, period), which the Google Sheets sync depends on.
- Admin > Savings table: "Period" column also removed (member-facing savings lists still title each entry by its date).

---
# Chama members can see each other's Phone + Ludeva number

- Team Members page (/team): new "Phone" column; "Ludeva No." now shows the number a member entered even before admin verification
  (marked "(unverified)" until verified). Previously only VERIFIED numbers showed, so most rows were blank.
- Sub-Chamas page: member tables gain Phone + Ludeva No. columns.
- Still hidden from chama members: ID/passport numbers (admin-only).

---
# Invite errors now show the real reason

Production Next.js hides the message of any error thrown from a server action ("An error occurred in the Server Components
render..."). inviteChamaMember / addExistingChamaMember now RETURN { ok:false, error } for expected failures (already on the
chama, invite already pending, invalid email, no permission, organisation not approved, ...) and TeamMembersSection shows
that text. Unexpected errors (database etc.) show a generic message and are logged on the server.

---
# Accept-invite errors now readable too

`acceptChamaInvite` (src/app/invite/[token]/actions.ts) returns { ok:false, error } instead of throwing, via the shared
`src/lib/action-result.ts` helper (the invite/add-member actions now use it as well). The Clerk metadata update after the
membership is saved is best-effort, so a Clerk hiccup no longer shows "failed" for someone who actually joined.

---
# Product rates aligned: Savings 5%, Shares above 13%, Junior 5%

- Landing page + /products (src/lib/landing-content.ts): Savings "5% – 7%" -> "5%" (note now just "per year"; "Tiered interest" bullet
  reworded), Shares "Above 9%" -> "Above 13%", Junior "6%" -> "5%".
- src/lib/marketing-content.ts: Junior 5%, Shares above 13%.
- prisma/seed.ts + prisma/update-products.ts: Shares roi 13, Junior roi 5, descriptions updated.
- LIVE DATABASE: run `npx tsx prisma/update-products.ts` so the Accounts page descriptions (Savings said "up to 7%", Junior "up to 6%")
  match the Return column (Savings 5%, Junior 5%).

---
# Invite / contact emails: refused sends are no longer reported as "sent"

resend v6 returns { error } instead of throwing when Resend refuses a message (unverified domain, bad from address, ...).
panel/actions.ts (invite) and contact/actions.ts now check it, so the real reason is shown/logged instead of "Invite sent".

---
# Build fix: fonts are now bundled (no Google Fonts fetch at build time)

Vercel build failed in next/font/google ("Cannot read properties of null (reading '1')", loader.js:122): the loader expects every
Google font URL to end in .woff2/.ttf/..., and Google now serves some without an extension. The same code is still in the latest
Next 15.5.x, so upgrading does not help. Inter and Plus Jakarta Sans are now self-hosted with next/font/local
(src/app/fonts/*.woff2, latin variable fonts, SIL OFL licences alongside). Same CSS variables, so Tailwind is unchanged.

---
# Fix: "This email address is already linked to an L-CHAMA account" for people signing up for the first time

Cause: the database already had a User row for that email under an OLD clerkId (earlier sign-up, a Clerk account deleted and
recreated, or a dev-vs-production Clerk instance). A brand-new Clerk account has a new clerkId, so the app looked up by clerkId,
found nothing, tried to create a second row, and hit the unique email.
Fix: src/lib/adopt-user.ts — if the Clerk email is VERIFIED and a row with that email exists, point it at the new clerkId and carry
on (profile + chamas preserved). Used in accept-invite, onboarding (both steps), /api/auth/check-user and requirePanelAccess.
Never done for an unverified email.

---
# 1) Group market profile (group KYC) + loan purpose   2) County picker + premium onboarding forms

## Group market profile
Serviceable-market facts Ludeva needs from verified group records: county, group type, member count (existing
numberOfMembers), contribution regularity, business activity, smartphone/payment access, current credit source, loan purpose,
consent, willingness to pay.
- Group-level answers = group KYC on the Team: asked at chama registration (required) and editable by the Team Leader in the new
  "Group profile (KYC)" card on /team. New Team columns + enums in prisma/schema.prisma; options/validation in src/lib/group-profile.ts.
- Loan-specific answer = loan request form: "What is the loan for?" (required, structured) + the old free-text as "More detail".
  New LoanRequest.purposeCategory.
- Admin > Organisations shows each chama's profile and whether consent was given.
- DEPLOY: `npx prisma db push` (adds columns/enums; nothing is dropped). Existing chamas show "Needs your input" until the Team Leader
  completes the card.

## County picker
All 47 counties were already in the list, but it was unsorted and opened as a small clipped dropdown on phones, so the last ones
(Kirinyaga, Narok, Nyamira, Bomet, Vihiga, Tharaka Nithi...) were hard to reach. KENYA_COUNTIES is now A-Z and every county field
(onboarding, invite acceptance, profile edit) uses the new searchable bottom-sheet picker (src/components/ui/option-picker.tsx).
Forms restyled with shared tokens in src/components/premium-form.tsx.
