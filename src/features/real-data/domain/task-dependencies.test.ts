import { describe, expect, it } from "vitest";
import {
  dependencyCandidates,
  projectDependencySummary,
  taskDependencyContext,
  type TaskDependencyGraph,
} from "./task-dependencies";
const task = (id: string, project_id = "project") => ({
  id,
  title: id,
  project_id,
  status: "planned",
  completed_at: null as string | null,
  archived_at: null as string | null,
});
const edge = (a: string, b: string) => ({
  id: a + b,
  predecessor_task_id: a,
  successor_task_id: b,
});
const graph = (): TaskDependencyGraph => ({
  tasks: [task("A"), task("B"), task("C"), task("D"), task("foreign", "other")],
  dependencies: [
    edge("A", "B"),
    edge("A", "C"),
    edge("B", "D"),
    edge("C", "D"),
  ],
});
const done = (g: TaskDependencyGraph, id: string) =>
  Object.assign(g.tasks.find((t) => t.id === id)!, {
    status: "done",
    completed_at: "2026-09-09T12:00:00Z",
  });
describe("canonical Finish-to-Start availability", () => {
  it("releases parallel branches, waits for every predecessor, and reblocks on reopen", () => {
    const g = graph();
    expect(taskDependencyContext(g, "B").availability).toBe("BLOCKED");
    done(g, "A");
    expect(
      projectDependencySummary(g, "project").ready.map((t) => t.id),
    ).toEqual(["B", "C"]);
    done(g, "B");
    expect(
      taskDependencyContext(g, "D").blockers.map((b) => b.task?.id),
    ).toEqual(["C"]);
    done(g, "C");
    expect(taskDependencyContext(g, "D").availability).toBe("READY");
    Object.assign(g.tasks[0], { status: "planned", completed_at: null });
    expect(taskDependencyContext(g, "B").inconsistentCompletion).toBe(true);
    expect(g.tasks[1].status).toBe("done");
    Object.assign(g.tasks[1], { status: "planned", completed_at: null });
    expect(taskDependencyContext(g, "B").availability).toBe("BLOCKED");
  });
  it("retains unmet archived predecessors, removes edges explicitly and excludes archived/canceled successors", () => {
    const g = graph();
    done(g, "A");
    g.tasks[0].archived_at = "2026-09-09";
    expect(taskDependencyContext(g, "B").availability).toBe("BLOCKED");
    g.tasks[1].archived_at = "2026-09-09";
    g.tasks[2].status = "canceled";
    expect(
      projectDependencySummary(g, "project").blocked.map((t) => t.id),
    ).toEqual(["D"]);
    g.dependencies = [];
    expect(taskDependencyContext(g, "D").availability).toBe("READY");
  });
  it("fails closed for missing endpoints and requires canonical completion timestamp", () => {
    const g = graph();
    g.tasks[0].status = "done";
    expect(taskDependencyContext(g, "B").availability).toBe("BLOCKED");
    g.tasks = g.tasks.filter((t) => t.id !== "A");
    expect(taskDependencyContext(g, "B").availability).toBe("BLOCKED");
  });
  it("offers same-project, nonduplicate, nonself, acyclic disclosure candidates", () => {
    const g = graph();
    expect(dependencyCandidates(g, "A")).toEqual([]);
    expect(dependencyCandidates(g, "B").map((t) => t.id)).toEqual(["C"]);
  });
});
