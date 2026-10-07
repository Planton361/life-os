import "server-only";
import { randomUUID } from "node:crypto";
import type {
  TriageInboxItemToTaskTransaction,
  CreateResourceFromInboxTransaction,
} from "../repositories";
import type { SqliteRuntime } from "../sqlite/runtime";
import {
  requireOwnerContext,
  type OwnerContext,
} from "../sqlite/owner-context";
import { createTaskInTransaction } from "../sqlite/repositories/task-repository";
import {
  mapCreateTaskInputToInsert,
  mapTaskRowToDomain,
} from "../supabase/mappers/task.mapper";
import { mapInboxItemRowToDomain } from "../supabase/mappers/inbox.mapper";
import { mapResourceRowToDomain } from "../supabase/mappers/resource.mapper";
import { triageInboxItemToTaskInputSchema } from "../schemas/inbox.schemas";
import { createResourceInputSchema } from "../schemas/resource.schemas";
import { row, insert, patch, now } from "../sqlite/commands/nutrition-commands";
import { canonicalApplicationRow } from "./sqlite-read-services";
import type { TableRow } from "../supabase/database.types";

export function sqliteInboxTransactions(
  store: SqliteRuntime,
  context: OwnerContext,
): {
  triageInbox: TriageInboxItemToTaskTransaction;
  resourceFromInbox: CreateResourceFromInboxTransaction;
} {
  const owner = requireOwnerContext(context);
  function scope(input: { userId: string; profileId: string }) {
    if (input.userId !== owner || input.profileId !== owner)
      throw new Error("OWNER_DENIED");
  }
  return {
    triageInbox: async (input) => {
      try {
        scope(input);
        const p = triageInboxItemToTaskInputSchema.parse(input);
        return store.command(context, "inbox.legacy.task", (db) => {
          const item = row(db, "inbox_items", owner, p.inboxItemId);
          if (
            item.archived_at !== null ||
            item.processed_at !== null ||
            item.created_task_id !== null
          )
            throw new Error("INBOX_ALREADY_PROCESSED");
          const task = createTaskInTransaction(
            db,
            owner,
            mapCreateTaskInputToInsert(
              { ...p, sourceInboxItemId: p.inboxItemId, status: "inbox" },
              owner,
            ),
          );
          if (p.skillId) {
            const skill = row(db, "skills", owner, p.skillId);
            if (skill.archived_at !== null || skill.status === "archived")
              throw new Error("SKILL_UNAVAILABLE");
            insert(db, "task_skill_links", owner, {
              id: randomUUID(),
              user_id: owner,
              task_id: task.id,
              skill_id: p.skillId,
              created_at: now(),
            });
          }
          const updated = patch(db, "inbox_items", owner, p.inboxItemId, {
            created_task_id: task.id,
            status: "triaged",
            processed_at: now(),
            updated_at: now(),
          });
          return {
            ok: true as const,
            data: {
              inboxItem: mapInboxItemRowToDomain(
                canonicalApplicationRow<TableRow<"inbox_items">>(updated),
              ),
              task: mapTaskRowToDomain(canonicalApplicationRow(task)),
            },
          };
        });
      } catch {
        return {
          ok: false as const,
          error: {
            code: "adapter_unavailable" as const,
            message: "Unable to triage inbox item to task.",
          },
        };
      }
    },
    resourceFromInbox: async (input) => {
      try {
        scope(input);
        const p = {
          ...createResourceInputSchema.parse(input),
          inboxItemId: input.inboxItemId,
        };
        return store.command(context, "inbox.legacy.resource", (db) => {
          const item = row(db, "inbox_items", owner, p.inboxItemId);
          if (
            item.archived_at !== null ||
            item.processed_at !== null ||
            item.created_task_id !== null
          )
            throw new Error("INBOX_ALREADY_PROCESSED");
          if (
            p.areaId &&
            row(db, "areas", owner, p.areaId).archived_at !== null
          )
            throw new Error("AREA_UNAVAILABLE");
          const at = now();
          const resource = insert(db, "resources", owner, {
            id: randomUUID(),
            user_id: owner,
            area_id: p.areaId ?? null,
            type: p.type,
            title: p.title,
            summary: p.body ?? p.context ?? null,
            url: p.url ?? null,
            source: `inbox:${item.id}`,
            review_needed: Number(p.reviewNeeded ?? false),
            created_at: at,
            updated_at: at,
          });
          patch(db, "inbox_items", owner, p.inboxItemId, {
            status: "archived",
            archived_at: at,
            processed_at: at,
            updated_at: at,
          });
          return {
            ok: true as const,
            data: mapResourceRowToDomain(canonicalApplicationRow(resource)),
          };
        });
      } catch {
        return {
          ok: false as const,
          error: {
            code: "adapter_unavailable" as const,
            message: "Unable to create resource from inbox.",
          },
        };
      }
    },
  };
}
