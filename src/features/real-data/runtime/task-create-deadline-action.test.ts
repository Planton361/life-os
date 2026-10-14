import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  sourceReviewFixture,
  scope,
} from "../../../../tests/sqlite/source-review-fixture";
import { sqliteApplicationReads } from "./sqlite-read-services";
import {
  sqliteApplicationRepositories,
  sqliteApplicationScopes,
  sqliteApplicationUseCases,
} from "./sqlite-adapter";

const boundary = vi.hoisted(() => ({ mode: "manual", auth: null as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn() }) }));
vi.mock("@/features/profile-data/profile-cookie", () => ({
  getCurrentLifeOsProfileId: async () => boundary.mode,
}));
vi.mock("./application-context", () => ({
  createAuthenticatedApplicationContext: async () => boundary.auth,
}));
import { createPortfolioTaskAction } from "../actions/task.actions";
import { projectDepthCommand } from "../sqlite/repositories/project-depth-repository";

let f: ReturnType<typeof sourceReviewFixture>;
let reads: ReturnType<typeof sqliteApplicationReads>;
let repos: ReturnType<typeof sqliteApplicationRepositories>;
let stage: string;
beforeEach(() => {
  f = sourceReviewFixture();
  stage = randomUUID();
  reads = sqliteApplicationReads(f.store, f.context);
  repos = sqliteApplicationRepositories(f.store, f.context);
  f.store.command(f.context, "synthetic.seed", (db, owner) =>
    db
      .prepare(
        "INSERT INTO goal_milestones(id,user_id,goal_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?,'Create deadline stage','active',0,life_now(),life_now())",
      )
      .run(stage, owner, f.goal),
  );
  boundary.mode = "manual";
  boundary.auth = {
    ok: true,
    user: { id: scope.userId },
    data: {
      repositories: repos,
      reads,
      scopes: sqliteApplicationScopes(f.store, f.context),
      useCases: sqliteApplicationUseCases(f.store, f.context),
    },
  };
});
afterEach(() => {
  f.store.close();
  vi.restoreAllMocks();
});
function form(dueAt: string | undefined = "2026-10-12", contextual = false) {
  const value = new FormData();
  value.set("title", "Create deadline " + randomUUID());
  value.set("commandId", randomUUID());
  value.set("userId", randomUUID());
  value.set("profileId", randomUUID());
  if (dueAt !== undefined) value.set("dueAt", dueAt);
  if (contextual) {
    value.set("goalId", f.goal);
    value.set("goalMilestoneId", stage);
  }
  return value;
}
function snapshot() {
  return f.store.read(f.context, (db) => ({
    tasks: db.prepare("SELECT * FROM tasks ORDER BY id").all(),
    support: db
      .prepare("SELECT * FROM goal_milestone_task_support ORDER BY id")
      .all(),
    receipts: db
      .prepare("SELECT * FROM goal_command_receipts ORDER BY command_id")
      .all(),
    revision: db.prepare("SELECT data_revision FROM runtime_metadata").get(),
  }));
}
const cases = [
  ["Europe/Berlin", "2026-10-12", "2026-10-12T21:59:59.000000Z"],
  ["Europe/Berlin", "2026-01-31", "2026-01-31T22:59:59.000000Z"],
  ["Europe/Berlin", "2026-03-28", "2026-03-28T22:59:59.000000Z"],
  ["Europe/Berlin", "2026-03-29", "2026-03-29T21:59:59.000000Z"],
  ["Europe/Berlin", "2026-10-24", "2026-10-24T21:59:59.000000Z"],
  ["Europe/Berlin", "2026-10-25", "2026-10-25T22:59:59.000000Z"],
  ["Europe/Berlin", "2026-12-31", "2026-12-31T22:59:59.000000Z"],
  ["America/Los_Angeles", "2026-03-08", "2026-03-09T06:59:59.000000Z"],
  ["America/Los_Angeles", "2026-11-01", "2026-11-02T07:59:59.000000Z"],
  ["America/Los_Angeles", "2026-12-31", "2027-01-01T07:59:59.000000Z"],
  ["Asia/Tokyo", "2027-01-01", "2027-01-01T14:59:59.000000Z"],
  ["Pacific/Auckland", "2026-09-27", "2026-09-27T10:59:59.000000Z"],
];
for (const contextual of [false, true]) {
  it.each(cases)(
    (contextual ? "Goal stage" : "normal") +
      " Create uses current profile %s %s once",
    async (zone, day, expected) => {
      f.store.command(f.context, "synthetic.seed", (db, owner) =>
        db
          .prepare("UPDATE profiles SET timezone=? WHERE id=?")
          .run(zone, owner),
      );
      const spy = vi.spyOn(reads, "profileTimezone");
      const result = await createPortfolioTaskAction(form(day, contextual));
      expect(result.status).toBe("success");
      expect(spy).toHaveBeenCalledTimes(1);
      const state = snapshot();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]).toMatchObject({
        user_id: scope.userId,
        due_at: expected,
        status: "planned",
        planned_date: null,
        scheduled_start_at: null,
      });
      expect(state.support).toHaveLength(contextual ? 1 : 0);
    },
  );
  it.each(["not-a-date", "2026-02-30", "2026-13-01", "2011-12-30"])(
    (contextual ? "Goal stage" : "normal") +
      " rejects invalid/nonexistent local day %s before any write",
    async (day) => {
      vi.spyOn(reads, "profileTimezone").mockResolvedValue(
        day === "2011-12-30" ? "Pacific/Apia" : "Europe/Berlin",
      );
      const before = snapshot();
      const result = await createPortfolioTaskAction(form(day, contextual));
      expect(result).toMatchObject({
        status: "error",
        message: expect.stringContaining("Deadline oder Profil-Zeitzone"),
      });
      expect(snapshot()).toEqual(before);
    },
  );
  it.each([undefined, null, "", " ", "Not/AZone"])(
    (contextual ? "Goal stage" : "normal") +
      " rejects missing/invalid zone %s before Task/support/receipt",
    async (zone) => {
      vi.spyOn(reads, "profileTimezone").mockResolvedValue(zone as never);
      const before = snapshot();
      expect(
        await createPortfolioTaskAction(form("2026-10-12", contextual)),
      ).toMatchObject({
        status: "error",
        message: expect.stringContaining("Deadline oder Profil-Zeitzone"),
      });
      expect(snapshot()).toEqual(before);
    },
  );
}
it("profile read failure denies Create without partial writes", async () => {
  vi.spyOn(reads, "profileTimezone").mockRejectedValue(
    new Error("Unavailable"),
  );
  const before = snapshot();
  expect((await createPortfolioTaskAction(form())).status).toBe("error");
  expect(snapshot()).toEqual(before);
});
it.each(["", "missing"])(
  "no deadline (%s) does not require timezone or schedule a Task",
  async (day) => {
    const spy = vi
      .spyOn(reads, "profileTimezone")
      .mockRejectedValue(new Error("Unavailable"));
    const input = form(day);
    if (day === "missing") input.delete("dueAt");
    expect((await createPortfolioTaskAction(input)).status).toBe("success");
    expect(spy).not.toHaveBeenCalled();
    expect(snapshot().tasks[0]).toMatchObject({
      due_at: null,
      planned_date: null,
      scheduled_start_at: null,
    });
  },
);
it.each(["demo", "empty", "unauthenticated"])(
  "denies %s before profile reads and writes",
  async (mode) => {
    if (mode === "unauthenticated")
      boundary.auth = { ok: false, error: "unauthenticated" };
    else boundary.mode = mode;
    const spy = vi.spyOn(reads, "profileTimezone");
    const before = snapshot();
    expect((await createPortfolioTaskAction(form())).status).toBe("blocked");
    expect(spy).not.toHaveBeenCalled();
    expect(snapshot()).toEqual(before);
  },
);
it.each(["areaId", "projectId", "goalId", "milestoneId"])(
  "foreign/mismatched %s cannot create a partial Task",
  async (key) => {
    const input = form();
    input.set(key, randomUUID());
    const before = snapshot();
    expect((await createPortfolioTaskAction(input)).status).toBe("error");
    expect(snapshot()).toEqual(before);
  },
);
it.each(["areas", "goals", "projects"])(
  "archived %s rejects Create without partial writes",
  async (table) => {
    const id =
      table === "areas" ? f.area : table === "goals" ? f.goal : f.project;
    if (table === "projects") {
      projectDepthCommand(f.store, f.context, {
        operation: "project.archive",
        commandId: randomUUID(),
        projectId: id,
        expectedRevision: 0,
        expectedCycle: 0,
        payload: {},
      });
    } else {
      f.store.command(f.context, "synthetic.seed", (db) =>
        db
          .prepare(`UPDATE ${table} SET archived_at=life_now() WHERE id=?`)
          .run(id),
      );
    }
    const input = form();
    input.set(
      table === "areas" ? "areaId" : table === "goals" ? "goalId" : "projectId",
      id,
    );
    const before = snapshot();
    expect((await createPortfolioTaskAction(input)).status).toBe("error");
    expect(snapshot()).toEqual(before);
  },
);
it.each([false, true])(
  "Project/Goal inheritance mismatch denies Create (Goal stage=%s)",
  async (contextual) => {
    const otherGoal = randomUUID();
    f.store.command(f.context, "synthetic.seed", (db, owner) => {
      db.prepare(
        "INSERT INTO goals(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Other goal','active',life_now(),life_now())",
      ).run(otherGoal, owner);
      db.prepare("UPDATE projects SET goal_id=? WHERE id=?").run(
        otherGoal,
        f.project,
      );
    });
    const input = form("2026-10-12", contextual);
    input.set("projectId", f.project);
    input.set("goalId", f.goal);
    const before = snapshot();
    expect((await createPortfolioTaskAction(input)).status).toBe("error");
    expect(snapshot()).toEqual(before);
  },
);
