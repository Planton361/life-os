import { describe, expect, it } from "vitest";
import {
  createEducationLiteratureInputSchema,
  linkResourceToTargetInputSchema,
} from "./resource.schemas";

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

describe("createEducationLiteratureInputSchema", () => {
  it("requires canonical Education Project and Area identifiers alongside Resource input", () => {
    expect(
      createEducationLiteratureInputSchema.safeParse({
        areaId: resourceId,
        profileId,
        projectId: skillId,
        title: "Atomic literature source",
        type: "research",
        userId: profileId,
      }).success,
    ).toBe(true);
    expect(
      createEducationLiteratureInputSchema.safeParse({
        areaId: resourceId,
        profileId,
        projectId: "not-a-project-id",
        title: "Atomic literature source",
        type: "research",
        userId: profileId,
      }).success,
    ).toBe(false);
  });
});
