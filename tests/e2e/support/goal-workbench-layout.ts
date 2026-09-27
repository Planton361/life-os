import { expect, type Page } from "@playwright/test";

export async function expectHybridGoalLayout(page: Page) {
  const root = page.locator('[data-goal-outcome="workbench"]');
  await expect(
    root.getByRole("region", { name: "Aktuelle Arbeit", exact: true }),
  ).toHaveCount(1);
  await expect(
    root.getByRole("region", { name: "Dein Weg zum Ergebnis", exact: true }),
  ).toHaveCount(1);
  await expect(
    root.getByRole("region", { name: "Ziel prüfen", exact: true }),
  ).toHaveCount(1);
  await expect(root.locator("img, blockquote")).toHaveCount(0);
  const geometry = await root.evaluate((element) => {
    const rect = (selector: string) => {
      const node = element.querySelector(selector)!;
      const bounds = node.getBoundingClientRect();
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
      };
    };
    const controls = [
      ...element.querySelectorAll("a, button, input, select, textarea"),
    ]
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => node.getBoundingClientRect());
    return {
      identity: rect("[data-goal-default-surface]"),
      current: rect("[data-goal-current-workbench]"),
      journey: rect("[data-goal-journey]"),
      review: rect("[data-goal-review-preview]"),
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      clippedControls: controls.filter(
        (bounds) =>
          bounds.left < 0 ||
          bounds.right > document.documentElement.clientWidth + 1,
      ).length,
      backgroundImages: [
        ...element.querySelectorAll("section, header, [data-goal-next-action]"),
      ].filter((node) => getComputedStyle(node).backgroundImage !== "none")
        .length,
    };
  });
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.clippedControls).toBe(0);
  expect(geometry.backgroundImages).toBe(0);
  expect(geometry.current.top).toBeGreaterThan(geometry.identity.bottom);
  expect(geometry.review.top).toBeGreaterThan(geometry.journey.bottom);
  if (geometry.viewport >= 1920) {
    const ratio =
      geometry.current.width /
      (geometry.current.width + geometry.journey.width);
    expect(ratio).toBeGreaterThanOrEqual(0.58);
    expect(ratio).toBeLessThanOrEqual(0.64);
    expect(Math.abs(geometry.current.top - geometry.journey.top)).toBeLessThan(
      2,
    );
    expect(geometry.journey.left).toBeGreaterThan(geometry.current.right);
  } else {
    expect(geometry.journey.top).toBeGreaterThan(geometry.current.bottom);
  }
}
