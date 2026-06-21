import type { LifeCurrency, RewardItem, RewardTransaction } from "./types";

export const lifeCurrency: LifeCurrency = {
  id: "life-credits",
  label: "Life Credits",
  code: "LC",
  balance: 42,
  earnedThisWeek: 18,
  spentThisWeek: 10,
};

export const rewardItems: RewardItem[] = [
  {
    id: "reward-phone-time",
    title: "30 min phone time",
    category: "screen_time",
    cost: 8,
    status: "available",
    description: "A deliberate phone break after a completed focus block.",
    limitLabel: "Max 1 per day",
    cooldownLabel: "Available today",
    createdByUser: false,
  },
  {
    id: "reward-cs-match",
    title: "1 CS match",
    category: "gaming",
    cost: 12,
    status: "available",
    description: "One match as a planned break, not a fallback loop.",
    limitLabel: "After priority work",
    createdByUser: false,
  },
  {
    id: "reward-episode-break",
    title: "1 episode break",
    category: "media",
    cost: 15,
    status: "cooldown",
    description: "One episode with a clear stop after the break.",
    cooldownLabel: "Cooldown until tomorrow",
    createdByUser: false,
    lastClaimedAt: "2026-06-20",
  },
  {
    id: "reward-free-time",
    title: "60 min free time",
    category: "free_time",
    cost: 20,
    status: "available",
    description: "Unstructured time that is chosen intentionally.",
    limitLabel: "Evening slot",
    createdByUser: false,
  },
  {
    id: "reward-coffee-outside",
    title: "Coffee outside",
    category: "food",
    cost: 12,
    status: "available",
    description: "Leave the desk and reset with a small coffee walk.",
    createdByUser: false,
  },
  {
    id: "reward-recovery-evening",
    title: "Deep recovery evening",
    category: "recovery",
    cost: 30,
    status: "locked",
    description: "Long low-stimulation evening after a stable week.",
    limitLabel: "Manual review before claim",
    createdByUser: false,
  },
  {
    id: "reward-purchase-fund",
    title: "Small purchase fund",
    category: "purchase",
    cost: 30,
    status: "disabled",
    description: "Prepared placeholder for later purchase decisions. No real money.",
    limitLabel: "Prepared only",
    createdByUser: false,
  },
  {
    id: "reward-desk-reset",
    title: "Custom reward: desk reset reward",
    category: "custom",
    cost: 8,
    status: "available",
    description: "A small reward after cleaning and resetting the desk.",
    cooldownLabel: "User-created",
    createdByUser: true,
  },
];

export const rewardTransactions: RewardTransaction[] = [
  {
    id: "tx-weekly-review",
    type: "earned",
    amount: 12,
    reason: "Weekly Review completed",
    source: "challenge",
    createdAt: "2026-06-20",
  },
  {
    id: "tx-habit-stack",
    type: "earned",
    amount: 6,
    reason: "Habits completed",
    source: "habit",
    createdAt: "2026-06-19",
  },
  {
    id: "tx-phone-time",
    type: "spent",
    amount: 8,
    reason: "30 min phone time",
    source: "reward",
    createdAt: "2026-06-18",
  },
  {
    id: "tx-manual-adjust",
    type: "adjusted",
    amount: 2,
    reason: "Manual balance correction",
    source: "manual",
    createdAt: "2026-06-17",
  },
];

export const recommendedRewardIds = [
  "reward-phone-time",
  "reward-coffee-outside",
  "reward-desk-reset",
];

export const rewardRules = [
  "Rewards should be intentional",
  "No random loot",
  "No real money",
  "Cooldowns prevent overuse",
  "Manual review before expensive rewards",
];

export const earningSources = [
  "Tasks completed",
  "Habits completed",
  "Daily Review",
  "Challenges completed",
];

