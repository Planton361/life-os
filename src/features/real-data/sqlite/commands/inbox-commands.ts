import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { inboxClarificationSchema, inboxCompletionSchema, inboxRouteSchema, type InboxClarificationInput, type InboxRouteInput } from "../../schemas/inbox-workspace.schemas";
import { timestamp, localDayAt, timezone, uuid } from "../codecs";

type Item = { id: string; title: string; body: string | null; next_action: string | null; missing_info: string | null; priority: string; energy: string | null; duration_minutes: bigint | null; area_id: string | null; review_needed: bigint; today_candidate: bigint; deadline_hint: string | null; updated_at: string; created_task_id: string | null; processed_at: string | null };
function load(db: Database.Database, owner: string, id: string, expected: string) {
  const row = db.prepare("SELECT * FROM inbox_items WHERE user_id=? AND id=? AND archived_at IS NULL AND status IN ('raw','clarified')").get(owner, uuid(id)) as Item | undefined;
  if (!row) throw new Error("INBOX_OPEN_ITEM_UNAVAILABLE");
  if (row.updated_at !== timestamp(expected)) throw new Error("INBOX_STALE");
  return row;
}
function active(db: Database.Database, owner: string, table: "areas" | "projects" | "goals" | "skills", id: string | null) {
  if (id === null) return;
  const status = table === "skills" ? " AND status<>'archived'" : "";
  if (!db.prepare(`SELECT id FROM ${table} WHERE user_id=? AND id=? AND archived_at IS NULL${status}`).get(owner, uuid(id))) throw new Error("INBOX_DESTINATION_UNAVAILABLE");
}
function blank(value: string | null) { return value?.trim() || null; }
function description(row: Item, next = true) {
  return [blank(row.body), row.missing_info ? `Missing Info: ${row.missing_info}` : null, next && row.next_action ? `Nächste Aktion: ${row.next_action}` : null].filter(Boolean).join("\n\n") || null;
}
// At 23:59:59 the canonical deadline has a single instant in current product
// IANA zones. Resolve via actual zone offsets, independent of process timezone.
function deadline(date: string, zone: string) {
  const wall = Date.parse(`${date}T23:59:59Z`);
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const candidates: number[] = [];
  for (const delta of [-36, 0, 36]) {
    const sample = wall + delta * 3600000;
    const offset = Date.parse(formatter.format(new Date(sample)).replace(" ", "T") + "Z") - sample;
    const instant = wall - offset;
    if (formatter.format(new Date(instant)).replace(" ", "T") === `${date}T23:59:59`) candidates.push(instant);
  }
  if (!candidates.length) throw new Error("INBOX_DEADLINE_UNAVAILABLE");
  return timestamp(new Date(Math.max(...candidates)).toISOString());
}

export function saveInboxClarification(db: Database.Database, owner: string, input: unknown) {
  const parsed = inboxClarificationSchema.safeParse(input);
  if (!parsed.success) throw new Error("INBOX_VALIDATION_FAILED");
  const data: InboxClarificationInput = parsed.data;
  load(db, owner, data.inboxItemId, data.expectedUpdatedAt);
  active(db, owner, "areas", data.areaId);
  db.prepare("UPDATE inbox_items SET title=?,body=?,next_action=?,missing_info=?,priority=?,energy=?,duration_minutes=?,area_id=?,review_needed=?,today_candidate=?,deadline_hint=?,status='clarified',updated_at=next_timestamp(updated_at,life_now()) WHERE user_id=? AND id=?")
    .run(data.title, blank(data.body), blank(data.nextAction), blank(data.missingInfo), data.priority, data.energy, data.durationMinutes, data.areaId && uuid(data.areaId), Number(data.reviewNeeded), Number(data.todayCandidate), data.deadlineHint, owner, uuid(data.inboxItemId));
  return db.prepare("SELECT * FROM inbox_items WHERE user_id=? AND id=?").get(owner, uuid(data.inboxItemId)) as Item;
}

export function routeSavedInboxItem(db: Database.Database, owner: string, input: unknown): { kind: "task" | "project" | "goal" | "resource" | "archive"; id: string | null } {
  const parsed = inboxRouteSchema.safeParse(input);
  if (!parsed.success) throw new Error("INBOX_VALIDATION_FAILED");
  const data: InboxRouteInput = parsed.data, row = load(db, owner, data.inboxItemId, data.expectedUpdatedAt);
  active(db, owner, "areas", row.area_id);
  if (["task", "existing_project", "existing_goal", "existing_skill"].includes(data.route)) {
    const project = data.route === "existing_project" ? data.targetId : null;
    const goal = data.route === "existing_goal" ? data.targetId : null;
    const skill = data.route === "existing_skill" ? data.targetId : null;
    active(db, owner, "skills", skill);
    let id = row.created_task_id;
    if (id) {
      if (!db.prepare("SELECT id FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL").get(owner, id)) throw new Error("INBOX_TASK_UNAVAILABLE");
    } else {
      active(db, owner, "projects", project); active(db, owner, "goals", goal);
      const profile = db.prepare("SELECT timezone FROM profiles WHERE id=?").get(owner) as { timezone: string };
      const zone = timezone(profile.timezone), now = (db.prepare("SELECT life_now() AS at").get() as { at: string }).at;
      id = randomUUID();
      db.prepare("INSERT INTO tasks(id,user_id,title,description,status,priority,energy,duration_minutes,area_id,project_id,goal_id,source_inbox_item_id,planned_date,due_at,created_at,updated_at) VALUES(?,?,?,?,'inbox',?,?,?,?,?,?,?,?,?,?,?)")
        .run(id, owner, row.title, description(row) ?? row.body, row.priority, row.energy, row.duration_minutes, row.area_id, project && uuid(project), goal && uuid(goal), row.id, row.today_candidate === BigInt(1) ? localDayAt(now, zone) : null, row.deadline_hint ? deadline(row.deadline_hint, zone) : null, now, now);
      db.prepare("UPDATE inbox_items SET status='triaged',created_task_id=?,processed_at=?,updated_at=next_timestamp(updated_at,life_now()) WHERE user_id=? AND id=?").run(id, now, owner, row.id);
    }
    if (skill) db.prepare("INSERT INTO task_skill_links(id,user_id,task_id,skill_id,created_at) VALUES(?,?,?,?,life_now()) ON CONFLICT(user_id,task_id,skill_id) DO NOTHING").run(randomUUID(), owner, id, uuid(skill));
    return { kind: "task", id };
  }
  let id: string | null = null;
  if (data.route === "project") {
    id = randomUUID();
    db.prepare("INSERT INTO projects(id,user_id,area_id,title,description,next_step,priority,target_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,life_now(),life_now())")
      .run(id, owner, row.area_id, row.title, description(row, false), row.next_action, row.priority, row.deadline_hint);
  } else if (data.route === "goal") {
    id = randomUUID();
    db.prepare("INSERT INTO goals(id,user_id,area_id,title,description,target_date,created_at,updated_at) VALUES(?,?,?,?,?,?,life_now(),life_now())").run(id, owner, row.area_id, row.title, description(row), row.deadline_hint);
  } else if (data.route === "resource" || data.route === "note") {
    const source = `inbox:${row.id}`;
    const existing = db.prepare("SELECT id FROM resources WHERE user_id=? AND source=? AND archived_at IS NULL ORDER BY created_at,id LIMIT 1").get(owner, source) as { id: string } | undefined;
    id = existing?.id ?? randomUUID();
    if (!existing) {
      if (row.processed_at || row.created_task_id) throw new Error("INBOX_ALREADY_PROCESSED");
      db.prepare("INSERT INTO resources(id,user_id,area_id,type,title,summary,source,review_needed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,life_now(),life_now())")
        .run(id, owner, row.area_id, data.route === "note" ? "note" : "source", row.title, description(row) ?? blank(row.body), source, row.review_needed);
    }
  }
  db.prepare("UPDATE inbox_items SET status='archived',archived_at=coalesce(archived_at,life_now()),processed_at=coalesce(processed_at,life_now()),updated_at=next_timestamp(updated_at,life_now()) WHERE user_id=? AND id=?").run(owner, row.id);
  return { kind: data.route === "resource" || data.route === "note" ? "resource" : data.route as "project" | "goal" | "archive", id };
}

// Caller owns one BEGIN IMMEDIATE; never nest two independent commands here.
export function completeInboxTriage(db: Database.Database, owner: string, input: unknown) {
  const parsed = inboxCompletionSchema.safeParse(input);
  if (!parsed.success) throw new Error("INBOX_VALIDATION_FAILED");
  const saved = saveInboxClarification(db, owner, parsed.data);
  return routeSavedInboxItem(db, owner, { ...parsed.data, expectedUpdatedAt: saved.updated_at });
}
