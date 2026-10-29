import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isPlatformAdmin } from '@/lib/admin';
import { getAdminSessionEmail, isSuperAdminCredentials, isSuperAdminEmail, verifyPassword } from '@/lib/admin-auth';
import { logAdminEvent, countRecentFailures, MAX_FAILURES } from '@/lib/audit-log';

// Step-up confirmation: sensitive admin actions need the admin to re-enter
// their password even with a valid session, so a stolen or left-open session
// cookie isn't enough to take over other admin accounts.
//
// Clerk-signed-in platform admins are not asked here — their re-verification
// and MFA are enforced by Clerk. This covers the email + password admin
// sessions, which have no MFA.
//
// Returns null to proceed, or a result object to hand straight back to the
// client (thrown messages from server actions are hidden in production).
export async function stepUpForAdmin(confirmPassword?: string | null) {
  const { userId: clerkId } = await auth();
  if (isPlatformAdmin(clerkId)) return null;

  const email = await getAdminSessionEmail();
  if (!email) return { success: false as const, code: 'STEP_UP_REQUIRED' as const, error: 'Please sign in again.' };
  if (!confirmPassword) {
    return { success: false as const, code: 'STEP_UP_REQUIRED' as const, error: 'Please confirm your password to continue.' };
  }

  if ((await countRecentFailures(email, ['admin.login', 'admin.stepup'])) >= MAX_FAILURES) {
    await logAdminEvent({ action: 'admin.stepup', actorEmail: email, actorKind: 'admin_account', outcome: 'blocked' });
    return { success: false as const, code: 'STEP_UP_REQUIRED' as const, error: 'Too many attempts. Please wait 15 minutes and try again.' };
  }

  let ok = false;
  if (isSuperAdminEmail(email)) {
    ok = isSuperAdminCredentials(email, confirmPassword);
  } else {
    const account = await prisma.adminAccount.findUnique({ where: { email } });
    ok = !!account && verifyPassword(confirmPassword, account.passwordHash);
  }

  await logAdminEvent({ action: 'admin.stepup', actorEmail: email, actorKind: 'admin_account', outcome: ok ? 'success' : 'failure' });
  return ok ? null : { success: false as const, code: 'STEP_UP_REQUIRED' as const, error: 'Incorrect password.' };
}
