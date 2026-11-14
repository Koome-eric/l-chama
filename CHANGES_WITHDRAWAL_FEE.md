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
