export type LifeCurrency = {
  id: string;
  label: "Life Credits";
  code: "LC";
  balance: number;
  earnedThisWeek: number;
  spentThisWeek: number;
};

export type RewardCategory =
  | "screen_time"
  | "gaming"
  | "media"
  | "food"
  | "free_time"
  | "purchase"
  | "recovery"
  | "custom";

export type RewardStatus =
  | "available"
  | "locked"
  | "claimed"
  | "cooldown"
  | "disabled";

export type RewardItem = {
  id: string;
  title: string;
  category: RewardCategory;
  cost: number;
  status: RewardStatus;
  description: string;
  limitLabel?: string;
  cooldownLabel?: string;
  createdByUser: boolean;
  lastClaimedAt?: string;
};

export type RewardTransaction = {
  id: string;
  type: "earned" | "spent" | "adjusted";
  amount: number;
  reason: string;
  source: "task" | "habit" | "challenge" | "manual" | "reward";
  createdAt: string;
};

export type ShopViewModel = {
  currency: LifeCurrency;
  rewards: RewardItem[];
  transactions: RewardTransaction[];
  recommendedRewardIds: string[];
  rules: string[];
  earningSources: string[];
};

