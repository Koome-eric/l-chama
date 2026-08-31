'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CAMPAIGN_CATEGORIES } from '@/lib/campaigns';
import { createCampaign } from '../actions';

export function NewCampaignClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [beneficiaries, setBeneficiaries] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    title.trim().length >= 4 &&
    description.trim().length >= 10 &&
    story.trim().length >= 30 &&
    !!category &&
    location.trim().length >= 2 &&
    Number(targetAmount) > 0 &&
    !!deadline;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createCampaign({
          title,
          description,
          story,
          category: category as any,
          location,
          targetAmount: Number(targetAmount),
          deadline,
          beneficiaries: beneficiaries ? Number(beneficiaries) : undefined,
          imageUrl: imageUrl || undefined,
        });
        toast({ title: 'Campaign created', description: 'Your campaign is live.' });
        router.push(`/campaigns/${res.campaignId}`);
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    });
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-4">
        <div>
          <Label htmlFor="title">Campaign Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. School Fees Support Fund" />
        </div>
        <div>
          <Label htmlFor="description">Short Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two sentences shown on the campaign card"
          />
        </div>
        <div>
          <Label htmlFor="story">Full Story</Label>
          <Textarea
            id="story"
            className="min-h-32"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Tell the full story behind this campaign"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kisii, Kenya" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="targetAmount">Target Amount (KES)</Label>
            <Input
              id="targetAmount"
              type="number"
              min={1}
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="beneficiaries">Beneficiaries (optional)</Label>
            <Input
              id="beneficiaries"
              type="number"
              min={0}
              value={beneficiaries}
              onChange={(e) => setBeneficiaries(e.target.value)}
              placeholder="Number of people this helps"
            />
          </div>
          <div>
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button size="lg" disabled={!canSubmit || isPending} onClick={handleSubmit}>
          {isPending ? 'Publishing…' : 'Publish Campaign'}
        </Button>
      </CardContent>
    </Card>
  );
}
