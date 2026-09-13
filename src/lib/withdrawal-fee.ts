// Split out from src/lib/withdrawals.ts so client components (e.g. the
// PayoutCalculator) can import the fee rate without pulling in that
// file's Prisma/Paystack server-only imports into the browser bundle.
export const PLATFORM_WITHDRAWAL_FEE_RATE = 0.049;
