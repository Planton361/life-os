import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
import {
  assertCockpit,
  cockpitViewports,
  consoleProof,
  scrollProof,
} from "./support/dashboard-cockpit";

const email = process.env.LIFE_OS_112_TEST_EMAIL,
  password = process.env.LIFE_OS_112_TEST_PASSWORD;
test.skip(
  !email || !password,
  "Explicit local read-only test-profile login required",
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
  await page.goto("/settings#supabase-session");
  const panel = page.locator("#supabase-session");
  await panel.getByLabel("Email").fill(email!);
  await panel.getByLabel("Password").fill(password!);
  await panel.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/inbox$/);
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
  await info.attach(state, {
    body: JSON.stringify(data, null, 2),
    contentType: "application/json",
  });
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
    await expect(page).toHaveURL(
      new URL(href, test.info().project.use.baseURL!).toString(),
    );
    await expect(page.locator("#main-content")).not.toContainText(
      "This page could not be found",
    );
  }
  return inventory;
}

test("#112 existing Manual profile read-only matrix and full control inventory", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await login(page, info);
  const errors = consoleProof(page);
  await matrix(page, info, "manual-existing");
  const inventory: Record<string, unknown> = {};
  for (const size of [
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
    // Open and cancel only; writes on this existing profile are prohibited.
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
    "All ordinary-profile controls read-only; mutation controls proved on technical owner below.";
  await info.attach("control-inventory", {
    body: JSON.stringify(inventory, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("#112 isolated UI owner: sparse/populated matrix, Task/Capture/Mood/Habit reload", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await login(page, info);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "issue112cockpit", stamp, {
    issue112ExistingLocalRuntime: true,
  });
  const errors = consoleProof(page);
  await matrix(page, info, "technical-sparse");
  await page.setViewportSize({ width: 2560, height: 589 });
  await page.goto("/tasks/new");
  const taskForm = page.getByRole("form", {
    name: "Task erstellen",
    exact: true,
  });
  const task = `#112 Daily ${stamp}`;
  await taskForm.getByLabel("Titel", { exact: true }).fill(task);
  await taskForm
    .getByRole("button", { name: "Planung (optional)", exact: true })
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
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
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
  await info.attach("technical-control-inventory", {
    body: JSON.stringify(await controlInventory(page), null, 2),
    contentType: "application/json",
  });
  await matrix(page, info, "technical-populated");
  expect(errors).toEqual([]);
});
