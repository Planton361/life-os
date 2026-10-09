import { expect, type Page } from "@playwright/test";

const capture = (page: Page) =>
  page.locator('form[data-task-capture-title-first="true"]');

export const taskOptionalSections = [
  "Arbeitsinhalt (optional)",
  "Planung (optional)",
  "Zuordnung (optional)",
] as const;

export async function setTaskOptionalSections(page: Page, open: boolean) {
  for (const name of taskOptionalSections) {
    const trigger = capture(page).getByRole("button", { name, exact: true });
    if ((await trigger.getAttribute("aria-expanded")) !== String(open))
      await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", String(open));
  }
}

async function visibleComposition(page: Page) {
  return {
    headings: await page.locator("main h1, main h2").allTextContents(),
    // Compare the visible tree, text and styling, excluding origin metadata,
    // hidden command values, generated IDs and the accepted return URL.
    tree: await capture(page).evaluate((form) =>
      Array.from(form.querySelectorAll("*"))
        .filter((node) => (node as HTMLElement).getClientRects().length > 0)
        .map((node) => ({
          tag: node.tagName,
          className: node.getAttribute("class"),
          text: Array.from(node.childNodes)
            .filter((child) => child.nodeType === Node.TEXT_NODE)
            .map((child) => child.textContent?.trim())
            .filter(Boolean)
            .join(" "),
          name: node.getAttribute("name"),
          type: node.getAttribute("type"),
          expanded: node.getAttribute("aria-expanded"),
        })),
    ),
  };
}

export async function standaloneTaskCapture(page: Page) {
  const reference = await page.context().newPage();
  try {
    if (page.viewportSize())
      await reference.setViewportSize(page.viewportSize()!);
    await reference.goto("/tasks/new");
    await expect(
      capture(reference).getByRole("button", {
        name: "Task erstellen",
        exact: true,
      }),
    ).toBeEnabled();
    await expect(
      reference.getByRole("heading", { name: "Task erstellen", exact: true }),
    ).toBeVisible();
    const composition = await visibleComposition(reference);
    await expectTaskCaptureParity(reference, composition);
    await setTaskOptionalSections(reference, true);
    const optionalFieldOrder = await capture(reference)
      .locator("label")
      .allTextContents();
    return { ...composition, optionalFieldOrder };
  } finally {
    await reference.close();
  }
}

export async function expectTaskCaptureParity(
  page: Page,
  baseline: Awaited<ReturnType<typeof visibleComposition>>,
) {
  const form = capture(page);
  await expect(form).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Task erstellen", exact: true }),
  ).toBeEnabled();
  await expect(form.getByText("ERFASSEN", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Bewusst erstellen|Task zuerst festhalten/,
    }),
  ).toHaveCount(0);
  await expect(form.getByLabel("Titel", { exact: true })).toBeVisible();
  await expect(form.getByLabel("Titel", { exact: true })).toHaveAttribute(
    "required",
    "",
  );
  await expect(form.locator("button[aria-expanded]")).toHaveCount(3);
  for (const name of taskOptionalSections)
    await expect(
      form.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
  await expect(
    form.locator(
      "[data-task-capture-context], [data-goal-milestone-task-context]",
    ),
  ).toHaveCount(0);
  await expect(
    form.getByText("Bekannter Kontext", { exact: true }),
  ).toHaveCount(0);
  for (const label of [
    "Project",
    "Project Milestone",
    "Goal-Kontext",
    "Project-Kontext (optional)",
    "Beschreibung / Purpose",
    "Arbeitsnotiz / nächste Aktion",
  ]) {
    await expect(form.getByLabel(label, { exact: true })).toBeHidden();
  }
  expect(await visibleComposition(page)).toEqual({
    headings: baseline.headings,
    tree: baseline.tree,
  });
}

export async function expectOptionalTaskFieldParity(
  page: Page,
  baseline: Awaited<ReturnType<typeof standaloneTaskCapture>>,
  goalMilestone = false,
) {
  const groups = [
    ["Beschreibung / Purpose", "Arbeitsnotiz / nächste Aktion"],
    ["Priority", "Energy", "Duration (min)", "Deadline", "Geplantes Datum"],
    goalMilestone
      ? ["Area", "Project-Kontext (optional)"]
      : ["Area", "Project", "Project Milestone", "Goal-Kontext"],
  ];
  for (const [index, name] of taskOptionalSections.entries()) {
    const trigger = capture(page).getByRole("button", { name, exact: true });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = capture(page).locator(
      `[id="${await trigger.getAttribute("aria-controls")}"]`,
    );
    expect(await panel.locator("label").allTextContents()).toEqual(
      groups[index],
    );
  }
  const labels = await capture(page).locator("label").allTextContents();
  // Goal-Milestone keeps its accepted optional Project control and hidden
  // command context; all ordinary origins keep the full canonical field order.
  expect(goalMilestone ? labels.slice(0, 9) : labels).toEqual(
    goalMilestone
      ? baseline.optionalFieldOrder.slice(0, 9)
      : baseline.optionalFieldOrder,
  );
}
