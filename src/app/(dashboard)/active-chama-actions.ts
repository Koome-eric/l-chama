'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { listUserChamas, setActiveChamaCookie } from '@/lib/chama';

// Switches which of the person's chamas the dashboard shows. The id is
// checked against the chamas they actually own or belong to, so the cookie
// can never point at someone else's chama.
export async function setActiveChama(teamId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: 'You must be signed in.' };

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return { ok: false, error: 'Complete onboarding first.' };

  const chamas = await listUserChamas(user);
  if (!chamas.some((c) => c.id === teamId)) {
    return { ok: false, error: "You're not part of that chama." };
  }

  await setActiveChamaCookie(teamId);

  revalidatePath('/', 'layout');
  return { ok: true };
}
