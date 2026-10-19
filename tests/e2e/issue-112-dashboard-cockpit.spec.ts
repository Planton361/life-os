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
      // Compact navigation mounts its links only after opening the menu.
      // Exercise a real control to wait for hydration at every canvas width.
      await page
        .locator(".dashboard-agenda")
        .getByRole("button", {
          name: "Day",
          exact: true,
        })
        .click();
      const geometry = await assertCockpit(page);
      if (geometry.canvas < 880) {
        const daily = (await page.locator(".dashboard-daily").boundingBox())!;
        const quick = (await page.locator(".dashboard-quick").boundingBox())!;
        const agenda = (await page.locator(".dashboard-agenda").boundingBox())!;
        expect(quick.y - daily.y - daily.height).toBeGreaterThanOrEqual(8);
        expect(quick.y - daily.y - daily.height).toBeLessThanOrEqual(16);
        expect(agenda.y - quick.y - quick.height).toBeLessThanOrEqual(16);
        const current = (await page
          .locator(".daily-control-current")
          .boundingBox())!;
        const queue = (await page
          .locator(".daily-control-queue")
          .boundingBox())!;
        expect(queue.y - current.y - current.height).toBeGreaterThanOrEqual(8);
        expect(
          daily.y + daily.height - queue.y - queue.height,
        ).toBeLessThanOrEqual(16);
        expect(agenda.height).toBeLessThanOrEqual(520);
        await page
          .locator(".dashboard-quick")
          .getByRole("textbox", {
            name: "Quick Thought",
            exact: true,
          })
          .fill(`#112 ${profile} flow guard`);
        await page
          .locator(".dashboard-quick")
          .getByRole("button", {
            name: "In Inbox speichern",
            exact: true,
          })
          .click();
        await expect(
          page.locator(".dashboard-quick").getByRole("alert"),
        ).toBeVisible();
        await assertCockpit(page);
      }
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
      if (geometry.canvas < 880) {
        const timeline = page.getByRole("region", {
          name: "Agenda time content",
        });
        await timeline.scrollIntoViewIfNeeded();
        await timeline.focus();
        // Near midnight, auto-positioning can already be at the final hour.
        // Start at the top so native End scrolls this region, not the outer page.
        await timeline.evaluate((e) => (e.scrollTop = 0));
        await page.keyboard.press("End");
        await expect(
          timeline.locator(":scope > div").filter({ hasText: /^24:00/ }),
        ).toBeInViewport();
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
