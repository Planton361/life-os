import { expect, it, vi } from "vitest";
import {
  readTaskDependencyGraph,
  readWorkbenchTasks,
  writeTaskDependency,
} from "./task-dependency-repository";
const a = "11000000-0000-4000-8000-000000000001",
  b = "11000000-0000-4000-8000-000000000002",
  p = "11000000-0000-4000-8000-000000000003";
it("validates before writes, scopes owner from authenticated context and reports database cycles", async () => {
  const client = { from: vi.fn(), rpc: vi.fn() };
  expect(
    (
      await writeTaskDependency(client as never, "owner", {
        operation: "add",
        projectId: p,
        taskId: a,
        predecessorId: a,
      })
    ).status,
  ).toBe("error");
  expect(client.from).not.toHaveBeenCalled();
  const single = vi
    .fn()
    .mockResolvedValue({ error: { message: "DEPENDENCY_CYCLE" }, data: null });
  const insert = vi.fn().mockReturnValue({ select: () => ({ single }) });
  client.from.mockReturnValue({ insert });
  expect(
    (
      await writeTaskDependency(client as never, "owner", {
        operation: "add",
        projectId: p,
        taskId: b,
        predecessorId: a,
        userId: "forged",
      })
    ).message,
  ).toContain("Zyklus");
  expect(insert).toHaveBeenCalledWith({
    user_id: "owner",
    project_id: p,
    predecessor_task_id: a,
    successor_task_id: b,
  });
});
it("requires an owned successor edge on removal, does not report invisible edges as removed", async () => {
  const eq = vi.fn();
  const query = {
    eq,
    select: () => ({ single: async () => ({ data: null, error: null }) }),
  };
  eq.mockReturnValue(query);
  const client = { from: () => ({ delete: () => query }) };
  expect(
    (
      await writeTaskDependency(client as never, "owner", {
        operation: "remove",
        taskId: b,
        dependencyId: p,
      })
    ).status,
  ).toBe("error");
  expect(eq.mock.calls).toEqual([
    ["user_id", "owner"],
    ["id", p],
    ["successor_task_id", b],
  ]);
});
it("does not return READY data when canonical graph reads fail", async () => {
  await expect(
    readTaskDependencyGraph({
      rpc: async () => ({ error: { message: "offline" } }),
    } as never),
  ).rejects.toThrow("Dependencies");
  await expect(
    readTaskDependencyGraph({
      rpc: async () => ({ data: { tasks: [], dependencies: [{}] } }),
    } as never),
  ).rejects.toThrow();
});

it("loads linked workbench Tasks beyond the first API page with an owner scope on every read", async () => {
  const eq = vi.fn();
  const order = vi.fn();
  const range = vi
    .fn()
    .mockResolvedValueOnce({
      data: Array.from({ length: 500 }, (_, id) => ({ id: String(id) })),
      error: null,
    })
    .mockResolvedValueOnce({ data: [{ id: "older-blocker" }], error: null });
  const query = { eq, order, range };
  eq.mockReturnValue(query);
  order.mockReturnValue(query);
  const client = { from: () => ({ select: () => query }) };
  const result = await readWorkbenchTasks(client as never, "owner");
  expect(result.data).toHaveLength(501);
  expect(result.data?.at(-1)?.id).toBe("older-blocker");
  expect(eq.mock.calls).toEqual([
    ["user_id", "owner"],
    ["user_id", "owner"],
  ]);
  expect(range.mock.calls).toEqual([
    [0, 499],
    [500, 999],
  ]);
});
