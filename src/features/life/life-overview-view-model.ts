import {
  entertainmentItems,
  inventoryItems,
  journalEntries,
  lifeNotes,
  lifeReviewDots,
  lifeSections,
  privacyNotes,
  recentLifeActivity,
} from "./mock-life-data";
import type { LifeOverviewMetric, LifeOverviewViewModel } from "./types";

function buildOverviewMetrics(): LifeOverviewMetric[] {
  const openWishlist = inventoryItems.filter((item) =>
    ["wishlist", "planned_purchase", "needs_replacement"].includes(item.status),
  ).length;
  const waitItems = inventoryItems.filter((item) => item.budgetFit === "wait").length;

  return [
    {
      id: "journal-week",
      label: "Journal entries this week",
      value: journalEntries.length.toString(),
      helper: "Reflection exists without becoming a score.",
      tone: "purple",
    },
    {
      id: "loose-notes",
      label: "Loose notes kept",
      value: lifeNotes.length.toString(),
      helper: "Preserved without task or knowledge conversion.",
      tone: "cyan",
    },
    {
      id: "wishlist-open",
      label: "Wishlist decisions open",
      value: openWishlist.toString(),
      helper: "Budget fit needs manual review.",
      tone: "orange",
    },
    {
      id: "budget-wait",
      label: "Items marked wait",
      value: waitItems.toString(),
      helper: "Text status, not alarm color.",
      tone: "gray",
    },
  ];
}

export function getLifeOverviewViewModel(): LifeOverviewViewModel {
  return {
    header: {
      title: "Life Overview",
      eyebrow: "Area dashboard / personal context",
      summary: "Journal, loose notes, inventory and deliberate wishlist decisions",
      statusLabel: "Stable, mentally full",
      context: "Private personal context, static mock data, no persistence.",
    },
    pageContract: {
      pageType: "Area Overview",
      primaryPurpose:
        "Personal context for reflection, keeping loose thoughts and deciding personal inventory questions.",
      writes:
        "Local UI-only mock records for journal entries, notes and wishlist items.",
      reads:
        "Static mock journal entries, loose notes, inventory items and personal activity.",
      canonicalSource:
        "Later journal_entries, notes, inventory_items and activity_events.",
      sensitiveData:
        "Journal and personal notes are treated as personal_sensitive and private by default.",
      primaryDecision:
        "Which personal subarea needs attention next without duplicating the daily dashboard.",
      mainZone: "Personal Check-in",
      emptyState:
        "Each panel explains the future manual flow when no local mock items match.",
      mobileOrder: [
        "Header + New journal entry",
        "Personal Check-in",
        "Quick Actions",
        "Life Sections",
        "Loose Notes",
        "Inventory & Wishlist Focus",
        "Recent Personal Activity",
        "Privacy Notes",
      ],
    },
    journalEntries,
    notes: lifeNotes,
    entertainment: entertainmentItems,
    inventory: inventoryItems,
    sections: lifeSections,
    metrics: buildOverviewMetrics(),
    recentActivity: recentLifeActivity,
    reviewDots: lifeReviewDots,
    privacyNotes,
  };
}
