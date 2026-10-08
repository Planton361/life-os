import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  sourceReviewFixture,
  scope,
} from "../../../../tests/sqlite/source-review-fixture";
import { createSqliteGoalOutcomeRepository } from "@/features/real-data/sqlite/repositories/goal-outcome-repository";
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
