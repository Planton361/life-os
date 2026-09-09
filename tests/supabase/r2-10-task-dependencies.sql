-- Transactional integration proof. No retained data, no Service Role app flow.
begin;
insert into auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','authenticated','authenticated','r210-owner@example.test','{"provider":"email","providers":["email"]}','{}',now(),now()),
 ('82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','authenticated','authenticated','r210-other@example.test','{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.projects(id,user_id,title) values ('82000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','Foreign');
insert into public.tasks(id,user_id,project_id,title) values ('82000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','Foreign');
create function pg_temp.reject(sql text, expected text) returns void language plpgsql as $$
begin
 begin execute sql; exception when others then
  if position(expected in sqlerrm)=0 then raise exception 'Unexpected rejection: % (wanted %)',sqlerrm,expected; end if;
  return;
 end;
 raise exception 'Write unexpectedly succeeded: %',sql;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$
declare
 u uuid:=auth.uid(); p uuid; otherp uuid; a uuid; b uuid; c uuid; d uuid; outsider uuid; meal uuid; linked uuid; dep uuid; source uuid; session uuid; exercise uuid; plan uuid; item uuid;
begin
 insert into public.projects(user_id,title,status) values(u,'Dependency proof','active') returning id into p;
 insert into public.projects(user_id,title) values(u,'Other project') returning id into otherp;
 insert into public.tasks(user_id,project_id,title) values(u,p,'A') returning id into a;
 insert into public.tasks(user_id,project_id,title) values(u,p,'B') returning id into b;
 insert into public.tasks(user_id,project_id,title) values(u,p,'C') returning id into c;
 insert into public.tasks(user_id,project_id,title) values(u,p,'D') returning id into d;
 insert into public.tasks(user_id,project_id,title) values(u,otherp,'Other') returning id into outsider;
 insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(u,p,a,b),(u,p,a,c),(u,p,b,d),(u,p,c,d);
 perform pg_temp.reject(format('insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(%L,%L,%L,%L)',u,p,a,a),'DEPENDENCY_SELF');
 perform pg_temp.reject(format('insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(%L,%L,%L,%L)',u,p,a,b),'DEPENDENCY_DUPLICATE');
 perform pg_temp.reject(format('insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(%L,%L,%L,%L)',u,p,d,a),'DEPENDENCY_CYCLE');
 perform pg_temp.reject(format('insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(%L,%L,%L,%L)',u,p,outsider,b),'DEPENDENCY_TARGET');
 perform pg_temp.reject(format('insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(%L,%L,%L,%L)',u,p,'82000000-0000-4000-8000-000000000003',b),'DEPENDENCY_TARGET');
 perform pg_temp.reject(format('insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(%L,%L,%L,%L)','82000000-0000-4000-8000-000000000001',p,a,b),'DEPENDENCY_OWNER');
 perform pg_temp.reject(format('select public.complete_linked_task(%L,now())',b),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('update public.tasks set status=''done'',completed_at=now() where id=%L',b),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('update public.tasks set completed_at=now() where id=%L',b),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('update public.tasks set project_id=null where id=%L',a),'DEPENDENCY_PROJECT_MOVE');
 perform pg_temp.reject(format('delete from public.tasks where id=%L',a),'permission denied');
 perform public.complete_linked_task(a,now());
 perform public.complete_linked_task(b,now());
 perform pg_temp.reject(format('select public.complete_linked_task(%L,now())',d),'DEPENDENCY_BLOCKED');
 perform public.complete_linked_task(c,now());
 perform public.complete_linked_task(d,now());
 update public.tasks set status='planned',completed_at=null where id=a;
 if (select status from public.tasks where id=b) <> 'done' then raise exception 'Reopen cascaded'; end if;
 update public.tasks set status='planned',completed_at=null where id=b;
 perform pg_temp.reject(format('select public.complete_linked_task(%L,now())',b),'DEPENDENCY_BLOCKED');
 perform public.complete_linked_task(a,now());
 update public.tasks set archived_at=now(),status='archived' where id=a;
 perform pg_temp.reject(format('select public.complete_linked_task(%L,now())',b),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(%L,%L,%L,%L)',u,p,a,d),'DEPENDENCY_ARCHIVED');
 delete from public.task_dependencies where user_id=u and predecessor_task_id=a and successor_task_id=b;
 perform public.complete_linked_task(b,now());
 update public.tasks set archived_at=now(),status='archived' where id=c;
 if (select count(*) from public.task_dependencies where user_id=u) <> 3 then raise exception 'Archive lost graph history'; end if;
 -- Source-linked task: both task RPC and source RPC must roll back atomically.
 insert into public.meals(user_id,date,meal_type,title) values(u,'2026-09-09','lunch','Dependency meal') returning id into meal;
 select (public.schedule_linked_source('meal',meal,'2026-09-09','2026-09-09T12:00:00Z',30)).id into linked;
 update public.tasks set project_id=p where id=linked;
 insert into public.tasks(user_id,project_id,title) values(u,p,'Source blocker') returning id into outsider;
 insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(u,p,outsider,linked) returning id into dep;
 update public.meals set title='Still editable while blocked' where id=meal;
 perform public.schedule_linked_source('meal',meal,'2026-09-10','2026-09-10T12:00:00Z',30);
 perform pg_temp.reject(format('select public.complete_linked_task(%L,now())',linked),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('select public.complete_linked_meal(%L,now())',meal),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('update public.meals set completed_at=now() where id=%L',meal),'DEPENDENCY_BLOCKED');
 if (select completed_at from public.meals where id=meal) is not null or (select completed_at from public.tasks where id=linked) is not null then raise exception 'Partial source completion'; end if;
 delete from public.task_dependencies where id=dep and user_id=u;
 perform public.complete_linked_meal(meal,now());
 if (select status from public.tasks where id=linked) <> 'done' then raise exception 'Source completion did not release'; end if;
 if jsonb_array_length(public.read_task_dependency_graph()->'tasks') <> 7 then raise exception 'Graph ownership or completeness'; end if;
 -- Review RPC and direct update: blocked completion cannot persist review facts.
 insert into public.review_records(user_id,kind,period_start,period_end,timezone) values(u,'daily','2026-09-09','2026-09-09','Europe/Berlin') returning id into source;
 select (public.schedule_linked_source('review',source,'2026-09-09','2026-09-09T18:00:00Z',30)).id into linked;
 update public.tasks set project_id=p where id=linked;
 insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(u,p,outsider,linked);
 perform pg_temp.reject(format('update public.review_records set status=''completed'',completed_at=now() where id=%L',source),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject($q$select public.save_daily_review_with_carry_over('2026-09-09','Europe/Berlin','completed','Proof','{}','{}','{}','','','{}')$q$,'DEPENDENCY_BLOCKED');
 if (select status from public.review_records where id=source) <> 'draft' then raise exception 'Partial review write'; end if;
 delete from public.task_dependencies where successor_task_id=linked and user_id=u;
 perform public.save_daily_review_with_carry_over('2026-09-09','Europe/Berlin','completed','Proof','{}','{}','{}','','','{}');
 if (select status from public.tasks where id=linked) <> 'done' then raise exception 'Review release failed'; end if;
 -- Running insertion/RPC completion with real session metrics.
 insert into public.running_plans(user_id,name,goal) values(u,'Dependency run','Measured running') returning id into plan;
 insert into public.running_plan_items(user_id,plan_id,title,sort_order) values(u,plan,'Run',1) returning id into item;
 select (public.schedule_linked_source('running_plan_item',item,'2026-09-09','2026-09-09T18:00:00Z',30)).id into linked;
 update public.tasks set project_id=p where id=linked;
 insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(u,p,outsider,linked);
 perform pg_temp.reject(format('select public.save_completed_running_session(null,%L,''2026-09-09'',now(),5,30,140,''Proof'',now())',item),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('insert into public.running_sessions(user_id,plan_item_id,session_date,distance_km,duration_minutes,status,completed_at) values(%L,%L,''2026-09-09'',5,30,''completed'',now())',u,item),'DEPENDENCY_BLOCKED');
 if exists(select 1 from public.running_sessions where user_id=u and plan_item_id=item) then raise exception 'Partial running write'; end if;
 delete from public.task_dependencies where successor_task_id=linked and user_id=u;
 perform public.save_completed_running_session(null,item,'2026-09-09',now(),5,30,140,'Proof',now());
 if (select status from public.tasks where id=linked) <> 'done' then raise exception 'Running release failed'; end if;
 -- Strength keeps real-set evidence and atomically rejects blocked completion.
 insert into public.strength_plans(user_id,name,goal) values(u,'Dependency strength','Real set evidence') returning id into plan;
 insert into public.exercises(user_id,name) values(u,'Squat') returning id into exercise;
 select (public.schedule_linked_source('strength_plan',plan,'2026-09-09','2026-09-09T18:00:00Z',30)).id into linked;
 update public.tasks set project_id=p where id=linked;
 insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values(u,p,outsider,linked);
 insert into public.strength_sessions(user_id,plan_id,session_date) values(u,plan,'2026-09-09') returning id into session;
 insert into public.strength_set_logs(user_id,session_id,exercise_id,set_order,repetitions) values(u,session,exercise,1,8);
 perform pg_temp.reject(format('select public.complete_strength_session(%L,now())',session),'DEPENDENCY_BLOCKED');
 perform pg_temp.reject(format('update public.strength_sessions set status=''completed'',completed_at=now() where id=%L',session),'DEPENDENCY_BLOCKED');
 if (select status from public.strength_sessions where id=session) <> 'in_progress' then raise exception 'Partial strength write'; end if;
 delete from public.task_dependencies where successor_task_id=linked and user_id=u;
 perform public.complete_strength_session(session,now());
 if (select status from public.tasks where id=linked) <> 'done' then raise exception 'Strength release failed'; end if;

end $$;
rollback;
select 'R2_10_DB_INVARIANTS_PASS';
