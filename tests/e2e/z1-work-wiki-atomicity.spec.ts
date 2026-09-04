import { expect, test, type Page } from "@playwright/test";

import { signUpTechnicalManualUser } from "./support/local-manual-auth";

type ApiResult<T> = { body: T | null; ok: boolean };
type ProjectRow = { area_id: string; id: string };
type ResourceRow = { id: string };

async function authenticatedApiToken(page: Page) {
  const cookie = (await page.context().cookies()).find((item) =>
    item.name.includes("auth-token"),
  );
  if (!cookie) throw new Error("Missing isolated Supabase auth cookie.");
  const encoded = cookie.value.startsWith("base64-")
    ? cookie.value.slice("base64-".length)
    : cookie.value;
  const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    access_token?: string;
  };
  if (!session.access_token) throw new Error("Missing isolated Supabase access token.");
  return session.access_token;
}

async function authenticatedApi<T>(page: Page, method: "GET" | "POST", path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = await authenticatedApiToken(page);
  const response = await page.request.fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    data: body,
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
    method,
  });
  const text = await response.text();
  let parsed: T | null = null;
  if (text) {
    try { parsed = JSON.parse(text) as T; } catch { parsed = null; }
  }
  return { body: parsed, ok: response.ok() };
}

async function createWorkProject(page: Page, title: string) {
  await page.goto("/work");
  const form = page.locator('form[aria-label="Work Project erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByRole("button", { name: "Work Project erstellen" }).click();
  await expect(page.locator("[data-work-action-status]")).toHaveText("Work Project erstellt.");
  const projectId = new URL(page.url()).searchParams.get("selected");
  expect(projectId).toBeTruthy();
  return projectId!;
}

test("Z1 creates a Work Wiki Resource with its Project context and reloads the canonical projections", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const projectTitle = `Z1 Work Project ${stamp}`;
  const wikiTitle = `Z1 Atomic Work Wiki ${stamp}`;

  await signUpTechnicalManualUser(page, "z1-work-wiki", stamp);
  const projectId = await createWorkProject(page, projectTitle);
  const wikiForm = page.locator('form[aria-label="Work Wiki erstellen"]');
  await wikiForm.getByLabel("Titel").fill(wikiTitle);
  await wikiForm.getByLabel("Inhalt").fill("Canonical Work Wiki Resource.");
  await wikiForm.getByLabel("Work Project (optional)").selectOption(projectId);
  await wikiForm.getByRole("button", { name: "Wiki-Eintrag erstellen" }).click();
  await expect(page.locator("[data-work-action-status]")).toHaveText("Work Wiki erstellt.");
  const wikiId = new URL(page.url()).searchParams.get("wiki");
  expect(wikiId).toBeTruthy();
  const wikiCard = page.locator("[data-work-wiki-card]").filter({ hasText: wikiTitle });
  await expect(wikiCard).toHaveCount(1);
  await expect(wikiCard.getByRole("link", { name: projectTitle })).toHaveAttribute(
    "href",
    new RegExp(`/portfolio\\?view=projects&selected=${projectId}`),
  );
  await page.reload();
  await expect(wikiCard).toHaveCount(1);

  const resourceBacklink = page
    .locator('[data-work-region="project-context"]')
    .getByRole("link", { name: wikiTitle });
  await expect(resourceBacklink).toBeVisible();
  await resourceBacklink.click();
  await expect(page.getByText(wikiTitle, { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(wikiTitle, { exact: true }).first()).toBeVisible();
});

test("Z1 rejects cross-user Work Wiki context atomically and deduplicates retry", async ({ browser, page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "z1-work-wiki-owner", stamp);
  const ownProjectId = await createWorkProject(page, `Z1 API Work ${stamp}`);
  const ownProject = await authenticatedApi<ProjectRow[]>(page, "GET", `/rest/v1/projects?id=eq.${ownProjectId}&select=id,area_id`);
  expect(ownProject.ok).toBeTruthy();
  const areaId = ownProject.body?.[0]?.area_id;
  expect(areaId).toBeTruthy();

  const foreignPage = await browser.newPage();
  try {
    await signUpTechnicalManualUser(foreignPage, "z1-work-wiki-foreign", stamp);
    const foreignProjectId = await createWorkProject(foreignPage, `Z1 Foreign Work ${stamp}`);
    const rejectedTitle = `Z1 Rejected Work Wiki ${stamp}`;
    const before = await authenticatedApi<ResourceRow[]>(page, "GET", `/rest/v1/resources?title=eq.${encodeURIComponent(rejectedTitle)}&select=id`);
    const rejected = await authenticatedApi<ResourceRow>(page, "POST", "/rest/v1/rpc/create_work_wiki_resource", {
      p_area_id: areaId,
      p_body: "Must never become a Resource.",
      p_project_id: foreignProjectId,
      p_title: rejectedTitle,
    });
    expect(rejected.ok).toBeFalsy();
    const after = await authenticatedApi<ResourceRow[]>(page, "GET", `/rest/v1/resources?title=eq.${encodeURIComponent(rejectedTitle)}&select=id`);
    expect(after.ok).toBeTruthy();
    expect(after.body).toEqual(before.body);

    const uiRejectedTitle = `Z1 UI Rejected Work Wiki ${stamp}`;
    await page.goto(`/work?selected=${ownProjectId}`);
    const wikiForm = page.locator('form[aria-label="Work Wiki erstellen"]');
    await wikiForm.getByLabel("Titel").fill(uiRejectedTitle);
    await wikiForm.getByLabel("Inhalt").fill("Must not survive a failed Work relation.");
    await wikiForm.locator('select[name="projectId"]').evaluate((select, foreignId) => {
      const projectSelect = select as HTMLSelectElement;
      const option = document.createElement("option");
      option.value = foreignId;
      projectSelect.append(option);
      projectSelect.value = foreignId;
    }, foreignProjectId);
    await wikiForm.getByRole("button", { name: "Wiki-Eintrag erstellen" }).click();
    await expect(page.locator("[data-work-action-status]")).toHaveText(
      "Work Wiki konnte nicht gespeichert werden.",
    );
    const uiAfter = await authenticatedApi<ResourceRow[]>(page, "GET", `/rest/v1/resources?title=eq.${encodeURIComponent(uiRejectedTitle)}&select=id`);
    expect(uiAfter.ok).toBeTruthy();
    expect(uiAfter.body).toHaveLength(0);
  } finally {
    await foreignPage.close();
  }

  const title = `Z1 Retry Work Wiki ${stamp}`;
  const args = {
    p_area_id: areaId,
    p_body: "Exactly one Work Wiki Resource after retry.",
    p_project_id: ownProjectId,
    p_title: title,
  };
  const first = await authenticatedApi<ResourceRow>(page, "POST", "/rest/v1/rpc/create_work_wiki_resource", args);
  const retry = await authenticatedApi<ResourceRow>(page, "POST", "/rest/v1/rpc/create_work_wiki_resource", args);
  expect(first.ok).toBeTruthy();
  expect(retry.ok).toBeTruthy();
  expect(retry.body?.id).toBe(first.body?.id);

  const [resources, relations] = await Promise.all([
    authenticatedApi<ResourceRow[]>(page, "GET", `/rest/v1/resources?title=eq.${encodeURIComponent(title)}&select=id`),
    authenticatedApi<ResourceRow[]>(page, "GET", `/rest/v1/resource_relations?resource_id=eq.${first.body?.id}&target_id=eq.${ownProjectId}&target_type=eq.project&relation_type=eq.context&select=id`),
  ]);
  expect(resources.ok).toBeTruthy();
  expect(relations.ok).toBeTruthy();
  expect(resources.body).toHaveLength(1);
  expect(relations.body).toHaveLength(1);
});
