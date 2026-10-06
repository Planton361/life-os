import "server-only";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import * as life from "../../schemas/life.schemas";
import * as coding from "../../schemas/coding.schemas";
import * as education from "../../schemas/education-log.schemas";
import * as work from "../../schemas/work.schemas";
import { antiRotActionInputSchema } from "../../schemas/anti-rot.schemas";
import { challengeInputSchema } from "../../schemas/challenge.schemas";
import { shopItemInputSchema } from "../../schemas/shop.schemas";
import { decimal, decimalFromNumber, compareDecimals, uuid } from "../codecs";
import {
  row,
  insert,
  patch,
  now,
  validate,
  type StoredRow,
} from "./nutrition-commands";
import { createEducationLiteratureInputSchema } from "../../schemas/resource.schemas";
import { linkResource } from "./resource-commands";

const definitions = {
  journal: {
    table: "journal_entries",
    schema: life.createJournalEntryInputSchema,
    fields: { entryDate: "entry_date", title: "title", body: "body" },
  },
  coding: {
    table: "coding_sessions",
    schema: coding.createCodingSessionInputSchema,
    fields: {
      projectId: "project_id",
      sessionDate: "session_date",
      startTime: "start_time",
      durationMinutes: "duration_minutes",
      activity: "activity",
      outcome: "outcome",
      note: "note",
    },
    area: "coding",
  },
  education: {
    table: "education_logs",
    schema: education.createEducationLogInputSchema,
    fields: {
      projectId: "project_id",
      logType: "log_type",
      logDate: "log_date",
      startTime: "start_time",
      durationMinutes: "duration_minutes",
      focus: "focus",
      outcome: "outcome",
      notes: "notes",
      wordCountDelta: "word_count_delta",
      unitsCompleted: "units_completed",
    },
    area: "education",
  },
  "work.log": {
    table: "work_logs",
    schema: work.createWorkLogInputSchema,
    fields: {
      projectId: "project_id",
      logDate: "log_date",
      startedAt: "started_at",
      durationMinutes: "duration_minutes",
      focus: "focus",
      outcome: "outcome",
      notes: "notes",
    },
    area: "work",
  },
  "work.decision": {
    table: "work_decisions",
    schema: work.createWorkDecisionInputSchema,
    fields: {
      projectId: "project_id",
      decisionDate: "decision_date",
      title: "title",
      decision: "decision",
      rationale: "rationale",
      status: "status",
    },
    area: "work",
  },
  "work.meeting": {
    table: "work_meetings",
    schema: work.createWorkMeetingInputSchema,
    fields: {
      projectId: "project_id",
      meetingDate: "meeting_date",
      startedAt: "started_at",
      durationMinutes: "duration_minutes",
      title: "title",
      participants: "participants",
      agenda: "agenda",
      outcome: "outcome",
      notes: "notes",
    },
    area: "work",
  },
  entertainment: {
    table: "entertainment_items",
    schema: life.entertainmentItemInputSchema,
    fields: {
      mediaType: "media_type",
      title: "title",
      creatorOrStudio: "creator_or_studio",
      releaseYear: "release_year",
      status: "status",
      startedOn: "started_on",
      completedOn: "completed_on",
      rating: "rating",
      notes: "notes",
      progressCurrent: "progress_current",
      progressTotal: "progress_total",
      progressUnit: "progress_unit",
    },
    decimals: ["progressCurrent", "progressTotal"],
  },
  wishlist: {
    table: "wishlist_items",
    schema: life.wishlistItemInputSchema,
    fields: {
      title: "title",
      description: "description",
      category: "category",
      priority: "priority",
      amount: "expected_price",
      currency: "currency",
      targetDate: "target_date",
      status: "status",
    },
    decimals: ["amount"],
  },
  inventory: {
    table: "inventory_items",
    schema: life.inventoryItemInputSchema,
    fields: {
      name: "name",
      category: "category",
      description: "description",
      quantity: "quantity",
      unit: "unit",
      acquiredOn: "acquired_on",
      location: "location",
      condition: "condition",
      amount: "acquisition_value",
      currency: "currency",
    },
    decimals: ["quantity", "amount"],
  },
  purchase: {
    table: "purchase_decisions",
    schema: life.purchaseDecisionInputSchema,
    fields: {
      wishlistItemId: "wishlist_item_id",
      decisionDate: "decision_date",
      context: "context",
      criteria: "criteria",
      decision: "decision",
      rationale: "rationale",
      status: "status",
    },
  },
  "antirot.action": {
    table: "anti_rot_actions",
    schema: antiRotActionInputSchema,
    fields: {
      title: "title",
      description: "description",
      category: "category",
      energy: "energy",
      estimatedMinutes: "estimated_minutes",
    },
  },
  challenge: {
    table: "challenges",
    schema: challengeInputSchema,
    fields: {
      title: "title",
      description: "description",
      periodType: "period_type",
      startDate: "start_date",
      endDate: "end_date",
      targetValue: "target_value",
      unit: "unit",
      rewardCoins: "reward_coins",
    },
    decimals: ["targetValue"],
  },
  shop: {
    table: "shop_items",
    schema: shopItemInputSchema,
    fields: {
      title: "title",
      description: "description",
      category: "category",
      costCoins: "cost_coins",
    },
  },
} as const;
export type RetainedKind = keyof typeof definitions;
export const retainedDefinitions = definitions;
export function exactRetained(value: unknown): string | null {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  )
    return null;
  if (typeof value === "number" && Math.abs(value) > Number.MAX_SAFE_INTEGER)
    throw new Error("UNSAFE_NUMERIC_INPUT_USE_EXACT_TEXT");
  const text =
    typeof value === "number"
      ? decimalFromNumber(value)
      : decimal(z.string().trim().parse(value));
  if (/NaN|Infinity/.test(text)) throw new Error("FINITE_DECIMAL_REQUIRED");
  return text;
}
// Execute the product Zod contract without converting arbitrary exact decimals
// to Number. Exact range/coupling checks then use original text at the DB boundary.
export function parseExact(
  schema: z.ZodType,
  input: Record<string, unknown>,
  fields: readonly string[],
) {
  const numeric: Record<string, string | null> = {};
  const candidate = { ...input };
  for (const key of fields) {
    numeric[key] = exactRetained(input[key]);
    candidate[key] =
      numeric[key] === null
        ? null
        : compareDecimals(numeric[key]!, "0") < 0
          ? -1
          : numeric[key] === "0"
            ? 0
            : 1;
  }
  const parsed = validate(schema, candidate) as Record<string, unknown>;
  if (
    numeric.progressCurrent != null &&
    numeric.progressTotal != null &&
    compareDecimals(numeric.progressCurrent, numeric.progressTotal) > 0
  )
    throw new Error("INPUT_INVALID");
  return { parsed, numeric };
}
export function ownedArea(
  db: Database.Database,
  owner: string,
  key: string,
  create = false,
): string {
  const area = db
    .prepare(
      "SELECT id FROM areas WHERE user_id=? AND key=? AND archived_at IS NULL",
    )
    .get(owner, key) as { id: string } | undefined;
  if (area) return area.id;
  if (!create) throw new Error("AREA_UNAVAILABLE");
  const id = randomUUID(),
    at = now();
  db.prepare(
    "INSERT INTO areas(id,user_id,key,name,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
  ).run(
    id,
    owner,
    key,
    key[0].toUpperCase() + key.slice(1),
    { coding: 80, education: 90, work: 100, life: 110 }[key as "life"] ?? 0,
    at,
    at,
  );
  return id;
}
export function ownedAreaProject(
  db: Database.Database,
  owner: string,
  id: string,
  key: string,
) {
  const project = row(db, "projects", owner, id);
  if (
    project.archived_at !== null ||
    project.area_id !== ownedArea(db, owner, key)
  )
    throw new Error("AREA_PROJECT_UNAVAILABLE");
  return project;
}
export function retainedCommand(
  db: Database.Database,
  owner: string,
  kind: RetainedKind,
  operation: "create" | "update" | "archive" | "restore",
  input: Record<string, unknown>,
) {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  const definition = definitions[kind];
  let old: StoredRow | undefined;
  if (operation !== "create") {
    old = row(db, definition.table, owner, z.string().uuid().parse(input.id));
    if ((operation === "restore") === (old.archived_at === null))
      throw new Error("INVALID_LIFECYCLE_STATE");
    if (
      input.projectId &&
      kind !== "coding" &&
      old.project_id !== uuid(String(input.projectId))
    )
      throw new Error("PROJECT_CONTEXT_CHANGED");
  }
  if (operation === "archive" || operation === "restore") {
    if (
      [
        "journal",
        "coding",
        "education",
        "work.log",
        "work.decision",
        "work.meeting",
        "purchase",
        "challenge",
      ].includes(kind) &&
      operation === "restore"
    )
      throw new Error("RESTORE_UNSUPPORTED");
    if ("area" in definition && kind !== "coding")
      ownedAreaProject(db, owner, String(old!.project_id), definition.area);
    return patch(db, definition.table, owner, String(old!.id), {
      archived_at: operation === "archive" ? now() : null,
      updated_at: now(),
    });
  }
  if (old && kind === "challenge" && old.status !== "active")
    throw new Error("ACTIVE_CHALLENGE_REQUIRED");
  const { parsed, numeric } = parseExact(
    definition.schema,
    input,
    "decimals" in definition ? definition.decimals : [],
  );
  if ("area" in definition)
    ownedAreaProject(db, owner, String(parsed.projectId), definition.area);
  if (
    ["journal", "entertainment", "wishlist", "inventory", "purchase"].includes(
      kind,
    ) &&
    operation === "create"
  )
    ownedArea(db, owner, "life", true);
  const values: StoredRow = {};
  for (const [key, column] of Object.entries(definition.fields)) {
    const value = (
      key in numeric ? numeric[key] : (parsed[key] ?? null)
    ) as StoredRow[string];
    values[column] =
      key.endsWith("Id") && value !== null ? uuid(String(value)) : value;
  }
  if (kind === "purchase") {
    row(db, "wishlist_items", owner, String(parsed.wishlistItemId));
    if (old) delete values.wishlist_item_id; // Context is fixed by the canonical repository.
  }
  if (operation === "update")
    return patch(db, definition.table, owner, String(old!.id), {
      ...values,
      updated_at: now(),
    });
  return insert(db, definition.table, owner, {
    id: randomUUID(),
    user_id: owner,
    ...values,
  });
}
export function convertWishlist(
  db: Database.Database,
  owner: string,
  input: unknown,
) {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  const { wishlistItemId } = validate(
    life.convertWishlistItemInputSchema,
    input,
  );
  const item = row(db, "wishlist_items", owner, wishlistItemId);
  if (item.archived_at !== null) throw new Error("WISHLIST_UNAVAILABLE");
  let inventory = db
    .prepare(
      "SELECT * FROM inventory_items WHERE user_id=? AND source_wishlist_item_id=?",
    )
    .get(owner, item.id) as StoredRow | undefined;
  inventory ??= insert(db, "inventory_items", owner, {
    id: randomUUID(),
    user_id: owner,
    source_wishlist_item_id: item.id,
    name: item.title,
    category: item.category,
    description: item.description,
    acquisition_value: item.expected_price,
    currency: item.currency,
  });
  patch(db, "wishlist_items", owner, String(item.id), {
    status: "acquired",
    updated_at: now(),
  });
  db.prepare(
    "UPDATE purchase_decisions SET inventory_item_id=?,updated_at=life_now() WHERE user_id=? AND wishlist_item_id=? AND inventory_item_id IS NULL",
  ).run(inventory.id, owner, item.id);
  return inventory;
}
export function createKnowledgeResource(
  db: Database.Database,
  owner: string,
  domain: "education" | "work",
  input: Record<string, unknown>,
) {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  const schema =
    domain === "work"
      ? work.createWorkWikiInputSchema
      : createEducationLiteratureInputSchema;
  const p = validate(schema, {
    ...input,
    userId: owner,
    profileId: owner,
  }) as Record<string, string | undefined>;
  if (p.projectId) p.projectId = uuid(p.projectId);
  if (p.areaId) p.areaId = uuid(p.areaId);
  const area = ownedArea(db, owner, domain, domain === "work");
  if (domain === "education" && p.areaId !== area)
    throw new Error("EDUCATION_AREA_DENIED");
  if (p.projectId) ownedAreaProject(db, owner, p.projectId, domain);
  const relation = domain === "education" ? "source" : "context";
  const type = domain === "work" ? "note" : p.type!;
  const summary = p.body?.trim() || null,
    url = domain === "work" ? null : p.url?.trim() || null;
  const existing = db
    .prepare(
      `SELECT r.* FROM resources r WHERE r.user_id=? ${domain === "work" ? "AND r.area_id=?" : ""} AND r.archived_at IS NULL AND r.type=? AND r.title=? AND r.summary IS ? AND r.url IS ? AND ${p.projectId ? "EXISTS(SELECT 1 FROM resource_relations rr WHERE rr.resource_id=r.id AND rr.user_id=r.user_id AND rr.target_type='project' AND rr.target_id=? AND rr.relation_type=?)" : "NOT EXISTS(SELECT 1 FROM resource_relations rr JOIN projects p ON p.id=rr.target_id AND p.user_id=rr.user_id WHERE rr.resource_id=r.id AND rr.user_id=r.user_id AND rr.target_type='project' AND rr.relation_type='context' AND p.area_id=r.area_id)"} ORDER BY r.created_at,r.id LIMIT 1`,
    )
    .get(
      owner,
      ...(domain === "work" ? [area] : []),
      type,
      p.title!,
      summary,
      url,
      ...(p.projectId ? [p.projectId, relation] : []),
    ) as StoredRow | undefined;
  if (existing) return existing;
  const resource = insert(db, "resources", owner, {
    id: randomUUID(),
    user_id: owner,
    area_id: area,
    type,
    title: p.title!,
    summary,
    url,
    review_needed: 0,
    created_at: now(),
    updated_at: now(),
  });
  if (p.projectId)
    linkResource(db, owner, {
      userId: owner,
      profileId: owner,
      resourceId: resource.id,
      targetType: "project",
      targetId: p.projectId,
      relationType: relation,
    });
  return resource;
}
export function meetingFollowup(
  db: Database.Database,
  owner: string,
  operation: "create" | "link" | "unlink",
  input: unknown,
) {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  if (operation === "unlink") {
    const p = validate(work.unlinkWorkMeetingFollowupInputSchema, input);
    const relation = row(db, "work_meeting_followups", owner, p.relationId);
    if (relation.meeting_id !== uuid(p.meetingId))
      throw new Error("MEETING_CONTEXT_DENIED");
    db.prepare(
      "DELETE FROM work_meeting_followups WHERE user_id=? AND id=?",
    ).run(owner, relation.id);
    return relation;
  }
  const p = validate(
    operation === "create"
      ? work.createWorkMeetingFollowupInputSchema
      : work.linkWorkMeetingFollowupInputSchema,
    input,
  );
  const meeting = row(db, "work_meetings", owner, p.meetingId);
  if (meeting.archived_at !== null) throw new Error("MEETING_UNAVAILABLE");
  ownedAreaProject(db, owner, String(meeting.project_id), "work");
  const taskId =
    "taskId" in p
      ? uuid(p.taskId)
      : insert(db, "tasks", owner, {
          id: randomUUID(),
          user_id: owner,
          project_id: meeting.project_id,
          title: p.title,
          description: p.description ?? null,
          status: "planned",
          created_at: now(),
          updated_at: now(),
        }).id;
  const task = row(db, "tasks", owner, String(taskId));
  if (task.archived_at !== null) throw new Error("TASK_UNAVAILABLE");
  return (
    (db
      .prepare(
        "SELECT * FROM work_meeting_followups WHERE user_id=? AND meeting_id=? AND task_id=?",
      )
      .get(owner, meeting.id, task.id) as StoredRow | undefined) ??
    insert(db, "work_meeting_followups", owner, {
      id: randomUUID(),
      user_id: owner,
      meeting_id: meeting.id,
      task_id: task.id,
    })
  );
}
