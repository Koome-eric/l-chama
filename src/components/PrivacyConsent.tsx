'use client';

// "I Agree" tick box linking to the Privacy Policy. Used wherever someone
// applies to L-Chama: organisation registration, accepting a chama invite,
// and Junior Account applications. The link opens in a new tab so the
// applicant doesn't lose their half-filled form.
export function PrivacyConsent({
  checked,
  onChange,
  id = 'privacy-consent',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-sm cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
      />
      <span>
        ✅ I have read and agree to the L-Chama{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </a>
        . <span className="text-muted-foreground">(I Agree)</span>
      </span>
    </label>
  );
}
