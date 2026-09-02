import { describe, expect, it } from "vitest";
import { linkResourceToTargetInputSchema } from "./resource.schemas";

const resourceId = "11111111-1111-4111-8111-111111111111";
const skillId = "22222222-2222-4222-8222-222222222222";
const profileId = "33333333-3333-4333-8333-333333333333";

describe("linkResourceToTargetInputSchema", () => {
  it("accepts an explicit Resource↔Skill context relation", () => {
    expect(
      linkResourceToTargetInputSchema.safeParse({
        profileId,
        relationType: "context",
        resourceId,
        targetId: skillId,
        targetType: "skill",
      }).success,
    ).toBe(true);
  });

  it("rejects non-context Resource↔Skill semantics without blocking existing targets", () => {
    expect(
      linkResourceToTargetInputSchema.safeParse({
        profileId,
        relationType: "evidence",
        resourceId,
        targetId: skillId,
        targetType: "skill",
      }).success,
    ).toBe(false);
    expect(
      linkResourceToTargetInputSchema.safeParse({
        profileId,
        relationType: "related",
        resourceId,
        targetId: skillId,
        targetType: "task",
      }).success,
    ).toBe(true);
  });
});
