import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "mac", width: 769, height: 413, deviceScaleFactor: 2 },
  { name: "gigabyte", width: 2560, height: 589, deviceScaleFactor: 1 },
  { name: "asus", width: 2560, height: 639, deviceScaleFactor: 1.5 },
  { name: "desktop", width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 },
  { name: "4k", width: 3840, height: 2160, deviceScaleFactor: 1 },
];

async function geometry(page: Page) {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        ".dashboard-daily,.dashboard-quick,.dashboard-signals,.dashboard-stats,.dashboard-agenda,.dashboard-priority,.dashboard-supporting",
      ),
    ];
    const bounds = nodes.map((node) => {
      const b = node.getBoundingClientRect();
      return {
        name: node.classList[0],
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      };
    });
    return {
      overflow:
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ) - innerWidth,
      fill: getComputedStyle(document.querySelector(".dashboard-composition")!)
        .getPropertyValue("--composition-fill")
        .trim(),
      frameHeight: document
        .querySelector(".dashboard-composition")!
        .getBoundingClientRect().height,
      canvasHeight: document
        .querySelector(".life-os-canvas")!
        .getBoundingClientRect().height,
      canvas: document.querySelector(".life-os-canvas")!.getBoundingClientRect()
        .width,
      bounds,
      overlaps: bounds.flatMap((a, i) =>
        bounds
          .slice(i + 1)
          .filter(
            (b) =>
              Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
              Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1,
          )
          .map((b) => `${a.name}/${b.name}`),
      ),
    };
  });
}

async function assertControlsFit(page: Page) {
  const clipped = await page
    .locator("#main-content button, #main-content textarea, #main-content a")
    .evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const b = node.getBoundingClientRect();
        if (
          !b.width ||
          !b.height ||
          node.closest("dialog:not([open]), [hidden]")
        )
          return [];
        const problems: string[] = [];
        let scrollBody = false;
        for (
          let parent = node.parentElement;
          parent && parent.id !== "main-content";
          parent = parent.parentElement
        ) {
          const style = getComputedStyle(parent);
          const p = parent.getBoundingClientRect();
          // #112 permits bounded list bodies; their offscreen items remain reachable.
          if (
            ["auto", "scroll"].includes(style.overflowY) &&
            parent.scrollHeight > parent.clientHeight
          )
            scrollBody = true;
          if (
            ["hidden", "clip"].includes(style.overflowX) &&
            (b.left < p.left - 1 || b.right > p.right + 1)
          )
            problems.push("x");
          if (
            !scrollBody &&
            ["hidden", "clip"].includes(style.overflowY) &&
            (b.top < p.top - 1 || b.bottom > p.bottom + 1)
          )
            problems.push("y");
        }
        return problems.length
          ? [
              `${node.getAttribute("aria-label") ?? node.textContent}: ${problems}`,
            ]
          : [];
      }),
    );
  expect(clipped, "controls must fit their clipping ancestors").toEqual([]);
}

for (const viewport of viewports) {
  for (const profile of ["empty", "demo"] as const) {
    test(`#110 ${profile} Dashboard ${viewport.name}`, async ({
      browser,
    }, info) => {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" || /hydration/i.test(m.text()))
          errors.push(m.text());
      });
      await context.addCookies([
        {
          name: "life_os_profile",
          value: profile,
          url: info.project.use.baseURL!,
        },
      ]);
      await page.goto("/dashboard");
      await expect(
        page.locator('.life-os-sidebar a[aria-current="page"]').first(),
      ).toBeAttached();
      await expect(page.locator(".dashboard-daily")).toBeVisible();
      await expect(page.locator(".dashboard-daily")).toHaveAttribute(
        "data-profile-id",
        profile,
      );
      const layout = await geometry(page);
      expect(layout.overflow).toBeLessThanOrEqual(1);
      expect(layout.overlaps).toEqual([]);
      if (
        (viewport.height < 720 && layout.canvas < 1440) ||
        layout.canvas < 880
      )
        expect(layout.fill).toBe("0");
      else {
        expect(layout.fill).toBe("1");
        expect(layout.frameHeight).toBeGreaterThanOrEqual(
          layout.canvasHeight - 1,
        );
      }
      const card = (name: string) =>
        layout.bounds.find((b) => b.name === name)!;
      if (layout.canvas < 880) {
        expect(card("dashboard-agenda").y).toBeGreaterThan(
          card("dashboard-daily").y,
        );
        expect(card("dashboard-quick").y).toBeGreaterThan(
          card("dashboard-agenda").y,
        );
        await page.getByRole("button", { name: "Menü", exact: true }).click();
        await expect(
          page.getByRole("navigation", { name: "Hauptnavigation" }),
        ).toBeVisible();
        const portfolioNavigation = page
          .getByRole("navigation", { name: "Hauptnavigation" })
          .getByRole("link", { name: "Portfolio", exact: true });
        await portfolioNavigation.focus();
        await portfolioNavigation.press("ArrowRight");
        const flyout = page.locator('[aria-label="Portfolio Unterseiten"]');
        await expect(flyout).toBeVisible();
        expect(
          await flyout.evaluate((e) => e.getBoundingClientRect().bottom),
        ).toBeLessThanOrEqual(viewport.height - 11);
        await page.keyboard.press("Escape");
        await page
          .getByRole("navigation", { name: "Hauptnavigation" })
          .getByRole("link", { name: "Dashboard", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Menü", exact: true }),
        ).toHaveAttribute("aria-expanded", "false");
      }
      // These are the unchanged real surface controls, not a static mockup.
      for (const name of ["Week", "Month", "Day"]) {
        const button = page
          .locator(".dashboard-agenda")
          .getByRole("button", { name, exact: true });
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        expect((await geometry(page)).overflow).toBeLessThanOrEqual(1);
      }
      for (const name of ["Midday", "Evening", "Morning"]) {
        const button = page
          .locator(".dashboard-habits")
          .getByRole("button", { name, exact: true });
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
      }
      for (const name of ["Goal View", "Skill View", "Project View"]) {
        const button = page
          .locator(".dashboard-portfolio")
          .getByRole("button", { name, exact: true });
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
      }
      await assertControlsFit(page);
      const path = info.outputPath(`${profile}-${viewport.name}.png`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path,
        fullPage: true,
        style: "nextjs-portal {display:none!important}",
      });
      await info.attach("full-surface", { path, contentType: "image/png" });
      await info.attach("geometry", {
        body: JSON.stringify(layout, null, 2),
        contentType: "application/json",
      });
      await page.reload();
      expect((await geometry(page)).overflow).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}

test("#110 container thresholds and independent height permission", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "empty",
      url: test.info().project.use.baseURL!,
    },
  ]);
  await page.setViewportSize({ width: 2560, height: 1080 });
  await page.goto("/dashboard");
  await expect(
    page.locator('.life-os-sidebar a[aria-current="page"]').first(),
  ).toBeAttached();
  for (const width of [879, 880, 1439, 1440]) {
    await page.locator(".life-os-main").evaluate((main, c) => {
      (main as HTMLElement).style.maxWidth = `${c + 48}px`;
    }, width);
    const layout = await geometry(page);
    expect(layout.canvas).toBe(width);
    const daily = layout.bounds.find((b) => b.name === "dashboard-daily")!;
    const quick = layout.bounds.find((b) => b.name === "dashboard-quick")!;
    if (width < 880) expect(quick.y).toBeGreaterThan(daily.y);
    else expect(quick.y).toBe(daily.y);
    if (width >= 1440) expect(quick.x).toBeLessThan(daily.x);
    else if (width >= 880) expect(quick.x).toBeGreaterThan(daily.x);
    expect(layout.overlaps).toEqual([]);
  }
  for (const height of [719, 720]) {
    await page.setViewportSize({ width: 2560, height });
    // #112 Wide Dashboard supersedes short-height Flow; Details retain it.
    expect((await geometry(page)).fill).toBe("1");
  }
  await page.setViewportSize({ width: 2560, height: 5000 });
  const extreme = await geometry(page);
  expect(extreme.fill).toBe("1");
  expect(extreme.frameHeight).toBeLessThanOrEqual(2161);
});

test("#110 DPR never changes CSS geometry", async ({ browser }, info) => {
  const layouts = [];
  for (const deviceScaleFactor of [1, 1.5, 2]) {
    const context = await browser.newContext({
      viewport: { width: 2560, height: 639 },
      deviceScaleFactor,
    });
    await context.addCookies([
      {
        name: "life_os_profile",
        value: "demo",
        url: info.project.use.baseURL!,
      },
    ]);
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(
      page.locator('.life-os-sidebar a[aria-current="page"]').first(),
    ).toBeAttached();
    await expect(page.locator(".dashboard-agenda")).toBeVisible();
    layouts.push(await geometry(page));
    await context.close();
  }
  expect(layouts[1]).toEqual(layouts[0]);
  expect(layouts[2]).toEqual(layouts[0]);
});

for (const viewport of viewports) {
  test(`#110 Today Calendar Portfolio shell ${viewport.name}`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: viewport.deviceScaleFactor,
    });
    await context.addCookies([
      {
        name: "life_os_profile",
        value: "demo",
        url: info.project.use.baseURL!,
      },
    ]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" || /hydration/i.test(m.text()))
        errors.push(m.text());
    });
    for (const route of ["today", "calendar", "portfolio"]) {
      await page.goto(`/${route}`);
      await expect(page.locator(`#${route}-page`)).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            ) - innerWidth,
        ),
        route,
      ).toBeLessThanOrEqual(1);
      await expect(page.locator(".life-os-command-center")).toHaveCount(0);
      const path = info.outputPath(`${route}-${viewport.name}.png`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path,
        fullPage: true,
        style: "nextjs-portal {display:none!important}",
      });
      await info.attach(route, { path, contentType: "image/png" });
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}

test("#110 compact Split navigation expands in document flow", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 912, height: 844 });
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "demo",
      url: info.project.use.baseURL!,
    },
  ]);
  await page.goto("/calendar");
  await expect(
    page.locator('.life-os-sidebar a[aria-current="page"]').first(),
  ).toBeAttached();
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeGreaterThan(844);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(912);
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Menü", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  test(`#110 Auth-blocked remains honest ${viewport.width}`, async ({
    page,
  }, info) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "life_os_profile",
        value: "manual",
        url: info.project.use.baseURL!,
      },
    ]);
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    await expect(page.locator(".dashboard-daily")).toHaveAttribute(
      "data-profile-id",
      "manual",
    );
    await expect(page.locator(".dashboard-stats")).not.toContainText("12 / 18");
    const quick = page.locator(".dashboard-quick");
    await quick
      .getByRole("textbox", { name: "Quick Thought", exact: true })
      .fill("#110 signed-out guard proof");
    await quick
      .getByRole("button", { name: "In Inbox speichern", exact: true })
      .click();
    await expect(quick.getByRole("alert")).toContainText(
      /sign.in|anmeld|auth|session/i,
    );
    await assertControlsFit(page);
    expect((await geometry(page)).overflow).toBeLessThanOrEqual(1);
  });
}
