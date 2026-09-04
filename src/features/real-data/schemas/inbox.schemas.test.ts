import { describe, expect, it } from "vitest";
import { triageInboxItemToTaskInputSchema } from "./inbox.schemas";

const taskTriage = {
  inboxItemId: "11111111-1111-4111-8111-111111111111",
  profileId: "22222222-2222-4222-8222-222222222222",
  title: "Atomic Inbox triage",
  userId: "22222222-2222-4222-8222-222222222222",
};

describe("triageInboxItemToTaskInputSchema", () => {
  it("accepts an optional canonical Skill id without a client ownership field", () => {
    expect(
      triageInboxItemToTaskInputSchema.safeParse({
        ...taskTriage,
        skillId: "33333333-3333-4333-8333-333333333333",
      }).data,
    ).toEqual({
      ...taskTriage,
      skillId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("rejects an invalid Skill id before the RPC boundary", () => {
    expect(
      triageInboxItemToTaskInputSchema.safeParse({
        ...taskTriage,
        skillId: "foreign-skill",
      }).success,
    ).toBe(false);
  });
});
