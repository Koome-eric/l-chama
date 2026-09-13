'use client';

import { formatKES } from '@/lib/chama-levels';
import { PLATFORM_WITHDRAWAL_FEE_RATE } from '@/lib/withdrawal-fee';

/* ────────────────────────────────────────────────────────────── */
/*  Live amount → platform fee → net payout breakdown, shown         */
/*  wherever someone is about to request a withdrawal (campaign or   */
/*  chama loan account) so the fee is never a surprise.               */
/* ────────────────────────────────────────────────────────────── */

export function PayoutCalculator({ amount }: { amount: number }) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const fee = Math.round(safeAmount * PLATFORM_WITHDRAWAL_FEE_RATE * 100) / 100;
  const net = Math.round((safeAmount - fee) * 100) / 100;
  const feePct = (PLATFORM_WITHDRAWAL_FEE_RATE * 100).toFixed(1);

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
