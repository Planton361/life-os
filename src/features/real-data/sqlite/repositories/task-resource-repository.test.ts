import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  sourceReviewFixture,
  scope,
  owner,
} from "../../../../../tests/sqlite/source-review-fixture";
import { projectDepthCommand } from "./project-depth-repository";

it("atomically creates canonical notes/links, converges retries and returns persisted Resource reads", async () => {
  const f = sourceReviewFixture();
  try {
    const task = await f.tasks.createTask({ ...scope, title: "Resource task" });
    if (!task.ok) throw Error("Fixture");
    for (const draft of [
      { type: "note" as const, body: "Kurze Erkenntnis" },
      {
        type: "link" as const,
        url: "https://github.com/Planton361/life-os",
        title: "",
      },
    ]) {
      const input = {
        ...scope,
        taskId: task.data.id,
        resourceId: randomUUID(),
        draft,
      };
      expect(await f.resources.createTaskResource(input)).toEqual({
        ok: true,
        data: { resourceId: input.resourceId, linked: true },
      });
      expect(await f.resources.createTaskResource(input)).toMatchObject({
        ok: true,
      });
    }
    const relations = await f.resources.getResourceRelationsForTarget(
      owner,
      owner,
      "task",
      task.data.id,
    );
    expect(relations.ok && relations.data).toHaveLength(2);
    const resources = await f.resources.getResourcesByUser(owner, owner);
    expect(
      resources.ok && resources.data.map((r) => [r.type, r.body, r.title]),
    ).toEqual(
      expect.arrayContaining([
        ["note", "Kurze Erkenntnis", "Kurze Erkenntnis"],
        ["link", null, "github.com"],
      ]),
    );
  } finally {
    f.store.close();
  }
});

it("denies invalid HTTP(S), wrong owners, archived tasks/parents and stale resources without creating rows", async () => {
  const f = sourceReviewFixture();
  try {
    const task = await f.tasks.createTask({
      ...scope,
      title: "Guarded task",
      projectId: f.project,
    });
    if (!task.ok) throw Error("Fixture");
    const input = {
      ...scope,
      taskId: task.data.id,
      resourceId: randomUUID(),
      draft: { type: "note" as const, body: "Retained draft" },
    };
    expect(
      (await f.resources.createTaskResource({ ...input, userId: randomUUID() }))
        .ok,
    ).toBe(false);
    expect(
      (await f.resources.createTaskResource({ ...input, taskId: randomUUID() }))
        .ok,
    ).toBe(false);
    for (const url of [
      "javascript:alert(1)",
      "not-a-url",
      "file:///tmp/secret",
      "https://user:pass@example.test/",
    ])
      expect(
        (
          await f.resources.createTaskResource({
            ...input,
            draft: { type: "link", url, title: "" },
          })
        ).ok,
      ).toBe(false);
    const revision = f.store.read(
      f.context,
      (db) =>
        db
          .prepare(
            "SELECT completion_revision AS revision,completion_cycle AS cycle FROM projects WHERE user_id=? AND id=?",
          )
          .get(owner, f.project) as { revision: bigint; cycle: bigint },
    );
    projectDepthCommand(f.store, f.context, {
      operation: "project.archive",
      commandId: randomUUID(),
      projectId: f.project,
      expectedRevision: Number(revision.revision),
      expectedCycle: Number(revision.cycle),
      payload: {},
    });
    expect((await f.resources.createTaskResource(input)).ok).toBe(false);
    expect(await f.resources.getResourcesByUser(owner, owner)).toMatchObject({
      ok: true,
      data: [],
    });
    const active = await f.tasks.createTask({ ...scope, title: "Active task" });
    if (!active.ok) throw Error("Fixture");
    const saved = { ...input, taskId: active.data.id };
    expect((await f.resources.createTaskResource(saved)).ok).toBe(true);
    await f.resources.archiveResource({
      ...scope,
      resourceId: saved.resourceId,
    });
    expect((await f.resources.createTaskResource(saved)).ok).toBe(false);
    await f.tasks.archiveTask({ ...scope, taskId: active.data.id });
    expect(
      (
        await f.resources.createTaskResource({
          ...saved,
          resourceId: randomUUID(),
        })
      ).ok,
    ).toBe(false);
    const source = await f.sources.schedule({
      sourceType: "meal",
      sourceId: f.meal,
      plannedDate: "2026-10-08",
      scheduledStartAt: "2026-10-08T12:00:00Z",
      durationMinutes: 30,
    });
    if (!source.data) throw Error("Source fixture");
    expect(
      (
        await f.resources.createTaskResource({
          ...input,
          taskId: source.data.id,
          resourceId: randomUUID(),
        })
      ).ok,
    ).toBe(false);
  } finally {
    f.store.close();
  }
});

it("rolls back Resource creation when the canonical relation fails", async () => {
  const f = sourceReviewFixture();
  try {
    const task = await f.tasks.createTask({ ...scope, title: "Failure task" });
    if (!task.ok) throw Error("Fixture");
    f.store.command(f.context, "synthetic.seed", (db) =>
      db.exec(
        "CREATE TEMP TRIGGER proof_relation_failure BEFORE INSERT ON resource_relations BEGIN SELECT RAISE(ABORT,'PROOF_RELATION_FAILURE'); END",
      ),
    );
    expect(
      (
        await f.resources.createTaskResource({
          ...scope,
          taskId: task.data.id,
          resourceId: randomUUID(),
          draft: { type: "note", body: "Must not orphan" },
        })
      ).ok,
    ).toBe(false);
    expect(await f.resources.getResourcesByUser(owner, owner)).toMatchObject({
      ok: true,
      data: [],
    });
    expect(
      await f.resources.getResourceRelationsForTarget(
        owner,
        owner,
        "task",
        task.data.id,
      ),
    ).toMatchObject({ ok: true, data: [] });
  } finally {
    f.store.close();
  }
});
