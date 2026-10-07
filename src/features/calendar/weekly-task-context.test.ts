import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyTaskContextPanel } from "./components/weekly-task-context";
import { describe, expect, it } from "vitest";
import {
  buildWeeklyTaskContexts,
  enrichPlannerQueue,
  weeklyOrientation,
  type WeeklyContextSources,
} from "./weekly-task-context";
import type { PlannerQueueItem } from "./calendar-types";
import type { TaskDependencyGraph } from "../real-data/domain/task-dependencies";
function sources(): WeeklyContextSources {
  const owned = { user_id: "a", archived_at: null };
  return {
    tasks: [
      {
        ...owned,
        id: "mixed",
        title: "Work",
        project_id: "p",
        goal_id: "g1",
        milestone_id: "assigned",
      },
      { ...owned, id: "via", project_id: "p", goal_id: null },
      { ...owned, id: "same", project_id: "p", goal_id: "g2" },
      { ...owned, id: "direct", project_id: null, goal_id: "g1" },
      { ...owned, id: "empty", project_id: null, goal_id: null },
      { ...owned, id: "foreign-edge", project_id: "foreign", goal_id: null },
      { ...owned, id: "blocked" },
      { ...owned, id: "unknown" },
      { ...owned, id: "secret-task", user_id: "b" },
    ],
    projects: [
      {
        ...owned,
        id: "p",
        title: "Project",
        desired_result: "Result",
        goal_id: "g2",
      },
      { ...owned, id: "foreign", user_id: "b", title: "Secret" },
    ],
    goals: [
      {
        ...owned,
        id: "g1",
        title: "Direct",
        description: "Outcome",
        why: "Why",
      },
      { ...owned, id: "g2", title: "Inherited" },
    ],
    projectMilestones: [
      {
        ...owned,
        id: "assigned",
        project_id: "p",
        title: "Assigned",
        status: "open",
      },
      {
        ...owned,
        id: "focus",
        project_id: "p",
        title: "Current",
        status: "active",
      },
    ],
    goalMilestones: [
      {
        ...owned,
        id: "gs1",
        goal_id: "g1",
        title: "Task support",
        status: "planned",
      },
      {
        ...owned,
        id: "gs2",
        goal_id: "g2",
        title: "Project support",
        status: "active",
      },
    ],
    taskSupport: [
      { ...owned, task_id: "mixed", goal_id: "g1", goal_milestone_id: "gs1" },
    ],
    projectSupport: [
      { ...owned, project_id: "p", goal_id: "g2", goal_milestone_id: "gs2" },
    ],
    skills: [
      { ...owned, id: "s1", name: "First" },
      { ...owned, id: "s2", name: "Second" },
      { ...owned, id: "secret", user_id: "b", name: "Secret skill" },
    ],
    taskSkills: [
      { ...owned, id: "l1", task_id: "mixed", skill_id: "s1", created_at: "1" },
      { ...owned, id: "l2", task_id: "mixed", skill_id: "s2", created_at: "2" },
      {
        ...owned,
        id: "l3",
        task_id: "mixed",
        skill_id: "secret",
        created_at: "3",
      },
    ],
    targets: [
      {
        ...owned,
        id: "target",
        skill_id: "s1",
        title: "Focus",
        status: "current",
      },
      {
        ...owned,
        id: "planned",
        skill_id: "s2",
        title: "Future",
        status: "planned",
      },
    ],
    targetUnavailable: [],
  } as unknown as WeeklyContextSources;
}
function graph(): TaskDependencyGraph {
  return {
    tasks: sources()
      .tasks.filter((t) => t.id !== "unknown")
      .map((t) => ({
        id: t.id,
        title: t.title ?? t.id,
        project_id: t.project_id ?? null,
        status: "active",
        archived_at: null,
        completed_at: null,
      })),
    dependencies: [
      {
        id: "edge",
        predecessor_task_id: "empty",
        successor_task_id: "blocked",
      },
    ],
  };
}
describe("weekly orientation context", () => {
  it("projects stage summaries without canonical owner or internal row fields", () => {
    const contexts = buildWeeklyTaskContexts("a", sources(), graph());
    for (const context of Object.values(contexts)) {
      const stages = [context.project?.assigned, context.project?.current,
        ...context.goals.flatMap(goal => [goal.current, ...goal.support.map(support => support.stage)]),
        ...context.skills.map(skill => skill.currentTarget)].filter(Boolean);
      for (const stage of stages)
        expect(Object.keys(stage!).sort()).toEqual(["description", "id", "title"]);
    }
  });
  it("keeps direct/via/redundant/conflicting goal paths explicit", () => {
    const c = buildWeeklyTaskContexts("a", sources(), graph());
    expect(c.direct.goals.map((g) => g.path)).toEqual(["direct"]);
    expect(c.via.goals.map((g) => g.path)).toEqual(["via_project"]);
    expect(c.same.goals.map((g) => g.path)).toEqual(["redundant"]);
    expect(c.mixed.goalConflict).toBe(true);
    expect(c.mixed.goals.map((g) => g.path)).toEqual(["direct", "via_project"]);
    expect(c.mixed.project).toMatchObject({
      result: "Result",
      assigned: { id: "assigned" },
      current: { id: "focus" },
    });
    expect(c.mixed.goals[0].support).toMatchObject([
      { path: "task", stage: { id: "gs1" } },
    ]);
    expect(c.mixed.goals[1]).toMatchObject({
      current: { id: "gs2" },
      support: [{ path: "project" }],
    });
    expect(c.empty.goals).toEqual([]);
  });
  it("reads multiple explicit Skills with 0/1 current target, never a project/skill or task/target relation", () => {
    const c = buildWeeklyTaskContexts("a", sources(), graph());
    expect(c.mixed.skills.map((s) => [s.id, s.currentTarget?.id])).toEqual([
      ["s1", "target"],
      ["s2", undefined],
    ]);
    expect(c.via.skills).toEqual([]);
    expect(weeklyOrientation(c.mixed)).toBe("Project · Project · +4");
    expect(weeklyOrientation(c.direct)).toBe("Goal · Direct");
    expect(weeklyOrientation(c.empty)).toBeUndefined();
  });
  it("fails closed on missing graph/task/endpoint; owner filtering and active semantics prevent context leaks", () => {
    const c = buildWeeklyTaskContexts("a", sources(), graph());
    expect(c.blocked).toMatchObject({
      execution: "BLOCKED",
      blockers: [{ id: "empty" }],
    });
    expect(c.unknown.execution).toBe("unknown");
    expect(buildWeeklyTaskContexts("a", sources(), null).empty.execution).toBe(
      "unknown",
    );
    expect(c["secret-task"]).toBeUndefined();
    expect(c["foreign-edge"].project).toBeUndefined();
    expect(JSON.stringify(c)).not.toContain("Secret");
    const s = sources();
    s.projectMilestones[0].archived_at = "now";
    s.skills[0].archived_at = "now";
    const active = buildWeeklyTaskContexts("a", s, graph());
    expect(active.mixed.project?.assigned).toBeUndefined();
    expect(active.mixed.skills).toHaveLength(1);
  });
  it("enrichment adds/removes/reorders zero tasks and never changes ranking metadata or the input", () => {
    const c = buildWeeklyTaskContexts("a", sources(), graph());
    const queue = ["empty", "mixed", "direct"].map((id) => ({
      id,
      title: id,
      rankingGroup: "backlog",
      rankingReason: "Backlog",
      skills: [],
    })) as unknown as PlannerQueueItem[];
    const before = JSON.stringify(queue);
    const enriched = enrichPlannerQueue(queue, c);
    expect(enriched.map((i) => i.id)).toEqual(queue.map((i) => i.id));
    expect(enriched.map((i) => i.rankingGroup)).toEqual(
      queue.map((i) => i.rankingGroup),
    );
    expect(enriched.map((i) => i.rankingReason)).toEqual(
      queue.map((i) => i.rankingReason),
    );
    expect(JSON.stringify(queue)).toBe(before);
    c.mixed.unavailable = true;
    expect(enrichPlannerQueue(queue, c).map((i) => i.id)).toEqual(
      queue.map((i) => i.id),
    );
  });
});

it("renders dependency failures visibly instead of READY or empty, independently of orientation", () => {
  const c = buildWeeklyTaskContexts("a", sources(), null).mixed;
  const markup = renderToStaticMarkup(
    createElement(WeeklyTaskContextPanel, { context: c }),
  );
  expect(markup).toContain("Ausführbarkeit derzeit nicht verfügbar");
  expect(markup).toContain('role="alert"');
  expect(markup).not.toContain("READY");
  expect(markup).toContain("Zusammenhang");
  c.unavailable = true;
  const unavailable = renderToStaticMarkup(
    createElement(WeeklyTaskContextPanel, { context: c }),
  );
  expect(unavailable).toContain("Zusammenhang derzeit nicht verfügbar.");
  expect(unavailable).not.toContain("Kein verknüpfter");
});
