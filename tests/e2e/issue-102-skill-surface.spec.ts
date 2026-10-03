import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("#102 dependency outage fails closed in real Skill and Portfolio; Portfolio control inventory", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  expect(process.env.LIFE_OS_E2E_RUNTIME).toBe("DISPOSABLE");
  await signUpTechnicalManualUser(page, "skill-outage", Date.now());
  const cookie = (await page.context().cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(
    JSON.parse(
      Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
    ),
  );
  const uid = (await api.auth.getUser()).data.user!.id;
  const created = await api
    .rpc("skill_development_command", {
      p_skill_id: null,
      p_command_id: crypto.randomUUID(),
      p_expected_revision: null,
      p_operation: "skill.create",
      p_payload: { name: "Alltag ohne Entwicklungsfokus" },
    })
    .throwOnError();
  const id = created.data.skill_id;
  const task = (
    await api
      .from("tasks")
      .insert({ user_id: uid, title: "Reale Übungsaufgabe", status: "planned" })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await api
    .from("task_skill_links")
    .insert({ user_id: uid, skill_id: id, task_id: task.id })
    .throwOnError();
  const container = `supabase_db_${process.env.LIFE_OS_E2E_PROJECT_ID}`;
  const sql = (command: string) =>
    execFileSync("docker", [
      "exec",
      container,
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      command,
    ]);
  // Fault injection only in the disposable stack; restore the exact existing
  // permission in finally. No product grant/model/schema change.
  sql(
    "revoke execute on function public.read_task_dependency_graph() from authenticated;",
  );
  try {
    await page.goto(`/skills/${id}`);
    const work = page.locator("[data-skill-development]");
    await expect(work.locator("[data-skill-primary] summary")).toHaveText(
      "Aufgaben ansehen",
    );
    await expect(
      work.getByRole("region", { name: "Aktuelle Entwicklung" }),
    ).toContainText("Ausführbarkeit derzeit nicht verfügbar");
    await expect(work.getByText("Ausführbar", { exact: true })).toHaveCount(0);
    await work.locator("[data-skill-primary] summary").click();
    await expect(work.locator("[data-skill-primary]")).toContainText(
      "Ausführbarkeit derzeit nicht verfügbar",
    );
    await page.reload();
    await expect(work.locator("[data-skill-primary] summary")).toHaveText(
      "Aufgaben ansehen",
    );
    await page.goto(`/portfolio?view=skills&selected=${id}`);
    const inspector = page.getByRole("complementary", {
      name: "Selected Entity",
    });
    await expect(inspector).toContainText("Ohne Entwicklungsfokus");
    await expect(inspector).toContainText(
      "Ausführbarkeit derzeit nicht verfügbar",
    );
    await expect(inspector).not.toContainText("1 ausführbar");
    for (const [width, height] of [
      [3840, 2160],
      [1920, 1080],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(`/skills/${id}`);
      await expect(work.locator("[data-skill-primary] summary")).toHaveText(
        "Aufgaben ansehen",
      );
      await page.screenshot({
        path: info.outputPath(`issue-102-dependency-unavailable-${width}.png`),
        fullPage: true,
        caret: "initial",
      });
    }
  } finally {
    sql(
      "grant execute on function public.read_task_dependency_graph() to authenticated;",
    );
  }
  await page.setViewportSize({ width: 3840, height: 2160 });
  const origin = `/portfolio?view=skills&selected=${id}`;
  await page.goto(origin);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const main = page.locator("main");
  // App Router can initially stream the loading surface after page.goto.
  // Inventory the actual Portfolio controls once they are rendered.
  await expect
    .poll(() => main.locator("a:visible").count())
    .toBeGreaterThan(20);

  const controls = await main.locator("a:visible").evaluateAll((elements) =>
    elements
      .map((e) => ({
        name: e.textContent?.trim() ?? "",
        href: e.getAttribute("href")!,
      }))
      .filter((e) => e.href),
  );
  const inventory: { name: string; href: string; result: string }[] = [];
  for (const control of controls) {
    await page.goto(origin);
    const link = main.locator(`a[href="${control.href}"]`).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(new URL(control.href, page.url()).toString(), {
      timeout: 15000,
    });
    inventory.push({ ...control, result: "PASS" });
  }
  expect(inventory.length).toBeGreaterThan(20);
  const inventoryPath = info.outputPath(
    "portfolio-visible-control-inventory.json",
  );
  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
  await info.attach("portfolio-visible-control-inventory", {
    path: inventoryPath,
    contentType: "application/json",
  });
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.goto(origin);
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("complementary", { name: "Selected Entity" }),
    ).toContainText("Area: Ohne Area");
    const inspector = page.getByRole("complementary", {
      name: "Selected Entity",
    });
    await expect(
      inspector.getByRole("region", {
        name: "Verknüpfte Aufgaben",
        exact: true,
      }),
    ).toContainText("Reale Übungsaufgabe");
    await expect(inspector).not.toContainText("Practice Tasks");
    await page.screenshot({
      path: info.outputPath(`issue-102-portfolio-no-target-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
    // Existing mobile chip rails scroll. Exercise every chip after scrolling
    // it into view instead of treating intentional rail overflow as clipping.
    const filters = page.getByRole("region", {
      name: "Portfolio view, scope and sort controls",
    });
    const hrefs = await filters
      .locator("a")
      .evaluateAll((elements) => elements.map((e) => e.getAttribute("href")!));
    for (const href of hrefs) {
      await page.goto(origin);
      const chip = filters.locator(`a[href="${href}"]`).first();
      await chip.scrollIntoViewIfNeeded();
      await chip.click();
      await expect(page).toHaveURL(new URL(href, page.url()).toString(), {
        timeout: 15000,
      });
    }
  }
  expect(errors).toEqual([]);
});
