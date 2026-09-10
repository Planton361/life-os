import { readablePaths, safeTitle } from "./readable-paths";
import { updateProjection } from "./projection-update";
import {
  containsExportCredential,
  sameOriginExportRequest,
} from "./export-security";
import { describe, expect, it } from "vitest";
import { projectMarkdown, wikiLink, contentHash } from "./project-markdown";
import { projectionFixture, fixtureId as id } from "./projection-fixture";
import {
  replaceGeneratedState,
  userStart,
  generatedStart,
} from "./note-boundary";
import { zipPackage } from "./zip-package";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";

const note = (p: ReturnType<typeof projectMarkdown>, n: number) =>
  p.files.find((f) => f.lifeOsId === id(n))!;
describe("Project Markdown contract", () => {
  it("projects every canonical kind with Properties, stable links, hashes and one Resource across contexts", () => {
    const p = projectMarkdown(projectionFixture(), "fixed");
    expect(p.files).toHaveLength(7);
    expect(new Set(p.files.map((f) => f.path)).size).toBe(7);
    expect(note(p, 1).content).toContain("life_os_projection_version: 1");
    expect(note(p, 1).content).toContain('life_os_type: "project"');
    expect(note(p, 6).content).toContain("Primary Work Artifact");
    expect(note(p, 5).content).toContain("Explicit evidence");
    for (const f of p.files) {
      expect(contentHash(f.content)).toBe(f.contentHash);
      for (const m of f.content.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g))
        expect(p.files.some((n) => n.path === `${m[1]}.md`)).toBe(true);
    }
    expect(note(p, 2).content).toContain("0 / 2 aktive Tasks erledigt");
    expect(note(p, 8).content).toContain("## Availability\n\nBLOCKED");
  });
  it("is deterministic under repeat and shuffled source arrays; rename preserves identity and updates paths", () => {
    const s = projectionFixture(),
      a = projectMarkdown(s, "a");
    const b = projectMarkdown(
      {
        ...s,
        tasks: [...s.tasks].reverse(),
        relations: [...s.relations].reverse(),
      },
      "b",
    );
    expect(a.files).toEqual(b.files);
    s.tasks[0].title = "API Boundary implementieren";
    const renamed = projectMarkdown(s);
    expect(note(renamed, 3).path).toBe("Tasks/API Boundary implementieren.md");
    expect(note(renamed, 3).lifeOsId).toBe(note(a, 3).lifeOsId);
    expect(note(renamed, 3).content).toContain("# API Boundary implementieren");
    expect(note(renamed, 8).content).toContain(
      "[[Tasks/API Boundary implementieren]]",
    );
    expect(renamed.files).toHaveLength(a.files.length);
  });
  it("regenerates dependencies while preserving all user bytes; archive never releases blockers", () => {
    const s = projectionFixture(),
      a = projectMarkdown(s);
    const old = note(a, 8).content.replace(
      userStart,
      userStart + "\r\nMeine freien Gedanken 🧠\r\n[[Personal]]",
    );
    s.tasks[0].archived_at = "2026-09-10";
    expect(note(projectMarkdown(s), 8).content).toContain(
      "## Availability\n\nBLOCKED",
    );
    s.dependencies = [];
    const b = note(projectMarkdown(s), 8).content;
    const merged = replaceGeneratedState(old, b);
    expect(merged.slice(merged.indexOf(userStart))).toBe(
      old.slice(old.indexOf(userStart)),
    );
    expect(merged).toContain("## Blocked by\n\n—");
    expect(merged).toContain("## Availability\n\nREADY");
    expect(replaceGeneratedState(merged, b)).toBe(merged);
    expect(() => replaceGeneratedState("Unmarked personal note", b)).toThrow();
    expect(() => replaceGeneratedState(old + generatedStart, b)).toThrow();
    expect(() => replaceGeneratedState(old, note(a, 3).content)).toThrow();
  });
  it("escapes prose, aliases, unicode and YAML without inventing links or embeds", () => {
    const s = projectionFixture();
    s.tasks[0].title = 'Ä 🧠 [x]|# ^ "\n---\n![[evil]]';
    s.tasks[0].description =
      "<script>x</script>\n<!-- LIFE_OS_USER_END -->\n![](https://example.test/image)";
    const p = projectMarkdown(s);
    expect(note(p, 3).content).not.toContain("<script>");
    expect(note(p, 3).content).not.toContain("![[evil]]");
    expect(note(p, 8).content).toContain("Ä 🧠");
    expect(wikiLink("Tasks/a b.md", "a|b")).toContain("a&#124;b");
    expect(() =>
      readablePaths([
        { type: "task", id: "../../secret", title: "A", folder: "Tasks" },
      ]),
    ).toThrow();
    expect(() =>
      replaceGeneratedState(note(p, 3).content, note(p, 3).content),
    ).not.toThrow();
  });
  it("omits signed URL credentials/query/fragment and generates a standard ZIP readable independently", () => {
    const s = projectionFixture();
    s.tasks[0].title = "Überprüfung 🧠";
    s.resources[0].url =
      "https://user:pass@example.test/repo?token=hidden#secret";
    const p = projectMarkdown(s, "fixed");
    expect(note(p, 6).content).not.toMatch(/user:pass|token=hidden|#secret/);
    const zip = zipPackage(p.files);
    const entries = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          "import sys,io,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))",
        ],
        { input: zip },
      ).toString(),
    );
    expect(entries[note(p, 1).path]).toBe(note(p, 1).content);
    expect(entries["Tasks/Überprüfung 🧠.md"]).toBe(note(p, 3).content);
    expect(zipPackage(p.files)).toEqual(zip);
    expect(() => zipPackage([{ path: "../bad", content: "" }])).toThrow();
    expect(() => zipPackage([p.files[0], p.files[0]])).toThrow();
  });
  it("bounds the requested 100 Task / 20 Milestone / 100 Dependency / 30 context workload", () => {
    const s = projectionFixture();
    s.tasks = Array.from({ length: 100 }, (_, i) => ({
      ...s.tasks[0],
      id: id(100 + i),
      title: `Task ${i}`,
    }));
    s.milestones = Array.from({ length: 20 }, (_, i) => ({
      ...s.milestones[0],
      id: id(300 + i),
      sort_order: i,
    }));
    s.tasks.forEach((t, i) => {
      t.milestone_id = s.milestones[i % 20].id;
    });
    s.dependencies = Array.from({ length: 100 }, (_, i) => ({
      id: id(400 + i),
      project_id: id(1),
      predecessor_task_id: s.tasks[i % 98].id,
      successor_task_id: s.tasks[(i % 98) + 1].id,
    }));
    s.resources = Array.from({ length: 30 }, (_, i) => ({
      ...s.resources[0],
      id: id(600 + i),
    }));
    s.relations = s.resources.map((r, i) => ({
      ...s.relations[0],
      id: id(700 + i),
      resource_id: r.id,
    }));
    const start = performance.now();
    const p = projectMarkdown(s, "fixed");
    const zip = zipPackage(p.files);
    expect(performance.now() - start).toBeLessThan(2000);
    expect(zip.byteLength).toBeLessThan(2 * 1024 * 1024);
    expect(p.files).toHaveLength(153);
  });
});

it("rejects pasted credentials after escaping, permits local Host authority and rejects cross-origin requests", () => {
  expect(containsExportCredential("api&#95;token=synthetic&#45;secret")).toBe(
    true,
  );
  expect(containsExportCredential("eyJabcdefghijklm.ABCDEF.signature")).toBe(
    true,
  );
  expect(containsExportCredential("PostgreSQL remains canonical")).toBe(false);
  expect(
    sameOriginExportRequest(
      new Request("http://localhost:4300/api/export", {
        headers: { host: "127.0.0.1:4300", origin: "http://127.0.0.1:4300" },
      }),
    ),
  ).toBe(true);
  expect(
    sameOriginExportRequest(
      new Request("http://localhost:4300/api/export", {
        headers: { host: "127.0.0.1:4300", origin: "https://evil.test" },
      }),
    ),
  ).toBe(false);
  expect(
    sameOriginExportRequest(new Request("http://localhost:4300/api/export")),
  ).toBe(false);
});

it("preserves canonical Artifact roles, labels history and removes absent sources without copies", () => {
  const s = projectionFixture();
  s.resources.push(
    { ...s.resources[0], id: id(20), title: "Dataset" },
    { ...s.resources[0], id: id(21), title: "Reference" },
  );
  s.relations.push(
    {
      ...s.relations[0],
      id: id(22),
      resource_id: id(20),
      project_role: "additional_artifact",
    },
    {
      ...s.relations[0],
      id: id(23),
      resource_id: id(21),
      project_role: "reference",
    },
  );
  const p = projectMarkdown(s);
  expect(note(p, 1).content).toContain(
    "## Additional Work Artifacts\n\n- [[Resources/Dataset]]",
  );
  expect(note(p, 1).content).toContain(
    "## Resources & References\n\n- [[Resources/Reference]]",
  );
  s.resources[0].archived_at = "2026-09-10";
  const archived = projectMarkdown(s);
  expect(note(archived, 1).content).toContain("## Primary Work Artifact\n\n—");
  expect(note(archived, 6).content).toContain("historische Daten");
  s.milestones[0].archived_at = "2026-09-10";
  expect(note(projectMarkdown(s), 2).content).toContain(
    "Archivierter Milestone · kein aktiver Fortschritt",
  );
  s.resources = s.resources.filter((r) => r.id !== id(20));
  s.relations = s.relations.filter((r) => r.resource_id !== id(20));
  expect(projectMarkdown(s).files.some((f) => f.lifeOsId === id(20))).toBe(
    false,
  );
});

it("maps collisions deterministically across case, Unicode, reserved names and generated suffixes", () => {
  const entities = [
    "Review",
    "Review",
    "review",
    "CON",
    "../a:b*?[]#^",
    "é",
    "e\u0301",
  ].map((title, i) => ({
    type: "task",
    id: id(i + 1),
    title,
    folder: "Tasks",
  }));
  const paths = readablePaths(entities);
  expect(paths).toEqual(readablePaths([...entities].reverse()));
  expect(paths.get(`task:${id(1)}`)).toBe("Tasks/Review.md");
  expect(paths.get(`task:${id(2)}`)).toMatch(
    /^Tasks\/Review--[a-f0-9]{8}\.md$/,
  );
  expect(new Set([...paths.values()].map((p) => p.toLowerCase())).size).toBe(7);
  expect(safeTitle("CON.txt")).toBe("_CON.txt");
  expect(safeTitle("... ")).toBe("Untitled");
  expect(Buffer.byteLength(safeTitle("🧠".repeat(100)))).toBeLessThanOrEqual(
    160,
  );
  const suffix = paths.get(`task:${id(2)}`)!.slice(6, -3);
  const extra = readablePaths([
    ...entities,
    { type: "task", id: id(30), title: suffix, folder: "Tasks" },
  ]);
  expect(extra.get(`task:${id(30)}`)).toBe(`Tasks/${suffix}.md`);
  expect(extra.get(`task:${id(2)}`)).not.toBe(`Tasks/${suffix}.md`);
});
it("renames by manifest identity with exactly one file and preserved user bytes, including legacy UUID paths", () => {
  const s = projectionFixture(),
    a = projectMarkdown(s);
  const old = note(a, 3);
  old.path = `Tasks/${id(3)}.md`;
  old.content = old.content.replace(
    userStart,
    userStart + "\r\nUser 🧠 [[Personal]]\r\n",
  );
  a.manifest.files.find((f) => f.lifeOsId === old.lifeOsId)!.path = old.path;
  s.tasks[0].title = "API Boundary implementieren";
  const next = projectMarkdown(s),
    updated = updateProjection(a, next);
  expect(updated.files.filter((f) => f.lifeOsId === id(3))).toHaveLength(1);
  expect(updated.files.some((f) => f.path === old.path)).toBe(false);
  expect(
    note(updated, 3).content.slice(note(updated, 3).content.indexOf(userStart)),
  ).toBe(old.content.slice(old.content.indexOf(userStart)));
  expect(
    updated.manifest.changes.find((f) => f.lifeOsId === id(3)),
  ).toMatchObject({
    operation: "RENAME",
    oldPath: old.path,
    newPath: "Tasks/API Boundary implementieren.md",
  });
  expect(contentHash(note(updated, 3).content)).toBe(
    note(updated, 3).contentHash,
  );
  expect(updated.retainedFiles).toEqual([]);
  expect(updateProjection(updated, next).files).toEqual(updated.files);
  const without = {
    ...next,
    files: next.files.filter((f) => f.lifeOsId !== id(3)),
  };
  const retained = updateProjection(updated, without);
  expect(retained.retainedFiles[0].content).toContain("User 🧠");
  expect(updateProjection(retained, without).retainedFiles).toEqual(
    retained.retainedFiles,
  );
  expect(note(updateProjection(retained, next), 3).content).toContain(
    "User 🧠",
  );
});
