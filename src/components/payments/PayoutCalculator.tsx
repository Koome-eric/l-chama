'use client';

import { formatKES } from '@/lib/chama-levels';

/* ────────────────────────────────────────────────────────────── */
/*  Live amount → platform fee → net payout breakdown, shown         */
/*  wherever someone is about to request a withdrawal (campaign or   */
/*  chama loan account) so the fee is never a surprise.               */
/*                                                                    */
/*  feeRate is passed in rather than imported as a fixed constant —   */
/*  it depends on the requester's own confirmed Ludeva membership     */
/*  status (see src/lib/withdrawal-fee.ts), so the caller (which      */
/*  already knows who's asking) works that out and hands the right   */
/*  rate down.                                                        */
/* ────────────────────────────────────────────────────────────── */

export function PayoutCalculator({ amount, feeRate }: { amount: number; feeRate: number }) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const fee = Math.round(safeAmount * feeRate * 100) / 100;
  const net = Math.round((safeAmount - fee) * 100) / 100;
  const feePct = (feeRate * 100).toFixed(1);

  return (
    <div className="rounded-xl border overflow-hidden text-sm">
      <div className="grid grid-cols-2">
        <div className="p-3 text-muted-foreground">Amount</div>
        <div className="p-3 text-right font-medium">{formatKES(safeAmount)}</div>
      </div>
      <div className="grid grid-cols-2 bg-muted/60 border-t">
        <div className="p-3 text-muted-foreground">Platform Fee (-{feePct}%)</div>
        <div className="p-3 text-right font-medium">-{formatKES(fee)}</div>
      </div>
      <div className="grid grid-cols-2 bg-primary/10 border-t">
        <div className="p-3 font-semibold">Net Payout</div>
        <div className="p-3 text-right font-bold text-primary">{formatKES(net)}</div>
      </div>
    </div>
  );
}
