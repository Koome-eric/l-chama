import type { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

// A person signs up (new Clerk account, new clerkId) but the database already
// has a User row for that same email under an OLD clerkId — left behind by an
// earlier sign-up, a Clerk account that was deleted and recreated, or an account
// made on another Clerk instance (dev vs production). Creating a second row
// fails on the unique email ("This email address is already linked to an
// L-CHAMA account..."), even though the person is brand new to this sign-in.
//
// When the Clerk email has been VERIFIED (they proved they own it), that old
// row is the same person: point it at the new Clerk account instead of failing,
// so their profile, chamas and history carry over. Never done for an
// unverified email, which anyone could type.
export async function adoptUserByVerifiedEmail(clerkUser: ClerkUser) {
  const primary =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ?? clerkUser.emailAddresses[0];
  if (!primary || primary.verification?.status !== 'verified') return null;

  const row = await prisma.user.findFirst({
    where: { email: { equals: primary.emailAddress, mode: 'insensitive' } },
  });
  if (!row) return null;
  if (row.clerkId === clerkUser.id) return row;

  console.warn(
    `🔗 Re-linking existing L-CHAMA account ${row.id} (${row.email}) from clerkId ${row.clerkId} to ${clerkUser.id} (verified email match).`
  );
  return prisma.user.update({ where: { id: row.id }, data: { clerkId: clerkUser.id } });
}
