import { requirePanelAccess } from '@/lib/require-panel-access';
import { hasPermission } from '@/lib/chama';
import { getChamaWithdrawState } from '../panel/actions';
import { WithdrawClient } from './WithdrawClient';

export default async function WithdrawPage() {
  const { ctx } = await requirePanelAccess('/withdraw');
  const canWithdraw = hasPermission(ctx, 'canWithdraw') || ctx.isOwner;
  const state = await getChamaWithdrawState();

  return <WithdrawClient state={state} canRequest={canWithdraw} />;
}
