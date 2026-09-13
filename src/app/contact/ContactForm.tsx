'use client';

import { useState, useTransition } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendContactMessage } from './actions';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await sendContactMessage({ name, email, phone: phone || undefined, message });
        setSent(true);
      } catch (err: any) {
        setError(err.message || 'Could not send your message. Please try again.');
      }
    });
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center space-y-2">
        <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
        <p className="font-headline text-lg font-semibold">Message sent</p>
        <p className="text-sm text-muted-foreground">
          Thanks, {name.split(' ')[0]} — the L-Chama team will get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactName">Name</Label>
          <Input id="contactName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </div>
        <div>
          <Label htmlFor="contactEmail">Email</Label>
          <Input id="contactEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <Label htmlFor="contactPhone">Phone (optional)</Label>
        <Input id="contactPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
      </div>
      <div>
        <Label htmlFor="contactMessage">Message</Label>
        <Textarea
          id="contactMessage"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us how we can help"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        onClick={submit}
        disabled={isPending || !name.trim() || !email.trim() || message.trim().length < 10}
        className="gap-2"
      >
        <Send className="h-4 w-4" /> {isPending ? 'Sending…' : 'Send message'}
      </Button>
    </div>
  );
}
