import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Shared look for the sign-up style forms (onboarding, invite acceptance,
// profile): roomy 48px fields, soft placeholders, clear focus, matching labels.
export const premiumInput =
  'h-12 rounded-xl border-input bg-background px-4 text-base shadow-sm transition placeholder:text-muted-foreground hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 md:text-sm';

export const premiumTextarea =
  'min-h-[120px] rounded-xl border-input bg-background px-4 py-3 text-base shadow-sm transition placeholder:text-muted-foreground hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 md:text-sm';

export const premiumSelectTrigger =
  'h-12 rounded-xl border-input bg-background px-4 text-base shadow-sm transition hover:border-primary/40 focus:ring-primary/40 focus:ring-offset-0 data-[placeholder]:text-muted-foreground md:text-sm';

export function FieldLabel({
  htmlFor,
  icon,
  optional,
  children,
  className,
}: {
  htmlFor: string;
  icon?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className={cn('mb-2 flex items-center gap-2 text-sm font-medium text-foreground', className)}>
      {icon && <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <span>{children}</span>
      {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
    </Label>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}
