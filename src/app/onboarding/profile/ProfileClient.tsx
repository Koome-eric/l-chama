'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, MapPin } from 'lucide-react';
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
import { OptionPicker } from '@/components/ui/option-picker';
import { FieldLabel, premiumInput, premiumSelectTrigger } from '@/components/premium-form';
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
  const [residentSubCounty, setResidentSubCounty] = useState('');
  const [isExistingLudevaMember, setIsExistingLudevaMember] = useState(false);
  const [ludevaMemberNumber, setLudevaMemberNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    (!isKenya || residentSubCounty.trim().length >= 2) &&
    (!isExistingLudevaMember || ludevaMemberNumber.trim().length >= 3) &&
    password.length >= 15 &&
    hasNumber &&
    hasLetter;

  const handleSubmit = () => {
    if (!gender) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await completeProfile({
          firstName,
          lastName,
          idNumber,
          email: email || undefined,
          gender,
          country,
          region,
          residentSubCounty: residentSubCounty.trim(),
          isExistingLudevaMember,
          ludevaMemberNumber: isExistingLudevaMember ? ludevaMemberNumber : undefined,
          password,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        toast({ title: 'Profile complete' });
        router.push('/onboarding/organisation');
      } catch (err: any) {
        // Only reached for a genuine network/unexpected failure — every
        // known error case above is returned as { success: false, error }.
        setError(err.message || 'Something went wrong. Please check your connection and try again.');
      }
    });
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="space-y-5 p-6 sm:p-8">
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
          <Input placeholder="e.g. 30112233" className={premiumInput} id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        </div>

        <div>
          <FieldLabel htmlFor="email">Email (Optional)</FieldLabel>
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
              <Input className={premiumInput} id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region / state" />
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

        <div className="rounded-xl border p-4 space-y-3">
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isExistingLudevaMember}
              onChange={(e) => setIsExistingLudevaMember(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              I'm an existing Ludeva Plc member
              <span className="block text-xs text-muted-foreground mt-0.5">
                Optional — an admin will confirm your membership number.
              </span>
            </span>
          </label>
          {isExistingLudevaMember && (
            <div>
              <FieldLabel htmlFor="ludevaMemberNumber">Ludeva Membership Number</FieldLabel>
              <Input className={premiumInput}
                id="ludevaMemberNumber"
                value={ludevaMemberNumber}
                onChange={(e) => setLudevaMemberNumber(e.target.value)}
                placeholder="e.g. LDV-00123"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                An admin will confirm this number before it takes effect.
              </p>
            </div>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className={`${premiumInput} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Must be at least 15 characters, with a mix of letters and numbers.
          </p>
          <ul className="mt-1 space-y-0.5 text-xs">
            <li className={password.length >= 15 ? 'text-primary' : 'text-muted-foreground'}>
              At least 15 characters
            </li>
            <li className={hasNumber ? 'text-primary' : 'text-muted-foreground'}>Contains a number</li>
            <li className={hasLetter ? 'text-primary' : 'text-muted-foreground'}>Contains a letter</li>
          </ul>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button size="lg" className="h-12 w-full rounded-xl text-base shadow-sm" disabled={!canSubmit || isPending} onClick={handleSubmit}>
          {isPending ? 'Saving…' : 'Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}
