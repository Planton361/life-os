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

async function screenshotSizes(
  page: Page,
  output: (name: string) => string,
  surface: string,
) {
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("button", {
        name: /Änderungen speichern|Resource erstellen/,
        exact: true,
      }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: output(`${surface}-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
}

async function apiFor(page: Page) {
  const cookie = (await page.context().cookies()).find((c) =>
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
  return api;
}
async function assignProjectResource(page: Page, id: string, role: string) {
  const region = page.getByRole("region", {
    name: "Additional Work Artifacts",
    exact: true,
  });
  const add = region.getByRole("button", {
    name: "+ Artifact hinzufügen",
    exact: true,
  });
  if ((await add.getAttribute("aria-expanded")) === "false") await add.click();
  const form = region.getByRole("form", {
    name: "Mit Project verknüpfen",
    exact: true,
  });
  await form.getByLabel("Resource", { exact: true }).selectOption(id);
  await form.getByLabel("Verwendung im Project").selectOption(role);
  await form.getByRole("button").click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Project-Verwendung gespeichert" })
      .last(),
  ).toBeVisible();
  await page.reload();
}

test("R2-09 explicit project artifacts, references, primary swap, archive and ownership", async ({
  page,
  context,
  browser,
}, info) => {
  test.setTimeout(300000);
  await signUpTechnicalManualUser(page, "r209roles", Date.now());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const api = await apiFor(page);
  const uid = (await api.auth.getUser()).data.user!.id;
  const stamp = Date.now();
  const areas = await api
    .from("areas")
    .insert(
      ["coding", "education", "work"].map((key) => ({
        user_id: uid,
        key: key as "coding" | "education" | "work",
        name: key,
      })),
    )
    .select();
  expect(areas.error).toBeNull();
  const skill = await create(
    page,
    "Skill",
    "skills",
    `LaTeX TypeScript ${stamp}`,
  );
  const goal = await create(page, "Goal", "goals", `Outcome ${stamp}`);
  const projects: string[] = [];
  const resourceIds: string[] = [];
  for (const [key, title] of [
    ["coding", `GitHub Repository ${stamp}`],
    ["education", `Thesis ${stamp}`],
    ["work", `Kundenprojekt Dokument ${stamp}`],
  ]) {
    const project = await create(
      page,
      "Project",
      "projects",
      `${key} Project ${stamp}`,
      areas.data!.find((a) => a.key === key)!.id,
    );
    projects.push(project);
    const task = await create(
      page,
      "Task",
      "tasks",
      `${key} Arbeit ${stamp}`,
      undefined,
      project,
    );
    await page.goto(`/projects/${project}`);
    await expect(
      page.getByRole("region", { name: "Primary Work Artifact", exact: true }),
    ).toContainText("Noch kein Arbeitsartefakt verknüpft");
    await page
      .getByRole("button", { name: "+ Artifact hinzufügen", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Neue externe Referenz anlegen" })
      .click();
    const form = page.getByRole("form", {
      name: "Resource erstellen",
      exact: true,
    });
    await form.getByLabel("Titel", { exact: true }).fill(title);
    await form
      .getByLabel("Beschreibung / Kontext")
      .fill(`Arbeitsgegenstand ${key} ${stamp}`);
    await form.getByLabel("Typ", { exact: true }).selectOption("link");
    const url = `https://example.org/${key}/${stamp}`;
    await form.getByLabel("URL", { exact: true }).fill(url);
    await screenshotSizes(
      page,
      (name) => info.outputPath(name),
      `create-${key}`,
    );
    await submit(page, "Resource erstellen");
    await expect(page).toHaveURL(
      new RegExp(`/projects/${project}\\?resource=`),
    );
    const resource = new URL(page.url()).searchParams.get("resource")!;
    resourceIds.push(resource);
    await expect(
      page
        .getByRole("form", { name: "Mit Project verknüpfen" })
        .getByLabel("Verwendung im Project"),
    ).toHaveValue("");
    expect(
      (
        await api
          .from("resource_relations")
          .select("id")
          .eq("resource_id", resource)
      ).data,
    ).toEqual([]);
    await assignProjectResource(page, resource, "primary_artifact");
    const primary = page.getByRole("region", {
      name: "Primary Work Artifact",
      exact: true,
    });
    await expect(primary.locator("article")).toContainText(title);
    await expect(
      page
        .getByRole("region", { name: "Resources & References", exact: true })
        .locator(`[data-project-resource="${resource}"]`),
    ).toHaveCount(0);
    // New reference via existing canonical Resource UI, then normal Project link.
    const paper = await create(
      page,
      "Resource",
      "resources",
      `Paper Docs ${key} ${stamp}`,
    );
    await page.goto(`/projects/${project}`);
    await page
      .getByRole("button", { name: "Beziehungen verwalten", exact: true })
      .click();
    const ref = page.getByRole("form", {
      name: "Reference verknüpfen",
      exact: true,
    });
    await ref.getByLabel("Resource", { exact: true }).selectOption(paper);
    await ref.getByRole("button").click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Project-Verwendung gespeichert" })
        .last(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Resources & References", exact: true }),
    ).toContainText(`Paper Docs ${key}`);
    await expect(
      primary.locator(`[data-project-resource="${paper}"]`),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Tasks & Progress", exact: true }),
    ).toContainText(`${key} Arbeit`);
    // Current responsive bounds + full surfaces after hydration, no screenshot DOM mutation.
    for (const [width, height] of [
      [1920, 1080],
      [2560, 1440],
      [3840, 2160],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(
        page.getByRole("button", { name: "Bearbeiten", exact: true }),
      ).toBeEnabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`project-${key}-${width}.png`),
        fullPage: true,
        caret: "initial",
      });
    }
    await context.route(url, (r) =>
      r.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<title>Local interception</title>",
      }),
    );
    const external = primary.getByRole("link", { name: /Extern öffnen/ });
    await external.focus();
    const popupPromise = context.waitForEvent("page");
    await external.press("Enter");
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(url);
    await popup.close();
    await primary.getByRole("link", { name: "Details öffnen" }).click();
    await expect(
      page.getByRole("region", { name: "Beziehungen", exact: true }),
    ).toContainText("Primary Work Artifact");
    for (const [kind, target] of [
      ["Skill", skill],
      ["Task", task],
      ["Goal", goal],
    ]) {
      await page
        .locator("summary")
        .filter({ hasText: `${kind} verknüpfen` })
        .click();
      const f = page.getByRole("form", {
        name: `${kind} verknüpfen`,
        exact: true,
      });
      await f.getByLabel(kind, { exact: true }).selectOption(target);
      await submit(page, `${kind} verknüpfen`);
      await page.reload();
    }
    await screenshotSizes(
      page,
      (name) => info.outputPath(name),
      `detail-${key}`,
    );
    // Same Resource is still normal context from the Task/Skill/Goal side.
    for (const [route, id] of [
      ["tasks", task],
      ["skills", skill],
      ["goals", goal],
    ]) {
      await page.goto(`/${route}/${id}`);
      await page.reload();
      await expect(
        page.locator(`[data-resource-relation="${resource}"]`),
      ).toContainText(title);
    }
    expect(
      (await api.from("resources").select("id").eq("title", title)).data,
    ).toEqual([{ id: resource }]);
    await page.goto(`/projects/${project}`);
    // Additional artifact, then explicit promotion through the card's role editor.
    await assignProjectResource(page, paper, "additional_artifact");
    const card = page.locator(`[data-project-resource="${paper}"]`);
    await card
      .getByRole("button", { name: "Artifact verwalten", exact: true })
      .click();
    await card
      .getByLabel("Verwendung im Project")
      .selectOption("primary_artifact");
    await card.getByRole("button", { name: "Verwendung speichern" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Project-Verwendung gespeichert" })
        .last(),
    ).toBeVisible();
    await page.reload();
    await expect(primary.locator("article")).toContainText(`Paper Docs ${key}`);
    await expect(
      page.getByRole("region", {
        name: "Additional Work Artifacts",
        exact: true,
      }),
    ).toContainText(title);
    expect(
      (
        await api
          .from("resource_relations")
          .select("id")
          .eq("target_id", project)
          .eq("project_role", "primary_artifact")
      ).data,
    ).toHaveLength(1);
    await primary
      .getByRole("button", { name: "Artifact verwalten", exact: true })
      .click();
    await primary
      .getByRole("button", { name: "Verknüpfung entfernen" })
      .click();
    await expect(
      primary.locator(`[data-project-resource="${paper}"]`),
    ).toHaveCount(0);
    await page.reload();
    expect(
      (await api.from("resources").select("id").eq("id", paper)).data,
    ).toHaveLength(1);
    await assignProjectResource(page, resource, "primary_artifact");
    await page.goto(`/resources/${resource}`);
    await submit(page, "Resource archivieren");
    await page.reload();
    await page.goto(`/projects/${project}`);
    await expect(primary).toContainText("Kein aktives primäres");
    await expect(
      page.getByRole("region", {
        name: "Additional Work Artifacts",
        exact: true,
      }),
    ).toContainText("Archiviert");
    await assignProjectResource(page, paper, "primary_artifact"); // demotes archived previous Primary, keeps its Resource
    await page.goto(`/resources/${resource}`);
    await submit(page, "Resource wiederherstellen");
    await page.reload();
    await page.goto(`/projects/${project}`);
    await expect(primary.locator("article")).toContainText(`Paper Docs ${key}`);
    await expect(
      page.getByRole("region", {
        name: "Additional Work Artifacts",
        exact: true,
      }),
    ).toContainText(title);
    await page.goto("/resources");
    await page.getByLabel("Search resources", { exact: true }).fill(title);
    await page.getByRole("button", { name: "Suchen", exact: true }).click();
    await expect(page.locator("main")).toContainText(title);
  }
  // A Project-specific role never leaks to another Project or changes relation_type.
  await page.goto(`/projects/${projects[1]}`);
  await assignProjectResource(page, resourceIds[0], "reference");
  await expect(
    page.getByRole("region", { name: "Resources & References", exact: true }),
  ).toContainText(`GitHub Repository ${stamp}`);
  await page.goto(`/resources/${resourceIds[0]}`);
  const projectUse = page
    .getByRole("region", { name: "Beziehungen", exact: true })
    .locator("[data-resource-relation]")
    .filter({ hasText: `education Project ${stamp}` });
  await projectUse
    .getByRole("button", { name: "Resource-Verknüpfung lösen" })
    .click();
  await expect(projectUse).toHaveCount(0);
  await page.reload();
  await page
    .locator("summary")
    .filter({ hasText: "Project verknüpfen" })
    .click();
  const projectForm = page.getByRole("form", {
    name: "Project verknüpfen",
    exact: true,
  });
  await projectForm
    .getByLabel("Project", { exact: true })
    .selectOption(projects[1]);
  await projectForm
    .getByLabel("Verwendung im Project")
    .selectOption("reference");
  await submit(page, "Project verknüpfen");
  await page.reload();
  await expect(projectUse).toContainText("Reference");
  // Concurrent primary selections serialize, preserving exactly one winner and both Resource IDs.
  const set = (id: string) =>
    api.rpc("set_project_resource_role", {
      p_project_id: projects[0],
      p_resource_id: id,
      p_role: "primary_artifact",
    });
  const concurrent = await Promise.all([
    set(resourceIds[0]),
    set(resourceIds[1]),
  ]);
  expect(concurrent.every((r) => !r.error)).toBe(true);
  expect(
    (
      await api
        .from("resource_relations")
        .select("id")
        .eq("target_id", projects[0])
        .eq("project_role", "primary_artifact")
    ).data,
  ).toHaveLength(1);
  // New direct primary cannot bypass the DB uniqueness guarantee.
  const bypass = await api.from("resource_relations").insert({
    user_id: uid,
    resource_id: resourceIds[2],
    target_type: "project",
    target_id: projects[0],
    project_role: "primary_artifact",
  });
  expect(bypass.error).not.toBeNull();
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signUpTechnicalManualUser(otherPage, "r209foreign", Date.now());
  const other = await apiFor(otherPage);
  const foreignId = (await other.auth.getUser()).data.user!.id;
  const foreignProject = await other
    .from("projects")
    .insert({ user_id: foreignId, title: `Foreign ${stamp}` })
    .select()
    .single();
  const foreignResource = await other
    .from("resources")
    .insert({
      user_id: foreignId,
      title: `Foreign resource ${stamp}`,
      type: "link",
    })
    .select()
    .single();
  for (const [client, project, resource] of [
    [other, projects[0], resourceIds[0]],
    [api, projects[0], foreignResource.data!.id],
    [api, foreignProject.data!.id, resourceIds[0]],
  ] as const) {
    expect(
      (
        await client.rpc("set_project_resource_role", {
          p_project_id: project,
          p_resource_id: resource,
          p_role: "primary_artifact",
        })
      ).error,
    ).not.toBeNull();
  }
  expect(
    (
      await other.from("resource_relations").insert({
        user_id: foreignId,
        resource_id: foreignResource.data!.id,
        target_type: "project",
        target_id: projects[0],
        project_role: "additional_artifact",
      })
    ).error,
  ).not.toBeNull();
  await page.goto(`/projects/${projects[0]}`);
  // Server-action failure remains visible when a selected endpoint is archived after loading.
  const active = page.getByRole("region", {
    name: "Additional Work Artifacts",
    exact: true,
  });
  await active
    .getByRole("button", { name: "+ Artifact hinzufügen", exact: true })
    .click();
  const f = active.getByRole("form", { name: "Mit Project verknüpfen" });
  await f.getByLabel("Resource", { exact: true }).selectOption(resourceIds[2]);
  await f.getByLabel("Verwendung im Project").selectOption("primary_artifact");
  await api
    .from("resources")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", resourceIds[2]);
  await f.getByRole("button").click();
  await expect(f.getByRole("alert")).toContainText("Prüfe die Angaben");
  // An archived Project stays history; its association can still be removed from Resource Detail.
  await api
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", projects[1]);
  await page.goto(`/resources/${resourceIds[0]}`);
  const archivedProjectUse = page
    .getByRole("region", { name: "Beziehungen", exact: true })
    .locator("[data-resource-relation]")
    .filter({ hasText: `education Project ${stamp}` });
  await archivedProjectUse
    .getByRole("button", { name: "Resource-Verknüpfung lösen" })
    .click();
  await expect(archivedProjectUse).toHaveCount(0);
  await page.reload();
  await expect(archivedProjectUse).toHaveCount(0);
  await otherContext.close();
  expect(
    (await api.from("resources").select("id").in("id", resourceIds)).data,
  ).toHaveLength(3);
  expect((await api.from("resources").select("id")).data).toHaveLength(6);
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
