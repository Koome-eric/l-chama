import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

// Shared-secret check for Apps Script / cross-app sync webhooks.
// Fails CLOSED: if the env var is unset or short, every request is
// rejected. (These routes used to skip the check entirely when the secret
// was empty, leaving them open to anyone.)
export function hasValidSyncSecret(req: NextRequest, envName: string) {
  const expected = process.env[envName];
  const provided = req.headers.get('x-sync-secret');
  if (!expected || expected.length < 16 || !provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
