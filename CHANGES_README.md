# Withdrawal fee: Ludeva members toll free, non-members 5% flat

Was: 5% for verified Ludeva members / 7.5% for everyone else.
Now: 0% (toll free) for verified Ludeva members / 5% flat for everyone else.

## The one line that actually matters

`src/lib/withdrawal-fee.ts`:
```
LUDEVA_MEMBER_WITHDRAWAL_FEE_RATE = 0     // was 0.05
NON_MEMBER_WITHDRAWAL_FEE_RATE   = 0.05  // was 0.075
```
Every fee calculation (`withdrawals.ts` → `createWithdrawalRequest`, and every UI page that shows `myWithdrawalFeeRate`) reads from these two constants, so this is the only place the actual math changes.

## Everything else is copy + one bit of dead-condition logic

All the other files just had text describing the old 5%/7.5% split. I updated the wording everywhere it appeared, including the exact "Withdrawal payout calculator" text you quoted (`PanelClient.tsx`).

One functional fix alongside the copy: three places had a check like `feeRate > 0.05` to decide when to show the "become a Ludeva member" upsell message. That was written for the old three-way split (0.05 / 0.075); now that the highest rate is 0.05, that condition would never be true and the upsell message would silently stop showing. Changed to `feeRate > 0` (show the upsell whenever the person isn't already toll free) in:
- `WithdrawClient.tsx`
- `CampaignManageClient.tsx`
- `PanelClient.tsx` (the payout calculator)

## Full list of files touched

- `src/lib/withdrawal-fee.ts` — the two rate constants + header comment
- `src/lib/withdrawals.ts` — stale comment only
- `src/app/admin/actions.ts` — Ludeva-membership-decision notification text sent to members, + a stale comment
- `src/app/admin/AdminClient.tsx` — admin-facing membership badges ("Verified — Toll free" / "Rejected — 5% fee") + a stale comment
- `src/app/(dashboard)/profile/ProfileEditClient.tsx` — member's own membership badge + description
- `src/app/(dashboard)/withdraw/WithdrawClient.tsx` — fee-rate line on the Withdraw page
- `src/app/(dashboard)/campaigns/[id]/CampaignManageClient.tsx` — same fee-rate line, campaign withdrawals
- `src/app/(dashboard)/panel/PanelClient.tsx` — the payout calculator (the block you quoted)
- `src/app/onboarding/profile/ProfileClient.tsx` — sign-up checkbox description

Nothing here touches `Team.isLudevaMember` chamas — those were already fully free (0%, email-request flow) and aren't affected by this change.
