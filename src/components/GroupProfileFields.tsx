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
  PAYMENT_ACCESS,
  SMARTPHONE_SHARES,
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

// The group KYC / market-profile questions. Used on the registration form and
// in the Team Leader's "Group profile" card, so both stay identical.
export function GroupProfileFields({
  value,
  onChange,
}: {
  value: GroupProfileDraft;
  onChange: (patch: Partial<GroupProfileDraft>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <FieldLabel htmlFor="gp-county" icon={<MapPin />}>County your group mainly operates in</FieldLabel>
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
          icon={<MapPin className="h-4 w-4" />}
        />
      </div>

      <div>
        <FieldLabel htmlFor="gp-type">Type of group</FieldLabel>
        <Chips ariaLabel="Type of group" options={GROUP_TYPES} value={value.groupType} onChange={(groupType) => onChange({ groupType })} />
      </div>

      <div>
        <FieldLabel htmlFor="gp-frequency">How regularly do members contribute?</FieldLabel>
        <Chips
          ariaLabel="Contribution regularity"
          options={CONTRIBUTION_FREQUENCIES}
          value={value.contributionFrequency}
          onChange={(contributionFrequency) => onChange({ contributionFrequency })}
        />
      </div>

      <div>
        <FieldLabel htmlFor="gp-business">Main business activity of your members</FieldLabel>
        <Input
          id="gp-business"
          className={premiumInput}
          value={value.businessActivity}
          onChange={(e) => onChange({ businessActivity: e.target.value })}
          placeholder="e.g. small retail shops, farming, boda boda, salaried"
          maxLength={300}
        />
      </div>

      <div>
        <FieldLabel htmlFor="gp-smartphone">How many members have a smartphone?</FieldLabel>
        <Chips
          ariaLabel="Members with a smartphone"
          options={SMARTPHONE_SHARES}
          value={value.smartphoneShare}
          onChange={(smartphoneShare) => onChange({ smartphoneShare })}
        />
      </div>

      <div>
        <FieldLabel htmlFor="gp-payment">How can members pay? (select all that apply)</FieldLabel>
        <Chips
          multiple
          ariaLabel="Payment access"
          options={PAYMENT_ACCESS}
          value={value.paymentAccess}
          onChange={(paymentAccess) => onChange({ paymentAccess })}
        />
      </div>

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
    </div>
  );
}
