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

// Only client interaction boundaries are stubbed. Native SQLite reads and the
// actual Task Detail parent/action selection run unchanged; this is not E2E.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));
vi.mock("./forms", () => ({
  OperationForm: ({ label }: { label: string }) =>
    createElement("button", null, label),
}));
vi.mock("./task-edit-dialog", () => ({
  TaskEditDialog: () => createElement("button", null, "Bearbeiten"),
}));
vi.mock("./management-disclosure", () => ({
  ManagementDisclosure: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  ManagementDisclosureGroup: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
}));
import { TaskReadView } from "./task-read-view";

it("native SQLite archived parent suppresses Task completion and Edit, including the edit deep link", async () => {
  const f = sourceReviewFixture();
  const created = await f.tasks.createTask({
    ...scope,
    title: "Archived-parent Task",
    projectId: f.project,
    status: "planned",
  });
  if (!created.ok) throw new Error(created.error.message);
  const reads = sqliteApplicationReads(f.store, f.context);
  const render = async () =>
    renderToStaticMarkup(
      createElement(TaskReadView, {
        data: presentationRead(await reads.workbench()),
        taskId: created.data.id,
        dependencies: null,
        milestoneManagement: null,
        relations: null,
        steps: null,
        lifecycle: null,
        editInitiallyOpen: true,
      }),
    );
  const active = await render();
  expect(active).toContain(">Erledigt</button>");
  expect(active).toContain(">Bearbeiten</button>");
  const parent = readSqliteProjectDepth(f.store, f.context, f.project).context;
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
  expect(archived).not.toContain("?edit=1");
  expect(archived).toContain(`/projects/${f.project}`);
});
