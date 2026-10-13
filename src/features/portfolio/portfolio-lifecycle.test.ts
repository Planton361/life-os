import { expect, it } from "vitest";
import { portfolioDisplayStatus, portfolioStatusMeta } from "./portfolio-style";
import type { PortfolioTaskLifecycle, PortfolioEntity } from "./types";

for (const status of [
  "inbox",
  "planned",
  "active",
  "waiting",
  "done",
  "canceled",
  "someday",
] as const) {
  it(`Task ${status} is its actual lifecycle, independent of ranking`, () => {
    expect(
      portfolioDisplayStatus({
        type: "task",
        status: "planned",
        taskLifecycle: { status, durationMinutes: 30 },
      }).label,
    ).toBe(status);
  });
}
for (const type of ["project", "goal", "skill"] as const) {
  it(`${type} retains its own existing status vocabulary`, () => {
    const entity: Pick<PortfolioEntity, "type" | "status" | "taskLifecycle"> = {
      type,
      status: "blocked",
      taskLifecycle: { status: "inbox" } as PortfolioTaskLifecycle,
    };
    expect(portfolioDisplayStatus(entity)).toBe(portfolioStatusMeta.blocked);
  });
}
