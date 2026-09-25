'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Network, UserPlus, Trash2, Crown, Settings2, ArrowRightLeft, Users } from 'lucide-react';
import {
  createSubTeam,
  renameSubTeam,
  changeSubTeamLeader,
  deleteSubTeam,
  addSubTeamMember,
  removeSubTeamMember,
  moveSubTeamMember,
} from '@/app/(dashboard)/sub-chamas/actions';
import type { SubChamasData, SubTeamRow } from './subteam-types';

export function SubChamasSection({ data }: { data: SubChamasData }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLeaderId, setNewLeaderId] = useState('');

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [leaderChangeId, setLeaderChangeId] = useState<string | null>(null);
  const [leaderChangeValue, setLeaderChangeValue] = useState('');

  const [addMemberSubTeamId, setAddMemberSubTeamId] = useState<string | null>(null);
  const [addMemberValue, setAddMemberValue] = useState('');

  const leaderIds = useMemo(() => new Set(data.subTeams.map((st) => st.leader.userId)), [data.subTeams]);
  const eligibleLeaders = useMemo(
    () => data.allMembers.filter((m) => !leaderIds.has(m.userId)),
    [data.allMembers, leaderIds]
  );

  const run = (action: () => Promise<unknown>, successMsg: string, errTitle = 'Error') => {
    startTransition(async () => {
      try {
        await action();
        toast({ title: successMsg });
        window.location.reload();
      } catch (err: any) {
        toast({ title: errTitle, description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleCreate = () =>
    run(
      () => createSubTeam({ name: newName, leaderMembershipId: newLeaderId }),
      'Sub-chama created',
      "Couldn't create sub-chama"
    );

  const openRename = (st: SubTeamRow) => {
    setRenamingId(st.id);
    setRenameValue(st.name);
  };
  const handleRename = () =>
    run(() => renameSubTeam(renamingId!, renameValue), 'Sub-chama renamed', "Couldn't rename");

  const openLeaderChange = (st: SubTeamRow) => {
    setLeaderChangeId(st.id);
    setLeaderChangeValue('');
  };
  const handleLeaderChange = () =>
    run(
      () => changeSubTeamLeader(leaderChangeId!, leaderChangeValue),
      'Leader updated',
      "Couldn't change leader"
    );

  const handleDelete = (st: SubTeamRow) => {
    if (!confirm(`Delete "${st.name}"? Members stay in the chama — this only removes the grouping.`)) return;
    run(() => deleteSubTeam(st.id), 'Sub-chama deleted', "Couldn't delete");
  };

  const openAddMember = (subTeamId: string) => {
    setAddMemberSubTeamId(subTeamId);
    setAddMemberValue('');
  };
  const handleAddMember = () =>
    run(
      () => addSubTeamMember(addMemberSubTeamId!, addMemberValue),
      'Member added',
      "Couldn't add member"
    );

  const handleRemoveMember = (subTeamMembershipId: string) => {
    if (!confirm('Remove this member from the sub-chama? They stay a full chama member.')) return;
    run(() => removeSubTeamMember(subTeamMembershipId), 'Member removed', "Couldn't remove member");
  };

  const handleMove = (subTeamMembershipId: string, targetSubTeamId: string) => {
    if (!targetSubTeamId) return;
    run(() => moveSubTeamMember(subTeamMembershipId, targetSubTeamId), 'Member moved', "Couldn't move member");
  };

  const canManageThis = (st: SubTeamRow) => data.canManage || st.isMine;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" /> Sub-Chamas
            </CardTitle>
            <CardDescription>
              Each sub-chama has one leader and its own members, drawn from {data.teamName}. Money,
              loans and withdrawals stay on the main chama — this is just how you organise people.
            </CardDescription>
          </div>
          {data.canManage && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 whitespace-nowrap">
                  <UserPlus className="h-4 w-4" /> New Sub-Chama
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create a sub-chama</DialogTitle>
                  <DialogDescription>
                    Pick a name and a leader from {data.teamName}'s current members. The leader gets
                    to add and remove members in their own sub-chama afterward.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="subteamName">Name</Label>
                    <Input
                      id="subteamName"
                      placeholder="e.g. Table Banking Group A"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Leader</Label>
                    <Select value={newLeaderId} onValueChange={setNewLeaderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a member" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleLeaders.map((m) => (
                          <SelectItem key={m.membershipId} value={m.membershipId}>
                            {m.fullName || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {eligibleLeaders.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Every current member already leads a sub-chama.
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={isPending || !newName.trim() || !newLeaderId}>
                    {isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
      </Card>

      {data.subTeams.length === 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-10 text-center text-muted-foreground">
            No sub-chamas yet.{' '}
            {data.canManage ? 'Create one above to start organising members into groups.' : 'Ask your chama admin to set one up.'}
          </CardContent>
        </Card>
      )}

      {data.subTeams.map((st) => (
        <Card key={st.id} className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {st.name}
                {st.isMine && <Badge variant="secondary">You lead this</Badge>}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1">
                <Crown className="h-3.5 w-3.5" />
                {st.leader.fullName || st.leader.email}
                <span className="text-muted-foreground/70">
                  {' '}
                  · {st.members.length} member{st.members.length === 1 ? '' : 's'}
                </span>
              </CardDescription>
            </div>
            {data.canManage && (
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openRename(st)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openLeaderChange(st)}>
                  <Crown className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(st)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {canManageThis(st) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {st.members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageThis(st) ? 3 : 2} className="text-center text-muted-foreground">
                      No members yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  st.members.map((m) => (
                    <TableRow key={m.subTeamMembershipId}>
                      <TableCell className="font-medium">{m.fullName || '—'}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      {canManageThis(st) && (
                        <TableCell className="text-right space-x-1">
                          {data.canManage && data.subTeams.length > 1 && (
                            <Select onValueChange={(v) => handleMove(m.subTeamMembershipId, v)}>
                              <SelectTrigger className="inline-flex h-8 w-8 p-0 justify-center border-none shadow-none [&>svg]:hidden">
                                <ArrowRightLeft className="h-4 w-4" />
                              </SelectTrigger>
                              <SelectContent>
                                {data.subTeams
                                  .filter((other) => other.id !== st.id)
                                  .map((other) => (
                                    <SelectItem key={other.id} value={other.id}>
                                      Move to {other.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(m.subTeamMembershipId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {canManageThis(st) && (
              <div className="flex items-center gap-2 pt-1">
                <Select
                  value={addMemberSubTeamId === st.id ? addMemberValue : ''}
                  onValueChange={(v) => {
                    setAddMemberSubTeamId(st.id);
                    setAddMemberValue(v);
                  }}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Add a member from the chama" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.unassigned.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Everyone is already placed in a sub-chama.
                      </div>
                    ) : (
                      data.unassigned.map((m) => (
                        <SelectItem key={m.membershipId} value={m.membershipId}>
                          {m.fullName || m.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || addMemberSubTeamId !== st.id || !addMemberValue}
                  onClick={handleAddMember}
                >
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {data.unassigned.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Not yet in a sub-chama
            </CardTitle>
            <CardDescription>
              Still full members of {data.teamName} — just not grouped into a sub-chama yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.unassigned.map((m) => (
                <Badge key={m.membershipId} variant="secondary">
                  {m.fullName || m.email}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rename dialog */}
      <Dialog open={!!renamingId} onOpenChange={(open) => !open && setRenamingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename sub-chama</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button onClick={handleRename} disabled={isPending || !renameValue.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change leader dialog */}
      <Dialog open={!!leaderChangeId} onOpenChange={(open) => !open && setLeaderChangeId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change leader</DialogTitle>
            <DialogDescription>Pick a new leader from {data.teamName}'s members.</DialogDescription>
          </DialogHeader>
          <Select value={leaderChangeValue} onValueChange={setLeaderChangeValue}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a member" />
            </SelectTrigger>
            <SelectContent>
              {data.allMembers
                .filter((m) => !leaderIds.has(m.userId) || m.userId === data.subTeams.find((s) => s.id === leaderChangeId)?.leader.userId)
                .map((m) => (
                  <SelectItem key={m.membershipId} value={m.membershipId}>
                    {m.fullName || m.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={handleLeaderChange} disabled={isPending || !leaderChangeValue}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
