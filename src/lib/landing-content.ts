// Public product, loan and diaspora content, shared by the landing page and
// the dedicated /products, /loans and /diaspora pages so figures can never
// disagree between them.

export const PRODUCTS = [
  {
    name: 'Savings Account',
    rate: '5% – 7%',
    rateNote: 'per year, tiered by average monthly balance',
    summary: 'Flexible account for day-to-day group funds.',
    points: ['Tiered interest on your average monthly balance', 'No lock-in period', 'No monthly ledger fees'],
    target: '/savings',
  },
  {
    name: 'MMF',
    rate: '9% – 13%',
    rateNote: 'per year, varies with the fund',
    summary: 'Money market fund for capital your chama is not touching.',
    points: ['Daily interest compounding', 'Automated interest generation', 'Minimum lock-in of 12 months'],
    target: '/invest?type=MMF',
  },
  {
    name: 'Junior Account',
    rate: '6%',
    rateNote: 'per year',
    summary: "Custodial savings for a child's education.",
    points: ['Lock-in savings goals', 'Automatic parent-to-child standing orders', 'Milestone rewards'],
    target: '/accounts?open=junior',
  },
  {
    name: 'Last Expense Cover',
    rate: null,
    rateNote: 'cover limits instead of a rate',
    summary: 'Flexible cover limits for groups.',
    points: [
      'KES 50,000 to KES 500,000 per member',
      'A small extra fee covers non-members, such as a spouse and dependents',
    ],
    target: '/last-respect',
  },
] as const;

// Headline figures, defined once and used by the home page, /loans and
// /products.
export const LOAN_INTEREST = '2.5%';
export const PROCESSING_FEE = '2.5%';
export const WITHDRAWAL_FEE = '5%';

export const LOAN_TERMS = [
  { label: 'Interest', value: `${LOAN_INTEREST} per month` },
  { label: 'Processing fee', value: `${PROCESSING_FEE} once, on the loan amount` },
  { label: 'Repayment', value: 'Up to 6 months, repaid weekly' },
  { label: 'Approval', value: 'Two member guarantors, then your chama officials' },
  { label: 'Disbursement', value: 'By M-Pesa once approved' },
];

export const LOAN_STEPS = [
  'A member requests a loan from the chama’s shared loan account.',
  'Two other members guarantee it, each signing with their typed full name.',
  'The 2.5% processing fee is confirmed received.',
  'Your Team Leader, or anyone with approval permission, approves the loan.',
  'Funds are sent by M-Pesa. Repayments are tracked week by week.',
];

export const DIASPORA = [
  {
    title: 'Pay from where you are',
    body: 'Fund your chama by ACH or wire from the USA, SEPA in Europe, cards in the UAE and Australia, or M-Pesa and Airtel Money in Africa. Contributions convert at the live mid-market rate and land in one group balance.',
  },
  {
    title: 'Guarantee across time zones',
    body: 'Members abroad, or their local families, can apply for low-interest development or emergency loans. A guarantor in another time zone signs off and locks part of their savings as collateral in one tap.',
  },
  {
    title: 'Track the whole portfolio',
    body: 'See portfolio growth, dividends and each member’s share on a live dashboard, wherever you are checking in from.',
  },
  {
    title: 'Vote when you wake up',
    body: 'Admins set a voting window, for example 48 hours, for loan approvals or investment moves. A chama spread across Sydney, Dubai, London and Nairobi can still decide together.',
  },
];
