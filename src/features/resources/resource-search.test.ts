import { describe, expect, it } from "vitest";
import { searchActiveResources } from "./resource-search";

describe("resource search", () => {
  const resources = [
    {
      summary: "A durable canonical body phrase.",
      title: "K1 Searchable Resource",
      type: "research",
      url: "https://example.test/k1-source",
    },
    {
      archivedAt: "2026-09-03T10:00:00.000Z",
      summary: "The same retired phrase.",
      title: "K1 Archived Resource",
      type: "source",
      url: "https://example.test/retired",
    },
  ];

  it("searches canonical title, body, URL and type fields", () => {
    expect(searchActiveResources(resources, "searchable")).toHaveLength(1);
    expect(searchActiveResources(resources, "body phrase")).toHaveLength(1);
    expect(searchActiveResources(resources, "k1-source")).toHaveLength(1);
    expect(searchActiveResources(resources, "research")).toHaveLength(1);
  });

  it("keeps archived Resources out of active Library and search results", () => {
    expect(searchActiveResources(resources, "")).toHaveLength(1);
    expect(searchActiveResources(resources, "retired")).toHaveLength(0);
  });
});
