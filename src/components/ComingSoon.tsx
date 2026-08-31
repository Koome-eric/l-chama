import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export function ComingSoon({
  icon: Icon,
  title,
  description,
  note,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            {note ?? "We're still building this out — check back soon."}
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
