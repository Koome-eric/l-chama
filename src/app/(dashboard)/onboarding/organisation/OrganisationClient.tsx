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
import { CheckCircle2 } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    organisationName.trim().length >= 2 &&
    registrationNumber.trim().length >= 2 &&
    Number(numberOfMembers) >= 1 &&
    Number(totalDirectors) >= 1 &&
    physicalAddress.trim().length >= 3 &&
    !!levelKey;

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
