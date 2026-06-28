export const inboxAISuggestionRoutes = [
  "standalone_task",
  "add_to_existing",
  "create_new",
  "resource",
  "solved_archive",
] as const;

export const inboxAISuggestionConfidences = ["low", "medium", "high"] as const;

export const inboxAITargetTypes = [
  "project",
  "goal",
  "resource",
  "skill",
] as const;

export type InboxAISuggestionRoute = (typeof inboxAISuggestionRoutes)[number];
export type InboxAISuggestionConfidence =
  (typeof inboxAISuggestionConfidences)[number];
export type InboxAITargetType = (typeof inboxAITargetTypes)[number];

export type InboxAITaskDraftSuggestion = {
  description?: string;
  durationMinutes?: number;
  energy?: "low" | "medium" | "high";
  nextAction?: string;
  planToday?: boolean;
  priority?: "P0" | "P1" | "P2" | "P3" | "none";
  title?: string;
};

export type InboxAICreateNewDraftSuggestion = {
  summary?: string;
  title?: string;
  type?: "goal" | "project";
};

export type InboxAIResourceDraftSuggestion = {
  source?: string;
  summary?: string;
  title?: string;
  type?: "decision" | "learning" | "link" | "note" | "research" | "source";
};

export type InboxAITargetSuggestion = {
  targetId?: string;
  targetTitle?: string;
  targetType?: InboxAITargetType;
};

export type InboxAISuggestion = {
  confidence: InboxAISuggestionConfidence;
  createNewDraft?: InboxAICreateNewDraftSuggestion;
  reason: string;
  resourceDraft?: InboxAIResourceDraftSuggestion;
  route: InboxAISuggestionRoute;
  targetSuggestion?: InboxAITargetSuggestion;
  taskDraft?: InboxAITaskDraftSuggestion;
  warnings?: string[];
};

export type InboxAISuggestionRequest = {
  body?: string | null;
  title: string;
  type?: string | null;
};

export type InboxAISuggestionActionResult = {
  message: string;
  status: "blocked" | "error" | "success";
  suggestion?: InboxAISuggestion;
};
