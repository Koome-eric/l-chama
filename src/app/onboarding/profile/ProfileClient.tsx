'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, KENYA_COUNTIES } from '@/lib/countries';
import { completeProfile } from './actions';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export function ProfileClient({ defaultEmail }: { defaultEmail?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [country, setCountry] = useState('KE');
  const [region, setRegion] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasNumber = /[0-9]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const isKenya = country === 'KE';

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    idNumber.trim().length >= 4 &&
    !!gender &&
    !!country &&
    region.trim().length > 0 &&
    password.length >= 6 &&
    hasNumber &&
    hasLetter;

  const handleSubmit = () => {
    if (!gender) return;
    setError(null);
    startTransition(async () => {
      try {
        await completeProfile({
          firstName,
          lastName,
          idNumber,
          email: email || undefined,
          gender,
          country,
          region,
          password,
        });
        toast({ title: 'Profile complete' });
        router.push('/onboarding/organisation');
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    });
  };

  return (
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
          <Label htmlFor="email">Email (Optional)</Label>
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

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ul className="mt-1 space-y-0.5 text-xs">
            <li className={password.length >= 6 ? 'text-primary' : 'text-muted-foreground'}>
              At least 6 characters
            </li>
            <li className={hasNumber ? 'text-primary' : 'text-muted-foreground'}>Contains a number</li>
            <li className={hasLetter ? 'text-primary' : 'text-muted-foreground'}>Contains a letter</li>
          </ul>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button size="lg" className="w-full" disabled={!canSubmit || isPending} onClick={handleSubmit}>
          {isPending ? 'Saving…' : 'Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}
