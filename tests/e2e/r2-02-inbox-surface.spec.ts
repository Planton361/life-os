import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

function client() {
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE")
    throw new Error("Disposable runtime required");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
async function browserClient(page: Page) {
  const cookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = client();
  await api.auth.setSession(session);
  return api;
}
async function capture(page: Page, title: string) {
  await page.goto("/dashboard");
  const quick = page.locator('[aria-labelledby="quick-thought-title"]');
  await quick.getByLabel("Quick Thought", { exact: true }).fill(title);
  await quick.getByRole("button", { name: "In Inbox speichern" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /gespeichert/i }),
  ).toBeVisible();
  await page.goto("/inbox");
  await page
    .getByRole("region", { name: "Inbox Queue" })
    .getByRole("button")
    .filter({ hasText: title })
    .click();
  await expect(
    page
      .getByRole("form", { name: "Active Item bearbeiten" })
      .getByLabel("Clean Title"),
  ).toHaveValue(title);
}
const editor = (page: Page) =>
  page.getByRole("form", { name: "Active Item bearbeiten" });
// Set up a pre-existing clarified capture for search/filter and switch regression.
// This is fixture preparation, not a visible Save control.
async function seedClarifiedFields(page: Page) {
  const api = await browserClient(page);
  const id = new URL(page.url()).searchParams.get("item")!;
  const values = {
    body: await editor(page).getByLabel("Description / Context").inputValue(),
    next_action: await editor(page).getByLabel("Next Action").inputValue(),
    missing_info: await editor(page).getByLabel("Missing Info").inputValue(),
  };
  expect(
    (
      await api
        .from("inbox_items")
        .update({ ...values, status: "clarified" })
        .eq("id", id)
    ).error,
  ).toBeNull();
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
}
async function route(page: Page, label: string, targetId?: string) {
  for (const close of await page
    .getByRole("button", { name: "Benachrichtigung schließen", exact: true })
    .all())
    await close.click();
  const region = page.getByRole("region", {
    name: "Outcome Route",
    exact: true,
  });
  await region.getByRole("button", { name: label, exact: true }).click();
  if (targetId)
    await region.getByLabel("Bestehendes Ziel").selectOption(targetId);
  await page
    .getByRole("button", { name: "Einordnen & abschließen", exact: true })
    .click();
  await expect(page.getByLabel("Letztes Routing")).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({
        hasText: /gespeichert und zugeordnet|Inbox-Eintrag abgeschlossen/,
      })
      .last(),
  ).toBeVisible();
}

test("R2-02 linear triage → one final commit → canonical Task, reload and detail editing", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await signUpTechnicalManualUser(page, "r2-inbox", Date.now());
  await page.setViewportSize({ width: 2560, height: 1440 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  const original = `R2 thought ${Date.now()}`;
  await capture(page, original);
  const api = await browserClient(page);
  const user = (await api.auth.getUser()).data.user!.id;
  const area = await api
    .from("areas")
    .insert({ user_id: user, name: "Inbox proof area", key: "coding" })
    .select("id")
    .single();
  expect(area.error).toBeNull();
  await page.reload();
  const id = new URL(page.url()).searchParams.get("item")!;
  await editor(page).getByLabel("Clean Title").fill(`${original} cleaned`);
  await editor(page)
    .getByLabel("Description / Context")
    .fill("Specific context searchable kumquat");
  await editor(page)
    .getByLabel("Next Action")
    .fill("Ask the owner for the first step");
  await editor(page).getByLabel("Missing Info").fill("Need a source reference");
  await expect(
    page.getByRole("region", { name: "Inbox Queue" }).getByLabel("Search"),
  ).toBeDisabled();
  await page.getByText("Original Capture", { exact: true }).click();
  await expect(page.locator("blockquote")).toContainText(original);
  await page.getByText("Original Capture", { exact: true }).click();
  await editor(page).getByLabel("Priority", { exact: true }).selectOption("P1");
  await editor(page).getByLabel("Energy", { exact: true }).selectOption("high");
  await editor(page).getByLabel("Effort / Duration (min)").fill("45");
  await editor(page)
    .getByLabel("Area", { exact: true })
    .selectOption(area.data!.id);
  await editor(page).getByLabel("Deadline hint").fill("2026-10-01");
  await editor(page).getByLabel("Review needed").check();
  await editor(page).getByLabel("Today candidate").check();
  const ai = page.getByRole("region", { name: "AI Assistant", exact: true });
  await ai.getByRole("button", { name: "Lokalen Vorschlag anzeigen" }).click();
  await expect(ai.getByRole("status")).toBeVisible();
  await ai.getByRole("button", { name: "Vorschlag schließen" }).click();
  await expect(ai.getByRole("status")).toHaveCount(0);
  expect(
    (await api.from("inbox_items").select("title").eq("id", id).single()).data!
      .title,
  ).toBe(original);
  await page
    .getByRole("region", { name: "Outcome Route", exact: true })
    .getByRole("button", { name: "Standalone Task", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Einordnen & abschließen", exact: true }),
  ).toBeEnabled();
  expect(
    (await api.from("inbox_items").select("status,body").eq("id", id).single())
      .data,
  ).toMatchObject({ status: "raw", body: original });
  await expect(
    page.getByRole("button", { name: "Standalone Task", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-triage-step]")).toHaveCount(4);
  for (const size of [
    { width: 2560, height: 1440 },
    { width: 3840, height: 2160 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.getByLabel("Clean Title")).toBeVisible();
    const bounds = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewport: innerHeight,
    }));
    expect(bounds.width).toBeLessThanOrEqual(size.width);
    if (size.width > 1000)
      expect(bounds.height).toBeLessThanOrEqual(size.height + 2);
    if (size.width > 1000) {
      const finalBounds = await page
        .getByRole("button", { name: "Einordnen & abschließen", exact: true })
        .boundingBox();
      expect(finalBounds!.y + finalBounds!.height).toBeLessThanOrEqual(
        size.height,
      );
      const stepOrder = await page
        .locator("[data-triage-step]")
        .evaluateAll((steps) =>
          steps.map((step) => step.getBoundingClientRect().top),
        );
      expect(stepOrder).toEqual([...stepOrder].sort((a, b) => a - b));
      const panels = await page
        .locator(
          '[data-inbox-section="queue"], [data-inbox-section="active-item"], aside[aria-label="Sekundärer Inbox Kontext"]',
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const r = element.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
          }),
        );
      expect(panels).toHaveLength(3);
      expect(panels[0].right).toBeLessThanOrEqual(panels[1].x);
      expect(panels[1].right).toBeLessThanOrEqual(panels[2].x);
      for (const panel of panels)
        expect(panel.bottom).toBeLessThanOrEqual(size.height);
    }
    const controlsFit = await editor(page)
      .locator("input,textarea,select")
      .evaluateAll((elements) =>
        elements.every((element) => {
          const r = element.getBoundingClientRect();
          const parent = element.closest("form")!.getBoundingClientRect();
          return r.left >= parent.left - 1 && r.right <= parent.right + 1;
        }),
      );
    expect(controlsFit).toBe(true);
    const path = info.outputPath(`inbox-${size.width}.png`);
    await page.screenshot({ fullPage: true, path });
    await info.attach(`inbox-${size.width}.png`, {
      path,
      contentType: "image/png",
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await route(page, "Standalone Task");
  const target = await api
    .from("tasks")
    .select("*")
    .eq("source_inbox_item_id", id)
    .single();
  const persisted = (
    await api.from("inbox_items").select("*").eq("id", id).single()
  ).data!;
  expect(persisted).toMatchObject({
    title: `${original} cleaned`,
    body: "Specific context searchable kumquat",
    next_action: "Ask the owner for the first step",
    missing_info: "Need a source reference",
    priority: "P1",
    energy: "high",
    duration_minutes: 45,
    area_id: area.data!.id,
    deadline_hint: "2026-10-01",
    review_needed: true,
    today_candidate: true,
    original_title: original,
  });
  expect(target.error).toBeNull();
  expect(target.data).toMatchObject({
    title: `${original} cleaned`,
    priority: "P1",
    energy: "high",
    duration_minutes: 45,
    area_id: area.data!.id,
  });
  expect(target.data!.description).toContain("Need a source reference");
  expect(target.data!.planned_date).not.toBeNull();
  expect(target.data!.due_at).not.toBeNull();
  await page.getByRole("link", { name: "Ziel öffnen", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`selected=${target.data!.id}`));
  await expect(page.locator("main")).toContainText(`${original} cleaned`);
  await expect(
    page
      .getByRole("form", { name: "Task bearbeiten", exact: true })
      .getByLabel("Titel", { exact: true }),
  ).toBeVisible();
  const targetForm = page.getByRole("form", {
    name: "Task bearbeiten",
    exact: true,
  });
  await expect(
    targetForm.getByLabel("Next Action", { exact: true }),
  ).toHaveValue("Ask the owner for the first step");
  await targetForm
    .getByLabel("Titel", { exact: true })
    .fill(`${original} detail work`);
  await targetForm
    .getByRole("button", { name: "Task speichern", exact: true })
    .click();
  await expect(targetForm.getByLabel("Titel", { exact: true })).toHaveValue(
    `${original} detail work`,
  );
  await expect
    .poll(
      async () =>
        (
          await api
            .from("tasks")
            .select("title")
            .eq("id", target.data!.id)
            .single()
        ).data?.title,
    )
    .toBe(`${original} detail work`);
  await page.reload();
  await expect(targetForm.getByLabel("Titel", { exact: true })).toHaveValue(
    `${original} detail work`,
  );
  expect(
    (await api.from("inbox_items").select("*").eq("id", id).single()).data,
  ).toEqual(persisted);
  await page.goto("/inbox");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Inbox Queue" }),
  ).not.toContainText(`${original} cleaned`);
  expect(errors).toEqual([]);
});

test("R2-02 all routes, real targets, search/clear/filter/selection and no duplicate fields", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await signUpTechnicalManualUser(page, "r2-routes", Date.now());
  await page.setViewportSize({ width: 1920, height: 1080 });
  const api = await browserClient(page);
  const user = (await api.auth.getUser()).data.user!.id;
  const seed = async (
    table: "projects" | "goals" | "skills",
    title: string,
  ) => {
    const result =
      table === "skills"
        ? await api
            .from("skills")
            .insert({ user_id: user, name: title })
            .select("id")
            .single()
        : await api
            .from(table)
            .insert({ user_id: user, title })
            .select("id")
            .single();
    expect(result.error).toBeNull();
    return result.data!.id;
  };
  const project = await seed("projects", "Existing project proof");
  const goal = await seed("goals", "Existing goal proof");
  const skill = await seed("skills", "Existing skill proof");
  const inventory: object[] = [];
  for (const [label, target] of [
    ["Existing Project", project],
    ["Existing Goal", goal],
    ["Existing Skill", skill],
    ["New Project", null],
    ["New Goal", null],
    ["Resource", null],
    ["Note", null],
    ["Solved / Archive", null],
  ] as const) {
    const title = `R2 ${label} ${Date.now()}`;
    await capture(page, title);
    const id = new URL(page.url()).searchParams.get("item")!;
    await editor(page)
      .getByLabel("Description / Context")
      .fill(`Context for ${label}`);
    const outcome = page.getByRole("region", {
      name: "Outcome Route",
      exact: true,
    });
    await expect(outcome.locator("textarea,input")).toHaveCount(0);
    await route(page, label, target ?? undefined);
    const item = (
      await api.from("inbox_items").select("*").eq("id", id).single()
    ).data!;
    expect(["archived", "triaged"]).toContain(item.status);
    if (label.startsWith("Existing")) {
      const task = (
        await api
          .from("tasks")
          .select("*")
          .eq("source_inbox_item_id", id)
          .single()
      ).data!;
      if (label === "Existing Project") expect(task.project_id).toBe(project);
      if (label === "Existing Goal") expect(task.goal_id).toBe(goal);
      if (label === "Existing Skill")
        expect(
          (
            await api
              .from("task_skill_links")
              .select("skill_id")
              .eq("task_id", task.id)
              .single()
          ).data!.skill_id,
        ).toBe(skill);
    }
    if (label !== "Solved / Archive") {
      await page
        .getByRole("link", { name: "Ziel öffnen", exact: true })
        .click();
      await expect(page).toHaveURL(/\/(portfolio|resources)\?/);
      await page.reload();
      await expect(page.locator("main")).toContainText(title);
      if (label === "Note" || label === "Resource") {
        const resource = (
          await api
            .from("resources")
            .select("type")
            .eq("source", `inbox:${id}`)
            .single()
        ).data!;
        expect(resource.type).toBe(label === "Note" ? "note" : "source");
      }
    }
    await page.goto("/inbox");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Inbox Queue" }),
    ).not.toContainText(title);
    inventory.push({
      CONTROL: label,
      EXPECTED: "Canonical route and removed from Open",
      ACTUAL: "Destination and reload checked",
      RESULT: "PASS",
    });
  }
  await capture(page, "Search first unique thought");
  await editor(page)
    .getByLabel("Description / Context")
    .fill("kumquat only context match");
  await seedClarifiedFields(page);
  const first = new URL(page.url()).searchParams.get("item");
  await capture(page, "Search second unique thought");
  const second = new URL(page.url()).searchParams.get("item");
  const queue = page.getByRole("region", { name: "Inbox Queue" });
  await queue.getByLabel("Search").fill("kumquat");
  await expect(
    queue
      .getByRole("button")
      .filter({ hasText: "Search first unique thought" }),
  ).toBeVisible();
  await expect(queue).not.toContainText("Search second unique thought");
  await expect(page).toHaveURL(new RegExp(`item=${first}`));
  await page.reload();
  await expect(queue.getByLabel("Search")).toHaveValue("kumquat");
  await queue.getByLabel("Search").fill("no-match-anywhere");
  await expect(queue).toContainText("Keine passenden Einträge.");
  await page.reload();
  await expect(queue).toContainText("Keine passenden Einträge.");
  await queue.getByRole("button", { name: "Suche leeren" }).click();
  await queue.getByRole("button", { name: "Raw", exact: true }).click();
  await expect(queue).not.toContainText("Search first unique thought");
  await queue.getByRole("button", { name: "Clarified", exact: true }).click();
  await expect(queue).toContainText("Search first unique thought");
  await queue.getByRole("button", { name: "Open", exact: true }).click();
  await queue
    .getByRole("button")
    .filter({ hasText: "Search second unique thought" })
    .click();
  await expect(page).toHaveURL(new RegExp(`item=${second}`));
  await editor(page).getByLabel("Next Action").fill("Retain while switching");
  await expect(
    queue
      .getByRole("button")
      .filter({ hasText: "Search first unique thought" }),
  ).toBeDisabled();
  await seedClarifiedFields(page);
  await queue
    .getByRole("button")
    .filter({ hasText: "Search first unique thought" })
    .click();
  await queue
    .getByRole("button")
    .filter({ hasText: "Search second unique thought" })
    .click();
  await page.reload();
  await expect(editor(page).getByLabel("Next Action")).toHaveValue(
    "Retain while switching",
  );
  const related = page.getByRole("region", {
    name: "Related Context",
    exact: true,
  });
  const inboxUrl = page.url();
  const visibleLinks = await related.getByRole("link").evaluateAll((elements) =>
    elements.map((element) => ({
      href: element.getAttribute("href")!,
      label: element.textContent!.trim(),
    })),
  );
  for (const link of visibleLinks) {
    await related.locator(`a[href="${link.href}"]`).click();
    await expect(page).toHaveURL(
      new RegExp(link.href.split("?")[0].replaceAll("/", "\\/")),
    );
    await expect(page.locator("main")).toBeVisible();
    inventory.push({
      CONTROL: `Related Context ${link.label}`,
      EXPECTED: link.href,
      ACTUAL: "Destination loaded",
      RESULT: "PASS",
    });
    await page.goto(inboxUrl);
  }
  await route(page, "Solved / Archive");
  await page
    .getByLabel("Letztes Routing")
    .getByRole("button", { name: "Schließen", exact: true })
    .click();
  await expect(page.getByLabel("Letztes Routing")).toHaveCount(0);
  await info.attach("route-control-inventory.json", {
    body: JSON.stringify(inventory, null, 2),
    contentType: "application/json",
  });
});

test("R2-02 atomic RPC ownership, stale saves, double routes and immutable original", async () => {
  test.setTimeout(120000);
  const api = client(),
    other = client();
  const stamp = Date.now();
  const user = await api.auth.signUp({
    email: `r2-security-${stamp}@example.test`,
    password: `R2-test-${stamp}!`,
  });
  const stranger = await other.auth.signUp({
    email: `r2-stranger-${stamp}@example.test`,
    password: `R2-test-${stamp}!`,
  });
  expect(user.error).toBeNull();
  expect(stranger.error).toBeNull();
  const id = user.data.user!.id,
    foreignId = stranger.data.user!.id;
  const item = (
    await api
      .from("inbox_items")
      .insert({ user_id: id, title: "Original", body: "Original body" })
      .select("*")
      .single()
  ).data!;
  const args = {
    p_inbox_item_id: item.id,
    p_expected_updated_at: item.updated_at,
    p_title: "Cleaned",
    p_body: "Cleaned body",
    p_next_action: "Next",
    p_missing_info: "Missing",
    p_priority: "P1" as const,
    p_energy: "high" as const,
    p_duration_minutes: 45,
    p_area_id: null,
    p_review_needed: true,
    p_today_candidate: true,
    p_deadline_hint: "2026-10-01",
  };
  expect(
    (await other.rpc("save_inbox_clarification", args)).error,
  ).not.toBeNull();
  expect(
    (await client().rpc("save_inbox_clarification", args)).error,
  ).not.toBeNull();
  const foreignArea = (
    await other
      .from("areas")
      .insert({ user_id: foreignId, name: "Foreign", key: "coding" })
      .select("id")
      .single()
  ).data!;
  expect(
    (
      await api.rpc("save_inbox_clarification", {
        ...args,
        p_area_id: foreignArea.id,
      })
    ).error,
  ).not.toBeNull();
  const saved = await api.rpc("save_inbox_clarification", args);
  expect(saved.error).toBeNull();
  expect((await api.rpc("save_inbox_clarification", args)).error?.code).toBe(
    "PT409",
  );
  await api
    .from("inbox_items")
    .update({ original_title: "Overwrite", original_body: "Overwrite" })
    .eq("id", item.id);
  const current = (
    await api.from("inbox_items").select("*").eq("id", item.id).single()
  ).data!;
  expect(current.original_title).toBe("Original");
  expect(current.original_body).toBe("Original body");
  const routeArgs = {
    ...args,
    p_expected_updated_at: current.updated_at,
    p_route: "project",
    p_target_id: null,
  };
  expect(
    (await other.rpc("complete_inbox_triage", routeArgs)).error,
  ).not.toBeNull();
  const foreignProject = (
    await other
      .from("projects")
      .insert({ user_id: foreignId, title: "Foreign project" })
      .select("id")
      .single()
  ).data!;
  expect(
    (
      await api.rpc("complete_inbox_triage", {
        ...routeArgs,
        p_title: "Must roll back",
        p_route: "existing_project",
        p_target_id: foreignProject.id,
      })
    ).error,
  ).not.toBeNull();
  expect(
    (await api.from("tasks").select("id").eq("source_inbox_item_id", item.id))
      .data,
  ).toEqual([]);
  expect(
    (
      await api
        .from("inbox_items")
        .select("title,updated_at")
        .eq("id", item.id)
        .single()
    ).data,
  ).toEqual({ title: "Cleaned", updated_at: current.updated_at });
  expect(
    (await client().rpc("complete_inbox_triage", routeArgs)).error,
  ).not.toBeNull();
  const attempts = await Promise.all([
    api.rpc("complete_inbox_triage", routeArgs),
    api.rpc("complete_inbox_triage", routeArgs),
  ]);
  expect(attempts.filter((result) => !result.error)).toHaveLength(1);
  expect(
    (await api.from("projects").select("id").eq("title", "Cleaned")).data,
  ).toHaveLength(1);
  expect(
    (
      await api.rpc("save_inbox_clarification", {
        ...args,
        p_expected_updated_at: current.updated_at,
      })
    ).error,
  ).not.toBeNull();
  expect(
    (await other.from("inbox_items").select("id").eq("id", item.id)).data,
  ).toEqual([]);
});

test("R2-02 auth/empty/demo boundaries and visible stale-save error retain edits", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "manual",
      url: process.env.PLAYWRIGHT_HOST
        ? `http://${process.env.PLAYWRIGHT_HOST}:${process.env.PLAYWRIGHT_PORT}`
        : "http://127.0.0.1:3000",
    },
  ]);
  await page.goto("/inbox");
  await expect(
    page
      .locator("#inbox-page")
      .getByRole("button", { name: "Einordnen & abschließen", exact: true }),
  ).toHaveCount(0);
  await signUpTechnicalManualUser(page, "r2-errors", Date.now());
  await expect(page.getByRole("region", { name: "Inbox Queue" })).toContainText(
    "Inbox ist leer",
  );
  await capture(page, `R2 stale ${Date.now()}`);
  const api = await browserClient(page);
  const id = new URL(page.url()).searchParams.get("item")!;
  await editor(page).getByLabel("Next Action").fill("Unsaved local correction");
  expect(
    (
      await api
        .from("inbox_items")
        .update({ body: "Concurrent canonical update" })
        .eq("id", id)
    ).error,
  ).toBeNull();
  const finalAction = page.getByRole("button", {
    name: "Einordnen & abschließen",
    exact: true,
  });
  await expect(finalAction).toBeDisabled();
  await page
    .getByRole("button", { name: "Existing Project", exact: true })
    .click();
  await expect(finalAction).toBeDisabled();
  await page
    .getByRole("button", { name: "Solved / Archive", exact: true })
    .click();
  const title = await editor(page).getByLabel("Clean Title").inputValue();
  await editor(page).getByLabel("Clean Title").fill("x");
  await expect(finalAction).toBeDisabled();
  await editor(page).getByLabel("Clean Title").fill(title);
  await editor(page).getByLabel("Effort / Duration (min)").fill("0");
  await expect(finalAction).toBeDisabled();
  await editor(page).getByLabel("Effort / Duration (min)").fill("");
  await finalAction.click();
  await expect(
    page.locator('[data-inbox-section="active-item"]').getByRole("alert"),
  ).toContainText("inzwischen geändert");
  await expect(editor(page).getByLabel("Next Action")).toHaveValue(
    "Unsaved local correction",
  );
  expect(
    (
      await api
        .from("inbox_items")
        .select("next_action,body")
        .eq("id", id)
        .single()
    ).data,
  ).toMatchObject({ next_action: null, body: "Concurrent canonical update" });
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await editor(page).getByLabel("Description / Context").fill("");
  await editor(page).getByLabel("Missing Info").fill("");
  await route(page, "Solved / Archive");
  await page.reload();
  expect(
    (
      await api
        .from("inbox_items")
        .select("body,missing_info,status")
        .eq("id", id)
        .single()
    ).data,
  ).toMatchObject({ body: null, missing_info: null, status: "archived" });
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "demo",
      url: `http://${process.env.PLAYWRIGHT_HOST}:${process.env.PLAYWRIGHT_PORT}`,
    },
  ]);
  await page.goto("/inbox");
  await expect(page.locator("#inbox-page")).toContainText("Demo-Referenz");
  await expect(
    page.getByRole("region", { name: "Outcome Route", exact: true }),
  ).toHaveCount(0);
});
