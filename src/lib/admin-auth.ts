import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'lchama_admin_session';

// The super admin is defined entirely by environment variables — it is
// intentionally never a row in the database, so it can create, edit and
// delete every other admin account without any risk of locking itself
// out. Everyone else it creates lives in the AdminAccount table.
const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'erickomee419@gmail.com';
const SUPER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminchama@254';
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || `${SUPER_ADMIN_EMAIL}:${SUPER_ADMIN_PASSWORD}`;

function sign(email: string) {
  return createHmac('sha256', ADMIN_SESSION_SECRET).update(email.toLowerCase()).digest('hex');
}

export function isSuperAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export function isSuperAdminCredentials(email: string, password: string) {
  return isSuperAdminEmail(email) && password === SUPER_ADMIN_PASSWORD;
}

// ── Password hashing for admins created in the database ──────────────

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ── Session: a signed cookie carrying which admin email is logged in ──

export async function setAdminSession(email: string) {
  const normalized = email.trim().toLowerCase();
  const value = `${Buffer.from(normalized).toString('base64url')}.${sign(normalized)}`;
  (await cookies()).set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function getAdminSessionEmail(): Promise<string | null> {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return null;

  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) return null;

  let email: string;
  try {
    email = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!email) return null;

  const expected = Buffer.from(sign(email), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  return email;
}

export async function hasAdminSession() {
  return (await getAdminSessionEmail()) !== null;
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}
