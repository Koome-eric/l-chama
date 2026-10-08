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

## Admin › Savings Accounts: detect & delete duplicate records
- New "Duplicate records" card on the admin Savings screen: "Scan for duplicates" lists every group of
  entries with the same member (email, else phone) + account no. + date + period label — the exact key the
  sync uses — across ALL entries (not just the 200 shown in the table).
- Each group shows every copy side by side (Keep / Delete) and whether the copies are "Identical" or
  "Figures differ". Delete one group, or "Delete all duplicates". The most recently updated copy is kept.
- Server recomputes duplicates itself on delete (browser ids are never trusted) and holds the sync advisory
  lock so it can't race a Google Sheets push. Needs the existing `canManageSavings` admin permission.
- Entries with no email and no phone are never grouped.
- Files: src/lib/savings-upsert.ts, src/app/admin/actions.ts, src/app/admin/AdminClient.tsx

## Admin › Savings Accounts: multi-select + bulk actions
- Checkbox on every row plus select-all (applies to the rows matching the current search).
- A toolbar appears when anything is selected: **Delete selected**, **Re-match chama** (re-links the
  selected entries to a chama by member email — fixes "Unmatched" rows after a member joins), **Export CSV**
  (downloads the selected rows, same column order the sync expects), and Clear.
- Server actions `deleteSavingsEntries` / `rematchSavingsEntries` (max 1000 per call, `canManageSavings`).
- Files: src/app/admin/actions.ts, src/app/admin/AdminClient.tsx

## Update: duplicate detection by member name, keep the original
- "Detect duplicates" now defaults to **Match by: Same member name** (case/spacing/punctuation-insensitive)
  + account no. + date + period, so repeats with different/missing emails are caught. "Same email / phone"
  is still available.
- **Keep: Original (oldest)** is the default; "Latest update" is the alternative. Exactly one record per
  group remains after "Delete all duplicates".
- Entries for different periods/dates are never grouped, so a member's monthly history is safe.
- Files: src/lib/savings-upsert.ts, src/app/admin/actions.ts, src/app/admin/AdminClient.tsx
