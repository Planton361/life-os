import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { InboxRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import {
  archiveInboxItemInputSchema,
  captureInboxItemInputSchema,
} from "../../schemas/inbox.schemas";
import { mapInboxItemRowToDomain } from "../../supabase/mappers/inbox.mapper";
import type { InboxItemRow } from "../../supabase/row-types";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import {
  row,
  insert,
  patch,
  now,
  validate,
  type StoredRow,
} from "../commands/nutrition-commands";
import { numericProjection } from "./nutrition-repository";
const projection = (r: StoredRow) =>
  mapInboxItemRowToDomain({
    ...numericProjection(r),
    review_needed: Boolean(r.review_needed),
    today_candidate: Boolean(r.today_candidate),
  } as InboxItemRow);
export function createSqliteInboxRepository(
  store: SqliteRuntime,
  context: OwnerContext,
): InboxRepository {
  const owner = requireOwnerContext(context);
  const failure = (): RepositoryResult<never> => ({
    ok: false,
    error: {
      code: "forbidden",
      message: "Inbox operation rejected in the issued owner scope.",
    },
  });
  const scope = (user: string, profile: string) => {
    if (user !== owner || profile !== owner) throw new Error("OWNER_DENIED");
  };
  return {
    async getInboxItemsByUser(user, profile) {
      try {
        scope(user, profile);
        return store.read(context, (db) => ({
          ok: true as const,
          data: (
            db
              .prepare(
                "SELECT * FROM inbox_items WHERE user_id=? AND archived_at IS NULL ORDER BY captured_at DESC,id DESC",
              )
              .all(owner) as StoredRow[]
          ).map(projection),
        }));
      } catch {
        return failure();
      }
    },
    async createInboxItem(input) {
      try {
        scope(input.userId, input.profileId);
        const p = validate(captureInboxItemInputSchema, input);
        return store.command(context, "inbox.capture", (db) => {
          if (
            p.areaId &&
            row(db, "areas", owner, p.areaId).archived_at !== null
          )
            throw new Error("AREA_UNAVAILABLE");
          const at = now();
          return {
            ok: true as const,
            data: projection(
              insert(db, "inbox_items", owner, {
                id: randomUUID(),
                user_id: owner,
                area_id: p.areaId ?? null,
                title: p.title,
                body: p.body ?? null,
                source: p.source ?? null,
                type: p.type ?? "note",
                captured_at: at,
                created_at: at,
                updated_at: at,
              }),
            ),
          };
        });
      } catch {
        return failure();
      }
    },
    async archiveInboxItem(input) {
      try {
        scope(input.userId, input.profileId);
        const p = validate(archiveInboxItemInputSchema, input);
        return store.command(context, "inbox.archive", (db) => {
          if (row(db, "inbox_items", owner, p.inboxItemId).archived_at !== null)
            throw new Error("INBOX_UNAVAILABLE");
          const at = now();
          return {
            ok: true as const,
            data: projection(
              patch(db, "inbox_items", owner, p.inboxItemId, {
                archived_at: at,
                processed_at: at,
                status: "archived",
                updated_at: at,
              }),
            ),
          };
        });
      } catch {
        return failure();
      }
    },
    async markInboxItemTriaged(input) {
      try {
        scope(input.userId, input.profileId);
        const p = validate(
          z.object({
            inboxItemId: z.string().uuid(),
            taskId: z.string().uuid(),
          }),
          input,
        );
        return store.command(context, "inbox.triage", (db) => {
          if (
            row(db, "tasks", owner, p.taskId).archived_at !== null ||
            row(db, "inbox_items", owner, p.inboxItemId).archived_at !== null
          )
            throw new Error("INBOX_OR_TASK_UNAVAILABLE");
          return {
            ok: true as const,
            data: projection(
              patch(db, "inbox_items", owner, p.inboxItemId, {
                created_task_id: p.taskId,
                processed_at: now(),
                status: "triaged",
                updated_at: now(),
              }),
            ),
          };
        });
      } catch {
        return failure();
      }
    },
  };
}
