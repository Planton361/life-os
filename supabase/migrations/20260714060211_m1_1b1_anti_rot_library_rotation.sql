create table public.anti_rot_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  category text check (category is null or category in ('movement','social','creative','outside','learning','reset','custom')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  energy text check (energy is null or energy in ('low','medium','high')),
  status text not null default 'active' check (status in ('active','paused')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.anti_rot_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_id uuid not null references public.anti_rot_actions(id) on delete restrict,
  event_type text not null check (event_type in ('recommended','completed','skipped')),
  recommendation_event_id uuid references public.anti_rot_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint anti_rot_event_shape check (
    (event_type = 'recommended' and recommendation_event_id is null)
    or (event_type in ('completed','skipped') and recommendation_event_id is not null)
  )
);

create unique index anti_rot_events_one_resolution on public.anti_rot_events(recommendation_event_id) where recommendation_event_id is not null;
create index anti_rot_actions_user_state on public.anti_rot_actions(user_id, archived_at, status, updated_at desc);
create index anti_rot_events_user_history on public.anti_rot_events(user_id, created_at desc, id desc);
create index anti_rot_events_action on public.anti_rot_events(action_id, created_at desc);

create trigger anti_rot_actions_set_updated_at before update on public.anti_rot_actions
for each row execute function public.set_updated_at();

alter table public.anti_rot_actions enable row level security;
alter table public.anti_rot_events enable row level security;

create policy anti_rot_actions_select_own on public.anti_rot_actions for select to authenticated using (user_id = auth.uid());
create policy anti_rot_actions_insert_own on public.anti_rot_actions for insert to authenticated with check (user_id = auth.uid());
create policy anti_rot_actions_update_own on public.anti_rot_actions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy anti_rot_events_select_own on public.anti_rot_events for select to authenticated using (user_id = auth.uid());
create policy anti_rot_events_insert_own on public.anti_rot_events for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.anti_rot_actions a where a.id = action_id and a.user_id = auth.uid())
);

grant select, insert, update on public.anti_rot_actions to authenticated;
grant select on public.anti_rot_events to authenticated;

create function public.rotate_anti_rot_action() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_open public.anti_rot_events%rowtype;
  v_action_id uuid;
  v_event_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('anti-rot:' || v_user::text, 0));

  select r.* into v_open
  from public.anti_rot_events r
  where r.user_id = v_user and r.event_type = 'recommended'
    and not exists (select 1 from public.anti_rot_events x where x.recommendation_event_id = r.id)
  order by r.created_at desc, r.id desc limit 1 for update;

  if v_open.id is not null then
    insert into public.anti_rot_events(user_id, action_id, event_type, recommendation_event_id)
    values (v_user, v_open.action_id, 'skipped', v_open.id)
    on conflict (recommendation_event_id) where recommendation_event_id is not null do nothing;
  end if;

  select a.id into v_action_id
  from public.anti_rot_actions a
  where a.user_id = v_user and a.status = 'active' and a.archived_at is null
  order by
    case when a.id = v_open.action_id and exists (
      select 1 from public.anti_rot_actions alt
      where alt.user_id = v_user and alt.status = 'active' and alt.archived_at is null and alt.id <> a.id
    ) then 1 else 0 end,
    (select max(e.created_at) from public.anti_rot_events e where e.action_id = a.id and e.event_type in ('recommended','completed')) asc nulls first,
    a.created_at asc, a.id asc
  limit 1;

  if v_action_id is null then raise exception 'No active Anti-Rot action available'; end if;
  insert into public.anti_rot_events(user_id, action_id, event_type)
  values (v_user, v_action_id, 'recommended') returning id into v_event_id;
  return v_event_id;
end; $$;

create function public.resolve_anti_rot_recommendation(p_recommendation_event_id uuid, p_event_type text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_recommendation public.anti_rot_events%rowtype;
  v_existing uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_event_type not in ('completed','skipped') then raise exception 'Invalid resolution'; end if;
  perform pg_advisory_xact_lock(hashtextextended('anti-rot:' || v_user::text, 0));
  select id into v_existing from public.anti_rot_events where recommendation_event_id = p_recommendation_event_id;
  if v_existing is not null then return v_existing; end if;
  select * into v_recommendation from public.anti_rot_events
  where id = p_recommendation_event_id and user_id = v_user and event_type = 'recommended' for update;
  if v_recommendation.id is null then raise exception 'Recommendation unavailable'; end if;
  insert into public.anti_rot_events(user_id, action_id, event_type, recommendation_event_id)
  values (v_user, v_recommendation.action_id, p_event_type, v_recommendation.id)
  returning id into v_existing;
  return v_existing;
end; $$;

revoke all on function public.rotate_anti_rot_action() from public;
revoke all on function public.resolve_anti_rot_recommendation(uuid, text) from public;
grant execute on function public.rotate_anti_rot_action() to authenticated;
grant execute on function public.resolve_anti_rot_recommendation(uuid, text) to authenticated;
