import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { TaskRow } from "../../supabase/row-types";
import type { SourceTaskCommands } from "../repositories/task-repository";
import { localDate, timestamp, uuid } from "../codecs";

export type SourceType = "meal" | "review" | "running_plan_item" | "strength_plan";
function task(db: Database.Database, owner: string, id: string): TaskRow {
  const row = db.prepare("SELECT * FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL AND status<>'archived'").get(owner, uuid(id)) as TaskRow | undefined;
  if (!row) throw new Error("TASK_NOT_FOUND");
  return row;
}

export function completeLinkedTask(db: Database.Database, owner: string, id: string, completedAt: string): TaskRow {
  task(db, owner, id);
  completedAt = timestamp(completedAt);
  const source = db.prepare("SELECT source_type,source_id FROM schedule_source_links WHERE user_id=? AND task_id=?").get(owner, id) as { source_type: SourceType; source_id: string } | undefined;
  const now = timestamp(new Date().toISOString());
  let sourceCompletedAt: string | null = null;
  if (source?.source_type === "meal") {
    const updated = db.prepare("UPDATE meals SET completed_at=coalesce(completed_at,?),updated_at=CASE WHEN completed_at IS NULL THEN ? ELSE updated_at END WHERE user_id=? AND id=?").run(completedAt, now, owner, source.source_id);
    if (!updated.changes) throw new Error("SOURCE_MEAL_NOT_FOUND");
  } else if (source?.source_type === "review") {
    const review = db.prepare("SELECT status FROM review_records WHERE user_id=? AND id=? AND archived_at IS NULL").get(owner, source.source_id) as { status: string } | undefined;
    if (!review) throw new Error("SOURCE_REVIEW_NOT_FOUND");
    if (review.status !== "completed") throw new Error("SOURCE_REVIEW_FLOW_REQUIRED");
  } else if (source?.source_type === "running_plan_item") {
    const session = db.prepare("SELECT completed_at FROM running_sessions WHERE user_id=? AND plan_item_id=? AND status='completed' AND completed_at IS NOT NULL AND archived_at IS NULL ORDER BY completed_at ASC,id ASC LIMIT 1").get(owner, source.source_id) as { completed_at: string } | undefined;
    if (!session) throw new Error("SOURCE_RUNNING_FLOW_REQUIRED");
    sourceCompletedAt = session.completed_at;
  } else if (source?.source_type === "strength_plan") {
    const session = db.prepare("SELECT s.completed_at FROM strength_sessions s WHERE s.user_id=? AND s.plan_id=? AND s.status='completed' AND s.completed_at IS NOT NULL AND s.archived_at IS NULL AND EXISTS(SELECT 1 FROM strength_set_logs l WHERE l.user_id=s.user_id AND l.session_id=s.id) ORDER BY s.completed_at ASC,s.id ASC LIMIT 1").get(owner, source.source_id) as { completed_at: string } | undefined;
    if (!session) throw new Error("SOURCE_STRENGTH_FLOW_REQUIRED");
    sourceCompletedAt = session.completed_at;
  }
  db.prepare("UPDATE tasks SET status='done',completed_at=coalesce(completed_at,?,?),updated_at=CASE WHEN status<>'done' THEN ? ELSE updated_at END WHERE user_id=? AND id=?").run(sourceCompletedAt, completedAt, now, owner, id);
  return task(db, owner, id);
}

export function scheduleLinkedSource(db: Database.Database, owner: string, sourceType: SourceType, sourceId: string, date: string, start: string, duration: number): TaskRow {
  sourceId = uuid(sourceId); date = localDate(date); start = timestamp(start);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new Error("SOURCE_DURATION_INVALID");
  let title: string | undefined, completedAt: string | null = null;
  if (sourceType === "meal") {
    const meal = db.prepare("SELECT title,completed_at FROM meals WHERE user_id=? AND id=?").get(owner, sourceId) as { title: string; completed_at: string | null } | undefined;
    title = meal?.title; completedAt = meal?.completed_at ?? null;
  } else if (sourceType === "review") {
    const review = db.prepare("SELECT kind,completed_at FROM review_records WHERE user_id=? AND id=? AND archived_at IS NULL AND status<>'archived'").get(owner, sourceId) as { kind: string; completed_at: string | null } | undefined;
    if (review) { title = review.kind === "daily" ? "Daily Review" : "Weekly Review"; completedAt = review.completed_at; }
  } else if (sourceType === "running_plan_item") {
    const item = db.prepare("SELECT i.title FROM running_plan_items i JOIN running_plans p ON p.user_id=i.user_id AND p.id=i.plan_id WHERE i.user_id=? AND i.id=? AND i.archived_at IS NULL AND p.archived_at IS NULL").get(owner, sourceId) as { title: string } | undefined;
    if (item) title = `Run: ${item.title}`;
  } else if (sourceType === "strength_plan") {
    const plan = db.prepare("SELECT name FROM strength_plans WHERE user_id=? AND id=? AND archived_at IS NULL").get(owner, sourceId) as { name: string } | undefined;
    if (plan) title = `Strength: ${plan.name}`;
  }
  if (!title) throw new Error("SOURCE_NOT_FOUND");
  const link = db.prepare("SELECT task_id FROM schedule_source_links WHERE user_id=? AND source_type=? AND source_id=?").get(owner, sourceType, sourceId) as { task_id: string } | undefined;
  const id = link?.task_id ?? randomUUID(), now = timestamp(new Date().toISOString());
  if (link) {
    task(db, owner, id);
    db.prepare("UPDATE tasks SET title=?,status=?,completed_at=?,planned_date=?,scheduled_start_at=?,duration_minutes=?,updated_at=? WHERE user_id=? AND id=?").run(title, completedAt ? "done" : "planned", completedAt, date, start, duration, now, owner, id);
  } else {
    db.prepare("INSERT INTO tasks(id,user_id,title,status,priority,planned_date,scheduled_start_at,duration_minutes,completed_at,created_at,updated_at) VALUES(?,?,?,?,'none',?,?,?,?,?,?)").run(id, owner, title, completedAt ? "done" : "planned", date, start, duration, completedAt, now, now);
    db.prepare("INSERT INTO schedule_source_links(id,user_id,source_type,source_id,task_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(randomUUID(), owner, sourceType, sourceId, id, now, now);
  }
  if (sourceType === "meal") db.prepare("UPDATE meals SET date=?,planned_at=?,updated_at=? WHERE user_id=? AND id=?").run(date, start, now, owner, sourceId);
  return task(db, owner, id);
}

export function unscheduleLinkedMeal(db: Database.Database, owner: string, id: string, date?: string, duration?: number): TaskRow {
  const current = task(db, owner, id);
  const link = db.prepare("SELECT source_id FROM schedule_source_links WHERE user_id=? AND task_id=? AND source_type='meal'").get(owner, id) as { source_id: string } | undefined;
  if (!link) throw new Error("SOURCE_MEAL_NOT_FOUND");
  if (duration !== undefined && (!Number.isInteger(duration) || duration < 1 || duration > 1440)) throw new Error("SOURCE_DURATION_INVALID");
  const planned = date === undefined ? current.planned_date : localDate(date);
  const now = timestamp(new Date().toISOString());
  if (!db.prepare("UPDATE meals SET date=?,planned_at=NULL,updated_at=? WHERE user_id=? AND id=?").run(planned, now, owner, link.source_id).changes) throw new Error("SOURCE_MEAL_NOT_FOUND");
  db.prepare("UPDATE tasks SET planned_date=?,scheduled_start_at=NULL,duration_minutes=coalesce(?,duration_minutes),updated_at=? WHERE user_id=? AND id=?").run(planned, duration ?? null, now, owner, id);
  return task(db, owner, id);
}

export const sourceTaskCommands: SourceTaskCommands = {
  complete: completeLinkedTask,
  scheduleMeal(db, owner, link, date, start, duration) {
    return start === undefined
      ? unscheduleLinkedMeal(db, owner, link.task_id, date, duration)
      : scheduleLinkedSource(db, owner, "meal", link.source_id, date ?? task(db, owner, link.task_id).planned_date!, start, duration ?? 30);
  },
};
