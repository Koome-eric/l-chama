import { ArrowUpFromLine } from 'lucide-react';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { ComingSoon } from '@/components/ComingSoon';

export default async function WithdrawPage() {
  await requirePanelAccess('/withdraw');

  return (
    <ComingSoon
      icon={ArrowUpFromLine}
      title="Withdraw"
      description="Move funds out of your chama's loan account."
      note="Self-service withdrawals are coming soon — for now, speak with your chama owner about disbursing funds."
    />
  );
}
