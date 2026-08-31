import { ArrowDownToLine } from 'lucide-react';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { ComingSoon } from '@/components/ComingSoon';

export default async function DepositPage() {
  await requirePanelAccess('/deposit');

  return (
    <ComingSoon
      icon={ArrowDownToLine}
      title="Deposit"
      description="Top up your chama's loan account."
      note="M-Pesa and card deposits are on the way — for now, an owner can adjust the loan account balance from the Contribute tab."
    />
  );
}
