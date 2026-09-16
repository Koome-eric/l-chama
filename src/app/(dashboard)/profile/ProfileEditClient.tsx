'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, KENYA_COUNTIES } from '@/lib/countries';
import { updateProfile, submitLudevaMembership } from './actions';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

type Defaults = {
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
  country: string;
  region: string;
};

type LudevaInfo = {
  memberNumber: string;
  status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason: string | null;
};

export function ProfileEditClient({ defaults, ludeva }: { defaults: Defaults; ludeva: LudevaInfo }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [idNumber, setIdNumber] = useState(defaults.idNumber);
  const [email, setEmail] = useState(defaults.email);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>(defaults.gender);
  const [country, setCountry] = useState(defaults.country || 'KE');
  const [region, setRegion] = useState(defaults.region);
  const [error, setError] = useState<string | null>(null);

  const isKenya = country === 'KE';
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    idNumber.trim().length >= 4 &&
    !!gender &&
    !!country &&
    region.trim().length > 0;

  const handleSubmit = () => {
    if (!gender) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateProfile({
          firstName,
          lastName,
          idNumber,
          email: email || undefined,
          gender,
          country,
          region,
        });
        toast({ title: 'Profile updated' });
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    });
  };

  return (
    <>
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="idNumber">ID/Passport Number</Label>
          <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <Select value={country} onValueChange={(v) => { setCountry(v); setRegion(''); }}>
              <SelectTrigger id="country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.filter((c) => ['KE', 'UG', 'TZ', 'RW'].includes(c.code)).map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="region">Region/County</Label>
            {isKenya ? (
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  {KENYA_COUNTIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region" />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button size="lg" className="w-full sm:w-auto" disabled={!canSubmit || isPending} onClick={handleSubmit}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>

    <LudevaMembershipCard ludeva={ludeva} />
    </>
  );
}

function LudevaMembershipCard({ ludeva }: { ludeva: LudevaInfo }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [memberNumber, setMemberNumber] = useState(ludeva.memberNumber);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    startTransition(async () => {
      try {
        await submitLudevaMembership(memberNumber);
        toast({ title: 'Submitted', description: 'An admin will confirm your Ludeva membership number.' });
        setSubmitted(true);
      } catch (err: any) {
        toast({ title: 'Could not submit', description: err.message, variant: 'destructive' });
      }
    });
  };

  const status = submitted ? 'PENDING' : ludeva.status;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-headline font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Ludeva Plc Membership
          </p>
          {status !== 'NONE' && (
            <Badge variant={status === 'VERIFIED' ? 'default' : status === 'REJECTED' ? 'destructive' : 'secondary'}>
              {status === 'VERIFIED' ? 'Verified — 5% fee' : status === 'REJECTED' ? 'Not confirmed' : 'Pending confirmation'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Confirmed Ludeva Plc members pay a lower 5% withdrawal fee instead of the standard 7.5%.
        </p>

        {status === 'REJECTED' && ludeva.rejectionReason && (
          <p className="text-xs text-destructive">Reason: {ludeva.rejectionReason}</p>
        )}

        {status === 'VERIFIED' ? (
          <p className="text-sm">Membership number: <span className="font-medium">{ludeva.memberNumber}</span></p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="ludevaMemberNumberProfile">Ludeva Membership Number</Label>
            <Input
              id="ludevaMemberNumberProfile"
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="e.g. LDV-00123"
            />
            <Button size="sm" disabled={isPending || memberNumber.trim().length < 3} onClick={submit}>
              {isPending ? 'Submitting…' : status === 'PENDING' ? 'Resubmit for confirmation' : 'Submit for confirmation'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
