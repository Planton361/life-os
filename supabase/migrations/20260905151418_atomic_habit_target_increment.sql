-- R2-01: serialize the canonical increment for one owned Habit.
-- No counters or new log store: the active local-day logs remain the source.
create function public.increment_habit_for_local_day(p_habit_id uuid)
returns table (status text, log_id uuid, increment_value numeric)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_habit public.habits%rowtype;
  v_timezone text;
  v_date date;
  v_current numeric;
  v_increment numeric;
  v_log_id uuid;
begin
  if v_user is null then
    return query select 'failure'::text, null::uuid, null::numeric;
    return;
  end if;

  -- The lock is held through sum, insert and transaction commit. A waiting
  -- invocation calculates its sum after the preceding invocation commits.
  select h.* into v_habit from public.habits h
    where h.id = p_habit_id and h.user_id = v_user
      and h.profile_id = v_user and h.archived_at is null
    for update;
  if not found then
    return query select 'failure'::text, null::uuid, null::numeric;
    return;
  end if;

  select p.timezone into v_timezone from public.profiles p where p.id = v_user;
  if v_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names z where z.name = v_timezone
  ) then
    return query select 'failure'::text, null::uuid, null::numeric;
    return;
  end if;
  v_date := (current_timestamp at time zone v_timezone)::date;
  select coalesce(sum(l.value), 0) into v_current from public.habit_logs l
    where l.habit_id = v_habit.id and l.user_id = v_user
      and l.local_date = v_date and l.archived_at is null;

  if v_habit.daily_target is not null and v_current >= v_habit.daily_target then
    return query select 'already_at_target'::text, null::uuid, null::numeric;
    return;
  end if;
  v_increment := v_habit.default_increment;
  if v_habit.daily_target is not null then
    v_increment := least(v_increment, v_habit.daily_target - v_current);
  end if;
  if v_increment <= 0 then
    return query select 'failure'::text, null::uuid, null::numeric;
    return;
  end if;

  insert into public.habit_logs (habit_id, user_id, profile_id, local_date, timezone, value)
    values (v_habit.id, v_user, v_user, v_date, v_timezone, v_increment)
    returning id into v_log_id;
  return query select 'incremented'::text, v_log_id, v_increment;
end;
$$;

revoke all on function public.increment_habit_for_local_day(uuid) from public, anon;
grant execute on function public.increment_habit_for_local_day(uuid) to authenticated;
