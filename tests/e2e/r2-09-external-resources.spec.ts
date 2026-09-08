import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

async function submit(page: Page, name: string) {
  const form = page.getByRole("form", { name, exact: true });
  await form.getByRole("button").last().click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /erstellt|gespeichert|verknüpft|gelöst/ })
      .last(),
  ).toBeVisible();
}
async function create(
  page: Page,
  kind: string,
  route: string,
  title: string,
  area?: string,
  project?: string,
) {
  await page.goto(`/${route}/new`);
  const form = page.getByRole("form", {
    name: `${kind} erstellen`,
    exact: true,
  });
  await form
    .getByLabel(kind === "Skill" ? "Name" : "Titel", { exact: true })
    .fill(title);
  if (area) await form.getByLabel("Area", { exact: true }).selectOption(area);
  if (project)
    await form.getByLabel("Project", { exact: true }).selectOption(project);
  await submit(page, `${kind} erstellen`);
  await expect(page).toHaveURL(new RegExp(`/${route}/[0-9a-f-]{36}$`));
  return page.url().split("/").at(-1)!;
}

test("R2-09 external artifacts keep one Resource across scientific and coding contexts", async ({
  page,
  context,
}, info) => {
  test.setTimeout(360000);
  await signUpTechnicalManualUser(page, "r209", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const cookie = (await context.cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(session);
  const { data: auth } = await api.auth.getUser();
  const uid = auth.user!.id;
  const areas = await api
    .from("areas")
    .insert(
      ["Coding", "Education", "Work"].map((name) => ({
        user_id: uid,
        name,
        key: name.toLowerCase() as "coding" | "education" | "work",
      })),
    )
    .select();
  expect(areas.error).toBeNull();
  const stamp = Date.now();
  const skill = await create(
    page,
    "Skill",
    "skills",
    `Scientific Writing ${stamp}`,
  );
  const goal = await create(page, "Goal", "goals", `Abschluss ${stamp}`);
  const records: {
    resource: string;
    project: string;
    task: string;
    title: string;
    url: string;
  }[] = [];
  for (const [area, title, url] of [
    [
      "Education",
      `Bachelorarbeit Dokument ${stamp}`,
      "https://example.org/sciebo/thesis.pdf",
    ],
    [
      "Coding",
      `GitHub Repository ${stamp}`,
      "https://github.com/example/life-os",
    ],
  ]) {
    const project = await create(
      page,
      "Project",
      "projects",
      `${area} Project ${stamp}`,
      areas.data!.find((a) => a.name === area)!.id,
    );
    const task = await create(
      page,
      "Task",
      "tasks",
      `${area} Task ${stamp}`,
      undefined,
      project,
    );
    await page.goto(`/projects/${project}`);
    await expect(
      page.getByRole("region", { name: "Beziehungen" }),
    ).toContainText(`${area} Task ${stamp}`);
    await page
      .getByRole("link", { name: "Resource / externe Referenz erstellen" })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/resources/new\\?project=${project}`),
    );
    const form = page.getByRole("form", {
      name: "Resource erstellen",
      exact: true,
    });
    await form.getByLabel("Titel", { exact: true }).fill(title);
    await form
      .getByLabel("Beschreibung / Kontext")
      .fill(`Reference context ${stamp} ${area}`);
    await form.getByLabel("Typ", { exact: true }).selectOption("link");
    await form.getByLabel("URL", { exact: true }).fill(url);
    for (const [width, height] of [
      [1920, 1080],
      [2560, 1440],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`create-${area}-${width}.png`),
        fullPage: true,
        caret: "initial",
      });
    }
    await submit(page, "Resource erstellen");
    await expect(page).toHaveURL(/\/resources\/[0-9a-f-]{36}\?project=/);
    const resource = new URL(page.url()).pathname.split("/").at(-1)!;
    await page.reload();
    const linkForm = page.getByRole("form", {
      name: "Project verknüpfen",
      exact: true,
    });
    await expect(linkForm.getByLabel("Project", { exact: true })).toHaveValue(
      project,
    );
    await submit(page, "Project verknüpfen");
    await page.reload();
    // Repeating the explicit link must remain idempotent.
    await submit(page, "Project verknüpfen");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Beziehungen" }),
    ).toContainText(`${area} Project ${stamp}`);
    for (const [kind, target] of [
      ["Skill", skill],
      ["Goal", goal],
      ["Task", task],
    ]) {
      await page
        .getByText(`${kind} verknüpfen`, { exact: true })
        .first()
        .click();
      const f = page.getByRole("form", {
        name: `${kind} verknüpfen`,
        exact: true,
      });
      await f.getByLabel(kind, { exact: true }).selectOption(target);
      await submit(page, `${kind} verknüpfen`);
      await page.reload();
    }
    for (const [route, id] of [
      ["tasks", task],
      ["goals", goal],
      ["skills", skill],
      ["projects", project],
    ]) {
      await page.goto(`/${route}/${id}`);
      await page.reload();
      const card = page.locator(`[data-resource-relation="${resource}"]`);
      await expect(card).toContainText(title);
      await expect(card).toContainText(`Reference context ${stamp} ${area}`);
      await expect(
        card.getByRole("link", { name: /Extern öffnen/ }),
      ).toHaveAttribute("href", url);
    }
    records.push({ resource, project, task, title, url });
    for (const route of [
      `/projects/${project}`,
      `/resources/${resource}?project=${project}`,
    ]) {
      await page.goto(route);
      await expect(
        page.getByRole("button", { name: "Änderungen speichern", exact: true }),
      ).toBeEnabled();
      for (const [width, height] of [
        [1920, 1080],
        [2560, 1440],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(
            `${route.startsWith("/projects") ? "project" : "detail"}-${area}-${width}.png`,
          ),
          fullPage: true,
          caret: "initial",
        });
      }
    }
    // Exercise the external navigation without contacting any external provider.
    await context.route(url, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<title>External reference test</title>",
      }),
    );
    const external = page.getByRole("link", { name: /Extern öffnen/ });
    await external.focus();
    await expect(external).toBeFocused();
    const popupPromise = context.waitForEvent("page");
    await external.press("Enter");
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(url);
    await popup.close();
    await page.goto(`/projects/${project}`);
    const card = page.locator(`[data-resource-relation="${resource}"]`);
    await card
      .getByRole("button", { name: "Resource-Verknüpfung lösen" })
      .click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(card).toHaveCount(0);
    const relink = page.getByRole("form", {
      name: "Resource verknüpfen",
      exact: true,
    });
    await relink.getByLabel("Resource", { exact: true }).selectOption(resource);
    await submit(page, "Resource verknüpfen");
    await page.reload();
    await expect(card).toBeVisible();
    await card
      .getByRole("link", { name: `${title} · context`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/resources/${resource}$`));
    await page.goto(
      `/resources?q=${encodeURIComponent(`Reference context ${stamp} ${area}`)}`,
    );
    await expect(page.locator("main")).toContainText(title);
    const stored = await api.from("resources").select("id").eq("title", title);
    expect(stored.data).toEqual([{ id: resource }]);
    const relations = await api
      .from("resource_relations")
      .select("target_type,target_id")
      .eq("resource_id", resource);
    expect(relations.data).toHaveLength(4);
  }
  const first = records[0];
  await page.goto(`/resources/${first.resource}`);
  const edit = page.getByRole("form", {
    name: "Resource bearbeiten",
    exact: true,
  });
  await edit
    .getByLabel("Beschreibung / Kontext")
    .fill(`Edited reference ${stamp}`);
  await edit
    .getByLabel("URL", { exact: true })
    .fill("https://example.org/thesis-final.pdf");
  await submit(page, "Resource bearbeiten");
  await page.reload();
  await expect(edit.getByLabel("Beschreibung / Kontext")).toHaveValue(
    `Edited reference ${stamp}`,
  );
  await expect(
    page.getByRole("link", { name: /Extern öffnen/ }),
  ).toHaveAttribute("href", "https://example.org/thesis-final.pdf");
  await page.goto(`/projects/${first.project}`);
  await expect(
    page.locator(`[data-resource-relation="${first.resource}"]`),
  ).toContainText(`Edited reference ${stamp}`);
  await page.goto("/resources");
  await page
    .getByLabel("Search resources", { exact: true })
    .fill(`Edited reference ${stamp}`);
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await expect(page.locator("main")).toContainText(first.title);
  await page.goto(`/resources/${first.resource}`);
  await submit(page, "Resource archivieren");
  await page.reload();
  await expect(
    edit.getByRole("button", { name: "Änderungen speichern" }),
  ).toBeDisabled();
  await expect(page.getByRole("region", { name: "Beziehungen" })).toContainText(
    `Education Project ${stamp}`,
  );
  await submit(page, "Resource wiederherstellen");
  await page.reload();
  await expect(
    edit.getByRole("button", { name: "Änderungen speichern" }),
  ).toBeEnabled();
  // An unavailable target must visibly fail without discarding or copying the Resource.
  await page.getByText("Project verknüpfen", { exact: true }).first().click();
  const failing = page.getByRole("form", {
    name: "Project verknüpfen",
    exact: true,
  });
  await failing
    .getByLabel("Project", { exact: true })
    .selectOption(first.project);
  await api
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", first.project);
  await failing.getByRole("button").click();
  await expect(failing.getByRole("alert")).toContainText("Prüfe die Angaben");
  await page.reload();
  expect(
    (await api.from("resources").select("id").eq("title", first.title)).data,
  ).toEqual([{ id: first.resource }]);
  await api
    .from("projects")
    .update({ archived_at: null })
    .eq("id", first.project);
  await page.goto(`/resources/${records[0].resource}?project=invalid`);
  await expect(
    page.getByRole("heading", { name: records[0].title, exact: true }),
  ).toBeVisible();
  await page.goto("/projects/new");
  for (const name of ["Coding", "Education", "Work"])
    await expect(
      page
        .getByLabel("Area", { exact: true })
        .locator("option", { hasText: name }),
    ).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("R2-09 create and project context stay blocked outside authenticated Manual", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const profile of ["demo", "empty", "manual"]) {
    await page.goto("/");
    await context.addCookies([
      {
        name: "life_os_profile",
        value: profile,
        url: new URL(page.url()).origin,
      },
    ]);
    for (const route of [
      "/resources/new?project=11111111-1111-4111-8111-111111111111",
      "/resources/11111111-1111-4111-8111-111111111111",
      "/projects/11111111-1111-4111-8111-111111111111",
    ]) {
      await page.goto(route);
      await page.reload();
      await expect(page.locator("main").getByRole("status")).toContainText(
        "Manual-Profil und eine lokale Anmeldung",
      );
      await expect(page.locator("main").getByRole("form")).toHaveCount(0);
      await expect(
        page.locator("main").getByRole("link", { name: /Extern öffnen/ }),
      ).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});
