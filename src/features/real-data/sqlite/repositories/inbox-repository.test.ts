import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  owner,
  scope,
} from "../../../../../tests/sqlite/source-review-fixture";
import { createSqliteInboxRepository } from "./inbox-repository";
import { result } from "../../../../../tests/sqlite/nutrition-training-fixture";
it("native Inbox base capture/read/triaged/archive retains owner scope and stable IDs", async () => {
  const f = sourceReviewFixture();
  try {
    const inbox = createSqliteInboxRepository(f.store, f.context);
    const item = result(
      await inbox.createInboxItem({
        ...scope,
        title: "Capture",
        body: "Full text",
        areaId: f.area,
      }),
    );
    expect(result(await inbox.getInboxItemsByUser(owner, owner))[0].id).toBe(
      item.id,
    );
    const task = result(await f.tasks.createTask({ ...scope, title: "Task" }));
    expect(
      result(
        await inbox.markInboxItemTriaged({
          ...scope,
          inboxItemId: item.id,
          taskId: task.id,
        }),
      ).triagedTaskId,
    ).toBe(task.id);
    expect(
      (
        await inbox.markInboxItemTriaged({
          ...scope,
          inboxItemId: item.id,
          taskId: randomUUID(),
        })
      ).ok,
    ).toBe(false);
    expect((await inbox.getInboxItemsByUser(randomUUID(), owner)).ok).toBe(
      false,
    );
    expect(
      result(await inbox.archiveInboxItem({ ...scope, inboxItemId: item.id }))
        .status,
    ).toBe("archived");
    expect(result(await inbox.getInboxItemsByUser(owner, owner))).toEqual([]);
  } finally {
    f.store.close();
  }
});
