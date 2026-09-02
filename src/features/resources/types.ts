import type { ContentStateMeta } from "@/features/content-state";
import type { SemanticConnectedContext } from "@/features/semantic-relations/read-model";

export type ResourceProfileId = "demo" | "empty" | "manual";

export type ResourceType =
  | "note"
  | "learning"
  | "prompt"
  | "research"
  | "link"
  | "source"
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
  | "nutrition"
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

export type ResourceViewMode = "library" | "map" | "review";

export type ResourceRelationType =
  | "related_to"
  | "derived_from"
  | "supports"
  | "contradicts"
  | "used_in"
  | "feeds_into"
  | "references"
  | "source_for"
  | "follow_up_of"
  | "same_topic";

export type ResourceRelationTargetType =
  | "project"
  | "goal"
  | "task"
  | "resource"
  | "skill";

export type ResourceDataRelationType =
  | "source"
  | "context"
  | "supports"
  | "evidence"
  | "decision"
  | "related";

export type RelatedResource = {
  title: string;
  relation: string;
};

export type ResourceRelationViewModel = {
  id: string;
  resourceId: string;
  targetType: ResourceRelationTargetType;
  targetId: string;
  targetTitle: string;
  targetStatus?: string | null;
  targetProgress?: number | null;
  targetMissing: boolean;
  relationType: ResourceDataRelationType;
  createdAt: string;
};

export type ResourceRelationCreateTarget = {
  id: string;
  type: ResourceRelationTargetType;
  title: string;
  meta: string;
};

export type ResourceLinkedContextKind =
  | "project"
  | "goal"
  | "skill"
  | "task"
  | "note"
  | "area"
  | "scientific_work"
  | "wiki"
  | "repository";

export type ResourceLinkedContext = {
  id: string;
  title: string;
  kind: ResourceLinkedContextKind;
  detail: string;
  accent: string;
};

export type ResourceItem = {
  id: string;
  title: string;
  url?: string;
  archivedAt?: string;
  type: ResourceType;
  area: ResourceArea;
  status: ResourceStatus;
  source: string;
  linkedContext: string;
  linkedContexts: ResourceLinkedContext[];
  topic: string;
  clusterId: string;
  lastTouched: string;
  reviewState: ResourceReviewState;
  summary: string;
  keyLearning: string;
  nextUse: string;
  relatedResources: RelatedResource[];
  relations?: ResourceRelationViewModel[];
  relatedProjects?: ResourceRelationViewModel[];
  relatedGoals?: ResourceRelationViewModel[];
  relatedTasks?: ResourceRelationViewModel[];
  relatedSkills?: ResourceRelationViewModel[];
  relatedResourceRelations?: ResourceRelationViewModel[];
  actions: ResourceAction[];
  connectedContext?: SemanticConnectedContext;
};

export type ResourceRelation = {
  id: string;
  fromResourceId: string;
  toResourceId: string;
  type: ResourceRelationType;
  label?: string;
};

export type ResourceCluster = {
  id: string;
  title: string;
  area: ResourceArea;
  topic: string;
  summary: string;
  resourceIds: string[];
  accent: string;
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
  resourceId: string;
  title: string;
  sourceType: string;
  action: string;
  targetType: string;
  linkedContext: string;
  status: string;
  suggestedActions: string[];
  accent: string;
};

export type ResourceAiSuggestion = {
  title: string;
  detail: string;
  confidence: string;
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
  profileId: ResourceProfileId;
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
  viewOptions: ResourceOption<ResourceViewMode>[];
  relationTargets: ResourceRelationCreateTarget[];
  typeOptions: ResourceOption<ResourceType | "all">[];
  filterOptions: ResourceOption<string>[];
  mapScopes: ResourceOption<string>[];
  captureTypes: ResourceOption<ResourceType>[];
  resources: ResourceItem[];
  relations: ResourceRelation[];
  clusters: ResourceCluster[];
  selectedResource: ResourceItem | null;
  reviewQueue: ResourceReviewQueueItem[];
  aiSuggestions: ResourceAiSuggestion[];
  recentLearnings: RecentLearning[];
  contentStates: {
    page: ContentStateMeta;
    summary: ContentStateMeta;
    library: ContentStateMeta;
    relationInspector: ContentStateMeta;
    reviewQueue: ContentStateMeta;
    reviewWorkbench: ContentStateMeta;
    recentLearnings: ContentStateMeta;
    knowledgeMap: ContentStateMeta;
  };
};
