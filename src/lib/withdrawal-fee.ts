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
// One flat rate for every user. Ludeva Plc membership status no longer
// changes the fee (it used to be 0% for VERIFIED members, 5% otherwise).
export const WITHDRAWAL_FEE_RATE = 0.025;

export type LudevaMembershipStatusLike = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED' | null | undefined;

// The status argument is kept so existing call sites don't change, but it
// is intentionally ignored: the rate is the same for everyone.
export function withdrawalFeeRateFor(_status?: LudevaMembershipStatusLike): number {
  return WITHDRAWAL_FEE_RATE;
}
