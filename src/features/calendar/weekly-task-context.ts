import {
  taskDependencyContext,
  type TaskDependencyGraph,
} from "../real-data/domain/task-dependencies";
import type { TableRow } from "../real-data/supabase/database.types";
import type { DevelopmentTarget } from "../real-data/domain/skill-development";
import type { PlannerQueueItem } from "./calendar-types";

type Stage = { id: string; title: string; description: string | null };
type GoalContext = {
  id: string;
  title: string;
  description: string | null;
  why: string | null;
  path: "direct" | "via_project" | "redundant";
  current?: Stage;
  support: { stage: Stage; path: "task" | "project" }[];
};
export type WeeklyTaskContext = {
  id: string;
  title: string;
  execution: "READY" | "BLOCKED" | "unknown";
  blockers: { id?: string; title: string }[];
  unavailable?: boolean;
  project?: {
    id: string;
    title: string;
    result: string | null;
    assigned?: Stage;
    current?: Stage;
  };
  goals: GoalContext[];
  goalConflict: boolean;
  skills: {
    id: string;
    title: string;
    currentTarget?: Stage;
    targetUnavailable?: boolean;
  }[];
};
export type WeeklyContextSources = {
  tasks: TableRow<"tasks">[];
  projects: TableRow<"projects">[];
  goals: TableRow<"goals">[];
  projectMilestones: TableRow<"project_milestones">[];
  goalMilestones: TableRow<"goal_milestones">[];
  taskSupport: TableRow<"goal_milestone_task_support">[];
  projectSupport: TableRow<"goal_milestone_project_support">[];
  skills: TableRow<"skills">[];
  taskSkills: TableRow<"task_skill_links">[];
  targets: DevelopmentTarget[];
  targetUnavailable: string[];
};

/** Same-user, active canonical edges only. No scheduling or ranking decisions. */
export function buildWeeklyTaskContexts(
  userId: string,
  sources: WeeklyContextSources,
  graph: TaskDependencyGraph | null,
): Record<string, WeeklyTaskContext> {
  const owned = <T extends { user_id: string }>(rows: T[]) =>
    rows.filter((r) => r.user_id === userId);
  const active = <T extends { user_id: string; archived_at: string | null }>(
    rows: T[],
  ) => owned(rows).filter((r) => !r.archived_at);
  const projects = active(sources.projects);
  const goals = active(sources.goals);
  const projectStages = active(sources.projectMilestones);
  const goalStages = active(sources.goalMilestones);
  const skills = active(sources.skills);
  const graphIds = new Set(graph?.tasks.map((t) => t.id));
  return Object.fromEntries(
    active(sources.tasks).map((task) => {
      const project = projects.find((p) => p.id === task.project_id);
      const direct = goals.find((g) => g.id === task.goal_id);
      const inherited = goals.find((g) => g.id === project?.goal_id);
      const dependency =
        graph && graphIds.has(task.id)
          ? taskDependencyContext(graph, task.id)
          : null;
      const context: WeeklyTaskContext = {
        id: task.id,
        title: task.title,
        execution: dependency?.availability ?? "unknown",
        blockers:
          dependency?.blockers.map((b) => ({
            id: b.task?.id,
            title: b.task?.title ?? "Vorgänger nicht verfügbar",
          })) ?? [],
        project: project
          ? {
              id: project.id,
              title: project.title,
              result: project.desired_result,
              assigned: projectStages.find(
                (m) =>
                  m.project_id === project.id && m.id === task.milestone_id,
              ),
              current: projectStages.find(
                (m) => m.project_id === project.id && m.status === "active",
              ),
            }
          : undefined,
        goals: [direct, inherited]
          .filter(
            (g, i, all): g is NonNullable<typeof g> =>
              Boolean(g) &&
              all.findIndex((candidate) => candidate?.id === g?.id) === i,
          )
          .map((goal) => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            why: goal.why,
            path:
              direct?.id === goal.id
                ? inherited?.id === goal.id
                  ? "redundant"
                  : "direct"
                : "via_project",
            current: goalStages.find(
              (m) => m.goal_id === goal.id && m.status === "active",
            ),
            support: [
              ...owned(sources.taskSupport)
                .filter((s) => s.task_id === task.id && s.goal_id === goal.id)
                .map((s) => ({
                  id: s.goal_milestone_id,
                  path: "task" as const,
                })),
              ...owned(sources.projectSupport)
                .filter(
                  (s) => s.project_id === project?.id && s.goal_id === goal.id,
                )
                .map((s) => ({
                  id: s.goal_milestone_id,
                  path: "project" as const,
                })),
            ].flatMap((s) => {
              const stage = goalStages.find(
                (m) => m.id === s.id && m.goal_id === goal.id,
              );
              return stage ? [{ stage, path: s.path }] : [];
            }),
          })),
        goalConflict: Boolean(
          direct && inherited && direct.id !== inherited.id,
        ),
        skills: owned(sources.taskSkills)
          .filter((l) => l.task_id === task.id)
          .sort(
            (a, b) =>
              a.created_at.localeCompare(b.created_at) ||
              a.id.localeCompare(b.id),
          )
          .flatMap((link) => {
            const skill = skills.find((s) => s.id === link.skill_id);
            return skill
              ? [
                  {
                    id: skill.id,
                    title: skill.name,
                    currentTarget: active(sources.targets).find(
                      (t) => t.skill_id === skill.id && t.status === "current",
                    ),
                    targetUnavailable: sources.targetUnavailable.includes(
                      skill.id,
                    ),
                  },
                ]
              : [];
          }),
      };
      return [task.id, context];
    }),
  );
}

/** Enrichment is a map over the already eligible, ranked, limited queue. */
export function enrichPlannerQueue(
  queue: readonly PlannerQueueItem[],
  contexts: Record<string, WeeklyTaskContext>,
): PlannerQueueItem[] {
  return queue.map((item) => {
    const context = contexts[item.id];
    if (!context || context.unavailable)
      return {
        ...item,
        contextUnavailable: true,
        orientation: undefined,
        project: undefined,
        goal: undefined,
        skills: [],
      };
    const goal = context.goals[0];
    return {
      ...item,
      contextUnavailable: false,
      orientation: weeklyOrientation(context),
      project: context.project,
      goal: goal
        ? {
            id: goal.id,
            title: goal.title,
            alignment: context.goalConflict ? "conflict" : goal.path,
          }
        : undefined,
      skills: context.skills,
    };
  });
}

export function weeklyOrientation(
  context: Pick<WeeklyTaskContext, "project" | "goals" | "skills">,
) {
  const titles = [
    context.project ? `Project · ${context.project.title}` : undefined,
    ...context.goals.map((g) => `Goal · ${g.title}`),
    ...context.skills.map((s) => `Skill · ${s.title}`),
  ].filter(Boolean);
  return titles.length
    ? `${titles[0]}${titles.length > 1 ? ` · +${titles.length - 1}` : ""}`
    : undefined;
}
