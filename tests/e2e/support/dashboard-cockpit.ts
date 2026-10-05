import { expect, type Page } from "@playwright/test";

export const cockpitViewports = [
  { name: "gigabyte", width: 2560, height: 589, deviceScaleFactor: 1 },
  { name: "asus", width: 2560, height: 639, deviceScaleFactor: 1.5 },
  { name: "desktop", width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: "4k", width: 3840, height: 2160, deviceScaleFactor: 1 },
  { name: "mac", width: 769, height: 413, deviceScaleFactor: 2 },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 },
];
const zoneSelectors = [
  ".dashboard-daily",
  ".dashboard-quick",
  ".dashboard-stats",
  ".dashboard-time",
  ".dashboard-mood",
  ".dashboard-agenda",
  ".dashboard-habits",
  ".dashboard-portfolio",
  ".dashboard-weight",
  ".dashboard-nutrients",
  ".dashboard-meals",
  ".dashboard-running",
];

export async function cockpitGeometry(page: Page) {
  return page.evaluate((selectors) => {
    const rect = (e: Element) => {
      const r = e.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        bottom: r.bottom,
        right: r.right,
      };
    };
    const zones = selectors.map((selector) => ({
      selector,
      ...rect(document.querySelector(selector)!),
    }));
    const overlaps = zones.flatMap((a, i) =>
      zones
        .slice(i + 1)
        .filter(
          (b) =>
            Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1,
        )
        .map((b) => `${a.selector}/${b.selector}`),
    );
    const clipped: string[] = [];
    for (const e of document.querySelectorAll<HTMLElement>(
      ".dashboard-composition button,.dashboard-composition a,.dashboard-composition textarea",
    )) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || e.closest("dialog:not([open])")) continue;
      let scrollBody = false;
      for (
        let p = e.parentElement;
        p && !p.classList.contains("dashboard-composition");
        p = p.parentElement
      ) {
        const s = getComputedStyle(p),
          b = p.getBoundingClientRect();
        // A list's offscreen items are reachable through its explicit scroll body.
        if (
          ["auto", "scroll"].includes(s.overflowY) &&
          p.scrollHeight > p.clientHeight
        )
          scrollBody = true;
        if (
          !scrollBody &&
          ["hidden", "clip"].includes(s.overflowY) &&
          (r.top < b.top - 1 || r.bottom > b.bottom + 1)
        )
          clipped.push(`${e.textContent?.trim()}:vertical`);
        if (
          ["hidden", "clip"].includes(s.overflowX) &&
          (r.left < b.left - 1 || r.right > b.right + 1)
        )
          clipped.push(`${e.textContent?.trim()}:horizontal`);
      }
    }
    const primaryControls = [
      ...document.querySelectorAll<HTMLElement>(
        ".daily-control-current button,.daily-control-current a,.dashboard-quick button,.dashboard-meal-list > article > a:last-child",
      ),
    ].map((e) => ({
      label: e.textContent?.trim(),
      height: e.getBoundingClientRect().height,
      font: parseFloat(getComputedStyle(e).fontSize),
    }));
    const scaled = [
      document.querySelector(".dashboard-composition")!,
      ...selectors.map((s) => document.querySelector(s)!),
    ].filter(
      (e) =>
        getComputedStyle(e).zoom !== "1" ||
        getComputedStyle(e).transform !== "none",
    ).length;
    const canvas = document
      .querySelector(".life-os-canvas")!
      .getBoundingClientRect().width;
    return {
      width: innerWidth,
      height: innerHeight,
      canvas,
      documentHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      overflow:
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ) - innerWidth,
      zones,
      primaryControls,
      scaled,
      overlaps,
      clipped,
    };
  }, zoneSelectors);
}
export async function assertCockpit(page: Page) {
  const g = await cockpitGeometry(page);
  expect(g.overflow).toBeLessThanOrEqual(1);
  expect(g.overlaps).toEqual([]);
  expect(g.clipped).toEqual([]);
  expect(g.scaled).toBe(0);
  for (const control of g.primaryControls) {
    expect(control.height, control.label).toBeGreaterThanOrEqual(32);
    expect(control.font, control.label).toBeGreaterThanOrEqual(11);
  }
  if (g.canvas >= 1440) {
    expect(g.documentHeight, JSON.stringify(g)).toBeLessThanOrEqual(
      g.height + 1,
    );
    expect(g.bodyHeight).toBeLessThanOrEqual(g.height + 1);
    for (const z of g.zones) {
      expect(z.y, z.selector).toBeGreaterThanOrEqual(0);
      expect(z.bottom, z.selector).toBeLessThanOrEqual(g.height + 1);
      expect(z.height, z.selector).toBeGreaterThan(40);
    }
    expect(
      await page.locator(".portfolio-slots").evaluate((e) => e.clientHeight),
    ).toBeGreaterThanOrEqual(55);
  } else expect(g.documentHeight).toBeGreaterThan(g.height);
  return g;
}

export function consoleProof(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  return errors;
}
export async function scrollProof(page: Page) {
  for (const selector of [
    ".agenda-body",
    ".portfolio-slots",
    ".habit-slots",
    ".dashboard-meal-list",
  ]) {
    const body = page.locator(selector);
    if (!(await body.count())) continue;
    const bounds = await body.evaluate((e) => ({
      height: e.clientHeight,
      scroll: e.scrollHeight,
      overflow: getComputedStyle(e).overflowY,
    }));
    if (bounds.scroll <= bounds.height + 1 || bounds.overflow !== "auto")
      continue;
    await body.evaluate((e) => (e.scrollTop = 0));
    await body.focus();
    await expect(body).toBeFocused();
    await page.keyboard.press("End");
    await expect
      .poll(() => body.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(0);
    await page.keyboard.press("Shift+Tab");
    await expect(body).not.toBeFocused();
    await body.evaluate((e) => (e.scrollTop = 0));
    const box = (await body.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 240);
    await expect
      .poll(() => body.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(0);
    if ((await cockpitGeometry(page)).canvas >= 1440)
      expect(await page.evaluate(() => scrollY)).toBe(0);
  }
}
