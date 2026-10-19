import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  sourceReviewFixture,
  scope,
} from "../../../../tests/sqlite/source-review-fixture";
import {
  projectDepthCommand,
  readSqliteProjectDepth,
} from "@/features/real-data/sqlite/repositories/project-depth-repository";
import { sqliteApplicationReads } from "@/features/real-data/runtime/sqlite-read-services";
import { presentationRead } from "@/features/real-data/runtime/presentation-read";
import { createSqliteTaskStepRepository } from "@/features/real-data/sqlite/repositories/task-step-repository";
import { createSqliteCanonicalBaseRepository } from "@/features/real-data/sqlite/repositories/canonical-base-repository";

// Only client interaction boundaries are stubbed. Native SQLite reads and the
// actual Task Detail parent/action selection run unchanged; this is not E2E.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));
vi.mock("./forms", () => ({
  fieldClass: "",
  actionClass: "",
  Choice: ({
    options,
    name,
    value,
  }: {
    options: { id: string; title: string }[];
    name: string;
    value?: string;
  }) =>
    createElement(
      "select",
      { name, defaultValue: value },
      createElement("option", { value: "" }, "Keine Auswahl"),
      ...options.map((option) =>
        createElement(
          "option",
          { key: option.id, value: option.id },
          option.title,
        ),
      ),
    ),
  OperationForm: ({
    children,
    label,
    operation,
    disabled,
    checkboxChecked,
  }: {
    children?: ReactNode;
    label: string;
    operation: string;
    disabled?: boolean;
    checkboxChecked?: boolean;
  }) =>
    checkboxChecked === undefined
      ? createElement(
          "div",
          null,
          children,
          createElement(
            "button",
            { "data-operation": operation, disabled },
            label,
          ),
        )
      : createElement("input", {
          type: "checkbox",
          disabled,
          defaultChecked: checkboxChecked,
          "aria-label": label,
        }),
}));
vi.mock("./task-edit-dialog", () => ({
  TaskEditDialog: () => createElement("button", null, "Bearbeiten"),
}));
vi.mock("./task-resource-composer", () => ({
  TaskResourceComposer: ({ type }: { type: "note" | "link" }) =>
    createElement("button", null, type === "note" ? "+ Notiz" : "+ Link"),
}));
vi.mock("./management-disclosure", () => ({
  ManagementDisclosure: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  ManagementDialog: ({
    children,
    label,
    triggerText,
  }: {
    children: ReactNode;
    label: string;
    triggerText?: string;
  }) =>
    createElement(
      "div",
      { "aria-label": label },
      createElement("button", null, triggerText ?? label),
      children,
    ),
  ManagementDialogScope: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  ManagementDialogTrigger: () =>
    createElement("button", null, "Notiz bearbeiten"),
  ManagementDisclosureGroup: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
}));
vi.mock("./task-object-menu", () => ({
  TaskObjectMenu: ({
    children,
    label,
  }: {
    children: ReactNode;
    label: string;
  }) => createElement("div", { "aria-label": label }, children),
}));
import { TaskReadView } from "./task-read-view";
import { TaskSteps } from "./task-steps";
import { TaskMilestoneManagement } from "./project-work";

it("native SQLite archived parent suppresses Task/step management and disables retained checkboxes, including the edit deep link", async () => {
  const f = sourceReviewFixture();
  const created = await f.tasks.createTask({
    ...scope,
    title: "Archived-parent Task",
    projectId: f.project,
    status: "planned",
  });
  if (!created.ok) throw new Error(created.error.message);
  const steps = createSqliteTaskStepRepository(f.store, f.context);
  expect(
    steps.write("create", { taskId: created.data.id, title: "Retained step" }),
  ).toBe(true);
  const reads = sqliteApplicationReads(f.store, f.context);
  const render = async () => {
    const data = presentationRead(await reads.workbench());
    return renderToStaticMarkup(
      createElement(TaskReadView, {
        data,
        taskId: created.data.id,
        dependencies: null,
        milestoneManagement: null,
        relations: createElement("button", null, "Relations write sentinel"),
        steps: createElement(TaskSteps, { id: created.data.id, data }),
        lifecycle: createElement("button", null, "Lifecycle write sentinel"),
        editInitiallyOpen: true,
      }),
    );
  };
  try {
    const active = await render();
    expect(active).toContain(">Erledigt</button>");
    expect(active).toContain(">Bearbeiten</button>");
    expect(active).toContain(">+ Schritt</button>");
    expect(active).toContain(
      'aria-label="Arbeitsschritt verwalten: Retained step"',
    );
    expect(active).toContain('type="checkbox"');
    expect(active).not.toContain('type="checkbox" disabled');
    const parent = readSqliteProjectDepth(
      f.store,
      f.context,
      f.project,
    ).context;
    projectDepthCommand(f.store, f.context, {
      projectId: f.project,
      commandId: crypto.randomUUID(),
      expectedRevision: parent.completion_revision,
      expectedCycle: parent.completion_cycle,
      operation: "project.archive",
      payload: {},
    });
    const retainedTask = (await reads.workbench()).tasks.find(
      (task) => task.id === created.data.id,
    )!;
    expect(retainedTask.archived_at).toBeNull();
    expect(retainedTask.status).toBe("planned");
    expect(retainedTask.project_id).toBe(f.project);
    const archived = await render();
    expect(archived).not.toContain(">Erledigt</button>");
    expect(archived).not.toContain(">Bearbeiten</button>");
    expect(archived).not.toContain("Notiz bearbeiten");
    expect(archived).not.toContain('aria-label="Task-Verwaltung"');
    expect(archived).not.toContain("Relations write sentinel");
    expect(archived).not.toContain("Lifecycle write sentinel");
    expect(archived).not.toContain(">+ Schritt</button>");
    expect(archived).not.toContain('aria-label="Arbeitsschritt verwalten:');
    expect(archived).not.toContain('data-operation="step.');
    expect(archived).toContain('type="checkbox" disabled=""');
    expect(archived).toContain("Retained step");
    expect(archived).not.toContain("?edit=1");
    expect(archived).toContain(`/projects/${f.project}`);
  } finally {
    f.store.close();
  }
});

it("archived Project assignment offers only the existing explicit Milestone release, not new assignments", async () => {
  const f = sourceReviewFixture();
  try {
    const created = await f.tasks.createTask({
      ...scope,
      title: "Assigned Task",
      projectId: f.project,
    });
    if (!created.ok) throw new Error(created.error.message);
    const base = createSqliteCanonicalBaseRepository(f.store, f.context);
    const milestoneId = String(
      base.milestone(scope.userId, {
        projectId: f.project,
        operation: "save",
        title: "Retained milestone",
      }),
    );
    base.milestone(scope.userId, {
      projectId: f.project,
      operation: "assign",
      taskId: created.data.id,
      milestoneId,
    });
    const reads = sqliteApplicationReads(f.store, f.context);
    const render = async () =>
      renderToStaticMarkup(
        createElement(TaskMilestoneManagement, {
          data: presentationRead(await reads.workbench()),
          taskId: created.data.id,
          dialog: true,
        }),
      );
    expect(await render()).toContain(`value="${milestoneId}"`);
    const parent = readSqliteProjectDepth(
      f.store,
      f.context,
      f.project,
    ).context;
    projectDepthCommand(f.store, f.context, {
      projectId: f.project,
      commandId: crypto.randomUUID(),
      expectedRevision: parent.completion_revision,
      expectedCycle: parent.completion_cycle,
      operation: "project.archive",
      payload: {},
    });
    const archived = await render();
    expect(archived).not.toContain(`value="${milestoneId}"`);
    expect(archived).toContain('value=""');
    expect(archived).toContain('data-operation="project.milestone"');
    expect(() =>
      base.milestone(scope.userId, {
        projectId: f.project,
        operation: "assign",
        taskId: created.data.id,
        milestoneId,
      }),
    ).toThrow("PROJECT_UNAVAILABLE");
    base.milestone(scope.userId, {
      projectId: f.project,
      operation: "assign",
      taskId: created.data.id,
      milestoneId: "",
    });
    expect(
      (await reads.workbench()).tasks.find(
        (task) => task.id === created.data.id,
      )?.milestone_id,
    ).toBeNull();
    expect(await render()).toBe("");
  } finally {
    f.store.close();
  }
});
