import type { ContentStateMeta } from "@/features/content-state";

export type WorkProfileId = "demo" | "empty" | "manual";

export type WorkTaskStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "done"
  | "archived";

export type WorkTask = {
  id: string;
  title: string;
  status: WorkTaskStatus;
  priority: "low" | "medium" | "high";
  context: string;
  nextAction: string;
  linkedActivityIds: string[];
  linkedWikiEntryIds: string[];
  updatedAt: string;
};

export type WorkActivityType =
  | "analysis"
  | "implementation"
  | "testing"
  | "documentation"
  | "meeting_followup"
  | "debugging"
  | "research"
  | "review";

export type WorkActivity = {
  id: string;
  taskId?: string;
  title: string;
  type: WorkActivityType;
  date: string;
  durationLabel?: string;
  summary: string;
  result: string;
  howItWasDone: string;
  evidence: string;
  blockers: string[];
  followUps: string[];
  linkedWikiEntryIds: string[];
  linkedArchitectureItemIds: string[];
};

export type WorkLogStatus =
  | "draft"
  | "logged"
  | "review_needed"
  | "follow_up_open"
  | "closed";

export type WorkLogEntry = {
  id: string;
  title: string;
  date: string;
  status: WorkLogStatus;
  taskIds: string[];
  activityIds: string[];
  summary: string;
  accomplished: string;
  howItWasDone: string;
  blockers: string[];
  followUps: string[];
  linkedWikiEntryIds: string[];
  linkedArchitectureItemIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type WorkWikiType =
  | "concept"
  | "process"
  | "how_to"
  | "architecture"
  | "decision"
  | "reference"
  | "glossary"
  | "checklist";

export type WorkWikiEntry = {
  id: string;
  title: string;
  type: WorkWikiType;
  summary: string;
  body: string;
  tags: string[];
  status: "draft" | "active" | "needs_review" | "archived";
  lastReviewedAt?: string;
  relatedArchitectureItemIds: string[];
  relatedLogEntryIds: string[];
  relatedTaskIds: string[];
};

export type WorkArchitectureItemType =
  | "system"
  | "module"
  | "service"
  | "data_flow"
  | "process"
  | "interface"
  | "dependency"
  | "concept";

export type WorkArchitectureItem = {
  id: string;
  title: string;
  type: WorkArchitectureItemType;
  summary: string;
  status: "known" | "learning" | "unclear" | "needs_review";
  relatedIds: string[];
  wikiEntryIds: string[];
  note: string;
};

export type WorkFollowUp = {
  id: string;
  title: string;
  source: "work_log" | "activity" | "meeting" | "wiki" | "manual";
  status: "open" | "waiting" | "done" | "blocked";
  priority: "low" | "medium" | "high";
  nextAction: string;
  linkedLogEntryId?: string;
  linkedActivityId?: string;
  linkedWikiEntryId?: string;
};

export type WorkMeetingNote = {
  id: string;
  title: string;
  date: string;
  summary: string;
  decisions: string[];
  followUps: string[];
  linkedWikiEntryIds: string[];
};

export type WorkSection = {
  id: "log" | "wiki" | "meetings";
  title: string;
  href: "/work/log" | "/work/wiki" | "/work/meetings";
  purpose: string;
  lastActivity: string;
  openItems: number;
  nextAction: string;
};

export type WorkOverviewContentStates = {
  page: ContentStateMeta;
  searchFilters: ContentStateMeta;
  currentWorkJournal: ContentStateMeta;
  quickActions: ContentStateMeta;
  openFollowUps: ContentStateMeta;
  workSignals: ContentStateMeta;
  recentWorkLog: ContentStateMeta;
  architectureSnapshot: ContentStateMeta;
};

export type WorkLogContentStates = {
  page: ContentStateMeta;
  searchFilters: ContentStateMeta;
  currentWorkEntry: ContentStateMeta;
  quickActions: ContentStateMeta;
  openFollowUps: ContentStateMeta;
  taskContext: ContentStateMeta;
  activityTimeline: ContentStateMeta;
  workLogSignals: ContentStateMeta;
  recentWorkLogs: ContentStateMeta;
  linkedWikiNotes: ContentStateMeta;
};

export type WorkWikiContentStates = {
  page: ContentStateMeta;
  searchFilters: ContentStateMeta;
  pinnedReferences: ContentStateMeta;
  needsReview: ContentStateMeta;
  wikiLookup: ContentStateMeta;
  architectureNotes: ContentStateMeta;
  wikiCategories: ContentStateMeta;
};

export type WorkOverviewViewModel = {
  profileId: WorkProfileId;
  contentStates: WorkOverviewContentStates;
  tasks: WorkTask[];
  activities: WorkActivity[];
  logs: WorkLogEntry[];
  wikiEntries: WorkWikiEntry[];
  architectureItems: WorkArchitectureItem[];
  followUps: WorkFollowUp[];
  meetings: WorkMeetingNote[];
  sections: WorkSection[];
  privacyNotes: string[];
  manualWorkspace?: {
    authAvailable: boolean;
    projects: Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      tasks: Array<{ id: string; title: string; status: string; dueAt: string | null }>;
      resources: Array<{ id: string; title: string; relationType: string }>;
      logs: import("./work-log").WorkLog[];
    }>;
    wiki: import("./work-decision").WorkWikiEntry[];
    decisions: import("./work-decision").WorkDecision[];
    meetings: import("./work-meeting").WorkMeeting[];
  };
};

export type WorkLogViewModel = {
  profileId: WorkProfileId;
  contentStates: WorkLogContentStates;
  tasks: WorkTask[];
  activities: WorkActivity[];
  logs: WorkLogEntry[];
  wikiEntries: WorkWikiEntry[];
  architectureItems: WorkArchitectureItem[];
  followUps: WorkFollowUp[];
};

export type WorkWikiViewModel = {
  profileId: WorkProfileId;
  contentStates: WorkWikiContentStates;
  tasks: WorkTask[];
  logs: WorkLogEntry[];
  wikiEntries: WorkWikiEntry[];
  architectureItems: WorkArchitectureItem[];
};
