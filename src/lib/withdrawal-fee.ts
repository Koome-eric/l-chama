// Split out from src/lib/withdrawals.ts so client components (e.g. the
// PayoutCalculator) can import the fee rate without pulling in that
// file's Prisma/Paystack server-only imports into the browser bundle.
//
// Applies to: Fundraiser campaign withdrawals, and external/non-member
// chama withdrawals (Team.isLudevaMember === false — see schema.prisma).
// Does NOT apply to Ludeva-member chamas, which withdraw by emailing
// lchama@ludevaplc.co.ke / invst@ludevaplc.co.ke instead of using the
// in-app withdrawal flow at all — see /withdraw and withdrawals.ts.
//
// Two-tier, based on the withdrawal REQUESTER's own confirmed Ludeva
// membership (User.ludevaMembershipStatus — see schema.prisma and
// /onboarding/profile): an existing, admin-verified Ludeva Plc member
// pays the lower rate; everyone else (never claimed, still pending
// admin confirmation, or rejected) pays the higher rate. Only a
// VERIFIED status counts as "already a member" — PENDING isn't
// confirmed yet, so it doesn't get the discount.
export const LUDEVA_MEMBER_WITHDRAWAL_FEE_RATE = 0.05;
export const NON_MEMBER_WITHDRAWAL_FEE_RATE = 0.075;

export type LudevaMembershipStatusLike = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED' | null | undefined;

export function withdrawalFeeRateFor(status: LudevaMembershipStatusLike): number {
  return status === 'VERIFIED' ? LUDEVA_MEMBER_WITHDRAWAL_FEE_RATE : NON_MEMBER_WITHDRAWAL_FEE_RATE;
}
