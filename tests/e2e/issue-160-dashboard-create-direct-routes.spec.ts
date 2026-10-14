import { expect, test } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

const createRoutes = [
  {
    view: "Project View",
    linkName: "project erstellen",
    path: "/projects/new",
    formName: "Project erstellen",
  },
  {
    view: "Goal View",
    linkName: "goal erstellen",
    path: "/goals/new",
    formName: "Ziel erstellen",
  },
  {
    view: "Skill View",
    linkName: "skill erstellen",
    path: "/skills/new",
    formName: "Skill erstellen",
  },
] as const;

test("Issue 160 dashboard create links open their exact entity forms", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signUpTechnicalManualUser(page, "issue160-dashboard-create", Date.now());

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    const portfolio = page.locator(".dashboard-portfolio");

    for (const route of createRoutes) {
      await portfolio
        .getByRole("button", { name: route.view, exact: true })
        .click();

      const link = portfolio
        .getByRole("link", { name: route.linkName, exact: true })
        .first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", route.path);
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await page.waitForURL(
        (url) => `${url.pathname}${url.search}${url.hash}` === route.path,
      );

      const form = page.getByRole("form", {
        name: route.formName,
        exact: true,
      });
      await expect(form).toBeVisible();
      await expect(
        page.getByRole("heading", { name: route.formName, exact: true }),
      ).toBeVisible();
      await page.goto("/dashboard");
    }
  }
});
