import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setup, openDb, owner, id } from "./fixture.mjs";
import { executeGoalCommand } from "./goal-command.mjs";

const path = process.argv[2];
if (!path) throw new Error("usage: node invariants.mjs /private/tmp/life-os-37-proof/NEW.db");
setup(path);
const db = openDb(path);
const now = () => new Date().toISOString();
const matrix = {};
function rejected(work, pattern) {
  assert.throws(work, pattern);
}
function insertTask(taskId, projectId, status = "planned") {
  const timestamp = now();
  db.prepare(`INSERT INTO tasks(id,user_id,project_id,goal_id,title,status,priority,completed_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
    taskId, owner, projectId, id(1,1), `Race ${taskId}`, status, "P2",
    status === "done" ? timestamp : null, timestamp, timestamp,
  );
}
function edge(projectId, first, second) {
  db.prepare(`INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at)
    VALUES(?,?,?,?,?,?)`).run(randomUUID(), owner, projectId, first, second, now());
}
function child(operation, projectId, first, second, holdMs) {
  const processHandle = spawn(process.execPath, [
    new URL("./concurrent-writer.mjs", import.meta.url).pathname,
    path, operation, projectId, first, second, String(holdMs),
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  processHandle.stdout.on("data", (chunk) => { stdout += chunk; });
  processHandle.stderr.on("data", (chunk) => { stderr += chunk; });
  const exit = new Promise((resolve) => processHandle.on("exit", (code) => resolve({ code, stdout, stderr })));
  const locked = new Promise((resolve) => {
    processHandle.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("LOCKED")) resolve(true);
    });
    processHandle.on("exit", () => resolve(false));
  });
  return { exit, locked };
}
async function race(firstOperation, firstTask, secondTask, secondOperation, secondFirst, secondSecond, pattern) {
  const first = child(firstOperation, id(2,1), firstTask, secondTask, 450);
  assert.equal(await first.locked, true, "First writer exited before lock");
  const second = child(secondOperation, id(2,1), secondFirst, secondSecond, 0);
  const [winner, loser] = await Promise.all([first.exit, second.exit]);
  assert.equal(winner.code, 0, winner.stderr);
  assert.equal(loser.code, 1, loser.stdout);
  assert.match(loser.stderr, pattern);
  return { winner: winner.stdout.trim(), loser: loser.stderr.trim() };
}
try {
  rejected(() => edge(id(2,1), id(3,5), id(3,1)), /DEPENDENCY_CYCLE/);
  matrix.cycle = "PASS";
  rejected(() => db.prepare("UPDATE tasks SET status='done',completed_at=? WHERE id=?").run(now(), id(3,5)), /DEPENDENCY_BLOCKED/);
  matrix.blockedCompletion = "PASS";

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE source_records SET completed_at=? WHERE user_id=? AND id=?").run(now(), owner, id(5,1));
    db.prepare("UPDATE tasks SET status='done',completed_at=? WHERE user_id=? AND id=?").run(now(), owner, id(3,5));
    db.exec("COMMIT");
    throw new Error("Blocked source completion unexpectedly committed");
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK");
    assert.match(String(error), /DEPENDENCY_BLOCKED/);
  }
  assert.equal(db.prepare("SELECT completed_at FROM source_records WHERE id=?").get(id(5,1)).completed_at, null);
  assert.equal(db.prepare("SELECT status FROM tasks WHERE id=?").get(id(3,5)).status, "planned");
  matrix.blockedSourceRollback = "PASS";

  db.prepare("UPDATE tasks SET status='done',completed_at=? WHERE id=?").run(now(), id(3,1));
  db.exec("BEGIN IMMEDIATE");
  db.prepare("UPDATE source_records SET completed_at=? WHERE id=?").run(now(), id(5,1));
  db.prepare("UPDATE tasks SET status='done',completed_at=? WHERE id=?").run(now(), id(3,5));
  db.exec("COMMIT");
  assert.equal(db.prepare("SELECT status FROM tasks WHERE id=?").get(id(3,5)).status, "done");
  matrix.completionAfterPredecessor = "PASS";

  const a = randomUUID(), b = randomUUID();
  insertTask(a, id(2,1)); insertTask(b, id(2,1));
  matrix.concurrentCycle = await race("edge", a, b, "edge", b, a, /DEPENDENCY_CYCLE/);
  assert.equal(db.prepare("SELECT count(*) AS n FROM task_dependencies WHERE predecessor_task_id IN (?,?)").get(a,b).n, 1);

  const c = randomUUID(), d = randomUUID();
  insertTask(c, id(2,1), "done"); insertTask(d, id(2,1)); edge(id(2,1), c, d);
  matrix.concurrentReopenCompletion = await race("reopen", c, d, "complete", d, c, /DEPENDENCY_BLOCKED/);
  assert.equal(db.prepare("SELECT status FROM tasks WHERE id=?").get(c).status, "planned");
  assert.equal(db.prepare("SELECT status FROM tasks WHERE id=?").get(d).status, "planned");

  rejected(() => edge(id(2,1), id(3,2), a), /FOREIGN KEY|DEPENDENCY_TARGET/);
  rejected(() => db.prepare(`INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at)
    VALUES(?,?,?,?,?,?)`).run(randomUUID(), randomUUID(), id(2,1), a, b, now()), /FOREIGN KEY|DEPENDENCY_TARGET/);
  matrix.ownerProjectConsistency = "PASS";

  const goalId = id(1,1), milestoneId = randomUUID(), criterionId = randomUUID();
  db.prepare(`INSERT INTO goal_milestones(id,user_id,goal_id,title,status,sort_order,created_at,updated_at)
    VALUES(?,?,?,?,?,0,?,?)`).run(milestoneId, owner, goalId, "Synthetic milestone", "active", now(), now());
  db.prepare(`INSERT INTO goal_outcome_criteria(id,user_id,goal_id,title,criterion_type,created_at)
    VALUES(?,?,?,?,?,?)`).run(criterionId, owner, goalId, "Synthetic criterion", "boolean", now());
  const eval1 = randomUUID(), eval2 = randomUUID(), eval3 = randomUUID();
  const evaluationAt = (offset) => new Date(Date.now() + offset * 1000).toISOString();
  const evaluation = db.prepare(`INSERT INTO goal_criterion_evaluations
    (id,user_id,criterion_id,goal_id,boolean_value,evaluated_at,recorded_at,revision_kind,supersedes_evaluation_id,correction_reason)
    VALUES(?,?,?,?,?,?,?,?,?,?)`);
  evaluation.run(eval1, owner, criterionId, goalId, 1, evaluationAt(0), evaluationAt(0), "evaluation", null, null);
  evaluation.run(eval2, owner, criterionId, goalId, 0, evaluationAt(1), evaluationAt(1), "correction", eval1, "Correct false reading");
  rejected(() => executeGoalCommand(db, owner, "goal.achieve", randomUUID(), "premature", {goalId}), /GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED/);
  const milestoneAchieve = executeGoalCommand(db, owner, "milestone.achieve", randomUUID(), "milestone", {goalId,milestoneId});
  const milestoneAmend = executeGoalCommand(db, owner, "milestone.amend", randomUUID(), "milestone-amend", {goalId,milestoneId,eventId:milestoneAchieve,reason:"Correct event note"});
  rejected(() => executeGoalCommand(db, owner, "goal.achieve", randomUUID(), "criterion-false", {goalId}), /GOAL_ACHIEVEMENT_CRITERIA_NOT_MET/);
  evaluation.run(eval3, owner, criterionId, goalId, 1, evaluationAt(2), evaluationAt(2), "correction", eval2, "Correct true reading");
  const commandId = randomUUID();
  const achieved = executeGoalCommand(db, owner, "goal.achieve", commandId, "achieve-fingerprint", {goalId,sourceId:id(5,1)});
  const amended = executeGoalCommand(db, owner, "goal.amend", randomUUID(), "amend", {goalId,eventId:achieved,reason:"Correct outcome note"});
  const reopened = executeGoalCommand(db, owner, "goal.reopen", randomUUID(), "reopen", {goalId});
  assert.equal(db.prepare("SELECT status FROM goals WHERE id=?").get(goalId).status, "active");
  assert.equal(db.prepare("SELECT count(*) AS n FROM goal_achievement_events WHERE goal_id=?").get(goalId).n, 3);
  assert.equal(db.prepare("SELECT count(*) AS n FROM goal_milestone_achievement_events WHERE goal_milestone_id=?").get(milestoneId).n, 2);
  assert.equal(db.prepare("SELECT count(*) AS n FROM goal_criterion_evaluations WHERE criterion_id=?").get(criterionId).n, 3);
  assert.equal(db.prepare("SELECT source_title_snapshot FROM goal_event_evidence WHERE achievement_event_id=?").get(achieved).source_title_snapshot, "Synthetic Meal");
  rejected(() => db.prepare("UPDATE goal_achievement_events SET event_type='reopened' WHERE id=?").run(achieved), /GOAL_EVENT_APPEND_ONLY/);
  rejected(() => db.prepare("DELETE FROM goal_criterion_evaluations WHERE id=?").run(eval1), /GOAL_EVALUATION_APPEND_ONLY/);
  matrix.goalLedger = {status:"PASS",milestoneAchieve,milestoneAmend,achieved,amended,reopened,evidence:1};
  const retry = executeGoalCommand(db, owner, "goal.achieve", commandId, "achieve-fingerprint", {goalId,sourceId:id(5,1)});
  assert.equal(retry, achieved);
  rejected(() => executeGoalCommand(db, owner, "goal.achieve", commandId, "changed", {goalId}), /GOAL_COMMAND_FINGERPRINT_MISMATCH/);
  assert.equal(db.prepare("SELECT count(*) AS n FROM goal_achievement_events WHERE goal_id=?").get(goalId).n, 3);
  matrix.idempotentRetry = "PASS";

  const concurrentCommandId = randomUUID();
  const concurrentGoal = randomUUID();
  db.prepare(`INSERT INTO goals(id,user_id,title,status,created_at,updated_at)
    VALUES(?,?,?,'active',?,?)`).run(concurrentGoal, owner, "Concurrent Goal", now(), now());
  const concurrentCriterion = randomUUID();
  db.prepare(`INSERT INTO goal_outcome_criteria(id,user_id,goal_id,title,criterion_type,created_at)
    VALUES(?,?,?,?,?,?)`).run(concurrentCriterion, owner, concurrentGoal, "Concurrent criterion", "boolean", now());
  evaluation.run(randomUUID(), owner, concurrentCriterion, concurrentGoal, 1, now(), now(), "evaluation", null, null);
  const launchGoal = () => new Promise((resolve, reject) => {
    const worker = spawn(process.execPath, [
      new URL("./goal-writer.mjs", import.meta.url).pathname,
      path, concurrentGoal, concurrentCommandId, "same-request",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    worker.stdout.on("data", (chunk) => { out += chunk; });
    worker.stderr.on("data", (chunk) => { err += chunk; });
    worker.on("exit", (code) => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
  });
  const concurrentResults = await Promise.all([launchGoal(), launchGoal()]);
  assert.equal(concurrentResults[0], concurrentResults[1]);
  assert.equal(db.prepare("SELECT count(*) AS n FROM goal_achievement_events WHERE goal_id=?").get(concurrentGoal).n, 1);
  matrix.concurrentIdempotentGoal = "PASS";

  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  console.log(JSON.stringify({status:"PASS",matrix,counts:{tasks:db.prepare("SELECT count(*) AS n FROM tasks").get().n,edges:db.prepare("SELECT count(*) AS n FROM task_dependencies").get().n}}));
} finally {
  db.close();
}
