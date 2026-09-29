-- Project-specific completion. Existing completed rows deliberately receive no history.
do $$begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname='life_os_project_command') then
    create role life_os_project_command nologin nobypassrls;
  end if;
end $$;
grant usage on schema public, auth to life_os_project_command;
grant execute on function auth.uid() to life_os_project_command;
do $$begin
  if not pg_catalog.has_schema_privilege('life_os_project_command','auth','USAGE')
     or not pg_catalog.has_function_privilege('life_os_project_command','auth.uid()','EXECUTE')
     or exists (select 1 from pg_catalog.pg_roles where rolname='life_os_project_command'
       and (rolcanlogin or rolbypassrls or rolsuper)) then
    raise exception 'PROJECT_COMMAND_ROLE_TOPOLOGY_REQUIRED';
  end if;
end $$;

alter table public.projects
  add column desired_result text,
  add column completion_revision bigint not null default 0,
  add column completion_cycle bigint not null default 0,
  add constraint projects_desired_result_shape check (
    desired_result is null or (desired_result = btrim(desired_result) and char_length(desired_result) between 1 and 4000)
  ),
  add constraint projects_completion_tokens check (completion_revision >= 0 and completion_cycle >= 0);

create table public.project_completion_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  text text not null check (text = btrim(text) and char_length(text) between 1 and 1000),
  sort_order bigint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archive_reason text,
  archived_cycle bigint,
  archived_revision bigint,
  constraint project_criterion_archive_shape check (
    (archived_at is null and archive_reason is null and archived_cycle is null and archived_revision is null)
    or (archived_at is not null and archive_reason = btrim(archive_reason)
      and char_length(archive_reason) between 1 and 2000
      and archived_cycle >= 0 and archived_revision >= 0)
  ),
  unique (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects(user_id,id) on delete restrict
);
create index project_criteria_current on public.project_completion_criteria(user_id,project_id,archived_at,sort_order,id);

create table public.project_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  completion_cycle bigint not null check (completion_cycle >= 0),
  completion_revision bigint not null check (completion_revision >= 0),
  decision text not null check (decision in ('completed','continue')),
  prior_status public.project_status not null,
  resulting_status public.project_status not null,
  desired_result_snapshot text,
  rationale text not null check (rationale = btrim(rationale) and char_length(rationale) between 1 and 4000),
  open_work_acknowledged boolean not null default false,
  open_work_disposition text,
  context_fingerprint text not null check (length(context_fingerprint)=32),
  reviewed_at timestamptz not null default now(),
  command_id uuid not null,
  unique (user_id,project_id,id),
  unique (user_id,command_id),
  foreign key (user_id,project_id) references public.projects(user_id,id) on delete restrict,
  check ((decision='completed' and resulting_status='completed') or
    (decision='continue' and resulting_status=prior_status))
);
create index project_reviews_history on public.project_reviews(user_id,project_id,reviewed_at desc,id);
create unique index project_reviews_one_completion_per_cycle
  on public.project_reviews(user_id,project_id,completion_cycle) where decision='completed';

create table public.project_review_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  review_id uuid not null,
  criterion_id uuid not null,
  text_snapshot text not null,
  sort_order_snapshot bigint not null,
  assessment text not null check (assessment in ('satisfied','not_satisfied','not_assessed','excluded')),
  note text,
  archive_reason_snapshot text,
  unique (review_id,criterion_id),
  foreign key (user_id,project_id,review_id) references public.project_reviews(user_id,project_id,id) on delete restrict,
  foreign key (user_id,project_id,criterion_id) references public.project_completion_criteria(user_id,project_id,id) on delete restrict
);

create table public.project_review_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  review_id uuid not null,
  resource_id uuid not null,
  relation_id uuid not null,
  title_snapshot text not null,
  type_snapshot text not null,
  safe_url_snapshot text,
  relation_type_snapshot text not null,
  project_role_snapshot text not null,
  unique (review_id,resource_id),
  foreign key (user_id,project_id,review_id) references public.project_reviews(user_id,project_id,id) on delete restrict
);

create table public.project_review_work (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  review_id uuid not null,
  work_type text not null check (work_type in ('task','milestone')),
  work_id uuid not null,
  title_snapshot text not null,
  status_snapshot text not null,
  archived_at_snapshot timestamptz,
  updated_at_snapshot timestamptz not null,
  unique (review_id,work_type,work_id),
  foreign key (user_id,project_id,review_id) references public.project_reviews(user_id,project_id,id) on delete restrict
);

create table public.project_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  event_type text not null check (event_type in ('reopened','archived')),
  prior_status public.project_status not null,
  resulting_status public.project_status not null,
  completion_cycle bigint not null,
  completion_revision bigint not null,
  occurred_at timestamptz not null default now(),
  command_id uuid not null,
  unique (user_id,command_id),
  foreign key (user_id,project_id) references public.projects(user_id,id) on delete restrict
);
create index project_lifecycle_history on public.project_lifecycle_events(user_id,project_id,occurred_at desc,id);

create table public.project_review_amendments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  review_id uuid not null,
  note text not null check (note=btrim(note) and char_length(note) between 1 and 2000),
  created_at timestamptz not null default now(),
  command_id uuid not null,
  unique (user_id,command_id),
  foreign key (user_id,project_id,review_id) references public.project_reviews(user_id,project_id,id) on delete restrict
);

create table public.project_command_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  command_id uuid not null,
  operation text not null,
  request_fingerprint text not null,
  result_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id,command_id),
  foreign key (user_id,project_id) references public.projects(user_id,id) on delete restrict
);

-- Command-owned tables are readable by their owner, but never directly writable
-- through the Data API. Revoke both table and inherited/default privileges.
do $$
declare v_table text;
begin
  foreach v_table in array array[
    'project_completion_criteria','project_reviews','project_review_criteria',
    'project_review_resources','project_review_work','project_lifecycle_events',
    'project_review_amendments','project_command_receipts'
  ] loop
    execute format('alter table public.%I enable row level security',v_table);
    execute format('revoke all on public.%I from public, anon, authenticated',v_table);
    execute format('grant select on public.%I to authenticated',v_table);
    execute format('create policy project_owner_read on public.%I for select to authenticated using (user_id=(select auth.uid()))',v_table);
    execute format('create policy project_command_read on public.%I for select to life_os_project_command using (user_id=(select auth.uid()))',v_table);
    execute format('create policy project_command_insert on public.%I for insert to life_os_project_command with check (user_id=(select auth.uid()))',v_table);
    execute format('grant select, insert on public.%I to life_os_project_command',v_table);
  end loop;
end $$;
create policy project_command_criterion_update on public.project_completion_criteria
  for update to life_os_project_command using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant update(text,sort_order,updated_at,archived_at,archive_reason,archived_cycle,archived_revision)
  on public.project_completion_criteria to life_os_project_command;

-- Existing Project metadata edits remain available. Terminal lifecycle and
-- completion columns are reserved for the non-privileged command role.
revoke update, delete on public.projects from public, anon, authenticated;
grant update(title,description,area_id,goal_id,priority,progress,next_step,start_date,target_date,repository_url,updated_at)
  on public.projects to authenticated;
grant select on public.projects, public.tasks, public.project_milestones,
  public.resources, public.resource_relations to life_os_project_command;
grant update(status,archived_at,desired_result,completion_cycle,updated_at)
  on public.projects to life_os_project_command;
create policy project_command_project_read on public.projects for select to life_os_project_command
  using (user_id=(select auth.uid()));
create policy project_command_project_update on public.projects for update to life_os_project_command
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy project_command_task_read on public.tasks for select to life_os_project_command
  using (user_id=(select auth.uid()));
create policy project_command_milestone_read on public.project_milestones for select to life_os_project_command
  using (user_id=(select auth.uid()));
create policy project_command_resource_read on public.resources for select to life_os_project_command
  using (user_id=(select auth.uid()));
create policy project_command_relation_read on public.resource_relations for select to life_os_project_command
  using (user_id=(select auth.uid()));

create function public.guard_project_depth_fields() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='INSERT' then
    if current_user='authenticated' and new.status in ('completed','archived') then
      raise exception 'PROJECT_TERMINAL_COMMAND_REQUIRED' using errcode='42501';
    end if;
    return new;
  end if;
  if (new.status,new.archived_at,new.desired_result,new.completion_cycle) is distinct from
     (old.status,old.archived_at,old.desired_result,old.completion_cycle)
     and current_user <> 'life_os_project_command' then
    raise exception 'PROJECT_COMMAND_REQUIRED' using errcode='42501';
  end if;
  if new.completion_revision is distinct from old.completion_revision then
    raise exception 'PROJECT_REVISION_SERVER_OWNED' using errcode='42501';
  end if;
  if old.archived_at is not null and (new.status,new.desired_result,new.completion_cycle) is distinct from
      (old.status,old.desired_result,old.completion_cycle) then
    raise exception 'PROJECT_ARCHIVED' using errcode='23514';
  end if;
  if old.status='completed' and new.desired_result is distinct from old.desired_result then
    raise exception 'PROJECT_COMPLETED_FROZEN' using errcode='23514';
  end if;
  new.completion_revision := old.completion_revision + 1;
  return new;
end $$;
create trigger guard_project_depth_insert before insert on public.projects
  for each row execute function public.guard_project_depth_fields();
create trigger guard_project_depth_update before update on public.projects
  for each row execute function public.guard_project_depth_fields();
revoke all on function public.guard_project_depth_fields() from public, anon, authenticated;

-- A read-only, DB-generated Review context is also the source of the stale
-- fingerprint checked under the Project row lock by the write command.
create function public.project_review_context(p_project_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_project public.projects%rowtype;
  v_criteria jsonb;
  v_work jsonb;
  v_resources jsonb;
  v_context jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_project from public.projects
    where id=p_project_id and user_id=v_user;
  if not found then raise exception 'PROJECT_NOT_FOUND' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'text',c.text,'sort_order',c.sort_order,
    'archived_at',c.archived_at,'archive_reason',c.archive_reason,
    'archived_cycle',c.archived_cycle) order by c.sort_order,c.id),'[]'::jsonb)
    into v_criteria from public.project_completion_criteria c
    where c.user_id=v_user and c.project_id=p_project_id
      and (c.archived_at is null or c.archived_cycle=v_project.completion_cycle);
  select coalesce(jsonb_agg(w.row order by w.work_type,w.id),'[]'::jsonb)
    into v_work from (
      select 'task'::text work_type,t.id,
        jsonb_build_object('type','task','id',t.id,'title',t.title,'status',t.status,
          'archived_at',t.archived_at,'updated_at',t.updated_at,'milestone_id',t.milestone_id) row
      from public.tasks t where t.user_id=v_user and t.project_id=p_project_id
      union all
      select 'milestone'::text,m.id,
        jsonb_build_object('type','milestone','id',m.id,'title',m.title,'status',m.status,
          'archived_at',m.archived_at,'updated_at',m.updated_at) row
      from public.project_milestones m where m.user_id=v_user and m.project_id=p_project_id
    ) w;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'relation_id',rr.id,'title',r.title,'type',r.type,
    'url',r.url,'updated_at',r.updated_at,'role',rr.project_role,
    'relation_type',rr.relation_type) order by r.id,rr.id),'[]'::jsonb)
    into v_resources from public.resource_relations rr
    join public.resources r on r.id=rr.resource_id and r.user_id=rr.user_id
    where rr.user_id=v_user and rr.target_type='project' and rr.target_id=p_project_id
      and r.archived_at is null;
  if jsonb_array_length(v_criteria)>1000 or jsonb_array_length(v_work)>5000
     or jsonb_array_length(v_resources)>1000 then
    raise exception 'PROJECT_CONTEXT_LIMIT' using errcode='54000';
  end if;
  v_context := jsonb_build_object(
    'project_id',v_project.id,'status',v_project.status,
    'archived_at',v_project.archived_at,'desired_result',v_project.desired_result,
    'completion_revision',v_project.completion_revision,
    'completion_cycle',v_project.completion_cycle,
    'criteria',v_criteria,'work',v_work,'resources',v_resources);
  if octet_length(v_context::text)>2097152 then
    raise exception 'PROJECT_CONTEXT_LIMIT' using errcode='54000';
  end if;
  return v_context || jsonb_build_object('fingerprint',md5(v_context::text));
end $$;
alter function public.project_review_context(uuid) owner to life_os_project_command;
revoke all on function public.project_review_context(uuid) from public, anon;
grant execute on function public.project_review_context(uuid) to authenticated;

create function public.project_depth_command(
  p_project_id uuid, p_command_id uuid, p_operation text,
  p_expected_revision bigint, p_expected_cycle bigint, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_project public.projects%rowtype;
  v_receipt public.project_command_receipts%rowtype;
  v_hash text;
  v_context jsonb;
  v_result jsonb;
  v_text text;
  v_id uuid;
  v_review uuid;
  v_row jsonb;
  v_criterion public.project_completion_criteria%rowtype;
  v_assessment text;
  v_note text;
  v_prior public.project_status;
  v_decision text;
  v_open_count integer;
  v_count integer;
  v_resource record;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_project_id is null or p_command_id is null or p_operation is null or p_payload is null
     or p_expected_revision is null or p_expected_cycle is null then
    raise exception 'PROJECT_COMMAND_INVALID' using errcode='22023';
  end if;
  if octet_length(p_payload::text)>1048576 then
    raise exception 'PROJECT_PAYLOAD_LIMIT' using errcode='54000';
  end if;
  if p_operation not in ('result.set','criterion.create','criterion.edit',
      'criterion.reorder','criterion.archive','review.submit','review.amend',
      'project.reopen','project.archive','project.status') then
    raise exception 'PROJECT_OPERATION_INVALID' using errcode='22023';
  end if;
  -- A command UUID is globally unique per owner, including across Projects.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text||p_command_id::text,0));
  v_hash := md5(p_project_id::text||':'||p_operation||':'||p_expected_revision::text||':'||
    p_expected_cycle::text||':'||p_payload::text);
  select * into v_receipt from public.project_command_receipts
    where user_id=v_user and command_id=p_command_id;
  if found then
    if v_receipt.project_id <> p_project_id or v_receipt.operation <> p_operation
       or v_receipt.request_fingerprint <> v_hash then
      raise exception 'PROJECT_COMMAND_KEY_CONFLICT' using errcode='23505';
    end if;
    return v_receipt.result_payload;
  end if;
  select * into v_project from public.projects where id=p_project_id and user_id=v_user for update;
  if not found then raise exception 'PROJECT_NOT_FOUND' using errcode='42501'; end if;
  if (v_project.completion_revision,v_project.completion_cycle) is distinct from
     (p_expected_revision,p_expected_cycle) then
    raise exception 'PROJECT_STALE' using errcode='40001';
  end if;
  if v_project.archived_at is not null then raise exception 'PROJECT_ARCHIVED' using errcode='23514'; end if;
  if p_operation in ('result.set','criterion.create','criterion.edit','criterion.reorder','criterion.archive')
     and v_project.status='completed' then
    raise exception 'PROJECT_COMPLETED_FROZEN' using errcode='23514';
  end if;
  v_result := jsonb_build_object('project_id',p_project_id,'operation',p_operation);

  if p_operation='result.set' then
    v_text := nullif(btrim(p_payload->>'desired_result'),'');
    if v_text is not null and char_length(v_text)>4000 then
      raise exception 'PROJECT_RESULT_INVALID' using errcode='22023';
    end if;
    update public.projects set desired_result=v_text where id=p_project_id and user_id=v_user;

  elsif p_operation='criterion.create' then
    v_text := btrim(p_payload->>'text');
    if v_text is null or char_length(v_text) not between 1 and 1000
       or jsonb_typeof(p_payload->'sort_order') <> 'number'
       or (p_payload->>'sort_order')::bigint < 0 then
      raise exception 'PROJECT_CRITERION_INVALID' using errcode='22023';
    end if;
    if (select count(*) from public.project_completion_criteria
        where user_id=v_user and project_id=p_project_id)>=1000 then
      raise exception 'PROJECT_CRITERION_LIMIT' using errcode='54000';
    end if;
    insert into public.project_completion_criteria(user_id,project_id,text,sort_order)
      values(v_user,p_project_id,v_text,(p_payload->>'sort_order')::bigint) returning id into v_id;
    update public.projects set updated_at=now() where id=p_project_id and user_id=v_user;
    v_result := v_result||jsonb_build_object('criterion_id',v_id);

  elsif p_operation in ('criterion.edit','criterion.reorder','criterion.archive') then
    v_id := (p_payload->>'criterion_id')::uuid;
    select * into v_criterion from public.project_completion_criteria
      where id=v_id and user_id=v_user and project_id=p_project_id and archived_at is null for update;
    if not found then raise exception 'PROJECT_CRITERION_NOT_FOUND' using errcode='42501'; end if;
    if p_operation='criterion.edit' then
      v_text := btrim(p_payload->>'text');
      if v_text is null or char_length(v_text) not between 1 and 1000 then
        raise exception 'PROJECT_CRITERION_INVALID' using errcode='22023';
      end if;
      update public.project_completion_criteria set text=v_text,updated_at=now() where id=v_id;
    elsif p_operation='criterion.reorder' then
      if jsonb_typeof(p_payload->'sort_order') <> 'number' or (p_payload->>'sort_order')::bigint<0 then
        raise exception 'PROJECT_CRITERION_INVALID' using errcode='22023';
      end if;
      update public.project_completion_criteria set sort_order=(p_payload->>'sort_order')::bigint,updated_at=now() where id=v_id;
    else
      v_text := btrim(p_payload->>'reason');
      if v_text is null or char_length(v_text) not between 1 and 2000 then
        raise exception 'PROJECT_ARCHIVE_REASON_REQUIRED' using errcode='22023';
      end if;
      update public.project_completion_criteria set archived_at=now(),archive_reason=v_text,
        archived_cycle=v_project.completion_cycle,
        archived_revision=v_project.completion_revision+1,updated_at=now() where id=v_id;
    end if;
    update public.projects set updated_at=now() where id=p_project_id and user_id=v_user;

  elsif p_operation='project.status' then
    v_text := p_payload->>'status';
    if v_project.status='completed' or v_text not in ('idea','active','paused','blocked') then
      raise exception 'PROJECT_STATUS_CONFLICT' using errcode='23514';
    end if;
    update public.projects set status=v_text::public.project_status where id=p_project_id and user_id=v_user;

  elsif p_operation='project.reopen' then
    if v_project.status <> 'completed' then raise exception 'PROJECT_REOPEN_CONFLICT' using errcode='23514'; end if;
    update public.projects set status='active',completion_cycle=completion_cycle+1
      where id=p_project_id and user_id=v_user;
    insert into public.project_lifecycle_events(user_id,project_id,event_type,prior_status,
      resulting_status,completion_cycle,completion_revision,command_id)
      values(v_user,p_project_id,'reopened','completed','active',v_project.completion_cycle+1,
        v_project.completion_revision+1,p_command_id);

  elsif p_operation='project.archive' then
    v_prior := v_project.status;
    update public.projects set status='archived',archived_at=now()
      where id=p_project_id and user_id=v_user;
    insert into public.project_lifecycle_events(user_id,project_id,event_type,prior_status,
      resulting_status,completion_cycle,completion_revision,command_id)
      values(v_user,p_project_id,'archived',v_prior,'archived',v_project.completion_cycle,
        v_project.completion_revision+1,p_command_id);

  elsif p_operation='review.amend' then
    v_id := (p_payload->>'review_id')::uuid;
    v_text := btrim(p_payload->>'note');
    if v_text is null or char_length(v_text) not between 1 and 2000 then
      raise exception 'PROJECT_AMENDMENT_INVALID' using errcode='22023';
    end if;
    perform 1 from public.project_reviews where id=v_id and user_id=v_user and project_id=p_project_id;
    if not found then raise exception 'PROJECT_REVIEW_NOT_FOUND' using errcode='42501'; end if;
    insert into public.project_review_amendments(user_id,project_id,review_id,note,command_id)
      values(v_user,p_project_id,v_id,v_text,p_command_id) returning id into v_id;
    v_result := v_result||jsonb_build_object('amendment_id',v_id);

  elsif p_operation='review.submit' then
    if v_project.status='completed' then raise exception 'PROJECT_ALREADY_COMPLETED' using errcode='23514'; end if;
    v_context := public.project_review_context(p_project_id);
    if p_payload->>'fingerprint' is distinct from v_context->>'fingerprint' then
      raise exception 'PROJECT_STALE_CONTEXT' using errcode='40001';
    end if;
    v_decision := p_payload->>'decision';
    if v_decision not in ('completed','continue') then
      raise exception 'PROJECT_REVIEW_INVALID' using errcode='22023';
    end if;
    v_text := btrim(p_payload->>'rationale');
    if v_text is null or char_length(v_text) not between 1 and 4000 then
      raise exception 'PROJECT_REVIEW_RATIONALE_REQUIRED' using errcode='22023';
    end if;
    if jsonb_typeof(p_payload->'criteria') <> 'array' or
       jsonb_typeof(p_payload->'archived_ids') <> 'array' or
       jsonb_typeof(p_payload->'resource_ids') <> 'array' then
      raise exception 'PROJECT_REVIEW_INVALID' using errcode='22023';
    end if;
    if jsonb_array_length(p_payload->'resource_ids')>200 then
      raise exception 'PROJECT_RESOURCE_LIMIT' using errcode='54000';
    end if;
    select count(*) into v_count from public.project_completion_criteria
      where user_id=v_user and project_id=p_project_id and archived_at is null;
    if v_decision='completed' and (v_project.desired_result is null or v_count=0
        or p_payload->>'result_accepted' is distinct from 'true') then
      raise exception 'PROJECT_COMPLETION_PRECONDITION' using errcode='23514';
    end if;
    select count(*) into v_open_count from public.tasks
      where user_id=v_user and project_id=p_project_id and archived_at is null
        and status not in ('done','canceled','archived');
    select v_open_count+count(*) into v_open_count from public.project_milestones
      where user_id=v_user and project_id=p_project_id and archived_at is null and status <> 'done';
    v_note := nullif(btrim(p_payload->>'open_work_disposition'),'');
    if v_decision='completed' and v_open_count>0 and
       (p_payload->>'open_work_acknowledged' is distinct from 'true'
        or v_note is null or char_length(v_note)>2000) then
      raise exception 'PROJECT_OPEN_WORK_ACK_REQUIRED' using errcode='23514';
    end if;
    -- Lock selected evidence rows and their current Project relation. A
    -- concurrent edit/unlink either finishes first and invalidates context,
    -- or waits until the immutable snapshot commits.
    for v_row in select value from jsonb_array_elements(p_payload->'resource_ids') loop
      if jsonb_typeof(v_row) <> 'string' then raise exception 'PROJECT_RESOURCE_INVALID' using errcode='22023'; end if;
      v_id := (v_row#>>'{}')::uuid;
      perform 1 from public.resources r where r.id=v_id and r.user_id=v_user
        and r.archived_at is null for share;
      if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
      perform 1 from public.resource_relations rr where rr.resource_id=v_id
        and rr.user_id=v_user and rr.target_type='project' and rr.target_id=p_project_id for share;
      if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
    end loop;
    if (select count(distinct value) from jsonb_array_elements(p_payload->'resource_ids'))
        <> jsonb_array_length(p_payload->'resource_ids') then
      raise exception 'PROJECT_RESOURCE_DUPLICATE' using errcode='22023';
    end if;
    if (public.project_review_context(p_project_id)->>'fingerprint') is distinct from
       (v_context->>'fingerprint') then
      raise exception 'PROJECT_STALE_CONTEXT' using errcode='40001';
    end if;
    -- Every current active Criterion has exactly one assessment. Current-cycle
    -- archived Criteria are acknowledged from the DB, never excluded ad hoc.
    if jsonb_array_length(p_payload->'criteria') <> v_count then
      raise exception 'PROJECT_CRITERION_SET_STALE' using errcode='40001';
    end if;
    for v_criterion in select * from public.project_completion_criteria
      where user_id=v_user and project_id=p_project_id and archived_at is null
      order by sort_order,id loop
      select value into v_row from jsonb_array_elements(p_payload->'criteria')
        where value->>'id'=v_criterion.id::text;
      if not found then raise exception 'PROJECT_CRITERION_SET_STALE' using errcode='40001'; end if;
      v_assessment := v_row->>'assessment';
      if v_assessment not in ('satisfied','not_satisfied','not_assessed') or
         (v_decision='completed' and v_assessment <> 'satisfied') then
        raise exception 'PROJECT_CRITERION_ASSESSMENT_INVALID' using errcode='23514';
      end if;
      if (select count(*) from jsonb_array_elements(p_payload->'criteria')
          where value->>'id'=v_criterion.id::text)<>1 then
        raise exception 'PROJECT_CRITERION_DUPLICATE' using errcode='22023';
      end if;
      if char_length(coalesce(v_row->>'note',''))>2000 then
        raise exception 'PROJECT_CRITERION_NOTE_LIMIT' using errcode='22023';
      end if;
    end loop;
    select count(*) into v_count from public.project_completion_criteria
      where user_id=v_user and project_id=p_project_id
        and archived_cycle=v_project.completion_cycle and archived_at is not null;
    if jsonb_array_length(p_payload->'archived_ids')<>v_count then
      raise exception 'PROJECT_ARCHIVED_SCOPE_STALE' using errcode='40001';
    end if;
    for v_criterion in select * from public.project_completion_criteria
      where user_id=v_user and project_id=p_project_id
        and archived_cycle=v_project.completion_cycle and archived_at is not null loop
      if not p_payload->'archived_ids' ? v_criterion.id::text then
        raise exception 'PROJECT_ARCHIVED_SCOPE_STALE' using errcode='40001';
      end if;
    end loop;
    insert into public.project_reviews(user_id,project_id,completion_cycle,completion_revision,
      decision,prior_status,resulting_status,desired_result_snapshot,rationale,
      open_work_acknowledged,open_work_disposition,context_fingerprint,command_id)
      values(v_user,p_project_id,v_project.completion_cycle,v_project.completion_revision,
        v_decision,v_project.status,case when v_decision='completed' then 'completed'::public.project_status else v_project.status end,
        v_project.desired_result,v_text,
        coalesce((p_payload->>'open_work_acknowledged')::boolean,false),v_note,
        v_context->>'fingerprint',p_command_id) returning id into v_review;
    insert into public.project_review_criteria(user_id,project_id,review_id,criterion_id,
      text_snapshot,sort_order_snapshot,assessment,note,archive_reason_snapshot)
      select v_user,p_project_id,v_review,c.id,c.text,c.sort_order,
        case when c.archived_at is not null then 'excluded' else a.value->>'assessment' end,
        case when c.archived_at is not null then null else nullif(btrim(a.value->>'note'),'') end,
        c.archive_reason
      from public.project_completion_criteria c
      left join lateral (select value from jsonb_array_elements(p_payload->'criteria')
        where value->>'id'=c.id::text) a on true
      where c.user_id=v_user and c.project_id=p_project_id
        and (c.archived_at is null or c.archived_cycle=v_project.completion_cycle);
    insert into public.project_review_work(user_id,project_id,review_id,work_type,work_id,
      title_snapshot,status_snapshot,archived_at_snapshot,updated_at_snapshot)
      select v_user,p_project_id,v_review,'task',t.id,t.title,t.status::text,t.archived_at,t.updated_at
      from public.tasks t where t.user_id=v_user and t.project_id=p_project_id;
    insert into public.project_review_work(user_id,project_id,review_id,work_type,work_id,
      title_snapshot,status_snapshot,archived_at_snapshot,updated_at_snapshot)
      select v_user,p_project_id,v_review,'milestone',m.id,m.title,m.status,m.archived_at,m.updated_at
      from public.project_milestones m where m.user_id=v_user and m.project_id=p_project_id;
    insert into public.project_review_resources(user_id,project_id,review_id,resource_id,
      relation_id,title_snapshot,type_snapshot,safe_url_snapshot,relation_type_snapshot,project_role_snapshot)
      select distinct on (r.id) v_user,p_project_id,v_review,r.id,rr.id,r.title,r.type::text,
        case when r.url ~* '^https?://' then r.url else null end,
        rr.relation_type::text,rr.project_role
      from public.resources r join public.resource_relations rr on rr.resource_id=r.id and rr.user_id=r.user_id
      where r.user_id=v_user and r.archived_at is null and rr.target_type='project'
        and rr.target_id=p_project_id and r.id in
          (select (value#>>'{}')::uuid from jsonb_array_elements(p_payload->'resource_ids'))
      order by r.id,rr.id;
    if v_decision='completed' then
      update public.projects set status='completed' where id=p_project_id and user_id=v_user;
    end if;
    v_result := v_result||jsonb_build_object('review_id',v_review,'decision',v_decision);
  end if;

  -- The receipt is committed atomically with all domain and history rows.
  v_result := v_result || (select jsonb_build_object('completion_revision',completion_revision,
    'completion_cycle',completion_cycle) from public.projects where id=p_project_id and user_id=v_user);
  insert into public.project_command_receipts(user_id,project_id,command_id,operation,request_fingerprint,result_payload)
    values(v_user,p_project_id,p_command_id,p_operation,v_hash,v_result);
  return v_result;
end $$;
alter function public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb) owner to life_os_project_command;
revoke all on function public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb) from public, anon;
grant execute on function public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb) to authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'project_completion_criteria','project_reviews','project_review_criteria',
    'project_review_resources','project_review_work','project_lifecycle_events',
    'project_review_amendments','project_command_receipts'
  ] loop
    if pg_catalog.has_table_privilege('authenticated',format('public.%I',v_table),'INSERT')
      or pg_catalog.has_table_privilege('authenticated',format('public.%I',v_table),'UPDATE')
      or pg_catalog.has_table_privilege('authenticated',format('public.%I',v_table),'DELETE') then
      raise exception 'PROJECT_DIRECT_WRITE_GRANT_OPEN: %',v_table;
    end if;
  end loop;
  if pg_catalog.has_column_privilege('authenticated','public.projects','status','UPDATE')
     or pg_catalog.has_column_privilege('authenticated','public.projects','desired_result','UPDATE')
     or pg_catalog.has_function_privilege('anon','public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb)','EXECUTE') then
    raise exception 'PROJECT_COMMAND_BOUNDARY_OPEN';
  end if;
end $$;
