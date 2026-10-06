// Versioned PostgreSQL retained/reward schema equivalents; exact numerics are TEXT.
export const retainedOwnedTables = [
  "journal_entries",
  "coding_sessions",
  "education_logs",
  "work_logs",
  "work_decisions",
  "work_meetings",
  "work_meeting_followups",
  "entertainment_items",
  "wishlist_items",
  "inventory_items",
  "purchase_decisions",
  "anti_rot_actions",
  "anti_rot_events",
  "challenges",
  "challenge_progress_logs",
  "reward_ledger_entries",
  "shop_items",
  "shop_redemptions",
] as const;
export const retainedSchema = `
ALTER TABLE projects ADD COLUMN repository_url TEXT CHECK(repository_url IS NULL OR repository_url GLOB 'http://*' OR repository_url GLOB 'https://*');
CREATE TABLE journal_entries (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  entry_date TEXT not null,
  title text,
  body text not null,
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  constraint journal_entries_title_not_blank
    check (title is null or length(trim(title)) > 0),
  constraint journal_entries_body_not_blank check (length(trim(body)) > 0)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE coding_sessions (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  project_id TEXT not null references projects(id) on delete restrict,
  session_date TEXT not null,
  start_time TEXT,
  duration_minutes INTEGER not null,
  activity text not null,
  outcome text not null,
  note text,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  archived_at TEXT,
  constraint coding_sessions_duration_positive check (duration_minutes > 0),
  constraint coding_sessions_activity_not_blank check (length(trim(activity)) > 0),
  constraint coding_sessions_outcome_not_blank check (length(trim(outcome)) > 0)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE education_logs (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  project_id TEXT not null references projects(id) on delete restrict,
  log_type text not null,
  log_date TEXT not null,
  start_time TEXT,
  duration_minutes INTEGER not null,
  focus text not null,
  outcome text not null,
  notes text,
  word_count_delta INTEGER,
  units_completed INTEGER,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  archived_at TEXT,
  constraint education_logs_duration_positive check (duration_minutes > 0),
  constraint education_logs_focus_not_blank check (length(trim(focus)) > 0),
  constraint education_logs_outcome_not_blank check (length(trim(outcome)) > 0),
  constraint education_logs_units_nonnegative check (units_completed is null or units_completed >= 0)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE work_logs (
  id TEXT primary key DEFAULT (life_uuid()), user_id TEXT not null references profiles(id) on delete cascade, project_id TEXT not null references projects(id) on delete restrict,
  log_date TEXT not null, started_at TEXT, duration_minutes INTEGER not null, focus text not null, outcome text not null, notes text,
  created_at TEXT not null DEFAULT (life_now()), updated_at TEXT not null DEFAULT (life_now()), archived_at TEXT,
  constraint work_logs_duration_positive check (duration_minutes > 0), constraint work_logs_focus_not_blank check (length(trim(focus)) > 0), constraint work_logs_outcome_not_blank check (length(trim(outcome)) > 0)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE work_decisions (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  project_id TEXT not null references projects(id) on delete restrict,
  decision_date TEXT not null,
  title text not null,
  decision text not null,
  rationale text,
  status text not null default 'active',
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  constraint work_decisions_title_not_blank check (length(trim(title)) > 0),
  constraint work_decisions_decision_not_blank check (length(trim(decision)) > 0),
  constraint work_decisions_status_check check (status in ('active', 'revisited', 'superseded'))
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE work_meetings (
  id TEXT primary key DEFAULT (life_uuid()), user_id TEXT not null references profiles(id) on delete cascade,
  project_id TEXT not null references projects(id) on delete restrict, meeting_date TEXT not null, started_at TEXT,
  duration_minutes INTEGER not null, title text not null, participants text, agenda text, outcome text not null, notes text,
  archived_at TEXT, created_at TEXT not null DEFAULT (life_now()), updated_at TEXT not null DEFAULT (life_now()),
  constraint work_meetings_duration_positive check (duration_minutes > 0), constraint work_meetings_title_not_blank check (length(trim(title)) > 0), constraint work_meetings_outcome_not_blank check (length(trim(outcome)) > 0)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE work_meeting_followups (
  id TEXT primary key DEFAULT (life_uuid()), user_id TEXT not null references profiles(id) on delete cascade,
  meeting_id TEXT not null references work_meetings(id) on delete cascade, task_id TEXT not null references tasks(id) on delete cascade,
  created_at TEXT not null DEFAULT (life_now()), unique (meeting_id, task_id)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE entertainment_items (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  media_type text not null,
  title text not null,
  creator_or_studio text,
  release_year INTEGER,
  status text not null default 'planned',
  started_on TEXT,
  completed_on TEXT,
  rating INTEGER,
  notes text,
  progress_current TEXT,
  progress_total TEXT,
  progress_unit text,
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  constraint entertainment_items_title_not_blank check (length(trim(title)) > 0),
  constraint entertainment_items_media_type_check check (media_type in ('book', 'movie', 'series', 'game')),
  constraint entertainment_items_status_check check (status in ('planned', 'in_progress', 'completed', 'dropped')),
  constraint entertainment_items_release_year_check check (release_year is null or release_year between 1000 and 3000),
  constraint entertainment_items_rating_check check (rating is null or rating between 1 and 10),
  constraint entertainment_items_progress_current_check check (progress_current is null or decimal_finite(progress_current)=1 AND decimal_compare(progress_current,'0') >= 0),
  constraint entertainment_items_progress_total_check check (progress_total is null or decimal_finite(progress_total)=1 AND decimal_compare(progress_total,'0') > 0),
  constraint entertainment_items_progress_range_check check (progress_current is null or progress_total is null or decimal_compare(progress_current,progress_total)<=0),
  constraint entertainment_items_progress_unit_check check (progress_unit is null or progress_unit in ('pages', 'episodes', 'percent', 'hours')),
  constraint entertainment_items_progress_pair_check check (
    (progress_current is null and progress_total is null and progress_unit is null)
    or (progress_unit is not null and (progress_current is not null or progress_total is not null))
  )
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE wishlist_items (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  priority text not null default 'medium',
  expected_price TEXT,
  currency text,
  target_date TEXT,
  status text not null default 'considering',
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  constraint wishlist_items_title_not_blank check (length(trim(title)) > 0),
  constraint wishlist_items_category_not_blank check (length(trim(category)) > 0),
  constraint wishlist_items_priority_check check (priority in ('low', 'medium', 'high')),
  constraint wishlist_items_status_check check (status in ('considering', 'planned', 'approved', 'acquired', 'rejected')),
  constraint wishlist_items_price_check check (expected_price is null or decimal_finite(expected_price)=1 AND decimal_compare(expected_price,'0') >= 0),
  constraint wishlist_items_currency_check check (currency is null or length(currency)=3 AND currency NOT GLOB '*[^A-Z]*'),
  constraint wishlist_items_money_pair_check check ((expected_price is null) = (currency is null))
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE inventory_items (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  source_wishlist_item_id TEXT references wishlist_items(id) on delete set null,
  name text not null,
  category text not null,
  description text,
  quantity TEXT,
  unit text,
  acquired_on TEXT,
  location text,
  condition text,
  acquisition_value TEXT,
  currency text,
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  constraint inventory_items_name_not_blank check (length(trim(name)) > 0),
  constraint inventory_items_category_not_blank check (length(trim(category)) > 0),
  constraint inventory_items_quantity_check check (quantity is null or decimal_finite(quantity)=1 AND decimal_compare(quantity,'0') > 0),
  constraint inventory_items_unit_pair_check check ((quantity is null and unit is null) or (quantity is not null and unit is not null and length(trim(unit)) > 0)),
  constraint inventory_items_condition_check check (condition is null or condition in ('new', 'good', 'used', 'damaged', 'retired')),
  constraint inventory_items_value_check check (acquisition_value is null or decimal_finite(acquisition_value)=1 AND decimal_compare(acquisition_value,'0') >= 0),
  constraint inventory_items_currency_check check (currency is null or length(currency)=3 AND currency NOT GLOB '*[^A-Z]*'),
  constraint inventory_items_money_pair_check check ((acquisition_value is null) = (currency is null)),
  unique (source_wishlist_item_id)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE purchase_decisions (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  wishlist_item_id TEXT not null references wishlist_items(id) on delete restrict,
  inventory_item_id TEXT references inventory_items(id) on delete set null,
  decision_date TEXT not null,
  context text not null,
  criteria text,
  decision text not null,
  rationale text not null,
  status text not null default 'open',
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now()),
  constraint purchase_decisions_context_not_blank check (length(trim(context)) > 0),
  constraint purchase_decisions_decision_not_blank check (length(trim(decision)) > 0),
  constraint purchase_decisions_rationale_not_blank check (length(trim(rationale)) > 0),
  constraint purchase_decisions_status_check check (status in ('open', 'decided_buy', 'decided_skip', 'deferred'))
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE anti_rot_actions (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  category text check (category is null or category in ('movement','social','creative','outside','learning','reset','custom')),
  estimated_minutes INTEGER check (estimated_minutes is null or estimated_minutes > 0),
  energy text check (energy is null or energy in ('low','medium','high')),
  status text not null default 'active' check (status in ('active','paused')),
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now())
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE anti_rot_events (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  action_id TEXT not null references anti_rot_actions(id) on delete restrict,
  event_type text not null check (event_type in ('recommended','completed','skipped')),
  recommendation_event_id TEXT references anti_rot_events(id) on delete restrict,
  created_at TEXT not null DEFAULT (life_now()),
  constraint anti_rot_event_shape check (
    (event_type = 'recommended' and recommendation_event_id is null)
    or (event_type in ('completed','skipped') and recommendation_event_id is not null)
  )
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE challenges (
  id TEXT primary key DEFAULT (life_uuid()), user_id TEXT not null references profiles(id) on delete cascade,
  title text not null, description text, period_type text not null, start_date TEXT not null, end_date TEXT not null,
  target_value TEXT not null, unit text not null, reward_coins INTEGER not null default 0,
  status text not null default 'active', completed_at TEXT, archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()), updated_at TEXT not null DEFAULT (life_now()),
  constraint challenges_title_not_blank check (length(trim(title)) > 0),
  constraint challenges_period_check check (period_type in ('daily','weekly','monthly','custom')),
  constraint challenges_dates_check check (end_date >= start_date),
  constraint challenges_target_check check (decimal_finite(target_value)=1 AND decimal_compare(target_value,'0') > 0),
  constraint challenges_unit_not_blank check (length(trim(unit)) > 0),
  constraint challenges_reward_check check (reward_coins >= 0),
  constraint challenges_status_check check (status in ('active','completed','abandoned')),
  constraint challenges_completed_check check ((status = 'completed') = (completed_at is not null))
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE challenge_progress_logs (
  id TEXT primary key DEFAULT (life_uuid()), user_id TEXT not null references profiles(id) on delete cascade,
  challenge_id TEXT not null references challenges(id) on delete restrict,
  increment TEXT not null, note text, recorded_at TEXT not null DEFAULT (life_now()), archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()), updated_at TEXT not null DEFAULT (life_now()),
  constraint challenge_progress_increment_check check (decimal_finite(increment)=1 AND decimal_compare(increment,'0') > 0)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE reward_ledger_entries (
  id TEXT primary key DEFAULT (life_uuid()), user_id TEXT not null references profiles(id) on delete cascade,
  amount INTEGER not null, entry_type text not null, source_type text not null, source_id TEXT not null,
  description text not null, created_at TEXT not null DEFAULT (life_now()),
  constraint reward_ledger_amount_check check (amount <> 0),
  constraint reward_ledger_type_check check (entry_type IN ('challenge_reward','shop_redemption')),
  constraint reward_ledger_source_check check ((entry_type='challenge_reward' AND source_type='challenge' AND amount>0) OR (entry_type='shop_redemption' AND source_type='shop_redemption' AND amount<0)),
  constraint reward_ledger_description_not_blank check (length(trim(description)) > 0),
  unique (entry_type, source_type, source_id)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE shop_items (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  category text,
  cost_coins INTEGER not null check (cost_coins > 0),
  is_paused INTEGER not null DEFAULT 0 CHECK(is_paused IN (0,1)),
  archived_at TEXT,
  created_at TEXT not null DEFAULT (life_now()),
  updated_at TEXT not null DEFAULT (life_now())
,
  UNIQUE(user_id,id)
) STRICT;
CREATE TABLE shop_redemptions (
  id TEXT primary key DEFAULT (life_uuid()),
  user_id TEXT not null references profiles(id) on delete cascade,
  shop_item_id TEXT not null references shop_items(id) on delete restrict,
  title_snapshot text not null check (length(trim(title_snapshot)) > 0),
  cost_coins INTEGER not null check (cost_coins > 0),
  request_key TEXT not null,
  redeemed_at TEXT not null DEFAULT (life_now()),
  unique (user_id, request_key)
,
  UNIQUE(user_id,id)
) STRICT;
CREATE UNIQUE INDEX anti_rot_events_one_resolution ON anti_rot_events(recommendation_event_id) WHERE recommendation_event_id IS NOT NULL;
CREATE INDEX journal_entries_chronology ON journal_entries(user_id,entry_date DESC,created_at DESC,id DESC);
CREATE INDEX challenge_progress_order ON challenge_progress_logs(user_id,challenge_id,recorded_at DESC,id DESC);
`;
