import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { RecurringTaskTemplateRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import type { RecurringTaskTemplateRow } from "../../supabase/row-types";
import { mapCreateRecurringTaskTemplateInputToInsert, mapUpdateRecurringTaskTemplateInputToPatch, mapRecurringTaskTemplateRowToDomain } from "../../supabase/mappers/recurring-task-template.mapper";
import { createRecurringTaskTemplateInputSchema, updateRecurringTaskTemplateInputSchema, deactivateRecurringTaskTemplateInputSchema } from "../../schemas/recurring-task-template.schema";
import { safeNumber, timezone, uuid } from "../codecs";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";

type Stored = Omit<RecurringTaskTemplateRow, "is_active" | "duration_minutes" | "recurrence_rule"> & { is_active: bigint; duration_minutes: bigint | null; recurrence_rule: string };
const domain = (row: Stored) => mapRecurringTaskTemplateRowToDomain({ ...row, is_active: row.is_active === BigInt(1), duration_minutes: row.duration_minutes === null ? null : safeNumber(row.duration_minutes), recurrence_rule: JSON.parse(row.recurrence_rule) });
const columns = new Set(["title", "description", "next_action", "priority", "energy", "duration_minutes", "area_id", "project_id", "goal_id", "recurrence_rule", "starts_on", "ends_on", "timezone", "is_active"]);
function entries(value: object): [string, string | number | null][] {
  return Object.entries(value).filter(([key, value]) => key !== "user_id" && value !== undefined).map(([key, value]) => {
    if (!columns.has(key)) throw new Error("RECURRENCE_COLUMN_DENIED");
    if (key === "recurrence_rule") value = JSON.stringify(value);
    if (key === "is_active") value = Number(value);
    if (key === "timezone") value = timezone(value);
    if (key.endsWith("_id") && value !== null) value = uuid(value);
    return [key, value];
  });
}
function validateContext(db: Database.Database, owner: string, row: { area_id?: unknown; project_id?: unknown; goal_id?: unknown }) {
  for (const [key, table] of [["area_id", "areas"], ["project_id", "projects"], ["goal_id", "goals"]] as const) {
    const id = row[key];
    if (id != null && !db.prepare(`SELECT id FROM ${table} WHERE user_id=? AND id=? AND archived_at IS NULL`).get(owner, uuid(String(id)))) throw new Error("RECURRENCE_CONTEXT_NOT_FOUND");
  }
}

export function createSqliteRecurringTaskTemplateRepository(store: SqliteRuntime, context: OwnerContext): RecurringTaskTemplateRepository {
  const execute = <T>(input: { userId: string; profileId: string }, body: () => T): RepositoryResult<T> => {
    try {
      const owner = requireOwnerContext(context);
      if (input.userId !== owner || input.profileId !== owner) throw new Error("SCOPE_DENIED");
      return { ok: true, data: body() };
    } catch { return { ok: false, error: { code: "conflict", message: "Recurring Task Template konnte nicht gespeichert oder geladen werden." } }; }
  };
  const load = (db: Database.Database, owner: string, id: string) => {
    const row = db.prepare("SELECT * FROM recurring_task_templates WHERE user_id=? AND id=?").get(owner, uuid(id)) as Stored | undefined;
    if (!row) throw new Error("RECURRENCE_NOT_FOUND");
    return row;
  };
  return {
    async createRecurringTaskTemplate(input) { return execute(input, () => {
      const parsed = createRecurringTaskTemplateInputSchema.safeParse(input);
      if (!parsed.success) throw new Error("RECURRENCE_INVALID");
      return store.command(context, "recurrence.create", (db, owner) => {
        const data = mapCreateRecurringTaskTemplateInputToInsert(parsed.data);
        validateContext(db, owner, data);
        const values = entries(data), id = randomUUID();
        db.prepare(`INSERT INTO recurring_task_templates(id,user_id,created_at,updated_at,${values.map(([key]) => key).join(",")}) VALUES(?,?,life_now(),life_now(),${values.map(() => "?").join(",")})`).run(id, owner, ...values.map(([, value]) => value));
        return domain(load(db, owner, id));
      });
    }); },
    async updateRecurringTaskTemplate(input) { return execute(input, () => {
      const parsed = updateRecurringTaskTemplateInputSchema.safeParse(input);
      if (!parsed.success) throw new Error("RECURRENCE_INVALID");
      return store.command(context, "recurrence.update", (db, owner) => {
        const current = load(db, owner, input.templateId), patch = mapUpdateRecurringTaskTemplateInputToPatch(parsed.data);
        validateContext(db, owner, { ...current, ...patch });
        const values = entries(patch);
        if (values.length) db.prepare(`UPDATE recurring_task_templates SET ${values.map(([key]) => `${key}=?`).join(",")},updated_at=next_timestamp(updated_at,life_now()) WHERE user_id=? AND id=?`).run(...values.map(([, value]) => value), owner, uuid(input.templateId));
        return domain(load(db, owner, input.templateId));
      });
    }); },
    async deactivateRecurringTaskTemplate(input) { return execute(input, () => {
      const parsed = deactivateRecurringTaskTemplateInputSchema.safeParse(input);
      if (!parsed.success) throw new Error("RECURRENCE_INVALID");
      return store.command(context, "recurrence.deactivate", (db, owner) => {
        load(db, owner, parsed.data.templateId);
        db.prepare("UPDATE recurring_task_templates SET is_active=0,updated_at=next_timestamp(updated_at,life_now()) WHERE user_id=? AND id=?").run(owner, uuid(parsed.data.templateId));
        return domain(load(db, owner, parsed.data.templateId));
      });
    }); },
    async getActiveRecurringTaskTemplatesByUser(userId, profileId) { return execute({ userId, profileId }, () => store.read(context, (db, owner) => (db.prepare("SELECT * FROM recurring_task_templates WHERE user_id=? AND is_active=1 ORDER BY starts_on,created_at,id").all(owner) as Stored[]).map(domain))); },
    async getRecurringTaskTemplatesByUser(userId, profileId) { return execute({ userId, profileId }, () => store.read(context, (db, owner) => (db.prepare("SELECT * FROM recurring_task_templates WHERE user_id=? ORDER BY updated_at DESC,id").all(owner) as Stored[]).map(domain))); },
  };
}
