import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  owner,
  scope,
  at,
} from "../../../../../tests/sqlite/source-review-fixture";
import { result } from "../../../../../tests/sqlite/nutrition-training-fixture";
import { createSqliteInboxWorkspaceRepository } from "./inbox-workspace-repository";
import { createSqliteTaskRepository } from "./task-repository";
import { sourceTaskCommands } from "../commands/source-commands";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { SqliteRuntime } from "../runtime";
import type { TaskRow } from "../../supabase/row-types";

function raw(f: ReturnType<typeof sourceReviewFixture>, id: string) {
  return f.store.read(f.context, (db) =>
    db.prepare("SELECT * FROM tasks WHERE user_id=? AND id=?").get(owner, id),
  ) as TaskRow;
}
const release = (row: TaskRow) => ({
  ...scope,
  taskId: row.id,
  expectedUpdatedAt: row.updated_at,
});
function unchangedExceptStatus(old: TaskRow, current: TaskRow) {
  expect(current).toEqual({
    ...old,
    status: "planned",
    updated_at: current.updated_at,
  });
  expect(current.updated_at).not.toBe(old.updated_at);
}

for (const route of [
  "task",
  "existing_project",
  "existing_goal",
  "existing_skill",
] as const) {
  it(`confirmed ${route}: one planned Task, original capture/link preserved, no implicit scheduling`, async () => {
    const f = sourceReviewFixture(),
      id = randomUUID();
    try {
      f.store.command(f.context, "inbox.capture", (db) =>
        db
          .prepare(
            "INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,'Capture','Original',?,?,?)",
          )
          .run(id, owner, at, at, at),
      );
      const inbox = createSqliteInboxWorkspaceRepository(f.store, f.context);
      const input = {
        inboxItemId: id,
        expectedUpdatedAt: at,
        title: "Confirmed " + route,
        body: "Context",
        nextAction: "Act",
        missingInfo: "",
        priority: "P1" as const,
        energy: null,
        durationMinutes: 25,
        areaId: f.area,
        reviewNeeded: false,
        todayCandidate: false,
        deadlineHint: null,
        route,
        targetId:
          route === "existing_project"
            ? f.project
            : route === "existing_goal"
              ? f.goal
              : route === "existing_skill"
                ? f.skill
                : null,
      };
      const before = f.store.read(f.context, (db) =>
        db.prepare("SELECT count(*) AS n FROM tasks").get(),
      );
      expect(inbox.save(input).error).toBeNull();
      expect(
        f.store.read(f.context, (db) =>
          db.prepare("SELECT count(*) AS n FROM tasks").get(),
        ),
      ).toEqual(before);
      const token = f.store.read(
        f.context,
        (db) =>
          (
            db
              .prepare("SELECT updated_at FROM inbox_items WHERE id=?")
              .get(id) as { updated_at: string }
          ).updated_at,
      );
      const r = inbox.complete({ ...input, expectedUpdatedAt: token });
      expect(r.error).toBeNull();
      if (!r.data?.id) throw new Error("No created task");
      const task = raw(f, r.data.id);
      expect(task).toMatchObject({
        status: "planned",
        source_inbox_item_id: id,
        title: input.title,
        planned_date: null,
        scheduled_start_at: null,
        completed_at: null,
        due_at: null,
        project_id: route === "existing_project" ? f.project : null,
        goal_id: route === "existing_goal" ? f.goal : null,
      });
      const captured = f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT original_title,original_body,status,created_task_id FROM inbox_items WHERE id=?",
          )
          .get(id),
      );
      expect(captured).toEqual({
        original_title: "Capture",
        original_body: "Original",
        status: "triaged",
        created_task_id: task.id,
      });
      if (route === "existing_skill")
        expect(
          f.store.read(f.context, (db) =>
            db
              .prepare("SELECT skill_id FROM task_skill_links WHERE task_id=?")
              .get(task.id),
          ),
        ).toEqual({ skill_id: f.skill });
      expect(
        inbox.complete({ ...input, expectedUpdatedAt: token }).error,
      ).not.toBeNull();
      expect(raw(f, task.id)).toEqual(task);
      f.store.close();
      const restart = new SqliteRuntime(f.path, { syntheticProof: true });
      try {
        expect(
          restart.read(f.context, (db) =>
            db.prepare("SELECT * FROM tasks WHERE id=?").get(task.id),
          ),
        ).toEqual(task);
      } finally {
        restart.close();
      }
    } finally {
      f.store.close();
    }
  });
}

it("historical standalone/linked Tasks release only status; retries and stale tokens cannot rewrite metadata or scheduling", async () => {
  const f = sourceReviewFixture();
  try {
    for (const linked of [false, true]) {
      const task = result(
        await f.tasks.createTask({
          ...scope,
          title: "Historical",
          status: "inbox",
          description: "Keep me",
          projectId: linked ? f.project : undefined,
          goalId: linked ? f.goal : undefined,
          areaId: f.area,
          dueAt: "2026-10-25T22:59:59.000Z",
          plannedDate: "2026-10-25",
          scheduledStartAt: "2026-10-25T10:00:00.000Z",
          durationMinutes: 42,
        }),
      );
      const old = raw(f, task.id);
      expect(
        await f.tasks.releaseInboxTask({
          ...release(old),
          expectedUpdatedAt: at,
        }),
      ).toMatchObject({ ok: false });
      expect(raw(f, task.id)).toEqual(old);
      result(await f.tasks.releaseInboxTask(release(old)));
      const current = raw(f, task.id);
      unchangedExceptStatus(old, current);
      // A pre-release editor must not restore its hidden Inbox status or old
      // metadata after the explicit release wins the race.
      expect(
        await f.tasks.updateTask({
          ...scope,
          taskId: task.id,
          status: "inbox",
          title: "Stale editor",
          expectedUpdatedAt: old.updated_at,
        }),
      ).toMatchObject({ ok: false, error: { message: "TASK_STALE" } });
      expect(raw(f, task.id)).toEqual(current);
      expect(await f.tasks.releaseInboxTask(release(old))).toMatchObject({
        ok: false,
      });
      expect(raw(f, task.id)).toEqual(current);
    }
  } finally {
    f.store.close();
  }
});

for (const negative of [
  "status",
  "archivedTask",
  "parentStatus",
  "parentTimestamp",
  "source",
  "foreign",
  "unissued",
  "metadataPatch",
  "staleMetadata",
] as const) {
  it(`release rejects ${negative}, no partial write`, async () => {
    const f = sourceReviewFixture();
    try {
      const task = result(
        await f.tasks.createTask({
          ...scope,
          title: "Historical negative",
          status: "inbox",
          projectId: f.project,
        }),
      );
      let old = raw(f, task.id);
      let input: unknown = release(old);
      let repo = f.tasks;
      if (negative === "status")
        result(
          await f.tasks.updateTask({
            ...scope,
            taskId: task.id,
            status: "waiting",
          }),
        );
      if (negative === "archivedTask")
        result(await f.tasks.archiveTask({ ...scope, taskId: task.id }));
      if (negative === "parentStatus" || negative === "parentTimestamp")
        f.store.command(f.context, "synthetic.initialize", (db) =>
          db
            .prepare(
              negative === "parentStatus"
                ? "UPDATE projects SET status='archived' WHERE id=?"
                : "UPDATE projects SET archived_at=life_now() WHERE id=?",
            )
            .run(f.project),
        );
      if (negative === "source")
        f.store.command(f.context, "synthetic.initialize", (db) =>
          db
            .prepare(
              "INSERT INTO schedule_source_links(id,user_id,task_id,source_type,source_id,created_at,updated_at) VALUES(?,?,?,'meal',?,life_now(),life_now())",
            )
            .run(randomUUID(), owner, task.id, f.meal),
        );
      if (negative === "foreign" || negative === "unissued")
        repo = createSqliteTaskRepository(
          f.store,
          negative === "foreign"
            ? issueOwnerContext(randomUUID())
            : ({} as OwnerContext),
          sourceTaskCommands,
        );
      if (negative === "metadataPatch")
        input = {
          ...release(old),
          title: "Must not overwrite",
          dueAt: null,
          projectId: null,
        };
      if (negative === "staleMetadata")
        result(
          await f.tasks.updateTask({
            ...scope,
            taskId: task.id,
            title: "Concurrent title",
          }),
        );
      old = raw(f, task.id);
      expect(
        await repo.releaseInboxTask(
          input as Parameters<typeof repo.releaseInboxTask>[0],
        ),
      ).toMatchObject({ ok: false });
      expect(raw(f, task.id)).toEqual(old);
    } finally {
      f.store.close();
    }
  });
}

it("routing an existing historical Task ID never silently promotes or duplicates it", async () => {
  const f = sourceReviewFixture(),
    id = randomUUID();
  try {
    f.store.command(f.context, "inbox.capture", (db) =>
      db
        .prepare(
          "INSERT INTO inbox_items(id,user_id,title,captured_at,created_at,updated_at) VALUES(?,?,'Original',?,?,?)",
        )
        .run(id, owner, at, at, at),
    );
    const task = result(
      await f.tasks.createTask({
        ...scope,
        title: "Historical existing",
        status: "inbox",
        sourceInboxItemId: id,
      }),
    );
    f.store.command(f.context, "inbox.update", (db) =>
      db
        .prepare("UPDATE inbox_items SET created_task_id=? WHERE id=?")
        .run(task.id, id),
    );
    const row = f.store.read(f.context, (db) =>
      db.prepare("SELECT updated_at FROM inbox_items WHERE id=?").get(id),
    ) as { updated_at: string };
    const old = raw(f, task.id);
    const repo = createSqliteInboxWorkspaceRepository(f.store, f.context);
    expect(
      repo.route({
        inboxItemId: id,
        expectedUpdatedAt: row.updated_at,
        route: "task",
        targetId: null,
      }),
    ).toMatchObject({ error: null, data: { kind: "task", id: task.id } });
    expect(raw(f, task.id)).toEqual(old);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT count(*) AS n FROM tasks WHERE source_inbox_item_id=?",
          )
          .get(id),
      ),
    ).toEqual({ n: BigInt(1) });
  } finally {
    f.store.close();
  }
});

it("planned lifecycle never overrides a blocked dependency or #151 archived-Parent completion guard", async () => {
  const f = sourceReviewFixture();
  try {
    const predecessor = result(
      await f.tasks.createTask({
        ...scope,
        title: "Predecessor",
        projectId: f.project,
      }),
    );
    const successor = result(
      await f.tasks.createTask({
        ...scope,
        title: "Historical blocked",
        status: "inbox",
        projectId: f.project,
      }),
    );
    f.store.command(f.context, "synthetic.initialize", (db) =>
      db
        .prepare(
          "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,life_now())",
        )
        .run(randomUUID(), owner, f.project, predecessor.id, successor.id),
    );
    result(await f.tasks.releaseInboxTask(release(raw(f, successor.id))));
    expect(
      await f.tasks.completeTask({ ...scope, taskId: successor.id }),
    ).toMatchObject({ ok: false });
    expect(raw(f, successor.id)).toMatchObject({
      status: "planned",
      completed_at: null,
    });
    const unblocked = result(
      await f.tasks.createTask({
        ...scope,
        title: "Historical valid",
        status: "inbox",
        projectId: f.project,
      }),
    );
    result(await f.tasks.releaseInboxTask(release(raw(f, unblocked.id))));
    f.store.command(f.context, "synthetic.initialize", (db) =>
      db
        .prepare("UPDATE projects SET status='archived' WHERE id=?")
        .run(f.project),
    );
    expect(
      await f.tasks.completeTask({ ...scope, taskId: unblocked.id }),
    ).toMatchObject({ ok: false, error: { message: "TASK_PROJECT_ARCHIVED" } });
    expect(raw(f, unblocked.id)).toMatchObject({
      status: "planned",
      completed_at: null,
    });
  } finally {
    f.store.close();
  }
});

for (const bad of [
  "missingDestination",
  "archivedDestination",
  "failedSkillLink",
] as const) {
  it(`final Confirm ${bad}: clarification, Task and links roll back together`, () => {
    const f = sourceReviewFixture(),
      id = randomUUID();
    try {
      f.store.command(f.context, "inbox.capture", (db) =>
        db
          .prepare(
            "INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,'Original','Full capture',?,?,?)",
          )
          .run(id, owner, at, at, at),
      );
      const snapshot = () =>
        f.store.read(f.context, (db) => ({
          item: db.prepare("SELECT * FROM inbox_items WHERE id=?").get(id),
          tasks: db.prepare("SELECT * FROM tasks ORDER BY id").all(),
          links: db.prepare("SELECT * FROM task_skill_links ORDER BY id").all(),
        }));
      if (bad === "archivedDestination")
        f.store.command(f.context, "synthetic.initialize", (db) =>
          db
            .prepare("UPDATE projects SET status='archived' WHERE id=?")
            .run(f.project),
        );
      if (bad === "failedSkillLink")
        f.store.command(f.context, "synthetic.initialize", (db) =>
          db.exec(
            "CREATE TRIGGER proof_153_skill_failure AFTER INSERT ON task_skill_links BEGIN SELECT RAISE(ABORT,'153_SKILL_LINK_FAILURE'); END;",
          ),
        );
      const before = snapshot(),
        repo = createSqliteInboxWorkspaceRepository(f.store, f.context);
      const result = repo.complete({
        inboxItemId: id,
        expectedUpdatedAt: at,
        title: "Must roll back",
        body: "Edited",
        nextAction: "Act",
        missingInfo: null,
        priority: "P1",
        energy: null,
        durationMinutes: 15,
        areaId: null,
        reviewNeeded: false,
        todayCandidate: false,
        deadlineHint: null,
        route:
          bad === "failedSkillLink" ? "existing_skill" : "existing_project",
        targetId:
          bad === "missingDestination"
            ? randomUUID()
            : bad === "failedSkillLink"
              ? f.skill
              : f.project,
      });
      expect(result.error).not.toBeNull();
      expect(snapshot()).toEqual(before);
    } finally {
      f.store.close();
    }
  });
}

it("historical release rejects archived execution context, missing/malformed Task and foreign claimed owner without writes", async () => {
  const f = sourceReviewFixture();
  try {
    const task = result(
      await f.tasks.createTask({
        ...scope,
        title: "Historical context",
        status: "inbox",
        goalId: f.goal,
      }),
    );
    f.store.command(f.context, "synthetic.initialize", (db) =>
      db
        .prepare("UPDATE goals SET archived_at=life_now() WHERE id=?")
        .run(f.goal),
    );
    const before = raw(f, task.id);
    for (const input of [
      release(before),
      { ...release(before), taskId: randomUUID() },
      { ...release(before), taskId: "forged" },
      { ...release(before), userId: randomUUID() },
    ]) {
      expect(await f.tasks.releaseInboxTask(input)).toMatchObject({
        ok: false,
      });
      expect(raw(f, task.id)).toEqual(before);
    }
  } finally {
    f.store.close();
  }
});
