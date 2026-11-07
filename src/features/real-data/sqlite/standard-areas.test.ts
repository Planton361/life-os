import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { bootstrapProductionDatabase } from "./production-bootstrap";
import { ensureReviewDatabase, REVIEW_OWNER_ID } from "./review-database";
import { SqliteRuntime } from "./runtime";
import { issueOwnerContext } from "./owner-context";
import { seedStandardAreas } from "./standard-areas";
import { ownedArea } from "./commands/retained-commands";
import { sqliteApplicationRepositories } from "../runtime/sqlite-adapter";
import {
  readSqliteSkillDevelopment,
  skillDevelopmentCommand,
} from "./repositories/skill-development-repository";

// #194: a fresh database starts with the four standard context Areas, and the
// existing Area selection persists for Tasks, Projects, Goals and Skills.
const owner = "19400000-0000-4000-8000-000000000001";
const context = issueOwnerContext(owner);
const scope = { userId: owner, profileId: owner };
const standard = [
  { key: "coding", name: "Coding", sort_order: BigInt(80) },
  { key: "education", name: "Education", sort_order: BigInt(90) },
  { key: "work", name: "Work", sort_order: BigInt(100) },
  { key: "life", name: "Life", sort_order: BigInt(110) },
];
function fresh(name = "canonical.db") {
  return join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-194-areas-")),
    name,
  );
}
function bootstrap() {
  const path = fresh();
  bootstrapProductionDatabase(path, {
    ownerId: owner,
    displayName: "Area owner",
    timezone: "Europe/Berlin",
  });
  return path;
}
const areas = (store: SqliteRuntime) =>
  store.read(context, (db) =>
    db
      .prepare(
        "SELECT key,name,sort_order FROM areas WHERE user_id=? AND archived_at IS NULL ORDER BY sort_order",
      )
      .all(owner),
  );
const areaId = (store: SqliteRuntime, key: string) =>
  store.read(
    context,
    (db) =>
      (
        db
          .prepare("SELECT id FROM areas WHERE user_id=? AND key=?")
          .get(owner, key) as { id: string }
      ).id,
  );
const ok = <T>(r: { ok: boolean; data?: T }) => {
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r.data as T;
};

describe("standard Areas", () => {
  it("are created once by fresh production and review initialization", () => {
    const store = new SqliteRuntime(bootstrap());
    try {
      expect(areas(store)).toEqual(standard);
      // Lazy domain creation finds the seeded Area instead of adding one.
      store.command(context, "retained.area", (db) => {
        for (const { key } of standard) ownedArea(db, owner, key, true);
      });
      expect(areas(store)).toEqual(standard);
    } finally {
      store.close();
    }
    const review = fresh("life-os-review.db");
    ensureReviewDatabase(review);
    ensureReviewDatabase(review);
    const reviewStore = new SqliteRuntime(review);
    try {
      expect(
        reviewStore.read(issueOwnerContext(REVIEW_OWNER_ID), (db) =>
          db
            .prepare(
              "SELECT key,name,sort_order FROM areas WHERE archived_at IS NULL ORDER BY sort_order",
            )
            .all(),
        ),
      ).toEqual(standard);
    } finally {
      reviewStore.close();
    }
  });

  it("seeding is idempotent and keeps existing Area records", () => {
    const store = new SqliteRuntime(bootstrap());
    try {
      const before = store.read(context, (db) =>
        db.prepare("SELECT * FROM areas ORDER BY id").all(),
      );
      store.command(context, "retained.area", (db) => {
        db.prepare("UPDATE areas SET name='Mein Leben' WHERE key='life'").run();
        seedStandardAreas(db, owner, "2026-11-07T00:00:00.000Z");
        seedStandardAreas(db, owner, "2026-11-07T00:00:00.000Z");
      });
      const after = store.read(context, (db) =>
        db.prepare("SELECT * FROM areas ORDER BY id").all(),
      ) as { id: string; key: string; name: string }[];
      expect(after.map((a) => a.id)).toEqual(
        (before as { id: string }[]).map((a) => a.id),
      );
      expect(after.find((a) => a.key === "life")?.name).toBe("Mein Leben");
    } finally {
      store.close();
    }
  });

  it("assign, change and clear Areas on Tasks, Projects, Goals and Skills; reload-stable; unknown, archived and invalid Areas are rejected", async () => {
    const path = bootstrap();
    let store = new SqliteRuntime(path);
    const life = areaId(store, "life"),
      work = areaId(store, "work"),
      coding = areaId(store, "coding");
    let repos = sqliteApplicationRepositories(store, context);
    const goal = ok<{ id: string }>(
      await repos.goals.createGoal({ ...scope, title: "#194 Goal", areaId: life }),
    );
    const project = ok<{ id: string }>(
      await repos.projects.createProject({
        ...scope,
        title: "#194 Project",
        areaId: work,
      }),
    );
    const task = ok<{ id: string }>(
      await repos.tasks.createTask({ ...scope, title: "#194 Task", areaId: life }),
    );
    const skill = skillDevelopmentCommand(store, context, {
      operation: "skill.create",
      commandId: randomUUID(),
      skillId: null,
      expectedRevision: null,
      payload: { name: "#194 Skill", area_id: coding },
    }) as { skill_id: string };
    const stored = () =>
      store.read(context, (db) =>
        Object.fromEntries(
          (
            [
              ["goal", "goals", goal.id],
              ["project", "projects", project.id],
              ["task", "tasks", task.id],
              ["skill", "skills", skill.skill_id],
            ] as const
          ).map(([name, table, id]) => [
            name,
            (
              db
                .prepare(`SELECT area_id FROM ${table} WHERE user_id=? AND id=?`)
                .get(owner, id) as { area_id: string | null }
            ).area_id,
          ]),
        ),
      );
    expect(stored()).toEqual({ goal: life, project: work, task: life, skill: coding });

    ok(await repos.goals.updateGoal({ ...scope, goalId: goal.id, areaId: work }));
    ok(
      await repos.projects.updateProject({
        ...scope,
        projectId: project.id,
        areaId: null,
      }),
    );
    ok(await repos.tasks.updateTask({ ...scope, taskId: task.id, areaId: coding }));
    skillDevelopmentCommand(store, context, {
      operation: "skill.edit",
      commandId: randomUUID(),
      skillId: skill.skill_id,
      expectedRevision: readSqliteSkillDevelopment(store, context, skill.skill_id)!
        .skill.development_revision,
      payload: { area_id: null },
    });

    store.close();
    store = new SqliteRuntime(path);
    repos = sqliteApplicationRepositories(store, context);
    const expected = { goal: work, project: null, task: coding, skill: null };
    expect(stored()).toEqual(expected);

    store.command(context, "retained.area", (db) =>
      db
        .prepare("UPDATE areas SET archived_at=life_now() WHERE id=?")
        .run(work),
    );
    for (const bad of [work, randomUUID(), "not-an-area"]) {
      expect(
        (await repos.tasks.createTask({ ...scope, title: "#194 bad", areaId: bad }))
          .ok,
      ).toBe(false);
      expect(
        (await repos.projects.createProject({ ...scope, title: "#194 bad", areaId: bad }))
          .ok,
      ).toBe(false);
      expect(
        (await repos.goals.updateGoal({ ...scope, goalId: goal.id, areaId: bad })).ok,
      ).toBe(false);
      expect(() =>
        skillDevelopmentCommand(store, context, {
          operation: "skill.create",
          commandId: randomUUID(),
          skillId: null,
          expectedRevision: null,
          payload: { name: "#194 bad", area_id: bad },
        }),
      ).toThrow();
    }
    // A different user's scope is refused before any Area lookup.
    const foreign = randomUUID();
    expect(
      (
        await repos.tasks.createTask({
          userId: foreign,
          profileId: foreign,
          title: "#194 foreign",
          areaId: life,
        })
      ).ok,
    ).toBe(false);
    expect(stored()).toEqual(expected);
    expect(
      store.read(context, (db) =>
        db.prepare("SELECT count(*) n FROM tasks WHERE title LIKE '#194 bad%' OR title LIKE '#194 foreign%'").get(),
      ),
    ).toEqual({ n: BigInt(0) });
    store.close();
  });
});
