import { expect, test, type Page } from "@playwright/test";

import { signUpTechnicalManualUser } from "./support/local-manual-auth";

type ApiResult<T> = {
  body: T | null;
  ok: boolean;
};

type ProjectRow = {
  area_id: string;
  id: string;
};

type ResourceRow = {
  id: string;
};

async function authenticatedApiToken(page: Page) {
  const cookie = (await page.context().cookies()).find((item) =>
    item.name.includes("auth-token"),
  );
  if (!cookie) throw new Error("Missing isolated Supabase auth cookie.");

  const encoded = cookie.value.startsWith("base64-")
    ? cookie.value.slice("base64-".length)
    : cookie.value;
  const session = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as { access_token?: string };
  if (!session.access_token) {
    throw new Error("Missing isolated Supabase access token.");
  }
  return session.access_token;
}

async function authenticatedApi<T>(
  page: Page,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const token = await authenticatedApiToken(page);
  const response = await page.request.fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`,
    {
      data: body,
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
        Authorization: `Bearer ${token}`,
        Prefer: "return=representation",
      },
      method,
    },
  );
  const text = await response.text();
  let parsed: T | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = null;
    }
  }
  return { body: parsed, ok: response.ok() };
}

async function createEducationProject(page: Page, title: string) {
  await page.goto("/education");
  const form = page.locator('form[aria-label="Education Project erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByRole("button", { name: "Education Project erstellen" }).click();
  await expect(
    page.locator("[data-education-action-status]"),
  ).toHaveText("Education Project erstellt.");
  const projectId = new URL(page.url()).searchParams.get("selected");
  expect(projectId).toBeTruthy();
  return projectId!;
}

async function createResource(page: Page, title: string) {
  await page.goto("/resources");
  const form = page.locator('form[aria-label="Resource erstellen"]');
  await form.getByLabel("Titel").fill(title);
  await form.getByRole("button", { name: "Resource speichern" }).click();
  await expect(page.getByText("Resource erstellt.", { exact: true })).toBeVisible();
  const resourceId = new URL(page.url()).searchParams.get("selected");
  expect(resourceId).toBeTruthy();
  return resourceId!;
}

test("Z1 creates Education literature atomically and keeps canonical Resource projections reload-stable", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const projectTitle = `Z1 Literature Project ${stamp}`;
  const literatureTitle = `Z1 Atomic Literature ${stamp}`;
  const existingTitle = `Z1 Existing Resource ${stamp}`;

  await signUpTechnicalManualUser(page, "z1-education-literature", stamp);
  const projectId = await createEducationProject(page, projectTitle);

  const literatureForm = page.locator('form[aria-label="Literatur erstellen"]');
  await literatureForm.getByLabel("Titel").fill(literatureTitle);
  await literatureForm.getByLabel("Notiz").fill("Canonical literature Resource.");
  await literatureForm.getByLabel("URL").fill(`https://example.test/${stamp}`);
  await literatureForm.getByRole("button", { name: "Literatur speichern und verknüpfen" }).click();
  await expect(
    page.locator("[data-education-action-status]"),
  ).toHaveText("Literatur erstellt und verknüpft.");
  const literatureCard = page
    .locator("[data-education-resource-card]")
    .filter({ hasText: literatureTitle });
  await expect(literatureCard).toHaveCount(1);
  await page.reload();
  await expect(literatureCard).toHaveCount(1);

  await literatureCard.getByRole("link", { name: literatureTitle }).click();
  await page.getByRole("link", { name: "Resource öffnen" }).click();
  await expect(page.getByText(literatureTitle, { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(literatureTitle, { exact: true }).first()).toBeVisible();

  const existingResourceId = await createResource(page, existingTitle);
  await page.goto(`/education?selected=${projectId}`);
  const existingLinkForm = page.locator(
    'form[aria-label="Bestehende Resource verknüpfen"]',
  );
  await existingLinkForm.getByLabel("Resource").selectOption(existingResourceId);
  await existingLinkForm.getByRole("button", { name: "Resource verknüpfen" }).click();
  await expect(
    page.locator("[data-education-action-status]"),
  ).toHaveText("Literatur verknüpft.");
  const existingCard = page
    .locator("[data-education-resource-card]")
    .filter({ hasText: existingTitle });
  await expect(existingCard).toHaveCount(1);
  await page.reload();
  await expect(existingCard).toHaveCount(1);
});

test("Z1 rejects cross-user Literature create-and-link without partial rows and deduplicates retry", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const projectId = await (async () => {
    await signUpTechnicalManualUser(page, "z1-literature-api-owner", stamp);
    return createEducationProject(page, `Z1 API Education ${stamp}`);
  })();
  const ownProject = await authenticatedApi<ProjectRow[]>(
    page,
    "GET",
    `/rest/v1/projects?id=eq.${projectId}&select=id,area_id`,
  );
  expect(ownProject.ok).toBeTruthy();
  const areaId = ownProject.body?.[0]?.area_id;
  expect(areaId).toBeTruthy();

  const foreignPage = await browser.newPage();
  try {
    await signUpTechnicalManualUser(foreignPage, "z1-literature-api-foreign", stamp);
    const foreignProjectId = await createEducationProject(
      foreignPage,
      `Z1 Foreign Education ${stamp}`,
    );
    const failedTitle = `Z1 Rejected Literature ${stamp}`;
    const before = await authenticatedApi<ResourceRow[]>(
      page,
      "GET",
      `/rest/v1/resources?title=eq.${encodeURIComponent(failedTitle)}&select=id`,
    );
    expect(before.ok).toBeTruthy();
    const rejected = await authenticatedApi<ResourceRow>(
      page,
      "POST",
      "/rest/v1/rpc/create_education_literature_resource",
      {
        p_area_id: areaId,
        p_project_id: foreignProjectId,
        p_title: failedTitle,
        p_type: "research",
      },
    );
    expect(rejected.ok).toBeFalsy();
    const after = await authenticatedApi<ResourceRow[]>(
      page,
      "GET",
      `/rest/v1/resources?title=eq.${encodeURIComponent(failedTitle)}&select=id`,
    );
    expect(after.ok).toBeTruthy();
    expect(after.body).toEqual(before.body);
  } finally {
    await foreignPage.close();
  }

  const title = `Z1 Retry Literature ${stamp}`;
  const args = {
    p_area_id: areaId,
    p_project_id: projectId,
    p_summary: "Exactly one canonical row after retry.",
    p_title: title,
    p_type: "research",
    p_url: `https://example.test/retry-${stamp}`,
  };
  const first = await authenticatedApi<ResourceRow>(
    page,
    "POST",
    "/rest/v1/rpc/create_education_literature_resource",
    args,
  );
  const retry = await authenticatedApi<ResourceRow>(
    page,
    "POST",
    "/rest/v1/rpc/create_education_literature_resource",
    args,
  );
  expect(first.ok).toBeTruthy();
  expect(retry.ok).toBeTruthy();
  expect(retry.body?.id).toBe(first.body?.id);

  const resourceRows = await authenticatedApi<ResourceRow[]>(
    page,
    "GET",
    `/rest/v1/resources?title=eq.${encodeURIComponent(title)}&select=id`,
  );
  const relationRows = await authenticatedApi<ResourceRow[]>(
    page,
    "GET",
    `/rest/v1/resource_relations?resource_id=eq.${first.body?.id}&target_id=eq.${projectId}&target_type=eq.project&relation_type=eq.source&select=id`,
  );
  expect(resourceRows.ok).toBeTruthy();
  expect(relationRows.ok).toBeTruthy();
  expect(resourceRows.body).toHaveLength(1);
  expect(relationRows.body).toHaveLength(1);
});
