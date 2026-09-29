-- Same-contract repair of the unmerged #69 prototype. Never invent missing
-- historic acceptance facts. A target with durable prototype history needs an
-- explicit data decision rather than a guessed backfill.
do $$begin
 if exists(select 1 from public.project_reviews) or exists(select 1 from public.project_lifecycle_events)
 or exists(select 1 from public.project_review_amendments) or exists(select 1 from public.project_command_receipts) then
  raise exception 'P_DATA_V4_PROTOTYPE_HISTORY_REQUIRES_DECISION';
 end if;
end $$;
drop table public.project_review_work;
alter table public.project_reviews rename column completion_revision to revision_before;
alter table public.project_reviews drop constraint project_reviews_rationale_check;
alter table public.project_reviews drop constraint project_reviews_context_fingerprint_check;
alter table public.project_reviews
 add column revision_after bigint not null,
 add column snapshot_version smallint not null default 1,
 add column project_title_snapshot text not null,
 add column goal_id_snapshot uuid,
 add column goal_title_snapshot text,
 add column result_accepted boolean not null,
 add column work_observed_at timestamptz not null,
 add column open_task_count integer not null,
 add column done_task_count integer not null,
 add column canceled_task_count integer not null,
 add column open_milestone_count integer not null,
 add column done_milestone_count integer not null,
 add column archived_criteria_acknowledged boolean not null,
 add unique(project_id,revision_after),
 add constraint project_review_v4_shape check (
 revision_after=revision_before+1 and snapshot_version=1
 and context_fingerprint ~ '^[a-f0-9]{64}$'
 and rationale=btrim(rationale) and char_length(rationale) between 1 and 2000
 and open_task_count>=0 and done_task_count>=0 and canceled_task_count>=0
 and open_milestone_count>=0 and done_milestone_count>=0
 and ((decision='completed' and result_accepted and desired_result_snapshot is not null
       and desired_result_snapshot=btrim(desired_result_snapshot) and char_length(desired_result_snapshot) between 1 and 4000)
   or (decision='continue' and not result_accepted))
 and ((decision='completed' and open_task_count+open_milestone_count>0
       and open_work_acknowledged and open_work_disposition is not null
       and open_work_disposition=btrim(open_work_disposition) and char_length(open_work_disposition) between 1 and 2000)
   or ((decision='continue' or open_task_count+open_milestone_count=0)
       and not open_work_acknowledged and open_work_disposition is null))
 );
alter table public.project_review_criteria rename column assessment to decision;
alter table public.project_review_criteria rename column note to rationale;
alter table public.project_review_criteria drop constraint project_review_criteria_pkey;
alter table public.project_review_criteria drop column id;
alter table public.project_review_criteria
 add primary key(review_id,criterion_id),
 add unique(user_id,project_id,review_id,criterion_id),
 add column was_archived boolean not null,
 add column archived_cycle_snapshot bigint,
 add column archived_revision_snapshot bigint,
 add constraint project_review_criterion_v4_shape check (
 text_snapshot=btrim(text_snapshot) and char_length(text_snapshot) between 1 and 1000
 and sort_order_snapshot>=0
 and (rationale is null or (rationale=btrim(rationale) and char_length(rationale) between 1 and 2000))
 and (decision<>'not_satisfied' or rationale is not null)
 and was_archived=(decision='excluded')
 and ((was_archived and archive_reason_snapshot is not null and char_length(btrim(archive_reason_snapshot)) between 1 and 2000
       and archived_cycle_snapshot is not null and archived_cycle_snapshot>=0
       and archived_revision_snapshot is not null and archived_revision_snapshot>=0)
   or (not was_archived and archive_reason_snapshot is null and archived_cycle_snapshot is null and archived_revision_snapshot is null))
 );
alter table public.project_review_resources rename column relation_id to relation_id_snapshot;
alter table public.project_review_resources rename column type_snapshot to resource_type_snapshot;
alter table public.project_review_resources drop constraint project_review_resources_review_id_resource_id_key;
alter table public.project_review_resources
 add column criterion_id uuid,
 add column note text check(note is null or (note=btrim(note) and char_length(note) between 1 and 2000)),
 add unique(user_id,project_id,review_id,id),
 add constraint project_resource_type_snapshot check(resource_type_snapshot in ('note','learning','prompt','research','link','source','snippet','decision')),
 add constraint project_resource_role_snapshot check(project_role_snapshot in ('reference','additional_artifact','primary_artifact')),
 add constraint project_resource_relation_snapshot check(relation_type_snapshot in ('source','context','supports','evidence','decision','related')),
 add constraint project_resource_safe_url check(safe_url_snapshot is null or safe_url_snapshot ~* '^https?://[^/@?#[:space:]]+(/[^?#[:space:]]*)?$');
create unique index project_review_resource_global on public.project_review_resources(review_id,resource_id) where criterion_id is null;
create unique index project_review_resource_criterion on public.project_review_resources(review_id,criterion_id,resource_id) where criterion_id is not null;
alter table public.project_lifecycle_events rename column event_type to event_kind;
alter table public.project_lifecycle_events rename column occurred_at to recorded_at;
alter table public.project_lifecycle_events rename column completion_revision to revision_after;
alter table public.project_lifecycle_events rename column completion_cycle to cycle_after;
alter table public.project_lifecycle_events
 add column cycle_before bigint not null,
 add column project_title_snapshot text not null,
 add column prior_completion_kind text,
 add column prior_review_id uuid,
 add column reason text check(reason is null or (reason=btrim(reason) and char_length(reason) between 1 and 2000)),
 add column mistaken_completion boolean not null default false,
 add unique(user_id,project_id,id),
 add unique(project_id,revision_after),
 add constraint project_lifecycle_v4_shape check (
 revision_after>=0 and cycle_before>=0 and cycle_after>=0
 and ((event_kind='reopened' and prior_status='completed' and resulting_status='active' and cycle_after=cycle_before+1)
   or (event_kind='archived' and prior_status<>'archived' and resulting_status='archived' and cycle_after=cycle_before))
 and ((prior_status='completed' and ((prior_completion_kind='review' and prior_review_id is not null)
    or (prior_completion_kind='legacy_without_review' and prior_review_id is null)))
   or (prior_status<>'completed' and prior_completion_kind is null and prior_review_id is null))
 and (not mistaken_completion or (event_kind='reopened' and reason is not null))
 );
create unique index project_reopen_review_once on public.project_lifecycle_events(prior_review_id) where event_kind='reopened' and prior_review_id is not null;
create unique index project_reopen_legacy_once on public.project_lifecycle_events(user_id,project_id) where event_kind='reopened' and prior_completion_kind='legacy_without_review';
alter table public.project_review_amendments rename column note to reason;
alter table public.project_review_amendments rename column created_at to recorded_at;
alter table public.project_review_amendments
 add column revision_after bigint not null check(revision_after>=0),
 add column kind text not null check(kind in ('clarification','evidence_withdrawn','marked_mistaken')),
 add column review_resource_id uuid,
 add constraint project_amendment_target check((kind='evidence_withdrawn')=(review_resource_id is not null));
create unique index project_evidence_withdrawal_once on public.project_review_amendments(review_resource_id) where kind='evidence_withdrawn';
create unique index project_review_mistaken_once on public.project_review_amendments(review_id) where kind='marked_mistaken';
alter table public.project_command_receipts rename column operation to command_kind;
alter table public.project_command_receipts drop constraint project_command_receipts_pkey;
alter table public.project_command_receipts drop column id;
alter table public.project_command_receipts
 add primary key(user_id,command_id),
 add unique(user_id,project_id,command_id),
 add column request_payload jsonb not null,
 add constraint project_receipt_hash check(request_fingerprint ~ '^[a-f0-9]{64}$'),
 add constraint project_receipt_kind check(command_kind in ('result.set','criterion.create','criterion.edit','criterion.reorder','criterion.archive','review.submit','review.amend','project.reopen','project.archive','project.status.set'));
-- Replace prototype restrictive FKs with the accepted deferred domain retention.
do $$declare t text; c record; begin
 foreach t in array array['project_completion_criteria','project_reviews','project_review_criteria','project_review_resources','project_lifecycle_events','project_review_amendments','project_command_receipts'] loop
  for c in select conname from pg_catalog.pg_constraint where conrelid=('public.'||t)::regclass and contype='f' loop
   execute format('alter table public.%I drop constraint %I',t,c.conname);
  end loop;
  execute format('alter table public.%I add foreign key(user_id) references auth.users(id) on delete cascade',t);
  execute format('alter table public.%I add foreign key(user_id,project_id) references public.projects(user_id,id) on delete no action deferrable initially deferred',t);
 end loop;
end $$;
alter table public.resources add constraint resources_owner_identity unique(user_id,id);
alter table public.project_reviews add foreign key(user_id,project_id,command_id) references public.project_command_receipts(user_id,project_id,command_id) deferrable initially deferred;
alter table public.project_review_criteria
 add foreign key(user_id,project_id,review_id) references public.project_reviews(user_id,project_id,id) deferrable initially deferred,
 add foreign key(user_id,project_id,criterion_id) references public.project_completion_criteria(user_id,project_id,id) deferrable initially deferred;
alter table public.project_review_resources
 add foreign key(user_id,project_id,review_id) references public.project_reviews(user_id,project_id,id) deferrable initially deferred,
 add foreign key(user_id,project_id,review_id,criterion_id) references public.project_review_criteria(user_id,project_id,review_id,criterion_id) deferrable initially deferred,
 add foreign key(user_id,resource_id) references public.resources(user_id,id) deferrable initially deferred;
alter table public.project_lifecycle_events
 add foreign key(user_id,project_id,command_id) references public.project_command_receipts(user_id,project_id,command_id) deferrable initially deferred,
 add foreign key(user_id,project_id,prior_review_id) references public.project_reviews(user_id,project_id,id) deferrable initially deferred;
alter table public.project_review_amendments
 add foreign key(user_id,project_id,review_id) references public.project_reviews(user_id,project_id,id) deferrable initially deferred,
 add foreign key(user_id,project_id,command_id) references public.project_command_receipts(user_id,project_id,command_id) deferrable initially deferred,
 add foreign key(user_id,project_id,review_id,review_resource_id) references public.project_review_resources(user_id,project_id,review_id,id) deferrable initially deferred;
create index project_criteria_archived_cycle on public.project_completion_criteria(user_id,project_id,archived_cycle,sort_order,id) where archived_at is not null;
create index project_reviews_revision on public.project_reviews(user_id,project_id,revision_after desc,id);
create index project_review_criterion_identity on public.project_review_criteria(user_id,project_id,criterion_id);
create index project_review_resources_parent on public.project_review_resources(user_id,project_id,review_id);
create index project_review_resources_identity on public.project_review_resources(user_id,resource_id);
create index project_lifecycle_revision on public.project_lifecycle_events(user_id,project_id,revision_after desc,id);
create index project_amendment_revision on public.project_review_amendments(user_id,project_id,review_id,revision_after,id);
create index project_receipt_project on public.project_command_receipts(user_id,project_id,created_at,command_id);
revoke select on public.project_command_receipts from authenticated;
-- Keep serialization-only updated_at writes distinct from contract revisions.
grant update(completion_revision) on public.projects to life_os_project_command;
grant select on public.goals to life_os_project_command;
create policy project_command_goal_read on public.goals for select to life_os_project_command using(user_id=(select auth.uid()));
create or replace function public.guard_project_depth_fields() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then return new; end if;
 if (new.id,new.user_id) is distinct from (old.id,old.user_id) then raise exception 'PROJECT_IDENTITY_IMMUTABLE' using errcode='42501'; end if;
 if (new.status,new.archived_at,new.desired_result,new.completion_cycle) is distinct from
    (old.status,old.archived_at,old.desired_result,old.completion_cycle) and current_user<>'life_os_project_command' then
  raise exception 'PROJECT_COMMAND_REQUIRED' using errcode='42501'; end if;
 if new.completion_revision<>old.completion_revision and
    (current_user<>'life_os_project_command' or new.completion_revision<>old.completion_revision+1) then
  raise exception 'PROJECT_REVISION_SERVER_OWNED' using errcode='42501'; end if;
 if old.archived_at is not null and (new.title,new.description,new.priority,new.area_id,new.goal_id,new.status,new.archived_at,new.desired_result,new.completion_cycle) is distinct from
    (old.title,old.description,old.priority,old.area_id,old.goal_id,old.status,old.archived_at,old.desired_result,old.completion_cycle) then
  raise exception 'PROJECT_ARCHIVED' using errcode='23514'; end if;
 if old.status='completed' and new.desired_result is distinct from old.desired_result then
  raise exception 'PROJECT_COMPLETED_FROZEN' using errcode='23514'; end if;
 if (new.title,new.description,new.priority,new.area_id,new.goal_id,new.status,new.archived_at,new.desired_result,new.completion_cycle) is distinct from
    (old.title,old.description,old.priority,old.area_id,old.goal_id,old.status,old.archived_at,old.desired_result,old.completion_cycle) then
  new.completion_revision:=old.completion_revision+1;
 end if;
 return new;
end $$;
create schema if not exists project_depth_private;
revoke all on schema project_depth_private from public,anon,authenticated;
grant usage on schema project_depth_private to life_os_project_command;
create function project_depth_private.sha256(p text) returns text language sql immutable set search_path='' as $$
 select encode(extensions.digest(convert_to(p,'UTF8'),'sha256'),'hex')
$$;
create function project_depth_private.safe_url(p text) returns text language sql immutable set search_path='' as $$
 select case when p ~* '^https?://[^/@?#[:space:]]+(/[^?#[:space:]]*)?$' then p else null end
$$;
-- Canonicalization is authoritative in the DB, including defaults, trim/null,
-- UUID spelling and order of semantic sets. Reorder positions are scalar data.
create function project_depth_private.trim_text(p text) returns text language sql immutable set search_path='' as $$
 select btrim(p, chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279))
$$;
create function project_depth_private.canonical(p_kind text,p jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
#variable_conflict use_column
declare q jsonb; a jsonb; x jsonb; field text; begin
 if jsonb_typeof(p)<>'object' then raise exception 'PROJECT_COMMAND_INVALID' using errcode='22023'; end if;
 foreach field in array array['text','reason','rationale','fingerprint','decision','status','kind','desired_result','open_work_disposition'] loop
  if p ? field and jsonb_typeof(p->field) not in ('string','null') then raise exception 'PROJECT_COMMAND_INVALID' using errcode='22023'; end if;
 end loop;
 foreach field in array array['result_accepted','open_work_acknowledged','archived_criteria_acknowledged','mistaken_completion'] loop
  if p ? field and jsonb_typeof(p->field)<>'boolean' then raise exception 'PROJECT_COMMAND_INVALID' using errcode='22023'; end if;
 end loop;
 if p_kind='result.set' and not p ? 'desired_result' then raise exception 'PROJECT_RESULT_INVALID' using errcode='22023'; end if;
 if p_kind in ('criterion.create','criterion.reorder') and (coalesce(jsonb_typeof(p->'sort_order'),'null') not in ('number','string') or (p->>'sort_order')::numeric<>trunc((p->>'sort_order')::numeric)) then raise exception 'PROJECT_CRITERION_INVALID' using errcode='22023'; end if;
 if p_kind='review.submit' then
  for x in select value from jsonb_array_elements(coalesce(p->'criteria','[]')) union all select value from jsonb_array_elements(coalesce(p->'archived_notes','[]')) union all select value from jsonb_array_elements(coalesce(p->'evidence','[]')) loop
   if jsonb_typeof(x)<>'object' or (x ? 'note' and jsonb_typeof(x->'note') not in ('string','null')) then raise exception 'PROJECT_REVIEW_INVALID' using errcode='22023'; end if;
  end loop;
 end if;
 if p_kind='result.set' then q:=jsonb_build_object('desired_result',nullif(project_depth_private.trim_text(p->>'desired_result'),''));
 elsif p_kind in ('criterion.create','criterion.edit','criterion.reorder','criterion.archive') then
  q:=jsonb_build_object('criterion_id',case when p_kind='criterion.create' then null else (p->>'criterion_id')::uuid end);
  if p_kind in ('criterion.create','criterion.edit') then q:=q||jsonb_build_object('text',project_depth_private.trim_text(p->>'text')); end if;
  if p_kind in ('criterion.create','criterion.reorder') then q:=q||jsonb_build_object('sort_order',(p->>'sort_order')::numeric::bigint); end if;
  if p_kind='criterion.archive' then q:=q||jsonb_build_object('reason',project_depth_private.trim_text(p->>'reason')); end if;
 elsif p_kind='review.submit' then
  if jsonb_typeof(p->'criteria') is distinct from 'array' or jsonb_typeof(p->'archived_ids') is distinct from 'array'
    or jsonb_typeof(p->'evidence') is distinct from 'array' then raise exception 'PROJECT_REVIEW_INVALID' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',(x->>'id')::uuid,'assessment',x->>'assessment','note',nullif(project_depth_private.trim_text(x->>'note'),'')) order by (x->>'id')::uuid),'[]') into a from jsonb_array_elements(p->'criteria') x;
  q:=jsonb_build_object('criteria',a);
  select coalesce(jsonb_agg(to_jsonb((x#>>'{}')::uuid) order by (x#>>'{}')::uuid),'[]') into a from jsonb_array_elements(p->'archived_ids') x;
  q:=q||jsonb_build_object('archived_ids',a);
  if p ? 'archived_notes' and jsonb_typeof(p->'archived_notes')<>'array' then raise exception 'PROJECT_REVIEW_INVALID' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',(x->>'id')::uuid,'note',nullif(project_depth_private.trim_text(x->>'note'),'')) order by (x->>'id')::uuid),'[]') into a from jsonb_array_elements(coalesce(p->'archived_notes','[]')) x;
  q:=q||jsonb_build_object('archived_notes',a);
  select coalesce(jsonb_agg(jsonb_build_object('relation_id',(x->>'relation_id')::uuid,'criterion_id',(x->>'criterion_id')::uuid,'token',x->>'token','note',nullif(project_depth_private.trim_text(x->>'note'),'')) order by (x->>'relation_id')::uuid,(x->>'criterion_id')::uuid nulls first),'[]') into a from jsonb_array_elements(p->'evidence') x;
  q:=q||jsonb_build_object('evidence',a,'fingerprint',p->>'fingerprint','decision',p->>'decision',
    'result_accepted',coalesce((p->>'result_accepted')::boolean,false),'rationale',project_depth_private.trim_text(p->>'rationale'),
    'archived_criteria_acknowledged',coalesce((p->>'archived_criteria_acknowledged')::boolean,false),
    'open_work_acknowledged',coalesce((p->>'open_work_acknowledged')::boolean,false),
    'open_work_disposition',nullif(project_depth_private.trim_text(p->>'open_work_disposition'),''));
 elsif p_kind='review.amend' then q:=jsonb_build_object('review_id',(p->>'review_id')::uuid,'kind',p->>'kind','review_resource_id',(p->>'review_resource_id')::uuid,'reason',project_depth_private.trim_text(p->>'reason'));
 elsif p_kind='project.reopen' then q:=jsonb_build_object('reason',nullif(project_depth_private.trim_text(p->>'reason'),''),'mistaken_completion',coalesce((p->>'mistaken_completion')::boolean,false));
 elsif p_kind='project.archive' then q:=jsonb_build_object('reason',nullif(project_depth_private.trim_text(p->>'reason'),''));
 elsif p_kind='project.status.set' then q:=jsonb_build_object('status',p->>'status');
 else raise exception 'PROJECT_OPERATION_INVALID' using errcode='22023'; end if;
 return q;
end $$;
revoke all on all functions in schema project_depth_private from public,anon,authenticated;
grant execute on all functions in schema project_depth_private to life_os_project_command;
create or replace function public.project_review_context(p_project_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare ctx jsonb; begin
 with p as (select p.*,g.title goal_title from public.projects p left join public.goals g on g.id=p.goal_id and g.user_id=p.user_id where p.id=p_project_id and p.user_id=(select auth.uid())),
 c as (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'text',c.text,'sort_order',c.sort_order::text,
   'archived_at',c.archived_at,'archive_reason',c.archive_reason,'archived_cycle',c.archived_cycle::text,'archived_revision',c.archived_revision::text) order by c.sort_order,c.id),'[]') items
   from public.project_completion_criteria c join p on p.id=c.project_id and p.user_id=c.user_id where c.archived_at is null or c.archived_cycle=p.completion_cycle),
 w as (select 'task' kind,t.id,jsonb_build_object('type','task','id',t.id,'title',t.title,'status',t.status,'archived_at',t.archived_at) item
   from public.tasks t join p on p.id=t.project_id and p.user_id=t.user_id where t.archived_at is null and t.status<>'archived'
   union all select 'milestone',m.id,jsonb_build_object('type','milestone','id',m.id,'title',m.title,'status',m.status,'archived_at',m.archived_at)
   from public.project_milestones m join p on p.id=m.project_id and p.user_id=m.user_id where m.archived_at is null),
 work as (select coalesce(jsonb_agg(item order by kind,id),'[]') items,
  count(*) filter(where kind='task' and item->>'status' in ('inbox','planned','active','waiting','someday')) open_task_count,
  count(*) filter(where kind='task' and item->>'status'='done') done_task_count,
  count(*) filter(where kind='task' and item->>'status'='canceled') canceled_task_count,
  count(*) filter(where kind='milestone' and item->>'status' in ('open','active')) open_milestone_count,
  count(*) filter(where kind='milestone' and item->>'status'='done') done_milestone_count from w),
 r as (select rr.id relation_id,r.id resource_id,jsonb_build_object('id',r.id,'relation_id',rr.id,'title',r.title,'type',r.type,'url',r.url,
   'archived_at',r.archived_at,'target_type',rr.target_type,'target_id',rr.target_id,'role',rr.project_role,'relation_type',rr.relation_type) item
   from public.resource_relations rr join p on rr.target_id=p.id and rr.user_id=p.user_id
   join public.resources r on r.id=rr.resource_id and r.user_id=rr.user_id where rr.target_type='project' and r.archived_at is null),
 resources as (select coalesce(jsonb_agg(item||jsonb_build_object('token',encode(extensions.digest(convert_to(item::text,'UTF8'),'sha256'),'hex')) order by resource_id,relation_id),'[]') items from r),
 core as (select jsonb_build_object('project_id',p.id,'project_title',p.title,'description',p.description,'priority',p.priority,'area_id',p.area_id,
   'goal_id',p.goal_id,'goal_title',p.goal_title,'status',p.status,'archived_at',p.archived_at,'desired_result',p.desired_result,
   'completion_revision',p.completion_revision::text,'completion_cycle',p.completion_cycle::text,'current_completion_review_id',(select r.id from public.project_reviews r where r.user_id=p.user_id and r.project_id=p.id and r.completion_cycle=p.completion_cycle and r.decision='completed'),'criteria',c.items,'work',work.items,
   'open_task_count',work.open_task_count,'done_task_count',work.done_task_count,'canceled_task_count',work.canceled_task_count,
   'open_milestone_count',work.open_milestone_count,'done_milestone_count',work.done_milestone_count) item from p cross join c cross join work)
 select core.item||jsonb_build_object('fingerprint',encode(extensions.digest(convert_to(core.item::text,'UTF8'),'sha256'),'hex'),
   'resources',resources.items,'work_observed_at',statement_timestamp()) into ctx from core cross join resources;
 if ctx is null then raise exception 'PROJECT_NOT_FOUND' using errcode='42501'; end if;
 if jsonb_array_length(ctx->'work')>5000 or jsonb_array_length(ctx->'criteria')>1000 or jsonb_array_length(ctx->'resources')>1000 or octet_length(ctx::text)>2097152 then raise exception 'PROJECT_CONTEXT_LIMIT' using errcode='54000'; end if;
 return ctx; end
$$;
-- Command owner can call this invoker read with its own owner-scoped RLS.
grant execute on function public.project_review_context(uuid) to life_os_project_command;
create or replace function public.project_depth_command(p_project_id uuid,p_command_id uuid,p_operation text,p_expected_revision bigint,p_expected_cycle bigint,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
 u uuid:=auth.uid(); p public.projects%rowtype; receipt public.project_command_receipts%rowtype;
 q jsonb; identity_payload jsonb; h text; ctx jsonb; result jsonb; x jsonb; evidence jsonb; c public.project_completion_criteria%rowtype;
 t text; note text; cid uuid; rid uuid; aid uuid; prior_review uuid; prior_kind text; d text;
 locked_resource_ids uuid[]:='{}'; changed boolean:=false; reopen boolean:=false; mistaken boolean:=false; count_active integer; count_archived integer; open_count integer;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_project_id is null or p_command_id is null or p_expected_revision is null or p_expected_cycle is null
   or p_expected_revision<0 or p_expected_cycle<0 or p_payload is null then raise exception 'PROJECT_COMMAND_INVALID' using errcode='22023'; end if;
 if octet_length(p_payload::text)>1048576 then raise exception 'PROJECT_PAYLOAD_LIMIT' using errcode='54000'; end if;
 q:=project_depth_private.canonical(p_operation,p_payload);
 identity_payload:=jsonb_build_object('version',1,'command_kind',p_operation,'project_id',p_project_id,
   'expected_revision',p_expected_revision::text,'expected_cycle',p_expected_cycle::text,'payload',q);
 h:=project_depth_private.sha256(identity_payload::text);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||p_command_id::text,0));
 select * into receipt from public.project_command_receipts where user_id=u and command_id=p_command_id;
 if found then
  if receipt.request_payload is distinct from identity_payload or receipt.request_fingerprint<>h then
   raise exception 'PROJECT_COMMAND_KEY_CONFLICT' using errcode='23505'; end if;
  return receipt.result_payload;
 end if;
 select * into p from public.projects where id=p_project_id and user_id=u for update;
 if not found then raise exception 'PROJECT_NOT_FOUND' using errcode='42501'; end if;
 if (p.completion_revision,p.completion_cycle) is distinct from (p_expected_revision,p_expected_cycle) then raise exception 'PROJECT_STALE' using errcode='23514'; end if;
 if (p.archived_at is not null or p.status='archived') and p_operation<>'review.amend' then raise exception 'PROJECT_ARCHIVED' using errcode='23514'; end if;
 if p.status='completed' and p_operation in ('result.set','criterion.create','criterion.edit','criterion.reorder','criterion.archive') then raise exception 'PROJECT_COMPLETED_FROZEN' using errcode='23514'; end if;
 result:=jsonb_build_object('project_id',p_project_id,'operation',p_operation,'command_id',p_command_id);
 if p_operation='result.set' then
  t:=q->>'desired_result';
  if char_length(t)>4000 then raise exception 'PROJECT_RESULT_INVALID' using errcode='22023'; end if;
  changed:=t is distinct from p.desired_result;
  if changed then update public.projects set desired_result=t where id=p.id and user_id=u; end if;
 elsif p_operation='criterion.create' then
  if (select count(*) from public.project_completion_criteria where user_id=u and project_id=p.id and (archived_at is null or archived_cycle=p.completion_cycle))>=1000 then raise exception 'PROJECT_CRITERION_LIMIT' using errcode='54000'; end if;
  insert into public.project_completion_criteria(user_id,project_id,text,sort_order) values(u,p.id,q->>'text',(q->>'sort_order')::bigint) returning id into cid;
  changed:=true; result:=result||jsonb_build_object('criterion_id',cid);
 elsif p_operation in ('criterion.edit','criterion.reorder','criterion.archive') then
  select * into c from public.project_completion_criteria where user_id=u and project_id=p.id and id=(q->>'criterion_id')::uuid and archived_at is null for update;
  if not found then raise exception 'PROJECT_CRITERION_NOT_FOUND' using errcode='42501'; end if;
  if p_operation='criterion.edit' then
   changed:=c.text is distinct from q->>'text';
   if changed then update public.project_completion_criteria set text=q->>'text',updated_at=now() where id=c.id and user_id=u; end if;
  elsif p_operation='criterion.reorder' then
   changed:=c.sort_order is distinct from (q->>'sort_order')::bigint;
   if changed then update public.project_completion_criteria set sort_order=(q->>'sort_order')::bigint,updated_at=now() where id=c.id and user_id=u; end if;
  else
   update public.project_completion_criteria set archived_at=now(),archive_reason=q->>'reason',archived_cycle=p.completion_cycle,archived_revision=p.completion_revision+1,updated_at=now() where id=c.id and user_id=u;
   changed:=true;
  end if;
 elsif p_operation='project.status.set' then
  if p.status='completed' or q->>'status' is null or q->>'status' not in ('idea','active','paused','blocked') then raise exception 'PROJECT_STATUS_CONFLICT' using errcode='23514'; end if;
  changed:=p.status::text<>q->>'status';
  if changed then update public.projects set status=(q->>'status')::public.project_status where id=p.id and user_id=u; end if;
 elsif p_operation in ('project.reopen','project.archive') then
  reopen:=p_operation='project.reopen'; mistaken:=coalesce((q->>'mistaken_completion')::boolean,false);
  if reopen and p.status<>'completed' then raise exception 'PROJECT_REOPEN_CONFLICT' using errcode='23514'; end if;
  if mistaken and nullif(q->>'reason','') is null then raise exception 'PROJECT_MISTAKEN_REASON_REQUIRED' using errcode='23514'; end if;
  changed:=true;
 elsif p_operation='review.amend' then
  select id into rid from public.project_reviews where user_id=u and project_id=p.id and id=(q->>'review_id')::uuid;
  if not found then raise exception 'PROJECT_REVIEW_NOT_FOUND' using errcode='42501'; end if;
  if q->>'kind'='evidence_withdrawn' then
   perform 1 from public.project_review_resources where user_id=u and project_id=p.id and review_id=rid and id=(q->>'review_resource_id')::uuid;
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
  end if;
  mistaken:=q->>'kind'='marked_mistaken';
  reopen:=mistaken and p.status='completed' and exists(select 1 from public.project_reviews where id=rid and user_id=u and project_id=p.id and decision='completed' and completion_cycle=p.completion_cycle);
  changed:=true;
 elsif p_operation='review.submit' then
  if p.status='completed' then raise exception 'PROJECT_ALREADY_COMPLETED' using errcode='23514'; end if;
  if jsonb_array_length(q->'evidence')>200 then raise exception 'PROJECT_RESOURCE_LIMIT' using errcode='54000'; end if;
  -- All selected resource locks, then concrete relation locks, in stable order.
  for cid in select distinct rr.resource_id from jsonb_array_elements(q->'evidence') e join public.resource_relations rr on rr.id=(e->>'relation_id')::uuid and rr.user_id=u and rr.target_type='project' and rr.target_id=p.id order by rr.resource_id loop
   perform 1 from public.resources where id=cid and user_id=u and archived_at is null for share;
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
   locked_resource_ids:=array_append(locked_resource_ids,cid);
  end loop;
  for x in select value from jsonb_array_elements(q->'evidence') order by (value->>'relation_id')::uuid loop
   select rr.resource_id into cid from public.resource_relations rr join public.resources r on r.id=rr.resource_id and r.user_id=rr.user_id
    where rr.id=(x->>'relation_id')::uuid and rr.user_id=u and rr.target_type='project' and rr.target_id=p.id and r.archived_at is null for share of rr;
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
   if not cid=any(locked_resource_ids) then raise exception 'PROJECT_STALE_RESOURCE' using errcode='23514'; end if;
  end loop;
  ctx:=public.project_review_context(p.id);
  if jsonb_array_length(ctx->'work')>5000 or jsonb_array_length(ctx->'criteria')>1000 or jsonb_array_length(ctx->'resources')>1000 or octet_length(ctx::text)>2097152 then raise exception 'PROJECT_CONTEXT_LIMIT' using errcode='54000'; end if;
  if q->>'fingerprint' is distinct from ctx->>'fingerprint' then raise exception 'PROJECT_STALE_CONTEXT' using errcode='23514'; end if;
  d:=q->>'decision'; t:=q->>'rationale'; note:=q->>'open_work_disposition';
  if d is null or d not in ('completed','continue') or t is null or char_length(t) not between 1 and 2000 then raise exception 'PROJECT_REVIEW_INVALID' using errcode='23514'; end if;
  if d='continue' and ((q->>'result_accepted')::boolean or (q->>'open_work_acknowledged')::boolean or note is not null) then raise exception 'PROJECT_CONTINUE_INVALID' using errcode='23514'; end if;
  select count(*) filter(where archived_at is null),count(*) filter(where archived_at is not null) into count_active,count_archived from public.project_completion_criteria where user_id=u and project_id=p.id and (archived_at is null or archived_cycle=p.completion_cycle);
  if d='completed' and (p.desired_result is null or count_active=0 or not (q->>'result_accepted')::boolean) then raise exception 'PROJECT_COMPLETION_PRECONDITION' using errcode='23514'; end if;
  if (q->>'archived_criteria_acknowledged')::boolean<>(count_archived>0) or jsonb_array_length(q->'archived_ids')<>count_archived or
    exists(select 1 from public.project_completion_criteria c where c.user_id=u and c.project_id=p.id and c.archived_at is not null and c.archived_cycle=p.completion_cycle and not q->'archived_ids' ? c.id::text) then raise exception 'PROJECT_ARCHIVED_SCOPE_STALE' using errcode='23514'; end if;
  for x in select value from jsonb_array_elements(q->'archived_notes') loop
   if not q->'archived_ids' ? (x->>'id') or char_length(x->>'note')>2000 or (select count(*) from jsonb_array_elements(q->'archived_notes') where value->>'id'=x->>'id')<>1 then raise exception 'PROJECT_ARCHIVED_SCOPE_INVALID' using errcode='23514'; end if;
  end loop;
  if jsonb_array_length(q->'criteria')<>count_active then raise exception 'PROJECT_CRITERION_SET_STALE' using errcode='23514'; end if;
  for c in select * from public.project_completion_criteria where user_id=u and project_id=p.id and archived_at is null order by id loop
   select value into x from jsonb_array_elements(q->'criteria') where value->>'id'=c.id::text;
   if not found or (select count(*) from jsonb_array_elements(q->'criteria') where value->>'id'=c.id::text)<>1 then raise exception 'PROJECT_CRITERION_SET_STALE' using errcode='23514'; end if;
   if x->>'assessment' is null or x->>'assessment' not in ('satisfied','not_satisfied','not_assessed') or (d='completed' and x->>'assessment'<>'satisfied') then raise exception 'PROJECT_CRITERION_ASSESSMENT_INVALID' using errcode='23514'; end if;
   if (x->>'assessment'='not_satisfied' and x->>'note' is null) or char_length(x->>'note')>2000 then raise exception 'PROJECT_CRITERION_RATIONALE_REQUIRED' using errcode='23514'; end if;
  end loop;
  open_count:=(ctx->>'open_task_count')::integer+(ctx->>'open_milestone_count')::integer;
  if d='completed' and ((open_count>0 and (not (q->>'open_work_acknowledged')::boolean or note is null or char_length(note) not between 1 and 2000)) or
    (open_count=0 and ((q->>'open_work_acknowledged')::boolean or note is not null))) then raise exception 'PROJECT_OPEN_WORK_ACK_REQUIRED' using errcode='23514'; end if;
  insert into public.project_reviews(user_id,project_id,command_id,completion_cycle,revision_before,revision_after,project_title_snapshot,desired_result_snapshot,goal_id_snapshot,goal_title_snapshot,
   decision,prior_status,resulting_status,result_accepted,rationale,work_observed_at,context_fingerprint,open_task_count,done_task_count,canceled_task_count,open_milestone_count,done_milestone_count,open_work_acknowledged,open_work_disposition,archived_criteria_acknowledged)
  values(u,p.id,p_command_id,p.completion_cycle,p.completion_revision,p.completion_revision+1,p.title,p.desired_result,p.goal_id,ctx->>'goal_title',d,p.status,case when d='completed' then 'completed'::public.project_status else p.status end,
   (q->>'result_accepted')::boolean,t,(ctx->>'work_observed_at')::timestamptz,ctx->>'fingerprint',(ctx->>'open_task_count')::integer,(ctx->>'done_task_count')::integer,(ctx->>'canceled_task_count')::integer,(ctx->>'open_milestone_count')::integer,(ctx->>'done_milestone_count')::integer,
   (q->>'open_work_acknowledged')::boolean,note,(q->>'archived_criteria_acknowledged')::boolean) returning id into rid;
  insert into public.project_review_criteria(user_id,project_id,review_id,criterion_id,text_snapshot,sort_order_snapshot,was_archived,archive_reason_snapshot,archived_cycle_snapshot,archived_revision_snapshot,decision,rationale)
   select u,p.id,rid,c.id,c.text,c.sort_order,c.archived_at is not null,c.archive_reason,c.archived_cycle,c.archived_revision,
    case when c.archived_at is not null then 'excluded' else a.value->>'assessment' end,case when c.archived_at is not null then b.value->>'note' else a.value->>'note' end
   from public.project_completion_criteria c left join lateral(select value from jsonb_array_elements(q->'criteria') where value->>'id'=c.id::text) a on true
   left join lateral(select value from jsonb_array_elements(q->'archived_notes') where value->>'id'=c.id::text) b on true
   where c.user_id=u and c.project_id=p.id and (c.archived_at is null or c.archived_cycle=p.completion_cycle);
  for x in select value from jsonb_array_elements(q->'evidence') loop
   select value into evidence from jsonb_array_elements(ctx->'resources') where value->>'relation_id'=x->>'relation_id';
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
   if evidence->>'token' is distinct from x->>'token' then raise exception 'PROJECT_STALE_RESOURCE' using errcode='23514'; end if;
   insert into public.project_review_resources(user_id,project_id,review_id,criterion_id,resource_id,relation_id_snapshot,title_snapshot,resource_type_snapshot,safe_url_snapshot,project_role_snapshot,relation_type_snapshot,note)
    values(u,p.id,rid,(x->>'criterion_id')::uuid,(evidence->>'id')::uuid,(evidence->>'relation_id')::uuid,evidence->>'title',evidence->>'type',project_depth_private.safe_url(evidence->>'url'),evidence->>'role',evidence->>'relation_type',x->>'note');
  end loop;
  update public.projects set status=case when d='completed' then 'completed'::public.project_status else status end,completion_revision=p.completion_revision+1 where id=p.id and user_id=u;
  changed:=true; result:=result||jsonb_build_object('review_id',rid,'decision',d);
 end if;
 if p_operation in ('project.reopen','project.archive') or reopen then
  if p.status='completed' then
   select id into prior_review from public.project_reviews where user_id=u and project_id=p.id and decision='completed' and completion_cycle=p.completion_cycle;
   prior_kind:=case when prior_review is null then 'legacy_without_review' else 'review' end;
  end if;
  update public.projects set status=case when reopen then 'active'::public.project_status else 'archived'::public.project_status end,
   archived_at=case when reopen then null else now() end,completion_cycle=p.completion_cycle+case when reopen then 1 else 0 end,completion_revision=p.completion_revision+1 where id=p.id and user_id=u;
  insert into public.project_lifecycle_events(user_id,project_id,command_id,event_kind,revision_after,cycle_before,cycle_after,project_title_snapshot,prior_status,resulting_status,prior_completion_kind,prior_review_id,reason,mistaken_completion)
   values(u,p.id,p_command_id,case when reopen then 'reopened' else 'archived' end,p.completion_revision+1,p.completion_cycle,p.completion_cycle+case when reopen then 1 else 0 end,p.title,p.status,
    case when reopen then 'active'::public.project_status else 'archived'::public.project_status end,prior_kind,prior_review,q->>'reason',mistaken);
 end if;
 if p_operation='review.amend' or (p_operation='project.reopen' and mistaken and prior_review is not null) then
  insert into public.project_review_amendments(user_id,project_id,review_id,command_id,revision_after,kind,review_resource_id,reason)
   values(u,p.id,case when p_operation='review.amend' then rid else prior_review end,p_command_id,p.completion_revision+1,
    case when p_operation='review.amend' then q->>'kind' else 'marked_mistaken' end,(q->>'review_resource_id')::uuid,q->>'reason') returning id into aid;
  result:=result||jsonb_build_object('amendment_id',aid);
 end if;
 -- Commands that changed Criteria/History without metadata still advance once.
 if changed then update public.projects set completion_revision=p.completion_revision+1 where id=p.id and user_id=u and completion_revision=p.completion_revision; end if;
 result:=result||(select jsonb_build_object('completion_revision',completion_revision::text,'completion_cycle',completion_cycle::text,'status',status,'no_op',not changed) from public.projects where id=p.id and user_id=u);
 insert into public.project_command_receipts(user_id,project_id,command_id,command_kind,request_payload,request_fingerprint,result_payload) values(u,p.id,p_command_id,p_operation,identity_payload,h,result);
 return result;
end $$;
alter function public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb) owner to life_os_project_command;
create function public.guard_project_depth_immutable() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 -- Administrative owner deletion is a separate auth.users cascade, never an
 -- application privilege. Product commands have no UPDATE/DELETE grants.
 if tg_op='DELETE' and current_user in ('postgres','supabase_admin') then return old; end if;
 raise exception 'PROJECT_HISTORY_IMMUTABLE' using errcode='42501';
end $$;
create function public.guard_project_criterion_identity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.id,new.user_id,new.project_id,new.created_at) is distinct from (old.id,old.user_id,old.project_id,old.created_at) or old.archived_at is not null then
  raise exception 'PROJECT_CRITERION_IMMUTABLE' using errcode='42501'; end if;
 return new;
end $$;
create trigger project_criterion_identity before update on public.project_completion_criteria for each row execute function public.guard_project_criterion_identity();
do $$declare t text; begin
 foreach t in array array['project_reviews','project_review_criteria','project_review_resources','project_lifecycle_events','project_review_amendments','project_command_receipts'] loop
  execute format('create trigger project_history_immutable before update or delete on public.%I for each row execute function public.guard_project_depth_immutable()',t);
 end loop;
end $$;
-- Deferred guards validate the immutable chain, not just the final Project
-- status: complete -> reopen -> archive in one transaction is legitimate.
create function public.check_project_depth_chain() returns trigger language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare r public.project_reviews%rowtype; l public.project_lifecycle_events%rowtype; a public.project_review_amendments%rowtype; begin
 if tg_table_name='projects' then
  if not exists(select 1 from public.projects where id=new.id and user_id=new.user_id) then return null; end if;
  if (new.status,new.archived_at,new.completion_cycle) is distinct from (old.status,old.archived_at,old.completion_cycle) then
   if new.status='completed' then
    if not exists(select 1 from public.project_reviews r where r.user_id=new.user_id and r.project_id=new.id and r.decision='completed'
     and r.completion_cycle=new.completion_cycle and r.revision_before=old.completion_revision and r.revision_after=new.completion_revision and r.prior_status=old.status) then raise exception 'PROJECT_COMPLETION_REVIEW_REQUIRED' using errcode='23514'; end if;
   elsif old.status='completed' or new.status='archived' then
    if not exists(select 1 from public.project_lifecycle_events l where l.user_id=new.user_id and l.project_id=new.id and l.revision_after=new.completion_revision
     and l.cycle_before=old.completion_cycle and l.cycle_after=new.completion_cycle and l.prior_status=old.status and l.resulting_status=new.status) then raise exception 'PROJECT_LIFECYCLE_REQUIRED' using errcode='23514'; end if;
   elsif new.completion_cycle<>old.completion_cycle then raise exception 'PROJECT_CYCLE_REOPEN_REQUIRED' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='project_reviews' then
  select * into r from public.project_reviews where id=new.id and user_id=new.user_id;
  if not found then return null; end if;
  if r.decision='completed' and (not exists(select 1 from public.project_review_criteria c where c.review_id=r.id and not c.was_archived)
    or exists(select 1 from public.project_review_criteria c where c.review_id=r.id and not c.was_archived and c.decision<>'satisfied')) then raise exception 'PROJECT_COMPLETION_CRITERIA_REQUIRED' using errcode='23514'; end if;
  if exists(select 1 from public.project_review_criteria c where c.review_id=r.id and c.was_archived and c.archived_cycle_snapshot<>r.completion_cycle)
   or r.archived_criteria_acknowledged<>exists(select 1 from public.project_review_criteria c where c.review_id=r.id and c.was_archived) then raise exception 'PROJECT_ARCHIVED_SCOPE_INVALID' using errcode='23514'; end if;
  if not exists(select 1 from public.project_command_receipts c where c.user_id=r.user_id and c.project_id=r.project_id and c.command_id=r.command_id and c.command_kind='review.submit'
    and (c.result_payload->>'completion_revision')::bigint=r.revision_after and c.result_payload->>'status'=r.resulting_status::text
    and c.request_payload->'payload'->>'fingerprint'=r.context_fingerprint
    and jsonb_array_length(c.request_payload->'payload'->'criteria')=(select count(*) from public.project_review_criteria x where x.review_id=r.id and not x.was_archived)
    and jsonb_array_length(c.request_payload->'payload'->'archived_ids')=(select count(*) from public.project_review_criteria x where x.review_id=r.id and x.was_archived)) then raise exception 'PROJECT_REVIEW_RECEIPT_INVALID' using errcode='23514'; end if;
 elsif tg_table_name='project_lifecycle_events' then
  l:=new;
  if l.prior_review_id is not null and not exists(select 1 from public.project_reviews r where r.id=l.prior_review_id and r.user_id=l.user_id and r.project_id=l.project_id and r.decision='completed' and r.completion_cycle=l.cycle_before) then raise exception 'PROJECT_PRIOR_COMPLETION_INVALID' using errcode='23514'; end if;
  if l.mistaken_completion and l.prior_review_id is not null and not exists(select 1 from public.project_review_amendments a where a.review_id=l.prior_review_id and a.command_id=l.command_id and a.kind='marked_mistaken' and a.revision_after=l.revision_after) then raise exception 'PROJECT_MISTAKEN_REOPEN_REQUIRED' using errcode='23514'; end if;
 elsif tg_table_name='project_review_amendments' then
  a:=new;
  if a.kind='marked_mistaken' and exists(select 1 from public.project_reviews r join public.projects p on p.id=r.project_id and p.user_id=r.user_id where r.id=a.review_id and r.decision='completed' and p.status='completed' and p.completion_cycle=r.completion_cycle)
    and not exists(select 1 from public.project_lifecycle_events l where l.prior_review_id=a.review_id and l.command_id=a.command_id and l.mistaken_completion) then raise exception 'PROJECT_MISTAKEN_REOPEN_REQUIRED' using errcode='23514'; end if;
 end if;
 return null;
end $$;
alter function public.check_project_depth_chain() owner to life_os_project_command;
create constraint trigger project_depth_transition after update on public.projects deferrable initially deferred for each row execute function public.check_project_depth_chain();
create constraint trigger project_review_chain after insert on public.project_reviews deferrable initially deferred for each row execute function public.check_project_depth_chain();
create constraint trigger project_lifecycle_chain after insert on public.project_lifecycle_events deferrable initially deferred for each row execute function public.check_project_depth_chain();
create constraint trigger project_amendment_chain after insert on public.project_review_amendments deferrable initially deferred for each row execute function public.check_project_depth_chain();
revoke all on function public.check_project_depth_chain(),public.guard_project_depth_immutable(),public.guard_project_criterion_identity() from public,anon,authenticated;

create or replace function public.guard_project_depth_initial_command_fields()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'postgres' and (new.status in ('completed','archived') or new.completion_revision<>0 or new.completion_cycle<>0) then
  raise exception 'PROJECT_COMMAND_REQUIRED' using errcode='42501'; end if;
 return new;
end $$;
alter table public.project_completion_criteria add constraint project_criterion_archive_not_partial check (
 (archived_at is null and archive_reason is null and archived_cycle is null and archived_revision is null)
 or (archived_at is not null and archive_reason is not null and archived_cycle is not null and archived_revision is not null));
grant usage on schema extensions to life_os_project_command;
grant execute on function extensions.digest(bytea,text) to life_os_project_command;
-- History page and every included Review detail come from one MVCC statement.
-- Revision ordering is authoritative; timestamps are descriptive only.
create function public.project_depth_history(p_project_id uuid,p_before_revision bigint default null) returns jsonb
language sql stable security invoker set search_path='' as $$
 with items as (
  select r.revision_after revision,r.id,'review' kind from public.project_reviews r where r.user_id=(select auth.uid()) and r.project_id=p_project_id
  union all select l.revision_after,l.id,'lifecycle' from public.project_lifecycle_events l where l.user_id=(select auth.uid()) and l.project_id=p_project_id
  union all select a.revision_after,a.id,'amendment' from public.project_review_amendments a where a.user_id=(select auth.uid()) and a.project_id=p_project_id
 ), first_page as (select * from items where p_before_revision is null or revision<p_before_revision order by revision desc,id limit 50),
 page as (select * from items where (p_before_revision is null or revision<p_before_revision) and revision>=(select min(revision) from first_page)),
 reviews as (select r.* from public.project_reviews r join page on page.id=r.id and page.kind='review'),
 detail as (select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('completion_cycle',r.completion_cycle::text,'revision_before',r.revision_before::text,'revision_after',r.revision_after::text) order by r.revision_after desc,r.id),'[]') rows from reviews r)
 select jsonb_build_object('items',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'revision',revision::text) order by revision desc,id),'[]') from page),
 'reviews',detail.rows,
 'criteria',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('sort_order_snapshot',c.sort_order_snapshot::text,'archived_cycle_snapshot',c.archived_cycle_snapshot::text,'archived_revision_snapshot',c.archived_revision_snapshot::text)),'[]') from public.project_review_criteria c join reviews r on r.id=c.review_id and r.user_id=c.user_id and r.project_id=c.project_id),
 'resources',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.project_review_resources s join reviews r on r.id=s.review_id and r.user_id=s.user_id and r.project_id=s.project_id),
 'lifecycle',(select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('revision_after',l.revision_after::text,'cycle_before',l.cycle_before::text,'cycle_after',l.cycle_after::text)),'[]') from public.project_lifecycle_events l join page on page.id=l.id and page.kind='lifecycle'),
 'amendments',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('revision_after',a.revision_after::text)),'[]') from public.project_review_amendments a where a.user_id=(select auth.uid()) and a.project_id=p_project_id and (exists(select 1 from page where id=a.id and kind='amendment') or exists(select 1 from reviews r where r.id=a.review_id))),
 'next_revision',(select min(revision)::text from page having exists(select 1 from items where revision<(select min(revision) from page)))) from detail
$$;
revoke all on function public.project_depth_history(uuid,bigint) from public,anon;
grant execute on function public.project_depth_history(uuid,bigint) to authenticated;
alter table public.project_lifecycle_events add constraint project_lifecycle_completion_identity check (
 (prior_status='completed' and prior_completion_kind is not null and prior_completion_kind in ('review','legacy_without_review'))
 or (prior_status<>'completed' and prior_completion_kind is null));
-- Validate server provenance at capture time. Later legitimate edits of the
-- current definition cannot invalidate an already immutable snapshot.
create function public.check_project_snapshot_capture() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.project_completion_criteria%rowtype; r public.project_reviews%rowtype; source record; begin
 select * into r from public.project_reviews where user_id=new.user_id and project_id=new.project_id and id=new.review_id;
 if not found then raise exception 'PROJECT_REVIEW_NOT_FOUND' using errcode='42501'; end if;
 if tg_table_name='project_review_criteria' then
  select * into c from public.project_completion_criteria where user_id=new.user_id and project_id=new.project_id and id=new.criterion_id;
  if not found or (c.archived_at is not null and c.archived_cycle<>r.completion_cycle) then raise exception 'PROJECT_CRITERION_SET_STALE' using errcode='23514'; end if;
  if (new.text_snapshot,new.sort_order_snapshot,new.was_archived,new.archive_reason_snapshot,new.archived_cycle_snapshot,new.archived_revision_snapshot) is distinct from
     (c.text,c.sort_order,c.archived_at is not null,c.archive_reason,c.archived_cycle,c.archived_revision) then raise exception 'PROJECT_CRITERION_SNAPSHOT_INVALID' using errcode='23514'; end if;
  if r.decision='completed' and not new.was_archived and new.decision<>'satisfied' then raise exception 'PROJECT_CRITERION_ASSESSMENT_INVALID' using errcode='23514'; end if;
 else
  select rr.*,rs.title,rs.type,rs.url into source from public.resource_relations rr join public.resources rs on rs.id=rr.resource_id and rs.user_id=rr.user_id
   where rr.id=new.relation_id_snapshot and rr.user_id=new.user_id and rr.target_type='project' and rr.target_id=new.project_id and rs.archived_at is null;
  if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
  if (new.resource_id,new.title_snapshot,new.resource_type_snapshot,new.safe_url_snapshot,new.project_role_snapshot,new.relation_type_snapshot) is distinct from
     (source.resource_id,source.title,source.type::text,project_depth_private.safe_url(source.url),source.project_role,source.relation_type::text) then raise exception 'PROJECT_RESOURCE_SNAPSHOT_INVALID' using errcode='23514'; end if;
 end if;
 return new;
end $$;
alter function public.check_project_snapshot_capture() owner to life_os_project_command;
revoke all on function public.check_project_snapshot_capture() from public,anon,authenticated;
create trigger project_criterion_capture before insert on public.project_review_criteria for each row execute function public.check_project_snapshot_capture();
create trigger project_resource_capture before insert on public.project_review_resources for each row execute function public.check_project_snapshot_capture();

-- Reject untrimmed Unicode whitespace on the direct new-Project result path.
alter table public.projects add constraint projects_desired_result_unicode_trim check(desired_result is null or
 desired_result = btrim(desired_result, chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)));
