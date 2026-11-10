# Multi-chama, admin handover, chama identifier, county/sub-county, Ludeva login link

## Database (run `npx prisma db push`, then the backfill)
- User: + residentSubCounty  (county is the existing `region`, shown as "Resident County" for Kenya)
- Team: ownerId no longer unique
- TeamMembership: userId no longer unique; unique (teamId, userId)
- SubTeamMembership: userId no longer unique; + teamId; unique (userId, teamId)
- Then: `npx tsx prisma/backfill-subteam-membership-team.ts`

## Behaviour
1. One email can own/join several chamas. Active chama = cookie `lchama_active_team`,
   switched from the sidebar (src/components/ChamaSwitcher.tsx). getChamaContext(user)
   still returns the active chama, so existing pages are unchanged.
2. Admin exit: Team Members -> "Appoint new Admin & exit" (transferChamaOwnership in
   src/app/(dashboard)/panel/actions.ts). Blocked if the chosen member is Secretary/Treasurer,
   or the outgoing admin has an open loan/guarantee.
3. A chama is identified by its name + its ADMIN's Ludeva Number (the member number issued on
   the Ludeva platform, User.ludevaMemberNumber). Nothing is stored on the chama; it follows the
   current admin. Shown in the switcher, team page, invites, admin list (searchable).
   Sheet rows may carry `chamaName` / `ludevaNumber` (= admin's number) — src/lib/chama-match.ts.
4. County = the existing Region/County field (labelled "Resident County" for Kenya); Sub-county
   added (required for Kenya). In onboarding, profile edit, invite acceptance, admin views.
5. Landing page links to the Ludeva login: set NEXT_PUBLIC_LUDEVA_LOGIN_URL
   (src/lib/ludeva-links.ts; defaults to https://ludevaplc.co.ke).
6. Savings de-duplication key now includes the chama (src/lib/savings-upsert.ts).

## Verification
`prisma generate` (engine-less) + `tsc --noEmit`: 0 errors. Not run against a live database or browser.
