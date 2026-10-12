import type Database from "better-sqlite3";

type CompletionRow = {
  id: string;
  project_id: string | null;
  status: string;
  completed_at: string | null;
};

// Called only inside the admitted synchronous writer transaction. No UI/Patch
// value can replace the persisted Parent; missing/foreign Parents fail closed.
export function assertTaskCompletionParent(
  db: Database.Database,
  owner: string,
  projectId: string | null,
) {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  if (projectId === null) return;
  const parent = db
    .prepare("SELECT status,archived_at FROM projects WHERE user_id=? AND id=?")
    .get(owner, projectId) as
    | { status: string; archived_at: string | null }
    | undefined;
  if (!parent) throw new Error("TASK_PROJECT_NOT_FOUND");
  if (parent.archived_at !== null || parent.status === "archived")
    throw new Error("TASK_PROJECT_ARCHIVED");
}

export function taskCompletionSnapshot(db: Database.Database, owner: string) {
  return new Map(
    (
      db
        .prepare(
          "SELECT id,project_id,status,completed_at FROM tasks WHERE user_id=?",
        )
        .all(owner) as CompletionRow[]
    ).map((row) => [row.id, row]),
  );
}

// Extend the existing native pre-COMMIT validators without a persisted schema
// change. Covers direct/alternative SQL and coupled Source commands as well as
// repository writes; throwing rolls back the complete command and its history.
export function validateTaskCompletionCommit(
  db: Database.Database,
  owner: string,
  before: ReturnType<typeof taskCompletionSnapshot>,
) {
  for (const row of taskCompletionSnapshot(db, owner).values()) {
    const old = before.get(row.id);
    if (
      (row.status === "done" && old?.status !== "done") ||
      (row.completed_at !== null && old?.completed_at !== row.completed_at)
    ) {
      if (old) assertTaskCompletionParent(db, owner, old.project_id);
      assertTaskCompletionParent(db, owner, row.project_id);
    }
  }
}
