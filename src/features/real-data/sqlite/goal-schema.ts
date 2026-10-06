// Current PP1 schema translated from the six canonical Goal migrations.
// Fresh synthetic initialization only; compatibility_ready remains zero.
export const goalOwnedTables = [
  "goal_milestones",
  "goal_outcome_criteria",
  "goal_criterion_evaluations",
  "goal_milestone_project_support",
  "goal_milestone_task_support",
  "goal_command_receipts",
  "goal_milestone_achievement_events",
  "goal_achievement_events",
  "goal_achievement_criterion_basis",
  "goal_achievement_milestone_basis",
  "goal_criterion_evaluation_evidence",
  "goal_milestone_achievement_evidence",
  "goal_achievement_evidence",
] as const;

export const goalSchema = `
CREATE TABLE goal_milestones (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  goal_id TEXT not null,
  title text not null,
  description text,
  target_date TEXT,
  status text not null default 'planned',
  sort_order integer not null default 0 CHECK(sort_order BETWEEN -2147483648 AND 2147483647),
  created_at TEXT not null default (life_now()),
  updated_at TEXT not null default (life_now()),
  archived_at TEXT,
  check (length(trim(title)) > 0),
  check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  ),
  foreign key (user_id, goal_id)
    references goals(user_id, id)
    on delete cascade,
  UNIQUE(user_id,goal_id,id),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(updated_at IS NULL OR codec_timestamp_valid(updated_at)=1),
  CHECK(archived_at IS NULL OR codec_timestamp_valid(archived_at)=1),
  CHECK(status IN ('planned','active','achieved','archived')),
  CHECK(target_date IS NULL OR codec_date_valid(target_date)=1),
  CHECK(goal_id IS NULL OR codec_uuid_valid(goal_id)=1)
) STRICT;
CREATE TABLE goal_outcome_criteria (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  goal_id TEXT not null,
  goal_milestone_id TEXT,
  title text not null,
  criterion_type text not null,
  unit text,
  target TEXT,
  direction text,
  created_at TEXT not null default (life_now()),
  updated_at TEXT not null default (life_now()),
  archived_at TEXT,
  check (length(trim(title)) > 0),
  check (
    (
      criterion_type = 'boolean'
      and unit is null
      and target is null
      and direction is null
    )
    or (
      criterion_type = 'numeric'
      and unit is not null
      and length(trim(unit)) > 0
      and target is not null
      and target <> 'NaN'
      and target <> 'Infinity'
      and target <> '-Infinity'
      and direction is not null
    )
  ),
  foreign key (user_id, goal_id)
    references goals(user_id, id)
    on delete cascade,
  foreign key (user_id, goal_id, goal_milestone_id)
    references goal_milestones(user_id, goal_id, id)
    on delete restrict,
  UNIQUE(user_id,id),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(target IS NULL OR decimal_finite(target)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(updated_at IS NULL OR codec_timestamp_valid(updated_at)=1),
  CHECK(archived_at IS NULL OR codec_timestamp_valid(archived_at)=1),
  CHECK(criterion_type IN ('boolean','numeric')),
  CHECK(direction IS NULL OR direction IN ('at_least','at_most','exact')),
  CHECK(goal_id IS NULL OR codec_uuid_valid(goal_id)=1),
  CHECK(goal_milestone_id IS NULL OR codec_uuid_valid(goal_milestone_id)=1)
) STRICT;
CREATE TABLE goal_criterion_evaluations (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  criterion_id TEXT not null,
  is_deferred INTEGER not null default false,
  boolean_value INTEGER,
  numeric_value TEXT,
  unit text,
  evaluated_at TEXT not null default (life_now()),
  note text,
  created_at TEXT not null default (life_now()),
  recorded_at TEXT NOT NULL DEFAULT (life_now()), goal_id_snapshot TEXT,
  goal_milestone_id_snapshot TEXT, criterion_title_snapshot TEXT,
  criterion_type_snapshot TEXT, unit_snapshot TEXT, target_snapshot TEXT,
  direction_snapshot TEXT, revision_kind TEXT NOT NULL DEFAULT 'evaluation',
  supersedes_evaluation_id TEXT, correction_reason TEXT,
  is_retracted INTEGER NOT NULL DEFAULT 0, legacy_state TEXT,
  retrospective INTEGER NOT NULL DEFAULT 0,
  check (
    numeric_value is null
    or (
      numeric_value <> 'NaN'
      and numeric_value <> 'Infinity'
      and numeric_value <> '-Infinity'
    )
  ),
  foreign key (user_id, criterion_id)
    references goal_outcome_criteria(user_id, id)
    on delete cascade,
  UNIQUE(user_id,id),
  FOREIGN KEY(user_id,supersedes_evaluation_id) REFERENCES goal_criterion_evaluations(user_id,id),
  CHECK(target_snapshot IS NULL OR decimal_finite(target_snapshot)=1),
  CHECK(legacy_state IS NULL OR json_valid(legacy_state)),
  CHECK(revision_kind IN ('evaluation','correction','retraction')),
  CHECK((is_retracted=1 AND is_deferred=0 AND boolean_value IS NULL AND numeric_value IS NULL AND unit IS NULL)
    OR (is_retracted=0 AND ((is_deferred=1 AND boolean_value IS NULL AND numeric_value IS NULL AND unit IS NULL)
      OR (is_deferred=0 AND ((boolean_value IS NOT NULL AND numeric_value IS NULL AND unit IS NULL)
        OR (boolean_value IS NULL AND numeric_value IS NOT NULL AND unit IS NOT NULL)))))),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(is_deferred IS NULL OR is_deferred IN (0,1)),
  CHECK(boolean_value IS NULL OR boolean_value IN (0,1)),
  CHECK(numeric_value IS NULL OR decimal_finite(numeric_value)=1),
  CHECK(evaluated_at IS NULL OR codec_timestamp_valid(evaluated_at)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(recorded_at IS NULL OR codec_timestamp_valid(recorded_at)=1),
  CHECK(criterion_type_snapshot IS NULL OR criterion_type_snapshot IN ('boolean','numeric')),
  CHECK(direction_snapshot IS NULL OR direction_snapshot IN ('at_least','at_most','exact')),
  CHECK(is_retracted IS NULL OR is_retracted IN (0,1)),
  CHECK(retrospective IS NULL OR retrospective IN (0,1)),
  CHECK(criterion_id IS NULL OR codec_uuid_valid(criterion_id)=1),
  CHECK(supersedes_evaluation_id IS NULL OR codec_uuid_valid(supersedes_evaluation_id)=1),
  CHECK(criterion_type_snapshot IS NULL OR criterion_type_snapshot IN ('boolean','numeric')),
  CHECK(direction_snapshot IS NULL OR direction_snapshot IN ('at_least','at_most','exact'))
) STRICT;
CREATE TABLE goal_milestone_project_support (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  goal_id TEXT not null,
  goal_milestone_id TEXT not null,
  project_id TEXT not null,
  created_at TEXT not null default (life_now()),
  unique (user_id, project_id),
  foreign key (user_id, goal_id, goal_milestone_id)
    references goal_milestones(user_id, goal_id, id)
    on delete cascade,
  foreign key (user_id, project_id, goal_id)
    references projects(user_id, id, goal_id)
    on delete cascade,
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(goal_id IS NULL OR codec_uuid_valid(goal_id)=1),
  CHECK(goal_milestone_id IS NULL OR codec_uuid_valid(goal_milestone_id)=1),
  CHECK(project_id IS NULL OR codec_uuid_valid(project_id)=1)
) STRICT;
CREATE TABLE goal_milestone_task_support (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  goal_id TEXT not null,
  goal_milestone_id TEXT not null,
  task_id TEXT not null,
  created_at TEXT not null default (life_now()),
  unique (user_id, task_id),
  foreign key (user_id, goal_id, goal_milestone_id)
    references goal_milestones(user_id, goal_id, id)
    on delete cascade,
  foreign key (user_id, task_id)
    references tasks(user_id, id)
    on delete cascade,
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(goal_id IS NULL OR codec_uuid_valid(goal_id)=1),
  CHECK(goal_milestone_id IS NULL OR codec_uuid_valid(goal_milestone_id)=1),
  CHECK(task_id IS NULL OR codec_uuid_valid(task_id)=1)
) STRICT;
CREATE TABLE goal_command_receipts (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  command_id TEXT not null,
  command_kind text not null check (length(trim(command_kind)) > 0),
  request_fingerprint text not null check (length(trim(request_fingerprint)) > 0),
  result_payload TEXT not null,
  created_at TEXT not null default (life_now()),
  unique (user_id, command_id),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(result_payload IS NULL OR json_valid(result_payload)),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(command_id IS NULL OR codec_uuid_valid(command_id)=1)
) STRICT;
CREATE TABLE goal_milestone_achievement_events (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  goal_id TEXT not null,
  goal_milestone_id TEXT not null,
  episode_id TEXT not null,
  event_type text not null check (event_type in ('achieved', 'reopened', 'amended')),
  occurred_at TEXT,
  recorded_at TEXT not null default (life_now()),
  goal_title_snapshot text,
  goal_milestone_title_snapshot text,
  goal_milestone_description_snapshot text,
  prior_status text,
  resulting_status text,
  note text,
  legacy_state TEXT,
  corrects_event_id TEXT,
  correction_reason text,
  retrospective INTEGER not null default false,
  command_id TEXT,
  created_at TEXT not null default (life_now()),
  unique (user_id, id),
  foreign key (user_id, goal_id)
    references goals(user_id, id) on delete cascade,
  foreign key (user_id, goal_id, goal_milestone_id)
    references goal_milestones(user_id, goal_id, id) on delete cascade,
  foreign key (user_id, corrects_event_id)
    references goal_milestone_achievement_events(user_id, id) on delete restrict,
  check (
    (event_type = 'amended' and corrects_event_id is not null and length(trim(coalesce(correction_reason, ''))) > 0)
    or (event_type <> 'amended' and corrects_event_id is null and correction_reason is null)
  ),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(occurred_at IS NULL OR codec_timestamp_valid(occurred_at)=1),
  CHECK(recorded_at IS NULL OR codec_timestamp_valid(recorded_at)=1),
  CHECK(legacy_state IS NULL OR json_valid(legacy_state)),
  CHECK(retrospective IS NULL OR retrospective IN (0,1)),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(command_id IS NULL OR codec_uuid_valid(command_id)=1),
  CHECK(corrects_event_id IS NULL OR codec_uuid_valid(corrects_event_id)=1),
  CHECK(episode_id IS NULL OR codec_uuid_valid(episode_id)=1),
  CHECK(goal_id IS NULL OR codec_uuid_valid(goal_id)=1),
  CHECK(goal_milestone_id IS NULL OR codec_uuid_valid(goal_milestone_id)=1),
  CHECK(prior_status IS NULL OR prior_status IN ('planned','active','achieved','archived')),
  CHECK(resulting_status IS NULL OR resulting_status IN ('planned','active','achieved','archived'))
) STRICT;
CREATE TABLE goal_achievement_events (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  goal_id TEXT not null,
  episode_id TEXT not null,
  event_type text not null check (event_type in ('achieved', 'reopened', 'amended')),
  occurred_at TEXT,
  recorded_at TEXT not null default (life_now()),
  goal_title_snapshot text,
  prior_status text,
  resulting_status text,
  achievement_note text,
  legacy_state TEXT,
  corrects_event_id TEXT,
  correction_reason text,
  retrospective INTEGER not null default false,
  command_id TEXT,
  created_at TEXT not null default (life_now()),
  unique (user_id, id),
  foreign key (user_id, goal_id)
    references goals(user_id, id) on delete cascade,
  foreign key (user_id, corrects_event_id)
    references goal_achievement_events(user_id, id) on delete restrict,
  check (
    (event_type = 'amended' and corrects_event_id is not null and length(trim(coalesce(correction_reason, ''))) > 0)
    or (event_type <> 'amended' and corrects_event_id is null and correction_reason is null)
  ),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(occurred_at IS NULL OR codec_timestamp_valid(occurred_at)=1),
  CHECK(recorded_at IS NULL OR codec_timestamp_valid(recorded_at)=1),
  CHECK(legacy_state IS NULL OR json_valid(legacy_state)),
  CHECK(retrospective IS NULL OR retrospective IN (0,1)),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(command_id IS NULL OR codec_uuid_valid(command_id)=1),
  CHECK(corrects_event_id IS NULL OR codec_uuid_valid(corrects_event_id)=1),
  CHECK(episode_id IS NULL OR codec_uuid_valid(episode_id)=1),
  CHECK(goal_id IS NULL OR codec_uuid_valid(goal_id)=1),
  CHECK(prior_status IS NULL OR prior_status IN ('draft','active','paused','achieved','archived')),
  CHECK(resulting_status IS NULL OR resulting_status IN ('draft','active','paused','achieved','archived'))
) STRICT;
CREATE TABLE goal_achievement_criterion_basis (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  achievement_event_id TEXT not null,
  criterion_id TEXT not null,
  evaluation_id TEXT,
  criterion_title_snapshot text,
  criterion_type_snapshot text,
  goal_milestone_id_snapshot TEXT,
  unit_snapshot text,
  target_snapshot TEXT,
  direction_snapshot text,
  evaluation_state_snapshot text,
  evaluation_occurred_at TEXT,
  legacy_state TEXT,
  created_at TEXT not null default (life_now()),
  unique (achievement_event_id, criterion_id),
  foreign key (user_id, achievement_event_id)
    references goal_achievement_events(user_id, id) on delete cascade,
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(target_snapshot IS NULL OR decimal_finite(target_snapshot)=1),
  CHECK(evaluation_occurred_at IS NULL OR codec_timestamp_valid(evaluation_occurred_at)=1),
  CHECK(legacy_state IS NULL OR json_valid(legacy_state)),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(achievement_event_id IS NULL OR codec_uuid_valid(achievement_event_id)=1),
  CHECK(criterion_id IS NULL OR codec_uuid_valid(criterion_id)=1),
  CHECK(evaluation_id IS NULL OR codec_uuid_valid(evaluation_id)=1),
  CHECK(criterion_type_snapshot IS NULL OR criterion_type_snapshot IN ('boolean','numeric')),
  CHECK(direction_snapshot IS NULL OR direction_snapshot IN ('at_least','at_most','exact'))
) STRICT;
CREATE TABLE goal_achievement_milestone_basis (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  achievement_event_id TEXT not null,
  milestone_id TEXT not null,
  achievement_episode_id TEXT,
  milestone_title_snapshot text,
  resulting_status_snapshot text,
  legacy_state TEXT,
  created_at TEXT not null default (life_now()),
  unique (achievement_event_id, milestone_id),
  foreign key (user_id, achievement_event_id)
    references goal_achievement_events(user_id, id) on delete cascade,
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(legacy_state IS NULL OR json_valid(legacy_state)),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(achievement_episode_id IS NULL OR codec_uuid_valid(achievement_episode_id)=1),
  CHECK(achievement_event_id IS NULL OR codec_uuid_valid(achievement_event_id)=1),
  CHECK(milestone_id IS NULL OR codec_uuid_valid(milestone_id)=1),
  CHECK(resulting_status_snapshot IS NULL OR resulting_status_snapshot IN ('planned','active','achieved','archived'))
) STRICT;
CREATE TABLE goal_criterion_evaluation_evidence (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  evaluation_id TEXT not null,
  reference_group_id TEXT not null default (life_uuid()),
  reference_action text not null check (reference_action in ('attached', 'replaced', 'withdrawn', 'supplemented')),
  source_type text not null check (source_type in ('task', 'project', 'project_milestone', 'resource', 'review_record')),
  source_id TEXT not null,
  source_title_snapshot text,
  source_context_snapshot TEXT,
  supersedes_reference_id TEXT,
  reason text,
  retrospective INTEGER not null default false,
  occurred_at TEXT,
  recorded_at TEXT not null default (life_now()),
  created_at TEXT not null default (life_now()),
  foreign key (user_id, evaluation_id)
    references goal_criterion_evaluations(user_id, id) on delete cascade,
  check (
    (reference_action in ('replaced', 'withdrawn') and supersedes_reference_id is not null and length(trim(coalesce(reason, ''))) > 0)
    or (reference_action in ('attached', 'supplemented') and supersedes_reference_id is null)
  ),
  check ((reference_action = 'supplemented') = retrospective),
  UNIQUE(user_id,id),
  FOREIGN KEY(user_id,supersedes_reference_id) REFERENCES goal_criterion_evaluation_evidence(user_id,id),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(source_context_snapshot IS NULL OR json_valid(source_context_snapshot)),
  CHECK(retrospective IS NULL OR retrospective IN (0,1)),
  CHECK(occurred_at IS NULL OR codec_timestamp_valid(occurred_at)=1),
  CHECK(recorded_at IS NULL OR codec_timestamp_valid(recorded_at)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(evaluation_id IS NULL OR codec_uuid_valid(evaluation_id)=1),
  CHECK(reference_group_id IS NULL OR codec_uuid_valid(reference_group_id)=1),
  CHECK(source_id IS NULL OR codec_uuid_valid(source_id)=1),
  CHECK(supersedes_reference_id IS NULL OR codec_uuid_valid(supersedes_reference_id)=1)
) STRICT;
CREATE TABLE goal_milestone_achievement_evidence (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  achievement_event_id TEXT not null,
  episode_id TEXT not null,
  reference_group_id TEXT not null default (life_uuid()),
  reference_action text not null check (reference_action in ('attached', 'replaced', 'withdrawn', 'supplemented')),
  source_type text not null check (source_type in ('goal_criterion_evaluation', 'project', 'project_milestone', 'task', 'resource', 'review_record')),
  source_id TEXT not null,
  source_title_snapshot text,
  source_context_snapshot TEXT,
  supersedes_reference_id TEXT,
  reason text,
  retrospective INTEGER not null default false,
  occurred_at TEXT,
  recorded_at TEXT not null default (life_now()),
  created_at TEXT not null default (life_now()),
  foreign key (user_id, achievement_event_id)
    references goal_milestone_achievement_events(user_id, id) on delete cascade,
  check (
    (reference_action in ('replaced', 'withdrawn') and supersedes_reference_id is not null and length(trim(coalesce(reason, ''))) > 0)
    or (reference_action in ('attached', 'supplemented') and supersedes_reference_id is null)
  ),
  check ((reference_action = 'supplemented') = retrospective),
  UNIQUE(user_id,id),
  FOREIGN KEY(user_id,supersedes_reference_id) REFERENCES goal_milestone_achievement_evidence(user_id,id),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(source_context_snapshot IS NULL OR json_valid(source_context_snapshot)),
  CHECK(retrospective IS NULL OR retrospective IN (0,1)),
  CHECK(occurred_at IS NULL OR codec_timestamp_valid(occurred_at)=1),
  CHECK(recorded_at IS NULL OR codec_timestamp_valid(recorded_at)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(achievement_event_id IS NULL OR codec_uuid_valid(achievement_event_id)=1),
  CHECK(episode_id IS NULL OR codec_uuid_valid(episode_id)=1),
  CHECK(reference_group_id IS NULL OR codec_uuid_valid(reference_group_id)=1),
  CHECK(source_id IS NULL OR codec_uuid_valid(source_id)=1),
  CHECK(supersedes_reference_id IS NULL OR codec_uuid_valid(supersedes_reference_id)=1)
) STRICT;
CREATE TABLE goal_achievement_evidence (

  id TEXT primary key default (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  achievement_event_id TEXT not null,
  reference_group_id TEXT not null default (life_uuid()),
  reference_action text not null check (reference_action in ('attached', 'replaced', 'withdrawn', 'supplemented')),
  source_type text not null check (source_type in ('project', 'project_milestone', 'task', 'resource', 'review_record')),
  source_id TEXT not null,
  source_title_snapshot text,
  source_context_snapshot TEXT,
  supersedes_reference_id TEXT,
  reason text,
  retrospective INTEGER not null default false,
  occurred_at TEXT,
  recorded_at TEXT not null default (life_now()),
  created_at TEXT not null default (life_now()),
  foreign key (user_id, achievement_event_id)
    references goal_achievement_events(user_id, id) on delete cascade,
  check (
    (reference_action in ('replaced', 'withdrawn') and supersedes_reference_id is not null and length(trim(coalesce(reason, ''))) > 0)
    or (reference_action in ('attached', 'supplemented') and supersedes_reference_id is null)
  ),
  check ((reference_action = 'supplemented') = retrospective),
  UNIQUE(user_id,id),
  FOREIGN KEY(user_id,supersedes_reference_id) REFERENCES goal_achievement_evidence(user_id,id),
  CHECK(codec_uuid_valid(id)=1),
  CHECK(codec_uuid_valid(user_id)=1),
  CHECK(source_context_snapshot IS NULL OR json_valid(source_context_snapshot)),
  CHECK(retrospective IS NULL OR retrospective IN (0,1)),
  CHECK(occurred_at IS NULL OR codec_timestamp_valid(occurred_at)=1),
  CHECK(recorded_at IS NULL OR codec_timestamp_valid(recorded_at)=1),
  CHECK(created_at IS NULL OR codec_timestamp_valid(created_at)=1),
  CHECK(achievement_event_id IS NULL OR codec_uuid_valid(achievement_event_id)=1),
  CHECK(reference_group_id IS NULL OR codec_uuid_valid(reference_group_id)=1),
  CHECK(source_id IS NULL OR codec_uuid_valid(source_id)=1),
  CHECK(supersedes_reference_id IS NULL OR codec_uuid_valid(supersedes_reference_id)=1)
) STRICT;
CREATE INDEX goal_achievement_order ON goal_achievement_events(user_id,goal_id,occurred_at DESC,recorded_at DESC,id DESC);
CREATE INDEX goal_milestone_achievement_order ON goal_milestone_achievement_events(user_id,goal_milestone_id,occurred_at DESC,recorded_at DESC,id DESC);
CREATE UNIQUE INDEX goal_single_current ON goal_milestones(user_id,goal_id) WHERE archived_at IS NULL AND status='active';
CREATE INDEX goal_milestone_order ON goal_milestones(user_id,goal_id,sort_order,created_at,id);
CREATE INDEX goal_criterion_latest ON goal_criterion_evaluations(user_id,criterion_id,evaluated_at DESC,recorded_at DESC,created_at DESC,id DESC);
CREATE UNIQUE INDEX goal_criterion_evaluation_evidence_successor ON goal_criterion_evaluation_evidence(user_id,supersedes_reference_id) WHERE supersedes_reference_id IS NOT NULL;
CREATE UNIQUE INDEX goal_milestone_achievement_evidence_successor ON goal_milestone_achievement_evidence(user_id,supersedes_reference_id) WHERE supersedes_reference_id IS NOT NULL;
CREATE UNIQUE INDEX goal_achievement_evidence_successor ON goal_achievement_evidence(user_id,supersedes_reference_id) WHERE supersedes_reference_id IS NOT NULL;
`;
