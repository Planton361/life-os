import { describe, expect, it } from "vitest";
import {
  createPortfolioHref,
  readPortfolioView,
  normalizePortfolioView,
  normalizePortfolioScopeFilter,
  normalizePortfolioSortMode,
} from "./portfolio-routing";

describe("Portfolio URL state", () => {
  it.each(["tasks", "projects", "goals", "skills"] as const)(
    "switches to %s without an old view or selection",
    (type) => {
      const href = createPortfolioHref(
        { type, view: null, selected: null },
        "view=goals&selected=old&scope=in_progress&sort=recent",
      );
      const url = new URL(href, "http://localhost");
      expect(url.pathname).toBe("/portfolio");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        type,
        scope: "in_progress",
        sort: "recent",
      });
    },
  );
  it("returns to All while retaining independent scope and sort", () => {
    expect(
      createPortfolioHref(
        { type: null, view: null, selected: null },
        "type=tasks&selected=old&sort=deadline",
      ),
    ).toBe("/portfolio?sort=deadline");
  });
  it("normalizes invalid filters without inventing state", () => {
    expect(normalizePortfolioView("resources")).toBe("all");
    expect(normalizePortfolioScopeFilter("tasks")).toBe("all");
    expect(normalizePortfolioSortMode("tasks")).toBe("priority");
  });
  it("shares canonical type precedence and legacy aliases across sidebar and tabs", () => {
    expect(readPortfolioView(new URLSearchParams("view=goals"))).toBe("goals");
    expect(
      readPortfolioView(new URLSearchParams("type=tasks&view=goals")),
    ).toBe("tasks");
    expect(readPortfolioView(new URLSearchParams("type=unknown"))).toBe("all");
  });
  it("selection changes preserve the filter", () => {
    expect(
      createPortfolioHref({ selected: "stable-id" }, "type=projects"),
    ).toBe("/portfolio?type=projects&selected=stable-id");
  });
});
