# Sidebar navigation — what changed

Your L Chama app now has a persistent, collapsible sidebar across every
signed-in page, matching the pattern from your Ludeva app
(`src/app/member/layout.tsx` + `components/ui/sidebar.tsx`).

## New UI primitives (copied/adapted from Ludeva)
- `src/components/ui/sidebar.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/tooltip.tsx`
- `src/hooks/use-mobile.tsx`
- `package.json` — added `@radix-ui/react-separator` and
  `@radix-ui/react-tooltip` (the two Radix packages the primitives above
  need that L Chama didn't already have).

## The sidebar itself
- `src/components/AppSidebar.tsx` — the nav shell: logo, menu items with
  active-state highlighting, and the account button (Clerk `UserButton`)
  in the top-right, exactly like Ludeva's member layout.
- `src/app/(dashboard)/layout.tsx` — wraps every page below in
  `SidebarProvider` + `AppSidebar`. This is a Next.js *route group*
  (parentheses don't affect the URL), so `/panel` and
  `/onboarding/organisation` etc. keep their exact same URLs.

## Pages moved into the sidebar shell
- `panel/` → `(dashboard)/panel/` — the team dashboard (Members / Loan
  Account / Loan Requests tabs). Their old inline `LChamaHeader` /
  `LChamaFooter` were removed since the sidebar shell replaces them.
- `onboarding/organisation/` → `(dashboard)/onboarding/organisation/` —
  the "Register Organisation" form from your screenshot.
- `onboarding/pending/` → `(dashboard)/onboarding/pending/`.

The sidebar's **Contribute** link deep-links straight into the Loan
Account tab (`/panel?tab=loan-account`) — `PanelClient` now accepts an
optional `defaultTab` prop read from the URL.

## New pages (so every sidebar link goes somewhere real)
- `(dashboard)/transactions/page.tsx` — a real transaction history built
  from loan disbursements + repayments (the only ledger-like data your
  schema currently has).
- `(dashboard)/settings/page.tsx` — a real read-only account summary
  pulled from the database.
- `(dashboard)/help/page.tsx` — a static FAQ page.
- `(dashboard)/scheduled-payments/page.tsx`,
  `(dashboard)/deposit/page.tsx`, `(dashboard)/withdraw/page.tsx` — these
  three don't have a data model behind them yet (no deposit/withdraw
  ledger in `prisma/schema.prisma`), so they render a "Coming soon" card
  via the new `ComingSoon` component, but they're real, guarded,
  navigable pages rather than dead links.
- `src/lib/require-panel-access.ts` — shared auth/onboarding guard so
  every new page enforces the same "signed in → profile complete → has
  an approved chama" rule the panel page already used, without
  copy-pasting the redirect chain.

## Pre-existing issues fixed along the way
While verifying the build, three **pre-existing** TypeScript
implicit-`any` errors (unrelated to this change, present in your
original code) were fixed so the project actually type-checks cleanly:
`src/app/admin/page.tsx`, and two spots in
`(dashboard)/panel/actions.ts` and `(dashboard)/panel/page.tsx`.

## Verified
- `npx tsc --noEmit` — no new errors versus your original codebase.
- `npx next build` — compiles successfully. (Full production build
  can't complete in this sandbox because outbound access to
  `binaries.prisma.sh` is blocked here, so `prisma generate` can't run —
  this isn't a code issue, just a sandbox network restriction. Run
  `npm install` in your own environment and it'll generate normally.)

---

# Update 2 — Team Members, Profile, Reports

**No folders were moved or renamed this time** — unlike the previous
update, you do **not** need to delete anything first. Just extract this
over your project (after having already removed the old
`src/app/panel`, `src/app/onboarding/organisation`, and
`src/app/onboarding/pending` from last time).

## Sidebar changes
- Removed **Apply to Start a Chama** from the sidebar. The
  `/onboarding/organisation` page and its route still exist and still
  work exactly as before (new owners are auto-redirected there right
  after completing their profile) — it just isn't a permanent nav item
  anymore, since it's a one-time step, not something people revisit.
- Added **Team Members** in its place → `/team`.
- Added **Reports** to the main nav → `/reports`.
- Added **Profile** to the bottom nav (next to Help Center and
  Settings) → `/profile`.

## New: Team Members (`/team`)
The "Members" tab from the Dashboard (invite, remove, leave, pending
invites) is now also its own full page, reusing the exact same UI and
server actions — nothing about how it behaves changed, it's just
addressable on its own instead of only living inside a Dashboard tab.
To make this possible without duplicating code:
- `src/components/panel/team-types.ts` — shared types.
- `src/components/panel/TeamMembersSection.tsx` — the extracted
  component (this used to be the private `MembersTab` function inside
  `PanelClient.tsx`).
- `(dashboard)/panel/PanelClient.tsx` — its Members tab now renders the
  shared component instead of its own inline copy. The Dashboard's
  Members tab still works exactly as before.
- `(dashboard)/team/page.tsx` — the new page, using the same
  `requirePanelAccess` guard as everything else.

## New: Profile (`/profile`)
A real, editable profile page — separate from the one-time onboarding
form (which requires setting a password and only runs once). Lets a
signed-in member update their name, email, ID/passport number, gender,
country, and region at any time.
- `(dashboard)/profile/actions.ts` — new `updateProfile` server action
  (updates the DB and keeps Clerk's name in sync; doesn't touch
  password or onboarding status).
- `(dashboard)/profile/ProfileEditClient.tsx` — the form.
- `(dashboard)/profile/page.tsx` — loads the signed-in user's current
  values.

## New: Reports (`/reports`)
A real numbers page, not a placeholder — built from your existing loan
account and loan request data: member count, loan account balance,
total loans issued, total repaid, outstanding balance, and pending
requests. `(dashboard)/reports/page.tsx`.

## Verified
- `npx tsc --noEmit` — no new errors.
- `npx next build` — compiles successfully (same Prisma-engine sandbox
  limitation as before prevents the full type-check step from
  completing here; run `npx prisma generate` in your own environment
  and it resolves).



## Privacy Policy "I Agree" + payout notice + 25th deadline reminders

**Privacy Policy tick box** (`components/PrivacyConsent.tsx`) — links to `/privacy` (opens in a new tab) and must be ticked before an applicant can continue:
- Sign-up page: Clerk's form only appears after ticking.
- Organisation registration (recorded on `Team.privacyPolicyAccepted` + `termsAcceptedAt`, enforced server-side).
- Accepting a chama invite (auto-accept no longer skips it).
- Junior Account applications.
Acceptance time is stored on the new `User.privacyPolicyAcceptedAt`.

**Payout notice on the chama Dashboard** — Overview tab shows e.g. `Payout. Sept 2026, LB0048; Linda Atieno` (Ludeva Number = the member's `ludevaMemberNumber`). New `PayoutSchedule` model; the Team Leader (or anyone with "manage roles") sets it from "Manage payout schedule" on the Dashboard.

**Deadline reminders (25th of every month)** — Dashboard card with a live "N days left" countdown, plus a daily cron (`/api/cron/contribution-reminders`, `vercel.json`) that sends in-app notifications 5 days before, 1 day before and on the 25th, and a payout notice on the 1st. Dates use Nairobi time.

**Deploy steps:** `npx prisma db push` (new table + column), set `CRON_SECRET` in your env.


## Fix: duplicate savings entries

Cause: `/api/savings/sync` (and the admin CSV sync) always INSERTed, and the Apps Script only marked a row "✅ Pushed" after the call returned — so a timed-out or overlapping run re-pushed rows the server had already saved.
- `src/lib/savings-upsert.ts` — rows are now matched on member + account no. + date + period label and updated in place; also de-duplicated within a batch and serialised with a Postgres advisory lock. Used by the webhook and the admin CSV paste.
- `scripts/savings-push.gs` — script lock (no overlapping runs), batches of 50, status written per batch.
- `prisma/dedupe-savings.ts` — one-off cleanup of existing duplicates (dry run by default, `--apply` to delete).
