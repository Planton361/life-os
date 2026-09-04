import { expect, test, type Page } from "@playwright/test";

import { signUpTechnicalManualUser } from "./support/local-manual-auth";

type ApiResult<T> = {
  body: T | null;
  ok: boolean;
  status: number;
};

type InboxRow = {
  created_task_id: string | null;
  id: string;
  status: string;
};

type TaskRow = {
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
  ) as {
    access_token?: string;
  };
  if (!session.access_token)
    throw new Error("Missing isolated Supabase access token.");
  return session.access_token;
}

async function authenticatedUserId(page: Page) {
  const token = await authenticatedApiToken(page);
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Malformed isolated Supabase access token.");
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as {
    sub?: string;
  };
  if (!claims.sub) throw new Error("Missing isolated Supabase user id.");
  return claims.sub;
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

  return { body: parsed, ok: response.ok(), status: response.status() };
}

async function insertOne<T>(
  page: Page,
  table: string,
  row: Record<string, unknown>,
) {
  const result = await authenticatedApi<T[]>(
    page,
    "POST",
    `/rest/v1/${table}`,
    [row],
  );
  expect(result.ok).toBeTruthy();
  const value = result.body?.[0];
  expect(value).toBeTruthy();
  return value as T;
}

async function createInboxItem(page: Page, title: string) {
  const userId = await authenticatedUserId(page);
  return insertOne<InboxRow>(page, "inbox_items", {
    status: "raw",
    title,
    type: "note",
    user_id: userId,
  });
}

async function callTriage(page: Page, inboxItemId: string, skillId?: string) {
  return authenticatedApi<TaskRow>(
    page,
    "POST",
    "/rest/v1/rpc/triage_inbox_item_to_task",
    {
      p_inbox_item_id: inboxItemId,
      p_skill_id: skillId,
      p_title: `Triage task ${inboxItemId.slice(0, 8)}`,
    },
  );
}

async function createSkill(page: Page, title: string) {
  await page.goto("/portfolio?view=skills");
  const form = page.locator('form[aria-label="Skill erstellen"]');
  await form.getByLabel("Skill-Name").fill(title);
  await form.getByRole("button", { name: "Skill erstellen" }).click();
  await expect(page.getByText("Skill erstellt.").first()).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected");
  expect(id).toBeTruthy();
  return id!;
}

test("Z1 triages Inbox to exactly one Task↔Skill context link and reloads both backlinks", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const skillTitle = `Z1 Inbox Skill ${stamp}`;
  const noteTitle = `Z1 Inbox Note ${stamp}`;
  const captureTitle = `Z1 Inbox Task Skill ${stamp}`;

  await signUpTechnicalManualUser(page, "z1-inbox-task-skill", stamp);
  const skillId = await createSkill(page, skillTitle);

  await page.goto("/inbox");
  const capture = page.locator('form[aria-label="Inbox Quick Capture"]');
  await capture
    .getByRole("textbox", { name: "Quick Capture", exact: true })
    .fill(noteTitle);
  await capture
    .getByLabel("Quick Capture note")
    .fill("Canonical Note Resource.");
  await capture.getByRole("button", { name: "Capture" }).click();
  await page.getByText(noteTitle, { exact: true }).first().click();
  await page.locator('[data-outcome-route="knowledge_resource"]').click();
  const resourceDraft = page
    .getByRole("heading", { name: "Resource Draft" })
    .locator("xpath=ancestor::section[1]");
  await resourceDraft.getByLabel("Resource Typ").selectOption("note");
  await resourceDraft
    .getByRole("button", { name: "Resource erstellen" })
    .click();
  await page.goto("/resources");
  await expect(
    page.getByText(noteTitle, { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(noteTitle, { exact: true }).first(),
  ).toBeVisible();

  await page.goto("/inbox");
  await capture
    .getByRole("textbox", { name: "Quick Capture", exact: true })
    .fill(captureTitle);
  await capture
    .getByLabel("Quick Capture note")
    .fill("Atomic task-to-skill context.");
  await capture.getByRole("button", { name: "Capture" }).click();
  await expect(
    page.getByText(captureTitle, { exact: true }).first(),
  ).toBeVisible();

  await page.getByText(captureTitle, { exact: true }).first().click();
  await page.locator('[data-outcome-route="add_to_existing"]').click();
  const draft = page.locator("section", {
    hasText: "Bestehendem Objekt zuordnen",
  });
  await draft.getByRole("button", { name: "Skill" }).click();
  await expect(draft.getByLabel("Existing target")).toHaveValue(skillId);
  await draft.getByRole("button", { name: "Task-Beitrag erstellen" }).click();
  await expect(
    page.getByRole("heading", { name: "Task erstellt" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Task erstellt" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Portfolio öffnen" }).click();
  const taskRegion = page.locator('[data-task-skill-region="task"]');
  await expect(
    taskRegion.getByRole("link", { name: skillTitle }),
  ).toBeVisible();
  await page.reload();
  await expect(
    taskRegion.getByRole("link", { name: skillTitle }),
  ).toBeVisible();

  await taskRegion.getByRole("link", { name: skillTitle }).click();
  const skillRegion = page.locator('[data-task-skill-region="skill"]');
  await expect(
    skillRegion.getByRole("link", { name: captureTitle }),
  ).toBeVisible();
  await expect(
    page.getByText("Noch keine Skill Evidence gespeichert."),
  ).toBeVisible();
  await page.reload();
  await expect(
    skillRegion.getByRole("link", { name: captureTitle }),
  ).toBeVisible();
});

test("Z1 rejects invalid Inbox Skill triage atomically and preserves no-Skill triage", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "z1-inbox-task-skill-api", stamp);
  const userId = await authenticatedUserId(page);
  const anonymousAttempt = await page.request.post(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/triage_inbox_item_to_task`,
    {
      data: {
        p_inbox_item_id: "00000000-0000-4000-8000-000000000002",
        p_title: "Anonymous triage",
      },
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
    },
  );
  expect(anonymousAttempt.ok()).toBeFalsy();
  const ownSkill = await insertOne<{ id: string }>(page, "skills", {
    name: `Z1 API Skill ${stamp}`,
    status: "active",
    user_id: userId,
  });

  const idempotentInbox = await createInboxItem(page, `Z1 idempotent ${stamp}`);
  const first = await callTriage(page, idempotentInbox.id, ownSkill.id);
  const retry = await callTriage(page, idempotentInbox.id, ownSkill.id);
  expect(first.ok).toBeTruthy();
  expect(retry.ok).toBeTruthy();
  expect(retry.body?.id).toBe(first.body?.id);

  const taskId = first.body?.id;
  expect(taskId).toBeTruthy();
  const [taskRows, linkRows, inboxRows, evidenceRows] = await Promise.all([
    authenticatedApi<TaskRow[]>(
      page,
      "GET",
      `/rest/v1/tasks?source_inbox_item_id=eq.${idempotentInbox.id}&select=id`,
    ),
    authenticatedApi<Array<{ id: string }>>(
      page,
      "GET",
      `/rest/v1/task_skill_links?task_id=eq.${taskId}&skill_id=eq.${ownSkill.id}&select=id`,
    ),
    authenticatedApi<InboxRow[]>(
      page,
      "GET",
      `/rest/v1/inbox_items?id=eq.${idempotentInbox.id}&select=id,status,created_task_id`,
    ),
    authenticatedApi<Array<{ id: string }>>(
      page,
      "GET",
      `/rest/v1/skill_evidence?skill_id=eq.${ownSkill.id}&select=id`,
    ),
  ]);
  expect(taskRows.body).toHaveLength(1);
  expect(linkRows.body).toHaveLength(1);
  expect(inboxRows.body).toEqual([
    expect.objectContaining({ created_task_id: taskId, status: "triaged" }),
  ]);
  expect(evidenceRows.body).toHaveLength(0);

  const withoutSkillInbox = await createInboxItem(page, `Z1 no skill ${stamp}`);
  const withoutSkill = await callTriage(page, withoutSkillInbox.id);
  expect(withoutSkill.ok).toBeTruthy();
  const withoutSkillLinks = await authenticatedApi<Array<{ id: string }>>(
    page,
    "GET",
    `/rest/v1/task_skill_links?task_id=eq.${withoutSkill.body?.id}&select=id`,
  );
  expect(withoutSkillLinks.body).toHaveLength(0);

  const foreignContext = await browser.newContext();
  const foreignPage = await foreignContext.newPage();
  await signUpTechnicalManualUser(foreignPage, "z1-inbox-foreign-skill", stamp);
  const foreignSkill = await createSkill(
    foreignPage,
    `Z1 foreign Skill ${stamp}`,
  );
  await foreignContext.close();

  const foreignInbox = await createInboxItem(page, `Z1 foreign ${stamp}`);
  const foreignAttempt = await callTriage(page, foreignInbox.id, foreignSkill);
  const invalidInbox = await createInboxItem(page, `Z1 invalid ${stamp}`);
  const invalidAttempt = await callTriage(
    page,
    invalidInbox.id,
    "00000000-0000-4000-8000-000000000001",
  );
  const archivedSkill = await insertOne<{ id: string }>(page, "skills", {
    archived_at: new Date().toISOString(),
    name: `Z1 archived Skill ${stamp}`,
    status: "archived",
    user_id: userId,
  });
  const archivedInbox = await createInboxItem(page, `Z1 archived ${stamp}`);
  const archivedAttempt = await callTriage(
    page,
    archivedInbox.id,
    archivedSkill.id,
  );

  expect(foreignAttempt.ok).toBeFalsy();
  expect(invalidAttempt.ok).toBeFalsy();
  expect(archivedAttempt.ok).toBeFalsy();

  for (const inboxItem of [foreignInbox, invalidInbox, archivedInbox]) {
    const [state, tasks] = await Promise.all([
      authenticatedApi<InboxRow[]>(
        page,
        "GET",
        `/rest/v1/inbox_items?id=eq.${inboxItem.id}&select=id,status,created_task_id`,
      ),
      authenticatedApi<TaskRow[]>(
        page,
        "GET",
        `/rest/v1/tasks?source_inbox_item_id=eq.${inboxItem.id}&select=id`,
      ),
    ]);
    expect(state.body).toEqual([
      expect.objectContaining({ created_task_id: null, status: "raw" }),
    ]);
    expect(tasks.body).toHaveLength(0);
  }
});
