import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// l-chama's platform-admin check (src/lib/admin.ts → isPlatformAdmin) is
// an allowlist of Clerk USER IDs read from the ADMIN_CLERK_IDS env var —
// there's no "admin" role in the database to flip, unlike the main
// Ludeva app. So "adding an admin by email" here means: find that
// person's Clerk ID (once they've signed up to l-chama at least once,
// since that's what creates their row in our own User table with
// clerkId populated), then add it to ADMIN_CLERK_IDS yourself and
// redeploy — an env var change isn't something this script can do for
// you.
//
// Run with: npx tsx prisma/lookup-admin-clerk-ids.ts
const EMAILS_TO_PROMOTE = ['Kodemba@ludevaplc.co.ke', 'jamesosano@ludevaplc.co.ke'];

async function main() {
  const foundClerkIds: string[] = [];

  for (const raw of EMAILS_TO_PROMOTE) {
    const email = raw.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.warn(
        `⚠️  No l-chama account found for ${email} yet. They need to sign up (or accept a chama invite) at least once — that's what creates their Clerk ID in our database — then re-run this script.`
      );
      continue;
    }

    console.log(`✅ ${email} → clerkId: ${user.clerkId}`);
    foundClerkIds.push(user.clerkId);
  }

  if (foundClerkIds.length > 0) {
    console.log('\nAdd these to ADMIN_CLERK_IDS in your environment (comma-separated, alongside any existing IDs already there), then redeploy:');
    console.log(foundClerkIds.join(','));
  }
}

main()
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
