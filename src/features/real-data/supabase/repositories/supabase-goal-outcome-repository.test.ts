import { describe, expect, it, vi } from "vitest";
import {
  achieveGoal,
  createGoalMilestone,
} from "./supabase-goal-outcome-repository";

const userId = "11111111-1111-4111-8111-111111111111";
const goalId = "22222222-2222-4222-8222-222222222222";

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
  });
});
