import { expect, test, type Locator } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
async function disclosure(region: Locator, name: string) {
  const d = region
    .locator("details")
    .filter({ has: region.page().locator(`summary:text-is("${name}")`) })
    .first();
  if (!(await d.evaluate((e) => e.hasAttribute("open"))))
    await d.locator("summary").first().click();
  return d;
}
async function save(
  form: Locator,
  name: string,
  message = "Skill gespeichert.",
) {
  const notices = form.page().getByLabel("Benachrichtigungen");
  for (const b of await notices
    .getByRole("button", { name: "Benachrichtigung schließen" })
    .all())
    await b.click();
  await form.getByRole("button", { name, exact: true }).click();
  await expect(notices.getByRole("status")).toContainText(message);
  await expect(
    form.page().locator('button:has-text("Speichern …")'),
  ).toHaveCount(0);
}
test("PP2 remaining controls: ordering, milestone lifecycle, target retirement/reopen, Task and Resource context", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(10000);
  await signUpTechnicalManualUser(page, "pp2-controls", Date.now());
  await page.goto("/skills/new");
  const create = page.getByRole("form", { name: "Skill erstellen" });
  await create
    .getByLabel("Name", { exact: true })
    .fill("PP2 remaining controls");
  await create
    .getByRole("button", { name: "Skill erstellen", exact: true })
    .click();
  const work = page.locator("[data-skill-development]");
  await expect(work).toBeVisible();
  const url = page.url();
  const skillId = url.split("/").at(-1)!;
  const cookie = (await context.cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(session);
  const uid = (await api.auth.getUser()).data.user!.id;
  const task = await api
    .from("tasks")
    .insert({
      user_id: uid,
      title: "Canonical practice",
      status: "done",
      completed_at: "2026-09-15T09:00:00Z",
    })
    .select()
    .single();
  expect(task.error).toBeNull();
  const resource = await api
    .from("resources")
    .insert({ user_id: uid, title: "Scoped reference", type: "learning" })
    .select()
    .single();
  expect(resource.error).toBeNull();
  await page.reload();
  const focus = work.getByRole("region", {
    name: "Aktueller Entwicklungsfokus",
  });
  let f = focus.getByRole("form", { name: "Development Target erstellen" });
  await f.getByLabel("Titel", { exact: true }).fill("Target A");
  await save(f, "Development Target erstellen");
  const other = await disclosure(work, "Weitere Targets & Verlauf");
  let target = other.locator("[data-target]").first();
  await save(
    target.getByRole("form", { name: "Als aktuellen Fokus wählen" }),
    "Als aktuellen Fokus wählen",
  );
  target = focus.locator("[data-target]");
  for (const name of ["First step", "Second step"]) {
    const d = await disclosure(target, "Lernschritt hinzufügen");
    f = d.getByRole("form", { name: "Lernschritt hinzufügen", exact: true });
    await f.getByLabel("Titel", { exact: true }).fill(name);
    await save(f, "Lernschritt hinzufügen");
  }
  let step = target.getByRole("article", { name: "Lernschritt Second step" });
  let manage = await disclosure(step, "Lernschritt verwalten");
  await save(manage.getByRole("form", { name: "Nach oben" }), "Nach oben");
  await page.reload();
  await expect(target.locator("h4")).toHaveText([
    "Second step · Geplant",
    "First step · Geplant",
  ]);
  step = target.getByRole("article", { name: "Lernschritt Second step" });
  manage = await disclosure(step, "Lernschritt verwalten");
  f = manage.getByRole("form", { name: "Lernschritt speichern" });
  await f
    .getByLabel("Beschreibung", { exact: true })
    .fill("Explicit learning step");
  await save(f, "Lernschritt speichern");
  await save(
    manage.getByRole("form", { name: "Als aktuellen Lernschritt wählen" }),
    "Als aktuellen Lernschritt wählen",
  );
  const review = await disclosure(manage, "Lernschritt reviewen");
  f = review.getByRole("form", { name: "Lernschritt Review" });
  await f.getByLabel("Entscheidung").selectOption("completed");
  await f.getByLabel("Begründung").fill("Reviewed step");
  await f.getByRole("button", { name: "Review prüfen", exact: true }).click();
  await save(f, "Review speichern");
  await page.reload();
  manage = await disclosure(step, "Lernschritt verwalten");
  await save(
    manage.getByRole("form", { name: "Lernschritt wieder öffnen" }),
    "Lernschritt wieder öffnen",
  );
  await save(
    manage.getByRole("form", { name: "Lernschritt archivieren" }),
    "Lernschritt archivieren",
  );
  await page.reload();
  await expect(
    target.getByRole("article", { name: "Lernschritt Second step" }),
  ).toHaveCount(0);
  let tm = await disclosure(target, "Target verwalten");
  await save(
    tm.getByRole("form", { name: "Lernschritt wiederherstellen: Second step" }),
    "Lernschritt wiederherstellen: Second step",
  );
  await page.reload();
  await expect(target.locator("h4")).toHaveText([
    "First step · Geplant",
    "Second step · Geplant",
  ]);
  tm = await disclosure(target, "Target verwalten");
  f = tm.getByRole("form", { name: "Target speichern" });
  await f.getByLabel("Beschreibung", { exact: true }).fill("Edited target");
  await save(f, "Target speichern");
  await save(
    tm.getByRole("form", { name: "Target archivieren" }),
    "Target archivieren",
  );
  await page.reload();
  await disclosure(work, "Weitere Targets & Verlauf");
  target = work.locator("[data-target]").first();
  tm = await disclosure(target, "Target verwalten");
  await save(
    tm.getByRole("form", { name: "Target wiederherstellen" }),
    "Target wiederherstellen",
  );
  await save(
    target.getByRole("form", { name: "Als aktuellen Fokus wählen" }),
    "Als aktuellen Fokus wählen",
  );
  target = focus.locator("[data-target]");
  let tr = await disclosure(target, "Target reviewen");
  f = tr.getByRole("form", { name: "Target Review" });
  await f.getByLabel("Entscheidung").selectOption("retired");
  await f.getByLabel("Begründung", { exact: true }).fill("Cancel preview");
  await f.getByLabel("Noch offene Lernschritte bewusst bestätigen").check();
  await f.getByRole("button", { name: "Review prüfen", exact: true }).click();
  await f.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(tr.locator("summary").first()).toBeFocused();
  await page.reload();
  await expect(target.getByText("Aktuell", { exact: true })).toBeVisible();
  tr = await disclosure(target, "Target reviewen");
  f = tr.getByRole("form", { name: "Target Review" });
  await f.getByLabel("Entscheidung").selectOption("continue");
  await f
    .getByLabel("Begründung", { exact: true })
    .fill("Continue without automatic advancement");
  await f.getByRole("button", { name: "Review prüfen", exact: true }).click();
  await save(f, "Review speichern");
  await page.reload();
  await expect(target.getByText("Aktuell", { exact: true })).toBeVisible();
  tr = await disclosure(target, "Target reviewen");
  f = tr.getByRole("form", { name: "Target Review" });
  await f.getByLabel("Entscheidung").selectOption("retired");
  await f.getByLabel("Begründung", { exact: true }).fill("Retire deliberately");
  await f.getByLabel("Noch offene Lernschritte bewusst bestätigen").check();
  await f.getByRole("button", { name: "Review prüfen", exact: true }).click();
  await save(f, "Review speichern");
  await page.reload();
  await disclosure(work, "Weitere Targets & Verlauf");
  target = work.locator("[data-target]").first();
  tm = await disclosure(target, "Target verwalten");
  await save(
    tm.getByRole("form", { name: "Target wieder öffnen" }),
    "Target wieder öffnen",
  );
  await page.reload();
  await expect(
    focus.getByText("Kein aktueller Entwicklungsfokus.", { exact: true }),
  ).toBeVisible();
  // Existing Task links affect current Practice, never synthesize Evidence.
  const practice = work.getByRole("region", { name: "Practice & Anwendung" });
  let d = await disclosure(practice, "Task verknüpfen");
  f = d.getByRole("form", { name: "Task mit Skill verknüpfen" });
  await f.getByLabel("Task", { exact: true }).selectOption(task.data!.id);
  await save(f, "Task mit Skill verknüpfen", "Skill mit Task verknüpft.");
  await page.reload();
  await expect(
    practice.getByRole("link", { name: "Canonical practice", exact: true }),
  ).toBeVisible();
  const recency = work.getByRole("region", { name: "Evidence & Recency" });
  await expect(recency.getByRole("definition").first()).toContainText(
    "15.9.2026",
  );
  await expect(
    recency.getByText("Keine aktuelle Skill Evidence.", { exact: true }),
  ).toBeVisible();
  await save(
    practice.getByRole("form", {
      name: "Verbindung entfernen: Canonical practice",
    }),
    "Verbindung entfernen: Canonical practice",
    "Skill-Verbindung entfernt.",
  );
  await page.reload();
  await expect(
    practice.getByRole("link", { name: "Canonical practice", exact: true }),
  ).toHaveCount(0);
  await expect(recency.getByRole("definition").first()).toHaveText(
    "Kein gültiger Completion-Zeitpunkt",
  );
  d = await disclosure(practice, "Task verknüpfen");
  f = d.getByRole("form", { name: "Task mit Skill verknüpfen" });
  await f.getByLabel("Task", { exact: true }).selectOption(task.data!.id);
  await save(f, "Task mit Skill verknüpfen", "Skill mit Task verknüpft.");
  await page.reload();
  d = await disclosure(recency, "Evidence hinzufügen");
  f = d.getByRole("form", { name: "Evidence hinzufügen", exact: true });
  await f.getByLabel("Titel", { exact: true }).fill("Task sourced observation");
  await f.getByLabel("Datum", { exact: true }).fill("2026-09-14");
  await f.getByLabel("Evidence-Quelle").selectOption(`task:${task.data!.id}`);
  await save(f, "Evidence hinzufügen");
  await page.reload();
  const e = recency.getByRole("article", {
    name: "Evidence Task sourced observation",
  });
  await e.getByRole("link", { name: "Quelle öffnen" }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.data!.id}$`));
  await page.goto(url);
  expect(
    (
      await api
        .from("tasks")
        .update({ status: "planned", completed_at: null })
        .eq("id", task.data!.id)
    ).error,
  ).toBeNull();
  await page.reload();
  await expect(recency.getByRole("definition").first()).toHaveText(
    "Kein gültiger Completion-Zeitpunkt",
  );
  expect(
    (
      await api
        .from("tasks")
        .update({ archived_at: new Date().toISOString(), status: "archived" })
        .eq("id", task.data!.id)
    ).error,
  ).toBeNull();
  await page.reload();
  await expect(
    practice.getByRole("link", { name: "Canonical practice", exact: true }),
  ).toHaveCount(0);
  await expect(
    e.getByText("Quelle nicht verfügbar.", { exact: true }),
  ).toBeVisible();
  await expect(recency.getByRole("definition").nth(1)).toHaveText("2026-09-14");
  // References preserve their existing relation identity and do not create Evidence.
  const refs = work.getByRole("region", { name: "Lernmaterial & References" });
  d = await disclosure(refs, "Reference verknüpfen");
  f = d.getByRole("form", { name: "Reference mit Skill verknüpfen" });
  await f
    .getByLabel("Resource", { exact: true })
    .selectOption(resource.data!.id);
  await save(f, "Reference mit Skill verknüpfen", "Resource verknüpft.");
  await page.reload();
  await refs.getByRole("link", { name: "Scoped reference · Context" }).click();
  await expect(page).toHaveURL(new RegExp(`/resources/${resource.data!.id}$`));
  await page.goto(url);
  d = await disclosure(refs, "Reference verwalten");
  await save(
    d.getByRole("form", { name: "Reference lösen: Scoped reference" }),
    "Reference lösen: Scoped reference",
    "Verknüpfung gelöst.",
  );
  await page.reload();
  await expect(
    refs.getByRole("link", { name: "Scoped reference · Context" }),
  ).toHaveCount(0);
  expect(
    (await api.rpc("skill_development_read", { p_skill_id: skillId })).data
      .evidence,
  ).toHaveLength(1);
});
