import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'lchama_admin_session';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'erickomee419@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminchama@254';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || `${ADMIN_EMAIL}:${ADMIN_PASSWORD}`;

function sessionToken() {
  return createHmac('sha256', ADMIN_SESSION_SECRET).update('lchama-admin').digest('hex');
}

export function isValidAdminCredentials(email: string, password: string) {
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
}

export async function hasAdminSession() {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return false;

  const expected = Buffer.from(sessionToken(), 'hex');
  const actual = Buffer.from(value, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function setAdminSession() {
  (await cookies()).set(ADMIN_SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}