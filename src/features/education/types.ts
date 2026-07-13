import type { ContentStateMeta } from "@/features/content-state";

export type EducationProfileId = "demo" | "empty" | "manual";

export type ResearchIdeaStatus =
  | "idea"
  | "exploring"
  | "promising"
  | "active"
  | "paused"
  | "rejected"
  | "archived";

export type AcademicWorkType =
  | "hausarbeit"
  | "seminararbeit"
  | "master_thesis"
  | "paper"
  | "presentation"
  | "research_project"
  | "other";

export type ThesisPotential = "low" | "medium" | "high" | "unknown";

export type ResearchIdea = {
  id: string;
  title: string;
  status: ResearchIdeaStatus;
  workType: AcademicWorkType;
  fieldId: string;
  fieldTitle: string;
  thesisPotential: ThesisPotential;
  summary: string;
  researchQuestion?: string;
  nextAction: string;
  sourceCount: number;
  noteCount: number;
  openQuestionCount: number;
  updatedAt: string;
};

export type ResearchFieldStatus = "active" | "watching" | "paused" | "archived";

export type ResearchField = {
  id: string;
  title: string;
  description: string;
  status: ResearchFieldStatus;
  ideaCount: number;
  literatureCount: number;
  openQuestionCount: number;
  nextAction: string;
};

export type LiteratureStatus =
  | "to_read"
  | "reading"
  | "extracting"
  | "reviewed"
  | "used"
  | "discarded";

export type LiteratureItem = {
  id: string;
  title: string;
  authors: string;
  year?: number;
  type: "paper" | "book" | "article" | "thesis" | "report" | "website" | "other";
  status: LiteratureStatus;
  fieldId?: string;
  fieldTitle?: string;
  ideaId?: string;
  ideaTitle?: string;
  relevance: "low" | "medium" | "high";
  citationKey?: string;
  note?: string;
  nextAction: string;
  updatedAt: string;
};

export type ResearchNoteType =
  | "summary"
  | "argument"
  | "method"
  | "quote"
  | "question"
  | "decision"
  | "source_note";

export type ResearchNote = {
  id: string;
  title: string;
  type: ResearchNoteType;
  ideaId?: string;
  ideaTitle?: string;
  literatureId?: string;
  literatureTitle?: string;
  fieldId?: string;
  fieldTitle?: string;
  snippet: string;
  body: string;
  tags: string[];
  source: "manual" | "literature" | "lecture" | "quick_capture" | "import";
  reviewNeeded: boolean;
  updatedAt: string;
};

export type ResearchQuestion = {
  id: string;
  question: string;
  ideaId?: string;
  ideaTitle?: string;
  fieldId?: string;
  fieldTitle?: string;
  status: "open" | "investigating" | "answered" | "parked";
  importance: "low" | "medium" | "high";
  nextAction: string;
  updatedAt: string;
};

export type MasterThesisMilestone = {
  id: string;
  title: string;
  status: "planned" | "active" | "blocked" | "done" | "paused";
  dueLabel?: string;
  progress: number;
  nextAction: string;
};

export type MasterThesisState = {
  id: string;
  title: string;
  currentPhase:
    | "orientation"
    | "topic_selection"
    | "proposal"
    | "literature"
    | "method"
    | "writing"
    | "revision";
  researchQuestion?: string;
  supervisor?: string;
  progress: number;
  nextAction: string;
  openRisk?: string;
  linkedIdeaId?: string;
  linkedFieldId?: string;
  sourceCount: number;
  noteCount: number;
  milestoneCount: number;
};

export type LearningTrackStatus =
  | "active"
  | "paused"
  | "completed"
  | "planned"
  | "blocked";

export type LearningTrackType =
  | "course"
  | "practice"
  | "reading"
  | "project"
  | "platform"
  | "exam"
  | "other";

export type LearningTrack = {
  id: string;
  title: string;
  type: LearningTrackType;
  status: LearningTrackStatus;
  focusArea: string;
  progress: number;
  currentModule?: string;
  nextAction: string;
  linkedSkill?: string;
  linkedProject?: string;
  updatedAt: string;
};

export type LearningSession = {
  id: string;
  title: string;
  trackId: string;
  trackTitle: string;
  date: string;
  durationMinutes: number;
  outcome: string;
  evidence: string;
  energyLabel: "low" | "medium" | "high";
  status: "planned" | "done" | "skipped" | "review_needed";
  notes?: string;
};

export type PracticeQueueItem = {
  id: string;
  title: string;
  source: "hyperskill" | "leetcode" | "course" | "book" | "manual" | "other";
  difficulty: "easy" | "medium" | "hard";
  linkedTrackId?: string;
  linkedSkill?: string;
  status: "queued" | "in_progress" | "done" | "blocked";
  nextAction: string;
};

export type LearningInsight = {
  id: string;
  title: string;
  source: "session" | "course" | "practice" | "reading" | "reflection";
  snippet: string;
  linkedTrackId?: string;
  reviewNeeded: boolean;
  createdAt: string;
};

export type WeeklyLearningDay = {
  id: string;
  dayLabel: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  status: "done" | "planned" | "missed" | "rest";
  minutes: number;
};

export type EducationSubpageKind =
  | "scientific-work"
  | "research-ideas"
  | "literature"
  | "research-fields"
  | "research-notes"
  | "master-thesis";

export type EducationSegment =
  | "overview"
  | "ideas"
  | "literature"
  | "questions"
  | "fields";

export type CurrentResearchFocus = {
  idea: ResearchIdea | null;
  field: ResearchField | null;
  literatureItems: LiteratureItem[];
  notes: ResearchNote[];
  openQuestions: ResearchQuestion[];
  reviewedSourceCount: number;
  toReadSourceCount: number;
  literatureProgressLabel: string;
};

export type AcademicRhythmSignal = {
  id: string;
  label: string;
  value: string;
  tone: "blue" | "cyan" | "orange" | "green" | "red" | "muted";
};

export type EducationOverviewStats = {
  activeIdeaCount: number;
  queuedLiteratureCount: number;
  openQuestionCount: number;
  reviewNeededNoteCount: number;
};

export type EducationOverviewViewModel = {
  profileId: EducationProfileId;
  actionsEnabled: boolean;
  contentStates: {
    page: ContentStateMeta;
    summary: ContentStateMeta;
    filters: ContentStateMeta;
    currentResearchFocus: ContentStateMeta;
    researchIdeaPipeline: ContentStateMeta;
    researchFields: ContentStateMeta;
    literatureQueue: ContentStateMeta;
    recentResearchNotes: ContentStateMeta;
  };
  header: {
    eyebrow: string;
    title: string;
    summary: string;
  };
  pageContract: {
    pageType: string;
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
  focus: CurrentResearchFocus;
  stats: EducationOverviewStats;
  ideas: ResearchIdea[];
  fields: ResearchField[];
  literature: LiteratureItem[];
  notes: ResearchNote[];
  questions: ResearchQuestion[];
  rhythm: AcademicRhythmSignal[];
  methodNotes: string[];
  manualWorkspace?: {
    authAvailable: boolean;
    projects: Array<{
      description: string | null;
      id: string;
      logs: import("./education-log").EducationLog[];
      literature: Array<{ body: string | null; id: string; relationId: string; relationType: string; title: string; type: string; url: string | null }>;
      status: string;
      tasks: Array<{ dueAt: string | null; id: string; plannedDate: string | null; status: string; title: string }>;
      title: string;
    }>;
    resources: Array<{ body: string | null; id: string; title: string; type: string; url: string | null }>;
  };
};

export type EducationWorkspaceViewModel = {
  profileId: EducationProfileId;
  actionsEnabled: boolean;
  contentStates: {
    page: ContentStateMeta;
    filters: ContentStateMeta;
    masterThesisFocus: ContentStateMeta;
    researchIdeas: ContentStateMeta;
    researchQuestions: ContentStateMeta;
    researchFields: ContentStateMeta;
    scientificWorkPapers: ContentStateMeta;
    recentResearchNotes: ContentStateMeta;
    literatureQueue: ContentStateMeta;
    extractionFocus: ContentStateMeta;
    highRelevanceSources: ContentStateMeta;
    statusSummary: ContentStateMeta;
  };
  ideas: ResearchIdea[];
  fields: ResearchField[];
  literature: LiteratureItem[];
  notes: ResearchNote[];
  questions: ResearchQuestion[];
  masterThesis: MasterThesisState;
  masterThesisMilestones: MasterThesisMilestone[];
};

export type LearningLogViewModel = {
  profileId: EducationProfileId;
  actionsEnabled: boolean;
  contentStates: {
    page: ContentStateMeta;
    filters: ContentStateMeta;
    currentLearningFocus: ContentStateMeta;
    weeklyRhythm: ContentStateMeta;
    trackSummary: ContentStateMeta;
    activeTracks: ContentStateMeta;
    practiceQueue: ContentStateMeta;
  };
  tracks: LearningTrack[];
  sessions: LearningSession[];
  practiceQueue: PracticeQueueItem[];
  insights: LearningInsight[];
  week: WeeklyLearningDay[];
  methodNotes: string[];
  weeklyGoal: string;
};
