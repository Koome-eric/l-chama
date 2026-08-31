// Platform-level admin (reviews and approves/rejects submitted
// organisations) is intentionally NOT a database role a user could ever
// grant themselves — it's an allowlist of Clerk user IDs set via env,
// the same pattern Ludeva uses for its own super-admin gate. Add the
// Clerk user ID(s) of whoever should review organisations to
// ADMIN_CLERK_IDS (comma-separated) in the environment.
export function isPlatformAdmin(clerkId: string | null | undefined): boolean {
  if (!clerkId) return false;
  const allowlist = (process.env.ADMIN_CLERK_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowlist.includes(clerkId);
}
