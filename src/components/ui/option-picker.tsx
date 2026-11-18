'use client';

import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Case-, accent-, apostrophe-, hyphen- and space-insensitive, so "muranga"
// finds Murang'a and "tharaka" finds Tharaka Nithi.
const normalise = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`\-\s]/g, '')
    .toLowerCase();

type OptionPickerProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  /** Shown inside the closed field when nothing is chosen. */
  placeholder?: string;
  /** Heading of the picker sheet, e.g. "Resident county". */
  title: string;
  description?: string;
  searchPlaceholder?: string;
  /** Singular noun for the count + empty state, e.g. "county". */
  noun?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

// A searchable picker built for long lists on phones. The native-style
// dropdown it replaces opened as a small, clipped popover on mobile, so only
// the first dozen or so options were reachable and people read the rest as
// "missing". This opens a full-height bottom sheet (a centred card on desktop)
// with a search box and a scrollable list, so every option is one tap away.
export function OptionPicker({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select',
  title,
  description,
  searchPlaceholder = 'Search',
  noun = 'option',
  icon,
  disabled,
  invalid,
  className,
}: OptionPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);
  const selectedRef = React.useRef<HTMLButtonElement>(null);

  const filtered = React.useMemo(() => {
    const q = normalise(query);
    return q ? options.filter((o) => normalise(o).includes(q)) : options;
  }, [options, query]);

  // Jump the list to the current choice when the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => selectedRef.current?.scrollIntoView({ block: 'center' }), 60);
    return () => clearTimeout(t);
  }, [open]);

  const choose = (option: string) => {
    onValueChange(option);
    setOpen(false);
    setQuery('');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          className={cn(
            'group flex h-12 w-full items-center gap-3 rounded-xl border bg-background px-4 text-left text-base shadow-sm transition',
            'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            invalid ? 'border-destructive' : 'border-input',
            className
          )}
        >
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          <span className={cn('flex-1 truncate', value ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        // Don't pop the phone keyboard over the list; do focus search on desktop.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
            searchRef.current?.focus();
          }
        }}
        className={cn(
          'flex max-h-[85dvh] flex-col gap-0 rounded-t-3xl border-t p-0',
          'sm:bottom-6 sm:mx-auto sm:max-h-[min(36rem,80dvh)] sm:max-w-md sm:rounded-3xl sm:border'
        )}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden" />

        <SheetHeader className="shrink-0 space-y-1 px-6 pb-3 pt-4 text-left">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription>{description ?? `Choose your ${noun} from the list or search for it.`}</SheetDescription>
        </SheetHeader>

        <div className="shrink-0 px-6 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              inputMode="search"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length > 0) {
                  e.preventDefault();
                  choose(filtered[0]);
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={`Search ${noun}`}
              className="h-12 w-full rounded-xl border border-input bg-muted/40 pl-10 pr-10 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/30 md:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {query
              ? `${filtered.length} of ${options.length} ${noun}${options.length === 1 ? '' : noun.endsWith('y') ? '' : 's'} match`
              : `${options.length} ${noun === 'county' ? 'counties' : `${noun}s`} · A–Z`}
          </p>
        </div>

        <div
          role="listbox"
          aria-label={title}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]"
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No {noun} matches “{query}”. Check the spelling and try again.
            </p>
          ) : (
            filtered.map((option) => {
              const selected = option === value;
              return (
                <button
                  key={option}
                  ref={selected ? selectedRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-[15px] transition-colors',
                    selected
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-foreground hover:bg-muted/70 active:bg-muted'
                  )}
                >
                  <span>{option}</span>
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
