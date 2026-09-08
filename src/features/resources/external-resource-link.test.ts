import { describe, expect, it } from "vitest";
import { externalResourceHref } from "./external-resource-link";

describe("external Resource opening", () => {
  it("opens HTTP(S) references without fetching or changing their path", () => {
    expect(
      externalResourceHref("https://example.org/thesis.pdf?q=1#page=2"),
    ).toBe("https://example.org/thesis.pdf?q=1#page=2");
    expect(externalResourceHref("http://localhost:8080/document")).toBe(
      "http://localhost:8080/document",
    );
  });
  it.each([
    null,
    undefined,
    "",
    "not a URL",
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///private/document.pdf",
  ])("does not expose unsafe/non-web reference %s as an action", (value) => {
    expect(externalResourceHref(value)).toBeNull();
  });
});
