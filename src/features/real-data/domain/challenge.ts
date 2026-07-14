export const challengePeriods = ["daily", "weekly", "monthly", "custom"] as const;
export type ChallengePeriod = (typeof challengePeriods)[number];
export const challengeStatuses = ["active", "completed", "abandoned"] as const;
export type ChallengeStatus = (typeof challengeStatuses)[number];

export type ChallengeProgressLog = { archivedAt: string | null; challengeId: string; createdAt: string; id: string; increment: number; note: string | null; recordedAt: string; updatedAt: string };
export type ChallengeRecord = { archivedAt: string | null; completedAt: string | null; createdAt: string; description: string | null; endDate: string; id: string; periodType: ChallengePeriod; rewardCoins: number; startDate: string; status: ChallengeStatus; targetValue: number; title: string; unit: string; updatedAt: string };
export type RewardLedgerEntry = { amount: number; createdAt: string; description: string; entryType: "challenge_reward" | "shop_redemption"; id: string; sourceId: string; sourceType: "challenge" | "shop_redemption" };
export type ChallengeWorkspace = { balance: number; challenges: ChallengeRecord[]; ledger: RewardLedgerEntry[]; logs: ChallengeProgressLog[] };

export function aggregateChallengeProgress(logs: readonly Pick<ChallengeProgressLog, "archivedAt" | "increment">[]) { return logs.filter((log) => !log.archivedAt).reduce((sum, log) => sum + log.increment, 0); }
export function challengeProgress(current: number, target: number) { return { eligible: current >= target, overachieved: current > target, percentage: (current / target) * 100 }; }
export function rewardBalance(entries: readonly Pick<RewardLedgerEntry, "amount">[]) { return entries.reduce((sum, entry) => sum + entry.amount, 0); }
export function latestActiveProgressLog<T extends Pick<ChallengeProgressLog, "archivedAt" | "id" | "recordedAt">>(logs: readonly T[]) { return [...logs].filter((log) => !log.archivedAt).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id))[0] ?? null; }
export function sortChallenges<T extends Pick<ChallengeRecord, "id" | "updatedAt">>(items: readonly T[]) { return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)); }
