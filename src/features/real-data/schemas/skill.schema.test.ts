import { describe, expect, it } from "vitest";
import { taskSkillLinkInputSchema } from "./skill.schema";

describe("taskSkillLinkInputSchema", () => {
  it("accepts exactly one Task and one Skill UUID", () => {
    expect(
      taskSkillLinkInputSchema.safeParse({
        skillId: "22222222-2222-4222-8222-222222222222",
        taskId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed endpoints and strips client ownership fields", () => {
    expect(
      taskSkillLinkInputSchema.safeParse({ skillId: "foreign", taskId: "task" })
        .success,
    ).toBe(false);
    expect(
      taskSkillLinkInputSchema.safeParse({
        skillId: "22222222-2222-4222-8222-222222222222",
        taskId: "11111111-1111-4111-8111-111111111111",
        userId: "33333333-3333-4333-8333-333333333333",
      }).data,
    ).toEqual({
      skillId: "22222222-2222-4222-8222-222222222222",
      taskId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
