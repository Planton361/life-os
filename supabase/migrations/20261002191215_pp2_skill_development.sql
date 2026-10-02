-- #94 / USER ACCEPTED #93: Skill-owned planning, explicit evidence and immutable reviews.
begin;
do $$begin if not exists(select 1 from pg_roles where rolname='life_os_skill_command') then create role life_os_skill_command nologin nobypassrls;end if;end$$;
create schema skill_development_private;
revoke all on schema skill_development_private from public, anon, authenticated;
grant usage on schema public, auth, skill_development_private to life_os_skill_command;
grant create on schema skill_development_private to life_os_skill_command;
grant execute on function auth.uid() to life_os_skill_command;

alter table public.skills add column development_revision bigint not null default 0 check(development_revision>=0);
create table public.skill_development_targets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 skill_id uuid not null, title text not null check(length(btrim(title)) between 1 and 200), description text check(length(description)<=8000),
 status text not null default 'planned' check(status in ('planned','current','completed','retired')),
 cycle integer not null default 1 check(cycle>0), archived_at timestamptz, terminal_review_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,skill_id,id),
 foreign key(user_id,skill_id) references public.skills(user_id,id) on delete no action deferrable initially deferred,
 check(archived_at is null or status<>'current'), check((status in ('completed','retired'))=(terminal_review_id is not null))
);
create unique index skill_target_current on public.skill_development_targets(user_id,skill_id) where archived_at is null and status='current';
create table public.skill_milestones (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 skill_id uuid not null, target_id uuid not null, title text not null check(length(btrim(title)) between 1 and 200), description text check(length(description)<=8000),
 sort_order integer not null check(sort_order>=0), status text not null default 'planned' check(status in ('planned','current','completed')),
 cycle integer not null default 1 check(cycle>0), archived_at timestamptz, terminal_review_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,skill_id,target_id,id),
 foreign key(user_id,skill_id,target_id) references public.skill_development_targets(user_id,skill_id,id) on delete no action deferrable initially deferred,
 check(archived_at is null or status<>'current'), check((status='completed')=(terminal_review_id is not null))
);
create unique index skill_milestone_current on public.skill_milestones(user_id,target_id) where archived_at is null and status='current';
-- Deferrable ordering allows one atomic full-set reorder without temporary invalid positions.
alter table public.skill_milestones add column active_position integer generated always as (case when archived_at is null then sort_order end) stored;
alter table public.skill_milestones add unique(user_id,target_id,active_position) deferrable initially deferred;

create table public.skill_development_reviews (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 skill_id uuid not null,target_id uuid not null,milestone_id uuid,cycle integer not null check(cycle>0),
 decision text not null check(decision in ('continue','completed','retired')), note text not null check(length(btrim(note)) between 1 and 8000),
 reviewed_at timestamptz not null default now(),aggregate_revision bigint not null,snapshot_version integer not null default 1 check(snapshot_version=1),
 subject_snapshot jsonb not null,milestones_snapshot jsonb not null,
 unique(user_id,skill_id,target_id,id),unique(user_id,skill_id,target_id,milestone_id,id),
 foreign key(user_id,skill_id,target_id) references public.skill_development_targets(user_id,skill_id,id) on delete no action deferrable initially deferred,
 foreign key(user_id,skill_id,target_id,milestone_id) references public.skill_milestones(user_id,skill_id,target_id,id) on delete no action deferrable initially deferred,
 check(milestone_id is null or decision<>'retired')
);
alter table public.skill_development_targets add foreign key(user_id,skill_id,id,terminal_review_id) references public.skill_development_reviews(user_id,skill_id,target_id,id) on delete no action deferrable initially deferred;
alter table public.skill_milestones add foreign key(user_id,skill_id,target_id,id,terminal_review_id) references public.skill_development_reviews(user_id,skill_id,target_id,milestone_id,id) on delete no action deferrable initially deferred;

-- Refuse cross-owner legacy data; never silently move or delete it.
alter table public.skill_evidence drop constraint skill_evidence_skill_id_fkey;
alter table public.skill_evidence add unique(user_id,skill_id,id),
 add foreign key(user_id,skill_id) references public.skills(user_id,id) on delete no action deferrable initially deferred,
 add column revision integer not null default 1 check(revision>0), add column withdrawn_at timestamptz,
 add column source_snapshot jsonb,add column provenance_state text not null default 'legacy_unverified' check(provenance_state in ('captured','legacy_unverified'));
create table public.skill_evidence_revisions (
 user_id uuid not null references auth.users(id) on delete cascade,skill_id uuid not null,evidence_id uuid not null,revision integer not null check(revision>0),
 source_type text not null,source_id uuid,title text not null,note text,evidence_date date not null,weight integer,
 withdrawn_at timestamptz,source_snapshot jsonb,provenance_state text not null,
 operation text not null check(operation in ('baseline','create','correct','withdraw','restore')),reason text,recorded_at timestamptz not null default now(),
 primary key(user_id,evidence_id,revision),unique(user_id,skill_id,evidence_id,revision),
 foreign key(user_id,skill_id,evidence_id) references public.skill_evidence(user_id,skill_id,id) on delete no action deferrable initially deferred,
 check(source_type in ('task','project','goal','resource','manual_note')),
 check(provenance_state in ('captured','legacy_unverified')),
 check(weight is null or weight between 1 and 5),
 check(operation not in ('correct','withdraw','restore') or (reason is not null and length(btrim(reason)) between 1 and 8000))
);
insert into public.skill_evidence_revisions(user_id,skill_id,evidence_id,revision,source_type,source_id,title,note,evidence_date,weight,provenance_state,operation)
 select user_id,skill_id,id,1,source_type,source_id,title,note,evidence_date,weight,'legacy_unverified','baseline' from public.skill_evidence;
-- Drain baseline FK events before adding the reciprocal head FK/History triggers.
-- This is essential on an upgrade with existing Evidence (fresh databases have no events).
set constraints all immediate;
set constraints all deferred;
alter table public.skill_evidence add foreign key(user_id,skill_id,id,revision) references public.skill_evidence_revisions(user_id,skill_id,evidence_id,revision) on delete no action deferrable initially deferred;
create table public.skill_development_review_evidence (
 user_id uuid not null references auth.users(id) on delete cascade,skill_id uuid not null,target_id uuid not null,review_id uuid not null,evidence_id uuid not null,evidence_revision integer not null,
 primary key(user_id,review_id,evidence_id),
 foreign key(user_id,skill_id,target_id,review_id) references public.skill_development_reviews(user_id,skill_id,target_id,id) on delete no action deferrable initially deferred,
 foreign key(user_id,skill_id,evidence_id,evidence_revision) references public.skill_evidence_revisions(user_id,skill_id,evidence_id,revision) on delete no action deferrable initially deferred
);
create table public.skill_development_review_amendments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,skill_id uuid not null,target_id uuid not null,review_id uuid not null,
 kind text not null check(kind in ('clarification','withdrawal','mistaken')),note text not null check(length(btrim(note)) between 1 and 8000),created_at timestamptz not null default now(),
 foreign key(user_id,skill_id,target_id,review_id) references public.skill_development_reviews(user_id,skill_id,target_id,id) on delete no action deferrable initially deferred
);
create table public.skill_command_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,command_id uuid not null,skill_id uuid not null,operation text not null,request jsonb not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(user_id,command_id),foreign key(user_id,skill_id) references public.skills(user_id,id) on delete no action deferrable initially deferred
);

-- Narrow command role, effective RLS, no direct Data API writes or receipt reads.
do $$declare t text;begin
 foreach t in array array['skills','skill_evidence','skill_development_targets','skill_milestones','skill_development_reviews','skill_evidence_revisions','skill_development_review_evidence','skill_development_review_amendments','skill_command_receipts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  if t<>'skill_command_receipts' then
   execute format('grant select on public.%I to authenticated',t);
   if t not in ('skills','skill_evidence') then execute format('create policy skill_owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);end if;
  end if;
  execute format('grant select,insert on public.%I to life_os_skill_command',t);
  execute format('create policy skill_command_read on public.%I for select to life_os_skill_command using(user_id=(select auth.uid()))',t);
  execute format('create policy skill_command_insert on public.%I for insert to life_os_skill_command with check(user_id=(select auth.uid()))',t);
  if t in ('skills','skill_evidence','skill_development_targets','skill_milestones') then
   execute format('grant update on public.%I to life_os_skill_command',t);
   execute format('create policy skill_command_update on public.%I for update to life_os_skill_command using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
  end if;
 end loop;
 foreach t in array array['areas','tasks','projects','goals','resources','profiles'] loop
  execute format('grant select on public.%I to life_os_skill_command',t);
  execute format('create policy skill_source_read on public.%I for select to life_os_skill_command using(%I=(select auth.uid()))',t,case when t='profiles' then 'id' else 'user_id' end);
 end loop;
 grant update on public.areas to life_os_skill_command; -- row-lock privilege; no UPDATE policy/grant to clients added
end$$;

create function skill_development_private.immutable() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' then
  if exists(select 1 from auth.users where id=old.user_id) then raise exception 'SKILL_HISTORY_IMMUTABLE' using errcode='23514';end if;return old;
 end if;
 raise exception 'SKILL_HISTORY_IMMUTABLE' using errcode='23514';
end$$;
create function skill_development_private.identity_guard() returns trigger language plpgsql set search_path='' as $$begin
 if new.user_id<>old.user_id or new.id<>old.id or (to_jsonb(new)->'skill_id') is distinct from (to_jsonb(old)->'skill_id') or (to_jsonb(new)->'target_id') is distinct from (to_jsonb(old)->'target_id') then raise exception 'SKILL_IDENTITY_IMMUTABLE' using errcode='23514';end if;
 return new;
end$$;
do $$declare t text;begin
 foreach t in array array['skill_development_reviews','skill_evidence_revisions','skill_development_review_evidence','skill_development_review_amendments','skill_command_receipts'] loop
  execute format('create trigger skill_history_immutable before update or delete on public.%I for each row execute function skill_development_private.immutable()',t);
 end loop;
 foreach t in array array['skills','skill_evidence','skill_development_targets','skill_milestones'] loop
  execute format('create trigger skill_identity_immutable before update on public.%I for each row execute function skill_development_private.identity_guard()',t);
 end loop;
end$$;

create function skill_development_private.check_aggregate() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid:=new.user_id;s uuid:=case when tg_table_name='skills' then (to_jsonb(new)->>'id')::uuid else (to_jsonb(new)->>'skill_id')::uuid end;e public.skill_evidence%rowtype;v public.skill_evidence_revisions%rowtype;
begin
 if exists(select 1 from public.skill_development_targets t join public.skills k on k.id=t.skill_id and k.user_id=t.user_id where t.user_id=u and t.skill_id=s and t.status='current' and (k.archived_at is not null or k.status='archived'))
 or exists(select 1 from public.skill_milestones m join public.skill_development_targets t on (t.user_id,t.skill_id,t.id)=(m.user_id,m.skill_id,m.target_id) where m.user_id=u and m.skill_id=s and m.status='current' and (t.status<>'current' or t.archived_at is not null)) then raise exception 'SKILL_CURRENT_PARENT_INVALID' using errcode='23514';end if;
 if exists(select 1 from public.skill_development_targets t join public.skill_development_reviews r on r.id=t.terminal_review_id where t.user_id=u and t.skill_id=s and (r.milestone_id is not null or r.cycle<>t.cycle or r.decision<>t.status or exists(select 1 from public.skill_development_review_amendments a where a.review_id=r.id and a.kind in ('withdrawal','mistaken'))))
 or exists(select 1 from public.skill_milestones m join public.skill_development_reviews r on r.id=m.terminal_review_id where m.user_id=u and m.skill_id=s and (r.cycle<>m.cycle or r.decision<>'completed' or exists(select 1 from public.skill_development_review_amendments a where a.review_id=r.id and a.kind in ('withdrawal','mistaken')))) then raise exception 'SKILL_TERMINAL_REVIEW_INVALID' using errcode='23514';end if;
 for e in select * from public.skill_evidence where user_id=u and skill_id=s loop
  select * into v from public.skill_evidence_revisions where user_id=u and skill_id=s and evidence_id=e.id and revision=e.revision;
  if not found or (e.source_type,e.source_id,e.title,e.note,e.evidence_date,e.weight,e.withdrawn_at,e.source_snapshot,e.provenance_state) is distinct from (v.source_type,v.source_id,v.title,v.note,v.evidence_date,v.weight,v.withdrawn_at,v.source_snapshot,v.provenance_state) then raise exception 'SKILL_EVIDENCE_HEAD_INVALID' using errcode='23514';end if;
 end loop;
 return null;
end$$;
alter function skill_development_private.check_aggregate() owner to life_os_skill_command;
do $$declare t text;begin
 foreach t in array array['skills','skill_development_targets','skill_milestones','skill_evidence','skill_evidence_revisions','skill_development_review_amendments'] loop
  execute format('create constraint trigger skill_aggregate_consistent after insert or update on public.%I deferrable initially deferred for each row execute function skill_development_private.check_aggregate()',t);
 end loop;
end$$;

create function skill_development_private.capture_source(u uuid,kind text,source uuid) returns jsonb language plpgsql set search_path='' as $$
declare x jsonb;table_name text;
begin
 if kind='manual_note' then if source is not null then raise exception 'SKILL_SOURCE_INVALID' using errcode='22023';end if;return jsonb_build_object('version',1,'source_type',kind,'source_id',null,'captured_at',now());end if;
 table_name:=case kind when 'task' then 'tasks' when 'project' then 'projects' when 'goal' then 'goals' when 'resource' then 'resources' end;
 if table_name is null or source is null then raise exception 'SKILL_SOURCE_INVALID' using errcode='22023';end if;
 execute format('select to_jsonb(r) from public.%I r where user_id=$1 and id=$2 and archived_at is null',table_name) into x using u,source;
 if x is null or x->>'status'='archived' then raise exception 'SKILL_SOURCE_UNAVAILABLE' using errcode='42501';end if;
 return jsonb_strip_nulls(jsonb_build_object('version',1,'source_type',kind,'source_id',source,'title',x->>'title','status',x->>'status','updated_at',x->>'updated_at','task_completed_at',case when kind='task' then x->>'completed_at' end,'captured_at',now()));
end$$;

create function public.skill_development_command(p_skill_id uuid,p_command_id uuid,p_operation text,p_expected_revision bigint,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare u uuid:=auth.uid();s public.skills%rowtype;t public.skill_development_targets%rowtype;m public.skill_milestones%rowtype;e public.skill_evidence%rowtype;r public.skill_development_reviews%rowtype;
 receipt public.skill_command_receipts%rowtype;q jsonb;identity_request jsonb;result jsonb;rid uuid;tid uuid;mid uuid;eid uuid;area uuid;item jsonb;ids uuid[];n integer;decision text;note_text text;kind text;today date;src jsonb;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_command_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1048576 then raise exception 'SKILL_COMMAND_INVALID' using errcode='22023';end if;
 if p_operation is null or p_operation not in ('skill.create','skill.edit','skill.archive','skill.restore','target.create','target.edit','target.current','target.archive','target.restore','target.reopen','milestone.create','milestone.edit','milestone.current','milestone.reorder','milestone.archive','milestone.restore','milestone.reopen','review.submit','review.amend','evidence.create','evidence.correct','evidence.withdraw','evidence.restore') then raise exception 'SKILL_COMMAND_INVALID' using errcode='22023';end if;
 if (p_operation='skill.create' and (p_skill_id is not null or p_expected_revision is not null)) or (p_operation<>'skill.create' and (p_skill_id is null or p_expected_revision is null or p_expected_revision<0)) then raise exception 'SKILL_COMMAND_INVALID' using errcode='22023';end if;
 if p_operation in ('skill.create','skill.edit') and (length(coalesce(p_payload->>'summary',''))>8000 or length(coalesce(p_payload->>'category',''))>8000 or length(coalesce(p_payload->>'level',''))>8000) then raise exception 'SKILL_TEXT_TOO_LONG' using errcode='22023';end if;
 -- Canonical whitespace/null handling; ordered arrays retain meaningful order.
 select coalesce(jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(btrim(value#>>'{}')) else value end),'{}'::jsonb) into q from jsonb_each(p_payload);
 identity_request:=jsonb_build_object('version',1,'operation',p_operation,'skill_id',p_skill_id,'expected_revision',p_expected_revision,'payload',q);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||p_command_id::text,0));
 select * into receipt from public.skill_command_receipts where user_id=u and command_id=p_command_id;
 if found then if receipt.request is distinct from identity_request then raise exception 'SKILL_COMMAND_KEY_CONFLICT' using errcode='23505';end if;return receipt.result;end if;
 if p_operation='skill.create' then
  area:=(q->>'area_id')::uuid;
  if area is not null then perform 1 from public.areas where id=area and user_id=u and archived_at is null for share;if not found then raise exception 'SKILL_AREA_UNAVAILABLE' using errcode='42501';end if;end if;
  if length(coalesce(q->>'name','')) not between 1 and 200 then raise exception 'SKILL_NAME_INVALID' using errcode='22023';end if;
  insert into public.skills(user_id,area_id,name,summary,category,level,status,development_revision,archived_at) values(u,area,q->>'name',nullif(q->>'summary',''),nullif(q->>'category',''),nullif(q->>'level',''),coalesce(q->>'status','active'),0,case when q->>'status'='archived' then now() end) returning * into s;
 else
  select * into s from public.skills where user_id=u and id=p_skill_id for update;
  if not found then raise exception 'SKILL_NOT_FOUND' using errcode='42501';end if;
  if s.development_revision<>p_expected_revision then raise exception 'SKILL_STALE' using errcode='23514';end if;
  if (s.archived_at is not null or s.status='archived') and p_operation not in ('skill.restore','review.amend') then raise exception 'SKILL_ARCHIVED' using errcode='23514';end if;
 end if;
 result:=jsonb_build_object('skill_id',s.id,'operation',p_operation,'command_id',p_command_id);
 if p_operation='skill.edit' then
  if q?'name' and length(coalesce(q->>'name','')) not between 1 and 200 then raise exception 'SKILL_NAME_INVALID' using errcode='22023';end if;
  area:=case when q?'area_id' then (q->>'area_id')::uuid else s.area_id end;
  if area is not null then perform 1 from public.areas where user_id=u and id=area and archived_at is null for share;if not found then raise exception 'SKILL_AREA_UNAVAILABLE' using errcode='42501';end if;end if;
  if q->>'status'='archived' then raise exception 'SKILL_USE_ARCHIVE_COMMAND' using errcode='22023';end if;
  update public.skills set name=coalesce(q->>'name',name),summary=case when q?'summary' then nullif(q->>'summary','') else summary end,category=case when q?'category' then nullif(q->>'category','') else category end,level=case when q?'level' then nullif(q->>'level','') else level end,area_id=area,status=coalesce(q->>'status',status) where user_id=u and id=s.id;
 end if;
 if p_operation in ('skill.archive','skill.restore') then
  if p_operation='skill.restore' and s.archived_at is null and s.status<>'archived' then raise exception 'SKILL_RESTORE_INVALID' using errcode='23514';end if;
  update public.skill_milestones set status='planned',updated_at=now() where user_id=u and skill_id=s.id and status='current';
  update public.skill_development_targets set status='planned',updated_at=now() where user_id=u and skill_id=s.id and status='current';
  update public.skills set status=case when p_operation='skill.archive' then 'archived' else 'paused' end,archived_at=case when p_operation='skill.archive' then now() end where user_id=u and id=s.id;
 end if;
 tid:=(q->>'target_id')::uuid;mid:=(q->>'milestone_id')::uuid;
 if p_operation='target.create' then
  insert into public.skill_development_targets(user_id,skill_id,title,description) values(u,s.id,q->>'title',nullif(q->>'description','')) returning id into tid;
  result:=result||jsonb_build_object('target_id',tid);
 elsif p_operation like 'target.%' or p_operation like 'milestone.%' or p_operation='review.submit' then
  select * into t from public.skill_development_targets where user_id=u and skill_id=s.id and id=tid;
  if not found then raise exception 'SKILL_TARGET_NOT_FOUND' using errcode='42501';end if;
  if t.archived_at is not null and p_operation<>'target.restore' then raise exception 'SKILL_TARGET_ARCHIVED' using errcode='23514';end if;
  if t.status in ('completed','retired') and p_operation not in ('target.archive','target.restore','target.reopen') then raise exception 'SKILL_TARGET_FROZEN' using errcode='23514';end if;
 end if;
 if p_operation='target.edit' then update public.skill_development_targets set title=coalesce(q->>'title',title),description=case when q?'description' then nullif(q->>'description','') else description end,updated_at=now() where user_id=u and id=tid;end if;
 if p_operation='target.current' then
  update public.skill_milestones set status='planned',updated_at=now() where user_id=u and skill_id=s.id and status='current';
  update public.skill_development_targets set status='planned',updated_at=now() where user_id=u and skill_id=s.id and status='current';
  update public.skill_development_targets set status='current',updated_at=now() where user_id=u and id=tid;
 end if;
 if p_operation in ('target.archive','target.restore','target.reopen') then
  if p_operation='target.restore' and t.archived_at is null then raise exception 'SKILL_RESTORE_INVALID' using errcode='23514';end if;
  update public.skill_milestones set status='planned',updated_at=now() where user_id=u and target_id=tid and status='current';
  if p_operation='target.reopen' and t.status not in ('completed','retired') then raise exception 'SKILL_REOPEN_INVALID' using errcode='23514';end if;
  update public.skill_development_targets set status=case when p_operation='target.reopen' or status='current' then 'planned' else status end,archived_at=case when p_operation='target.archive' then now() when p_operation='target.restore' then null else archived_at end,cycle=cycle+case when p_operation='target.reopen' then 1 else 0 end,terminal_review_id=case when p_operation='target.reopen' then null else terminal_review_id end,updated_at=now() where user_id=u and id=tid;
 end if;
 if p_operation='milestone.create' then
  select coalesce(max(sort_order)+1,0) into n from public.skill_milestones where user_id=u and target_id=tid and archived_at is null;
  insert into public.skill_milestones(user_id,skill_id,target_id,title,description,sort_order) values(u,s.id,tid,q->>'title',nullif(q->>'description',''),n) returning id into mid;
  result:=result||jsonb_build_object('milestone_id',mid);
 elsif (p_operation like 'milestone.%' and p_operation<>'milestone.reorder') or (p_operation='review.submit' and mid is not null) then
  select * into m from public.skill_milestones where user_id=u and skill_id=s.id and target_id=tid and id=mid;
  if not found then raise exception 'SKILL_MILESTONE_NOT_FOUND' using errcode='42501';end if;
  if m.archived_at is not null and p_operation<>'milestone.restore' then raise exception 'SKILL_MILESTONE_ARCHIVED' using errcode='23514';end if;
  if m.status='completed' and p_operation not in ('milestone.reopen','milestone.archive','milestone.restore') then raise exception 'SKILL_MILESTONE_FROZEN' using errcode='23514';end if;
 end if;
 if p_operation='milestone.edit' then update public.skill_milestones set title=coalesce(q->>'title',title),description=case when q?'description' then nullif(q->>'description','') else description end,updated_at=now() where user_id=u and id=mid;end if;
 if p_operation='milestone.current' then
  if t.status<>'current' then raise exception 'SKILL_CURRENT_PARENT_INVALID' using errcode='23514';end if;
  update public.skill_milestones set status='planned',updated_at=now() where user_id=u and target_id=tid and status='current';
  update public.skill_milestones set status='current',updated_at=now() where user_id=u and id=mid;
 end if;
 if p_operation='milestone.reorder' then
  select array_agg(value::uuid order by ord) into ids from jsonb_array_elements_text(q->'ids') with ordinality a(value,ord);
  if ids is null or cardinality(ids)<>(select count(*) from public.skill_milestones where user_id=u and target_id=tid and archived_at is null) or cardinality(ids)<>(select count(distinct x) from unnest(ids)x) or exists(select 1 from unnest(ids)x where not exists(select 1 from public.skill_milestones where id=x and user_id=u and target_id=tid and archived_at is null)) then raise exception 'SKILL_ORDER_INVALID' using errcode='22023';end if;
  update public.skill_milestones set sort_order=array_position(ids,id)-1,updated_at=now() where user_id=u and target_id=tid and archived_at is null;
 end if;
 if p_operation in ('milestone.archive','milestone.restore','milestone.reopen') then
  if p_operation='milestone.restore' and m.archived_at is null then raise exception 'SKILL_RESTORE_INVALID' using errcode='23514';end if;
  if p_operation='milestone.reopen' and m.status<>'completed' then raise exception 'SKILL_REOPEN_INVALID' using errcode='23514';end if;
  select coalesce(max(sort_order)+1,0) into n from public.skill_milestones where user_id=u and target_id=tid and archived_at is null;
  update public.skill_milestones set status=case when p_operation='milestone.reopen' or status='current' then 'planned' else status end,archived_at=case when p_operation='milestone.archive' then now() when p_operation='milestone.restore' then null else archived_at end,sort_order=case when p_operation='milestone.restore' then n else sort_order end,cycle=cycle+case when p_operation='milestone.reopen' then 1 else 0 end,terminal_review_id=case when p_operation='milestone.reopen' then null else terminal_review_id end,updated_at=now() where user_id=u and id=mid;
 end if;
 if p_operation='review.submit' then
  decision:=q->>'decision';note_text:=q->>'note';
  if decision in ('completed','retired') and mid is null and exists(select 1 from public.skill_milestones where user_id=u and target_id=tid and archived_at is null and status<>'completed') and coalesce((q->>'open_milestones_acknowledged')::boolean,false)=false then raise exception 'SKILL_OPEN_MILESTONES_ACK_REQUIRED' using errcode='23514';end if;
  insert into public.skill_development_reviews(user_id,skill_id,target_id,milestone_id,cycle,decision,note,aggregate_revision,subject_snapshot,milestones_snapshot)
   values(u,s.id,tid,mid,case when mid is null then t.cycle else m.cycle end,decision,note_text,s.development_revision,
    case when mid is null then to_jsonb(t) else to_jsonb(m) end,
    coalesce((select jsonb_agg(to_jsonb(z) order by sort_order,id) from public.skill_milestones z where user_id=u and target_id=tid and archived_at is null),'[]')) returning id into rid;
  for item in select value from jsonb_array_elements(coalesce(q->'evidence','[]')) loop
   select * into e from public.skill_evidence where user_id=u and skill_id=s.id and id=(item->>'id')::uuid and withdrawn_at is null and revision=(item->>'revision')::integer;
   if not found then raise exception 'SKILL_EVIDENCE_STALE' using errcode='23514';end if;
   insert into public.skill_development_review_evidence values(u,s.id,tid,rid,e.id,e.revision);
  end loop;
  if decision in ('completed','retired') then
   if mid is null then
    update public.skill_milestones set status='planned',updated_at=now() where user_id=u and target_id=tid and status='current';
    update public.skill_development_targets set status=decision,terminal_review_id=rid,updated_at=now() where user_id=u and id=tid;
   else update public.skill_milestones set status=decision,terminal_review_id=rid,updated_at=now() where user_id=u and id=mid;end if;
  end if;
  result:=result||jsonb_build_object('review_id',rid);
 end if;
 if p_operation='review.amend' then
  select * into r from public.skill_development_reviews where user_id=u and skill_id=s.id and id=(q->>'review_id')::uuid;
  if not found then raise exception 'SKILL_REVIEW_NOT_FOUND' using errcode='42501';end if;
  kind:=q->>'kind';
  insert into public.skill_development_review_amendments(user_id,skill_id,target_id,review_id,kind,note) values(u,s.id,r.target_id,r.id,kind,q->>'note');
  if kind in ('withdrawal','mistaken') then
   if r.milestone_id is null then
    update public.skill_milestones set status='planned',updated_at=now() where user_id=u and target_id=r.target_id and status='current' and exists(select 1 from public.skill_development_targets where id=r.target_id and terminal_review_id=r.id);
    update public.skill_development_targets set status='planned',terminal_review_id=null,cycle=cycle+1,updated_at=now() where user_id=u and id=r.target_id and terminal_review_id=r.id;
   else update public.skill_milestones set status='planned',terminal_review_id=null,cycle=cycle+1,updated_at=now() where user_id=u and id=r.milestone_id and terminal_review_id=r.id;end if;
  end if;
 end if;
 if p_operation like 'evidence.%' then
  eid:=(q->>'evidence_id')::uuid;
  if p_operation<>'evidence.create' then select * into e from public.skill_evidence where user_id=u and skill_id=s.id and id=eid;if not found then raise exception 'SKILL_EVIDENCE_NOT_FOUND' using errcode='42501';end if;end if;
  if p_operation in ('evidence.create','evidence.correct') then
   if length(coalesce(q->>'title','')) not between 1 and 200 or length(coalesce(q->>'note',''))>8000 or q->>'evidence_date' is null then raise exception 'SKILL_EVIDENCE_INVALID' using errcode='22023';end if;
   select (now() at time zone coalesce((select timezone from public.profiles where id=u),'Europe/Berlin'))::date into today;
   if (q->>'evidence_date')::date>today then raise exception 'SKILL_EVIDENCE_FUTURE' using errcode='22023';end if;
   src:=skill_development_private.capture_source(u,q->>'source_type',(q->>'source_id')::uuid);
  end if;
  if p_operation<>'evidence.create' and length(coalesce(q->>'reason','')) not between 1 and 8000 then raise exception 'SKILL_CORRECTION_REASON_REQUIRED' using errcode='22023';end if;
  if p_operation='evidence.create' then
   insert into public.skill_evidence(user_id,skill_id,title,note,evidence_date,source_type,source_id,weight,source_snapshot,provenance_state) values(u,s.id,q->>'title',nullif(q->>'note',''),(q->>'evidence_date')::date,q->>'source_type',(q->>'source_id')::uuid,(q->>'weight')::integer,src,'captured') returning * into e;
  elsif p_operation='evidence.correct' then
   update public.skill_evidence set title=q->>'title',note=nullif(q->>'note',''),evidence_date=(q->>'evidence_date')::date,source_type=q->>'source_type',source_id=(q->>'source_id')::uuid,weight=(q->>'weight')::integer,source_snapshot=src,provenance_state='captured',revision=revision+1 where user_id=u and id=eid returning * into e;
  else
   if (p_operation='evidence.withdraw' and e.withdrawn_at is not null) or (p_operation='evidence.restore' and e.withdrawn_at is null) then raise exception 'SKILL_EVIDENCE_STATE_INVALID' using errcode='23514';end if;
   update public.skill_evidence set withdrawn_at=case when p_operation='evidence.withdraw' then now() end,revision=revision+1 where user_id=u and id=eid returning * into e;
  end if;
  insert into public.skill_evidence_revisions(user_id,skill_id,evidence_id,revision,source_type,source_id,title,note,evidence_date,weight,withdrawn_at,source_snapshot,provenance_state,operation,reason)
   values(u,s.id,e.id,e.revision,e.source_type,e.source_id,e.title,e.note,e.evidence_date,e.weight,e.withdrawn_at,e.source_snapshot,e.provenance_state,split_part(p_operation,'.',2),q->>'reason');
  result:=result||jsonb_build_object('evidence_id',e.id);
 end if;
 if p_operation<>'skill.create' then update public.skills set development_revision=development_revision+1 where id=s.id and user_id=u;end if;
 result:=result||(select jsonb_build_object('development_revision',development_revision) from public.skills where id=s.id and user_id=u);
 insert into public.skill_command_receipts(user_id,command_id,skill_id,operation,request,result) values(u,p_command_id,s.id,p_operation,identity_request,result);
 return result;
end$$;
alter function public.skill_development_command(uuid,uuid,text,bigint,jsonb) owner to life_os_skill_command;
revoke all on function public.skill_development_command(uuid,uuid,text,bigint,jsonb) from public,anon;
grant execute on function public.skill_development_command(uuid,uuid,text,bigint,jsonb) to authenticated;
grant execute on all functions in schema skill_development_private to life_os_skill_command;
revoke all on all functions in schema skill_development_private from public,anon,authenticated;
create index skill_reviews_read on public.skill_development_reviews(user_id,skill_id,reviewed_at,id);
create index skill_milestones_target_read on public.skill_milestones(user_id,skill_id,target_id);
create index skill_review_evidence_version on public.skill_development_review_evidence(user_id,skill_id,evidence_id,evidence_revision);
revoke create on schema skill_development_private from life_os_skill_command;

-- One statement / one MVCC snapshot: Practice is current state, never an episode ledger.
create function public.skill_development_read(p_skill_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('skill',to_jsonb(s),'as_of',statement_timestamp(),'timezone',coalesce((select timezone from public.profiles where id=auth.uid()),'Europe/Berlin'),
 'targets',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from public.skill_development_targets t where t.user_id=auth.uid() and t.skill_id=s.id),'[]'),
 'milestones',coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order,m.id) from public.skill_milestones m where m.user_id=auth.uid() and m.skill_id=s.id),'[]'),
 'evidence',coalesce((select jsonb_agg(to_jsonb(e) order by e.evidence_date desc,e.id) from public.skill_evidence e where e.user_id=auth.uid() and e.skill_id=s.id),'[]'),
 'revisions',coalesce((select jsonb_agg(to_jsonb(v) order by v.recorded_at desc,v.evidence_id,v.revision desc) from public.skill_evidence_revisions v where v.user_id=auth.uid() and v.skill_id=s.id),'[]'),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.reviewed_at desc,r.id) from public.skill_development_reviews r where r.user_id=auth.uid() and r.skill_id=s.id),'[]'),
 'review_evidence',coalesce((select jsonb_agg(to_jsonb(x)) from public.skill_development_review_evidence x where x.user_id=auth.uid() and x.skill_id=s.id),'[]'),
 'amendments',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at,a.id) from public.skill_development_review_amendments a where a.user_id=auth.uid() and a.skill_id=s.id),'[]'),
 'practice',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('linked_at',l.created_at) order by t.id) from public.task_skill_links l join public.tasks t on t.user_id=l.user_id and t.id=l.task_id where l.user_id=auth.uid() and l.skill_id=s.id),'[]'))
 from public.skills s where s.user_id=auth.uid() and s.id=p_skill_id;
$$;
revoke all on function public.skill_development_read(uuid) from public,anon;
grant execute on function public.skill_development_read(uuid) to authenticated;

commit;
