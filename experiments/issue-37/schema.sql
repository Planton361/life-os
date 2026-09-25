PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA user_version = 37;

CREATE TABLE owners (
  id TEXT PRIMARY KEY
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES owners(id),
  title TEXT NOT NULL,
  description TEXT,
  why TEXT,
  horizon TEXT DEFAULT 'someday',
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  achieved_at TEXT,
  achievement_note TEXT,
  area_id TEXT,
  measure TEXT,
  target_value TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(user_id, id)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES owners(id),
  goal_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  next_step TEXT,
  priority TEXT NOT NULL DEFAULT 'none',
  progress INTEGER NOT NULL DEFAULT 0,
  repository_url TEXT,
  start_date TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  target_date TEXT,
  area_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(user_id, id),
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id)
);

CREATE TABLE project_milestones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  target_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(user_id, project_id, id),
  FOREIGN KEY(user_id, project_id) REFERENCES projects(user_id, id)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES owners(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  priority TEXT NOT NULL DEFAULT 'none',
  energy TEXT,
  duration_minutes INTEGER,
  planned_date TEXT,
  scheduled_start_at TEXT,
  due_at TEXT,
  completed_at TEXT,
  area_id TEXT,
  project_id TEXT,
  milestone_id TEXT,
  goal_id TEXT,
  source_inbox_item_id TEXT,
  generated_from_template_id TEXT,
  instance_date TEXT,
  carried_from_daily_log_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE(user_id, project_id, id),
  UNIQUE(user_id, id),
  FOREIGN KEY(user_id, project_id) REFERENCES projects(user_id, id),
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id),
  FOREIGN KEY(user_id, project_id, milestone_id) REFERENCES project_milestones(user_id, project_id, id),
  CHECK (milestone_id IS NULL OR project_id IS NOT NULL),
  CHECK ((status = 'done') = (completed_at IS NOT NULL))
);

CREATE TABLE task_dependencies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  predecessor_task_id TEXT NOT NULL,
  successor_task_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK(predecessor_task_id <> successor_task_id),
  UNIQUE(user_id, predecessor_task_id, successor_task_id),
  FOREIGN KEY(user_id, project_id, predecessor_task_id) REFERENCES tasks(user_id, project_id, id),
  FOREIGN KEY(user_id, project_id, successor_task_id) REFERENCES tasks(user_id, project_id, id)
);

CREATE TABLE source_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES owners(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(user_id, id)
);

CREATE TABLE schedule_source_links (
  task_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  FOREIGN KEY(user_id, task_id) REFERENCES tasks(user_id, id),
  FOREIGN KEY(user_id, source_id) REFERENCES source_records(user_id, id)
);

CREATE TABLE goal_milestones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id)
);

CREATE TABLE goal_outcome_criteria (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  criterion_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id)
);

CREATE TABLE goal_criterion_evaluations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL REFERENCES goal_outcome_criteria(id),
  goal_id TEXT NOT NULL,
  boolean_value INTEGER,
  evaluated_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  revision_kind TEXT NOT NULL,
  supersedes_evaluation_id TEXT REFERENCES goal_criterion_evaluations(id),
  correction_reason TEXT,
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id)
);

CREATE TABLE goal_achievement_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('achieved','amended','reopened')),
  corrects_event_id TEXT REFERENCES goal_achievement_events(id),
  correction_reason TEXT,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  command_id TEXT NOT NULL,
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id)
);

CREATE TABLE goal_milestone_achievement_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  goal_milestone_id TEXT NOT NULL REFERENCES goal_milestones(id),
  episode_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('achieved','amended','reopened')),
  corrects_event_id TEXT REFERENCES goal_milestone_achievement_events(id),
  correction_reason TEXT,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  command_id TEXT NOT NULL,
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id)
);

CREATE TABLE goal_event_evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  achievement_event_id TEXT NOT NULL REFERENCES goal_achievement_events(id),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_title_snapshot TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id)
);

CREATE TABLE goal_command_receipts (
  command_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES owners(id),
  request_fingerprint TEXT NOT NULL,
  result_event_id TEXT NOT NULL
);

CREATE TRIGGER task_goal_alignment_insert BEFORE INSERT ON tasks
WHEN NEW.project_id IS NOT NULL AND NEW.goal_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'TASK_GOAL_CONFLICT') WHERE EXISTS (
    SELECT 1 FROM projects p WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
      AND p.goal_id IS NOT NULL AND p.goal_id <> NEW.goal_id
  );
END;

CREATE TRIGGER task_goal_alignment_update BEFORE UPDATE OF project_id, goal_id ON tasks
WHEN NEW.project_id IS NOT NULL AND NEW.goal_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'TASK_GOAL_CONFLICT') WHERE EXISTS (
    SELECT 1 FROM projects p WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
      AND p.goal_id IS NOT NULL AND p.goal_id <> NEW.goal_id
  );
END;

CREATE TRIGGER dependency_guard BEFORE INSERT ON task_dependencies
BEGIN
  SELECT RAISE(ABORT, 'DEPENDENCY_TARGET') WHERE NOT EXISTS (
    SELECT 1 FROM projects p JOIN tasks a ON a.project_id = p.id AND a.user_id = p.user_id
      JOIN tasks b ON b.project_id = p.id AND b.user_id = p.user_id
    WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id AND p.archived_at IS NULL
      AND a.id = NEW.predecessor_task_id AND b.id = NEW.successor_task_id
      AND a.archived_at IS NULL AND b.archived_at IS NULL
  );
  SELECT RAISE(ABORT, 'DEPENDENCY_CYCLE') WHERE EXISTS (
    WITH RECURSIVE reachable(id) AS (
      SELECT NEW.successor_task_id UNION
      SELECT d.successor_task_id FROM task_dependencies d
        JOIN reachable r ON d.predecessor_task_id = r.id
      WHERE d.user_id = NEW.user_id AND d.project_id = NEW.project_id
    ) SELECT 1 FROM reachable WHERE id = NEW.predecessor_task_id
  );
  SELECT RAISE(ABORT, 'DEPENDENCY_COMPLETED_SUCCESSOR') WHERE EXISTS (
    SELECT 1 FROM tasks a JOIN tasks b ON b.id = NEW.successor_task_id
    WHERE a.id = NEW.predecessor_task_id AND b.status = 'done'
      AND (a.status <> 'done' OR a.completed_at IS NULL)
  );
END;

CREATE TRIGGER task_complete_guard BEFORE UPDATE OF status, completed_at ON tasks
BEGIN
  SELECT RAISE(ABORT, 'DEPENDENCY_BLOCKED') WHERE NEW.status = 'done' AND EXISTS (
    SELECT 1 FROM task_dependencies d JOIN tasks a ON a.id = d.predecessor_task_id
    WHERE d.user_id = NEW.user_id AND d.successor_task_id = NEW.id
      AND (a.status <> 'done' OR a.completed_at IS NULL OR a.archived_at IS NOT NULL)
  );
  SELECT RAISE(ABORT, 'DEPENDENCY_COMPLETED_SUCCESSOR') WHERE NEW.status <> 'done' AND EXISTS (
    SELECT 1 FROM task_dependencies d JOIN tasks b ON b.id = d.successor_task_id
    WHERE d.user_id = NEW.user_id AND d.predecessor_task_id = NEW.id AND b.status = 'done'
  );
END;

CREATE TRIGGER task_dependency_move_guard BEFORE UPDATE OF project_id, user_id, id ON tasks
BEGIN
  SELECT RAISE(ABORT, 'DEPENDENCY_PROJECT_MOVE') WHERE EXISTS (
    SELECT 1 FROM task_dependencies d WHERE d.user_id = OLD.user_id
      AND (d.predecessor_task_id = OLD.id OR d.successor_task_id = OLD.id)
  );
END;

CREATE TRIGGER goal_event_append_only_update BEFORE UPDATE ON goal_achievement_events
BEGIN SELECT RAISE(ABORT, 'GOAL_EVENT_APPEND_ONLY'); END;
CREATE TRIGGER goal_event_append_only_delete BEFORE DELETE ON goal_achievement_events
BEGIN SELECT RAISE(ABORT, 'GOAL_EVENT_APPEND_ONLY'); END;
CREATE TRIGGER goal_evaluation_append_only_update BEFORE UPDATE ON goal_criterion_evaluations
BEGIN SELECT RAISE(ABORT, 'GOAL_EVALUATION_APPEND_ONLY'); END;
CREATE TRIGGER goal_evaluation_append_only_delete BEFORE DELETE ON goal_criterion_evaluations
BEGIN SELECT RAISE(ABORT, 'GOAL_EVALUATION_APPEND_ONLY'); END;
CREATE TRIGGER goal_milestone_event_append_only_update BEFORE UPDATE ON goal_milestone_achievement_events
BEGIN SELECT RAISE(ABORT, 'GOAL_EVENT_APPEND_ONLY'); END;
CREATE TRIGGER goal_milestone_event_append_only_delete BEFORE DELETE ON goal_milestone_achievement_events
BEGIN SELECT RAISE(ABORT, 'GOAL_EVENT_APPEND_ONLY'); END;
CREATE TRIGGER goal_evidence_append_only_update BEFORE UPDATE ON goal_event_evidence
BEGIN SELECT RAISE(ABORT, 'GOAL_EVIDENCE_APPEND_ONLY'); END;
CREATE TRIGGER goal_evidence_append_only_delete BEFORE DELETE ON goal_event_evidence
BEGIN SELECT RAISE(ABORT, 'GOAL_EVIDENCE_APPEND_ONLY'); END;

CREATE INDEX tasks_today ON tasks(user_id, planned_date, status);
CREATE INDEX tasks_project ON tasks(user_id, project_id);
CREATE INDEX dependencies_successor ON task_dependencies(user_id, successor_task_id);
