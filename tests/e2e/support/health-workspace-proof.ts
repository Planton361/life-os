import { expect, type Page } from "@playwright/test";

/** Assert the default desktop composition, without masking overflow on body. */
export async function assertHealthWorkspace(page: Page) {
  const geometry = await page.evaluate(() => {
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return {
        name: e.querySelector("h2")?.textContent?.trim(),
        x: r.x,
        y: r.y,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    const workspace = document.querySelector(".health-workspace")!;
    const cards = [
      ...workspace.querySelectorAll(
        ":scope > section, :scope > .health-workspace-column > section",
      ),
    ].map(box);
    const primary = [
      ...document.querySelectorAll(
        ".health-detail-page > header, .health-detail-page > nav, .health-summary, .health-workspace h2",
      ),
    ].map(box);
    return {
      bodyHeight: document.documentElement.scrollHeight,
      bodyWidth: document.documentElement.scrollWidth,
      viewportHeight: innerHeight,
      viewportWidth: innerWidth,
      workspace: box(workspace),
      cards,
      primary,
    };
  });
  expect(geometry.bodyHeight, "BODY_SCROLL = NO").toBeLessThanOrEqual(
    geometry.viewportHeight,
  );
  expect(
    geometry.bodyWidth,
    "NO_HORIZONTAL_OVERFLOW = YES",
  ).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(
    geometry.workspace.bottom,
    "Workspace fills available height",
  ).toBeGreaterThanOrEqual(geometry.viewportHeight - 24);
  expect(geometry.cards.length).toBeGreaterThanOrEqual(4);
  expect(
    Math.max(...geometry.cards.map((c) => c.bottom)),
    "NO_UNCOMPOSED_BOTTOM_VOID = YES",
  ).toBeGreaterThanOrEqual(geometry.workspace.bottom - 1);
  for (const item of [...geometry.cards, ...geometry.primary]) {
    expect(item.y, `${item.name}: top visible`).toBeGreaterThanOrEqual(0);
    expect(
      item.bottom,
      `${item.name}: PRIMARY_CONTENT_VISIBLE = YES`,
    ).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(item.right).toBeLessThanOrEqual(geometry.viewportWidth);
  }
  for (let i = 0; i < geometry.cards.length; i++)
    for (let j = i + 1; j < geometry.cards.length; j++) {
      const a = geometry.cards[i],
        b = geometry.cards[j];
      const overlaps =
        Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
      expect(overlaps, `${a.name} / ${b.name}: NO_OVERLAP = YES`).toBe(false);
    }
  return geometry;
}
