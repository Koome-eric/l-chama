// Split out from src/lib/withdrawals.ts so client components (e.g. the
// PayoutCalculator) can import the fee rate without pulling in that
// file's Prisma/Paystack server-only imports into the browser bundle.
//
// Applies to: Fundraiser campaign withdrawals, and external/non-member
// chama withdrawals (Team.isLudevaMember === false — see schema.prisma).
// Does NOT apply to Ludeva-member chamas, which withdraw by emailing
// lchama@ludevaplc.co.ke / invst@ludevaplc.co.ke instead of using the
// in-app withdrawal flow at all — see /withdraw and withdrawals.ts.
export const PLATFORM_WITHDRAWAL_FEE_RATE = 0.10;
