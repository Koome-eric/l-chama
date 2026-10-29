import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isPlatformAdmin } from '@/lib/admin';
import { getAdminSessionEmail, isSuperAdminEmail } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin audit log | L-Chama' };

// Read-only trail of privileged admin activity. Super admin only.
export default async function AuditPage() {
  const { userId } = await auth();
  const email = await getAdminSessionEmail();
  if (!isPlatformAdmin(userId) && !isSuperAdminEmail(email)) redirect('/admin');

  let entries: Awaited<ReturnType<typeof prisma.adminAuditLog.findMany>> = [];
  let unavailable = false;
  try {
    entries = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Admin audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The 300 most recent privileged actions. Clerk sign-ins are recorded in the Clerk dashboard. &ldquo;Requested&rdquo;
        means an authorised admin invoked the action.
      </p>
      {unavailable ? (
        <p className="mt-6 rounded-md border p-4 text-sm">
          The audit log table isn&apos;t available yet. Run <code>npx prisma db push</code> and redeploy.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Who</th>
                <th className="p-2">Action</th>
                <th className="p-2">Outcome</th>
                <th className="p-2">Target</th>
                <th className="p-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: (typeof entries)[number]) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{e.createdAt.toISOString().replace('T', ' ').slice(0, 19)} UTC</td>
                  <td className="p-2">{e.actorEmail ?? 'Clerk admin'}</td>
                  <td className="p-2 font-mono text-xs">{e.action}</td>
                  <td className="p-2">{e.outcome}</td>
                  <td className="p-2 font-mono text-xs">{e.targetId ?? '—'}</td>
                  <td className="p-2 font-mono text-xs">{e.ip ?? '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={6}>No events recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
