import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dashboardProjectWorkBalance } from "@/features/dashboard/project-work-balance";
import { projectWorkBalance } from "@/features/entities/workbench/project-work-balance";
import {
  readDashboardProjectWork,
  type ProjectWorkTable,
} from "./dashboard-project-work-read";
import { supabaseApplicationReads } from "./supabase-adapter";
import type { SupabaseClientLike } from "../supabase/database.types";
import { initializeSyntheticDatabase } from "../sqlite/synthetic-database";
import { SqliteRuntime } from "../sqlite/runtime";
import { issueOwnerContext } from "../sqlite/owner-context";
import { sqliteApplicationReads } from "./sqlite-read-services";

const project = randomUUID(),
  otherProject = randomUUID();
const task = (status = "planned", project_id = project) => ({
  id: randomUUID(),
  title: "Recorded work",
  project_id,
  status,
  completed_at: status === "done" ? "2026-10-21T10:00:00Z" : null,
  archived_at: null as string | null,
});
const tasks = [
  task("done"),
  task(),
  task("active"),
  task(),
  task(),
  task("waiting"),
  task(),
  task("canceled"),
  { ...task(), archived_at: "now" },
  task("done", otherProject),
];
const dependencies = [
  {
    id: randomUUID(),
    predecessor_task_id: tasks[1].id,
    successor_task_id: tasks[3].id,
  },
  {
    id: randomUUID(),
    predecessor_task_id: randomUUID(),
    successor_task_id: tasks[4].id,
  },
  {
    id: randomUUID(),
    predecessor_task_id: tasks[0].id,
    successor_task_id: tasks[2].id,
  },
];
const sources = [{ task_id: tasks[6].id }];
const milestones = [
  { project_id: project, status: "done", archived_at: null },
  { project_id: project, status: "active", archived_at: null },
  { project_id: project, status: "done", archived_at: "now" },
  { project_id: otherProject, status: "done", archived_at: null },
];
const data = { tasks, dependencies, sources, milestones };
describe("#170 canonical Project card projection", () => {
  it("shares B7 lifecycle, missing-predecessor and source semantics, with explicit milestones", () => {
    const b = dashboardProjectWorkBalance(project, data);
    expect(b).toEqual({
      state: "available",
      total: 7,
      counts: { done: 1, ready: 2, blocked: 2, other: 2 },
      milestones: { total: 2, done: 1 },
    });
    expect(b.counts).toEqual(
      projectWorkBalance(project, tasks, { tasks, dependencies }, sources)
        .counts,
    );
  });
  it("keeps count sums and B7 parity over large and varied recorded sets", () => {
    for (let size = 0; size <= 1100; size += 11) {
      const tasks = Array.from({ length: size }, (_, n) =>
        task(["done", "planned", "waiting", "active", "canceled"][n % 5]),
      );
      const b = dashboardProjectWorkBalance(project, {
        ...data,
        tasks,
        dependencies: [],
        sources: [],
      });
      expect(Object.values(b.counts).reduce((a, n) => a + n, 0)).toBe(b.total);
      expect(b.counts).toEqual(
        projectWorkBalance(project, tasks, { tasks, dependencies: [] }, [])
          .counts,
      );
    }
  });
  it("preserves empty, milestone-only and all-done work without inferring Project completion", () => {
    expect(
      dashboardProjectWorkBalance(project, { ...data, tasks: [] }).total,
    ).toBe(0);
    expect(
      dashboardProjectWorkBalance(project, { ...data, tasks: [] }).milestones,
    ).toEqual({ total: 2, done: 1 });
    expect(
      dashboardProjectWorkBalance(project, {
        ...data,
        tasks: [tasks[0]],
        milestones: [],
      }),
    ).toMatchObject({
      state: "available",
      total: 1,
      counts: { done: 1 },
      milestones: { total: 0, done: 0 },
    });
  });
  it.each(["dependencies", "sources"] as const)(
    "retains totals but never claims READY/BLOCKED when %s fail",
    (key) => {
      expect(
        dashboardProjectWorkBalance(project, { ...data, [key]: null }),
      ).toMatchObject({
        state: "reduced",
        total: 7,
        counts: { done: 1, ready: 0, blocked: 0, other: 6 },
      });
    },
  );
  it("distinguishes unavailable Task/Milestone reads from real empty datasets", () => {
    expect(
      dashboardProjectWorkBalance(project, { ...data, tasks: null }).state,
    ).toBe("unavailable");
    expect(
      dashboardProjectWorkBalance(project, { ...data, milestones: null })
        .milestones,
    ).toBeNull();
  });
});

it.each([
  "tasks",
  "task_dependencies",
  "schedule_source_links",
  "project_milestones",
] as const)("isolates a rejected or malformed %s read", async (failed) => {
  const datasets = {
    tasks,
    task_dependencies: dependencies,
    schedule_source_links: sources,
    project_milestones: milestones,
  };
  const result = await readDashboardProjectWork(
    async (table) => {
      if (table === failed)
        throw new Error("private database detail must not reach UI");
      return datasets[table];
    },
    [project],
  );
  expect(
    result[
      (
        {
          tasks: "tasks",
          task_dependencies: "dependencies",
          schedule_source_links: "sources",
          project_milestones: "milestones",
        } as const
      )[failed]
    ],
  ).toBeNull();
  const malformed = await readDashboardProjectWork(
    async () => [{ invalid: true }],
    [project],
  );
  expect(malformed.tasks).toBeNull();
  expect(JSON.stringify(result)).not.toContain("private database");
});

it("paginates owner-scoped Supabase work without per-card Workbench reads or truncating 1001 Tasks", async () => {
  const owned = Array.from({ length: 1001 }, () => task());
  const calls: {
    table: ProjectWorkTable;
    owner?: string;
    key?: string;
    ids?: string[];
    start?: number;
  }[] = [];
  const client = {
    from(table: ProjectWorkTable) {
      const call: (typeof calls)[number] = { table };
      calls.push(call);
      const query = {
        select: () => query,
        order: () => query,
        eq: (key: string, value: string) => {
          expect(key).toBe("user_id");
          call.owner = value;
          return query;
        },
        in: (key: string, ids: string[]) => {
          call.key = key;
          call.ids = ids;
          return query;
        },
        range: async (start: number, end: number) => {
          call.start = start;
          return {
            data: table === "tasks" ? owned.slice(start, end + 1) : [],
            error: null,
          };
        },
      };
      return query;
    },
  } as unknown as SupabaseClientLike;
  const read = await supabaseApplicationReads(
    client,
    "authenticated-owner",
  ).dashboardProjectWork([project, otherProject]);
  expect(read.tasks).toHaveLength(1001);
  expect(calls.filter((c) => c.table === "tasks").map((c) => c.start)).toEqual([
    0, 500, 1000,
  ]);
  expect(calls.every((c) => c.owner === "authenticated-owner")).toBe(true);
  expect(
    calls
      .filter((c) => c.table !== "schedule_source_links")
      .every((c) => c.key === "project_id" && c.ids?.includes(project)),
  ).toBe(true);
  expect(calls.filter((c) => c.table === "schedule_source_links")).toHaveLength(
    6,
  );
});

it("discards an incomplete Task page sequence instead of presenting a trustworthy-looking partial total", async () => {
  const firstPage = Array.from({ length: 500 }, () => task());
  const client = {
    from(table: ProjectWorkTable) {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: () => query,
        range: async (start: number) =>
          table !== "tasks"
            ? { data: [], error: null }
            : start === 0
              ? { data: firstPage, error: null }
              : { data: null, error: { message: "Later page unavailable" } },
      };
      return query;
    },
  } as unknown as SupabaseClientLike;
  const read = await supabaseApplicationReads(
    client,
    "authenticated-owner",
  ).dashboardProjectWork([project]);
  expect(read.tasks).toBeNull();
  expect(dashboardProjectWorkBalance(project, read).state).toBe("unavailable");
});

it("reads native canonical work with owner and Project scope and denies a forged owner context", async () => {
  const owner = "11600000-0000-4000-8000-000000000001";
  const path = join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-card-")),
    "synthetic.db",
  );
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true });
  const context = issueOwnerContext(owner);
  try {
    store.command(context, "synthetic.initialize", (db) => {
      for (const id of [project, otherProject])
        db.prepare(
          "INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Card','active',life_now(),life_now())",
        ).run(id, owner);
      for (const t of [tasks[0], tasks[1], tasks[9]])
        db.prepare(
          "INSERT INTO tasks(id,user_id,title,project_id,status,completed_at,created_at,updated_at) VALUES(?,?,'Task',?,?,?,life_now(),life_now())",
        ).run(t.id, owner, t.project_id, t.status, t.completed_at);
      db.prepare(
        "INSERT INTO project_milestones(id,user_id,project_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?,'Explicit stage','done',0,life_now(),life_now())",
      ).run(randomUUID(), owner, project);
    });
    const read = await sqliteApplicationReads(
      store,
      context,
    ).dashboardProjectWork([project]);
    expect(read.tasks).toHaveLength(2);
    expect(dashboardProjectWorkBalance(project, read)).toMatchObject({
      state: "available",
      total: 2,
      counts: { done: 1, ready: 1 },
      milestones: { total: 1, done: 1 },
    });
    const foreign = await sqliteApplicationReads(
      store,
      issueOwnerContext(randomUUID()),
    ).dashboardProjectWork([project]);
    expect(foreign.tasks ?? []).toEqual([]);
  } finally {
    store.close();
  }
});
