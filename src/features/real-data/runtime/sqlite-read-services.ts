import {
  readCanonicalProjectProjection,
  projectionColumns,
  projectionLimits,
  ProjectionReadError,
  type ProjectionReader,
  type ProjectionTable,
  type SourceRow,
} from "./project-export-projection";
import "server-only";
import type Database from "better-sqlite3";
import type { TableRow, PublicTableName } from "../supabase/database.types";
import type { SqliteRuntime } from "../sqlite/runtime";
import {
  requireOwnerContext,
  type OwnerContext,
} from "../sqlite/owner-context";
import {
  safeNumber,
  int64,
  decimal,
  decimalFromNumber,
} from "../sqlite/codecs";
import { createSqliteCanonicalBaseRepository } from "../sqlite/repositories/canonical-base-repository";
import { readSqliteSkillDevelopment } from "../sqlite/repositories/skill-development-repository";
import { projectTodayActivity } from "@/features/today/activity-projection";
import { buildWeeklyTaskContexts } from "@/features/calendar/weekly-task-context";
import type {
  ApplicationReadServices,
  EntityCatalogOptions,
} from "./read-services";

const jsonFields = new Set([
  "recurrence_rule",
  "wins",
  "blockers",
  "open_loops",
  "source_snapshot",
  "subject_snapshot",
  "milestones_snapshot",
  "plan_snapshot",
]);
const decimalFields = new Set([
  "daily_target",
  "default_increment",
  "value",
  "servings",
  "weight_kg",
  "target_weight_kg",
  "distance_km",
  "target_distance_km",
  "target_value",
  "progress",
  "increment",
  "quantity",
  "expected_price",
  "acquisition_value",
  "progress_current",
  "progress_total",
  "units_completed",
]);
const booleanFields = new Set([
  "review_needed",
  "today_candidate",
  "is_active",
  "is_paused",
]);
export function canonicalApplicationRow<T>(value: unknown): T {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, raw]) => {
      let field = raw;
      if (field !== null && booleanFields.has(key)) field = Boolean(field);
      else if (typeof field === "bigint") field = safeNumber(field);
      else if (typeof field === "string" && jsonFields.has(key))
        field = JSON.parse(field);
      else if (typeof field === "string" && decimalFields.has(key)) {
        const number = Number(field);
        if (
          !Number.isFinite(number) ||
          decimalFromNumber(number) !== decimal(field)
        )
          throw new Error("APPLICATION_DECIMAL_PROJECTION_LOSS");
        field = number;
      }
      return [key, field];
    }),
  ) as T;
}

// Table identifiers come only from the fixed call sites below. This is an
// internal canonical read implementation, never a query API supplied by UI.
function rows<T extends PublicTableName>(
  db: Database.Database,
  owner: string,
  table: T,
  order = "id",
): TableRow<T>[] {
  return db
    .prepare(`SELECT * FROM ${table} WHERE user_id=? ORDER BY ${order}`)
    .all(owner)
    .map((r) => canonicalApplicationRow<TableRow<T>>(r));
}

export function sqliteApplicationReads(
  store: SqliteRuntime,
  context: OwnerContext,
): ApplicationReadServices {
  const owner = requireOwnerContext(context);
  const base = createSqliteCanonicalBaseRepository(store, context);
  const timezone = () =>
    store.read(
      context,
      (db) =>
        (
          db.prepare("SELECT timezone FROM profiles WHERE id=?").get(owner) as {
            timezone: string;
          }
        ).timezone,
    );
  async function catalog<
    T extends "projects" | "goals" | "skills" | "tasks" | "resources" | "areas",
  >(table: T, options: EntityCatalogOptions = {}) {
    const values = store.read(context, (db) =>
      rows(
        db,
        owner,
        table,
        table === "areas" ? "sort_order,id" : "updated_at DESC,id",
      ),
    );
    const selected = values.filter(
      (row) =>
        (!options.ids || options.ids.includes(row.id)) &&
        (!options.activeOnly ||
          (!row.archived_at &&
            !(
              table === "skills" &&
              "status" in row &&
              row.status === "archived"
            ))),
    );
    return {
      data:
        options.limit === undefined
          ? selected
          : selected.slice(0, options.limit),
      error: null,
    };
  }
  return {
    catalog: {
      projects: (options) => catalog("projects", options),
      goals: (options) => catalog("goals", options),
      tasks: (options) => catalog("tasks", options),
      skills: (options) => catalog("skills", options),
      resources: (options) => catalog("resources", options),
      areas: (options) => catalog("areas", options),
    },
    projectProjection: async (input) => {
      let bytes = 0;
      const read: ProjectionReader = async <T extends ProjectionTable>(
        table: T,
        filters: Record<string, string | string[]>,
      ): Promise<SourceRow<T>[]> => {
        const fields = projectionColumns[table].split(",");
        const selected = store
          .read(context, (db) => rows(db, owner, table))
          .filter(
            (row) =>
              (table !== "skill_evidence" ||
                !("withdrawn_at" in row && row.withdrawn_at)) &&
              Object.entries(filters).every(([key, value]) => {
                const actual = (row as unknown as Record<string, unknown>)[key];
                return Array.isArray(value)
                  ? value.includes(String(actual))
                  : actual === value;
              }),
          )
          .map((row) =>
            Object.fromEntries(
              fields.map((key) => [
                key,
                (row as unknown as Record<string, unknown>)[key],
              ]),
            ),
          );
        bytes += Buffer.byteLength(JSON.stringify(selected));
        if (
          selected.length > projectionLimits.rowsPerQuery ||
          bytes > projectionLimits.sourceBytes
        )
          throw new ProjectionReadError(
            "Das Project überschreitet die Exportgrenze.",
          );
        return selected as unknown as SourceRow<T>[];
      };
      return readCanonicalProjectProjection(read, input);
    },
    profileTimezone: async () => timezone(),
    skillDevelopment: async (skillId) => {
      try {
        const read = readSqliteSkillDevelopment(store, context, skillId);
        // The existing application contract uses safe JS revision numbers.
        // Native history stays exact int64; unsupported UI tokens fail closed.
        if (read)
          read.skill.development_revision = safeNumber(
            int64(read.skill.development_revision as string),
          );
        return {
          data: read as unknown as NonNullable<
            Awaited<
              ReturnType<ApplicationReadServices["skillDevelopment"]>
            >["data"]
          >,
          error: null,
        };
      } catch {
        return {
          data: null,
          error: { message: "Skill-Daten konnten nicht geladen werden." },
        };
      }
    },
    workbench: async () => {
      const dependencyGraph = base.dependencies(owner);
      return store.read(context, (db) => ({
        dependencyGraph,
        dependencyUnavailable: false,
        timezone: (
          db.prepare("SELECT timezone FROM profiles WHERE id=?").get(owner) as {
            timezone: string;
          }
        ).timezone,
        tasks: rows(db, owner, "tasks", "created_at DESC,id"),
        projects: rows(db, owner, "projects", "created_at DESC,id"),
        goals: rows(db, owner, "goals", "created_at DESC,id"),
        skills: rows(db, owner, "skills", "created_at DESC,id"),
        resources: rows(db, owner, "resources", "created_at DESC,id"),
        areas: rows(db, owner, "areas"),
        taskSkills: rows(db, owner, "task_skill_links"),
        relations: rows(db, owner, "resource_relations"),
        evidence: rows(
          db,
          owner,
          "skill_evidence",
          "evidence_date DESC,id",
        ).filter((r) => !r.withdrawn_at),
        reviewRecords: rows(db, owner, "review_records", "created_at DESC,id"),
        steps: rows(db, owner, "task_steps", "position,created_at,id"),
        scheduleSources: rows(db, owner, "schedule_source_links"),
        milestones: rows(db, owner, "project_milestones", "sort_order,id"),
        goalMilestones: rows(db, owner, "goal_milestones", "sort_order,id"),
      }));
    },
    weeklyPlanning: async () => {
      const graph = base.dependencies(owner);
      const source = store.read(context, (db) => ({
        tasks: rows(db, owner, "tasks"),
        projects: rows(db, owner, "projects"),
        goals: rows(db, owner, "goals"),
        projectMilestones: rows(db, owner, "project_milestones"),
        goalMilestones: rows(db, owner, "goal_milestones"),
        taskSupport: rows(db, owner, "goal_milestone_task_support"),
        projectSupport: rows(db, owner, "goal_milestone_project_support"),
        skills: rows(db, owner, "skills"),
        taskSkills: rows(db, owner, "task_skill_links"),
      }));
      const linked = new Set(source.taskSkills.map((l) => l.skill_id));
      const targets = source.skills
        .filter((s) => !s.archived_at && linked.has(s.id))
        .flatMap(
          (s) =>
            readSqliteSkillDevelopment(store, context, s.id)?.targets ?? [],
        );
      return {
        contexts: buildWeeklyTaskContexts(
          owner,
          {
            ...source,
            targets: targets as unknown as Parameters<
              typeof buildWeeklyTaskContexts
            >[1]["targets"],
            targetUnavailable: [],
          },
          graph,
        ),
        dependencyUnavailable: false,
      };
    },
    todayActivity: async (now = new Date()) => {
      const profileZone = timezone();
      return store.read(context, (db) => {
        const goals = rows(db, owner, "goals");
        const events = (
          table:
            | "goal_achievement_events"
            | "goal_milestone_achievement_events",
          prefix: "goal" | "milestone",
        ) =>
          rows(db, owner, table, "recorded_at,id")
            .filter((e) => ["achieved", "reopened"].includes(e.event_type))
            .map((e) => ({
              id: e.id,
              goalId: e.goal_id,
              goalTitle: e.goal_title_snapshot,
              currentGoalTitle:
                goals.find((g) => g.id === e.goal_id)?.title ?? null,
              eventType: `${prefix}_${e.event_type}` as
                | "goal_achieved"
                | "goal_reopened"
                | "milestone_achieved"
                | "milestone_reopened",
              occurredAt: e.occurred_at,
              recordedAt: e.recorded_at,
            }));
        return projectTodayActivity(
          {
            tasks: rows(db, owner, "tasks"),
            inbox: rows(db, owner, "inbox_items"),
            moods: rows(db, owner, "mood_entries"),
            habits: rows(db, owner, "habit_logs"),
            habitDefinitions: Object.fromEntries(
              rows(db, owner, "habits").map((h) => [h.id, h]),
            ),
            meals: rows(db, owner, "meals"),
            runs: rows(db, owner, "running_sessions"),
            strength: rows(db, owner, "strength_sessions"),
            reviews: rows(db, owner, "review_records"),
            decisions: rows(db, owner, "review_task_decisions"),
            goalEvents: [
              ...events("goal_achievement_events", "goal"),
              ...events("goal_milestone_achievement_events", "milestone"),
            ],
          },
          profileZone,
          now,
        );
      });
    },
  };
}
