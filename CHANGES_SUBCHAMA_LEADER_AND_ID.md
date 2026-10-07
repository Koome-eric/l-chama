# Team Leader leads every sub-chama + keep ID numbers off team pages

## Sub-chama leadership
- The Team Leader (chama owner) is now ALWAYS the leader of every sub-chama.
- `createSubTeam` takes only a name; `leaderId` is set to `ctx.team.ownerId`.
- `changeSubTeamLeader` and the "Change leader" UI were removed.
- Existing data: run `npx tsx prisma/reassign-subchama-leaders.ts` (dry run), then
  `npx tsx prisma/reassign-subchama-leaders.ts --apply`. Former sub-chama leaders are
  kept as ordinary members of the same sub-chama. No schema change / no db push needed.

## ID / passport privacy
- Team-facing pages (/team, /sub-chamas, /panel) never receive anyone's ID/passport number.
- /team members table now has a "Ludeva No." column (admin-VERIFIED numbers only).
- Full ID/passport numbers remain visible only on the admin dashboard (AdminClient) and to
  the user on their own Profile/Settings.

## Files
- src/app/(dashboard)/sub-chamas/actions.ts
- src/app/(dashboard)/sub-chamas/page.tsx
- src/components/panel/SubChamasSection.tsx
- src/app/(dashboard)/team/page.tsx
- src/components/panel/team-types.ts
- src/components/panel/TeamMembersSection.tsx
- prisma/reassign-subchama-leaders.ts (new)

## Follow-up: stored ID no longer sent to the browser anywhere in the member UI
- Settings page: "ID number" row replaced with "Ludeva number" (verified only).
- Profile page: ID field starts empty (password-masked) with "on file — leave blank to keep it";
  `updateProfile` keeps the existing ID when left blank.
- Invite page: if an ID is already on file the field is hidden and the stored ID is used server-side.
- Files: settings/page.tsx, profile/{page,ProfileEditClient,actions}, invite/[token]/{page,InviteAcceptClient,actions}
