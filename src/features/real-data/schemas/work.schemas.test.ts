import { describe, expect, it } from "vitest";

import { createWorkWikiInputSchema } from "./work.schemas";

describe("createWorkWikiInputSchema", () => {
  it("accepts the existing optional Work Project but rejects a malformed target", () => {
    expect(
      createWorkWikiInputSchema.safeParse({
        body: "Canonical work context.",
        projectId: "11111111-1111-4111-8111-111111111111",
        title: "Atomic work wiki",
      }).success,
    ).toBe(true);
    expect(
      createWorkWikiInputSchema.safeParse({
        body: "Canonical work context.",
        projectId: "not-a-project-id",
        title: "Atomic work wiki",
      }).success,
    ).toBe(false);
  });
});
