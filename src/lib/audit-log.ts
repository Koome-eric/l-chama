import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Audit trail for privileged admin activity. NEVER throws: a logging problem
// (e.g. the table hasn't been created yet) must not block the admin action.
//   success   – the thing happened (logins, step-up)
//   failure   – a failed attempt (bad password)
//   blocked   – refused (throttled)
//   requested – an authorised admin invoked the action (logged at the point
//               the request is authorised, before the work runs)

export interface AuditEvent {
  action: string;
  actorEmail?: string | null;
  actorKind?: 'clerk' | 'admin_account' | 'unknown';
  outcome?: 'success' | 'failure' | 'blocked' | 'requested';
  targetType?: string;
  targetId?: string;
  detail?: string;
}

export async function logAdminEvent(event: AuditEvent) {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || null;
      userAgent = h.get('user-agent');
    } catch {
      // no request context
    }

    await prisma.adminAuditLog.create({
      data: {
        actorEmail: event.actorEmail ?? null,
        actorKind: event.actorKind ?? (event.actorEmail ? 'admin_account' : 'clerk'),
        action: event.action,
        outcome: event.outcome ?? 'requested',
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        detail: event.detail?.slice(0, 500) ?? null,
        ip,
        userAgent: userAgent?.slice(0, 300) ?? null,
      },
    });
  } catch (err) {
    console.error('[audit-log] failed to write event', event.action, err);
  }
}

// DB-backed failure counter so throttling works across serverless instances.
// Fails OPEN if the table is unavailable (the in-memory throttle still applies).
export const MAX_FAILURES = 5;

export async function countRecentFailures(actorEmail: string, actions: string[], windowMinutes = 15) {
  try {
    return await prisma.adminAuditLog.count({
      where: {
        actorEmail: actorEmail.toLowerCase(),
        action: { in: actions },
        outcome: { in: ['failure', 'blocked'] },
        createdAt: { gte: new Date(Date.now() - windowMinutes * 60 * 1000) },
      },
    });
  } catch {
    return 0;
  }
}
