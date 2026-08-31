import { requirePanelAccess } from '@/lib/require-panel-access';
import { ProfileEditClient } from './ProfileEditClient';

export default async function ProfilePage() {
  const { user } = await requirePanelAccess('/profile');

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">Keep your personal details up to date.</p>
      </div>
      <ProfileEditClient
        defaults={{
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          idNumber: user.idNumber || '',
          email: user.email || '',
          gender: user.gender || '',
          country: user.country || 'KE',
          region: user.region || '',
        }}
      />
    </div>
  );
}
