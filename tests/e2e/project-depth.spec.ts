import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import type { Database } from "@/features/real-data/supabase/database.types";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("Project Depth: result, criteria, explicit reviews, reopen and immutable history", async ({
  page,
  context,
}, info) => {
  test.setTimeout(420000);
  page.setDefaultTimeout(10000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "project-depth", stamp);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
  });
  const cookie = (await context.cookies()).find((item) =>
    item.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  await api.auth.setSession(session);
  const userId = (await api.auth.getUser()).data.user!.id;
  const projectTitle = `Project Depth ${stamp}`;
  const created = await api
    .from("projects")
    .insert({ user_id: userId, title: projectTitle, status: "active" })
    .select()
    .single();
  expect(created.error).toBeNull();
  const project = created.data!;
  expect(
    (
      await api.from("projects").insert({
        user_id: userId,
        title: "Valid initial result",
        status: "active",
        desired_result: "Initial result",
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await api.from("projects").insert({
        user_id: userId,
        title: "Direct cycle bypass",
        status: "active",
        completion_cycle: 9,
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await api.from("projects").insert({
        user_id: userId,
        title: "Direct completion bypass",
        status: "completed",
      })
    ).error,
  ).not.toBeNull();
  const task = await api
    .from("tasks")
    .insert({
      user_id: userId,
      project_id: project.id,
      title: `Open task ${stamp}`,
    })
    .select()
    .single();
  expect(task.error).toBeNull();
  const milestone = await api
    .from("project_milestones")
    .insert({
      user_id: userId,
      project_id: project.id,
      title: `Open milestone ${stamp}`,
    })
    .select()
    .single();
  expect(milestone.error).toBeNull();
  const resource = await api
    .from("resources")
    .insert({
      user_id: userId,
      title: `Evidence ${stamp}`,
      type: "link",
      url: "https://example.org/proof",
    })
    .select()
    .single();
  expect(resource.error).toBeNull();
  expect(
    (
      await api.rpc("set_project_resource_role", {
        p_project_id: project.id,
        p_resource_id: resource.data!.id,
        p_role: "reference",
      })
    ).error,
  ).toBeNull();

  await page.goto(`/projects/${project.id}`);
  const result = page.getByRole("region", {
    name: "Project Ergebnis und Kriterien",
  });
  const review = page.getByRole("region", { name: "Project Abschluss" });
  const historyDialog = page.getByRole("dialog", { name: "Abschlussverlauf" });
  const history = historyDialog.getByRole("region", {
    name: "Project Abschlussverlauf",
  });
  const openHistory = async () => {
    const hash = new URL(page.url()).hash.slice(1);
    if (hash === "project-history" || hash.startsWith("project-review-")) {
      await expect(historyDialog).toBeVisible();
    } else if (!(await historyDialog.isVisible())) {
      await page
        .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
        .click();
    }
    await expect(history).toBeVisible();
  };
  const closeHistory = async () => {
    const hash = new URL(page.url()).hash.slice(1);
    if (hash === "project-history" || hash.startsWith("project-review-")) {
      await expect(historyDialog).toBeVisible();
    }
    if (await historyDialog.isVisible()) {
      await page.keyboard.press("Escape");
      await expect(historyDialog).toBeHidden();
      await expect(
        page.getByRole("button", {
          name: "Abschlussverlauf ansehen",
          exact: true,
        }),
      ).toBeFocused();
    }
  };
  const resultDialog = page.getByRole("dialog", {
    name: "Ergebnis und Kriterien verwalten",
  });
  const openResultManager = async () => {
    await closeHistory();
    if (!(await resultDialog.isVisible())) {
      const trigger = page
        .getByLabel("Project Header", { exact: true })
        .getByRole("button", { name: /Ergebnis und Kriterien/ })
        .first();
      await trigger.click();
    }
    await expect(resultDialog).toBeVisible();
  };
  await expect(page.getByRole("heading", { name: projectTitle })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Gewünschtes Ergebnis und Kriterien festlegen",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Tasks & Progress" })
      .getByRole("link", { name: "+ Task" })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Project verwalten" }).click();
  await page.getByText("Project-Status setzen").click();
  await page.getByRole("combobox", { name: "Status" }).selectOption("paused");
  await page.getByRole("button", { name: "Status speichern" }).click();
  await page.reload();
  await expect(page.getByLabel("Project Metadata")).toContainText("paused");
  await page.getByRole("button", { name: "Project verwalten" }).click();
  await page.getByText("Project-Status setzen").click();
  await page.getByRole("combobox", { name: "Status" }).selectOption("active");
  await page.getByRole("button", { name: "Status speichern" }).click();
  await page.reload();
  await expect(page.getByLabel("Project Metadata")).toContainText("active");
  await page
    .getByLabel("Project Header", { exact: true })
    .getByRole("button", {
      name: "Gewünschtes Ergebnis und Kriterien festlegen",
    })
    .click();
  await resultDialog
    .getByLabel("Gewünschtes Ergebnis")
    .fill(`Deliverable ${stamp}`);
  await resultDialog
    .getByRole("button", { name: "Ergebnis speichern" })
    .click();
  await expect(result).toContainText(`Deliverable ${stamp}`);
  await page.reload();
  await expect(result).toContainText(`Deliverable ${stamp}`);

  await openResultManager();
  await expect(
    resultDialog.getByRole("textbox", {
      name: "Gewünschtes Ergebnis",
      exact: true,
    }),
  ).toBeFocused();
  await resultDialog
    .getByLabel("Neues Kriterium")
    .fill(`Accepted criterion ${stamp}`);
  await resultDialog
    .getByRole("button", { name: "Kriterium hinzufügen" })
    .click();
  await expect(result).toContainText(`Accepted criterion ${stamp}`);
  await page.reload();
  await expect(result).toContainText(`Accepted criterion ${stamp}`);
  const criterion = await api
    .from("project_completion_criteria")
    .select("id")
    .eq("project_id", project.id)
    .single();
  expect(criterion.error).toBeNull();
  expect(
    (
      await api.from("project_completion_criteria").insert({
        user_id: userId,
        project_id: project.id,
        text: "Direct insert denied",
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await api
        .from("project_completion_criteria")
        .update({ text: "Direct update denied" })
        .eq("id", criterion.data!.id)
    ).error,
  ).not.toBeNull();
  expect(
    (
      await api
        .from("project_completion_criteria")
        .delete()
        .eq("id", criterion.data!.id)
    ).error,
  ).not.toBeNull();

  for (const table of [
    "project_reviews",
    "project_review_criteria",
    "project_review_resources",
    "project_lifecycle_events",
    "project_review_amendments",
    "project_command_receipts",
  ] as const) {
    expect(
      (
        await api
          .from(table)
          .insert({ user_id: userId, project_id: project.id })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await api
          .from(table)
          .update({ user_id: userId })
          .eq("project_id", project.id)
      ).error?.code,
    ).toBe("42501");
    expect(
      (await api.from(table).delete().eq("project_id", project.id)).error?.code,
    ).toBe("42501");
  }
  expect(
    (
      await api
        .from("project_command_receipts")
        .select("*")
        .eq("project_id", project.id)
    ).error?.code,
  ).toBe("42501");

  const trigger = review.getByRole("button", { name: "Abschluss prüfen" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(
    (
      await api
        .from("project_reviews")
        .select("id")
        .eq("project_id", project.id)
    ).data,
  ).toEqual([]);
  await trigger.click();
  const form = review.getByRole("form", { name: "Project Review" });
  await expect(
    form.getByRole("region", { name: "Offene Arbeit" }),
  ).toContainText(task.data!.title);
  await expect(
    form.getByRole("region", { name: "Offene Arbeit" }),
  ).toContainText(milestone.data!.title);
  await form.getByRole("button", { name: "Abbrechen" }).click();
  await expect(trigger).toBeFocused();
  expect(
    (
      await api
        .from("project_reviews")
        .select("id")
        .eq("project_id", project.id)
    ).data,
  ).toEqual([]);
  await trigger.click();
  await form
    .getByLabel("Begründung", { exact: true })
    .fill("Continue after first inspection");
  await form.getByRole("button", { name: "Review speichern" }).click();
  await openHistory();
  await expect(history).toContainText("Weitergeführt");
  await page.reload();
  await openHistory();
  await expect(history).toContainText("Continue after first inspection");
  await expect(history).toContainText(
    "Keine Einzel-Arbeitshistory gespeichert",
  );
  await expect(page.getByLabel("Project Metadata")).toContainText("active");
  expect(
    (
      await api
        .from("project_reviews")
        .update({ rationale: "Direct history update denied" })
        .eq("project_id", project.id)
    ).error,
  ).not.toBeNull();
  expect(
    (
      await api
        .from("project_command_receipts")
        .delete()
        .eq("project_id", project.id)
    ).error,
  ).not.toBeNull();

  await page.keyboard.press("Escape");
  await expect(historyDialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Abschlussverlauf ansehen", exact: true }),
  ).toBeFocused();

  await openResultManager();
  const acceptedCriterionGroup = resultDialog.getByRole("group", {
    name: `Kriterium: Accepted criterion ${stamp}`,
  });
  await acceptedCriterionGroup
    .getByRole("spinbutton", { name: "Position" })
    .fill("4");
  await acceptedCriterionGroup
    .getByRole("button", { name: "Reihenfolge speichern" })
    .click();
  await expect(resultDialog.getByRole("status")).toContainText("gespeichert");
  await page.reload();
  await review.getByRole("button", { name: "Abschluss prüfen" }).click();
  const staleDraft = review.getByRole("form", { name: "Project Review" });
  await staleDraft
    .getByLabel("Begründung", { exact: true })
    .fill("Keep this draft through a stale conflict");
  const secondPage = await context.newPage();
  await secondPage.goto(`/projects/${project.id}`);
  const secondReviewForm = secondPage.getByRole("region", {
    name: "Project Abschluss",
    exact: true,
  });
  await secondReviewForm
    .getByRole("button", { name: "Abschluss prüfen" })
    .click();
  await secondReviewForm
    .getByLabel("Begründung", { exact: true })
    .fill("Continue saved in the other tab");
  await secondReviewForm
    .getByRole("button", { name: "Review speichern" })
    .click();
  await secondPage
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  await expect(
    secondPage.getByRole("region", { name: "Project Abschlussverlauf" }),
  ).toContainText("Continue saved in the other tab");
  await secondPage.close();
  await staleDraft.getByRole("button", { name: "Review speichern" }).click();
  await expect(staleDraft.getByRole("alert")).toContainText(
    "bewusst neu laden",
    { timeout: 60000 },
  );
  await expect(
    staleDraft.getByLabel("Begründung", { exact: true }),
  ).toHaveValue("Keep this draft through a stale conflict");
  await page.reload();

  await review.getByRole("button", { name: "Abschluss prüfen" }).click();
  const completion = review.getByRole("form", { name: "Project Review" });
  await completion.getByLabel("Entscheidung").selectOption("completed");
  await completion.getByLabel("Ergebnis ausdrücklich bestätigen").check();
  await completion
    .getByLabel(`Bewertung für Accepted criterion ${stamp}`)
    .selectOption("satisfied");
  await completion
    .getByLabel("Offene Arbeit gesehen; sie bleibt unverändert.")
    .check();
  await completion
    .getByLabel("Disposition der offenen Arbeit")
    .fill("Follow up separately after completion");
  await completion
    .getByText(`Evidence ${stamp} · reference · context`, { exact: true })
    .click();
  await completion.getByLabel(`Evidence ${stamp} · gesamter Review`).check();
  await completion
    .getByLabel(`Evidence ${stamp} · Kriterium: Accepted criterion ${stamp}`)
    .check();
  await completion
    .getByLabel(`Belegnotiz für Evidence ${stamp} (optional)`)
    .fill("Version inspected at acceptance");
  await completion
    .getByLabel("Begründung", { exact: true })
    .fill("Result and criterion accepted");
  await completion.getByRole("button", { name: "Review speichern" }).click();
  await expect(page.getByLabel("Project Metadata")).toContainText("completed");
  await page.reload();
  const completedReview = (
    await api
      .from("project_reviews")
      .select("reviewed_at")
      .eq("project_id", project.id)
      .eq("decision", "completed")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .single()
  ).data!;
  await expect(review).toContainText("Zyklus 1");
  await expect(review).toContainText(
    `Review am ${new Date(completedReview.reviewed_at).toLocaleDateString("de-DE")}`,
  );
  await expect(review.locator("[data-completion-summary]")).toContainText(
    "Result and criterion accepted",
  );
  await expect(
    review.getByRole("button", { name: "Project wieder öffnen", exact: true }),
  ).toBeVisible();
  await openHistory();
  await expect(history).toContainText("Result and criterion accepted");
  await expect(history).toContainText(`Evidence ${stamp}`);
  await expect(
    history.getByRole("link", { name: "Aktuelle Resource öffnen" }),
  ).toHaveCount(2);
  const currentResource = history
    .getByRole("link", { name: "Aktuelle Resource öffnen" })
    .first();
  await expect(currentResource).toBeVisible();
  await currentResource.click();
  await expect(page).toHaveURL(
    new RegExp(`/resources\\?selected=${resource.data!.id}`),
  );
  await page.goBack();
  await openHistory();
  await expect(history).toContainText(`Evidence ${stamp}`);
  await page.keyboard.press("Escape");
  await review.getByRole("link", { name: "Abschluss-Review ansehen" }).click();
  await expect(page).toHaveURL(/#project-review-/);
  await history.getByRole("link", { name: "Aktuelle History" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/projects/${project.id}#project-history$`),
  );
  await history.getByText("Ergänzung hinzufügen").first().click();
  await history
    .getByRole("textbox", { name: "Korrektur oder Kontext" })
    .first()
    .fill("Later clarification without changing the original review");
  await history
    .getByRole("button", { name: "Ergänzung speichern" })
    .first()
    .click();
  await page.reload();
  await openHistory();
  await expect(history).toContainText(
    "Later clarification without changing the original review",
  );
  // Bounded withdrawal preserves the original evidence row.
  const firstReview = history
    .locator("details")
    .filter({
      has: page
        .locator("summary")
        .filter({ hasText: "Abgeschlossen · Zyklus 1" }),
    })
    .first();
  await firstReview.getByText("Ergänzung hinzufügen", { exact: true }).click();
  await firstReview
    .getByLabel("Art der Ergänzung")
    .selectOption("evidence_withdrawn");
  const snapshot = await api
    .from("project_review_resources")
    .select("id")
    .eq("project_id", project.id)
    .is("criterion_id", null)
    .single();
  expect(snapshot.error).toBeNull();
  await firstReview
    .getByLabel("Beleg (nur bei Rückzug)")
    .selectOption(snapshot.data!.id);
  await firstReview
    .getByLabel("Korrektur oder Kontext")
    .fill("Evidence was selected in error");
  await firstReview
    .getByRole("button", { name: "Ergänzung speichern" })
    .click();
  await page.reload();
  await openHistory();
  await expect(history).toContainText("Beleg zurückgezogen");
  expect(
    (await api.from("tasks").select("status").eq("id", task.data!.id).single())
      .data?.status,
  ).not.toBe("done");
  expect(
    (
      await api
        .from("project_milestones")
        .select("status")
        .eq("id", milestone.data!.id)
        .single()
    ).data?.status,
  ).toBe("open");

  await closeHistory();
  await review
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  const reopenTrigger = review.getByRole("button", {
    name: "Project wieder öffnen",
    exact: true,
  });
  let reopenDialog = page.getByRole("dialog", {
    name: "Wiederöffnung bestätigen",
  });
  await expect(reopenDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reopenTrigger).toBeFocused();
  await expect(page.getByLabel("Project Metadata")).toContainText("completed");
  await reopenTrigger.click();
  reopenDialog = page.getByRole("dialog", {
    name: "Wiederöffnung bestätigen",
  });
  await reopenDialog
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Project-Änderung gespeichert." })
      .last(),
  ).toBeVisible();
  await expect(page.getByLabel("Project Metadata")).toContainText("active");
  await page.reload();
  await closeHistory();
  await review.getByRole("button", { name: "Abschluss prüfen" }).click();
  const amendmentDraft = review.getByRole("form", { name: "Project Review" });
  await amendmentDraft
    .getByLabel("Begründung", { exact: true })
    .fill("Draft before another tab amends history");
  const amendmentTab = await context.newPage();
  await amendmentTab.goto(`/projects/${project.id}`);
  await amendmentTab
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  const otherHistory = amendmentTab.getByRole("region", {
    name: "Project Abschlussverlauf",
  });
  await otherHistory
    .getByText("Abgeschlossen · Zyklus 1", { exact: false })
    .click();
  const otherReview = otherHistory
    .locator("details")
    .filter({
      has: amendmentTab
        .locator("summary")
        .filter({ hasText: "Abgeschlossen · Zyklus 1" }),
    })
    .first();
  await otherReview.getByText("Ergänzung hinzufügen", { exact: true }).click();
  await otherReview
    .getByLabel("Korrektur oder Kontext")
    .fill("Clarification from another tab");
  await otherReview
    .getByRole("button", { name: "Ergänzung speichern" })
    .click();
  await expect(otherHistory).toContainText("Clarification from another tab");
  await amendmentTab.close();
  await amendmentDraft
    .getByRole("button", { name: "Review speichern" })
    .click();
  await expect(amendmentDraft.getByRole("alert")).toContainText(
    "bewusst neu laden",
  );
  await expect(
    amendmentDraft.getByLabel("Begründung", { exact: true }),
  ).toHaveValue("Draft before another tab amends history");
  await page.reload();
  await openResultManager();
  await resultDialog
    .getByLabel("Gewünschtes Ergebnis")
    .fill(`Revised deliverable ${stamp}`);
  await resultDialog
    .getByRole("button", { name: "Ergebnis speichern" })
    .click();
  await page.reload();
  await openResultManager();
  const revisedCriterionGroup = resultDialog.getByRole("group", {
    name: `Kriterium: Accepted criterion ${stamp}`,
  });
  await revisedCriterionGroup
    .getByRole("textbox", { name: "Kriterium bearbeiten" })
    .fill(`Revised criterion ${stamp}`);
  await revisedCriterionGroup
    .getByRole("button", { name: "Kriterium speichern" })
    .click();
  await page.reload();
  await openResultManager();
  await resultDialog
    .getByLabel("Neues Kriterium")
    .fill(`Removed scope ${stamp}`);
  await resultDialog
    .getByRole("button", { name: "Kriterium hinzufügen" })
    .click();
  await page.reload();
  await openResultManager();
  const removed = resultDialog.getByRole("group", {
    name: `Kriterium: Removed scope ${stamp}`,
  });
  await removed
    .getByLabel("Grund für Scope-Entfernung")
    .fill("Explicitly removed from this cycle");
  await removed.getByRole("button", { name: "Kriterium archivieren" }).click();
  await page.reload();
  await closeHistory();
  await review.getByRole("button", { name: "Abschluss prüfen" }).click();
  const second = review.getByRole("form", { name: "Project Review" });
  await second.getByLabel("Entscheidung").selectOption("completed");
  await second.getByLabel("Ergebnis ausdrücklich bestätigen").check();
  await second
    .getByLabel(`Bewertung für Revised criterion ${stamp}`)
    .selectOption("satisfied");
  await second.getByLabel(/Removed scope.*Grund:/).check();
  await second
    .getByLabel(
      `Kommentar zu Scope-Entfernung: Removed scope ${stamp} (optional)`,
    )
    .fill("Removed with a separate scope decision");
  await second
    .getByLabel("Offene Arbeit gesehen; sie bleibt unverändert.")
    .check();
  await second
    .getByLabel("Disposition der offenen Arbeit")
    .fill("Separate follow up retained");
  await second
    .getByLabel("Begründung", { exact: true })
    .fill("Second cycle acceptance");
  await second.getByRole("button", { name: "Review speichern" }).click();
  await page.reload();
  await openHistory();
  await expect(history).toContainText("Result and criterion accepted");
  await expect(history).toContainText("Second cycle acceptance");
  await expect(history).toContainText(`Deliverable ${stamp}`);
  await expect(history).toContainText(`Revised deliverable ${stamp}`);
  await expect(history).toContainText(`Revised criterion ${stamp}`);
  await expect(history).toContainText("Explicitly removed from this cycle");
  await expect(history).toContainText("aus Scope entfernt");
  await expect(history).toContainText("Removed with a separate scope decision");
  // A current positive Review marked mistaken must Reopen atomically.
  const secondReview = history
    .locator("details")
    .filter({
      has: page
        .locator("summary")
        .filter({ hasText: "Abgeschlossen · Zyklus 2" }),
    })
    .first();
  await secondReview.getByText("Ergänzung hinzufügen", { exact: true }).click();
  await secondReview
    .getByLabel("Art der Ergänzung")
    .selectOption("marked_mistaken");
  await expect(
    secondReview.getByText(
      "Dieser aktuelle Abschluss wird dadurch wieder geöffnet.",
      { exact: true },
    ),
  ).toBeVisible();
  await secondReview
    .getByLabel("Korrektur oder Kontext")
    .fill("Acceptance was recorded prematurely");
  await secondReview
    .getByRole("button", { name: "Ergänzung speichern" })
    .click();
  await page.reload();
  await openHistory();
  await expect(page.getByLabel("Project Metadata")).toContainText("active");
  await expect(history).toContainText("Review irrtümlich");
  await closeHistory();
  await review.getByRole("button", { name: "Abschluss prüfen" }).click();
  const third = review.getByRole("form", { name: "Project Review" });
  await third.getByLabel("Entscheidung").selectOption("completed");
  await third.getByLabel("Ergebnis ausdrücklich bestätigen").check();
  await third
    .getByLabel(`Bewertung für Revised criterion ${stamp}`)
    .selectOption("satisfied");
  await expect(
    third.getByRole("group", { name: "Aus Scope archiviert" }),
  ).toHaveCount(0);
  await third
    .getByLabel("Offene Arbeit gesehen; sie bleibt unverändert.")
    .check();
  await third
    .getByLabel("Disposition der offenen Arbeit")
    .fill("Follow up separately");
  await third
    .getByLabel("Begründung", { exact: true })
    .fill("Acceptance confirmed in third cycle");
  await third.getByRole("button", { name: "Review speichern" }).click();
  await page.reload();
  await openHistory();
  await expect(history).toContainText("Abgeschlossen · Zyklus 3");
  await expect(history).toContainText("Acceptance confirmed in third cycle");
  const openFirstReview = async () => {
    await openHistory();
    await history
      .getByText("Abgeschlossen · Zyklus 1", { exact: false })
      .click();
  };

  const relation = await api
    .from("resource_relations")
    .select("id")
    .eq("resource_id", resource.data!.id)
    .eq("target_type", "project")
    .eq("target_id", project.id)
    .single();
  expect(relation.error).toBeNull();
  expect(
    (await api.from("resource_relations").delete().eq("id", relation.data!.id))
      .error,
  ).toBeNull();
  await page.reload();
  await openFirstReview();
  await expect(history).toContainText(`Evidence ${stamp}`);
  await expect(
    history.getByRole("link", { name: "Aktuelle Resource öffnen" }).first(),
  ).toBeVisible();
  expect(
    (
      await api
        .from("resources")
        .update({ title: `Renamed ${stamp}` })
        .eq("id", resource.data!.id)
    ).error,
  ).toBeNull();
  await page.reload();
  await openFirstReview();
  await expect(history).toContainText(`Evidence ${stamp}`);
  await expect(history).not.toContainText(`Renamed ${stamp}`);
  await expect(history).toContainText("aktuell umbenannt");
  await expect(history).toContainText("nicht mehr verknüpft");
  await expect(
    history.getByRole("link", { name: "Aktuelle Resource öffnen" }).first(),
  ).toBeVisible();
  expect(
    (
      await api
        .from("resources")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", resource.data!.id)
    ).error,
  ).toBeNull();
  await page.reload();
  await openFirstReview();
  await expect(history).toContainText(`Evidence ${stamp}`);
  await expect(history).toContainText("Aktuelle Resource nicht verfügbar");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Project verwalten" }).click();
  await page
    .getByRole("button", { name: "Project archivieren", exact: true })
    .click();
  await expect(page.getByLabel("Project Metadata")).toContainText("Archiviert");
  await page.reload();
  await openHistory();
  await expect(history).toContainText("Result and criterion accepted");
  await expect(history).toContainText("Second cycle acceptance");
  await expect(history).toContainText("Archiviert");

  await page.keyboard.press("Escape");
  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: info.outputPath(
        `project-depth-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  // Navigate real pagination; amendments remain permitted on archived History.
  const historic = (
    await api
      .from("project_reviews")
      .select("id")
      .eq("project_id", project.id)
      .order("revision_after")
      .limit(1)
      .single()
  ).data!;
  let tokens = (
    await api.rpc("project_review_context", { p_project_id: project.id })
  ).data as { completion_revision: string; completion_cycle: string };
  for (let i = 0; i < 51; i++) {
    const saved = await api.rpc("project_depth_command", {
      p_project_id: project.id,
      p_command_id: crypto.randomUUID(),
      p_operation: "review.amend",
      p_expected_revision: tokens.completion_revision,
      p_expected_cycle: tokens.completion_cycle,
      p_payload: {
        review_id: historic.id,
        kind: "clarification",
        reason: `Pagination clarification ${i}`,
      },
    });
    expect(saved.error).toBeNull();
    tokens = saved.data as {
      completion_revision: string;
      completion_cycle: string;
    };
  }
  await page.reload();
  await openHistory();
  await history.getByRole("link", { name: "Ältere History" }).click();
  await expect(page).toHaveURL(/historyBefore=/);
  await expect(history).toContainText("Result and criterion accepted");
  await history.getByRole("link", { name: "Aktuelle History" }).click();
  await expect(page).not.toHaveURL(/historyBefore=/);
  await expect(history).toContainText("Pagination clarification 50");
  expect(errors).toEqual([]);
});

test("Project Depth: legacy completion, Empty, Demo and Auth-blocked stay truthful", async ({
  browser,
}) => {
  const stamp = Date.now();
  const baseURL = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
  const manual = await browser.newContext({ baseURL });
  const page = await manual.newPage();
  await signUpTechnicalManualUser(page, "project-depth-legacy", stamp);
  const cookie = (await manual.cookies()).find((item) =>
    item.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  await api.auth.setSession(session);
  const userId = (await api.auth.getUser()).data.user!.id;
  const title = `Legacy Project ${stamp}`;
  const projectId = crypto.randomUUID();
  const localTarget = process.env.LIFE_OS_E2E_PROJECT_ID!;
  expect(localTarget).toMatch(/^life-os-z1-e2e-/);
  execFileSync("docker", [
    "exec",
    `supabase_db_${localTarget}`,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `insert into public.projects(id,user_id,title,status) values('${projectId}','${userId}','${title}','completed')`,
  ]);
  await page.goto(`/projects/${projectId}`);
  const history = page.getByRole("region", {
    name: "Project Abschlussverlauf",
  });
  await page
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  await expect(history).toContainText(
    "Abgeschlossen ohne gespeicherten Review",
  );
  expect(
    (await api.from("project_reviews").select("id").eq("project_id", projectId))
      .data,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  const reopenDialog = page.getByRole("dialog", {
    name: "Wiederöffnung bestätigen",
  });
  await expect(reopenDialog).toBeVisible();
  await reopenDialog
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Project Metadata")).toContainText("active");
  await page
    .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
    .click();
  await expect(history).toContainText("Wieder geöffnet");
  expect(
    (await api.from("project_reviews").select("id").eq("project_id", projectId))
      .data,
  ).toEqual([]);
  await manual.close();

  const empty = await browser.newContext({ baseURL });
  const emptyPage = await empty.newPage();
  await signUpTechnicalManualUser(emptyPage, "project-depth-empty", stamp + 1);
  await emptyPage.goto("/projects");
  await expect(emptyPage.getByRole("main")).not.toContainText(title);
  await empty.close();

  const demo = await browser.newContext({ baseURL });
  await demo.addCookies([
    { name: "life_os_profile", value: "demo", url: baseURL },
  ]);
  const demoPage = await demo.newPage();
  await demoPage.goto("/projects");
  await expect(demoPage.getByRole("main")).not.toContainText(title);
  await demo.close();

  const blocked = await browser.newContext({ baseURL });
  await blocked.addCookies([
    { name: "life_os_profile", value: "manual", url: baseURL },
  ]);
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(`/projects/${projectId}`);
  await expect(blockedPage.getByRole("status")).toContainText(
    "lokale Anmeldung",
  );
  await expect(
    blockedPage.getByRole("button", { name: "Abschluss prüfen" }),
  ).toHaveCount(0);
  await blocked.close();
});

test("Project Depth: mistaken copy respects lifecycle and completion navigation survives pagination", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "project-depth-surface", stamp);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
  });
  const cookie = (await context.cookies()).find((item) =>
    item.name.includes("auth-token"),
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
  const userId = (await api.auth.getUser()).data.user!.id;
  const created = await api
    .from("projects")
    .insert({
      user_id: userId,
      title: `Surface repair ${stamp}`,
      status: "active",
      desired_result: `Canonical result ${stamp}`,
    })
    .select()
    .single();
  expect(created.error).toBeNull();
  const projectId = created.data!.id;
  const read = async () => {
    const response = await api.rpc("project_review_context", {
      p_project_id: projectId,
    });
    expect(response.error).toBeNull();
    return response.data as {
      completion_revision: string;
      completion_cycle: string;
      status: string;
      fingerprint: string;
      current_completion_review_id: string | null;
      criteria: { id: string }[];
    };
  };
  const command = async (
    operation: string,
    payload: Record<string, unknown>,
  ) => {
    const state = await read();
    const response = await api.rpc("project_depth_command", {
      p_project_id: projectId,
      p_command_id: crypto.randomUUID(),
      p_operation: operation,
      p_expected_revision: state.completion_revision,
      p_expected_cycle: state.completion_cycle,
      p_payload:
        payload as Database["public"]["Functions"]["project_depth_command"]["Args"]["p_payload"],
    });
    expect(response.error).toBeNull();
  };
  await command("criterion.create", {
    text: `Accepted criterion ${stamp}`,
    sort_order: 0,
  });
  const submit = async (
    decision: "continue" | "completed",
    rationale: string,
  ) => {
    const state = await read();
    await command("review.submit", {
      fingerprint: state.fingerprint,
      decision,
      rationale,
      result_accepted: decision === "completed",
      criteria: state.criteria.map((c) => ({
        id: c.id,
        assessment: decision === "completed" ? "satisfied" : "not_assessed",
      })),
      archived_ids: [],
      archived_criteria_acknowledged: false,
      evidence: [],
      open_work_acknowledged: false,
      open_work_disposition: null,
    });
    const row = await api
      .from("project_reviews")
      .select("id")
      .eq("project_id", projectId)
      .eq("rationale", rationale)
      .single();
    expect(row.error).toBeNull();
    return row.data!.id;
  };
  const continued = await submit("continue", "Continue context identity");
  const historical = await submit(
    "completed",
    "Historical completion identity",
  );
  await command("project.reopen", {});
  const current = await submit("completed", "Current completion identity");
  const before = await read();
  await page.goto(`/projects/${projectId}`);
  const history = page.getByRole("region", {
    name: "Project Abschlussverlauf",
  });
  const historyDialog = page.getByRole("dialog", { name: "Abschlussverlauf" });
  const openHistory = async () => {
    if (!(await historyDialog.isVisible())) {
      await page
        .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
        .click();
    }
    await expect(history).toBeVisible();
  };
  const mark = async (id: string, reopens: boolean) => {
    await openHistory();
    const row = history.locator(`#project-review-${id}`);
    if ((await row.getAttribute("open")) === null)
      await row.locator("summary").first().click();
    await row.getByText("Ergänzung hinzufügen", { exact: true }).click();
    const kind = row.getByLabel("Art der Ergänzung");
    await expect(kind.locator('option[value="marked_mistaken"]')).toHaveText(
      "Review als irrtümlich markieren",
    );
    await kind.selectOption("marked_mistaken");
    await expect(
      row.getByText(
        reopens
          ? "Dieser aktuelle Abschluss wird dadurch wieder geöffnet."
          : "Die Kennzeichnung ergänzt die History und ändert den aktuellen Project-Status nicht.",
        { exact: true },
      ),
    ).toBeVisible();
    if (!reopens)
      await expect(
        row.getByText(
          "Dieser aktuelle Abschluss wird dadurch wieder geöffnet.",
          { exact: true },
        ),
      ).toHaveCount(0);
    await row
      .getByLabel("Korrektur oder Kontext")
      .fill(`Mistaken annotation ${id}`);
    await row.getByRole("button", { name: "Ergänzung speichern" }).click();
    await expect(row.getByRole("status")).toContainText("gespeichert");
    await page.reload();
  };
  await mark(historical, false);
  expect((await read()).status).toBe("completed");
  expect((await read()).completion_cycle).toBe(before.completion_cycle);
  expect((await read()).current_completion_review_id).toBe(current);
  await mark(continued, false);
  expect((await read()).status).toBe("completed");
  expect((await read()).completion_cycle).toBe(before.completion_cycle);
  expect((await read()).current_completion_review_id).toBe(current);
  for (let i = 0; i < 51; i++)
    await command("review.amend", {
      review_id: current,
      kind: "clarification",
      reason: `Later context ${i}`,
    });
  await page.goto(`/projects/${projectId}`);
  await openHistory();
  await expect(history.locator(`#project-review-${current}`)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Abschluss-Review ansehen" }).click();
  await expect(page).toHaveURL(
    new RegExp(`historyBefore=.*#project-review-${current}$`),
  );
  const selected = history.locator(`#project-review-${current}`);
  await expect(selected).toBeVisible();
  await expect(
    selected.getByText(`Canonical result ${stamp}`, { exact: false }),
  ).toBeVisible();
  await expect(
    selected.getByText("Current completion identity", { exact: false }),
  ).toBeVisible();
  await expect(selected.locator("summary").first()).toContainText(
    "Abgeschlossen · Zyklus 2",
  );
  await expect(selected).toHaveCount(1);
  for (const viewport of [
    { width: 3840, height: 2160 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: info.outputPath(
        `completion-navigation-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await history.getByRole("link", { name: "Aktuelle History" }).click();
  await history.getByRole("link", { name: "Ältere History" }).click();
  await expect(history.locator(`#project-review-${current}`)).toHaveCount(1);
  await expect(history.locator(`#project-review-${historical}`)).toHaveCount(1);
  await history.getByRole("link", { name: "Aktuelle History" }).click();
  await expect(history).toContainText("Later context 50");
  await expect(history.locator(`#project-review-${current}`)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Abschluss-Review ansehen" }).click();
  await mark(current, true);
  const after = await read();
  expect(after.status).toBe("active");
  expect(BigInt(after.completion_cycle)).toBe(
    BigInt(before.completion_cycle) + BigInt(1),
  );
  expect(after.current_completion_review_id).toBeNull();
  await expect(
    page.getByRole("link", { name: "Abschluss-Review ansehen" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
