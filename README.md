# L Chama — Standalone App

A fully independent spin-out of the L Chama product from Ludeva:
own codebase, own database, own Clerk (auth) project, deployed on its
own subdomain (`lchama.ludevaplc.co.ke`).

## What changed vs. the embedded version

This started as `/lchama/*` inside the main Ludeva app, sharing Ludeva's
MongoDB and Clerk project. This app is the fully separated version:

- **Database**: its own PostgreSQL database, own Prisma schema
  (`prisma/schema.prisma`). The `User` model here only carries what
  L Chama needs (`fullName`, `phone`, `onboardingCompleted`) — no KYC,
  no investment fields.
- **Auth**: its own Clerk project. A person needs a separate account here
  from their Ludeva account — signing in on one does not sign you in on
  the other.
- **Routes**: since this app *is* L Chama, routes live at the root —
  `/`, `/onboarding`, `/panel`, `/invite/[token]` — rather than nested
  under `/lchama/*`.

## ⚠️ Data migration — not yet done

Ludeva's database currently has real chamas, members, loan requests, etc.
under the old shared schema (`Team`, `TeamMembership`, `LoanRequest`, etc.
in `ludeva-mmf-app`'s database). **This standalone app starts with an
empty database** — moving that existing data across, and re-creating
accounts in the new Clerk project for existing chama owners/members, is a
separate piece of work that hasn't been done. Don't point this at
production DNS until that's planned, or existing chamas will appear to
have vanished.

Note: the `ludeva.tar` codebase snapshot this was originally built from
used a MongoDB datasource (`@db.ObjectId`, `@map("_id")`) in its Prisma
schema. If Ludeva's actual production database is PostgreSQL, that
snapshot's schema file may be stale — worth confirming against what's
actually deployed before planning the migration, since the migration
approach differs depending on the source database type.

## Onboarding pipeline

Signing up now goes through four steps, matching the client's mockup:

1. **`/sign-up`** — phone number (with country code) + optional email.
   OTP is sent to the phone (and to email too, if one was given). This
   uses a custom flow (`SignUpPhoneClient.tsx`) built on Clerk's client
   SDK — not Clerk's prebuilt `<SignUp/>` widget — since the product
   needs phone-first, not email/password-first, sign-up.
2. **`/onboarding/profile`** — first/last name, ID/passport number,
   optional email, gender, country, region/county, and a password (set
   on the Clerk account for the first time here, since phone-OTP sign-up
   doesn't require one up front).
3. **`/onboarding/organisation`** — organisation/full name, business
   registration number or national ID, member count, director count,
   physical address, optional comments, and the chama level. Submitting
   creates the chama with `approvalStatus: PENDING_APPROVAL` — it is
   **not live yet**.
4. **`/onboarding/pending`** — a holding screen shown to the owner while
   awaiting review (or showing the rejection reason, if rejected).
   Nothing in `/panel` — inviting members, funding the loan account —
   works until an admin approves it.

### Admin approval

**`/admin`** lists every submitted organisation with Approve/Reject
actions. Access is gated by `ADMIN_CLERK_IDS` (see `.env.example`) — a
plain allowlist of Clerk user IDs, not a database role, so there's no
bootstrapping problem for who approves the very first admin.

### Required Clerk project configuration

This custom flow needs your Clerk project's **Sign-up settings** set to:
- **Phone number**: required
- **Email address**: optional
- **Password**: not required at sign-up (a password is instead set
  explicitly in the profile step, via `clerkClient.users.updateUser`)
- **Phone OTP (SMS code)** enabled as a sign-up verification strategy

Without matching these, `signUp.create()` / `attemptPhoneNumberVerification()`
calls in `SignUpPhoneClient.tsx` will fail or behave differently than this
flow expects.

## Setup

1. `cp .env.example .env` and fill in:
   - `DATABASE_URL` — a new, separate PostgreSQL database
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from a
     **new** Clerk project (not the Ludeva one)
   - `RESEND_API_KEY` — can reuse the same Resend account, but consider a
     dedicated sending domain/subdomain for deliverability
2. `npm install`
3. `npm run db:push` — pushes the schema to your new database
4. `npm run dev` — runs on port 9003 by default

## Deploying

Point a new subdomain (`lchama.ludevaplc.co.ke`) at a separate deployment
of this app (e.g. its own Vercel project). Set `NEXT_PUBLIC_APP_URL` to
that subdomain so invite emails link correctly.
