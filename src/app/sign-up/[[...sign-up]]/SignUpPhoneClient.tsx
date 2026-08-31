'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COUNTRIES } from '@/lib/countries';

type Step = 'phone' | 'phone-otp' | 'email-otp';

// Custom Clerk sign-up flow: phone number first (with an OTP sent to it),
// email is optional and — if provided — also gets an OTP. This
// intentionally does not use Clerk's prebuilt <SignUp/> component, since
// the client's spec is phone-first rather than Clerk's default
// email/password screen.
//
// Note: whether Clerk actually requires phone verification, email
// verification, or both to complete depends on how "Contact information"
// is configured for this app's Clerk project (Sign-up settings →
// phone required, email optional). This flow handles both orders —
// phone-only, and phone-then-email — but that project-level
// configuration needs to be set to match before this works end to end.
export function SignUpPhoneClient() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('KE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialCode = COUNTRIES.find((c) => c.code === countryCode)?.dialCode ?? '+254';
  const fullPhone = `${dialCode}${phoneNumber.replace(/^0+/, '')}`;

  const handleSendPhoneOtp = async () => {
    if (!isLoaded) return;
    setError(null);
    if (phoneNumber.trim().length < 7) {
      setError('Enter a valid phone number.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp.create({
        phoneNumber: fullPhone,
        ...(email.trim() ? { emailAddress: email.trim() } : {}),
      });
      await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
      setStep('phone-otp');
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Could not send the code. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!isLoaded) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signUp.attemptPhoneNumberVerification({ code: otp });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/onboarding/profile');
        return;
      }

      // Email was supplied and still needs its own OTP.
      const needsEmail = result.unverifiedFields?.includes('email_address');
      if (needsEmail) {
        setOtp('');
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setStep('email-otp');
        return;
      }

      setError('Could not verify that code. Please try again.');
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Invalid code. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!isLoaded) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/onboarding/profile');
        return;
      }
      setError('Could not verify that code. Please try again.');
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Invalid code. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'phone') {
    return (
      <Card className="max-w-md w-full rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Enter your phone number to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[130px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.dialCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                placeholder="7XX XXX XXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email (optional — OTP also sent here)</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSendPhoneOtp} disabled={isSubmitting}>
            {isSubmitting ? 'Sending code…' : 'Continue'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Already have an account?{' '}
            <a href="/sign-in" className="text-primary underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'phone-otp') {
    return (
      <Card className="max-w-md w-full rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Verify your phone</CardTitle>
          <CardDescription>Enter the code sent to {fullPhone}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleVerifyPhoneOtp} disabled={isSubmitting || otp.length < 4}>
            {isSubmitting ? 'Verifying…' : 'Verify & Continue'}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline w-full text-center"
            onClick={() => setStep('phone')}
          >
            Use a different number
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>Enter the code sent to {email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="emailOtp">Verification code</Label>
          <Input
            id="emailOtp"
            inputMode="numeric"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={handleVerifyEmailOtp} disabled={isSubmitting || otp.length < 4}>
          {isSubmitting ? 'Verifying…' : 'Verify & Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}
