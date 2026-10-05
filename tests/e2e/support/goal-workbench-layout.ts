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
    const frame = element.querySelector<HTMLElement>(
      "[data-goal-workbench-frame]",
    )!;
    const footer = element.querySelector<HTMLElement>(
      "[data-goal-workbench-footer]",
    )!;
    const rect = (selector: string) => {
      const node = element.querySelector(selector)!;
      const bounds = node.getBoundingClientRect();
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
        height: bounds.height,
      };
    };
    const frameBounds = frame.getBoundingClientRect();
    const footerBounds = footer.getBoundingClientRect();
    const composition = element.closest(".entity-composition") ?? element;
    const compositionBounds = composition.getBoundingClientRect();
    const minHeight = (node: Element) => {
      const value = Number.parseFloat(getComputedStyle(node).minHeight);
      return Number.isFinite(value) ? value : 0;
    };
    const controls = [
      ...element.querySelectorAll("a, button, input, select, textarea"),
    ]
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => node.getBoundingClientRect());
    return {
      // Catch stretched cards even when the macro grid still has the right ratio.
      trailingSpace: [
        "[data-goal-default-surface]",
        "[data-goal-current-workbench]",
        "[data-goal-next-action]",
        "[data-goal-journey]",
        "[data-goal-review-preview]",
      ].map((selector) => {
        const region = element.querySelector(selector)!;
        const children = [...region.children].filter(
          (child) => child.getClientRects().length > 0,
        );
        return (
          region.getBoundingClientRect().bottom -
          Math.max(
            ...children.map((child) => child.getBoundingClientRect().bottom),
          )
        );
      }),
      identity: rect("[data-goal-default-surface]"),
      current: rect("[data-goal-current-workbench]"),
      journey: rect("[data-goal-journey]"),
      review: rect("[data-goal-review-preview]"),
      frame: {
        top: frameBounds.top,
        bottom: frameBounds.bottom,
        height: frameBounds.height,
        minHeight: minHeight(frame),
        bottomInset:
          parseFloat(getComputedStyle(frame).paddingBottom) +
          parseFloat(getComputedStyle(frame).borderBottomWidth),
      },
      composition: {
        top: compositionBounds.top,
        height: compositionBounds.height,
        minHeight: minHeight(composition),
      },
      footer: {
        top: footerBounds.top,
        bottom: footerBounds.bottom,
      },
      canvas: document.querySelector(".life-os-canvas")!.getBoundingClientRect()
        .width,
      gutter: Number.parseFloat(
        getComputedStyle(document.querySelector(".life-os-main")!).paddingTop,
      ),
      shellHeader: document
        .querySelector(".life-os-sidebar")!
        .getBoundingClientRect().height,
      viewport: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
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
  for (const blankSpace of geometry.trailingSpace)
    expect(blankSpace).toBeLessThanOrEqual(20);
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.clippedControls).toBe(0);
  expect(geometry.backgroundImages).toBe(0);
  expect(geometry.current.top).toBeGreaterThan(geometry.identity.bottom);
  expect(geometry.review.top).toBeGreaterThan(geometry.journey.bottom);
  if (geometry.canvas >= 880 && geometry.viewportHeight >= 720) {
    const expectedCompositionMinimum = Math.max(
      0,
      Math.min(
        2160,
        geometry.viewportHeight -
          (geometry.viewport < 1208 ? geometry.shellHeader : 0) -
          2 * geometry.gutter,
      ),
    );
    expect(geometry.composition.height).toBeGreaterThanOrEqual(
      expectedCompositionMinimum - 1,
    );
    const expectedFrameMinimum =
      expectedCompositionMinimum -
      (geometry.frame.top - geometry.composition.top);
    expect(geometry.frame.height).toBeGreaterThanOrEqual(
      expectedFrameMinimum - 1,
    );
    expect(
      geometry.frame.bottom - geometry.footer.bottom,
    ).toBeGreaterThanOrEqual(0);
    expect(geometry.frame.bottom - geometry.footer.bottom).toBeLessThanOrEqual(
      24,
    );
  } else {
    expect(geometry.frame.minHeight).toBe(0);
    expect(geometry.composition.minHeight).toBe(0);
    expect(
      geometry.frame.bottom - geometry.footer.bottom,
    ).toBeGreaterThanOrEqual(0);
    expect(geometry.frame.bottom - geometry.footer.bottom).toBeLessThanOrEqual(
      geometry.frame.bottomInset + 1,
    );
  }
  if (geometry.canvas >= 880) {
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
