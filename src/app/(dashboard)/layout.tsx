import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Best-effort only — this layout also wraps the onboarding pages,
  // where there's no chama yet, so a missing user/context just means
  // the Last Respect Cover nav item stays hidden rather than erroring.
  let hasLastRespectCover = false;
  try {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (user) {
        const ctx = await getChamaContext(user);
        hasLastRespectCover = ctx?.team.hasLastRespectCover ?? false;
      }
    }
  } catch {
    // fall through with the nav item hidden
  }

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar hasLastRespectCover={hasLastRespectCover}>{children}</AppSidebar>
      </Suspense>
    </SidebarProvider>
  );
}
