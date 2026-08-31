'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CHAMA_LEVELS, formatKES, type ChamaLevelKey } from '@/lib/chama-levels';
import { completeOnboarding } from './actions';
import { CheckCircle2 } from 'lucide-react';

export function OnboardingClient({
  defaultFullName,
  defaultPhone,
}: {
  defaultFullName?: string;
  defaultPhone?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(defaultFullName ?? '');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [chamaName, setChamaName] = useState('');
  const [levelKey, setLevelKey] = useState<ChamaLevelKey | null>(null);

  const canSubmit =
    fullName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    chamaName.trim().length >= 2 &&
    !!levelKey;

  const handleSubmit = () => {
    if (!levelKey) return;
    startTransition(async () => {
      try {
        await completeOnboarding({ fullName, phone, chamaName, levelKey });
        toast({ title: 'Chama created', description: `${chamaName} is ready to go.` });
        router.replace('/panel');
      } catch (err: any) {
        toast({ title: "Couldn't set up your chama", description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-headline font-semibold text-lg">Your details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Wanjiru"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-headline font-semibold text-lg">Name your chama</h2>
          <div>
            <Label htmlFor="chamaName">Chama name</Label>
            <Input
              id="chamaName"
              value={chamaName}
              onChange={(e) => setChamaName(e.target.value)}
              placeholder="e.g. The Njoroge Family Chama"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-headline font-semibold text-lg">Choose a level</h2>
          <p className="text-sm text-muted-foreground -mt-2">
            You'll set this once — members contribute the same amount monthly.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {CHAMA_LEVELS.map((level) => {
              const selected = levelKey === level.key;
              return (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => setLevelKey(level.key)}
                  className={`relative text-left rounded-xl border p-4 transition-colors ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-primary/40'
                  }`}
                >
                  {selected && (
                    <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
                  )}
                  <p className="font-headline font-semibold">{level.name}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatKES(level.monthlyAmount)}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Up to {level.groupSize} members
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button size="lg" disabled={!canSubmit || isPending} onClick={handleSubmit}>
        {isPending ? 'Setting up…' : 'Create My Chama'}
      </Button>
    </div>
  );
}
