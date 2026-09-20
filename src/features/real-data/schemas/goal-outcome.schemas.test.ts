import { describe, expect, it } from "vitest";
import {
  goalCriterionEvaluationInputSchema,
  goalOutcomeCriterionCreateInputSchema,
} from "./goal-outcome.schemas";

const scope = {
  userId: "00000000-0000-4000-8000-000000000001",
  profileId: "00000000-0000-4000-8000-000000000001",
  goalId: "00000000-0000-4000-8000-000000000002",
};

describe("Goal outcome schemas", () => {
  it("requires the typed numeric shape and accepts zero/negative finite targets", () => {
    expect(
      goalOutcomeCriterionCreateInputSchema.safeParse({
        ...scope,
        title: "Reduce backlog",
        criterionType: "numeric",
        unit: "items",
        target: "-2.5",
        direction: "at_most",
      }).success,
    ).toBe(true);
    expect(
      goalOutcomeCriterionCreateInputSchema.safeParse({
        ...scope,
        title: "Invalid numeric",
        criterionType: "numeric",
        unit: "",
        target: "Infinity",
        direction: "exact",
      }).success,
    ).toBe(false);
  });

  it("rejects numeric fields on boolean criteria", () => {
    expect(
      goalOutcomeCriterionCreateInputSchema.safeParse({
        ...scope,
        title: "Ship decision",
        criterionType: "boolean",
        unit: "done",
        target: "1",
        direction: "exact",
      }).success,
    ).toBe(false);
  });

  it("requires exactly one evaluation value for the chosen criterion type", () => {
    expect(
      goalCriterionEvaluationInputSchema.safeParse({
        ...scope,
        criterionId: "00000000-0000-4000-8000-000000000003",
        criterionType: "boolean",
        booleanValue: true,
      }).success,
    ).toBe(true);
    expect(
      goalCriterionEvaluationInputSchema.safeParse({
        ...scope,
        criterionId: "00000000-0000-4000-8000-000000000003",
        criterionType: "numeric",
        numericValue: "2.25",
        unit: "hours",
      }).success,
    ).toBe(true);
    expect(
      goalCriterionEvaluationInputSchema.safeParse({
        ...scope,
        criterionId: "00000000-0000-4000-8000-000000000003",
        criterionType: "numeric",
        numericValue: "2.25",
      }).success,
    ).toBe(false);
  });
});
