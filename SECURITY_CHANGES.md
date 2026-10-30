# Security changes (26 Oct 2026)

## Must do BEFORE deploying
1. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (32+ random chars) in the host env.
   There are no defaults any more. If any is missing, super-admin sign-in is disabled.
2. CHANGE `ADMIN_PASSWORD`. The value in the local `.env` matched the fallback that was hardcoded in source,
   so treat the old password as known. Also change anything else that reused it.
3. Existing admin sessions are invalidated (new cookie format with expiry); admins sign in again.

## What changed
- src/lib/admin-auth.ts: no hardcoded email/password/secret; constant-time password check; session cookie
  now carries a signed expiry.
- Admin login: best-effort throttle (5 failures / 15 min per email+IP, in memory — per serverless instance).
- /api/member-reports/sync and /api/savings/sync now REJECT requests when the secret env var is unset
  (they used to skip the check when it was empty); constant-time comparison.
- Sign-in card follows light/dark; favicon; WebP hero; zero-value campaign stats hidden.

## Not changed / worth a follow-up
- `/admin(.*)` is public in middleware; access relies on page/action checks (present, but easy to miss on new routes).
- Privacy policy claims (MFA, encryption, provider names) need a legal/product review.

---
# Round 3 — homepage, design, performance, admin controls

## Before deploying
1. `npx prisma db push` (adds `admin_audit_log`). Until then logging fails quietly and /admin/audit says so.
2. Set `RATES_AS_AT` in `src/lib/marketing-content.ts` (placeholder 26 Oct 2026) and confirm the rates are right.
3. Test after deploy: /, /start, /join, /products, /loans, /fundraising, /diaspora, /sign-in, /sign-up, /invite/<token>,
   /admin, /panel. Clerk's browser SDK now loads only on sign-in, sign-up, invite, admin and the signed-in app.
4. Fonts are Inter (text and figures) + Plus Jakarta Sans (headlines), and neutral colours match Ludeva's tokens;
   revert in `src/app/layout.tsx` / `globals.css` if you prefer the old look.

## Homepage restructure
- New public pages: /start (steps + contribution levels), /join (paste invite link), /products, /loans,
  /fundraising, /diaspora. All added to the public routes in middleware.
- Header nav: Start a chama · Join my chama · Explore products (mobile now has a nav row too).
- Duplicate contribution levels removed from the home page (they live on /start only).
- Theme switcher thumb misalignment fixed (framer-motion was overriding its CSS transform).

## Performance
- Header reads the session on the server, so public pages no longer need Clerk's browser SDK.
- Redirect chain: the "authentication-related redirects" in the audit are most likely Clerk's development-instance
  handshake (test keys). Switching to production keys should remove them; re-test after.

## Admin controls
- Audit log + viewer at /admin/audit (super admin): logins, step-up, admin-account and organisation decisions,
  investment-product/member-report deletes, payment resolution, Ludeva membership decisions.
- Login throttle now also counts failures in the database (shared across instances), on top of the in-memory one.
- Step-up: password re-entry for create/edit/permissions/delete of admin accounts (email+password sessions only;
  Clerk platform admins rely on Clerk).

---
# Round 4 — navigation, rates on the home page, FAQ, Clerk scope

## What changed
- **Mobile menu:** `src/components/MobileNav.tsx`. Below the `xl` breakpoint the header shows a menu button; the panel
  closes on Escape, on route change and when a link is chosen.
- **New pages linked and public:** header (Join my chama, Fundraising, and "Start a Chama" as the main button), home hero
  (Start a chama -> /start, Join my chama -> /join), Explore list (adds Fundraising) and footer. `/start`, `/join` and
  `/fundraising` are now public routes in `src/middleware.ts` (before this, signed-out visitors were sent to /sign-in).
- **Rates and fees on the home page:** a "Rates and fees, up front" section. Figures come from `src/lib/landing-content.ts`
  (`PRODUCTS`, `LOAN_INTEREST`, `PROCESSING_FEE`, `WITHDRAWAL_FEE`) and the date from `src/lib/legal.ts`, so the home page,
  /products and /loans always agree.
- **Shorter FAQ answers** in `src/components/LandingFAQ.tsx`.
- **Clerk loads only where needed:** `ClerkProvider` moved out of the root layout into `src/components/ClerkScope.tsx`, used by
  the sign-in, sign-up, invite, admin and (dashboard) layouts. `LChamaHeader` is now a server component that reads the session
  with `auth()`, so public pages ship no Clerk browser code. If you add a page that uses a Clerk hook or component
  (`useUser`, `<UserButton />`, ...), put it under a layout that wraps `<ClerkScope>`.

## Cleanup still open
- `src/lib/marketing-content.ts` is no longer imported anywhere (superseded by `landing-content.ts`) and holds an older rates date.
- `public/hero-chama.png`, `hero-chama-v3.png` (2.5 MB each) and `hero-chama.webp` are not used by any page.
- `migrate-clerk-ids.cjs` has a hard-coded local log path and real user IDs; do not deploy it.
