import { CalendarClock } from 'lucide-react';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { ComingSoon } from '@/components/ComingSoon';

export default async function ScheduledPaymentsPage() {
  await requirePanelAccess('/scheduled-payments');

  return (
    <ComingSoon
      icon={CalendarClock}
      title="Scheduled Payments"
      description="Automate your recurring chama contributions."
      note="Set-and-forget scheduled contributions are on the way — for now, use Contribute to make a payment manually."
    />
  );
}
