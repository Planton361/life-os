import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { SqliteRuntime } from "../runtime";
import { createSqliteTaskRepository } from "./task-repository";
import { sourceTaskCommands } from "../commands/source-commands";
import { createSqliteRecurringTaskTemplateRepository } from "./recurring-task-template-repository";
import { generateRecurringTaskInstancesForRange, generateRecurringTaskInstancesForDate } from "../../use-cases/recurring-task-generation";

const owner = "11600000-0000-4000-8000-000000000001";
const input = { userId: owner, profileId: owner, title: "Daily practice", startsOn: "2026-10-06", endsOn: "2026-10-12", timezone: "Europe/Berlin", recurrenceRule: { version: "v1" as const, frequency: "daily" as const, interval: 2 }, description: "Practice description", nextAction: "Open the book", durationMinutes: 30 };
function fixture() {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-recurrence-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner), store = new SqliteRuntime(path, { syntheticProof: true });
  return { path, context, store, repo: createSqliteRecurringTaskTemplateRepository(store, context), tasks: createSqliteTaskRepository(store, context, sourceTaskCommands) };
}
it("uses explicit canonical generation, interval/start/end semantics, preserved descriptions and stable instances", async () => {
  const f = fixture(); let templateId = "", first = "";
  try {
    const created = await f.repo.createRecurringTaskTemplate(input);
    if (!created.ok) throw new Error(created.error.message);
    templateId = created.data.id;
    expect(created.data).toMatchObject({ isActive: true, recurrenceRule: input.recurrenceRule, timezone: input.timezone });
    expect((await f.tasks.getPortfolioTasks(owner, owner))).toMatchObject({ ok: true, data: [] });
    const args = { userId: owner, profileId: owner, startDate: "2026-10-05", endDate: "2026-10-13" };
    const context = { recurringTaskTemplates: f.repo, tasks: f.tasks };
    const generated = await generateRecurringTaskInstancesForRange(args, context);
    if (!generated.ok) throw new Error(generated.error.message);
    expect(generated.data.generated.map(row => row.instanceDate)).toEqual(["2026-10-06", "2026-10-08", "2026-10-10", "2026-10-12"]);
    expect(generated.data.generated[0]).toMatchObject({ plannedDate: "2026-10-06", scheduledStartAt: null, description: "Practice description\n\nNächste Aktion: Open the book", generatedFromTemplateId: templateId });
    first = generated.data.generated[0].id;
    const repeat = await generateRecurringTaskInstancesForRange(args, context);
    expect(repeat).toMatchObject({ ok: true, data: { generated: [], skippedTemplates: [] } });
    if (repeat.ok) expect(repeat.data.existing.map(row => row.id)).toEqual(generated.data.generated.map(row => row.id));
    expect((await f.repo.updateRecurringTaskTemplate({ userId: owner, profileId: owner, templateId, title: "Edited template" })).ok).toBe(true);
    expect((await f.repo.deactivateRecurringTaskTemplate({ userId: owner, profileId: owner, templateId })).ok).toBe(true);
    expect(await f.repo.getActiveRecurringTaskTemplatesByUser(owner, owner)).toEqual({ ok: true, data: [] });
    expect(await generateRecurringTaskInstancesForDate({ userId: owner, profileId: owner, date: "2026-10-08" }, context)).toMatchObject({ ok: true, data: { generated: [], existing: [] } });
    const all = await f.repo.getRecurringTaskTemplatesByUser(owner, owner);
    expect(all).toMatchObject({ ok: true, data: [{ id: templateId, isActive: false }] });
    expect((await f.tasks.archiveTask({ userId: owner, profileId: owner, taskId: first })).ok).toBe(true);
    expect(await f.tasks.createGeneratedTaskInstance({ userId: owner, profileId: owner, templateId, title: input.title, instanceDate: "2026-10-06" })).toMatchObject({ ok: true, data: { existing: true, task: { id: first } } });
  } finally { f.store.close(); }
  const restart = new SqliteRuntime(f.path, { syntheticProof: true });
  try { expect(await createSqliteRecurringTaskTemplateRepository(restart, f.context).getRecurringTaskTemplatesByUser(owner, owner)).toMatchObject({ ok: true, data: [{ id: templateId, title: "Edited template", isActive: false }] }); }
  finally { restart.close(); }
});
it("denies invalid/foreign contexts and rolls invalid date patches back without lost template state", async () => {
  const f = fixture();
  try {
    for (const context of [issueOwnerContext(randomUUID()), {} as OwnerContext]) {
      const denied = createSqliteRecurringTaskTemplateRepository(f.store, context);
      expect((await denied.createRecurringTaskTemplate(input)).ok).toBe(false);
      expect((await denied.getRecurringTaskTemplatesByUser(owner, owner)).ok).toBe(false);
    }
    expect((await f.repo.createRecurringTaskTemplate({ ...input, userId: randomUUID() })).ok).toBe(false);
    for (const key of ["areaId", "projectId", "goalId"]) expect((await f.repo.createRecurringTaskTemplate({ ...input, [key]: randomUUID() })).ok).toBe(false);
    expect((await f.repo.createRecurringTaskTemplate({ ...input, timezone: "Invalid/Timezone" })).ok).toBe(false);
    const created = await f.repo.createRecurringTaskTemplate(input);
    if (!created.ok) throw new Error(created.error.message);
    const scope = { userId: owner, profileId: owner, templateId: created.data.id };
    expect((await f.repo.updateRecurringTaskTemplate({ ...scope, startsOn: "2026-10-13", title: "Must roll back" })).ok).toBe(false);
    expect((await f.repo.updateRecurringTaskTemplate({ ...scope, projectId: randomUUID(), title: "Must roll back" })).ok).toBe(false);
    expect(await f.repo.getRecurringTaskTemplatesByUser(owner, owner)).toMatchObject({ ok: true, data: [{ title: input.title, startsOn: input.startsOn }] });
    expect((await f.tasks.createGeneratedTaskInstance({ ...scope, title: "x", instanceDate: "2026-10-06" })).ok).toBe(false);
    expect((await f.tasks.createGeneratedTaskInstance({ ...scope, title: "Valid title", instanceDate: "2026-10-06", projectId: randomUUID() })).ok).toBe(false);
    expect(await f.tasks.getPortfolioTasks(owner, owner)).toMatchObject({ ok: true, data: [] });
  } finally { f.store.close(); }
});
