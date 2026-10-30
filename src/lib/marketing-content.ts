import {
  ClipboardCheck, ShieldCheck, Landmark, FileCheck2, Clock, Headset,
  Banknote, HandCoins, LineChart, Globe2,
} from 'lucide-react';

// Update when published rates change. Shown next to every rate so visitors
// know how current it is (audit: rates need an effective date and a
// "not guaranteed" qualifier).
export const RATES_AS_AT = '26 October 2026';

export const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Digital Ledger & Transparency',
    body: 'Automates capital collection, ledger reconciliation, and real-time transaction reporting and remittance reminders. It replaces manual bookkeeping with an audit trail accessible via a unified dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'Social Guarantee',
    body: 'Operates a decentralized trust model where credit facility approvals and loan risk assessments rely on social collateral, peer underwriting, and designated admin authorizations rather than traditional credit scoring.',
  },
  {
    icon: Landmark,
    title: 'Digital Group Treasury Management',
    body: 'Offers a digital hub for multi-tiered social structures — investment chamas, merry-go-rounds, diaspora chamas, welfare groups, and Bodaboda associations — to aggregate deposits, manage liquidity, and disburse internal loans.',
  },
];

// Product rate card — what each L-Chama product offers, and which
// authenticated page it should send a member to.
export const PRODUCTS = [
  {
    name: 'Junior Account',
    rate: '6%',
    description: "High-interest custodial savings designed to secure members' children's future education goals.",
    features: 'Lock-in savings triggers, automatic parent-to-child recurring standing orders, and milestone rewards.',
    target: '/accounts?open=junior',
    cta: 'Open account',
  },
  {
    name: 'Shares Account',
    rate: 'Above 9%',
    description: 'Invest your chama’s funds in shares.',
    features: 'Annual returns above 9%, with holdings tracked from your dashboard.',
    target: '/invest?type=STOCK',
    cta: 'Invest now',
  },
  {
    name: 'Savings Account',
    rate: '5%',
    description: 'Flexible, liquidity-focused account for operational group funds.',
    features: '5% annual interest, no lock-in period, and zero monthly ledger fees.',
    target: '/savings',
    cta: 'Start saving',
  },
  {
    name: 'Fixed Income Account',
    rate: '13%',
    description: 'A fixed-income investment option for chama funds.',
    features: '13% annual return, with holdings tracked from your dashboard.',
    target: '/invest?type=BOND',
    cta: 'Invest now',
  },
  {
    name: 'Last Expense Cover',
    rate: null as string | null,
    description: 'Flexible cover limits for groups.',
    features: 'KES 50,000 to KES 500,000 per member of the group, plus a small additional fee to cover non-members (e.g. spouse and dependents).',
    target: '/last-respect',
    cta: 'Get cover',
  },
  {
    name: 'L-Chama Micro Loans',
    rate: '2.5% p.m.',
    description: 'Internal chama loans — members borrow against their savings with automated interest tracking and instant M-Pesa disbursement.',
    features: '2.5% one-off processing fee on the loan amount, repayment over up to 6 months, and disbursement as soon as your chama officials approve it.',
    target: '/panel?tab=loan-requests',
    cta: 'Apply for a loan',
  },
];

// Plain data (not prose) so the platform fee is never buried in a paragraph.
export const LOAN_TERMS = [
  { label: 'Interest Rate', value: '2.5% per month' },
  { label: 'Processing Fee', value: '2.5% one-off, on the total loan amount' },
  { label: 'Repayment Term', value: 'Up to 6 months' },
];

export const LOAN_BENEFITS = [
  { icon: ShieldCheck, text: 'Fund security guarantees, with a full audit trail on a shared dashboard.' },
  { icon: FileCheck2, text: 'Automated payment processing and quick disbursement once your chama officials approve.' },
  { icon: Clock, text: '24-hour advance notice for standard withdrawals.' },
  { icon: Headset, text: '24/7 dedicated L-Chama customer support.' },
];

export const DIASPORA_BENEFITS = [
  {
    icon: Banknote,
    title: 'Multi-Currency Global Gateway & Auto-FX',
    body: "Fund your chama with the payment rails you already use — ACH/Wire in the USA, SEPA in Europe, Instant Pay/Cards in the UAE and Australia, or M-Pesa/Airtel Money in Africa. Real-time mid-market FX shows exactly what your contribution converts to, and everything reconciles automatically into one clean group balance.",
  },
  {
    icon: HandCoins,
    title: 'Cross-Border "Cheap Loan" & Guarantee Matrix',
    body: 'Diaspora members or their local proxies and families can apply for low-interest development or emergency loans. A digital Guarantee Lock lets designated members in different time zones sign off and lock a portion of their savings as collateral with a single tap.',
  },
  {
    icon: LineChart,
    title: 'Global Investment Portfolio Tracker',
    body: "Track shares, fixed-income investments, and other local investment vehicles with a live dashboard for portfolio growth, dividends, and each member's share, visible 24/7 wherever you're checking in from.",
  },
  {
    icon: Globe2,
    title: 'Async Governance & Time-Zone-Friendly Voting',
    body: "A chama spanning Sydney, Dubai, London, and Nairobi can't all be online at once. Admins set a voting window — say, 48 hours — for loan approvals or investment moves, so members review, ask questions, and vote whenever they wake up.",
  },
];
