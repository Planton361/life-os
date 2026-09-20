import { describe, expect, it, vi } from "vitest";
import {
  addGoalTaskSupport,
  achieveGoal,
  appendGoalCriterionEvaluation,
  createGoalMilestone,
  setGoalMilestoneStatus,
} from "./supabase-goal-outcome-repository";

const userId = "11111111-1111-4111-8111-111111111111";
const goalId = "22222222-2222-4222-8222-222222222222";

type MockQuery = {
  select: (...args: unknown[]) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  is: (...args: unknown[]) => MockQuery;
  insert: (...args: unknown[]) => MockQuery;
  update: (...args: unknown[]) => MockQuery;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  single: () => Promise<{ data: unknown; error: null }>;
};

describe("Goal outcome repository boundaries", () => {
  it("rejects a non-owned Goal before milestone persistence", async () => {
    const tables: string[] = [];
    const filters: Array<[string, unknown]> = [];
    const client = {
      from(table: string) {
        tables.push(table);
        const chain = {
          eq(column: string, value: unknown) {
            filters.push([column, value]);
            return chain;
          },
          is() {
            return chain;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          select() {
            return chain;
          },
        };
        return chain;
      },
    };

    const result = await createGoalMilestone(client as never, {
      goalId,
      profileId: userId,
      sortOrder: 0,
      status: "planned",
      title: "First outcome milestone",
      userId,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(tables).toEqual(["goals"]);
    expect(filters).toContainEqual(["user_id", userId]);
    expect(filters).toContainEqual(["id", goalId]);
  });

  it("translates the database achievement gate into a visible conflict", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "GOAL_ACHIEVEMENT_CRITERIA_NOT_MET" },
    });
    const query = {
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle,
      select: vi.fn(),
      update: vi.fn(),
    };
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.update.mockReturnValue(query);

    const result = await achieveGoal(
      { from: () => query } as never,
      { goalId, note: "Ready", profileId: userId, userId },
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "conflict",
        message: "Alle aktiven Kriterien müssen erfüllt sein.",
      },
    });
    expect(query.eq).toHaveBeenCalledWith("status", "active");
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    maybeSingle.mockResolvedValueOnce({ data: null, error: null } as never);
    const stale = await achieveGoal({ from: () => query } as never, { goalId, profileId: userId, userId });
    expect(stale).toMatchObject({ ok: false, error: { code: "conflict" } });
  });

  it("resolves a project Goal for an inherited-only Task before support insert", async () => {
    const projectId = "33333333-3333-4333-8333-333333333333";
    const milestoneId = "44444444-4444-4444-8444-444444444444";
    let inserted: Record<string, unknown> | undefined;
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        insert: vi.fn((payload: Record<string, unknown>) => {
          inserted = payload;
          return chain;
        }),
        maybeSingle: vi.fn(async () => {
          if (table === "goals") return { data: { id: goalId, status: "active", archived_at: null }, error: null };
          if (table === "goal_milestones") return { data: { id: milestoneId, status: "active", archived_at: null }, error: null };
          if (table === "tasks") return { data: { id: "55555555-5555-4555-8555-555555555555", goal_id: null, project_id: projectId, archived_at: null }, error: null };
          if (table === "projects") return { data: { goal_id: goalId, archived_at: null }, error: null };
          return { data: null, error: null };
        }),
        single: vi.fn(async () => ({ data: { id: "66666666-6666-4666-8666-666666666666" }, error: null })),
      } as unknown as MockQuery;
      return chain;
    });

    const result = await addGoalTaskSupport(
      { from } as never,
      {
        goalId,
        goalMilestoneId: milestoneId,
        profileId: userId,
        taskId: "55555555-5555-4555-8555-555555555555",
        userId,
      },
    );

    expect(result).toMatchObject({ ok: true });
    expect(inserted).toMatchObject({
      goal_id: goalId,
      goal_milestone_id: milestoneId,
      task_id: "55555555-5555-4555-8555-555555555555",
      user_id: userId,
    });
    expect(from).toHaveBeenCalledWith("projects");
  });

  it("writes deferred evaluations as append-only no-decision rows", async () => {
    const criterionId = "77777777-7777-4777-8777-777777777777";
    let inserted: Record<string, unknown> | undefined;
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        insert: vi.fn((payload: Record<string, unknown>) => {
          inserted = payload;
          return chain;
        }),
        maybeSingle: vi.fn(async () => {
          if (table === "goals") return { data: { id: goalId, status: "active", archived_at: null }, error: null };
          if (table === "goal_outcome_criteria") return { data: { id: criterionId, criterion_type: "boolean", unit: null, archived_at: null }, error: null };
          return { data: null, error: null };
        }),
        single: vi.fn(async () => ({
          data: {
            id: "88888888-8888-4888-8888-888888888888",
            user_id: userId,
            criterion_id: criterionId,
            is_deferred: true,
            boolean_value: null,
            numeric_value: null,
            unit: null,
            evaluated_at: "2026-09-21T00:00:00.000Z",
            note: "Later",
            created_at: "2026-09-21T00:00:00.000Z",
          },
          error: null,
        })),
      } as unknown as MockQuery;
      return chain;
    });

    const result = await appendGoalCriterionEvaluation(
      { from } as never,
      {
        criterionId,
        criterionType: "boolean",
        evaluationState: "deferred",
        goalId,
        note: "Later",
        profileId: userId,
        userId,
      },
    );

    expect(result).toMatchObject({ ok: true, data: { deferred: true, booleanValue: null, numericValue: null } });
    expect(inserted).toMatchObject({
      is_deferred: true,
      boolean_value: null,
      numeric_value: null,
      unit: null,
    });
  });

  it("rejects a planned-to-achieved shortcut before persistence", async () => {
    const update = vi.fn();
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        update: vi.fn(() => {
          update();
          return chain;
        }),
        maybeSingle: vi.fn(async () => {
          if (table === "goals") return { data: { id: goalId, status: "active", archived_at: null }, error: null };
          if (table === "goal_milestones") return { data: { id: "99999999-9999-4999-8999-999999999999", status: "planned", archived_at: null }, error: null };
          return { data: null, error: null };
        }),
      } as unknown as MockQuery;
      return chain;
    });

    const result = await setGoalMilestoneStatus(
      { from } as never,
      {
        goalId,
        milestoneId: "99999999-9999-4999-8999-999999999999",
        profileId: userId,
        status: "achieved",
        userId,
      },
    );

    expect(result).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(update).not.toHaveBeenCalled();
  });
});
