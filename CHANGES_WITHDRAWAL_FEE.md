# Withdrawal fee: flat 2.5% for everyone

Was: 0% for VERIFIED Ludeva members, 5% for everyone else (campaign page copy said 3%).
Now: 2.5% flat for every user, regardless of Ludeva membership status.

Core change: `src/lib/withdrawal-fee.ts` -> single `WITHDRAWAL_FEE_RATE = 0.025`;
`withdrawalFeeRateFor()` ignores its argument, so `withdrawals.ts` and `panel/page.tsx` are unchanged.

Unchanged on purpose: Ludeva-member chamas (Team.isLudevaMember) still withdraw by email with no in-app fee.
Existing WithdrawalRequest rows keep the feeAmount/netAmount they were created with.

Copy updated: landing-content.ts (home + /loans), fundraising, terms, give/[id], profile + onboarding,
admin badges/notifications, withdraw + campaign + panel calculators, schema comment.
