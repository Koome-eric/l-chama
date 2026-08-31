// ─────────────────────────────────────────────
// L Chama levels — fixed platform-wide tiers a chama owner
// picks from at creation time. Values are copied onto the Team
// row when chosen (Team.levelKey/monthlyAmount/groupSize) so a later
// change to this list never silently changes an already-running chama's
// terms.
// ─────────────────────────────────────────────

export type ChamaLevelKey =
  | "NYOTA"
  | "PEPEA"
  | "ALPHA"
  | "JULIET"
  | "SILVER"
  | "DIAMOND"
  | "KINGS"
  | "WINNERS"
  | "CHAMPS";

export type ChamaLevel = {
  key: ChamaLevelKey;
  name: string;
  monthlyAmount: number; // KES per member, per month
  groupSize: number; // number of members the level is designed for
};

export const CHAMA_LEVELS: ChamaLevel[] = [
  { key: "NYOTA", name: "Nyota", monthlyAmount: 1_000, groupSize: 10 },
  { key: "PEPEA", name: "Pepea", monthlyAmount: 2_000, groupSize: 10 },
  { key: "ALPHA", name: "Alpha", monthlyAmount: 3_000, groupSize: 10 },
  { key: "JULIET", name: "Juliet", monthlyAmount: 5_000, groupSize: 10 },
  { key: "SILVER", name: "Silver", monthlyAmount: 10_000, groupSize: 10 },
  { key: "DIAMOND", name: "Diamond", monthlyAmount: 20_000, groupSize: 6 },
  { key: "KINGS", name: "Kings", monthlyAmount: 50_000, groupSize: 6 },
  { key: "WINNERS", name: "Winners", monthlyAmount: 100_000, groupSize: 6 },
  { key: "CHAMPS", name: "Champs", monthlyAmount: 200_000, groupSize: 6 },
];

export function getChamaLevel(key: string | null | undefined): ChamaLevel | null {
  if (!key) return null;
  return CHAMA_LEVELS.find((l) => l.key === key) ?? null;
}

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
