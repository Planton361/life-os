import { expect, it, vi } from "vitest";
import { readWeeklyPlanningContext } from "./weekly-planning-read";
const id = "11000000-0000-4000-8000-000000000001";
it("reads every page with owner scope, no writes, and preserves UNKNOWN when the dependency RPC fails", async () => {
  const eq = vi.fn();
  const order = vi.fn();
  const select = vi.fn();
  const range = vi.fn();
  const from = vi.fn((table: string) => {
    const q = { select, eq, order, range };
    select.mockReturnValue(q);
    eq.mockReturnValue(q);
    order.mockReturnValue(q);
    range.mockImplementation(async (start: number) => ({
      error: null,
      data:
        table === "tasks"
          ? start === 0
            ? Array.from({ length: 500 }, (_, i) => ({
                id: `${i}`,
                user_id: "owner",
                archived_at: null,
              }))
            : [{ id, user_id: "owner", archived_at: null }]
          : [],
    }));
    return q;
  });
  const rpc = vi.fn(async () => ({
    data: null,
    error: { message: "offline" },
  }));
  const result = await readWeeklyPlanningContext(
    { from, rpc } as never,
    "owner",
  );
  expect(result.dependencyUnavailable).toBe(true);
  expect(Object.keys(result.contexts)).toHaveLength(501);
  expect(result.contexts[id].execution).toBe("unknown");
  expect(
    eq.mock.calls.every((args) => args[0] === "user_id" && args[1] === "owner"),
  ).toBe(true);
  expect(range).toHaveBeenCalledWith(500, 999);
  expect(rpc.mock.calls).toEqual([["read_task_dependency_graph"]]);
});
it("context-read failures remain visible without changing known execution truth", async () => {
  const graph = {
    tasks: [
      {
        id,
        title: "Task",
        project_id: null,
        status: "planned",
        completed_at: null,
        archived_at: null,
      },
    ],
    dependencies: [],
  };
  const from = vi.fn((table: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      order: () => q,
      range: async () =>
        table === "tasks"
          ? {
              data: [{ id, title: "Task", user_id: "a", archived_at: null }],
              error: null,
            }
          : { data: null, error: { message: "offline" } },
    };
    return q;
  });
  const r = await readWeeklyPlanningContext(
    { from, rpc: async () => ({ data: graph, error: null }) } as never,
    "a",
  );
  expect(r.contexts[id]).toMatchObject({
    execution: "READY",
    unavailable: true,
    goals: [],
    skills: [],
  });
});
