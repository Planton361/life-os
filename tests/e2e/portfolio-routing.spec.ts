import { expect, test, type Page } from "@playwright/test";

function expectSearchParam(url: URL, key: string, value: string) {
  expect(url.searchParams.get(key)).toBe(value);
}

async function openPortfolioSubitem(page: Page, label: string) {
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await nav.getByRole("link", { exact: true, name: "Portfolio" }).focus();

  const flyout = page.getByLabel("Portfolio Unterseiten");
  await expect(flyout).toBeVisible();
  await flyout.getByRole("link", { exact: true, name: label }).click();
}

test.describe("Portfolio routing", () => {
  test("opens Portfolio from sidebar parent and query subitems", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    await page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("link", { exact: true, name: "Portfolio" })
      .click();
    await expect(page).toHaveURL(/\/portfolio$/);

    for (const [label, view] of [
      ["Tasks", "tasks"],
      ["Projects", "projects"],
      ["Goals", "goals"],
      ["Skills", "skills"],
    ] as const) {
      await page.goto("/dashboard");
      await openPortfolioSubitem(page, label);
      await expect(page).toHaveURL(new RegExp(`/portfolio\\?view=${view}$`));

      const url = new URL(page.url());
      expect(url.pathname).toBe("/portfolio");
      expectSearchParam(url, "view", view);
    }
  });

  test("keeps dashboard Active Portfolio view controls local", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Active Portfolio" }).click();
    await expect(page).toHaveURL(/\/portfolio\?status=active$/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/portfolio");
    expectSearchParam(url, "status", "active");

    await page.goto("/dashboard");
    const widget = page.getByRole("region", { name: "Active Portfolio" });

    await expect(
      widget.getByRole("link", { name: /Open portfolio item: Life OS App/ }),
    ).toBeVisible();

    await widget.getByRole("button", { name: "Goal View" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      widget.getByRole("button", { name: "Goal View" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      widget.getByRole("link", { name: /Open portfolio item: Life OS MVP/ }),
    ).toBeVisible();
    await expect(
      widget.getByRole("link", { name: /Open portfolio item: Life OS App/ }),
    ).toHaveCount(0);

    await widget.getByRole("button", { name: "Skill View" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      widget.getByRole("button", { name: "Skill View" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      widget.getByRole("link", {
        name: /Open portfolio item: Java \/ Hyperskill/,
      }),
    ).toBeVisible();
    await expect(
      widget.getByRole("link", { name: /Open portfolio item: Life OS MVP/ }),
    ).toHaveCount(0);

    await widget.getByRole("button", { name: "Project View" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      widget.getByRole("button", { name: "Project View" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      widget.getByRole("link", { name: /Open portfolio item: Life OS App/ }),
    ).toBeVisible();
  });

  test("drives Portfolio entity views from query params", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/portfolio?status=active");

    await page
      .locator('section[aria-label="Portfolio view, scope and sort controls"]')
      .getByRole("link", { exact: true, name: "Tasks" })
      .click();
    await expect(page).toHaveURL(/\/portfolio\?.*status=active.*view=tasks/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/portfolio");
    expectSearchParam(url, "status", "active");
    expectSearchParam(url, "view", "tasks");

    const list = page.getByRole("region", { name: "Active Portfolio" });
    await expect(
      list.getByRole("link", { name: /Calendar page implementieren/ }),
    ).toBeVisible();
    await expect(
      list.getByRole("link", { name: /Masterarbeit/ }),
    ).toHaveCount(0);

    await page.goto("/portfolio?status=active&view=projects");
    await expect(
      list.getByRole("link", { name: /Life OS App/ }),
    ).toBeVisible();
    await expect(
      list.getByRole("link", { name: /Calendar page implementieren/ }),
    ).toHaveCount(0);

    await page.goto("/portfolio?status=active&view=goals");
    await expect(
      list.getByRole("link", { name: /Life OS MVP nutzbar machen/ }),
    ).toBeVisible();
    await expect(
      list.getByRole("link", { name: /Calendar page implementieren/ }),
    ).toHaveCount(0);

    await page.goto("/portfolio?status=active&view=skills");
    await expect(
      list.getByRole("link", { name: /AI Agent Workflow/ }),
    ).toBeVisible();
    await expect(
      list.getByRole("link", { name: /Calendar page implementieren/ }),
    ).toHaveCount(0);
  });
});
