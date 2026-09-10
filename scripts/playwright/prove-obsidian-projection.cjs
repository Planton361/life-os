/* Run only inside the network-isolated synthetic proof sandbox described in the
 * R2-12 registry. Uses an already installed Obsidian/Electron; installs nothing. */
(async () => {
  const fs = await import("node:fs");
  const { default: assert } = await import("node:assert/strict");
  const { _electron } = await import("/tmp/deps/@playwright/test/index.mjs");
  assert.equal(process.env.LIFE_OS_SYNTHETIC_VAULT, "/tmp/proof/vault");
  const manifest = JSON.parse(
    fs.readFileSync("/tmp/proof/vault/.life-os-projection.json", "utf8"),
  );
  assert.equal(manifest.projectId, "a0000000-0000-4000-8000-000000000001");
  const app = await _electron.launch({
    executablePath: "/usr/lib/electron43/electron",
    args: [
      "/usr/lib/obsidian/app.asar",
      "--user-data-dir=/tmp/proof/profile",
      "--ozone-platform=x11",
    ],
    cwd: "/tmp/proof",
    env: {
      PATH: "/usr/bin:/bin",
      DISPLAY: process.env.DISPLAY,
      XAUTHORITY: process.env.XAUTHORITY,
      XDG_CONFIG_HOME: "/tmp/proof/xdg",
      ELECTRON_FORCE_IS_PACKAGED: "true",
    },
    timeout: 30000,
  });
  try {
    let page = await app.firstWindow();
    await page.waitForTimeout(1500);
    for (const window of app.windows())
      if (
        await window.evaluate(() => Boolean(globalThis.app)).catch(() => false)
      )
        page = window;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type())) errors.push(m.text());
    });
    await page.waitForFunction(() => globalThis.app?.workspace?.layoutReady);
    // The isolated test Vault may retain panels from a previous proof run.
    await page.evaluate(() => {
      for (const leaf of globalThis.app.workspace.getLeavesOfType("localgraph"))
        leaf.detach();
    });
    await page.setViewportSize({ width: 1920, height: 1080 });
    const project = manifest.files.find((f) => f.lifeOsType === "project");
    async function open(path) {
      await page.keyboard.press("Control+o");
      await page.locator(".prompt-input").fill(path);
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        (p) => globalThis.app.workspace.getActiveFile()?.path === p,
        path,
      );
      if (
        !(await page
          .locator(".workspace-leaf.mod-active .markdown-reading-view")
          .isVisible())
      )
        await page.keyboard.press("Control+e");
      await page
        .locator(".workspace-leaf.mod-active .markdown-reading-view")
        .waitFor();
    }
    await open(project.path);
    const traversal = [];
    async function clickLink(path) {
      const links = page.locator(
        `.workspace-leaf.mod-active .markdown-reading-view a.internal-link[data-href="${path.replace(/\.md$/, "")}"]`,
      );
      await links.first().click();
      await page.waitForFunction(
        (p) => globalThis.app.workspace.getActiveFile()?.path === p,
        path,
      );
      if (
        !(await page
          .locator(".workspace-leaf.mod-active .markdown-reading-view")
          .isVisible())
      )
        await page.keyboard.press("Control+e");
      traversal.push(path);
    }
    const milestone = manifest.files.find((f) => f.lifeOsType === "milestone");
    const blocked = "Tasks/a0000000-0000-4000-8000-000000000008.md";
    const blocker = "Tasks/a0000000-0000-4000-8000-000000000003.md";
    await clickLink(milestone.path);
    await clickLink(blocked);
    await clickLink(blocker);
    for (const type of ["goal", "skill", "resource"]) {
      await open(project.path);
      await clickLink(manifest.files.find((f) => f.lifeOsType === type).path);
    }
    await open(project.path);
    const metadata = await page.evaluate(() => {
      const app = globalThis.app;
      const files = app.vault
        .getMarkdownFiles()
        .filter((f) => f.path !== "README.md");
      return files.map((f) => ({
        path: f.path,
        properties: app.metadataCache.getFileCache(f)?.frontmatter,
        links: (app.metadataCache.getFileCache(f)?.links ?? []).map((l) => ({
          link: l.link,
          resolved: app.metadataCache.getFirstLinkpathDest(l.link, f.path)
            ?.path,
        })),
        backlinks: Object.entries(app.metadataCache.resolvedLinks)
          .filter(([, targets]) => targets[f.path])
          .map(([path]) => path),
      }));
    });
    assert.equal(metadata.length, manifest.files.length);
    for (const file of metadata) {
      assert.ok(file.properties.life_os_id);
      assert.equal(file.properties.life_os_projection_version, 1);
      assert.ok(file.links.every((l) => l.resolved));
    }
    assert.ok(
      metadata.find((f) => f.path === project.path).backlinks.length > 0,
    );
    await page.screenshot({ path: "/tmp/proof/project-note.png" });
    async function command(text) {
      await page.keyboard.press("Control+p");
      await page.locator(".prompt-input").fill(text);
      const choices = await page.locator(".suggestion-item").allTextContents();
      fs.writeFileSync(
        "/tmp/proof/command-choices.json",
        JSON.stringify({ text, choices }),
      );
      await page.locator(".suggestion-item").first().click();
    }
    await command("Backlinks: Show backlinks");
    await page
      .locator(".workspace-leaf-content[data-type='backlink']")
      .waitFor();
    await page.screenshot({ path: "/tmp/proof/backlinks.png" });
    await open(project.path);
    await command("Open local graph");
    await page
      .locator(".workspace-leaf-content[data-type='localgraph'] canvas")
      .last()
      .waitFor();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/tmp/proof/local-graph.png" });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "/tmp/proof/result.json",
      JSON.stringify({ result: "PASS", traversal, metadata, errors }, null, 2),
    );
    console.log("OBSIDIAN_CORE_SMOKE_PASS");
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
