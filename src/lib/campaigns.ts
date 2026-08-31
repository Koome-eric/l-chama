export const CAMPAIGN_CATEGORIES = [
  'Welfare Fund',
  'Community Support Fund',
  'Charity',
  'Medical',
  'Education',
  'Emergency Relief',
  'Other',
] as const;

export type CampaignCategory = (typeof CAMPAIGN_CATEGORIES)[number];

export function daysLeft(deadline: Date | string): number {
  const d = new Date(deadline).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((d - now) / (1000 * 60 * 60 * 24)));
}

export function progressPct(raised: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
}
