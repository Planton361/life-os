import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  assertCockpit,
  cockpitViewports,
  consoleProof,
  scrollProof,
} from "./support/dashboard-cockpit";

// Only the disposable canonical sqlite-hosted runner may authorize writes.
// Authentication comes from the real Tailscale gateway, never test headers.
test.skip(
  process.env.LIFE_OS_112_DISPOSABLE_HOSTED !== "1",
  "Run tests/sqlite/issue-112-manual-proof.mjs against isolated production SQLite",
);
test.use({ actionTimeout: 15000, navigationTimeout: 15000 });

async function login(page: Page, info: TestInfo) {
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "manual",
      url: info.project.use.baseURL!,
    },
  ]);
  await page.goto("/dashboard");
  await expect(page.locator(".dashboard-daily")).toHaveAttribute(
    "data-profile-id",
    "manual",
  );
  await expect(
    page
      .locator(".dashboard-mood")
      .getByRole("button", { name: "Calm", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#main-content")).not.toContainText(
    "Manual-Daten gesperrt",
  );
}
async function controlInventory(page: Page) {
  return page
    .locator(
      ".dashboard-composition a,.dashboard-composition button,.dashboard-composition textarea",
    )
    .evaluateAll((es) =>
      es
        .filter(
          (e) =>
            e.getBoundingClientRect().width && !e.closest("dialog:not([open])"),
        )
        .map((e) => ({
          tag: e.tagName,
          label: e.getAttribute("aria-label") ?? e.textContent?.trim(),
          href: e.getAttribute("href"),
          disabled: e.hasAttribute("disabled"),
        })),
    );
}
async function jsonEvidence(info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2));
  await info.attach(name, { path, contentType: "application/json" });
}
async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({
    path,
    fullPage: true,
    style: "nextjs-portal {display:none!important}",
  });
  await info.attach(name, { path, contentType: "image/png" });
}
async function matrix(page: Page, info: TestInfo, state: string) {
  const data = [];
  const browser = page.context().browser()!;
  const storageState = await page.context().storageState(); // in-memory only
  for (const v of cockpitViewports) {
    const context = await browser.newContext({
      storageState,
      baseURL: info.project.use.baseURL,
      viewport: v,
      deviceScaleFactor: v.deviceScaleFactor,
    });
    const proof = await context.newPage(),
      errors = consoleProof(proof);
    await proof.goto("/dashboard");
    if (state === "technical-populated") {
      await proof
        .locator(".dashboard-habits")
        .getByRole("button", { name: "Morning", exact: true })
        .click();
      await expect(proof).toHaveURL(/habitWindow=Morning/);
      await expect(
        proof
          .locator(".dashboard-habits")
          .getByRole("button", { name: /^#112 Habit .* erhöhen$/ }),
      ).toBeVisible();
    }
    await expect(proof.locator(".dashboard-daily")).toHaveAttribute(
      "data-profile-id",
      "manual",
    );
    data.push({ state, name: v.name, ...(await assertCockpit(proof)) });
    await scrollProof(proof);
    await proof.reload();
    await assertCockpit(proof);
    await screenshot(proof, info, `${state}-${v.name}`);
    expect(errors).toEqual([]);
    await context.close();
  }
  await jsonEvidence(info, state, data);
}
async function links(
  page: Page,
  setup?: () => Promise<void>,
  selector = ".dashboard-composition a[href]",
) {
  await page.goto("/dashboard");
  await setup?.();
  const inventory = await page.locator(selector).evaluateAll((es) => {
    const counts = new Map<string, number>();
    return es
      .filter((e) => e.getBoundingClientRect().width)
      .map((e) => {
        const href = e.getAttribute("href")!,
          index = counts.get(href) ?? 0;
        counts.set(href, index + 1);
        return {
          href,
          index,
          label: e.getAttribute("aria-label") ?? e.textContent?.trim(),
        };
      });
  });
  for (const { href, index } of inventory) {
    await page.goto("/dashboard");
    await setup?.();
    await page
      .locator(selector)
      .and(page.locator(`a[href=${JSON.stringify(href)}]`))
      .nth(index)
      .click();
    const expected = new URL(href, test.info().project.use.baseURL!);
    // Canonical destinations may select an item or add their default view.
    await expect(page).toHaveURL(
      (actual) =>
        actual.origin === expected.origin &&
        actual.pathname === expected.pathname &&
        [...expected.searchParams].every(
          ([key, value]) => actual.searchParams.get(key) === value,
        ),
    );
    await expect(page.locator("#main-content")).not.toContainText(
      "This page could not be found",
    );
  }
  return inventory;
}

test("#112 canonical SQLite Manual read-only matrix and full control inventory", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await login(page, info);
  const errors = consoleProof(page);
  await matrix(page, info, "manual-isolated");
  const inventory: Record<string, unknown> = {};
  for (const size of [
    { width: 769, height: 413 },
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/dashboard");
    inventory[`controls-${size.width}`] = await controlInventory(page);
    inventory[`links-${size.width}`] = await links(page);
    for (const name of ["Goal View", "Skill View", "Project View"]) {
      inventory[`${name}-${size.width}`] = await links(
        page,
        async () => {
          await page
            .locator(".dashboard-portfolio")
            .getByRole("button", { name, exact: true })
            .click();
        },
        ".dashboard-portfolio a[href]",
      );
    }
    await page.goto("/dashboard");
    for (const group of [
      { root: ".dashboard-agenda", names: ["Week", "Month", "Day"] },
      { root: ".dashboard-habits", names: ["Midday", "Evening", "Morning"] },
      { root: ".dashboard-running", names: ["Muscle", "Running"] },
    ])
      for (const name of group.names) {
        await page
          .locator(group.root)
          .getByRole("button", { name, exact: true })
          .click();
        await assertCockpit(page);
      }
    // Open and cancel only; this inventory phase is read-only.
    await page
      .locator(".dashboard-habits")
      .getByRole("button", { name: /Add habit/i })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await screenshot(page, info, `manual-controls-${size.width}`);
  }
  inventory.writeBoundary =
    "Read-only inventory on disposable canonical owner; mutations proved on the same isolated database below. Private DB never opened.";
  await jsonEvidence(info, "control-inventory", inventory);
  expect(errors).toEqual([]);
});

test("#112 isolated UI owner: sparse/populated matrix, Task/Capture/Mood/Habit reload", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await login(page, info);
  const stamp = Date.now();
  const errors = consoleProof(page);
  await matrix(page, info, "technical-sparse");
  await page.setViewportSize({ width: 769, height: 413 });
  await page.goto("/tasks/new");
  const taskForm = page.getByRole("form", {
    name: "Task erstellen",
    exact: true,
  });
  const task = `#112 Daily ${stamp}`;
  await taskForm.getByLabel("Titel", { exact: true }).fill(task);
  await taskForm
    .getByRole("button", { name: "Weitere Angaben (optional)", exact: true })
    .click();
  await taskForm
    .getByLabel("Geplantes Datum", { exact: true })
    .fill(new Date().toISOString().slice(0, 10));
  await taskForm
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]+$/);
  const taskUrl = page.url();
  await page.goto("/dashboard");
  const daily = page.locator(".dashboard-daily");
  await expect(daily).toContainText(task);
  await expect(
    daily.getByRole("button", { name: "Abschließen", exact: true }),
  ).toBeEnabled();
  await daily
    .getByRole("link", {
      name: /Open task|Continue current task|Aufgabe öffnen|Task öffnen/i,
    })
    .click();
  await expect(page).toHaveURL(taskUrl);
  await page.goto("/dashboard");
  await daily.getByRole("button", { name: "Abschließen", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task abgeschlossen" }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(daily).not.toContainText(task);
  const quick = page.locator(".dashboard-quick"),
    capture = `#112 Capture ${stamp}`;
  await quick
    .getByRole("textbox", { name: "Quick Thought", exact: true })
    .fill(capture);
  await quick
    .getByRole("button", { name: "In Inbox speichern", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "In der Inbox gespeichert." }),
  ).toBeVisible();
  await page.goto("/inbox");
  await expect(
    page
      .locator("#inbox-page")
      .getByRole("heading", { name: capture, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator("#inbox-page")
      .getByRole("heading", { name: capture, exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  const mood = page.locator(".dashboard-mood");
  for (const name of [
    "Calm",
    "Focused",
    "Tired",
    "Anxious",
    "Stressed",
    "Happy",
  ]) {
    await mood.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Mood gespeichert." }).last(),
    ).toBeVisible();
    await page.reload();
    await expect(
      mood.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await assertCockpit(page);
  }
  const habits = page.locator(".dashboard-habits");
  for (const period of ["Midday", "Evening", "Morning"]) {
    await habits.getByRole("button", { name: period, exact: true }).click();
    await expect(
      habits.getByRole("button", { name: period, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await habits.getByRole("button", { name: /Add habit/i }).click();
  const dialog = page.getByRole("dialog"),
    habit = `#112 Habit ${stamp}`;
  await dialog.getByLabel("Name", { exact: true }).fill(habit);
  await dialog.getByLabel("Target", { exact: true }).fill("-1");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Bitte prüfe");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await habits.getByRole("button", { name: /Add habit/i }).click();
  await dialog.getByLabel("Name", { exact: true }).fill(habit);
  await dialog.getByLabel("Target", { exact: true }).fill("2");
  await dialog.getByLabel("Increment", { exact: true }).fill("1");
  await dialog.getByLabel("Unit", { exact: true }).fill("checks");
  await dialog
    .getByRole("combobox", { name: "Time of day", exact: true })
    .selectOption("Morning");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "Habit gespeichert." }).last(),
  ).toBeVisible();
  const card = habits.getByRole("article").filter({
    has: page.getByRole("button", { name: `${habit} erhöhen`, exact: true }),
  });
  await card
    .getByRole("button", { name: `${habit} erhöhen`, exact: true })
    .click();
  await expect(card).toContainText("1 / 2 checks");
  await page.reload();
  await expect(card).toContainText("1 / 2 checks");
  await card
    .getByRole("button", { name: /Letzten Eintrag rückgängig machen/ })
    .click();
  await expect(card).toContainText("0 / 2 checks");
  await page.reload();
  await expect(card).toContainText("0 / 2 checks");
  const notices = page.getByRole("button", {
    name: "Benachrichtigung schließen",
  });
  while (await notices.count()) await notices.first().click();
  await jsonEvidence(
    info,
    "technical-control-inventory",
    await controlInventory(page),
  );
  // Populate every Portfolio view through normal UI commands. These records
  // belong only to the disposable canonical database, not the private profile.
  for (const entity of [
    { route: "projects", form: "Project erstellen", label: "Titel" },
    { route: "goals", form: "Ziel erstellen", label: "Titel" },
    { route: "skills", form: "Skill erstellen", label: "Name" },
  ]) {
    await page.goto(`/${entity.route}/new`);
    const form = page.getByRole("form", { name: entity.form, exact: true });
    const title = `#112 ${entity.route} ${stamp}`;
    await form.getByLabel(entity.label, { exact: true }).fill(title);
    if (entity.route === "projects")
      await form
        .getByRole("combobox", { name: "Status", exact: true })
        .selectOption("active");
    await form.getByRole("button", { name: entity.form, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${entity.route}/[a-f0-9-]+$`));
    await page.reload();
    await expect(page.locator("#main-content h1")).toHaveText(title);
  }
  await matrix(page, info, "technical-populated");
  await page.setViewportSize({ width: 769, height: 413 });
  const populatedLinks: Record<string, unknown> = {
    default: await links(page),
  };
  for (const name of ["Goal View", "Skill View", "Project View"]) {
    populatedLinks[name] = await links(
      page,
      async () => {
        await page
          .locator(".dashboard-portfolio")
          .getByRole("button", { name, exact: true })
          .click();
        await expect(
          page.locator(".dashboard-portfolio .portfolio-slots"),
        ).toContainText(`#112`);
      },
      ".dashboard-portfolio a[href]",
    );
  }
  await jsonEvidence(info, "populated-navigation", populatedLinks);
  expect(errors).toEqual([]);
});
