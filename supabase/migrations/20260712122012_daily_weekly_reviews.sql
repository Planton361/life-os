create type public.review_kind as enum ('daily', 'weekly');
create type public.review_record_status as enum ('draft', 'completed', 'archived');
create type public.review_task_decision as enum ('carry_forward');

create table public.review_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.review_kind not null,
  period_start date not null,
  period_end date not null,
  timezone text not null,
  status public.review_record_status not null default 'draft',
  outcome text,
  wins text[] not null default '{}',
  blockers text[] not null default '{}',
  open_loops text[] not null default '{}',
  next_period_focus text,
  planning_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint review_records_period_order check (period_end >= period_start),
  constraint review_records_timezone_not_blank check (length(btrim(timezone)) > 0)
);

create unique index review_records_user_kind_period_active_idx
  on public.review_records (user_id, kind, period_start)
  where archived_at is null;
create index review_records_user_period_idx
  on public.review_records (user_id, period_start desc);

create table public.review_task_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.review_records(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  decision public.review_task_decision not null,
  target_date date not null,
  note text,
  created_at timestamptz not null default now(),
  constraint review_task_decisions_unique unique (review_id, task_id, decision)
);

create index review_task_decisions_user_review_idx
  on public.review_task_decisions (user_id, review_id);

create trigger review_records_set_updated_at
  before update on public.review_records
  for each row execute function public.set_updated_at();

alter table public.review_records enable row level security;
alter table public.review_task_decisions enable row level security;

create policy "Users can select own review_records"
on public.review_records for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own review_records"
on public.review_records for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own review_records"
on public.review_records for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own review_task_decisions"
on public.review_task_decisions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own review_task_decisions"
on public.review_task_decisions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.review_records reviews
    where reviews.id = review_id and reviews.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.tasks tasks
    where tasks.id = task_id and tasks.user_id = (select auth.uid())
  )
);

create policy "Users can update own review_task_decisions"
on public.review_task_decisions for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.review_records reviews
    where reviews.id = review_id and reviews.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.tasks tasks
    where tasks.id = task_id and tasks.user_id = (select auth.uid())
  )
);

grant select, insert, update on table public.review_records to authenticated;
grant select, insert, update on table public.review_task_decisions to authenticated;

create function public.save_review_record(
  p_kind public.review_kind,
  p_period_start date,
  p_period_end date,
  p_timezone text,
  p_status public.review_record_status,
  p_outcome text,
  p_wins text[],
  p_blockers text[],
  p_open_loops text[],
  p_next_period_focus text,
  p_planning_note text
)
returns public.review_records
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved public.review_records;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.review_records (
    user_id, kind, period_start, period_end, timezone, status, outcome,
    wins, blockers, open_loops, next_period_focus, planning_note, completed_at
  ) values (
    current_user_id, p_kind, p_period_start, p_period_end, p_timezone, p_status,
    nullif(btrim(p_outcome), ''), coalesce(p_wins, '{}'),
    coalesce(p_blockers, '{}'), coalesce(p_open_loops, '{}'),
    nullif(btrim(p_next_period_focus), ''), nullif(btrim(p_planning_note), ''),
    case when p_status = 'completed' then now() else null end
  )
  on conflict (user_id, kind, period_start) where archived_at is null
  do update set
    period_end = excluded.period_end,
    timezone = excluded.timezone,
    status = excluded.status,
    outcome = excluded.outcome,
    wins = excluded.wins,
    blockers = excluded.blockers,
    open_loops = excluded.open_loops,
    next_period_focus = excluded.next_period_focus,
    planning_note = excluded.planning_note,
    completed_at = excluded.completed_at
  returning * into saved;

  return saved;
end;
$$;

create function public.save_daily_review_with_carry_over(
  p_period_start date,
  p_timezone text,
  p_status public.review_record_status,
  p_outcome text,
  p_wins text[],
  p_blockers text[],
  p_open_loops text[],
  p_next_period_focus text,
  p_planning_note text,
  p_carry_task_ids uuid[]
)
returns public.review_records
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  carry_ids uuid[] := coalesce(p_carry_task_ids, '{}');
  owned_count integer;
  saved public.review_records;
  target_date date := p_period_start + 1;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select count(*) into owned_count
  from public.tasks
  where user_id = current_user_id
    and id = any(carry_ids)
    and archived_at is null
    and status not in ('done', 'canceled', 'archived');

  if owned_count <> cardinality(carry_ids) then
    raise exception 'one or more carry-over tasks are unavailable';
  end if;

  saved := public.save_review_record(
    'daily', p_period_start, p_period_start, p_timezone, p_status, p_outcome,
    p_wins, p_blockers, p_open_loops, p_next_period_focus, p_planning_note
  );

  update public.tasks
  set planned_date = target_date,
      scheduled_start_at = null,
      updated_at = now()
  where user_id = current_user_id and id = any(carry_ids);

  insert into public.review_task_decisions (
    user_id, review_id, task_id, decision, target_date
  )
  select current_user_id, saved.id, task_id, 'carry_forward', target_date
  from unnest(carry_ids) task_id
  on conflict (review_id, task_id, decision)
  do update set target_date = excluded.target_date;

  return saved;
end;
$$;

revoke all on function public.save_review_record(
  public.review_kind, date, date, text, public.review_record_status, text,
  text[], text[], text[], text, text
) from public;
grant execute on function public.save_review_record(
  public.review_kind, date, date, text, public.review_record_status, text,
  text[], text[], text[], text, text
) to authenticated;

revoke all on function public.save_daily_review_with_carry_over(
  date, text, public.review_record_status, text, text[], text[], text[], text,
  text, uuid[]
) from public;
grant execute on function public.save_daily_review_with_carry_over(
  date, text, public.review_record_status, text, text[], text[], text[], text,
  text, uuid[]
) to authenticated;
