import { describe, expect, it } from "vitest";
import { projectWorkBalance } from "./project-work-balance";
import type { TaskDependencyGraph } from "@/features/real-data/domain/task-dependencies";

const task = (id: string, status = "planned") => ({
  id,
  title: id,
  status,
  project_id: "p",
  archived_at: null,
  completed_at: status === "done" ? "now" : null,
});
describe("B7 recorded Project work", () => {
  it("partitions lifecycle/dependency/source eligibility without inferring Project completion", () => {
    const tasks = [
      task("done", "done"),
      task("ready"),
      task("active", "active"),
      task("blocked"),
      task("missing"),
      task("waiting", "waiting"),
      task("source"),
      task("canceled", "canceled"),
      { ...task("archive"), archived_at: "now" },
      { ...task("foreign"), project_id: "other" },
    ];
    const graph: TaskDependencyGraph = {
      tasks,
      dependencies: [
        {
          id: "one",
          predecessor_task_id: "ready",
          successor_task_id: "blocked",
        },
        {
          id: "two",
          predecessor_task_id: "unavailable",
          successor_task_id: "missing",
        },
        {
          id: "three",
          predecessor_task_id: "done",
          successor_task_id: "active",
        },
      ],
    };
    const b = projectWorkBalance("p", tasks, graph, [{ task_id: "source" }]);
    expect(b.counts).toEqual({ done: 1, ready: 2, blocked: 2, other: 2 });
    expect(b.total).toBe(7);
    expect(b.readyTaskIds).toEqual(["ready", "active"]);
    expect([...b.categories.keys()]).not.toContain("canceled");
    expect(Object.values(b.counts).reduce((a, n) => a + n)).toBe(b.total);
  });
  it("keeps zero work empty and complete recorded work separate from Project state", () => {
    expect(
      projectWorkBalance("p", [], { tasks: [], dependencies: [] }, []).total,
    ).toBe(0);
    const tasks = [task("done", "done")];
    const b = projectWorkBalance("p", tasks, { tasks, dependencies: [] }, []);
    expect(b.counts).toEqual({ done: 1, ready: 0, blocked: 0, other: 0 });
    expect(b.readyTaskIds).toEqual([]);
  });
});
