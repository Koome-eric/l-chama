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
