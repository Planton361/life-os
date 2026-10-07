import { describe, expect, it } from "vitest";
import { presentationRead } from "./presentation-read";
describe("application presentation boundary", () => {
  it("keeps entity identity and history while omitting nested ownership columns", () => {
    const input = {
      id: "entity",
      user_id: "owner",
      history: [
        {
          profile_id: "owner",
          snapshot: { user_id: "owner", title: "Evidence" },
        },
      ],
    };
    expect(presentationRead(input)).toEqual({
      id: "entity",
      history: [{ snapshot: { title: "Evidence" } }],
    });
    expect(input.history[0].profile_id).toBe("owner");
  });
});
