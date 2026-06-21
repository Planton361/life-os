import {
  earningSources,
  lifeCurrency,
  recommendedRewardIds,
  rewardItems,
  rewardRules,
  rewardTransactions,
} from "./mock-shop-data";
import type { ShopViewModel } from "./types";

export function getShopViewModel(): ShopViewModel {
  return {
    currency: lifeCurrency,
    earningSources,
    recommendedRewardIds,
    rewards: rewardItems,
    rules: rewardRules,
    transactions: rewardTransactions,
  };
}

