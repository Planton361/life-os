export type ResourceType =
  | "note"
  | "learning"
  | "prompt"
  | "research"
  | "link"
  | "snippet"
  | "decision";

export type ResourceStatus =
  | "raw"
  | "review_needed"
  | "processed"
  | "reusable"
  | "linked"
  | "archived";

export type ResourceArea =
  | "education"
  | "work"
  | "coding"
  | "health"
  | "personal"
  | "review"
  | "system";

export type ResourceReviewState =
  | "needs_extraction"
  | "needs_linking"
  | "ready_to_reuse"
  | "source_checked"
  | "pattern_candidate"
  | "archived_reference";

export type ResourceAction = {
  label: string;
  detail: string;
};

export type RelatedResource = {
  title: string;
  relation: string;
};

export type ResourceItem = {
  id: string;
  title: string;
  type: ResourceType;
  area: ResourceArea;
  status: ResourceStatus;
  source: string;
  linkedContext: string;
  lastTouched: string;
  reviewState: ResourceReviewState;
  summary: string;
  keyLearning: string;
  nextUse: string;
  relatedResources: RelatedResource[];
  actions: ResourceAction[];
};

export type ResourceSummaryStat = {
  label: string;
  value: string;
  detail: string;
  accent: string;
};

export type ResourceOption<TValue extends string> = {
  value: TValue;
  label: string;
  detail?: string;
  count?: number;
  accent?: string;
  active?: boolean;
};

export type ResourceReviewQueueItem = {
  title: string;
  action: string;
  linkedContext: string;
  accent: string;
};

export type RecentLearning = {
  title: string;
  insight: string;
  source: string;
  accent: string;
};

export type ResourceTypeMeta = {
  label: string;
  shortLabel: string;
  accent: string;
};

export type ResourceStatusMeta = {
  label: string;
  accent: string;
};

export type ResourceAreaMeta = {
  label: string;
  accent: string;
};

export type ResourceReviewStateMeta = {
  label: string;
  accent: string;
};

export type ResourcesViewModel = {
  header: {
    eyebrow: "Knowledge Library";
    title: "Resources";
    summary: string;
    dateRange: string;
  };
  pageContract: {
    pageType: "Resources / Entity Workbench";
    primaryPurpose: string;
    writes: string;
    reads: string;
    canonicalSource: string;
    sensitiveData: string;
    primaryDecision: string;
    mainZone: string;
    emptyState: string;
    mobileOrder: string;
  };
  summaryStats: ResourceSummaryStat[];
  typeOptions: ResourceOption<ResourceType | "all">[];
  filterOptions: ResourceOption<string>[];
  captureTypes: ResourceOption<ResourceType>[];
  resources: ResourceItem[];
  selectedResource: ResourceItem;
  reviewQueue: ResourceReviewQueueItem[];
  recentLearnings: RecentLearning[];
};
