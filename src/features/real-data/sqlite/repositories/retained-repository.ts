import "server-only";
import {
  updateWorkWikiInputSchema,
  archiveWorkWikiInputSchema,
} from "../../schemas/work.schemas";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createLifeNoteInputSchema,
  updateLifeNoteInputSchema,
  lifeNoteLifecycleInputSchema,
} from "../../schemas/life.schemas";
import { createCodingProjectInputSchema } from "../../schemas/coding.schemas";
import { createWorkProjectInputSchema } from "../../schemas/work.schemas";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import {
  retainedCommand,
  retainedDefinitions,
  ownedArea,
  ownedAreaProject,
  convertWishlist,
  createKnowledgeResource,
  meetingFollowup,
  type RetainedKind,
} from "../commands/retained-commands";
import {
  completeChallenge,
  challengeProgress,
  abandonChallenge,
  redeemShop,
  rewardBalance,
  rotateAntiRot,
  resolveAntiRot,
  setAntiRotStatus,
  setShopPaused,
} from "../commands/reward-commands";
import {
  row,
  insert,
  patch,
  now,
  validate,
  type StoredRow,
} from "../commands/nutrition-commands";
import { executeProjectDepthInTransaction } from "../commands/project-depth-commands";

const chronological: Partial<Record<RetainedKind, string>> = {
  journal: "entry_date DESC,created_at DESC,id DESC",
  coding: "session_date DESC,created_at DESC,id DESC",
  education:
    "log_date DESC,start_time DESC NULLS FIRST,created_at DESC,id DESC",
  "work.log": "log_date DESC,created_at DESC,id DESC",
  "work.decision": "decision_date DESC,created_at DESC,id DESC",
  "work.meeting": "meeting_date DESC,created_at DESC,id DESC",
  purchase: "decision_date DESC,created_at DESC,id DESC",
};
// Exact native records retain PostgreSQL decimal values. Integration may adapt
// them to current DTOs only when doing so is demonstrably lossless.
export function createSqliteRetainedRepository(
  store: SqliteRuntime,
  context: OwnerContext,
) {
  const owner = requireOwnerContext(context);
  function scope(user: string) {
    if (user !== owner) throw new Error("OWNER_DENIED");
  }
  const write = <T>(
    user: string,
    command: string,
    body: Parameters<SqliteRuntime["command"]>[2],
  ) => {
    scope(user);
    return store.command(context, command, body) as T;
  };
  return {
    create(user: string, kind: RetainedKind, input: Record<string, unknown>) {
      return write<StoredRow>(user, "retained.write", (db) =>
        retainedCommand(db, owner, kind, "create", input),
      );
    },
    update(
      user: string,
      kind: RetainedKind,
      id: string,
      input: Record<string, unknown>,
    ) {
      return write<StoredRow>(user, "retained.write", (db) =>
        retainedCommand(db, owner, kind, "update", { ...input, id }),
      );
    },
    lifecycle(
      user: string,
      kind: RetainedKind,
      id: string,
      operation: "archive" | "restore",
    ) {
      return write<StoredRow>(user, "retained.write", (db) =>
        retainedCommand(db, owner, kind, operation, { id }),
      );
    },
    read(
      user: string,
      kind: RetainedKind,
      input: {
        id?: string;
        activeOnly?: boolean;
        startDate?: string;
        endDate?: string;
        search?: string;
      } = {},
    ) {
      scope(user);
      const p = validate(
        z.object({
          id: z.string().uuid().optional(),
          activeOnly: z.boolean().optional(),
          startDate: z.string().date().optional(),
          endDate: z.string().date().optional(),
          search: z.string().optional(),
        }),
        input,
      );
      return store.read(context, (db) => {
        if (p.id)
          return [row(db, retainedDefinitions[kind].table, owner, p.id)];
        if (kind !== "journal" && (p.startDate || p.endDate || p.search))
          throw new Error("JOURNAL_FILTER_REQUIRED");
        return db
          .prepare(
            `SELECT * FROM ${retainedDefinitions[kind].table} WHERE user_id=? ${p.activeOnly ? "AND archived_at IS NULL" : ""} ${p.startDate ? "AND entry_date>=?" : ""} ${p.endDate ? "AND entry_date<=?" : ""} ${p.search ? "AND (instr(lower(COALESCE(title,'')),lower(?))>0 OR instr(lower(body),lower(?))>0)" : ""} ORDER BY ${chronological[kind] ?? "updated_at DESC,created_at DESC,id"}`,
          )
          .all(
            owner,
            ...(p.startDate ? [p.startDate] : []),
            ...(p.endDate ? [p.endDate] : []),
            ...(p.search ? [p.search, p.search] : []),
          ) as StoredRow[];
      });
    },
    project(
      user: string,
      domain: "coding" | "education" | "work",
      input: Record<string, unknown>,
      id?: string,
    ) {
      scope(user);
      const p = validate(
        domain === "coding"
          ? createCodingProjectInputSchema
          : createWorkProjectInputSchema,
        input,
      );
      if (p.status === "completed" || p.status === "archived")
        throw new Error("PROJECT_REVIEW_REQUIRED");
      const current = id
        ? store.read(context, (db) => ownedAreaProject(db, owner, id, domain))
        : undefined;
      return store.command(
        context,
        current && current.status !== p.status
          ? "project.project.status.set"
          : "retained.project",
        (db) => {
          if (current) {
            const project = ownedAreaProject(db, owner, id!, domain);
            if (project.status !== p.status)
              executeProjectDepthInTransaction(db, owner, {
                projectId: id,
                commandId: randomUUID(),
                expectedRevision: String(project.completion_revision),
                expectedCycle: String(project.completion_cycle),
                operation: "project.status.set",
                payload: { status: p.status },
              });
            return patch(db, "projects", owner, id!, {
              title: p.title,
              description: p.description ?? null,
              ...(domain === "coding"
                ? {
                    repository_url:
                      (("repositoryUrl" in p ? p.repositoryUrl : null) as
                        | string
                        | null) ?? null,
                  }
                : {}),
              updated_at: now(),
            });
          }
          const area = ownedArea(db, owner, domain, domain !== "coding");
          return insert(db, "projects", owner, {
            id: randomUUID(),
            user_id: owner,
            area_id: area,
            title: p.title,
            description: p.description ?? null,
            status: p.status,
            ...(domain === "coding"
              ? {
                  repository_url:
                    (("repositoryUrl" in p ? p.repositoryUrl : null) as
                      | string
                      | null) ?? null,
                }
              : {}),
            created_at: now(),
            updated_at: now(),
          });
        },
      );
    },
    workspace(user: string, domain: "coding" | "education" | "work" | "life") {
      scope(user);
      const area = store.command(context, "retained.area", (db) =>
        ownedArea(db, owner, domain, true),
      );
      return store.read(context, (db) => {
        const projects = db
          .prepare(
            "SELECT * FROM projects WHERE user_id=? AND area_id=? AND archived_at IS NULL ORDER BY updated_at DESC,id",
          )
          .all(owner, area) as StoredRow[];
        const rows = (table: string) =>
          db
            .prepare(
              `SELECT x.* FROM ${table} x JOIN projects p ON p.id=x.project_id AND p.user_id=x.user_id WHERE x.user_id=? AND p.area_id=? AND p.archived_at IS NULL ORDER BY ${table === "coding_sessions" ? "x.session_date DESC," : table === "education_logs" ? "x.log_date DESC,x.start_time DESC NULLS FIRST," : table === "work_logs" ? "x.log_date DESC," : table === "work_decisions" ? "x.decision_date DESC," : table === "work_meetings" ? "x.meeting_date DESC," : ""}x.created_at DESC,x.id`,
            )
            .all(owner, area) as StoredRow[];
        const tasks = db
          .prepare(
            "SELECT t.* FROM tasks t JOIN projects p ON p.id=t.project_id AND p.user_id=t.user_id WHERE t.user_id=? AND p.area_id=? AND p.archived_at IS NULL AND t.archived_at IS NULL ORDER BY t.created_at,t.id",
          )
          .all(owner, area);
        const resources = db
          .prepare(
            "SELECT r.*,rr.id relation_id,rr.target_id project_id,rr.relation_type FROM resource_relations rr JOIN resources r ON r.id=rr.resource_id AND r.user_id=rr.user_id JOIN projects p ON p.id=rr.target_id AND p.user_id=rr.user_id WHERE rr.user_id=? AND rr.target_type='project' AND p.area_id=? AND p.archived_at IS NULL AND r.archived_at IS NULL ORDER BY r.updated_at DESC,r.id",
          )
          .all(owner, area);
        const notes =
          domain === "life"
            ? db
                .prepare(
                  "SELECT * FROM resources WHERE user_id=? AND area_id=? AND type='note' ORDER BY updated_at DESC,id",
                )
                .all(owner, area)
            : [];
        const noteRelations =
          domain === "life"
            ? db
                .prepare(
                  "SELECT rr.* FROM resource_relations rr JOIN resources r ON r.id=rr.resource_id AND r.user_id=rr.user_id WHERE rr.user_id=? AND r.area_id=? AND r.type='note' AND rr.target_type IN ('project','goal','task') ORDER BY rr.created_at,rr.id",
                )
                .all(owner, area)
            : [];
        return {
          projects,
          wiki:
            domain === "work"
              ? db
                  .prepare(
                    "SELECT * FROM resources WHERE user_id=? AND area_id=? AND type='note' ORDER BY updated_at DESC,id",
                  )
                  .all(owner, area)
              : [],
          tasks,
          resources,
          notes,
          noteRelations,
          sessions:
            domain === "coding"
              ? rows("coding_sessions").map((r) => ({
                  ...r,
                  project_title:
                    projects.find((p) => p.id === r.project_id)?.title ?? null,
                }))
              : [],
          logs:
            domain === "education"
              ? rows("education_logs")
              : domain === "work"
                ? rows("work_logs")
                : [],
          decisions: domain === "work" ? rows("work_decisions") : [],
          meetings:
            domain === "work"
              ? rows("work_meetings").map((r) => ({
                  ...r,
                  project_title:
                    projects.find((p) => p.id === r.project_id)?.title ?? null,
                }))
              : [],
          followups:
            domain === "work"
              ? db
                  .prepare(
                    "SELECT f.*,t.title,t.status FROM work_meeting_followups f JOIN tasks t ON t.id=f.task_id AND t.user_id=f.user_id WHERE f.user_id=? ORDER BY f.created_at,f.id",
                  )
                  .all(owner)
              : [],
        };
      });
    },
    lifeNote(
      user: string,
      operation: "create" | "update" | "archive" | "restore",
      input: unknown,
    ) {
      return write<StoredRow>(user, "retained.note", (db) => {
        const p = validate(
          operation === "create"
            ? createLifeNoteInputSchema
            : operation === "update"
              ? updateLifeNoteInputSchema
              : lifeNoteLifecycleInputSchema,
          input,
        );
        const area = ownedArea(db, owner, "life", operation === "create");
        if ("resourceId" in p) {
          const note = row(db, "resources", owner, p.resourceId);
          if (
            note.type !== "note" ||
            note.area_id !== area ||
            (operation === "restore") === (note.archived_at === null)
          )
            throw new Error("LIFE_NOTE_UNAVAILABLE");
          return patch(
            db,
            "resources",
            owner,
            String(note.id),
            "body" in p
              ? {
                  title: validate(updateLifeNoteInputSchema, input).title,
                  summary: validate(updateLifeNoteInputSchema, input).body,
                  updated_at: now(),
                }
              : {
                  archived_at: operation === "archive" ? now() : null,
                  updated_at: now(),
                },
          );
        }
        if (!("body" in p)) throw new Error("NOTE_INPUT_INVALID");
        return insert(db, "resources", owner, {
          id: randomUUID(),
          user_id: owner,
          area_id: area,
          type: "note",
          source: "life:note",
          title: p.title,
          summary: p.body,
          review_needed: 0,
          created_at: now(),
          updated_at: now(),
        });
      });
    },
    editWorkWiki(
      user: string,
      operation: "update" | "archive",
      input: unknown,
    ) {
      return write<StoredRow>(user, "retained.knowledge", (db) => {
        const p = validate(
          operation === "update"
            ? updateWorkWikiInputSchema
            : archiveWorkWikiInputSchema,
          input,
        );
        const area = ownedArea(db, owner, "work"),
          resource = row(db, "resources", owner, p.resourceId);
        if (
          resource.area_id !== area ||
          resource.type !== "note" ||
          resource.archived_at !== null
        )
          throw new Error("WORK_WIKI_UNAVAILABLE");
        return patch(
          db,
          "resources",
          owner,
          p.resourceId,
          "body" in p
            ? {
                title: validate(updateWorkWikiInputSchema, input).title,
                summary: validate(updateWorkWikiInputSchema, input).body,
                updated_at: now(),
              }
            : { archived_at: now(), updated_at: now() },
        );
      });
    },
    knowledge(
      user: string,
      domain: "education" | "work",
      input: Record<string, unknown>,
    ) {
      return write<StoredRow>(user, "retained.knowledge", (db) =>
        createKnowledgeResource(db, owner, domain, input),
      );
    },
    followup(
      user: string,
      operation: "create" | "link" | "unlink",
      input: unknown,
    ) {
      return write<StoredRow>(user, "retained.followup", (db) =>
        meetingFollowup(db, owner, operation, input),
      );
    },
    convertWishlist(user: string, input: unknown) {
      return write<StoredRow>(user, "retained.convert", (db) =>
        convertWishlist(db, owner, input),
      );
    },
    progress(
      user: string,
      operation: "append" | "update" | "archive",
      input: Record<string, unknown>,
    ) {
      return write<StoredRow>(user, "reward.progress", (db) =>
        challengeProgress(db, owner, operation, input),
      );
    },
    completeChallenge(user: string, input: unknown) {
      return write<string>(user, "reward.complete", (db) =>
        completeChallenge(db, owner, input),
      );
    },
    abandonChallenge(user: string, input: unknown) {
      return write<StoredRow>(user, "reward.challenge", (db) =>
        abandonChallenge(db, owner, input),
      );
    },
    redeem(user: string, input: unknown) {
      return write<string>(user, "reward.redeem", (db) =>
        redeemShop(db, owner, input),
      );
    },
    rotate(user: string) {
      return write<string>(user, "reward.antirot", (db) =>
        rotateAntiRot(db, owner),
      );
    },
    resolve(user: string, input: unknown) {
      return write<string>(user, "reward.antirot", (db) =>
        resolveAntiRot(db, owner, input),
      );
    },
    setAntiRotStatus(user: string, input: unknown) {
      return write<StoredRow>(user, "reward.action", (db) =>
        setAntiRotStatus(db, owner, input),
      );
    },
    setShopPaused(user: string, input: unknown) {
      return write<StoredRow>(user, "reward.item", (db) =>
        setShopPaused(db, owner, input),
      );
    },
    rewardWorkspace(user: string) {
      scope(user);
      return store.read(context, (db) => ({
        balance: rewardBalance(db, owner),
        ledger: db
          .prepare(
            "SELECT * FROM reward_ledger_entries WHERE user_id=? ORDER BY created_at DESC,id DESC",
          )
          .all(owner),
        progress: db
          .prepare(
            "SELECT * FROM challenge_progress_logs WHERE user_id=? ORDER BY recorded_at DESC,id DESC",
          )
          .all(owner),
        events: db
          .prepare(
            "SELECT * FROM anti_rot_events WHERE user_id=? ORDER BY created_at DESC,id DESC",
          )
          .all(owner),
        redemptions: db
          .prepare(
            "SELECT * FROM shop_redemptions WHERE user_id=? ORDER BY redeemed_at DESC,id DESC",
          )
          .all(owner),
      }));
    },
  };
}
