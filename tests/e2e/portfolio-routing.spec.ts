import { expect, test } from "@playwright/test";

function expectSearchParam(url: URL, key: string, value: string) {
  expect(url.searchParams.get(key)).toBe(value);
}

test.describe("Portfolio routing", () => {
  test("opens Portfolio from sidebar parent and query views", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

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
      await page.goto(`/portfolio?view=${view}`);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`/portfolio\\?view=${view}$`));
      await expect(
        page
          .locator('section[aria-label="Portfolio view, scope and sort controls"]')
          .getByRole("link", { exact: true, name: label }),
      ).toHaveAttribute("aria-current", "page");

      const url = new URL(page.url());
      expect(url.pathname).toBe("/portfolio");
      expectSearchParam(url, "view", view);
    }
  });

  test("keeps dashboard Active Portfolio controls rendered", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: "Active Portfolio" }).click();
    await expect(page).toHaveURL(/\/portfolio\?status=active$/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/portfolio");
    expectSearchParam(url, "status", "active");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const widget = page.getByRole("region", { name: "Active Portfolio" });

    await expect(
      widget.getByRole("link", { name: /Open portfolio item: Life OS App/ }),
    ).toBeVisible();
    await expect(
      widget.getByRole("button", { name: "Project View" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      widget.getByRole("button", { name: "Goal View" }),
    ).toBeVisible();
    await expect(
      widget.getByRole("button", { name: "Skill View" }),
    ).toBeVisible();
    await expect(
      widget.getByRole("link", { name: "Open portfolio goals view" }),
    ).toHaveAttribute("href", "/portfolio?view=goals");
    await expect(
      widget.getByRole("link", { name: "Open portfolio skills view" }),
    ).toHaveAttribute("href", "/portfolio?view=skills");
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
