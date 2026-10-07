// Source-domain schema translation. Numeric columns use exact decimal TEXT.
export const sourceSchema = `
-- Canonical source: 20260627225310_r1_7_6_nutrition_recipe_meal_schema.sql
CREATE TABLE recipes (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  area_id TEXT,
  title text not null,
  summary text,
  instructions text,
  servings integer,
  prep_minutes integer,
  tags TEXT not null default '[]',
  nutrition_estimate TEXT,
  source text,
  is_archived INTEGER not null default 0 CHECK(is_archived IN (0,1)),
  created_at TEXT not null,
  updated_at TEXT not null,
  constraint recipes_title_not_blank check (length(trim(title)) > 0),
  constraint recipes_servings_range check (
    servings is null or (servings >= 1 and servings <= 100)
  ),
  constraint recipes_prep_minutes_range check (
    prep_minutes is null or (prep_minutes >= 0 and prep_minutes <= 1440)
  ),
  constraint recipes_tags_array check (json_type(tags) = 'array'),
  constraint recipes_nutrition_estimate_object check (
    nutrition_estimate is null
    or json_type(nutrition_estimate) = 'object'
  )
,
 UNIQUE(user_id,id),
 FOREIGN KEY(user_id,area_id) REFERENCES areas(user_id,id)
) STRICT;
-- Canonical source: 20260627225310_r1_7_6_nutrition_recipe_meal_schema.sql
CREATE TABLE meals (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  recipe_id TEXT,
  date TEXT not null,
  meal_type text not null,
  title text not null,
  planned_at TEXT,
  completed_at TEXT,
  notes text,
  created_at TEXT not null,
  updated_at TEXT not null,
  servings TEXT NOT NULL DEFAULT '1' CHECK(decimal_fits(servings,8,2)) CHECK(decimal_compare(servings,'0')>0 AND decimal_compare(servings,'100')<=0),
  constraint meals_title_not_blank check (length(trim(title)) > 0),
  constraint meals_meal_type_valid check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')
  )
,
 UNIQUE(user_id,id),
 FOREIGN KEY(user_id,recipe_id) REFERENCES recipes(user_id,id)
) STRICT;
-- Canonical source: 20260711184831_recipe_ingredients.sql
CREATE TABLE recipe_ingredients (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  recipe_id TEXT not null,
  name text not null,
  quantity TEXT,
  unit text,
  note text,
  position integer not null default 0,
  created_at TEXT not null,
  updated_at TEXT not null,
  constraint recipe_ingredients_name_not_blank check (length(trim(name)) > 0),
  constraint recipe_ingredients_quantity_positive check (
    quantity is null or decimal_compare(quantity,'0') > 0
  ),
  constraint recipe_ingredients_position_nonnegative check (position >= 0),
  constraint recipe_ingredients_unit_not_blank check (
    unit is null or length(trim(unit)) > 0
  ),
  constraint recipe_ingredients_note_not_blank check (
    note is null or length(trim(note)) > 0
  )
,
 UNIQUE(user_id,id),
 FOREIGN KEY(user_id,recipe_id) REFERENCES recipes(user_id,id)
) STRICT;
-- Canonical source: 20260712122012_daily_weekly_reviews.sql
CREATE TABLE review_records (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  kind TEXT not null,
  period_start TEXT not null,
  period_end TEXT not null,
  timezone text not null,
  status TEXT not null default 'draft',
  outcome text,
  wins TEXT not null default '[]' CHECK(json_valid(wins) AND json_type(wins)='array'),
  blockers TEXT not null default '[]' CHECK(json_valid(blockers) AND json_type(blockers)='array'),
  open_loops TEXT not null default '[]' CHECK(json_valid(open_loops) AND json_type(open_loops)='array'),
  next_period_focus text,
  planning_note text,
  completed_at TEXT,
  created_at TEXT not null,
  updated_at TEXT not null,
  archived_at TEXT,
  constraint review_records_period_order check (period_end >= period_start),
  constraint review_records_timezone_not_blank check (length(trim(timezone)) > 0)
,
 CHECK(kind IN ('daily','weekly')), CHECK(status IN ('draft','completed','archived')),
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260712122012_daily_weekly_reviews.sql
CREATE TABLE review_task_decisions (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  review_id TEXT not null,
  task_id TEXT not null,
  decision TEXT not null,
  target_date TEXT not null,
  note text,
  created_at TEXT not null,
  original_planned_date TEXT, original_scheduled_start_at TEXT,
  planning_snapshot_captured INTEGER NOT NULL DEFAULT 0 CHECK(planning_snapshot_captured IN (0,1)),
  constraint review_task_decisions_unique unique (review_id, task_id, decision)
,
 CHECK(decision='carry_forward'),
 UNIQUE(user_id,id),
 FOREIGN KEY(user_id,review_id) REFERENCES review_records(user_id,id),
 FOREIGN KEY(user_id,task_id) REFERENCES tasks(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE running_plans (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  goal text not null check (length(trim(goal)) between 1 and 500),
  archived_at TEXT,
  created_at TEXT not null,
  updated_at TEXT not null,
  unique (id, user_id)
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE running_plan_items (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  plan_id TEXT not null,
  title text not null check (length(trim(title)) between 1 and 120),
  planned_distance_km TEXT CHECK(decimal_fits(planned_distance_km,8,3)) check (planned_distance_km is null or decimal_compare(planned_distance_km,'0') > 0),
  planned_duration_minutes integer check (planned_duration_minutes is null or planned_duration_minutes > 0),
  sort_order integer not null check (sort_order between 0 and 10000),
  archived_at TEXT,
  created_at TEXT not null,
  updated_at TEXT not null,
  unique (id, user_id),
  unique (plan_id, sort_order),
  constraint running_plan_items_plan_owner_fkey foreign key (plan_id, user_id)
    references running_plans(id, user_id) on delete cascade
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE running_sessions (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  plan_item_id TEXT,
  session_date TEXT not null,
  started_at TEXT,
  distance_km TEXT not null CHECK(decimal_fits(distance_km,8,3)) check (decimal_compare(distance_km,'0') > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  average_heart_rate integer check (average_heart_rate is null or average_heart_rate between 30 and 240),
  notes text check (notes is null or length(notes) <= 2000),
  status text not null default 'completed' check (status in ('in_progress', 'completed')),
  completed_at TEXT,
  archived_at TEXT,
  created_at TEXT not null,
  updated_at TEXT not null,
  unique (id, user_id),
  constraint running_sessions_plan_item_owner_fkey foreign key (plan_item_id, user_id)
    references running_plan_items(id, user_id) on delete restrict,
  constraint running_sessions_completion_check check (
    (status = 'completed' and completed_at is not null) or
    (status = 'in_progress' and completed_at is null)
  )
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE exercises (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text check (description is null or length(description) <= 1000),
  equipment text check (equipment is null or length(equipment) <= 120),
  archived_at TEXT,
  created_at TEXT not null,
  updated_at TEXT not null,
  unique (id, user_id)
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE exercise_muscles (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  exercise_id TEXT not null,
  muscle_group text not null check (muscle_group in (
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
    'Core', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves'
  )),
  created_at TEXT not null,
  unique (exercise_id, muscle_group),
  constraint exercise_muscles_exercise_owner_fkey foreign key (exercise_id, user_id)
    references exercises(id, user_id) on delete cascade
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE strength_plans (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  goal text not null check (length(trim(goal)) between 1 and 500),
  archived_at TEXT,
  created_at TEXT not null,
  updated_at TEXT not null,
  unique (id, user_id)
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE strength_plan_items (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  plan_id TEXT not null,
  exercise_id TEXT not null,
  sort_order integer not null check (sort_order between 0 and 10000),
  target_sets integer not null check (target_sets between 1 and 50),
  target_reps integer not null check (target_reps between 1 and 1000),
  target_weight_kg TEXT CHECK(decimal_fits(target_weight_kg,8,3)) check (target_weight_kg is null or decimal_compare(target_weight_kg,'0') > 0),
  created_at TEXT not null,
  updated_at TEXT not null,
  unique (plan_id, sort_order),
  constraint strength_plan_items_plan_owner_fkey foreign key (plan_id, user_id)
    references strength_plans(id, user_id) on delete cascade,
  constraint strength_plan_items_exercise_owner_fkey foreign key (exercise_id, user_id)
    references exercises(id, user_id) on delete restrict
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE strength_sessions (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  plan_id TEXT,
  session_date TEXT not null,
  started_at TEXT not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  notes text check (notes is null or length(notes) <= 2000),
  completed_at TEXT,
  archived_at TEXT,
  created_at TEXT not null,
  updated_at TEXT not null,
  unique (id, user_id),
  constraint strength_sessions_plan_owner_fkey foreign key (plan_id, user_id)
    references strength_plans(id, user_id) on delete restrict,
  constraint strength_sessions_completion_check check (
    (status = 'completed' and completed_at is not null) or
    (status = 'in_progress' and completed_at is null)
  )
,
 UNIQUE(user_id,id)
) STRICT;
-- Canonical source: 20260713120000_running_strength_core.sql
CREATE TABLE strength_set_logs (
  id TEXT primary key,
  user_id TEXT not null references profiles(id) on delete cascade,
  session_id TEXT not null,
  exercise_id TEXT not null,
  set_order integer not null check (set_order between 1 and 1000),
  repetitions integer not null check (repetitions between 1 and 1000),
  weight_kg TEXT CHECK(decimal_fits(weight_kg,8,3)) check (weight_kg is null or decimal_compare(weight_kg,'0') > 0),
  notes text check (notes is null or length(notes) <= 1000),
  recorded_at TEXT not null,
  constraint strength_set_logs_session_owner_fkey foreign key (session_id, user_id)
    references strength_sessions(id, user_id) on delete cascade,
  constraint strength_set_logs_exercise_owner_fkey foreign key (exercise_id, user_id)
    references exercises(id, user_id) on delete restrict,
  unique (session_id, set_order)
,
 UNIQUE(user_id,id)
) STRICT;
CREATE UNIQUE INDEX review_active_period ON review_records(user_id,kind,period_start) WHERE archived_at IS NULL;
`;
export const sourceOwnedTables = ["recipes", "meals", "recipe_ingredients", "review_records", "review_task_decisions", "running_plans", "running_plan_items", "running_sessions", "exercises", "exercise_muscles", "strength_plans", "strength_plan_items", "strength_sessions", "strength_set_logs"] as const;
