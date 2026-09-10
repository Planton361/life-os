import { expect, it } from "vitest";
import { readProjectProjection } from "./project-projection-read";
import {
  projectionFixture,
  fixtureId as id,
} from "../../../obsidian-projection/projection-fixture";
function fakeClient() {
  const s = projectionFixture();
  const data: Record<string, Record<string, unknown>[]> = {
    projects: [s.project],
    tasks: s.tasks,
    project_milestones: s.milestones,
    goals: s.goals,
    skills: s.skills,
    resources: s.resources,
    areas: s.areas,
    resource_relations: s.relations,
    task_skill_links: s.taskSkills,
    skill_evidence: s.evidence,
    task_dependencies: s.dependencies,
  };
  for (const rows of Object.values(data))
    for (const row of rows) row.user_id = "owner";
  const calls: { table: string; filters: [string, unknown][] }[] = [];
  const client = {
    from(table: string) {
      const call = { table, filters: [] as [string, unknown][] };
      calls.push(call);
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          call.filters.push([key, value]);
          return q;
        },
        in: (key: string, value: unknown) => {
          call.filters.push([key, value]);
          return q;
        },
        order: () => q,
        range: async (start: number, end: number) => {
          const rows = data[table].filter((row) =>
            call.filters.every(([key, v]) =>
              Array.isArray(v) ? v.includes(row[key]) : row[key] === v,
            ),
          );
          return {
            data: rows.slice(start, end + 1),
            count: rows.length,
            error: null,
          };
        },
      };
      return q;
    },
  };
  return { client: client as never, data, calls };
}
it("reads exactly one owned Project graph; scopes every table and excludes unrelated and foreign context", async () => {
  const f = fakeClient();
  f.data.projects.push({
    ...f.data.projects[0],
    id: id(900),
    user_id: "stranger",
  });
  f.data.resources.push({
    ...f.data.resources[0],
    id: id(901),
    user_id: "stranger",
  });
  f.data.resource_relations.push({
    ...f.data.resource_relations[0],
    id: id(902),
    resource_id: id(901),
  });
  const result = await readProjectProjection(f.client, "owner", {
    projectId: id(1),
  });
  expect(result.tasks).toHaveLength(2);
  expect(result.resources).toHaveLength(1);
  expect(result.skills).toHaveLength(1);
  expect(result.evidence).toHaveLength(1);
  expect(
    f.calls.every((c) =>
      c.filters.some(([k, v]) => k === "user_id" && v === "owner"),
    ),
  ).toBe(true);
  expect(f.calls.length).toBeLessThan(20);
  await expect(
    readProjectProjection(f.client, "owner", { projectId: id(900) }),
  ).rejects.toThrow("Zugriff");
  const count = f.calls.length;
  await expect(
    readProjectProjection(f.client, "owner", {
      projectId: "bad",
      userId: "stranger",
    }),
  ).rejects.toThrow();
  expect(f.calls).toHaveLength(count);
});
it("retains archived predecessor truth, rejects oversized and inconsistent graphs rather than truncating", async () => {
  const f = fakeClient();
  f.data.tasks[0].archived_at = "2026-09-10";
  expect(
    (await readProjectProjection(f.client, "owner", { projectId: id(1) }))
      .tasks[0].archived_at,
  ).toBeTruthy();
  f.data.task_dependencies[0].predecessor_task_id = id(999);
  await expect(
    readProjectProjection(f.client, "owner", { projectId: id(1) }),
  ).rejects.toThrow("Dependencies");
  f.data.tasks = Array.from({ length: 2001 }, (_, i) => ({
    ...f.data.tasks[0],
    id: id(1000 + i),
  }));
  await expect(
    readProjectProjection(f.client, "owner", { projectId: id(1) }),
  ).rejects.toThrow("Exportgrenze");
});
