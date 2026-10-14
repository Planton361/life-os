import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  sourceReviewFixture,
  scope,
} from "../../../../tests/sqlite/source-review-fixture";
import { sqliteApplicationReads } from "./sqlite-read-services";
import { sqliteApplicationRepositories } from "./sqlite-adapter";
import { taskDeadlineLocalDay } from "../domain/task-deadline";

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
import { updatePortfolioTaskAction } from "../actions/task.actions";

let f: ReturnType<typeof sourceReviewFixture>;
let id: string;
let reads: ReturnType<typeof sqliteApplicationReads>;
let repos: ReturnType<typeof sqliteApplicationRepositories>;
beforeEach(async () => {
  f = sourceReviewFixture();
  reads = sqliteApplicationReads(f.store, f.context);
  repos = sqliteApplicationRepositories(f.store, f.context);
  const result = await repos.tasks.createTask({
    ...scope,
    title: "Deadline fixture",
    dueAt: "2026-10-12T23:59:59.123456Z",
    plannedDate: "2026-10-10",
    scheduledStartAt: "2026-10-10T10:00:00.654321Z",
    durationMinutes: 17,
  });
  if (!result.ok) throw new Error(result.error.message);
  id = result.data.id;
  boundary.mode = "manual";
  boundary.auth = {
    ok: true,
    user: { id: scope.userId },
    data: {
      repositories: repos,
      reads,
      scopes: {
        ownsActiveProject: async () => false,
        ownsActiveGoal: async () => false,
      },
    },
  };
});
afterEach(() => f.store.close());
const row = () =>
  f.store.read(f.context, (db, owner) =>
    db.prepare("SELECT * FROM tasks WHERE user_id=? AND id=?").get(owner, id),
  ) as Record<string, string | null>;
function form(due: string | undefined = "2026-10-13") {
  const value = new FormData();
  for (const [key, field] of Object.entries({
    taskId: id,
    title: "Title only",
    status: "planned",
    priority: "none",
    expectedUpdatedAt: row().updated_at!,
    durationMinutes: "17",
    plannedDate: "2026-10-10",
    userId: randomUUID(),
    profileId: randomUUID(),
  }))
    value.set(key, field);
  if (due !== undefined) value.set("dueAt", due);
  return value;
}
it("real action omits the deadline key for identical local day, preserves microseconds, scheduling and authenticated owner", async () => {
  const spy = vi.spyOn(repos.tasks, "updateTask");
  const before = row();
  expect(await updatePortfolioTaskAction(form())).toMatchObject({
    status: "success",
  });
  expect(spy.mock.calls[0][0]).not.toHaveProperty("dueAt");
  const after = row();
  for (const key of [
    "due_at",
    "planned_date",
    "scheduled_start_at",
    "status",
    "duration_minutes",
    "project_id",
    "goal_id",
    "user_id",
  ])
    expect(after[key]).toEqual(before[key]);
});
it("real action distinguishes missing / clear / add / change and rejects bad date / zone without partial mutation", async () => {
  expect(await updatePortfolioTaskAction(form(undefined))).toMatchObject({
    status: "success",
  });
  expect(row().due_at).toBe("2026-10-12T23:59:59.123456Z");
  expect(await updatePortfolioTaskAction(form(""))).toMatchObject({
    status: "success",
  });
  expect(row().due_at).toBeNull();
  expect(await updatePortfolioTaskAction(form("2026-10-12"))).toMatchObject({
    status: "success",
  });
  expect(row().due_at).toBe("2026-10-12T21:59:59.000000Z");
  expect(taskDeadlineLocalDay(row().due_at!, "Europe/Berlin")).toBe(
    "2026-10-12",
  );
  const before = row();
  expect(await updatePortfolioTaskAction(form("2026-02-30"))).toMatchObject({
    status: "error",
  });
  expect(row()).toEqual(before);
  vi.spyOn(reads, "profileTimezone").mockRejectedValue(
    new Error("Profile unavailable"),
  );
  expect(await updatePortfolioTaskAction(form("2026-10-14"))).toMatchObject({
    status: "error",
  });
  expect(row()).toEqual(before);
});
it("rejects stale / missing tokens, foreign targets, Zod failures and unauthenticated or non-Manual writes", async () => {
  const before = row();
  const stale = form("2026-10-12");
  stale.set("expectedUpdatedAt", "2026-01-01T00:00:00.000000Z");
  expect(await updatePortfolioTaskAction(stale)).toMatchObject({
    status: "error",
  });
  const missing = form();
  missing.delete("expectedUpdatedAt");
  expect(await updatePortfolioTaskAction(missing)).toMatchObject({
    status: "error",
  });
  const foreign = form();
  foreign.set("taskId", randomUUID());
  expect(await updatePortfolioTaskAction(foreign)).toMatchObject({
    status: "error",
  });
  const invalid = form();
  invalid.set("priority", "invalid");
  expect(await updatePortfolioTaskAction(invalid)).toMatchObject({
    status: "error",
  });
  for (const mode of ["demo", "empty"]) {
    boundary.mode = mode;
    expect(await updatePortfolioTaskAction(form())).toMatchObject({
      status: "blocked",
    });
  }
  boundary.mode = "manual";
  boundary.auth = { ok: false, error: "unauthenticated" };
  expect(await updatePortfolioTaskAction(form())).toMatchObject({
    status: "blocked",
  });
  expect(row()).toEqual(before);
});
