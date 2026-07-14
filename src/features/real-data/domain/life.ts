export type JournalEntry = {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  entryDate: string;
  id: string;
  title: string | null;
  updatedAt: string;
};

export type LifeNoteRelation = {
  href: string;
  id: string;
  label: string;
  relationType: string;
  targetType: "goal" | "project" | "task";
};

export type LifeNote = {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  id: string;
  relations: LifeNoteRelation[];
  title: string;
  updatedAt: string;
};

export type LifeWorkspace = {
  areaAvailable: boolean;
  journalEntries: JournalEntry[];
  notes: LifeNote[];
};

export const entertainmentMediaTypes = ["book", "movie", "series", "game"] as const;
export type EntertainmentMediaType = (typeof entertainmentMediaTypes)[number];

export const entertainmentStatuses = ["planned", "in_progress", "completed", "dropped"] as const;
export type EntertainmentStatus = (typeof entertainmentStatuses)[number];

export const entertainmentProgressUnits = ["pages", "episodes", "percent", "hours"] as const;
export type EntertainmentProgressUnit = (typeof entertainmentProgressUnits)[number];

export type EntertainmentItem = {
  archivedAt: string | null;
  completedOn: string | null;
  createdAt: string;
  creatorOrStudio: string | null;
  id: string;
  mediaType: EntertainmentMediaType;
  notes: string | null;
  progressCurrent: number | null;
  progressTotal: number | null;
  progressUnit: EntertainmentProgressUnit | null;
  rating: number | null;
  releaseYear: number | null;
  startedOn: string | null;
  status: EntertainmentStatus;
  title: string;
  updatedAt: string;
};

export type EntertainmentWorkspace = {
  areaAvailable: boolean;
  items: EntertainmentItem[];
};

export const inventoryConditions = ["new", "good", "used", "damaged", "retired"] as const;
export type InventoryCondition = (typeof inventoryConditions)[number];
export const wishlistPriorities = ["low", "medium", "high"] as const;
export type WishlistPriority = (typeof wishlistPriorities)[number];
export const wishlistStatuses = ["considering", "planned", "approved", "acquired", "rejected"] as const;
export type WishlistStatus = (typeof wishlistStatuses)[number];
export const purchaseDecisionStatuses = ["open", "decided_buy", "decided_skip", "deferred"] as const;
export type PurchaseDecisionStatus = (typeof purchaseDecisionStatuses)[number];

export type InventoryItem = {
  acquiredOn: string | null; acquisitionValue: number | null; archivedAt: string | null;
  category: string; condition: InventoryCondition | null; createdAt: string; currency: string | null;
  description: string | null; id: string; location: string | null; name: string;
  quantity: number | null; sourceWishlistItemId: string | null; sourceWishlistTitle: string | null;
  unit: string | null; updatedAt: string;
};

export type WishlistItem = {
  archivedAt: string | null; category: string; createdAt: string; currency: string | null;
  description: string | null; expectedPrice: number | null; id: string; priority: WishlistPriority;
  status: WishlistStatus; targetDate: string | null; title: string; updatedAt: string;
};

export type PurchaseDecision = {
  archivedAt: string | null; context: string; createdAt: string; criteria: string | null;
  decision: string; decisionDate: string; id: string; inventoryItemId: string | null;
  rationale: string; status: PurchaseDecisionStatus; updatedAt: string; wishlistItemId: string;
};

export type InventoryWorkspace = {
  areaAvailable: boolean;
  decisions: PurchaseDecision[];
  inventoryItems: InventoryItem[];
  wishlistItems: WishlistItem[];
};

export function splitLifecycle<T extends { archivedAt: string | null }>(items: readonly T[]) {
  return { active: items.filter((item) => !item.archivedAt), archived: items.filter((item) => item.archivedAt) };
}
