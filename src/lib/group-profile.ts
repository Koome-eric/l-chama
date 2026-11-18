import { z } from 'zod';

// Group market profile (group KYC): the verified, group-level facts Ludeva
// needs to establish its serviceable market — county, group type, member
// count (Team.numberOfMembers, collected at registration), contribution
// regularity, business activity, smartphone/payment access, current credit
// source, loan purpose, consent and willingness to pay. The loan-specific
// one (purpose) is also asked on every loan request.

export const OUTSIDE_KENYA = 'Outside Kenya (diaspora)';

type Option<T extends string> = { value: T; label: string };

export const GROUP_TYPES: Option<
  | 'SAVINGS_CHAMA' | 'TABLE_BANKING' | 'MERRY_GO_ROUND' | 'INVESTMENT_CLUB' | 'WELFARE_GROUP'
  | 'BUSINESS_GROUP' | 'YOUTH_GROUP' | 'WOMEN_GROUP' | 'FAMILY_GROUP' | 'CHURCH_COMMUNITY' | 'OTHER'
>[] = [
  { value: 'SAVINGS_CHAMA', label: 'Savings chama' },
  { value: 'TABLE_BANKING', label: 'Table banking' },
  { value: 'MERRY_GO_ROUND', label: 'Merry-go-round' },
  { value: 'INVESTMENT_CLUB', label: 'Investment club' },
  { value: 'WELFARE_GROUP', label: 'Welfare group' },
  { value: 'BUSINESS_GROUP', label: 'Business / traders group' },
  { value: 'YOUTH_GROUP', label: 'Youth group' },
  { value: 'WOMEN_GROUP', label: 'Women group' },
  { value: 'FAMILY_GROUP', label: 'Family / clan group' },
  { value: 'CHURCH_COMMUNITY', label: 'Church / community group' },
  { value: 'OTHER', label: 'Other' },
];

export const CONTRIBUTION_FREQUENCIES: Option<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'IRREGULAR'>[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Every two weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'IRREGULAR', label: 'Irregular' },
];

export const SMARTPHONE_SHARES: Option<'ALL' | 'MOST' | 'ABOUT_HALF' | 'FEW' | 'NONE'>[] = [
  { value: 'ALL', label: 'All members' },
  { value: 'MOST', label: 'Most members' },
  { value: 'ABOUT_HALF', label: 'About half' },
  { value: 'FEW', label: 'A few members' },
  { value: 'NONE', label: 'None' },
];

export const PAYMENT_ACCESS: Option<'MPESA' | 'BANK_ACCOUNT' | 'MOBILE_BANKING' | 'CARD' | 'CASH_ONLY'>[] = [
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
  { value: 'MOBILE_BANKING', label: 'Mobile / app banking' },
  { value: 'CARD', label: 'Debit / credit card' },
  { value: 'CASH_ONLY', label: 'Cash only' },
];

export const CREDIT_SOURCES: Option<
  'NONE' | 'BANK' | 'SACCO' | 'MICROFINANCE' | 'MOBILE_LOANS' | 'INTERNAL_LENDING' | 'FRIENDS_FAMILY' | 'INFORMAL_LENDERS' | 'OTHER'
>[] = [
  { value: 'NONE', label: 'No outside credit' },
  { value: 'BANK', label: 'Bank' },
  { value: 'SACCO', label: 'Sacco' },
  { value: 'MICROFINANCE', label: 'Microfinance' },
  { value: 'MOBILE_LOANS', label: 'Mobile loan apps' },
  { value: 'INTERNAL_LENDING', label: "Our group's own pool" },
  { value: 'FRIENDS_FAMILY', label: 'Friends & family' },
  { value: 'INFORMAL_LENDERS', label: 'Informal lenders' },
  { value: 'OTHER', label: 'Other' },
];

export const LOAN_PURPOSES: Option<
  'BUSINESS_CAPITAL' | 'BUSINESS_ASSETS' | 'FARMING' | 'EDUCATION' | 'MEDICAL_EMERGENCY' | 'HOUSING' | 'DEBT_REFINANCING' | 'PERSONAL' | 'OTHER'
>[] = [
  { value: 'BUSINESS_CAPITAL', label: 'Business working capital' },
  { value: 'BUSINESS_ASSETS', label: 'Business equipment / assets' },
  { value: 'FARMING', label: 'Farming / agribusiness' },
  { value: 'EDUCATION', label: 'School fees / education' },
  { value: 'MEDICAL_EMERGENCY', label: 'Medical / emergency' },
  { value: 'HOUSING', label: 'Housing / rent / construction' },
  { value: 'DEBT_REFINANCING', label: 'Clearing another debt' },
  { value: 'PERSONAL', label: 'Personal / household' },
  { value: 'OTHER', label: 'Other' },
];

export const WILLINGNESS_TO_PAY: Option<
  'YES_PER_LOAN_FEE' | 'YES_MONTHLY_SUBSCRIPTION' | 'ONLY_IF_CHEAPER' | 'NOT_SURE' | 'NO'
>[] = [
  { value: 'YES_PER_LOAN_FEE', label: 'Yes — a fee on each loan' },
  { value: 'YES_MONTHLY_SUBSCRIPTION', label: 'Yes — a monthly subscription' },
  { value: 'ONLY_IF_CHEAPER', label: 'Only if cheaper than what we use now' },
  { value: 'NOT_SURE', label: 'Not sure yet' },
  { value: 'NO', label: 'No' },
];

const values = <T extends string>(opts: Option<T>[]) => opts.map((o) => o.value) as [T, ...T[]];

export const groupProfileSchema = z.object({
  county: z.string().trim().min(2, 'Choose the county your group mainly operates in.'),
  groupType: z.enum(values(GROUP_TYPES), { errorMap: () => ({ message: 'Choose your group type.' }) }),
  contributionFrequency: z.enum(values(CONTRIBUTION_FREQUENCIES), {
    errorMap: () => ({ message: 'Choose how regularly members contribute.' }),
  }),
  businessActivity: z.string().trim().min(2, 'Tell us what your members do for income.').max(300),
  smartphoneShare: z.enum(values(SMARTPHONE_SHARES), {
    errorMap: () => ({ message: 'Choose how many members have a smartphone.' }),
  }),
  paymentAccess: z.array(z.enum(values(PAYMENT_ACCESS))).min(1, 'Choose at least one way members can pay.'),
  creditSources: z.array(z.enum(values(CREDIT_SOURCES))).min(1, 'Choose where your members borrow from today.'),
  typicalLoanPurposes: z.array(z.enum(values(LOAN_PURPOSES))).min(1, 'Choose what members usually borrow for.'),
  willingnessToPay: z.enum(values(WILLINGNESS_TO_PAY), {
    errorMap: () => ({ message: 'Tell us whether your group would pay for this service.' }),
  }),
  marketConsent: z.literal(true, {
    errorMap: () => ({ message: 'Please tick the box allowing Ludeva to use these answers for market assessment.' }),
  }),
});

export type GroupProfileInput = z.infer<typeof groupProfileSchema>;

// Form state (everything optional until the person fills it in).
export type GroupProfileDraft = {
  county: string;
  groupType: string;
  contributionFrequency: string;
  businessActivity: string;
  smartphoneShare: string;
  paymentAccess: string[];
  creditSources: string[];
  typicalLoanPurposes: string[];
  willingnessToPay: string;
  marketConsent: boolean;
};

export const EMPTY_GROUP_PROFILE: GroupProfileDraft = {
  county: '',
  groupType: '',
  contributionFrequency: '',
  businessActivity: '',
  smartphoneShare: '',
  paymentAccess: [],
  creditSources: [],
  typicalLoanPurposes: [],
  willingnessToPay: '',
  marketConsent: false,
};

export function isGroupProfileDraftComplete(d: GroupProfileDraft): boolean {
  return groupProfileSchema.safeParse(d).success;
}

// Prisma `data` for a validated profile.
export function groupProfileData(p: GroupProfileInput) {
  return {
    county: p.county,
    groupType: p.groupType,
    contributionFrequency: p.contributionFrequency,
    businessActivity: p.businessActivity,
    smartphoneShare: p.smartphoneShare,
    paymentAccess: p.paymentAccess,
    creditSources: p.creditSources,
    typicalLoanPurposes: p.typicalLoanPurposes,
    willingnessToPay: p.willingnessToPay,
    marketConsentAt: new Date(),
    marketProfileUpdatedAt: new Date(),
  };
}

// Is the saved profile on a Team complete enough to count as KYC'd?
export function isTeamGroupProfileComplete(t: {
  county?: string | null;
  groupType?: string | null;
  contributionFrequency?: string | null;
  businessActivity?: string | null;
  smartphoneShare?: string | null;
  paymentAccess?: unknown[];
  creditSources?: unknown[];
  typicalLoanPurposes?: unknown[];
  willingnessToPay?: string | null;
  marketConsentAt?: Date | null;
}): boolean {
  return !!(
    t.county && t.groupType && t.contributionFrequency && t.businessActivity && t.smartphoneShare &&
    t.paymentAccess?.length && t.creditSources?.length && t.typicalLoanPurposes?.length &&
    t.willingnessToPay && t.marketConsentAt
  );
}

export const labelFor = <T extends string>(opts: Option<T>[], value: string | null | undefined) =>
  opts.find((o) => o.value === value)?.label ?? value ?? '—';
