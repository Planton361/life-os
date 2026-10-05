import { expect, test } from "@playwright/test";

import {
  cockpitViewports,
  assertCockpit,
  consoleProof,
  scrollProof,
} from "./support/dashboard-cockpit";

for (const v of cockpitViewports)
  for (const profile of ["empty", "demo"] as const) {
    test(`#112 ${profile} ${v.name} one-glance / flow guard`, async ({
      browser,
    }, info) => {
      const context = await browser.newContext({
        viewport: v,
        deviceScaleFactor: v.deviceScaleFactor,
      });
      await context.addCookies([
        {
          name: "life_os_profile",
          value: profile,
          url: info.project.use.baseURL!,
        },
      ]);
      const page = await context.newPage(),
        errors = consoleProof(page);
      await page.goto("/dashboard");
      await expect(page.locator(".dashboard-daily")).toHaveAttribute(
        "data-profile-id",
        profile,
      );
      await expect(
        page.locator('.life-os-sidebar a[aria-current="page"]').first(),
      ).toBeAttached();
      const geometry = await assertCockpit(page);
      for (const group of [
        { selector: ".dashboard-agenda", names: ["Week", "Month", "Day"] },
        {
          selector: ".dashboard-habits",
          names: ["Midday", "Evening", "Morning"],
        },
        {
          selector: ".dashboard-portfolio",
          names: ["Goal View", "Skill View", "Project View"],
        },
        { selector: ".dashboard-running", names: ["Muscle", "Running"] },
      ])
        for (const name of group.names) {
          const control = page
            .locator(group.selector)
            .getByRole("button", { name, exact: true });
          await control.click();
          await expect(control).toHaveAttribute("aria-pressed", "true");
          await assertCockpit(page);
        }
      await scrollProof(page);
      await page.reload();
      await assertCockpit(page);
      await page.evaluate(() => scrollTo(0, 0));
      const path = info.outputPath(`${profile}-${v.name}.png`);
      await page.screenshot({
        path,
        fullPage: true,
        style: "nextjs-portal {display:none!important}",
      });
      await info.attach("full-surface", { path, contentType: "image/png" });
      await info.attach("geometry", {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      expect(errors).toEqual([]);
      await context.close();
    });
  }

test("#112 DPR does not change logical cockpit geometry", async ({
  browser,
}, info) => {
  const results = [];
  for (const deviceScaleFactor of [1, 1.5, 2]) {
    const context = await browser.newContext({
      viewport: { width: 2560, height: 639 },
      deviceScaleFactor,
    });
    await context.addCookies([
      {
        name: "life_os_profile",
        value: "demo",
        url: info.project.use.baseURL!,
      },
    ]);
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(
      page.locator('.life-os-sidebar a[aria-current="page"]').first(),
    ).toBeAttached();
    results.push(await assertCockpit(page));
    await context.close();
  }
  expect(results[1]).toEqual(results[0]);
  expect(results[2]).toEqual(results[0]);
});
