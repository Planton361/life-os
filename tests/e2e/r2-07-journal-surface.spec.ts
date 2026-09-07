import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
import type { Database } from "@/types/supabase";

const sizes = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
  { width: 390, height: 844 },
];
const surface = (page: Page) => page.locator("#journal-page");
const history = (page: Page) =>
  page.getByRole("region", { name: "Journal-Verlauf", exact: true });
const selected = (page: Page) =>
  page.getByRole("region", { name: "Ausgewählter Eintrag", exact: true });
async function open(page: Page, href = "/life/journal") {
  await page.goto(href);
  await expect(surface(page)).toBeVisible();
}
function watch(page: Page) {
  const messages: string[] = [];
  page.on("pageerror", (error) => messages.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      messages.push(message.text());
  });
  return messages;
}
async function signInDb(prefix: string, stamp: number) {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const result = await db.auth.signInWithPassword({
    email: `${prefix}-${stamp}@example.local`,
    password: `C1proof-${stamp}`,
  });
  expect(result.error).toBeNull();
  return { db, userId: result.data.user!.id };
}
async function snapshot(
  page: Page,
  name: string,
  size: { width: number; height: number },
) {
  await page.setViewportSize(size);
  await expect(surface(page)).toBeVisible();
  const geometry = await page.evaluate(() => {
    const node = document.querySelector("#journal-page")!;
    const sections = [
      ...node.querySelectorAll(".journal-columns > section"),
    ].map((e) => {
      const r = e.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      empty: node.querySelector('.journal-columns[data-empty="true"]') !== null,
      sections,
    };
  });
  expect(geometry.width).toBeLessThanOrEqual(size.width);
  if (size.width >= 1024) {
    expect(geometry.height).toBeLessThanOrEqual(size.height);
    expect(geometry.sections[0].right).toBeLessThan(geometry.sections[1].left);
    for (const box of geometry.sections) {
      expect(box.bottom).toBeLessThanOrEqual(size.height);
      if (geometry.empty) expect(box.bottom - box.top).toBeLessThan(500);
      else expect(box.bottom).toBeGreaterThan(size.height - 40);
    }
  }
  await page.screenshot({
    path: test.info().outputPath(`${name}-${size.width}.png`),
    fullPage: true,
  });
}

test("R2-07 real journal lifecycle, URL search, detail and navigation", async ({
  page,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  const errors = watch(page);
  const stamp = Date.now();
  const title = `Abendreflexion ${stamp}`;
  await page.setViewportSize(sizes[0]);
  await signUpTechnicalManualUser(page, "journal-flow", stamp);
  const { db, userId } = await signInDb("journal-flow", stamp);
  await open(page);
  await expect(
    history(page).getByRole("heading", {
      name: "Noch keine Journal-Einträge.",
      exact: true,
    }),
  ).toBeVisible();
  for (const size of sizes) await snapshot(page, "empty", size);
  await page.setViewportSize(sizes[0]);
  await history(page)
    .getByRole("link", { name: "Neuer Eintrag", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Neuer Eintrag" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).not.toHaveURL(/panel=new/);
  await surface(page)
    .getByRole("link", { name: "Neuer Eintrag", exact: true })
    .first()
    .click();
  const create = page.getByRole("dialog", {
    name: "Neuer Eintrag",
    exact: true,
  });
  await expect(create).toBeVisible();
  await create.getByLabel("Titel (optional)").fill(title);
  const today = await create.getByLabel("Datum", { exact: true }).inputValue();
  await create.getByLabel("Inhalt", { exact: true }).fill("   ");
  await create.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(create.getByRole("alert")).toContainText("Bitte prüfe");
  await create
    .getByLabel("Inhalt", { exact: true })
    .fill(
      "Heute habe ich über die nächsten Schritte nachgedacht.\nEin freier Gedanke bleibt hier erhalten.",
    );
  await create.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(create).not.toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Journal-Eintrag erstellt." }),
  ).toBeVisible();
  await expect(
    selected(page).getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const id = new URL(page.url()).searchParams.get("selected")!;
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  await page.reload();
  await expect(selected(page)).toContainText(
    "Ein freier Gedanke bleibt hier erhalten.",
  );
  await history(page).locator(`[data-journal-entry="${id}"]`).click();
  await selected(page)
    .getByRole("link", { name: "Details öffnen", exact: true })
    .click();
  const detail = page.getByRole("dialog", { name: title, exact: true });
  await expect(detail).toBeVisible();
  const detailUrl = page.url();
  await page.reload();
  await expect(detail).toContainText(
    "Ein freier Gedanke bleibt hier erhalten.",
  );
  await detail.getByRole("button", { name: "Schließen", exact: true }).click();
  await selected(page)
    .getByRole("link", { name: "Bearbeiten", exact: true })
    .click();
  let editor = page.getByRole("dialog", {
    name: "Eintrag bearbeiten",
    exact: true,
  });
  await editor
    .getByLabel("Inhalt", { exact: true })
    .fill("Überarbeitete Reflexion mit Suchwort Abendruhe.");
  await editor.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Journal-Eintrag gespeichert." }),
  ).toBeVisible();
  await page.reload();
  await expect(selected(page)).toContainText("Abendruhe");
  const filters = page.getByRole("form", {
    name: "Journal durchsuchen und filtern",
  });
  await filters.getByLabel("Suche", { exact: true }).fill("ABENDRUHE");
  await filters.getByRole("button", { name: "Anwenden" }).click();
  await expect(page).toHaveURL(/q=ABENDRUHE/);
  await expect(history(page).locator("[data-journal-entry]")).toHaveCount(1);
  await page.reload();
  await expect(filters.getByLabel("Suche", { exact: true })).toHaveValue(
    "ABENDRUHE",
  );
  for (const period of ["today", "week", "month"]) {
    await filters.getByLabel("Zeitraum").selectOption(period);
    await filters.getByRole("button", { name: "Anwenden" }).click();
    await expect(page).toHaveURL(new RegExp(`period=${period}`));
    await expect(history(page).locator("[data-journal-entry]")).toHaveCount(1);
  }
  await filters.getByLabel("Suche", { exact: true }).fill("nicht-vorhanden");
  await filters.getByRole("button", { name: "Anwenden" }).click();
  await expect(
    history(page).getByRole("heading", { name: "Keine passenden Einträge." }),
  ).toBeVisible();
  await page.goBack();
  await expect(history(page).locator("[data-journal-entry]")).toHaveCount(1);
  await page.goForward();
  await expect(history(page).locator("[data-journal-entry]")).toHaveCount(0);
  await filters.getByRole("link", { name: "Zurücksetzen" }).click();
  await expect(history(page).locator("[data-journal-entry]")).toHaveCount(1);
  // The existing Today projection has no Journal source: no invented event or edit event.
  await page.goto("/today");
  await expect(page.locator("#today-page")).not.toContainText(title);
  await open(page, detailUrl);
  await detail.getByRole("link", { name: "Bearbeiten", exact: true }).click();
  editor = page.getByRole("dialog", {
    name: "Eintrag bearbeiten",
    exact: true,
  });
  for (const size of sizes) {
    await page.setViewportSize(size);
    const box = await editor.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(size.width);
    expect(box!.height).toBeLessThanOrEqual(size.height);
    await page.screenshot({
      path: test.info().outputPath(`editor-${size.width}.png`),
      fullPage: true,
    });
  }
  await editor.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect(page).not.toHaveURL(/panel=edit/);
  const rows = Array.from({ length: 45 }, (_, index) => ({
    user_id: userId,
    title: `Verlauf ${index}`,
    body: `Persönlicher Eintrag ${index}\n${"Eine längere Reflexion. ".repeat(90)}`,
    entry_date: today,
  }));
  expect((await db.from("journal_entries").insert(rows)).error).toBeNull();
  await page.reload();
  await selected(page).getByRole("link", { name: "Details öffnen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await history(page)
    .getByRole("link")
    .filter({ hasText: "Verlauf 0" })
    .click();
  for (const size of sizes) {
    await snapshot(page, "populated", size);
    if (size.width < 1024) {
      expect(
        await history(page).locator("[data-journal-list]").evaluate((node) =>
          node.scrollHeight > node.clientHeight && node.clientHeight <= window.innerHeight * 0.66,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize(sizes[0]);
  expect(
    await history(page)
      .locator("[data-journal-list]")
      .evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  await open(page, `/life/journal?selected=${id}`);
  await selected(page)
    .getByRole("link", { name: "Archivieren", exact: true })
    .click();
  let archive = page.getByRole("dialog", { name: "Eintrag archivieren?" });
  await archive.getByRole("button", { name: "Abbrechen" }).click();
  await expect(archive).not.toBeVisible();
  await selected(page)
    .getByRole("link", { name: "Archivieren", exact: true })
    .click();
  archive = page.getByRole("dialog", { name: "Eintrag archivieren?" });
  await archive
    .getByRole("button", { name: "Archivieren", exact: true })
    .click();
  await expect(archive).not.toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Journal-Eintrag archiviert." }),
  ).toBeVisible();
  await page.reload();
  await expect(selected(page)).toContainText("Abendruhe");
  await expect(
    selected(page).getByRole("link", { name: "Bearbeiten", exact: true }),
  ).toHaveCount(0);
  const record = await db
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .single();
  expect(record.data?.archived_at).toBeTruthy();
  expect(record.data?.body).toContain("Abendruhe");
  await history(page).getByLabel("Ansicht").selectOption("active");
  await history(page).getByRole("button", { name: "Anwenden" }).click();
  await expect(page).not.toHaveURL(/view=archived/);
  await expect(history(page).locator(`[data-journal-entry="${id}"]`)).toHaveCount(0);
  await history(page).getByLabel("Ansicht").selectOption("archived");
  await history(page).getByRole("button", { name: "Anwenden" }).click();
  await expect(page).toHaveURL(/view=archived/);
  await expect(history(page).locator(`[data-journal-entry="${id}"]`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("R2-07 profile boundaries, optional title, denied ownership and DB checks", async ({
  page,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  const errors = watch(page);
  const stamp = Date.now();
  await page.setViewportSize(sizes[0]);
  await signUpTechnicalManualUser(page, "journal-owner", stamp);
  const { db, userId } = await signInDb("journal-owner", stamp);
  const other = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const second = await other.auth.signUp({
    email: `journal-other-${stamp}@example.local`,
    password: `C1proof-${stamp}`,
  });
  expect(second.error).toBeNull();
  const foreign = await other
    .from("journal_entries")
    .insert({
      user_id: second.data.user!.id,
      entry_date: "2026-01-01",
      title: "Fremder privater Titel",
      body: "Fremder privater Inhalt",
    })
    .select("id")
    .single();
  expect(foreign.error).toBeNull();
  await open(page, `/life/journal?selected=${foreign.data!.id}&panel=edit`);
  await expect(selected(page)).toContainText("Eintrag nicht verfügbar.");
  await expect(surface(page)).not.toContainText("Fremder privater");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const denied = await db
    .from("journal_entries")
    .update({ body: "Unzulässig" })
    .eq("id", foreign.data!.id)
    .select("id");
  expect(denied.data).toEqual([]);
  await open(page);
  await surface(page)
    .getByRole("link", { name: "Neuer Eintrag", exact: true })
    .first()
    .click();
  const editor = page.getByRole("dialog", { name: "Neuer Eintrag" });
  await editor
    .getByLabel("Inhalt", { exact: true })
    .fill("Ohne Titel, mit echtem Inhalt.");
  await editor.getByRole("button", { name: "Speichern" }).click();
  await expect(editor).not.toBeVisible();
  await expect(
    selected(page).getByRole("heading", {
      name: "Ohne Titel, mit echtem Inhalt.",
      exact: true,
    }),
  ).toBeVisible();
  const ownId = new URL(page.url()).searchParams.get("selected")!;
  expect(
    (await db.from("journal_entries").select("title").eq("id", ownId).single())
      .data?.title,
  ).toBeNull();
  await selected(page)
    .getByRole("link", { name: "Bearbeiten", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Eintrag bearbeiten" });
  await edit
    .getByLabel("Inhalt", { exact: true })
    .fill("Darf nicht gespeichert werden");
  await edit.locator('input[name="journalEntryId"]').evaluate((node, id) => {
    (node as HTMLInputElement).value = id;
  }, foreign.data!.id);
  await edit.getByRole("button", { name: "Speichern" }).click();
  await expect(edit.getByRole("alert")).toContainText("nicht gespeichert");
  expect(
    (
      await other
        .from("journal_entries")
        .select("body")
        .eq("id", foreign.data!.id)
        .single()
    ).data?.body,
  ).toBe("Fremder privater Inhalt");
  await edit.getByRole("button", { name: "Schließen" }).click();
  expect(
    (
      await db
        .from("areas")
        .select("id")
        .eq("user_id", userId)
        .eq("key", "life")
    ).data,
  ).toEqual([]);
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE")
    throw new Error("Disposable DB required");
  const sql = (query: string) =>
    execFileSync(
      "pnpm",
      [
        "exec",
        "supabase",
        "db",
        "query",
        "--local",
        "--workdir",
        process.env.TMPDIR!,
        query,
      ],
      { encoding: "utf8" },
    );
  sql("revoke select on public.journal_entries from authenticated");
  try {
    await page.reload();
    await expect(surface(page)).toHaveAttribute("data-mode", "error");
    await expect(surface(page).getByRole("alert")).toContainText(
      "nicht geladen",
    );
    await expect(
      history(page).getByRole("heading", {
        name: "Noch keine Journal-Einträge.",
      }),
    ).toHaveCount(0);
  } finally {
    sql("grant select on public.journal_entries to authenticated");
  }
  await surface(page).getByRole("button", { name: "Erneut laden" }).click();
  await expect(surface(page)).toHaveAttribute("data-mode", "manual");
  await expect(selected(page)).toContainText("Ohne Titel, mit echtem Inhalt.");
  for (const mode of ["demo", "empty", "manual"]) {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "life_os_profile",
        value: mode,
        url: test.info().project.use.baseURL!,
      },
    ]);
    await open(page, `/life/journal?panel=new&selected=${ownId}`);
    await expect(
      surface(page).getByRole("link", { name: "Neuer Eintrag", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(surface(page)).not.toContainText(
      "Ohne Titel, mit echtem Inhalt.",
    );
    if (mode !== "demo")
      await expect(history(page).locator("[data-journal-entry]")).toHaveCount(
        0,
      );
    await page.setViewportSize(sizes[3]);
    await page.screenshot({
      path: test.info().outputPath(`${mode}-390.png`),
      fullPage: true,
    });
    await surface(page)
      .getByRole("link", { name: "Einstellungen öffnen" })
      .click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.goBack();
    await expect(surface(page)).toBeVisible();
  }
  expect(errors).toEqual([]);
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE")
    throw new Error("Disposable DB required");
  for (const args of [
    ["lint", "--level", "warning"],
    ["advisors", "--type", "security", "--level", "warn", "--fail-on", "none"],
  ]) {
    const output = execFileSync(
      "pnpm",
      [
        "exec",
        "supabase",
        "db",
        ...args,
        "--local",
        "--workdir",
        process.env.TMPDIR!,
      ],
      { encoding: "utf8" },
    );
    await test.info().attach(`journal-db-${args[0]}`, {
      body: output,
      contentType: "text/plain",
    });
  }
});
