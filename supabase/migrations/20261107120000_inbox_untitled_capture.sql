-- #192: an unprocessed Quick Thought keeps its full text in body with no
-- invented title. A title is required only when a target object is created.
-- preserve_inbox_original_capture already keeps original_title/original_body
-- immutable when original_title is NULL. Local migration only; no remote push.
alter table public.inbox_items alter column title drop not null;
alter table public.inbox_items drop constraint inbox_items_title_not_blank;
alter table public.inbox_items
  add constraint inbox_items_title_not_blank check (title is null or length(btrim(title)) > 0),
  add constraint inbox_items_capture_content check (title is not null or length(btrim(coalesce(body, ''))) > 0);

-- Blank Clean Title is saved as NULL; a provided title keeps the 2-character minimum.
create or replace function public.save_inbox_clarification(
  p_inbox_item_id uuid, p_expected_updated_at timestamptz, p_title text,
  p_body text, p_next_action text, p_missing_info text, p_priority public.task_priority,
  p_energy public.task_energy, p_duration_minutes integer, p_area_id uuid,
  p_review_needed boolean, p_today_candidate boolean, p_deadline_hint date
) returns public.inbox_items language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_item public.inbox_items%rowtype;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_item from public.inbox_items
    where id = p_inbox_item_id and user_id = v_user and archived_at is null
    and status in ('raw', 'clarified') for update;
  if not found then raise exception 'Open inbox item unavailable' using errcode = 'P0002'; end if;
  if p_expected_updated_at is null or v_item.updated_at <> p_expected_updated_at then
    raise exception 'Inbox item changed; reload before saving' using errcode = 'PT409';
  end if;
  if length(btrim(p_title)) = 1 then raise exception 'Title too short' using errcode = '23514'; end if;
  if p_area_id is not null and not exists (
    select 1 from public.areas where id = p_area_id and user_id = v_user and archived_at is null
  ) then raise exception 'Area unavailable' using errcode = '23514'; end if;
  update public.inbox_items set title = nullif(btrim(p_title), ''), body = nullif(btrim(p_body), ''),
    next_action = nullif(btrim(p_next_action), ''), missing_info = nullif(btrim(p_missing_info), ''),
    priority = p_priority, energy = p_energy, duration_minutes = p_duration_minutes,
    area_id = p_area_id, review_needed = p_review_needed, today_candidate = p_today_candidate,
    deadline_hint = p_deadline_hint, status = 'clarified'
    where id = v_item.id and user_id = v_user returning * into v_item;
  return v_item;
end;
$$;
revoke all on function public.save_inbox_clarification(uuid,timestamptz,text,text,text,text,public.task_priority,public.task_energy,integer,uuid,boolean,boolean,date) from public, anon;
grant execute on function public.save_inbox_clarification(uuid,timestamptz,text,text,text,text,public.task_priority,public.task_energy,integer,uuid,boolean,boolean,date) to authenticated;

-- An untitled capture may only be archived; every target route needs a title.
create or replace function public.route_saved_inbox_item(
  p_inbox_item_id uuid, p_expected_updated_at timestamptz, p_route text, p_target_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_item public.inbox_items%rowtype;
  v_task public.tasks%rowtype;
  v_resource public.resources%rowtype;
  v_target uuid;
  v_kind text;
  v_zone text;
  v_description text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_item from public.inbox_items
    where id = p_inbox_item_id and user_id = v_user and archived_at is null
    and status in ('raw', 'clarified') for update;
  if not found then raise exception 'Open inbox item unavailable' using errcode = 'P0002'; end if;
  if p_expected_updated_at is null or v_item.updated_at <> p_expected_updated_at then
    raise exception 'Inbox item changed; reload before routing' using errcode = 'PT409';
  end if;
  if v_item.title is null and p_route <> 'archive' then
    raise exception 'Title required for target route' using errcode = 'PT422';
  end if;
  if v_item.area_id is not null and not exists (
    select 1 from public.areas where id = v_item.area_id and user_id = v_user and archived_at is null
  ) then raise exception 'Area unavailable' using errcode = '23514'; end if;
  select timezone into v_zone from public.profiles where id = v_user;
  v_zone := coalesce(v_zone, 'Europe/Berlin');
  v_description := nullif(concat_ws(E'\n\n', nullif(v_item.body,''),
    case when nullif(v_item.missing_info,'') is not null then 'Missing Info: ' || v_item.missing_info end,
    case when nullif(v_item.next_action,'') is not null then 'Nächste Aktion: ' || v_item.next_action end), '');
  if p_route in ('task','existing_project','existing_goal','existing_skill') then
    if p_route <> 'task' and p_target_id is null then raise exception 'Target required' using errcode = '23514'; end if;
    v_task := public.triage_inbox_item_to_task(
      p_inbox_item_id := v_item.id, p_title := v_item.title, p_description := v_description,
      p_area_id := v_item.area_id, p_priority := v_item.priority, p_energy := v_item.energy,
      p_duration_minutes := v_item.duration_minutes,
      p_planned_date := case when v_item.today_candidate then (now() at time zone v_zone)::date end,
      p_due_at := case when v_item.deadline_hint is not null then (v_item.deadline_hint + time '23:59:59') at time zone v_zone end,
      p_project_id := case when p_route = 'existing_project' then p_target_id end,
      p_goal_id := case when p_route = 'existing_goal' then p_target_id end,
      p_skill_id := case when p_route = 'existing_skill' then p_target_id end
    );
    v_target := v_task.id; v_kind := 'task';
  elsif p_route = 'project' then
    insert into public.projects(user_id, area_id, title, description, next_step, priority, target_date)
      values(v_user, v_item.area_id, v_item.title,
        nullif(concat_ws(E'\n\n',v_item.body,case when v_item.missing_info is not null then 'Missing Info: ' || v_item.missing_info end),''),
        v_item.next_action, v_item.priority, v_item.deadline_hint) returning id into v_target;
    v_kind := 'project';
  elsif p_route = 'goal' then
    insert into public.goals(user_id, area_id, title, description, target_date)
      values(v_user, v_item.area_id, v_item.title, v_description, v_item.deadline_hint) returning id into v_target;
    v_kind := 'goal';
  elsif p_route in ('resource','note') then
    v_resource := public.create_resource_from_inbox(
      p_inbox_item_id := v_item.id, p_title := v_item.title,
      p_type := (case when p_route = 'note' then 'note' else 'source' end)::public.resource_type,
      p_summary := v_description, p_area_id := v_item.area_id, p_review_needed := v_item.review_needed
    );
    v_target := v_resource.id; v_kind := 'resource';
  elsif p_route = 'archive' then
    v_kind := 'archive';
  else raise exception 'Unsupported route' using errcode = '23514';
  end if;
  if p_route in ('project','goal','archive') then
    update public.inbox_items set status = 'archived', archived_at = now(), processed_at = now()
      where id = v_item.id and user_id = v_user;
  end if;
  return jsonb_build_object('kind', v_kind, 'id', v_target);
end;
$$;
revoke all on function public.route_saved_inbox_item(uuid,timestamptz,text,uuid) from public, anon;
grant execute on function public.route_saved_inbox_item(uuid,timestamptz,text,uuid) to authenticated;
