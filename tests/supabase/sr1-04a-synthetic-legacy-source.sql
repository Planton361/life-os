-- Synthetic-only, drift-compatible source fixture for SR1-04A.
-- :source_user_id is created through local Auth before this file is applied.
begin;
create schema if not exists legacy_transfer;

create table legacy_transfer.schedule_source_links (
  id uuid primary key, user_id uuid not null, task_id uuid not null,
  meal_id uuid, daily_review_id uuid, weekly_review_id uuid,
  running_plan_item_id uuid, strength_plan_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table legacy_transfer.habit_logs (
  id uuid primary key, user_id uuid not null, profile_id uuid not null, habit_id uuid not null,
  amount_delta numeric not null, occurred_at timestamptz not null, local_date date not null,
  timezone text not null, archived_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), client_mutation_id uuid, reverses_log_id uuid,
  is_compensation boolean not null default false
);
create table legacy_transfer.review_task_decisions (
  id uuid primary key, user_id uuid not null, review_id uuid not null, task_id uuid not null,
  decision public.review_task_decision not null, target_date date not null, note text,
  created_at timestamptz not null default now(), original_planned_date date,
  original_scheduled_start_at timestamptz
);
create table legacy_transfer.task_activity_events (
  id uuid primary key, user_id uuid not null, task_id uuid not null, event_type text not null
);
create table legacy_transfer.task_contexts (
  task_id uuid primary key, user_id uuid not null, next_action text,
  task_kind text, briefing_profile_id uuid
);

insert into public.profiles (id, display_name, timezone) values (:'source_user_id', 'Synthetic transfer user', 'Europe/Berlin');
insert into public.areas (id, user_id, key, name, color, sort_order) values
  ('00000000-0000-4000-8000-000000000001', :'source_user_id', 'personal', 'Synthetic', '#64748b', 1);
insert into public.goals (id, user_id, area_id, title, status, progress, horizon) values
  ('00000000-0000-4000-8000-000000000010', :'source_user_id', '00000000-0000-4000-8000-000000000001', 'Synthetic goal', 'active', 0, 'quarter');
insert into public.projects (id, user_id, area_id, goal_id, title, status, priority, progress) values
  ('00000000-0000-4000-8000-000000000020', :'source_user_id', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'Synthetic project', 'active', 'P2', 0);
insert into public.inbox_items (id, user_id, area_id, type, status, priority, title, captured_at) values
  ('00000000-0000-4000-8000-000000000030', :'source_user_id', '00000000-0000-4000-8000-000000000001', 'note', 'raw', 'P2', 'Synthetic inbox', now());
insert into public.resources (id, user_id, area_id, type, title) values
  ('00000000-0000-4000-8000-000000000040', :'source_user_id', '00000000-0000-4000-8000-000000000001', 'link', 'Synthetic resource');
insert into public.skills (id, user_id, area_id, name, category, status, level) values
  ('00000000-0000-4000-8000-000000000050', :'source_user_id', '00000000-0000-4000-8000-000000000001', 'Synthetic skill', 'technical', 'active', 1);
insert into public.habits (id, user_id, profile_id, name, unit, default_increment, time_window, sort_order) values
  ('00000000-0000-4000-8000-000000000060', :'source_user_id', :'source_user_id', 'Synthetic habit', 'count', 1, 'Morning', 1);
insert into public.weight_goals (id, user_id, profile_id, target_weight_kg) values
  ('00000000-0000-4000-8000-000000000061', :'source_user_id', :'source_user_id', 70);
insert into public.daily_logs (id, user_id, local_date, timezone, status) values
  ('00000000-0000-4000-8000-000000000070', :'source_user_id', date '2030-01-02', 'Europe/Berlin', 'open');
insert into public.recurring_task_templates (id, user_id, area_id, project_id, goal_id, title, recurrence_rule, starts_on, timezone, is_active) values
  ('00000000-0000-4000-8000-000000000071', :'source_user_id', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', 'Synthetic recurrence', '{"frequency":"weekly"}'::jsonb, date '2030-01-02', 'Europe/Berlin', true);
insert into public.recipes (id, user_id, area_id, title, servings, is_archived) values
  ('00000000-0000-4000-8000-000000000080', :'source_user_id', '00000000-0000-4000-8000-000000000001', 'Synthetic recipe', 1, false);
insert into public.recipe_ingredients (id, user_id, recipe_id, name, position) values
  ('00000000-0000-4000-8000-000000000081', :'source_user_id', '00000000-0000-4000-8000-000000000080', 'Synthetic ingredient', 1);
insert into public.meals (id, user_id, recipe_id, date, meal_type, title, planned_at) values
  ('00000000-0000-4000-8000-000000000082', :'source_user_id', '00000000-0000-4000-8000-000000000080', current_date, 'lunch', 'Synthetic meal', current_date + time '12:00:00');
insert into public.review_records (id, user_id, kind, period_start, period_end, timezone, status) values
  ('00000000-0000-4000-8000-000000000090', :'source_user_id', 'daily', current_date, current_date, 'Europe/Berlin', 'draft');
insert into public.running_plans (id, user_id, name, goal) values
  ('00000000-0000-4000-8000-000000000100', :'source_user_id', 'Synthetic running plan', 'Synthetic run');
insert into public.running_plan_items (id, user_id, plan_id, title, planned_distance_km, planned_duration_minutes, sort_order) values
  ('00000000-0000-4000-8000-000000000101', :'source_user_id', '00000000-0000-4000-8000-000000000100', 'Synthetic run item', 5, 30, 1);
insert into public.exercises (id, user_id, name) values
  ('00000000-0000-4000-8000-000000000110', :'source_user_id', 'Synthetic exercise');
insert into public.exercise_muscles (id, user_id, exercise_id, muscle_group) values
  ('00000000-0000-4000-8000-000000000111', :'source_user_id', '00000000-0000-4000-8000-000000000110', 'Chest');
insert into public.strength_plans (id, user_id, name, goal) values
  ('00000000-0000-4000-8000-000000000120', :'source_user_id', 'Synthetic strength plan', 'Synthetic strength');
insert into public.strength_plan_items (id, user_id, plan_id, exercise_id, sort_order, target_sets, target_reps) values
  ('00000000-0000-4000-8000-000000000121', :'source_user_id', '00000000-0000-4000-8000-000000000120', '00000000-0000-4000-8000-000000000110', 1, 3, 8);
insert into public.tasks (id, user_id, title, status, priority, area_id, project_id, goal_id, source_inbox_item_id, planned_date, scheduled_start_at, duration_minutes) values
  ('00000000-0000-4000-8000-000000000200', :'source_user_id', 'Synthetic normal task', 'active', 'P2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000030', current_date, current_date + time '11:00:00', 30),
  ('00000000-0000-4000-8000-000000000201', :'source_user_id', 'Synthetic meal task', 'planned', 'none', '00000000-0000-4000-8000-000000000001', null, null, null, current_date, current_date + time '12:00:00', 30),
  ('00000000-0000-4000-8000-000000000202', :'source_user_id', 'Synthetic review task', 'planned', 'none', '00000000-0000-4000-8000-000000000001', null, null, null, current_date, current_date + time '13:00:00', 30),
  ('00000000-0000-4000-8000-000000000203', :'source_user_id', 'Synthetic running task', 'planned', 'none', '00000000-0000-4000-8000-000000000001', null, null, null, current_date, current_date + time '14:00:00', 30),
  ('00000000-0000-4000-8000-000000000204', :'source_user_id', 'Synthetic strength task', 'planned', 'none', '00000000-0000-4000-8000-000000000001', null, null, null, current_date, current_date + time '15:00:00', 30);
insert into public.tasks (id, user_id, title, description, status, priority, area_id, generated_from_template_id, instance_date) values
  ('00000000-0000-4000-8000-000000000205', :'source_user_id', 'Synthetic existing description', 'Existing canonical description.', 'active', 'P2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000071', date '2030-01-03'),
  ('00000000-0000-4000-8000-000000000206', :'source_user_id', 'Synthetic title match', null, 'active', 'P2', '00000000-0000-4000-8000-000000000001', null, null),
  ('00000000-0000-4000-8000-000000000207', :'source_user_id', 'Synthetic marker task', 'Legacy next action:' || E'\\n' || 'Already carried.', 'active', 'P2', '00000000-0000-4000-8000-000000000001', null, null),
  ('00000000-0000-4000-8000-000000000208', :'source_user_id', 'Synthetic briefing task', null, 'active', 'P2', '00000000-0000-4000-8000-000000000001', null, null);
insert into public.daily_log_tasks (id, user_id, daily_log_id, task_id, relation_type) values
  ('00000000-0000-4000-8000-000000000210', :'source_user_id', '00000000-0000-4000-8000-000000000070', '00000000-0000-4000-8000-000000000200', 'planned');
insert into public.resource_relations (id, user_id, resource_id, target_type, target_id, relation_type) values
  ('00000000-0000-4000-8000-000000000220', :'source_user_id', '00000000-0000-4000-8000-000000000040', 'task', '00000000-0000-4000-8000-000000000200', 'context');
insert into public.task_skill_links (id, user_id, task_id, skill_id) values
  ('00000000-0000-4000-8000-000000000230', :'source_user_id', '00000000-0000-4000-8000-000000000200', '00000000-0000-4000-8000-000000000050');
insert into public.skill_evidence (id, user_id, skill_id, source_type, source_id, title, evidence_date, weight) values
  ('00000000-0000-4000-8000-000000000231', :'source_user_id', '00000000-0000-4000-8000-000000000050', 'task', '00000000-0000-4000-8000-000000000200', 'Synthetic evidence', date '2030-01-02', 1);
insert into public.running_sessions (id, user_id, plan_item_id, session_date, distance_km, duration_minutes, status, completed_at) values
  ('00000000-0000-4000-8000-000000000240', :'source_user_id', '00000000-0000-4000-8000-000000000101', date '2030-01-02', 5, 30, 'completed', '2030-01-02T10:00:00Z');
insert into public.strength_sessions (id, user_id, plan_id, session_date, started_at, status, completed_at) values
  ('00000000-0000-4000-8000-000000000250', :'source_user_id', '00000000-0000-4000-8000-000000000120', date '2030-01-02', '2030-01-02T18:00:00Z', 'completed', '2030-01-02T18:30:00Z');
insert into public.strength_set_logs (id, user_id, session_id, exercise_id, set_order, repetitions, weight_kg) values
  ('00000000-0000-4000-8000-000000000251', :'source_user_id', '00000000-0000-4000-8000-000000000250', '00000000-0000-4000-8000-000000000110', 1, 8, 20);
insert into public.mood_entries (id, user_id, profile_id, mood, recorded_at, local_date, timezone) values
  ('00000000-0000-4000-8000-000000000260', :'source_user_id', :'source_user_id', 'focused', '2030-01-02T08:00:00Z', date '2030-01-02', 'Europe/Berlin');
insert into public.sleep_entries (id, user_id, profile_id, sleep_date, duration_minutes, quality) values
  ('00000000-0000-4000-8000-000000000261', :'source_user_id', :'source_user_id', date '2030-01-02', 480, 4);
insert into public.weight_entries (id, user_id, profile_id, measured_on, weight_kg) values
  ('00000000-0000-4000-8000-000000000262', :'source_user_id', :'source_user_id', date '2030-01-02', 71);
insert into public.coding_sessions (id, user_id, project_id, session_date, duration_minutes, activity, outcome) values
  ('00000000-0000-4000-8000-000000000270', :'source_user_id', '00000000-0000-4000-8000-000000000020', date '2030-01-02', 30, 'coding', 'synthetic');
insert into public.education_logs (id, user_id, project_id, log_type, log_date, duration_minutes, focus, outcome) values
  ('00000000-0000-4000-8000-000000000271', :'source_user_id', '00000000-0000-4000-8000-000000000020', 'learning', date '2030-01-02', 30, 'synthetic', 'synthetic');
insert into public.work_logs (id, user_id, project_id, log_date, duration_minutes, focus, outcome) values
  ('00000000-0000-4000-8000-000000000272', :'source_user_id', '00000000-0000-4000-8000-000000000020', date '2030-01-02', 30, 'synthetic', 'synthetic');
insert into public.work_meetings (id, user_id, project_id, meeting_date, duration_minutes, title, outcome) values
  ('00000000-0000-4000-8000-000000000273', :'source_user_id', '00000000-0000-4000-8000-000000000020', date '2030-01-02', 30, 'Synthetic meeting', 'synthetic');
insert into public.work_decisions (id, user_id, project_id, decision_date, title, decision) values
  ('00000000-0000-4000-8000-000000000274', :'source_user_id', '00000000-0000-4000-8000-000000000020', date '2030-01-02', 'Synthetic decision', 'continue');
insert into public.work_meeting_followups (id, user_id, meeting_id, task_id) values
  ('00000000-0000-4000-8000-000000000275', :'source_user_id', '00000000-0000-4000-8000-000000000273', '00000000-0000-4000-8000-000000000200');
insert into public.journal_entries (id, user_id, entry_date, title, body) values
  ('00000000-0000-4000-8000-000000000276', :'source_user_id', date '2030-01-02', 'Synthetic journal', 'synthetic');
insert into public.wishlist_items (id, user_id, title, category, priority, status) values
  ('00000000-0000-4000-8000-000000000280', :'source_user_id', 'Synthetic wishlist', 'synthetic', 'medium', 'planned');
insert into public.inventory_items (id, user_id, source_wishlist_item_id, name, category, quantity, unit) values
  ('00000000-0000-4000-8000-000000000281', :'source_user_id', '00000000-0000-4000-8000-000000000280', 'Synthetic inventory', 'synthetic', 1, 'count');
insert into public.purchase_decisions (id, user_id, wishlist_item_id, inventory_item_id, decision_date, context, decision, rationale) values
  ('00000000-0000-4000-8000-000000000282', :'source_user_id', '00000000-0000-4000-8000-000000000280', '00000000-0000-4000-8000-000000000281', date '2030-01-02', 'synthetic', 'buy', 'synthetic');
insert into public.challenges (id, user_id, title, period_type, start_date, end_date, target_value, unit, reward_coins, status) values
  ('00000000-0000-4000-8000-000000000290', :'source_user_id', 'Synthetic challenge', 'weekly', date '2030-01-01', date '2030-01-07', 1, 'count', 1, 'active');
insert into public.challenge_progress_logs (id, user_id, challenge_id, increment, recorded_at) values
  ('00000000-0000-4000-8000-000000000291', :'source_user_id', '00000000-0000-4000-8000-000000000290', 1, '2030-01-02T08:00:00Z');
insert into public.anti_rot_actions (id, user_id, title, estimated_minutes, energy, status) values
  ('00000000-0000-4000-8000-000000000292', :'source_user_id', 'Synthetic anti rot', 5, 'low', 'active');
-- Anti-Rot remains a retained hidden table; its event ledger is intentionally
-- left empty because it is not part of the active-runtime fixture contract.
insert into public.shop_items (id, user_id, title, cost_coins, is_paused) values
  ('00000000-0000-4000-8000-000000000294', :'source_user_id', 'Synthetic shop item', 1, false);
insert into public.shop_redemptions (id, user_id, shop_item_id, title_snapshot, cost_coins, request_key) values
  ('00000000-0000-4000-8000-000000000295', :'source_user_id', '00000000-0000-4000-8000-000000000294', 'Synthetic shop item', 1, '00000000-0000-4000-8000-000000000295');
insert into public.entertainment_items (id, user_id, media_type, title, status) values
  ('00000000-0000-4000-8000-000000000296', :'source_user_id', 'book', 'Synthetic entertainment', 'planned');

insert into legacy_transfer.schedule_source_links (id, user_id, task_id, meal_id) values
  ('00000000-0000-4000-8000-000000000300', :'source_user_id', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000082');
insert into legacy_transfer.schedule_source_links (id, user_id, task_id, daily_review_id) values
  ('00000000-0000-4000-8000-000000000301', :'source_user_id', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000090');
insert into legacy_transfer.schedule_source_links (id, user_id, task_id, running_plan_item_id) values
  ('00000000-0000-4000-8000-000000000302', :'source_user_id', '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101');
insert into legacy_transfer.schedule_source_links (id, user_id, task_id, strength_plan_id) values
  ('00000000-0000-4000-8000-000000000303', :'source_user_id', '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000120');
insert into legacy_transfer.habit_logs (id, user_id, profile_id, habit_id, amount_delta, occurred_at, local_date, timezone) values
  ('00000000-0000-4000-8000-000000000310', :'source_user_id', :'source_user_id', '00000000-0000-4000-8000-000000000060', 2, '2030-01-02T09:00:00Z', date '2030-01-02', 'Europe/Berlin');
insert into legacy_transfer.habit_logs (id, user_id, profile_id, habit_id, amount_delta, occurred_at, local_date, timezone, archived_at) values
  ('00000000-0000-4000-8000-000000000311', :'source_user_id', :'source_user_id', '00000000-0000-4000-8000-000000000060', 1, '2030-01-02T10:00:00Z', date '2030-01-02', 'Europe/Berlin', '2030-01-02T10:01:00Z');
insert into legacy_transfer.habit_logs (id, user_id, profile_id, habit_id, amount_delta, occurred_at, local_date, timezone, reverses_log_id, is_compensation) values
  ('00000000-0000-4000-8000-000000000312', :'source_user_id', :'source_user_id', '00000000-0000-4000-8000-000000000060', -1, '2030-01-02T10:01:00Z', date '2030-01-02', 'Europe/Berlin', '00000000-0000-4000-8000-000000000311', true);
insert into legacy_transfer.review_task_decisions (id, user_id, review_id, task_id, decision, target_date) values
  ('00000000-0000-4000-8000-000000000320', :'source_user_id', '00000000-0000-4000-8000-000000000090', '00000000-0000-4000-8000-000000000200', 'carry_forward', date '2030-01-02');
insert into legacy_transfer.task_activity_events (id, user_id, task_id, event_type) values
  ('00000000-0000-4000-8000-000000000330', :'source_user_id', '00000000-0000-4000-8000-000000000200', 'legacy_only');
insert into legacy_transfer.task_contexts (task_id, user_id, next_action, task_kind, briefing_profile_id) values
  ('00000000-0000-4000-8000-000000000200', :'source_user_id', 'Preserve this next action exactly.', 'standard', null),
  ('00000000-0000-4000-8000-000000000201', :'source_user_id', null, 'standard', null),
  ('00000000-0000-4000-8000-000000000202', :'source_user_id', null, 'standard', null),
  ('00000000-0000-4000-8000-000000000203', :'source_user_id', null, 'standard', null),
  ('00000000-0000-4000-8000-000000000204', :'source_user_id', null, 'standard', null),
  ('00000000-0000-4000-8000-000000000205', :'source_user_id', 'Preserve this next action exactly.', 'standard', null),
  ('00000000-0000-4000-8000-000000000206', :'source_user_id', 'Synthetic title match', 'standard', null),
  ('00000000-0000-4000-8000-000000000207', :'source_user_id', 'Already carried.', 'standard', null),
  ('00000000-0000-4000-8000-000000000208', :'source_user_id', 'Briefing-only context.', 'briefing', '00000000-0000-4000-8000-000000000399');
commit;
