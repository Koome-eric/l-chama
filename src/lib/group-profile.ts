import { z } from 'zod';

// Group KYC / market profile: the verified, group-level facts Ludeva needs to
// size its serviceable market and assess group lending —
//   • where the group is: county, sub-county, ward, meeting place
//   • what it is: group type, member count and member background
//     (civil servants, entrepreneurs with SMEs, unemployed, other employed)
//   • how it saves: contribution regularity
//   • digital + credit footprint: members with a smartphone, members able to
//     pay digitally, members listed with a CRB, where members borrow today
//   • what it borrows for, willingness to pay, and consent.
// The loan-specific answer (purpose) is also asked on every loan request.

export const OUTSIDE_KENYA = 'Outside Kenya (diaspora)';

type Option<T extends string> = { value: T; label: string };

// Shown as choices. (Values saved by earlier versions that are no longer
// offered are still labelled — see LEGACY_GROUP_TYPES.)
export const GROUP_TYPES: Option<
  'TABLE_BANKING' | 'WELFARE_GROUP' | 'BUSINESS_GROUP' | 'BODABODA' | 'FAMILY_GROUP' | 'WOMEN_GROUP' | 'YOUTH_GROUP' | 'WORKMATES' | 'OTHER'
>[] = [
  { value: 'TABLE_BANKING', label: 'Table banking' },
  { value: 'WELFARE_GROUP', label: 'Welfare' },
  { value: 'BUSINESS_GROUP', label: 'Business club' },
  { value: 'BODABODA', label: 'Bodaboda' },
  { value: 'FAMILY_GROUP', label: 'Family group' },
  { value: 'WOMEN_GROUP', label: 'Women group' },
  { value: 'YOUTH_GROUP', label: 'Youth group' },
  { value: 'WORKMATES', label: 'Workmates' },
  { value: 'OTHER', label: 'Others' },
];

export const LEGACY_GROUP_TYPES: Option<'SAVINGS_CHAMA' | 'MERRY_GO_ROUND' | 'INVESTMENT_CLUB' | 'CHURCH_COMMUNITY'>[] = [
  { value: 'SAVINGS_CHAMA', label: 'Savings chama' },
  { value: 'MERRY_GO_ROUND', label: 'Merry-go-round' },
  { value: 'INVESTMENT_CLUB', label: 'Investment club' },
  { value: 'CHURCH_COMMUNITY', label: 'Church / community group' },
];

export const ALL_GROUP_TYPES: Option<string>[] = [...GROUP_TYPES, ...LEGACY_GROUP_TYPES];

export const CONTRIBUTION_FREQUENCIES: Option<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'IRREGULAR'>[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'IRREGULAR', label: 'Irregular' },
];

// Older answers (kept readable even though no longer offered).
export const ALL_CONTRIBUTION_FREQUENCIES: Option<string>[] = [
  ...CONTRIBUTION_FREQUENCIES,
  { value: 'FORTNIGHTLY', label: 'Every two weeks' },
  { value: 'QUARTERLY', label: 'Quarterly' },
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

// Whole-number answers are typed as text in the form; "0" is a valid answer,
// an empty box is not.
const count = (what: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, `Enter ${what} (0 if none).`)
    .transform(Number);

export const groupProfileSchema = z
  .object({
    // Where the group is
    county: z.string().trim().min(2, 'Choose the county your group mainly operates in.'),
    subcounty: z.string().trim().min(2, 'Enter the sub-county.').max(80),
    ward: z.string().trim().min(2, 'Enter the ward.').max(80),
    meetingPlace: z.string().trim().min(3, 'Tell us where your group meets.').max(200),

    // What it is
    groupType: z.enum(values(GROUP_TYPES), { errorMap: () => ({ message: 'Choose your group type.' }) }),
    memberCount: count('the number of members').refine((n) => n >= 1, 'Your group needs at least 1 member.'),
    membersCivilServants: count('how many members are civil servants'),
    membersSme: count('how many members are entrepreneurs with SMEs'),
    membersUnemployed: count('how many members are unemployed'),
    membersOtherEmployed: count('how many other members are employed'),
    businessActivity: z.string().trim().max(300).optional().default(''),

    // How it saves
    contributionFrequency: z.enum(values(CONTRIBUTION_FREQUENCIES), {
      errorMap: () => ({ message: 'Choose how regularly members contribute.' }),
    }),

    // Digital + credit footprint
    membersWithSmartphone: count('how many members have a smartphone'),
    membersWithPaymentAccess: count('how many members can pay digitally (e.g. M-Pesa)'),
    membersInCrb: count('how many members are listed with a CRB'),
    creditSources: z.array(z.enum(values(CREDIT_SOURCES))).min(1, 'Choose where your members borrow from today.'),

    // Lending
    typicalLoanPurposes: z.array(z.enum(values(LOAN_PURPOSES))).min(1, 'Choose what members usually borrow for.'),
    willingnessToPay: z.enum(values(WILLINGNESS_TO_PAY), {
      errorMap: () => ({ message: 'Tell us whether your group would pay for this service.' }),
    }),
    marketConsent: z.literal(true, {
      errorMap: () => ({ message: 'Please tick the box allowing Ludeva to use these answers for market assessment.' }),
    }),
  })
  .superRefine((d, ctx) => {
    const n = d.memberCount;
    const over = (field: keyof typeof d, label: string) => {
      if ((d[field] as number) > n) {
        ctx.addIssue({ code: 'custom', path: [field], message: `${label} can't be more than your ${n} members.` });
      }
    };
    over('membersCivilServants', 'Civil servants');
    over('membersSme', 'Entrepreneurs with SMEs');
    over('membersUnemployed', 'Unemployed members');
    over('membersOtherEmployed', 'Other employed members');
    over('membersWithSmartphone', 'Members with a smartphone');
    over('membersWithPaymentAccess', 'Members who can pay digitally');
    over('membersInCrb', 'Members listed with a CRB');
    const background = d.membersCivilServants + d.membersSme + d.membersUnemployed + d.membersOtherEmployed;
    if (background > n) {
      ctx.addIssue({
        code: 'custom',
        path: ['membersCivilServants'],
        message: `Civil servants, entrepreneurs, unemployed and other employed add up to ${background}, more than your ${n} members.`,
      });
    }
  });

export type GroupProfileInput = z.infer<typeof groupProfileSchema>;

// Form state: everything is text until validated.
export type GroupProfileDraft = {
  county: string;
  subcounty: string;
  ward: string;
  meetingPlace: string;
  groupType: string;
  memberCount: string;
  membersCivilServants: string;
  membersSme: string;
  membersUnemployed: string;
  membersOtherEmployed: string;
  businessActivity: string;
  contributionFrequency: string;
  membersWithSmartphone: string;
  membersWithPaymentAccess: string;
  membersInCrb: string;
  creditSources: string[];
  typicalLoanPurposes: string[];
  willingnessToPay: string;
  marketConsent: boolean;
};

export const EMPTY_GROUP_PROFILE: GroupProfileDraft = {
  county: '',
  subcounty: '',
  ward: '',
  meetingPlace: '',
  groupType: '',
  memberCount: '',
  membersCivilServants: '',
  membersSme: '',
  membersUnemployed: '',
  membersOtherEmployed: '',
  businessActivity: '',
  contributionFrequency: '',
  membersWithSmartphone: '',
  membersWithPaymentAccess: '',
  membersInCrb: '',
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
    subcounty: p.subcounty,
    ward: p.ward,
    meetingPlace: p.meetingPlace,
    groupType: p.groupType,
    numberOfMembers: p.memberCount,
    membersCivilServants: p.membersCivilServants,
    membersRunningSME: p.membersSme,
    membersUnemployed: p.membersUnemployed,
    membersEmployed: p.membersOtherEmployed,
    businessActivity: p.businessActivity || null,
    contributionFrequency: p.contributionFrequency,
    membersWithSmartphone: p.membersWithSmartphone,
    membersWithPaymentAccess: p.membersWithPaymentAccess,
    membersInCrb: p.membersInCrb,
    creditSources: p.creditSources,
    typicalLoanPurposes: p.typicalLoanPurposes,
    willingnessToPay: p.willingnessToPay,
    marketConsentAt: new Date(),
    marketProfileUpdatedAt: new Date(),
  };
}

type TeamProfileFields = {
  county?: string | null;
  subcounty?: string | null;
  ward?: string | null;
  meetingPlace?: string | null;
  groupType?: string | null;
  numberOfMembers?: number | null;
  membersCivilServants?: number | null;
  membersRunningSME?: number | null;
  membersUnemployed?: number | null;
  membersEmployed?: number | null;
  businessActivity?: string | null;
  contributionFrequency?: string | null;
  membersWithSmartphone?: number | null;
  membersWithPaymentAccess?: number | null;
  membersInCrb?: number | null;
  creditSources?: unknown[];
  typicalLoanPurposes?: unknown[];
  willingnessToPay?: string | null;
  marketConsentAt?: Date | null;
};

const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

// Saved team -> form state.
export function teamToGroupProfileDraft(t: TeamProfileFields): GroupProfileDraft {
  return {
    county: t.county ?? '',
    subcounty: t.subcounty ?? '',
    ward: t.ward ?? '',
    meetingPlace: t.meetingPlace ?? '',
    groupType: t.groupType ?? '',
    memberCount: num(t.numberOfMembers),
    membersCivilServants: num(t.membersCivilServants),
    membersSme: num(t.membersRunningSME),
    membersUnemployed: num(t.membersUnemployed),
    membersOtherEmployed: num(t.membersEmployed),
    businessActivity: t.businessActivity ?? '',
    contributionFrequency: t.contributionFrequency ?? '',
    membersWithSmartphone: num(t.membersWithSmartphone),
    membersWithPaymentAccess: num(t.membersWithPaymentAccess),
    membersInCrb: num(t.membersInCrb),
    creditSources: (t.creditSources as string[]) ?? [],
    typicalLoanPurposes: (t.typicalLoanPurposes as string[]) ?? [],
    willingnessToPay: t.willingnessToPay ?? '',
    marketConsent: !!t.marketConsentAt,
  };
}

// Is the saved profile on a Team complete enough to count as KYC'd?
export function isTeamGroupProfileComplete(t: TeamProfileFields): boolean {
  return isGroupProfileDraftComplete(teamToGroupProfileDraft(t));
}

export const labelFor = <T extends string>(opts: Option<T>[], value: string | null | undefined) =>
  opts.find((o) => o.value === value)?.label ?? value ?? '—';
