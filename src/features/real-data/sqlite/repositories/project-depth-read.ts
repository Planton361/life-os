import type Database from "better-sqlite3";
import {
  pgJson,
  projectHash,
  projectPgTimestamp,
  type Canonical,
} from "../project-canonical";
export type ProjectRow = Record<string, string | bigint | null>;
export const projectRows = (
  db: Database.Database,
  sql: string,
  ...args: unknown[]
) => db.prepare(sql).all(...args) as ProjectRow[];
export const projectOne = (
  db: Database.Database,
  sql: string,
  ...args: unknown[]
) => db.prepare(sql).get(...args) as ProjectRow | undefined;
export function requireProject(
  db: Database.Database,
  owner: string,
  projectId: string,
) {
  const p = projectOne(
    db,
    "SELECT p.*,g.title AS goal_title FROM projects p LEFT JOIN goals g ON g.id=p.goal_id AND g.user_id=p.user_id WHERE p.user_id=? AND p.id=?",
    owner,
    projectId,
  );
  if (!p) throw new Error("PROJECT_NOT_FOUND");
  return p;
}
export function projectReviewContext(
  db: Database.Database,
  owner: string,
  projectId: string,
  capture?: { project: ProjectRow; reviewFloor: bigint },
) {
  const p = capture?.project ?? requireProject(db, owner, projectId);
  const criteria = projectRows(
    db,
    "SELECT * FROM project_completion_criteria WHERE user_id=? AND project_id=? AND (archived_at IS NULL OR archived_cycle=?) ORDER BY sort_order,id LIMIT 1001",
    owner,
    projectId,
    p.completion_cycle,
  ).map((c) => ({
    id: String(c.id),
    text: String(c.text),
    sort_order: String(c.sort_order),
    archived_at: c.archived_at as string | null,
    archive_reason: c.archive_reason as string | null,
    archived_cycle: c.archived_cycle === null ? null : String(c.archived_cycle),
    archived_revision:
      c.archived_revision === null ? null : String(c.archived_revision),
  }));
  const work = projectRows(
    db,
    "SELECT 'task' AS type,id,title,status,archived_at FROM tasks WHERE user_id=? AND project_id=? AND archived_at IS NULL AND status<>'archived' UNION ALL SELECT 'milestone',id,title,status,archived_at FROM project_milestones WHERE user_id=? AND project_id=? AND archived_at IS NULL ORDER BY type,id LIMIT 5001",
    owner,
    projectId,
    owner,
    projectId,
  ).map((w) => ({
    type: w.type as "task" | "milestone",
    id: String(w.id),
    title: String(w.title),
    status: String(w.status),
    archived_at: w.archived_at as string | null,
  }));
  const resources = projectRows(
    db,
    "SELECT r.id,rr.id AS relation_id,r.title,r.type,r.url,r.archived_at,rr.target_type,rr.target_id,rr.project_role AS role,rr.relation_type FROM resource_relations rr JOIN resources r ON r.user_id=rr.user_id AND r.id=rr.resource_id WHERE rr.user_id=? AND rr.target_type='project' AND rr.target_id=? AND r.archived_at IS NULL ORDER BY r.id,rr.id LIMIT 1001",
    owner,
    projectId,
  ).map((r) => ({
    id: String(r.id),
    relation_id: String(r.relation_id),
    title: String(r.title),
    type: String(r.type),
    url: r.url as string | null,
    archived_at: r.archived_at as string | null,
    target_type: String(r.target_type),
    target_id: String(r.target_id),
    role: String(r.role),
    relation_type: String(r.relation_type),
    token: projectHash(r),
  }));
  const current = projectOne(
    db,
    "SELECT id FROM project_reviews WHERE user_id=? AND project_id=? AND completion_cycle=? AND decision='completed' AND rowid<=?",
    owner,
    projectId,
    p.completion_cycle,
    capture?.reviewFloor ?? BigInt("9223372036854775807"),
  );
  const count = (type: string, statuses: string[]) =>
    work.filter((w) => w.type === type && statuses.includes(w.status)).length;
  const core = {
    project_id: projectId,
    project_title: p.title,
    description: p.description,
    priority: p.priority,
    area_id: p.area_id,
    goal_id: p.goal_id,
    goal_title: p.goal_title,
    status: String(p.status),
    archived_at: p.archived_at as string | null,
    desired_result: p.desired_result as string | null,
    completion_revision: String(p.completion_revision),
    completion_cycle: String(p.completion_cycle),
    current_completion_review_id: (current?.id as string | null) ?? null,
    criteria,
    work,
    open_task_count: count("task", [
      "inbox",
      "planned",
      "active",
      "waiting",
      "someday",
    ]),
    done_task_count: count("task", ["done"]),
    canceled_task_count: count("task", ["canceled"]),
    open_milestone_count: count("milestone", ["open", "active"]),
    done_milestone_count: count("milestone", ["done"]),
  };
  const fingerprintCore = {
    ...core,
    archived_at: projectPgTimestamp(core.archived_at),
    criteria: criteria.map((c) => ({
      ...c,
      archived_at: projectPgTimestamp(c.archived_at),
    })),
    work: work.map((w) => ({
      ...w,
      archived_at: projectPgTimestamp(w.archived_at),
    })),
  };
  const ctx = {
    ...core,
    fingerprint: projectHash(fingerprintCore),
    resources,
    work_observed_at: String(projectOne(db, "SELECT life_now() AS t")!.t),
  };
  if (
    criteria.length > 1000 ||
    work.length > 5000 ||
    resources.length > 1000 ||
    Buffer.byteLength(pgJson(ctx)) > 2097152
  )
    throw new Error("PROJECT_CONTEXT_LIMIT");
  return ctx;
}
const bools = new Set([
  "result_accepted",
  "open_work_acknowledged",
  "archived_criteria_acknowledged",
  "was_archived",
  "mistaken_completion",
]);
const integers = new Set([
  "snapshot_version",
  "open_task_count",
  "done_task_count",
  "canceled_task_count",
  "open_milestone_count",
  "done_milestone_count",
]);
export function projectWire(row: ProjectRow): Record<string, Canonical> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      typeof v === "bigint"
        ? bools.has(k)
          ? v === BigInt(1)
          : integers.has(k)
            ? Number(v)
            : v.toString()
        : v,
    ]),
  );
}
export function projectDepthHistory(
  db: Database.Database,
  owner: string,
  projectId: string,
  beforeRevision?: string,
) {
  requireProject(db, owner, projectId);
  const all = projectRows(
    db,
    "SELECT id,'review' AS kind,revision_after AS revision FROM project_reviews WHERE user_id=? AND project_id=? UNION ALL SELECT id,'lifecycle',revision_after FROM project_lifecycle_events WHERE user_id=? AND project_id=? UNION ALL SELECT id,'amendment',revision_after FROM project_review_amendments WHERE user_id=? AND project_id=? ORDER BY revision DESC,id",
    owner,
    projectId,
    owner,
    projectId,
    owner,
    projectId,
  );
  const eligible = all.filter(
    (x) =>
      beforeRevision === undefined ||
      (x.revision as bigint) < BigInt(beforeRevision),
  );
  const first = eligible.slice(0, 50),
    floor = first.at(-1)?.revision as bigint | undefined;
  const page =
    floor === undefined
      ? []
      : eligible.filter((x) => (x.revision as bigint) >= floor);
  const ids = new Set(page.map((x) => `${x.kind}:${x.id}`)),
    reviews = projectRows(
      db,
      "SELECT * FROM project_reviews WHERE user_id=? AND project_id=? ORDER BY revision_after DESC,id",
      owner,
      projectId,
    ).filter((x) => ids.has(`review:${x.id}`));
  const reviewIds = new Set(reviews.map((x) => x.id));
  const child = (table: string) =>
    projectRows(
      db,
      `SELECT * FROM ${table} WHERE user_id=? AND project_id=?`,
      owner,
      projectId,
    )
      .filter((x) => reviewIds.has(x.review_id))
      .map(projectWire);
  return {
    items: page.map((x) => ({
      id: String(x.id),
      kind: x.kind as "review" | "lifecycle" | "amendment",
      revision: String(x.revision),
    })),
    reviews: reviews.map(projectWire),
    criteria: child("project_review_criteria"),
    resources: child("project_review_resources"),
    lifecycle: projectRows(
      db,
      "SELECT * FROM project_lifecycle_events WHERE user_id=? AND project_id=? ORDER BY revision_after DESC,id",
      owner,
      projectId,
    )
      .filter((x) => ids.has(`lifecycle:${x.id}`))
      .map(projectWire),
    amendments: projectRows(
      db,
      "SELECT * FROM project_review_amendments WHERE user_id=? AND project_id=? ORDER BY revision_after,id",
      owner,
      projectId,
    )
      .filter((x) => ids.has(`amendment:${x.id}`) || reviewIds.has(x.review_id))
      .map(projectWire),
    next_revision:
      floor !== undefined && all.some((x) => (x.revision as bigint) < floor)
        ? String(floor)
        : null,
  };
}
