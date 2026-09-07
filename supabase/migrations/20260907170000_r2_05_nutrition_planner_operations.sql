-- Existing meals remain the only planner records. One transaction protects a
-- week draft and source-linked moves; no slot uniqueness or swap is invented.
create or replace function public.apply_nutrition_plan(p_operations jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  op jsonb;
  v_meal public.meals;
  v_task public.tasks;
  v_id uuid;
  v_date date;
  v_type text;
  v_time timestamptz;
  v_timezone text;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_operations is null or jsonb_typeof(p_operations) <> 'array' or jsonb_array_length(p_operations) not between 1 and 21 then
    raise exception 'invalid plan';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nutrition-plan:' || v_user::text, 0));
  select coalesce(timezone, 'Europe/Berlin') into v_timezone from public.profiles where id = v_user;
  v_timezone := coalesce(v_timezone, 'Europe/Berlin');
  for op in select value from jsonb_array_elements(p_operations) loop
    v_id := (op->>'id')::uuid;
    if v_id is null or op->>'kind' is null or op->>'kind' not in ('assign', 'move', 'remove') then raise exception 'invalid operation'; end if;
    if op->>'kind' <> 'assign' then
      -- Match the lock order of the established source scheduling boundary.
      perform pg_advisory_xact_lock(hashtextextended('meal:' || v_id::text, 0));
      select * into v_meal from public.meals where id = v_id and user_id = v_user for update;
      if not found then raise exception 'meal unavailable'; end if;
      if v_meal.completed_at is not null then raise exception 'completed meal cannot be planned'; end if;
      if (op->>'expectedUpdatedAt')::timestamptz is distinct from v_meal.updated_at then raise exception 'stale meal'; end if;
    end if;
    if op->>'kind' = 'remove' then
      select t.* into v_task from public.tasks t join public.schedule_source_links l on l.task_id = t.id and l.user_id = t.user_id
        where l.user_id = v_user and l.source_type = 'meal' and l.source_id = v_id for update of t;
      if found then
        update public.tasks set status = 'archived', archived_at = now(), updated_at = now() where id = v_task.id and user_id = v_user;
        delete from public.schedule_source_links where user_id = v_user and source_type = 'meal' and source_id = v_id;
      end if;
      delete from public.meals where id = v_id and user_id = v_user;
      continue;
    end if;
    v_date := (op->>'date')::date;
    v_type := op->>'mealType';
    if v_date is null or v_type is null or v_type not in ('breakfast', 'lunch', 'dinner') then raise exception 'invalid slot'; end if;
    if exists (select 1 from public.meals where user_id = v_user and date = v_date and meal_type::text = v_type and id <> v_id) then
      raise exception 'occupied slot';
    end if;
    if op->>'kind' = 'assign' then
      if not exists (select 1 from public.recipes where id = (op->>'recipeId')::uuid and user_id = v_user and not is_archived) then raise exception 'recipe unavailable'; end if;
      if exists (select 1 from public.meals where id = v_id) then raise exception 'stale plan'; end if;
      insert into public.meals (id, user_id, date, meal_type, recipe_id, title, servings)
        select v_id, v_user, v_date, v_type, id, title, 1 from public.recipes where id = (op->>'recipeId')::uuid and user_id = v_user;
    else
      select t.* into v_task from public.tasks t join public.schedule_source_links l on l.task_id = t.id and l.user_id = t.user_id
        where l.user_id = v_user and l.source_type = 'meal' and l.source_id = v_id;
      v_time := case when v_meal.planned_at is null then null else (v_date + (v_meal.planned_at at time zone v_timezone)::time) at time zone v_timezone end;
      if v_task.id is not null then
        if v_task.scheduled_start_at is not null then
          perform public.schedule_linked_source('meal', v_id, v_date, v_time, v_task.duration_minutes);
        else
          perform public.unschedule_linked_meal_task(v_task.id, v_date, v_task.duration_minutes);
        end if;
      end if;
      update public.meals set date = v_date, meal_type = v_type, planned_at = v_time, updated_at = now() where id = v_id and user_id = v_user;
    end if;
  end loop;
end;
$$;
revoke all on function public.apply_nutrition_plan(jsonb) from public, anon;
grant execute on function public.apply_nutrition_plan(jsonb) to authenticated;
