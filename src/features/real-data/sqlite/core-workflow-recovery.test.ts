import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "./synthetic-database";
import { SqliteRuntime } from "./runtime";
import { issueOwnerContext } from "./owner-context";
import { canonicalTableNames } from "./canonical-catalog";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "./recovery";
import { createSqliteTaskStepRepository } from "./repositories/task-step-repository";
import { createSqliteRecurringTaskTemplateRepository } from "./repositories/recurring-task-template-repository";
import { createSqliteTaskRepository } from "./repositories/task-repository";
import { createSqliteInboxWorkspaceRepository } from "./repositories/inbox-workspace-repository";
import { sourceTaskCommands } from "./commands/source-commands";
import { generateRecurringTaskInstancesForDate } from "../use-cases/recurring-task-generation";

it("preserves populated Steps, Recurrence and Inbox projections through restart, online backup and isolated restore", async () => {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-core-recovery-")), path = join(directory, "synthetic.db");
  const owner = "11600000-0000-4000-8000-000000000001", context = issueOwnerContext(owner);
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true });
  let task = "";
  try {
    const recurringTaskTemplates = createSqliteRecurringTaskTemplateRepository(store, context), tasks = createSqliteTaskRepository(store, context, sourceTaskCommands);
    const template = await recurringTaskTemplates.createRecurringTaskTemplate({ userId: owner, profileId: owner, title: "Recovery practice", startsOn: "2026-10-06", timezone: "Europe/Berlin", recurrenceRule: { frequency: "daily", version: "v1" } });
    expect(template.ok).toBe(true);
    const generated = await generateRecurringTaskInstancesForDate({ userId: owner, profileId: owner, date: "2026-10-06" }, { recurringTaskTemplates, tasks });
    if (!generated.ok) throw new Error(generated.error.message);
    task = generated.data.generated[0].id;
    const steps = createSqliteTaskStepRepository(store, context);
    expect(steps.write("create", { taskId: task, title: "Recovery Step", position: 1 })).toBe(true);
    const step = steps.read(task)[0];
    expect(steps.write("update", { taskId: task, stepId: step.id, title: step.title, position: step.position, completed: true })).toBe(true);
    for (const route of ["task", "resource", "project", "goal"] as const) {
      const id = randomUUID(), at = "2026-10-06T10:00:00.123456Z";
      store.command(context, "inbox.capture", db => db.prepare("INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,'Original capture','Unicode 🧭 full text',?,?,?)").run(id, owner, at, at, at));
      expect(createSqliteInboxWorkspaceRepository(store, context).complete({ inboxItemId: id, expectedUpdatedAt: at, title: "Recovered route", body: "Full clarified text", nextAction: "Continue", missingInfo: null, priority: "P2", energy: null, durationMinutes: null, areaId: null, reviewNeeded: true, todayCandidate: false, deadlineHint: null, route, targetId: null }).error).toBeNull();
    }
  } finally { store.close(); }
  const before = inspectSyntheticDatabase(path), restarted = new SqliteRuntime(path, { syntheticProof: true });
  const projection = (runtime: SqliteRuntime) => runtime.read(context, (db, owner) => ({
    tasks: db.prepare("SELECT id,title,generated_from_template_id,instance_date FROM tasks WHERE user_id=? ORDER BY id").all(owner),
    inbox: db.prepare("SELECT id,status,title,original_title,original_body,created_task_id FROM inbox_items WHERE user_id=? ORDER BY id").all(owner),
    steps: db.prepare("SELECT id,task_id,title,position,completed_at FROM task_steps WHERE user_id=? ORDER BY id").all(owner),
    templates: db.prepare("SELECT id,title,recurrence_rule,starts_on,is_active FROM recurring_task_templates WHERE user_id=? ORDER BY id").all(owner),
  }));
  let original: ReturnType<typeof projection>;
  try {
    original = projection(restarted);
    expect(createSqliteTaskStepRepository(restarted, context).read(task)[0].completed_at).not.toBeNull();
    expect(before.counts).toMatchObject({ tasks: 2, task_steps: 1, recurring_task_templates: 1, inbox_items: 4, resources: 1, projects: 1, goals: 1 });
    const actual = Object.keys(before.counts).filter(name => canonicalTableNames.includes(name as typeof canonicalTableNames[number]));
    expect(actual).toHaveLength(83);
    expect(canonicalTableNames.filter(name => !actual.includes(name))).toEqual([]);
    expect(restarted.read(context, db => db.prepare("SELECT compatibility_ready FROM runtime_metadata").get())).toEqual({ compatibility_ready: BigInt(0) });
    const backup = join(directory, "online.db"), restored = join(directory, "restore.db");
    await restarted.backup(backup);
    expect(inspectSyntheticDatabase(backup)).toEqual(before);
    expect(await restoreSyntheticBackup(backup, restored)).toEqual(before);
    const candidate = new SqliteRuntime(restored, { syntheticProof: true });
    try { expect(projection(candidate)).toEqual(original); } finally { candidate.close(); }
  } finally { restarted.close(); }
});
