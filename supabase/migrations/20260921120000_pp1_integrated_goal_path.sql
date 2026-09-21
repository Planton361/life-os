-- PP1 Slice 1 — integrated Goal path and bounded completion evidence.
--
-- This migration deliberately owns only Goal/Etappe/Criterion history. Task,
-- Project and Project-Milestone completion history remains Slice 2.

alter table public.goal_criterion_evaluations
  add column if not exists recorded_at timestamptz not null default now(),
  add column if not exists goal_id_snapshot uuid,
  add column if not exists goal_milestone_id_snapshot uuid,
  add column if not exists criterion_title_snapshot text,
  add column if not exists criterion_type_snapshot public.goal_criterion_type,
  add column if not exists unit_snapshot text,
  add column if not exists target_snapshot numeric,
  add column if not exists direction_snapshot public.goal_criterion_direction,
  add column if not exists revision_kind text not null default 'evaluation',
  add column if not exists supersedes_evaluation_id uuid,
  add column if not exists correction_reason text,
  add column if not exists is_retracted boolean not null default false,
  add column if not exists legacy_state jsonb,
  add column if not exists retrospective boolean not null default false;

alter table public.goal_criterion_evaluations
  add constraint goal_criterion_evaluations_user_id_id_key unique (user_id, id);

alter table public.goal_criterion_evaluations
  drop constraint if exists goal_criterion_evaluations_value_shape;

alter table public.goal_criterion_evaluations
  add constraint goal_criterion_evaluations_revision_kind_check
  check (revision_kind in ('evaluation', 'correction', 'retraction'));

alter table public.goal_criterion_evaluations
  add constraint goal_criterion_evaluations_retraction_shape
  check (
    (is_retracted and boolean_value is null and numeric_value is null and unit is null)
    or (
      not is_retracted
      and (
        (
          is_deferred
          and boolean_value is null
          and numeric_value is null
          and unit is null
        )
        or (
          not is_deferred
          and (
            (boolean_value is not null and numeric_value is null and unit is null)
            or (boolean_value is null and numeric_value is not null and unit is not null)
          )
        )
      )
    )
  );

-- Existing evaluations can still inform the current readiness projection, but
-- their original Slice-1 recording context cannot be reconstructed. Preserve
-- that boundary explicitly instead of presenting them as new immutable history.
update public.goal_criterion_evaluations
   set legacy_state = jsonb_build_object(
         'legacy_state', true,
         'reason', 'Evaluation predates Slice-1 immutable Goal history.'
       ),
       retrospective = false
 where legacy_state is null;

create index if not exists goal_criterion_evaluations_effective_latest_idx
  on public.goal_criterion_evaluations (
    user_id,
    criterion_id,
    evaluated_at desc,
    recorded_at desc,
    created_at desc,
    id desc
  );

create table public.goal_command_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  command_id uuid not null,
  command_kind text not null check (length(btrim(command_kind)) > 0),
  request_fingerprint text not null check (length(btrim(request_fingerprint)) > 0),
  result_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, command_id)
);

create table public.goal_milestone_achievement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  goal_milestone_id uuid not null,
  episode_id uuid not null,
  event_type text not null check (event_type in ('achieved', 'reopened', 'amended')),
  occurred_at timestamptz,
  recorded_at timestamptz not null default now(),
  goal_title_snapshot text,
  goal_milestone_title_snapshot text,
  goal_milestone_description_snapshot text,
  prior_status public.goal_milestone_status,
  resulting_status public.goal_milestone_status,
  note text,
  legacy_state jsonb,
  corrects_event_id uuid,
  correction_reason text,
  retrospective boolean not null default false,
  command_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, goal_id)
    references public.goals(user_id, id) on delete cascade,
  foreign key (user_id, goal_id, goal_milestone_id)
    references public.goal_milestones(user_id, goal_id, id) on delete cascade,
  foreign key (user_id, corrects_event_id)
    references public.goal_milestone_achievement_events(user_id, id) on delete restrict,
  check (
    (event_type = 'amended' and corrects_event_id is not null and length(btrim(coalesce(correction_reason, ''))) > 0)
    or (event_type <> 'amended' and corrects_event_id is null and correction_reason is null)
  )
);

create index goal_milestone_achievement_events_order_idx
  on public.goal_milestone_achievement_events (
    user_id,
    goal_milestone_id,
    occurred_at desc nulls last,
    recorded_at desc,
    id desc
  );

create table public.goal_achievement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  episode_id uuid not null,
  event_type text not null check (event_type in ('achieved', 'reopened', 'amended')),
  occurred_at timestamptz,
  recorded_at timestamptz not null default now(),
  goal_title_snapshot text,
  prior_status public.goal_status,
  resulting_status public.goal_status,
  achievement_note text,
  legacy_state jsonb,
  corrects_event_id uuid,
  correction_reason text,
  retrospective boolean not null default false,
  command_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, goal_id)
    references public.goals(user_id, id) on delete cascade,
  foreign key (user_id, corrects_event_id)
    references public.goal_achievement_events(user_id, id) on delete restrict,
  check (
    (event_type = 'amended' and corrects_event_id is not null and length(btrim(coalesce(correction_reason, ''))) > 0)
    or (event_type <> 'amended' and corrects_event_id is null and correction_reason is null)
  )
);

create index goal_achievement_events_order_idx
  on public.goal_achievement_events (
    user_id,
    goal_id,
    occurred_at desc nulls last,
    recorded_at desc,
    id desc
  );

create table public.goal_achievement_criterion_basis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_event_id uuid not null,
  criterion_id uuid not null,
  evaluation_id uuid,
  criterion_title_snapshot text,
  criterion_type_snapshot public.goal_criterion_type,
  goal_milestone_id_snapshot uuid,
  unit_snapshot text,
  target_snapshot numeric,
  direction_snapshot public.goal_criterion_direction,
  evaluation_state_snapshot text,
  evaluation_occurred_at timestamptz,
  legacy_state jsonb,
  created_at timestamptz not null default now(),
  unique (achievement_event_id, criterion_id),
  foreign key (user_id, achievement_event_id)
    references public.goal_achievement_events(user_id, id) on delete cascade
);

create table public.goal_achievement_milestone_basis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_event_id uuid not null,
  milestone_id uuid not null,
  achievement_episode_id uuid,
  milestone_title_snapshot text,
  resulting_status_snapshot public.goal_milestone_status,
  legacy_state jsonb,
  created_at timestamptz not null default now(),
  unique (achievement_event_id, milestone_id),
  foreign key (user_id, achievement_event_id)
    references public.goal_achievement_events(user_id, id) on delete cascade
);

create table public.goal_criterion_evaluation_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evaluation_id uuid not null,
  reference_group_id uuid not null default gen_random_uuid(),
  reference_action text not null check (reference_action in ('attached', 'replaced', 'withdrawn', 'supplemented')),
  source_type text not null check (source_type in ('task', 'project', 'project_milestone', 'resource', 'review_record')),
  source_id uuid not null,
  source_title_snapshot text,
  source_context_snapshot jsonb,
  supersedes_reference_id uuid,
  reason text,
  retrospective boolean not null default false,
  occurred_at timestamptz,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, evaluation_id)
    references public.goal_criterion_evaluations(user_id, id) on delete cascade,
  check (
    (reference_action in ('replaced', 'withdrawn') and supersedes_reference_id is not null and length(btrim(coalesce(reason, ''))) > 0)
    or (reference_action in ('attached', 'supplemented') and supersedes_reference_id is null)
  ),
  check ((reference_action = 'supplemented') = retrospective)
);

create table public.goal_milestone_achievement_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_event_id uuid not null,
  episode_id uuid not null,
  reference_group_id uuid not null default gen_random_uuid(),
  reference_action text not null check (reference_action in ('attached', 'replaced', 'withdrawn', 'supplemented')),
  source_type text not null check (source_type in ('goal_criterion_evaluation', 'project', 'project_milestone', 'task', 'resource', 'review_record')),
  source_id uuid not null,
  source_title_snapshot text,
  source_context_snapshot jsonb,
  supersedes_reference_id uuid,
  reason text,
  retrospective boolean not null default false,
  occurred_at timestamptz,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, achievement_event_id)
    references public.goal_milestone_achievement_events(user_id, id) on delete cascade,
  check (
    (reference_action in ('replaced', 'withdrawn') and supersedes_reference_id is not null and length(btrim(coalesce(reason, ''))) > 0)
    or (reference_action in ('attached', 'supplemented') and supersedes_reference_id is null)
  ),
  check ((reference_action = 'supplemented') = retrospective)
);

create table public.goal_achievement_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_event_id uuid not null,
  reference_group_id uuid not null default gen_random_uuid(),
  reference_action text not null check (reference_action in ('attached', 'replaced', 'withdrawn', 'supplemented')),
  source_type text not null check (source_type in ('project', 'project_milestone', 'task', 'resource', 'review_record')),
  source_id uuid not null,
  source_title_snapshot text,
  source_context_snapshot jsonb,
  supersedes_reference_id uuid,
  reason text,
  retrospective boolean not null default false,
  occurred_at timestamptz,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, achievement_event_id)
    references public.goal_achievement_events(user_id, id) on delete cascade,
  check (
    (reference_action in ('replaced', 'withdrawn') and supersedes_reference_id is not null and length(btrim(coalesce(reason, ''))) > 0)
    or (reference_action in ('attached', 'supplemented') and supersedes_reference_id is null)
  ),
  check ((reference_action = 'supplemented') = retrospective)
);

create index goal_criterion_evaluation_evidence_lookup_idx
  on public.goal_criterion_evaluation_evidence (user_id, evaluation_id, reference_group_id, recorded_at desc, id desc);
create index goal_milestone_achievement_evidence_lookup_idx
  on public.goal_milestone_achievement_evidence (user_id, achievement_event_id, reference_group_id, recorded_at desc, id desc);
create index goal_achievement_evidence_lookup_idx
  on public.goal_achievement_evidence (user_id, achievement_event_id, reference_group_id, recorded_at desc, id desc);

-- Preserve the current achieved state that existed before Slice 1 without
-- inventing the old transition time or decision-time identity. These rows are
-- durable legacy markers; current Goal/Etappe rows remain the current identity.
create or replace function public.backfill_goal_legacy_history()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.goal_criterion_evaluations
     set legacy_state = jsonb_build_object(
           'legacy_state', true,
           'reason', 'Evaluation predates Slice-1 immutable Goal history.'
         ),
         retrospective = false
   where legacy_state is null;

  insert into public.goal_milestone_achievement_events (
    user_id,
    goal_id,
    goal_milestone_id,
    episode_id,
    event_type,
    occurred_at,
    goal_title_snapshot,
    goal_milestone_title_snapshot,
    goal_milestone_description_snapshot,
    prior_status,
    resulting_status,
    note,
    legacy_state,
    retrospective
  )
  select
    m.user_id,
    m.goal_id,
    m.id,
    gen_random_uuid(),
    'achieved',
    null,
    null,
    null,
    null,
    null,
    'achieved',
    null,
    jsonb_build_object(
      'legacy_state', true,
      'reason', 'Etappe war vor Slice 1 bereits erreicht; Übergangszeitpunkt und Entscheidungskontext sind nicht rekonstruierbar.'
    ),
    false
  from public.goal_milestones m
  where m.status = 'achieved'
    and not exists (
      select 1
        from public.goal_milestone_achievement_events e
       where e.user_id = m.user_id
         and e.goal_milestone_id = m.id
    );

  insert into public.goal_achievement_events (
    user_id,
    goal_id,
    episode_id,
    event_type,
    occurred_at,
    goal_title_snapshot,
    prior_status,
    resulting_status,
    achievement_note,
    legacy_state,
    retrospective
  )
  select
    g.user_id,
    g.id,
    gen_random_uuid(),
    'achieved',
    g.achieved_at,
    null,
    null,
    'achieved',
    g.achievement_note,
    jsonb_build_object(
      'legacy_state', true,
      'reason', 'Goal war vor Slice 1 bereits erreicht; Übergangszeitpunkt ist nur über achieved_at bekannt, Entscheidungsbasis und damalige Identität sind nicht rekonstruierbar.'
    ),
    false
  from public.goals g
  where g.status = 'achieved'
    and not exists (
      select 1
        from public.goal_achievement_events e
       where e.user_id = g.user_id
         and e.goal_id = g.id
    );
end;
$$;

revoke all on function public.backfill_goal_legacy_history() from public, anon, authenticated;
select public.backfill_goal_legacy_history();

alter table public.goal_command_receipts enable row level security;
alter table public.goal_milestone_achievement_events enable row level security;
alter table public.goal_achievement_events enable row level security;
alter table public.goal_achievement_criterion_basis enable row level security;
alter table public.goal_achievement_milestone_basis enable row level security;
alter table public.goal_criterion_evaluation_evidence enable row level security;
alter table public.goal_milestone_achievement_evidence enable row level security;
alter table public.goal_achievement_evidence enable row level security;

revoke all on public.goal_command_receipts from public, anon, authenticated;
revoke all on public.goal_milestone_achievement_events from public, anon, authenticated;
revoke all on public.goal_achievement_events from public, anon, authenticated;
revoke all on public.goal_achievement_criterion_basis from public, anon, authenticated;
revoke all on public.goal_achievement_milestone_basis from public, anon, authenticated;
revoke all on public.goal_criterion_evaluation_evidence from public, anon, authenticated;
revoke all on public.goal_milestone_achievement_evidence from public, anon, authenticated;
revoke all on public.goal_achievement_evidence from public, anon, authenticated;
revoke insert on public.goal_criterion_evaluations from authenticated;

grant select on public.goal_milestone_achievement_events to authenticated;
grant select on public.goal_achievement_events to authenticated;
grant select on public.goal_achievement_criterion_basis to authenticated;
grant select on public.goal_achievement_milestone_basis to authenticated;
grant select on public.goal_criterion_evaluation_evidence to authenticated;
grant select on public.goal_milestone_achievement_evidence to authenticated;
grant select on public.goal_achievement_evidence to authenticated;

create policy goal_milestone_achievement_events_read
  on public.goal_milestone_achievement_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goal_achievement_events_read
  on public.goal_achievement_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goal_achievement_criterion_basis_read
  on public.goal_achievement_criterion_basis for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goal_achievement_milestone_basis_read
  on public.goal_achievement_milestone_basis for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goal_criterion_evaluation_evidence_read
  on public.goal_criterion_evaluation_evidence for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goal_milestone_achievement_evidence_read
  on public.goal_milestone_achievement_evidence for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goal_achievement_evidence_read
  on public.goal_achievement_evidence for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.validate_goal_criterion_evaluation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_type public.goal_criterion_type;
  v_unit text;
  v_archived_at timestamptz;
begin
  select criterion_type, unit, archived_at
    into v_type, v_unit, v_archived_at
    from public.goal_outcome_criteria
   where id = new.criterion_id
     and user_id = new.user_id;

  if not found then
    raise exception 'GOAL_CRITERION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_archived_at is not null then
    raise exception 'GOAL_CRITERION_ARCHIVED' using errcode = 'P0001';
  end if;
  if new.is_retracted then
    if new.is_deferred or new.boolean_value is not null or new.numeric_value is not null or new.unit is not null then
      raise exception 'GOAL_RETRACTED_EVALUATION_SHAPE' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.is_deferred then
    if new.boolean_value is not null or new.numeric_value is not null or new.unit is not null then
      raise exception 'GOAL_DEFERRED_EVALUATION_SHAPE' using errcode = '23514';
    end if;
    return new;
  end if;
  if v_type = 'boolean' then
    if new.boolean_value is null or new.numeric_value is not null or new.unit is not null then
      raise exception 'GOAL_BOOLEAN_EVALUATION_SHAPE' using errcode = '23514';
    end if;
  elsif v_type = 'numeric' then
    if new.boolean_value is not null or new.numeric_value is null or new.unit is null or btrim(new.unit) <> v_unit then
      raise exception 'GOAL_NUMERIC_EVALUATION_UNIT' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.goal_outcome_criterion_is_met(
  p_user_id uuid,
  p_criterion_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((
    select case
      when e.is_retracted or e.is_deferred then false
      when c.criterion_type = 'boolean' then e.boolean_value is true
      when c.direction = 'at_least' then e.numeric_value >= c.target
      when c.direction = 'at_most' then e.numeric_value <= c.target
      when c.direction = 'exact' then e.numeric_value = c.target
      else false
    end
      from public.goal_outcome_criteria c
      left join lateral (
        select e.is_deferred, e.is_retracted, e.boolean_value, e.numeric_value
          from public.goal_criterion_evaluations e
         where e.user_id = c.user_id and e.criterion_id = c.id
         order by e.evaluated_at desc, e.recorded_at desc, e.created_at desc, e.id desc
         limit 1
      ) e on true
     where c.user_id = p_user_id and c.id = p_criterion_id and c.archived_at is null
  ), false);
$$;

create or replace function public.goal_source_snapshot(
  p_user_id uuid,
  p_source_type text,
  p_source_id uuid
)
returns table (title text, context jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source_type = 'task' then
    select t.title, jsonb_build_object('project_id', t.project_id, 'goal_id', t.goal_id)
      into title, context
      from public.tasks t
     where t.user_id = p_user_id and t.id = p_source_id and t.archived_at is null;
  elsif p_source_type = 'project' then
    select p.title, jsonb_build_object('goal_id', p.goal_id)
      into title, context
      from public.projects p
     where p.user_id = p_user_id and p.id = p_source_id and p.archived_at is null;
  elsif p_source_type = 'project_milestone' then
    select m.title, jsonb_build_object('project_id', m.project_id, 'status', m.status)
      into title, context
      from public.project_milestones m
     where m.user_id = p_user_id and m.id = p_source_id and m.archived_at is null;
  elsif p_source_type = 'resource' then
    select r.title, jsonb_build_object('type', r.type, 'source', r.source)
      into title, context
      from public.resources r
     where r.user_id = p_user_id and r.id = p_source_id and r.archived_at is null;
  elsif p_source_type = 'review_record' then
    select concat(initcap(r.kind::text), ' Review · ', r.period_start::text), jsonb_build_object('kind', r.kind, 'period_start', r.period_start, 'period_end', r.period_end)
      into title, context
      from public.review_records r
     where r.user_id = p_user_id and r.id = p_source_id and r.archived_at is null;
  elsif p_source_type = 'goal_criterion_evaluation' then
    select coalesce(e.criterion_title_snapshot, c.title), jsonb_build_object('criterion_id', e.criterion_id, 'evaluated_at', e.evaluated_at)
      into title, context
      from public.goal_criterion_evaluations e
      left join public.goal_outcome_criteria c on c.id = e.criterion_id and c.user_id = e.user_id
     where e.user_id = p_user_id and e.id = p_source_id and not e.is_retracted;
  else
    raise exception 'GOAL_EVIDENCE_SOURCE_TYPE_INVALID' using errcode = 'P0001';
  end if;
  if title is null then
    raise exception 'GOAL_EVIDENCE_SOURCE_INVALID' using errcode = 'P0001';
  end if;
  return next;
end;
$$;

create or replace function public.execute_goal_command(
  p_command_kind text,
  p_command_id uuid,
  p_request_fingerprint text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb;
  v_existing_fingerprint text;
  v_existing_result jsonb;
  v_goal_id uuid;
  v_milestone_id uuid;
  v_criterion_id uuid;
  v_evaluation_id uuid;
  v_event_id uuid;
  v_episode_id uuid;
  v_latest_evaluation_id uuid;
  v_expected_latest_evaluation_id uuid;
  v_expected_updated_at timestamptz;
  v_occurred_at timestamptz;
  v_source_title text;
  v_source_context jsonb;
  v_ref jsonb;
  v_prior_ref record;
  v_goal record;
  v_milestone record;
  v_criterion record;
  v_evaluation record;
  v_event record;
  v_basis record;
  v_source_type text;
  v_source_id uuid;
  v_action text;
  v_retrospective boolean;
  v_supersedes_reference_id uuid;
  v_reference_group_id uuid;
  v_revision_kind text;
  v_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'GOAL_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_command_id is null or p_request_fingerprint is null or btrim(p_request_fingerprint) = '' then
    raise exception 'GOAL_COMMAND_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select request_fingerprint, result_payload
    into v_existing_fingerprint, v_existing_result
    from public.goal_command_receipts
   where user_id = v_user_id and command_id = p_command_id
   for update;
  if found then
    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception 'GOAL_COMMAND_FINGERPRINT_MISMATCH' using errcode = 'P0001';
    end if;
    return v_existing_result;
  end if;

  v_goal_id := nullif(p_payload->>'goal_id', '')::uuid;
  v_milestone_id := nullif(p_payload->>'milestone_id', '')::uuid;
  v_criterion_id := nullif(p_payload->>'criterion_id', '')::uuid;
  v_occurred_at := coalesce(nullif(p_payload->>'occurred_at', '')::timestamptz, v_now);
  v_expected_updated_at := nullif(p_payload->>'expected_updated_at', '')::timestamptz;

  if p_command_kind in ('milestone.achieve', 'milestone.reopen') then
    select m.id, m.status, m.updated_at, m.title, m.description, g.title as goal_title
      into v_milestone
      from public.goal_milestones m
      join public.goals g on g.user_id = m.user_id and g.id = m.goal_id
     where m.user_id = v_user_id and m.goal_id = v_goal_id and m.id = v_milestone_id and m.archived_at is null and g.archived_at is null
     for update of m, g;
    if not found then raise exception 'GOAL_MILESTONE_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_expected_updated_at is not null and v_milestone.updated_at is distinct from v_expected_updated_at then
      raise exception 'GOAL_STALE_STATE' using errcode = 'P0001';
    end if;
    if p_command_kind = 'milestone.achieve' then
      if v_milestone.status <> 'active' then raise exception 'GOAL_MILESTONE_ACHIEVE_REQUIRES_ACTIVE' using errcode = 'P0001'; end if;
      v_episode_id := gen_random_uuid();
      insert into public.goal_milestone_achievement_events (
        user_id, goal_id, goal_milestone_id, episode_id, event_type, occurred_at,
        goal_title_snapshot, goal_milestone_title_snapshot, goal_milestone_description_snapshot,
        prior_status, resulting_status, note, command_id
      ) values (
        v_user_id, v_goal_id, v_milestone_id, v_episode_id, 'achieved', v_occurred_at,
        v_milestone.goal_title, v_milestone.title, v_milestone.description,
        v_milestone.status, 'achieved', nullif(p_payload->>'note', ''), p_command_id
      ) returning id into v_event_id;
      update public.goal_milestones set status = 'achieved' where user_id = v_user_id and id = v_milestone_id;
      v_result := jsonb_build_object('event_id', v_event_id, 'episode_id', v_episode_id, 'milestone_id', v_milestone_id);
    else
      select e.episode_id into v_episode_id
        from public.goal_milestone_achievement_events e
       where e.user_id = v_user_id and e.goal_milestone_id = v_milestone_id and e.event_type = 'achieved'
         and not exists (
           select 1 from public.goal_milestone_achievement_events r
            where r.user_id = e.user_id and r.goal_milestone_id = e.goal_milestone_id
              and r.episode_id = e.episode_id and r.event_type = 'reopened'
         )
       order by e.occurred_at desc nulls last, e.recorded_at desc, e.id desc
       limit 1;
      if v_episode_id is null then raise exception 'GOAL_MILESTONE_OPEN_EPISODE_NOT_FOUND' using errcode = 'P0001'; end if;
      insert into public.goal_milestone_achievement_events (
        user_id, goal_id, goal_milestone_id, episode_id, event_type, occurred_at,
        goal_title_snapshot, goal_milestone_title_snapshot, goal_milestone_description_snapshot,
        prior_status, resulting_status, note, command_id
      ) values (
        v_user_id, v_goal_id, v_milestone_id, v_episode_id, 'reopened', v_occurred_at,
        null, null, null,
        v_milestone.status, 'active', nullif(p_payload->>'note', ''), p_command_id
      ) returning id into v_event_id;
      update public.goal_milestones set status = 'active' where user_id = v_user_id and id = v_milestone_id;
      v_result := jsonb_build_object('event_id', v_event_id, 'episode_id', v_episode_id, 'milestone_id', v_milestone_id);
    end if;

  elsif p_command_kind = 'milestone.amend' then
    select e.*
      into v_event
      from public.goal_milestone_achievement_events e
     where e.user_id = v_user_id
       and e.id = nullif(p_payload->>'event_id', '')::uuid
       and e.goal_id = v_goal_id
       and e.goal_milestone_id = v_milestone_id
       and e.event_type in ('achieved', 'reopened', 'amended')
     for update;
    if not found then raise exception 'GOAL_MILESTONE_EVENT_NOT_FOUND' using errcode = 'P0002'; end if;
    if length(btrim(coalesce(p_payload->>'correction_reason', ''))) = 0 then
      raise exception 'GOAL_EVENT_CORRECTION_REASON_REQUIRED' using errcode = 'P0001';
    end if;
    insert into public.goal_milestone_achievement_events (
      user_id, goal_id, goal_milestone_id, episode_id, event_type, occurred_at,
      goal_title_snapshot, goal_milestone_title_snapshot, goal_milestone_description_snapshot,
      prior_status, resulting_status, note, legacy_state, corrects_event_id,
      correction_reason, retrospective, command_id
    ) values (
      v_user_id, v_event.goal_id, v_event.goal_milestone_id, v_event.episode_id, 'amended',
      coalesce(nullif(p_payload->>'occurred_at', '')::timestamptz, v_event.occurred_at),
      v_event.goal_title_snapshot, v_event.goal_milestone_title_snapshot,
      v_event.goal_milestone_description_snapshot, v_event.prior_status,
      v_event.resulting_status, coalesce(nullif(p_payload->>'note', ''), v_event.note),
      v_event.legacy_state, v_event.id, p_payload->>'correction_reason',
      coalesce((p_payload->>'retrospective')::boolean, false), p_command_id
    ) returning id into v_event_id;
    v_result := jsonb_build_object('event_id', v_event_id, 'episode_id', v_event.episode_id, 'milestone_id', v_milestone_id);

  elsif p_command_kind in ('criterion.evaluate', 'criterion.correct', 'criterion.retract') then
    select c.* into v_criterion
      from public.goal_outcome_criteria c
      join public.goals g on g.user_id = c.user_id and g.id = c.goal_id
     where c.user_id = v_user_id and c.goal_id = v_goal_id and c.id = v_criterion_id and c.archived_at is null and g.archived_at is null
     for update of c, g;
    if not found then raise exception 'GOAL_CRITERION_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_criterion.goal_id <> v_goal_id then raise exception 'GOAL_CRITERION_GOAL_MISMATCH' using errcode = 'P0001'; end if;
    select e.id into v_latest_evaluation_id
      from public.goal_criterion_evaluations e
     where e.user_id = v_user_id and e.criterion_id = v_criterion_id
     order by e.evaluated_at desc, e.recorded_at desc, e.created_at desc, e.id desc
     limit 1;
    v_expected_latest_evaluation_id := nullif(p_payload->>'expected_latest_evaluation_id', '')::uuid;
    if (v_expected_latest_evaluation_id is null) <> (v_latest_evaluation_id is null)
       or (v_expected_latest_evaluation_id is not null and v_expected_latest_evaluation_id <> v_latest_evaluation_id) then
      raise exception 'GOAL_STALE_STATE' using errcode = 'P0001';
    end if;
    v_revision_kind := case when p_command_kind = 'criterion.correct' then 'correction' when p_command_kind = 'criterion.retract' then 'retraction' else 'evaluation' end;
    insert into public.goal_criterion_evaluations (
      user_id, criterion_id, is_deferred, boolean_value, numeric_value, unit,
      evaluated_at, recorded_at, note, goal_id_snapshot, goal_milestone_id_snapshot,
      criterion_title_snapshot, criterion_type_snapshot, unit_snapshot, target_snapshot,
      direction_snapshot, revision_kind, supersedes_evaluation_id, correction_reason,
      is_retracted, retrospective
    ) values (
      v_user_id, v_criterion_id,
      case when p_command_kind = 'criterion.retract' then false else coalesce((p_payload->>'deferred')::boolean, false) end,
      case when p_command_kind = 'criterion.retract' or coalesce((p_payload->>'deferred')::boolean, false) or v_criterion.criterion_type <> 'boolean' then null else (p_payload->>'boolean_value')::boolean end,
      case when p_command_kind = 'criterion.retract' or coalesce((p_payload->>'deferred')::boolean, false) or v_criterion.criterion_type <> 'numeric' then null else (p_payload->>'numeric_value')::numeric end,
      case when p_command_kind = 'criterion.retract' or coalesce((p_payload->>'deferred')::boolean, false) or v_criterion.criterion_type <> 'numeric' then null else p_payload->>'unit' end,
      v_occurred_at, v_now, nullif(p_payload->>'note', ''), v_criterion.goal_id, v_criterion.goal_milestone_id,
      v_criterion.title, v_criterion.criterion_type, v_criterion.unit, v_criterion.target,
      v_criterion.direction, v_revision_kind, v_latest_evaluation_id, nullif(p_payload->>'correction_reason', ''),
      p_command_kind = 'criterion.retract', coalesce((p_payload->>'retrospective')::boolean, false)
    ) returning id into v_evaluation_id;
    v_result := jsonb_build_object('evaluation_id', v_evaluation_id, 'criterion_id', v_criterion_id);

  elsif p_command_kind = 'criterion.evidence' then
    select e.* into v_evaluation
      from public.goal_criterion_evaluations e
      join public.goal_outcome_criteria c on c.user_id = e.user_id and c.id = e.criterion_id
     where e.user_id = v_user_id and e.id = nullif(p_payload->>'evaluation_id', '')::uuid and c.goal_id = v_goal_id;
    if not found then raise exception 'GOAL_EVALUATION_NOT_FOUND' using errcode = 'P0002'; end if;
    v_action := coalesce(p_payload->>'action', 'attached');
    v_retrospective := coalesce((p_payload->>'retrospective')::boolean, false);
    if v_action not in ('attached', 'replaced', 'withdrawn', 'supplemented') then raise exception 'GOAL_EVIDENCE_ACTION_INVALID' using errcode = 'P0001'; end if;
    if (v_action = 'supplemented') <> v_retrospective then raise exception 'GOAL_RETROSPECTIVE_SUPPLEMENT_REQUIRED' using errcode = 'P0001'; end if;
    for v_ref in select * from jsonb_array_elements(coalesce(p_payload->'references', '[]'::jsonb)) loop
      v_source_type := nullif(v_ref->>'source_type', '');
      v_source_id := nullif(v_ref->>'source_id', '')::uuid;
      v_supersedes_reference_id := nullif(v_ref->>'supersedes_reference_id', '')::uuid;
      v_source_title := null;
      v_source_context := null;
      v_prior_ref := null;
      v_reference_group_id := gen_random_uuid();
      if v_action in ('replaced', 'withdrawn') then
        if v_supersedes_reference_id is null then raise exception 'GOAL_EVIDENCE_REFERENCE_REQUIRED' using errcode = 'P0001'; end if;
        select * into v_prior_ref
          from public.goal_criterion_evaluation_evidence r
         where r.user_id = v_user_id and r.id = v_supersedes_reference_id and r.evaluation_id = v_evaluation.id
         for update;
        if not found then raise exception 'GOAL_EVIDENCE_REFERENCE_NOT_FOUND' using errcode = 'P0002'; end if;
        v_reference_group_id := v_prior_ref.reference_group_id;
        if length(btrim(coalesce(v_ref->>'reason', ''))) = 0 then raise exception 'GOAL_EVIDENCE_REASON_REQUIRED' using errcode = 'P0001'; end if;
        if v_action = 'withdrawn' then
          v_source_type := v_prior_ref.source_type;
          v_source_id := v_prior_ref.source_id;
          v_source_title := v_prior_ref.source_title_snapshot;
          v_source_context := v_prior_ref.source_context_snapshot;
        else
          if v_source_type is null or v_source_id is null then raise exception 'GOAL_EVIDENCE_SOURCE_REQUIRED' using errcode = 'P0001'; end if;
          if v_source_type = v_prior_ref.source_type and v_source_id = v_prior_ref.source_id then raise exception 'GOAL_EVIDENCE_REPLACEMENT_SAME_SOURCE' using errcode = 'P0001'; end if;
          select title, context into v_source_title, v_source_context from public.goal_source_snapshot(v_user_id, v_source_type, v_source_id);
        end if;
      else
        if v_source_type is null or v_source_id is null then raise exception 'GOAL_EVIDENCE_SOURCE_REQUIRED' using errcode = 'P0001'; end if;
        if length(btrim(coalesce(v_ref->>'reason', ''))) = 0 and v_action = 'supplemented' then raise exception 'GOAL_EVIDENCE_REASON_REQUIRED' using errcode = 'P0001'; end if;
        select title, context into v_source_title, v_source_context from public.goal_source_snapshot(v_user_id, v_source_type, v_source_id);
      end if;
      insert into public.goal_criterion_evaluation_evidence (
        user_id, evaluation_id, reference_group_id, reference_action, source_type, source_id,
        source_title_snapshot, source_context_snapshot, supersedes_reference_id, reason,
        retrospective, occurred_at
      ) values (
        v_user_id, v_evaluation.id,
        v_reference_group_id, v_action, v_source_type, v_source_id,
        v_source_title, v_source_context, case when v_action in ('replaced', 'withdrawn') then v_supersedes_reference_id else null end,
        nullif(v_ref->>'reason', ''), v_retrospective, v_occurred_at
      );
      v_count := v_count + 1;
    end loop;
    v_result := jsonb_build_object('evaluation_id', v_evaluation.id, 'references_changed', v_count);

  elsif p_command_kind = 'milestone.evidence' then
    v_action := coalesce(p_payload->>'action', 'attached');
    v_retrospective := coalesce((p_payload->>'retrospective')::boolean, false);
    if v_action not in ('attached', 'replaced', 'withdrawn', 'supplemented') then raise exception 'GOAL_EVIDENCE_ACTION_INVALID' using errcode = 'P0001'; end if;
    if (v_action = 'supplemented') <> v_retrospective then raise exception 'GOAL_RETROSPECTIVE_SUPPLEMENT_REQUIRED' using errcode = 'P0001'; end if;
    if nullif(p_payload->>'achievement_event_id', '') is not null then
      select e.id, e.episode_id
        into v_event_id, v_episode_id
        from public.goal_milestone_achievement_events e
       where e.user_id = v_user_id
         and e.id = (p_payload->>'achievement_event_id')::uuid
         and e.goal_id = v_goal_id
         and e.goal_milestone_id = v_milestone_id
         and e.event_type in ('achieved', 'amended')
         and e.resulting_status = 'achieved'
       for update;
    else
      select e.id, e.episode_id
        into v_event_id, v_episode_id
        from public.goal_milestone_achievement_events e
       where e.user_id = v_user_id
         and e.goal_id = v_goal_id
         and e.goal_milestone_id = v_milestone_id
         and e.event_type = 'achieved'
         and not exists (
           select 1
             from public.goal_milestone_achievement_events r
            where r.user_id = e.user_id
              and r.goal_milestone_id = e.goal_milestone_id
              and r.episode_id = e.episode_id
              and r.event_type = 'reopened'
         )
       order by e.occurred_at desc nulls last, e.recorded_at desc, e.id desc
       limit 1;
    end if;
    if v_event_id is null then raise exception 'GOAL_MILESTONE_OPEN_EPISODE_NOT_FOUND' using errcode = 'P0001'; end if;
    for v_ref in select * from jsonb_array_elements(coalesce(p_payload->'references', '[]'::jsonb)) loop
      v_source_type := nullif(v_ref->>'source_type', '');
      v_source_id := nullif(v_ref->>'source_id', '')::uuid;
      v_supersedes_reference_id := nullif(v_ref->>'supersedes_reference_id', '')::uuid;
      v_source_title := null;
      v_source_context := null;
      v_prior_ref := null;
      v_reference_group_id := gen_random_uuid();
      if v_action in ('replaced', 'withdrawn') then
        if v_supersedes_reference_id is null then raise exception 'GOAL_EVIDENCE_REFERENCE_REQUIRED' using errcode = 'P0001'; end if;
        select * into v_prior_ref
          from public.goal_milestone_achievement_evidence r
         where r.user_id = v_user_id
         and r.id = v_supersedes_reference_id
           and r.achievement_event_id = v_event_id
         for update;
        if not found then raise exception 'GOAL_EVIDENCE_REFERENCE_NOT_FOUND' using errcode = 'P0002'; end if;
        v_reference_group_id := v_prior_ref.reference_group_id;
        if length(btrim(coalesce(v_ref->>'reason', ''))) = 0 then raise exception 'GOAL_EVIDENCE_REASON_REQUIRED' using errcode = 'P0001'; end if;
        if v_action = 'withdrawn' then
          v_source_type := v_prior_ref.source_type;
          v_source_id := v_prior_ref.source_id;
          v_source_title := v_prior_ref.source_title_snapshot;
          v_source_context := v_prior_ref.source_context_snapshot;
        else
          if v_source_type is null or v_source_id is null then raise exception 'GOAL_EVIDENCE_SOURCE_REQUIRED' using errcode = 'P0001'; end if;
          if v_source_type = v_prior_ref.source_type and v_source_id = v_prior_ref.source_id then raise exception 'GOAL_EVIDENCE_REPLACEMENT_SAME_SOURCE' using errcode = 'P0001'; end if;
          select title, context into v_source_title, v_source_context from public.goal_source_snapshot(v_user_id, v_source_type, v_source_id);
        end if;
      else
        if v_source_type is null or v_source_id is null then raise exception 'GOAL_EVIDENCE_SOURCE_REQUIRED' using errcode = 'P0001'; end if;
        if length(btrim(coalesce(v_ref->>'reason', ''))) = 0 and v_action = 'supplemented' then raise exception 'GOAL_EVIDENCE_REASON_REQUIRED' using errcode = 'P0001'; end if;
        select title, context into v_source_title, v_source_context from public.goal_source_snapshot(v_user_id, v_source_type, v_source_id);
      end if;
      insert into public.goal_milestone_achievement_evidence (
        user_id, achievement_event_id, episode_id, reference_group_id, reference_action, source_type, source_id,
        source_title_snapshot, source_context_snapshot, supersedes_reference_id, reason,
        retrospective, occurred_at
      ) values (
        v_user_id, v_event_id, v_episode_id, v_reference_group_id, v_action, v_source_type, v_source_id,
        v_source_title, v_source_context,
        case when v_action in ('replaced', 'withdrawn') then v_supersedes_reference_id else null end,
        nullif(v_ref->>'reason', ''), v_retrospective, v_occurred_at
      );
      v_count := v_count + 1;
    end loop;
    v_result := jsonb_build_object('event_id', v_event_id, 'episode_id', v_episode_id, 'references_changed', v_count);

  elsif p_command_kind = 'goal.amend' then
    select e.*
      into v_event
      from public.goal_achievement_events e
     where e.user_id = v_user_id
       and e.id = nullif(p_payload->>'event_id', '')::uuid
       and e.goal_id = v_goal_id
       and e.event_type in ('achieved', 'reopened', 'amended')
     for update;
    if not found then raise exception 'GOAL_EVENT_NOT_FOUND' using errcode = 'P0002'; end if;
    if length(btrim(coalesce(p_payload->>'correction_reason', ''))) = 0 then
      raise exception 'GOAL_EVENT_CORRECTION_REASON_REQUIRED' using errcode = 'P0001';
    end if;
    insert into public.goal_achievement_events (
      user_id, goal_id, episode_id, event_type, occurred_at, goal_title_snapshot,
      prior_status, resulting_status, achievement_note, legacy_state, corrects_event_id,
      correction_reason, retrospective, command_id
    ) values (
      v_user_id, v_event.goal_id, v_event.episode_id, 'amended',
      coalesce(nullif(p_payload->>'occurred_at', '')::timestamptz, v_event.occurred_at),
      v_event.goal_title_snapshot, v_event.prior_status, v_event.resulting_status,
      coalesce(nullif(p_payload->>'achievement_note', ''), v_event.achievement_note),
      v_event.legacy_state, v_event.id, p_payload->>'correction_reason',
      coalesce((p_payload->>'retrospective')::boolean, false), p_command_id
    ) returning id into v_event_id;
    v_result := jsonb_build_object('event_id', v_event_id, 'episode_id', v_event.episode_id, 'goal_id', v_goal_id);

  elsif p_command_kind = 'goal.evidence' then
    select e.*
      into v_event
      from public.goal_achievement_events e
     where e.user_id = v_user_id
       and e.id = nullif(p_payload->>'achievement_event_id', '')::uuid
       and e.goal_id = v_goal_id
       and e.event_type in ('achieved', 'amended')
       and e.resulting_status = 'achieved'
     for update;
    if not found then raise exception 'GOAL_EVENT_NOT_FOUND' using errcode = 'P0002'; end if;
    v_action := coalesce(p_payload->>'action', 'attached');
    v_retrospective := coalesce((p_payload->>'retrospective')::boolean, false);
    if v_action not in ('attached', 'replaced', 'withdrawn', 'supplemented') then raise exception 'GOAL_EVIDENCE_ACTION_INVALID' using errcode = 'P0001'; end if;
    if (v_action = 'supplemented') <> v_retrospective then raise exception 'GOAL_RETROSPECTIVE_SUPPLEMENT_REQUIRED' using errcode = 'P0001'; end if;
    for v_ref in select * from jsonb_array_elements(coalesce(p_payload->'references', '[]'::jsonb)) loop
      v_source_type := nullif(v_ref->>'source_type', '');
      v_source_id := nullif(v_ref->>'source_id', '')::uuid;
      v_supersedes_reference_id := nullif(v_ref->>'supersedes_reference_id', '')::uuid;
      v_source_title := null;
      v_source_context := null;
      v_prior_ref := null;
      v_reference_group_id := gen_random_uuid();
      if v_action in ('replaced', 'withdrawn') then
        if v_supersedes_reference_id is null then raise exception 'GOAL_EVIDENCE_REFERENCE_REQUIRED' using errcode = 'P0001'; end if;
        select * into v_prior_ref
          from public.goal_achievement_evidence r
         where r.user_id = v_user_id
           and r.id = v_supersedes_reference_id
           and r.achievement_event_id = v_event.id
         for update;
        if not found then raise exception 'GOAL_EVIDENCE_REFERENCE_NOT_FOUND' using errcode = 'P0002'; end if;
        v_reference_group_id := v_prior_ref.reference_group_id;
        if length(btrim(coalesce(v_ref->>'reason', ''))) = 0 then raise exception 'GOAL_EVIDENCE_REASON_REQUIRED' using errcode = 'P0001'; end if;
        if v_action = 'withdrawn' then
          v_source_type := v_prior_ref.source_type;
          v_source_id := v_prior_ref.source_id;
          v_source_title := v_prior_ref.source_title_snapshot;
          v_source_context := v_prior_ref.source_context_snapshot;
        else
          if v_source_type is null or v_source_id is null then raise exception 'GOAL_EVIDENCE_SOURCE_REQUIRED' using errcode = 'P0001'; end if;
          if v_source_type = v_prior_ref.source_type and v_source_id = v_prior_ref.source_id then raise exception 'GOAL_EVIDENCE_REPLACEMENT_SAME_SOURCE' using errcode = 'P0001'; end if;
          select title, context into v_source_title, v_source_context from public.goal_source_snapshot(v_user_id, v_source_type, v_source_id);
        end if;
      else
        if v_source_type is null or v_source_id is null then raise exception 'GOAL_EVIDENCE_SOURCE_REQUIRED' using errcode = 'P0001'; end if;
        if length(btrim(coalesce(v_ref->>'reason', ''))) = 0 and v_action = 'supplemented' then raise exception 'GOAL_EVIDENCE_REASON_REQUIRED' using errcode = 'P0001'; end if;
        select title, context into v_source_title, v_source_context from public.goal_source_snapshot(v_user_id, v_source_type, v_source_id);
      end if;
      insert into public.goal_achievement_evidence (
        user_id, achievement_event_id, reference_group_id, reference_action, source_type, source_id,
        source_title_snapshot, source_context_snapshot, supersedes_reference_id, reason,
        retrospective, occurred_at
      ) values (
        v_user_id, v_event.id, v_reference_group_id, v_action,
        v_source_type, v_source_id, v_source_title, v_source_context,
        case when v_action in ('replaced', 'withdrawn') then v_supersedes_reference_id else null end,
        nullif(v_ref->>'reason', ''), v_retrospective, v_occurred_at
      );
      v_count := v_count + 1;
    end loop;
    v_result := jsonb_build_object('event_id', v_event.id, 'references_changed', v_count);

  elsif p_command_kind in ('goal.achieve', 'goal.reopen') then
    select g.* into v_goal
      from public.goals g
     where g.user_id = v_user_id and g.id = v_goal_id and g.archived_at is null
     for update;
    if not found then raise exception 'GOAL_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_expected_updated_at is not null and v_goal.updated_at is distinct from v_expected_updated_at then
      raise exception 'GOAL_STALE_STATE' using errcode = 'P0001';
    end if;
    if p_command_kind = 'goal.reopen' then
      if v_goal.status <> 'achieved' then raise exception 'GOAL_REOPEN_REQUIRES_ACHIEVED' using errcode = 'P0001'; end if;
      select e.episode_id into v_episode_id
        from public.goal_achievement_events e
       where e.user_id = v_user_id and e.goal_id = v_goal_id and e.event_type = 'achieved'
         and not exists (
           select 1 from public.goal_achievement_events r
            where r.user_id = e.user_id and r.goal_id = e.goal_id and r.episode_id = e.episode_id and r.event_type = 'reopened'
         )
       order by e.occurred_at desc nulls last, e.recorded_at desc, e.id desc
       limit 1;
      if v_episode_id is null then
        raise exception 'GOAL_OPEN_EPISODE_NOT_FOUND' using errcode = 'P0001';
      end if;
      insert into public.goal_achievement_events (
        user_id, goal_id, episode_id, event_type, occurred_at, goal_title_snapshot,
        prior_status, resulting_status,
        achievement_note, legacy_state, command_id
      ) values (
        v_user_id, v_goal_id, v_episode_id, 'reopened', v_occurred_at, null,
        v_goal.status, 'active', v_goal.achievement_note,
        null,
        p_command_id
      ) returning id into v_event_id;
      update public.goals set status = 'active', achieved_at = null, achievement_note = null where user_id = v_user_id and id = v_goal_id;
      v_result := jsonb_build_object('event_id', v_event_id, 'episode_id', v_episode_id, 'goal_id', v_goal_id);
    else
      if v_goal.status <> 'active' then raise exception 'GOAL_ACHIEVEMENT_REQUIRES_ACTIVE' using errcode = 'P0001'; end if;
      if not exists (select 1 from public.goal_outcome_criteria c where c.user_id = v_user_id and c.goal_id = v_goal_id and c.archived_at is null) then
        raise exception 'GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA' using errcode = 'P0001';
      end if;
      if exists (
        select 1 from public.goal_outcome_criteria c
        where c.user_id = v_user_id and c.goal_id = v_goal_id and c.archived_at is null
          and not public.goal_outcome_criterion_is_met(v_user_id, c.id)
      ) then
        raise exception 'GOAL_ACHIEVEMENT_CRITERIA_NOT_MET' using errcode = 'P0001';
      end if;
      if exists (select 1 from public.goal_milestones m where m.user_id = v_user_id and m.goal_id = v_goal_id and m.archived_at is null and m.status <> 'achieved') then
        raise exception 'GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED' using errcode = 'P0001';
      end if;
      v_episode_id := gen_random_uuid();
      insert into public.goal_achievement_events (
        user_id, goal_id, episode_id, event_type, occurred_at, goal_title_snapshot,
        prior_status, resulting_status,
        achievement_note, command_id
      ) values (
        v_user_id, v_goal_id, v_episode_id, 'achieved', v_occurred_at, v_goal.title,
        v_goal.status, 'achieved', nullif(p_payload->>'note', ''), p_command_id
      ) returning id into v_event_id;
      for v_basis in
        select c.id, c.title, c.criterion_type, c.goal_milestone_id, c.unit, c.target, c.direction, e.id as evaluation_id, e.evaluated_at, e.is_deferred, e.is_retracted, e.boolean_value, e.numeric_value
          from public.goal_outcome_criteria c
          left join lateral (
            select e.* from public.goal_criterion_evaluations e
             where e.user_id = v_user_id and e.criterion_id = c.id
             order by e.evaluated_at desc, e.recorded_at desc, e.created_at desc, e.id desc
             limit 1
          ) e on true
         where c.user_id = v_user_id and c.goal_id = v_goal_id and c.archived_at is null
         order by c.created_at, c.id
         for update of c
      loop
        insert into public.goal_achievement_criterion_basis (
          user_id, achievement_event_id, criterion_id, evaluation_id, criterion_title_snapshot,
          criterion_type_snapshot, goal_milestone_id_snapshot, unit_snapshot, target_snapshot,
          direction_snapshot, evaluation_state_snapshot, evaluation_occurred_at
        ) values (
          v_user_id, v_event_id, v_basis.id, v_basis.evaluation_id, v_basis.title,
          v_basis.criterion_type, v_basis.goal_milestone_id, v_basis.unit, v_basis.target,
          v_basis.direction,
          case when v_basis.is_retracted or v_basis.is_deferred then 'not_met' when v_basis.criterion_type = 'boolean' and v_basis.boolean_value then 'met' else 'met' end,
          v_basis.evaluated_at
        );
      end loop;
      for v_basis in
        select m.id, m.title, m.status,
          (select e.episode_id from public.goal_milestone_achievement_events e
            where e.user_id = v_user_id and e.goal_milestone_id = m.id and e.event_type = 'achieved'
              and not exists (select 1 from public.goal_milestone_achievement_events r where r.user_id = e.user_id and r.goal_milestone_id = e.goal_milestone_id and r.episode_id = e.episode_id and r.event_type = 'reopened')
            order by e.occurred_at desc nulls last, e.recorded_at desc, e.id desc limit 1) as achievement_episode_id
          from public.goal_milestones m
         where m.user_id = v_user_id and m.goal_id = v_goal_id and m.archived_at is null
         order by m.sort_order, m.id
         for update of m
      loop
        insert into public.goal_achievement_milestone_basis (
          user_id, achievement_event_id, milestone_id, achievement_episode_id,
          milestone_title_snapshot, resulting_status_snapshot, legacy_state
        ) values (
          v_user_id, v_event_id, v_basis.id, v_basis.achievement_episode_id,
          v_basis.title, v_basis.status,
          case when v_basis.achievement_episode_id is null then jsonb_build_object('legacy_state', true, 'reason', 'Milestone is currently achieved but its transition predates Slice-1 history.') else null end
        );
      end loop;
      for v_ref in select * from jsonb_array_elements(coalesce(p_payload->'references', '[]'::jsonb)) loop
        v_source_type := v_ref->>'source_type';
        v_source_id := (v_ref->>'source_id')::uuid;
        select title, context into v_source_title, v_source_context from public.goal_source_snapshot(v_user_id, v_source_type, v_source_id);
        insert into public.goal_achievement_evidence (
          user_id, achievement_event_id, reference_action, source_type, source_id,
          source_title_snapshot, source_context_snapshot, reason, occurred_at
        ) values (
          v_user_id, v_event_id, 'attached', v_source_type, v_source_id,
          v_source_title, v_source_context, nullif(v_ref->>'reason', ''), v_occurred_at
        );
      end loop;
      update public.goals set status = 'achieved', achieved_at = v_occurred_at, achievement_note = nullif(p_payload->>'note', '') where user_id = v_user_id and id = v_goal_id;
      v_result := jsonb_build_object('event_id', v_event_id, 'episode_id', v_episode_id, 'goal_id', v_goal_id);
    end if;

  elsif p_command_kind = 'project.context.create' then
    select g.id into v_goal_id from public.goals g where g.user_id = v_user_id and g.id = v_goal_id and g.archived_at is null for update;
    if not found then raise exception 'GOAL_NOT_FOUND' using errcode = 'P0002'; end if;
    select m.id into v_milestone_id from public.goal_milestones m where m.user_id = v_user_id and m.goal_id = v_goal_id and m.id = nullif(p_payload->>'milestone_id', '')::uuid and m.archived_at is null and m.status <> 'archived' for update;
    if not found then raise exception 'GOAL_MILESTONE_NOT_FOUND' using errcode = 'P0002'; end if;
    if nullif(p_payload->>'area_id', '') is not null and not exists (select 1 from public.areas a where a.user_id = v_user_id and a.id = (p_payload->>'area_id')::uuid and a.archived_at is null) then raise exception 'GOAL_CONTEXT_AREA_INVALID' using errcode = 'P0001'; end if;
    insert into public.projects (user_id, area_id, goal_id, title, description, status, priority, next_step, target_date)
    values (v_user_id, nullif(p_payload->>'area_id', '')::uuid, v_goal_id, btrim(p_payload->>'title'), nullif(p_payload->>'description', ''), coalesce(nullif(p_payload->>'status', '')::public.project_status, 'idea'), coalesce(nullif(p_payload->>'priority', '')::public.task_priority, 'P2'), nullif(p_payload->>'next_step', ''), nullif(p_payload->>'target_date', '')::date)
    returning id into v_event_id;
    insert into public.goal_milestone_project_support (user_id, goal_id, goal_milestone_id, project_id)
    values (v_user_id, v_goal_id, v_milestone_id, v_event_id)
    returning id into v_evaluation_id;
    v_result := jsonb_build_object('project_id', v_event_id, 'support_id', v_evaluation_id, 'goal_id', v_goal_id, 'milestone_id', v_milestone_id);

  elsif p_command_kind = 'task.context.create' then
    select g.id into v_goal_id from public.goals g where g.user_id = v_user_id and g.id = v_goal_id and g.archived_at is null for update;
    if not found then raise exception 'GOAL_NOT_FOUND' using errcode = 'P0002'; end if;
    select m.id into v_milestone_id from public.goal_milestones m where m.user_id = v_user_id and m.goal_id = v_goal_id and m.id = nullif(p_payload->>'milestone_id', '')::uuid and m.archived_at is null and m.status <> 'archived' for update;
    if not found then raise exception 'GOAL_MILESTONE_NOT_FOUND' using errcode = 'P0002'; end if;
    if nullif(p_payload->>'area_id', '') is not null and not exists (select 1 from public.areas a where a.user_id = v_user_id and a.id = (p_payload->>'area_id')::uuid and a.archived_at is null) then raise exception 'GOAL_CONTEXT_AREA_INVALID' using errcode = 'P0001'; end if;
    insert into public.tasks (user_id, area_id, title, description, status, priority, energy, goal_id, planned_date, duration_minutes, due_at)
    values (v_user_id, nullif(p_payload->>'area_id', '')::uuid, btrim(p_payload->>'title'), nullif(p_payload->>'description', ''), 'planned', coalesce(nullif(p_payload->>'priority', '')::public.task_priority, 'P2'), nullif(p_payload->>'energy', '')::public.task_energy, v_goal_id, nullif(p_payload->>'planned_date', '')::date, nullif(p_payload->>'duration_minutes', '')::integer, nullif(p_payload->>'due_at', '')::timestamptz)
    returning id into v_event_id;
    insert into public.goal_milestone_task_support (user_id, goal_id, goal_milestone_id, task_id)
    values (v_user_id, v_goal_id, v_milestone_id, v_event_id)
    returning id into v_evaluation_id;
    v_result := jsonb_build_object('task_id', v_event_id, 'support_id', v_evaluation_id, 'goal_id', v_goal_id, 'milestone_id', v_milestone_id);
  else
    raise exception 'GOAL_COMMAND_KIND_INVALID' using errcode = 'P0001';
  end if;

  insert into public.goal_command_receipts (user_id, command_id, command_kind, request_fingerprint, result_payload)
  values (v_user_id, p_command_id, p_command_kind, p_request_fingerprint, v_result);
  return v_result;
end;
$$;

grant execute on function public.execute_goal_command(text, uuid, text, jsonb) to authenticated;
revoke all on function public.goal_source_snapshot(uuid, text, uuid) from public, anon, authenticated;

comment on table public.goal_milestone_achievement_events is
  'Append-only Slice-1 Etappe achievement/reopen episodes. Current milestone status remains canonical for present behavior.';
comment on table public.goal_achievement_events is
  'Append-only Slice-1 Goal achievement/reopen episodes with exact criterion and Etappe basis.';
comment on table public.goal_criterion_evaluation_evidence is
  'Decision-specific Goal Criterion evidence; Skill Evidence is intentionally not an allowed source type in Slice 1.';
