import { describe, expect, it } from "vitest";
import { inboxItemDisplayTitle } from "./inbox";

// #192: the untitled preview comes from the immutable original capture.
describe("inboxItemDisplayTitle", () => {
  it("uses the user's Clean Title when one exists", () => {
    expect(
      inboxItemDisplayTitle({
        title: "Wochenplanung klären",
        body: "edited",
        originalBody: "original",
      }),
    ).toBe("Wochenplanung klären");
  });
  it("previews the original capture, not the edited description", () => {
    expect(
      inboxItemDisplayTitle({
        title: null,
        body: "Bearbeitete Beschreibung",
        originalBody: "Ursprünglicher   Gedanke\nmit Umbruch",
      }),
    ).toBe("Ursprünglicher Gedanke mit Umbruch");
  });
  it("falls back to body for rows without an original snapshot", () => {
    for (const originalBody of [undefined, null, "  "])
      expect(
        inboxItemDisplayTitle({ title: null, body: "Demo text", originalBody }),
      ).toBe("Demo text");
  });
  it("truncates long previews and never returns an empty label", () => {
    const preview = inboxItemDisplayTitle({
      title: null,
      body: null,
      originalBody: "wort ".repeat(40),
    });
    expect(preview.length).toBeLessThanOrEqual(80);
    expect(preview.endsWith("…")).toBe(true);
    expect(inboxItemDisplayTitle({ title: null, body: null })).toBe(
      "Ohne Titel",
    );
  });
});
