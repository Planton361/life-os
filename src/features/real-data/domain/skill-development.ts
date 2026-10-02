export type DevelopmentTarget = {
  id: string;
  user_id: string;
  skill_id: string;
  title: string;
  description: string | null;
  status: "planned" | "current" | "completed" | "retired";
  cycle: number;
  archived_at: string | null;
  terminal_review_id: string | null;
  created_at: string;
  updated_at: string;
};
export type SkillMilestone = Omit<DevelopmentTarget, "status"> & {
  target_id: string;
  sort_order: number;
  status: "planned" | "current" | "completed";
};
export type DevelopmentEvidence = {
  user_id: string;
  created_at: string;
  updated_at: string;
  id: string;
  skill_id: string;
  title: string;
  note: string | null;
  source_type: "task" | "project" | "goal" | "resource" | "manual_note";
  source_id: string | null;
  evidence_date: string;
  weight: number | null;
  revision: number;
  withdrawn_at: string | null;
  source_snapshot: Record<string, unknown> | null;
  provenance_state: "captured" | "legacy_unverified";
};
export type PracticeTask = {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  archived_at: string | null;
  linked_at: string;
  project_id: string | null;
  goal_id: string | null;
};
export type DevelopmentReview = {
  id: string;
  target_id: string;
  milestone_id: string | null;
  cycle: number;
  decision: string;
  note: string;
  reviewed_at: string;
  subject_snapshot: { title: string; description?: string | null };
  milestones_snapshot: SkillMilestone[];
};
export type SkillDevelopmentRead = {
  skill: {
    user_id: string;
    created_at: string;
    updated_at: string;
    id: string;
    name: string;
    summary: string | null;
    category: string | null;
    level: string | null;
    area_id: string | null;
    status: string;
    archived_at: string | null;
    development_revision: number;
  };
  as_of: string;
  timezone: string;
  targets: DevelopmentTarget[];
  milestones: SkillMilestone[];
  evidence: DevelopmentEvidence[];
  revisions: (Omit<DevelopmentEvidence, "id" | "created_at" | "updated_at"> & {
    evidence_id: string;
    operation: string;
    reason: string | null;
    recorded_at: string;
  })[];
  reviews: DevelopmentReview[];
  review_evidence: {
    review_id: string;
    evidence_id: string;
    evidence_revision: number;
  }[];
  amendments: {
    id: string;
    review_id: string;
    kind: string;
    note: string;
    created_at: string;
  }[];
  practice: PracticeTask[];
};
export function skillPracticeReads(
  tasks: PracticeTask[],
  evidence: DevelopmentEvidence[],
  asOf: string,
  timezone: string,
) {
  const asOfTime = Date.parse(asOf);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(asOf));
  const current = tasks.filter(
    (t) => !t.archived_at && t.status !== "archived",
  );
  const completed = current.filter((t) => t.status === "done");
  const dated = completed
    .filter(
      (t) =>
        t.completed_at &&
        Number.isFinite(Date.parse(t.completed_at)) &&
        Date.parse(t.completed_at) <= asOfTime,
    )
    .sort(
      (a, b) =>
        Date.parse(b.completed_at!) - Date.parse(a.completed_at!) ||
        a.id.localeCompare(b.id),
    );
  const currentEvidence = evidence.filter((e) => !e.withdrawn_at);
  const datedEvidence = currentEvidence
    .filter((e) => e.evidence_date <= today)
    .sort(
      (a, b) =>
        b.evidence_date.localeCompare(a.evidence_date) ||
        a.id.localeCompare(b.id),
    );
  return {
    today,
    current,
    completed,
    open: current.filter((t) => !["done", "canceled"].includes(t.status)),
    canceled: current.filter((t) => t.status === "canceled"),
    currentEvidence,
    latestLinkedTaskCompletionAt: dated[0]?.completed_at ?? null,
    latestEvidenceDate: datedEvidence[0]?.evidence_date ?? null,
  };
}
