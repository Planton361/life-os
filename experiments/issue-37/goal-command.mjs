import { randomUUID } from "node:crypto";
import { owner as fixtureOwner } from "./fixture.mjs";

// A synthetic transactional PP1-equivalent command slice. It deliberately
// exercises the difficult ledger invariants, not the full Goal product API.
export function executeGoalCommand(db, ownerId, kind, commandId, fingerprint, payload) {
  if (ownerId !== fixtureOwner) throw new Error("GOAL_AUTH_REQUIRED");
  if (!commandId || !fingerprint) throw new Error("GOAL_COMMAND_ID_REQUIRED");
  db.exec("BEGIN IMMEDIATE");
  try {
    const receipt = db.prepare("SELECT request_fingerprint,result_event_id FROM goal_command_receipts WHERE user_id=? AND command_id=?")
      .get(ownerId, commandId);
    if (receipt) {
      if (receipt.request_fingerprint !== fingerprint) throw new Error("GOAL_COMMAND_FINGERPRINT_MISMATCH");
      db.exec("COMMIT");
      return receipt.result_event_id;
    }
    const goal = db.prepare("SELECT * FROM goals WHERE user_id=? AND id=? AND archived_at IS NULL")
      .get(ownerId, payload.goalId);
    if (!goal) throw new Error("GOAL_NOT_FOUND");
    const now = new Date().toISOString();
    const eventId = randomUUID();
    if (kind.startsWith("milestone.")) {
      const milestone = db.prepare("SELECT * FROM goal_milestones WHERE user_id=? AND goal_id=? AND id=? AND archived_at IS NULL")
        .get(ownerId, goal.id, payload.milestoneId);
      if (!milestone) throw new Error("GOAL_MILESTONE_NOT_FOUND");
      if (kind === "milestone.achieve") {
        if (milestone.status !== "active") throw new Error("GOAL_MILESTONE_ACHIEVE_REQUIRES_ACTIVE");
        const episodeId = randomUUID();
        db.prepare(`INSERT INTO goal_milestone_achievement_events
          (id,user_id,goal_id,goal_milestone_id,episode_id,event_type,occurred_at,recorded_at,command_id)
          VALUES(?,?,?,?,?,'achieved',?,?,?)`).run(eventId, ownerId, goal.id, milestone.id, episodeId, now, now, commandId);
        db.prepare("UPDATE goal_milestones SET status='achieved',updated_at=? WHERE user_id=? AND id=?")
          .run(now, ownerId, milestone.id);
      } else if (kind === "milestone.amend") {
        if (!payload.reason) throw new Error("GOAL_EVENT_CORRECTION_REASON_REQUIRED");
        const original = db.prepare("SELECT * FROM goal_milestone_achievement_events WHERE user_id=? AND goal_id=? AND goal_milestone_id=? AND id=?")
          .get(ownerId, goal.id, milestone.id, payload.eventId);
        if (!original) throw new Error("GOAL_MILESTONE_EVENT_NOT_FOUND");
        db.prepare(`INSERT INTO goal_milestone_achievement_events
          (id,user_id,goal_id,goal_milestone_id,episode_id,event_type,corrects_event_id,correction_reason,occurred_at,recorded_at,command_id)
          VALUES(?,?,?,?,?,'amended',?,?,?,?,?)`).run(eventId, ownerId, goal.id, milestone.id, original.episode_id, original.id, payload.reason, now, now, commandId);
      } else if (kind === "milestone.reopen") {
        if (milestone.status !== "achieved") throw new Error("GOAL_MILESTONE_REOPEN_REQUIRES_ACHIEVED");
        const original = db.prepare(`SELECT e.episode_id FROM goal_milestone_achievement_events e
          WHERE e.user_id=? AND e.goal_milestone_id=? AND e.event_type='achieved'
            AND NOT EXISTS(SELECT 1 FROM goal_milestone_achievement_events r WHERE r.user_id=e.user_id AND r.episode_id=e.episode_id AND r.event_type='reopened')
          ORDER BY e.recorded_at DESC LIMIT 1`).get(ownerId, milestone.id);
        if (!original) throw new Error("GOAL_MILESTONE_OPEN_EPISODE_NOT_FOUND");
        db.prepare(`INSERT INTO goal_milestone_achievement_events
          (id,user_id,goal_id,goal_milestone_id,episode_id,event_type,occurred_at,recorded_at,command_id)
          VALUES(?,?,?,?,?,'reopened',?,?,?)`).run(eventId, ownerId, goal.id, milestone.id, original.episode_id, now, now, commandId);
        db.prepare("UPDATE goal_milestones SET status='active',updated_at=? WHERE user_id=? AND id=?")
          .run(now, ownerId, milestone.id);
      } else throw new Error("GOAL_COMMAND_INVALID");
    } else if (kind === "goal.achieve") {
      if (goal.status !== "active") throw new Error("GOAL_ACHIEVEMENT_REQUIRES_ACTIVE");
      const criteria = db.prepare("SELECT * FROM goal_outcome_criteria WHERE user_id=? AND goal_id=? AND archived_at IS NULL")
        .all(ownerId, goal.id);
      if (!criteria.length) throw new Error("GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA");
      if (db.prepare("SELECT 1 FROM goal_milestones WHERE user_id=? AND goal_id=? AND archived_at IS NULL AND status<>'achieved' LIMIT 1")
        .get(ownerId, goal.id)) throw new Error("GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED");
      for (const criterion of criteria) {
        const evaluation = db.prepare(`SELECT * FROM goal_criterion_evaluations
          WHERE user_id=? AND goal_id=? AND criterion_id=? ORDER BY evaluated_at DESC,recorded_at DESC,id DESC LIMIT 1`)
          .get(ownerId, goal.id, criterion.id);
        if (!evaluation || evaluation.boolean_value !== 1 || evaluation.revision_kind === "retraction")
          throw new Error("GOAL_ACHIEVEMENT_CRITERIA_NOT_MET");
      }
      const episodeId = randomUUID();
      db.prepare(`INSERT INTO goal_achievement_events
        (id,user_id,goal_id,episode_id,event_type,occurred_at,recorded_at,command_id)
        VALUES(?,?,?,?,'achieved',?,?,?)`).run(eventId, ownerId, goal.id, episodeId, now, now, commandId);
      if (payload.sourceId) {
        const source = db.prepare("SELECT title FROM source_records WHERE user_id=? AND id=?")
          .get(ownerId, payload.sourceId);
        if (!source) throw new Error("GOAL_EVIDENCE_SOURCE_INVALID");
        db.prepare(`INSERT INTO goal_event_evidence
          (id,user_id,goal_id,achievement_event_id,source_type,source_id,source_title_snapshot,recorded_at)
          VALUES(?,?,?,?,?,?,?,?)`).run(randomUUID(), ownerId, goal.id, eventId, "meal", payload.sourceId, source.title, now);
      }
      db.prepare("UPDATE goals SET status='achieved',achieved_at=?,updated_at=? WHERE user_id=? AND id=?")
        .run(now, now, ownerId, goal.id);
    } else if (kind === "goal.amend") {
      if (!payload.reason) throw new Error("GOAL_EVENT_CORRECTION_REASON_REQUIRED");
      const original = db.prepare("SELECT * FROM goal_achievement_events WHERE user_id=? AND goal_id=? AND id=?")
        .get(ownerId, goal.id, payload.eventId);
      if (!original) throw new Error("GOAL_EVENT_NOT_FOUND");
      db.prepare(`INSERT INTO goal_achievement_events
        (id,user_id,goal_id,episode_id,event_type,corrects_event_id,correction_reason,occurred_at,recorded_at,command_id)
        VALUES(?,?,?,?,'amended',?,?,?,?,?)`).run(eventId, ownerId, goal.id, original.episode_id, original.id, payload.reason, now, now, commandId);
    } else if (kind === "goal.reopen") {
      if (goal.status !== "achieved") throw new Error("GOAL_REOPEN_REQUIRES_ACHIEVED");
      const original = db.prepare(`SELECT e.episode_id FROM goal_achievement_events e
        WHERE e.user_id=? AND e.goal_id=? AND e.event_type='achieved'
          AND NOT EXISTS(SELECT 1 FROM goal_achievement_events r WHERE r.user_id=e.user_id AND r.episode_id=e.episode_id AND r.event_type='reopened')
        ORDER BY e.recorded_at DESC LIMIT 1`).get(ownerId, goal.id);
      if (!original) throw new Error("GOAL_OPEN_EPISODE_NOT_FOUND");
      db.prepare(`INSERT INTO goal_achievement_events
        (id,user_id,goal_id,episode_id,event_type,occurred_at,recorded_at,command_id)
        VALUES(?,?,?,?,'reopened',?,?,?)`).run(eventId, ownerId, goal.id, original.episode_id, now, now, commandId);
      db.prepare("UPDATE goals SET status='active',achieved_at=NULL,updated_at=? WHERE user_id=? AND id=?")
        .run(now, ownerId, goal.id);
    } else throw new Error("GOAL_COMMAND_INVALID");
    db.prepare("INSERT INTO goal_command_receipts(command_id,user_id,request_fingerprint,result_event_id) VALUES(?,?,?,?)")
      .run(commandId, ownerId, fingerprint, eventId);
    db.exec("COMMIT");
    return eventId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
