-- Full migrated disposable fixture only. Real authenticated invoker/RLS paths.
begin;
insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('15300000-0000-4000-8000-000000000001','15300000-0000-4000-8000-000000000001','authenticated','authenticated','153-owner@example.test','{}','{}',now(),now()),
('15300000-0000-4000-8000-000000000002','15300000-0000-4000-8000-000000000002','authenticated','authenticated','153-other@example.test','{}','{}',now(),now());
insert into public.projects(id,user_id,title,status,archived_at) values
('15300000-0000-4000-8000-000000000010','15300000-0000-4000-8000-000000000001','Archived timestamp','active',now()),
('15300000-0000-4000-8000-000000000011','15300000-0000-4000-8000-000000000001','Archived status','archived',null),
('15300000-0000-4000-8000-000000000012','15300000-0000-4000-8000-000000000002','Foreign Parent','active',null);
insert into public.tasks(id,user_id,title,status) values
('15300000-0000-4000-8000-000000000020','15300000-0000-4000-8000-000000000002','Foreign Task','inbox');
create function pg_temp.assert(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERT: %',label; end if; end $$;
create function pg_temp.reject(sql text,expected text) returns void language plpgsql as $$
begin
 begin execute sql; exception when others then
  if position(expected in sqlerrm)=0 then raise exception 'Unexpected rejection: % (wanted %)',sqlerrm,expected;end if;return;
 end;
 raise exception 'Write unexpectedly succeeded: %',sql;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','15300000-0000-4000-8000-000000000001',true);
do $$
declare
 u uuid:=auth.uid(); project uuid; goal uuid; skill uuid; capture uuid; target uuid;
 route text; routed jsonb; item public.inbox_items%rowtype; task public.tasks%rowtype;
 historical public.tasks%rowtype; released public.tasks%rowtype; prior jsonb;
 predecessor uuid; successor uuid; source uuid; p uuid;
begin
 insert into public.projects(user_id,title,status) values(u,'153 Active','active') returning id into project;
 insert into public.goals(user_id,title,status) values(u,'153 Goal','active') returning id into goal;
 skill:=(public.skill_development_command(null,gen_random_uuid(),'skill.create',null,jsonb_build_object('name','153 Skill'))->>'skill_id')::uuid;
 foreach route in array array['task','existing_project','existing_goal','existing_skill'] loop
  insert into public.inbox_items(user_id,title,body) values(u,'Original '||route,'Original capture') returning * into item;
  capture:=item.id;target:=case route when 'existing_project' then project when 'existing_goal' then goal when 'existing_skill' then skill else null end;
  routed:=public.complete_inbox_triage(capture,item.updated_at,'Confirmed '||route,'Context','Act','Missing','P1','low',25,null,false,false,null,route,target);
  select * into task from public.tasks where id=(routed->>'id')::uuid and user_id=u;
  perform pg_temp.assert(task.status='planned' and task.source_inbox_item_id=capture,'four-route planned identity');
  perform pg_temp.assert(task.planned_date is null and task.scheduled_start_at is null and task.completed_at is null,'no implicit day/block/completion');
  perform pg_temp.assert(task.project_id is not distinct from case when route='existing_project' then project else null end,'Project context');
  perform pg_temp.assert(task.goal_id is not distinct from case when route='existing_goal' then goal else null end,'Goal context');
  if route='existing_skill' then perform pg_temp.assert(exists(select 1 from public.task_skill_links where task_id=task.id and skill_id=skill and user_id=u),'Skill context');end if;
  perform pg_temp.assert((select status='triaged' and created_task_id=task.id and original_title='Original '||route and original_body='Original capture' from public.inbox_items where id=capture),'original capture/resolve');
  prior:=to_jsonb(task);
  perform public.triage_inbox_item_to_task(capture,'Must not re-create');
  perform pg_temp.assert((select to_jsonb(t)=prior from public.tasks t where id=task.id),'idempotent complete row');
  perform pg_temp.assert((select count(*)=1 from public.tasks where source_inbox_item_id=capture),'no duplicate');
  perform pg_temp.reject(format('select public.complete_inbox_triage(%L,%L,%L,null,null,null,%L,null,null,null,false,false,null,%L,null)',capture,item.updated_at,'stale','P1','task'),'Open inbox item unavailable');
  -- Actual scheduling fields and completion use existing guards, not promotion.
  update public.tasks set planned_date='2026-10-13',scheduled_start_at='2026-10-13 18:00:00+00',duration_minutes=25 where id=task.id;
  perform public.complete_linked_task(task.id,now());
  perform pg_temp.assert((select status='done' and completed_at is not null and planned_date='2026-10-13' from public.tasks where id=task.id),'scheduled/completed loop');
 end loop;
 -- Explicit planning signals retain their existing timezone-aware meaning.
 foreach route in array array['task','existing_project','existing_goal','existing_skill'] loop
  insert into public.inbox_items(user_id,title,body) values(u,'Signal capture','Original signal') returning * into item;
  target:=case route when 'existing_project' then project when 'existing_goal' then goal when 'existing_skill' then skill else null end;
  routed:=public.complete_inbox_triage(item.id,item.updated_at,'Signal Task','Context','Act','Missing','P1','low',25,null,true,true,'2026-10-25',route,target);
  select * into task from public.tasks where id=(routed->>'id')::uuid;
  perform pg_temp.assert(task.status='planned' and task.planned_date=(now() at time zone (select timezone from public.profiles where id=u))::date and task.scheduled_start_at is null,'explicit today candidate, no block');
  perform pg_temp.assert(task.due_at=('2026-10-25'::date+time '23:59:59') at time zone (select timezone from public.profiles where id=u) and task.priority='P1' and task.energy='low' and task.duration_minutes=25,'planning signals transfer');
  perform pg_temp.assert((select review_needed and today_candidate and deadline_hint='2026-10-25' and next_action='Act' and missing_info='Missing' from public.inbox_items where id=item.id),'Inbox signals retained');
 end loop;
 -- Missing/foreign destinations reject the whole final clarification.
 foreach p in array array[gen_random_uuid(),'15300000-0000-4000-8000-000000000012'::uuid] loop
  insert into public.inbox_items(user_id,title) values(u,'Invalid destination') returning * into item;prior:=to_jsonb(item);
  perform pg_temp.reject(format('select public.complete_inbox_triage(%L,%L,%L,null,null,null,%L,null,null,null,false,false,null,%L,%L)',item.id,item.updated_at,'Must rollback','P1','existing_project',p),'Project not found');
  perform pg_temp.assert((select to_jsonb(i)=prior from public.inbox_items i where id=item.id),'foreign/missing destination atomic rollback');
  perform pg_temp.assert(not exists(select 1 from public.tasks where source_inbox_item_id=item.id),'foreign/missing destination no Task');
 end loop;
 insert into public.tasks(user_id,title,description,status,project_id,goal_id,planned_date,scheduled_start_at,duration_minutes,due_at)
 values(u,'Historical','Keep all metadata','inbox',project,goal,'2026-10-25','2026-10-25 10:00:00+00',42,'2026-10-25 22:59:59+00') returning * into historical;
 prior:=to_jsonb(historical);
 released:=public.release_inbox_task(historical.id,historical.updated_at);
 perform pg_temp.assert(released.status='planned' and released.updated_at>historical.updated_at,'release/monotonic token');
 perform pg_temp.assert((to_jsonb(released)-'status'-'updated_at')=(prior-'status'-'updated_at'),'status-only entire row');
 perform pg_temp.reject(format('select public.release_inbox_task(%L,%L)',historical.id,historical.updated_at),'TASK_RELEASE_STATUS');
 -- A stale metadata editor cannot undo release via its old hidden inbox status.
 update public.tasks set status='inbox',title='Stale editor' where id=historical.id and updated_at=historical.updated_at;
 perform pg_temp.assert((select status='planned' and title='Historical' from public.tasks where id=historical.id),'editor CAS');
 insert into public.tasks(user_id,title,status) values(u,'Stale historical','inbox') returning * into historical;
 update public.tasks set title='Concurrent title' where id=historical.id;
 perform pg_temp.assert((select updated_at>historical.updated_at from public.tasks where id=historical.id),'same transaction timestamp revision');
 prior:=(select to_jsonb(t) from public.tasks t where id=historical.id);
 perform pg_temp.reject(format('select public.release_inbox_task(%L,%L)',historical.id,historical.updated_at),'TASK_RELEASE_STALE');
 perform pg_temp.assert((select to_jsonb(t)=prior from public.tasks t where id=historical.id),'stale rollback');
 -- Direct triage retries with a legacy created_task_id retain inbox.
 insert into public.inbox_items(user_id,title) values(u,'Legacy source') returning * into item;
 insert into public.tasks(user_id,title,status,source_inbox_item_id) values(u,'Legacy original','inbox',item.id) returning * into historical;
 update public.inbox_items set created_task_id=historical.id where id=item.id;
 prior:=to_jsonb(historical);perform public.triage_inbox_item_to_task(item.id,'No implicit promotion');
 perform pg_temp.assert((select to_jsonb(t)=prior from public.tasks t where id=historical.id),'legacy idempotence retains inbox');
 foreach p in array array['15300000-0000-4000-8000-000000000010'::uuid,'15300000-0000-4000-8000-000000000011'::uuid] loop
  insert into public.tasks(user_id,title,status,project_id) values(u,'Historical Parent negative','inbox',p) returning * into historical;
  prior:=to_jsonb(historical);perform pg_temp.reject(format('select public.release_inbox_task(%L,%L)',historical.id,historical.updated_at),'TASK_PROJECT_ARCHIVED');
  perform pg_temp.assert((select to_jsonb(t)=prior from public.tasks t where id=historical.id),'archived Parent no partial mutation');
  insert into public.inbox_items(user_id,title) values(u,'Archive destination') returning * into item;
  prior:=to_jsonb(item);
  perform pg_temp.reject(format('select public.complete_inbox_triage(%L,%L,%L,null,null,null,%L,null,null,null,false,false,null,%L,%L)',item.id,item.updated_at,'Must rollback','P1','existing_project',p),'Project not found');
  perform pg_temp.assert((select to_jsonb(i)=prior from public.inbox_items i where id=item.id),'invalid destination rolls back clarification');
 end loop;
 perform pg_temp.reject('select public.release_inbox_task(''15300000-0000-4000-8000-000000000020'',now())','TASK_NOT_FOUND');
 insert into public.tasks(user_id,title,status,archived_at) values(u,'Archived Task','inbox',now()) returning * into historical;
 perform pg_temp.reject(format('select public.release_inbox_task(%L,%L)',historical.id,historical.updated_at),'TASK_NOT_FOUND');
 insert into public.meals(user_id,date,meal_type,title) values(u,'2026-10-13','lunch','Source') returning id into source;
 insert into public.tasks(user_id,title,status) values(u,'Source historical','inbox') returning * into historical;
 insert into public.schedule_source_links(user_id,source_type,source_id,task_id) values(u,'meal',source,historical.id);
 prior:=to_jsonb(historical);perform pg_temp.reject(format('select public.release_inbox_task(%L,%L)',historical.id,historical.updated_at),'SOURCE_FLOW_REQUIRED');
 perform pg_temp.assert((select to_jsonb(t)=prior from public.tasks t where id=historical.id),'Source no partial write');
 insert into public.tasks(user_id,title,status,project_id) values(u,'Pred','planned',project) returning id into predecessor;
 insert into public.tasks(user_id,title,status,project_id) values(u,'Historical blocked','inbox',project) returning * into historical;
 insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(u,project,predecessor,historical.id);
 perform public.release_inbox_task(historical.id,historical.updated_at);
 perform pg_temp.reject(format('select public.complete_linked_task(%L,now())',historical.id),'DEPENDENCY_BLOCKED');
 perform pg_temp.assert((select status='planned' and completed_at is null from public.tasks where id=historical.id),'planned does not bypass readiness');
end $$;
reset role;
-- Inject a failing Skill-link write only in this owned disposable transaction.
create function pg_temp.fail_skill_link() returns trigger language plpgsql as $$begin raise exception '153_SKILL_LINK_FAILURE';end $$;
create trigger proof_153_fail_skill_link after insert on public.task_skill_links for each row execute function pg_temp.fail_skill_link();
set local role authenticated;
do $$ declare item public.inbox_items%rowtype; skill uuid; prior jsonb; begin
 select id into skill from public.skills where user_id=auth.uid() and name='153 Skill';
 insert into public.inbox_items(user_id,title) values(auth.uid(),'Skill rollback') returning * into item;prior:=to_jsonb(item);
 perform pg_temp.reject(format('select public.complete_inbox_triage(%L,%L,%L,null,null,null,%L,null,null,null,false,false,null,%L,%L)',item.id,item.updated_at,'Must rollback','P1','existing_skill',skill),'153_SKILL_LINK_FAILURE');
 perform pg_temp.assert((select to_jsonb(i)=prior from public.inbox_items i where id=item.id),'Skill failure atomic original');
 perform pg_temp.assert(not exists(select 1 from public.tasks where source_inbox_item_id=item.id),'Skill failure no Task');
end $$;
reset role;
set local role anon;
select pg_temp.reject('select public.release_inbox_task(''15300000-0000-4000-8000-000000000020'',now())','permission denied');
reset role;
rollback;
