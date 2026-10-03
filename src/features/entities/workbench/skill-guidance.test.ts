import { describe, expect, it } from "vitest";
import { skillTaskReadiness, skillWorkAction } from "./skill-guidance";
import type { SkillDevelopmentRead } from "@/features/real-data/domain/skill-development";

const read = {
  skill: { status: "active", archived_at: null },
  targets: [],
  milestones: [],
  practice: [],
  evidence: [],
  reviews: [],
  as_of: "2026-10-03T12:00:00Z",
  timezone: "Europe/Berlin",
} as unknown as SkillDevelopmentRead;
const task = (id: string, status = "planned") => ({
  id,
  title: id,
  status,
  completed_at: null,
  archived_at: null,
  project_id: null,
  goal_id: null,
  linked_at: "2026-10-03",
});
const graph = {
  tasks: [
    { ...task("a"), project_id: null },
    { ...task("b"), project_id: null },
  ],
  dependencies: [
    { id: "edge", predecessor_task_id: "a", successor_task_id: "b" },
  ],
};
describe("Skill work starts from canonical Task dependencies", () => {
  it("keeps Empty, optional focus and explicit planned selection distinct", () => {
    expect(skillWorkAction(read, graph).kind).toBe("focus");
    expect(
      skillWorkAction(
        {
          ...read,
          evidence: [
            { withdrawn_at: null, evidence_date: "2026-10-01" } as never,
          ],
        },
        graph,
      ).kind,
    ).toBe("create");
    expect(
      skillWorkAction(
        {
          ...read,
          targets: [{ status: "planned", archived_at: null } as never],
        },
        graph,
      ).kind,
    ).toBe("planned");
    expect(
      skillWorkAction(
        {
          ...read,
          targets: [{ status: "current", archived_at: null } as never],
        },
        graph,
      ).kind,
    ).toBe("create");
  });
  it("offers one ready Task, free choice for mixed Tasks and all blockers", () => {
    expect(
      skillWorkAction({ ...read, practice: [task("a")] }, graph),
    ).toMatchObject({ kind: "open", taskId: "a" });
    expect(
      skillWorkAction({ ...read, practice: [task("a"), task("b")] }, graph),
    ).toMatchObject({ kind: "choose", taskId: undefined });
    expect(
      skillWorkAction({ ...read, practice: [task("b")] }, graph).kind,
    ).toBe("blocked");
    expect(
      skillWorkAction({ ...read, practice: [task("b"), task("b")] }, graph)
        .kind,
    ).toBe("blocked");
  });
  it("fails closed for unavailable or incomplete dependency reads", () => {
    expect(
      skillWorkAction({ ...read, practice: [task("a")] }, graph, true).kind,
    ).toBe("unavailable");
    expect(
      skillTaskReadiness({ tasks: [], dependencies: [] }, "a").availability,
    ).toBe("UNAVAILABLE");
    expect(
      skillTaskReadiness({ ...graph, tasks: [graph.tasks[1]] }, "b")
        .availability,
    ).toBe("BLOCKED");
  });
  it("prioritizes paused and archived without changing Task readiness", () => {
    expect(
      skillWorkAction(
        {
          ...read,
          skill: { ...read.skill, status: "paused" },
          practice: [task("a")],
        },
        graph,
      ).kind,
    ).toBe("resume");
    expect(
      skillWorkAction(
        {
          ...read,
          skill: { ...read.skill, archived_at: "2026-10-03" },
          practice: [task("a")],
        },
        graph,
      ).kind,
    ).toBe("restore");
    expect(skillTaskReadiness(graph, "a").availability).toBe("READY");
  });
});
