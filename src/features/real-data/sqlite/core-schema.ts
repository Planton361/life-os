// Core foundation; compatibility groups extend this schema before application
// activation. This is not the complete canonical catalog acceptance marker.
export const coreSchema = `
CREATE TABLE runtime_metadata (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  schema_version INTEGER NOT NULL,
  dataset_kind TEXT NOT NULL CHECK(dataset_kind IN ('synthetic','canonical')),
  owner_id TEXT NOT NULL,
  compatibility_ready INTEGER NOT NULL DEFAULT 0 CHECK(compatibility_ready IN (0,1)),
  writer_pid INTEGER, writer_host TEXT, writer_token TEXT
) STRICT;
CREATE TABLE profiles (
  id TEXT PRIMARY KEY, display_name TEXT, timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  habit_morning_starts_at TEXT NOT NULL DEFAULT '05:00:00',
  habit_midday_starts_at TEXT NOT NULL DEFAULT '11:00:00',
  habit_evening_starts_at TEXT NOT NULL DEFAULT '17:00:00',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  CHECK(length(trim(timezone))>0),
  CHECK(habit_morning_starts_at<habit_midday_starts_at AND habit_midday_starts_at<habit_evening_starts_at)
) STRICT;
CREATE TRIGGER profiles_owner_insert BEFORE INSERT ON profiles WHEN life_owner() IS NULL OR NEW.id IS NOT life_owner() BEGIN SELECT RAISE(ABORT,'OWNER_DENIED'); END;
CREATE TRIGGER profiles_owner_update BEFORE UPDATE ON profiles WHEN life_owner() IS NULL OR OLD.id IS NOT life_owner() OR NEW.id IS NOT OLD.id BEGIN SELECT RAISE(ABORT,'OWNER_DENIED'); END;
CREATE TRIGGER profiles_owner_delete BEFORE DELETE ON profiles WHEN life_owner() IS NULL OR OLD.id IS NOT life_owner() BEGIN SELECT RAISE(ABORT,'OWNER_DENIED'); END;
CREATE TABLE areas (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id),
  key TEXT NOT NULL CHECK(key IN ('dashboard','inbox','today','calendar','portfolio','resources','health','nutrition','coding','life','education','work','shop','challenges','settings','review','system','personal')),
  name TEXT NOT NULL CHECK(length(trim(name))>0), color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  UNIQUE(user_id,id)
) STRICT;
CREATE UNIQUE INDEX areas_active_key ON areas(user_id,key) WHERE archived_at IS NULL;
CREATE TABLE goals (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), area_id TEXT,
  title TEXT NOT NULL CHECK(length(trim(title))>0), description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','achieved','archived')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100), horizon TEXT, why TEXT,
  measure TEXT, target_value TEXT, target_date TEXT, achieved_at TEXT, achievement_note TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  UNIQUE(user_id,id), FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id)
) STRICT;
CREATE TABLE projects (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), area_id TEXT, goal_id TEXT,
  title TEXT NOT NULL CHECK(length(trim(title))>0), description TEXT,
  status TEXT NOT NULL DEFAULT 'idea' CHECK(status IN ('idea','active','paused','blocked','completed','archived')),
  priority TEXT NOT NULL DEFAULT 'P2' CHECK(priority IN ('P0','P1','P2','P3','none')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100), next_step TEXT,
  start_date TEXT, target_date TEXT, desired_result TEXT,
  completion_revision INTEGER NOT NULL DEFAULT 0 CHECK(completion_revision>=0),
  completion_cycle INTEGER NOT NULL DEFAULT 0 CHECK(completion_cycle>=0),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  UNIQUE(user_id,id), FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id),
  FOREIGN KEY(user_id,goal_id) REFERENCES goals(user_id,id)
) STRICT;
CREATE TABLE daily_logs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), local_date TEXT NOT NULL,
  timezone TEXT NOT NULL CHECK(length(trim(timezone))>0),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','archived')),
  opening_note TEXT, closing_note TEXT, carry_forward_note TEXT,
  energy TEXT CHECK(energy IN ('low','medium','high')), mood TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, UNIQUE(user_id,id)
) STRICT;
CREATE UNIQUE INDEX daily_logs_active_day ON daily_logs(user_id,local_date) WHERE archived_at IS NULL;
CREATE TABLE inbox_items (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), area_id TEXT,
  type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('task','note','question','idea','resource','agent','decision')),
  status TEXT NOT NULL DEFAULT 'raw' CHECK(status IN ('raw','clarified','triaged','processed','archived')),
  priority TEXT NOT NULL DEFAULT 'P2' CHECK(priority IN ('P0','P1','P2','P3','none')),
  title TEXT NOT NULL CHECK(length(trim(title))>0), body TEXT, source TEXT,
  original_title TEXT, original_body TEXT, next_action TEXT, missing_info TEXT,
  energy TEXT CHECK(energy IN ('low','medium','high')),
  duration_minutes INTEGER CHECK(duration_minutes BETWEEN 1 AND 2147483647),
  review_needed INTEGER NOT NULL DEFAULT 0 CHECK(review_needed IN (0,1)),
  today_candidate INTEGER NOT NULL DEFAULT 0 CHECK(today_candidate IN (0,1)),
  deadline_hint TEXT CHECK(deadline_hint IS NULL OR codec_date_valid(deadline_hint)),
  captured_at TEXT NOT NULL, processed_at TEXT, created_task_id TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  UNIQUE(user_id,id), FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id),
  FOREIGN KEY(user_id,created_task_id) REFERENCES tasks(user_id,id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TRIGGER inbox_original_capture_insert BEFORE INSERT ON inbox_items
 WHEN NEW.original_title IS NOT NULL OR NEW.original_body IS NOT NULL BEGIN SELECT RAISE(ABORT,'INBOX_ORIGINAL_SERVER_OWNED'); END;
CREATE TRIGGER inbox_original_capture AFTER INSERT ON inbox_items BEGIN
 UPDATE inbox_items SET original_title=NEW.title,original_body=NEW.body WHERE user_id=NEW.user_id AND id=NEW.id;
END;
CREATE TRIGGER inbox_original_immutable BEFORE UPDATE ON inbox_items
 WHEN OLD.original_title IS NOT NULL AND (NEW.original_title IS NOT OLD.original_title OR NEW.original_body IS NOT OLD.original_body)
 BEGIN SELECT RAISE(ABORT,'INBOX_ORIGINAL_IMMUTABLE'); END;
CREATE TABLE recurring_task_templates (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), area_id TEXT, project_id TEXT, goal_id TEXT,
  title TEXT NOT NULL CHECK(length(trim(title))>0), description TEXT, next_action TEXT,
  priority TEXT CHECK(priority IN ('P0','P1','P2','P3','none')), energy TEXT CHECK(energy IN ('low','medium','high')),
  duration_minutes INTEGER CHECK(duration_minutes BETWEEN 5 AND 1440),
  recurrence_rule TEXT NOT NULL CHECK(json_valid(recurrence_rule) AND json_type(recurrence_rule)='object'),
  starts_on TEXT NOT NULL, ends_on TEXT CHECK(ends_on IS NULL OR ends_on>=starts_on),
  timezone TEXT NOT NULL DEFAULT 'UTC' CHECK(length(trim(timezone))>0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,id),
  FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id),
  FOREIGN KEY(user_id,project_id) REFERENCES projects(user_id,id),
  FOREIGN KEY(user_id,goal_id) REFERENCES goals(user_id,id)
) STRICT;
CREATE TABLE project_milestones (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), project_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 500), description TEXT CHECK(length(description)<=10000),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','active','done')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order>=0), target_date TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  UNIQUE(user_id,project_id,id), FOREIGN KEY(user_id,project_id) REFERENCES projects(user_id,id)
) STRICT;
CREATE UNIQUE INDEX project_milestones_order ON project_milestones(project_id,sort_order);
CREATE UNIQUE INDEX project_milestones_one_active ON project_milestones(project_id) WHERE status='active' AND archived_at IS NULL;
CREATE TABLE tasks (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL CHECK(length(trim(title))>0), description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('inbox','planned','active','waiting','done','canceled','someday','archived')),
  priority TEXT NOT NULL DEFAULT 'P2' CHECK(priority IN ('P0','P1','P2','P3','none')),
  energy TEXT CHECK(energy IN ('low','medium','high')), area_id TEXT, project_id TEXT, milestone_id TEXT, goal_id TEXT,
  source_inbox_item_id TEXT, planned_date TEXT, scheduled_start_at TEXT,
  duration_minutes INTEGER CHECK(duration_minutes IS NULL OR duration_minutes>0), due_at TEXT,
  completed_at TEXT, carried_from_daily_log_id TEXT, generated_from_template_id TEXT, instance_date TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT,
  UNIQUE(user_id,id), UNIQUE(user_id,project_id,id),
  CHECK((generated_from_template_id IS NULL)=(instance_date IS NULL)),
  CHECK(milestone_id IS NULL OR project_id IS NOT NULL),
  FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id),
  FOREIGN KEY(user_id,project_id) REFERENCES projects(user_id,id),
  FOREIGN KEY(user_id,project_id,milestone_id) REFERENCES project_milestones(user_id,project_id,id),
  FOREIGN KEY(user_id,goal_id) REFERENCES goals(user_id,id),
  FOREIGN KEY(user_id,source_inbox_item_id) REFERENCES inbox_items(user_id,id),
  FOREIGN KEY(user_id,carried_from_daily_log_id) REFERENCES daily_logs(user_id,id),
  FOREIGN KEY(user_id,generated_from_template_id) REFERENCES recurring_task_templates(user_id,id)
) STRICT;
CREATE UNIQUE INDEX tasks_generated_instance ON tasks(user_id,generated_from_template_id,instance_date)
 WHERE generated_from_template_id IS NOT NULL AND instance_date IS NOT NULL;
CREATE INDEX tasks_owner_plan ON tasks(user_id,planned_date);
CREATE INDEX tasks_owner_project ON tasks(user_id,project_id);
CREATE TABLE daily_log_tasks (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), daily_log_id TEXT NOT NULL, task_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'planned' CHECK(relation_type IN ('planned','completed','carried_forward','skipped','note')),
  note TEXT, created_at TEXT NOT NULL, UNIQUE(daily_log_id,task_id,relation_type),
  FOREIGN KEY(user_id,daily_log_id) REFERENCES daily_logs(user_id,id),
  FOREIGN KEY(user_id,task_id) REFERENCES tasks(user_id,id)
) STRICT;
CREATE TABLE resources (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), area_id TEXT,
  type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('note','learning','prompt','research','link','source','snippet','decision')),
  title TEXT NOT NULL CHECK(length(trim(title))>0), summary TEXT, url TEXT, source TEXT,
  review_needed INTEGER NOT NULL DEFAULT 0 CHECK(review_needed IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, UNIQUE(user_id,id),
  FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id)
) STRICT;
CREATE TABLE resource_relations (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), resource_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('inbox_item','task','project','goal','daily_log','resource','area','skill')),
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related' CHECK(relation_type IN ('source','context','supports','evidence','decision','related')),
  project_role TEXT NOT NULL DEFAULT 'reference' CHECK(project_role IN ('reference','additional_artifact','primary_artifact')),
  created_at TEXT NOT NULL, UNIQUE(resource_id,target_type,target_id,relation_type),
  CHECK(target_type='project' OR project_role='reference'),
  FOREIGN KEY(user_id,resource_id) REFERENCES resources(user_id,id)
) STRICT;
CREATE UNIQUE INDEX resource_project_primary ON resource_relations(user_id,target_id)
 WHERE target_type='project' AND project_role='primary_artifact';
CREATE UNIQUE INDEX resource_project_artifact ON resource_relations(user_id,target_id,resource_id)
 WHERE target_type='project' AND project_role<>'reference';
CREATE TABLE task_dependencies (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), project_id TEXT NOT NULL,
  predecessor_task_id TEXT NOT NULL, successor_task_id TEXT NOT NULL, created_at TEXT NOT NULL,
  CHECK(predecessor_task_id<>successor_task_id), UNIQUE(predecessor_task_id,successor_task_id),
  FOREIGN KEY(user_id,project_id,predecessor_task_id) REFERENCES tasks(user_id,project_id,id),
  FOREIGN KEY(user_id,project_id,successor_task_id) REFERENCES tasks(user_id,project_id,id)
) STRICT;
CREATE INDEX dependency_successors ON task_dependencies(user_id,successor_task_id);
CREATE TABLE schedule_source_links (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id),
 source_type TEXT NOT NULL CHECK(source_type IN ('meal','review','running_plan_item','strength_plan')),
 source_id TEXT NOT NULL, task_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(user_id,source_type,source_id), UNIQUE(user_id,task_id),
 FOREIGN KEY(user_id,task_id) REFERENCES tasks(user_id,id)
) STRICT;
CREATE TRIGGER schedule_link_insert_command BEFORE INSERT ON schedule_source_links
 WHEN life_command() IS NULL OR life_command() NOT IN ('source.schedule','synthetic.initialize')
 BEGIN SELECT RAISE(ABORT,'SOURCE_COMMAND_REQUIRED'); END;
CREATE TRIGGER schedule_link_update_command BEFORE UPDATE ON schedule_source_links
 BEGIN SELECT RAISE(ABORT,'SOURCE_LINK_IMMUTABLE'); END;
CREATE TRIGGER schedule_link_delete_command BEFORE DELETE ON schedule_source_links
 WHEN life_command() IS NULL OR life_command() NOT IN ('source.archive','source.remove')
 BEGIN SELECT RAISE(ABORT,'SOURCE_COMMAND_REQUIRED'); END;
CREATE TRIGGER source_task_sensitive_update BEFORE UPDATE ON tasks
 WHEN EXISTS(SELECT 1 FROM schedule_source_links WHERE user_id=OLD.user_id AND task_id=OLD.id)
 AND (NEW.status IS NOT OLD.status OR NEW.completed_at IS NOT OLD.completed_at OR NEW.archived_at IS NOT OLD.archived_at OR (EXISTS(SELECT 1 FROM schedule_source_links WHERE user_id=OLD.user_id AND task_id=OLD.id AND source_type='meal') AND (NEW.planned_date IS NOT OLD.planned_date OR NEW.scheduled_start_at IS NOT OLD.scheduled_start_at OR NEW.duration_minutes IS NOT OLD.duration_minutes)))
 AND (life_command() IS NULL OR life_command() NOT IN ('source.schedule','source.unschedule','source.complete','review.save'))
 BEGIN SELECT RAISE(ABORT,'SOURCE_COMMAND_REQUIRED'); END;
CREATE TRIGGER dependency_guard BEFORE INSERT ON task_dependencies BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND user_id=NEW.user_id AND archived_at IS NULL AND status<>'archived') THEN RAISE(ABORT,'DEPENDENCY_PROJECT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.predecessor_task_id AND user_id=NEW.user_id AND archived_at IS NULL AND status<>'archived') OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.successor_task_id AND user_id=NEW.user_id AND archived_at IS NULL AND status<>'archived') THEN RAISE(ABORT,'DEPENDENCY_ARCHIVED') END;
 SELECT CASE WHEN EXISTS(WITH RECURSIVE reachable(id) AS (
   SELECT NEW.successor_task_id UNION SELECT d.successor_task_id FROM task_dependencies d JOIN reachable r ON d.predecessor_task_id=r.id WHERE d.user_id=NEW.user_id AND d.project_id=NEW.project_id
 ) SELECT 1 FROM reachable WHERE id=NEW.predecessor_task_id) THEN RAISE(ABORT,'DEPENDENCY_CYCLE') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM tasks s JOIN tasks p ON p.id=NEW.predecessor_task_id AND p.user_id=NEW.user_id WHERE s.id=NEW.successor_task_id AND s.user_id=NEW.user_id AND (s.status='done' OR s.completed_at IS NOT NULL) AND (p.status<>'done' OR p.completed_at IS NULL)) THEN RAISE(ABORT,'DEPENDENCY_COMPLETED_SUCCESSOR') END;
END;
CREATE TRIGGER dependency_immutable BEFORE UPDATE ON task_dependencies BEGIN SELECT RAISE(ABORT,'DEPENDENCY_IMMUTABLE'); END;
CREATE TRIGGER dependency_task_move BEFORE UPDATE OF user_id,id,project_id ON tasks
 WHEN (NEW.user_id IS NOT OLD.user_id OR NEW.id IS NOT OLD.id OR NEW.project_id IS NOT OLD.project_id) AND EXISTS(SELECT 1 FROM task_dependencies WHERE user_id=OLD.user_id AND (predecessor_task_id=OLD.id OR successor_task_id=OLD.id))
 BEGIN SELECT RAISE(ABORT,'DEPENDENCY_PROJECT_MOVE'); END;
CREATE TRIGGER dependency_completion BEFORE UPDATE OF status,completed_at ON tasks
 WHEN ((NEW.status='done' AND OLD.status IS NOT NEW.status) OR (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NOT NEW.completed_at))
 BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM task_dependencies d JOIN tasks p ON p.id=d.predecessor_task_id AND p.user_id=d.user_id WHERE d.user_id=NEW.user_id AND d.successor_task_id=NEW.id AND (p.status<>'done' OR p.completed_at IS NULL OR p.archived_at IS NOT NULL)) THEN RAISE(ABORT,'DEPENDENCY_BLOCKED') END;
END;
`;

export const coreOwnedTables = [
  "areas", "goals", "projects", "daily_logs", "inbox_items", "recurring_task_templates",
  "project_milestones", "tasks", "daily_log_tasks", "resources", "resource_relations", "task_dependencies",
  "schedule_source_links",
] as const;

export function ownerGuards(tables: readonly string[]): string {
  return tables.map((table) => {
    if (!/^[a-z_]+$/.test(table)) throw new Error("INVALID_SCHEMA_IDENTIFIER");
    return `
CREATE TRIGGER ${table}_owner_insert BEFORE INSERT ON ${table} WHEN life_owner() IS NULL OR NEW.user_id IS NOT life_owner() BEGIN SELECT RAISE(ABORT,'OWNER_DENIED'); END;
CREATE TRIGGER ${table}_owner_update BEFORE UPDATE ON ${table} WHEN life_owner() IS NULL OR OLD.user_id IS NOT life_owner() OR NEW.user_id IS NOT OLD.user_id BEGIN SELECT RAISE(ABORT,'OWNER_DENIED'); END;
CREATE TRIGGER ${table}_owner_delete BEFORE DELETE ON ${table} WHEN life_owner() IS NULL OR OLD.user_id IS NOT life_owner() BEGIN SELECT RAISE(ABORT,'OWNER_DENIED'); END;
`;
  }).join("\n");
}
