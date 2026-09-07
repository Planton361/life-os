import { expect, test } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("R2-04 unified Portfolio controls, create/detail reload, history and composition", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  page.setDefaultTimeout(15000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signUpTechnicalManualUser(page, "r204-ia", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const inventory: {
    control: string;
    expected: string;
    actual: string;
    result: string;
  }[] = [];
  const record = (control: string, expected: string) =>
    inventory.push({ control, expected, actual: page.url(), result: "PASS" });
  const list = page.getByRole("region", {
    name: "Active Portfolio",
    exact: true,
  });
  const inspector = page.getByRole("complementary", {
    name: "Selected Entity",
  });
  const filters = page.getByRole("region", {
    name: "Portfolio view, scope and sort controls",
  });
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  const ids: Record<string, string> = {};
  const stamp = Date.now();
  await page.goto("/portfolio");
  await expect(inspector).toContainText("Ein Element auswählen");
  await expect(list.getByRole("link")).toHaveCount(0);
  record("Portfolio Root / Empty", "Empty Portfolio and inspector");
  for (const kind of ["Task", "Project", "Goal", "Skill", "Resource"]) {
    await page.goto("/portfolio");
    await page
      .getByRole("navigation", { name: "Entity erstellen" })
      .getByRole("link", { name: `${kind} erstellen`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${kind.toLowerCase()}s/new$`));
    const form = page.getByRole("form", {
      name: `${kind} erstellen`,
      exact: true,
    });
    await form
      .getByRole("button", { name: `${kind} erstellen`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${kind.toLowerCase()}s/new$`));
    await form
      .getByLabel(kind === "Skill" ? "Name" : "Titel", { exact: true })
      .fill(`${kind} IA ${stamp}`);
    await form.getByLabel("Beschreibung / Kontext").fill(`Context ${kind} IA`);
    if (kind === "Task")
      await form.getByLabel("Next Action").fill("Inspect the canonical work");
    await form
      .getByRole("button", { name: `${kind} erstellen`, exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${kind.toLowerCase()}s/[0-9a-f-]{36}$`),
    );
    ids[kind] = page.url().split("/").pop()!;
    await page.reload();
    await expect(page.getByLabel("Beschreibung / Kontext")).toHaveValue(
      `Context ${kind} IA`,
    );
    record(`Create ${kind}`, "Create → ID detail → reload-stable fields");
    if (kind !== "Resource") {
      await page
        .getByRole("navigation", { name: "Breadcrumb" })
        .getByRole("link", { name: `${kind}s`, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/portfolio\\?type=${kind.toLowerCase()}s$`),
      );
      await expect(
        list.getByRole("link", { name: new RegExp(`${kind} IA ${stamp}`) }),
      ).toBeVisible();
      record(`${kind} breadcrumb`, "Portfolio filtered list");
    }
  }
  await page.goto("/portfolio");
  await nav.getByRole("link", { name: "Portfolio", exact: true }).click();
  await expect(page).toHaveURL(/\/portfolio$/);
  record("Sidebar Portfolio", "/portfolio");
  for (const kind of ["Task", "Project", "Goal", "Skill"]) {
    const type = `${kind.toLowerCase()}s`;
    // Portfolio submenu is an accessible flyout; open it through its real control.
    await nav
      .getByRole("link", { name: "Portfolio", exact: true })
      .press("ArrowRight");
    const sub = page
      .getByRole("link", { name: `${kind}s`, exact: true })
      .filter({ has: page.locator("span") });
    await sub.first().click();
    await expect(page).toHaveURL(new RegExp(`/portfolio\\?type=${type}$`));
    await expect(
      filters.getByRole("link", { name: `${kind}s`, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(list.locator("a[data-entity-type]")).toHaveCount(1);
    await expect(list.locator("a[data-entity-type]")).toHaveAttribute(
      "data-entity-type",
      kind.toLowerCase(),
    );
    await page.reload();
    await expect(
      filters.getByRole("link", { name: `${kind}s`, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    record(
      `Sidebar ${kind}s / Reload`,
      `Only ${type}; Entity View synchronized`,
    );
    await list.getByRole("link").click();
    await expect(
      inspector.getByRole("heading", {
        name: `${kind} IA ${stamp}`,
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(inspector).toContainText(`Context ${kind} IA`);
    if (kind === "Task")
      await expect(inspector).toContainText("Aufwand nicht gesetzt");
    if (kind === "Skill")
      await expect(inspector).toContainText("0 Evidence-Einträge");
    record(`${kind} selection`, "Reload-stable quick inspector");
    await inspector.getByRole("link", { name: "Details öffnen" }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}/${ids[kind]}$`));
    record(`Details öffnen ${kind}`, "Canonical ID detail");
    await page.goBack();
    const other = kind === "Project" ? "Tasks" : "Projects";
    await filters.getByRole("link", { name: other, exact: true }).click();
    await expect(inspector).toContainText("Ein Element auswählen");
    expect(new URL(page.url()).searchParams.has("selected")).toBe(false);
  }
  for (const label of ["All", "Tasks", "Projects", "Goals", "Skills"]) {
    await filters
      .getByRole("link", { name: label, exact: true })
      .first()
      .click();
    await expect(
      filters.getByRole("link", { name: label, exact: true }).first(),
    ).toHaveAttribute("aria-current", "page");
    await expect(list.locator("a[data-entity-type]")).toHaveCount(
      label === "All" ? 4 : 1,
    );
    record(`Entity View ${label}`, "URL and entity list agree");
  }
  await filters.getByRole("link", { name: "Tasks", exact: true }).click();
  await expect(page).toHaveURL(/\/portfolio\?type=tasks$/);
  await filters.getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/portfolio\?type=projects$/);
  await page.goBack();
  await expect(
    filters.getByRole("link", { name: "Tasks", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(
    filters.getByRole("link", { name: "Projects", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  record("Back / Forward", "Restores URL, active Entity View and list");
  await page.goto("/portfolio");
  const secondary = await filters
    .locator('a:not([aria-current="page"])')
    .evaluateAll((links) =>
      links
        .map((a) => ({
          href: a.getAttribute("href")!,
          label: a.textContent!.trim(),
        }))
        .filter((a) => /scope=|sort=/.test(a.href)),
    );
  for (const control of secondary) {
    await page.goto("/portfolio");
    await filters
      .getByRole("link", { name: control.label, exact: true })
      .click();
    await expect(
      filters.getByRole("link", { name: control.label, exact: true }),
    ).toHaveAttribute("aria-current", "true");
    await page.reload();
    await expect(
      filters.getByRole("link", { name: control.label, exact: true }),
    ).toHaveAttribute("aria-current", "true");
    if (["Blocked", "Needs decision", "Review open"].includes(control.label))
      await expect(list.getByRole("link")).toHaveCount(0);
    record(
      `Scope / Sort ${control.label}`,
      "URL and active control survive reload",
    );
  }
  await page.goto("/portfolio?scope=blocked&sort=recent");
  await filters.getByRole("link", { name: "All", exact: true }).nth(1).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has("scope"))
    .toBe(false);
  await filters.getByRole("link", { name: "Priority", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has("sort"))
    .toBe(false);
  record("Scope All / Sort Priority", "Reset each independent filter");
  for (const size of [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const [state, query] of [
      ["all", ""],
      ["tasks", "?type=tasks"],
      ["projects", "?type=projects"],
      ["selected", `?type=tasks&selected=${ids.Task}`],
    ]) {
      await page.goto(`/portfolio${query}`);
      await expect(list).toBeVisible();
      await expect(
        nav.getByRole("link", { name: "Portfolio", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page.locator(
          '#portfolio-page a[href="/tasks"], #portfolio-page a[href="/projects"], #portfolio-page a[href="/goals"], #portfolio-page a[href="/skills"]',
        ),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", {
          name: /^(Tasks|Projects|Goals|Skills) öffnen$/,
        }),
      ).toHaveCount(0);
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => {
          const r = document.querySelector(selector)!.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        };
        return {
          list: rect('[data-portfolio-section="entity-list"]'),
          rail: rect('[data-portfolio-section="right-rail"]'),
          inspector: rect('[aria-label="Selected Entity"]'),
          create: rect('[aria-labelledby="portfolio-create-heading"]'),
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        };
      });
      expect(geometry.width).toBeLessThanOrEqual(size.width);
      if (size.width >= 1280) {
        expect(geometry.height).toBeLessThanOrEqual(size.height);
        expect(geometry.list.bottom).toBeGreaterThan(size.height - 24);
        expect(
          Math.abs(geometry.list.bottom - geometry.inspector.bottom),
        ).toBeLessThan(2);
        expect(geometry.list.right).toBeLessThan(geometry.rail.left);
        expect(geometry.create.bottom + 12).toBeLessThanOrEqual(
          geometry.inspector.top,
        );
      } else {
        expect(geometry.list.bottom).toBeLessThanOrEqual(
          geometry.inspector.top,
        );
        expect(geometry.inspector.bottom).toBeLessThanOrEqual(
          geometry.create.top,
        );
      }
      await page.screenshot({
        path: info.outputPath(`portfolio-${state}-${size.width}.png`),
        fullPage: true,
      });
      record(
        `${size.width} ${state}`,
        "Filled desktop surfaces / mobile stacking, no overflow or overlaps",
      );
    }
  }
  await nav
    .getByRole("link", { name: "Portfolio", exact: true })
    .press("ArrowRight");
  const mobileMenu = page.locator('[aria-label="Portfolio Unterseiten"]');
  await expect(mobileMenu).toBeVisible();
  expect(
    await mobileMenu.evaluate((el) => el.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(390);
  await mobileMenu.getByRole("link", { name: "Skills", exact: true }).click();
  await expect(
    filters.getByRole("link", { name: "Skills", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  record(
    "Mobile Sidebar / Keyboard",
    "Visible submenu and synchronized Skills filter",
  );
  expect(errors).toEqual([]);
  await info.attach("control-inventory", {
    body: JSON.stringify(inventory, null, 2),
    contentType: "application/json",
  });
});

test("Portfolio scrolls real overflowing rows inside the workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/portfolio");
  const list = page.getByRole("region", {
    name: "Active Portfolio",
    exact: true,
  });
  const rows = list.locator("[data-entity-type]");
  const scrollArea = list.locator(":scope > div").last();
  expect(
    await scrollArea.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  await rows.last().click();
  expect(await scrollArea.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(720);
  await expect(
    page.getByRole("complementary", { name: "Selected Entity" }),
  ).toContainText(await rows.last().locator("h4").innerText());
});
