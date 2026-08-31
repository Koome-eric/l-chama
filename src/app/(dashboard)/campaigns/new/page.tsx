import { requirePanelAccess } from '@/lib/require-panel-access';
import { NewCampaignClient } from './NewCampaignClient';

export default async function NewCampaignPage() {
  await requirePanelAccess('/campaigns/new');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Start a Campaign</h1>
        <p className="text-muted-foreground">Tell the community about the cause you're raising for.</p>
      </div>
      <NewCampaignClient />
    </div>
  );
}
