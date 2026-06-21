export type LifeItemPrivacy = "private" | "sensitive" | "normal";

export type LifeSource =
  | "manual"
  | "quick_capture"
  | "journal"
  | "import"
  | "system";

export type LifeTone =
  | "purple"
  | "cyan"
  | "blue"
  | "orange"
  | "green"
  | "red"
  | "gray";

export type LifeTag = {
  id: string;
  label: string;
  tone: Extract<LifeTone, "purple" | "cyan" | "blue" | "orange" | "gray">;
};

export type LifePriority = "low" | "medium" | "high";

export type JournalMood =
  | "calm"
  | "stable"
  | "tired"
  | "stressed"
  | "overloaded"
  | "unclear";

export type JournalEntry = {
  id: string;
  title: string;
  date: string;
  mood: JournalMood;
  energyLabel: string;
  summary: string;
  body: string;
  reflectionPrompt: string;
  tags: string[];
  privacy: LifeItemPrivacy;
  createdAt: string;
  updatedAt: string;
};

export type LifeNoteType =
  | "thought"
  | "memory"
  | "idea"
  | "reflection"
  | "quote"
  | "question"
  | "misc";

export type LifeNote = {
  id: string;
  title: string;
  type: LifeNoteType;
  createdAt: string;
  updatedAt: string;
  snippet: string;
  body: string;
  tags: string[];
  source: LifeSource;
  intentionallyUnstructured: boolean;
  privacy: LifeItemPrivacy;
};

export type EntertainmentType =
  | "movie"
  | "series"
  | "book"
  | "game"
  | "video"
  | "music"
  | "podcast"
  | "other";

export type EntertainmentStatus =
  | "wishlist"
  | "watching"
  | "reading"
  | "playing"
  | "paused"
  | "finished"
  | "archived";

export type EntertainmentItem = {
  id: string;
  title: string;
  type: EntertainmentType;
  status: EntertainmentStatus;
  priority: LifePriority;
  note?: string;
  nextAction?: string;
  addedAt: string;
  updatedAt: string;
  ratingPersonal?: "not_rated" | "liked" | "neutral" | "dropped";
};

export type InventoryCategory =
  | "tech"
  | "desk"
  | "clothing"
  | "fitness"
  | "home"
  | "study"
  | "software"
  | "other";

export type InventoryStatus =
  | "owned"
  | "needs_replacement"
  | "wishlist"
  | "planned_purchase"
  | "not_needed"
  | "archived";

export type BudgetFit = "fits" | "wait" | "too_expensive" | "unknown";

export type InventoryItem = {
  id: string;
  title: string;
  category: InventoryCategory;
  status: InventoryStatus;
  owned: boolean;
  estimatedValue?: number;
  targetPrice?: number;
  priority: LifePriority;
  budgetFit: BudgetFit;
  note?: string;
  addedAt: string;
  updatedAt: string;
};

export type LifeOverviewMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: Exclude<LifeTone, "blue">;
};

export type LifeSectionId =
  | "journal"
  | "notes"
  | "entertainment"
  | "inventory";

export type LifeSectionSummary = {
  id: LifeSectionId;
  title: string;
  purpose: string;
  href: `/${string}`;
  lastActivity: string;
  openItems: string;
  nextAction: string;
  accent: Extract<LifeTone, "purple" | "cyan" | "blue" | "orange">;
};

export type LifeActivity = {
  id: string;
  label: string;
  detail: string;
  time: string;
  tone: Extract<LifeTone, "purple" | "cyan" | "orange" | "gray">;
};

export type LifeReviewDot = {
  id: string;
  label: string;
  mood: JournalMood;
  detail: string;
};

export type LifePageContract = {
  pageType: string;
  primaryPurpose: string;
  writes: string;
  reads: string;
  canonicalSource: string;
  sensitiveData: string;
  primaryDecision: string;
  mainZone: string;
  emptyState: string;
  mobileOrder: string[];
};

export type LifeOverviewViewModel = {
  header: {
    title: "Life Overview";
    eyebrow: string;
    summary: string;
    statusLabel: string;
    context: string;
  };
  pageContract: LifePageContract;
  journalEntries: JournalEntry[];
  notes: LifeNote[];
  entertainment: EntertainmentItem[];
  inventory: InventoryItem[];
  sections: LifeSectionSummary[];
  metrics: LifeOverviewMetric[];
  recentActivity: LifeActivity[];
  reviewDots: LifeReviewDot[];
  privacyNotes: string[];
};

export type LifeSubpageHeader = {
  eyebrow: string;
  title: "Journal" | "Notes" | "Entertainment" | "Inventory";
  summary: string;
  context: string;
};

export type JournalPageViewModel = {
  header: LifeSubpageHeader;
  pageContract: LifePageContract;
  entries: JournalEntry[];
  prompts: string[];
};

export type NotesPageViewModel = {
  header: LifeSubpageHeader;
  pageContract: LifePageContract;
  notes: LifeNote[];
};

export type EntertainmentPageViewModel = {
  header: LifeSubpageHeader;
  pageContract: LifePageContract;
  items: EntertainmentItem[];
};

export type InventoryPageViewModel = {
  header: LifeSubpageHeader;
  pageContract: LifePageContract;
  items: InventoryItem[];
};
