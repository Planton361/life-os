create or replace function public.save_completed_running_session(
  p_session_id uuid,
  p_plan_item_id uuid,
  p_session_date date,
  p_started_at timestamptz,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_average_heart_rate integer,
  p_notes text,
  p_completed_at timestamptz
)
returns public.running_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.running_sessions;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_distance_km <= 0 or p_duration_minutes <= 0 then raise exception 'distance and duration must be positive'; end if;
  if p_plan_item_id is not null and not exists (
    select 1 from public.running_plan_items where id = p_plan_item_id and user_id = v_user_id and archived_at is null
  ) then raise exception 'running plan item not found'; end if;

  if p_session_id is null then
    insert into public.running_sessions (user_id, plan_item_id, session_date, started_at, distance_km,
      duration_minutes, average_heart_rate, notes, status, completed_at)
    values (v_user_id, p_plan_item_id, p_session_date, p_started_at, p_distance_km,
      p_duration_minutes, p_average_heart_rate, p_notes, 'completed', p_completed_at)
    returning * into v_session;
  else
    update public.running_sessions set plan_item_id = p_plan_item_id, session_date = p_session_date,
      started_at = p_started_at, distance_km = p_distance_km, duration_minutes = p_duration_minutes,
      average_heart_rate = p_average_heart_rate, notes = p_notes, status = 'completed',
      completed_at = p_completed_at, updated_at = now()
    where id = p_session_id and user_id = v_user_id and archived_at is null returning * into v_session;
    if v_session.id is null then raise exception 'running session not found'; end if;
  end if;

  if v_session.plan_item_id is not null then
    update public.tasks t set status = 'done', completed_at = p_completed_at, updated_at = now()
      from public.schedule_source_links l where l.user_id = v_user_id
      and l.source_type = 'running_plan_item' and l.source_id = v_session.plan_item_id
      and l.task_id = t.id and t.user_id = v_user_id;
  end if;
  return v_session;
end;
$$;

create or replace function public.save_exercise_with_muscles(
  p_exercise_id uuid,
  p_name text,
  p_description text,
  p_equipment text,
  p_muscles text[]
)
returns public.exercises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exercise public.exercises;
  v_muscle text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if coalesce(array_length(p_muscles, 1), 0) < 1 then raise exception 'at least one muscle is required'; end if;
  foreach v_muscle in array p_muscles loop
    if v_muscle not in ('Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves') then
      raise exception 'unsupported muscle group';
    end if;
  end loop;

  if p_exercise_id is null then
    insert into public.exercises (user_id, name, description, equipment)
      values (v_user_id, p_name, p_description, p_equipment) returning * into v_exercise;
  else
    update public.exercises set name = p_name, description = p_description, equipment = p_equipment, updated_at = now()
      where id = p_exercise_id and user_id = v_user_id returning * into v_exercise;
    if v_exercise.id is null then raise exception 'exercise not found'; end if;
  end if;

  delete from public.exercise_muscles where exercise_id = v_exercise.id and user_id = v_user_id;
  insert into public.exercise_muscles (user_id, exercise_id, muscle_group)
    select v_user_id, v_exercise.id, muscle from unnest(p_muscles) muscle;
  return v_exercise;
end;
$$;

revoke all on function public.save_completed_running_session(uuid, uuid, date, timestamptz, numeric, integer, integer, text, timestamptz) from public, anon;
revoke all on function public.save_exercise_with_muscles(uuid, text, text, text, text[]) from public, anon;
grant execute on function public.save_completed_running_session(uuid, uuid, date, timestamptz, numeric, integer, integer, text, timestamptz) to authenticated;
grant execute on function public.save_exercise_with_muscles(uuid, text, text, text, text[]) to authenticated;
