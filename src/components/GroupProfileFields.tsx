'use client';

import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { OptionPicker } from '@/components/ui/option-picker';
import { FieldHint, FieldLabel, premiumInput } from '@/components/premium-form';
import { KENYA_COUNTIES } from '@/lib/countries';
import {
  CONTRIBUTION_FREQUENCIES,
  CREDIT_SOURCES,
  GROUP_TYPES,
  LOAN_PURPOSES,
  OUTSIDE_KENYA,
  WILLINGNESS_TO_PAY,
  type GroupProfileDraft,
} from '@/lib/group-profile';
import { cn } from '@/lib/utils';

const COUNTY_OPTIONS = [OUTSIDE_KENYA, ...KENYA_COUNTIES];

type Opt = { value: string; label: string };

function Chips({
  options,
  value,
  onChange,
  multiple,
  ariaLabel,
}: {
  options: readonly Opt[];
  value: string | string[];
  onChange: (next: any) => void;
  multiple?: boolean;
  ariaLabel: string;
}) {
  const selected = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  const toggle = (v: string) => {
    if (!multiple) return onChange(v);
    const list = value as string[];
    // "No outside credit" / "Cash only" are exclusive of the other answers.
    if (v === 'NONE' || v === 'CASH_ONLY') return onChange(list.includes(v) ? [] : [v]);
    const without = list.filter((x) => x !== 'NONE' && x !== 'CASH_ONLY');
    onChange(without.includes(v) ? without.filter((x) => x !== v) : [...without, v]);
  };
  return (
    <div role={multiple ? 'group' : 'radiogroup'} aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={multiple ? 'checkbox' : 'radio'}
          aria-checked={selected(o.value)}
          onClick={() => toggle(o.value)}
          className={cn(
            'rounded-full border px-4 py-2 text-sm transition',
            selected(o.value)
              ? 'border-primary bg-primary/10 font-medium text-primary'
              : 'border-input bg-background text-foreground hover:border-primary/40'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="border-b border-border/60 pb-2">
        <h3 className="font-headline text-base font-semibold">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// Whole-number answer. Digits only; "0" is a real answer.
function CountField({
  id,
  label,
  value,
  onChange,
  placeholder = '0',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        className={premiumInput}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder={placeholder}
      />
    </div>
  );
}

// The group KYC / market-profile questions. Used on the registration form and
// in the Team Leader's "Group profile" card, so both stay identical. At
// registration the member count is asked earlier in the form, so the caller
// passes it in `value.memberCount` and sets showMemberCount={false}.
export function GroupProfileFields({
  value,
  onChange,
  showMemberCount = true,
}: {
  value: GroupProfileDraft;
  onChange: (patch: Partial<GroupProfileDraft>) => void;
  showMemberCount?: boolean;
}) {
  const members = Number(value.memberCount) || 0;
  const n = (v: string) => Number(v) || 0;
  const background =
    n(value.membersCivilServants) + n(value.membersSme) + n(value.membersUnemployed) + n(value.membersOtherEmployed);
  const overBackground = members > 0 && background > members;

  return (
    <div className="space-y-8">
      <Section title="Where your group is" hint="Helps Ludeva understand where groups like yours are.">
        <div>
          <FieldLabel htmlFor="gp-county" icon={<MapPin />}>County</FieldLabel>
          <OptionPicker
            id="gp-county"
            value={value.county}
            onValueChange={(county) => onChange({ county })}
            options={COUNTY_OPTIONS}
            title="Group county"
            description="Where do most of your members live or do business? Diaspora groups can choose “Outside Kenya”."
            placeholder="Select a county"
            searchPlaceholder="Search counties…"
            noun="county"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="gp-subcounty">Sub-county</FieldLabel>
            <Input
              id="gp-subcounty"
              className={premiumInput}
              value={value.subcounty}
              onChange={(e) => onChange({ subcounty: e.target.value })}
              placeholder="e.g. Kikuyu"
              maxLength={80}
            />
          </div>
          <div>
            <FieldLabel htmlFor="gp-ward">Ward</FieldLabel>
            <Input
              id="gp-ward"
              className={premiumInput}
              value={value.ward}
              onChange={(e) => onChange({ ward: e.target.value })}
              placeholder="e.g. Karai"
              maxLength={80}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="gp-meeting">Meeting place</FieldLabel>
          <Input
            id="gp-meeting"
            className={premiumInput}
            value={value.meetingPlace}
            onChange={(e) => onChange({ meetingPlace: e.target.value })}
            placeholder="e.g. Chief's camp, Kikuyu town"
            maxLength={200}
          />
          <FieldHint>The venue and area where the group usually meets in person.</FieldHint>
        </div>
      </Section>

      <Section title="About your group">
        <div>
          <FieldLabel htmlFor="gp-type">Group type</FieldLabel>
          <Chips ariaLabel="Group type" options={GROUP_TYPES} value={value.groupType} onChange={(groupType) => onChange({ groupType })} />
        </div>

        {showMemberCount && (
          <CountField id="gp-members" label="Number of members" value={value.memberCount} onChange={(memberCount) => onChange({ memberCount })} placeholder="e.g. 25" />
        )}

        <div>
          <p className="mb-2 text-sm font-medium">What do your members do?</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <CountField id="gp-civil" label="Civil servants" value={value.membersCivilServants} onChange={(membersCivilServants) => onChange({ membersCivilServants })} />
            <CountField id="gp-sme" label="Entrepreneurs with SMEs" value={value.membersSme} onChange={(membersSme) => onChange({ membersSme })} />
            <CountField id="gp-unemployed" label="Unemployed" value={value.membersUnemployed} onChange={(membersUnemployed) => onChange({ membersUnemployed })} />
            <CountField id="gp-employed" label="Other employed (private sector, etc.)" value={value.membersOtherEmployed} onChange={(membersOtherEmployed) => onChange({ membersOtherEmployed })} />
          </div>
          {members > 0 && (
            <p className={cn('mt-2 text-xs', overBackground ? 'font-medium text-destructive' : 'text-muted-foreground')}>
              {background} of {members} members accounted for
              {overBackground ? ' — that is more than your member count.' : '.'}
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="gp-business" optional>Main income activities</FieldLabel>
          <Input
            id="gp-business"
            className={premiumInput}
            value={value.businessActivity}
            onChange={(e) => onChange({ businessActivity: e.target.value })}
            placeholder="e.g. small retail shops, farming, boda boda"
            maxLength={300}
          />
        </div>
      </Section>

      <Section title="Contributions">
        <div>
          <FieldLabel htmlFor="gp-frequency">How regularly do members contribute?</FieldLabel>
          <Chips
            ariaLabel="Contribution regularity"
            options={CONTRIBUTION_FREQUENCIES}
            value={value.contributionFrequency}
            onChange={(contributionFrequency) => onChange({ contributionFrequency })}
          />
        </div>
      </Section>

      <Section title="Phones, payments and credit">
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <CountField id="gp-smartphone" label="Members with a smartphone" value={value.membersWithSmartphone} onChange={(membersWithSmartphone) => onChange({ membersWithSmartphone })} />
          <CountField id="gp-payment" label="Members who can pay digitally" value={value.membersWithPaymentAccess} onChange={(membersWithPaymentAccess) => onChange({ membersWithPaymentAccess })} />
          <CountField id="gp-crb" label="Members listed with a CRB" value={value.membersInCrb} onChange={(membersInCrb) => onChange({ membersInCrb })} />
        </div>
        <FieldHint>"Pay digitally" means M-Pesa, a bank account or a card. CRB = credit reference bureau (for example, a member who has defaulted on a loan). Estimates are fine.</FieldHint>

        <div>
          <FieldLabel htmlFor="gp-credit">Where do your members borrow from today? (select all that apply)</FieldLabel>
          <Chips
            multiple
            ariaLabel="Current credit sources"
            options={CREDIT_SOURCES}
            value={value.creditSources}
            onChange={(creditSources) => onChange({ creditSources })}
          />
        </div>
      </Section>

      <Section title="Borrowing">
        <div>
          <FieldLabel htmlFor="gp-purpose">What do members usually borrow for? (select all that apply)</FieldLabel>
          <Chips
            multiple
            ariaLabel="Typical loan purposes"
            options={LOAN_PURPOSES}
            value={value.typicalLoanPurposes}
            onChange={(typicalLoanPurposes) => onChange({ typicalLoanPurposes })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="gp-wtp">Would your group pay for fast, reliable group loans?</FieldLabel>
          <Chips
            ariaLabel="Willingness to pay"
            options={WILLINGNESS_TO_PAY}
            value={value.willingnessToPay}
            onChange={(willingnessToPay) => onChange({ willingnessToPay })}
          />
          <FieldHint>This is only a survey answer — it does not commit you to anything.</FieldHint>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input"
            checked={value.marketConsent}
            onChange={(e) => onChange({ marketConsent: e.target.checked })}
          />
          <span className="text-sm">
            <span className="font-medium">I agree</span>
            <span className="text-muted-foreground">
              {' '}
              that Ludeva may use these group answers (together with the group’s other registration details) to assess
              the demand for group lending in Kenya. No member’s personal details are shared outside Ludeva.
            </span>
          </span>
        </label>
      </Section>
    </div>
  );
}
