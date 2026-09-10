import type { ProjectProjectionSource } from "../real-data/supabase/repositories/project-projection-read";
export const fixtureId = (n: number) =>
  `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Synthetic only, imported by tests; never a Manual fallback.
export function projectionFixture(): ProjectProjectionSource {
  const base = {
    updated_at: "2026-09-10T10:00:00Z",
    archived_at: null,
    area_id: null,
  };
  return {
    project: {
      ...base,
      id: fixtureId(1),
      title: "Life OS",
      description: "Canonical work",
      status: "active",
      priority: "P1",
      goal_id: fixtureId(4),
      next_step: "API bauen",
      target_date: null,
    },
    milestones: [
      {
        updated_at: base.updated_at,
        archived_at: base.archived_at,
        id: fixtureId(2),
        project_id: fixtureId(1),
        title: "Implementation",
        description: "Working integration",
        status: "active",
        sort_order: 0,
        target_date: null,
      },
    ],
    tasks: [3, 8].map((n) => ({
      ...base,
      id: fixtureId(n),
      project_id: fixtureId(1),
      milestone_id: fixtureId(2),
      title: n === 3 ? "API bauen" : "Integration",
      description: "",
      status: "planned",
      priority: "P1",
      goal_id: null,
      completed_at: null,
      due_at: null,
    })),
    goals: [
      {
        ...base,
        id: fixtureId(4),
        title: "Working system",
        description: "Usable work",
        status: "active",
        horizon: null,
        why: "Orientation",
        measure: null,
        target_value: null,
        target_date: null,
      },
    ],
    skills: [
      {
        ...base,
        id: fixtureId(5),
        name: "TypeScript",
        summary: "Typed work",
        status: "active",
        category: null,
      },
    ],
    resources: [
      {
        ...base,
        id: fixtureId(6),
        title: "Repository",
        summary: "Code",
        source: null,
        type: "link",
        url: "https://example.test/repo",
      },
    ],
    dependencies: [
      {
        id: fixtureId(9),
        project_id: fixtureId(1),
        predecessor_task_id: fixtureId(3),
        successor_task_id: fixtureId(8),
      },
    ],
    taskSkills: [
      { id: fixtureId(10), task_id: fixtureId(3), skill_id: fixtureId(5) },
    ],
    relations: (["project", "task", "skill"] as const).map((type, i) => ({
      id: fixtureId(11 + i),
      resource_id: fixtureId(6),
      target_type: type,
      target_id: fixtureId([1, 3, 5][i]),
      project_role: i === 0 ? "primary_artifact" : "reference",
      relation_type: "context",
    })),
    evidence: [
      {
        id: fixtureId(15),
        skill_id: fixtureId(5),
        source_type: "task",
        source_id: fixtureId(3),
        title: "API proof",
        note: "Explicit evidence",
        evidence_date: "2026-09-10",
        updated_at: base.updated_at,
      },
    ],
    areas: [],
  };
}
