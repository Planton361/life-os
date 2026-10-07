import "server-only";
import type { ApplicationRepositories } from "./repositories";
import type { SqliteRuntime } from "../sqlite/runtime";
import {
  requireOwnerContext,
  type OwnerContext,
} from "../sqlite/owner-context";
import { createSqliteRetainedRepository } from "../sqlite/repositories/retained-repository";
import { ownedArea } from "../sqlite/commands/retained-commands";
import type { PublicTableName, TableRow } from "../supabase/database.types";
import { canonicalApplicationRow } from "./sqlite-read-services";
import {
  mapJournalEntryRow,
  mapEntertainmentItemRow,
  mapInventoryItemRow,
  mapWishlistItemRow,
  mapPurchaseDecisionRow,
} from "../supabase/mappers/life.mapper";
import { mapResourceRowToDomain } from "../supabase/mappers/resource.mapper";
import { mapEducationLogRow } from "../supabase/mappers/education-log.mapper";
import { mapWorkLogRow } from "../supabase/mappers/work-log.mapper";
import { mapWorkDecisionRow } from "../supabase/mappers/work-decision.mapper";
import { mapWorkMeetingRow } from "../supabase/mappers/work-meeting.mapper";
import {
  mapChallenge,
  mapChallengeLog,
  mapRewardLedger,
} from "../supabase/mappers/challenge.mapper";
import {
  mapShopItem,
  mapShopLedger,
  mapShopRedemption,
} from "../supabase/mappers/shop.mapper";
import {
  mapAntiRotAction,
  mapAntiRotEvent,
} from "../supabase/mappers/anti-rot.mapper";
import { sortEducationLogs } from "@/features/education/education-log";
import {
  sortChallenges,
  rewardBalance,
  aggregateChallengeProgress,
} from "../domain/challenge";
import { shopBalance, sortShopHistory } from "../domain/shop";
import {
  currentAntiRotRecommendation,
  sortAntiRotHistory,
} from "../domain/anti-rot";
import type { LifeNoteRelation } from "../domain/life";

type RetainedRepositories = Pick<
  ApplicationRepositories,
  | "coding"
  | "education"
  | "work"
  | "workKnowledge"
  | "workMeetings"
  | "life"
  | "challenges"
  | "shop"
  | "antiRot"
>;
async function outcome<T>(body: () => T, message: string) {
  try {
    return { ok: true as const, data: body() };
  } catch {
    return { ok: false as const, error: message };
  }
}
async function booleanOutcome(body: () => unknown) {
  try {
    body();
    return true;
  } catch {
    return false;
  }
}
const identity = (r: unknown) => ({ id: (r as { id: string }).id });

/** Native commands plus current canonical DTO mappers; no presentation branching. */
export function sqliteRetainedApplicationRepositories(
  store: SqliteRuntime,
  context: OwnerContext,
): RetainedRepositories {
  const owner = requireOwnerContext(context);
  const native = createSqliteRetainedRepository(store, context);
  const scope = (user: string) => {
    if (user !== owner) throw new Error("OWNER_DENIED");
  };
  function all<T extends PublicTableName>(
    user: string,
    table: T,
    order = "updated_at DESC,id",
  ): TableRow<T>[] {
    scope(user);
    return store.read(context, (db) =>
      db
        .prepare(`SELECT * FROM ${table} WHERE user_id=? ORDER BY ${order}`)
        .all(owner)
        .map((r) => canonicalApplicationRow<TableRow<T>>(r)),
    );
  }
  const area = (user: string, key: string) =>
    all(user, "areas").find((a) => a.key === key && !a.archived_at)?.id ?? null;
  const ensure = async (user: string, key: "work" | "education" | "life") => {
    scope(user);
    return store.command(context, "retained.area", (db) =>
      ownedArea(db, owner, key, true),
    );
  };
  function snapshot(user: string, key: "coding" | "education" | "work") {
    const id = area(user, key);
    const projects = all(user, "projects").filter(
      (p) => p.area_id === id && !p.archived_at && id !== null,
    );
    const ids = new Set(projects.map((p) => p.id));
    const tasks = all(user, "tasks", "created_at,id").filter(
      (t) => t.project_id && ids.has(t.project_id) && !t.archived_at,
    );
    const resources = all(user, "resources").filter((r) => !r.archived_at);
    const resourceById = new Map(resources.map((r) => [r.id, r]));
    const relations = all(user, "resource_relations", "created_at,id").filter(
      (r) => r.target_type === "project" && ids.has(r.target_id),
    );
    return { projects, ids, tasks, resources, resourceById, relations };
  }
  function parent(
    user: string,
    table: "education_logs" | "work_logs" | "work_decisions" | "work_meetings",
    id: string,
    projectId: string,
  ) {
    const row = all(user, table).find((r) => r.id === id);
    if (!row || row.project_id !== projectId)
      throw new Error("PROJECT_CONTEXT_DENIED");
  }
  const decode = canonicalApplicationRow;
  return {
    coding: {
      createProject: (u, input) =>
        outcome(
          () =>
            decode<TableRow<"projects">>(native.project(u, "coding", input)),
          "Project could not be created.",
        ),
      updateProject: (u, id, input) =>
        outcome(
          () =>
            decode<TableRow<"projects">>(
              native.project(u, "coding", input, id),
            ),
          "Project could not be updated.",
        ),
      createSession: (u, input) =>
        outcome(
          () =>
            decode<TableRow<"coding_sessions">>(
              native.create(u, "coding", input),
            ),
          "Session could not be created.",
        ),
      updateSession: (u, id, input) =>
        outcome(
          () =>
            decode<TableRow<"coding_sessions">>(
              native.update(u, "coding", id, input),
            ),
          "Session could not be updated.",
        ),
      archiveSession: (u, id) =>
        outcome(
          () => identity(native.lifecycle(u, "coding", id, "archive")),
          "Session not found.",
        ),
      getWorkspace: async (u) => {
        const s = snapshot(u, "coding");
        const tasksByProject = new Map(
          s.projects.map((p) => [
            p.id,
            s.tasks
              .filter((t) => t.project_id === p.id)
              .map((t) => ({ id: t.id, status: t.status, title: t.title })),
          ]),
        );
        const resourcesByProject = new Map(
          s.projects.map((p) => [
            p.id,
            s.relations
              .filter((r) => r.target_id === p.id)
              .flatMap((r) => {
                const v = s.resourceById.get(r.resource_id);
                return v
                  ? [
                      {
                        id: v.id,
                        title: v.title,
                        relationType: r.relation_type,
                      },
                    ]
                  : [];
              }),
          ]),
        );
        return {
          projects: s.projects.map((p) => ({
            description: p.description,
            id: p.id,
            repositoryUrl: p.repository_url,
            status: p.status,
            title: p.title,
          })),
          tasksByProject,
          resourcesByProject,
          sessions: all(
            u,
            "coding_sessions",
            "session_date DESC,created_at DESC,id DESC",
          )
            .filter((r) => s.ids.has(r.project_id))
            .map((r) => ({
              activity: r.activity,
              archivedAt: r.archived_at,
              durationMinutes: r.duration_minutes,
              id: r.id,
              note: r.note,
              outcome: r.outcome,
              projectId: r.project_id,
              projectTitle:
                s.projects.find((p) => p.id === r.project_id)?.title ??
                "Nicht mehr verfügbar",
              sessionDate: r.session_date,
              startTime: r.start_time,
            })),
        };
      },
    },
    education: {
      ensureEducationArea: (u) => ensure(u, "education"),
      ownedProject: async (u, id) =>
        snapshot(u, "education").ids.has(id) ? { id } : null,
      createProject: (u, input) =>
        outcome(
          () => identity(native.project(u, "education", input)),
          "Project create failed.",
        ),
      updateProject: (u, id, input) =>
        outcome(
          () => identity(native.project(u, "education", input, id)),
          "Project update failed.",
        ),
      createLiteratureResource: (u, input) =>
        outcome(
          () =>
            mapResourceRowToDomain(
              decode(native.knowledge(u, "education", input)),
            ),
          "Literature resource could not be created.",
        ),
      createLog: (u, input) =>
        outcome(
          () =>
            decode<TableRow<"education_logs">>(
              native.create(u, "education", input),
            ),
          "Education log create failed.",
        ),
      updateLog: (u, id, input) =>
        outcome(
          () =>
            decode<TableRow<"education_logs">>(
              native.update(u, "education", id, input),
            ),
          "Education log update failed.",
        ),
      archiveLog: (u, p, id) =>
        outcome(() => {
          parent(u, "education_logs", id, p);
          return identity(native.lifecycle(u, "education", id, "archive"));
        }, "Education log archive failed."),
      getWorkspace: async (u) => {
        const s = snapshot(u, "education");
        const logs = all(
          u,
          "education_logs",
          "log_date DESC,start_time DESC NULLS FIRST,created_at DESC,id DESC",
        );
        const resources = s.resources.map((r) => ({
          body: r.summary,
          id: r.id,
          title: r.title,
          type: r.type,
          url: r.url,
        }));
        return {
          resources,
          projects: s.projects.map((p) => ({
            description: p.description,
            id: p.id,
            status: p.status,
            title: p.title,
            logs: sortEducationLogs(
              logs.filter((r) => r.project_id === p.id).map(mapEducationLogRow),
            ),
            literature: s.relations
              .filter((r) => r.target_id === p.id)
              .flatMap((r) => {
                const v = resources.find((v) => v.id === r.resource_id);
                return v
                  ? [{ ...v, relationId: r.id, relationType: r.relation_type }]
                  : [];
              }),
            tasks: s.tasks
              .filter((t) => t.project_id === p.id)
              .map((t) => ({
                dueAt: t.due_at,
                id: t.id,
                plannedDate: t.planned_date,
                status: t.status,
                title: t.title,
              })),
          })),
        };
      },
    },
    work: {
      ensureArea: (u) => ensure(u, "work"),
      createProject: (u, input) =>
        outcome(
          () => decode<TableRow<"projects">>(native.project(u, "work", input)),
          "Work project create failed.",
        ),
      updateProject: (u, id, input) =>
        outcome(
          () =>
            decode<TableRow<"projects">>(native.project(u, "work", input, id)),
          "Work project update failed.",
        ),
      createLog: (u, input) =>
        outcome(
          () =>
            decode<TableRow<"work_logs">>(native.create(u, "work.log", input)),
          "Work log create failed.",
        ),
      updateLog: (u, id, input) =>
        outcome(
          () =>
            decode<TableRow<"work_logs">>(
              native.update(u, "work.log", id, input),
            ),
          "Work log update failed.",
        ),
      archiveLog: (u, p, id) =>
        outcome(() => {
          parent(u, "work_logs", id, p);
          return identity(native.lifecycle(u, "work.log", id, "archive"));
        }, "Work log archive failed."),
      getWorkspace: async (u) => {
        const s = snapshot(u, "work");
        const logs = all(
          u,
          "work_logs",
          "log_date DESC,created_at DESC,id DESC",
        );
        return {
          projects: s.projects.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            status: p.status,
            tasks: s.tasks
              .filter((t) => t.project_id === p.id)
              .map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                dueAt: t.due_at,
              })),
            resources: s.relations
              .filter((r) => r.target_id === p.id)
              .flatMap((r) => {
                const v = s.resourceById.get(r.resource_id);
                return v
                  ? [
                      {
                        id: v.id,
                        title: v.title,
                        relationType: r.relation_type,
                      },
                    ]
                  : [];
              }),
            logs: logs.filter((r) => r.project_id === p.id).map(mapWorkLogRow),
          })),
        };
      },
    },
    workKnowledge: {
      createWiki: (u, input) =>
        outcome(
          () => identity(native.knowledge(u, "work", input)),
          "Work wiki create failed.",
        ),
      updateWiki: (u, id, input) =>
        outcome(
          () =>
            identity(
              native.editWorkWiki(u, "update", { ...input, resourceId: id }),
            ),
          "Work wiki update failed.",
        ),
      archiveWiki: (u, id) =>
        outcome(
          () => identity(native.editWorkWiki(u, "archive", { resourceId: id })),
          "Work wiki archive failed.",
        ),
      createDecision: (u, input) =>
        outcome(
          () => identity(native.create(u, "work.decision", input)),
          "Work decision create failed.",
        ),
      updateDecision: (u, id, input) =>
        outcome(
          () => identity(native.update(u, "work.decision", id, input)),
          "Work decision update failed.",
        ),
      archiveDecision: (u, p, id) =>
        outcome(() => {
          parent(u, "work_decisions", id, p);
          return identity(native.lifecycle(u, "work.decision", id, "archive"));
        }, "Work decision archive failed."),
      getKnowledge: async (u) => {
        const s = snapshot(u, "work");
        const areaId = area(u, "work");
        return {
          wiki: all(u, "resources")
            .filter((r) => areaId && r.area_id === areaId && r.type === "note")
            .map((r) => {
              const relation = s.relations
                .filter((l) => l.resource_id === r.id)
                .at(-1);
              const p = s.projects.find((p) => p.id === relation?.target_id);
              return {
                archivedAt: r.archived_at,
                body: r.summary,
                id: r.id,
                projectId: p?.id ?? null,
                projectTitle: p?.title ?? null,
                title: r.title,
              };
            }),
          decisions: all(
            u,
            "work_decisions",
            "decision_date DESC,created_at DESC,id DESC",
          ).flatMap((r) => {
            const p = s.projects.find((p) => p.id === r.project_id);
            return p ? [mapWorkDecisionRow(r, p.title)] : [];
          }),
        };
      },
    },
    workMeetings: {
      createMeeting: (u, input) =>
        outcome(
          () => identity(native.create(u, "work.meeting", input)),
          "Work meeting create failed.",
        ),
      updateMeeting: (u, id, input) =>
        outcome(
          () => identity(native.update(u, "work.meeting", id, input)),
          "Work meeting update failed.",
        ),
      archiveMeeting: (u, p, id) =>
        outcome(() => {
          parent(u, "work_meetings", id, p);
          return identity(native.lifecycle(u, "work.meeting", id, "archive"));
        }, "Work meeting archive failed."),
      linkFollowup: (u, meetingId, taskId) =>
        outcome(
          () => identity(native.followup(u, "link", { meetingId, taskId })),
          "Follow-up link failed.",
        ),
      createFollowup: (u, meetingId, title, description) =>
        outcome(
          () => ({
            id: String(
              native.followup(u, "create", { meetingId, title, description })
                .task_id,
            ),
          }),
          "Follow-up create failed.",
        ),
      unlinkFollowup: (u, meetingId, relationId) =>
        outcome(
          () =>
            identity(native.followup(u, "unlink", { meetingId, relationId })),
          "Follow-up unlink failed.",
        ),
      getMeetings: async (u) => {
        const s = snapshot(u, "work");
        const tasks = all(u, "tasks");
        const links = all(u, "work_meeting_followups", "created_at,id");
        return all(
          u,
          "work_meetings",
          "meeting_date DESC,created_at DESC,id DESC",
        ).flatMap((r) => {
          const p = s.projects.find((p) => p.id === r.project_id);
          return p
            ? [
                mapWorkMeetingRow(
                  r,
                  p.title,
                  links
                    .filter((l) => l.meeting_id === r.id)
                    .flatMap((l) => {
                      const t = tasks.find((t) => t.id === l.task_id);
                      return t
                        ? [
                            {
                              archivedAt: t.archived_at,
                              relationId: l.id,
                              status: t.status,
                              taskId: t.id,
                              title: t.title,
                            },
                          ]
                        : [];
                    }),
                ),
              ]
            : [];
        });
      },
    },
    life: {
      ensureArea: (u) => ensure(u, "life"),
      getJournalEntries: async (u) =>
        native.read(u, "journal").map((r) => mapJournalEntryRow(decode(r))),
      createJournalEntry: (u, input) =>
        outcome(
          () => mapJournalEntryRow(decode(native.create(u, "journal", input))),
          "Journal entry could not be created.",
        ),
      updateJournalEntry: (u, input) =>
        outcome(
          () =>
            mapJournalEntryRow(
              decode(native.update(u, "journal", input.journalEntryId, input)),
            ),
          "Journal entry is unavailable.",
        ),
      archiveJournalEntry: (u, id) =>
        outcome(
          () => identity(native.lifecycle(u, "journal", id, "archive")),
          "Journal entry is unavailable.",
        ),
      createNote: (u, input) =>
        outcome(
          () => identity(native.lifeNote(u, "create", input)),
          "Note could not be created.",
        ),
      updateNote: (u, id, input) =>
        outcome(
          () =>
            identity(
              native.lifeNote(u, "update", { ...input, resourceId: id }),
            ),
          "Note is unavailable.",
        ),
      setNoteArchived: (u, id, archived) =>
        outcome(
          () =>
            identity(
              native.lifeNote(u, archived ? "archive" : "restore", {
                resourceId: id,
              }),
            ),
          "Note is unavailable.",
        ),
      getWorkspace: async (u) => {
        const id = area(u, "life");
        if (!id) return { areaAvailable: false, journalEntries: [], notes: [] };
        const labels = new Map(
          [...all(u, "projects"), ...all(u, "goals"), ...all(u, "tasks")].map(
            (r) => [r.id, r.title],
          ),
        );
        const relations = all(u, "resource_relations", "created_at,id");
        return {
          areaAvailable: true,
          journalEntries: native
            .read(u, "journal")
            .map((r) => mapJournalEntryRow(decode(r))),
          notes: all(u, "resources")
            .filter((r) => r.area_id === id && r.type === "note")
            .map((r) => ({
              archivedAt: r.archived_at,
              body: r.summary ?? "",
              createdAt: r.created_at,
              id: r.id,
              title: r.title,
              updatedAt: r.updated_at,
              relations: relations
                .filter((l) => l.resource_id === r.id)
                .flatMap((l) => {
                  if (
                    l.target_type !== "task" &&
                    l.target_type !== "goal" &&
                    l.target_type !== "project"
                  )
                    return [];
                  const label = labels.get(l.target_id);
                  const view =
                    l.target_type === "task"
                      ? "tasks"
                      : l.target_type === "goal"
                        ? "goals"
                        : "projects";
                  return label
                    ? [
                        {
                          href: `/portfolio?view=${view}&selected=${l.target_id}`,
                          id: l.id,
                          label,
                          relationType: l.relation_type,
                          targetType: l.target_type,
                        } satisfies LifeNoteRelation,
                      ]
                    : [];
                }),
            })),
        };
      },
      getEntertainmentWorkspace: async (u) => ({
        areaAvailable: !!area(u, "life"),
        items: native
          .read(u, "entertainment")
          .map((r) => mapEntertainmentItemRow(decode(r))),
      }),
      createEntertainmentItem: (u, input) =>
        outcome(
          () =>
            mapEntertainmentItemRow(
              decode(native.create(u, "entertainment", input)),
            ),
          "Entertainment item could not be created.",
        ),
      updateEntertainmentItem: (u, input) =>
        outcome(
          () =>
            mapEntertainmentItemRow(
              decode(
                native.update(
                  u,
                  "entertainment",
                  input.entertainmentItemId,
                  input,
                ),
              ),
            ),
          "Entertainment item is unavailable.",
        ),
      setEntertainmentItemArchived: (u, id, archived) =>
        outcome(
          () =>
            identity(
              native.lifecycle(
                u,
                "entertainment",
                id,
                archived ? "archive" : "restore",
              ),
            ),
          "Entertainment item is unavailable.",
        ),
      getInventoryWorkspace: async (u) => {
        const wishlistItems = native
          .read(u, "wishlist")
          .map((r) => mapWishlistItemRow(decode(r)));
        return {
          areaAvailable: !!area(u, "life"),
          wishlistItems,
          decisions: native
            .read(u, "purchase")
            .map((r) => mapPurchaseDecisionRow(decode(r))),
          inventoryItems: native.read(u, "inventory").map((r) => {
            const row = decode<TableRow<"inventory_items">>(r);
            return mapInventoryItemRow(
              row,
              wishlistItems.find((w) => w.id === row.source_wishlist_item_id)
                ?.title ?? null,
            );
          }),
        };
      },
      createInventoryItem: (u, input) =>
        outcome(
          () =>
            mapInventoryItemRow(decode(native.create(u, "inventory", input))),
          "Inventory item could not be created.",
        ),
      updateInventoryItem: (u, input) =>
        outcome(
          () =>
            mapInventoryItemRow(
              decode(
                native.update(u, "inventory", input.inventoryItemId, input),
              ),
            ),
          "Inventory item is unavailable.",
        ),
      setInventoryItemArchived: (u, id, archived) =>
        outcome(
          () =>
            identity(
              native.lifecycle(
                u,
                "inventory",
                id,
                archived ? "archive" : "restore",
              ),
            ),
          "Inventory item is unavailable.",
        ),
      createWishlistItem: (u, input) =>
        outcome(
          () => mapWishlistItemRow(decode(native.create(u, "wishlist", input))),
          "Wishlist item could not be created.",
        ),
      updateWishlistItem: (u, input) =>
        outcome(
          () =>
            mapWishlistItemRow(
              decode(native.update(u, "wishlist", input.wishlistItemId, input)),
            ),
          "Wishlist item is unavailable.",
        ),
      setWishlistItemArchived: (u, id, archived) =>
        outcome(
          () =>
            identity(
              native.lifecycle(
                u,
                "wishlist",
                id,
                archived ? "archive" : "restore",
              ),
            ),
          "Wishlist item is unavailable.",
        ),
      createPurchaseDecision: (u, input) =>
        outcome(
          () =>
            mapPurchaseDecisionRow(decode(native.create(u, "purchase", input))),
          "Purchase decision could not be created.",
        ),
      updatePurchaseDecision: (u, input) =>
        outcome(
          () =>
            mapPurchaseDecisionRow(
              decode(
                native.update(u, "purchase", input.purchaseDecisionId, input),
              ),
            ),
          "Purchase decision is unavailable.",
        ),
      archivePurchaseDecision: (u, id) =>
        outcome(
          () => identity(native.lifecycle(u, "purchase", id, "archive")),
          "Purchase decision is unavailable.",
        ),
      convertWishlistItemToInventory: (u, wishlistItemId) =>
        outcome(
          () => identity(native.convertWishlist(u, { wishlistItemId })),
          "Wishlist item could not be transferred.",
        ),
    },
    challenges: {
      getWorkspace: async (u) => {
        const reward = native.rewardWorkspace(u);
        const ledger = reward.ledger.map((r) => mapRewardLedger(decode(r)));
        return {
          balance: rewardBalance(ledger),
          ledger,
          logs: reward.progress.map((r) => mapChallengeLog(decode(r))),
          challenges: sortChallenges(
            native.read(u, "challenge").map((r) => mapChallenge(decode(r))),
          ),
        };
      },
      createChallenge: (u, input) =>
        outcome(
          () => mapChallenge(decode(native.create(u, "challenge", input))),
          "Challenge could not be created.",
        ),
      updateChallenge: (u, input) =>
        outcome(
          () =>
            mapChallenge(
              decode(native.update(u, "challenge", input.challengeId, input)),
            ),
          "Challenge could not be updated.",
        ),
      addProgress: (u, input) =>
        outcome(
          () => mapChallengeLog(decode(native.progress(u, "append", input))),
          "Progress could not be logged.",
        ),
      updateLatestProgress: (u, input) =>
        outcome(
          () => mapChallengeLog(decode(native.progress(u, "update", input))),
          "Progress could not be updated.",
        ),
      archiveLatestProgress: (u, challengeId, progressLogId) =>
        booleanOutcome(() =>
          native.progress(u, "archive", { challengeId, progressLogId }),
        ),
      complete: (u, challengeId) =>
        outcome(
          () => ({ id: native.completeChallenge(u, { challengeId }) }),
          "Target is not reached or completion failed.",
        ),
      setStatus: (u, challengeId) =>
        booleanOutcome(() => native.abandonChallenge(u, { challengeId })),
      archive: (u, id) =>
        booleanOutcome(() => native.lifecycle(u, "challenge", id, "archive")),
      progressFor: (id, logs) =>
        aggregateChallengeProgress(logs.filter((l) => l.challengeId === id)),
    },
    shop: {
      getWorkspace: async (u) => {
        const r = native.rewardWorkspace(u);
        const ledger = r.ledger.map((v) => mapShopLedger(decode(v)));
        return {
          balance: shopBalance(ledger),
          ledger,
          items: native.read(u, "shop").map((v) => mapShopItem(decode(v))),
          redemptions: sortShopHistory(
            r.redemptions.map((v) => mapShopRedemption(decode(v))),
          ),
        };
      },
      create: (u, input) =>
        outcome(
          () => mapShopItem(decode(native.create(u, "shop", input))),
          "Shop item could not be created.",
        ),
      update: (u, input) =>
        outcome(
          () =>
            mapShopItem(
              decode(native.update(u, "shop", input.shopItemId, input)),
            ),
          "Shop item could not be updated.",
        ),
      setPaused: (u, shopItemId, isPaused) =>
        booleanOutcome(() => native.setShopPaused(u, { shopItemId, isPaused })),
      archive: (u, id) =>
        booleanOutcome(() => native.lifecycle(u, "shop", id, "archive")),
      restore: (u, id) =>
        booleanOutcome(() => native.lifecycle(u, "shop", id, "restore")),
      redeem: (shopItemId, requestKey) =>
        outcome(
          () => ({ id: native.redeem(owner, { shopItemId, requestKey }) }),
          "Item is unavailable or the balance is insufficient.",
        ),
    },
    antiRot: {
      getWorkspace: async (u) => {
        const r = native.rewardWorkspace(u);
        const actions = native
          .read(u, "antirot.action")
          .map((v) => mapAntiRotAction(decode(v)));
        const events = sortAntiRotHistory(
          r.events.map((v) => mapAntiRotEvent(decode(v))),
        );
        const recommendation = currentAntiRotRecommendation(events);
        const action = actions.find((a) => a.id === recommendation?.actionId);
        return {
          actions,
          events,
          current: recommendation && action ? { action, recommendation } : null,
        };
      },
      create: (u, input) =>
        outcome(
          () =>
            mapAntiRotAction(decode(native.create(u, "antirot.action", input))),
          "Action could not be created.",
        ),
      update: (u, input) =>
        outcome(
          () =>
            mapAntiRotAction(
              decode(native.update(u, "antirot.action", input.actionId, input)),
            ),
          "Action could not be updated.",
        ),
      setStatus: (u, actionId, status) =>
        booleanOutcome(() => native.setAntiRotStatus(u, { actionId, status })),
      archive: (u, id) =>
        booleanOutcome(() =>
          native.lifecycle(u, "antirot.action", id, "archive"),
        ),
      restore: (u, id) =>
        booleanOutcome(() =>
          native.lifecycle(u, "antirot.action", id, "restore"),
        ),
      rotate: () =>
        outcome(
          () => ({ id: native.rotate(owner) }),
          "No active action is available.",
        ),
      resolve: (recommendationEventId, eventType) =>
        outcome(
          () => ({
            id: native.resolve(owner, { recommendationEventId, eventType }),
          }),
          "Recommendation could not be resolved.",
        ),
    },
  };
}
