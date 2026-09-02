'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CHAMA_LEVELS, formatKES, type ChamaLevelKey } from '@/lib/chama-levels';
import { registerOrganisation } from './actions';
import { CheckCircle2, Globe, HeartHandshake } from 'lucide-react';

const OBJECTIVES: { key: string; label: string }[] = [
  { key: 'BUY_ASSETS', label: 'Saving to buy assets' },
  { key: 'GET_A_LOAN', label: 'Saving to get a loan' },
  { key: 'GET_INTEREST', label: 'Saving to get interest' },
  { key: 'SCHOOL_FEES', label: 'Saving for school fees' },
  { key: 'DECEMBER_HOLIDAY', label: 'Saving for December holiday' },
];

export function OrganisationClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [organisationName, setOrganisationName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [numberOfMembers, setNumberOfMembers] = useState('');
  const [totalDirectors, setTotalDirectors] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [levelKey, setLevelKey] = useState<ChamaLevelKey | null>(null);

  // Kenya-diaspora support
  const [isDiaspora, setIsDiaspora] = useState(false);

  // Chama objectives (multi-select)
  const [objectives, setObjectives] = useState<string[]>([]);

  // Member background split
  const [membersRunningSME, setMembersRunningSME] = useState('');
  const [membersEmployed, setMembersEmployed] = useState('');

  // Last Respect Cover
  const [hasLastRespectCover, setHasLastRespectCover] = useState(false);
  const [lastRespectContribution, setLastRespectContribution] = useState('');

  const [error, setError] = useState<string | null>(null);

  const toggleObjective = (key: string) => {
    setObjectives((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const canSubmit =
    organisationName.trim().length >= 2 &&
    registrationNumber.trim().length >= 2 &&
    Number(numberOfMembers) >= 1 &&
    Number(totalDirectors) >= 1 &&
    physicalAddress.trim().length >= 3 &&
    !!levelKey &&
    objectives.length >= 1 &&
    membersRunningSME !== '' &&
    membersEmployed !== '' &&
    (!hasLastRespectCover || Number(lastRespectContribution) > 0);

  const handleSubmit = () => {
    if (!levelKey) return;
    setError(null);
    startTransition(async () => {
      try {
        await registerOrganisation({
          organisationName,
          registrationNumber,
          numberOfMembers: Number(numberOfMembers),
          totalDirectors: Number(totalDirectors),
          physicalAddress,
          additionalComments: additionalComments || undefined,
          levelKey,
          isDiaspora,
          objectives: objectives as any,
          membersRunningSME: Number(membersRunningSME),
          membersEmployed: Number(membersEmployed),
          hasLastRespectCover,
          lastRespectContribution: hasLastRespectCover ? Number(lastRespectContribution) : undefined,
        });
        toast({ title: 'Submitted for approval', description: "We'll notify you once it's reviewed." });
        router.push('/onboarding/pending');
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="organisationName">Organisation Name/Your Full Name</Label>
            <Input
              id="organisationName"
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="registrationNumber">Business Registration Number/National ID</Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numberOfMembers">Number of Members</Label>
              <Input
                id="numberOfMembers"
                type="number"
                min={1}
                value={numberOfMembers}
                onChange={(e) => setNumberOfMembers(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="totalDirectors">Total Directors</Label>
              <Input
                id="totalDirectors"
                type="number"
                min={1}
                value={totalDirectors}
                onChange={(e) => setTotalDirectors(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="physicalAddress">Physical Address</Label>
            <Input
              id="physicalAddress"
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="additionalComments">Additional Comments (Optional)</Label>
            <Textarea
              id="additionalComments"
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={isDiaspora}
              onChange={(e) => setIsDiaspora(e.target.checked)}
            />
            <span>
              <span className="font-medium flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-primary" /> This is a Kenya-diaspora chama
              </span>
              <span className="text-sm text-muted-foreground">
                Check this if most of your members contribute from outside Kenya. We'll flag your
                chama for diaspora-specific support.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-headline font-semibold text-lg">What is your chama's objectives?</h2>
          <p className="text-sm text-muted-foreground">Select all that apply.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {OBJECTIVES.map((o) => (
              <label
                key={o.key}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer ${
                  objectives.includes(o.key) ? 'border-primary bg-primary/5' : 'border-border/50'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={objectives.includes(o.key)}
                  onChange={() => toggleObjective(o.key)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-headline font-semibold text-lg">
            What is the background of your members?
          </h2>
          <p className="text-sm text-muted-foreground">
            Roughly how many of your members fall into each group?
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="membersRunningSME">Running SMEs (number of members)</Label>
              <Input
                id="membersRunningSME"
                type="number"
                min={0}
                value={membersRunningSME}
                onChange={(e) => setMembersRunningSME(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="membersEmployed">Employed (number of members)</Label>
              <Input
                id="membersEmployed"
                type="number"
                min={0}
                value={membersEmployed}
                onChange={(e) => setMembersEmployed(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={hasLastRespectCover}
              onChange={(e) => setHasLastRespectCover(e.target.checked)}
            />
            <span>
              <span className="font-medium flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4 text-chama" /> Enable Last Respect Cover
              </span>
              <span className="text-sm text-muted-foreground">
                A bereavement fund your members contribute to, separate from the loan account —
                paid out to support a member's family, or a member's own loss, when the need arises.
              </span>
            </span>
          </label>
          {hasLastRespectCover && (
            <div>
              <Label htmlFor="lastRespectContribution">Contribution per member (KES)</Label>
              <Input
                id="lastRespectContribution"
                type="number"
                min={1}
                value={lastRespectContribution}
                onChange={(e) => setLastRespectContribution(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-headline font-semibold text-lg">Choose a chama level</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {CHAMA_LEVELS.map((level) => {
              const selected = levelKey === level.key;
              return (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => setLevelKey(level.key)}
                  className={`relative text-left rounded-xl border p-4 transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/40'
                  }`}
                >
                  {selected && <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />}
                  <p className="font-headline font-semibold">{level.name}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatKES(level.monthlyAmount)}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Up to {level.groupSize} members</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button size="lg" disabled={!canSubmit || isPending} onClick={handleSubmit}>
        {isPending ? 'Submitting…' : 'Submit Organisation for Approval'}
      </Button>
    </div>
  );
}
