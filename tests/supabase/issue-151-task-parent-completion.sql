-- Disposable synthetic identities, full current migrations, real authenticated
-- RLS/trigger/RPC boundaries. Entire fixture rolls back; never run on production.
begin;
insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('15100000-0000-4000-8000-000000000001','15100000-0000-4000-8000-000000000001','authenticated','authenticated','151-owner@example.test','{}','{}',now(),now()),
('15100000-0000-4000-8000-000000000002','15100000-0000-4000-8000-000000000002','authenticated','authenticated','151-other@example.test','{}','{}',now(),now());
-- Legacy inconsistent archive markers are seeded only by the disposable fixture
-- administrator. Normal Project archive still uses project_depth_command.
insert into public.projects(id,user_id,title,status,archived_at) values
('15100000-0000-4000-8000-000000000010','15100000-0000-4000-8000-000000000001','Archived timestamp','active',now()),
('15100000-0000-4000-8000-000000000011','15100000-0000-4000-8000-000000000001','Archived status','archived',null),
('15100000-0000-4000-8000-000000000012','15100000-0000-4000-8000-000000000002','Foreign Parent','active',null);
create function pg_temp.reject(sql text, expected text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if position(expected in sqlerrm)=0 then raise exception 'Unexpected rejection: % (wanted %)',sqlerrm,expected; end if;
    return;
  end;
  raise exception 'Write unexpectedly succeeded: %',sql;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','15100000-0000-4000-8000-000000000001',true);
do $$
declare
  u uuid:=auth.uid(); p uuid; t uuid; standalone uuid; active_parent uuid; allowed_task uuid;
  source uuid; linked uuid; plan uuid; item uuid; session uuid; exercise uuid;
  before_task jsonb; before_project jsonb; kind text;
begin
  insert into public.projects(user_id,title,status) values(u,'Allowed Parent','active') returning id into active_parent;
  insert into public.tasks(user_id,title,status) values(u,'Standalone','planned') returning id into standalone;
  perform public.complete_linked_task(standalone,now());
  if (select status from public.tasks where id=standalone)<>'done' then raise exception 'Standalone positive failed'; end if;
  insert into public.tasks(user_id,title,project_id,status) values(u,'Allowed Task',active_parent,'planned') returning id into t;
  allowed_task:=t;
  update public.tasks set status='done',completed_at=now() where id=t;
  if (select status from public.tasks where id=t)<>'done' then raise exception 'Parent positive failed'; end if;
  update public.tasks set status='planned',completed_at=null where id=standalone;
  foreach p in array array['15100000-0000-4000-8000-000000000010'::uuid,'15100000-0000-4000-8000-000000000011'::uuid] loop
    insert into public.tasks(user_id,title,project_id,status) values(u,'Archived Parent negative',p,'planned') returning id into t;
    select to_jsonb(x) into before_task from public.tasks x where id=t;
    select to_jsonb(x) into before_project from public.projects x where id=p;
    perform pg_temp.reject(format('select public.complete_linked_task(%L,now())',t),'TASK_PROJECT_ARCHIVED');
    perform pg_temp.reject(format('update public.tasks set status=''done'',title=''Must roll back'' where id=%L',t),'TASK_PROJECT_ARCHIVED');
    perform pg_temp.reject(format('update public.tasks set completed_at=now() where id=%L',t),'TASK_PROJECT_ARCHIVED');
    perform pg_temp.reject(format('update public.tasks set project_id=null,status=''done'' where id=%L',t),'TASK_PROJECT_ARCHIVED');
    perform pg_temp.reject(format('update public.tasks set project_id=%L,status=''done'' where id=%L',active_parent,t),'TASK_PROJECT_ARCHIVED');
    if (select to_jsonb(x) from public.tasks x where id=t)<>before_task or (select to_jsonb(x) from public.projects x where id=p)<>before_project then raise exception 'Partial Task/Project write'; end if;
    foreach kind in array array['meal','review','running_plan_item','strength_plan'] loop
      if kind='meal' then
        insert into public.meals(user_id,date,meal_type,title) values(u,'2026-10-12','lunch','#151 Meal') returning id into source;
      elsif kind='review' then
        insert into public.review_records(user_id,kind,period_start,period_end,timezone) values(u,'daily',case when p::text like '%010' then '2026-10-12'::date else '2026-10-13'::date end,case when p::text like '%010' then '2026-10-12'::date else '2026-10-13'::date end,'Europe/Berlin') returning id into source;
      elsif kind='running_plan_item' then
        insert into public.running_plans(user_id,name,goal) values(u,'#151 Run','Real metrics') returning id into plan;
        insert into public.running_plan_items(user_id,plan_id,title,sort_order) values(u,plan,'#151 Run',0) returning id into source;
      else
        insert into public.strength_plans(user_id,name,goal) values(u,'#151 Strength','Real sets') returning id into source;
        insert into public.exercises(user_id,name) values(u,'#151 Press') returning id into exercise;
        insert into public.strength_sessions(user_id,plan_id,session_date) values(u,source,'2026-10-12') returning id into session;
        insert into public.strength_set_logs(user_id,session_id,exercise_id,set_order,repetitions) values(u,session,exercise,1,8);
      end if;
      select (public.schedule_linked_source(kind,source,'2026-10-12','2026-10-12T12:00:00Z',30)).id into linked;
      update public.tasks set project_id=p where id=linked;
      select to_jsonb(x) into before_task from public.tasks x where id=linked;
      if kind='meal' then
        perform pg_temp.reject(format('select public.complete_linked_meal(%L,now())',source),'TASK_PROJECT_ARCHIVED');
        perform pg_temp.reject(format('update public.meals set completed_at=now() where id=%L',source),'TASK_PROJECT_ARCHIVED');
        if (select completed_at from public.meals where id=source) is not null then raise exception 'Partial Meal'; end if;
      elsif kind='review' then
        perform pg_temp.reject(format('update public.review_records set status=''completed'',completed_at=now() where id=%L',source),'TASK_PROJECT_ARCHIVED');
        perform pg_temp.reject(format('select public.save_daily_review_with_carry_over(%L,''Europe/Berlin'',''completed'',''Proof'',''{}'',''{}'',''{}'','''','''',''{}'')',case when p::text like '%010' then '2026-10-12' else '2026-10-13' end),'TASK_PROJECT_ARCHIVED');
        if (select status from public.review_records where id=source)<>'draft' then raise exception 'Partial Review'; end if;
      elsif kind='running_plan_item' then
        perform pg_temp.reject(format('select public.save_completed_running_session(null,%L,''2026-10-12'',now(),5,30,140,''Proof'',now())',source),'TASK_PROJECT_ARCHIVED');
        perform pg_temp.reject(format('insert into public.running_sessions(user_id,plan_item_id,session_date,distance_km,duration_minutes,status,completed_at) values(%L,%L,''2026-10-12'',5,30,''completed'',now())',u,source),'TASK_PROJECT_ARCHIVED');
        if exists(select 1 from public.running_sessions where user_id=u and plan_item_id=source) then raise exception 'Partial Run history'; end if;
      else
        perform pg_temp.reject(format('select public.complete_strength_session(%L,now())',session),'TASK_PROJECT_ARCHIVED');
        perform pg_temp.reject(format('update public.strength_sessions set status=''completed'',completed_at=now() where id=%L',session),'TASK_PROJECT_ARCHIVED');
        if (select status from public.strength_sessions where id=session)<>'in_progress' then raise exception 'Partial Strength'; end if;
      end if;
      if (select to_jsonb(x) from public.tasks x where id=linked)<>before_task then raise exception 'Partial Source Task'; end if;
    end loop;
  end loop;
  perform pg_temp.reject(format('update public.tasks set project_id=%L,status=''done'',completed_at=now() where id=%L','15100000-0000-4000-8000-000000000012',standalone),'TASK_PROJECT_NOT_FOUND');
  -- Completion preceding canonical archive is retained history, not a new
  -- completion under an already archived Parent.
  perform public.project_depth_command(active_parent,gen_random_uuid(),'project.archive',0,0,'{}');
  if (select status from public.tasks where id=allowed_task)<>'done' then raise exception 'Archive changed completed history'; end if;
end $$;
set constraints all immediate;
rollback;
