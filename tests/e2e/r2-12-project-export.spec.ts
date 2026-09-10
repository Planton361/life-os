import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
import { projectionFixture } from "@/features/obsidian-projection/projection-fixture";
import { readProjectProjection } from "@/features/real-data/supabase/repositories/project-projection-read";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";

test("Project → authenticated Obsidian ZIP: graph, rename, dependencies, ownership, profiles and retry", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await signUpTechnicalManualUser(page, "obsidian-export", Date.now());
  const cookie = (await context.cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(
    JSON.parse(
      Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
    ),
  );
  const uid = (await api.auth.getUser()).data.user!.id;
  const s = projectionFixture();
  await api
    .from("goals")
    .insert(s.goals.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("skills")
    .insert(s.skills.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("resources")
    .insert(s.resources.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("projects")
    .insert({ ...s.project, user_id: uid })
    .throwOnError();
  await api
    .from("project_milestones")
    .insert(s.milestones.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("tasks")
    .insert(s.tasks.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("task_skill_links")
    .insert(s.taskSkills.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("task_dependencies")
    .insert(s.dependencies.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("resource_relations")
    .insert(s.relations.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  await api
    .from("skill_evidence")
    .insert(s.evidence.map((g) => ({ ...g, user_id: uid })))
    .throwOnError();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()) || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const projectHeader = page.locator('header[aria-label="Project Header"]');
  const exportButton = projectHeader.getByRole("button", {
    name: "Für Obsidian exportieren",
    exact: true,
  });
  await page.goto(`/projects/${s.project.id}`);
  await expect(
    projectHeader.getByRole("heading", { name: "Life OS", exact: true }),
  ).toBeVisible();
  async function download(name: string) {
    await expect(exportButton).toBeEnabled();
    const pending = page.waitForEvent("download", { timeout: 20000 });
    const responsePending = page.waitForResponse(
      (r) => r.url().endsWith("/obsidian"),
      { timeout: 15000 },
    );
    await exportButton.focus();
    await page.keyboard.press("Enter");
    const response = await responsePending;
    expect(
      response.status(),
      response.ok() ? "ZIP response" : await response.text(),
    ).toBe(200);
    const file = await pending;
    expect(file.suggestedFilename()).toBe(
      `Life-OS-Project-${s.project.id}.zip`,
    );
    const path = info.outputPath(name + ".zip");
    await file.saveAs(path);
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Obsidian-Export erstellt" })
        .last(),
    ).toBeVisible();
    return JSON.parse(
      execFileSync("python3", [
        "-c",
        "import sys,zipfile,json; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))",
        path,
      ]).toString(),
    ) as Record<string, string>;
  }
  const first = await download("project-before");
  const root = `Life-OS-Project-${s.project.id}/`;
  const manifest = JSON.parse(first[root + ".life-os-projection.json"]);
  expect(manifest.files).toHaveLength(7);
  const taskPath = root + `Tasks/${s.tasks[0].id}.md`;
  const blockedPath = root + `Tasks/${s.tasks[1].id}.md`;
  expect(first[blockedPath]).toContain("## Availability\n\nBLOCKED");
  for (const value of Object.values(first)) {
    expect(value).not.toContain(uid);
    expect(value).not.toContain("access_token");
    for (const m of value.matchAll(/\[\[([^|]+)\|[^\]]+\]\]/g))
      expect(first[root + m[1] + ".md"]).toBeDefined();
  }
  await page.reload();
  const again = await download("project-repeat");
  for (const f of manifest.files)
    expect(again[root + f.path]).toBe(first[root + f.path]);
  // Real canonical title edit, followed by the actual export control.
  await api
    .from("tasks")
    .update({ title: "API Boundary implementieren" })
    .eq("user_id", uid)
    .eq("id", s.tasks[0].id)
    .throwOnError();
  await page.reload();
  const renamed = await download("project-renamed");
  expect(renamed[taskPath]).toContain("# API Boundary implementieren");
  expect(Object.keys(renamed)).toEqual(Object.keys(first));
  expect(renamed[blockedPath]).toContain("|API Boundary implementieren]]");
  await api
    .from("task_dependencies")
    .delete()
    .eq("user_id", uid)
    .eq("id", s.dependencies[0].id)
    .throwOnError();
  await page.reload();
  const updated = await download("project-dependency-removed");
  expect(updated[blockedPath]).toContain("## Blocked by\n\n—");
  expect(updated[blockedPath]).toContain("## Availability\n\nREADY");
  await api
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", uid)
    .eq("id", s.tasks[0].id)
    .throwOnError();
  await page.reload();
  const archived = await download("project-archived-task");
  expect(archived[taskPath]).toContain("Archiviert · historische Daten");
  // Current screenshots and secondary-control bounds; unchanged workbench remains read-first.
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const box = await exportButton.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThanOrEqual(40);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: info.outputPath(`project-export-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
  expect(errors).toEqual([]);
  const origin = new URL(page.url()).origin;
  const endpoint = `/api/projects/${s.project.id}/obsidian`;
  const stranger = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signup = await stranger.auth.signUp({
    email: `projection-stranger-${Date.now()}@example.test`,
    password: "Disposable-proof-123!",
  });
  expect(signup.error).toBeNull();
  const foreign = (
    await stranger
      .from("projects")
      .insert({
        user_id: signup.data.user!.id,
        title: "Foreign private project",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await expect(
    readProjectProjection(api, uid, { projectId: foreign.id }),
  ).rejects.toThrow("Zugriff");
  expect(
    (
      await context.request.post(`/api/projects/${foreign.id}/obsidian`, {
        headers: { origin },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await context.request.post(endpoint, {
        headers: { origin: "https://foreign.test" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.post("/api/projects/not-an-id/obsidian", {
        headers: { origin },
      })
    ).status(),
  ).toBe(400);
  for (const profile of ["demo", "empty"]) {
    await context.addCookies([
      { name: "life_os_profile", value: profile, url: origin },
    ]);
    await page.reload();
    await expect(exportButton).toHaveCount(0);
    expect(
      (await context.request.post(endpoint, { headers: { origin } })).status(),
    ).toBe(403);
  }
  await context.addCookies([
    { name: "life_os_profile", value: "manual", url: origin },
  ]);
  await page.reload();
  // Real security failure is visible and retryable. Expected failed HTTP response is
  // audited separately from clean successful-flow console/hydration above.
  await api
    .from("projects")
    .update({ description: "api_token=synthetic-sensitive-value" })
    .eq("user_id", uid)
    .eq("id", s.project.id)
    .throwOnError();
  await exportButton.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Zugangsdaten" }),
  ).toBeVisible();
  await api
    .from("projects")
    .update({ description: "Canonical work" })
    .eq("user_id", uid)
    .eq("id", s.project.id)
    .throwOnError();
  await download("project-final-smoke");
  expect(errors.every((e) => /Failed to load resource.*422/.test(e))).toBe(
    true,
  );
  await api
    .from("resource_relations")
    .delete()
    .eq("user_id", uid)
    .eq("resource_id", s.resources[0].id)
    .throwOnError();
  await page.reload();
  const removed = await download("project-source-removed");
  expect(removed[root + `Resources/${s.resources[0].id}.md`]).toBeUndefined();
  expect(Object.keys(removed)).toHaveLength(Object.keys(first).length - 1);
  await api
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", uid)
    .eq("id", s.project.id)
    .throwOnError();
  await page.reload();
  const archivedProject = await download("project-history");
  expect(archivedProject[root + `Projects/${s.project.id}.md`]).toContain(
    "Archiviert · historische Daten",
  );
  // Authenticated repository performance, fixed query count grows only by bounded pages.
  const large = (
    await api
      .from("projects")
      .insert({ user_id: uid, title: "Synthetic performance" })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const stages = (
    await api
      .from("project_milestones")
      .insert(
        Array.from({ length: 20 }, (_, i) => ({
          user_id: uid,
          project_id: large.id,
          title: `Stage ${i}`,
          sort_order: i,
        })),
      )
      .select()
      .throwOnError()
  ).data!;
  const rows = (
    await api
      .from("tasks")
      .insert(
        Array.from({ length: 100 }, (_, i) => ({
          user_id: uid,
          project_id: large.id,
          milestone_id: stages[i % 20].id,
          title: `Synthetic task ${i}`,
        })),
      )
      .select()
      .throwOnError()
  ).data!;
  await api
    .from("task_dependencies")
    .insert(
      Array.from({ length: 99 }, (_, i) => ({
        user_id: uid,
        project_id: large.id,
        predecessor_task_id: rows[i].id,
        successor_task_id: rows[i + 1].id,
      })).concat([
        {
          user_id: uid,
          project_id: large.id,
          predecessor_task_id: rows[0].id,
          successor_task_id: rows[99].id,
        },
      ]),
    )
    .throwOnError();
  const resources = (
    await api
      .from("resources")
      .insert(
        Array.from({ length: 30 }, (_, i) => ({
          user_id: uid,
          title: `Synthetic reference ${i}`,
          type: "note" as const,
        })),
      )
      .select()
      .throwOnError()
  ).data!;
  await api
    .from("resource_relations")
    .insert(
      resources.map((r) => ({
        user_id: uid,
        resource_id: r.id,
        target_type: "project",
        target_id: large.id,
        relation_type: "context" as const,
      })),
    )
    .throwOnError();
  const start = performance.now();
  const graph = await readProjectProjection(api, uid, { projectId: large.id });
  const elapsed = performance.now() - start;
  expect(graph.tasks).toHaveLength(100);
  expect(graph.dependencies).toHaveLength(100);
  expect(graph.resources).toHaveLength(30);
  expect(elapsed).toBeLessThan(10000);
  await info.attach("projection-performance", {
    body: JSON.stringify({
      tasks: 100,
      milestones: 20,
      dependencies: 100,
      resources: 30,
      readMilliseconds: elapsed,
    }),
    contentType: "application/json",
  });
  const anonymous = await context.browser()!.newContext({ baseURL: origin });
  await anonymous.addCookies([
    { name: "life_os_profile", value: "manual", url: origin },
  ]);
  expect(
    (await anonymous.request.post(endpoint, { headers: { origin } })).status(),
  ).toBe(401);
  await anonymous.close();
  for (const args of [
    ["lint", "--level", "warning"],
    ["advisors", "--type", "security", "--level", "warn", "--fail-on", "none"],
  ]) {
    const output = execFileSync(
      "pnpm",
      [
        "exec",
        "supabase",
        "db",
        ...args,
        "--local",
        "--workdir",
        process.env.TMPDIR!,
      ],
      { encoding: "utf8" },
    );
    await info.attach(`projection-db-${args[0]}`, {
      body: output,
      contentType: "text/plain",
    });
  }
});
