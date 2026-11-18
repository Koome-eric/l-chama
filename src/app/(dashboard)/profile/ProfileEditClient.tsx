'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, KENYA_COUNTIES } from '@/lib/countries';
import { OptionPicker } from '@/components/ui/option-picker';
import { FieldLabel, premiumInput, premiumSelectTrigger } from '@/components/premium-form';
import { updateProfile, submitLudevaMembership } from './actions';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

type Defaults = {
  firstName: string;
  lastName: string;
  hasIdOnFile: boolean;
  email: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
  country: string;
  region: string;
  residentSubCounty: string;
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
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState(defaults.email);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>(defaults.gender);
  const [country, setCountry] = useState(defaults.country || 'KE');
  const [region, setRegion] = useState(defaults.region);
  const [residentSubCounty, setResidentSubCounty] = useState(defaults.residentSubCounty);
  const [error, setError] = useState<string | null>(null);

  const isKenya = country === 'KE';
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    (defaults.hasIdOnFile ? idNumber.trim().length === 0 || idNumber.trim().length >= 4 : idNumber.trim().length >= 4) &&
    !!gender &&
    !!country &&
    region.trim().length > 0 &&
    (!isKenya || residentSubCounty.trim().length >= 2);

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
          residentSubCounty: residentSubCounty.trim(),
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
            <FieldLabel htmlFor="firstName">First Name</FieldLabel>
            <Input placeholder="e.g. Wanjiru" className={premiumInput} id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
            <Input placeholder="e.g. Kamau" className={premiumInput} id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="idNumber">ID/Passport Number</FieldLabel>
          <Input className={premiumInput}
            id="idNumber"
            type="password"
            autoComplete="off"
            value={idNumber}
            placeholder={defaults.hasIdOnFile ? '•••••••• on file — leave blank to keep it' : 'Enter your ID/passport number'}
            onChange={(e) => setIdNumber(e.target.value)}
          />
        </div>

        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input placeholder="you@example.com" className={premiumInput} id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <FieldLabel htmlFor="gender">Gender</FieldLabel>
          <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
            <SelectTrigger id="gender" className={premiumSelectTrigger}>
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
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Select value={country} onValueChange={(v) => { setCountry(v); setRegion(''); }}>
              <SelectTrigger id="country" className={premiumSelectTrigger}>
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
            <FieldLabel htmlFor="region" icon={<MapPin />}>{isKenya ? 'Resident County' : 'Region'}</FieldLabel>
            {isKenya ? (
              <OptionPicker
                id="region"
                value={region}
                onValueChange={setRegion}
                options={KENYA_COUNTIES}
                title="Resident county"
                description="Select the county you currently live in. All 47 counties are listed."
                placeholder="Select your county"
                searchPlaceholder="Search counties…"
                noun="county"
                icon={<MapPin className="h-4 w-4" />}
              />
            ) : (
              <Input className={premiumInput} id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region" />
            )}
          </div>
        </div>

        {isKenya && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="residentSubCounty">Sub-county</FieldLabel>
            <Input className={premiumInput}
              id="residentSubCounty"
              value={residentSubCounty}
              onChange={(e) => setResidentSubCounty(e.target.value)}
              placeholder="e.g. Kikuyu"
            />
          </div>
        </div>
        )}

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
              {status === 'VERIFIED' ? 'Verified' : status === 'REJECTED' ? 'Not confirmed' : 'Pending confirmation'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Add your Ludeva Plc membership number so an admin can confirm it. The withdrawal fee is a flat 2.5% for every member.
        </p>

        {status === 'REJECTED' && ludeva.rejectionReason && (
          <p className="text-xs text-destructive">Reason: {ludeva.rejectionReason}</p>
        )}

        {status === 'VERIFIED' ? (
          <p className="text-sm">Membership number: <span className="font-medium">{ludeva.memberNumber}</span></p>
        ) : (
          <div className="space-y-2">
            <FieldLabel htmlFor="ludevaMemberNumberProfile">Ludeva Membership Number</FieldLabel>
            <Input className={premiumInput}
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
