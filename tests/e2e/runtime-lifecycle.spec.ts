import { expect, test } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("local runtime owns its browser and preserves a canonical write through reload", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "runtime-proof", stamp);
  await page.goto("/tasks/new");
  const form = page.getByRole("form", { name: "Task erstellen", exact: true });
  await form
    .getByLabel("Titel", { exact: true })
    .fill(`Runtime proof ${stamp}`);
  await form
    .getByRole("button", { name: "Task erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]+$/);
  await page.reload();
  await expect(
    page
      .getByRole("form", { name: "Task bearbeiten", exact: true })
      .getByLabel("Titel", { exact: true }),
  ).toHaveValue(`Runtime proof ${stamp}`);
  for (const route of [
    "/dashboard",
    "/inbox",
    "/today",
    "/calendar",
    "/portfolio",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
  }
  expect(runtimeErrors, "browser console and hydration").toEqual([]);
  console.log("RUNTIME_BROWSER_WRITE_RELOAD_PASS");
  if (process.env.LIFE_OS_RUNTIME_ABORT_PROOF === "1") {
    // The external lifecycle proof sends SIGINT/SIGTERM after this marker.
    // Normal runs never wait here; an un-interrupted abort probe fails on timeout.
    await new Promise(() => {});
  }
});
