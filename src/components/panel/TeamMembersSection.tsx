'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Trash2, ShieldCheck, Settings2 } from 'lucide-react';
import {
  inviteChamaMember,
  revokeChamaInvite,
  removeChamaMember,
  leaveChama,
  updateMemberPermissions,
} from '@/app/(dashboard)/panel/actions';
import { PERMISSION_LABELS, DEFAULT_INVITE_PERMISSIONS, type ChamaPermissions } from '@/lib/chama';
import type { TeamMembersData, TeamMember } from './team-types';

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as (keyof ChamaPermissions)[];

// Compact role editor used both when sending an invite and when editing
// an existing member's access. Owner/self editing is handled by callers.
function PermissionCheckboxes({
  value,
  onChange,
}: {
  value: ChamaPermissions;
  onChange: (next: ChamaPermissions) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {PERMISSION_KEYS.map((key) => (
        <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input"
            checked={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          />
          <span>{PERMISSION_LABELS[key]}</span>
        </label>
      ))}
    </div>
  );
}

function roleSummary(m: TeamMember | ChamaPermissions): string {
  const count = PERMISSION_KEYS.filter((k) => m[k]).length;
  if (count === 0) return 'View only';
  if (count === PERMISSION_KEYS.length) return 'Full access';
  return `${count} permission${count === 1 ? '' : 's'}`;
}

export function TeamMembersSection({
  team,
  currentUserId,
}: {
  team: TeamMembersData;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerms, setInvitePerms] = useState<ChamaPermissions>(DEFAULT_INVITE_PERMISSIONS);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editPerms, setEditPerms] = useState<ChamaPermissions>(DEFAULT_INVITE_PERMISSIONS);

  const canInvite = team.isOwner || team.permissions.canInvite;
  const canManagePermissions = team.isOwner || team.permissions.canManagePermissions;
  const canRemove = team.isOwner || team.permissions.canRemoveMembers;

  const handleInvite = () => {
    startTransition(async () => {
      try {
        const res = await inviteChamaMember(inviteEmail, invitePerms);
        toast({ title: 'Invite sent', description: `An invite email was sent to ${inviteEmail}.` });
        setInviteOpen(false);
        setInviteEmail('');
        setInvitePerms(DEFAULT_INVITE_PERMISSIONS);
        if (res.acceptUrl) navigator.clipboard?.writeText(res.acceptUrl).catch(() => {});
        window.location.reload();
      } catch (err: any) {
        toast({ title: "Couldn't send invite", description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleRevoke = (inviteId: string) => {
    startTransition(async () => {
      try {
        await revokeChamaInvite(inviteId);
        toast({ title: 'Invite revoked' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleRemove = (membershipId: string) => {
    if (!confirm('Remove this member from the chama?')) return;
    startTransition(async () => {
      try {
        await removeChamaMember(membershipId);
        toast({ title: 'Member removed' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleLeave = () => {
    if (!confirm('Leave this chama? You will lose access to the shared dashboard.')) return;
    startTransition(async () => {
      try {
        await leaveChama();
        toast({ title: 'You left the chama' });
        window.location.href = '/';
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const openEditPerms = (m: TeamMember) => {
    setEditingMember(m);
    setEditPerms({
      canInvite: m.canInvite,
      canManagePermissions: m.canManagePermissions,
      canRemoveMembers: m.canRemoveMembers,
      canApproveLoans: m.canApproveLoans,
      canInvestPooled: m.canInvestPooled,
      canViewPooledFunds: m.canViewPooledFunds,
      canManageReports: m.canManageReports,
      canWithdraw: m.canWithdraw,
    });
  };

  const handleSavePerms = () => {
    if (!editingMember) return;
    startTransition(async () => {
      try {
        await updateMemberPermissions(editingMember.membershipId, editPerms);
        toast({ title: 'Role updated' });
        setEditingMember(null);
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> {team.name}
            </CardTitle>
            <CardDescription>Everyone in your chama, in one place.</CardDescription>
          </div>
          {canInvite && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add a chama member</DialogTitle>
                  <DialogDescription>
                    They'll get an email with a link to accept and join the shared dashboard. Choose what
                    they can access below — you can change this anytime from the members list.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="inviteEmail">Email address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="member@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Role &amp; permissions</Label>
                    <PermissionCheckboxes value={invitePerms} onChange={setInvitePerms} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleInvite} disabled={isPending || !inviteEmail.includes('@')}>
                    {isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>
            The Team Leader always has full access. Everyone else's access is set per member — tap
            {' '}<Settings2 className="inline h-3.5 w-3.5" />{' '}to view or change what someone can do.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {(canRemove || canManagePermissions) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{team.owner.fullName || '—'}</TableCell>
                <TableCell>{team.owner.email}</TableCell>
                <TableCell>
                  <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Team Leader</Badge>
                </TableCell>
                {(canRemove || canManagePermissions) && <TableCell />}
              </TableRow>
              {team.members.map((m) => (
                <TableRow key={m.membershipId}>
                  <TableCell className="font-medium">
                    {m.fullName || '—'}
                    {m.userId === currentUserId && <span className="text-muted-foreground"> (you)</span>}
                  </TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleSummary(m)}</Badge>
                  </TableCell>
                  {(canRemove || canManagePermissions) && (
                    <TableCell className="text-right space-x-1">
                      {canManagePermissions && m.userId !== currentUserId && (
                        <Button size="sm" variant="ghost" onClick={() => openEditPerms(m)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      )}
                      {canRemove && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemove(m.membershipId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {!team.isOwner && (
          <CardFooter>
            <Button variant="outline" onClick={handleLeave} disabled={isPending}>
              Leave Chama
            </Button>
          </CardFooter>
        )}
      </Card>

      {canInvite && team.invites.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell><Badge variant="secondary">{roleSummary(inv)}</Badge></TableCell>
                    <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(inv.id)}>
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editingMember?.fullName || editingMember?.email}'s role</DialogTitle>
            <DialogDescription>Choose exactly what this member can access or edit.</DialogDescription>
          </DialogHeader>
          <PermissionCheckboxes value={editPerms} onChange={setEditPerms} />
          <DialogFooter>
            <Button onClick={handleSavePerms} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
