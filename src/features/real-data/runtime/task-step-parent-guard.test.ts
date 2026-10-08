import { expect, it, vi } from "vitest";
import { writeTaskStep } from "../supabase/repositories/task-step-repository";

it("Supabase rejects all Step writes before mutation when the owned active Project lookup is unavailable", async () => {
  const owner = "11600000-0000-4000-8000-000000000001";
  const taskId = "11600000-0000-4000-8000-000000000002";
  const projectId = "11600000-0000-4000-8000-000000000003";
  const stepId = "11600000-0000-4000-8000-000000000004";
  for (const operation of ["create", "update", "archive"] as const) {
    const query = (data: unknown) => {
      const result = {
        select: vi.fn(),
        eq: vi.fn(),
        is: vi.fn(),
        neq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      };
      for (const method of [result.select, result.eq, result.is, result.neq])
        method.mockReturnValue(result);
      return result;
    };
    const task = query({ id: taskId, project_id: projectId });
    const project = query(null);
    const client = {
      from: vi.fn().mockReturnValueOnce(task).mockReturnValueOnce(project),
    };
    expect(
      await writeTaskStep(client as never, owner, operation, {
        taskId,
        stepId,
        title: "Attempted write",
        position: 0,
        completed: true,
        userId: "forged",
      }),
    ).toBe(false);
    expect(client.from.mock.calls).toEqual([["tasks"], ["projects"]]);
    expect(task.eq.mock.calls).toEqual([
      ["user_id", owner],
      ["id", taskId],
    ]);
    expect(project.eq.mock.calls).toEqual([
      ["user_id", owner],
      ["id", projectId],
    ]);
    expect(project.is).toHaveBeenCalledWith("archived_at", null);
    expect(project.neq).toHaveBeenCalledWith("status", "archived");
  }
});
