import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  sourceReviewFixture,
  scope,
} from "../../../../tests/sqlite/source-review-fixture";
import { createSqliteGoalOutcomeRepository } from "@/features/real-data/sqlite/repositories/goal-outcome-repository";
import {
  projectDepthCommand,
  readSqliteProjectDepth,
} from "@/features/real-data/sqlite/repositories/project-depth-repository";
import { sqliteApplicationReads } from "@/features/real-data/runtime/sqlite-read-services";
import { presentationRead } from "@/features/real-data/runtime/presentation-read";

// Native read model + actual Goal composition; browser boundaries are proven
// separately by issue-132-browser-proof.mjs rather than simulated here.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));
vi.mock("./pages", () => ({
  EntityWorkbenchShell: ({ children }: { children: ReactNode }) =>
    createElement("main", null, children),
}));
vi.mock("./forms", () => ({
  fieldClass: "",
  Choice: ({ name }: { name: string }) => createElement("select", { name }),
  OperationForm: ({
    children,
    operation,
  }: {
    children: ReactNode;
    operation: string;
  }) => createElement("form", { "data-operation": operation }, children),
}));
vi.mock("./management-disclosure", () => ({
  ManagementDisclosure: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  ManagementDialog: ({
    children,
    triggerText,
  }: {
    children: ReactNode;
    triggerText: string;
  }) =>
    createElement(
      "div",
      null,
      createElement("button", null, triggerText),
      children,
    ),
}));
vi.mock("./task-edit-dialog", () => ({
  TaskEditDialog: () => createElement("button", null, "Bearbeiten"),
}));
import { GoalOutcomeWorkbench } from "./goal-outcome-workbench";

it("native Goal groups only actual support Tasks, retains a direct Project/Goal Task once, and creates only in Current", async () => {
  const f = sourceReviewFixture();
  const repo = createSqliteGoalOutcomeRepository(f.store, f.context);
  const take = <T>(
    r: { ok: true; data: T } | { ok: false; error: { message: string } },
  ): T => {
    if (!r.ok) throw new Error(r.error.message);
    return r.data;
  };
  try {
    f.store.command(f.context, "synthetic.seed", (db) =>
      db
        .prepare("UPDATE projects SET goal_id=? WHERE id=? AND user_id=?")
        .run(f.goal, f.project, scope.userId),
    );
    const direct = take(
      await f.tasks.createTask({
        ...scope,
        title: "Direct Project and Goal Task",
        goalId: f.goal,
        projectId: f.project,
        status: "planned",
      }),
    );
    const reads = sqliteApplicationReads(f.store, f.context);
    const render = async () => {
      const data = presentationRead(await reads.workbench());
      const outcome = take(
        await repo.getGoalOutcome({
          ...scope,
          goalId: f.goal,
          dependencyGraph: data.dependencyGraph,
        }),
      );
      return renderToStaticMarkup(
        createElement(GoalOutcomeWorkbench, {
          data,
          goalId: f.goal,
          outcome,
          edit: createElement("span", null, "Identity edit"),
        }),
      );
    };
    const flat = await render();
    expect(flat).toContain('aria-label="Direkte Goal Tasks"');
    expect(
      flat.match(new RegExp(`data-goal-task="${direct.id}"`, "g")),
    ).toHaveLength(1);
    expect(flat).not.toContain("data-goal-work-milestone");
    const current = take(
      await repo.createGoalMilestone({
        ...scope,
        goalId: f.goal,
        title: "Current",
        status: "planned",
        sortOrder: 0,
      }),
    );
    const future = take(
      await repo.createGoalMilestone({
        ...scope,
        goalId: f.goal,
        title: "Future",
        status: "planned",
        sortOrder: 1,
      }),
    );
    take(
      await repo.setGoalMilestoneStatus({
        ...scope,
        goalId: f.goal,
        milestoneId: current.id,
        status: "active",
        expectedUpdatedAt: current.updatedAt,
      }),
    );
    const linked = take(
      await repo.createGoalContextTask({
        ...scope,
        goalId: f.goal,
        milestoneId: current.id,
        title: "Actual support Task",
        status: "planned",
      }),
    );
    take(
      await repo.createGoalCriterion({
        ...scope,
        goalId: f.goal,
        title: "Written decision",
        criterionType: "boolean",
      }),
    );
    const grouped = await render();
    expect(grouped).toContain(
      `data-goal-work-milestone="${current.id}" data-current="true"`,
    );
    expect(grouped).toContain(`data-goal-work-milestone="${future.id}"`);
    for (const id of [direct.id, linked.id])
      expect(
        grouped.match(new RegExp(`data-goal-task="${id}"`, "g")),
      ).toHaveLength(1);
    expect(grouped).toContain("Ohne Zwischenziel");
    expect(grouped).toContain("Written decision");
    expect(grouped).not.toContain("data-goal-journey");
    expect(grouped).toContain(`goalMilestone=${current.id}`);
    expect(grouped).not.toContain(`goalMilestone=${future.id}`);
    expect(grouped).toContain('data-goal-primary-task="true"');
    take(
      await repo.createGoalContextTask({
        ...scope,
        goalId: f.goal,
        milestoneId: current.id,
        title: "Another eligible Task",
        status: "planned",
      }),
    );
    expect(await render()).not.toContain('data-goal-primary-task="true"');
    f.store.command(f.context, "synthetic.seed", (db) =>
      db
        .prepare(
          "UPDATE goals SET status='archived',archived_at=life_now() WHERE id=? AND user_id=?",
        )
        .run(f.goal, scope.userId),
    );
    const archived = await render();
    expect(archived).toContain("schreibgeschützt");
    expect(archived).not.toContain('data-operation="milestone.');
    expect(archived).not.toContain('data-operation="criterion.');
    expect(archived).not.toContain('data-operation="support.');
    expect(archived).not.toContain(">+ Task</");
  } finally {
    f.store.close();
  }
});

it("native Goal retains archived-Project Task reads but hides Edit/Calendar without affecting active Tasks", async () => {
  const f = sourceReviewFixture();
  const repo = createSqliteGoalOutcomeRepository(f.store, f.context);
  const take = <T>(
    r: { ok: true; data: T } | { ok: false; error: { message: string } },
  ): T => {
    if (!r.ok) throw new Error(r.error.message);
    return r.data;
  };
  try {
    f.store.command(f.context, "synthetic.seed", (db) =>
      db
        .prepare("UPDATE projects SET goal_id=? WHERE id=? AND user_id=?")
        .run(f.goal, f.project, scope.userId),
    );
    const milestone = take(
      await repo.createGoalMilestone({
        ...scope,
        goalId: f.goal,
        title: "Retained Goal milestone",
        status: "planned",
        sortOrder: 0,
      }),
    );
    take(
      await repo.setGoalMilestoneStatus({
        ...scope,
        goalId: f.goal,
        milestoneId: milestone.id,
        status: "active",
        expectedUpdatedAt: milestone.updatedAt,
      }),
    );
    const parentTask = take(
      await repo.createGoalContextTask({
        ...scope,
        goalId: f.goal,
        milestoneId: milestone.id,
        projectId: f.project,
        title: "Archived parent Task",
        status: "planned",
      }),
    );
    const activeTask = take(
      await f.tasks.createTask({
        ...scope,
        goalId: f.goal,
        title: "Active direct Task",
        status: "planned",
      }),
    );
    take(
      await f.tasks.scheduleTask({
        ...scope,
        taskId: parentTask.id,
        plannedDate: "2026-10-09",
        scheduledStartAt: "2026-10-09T09:00:00Z",
        durationMinutes: 30,
      }),
    );
    const reads = sqliteApplicationReads(f.store, f.context);
    const render = async (signal: "both" | "status" | "timestamp" = "both") => {
      const data = presentationRead(await reads.workbench());
      // Simulate single legacy archive signals in the read projection only;
      // the disposable database keeps its canonical archive state.
      const parent = data.projects.find((project) => project.id === f.project)!;
      if (signal === "status") parent.archived_at = null;
      if (signal === "timestamp") parent.status = "active";
      const outcome = take(
        await repo.getGoalOutcome({
          ...scope,
          goalId: f.goal,
          dependencyGraph: data.dependencyGraph,
        }),
      );
      expect(outcome.goalStatus).toBe("active");
      expect(
        outcome.taskSupport.some((link) => link.targetId === parentTask.id),
      ).toBe(true);
      return renderToStaticMarkup(
        createElement(GoalOutcomeWorkbench, {
          data,
          goalId: f.goal,
          outcome,
          edit: createElement("span", null, "Identity edit"),
        }),
      );
    };
    const row = (html: string, id: string) => {
      const rows = [
        ...html.matchAll(
          new RegExp(
            `<li\\b[^>]*data-goal-task="${id}"[^>]*>[\\s\\S]*?</li>`,
            "g",
          ),
        ),
      ];
      expect(rows).toHaveLength(1);
      expect(
        rows[0][0].match(new RegExp(`href="/tasks/${id}"`, "g")),
      ).toHaveLength(2);
      expect(rows[0][0]).toContain(">Öffnen</a>");
      return rows[0][0];
    };
    const active = await render();
    for (const id of [parentTask.id, activeTask.id]) {
      expect(row(active, id)).toContain(">Bearbeiten</button>");
      expect(row(active, id)).toContain(">Calendar</a>");
    }
    const project = readSqliteProjectDepth(
      f.store,
      f.context,
      f.project,
    ).context;
    projectDepthCommand(f.store, f.context, {
      projectId: f.project,
      commandId: crypto.randomUUID(),
      expectedRevision: project.completion_revision,
      expectedCycle: project.completion_cycle,
      operation: "project.archive",
      payload: {},
    });
    // Canonical archive sets both signals; each individual read signal must also
    // suppress writes, just like Task Detail.
    for (const signal of ["both", "status", "timestamp"] as const) {
      const archived = await render(signal);
      const retained = (await reads.workbench()).tasks.find(
        (task) => task.id === parentTask.id,
      )!;
      expect(retained.status).toBe("planned");
      expect(retained.archived_at).toBeNull();
      const archivedRow = row(archived, parentTask.id);
      expect(archivedRow).toContain("Archived parent Task");
      expect(archivedRow).not.toContain(">Bearbeiten</button>");
      expect(archivedRow).not.toContain(">Calendar</a>");
      expect(archivedRow).not.toContain("/calendar?");
      expect(row(archived, activeTask.id)).toBe(row(active, activeTask.id));
      expect(archived).toContain('data-operation="goal.archive"');
      expect(archived).toContain('data-operation="milestone.create"');
    }
  } finally {
    f.store.close();
  }
});
