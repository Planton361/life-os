-- Synthetic Project Depth command/security proof. Entire fixture rolls back.
begin;
insert into auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('69000000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000001','authenticated','authenticated','project-depth-owner-a@example.test','{"provider":"email","providers":["email"]}','{}',now(),now()),
 ('69000000-0000-4000-8000-000000000002','69000000-0000-4000-8000-000000000002','authenticated','authenticated','project-depth-owner-b@example.test','{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.projects(id,user_id,title,status)
values('69000000-0000-4000-8000-000000000011','69000000-0000-4000-8000-000000000001',
  'Legacy completed without review','completed');
set local role authenticated;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000001',true);
do $$begin
  begin
    insert into public.projects(id,user_id,title,status,desired_result)
      values('69000000-0000-4000-8000-000000000015',
        '69000000-0000-4000-8000-000000000001','Bypass result','active','Injected');
    if not exists(select 1 from public.projects where id='69000000-0000-4000-8000-000000000015' and desired_result='Injected' and completion_revision=0) then raise exception 'valid initial result not preserved'; end if;
  end;
  begin
    insert into public.projects(id,user_id,title,status,completion_cycle)
      values('69000000-0000-4000-8000-000000000016',
        '69000000-0000-4000-8000-000000000001','Bypass cycle','active',2);
    raise exception 'direct cycle insert accepted';
  exception when insufficient_privilege then
    if position('PROJECT_COMMAND_REQUIRED' in sqlerrm)=0 then raise; end if;
  end;
  begin
    insert into public.projects(id,user_id,title,status)
      values('69000000-0000-4000-8000-000000000019',
        '69000000-0000-4000-8000-000000000001','Bypass completion','completed');
    raise exception 'direct completed insert accepted';
  exception when insufficient_privilege then
    if position('PROJECT_COMMAND_REQUIRED' in sqlerrm)=0 then raise; end if;
  end;
end $$;
insert into public.projects(id,user_id,title,status)
values('69000000-0000-4000-8000-000000000010','69000000-0000-4000-8000-000000000001','Project Depth proof','active');

do $$
declare
  p uuid := '69000000-0000-4000-8000-000000000010';
  r jsonb;
  c jsonb;
  rev bigint;
  cyc bigint;
  cid uuid;
begin
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  r := public.project_depth_command(p,'69000000-0000-4000-8000-000000000101','result.set',rev,cyc,
    '{"desired_result":"A finished result"}'::jsonb);
  if r->>'completion_revision' <> '1' then raise exception 'result revision'; end if;
  if public.project_depth_command(p,'69000000-0000-4000-8000-000000000101','result.set',rev,cyc,
    '{"desired_result":"A finished result"}'::jsonb) <> r then raise exception 'retry changed receipt'; end if;
  begin
    perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000101','result.set',rev,cyc,
      '{"desired_result":"Different result"}'::jsonb);
    raise exception 'changed-key payload accepted';
  exception when unique_violation then
    if position('PROJECT_COMMAND_KEY_CONFLICT' in sqlerrm)=0 then raise; end if;
  end;
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  r := public.project_depth_command(p,'69000000-0000-4000-8000-000000000102','criterion.create',rev,cyc,
    '{"text":"Acceptance is visible","sort_order":0}'::jsonb);
  cid := (r->>'criterion_id')::uuid;
  insert into public.tasks(user_id,project_id,title) values(
    '69000000-0000-4000-8000-000000000001',p,'Open child task');
  insert into public.project_milestones(user_id,project_id,title) values(
    '69000000-0000-4000-8000-000000000001',p,'Open child milestone');
  insert into public.resources(id,user_id,title,type,url) values(
    '69000000-0000-4000-8000-000000000050','69000000-0000-4000-8000-000000000001',
    'Evidence','link','https://example.org/proof');
  perform public.set_project_resource_role(p,'69000000-0000-4000-8000-000000000050','reference');
  c := public.project_review_context(p);
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  begin
    perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000104','review.submit',rev,cyc,
      jsonb_build_object('fingerprint',c->>'fingerprint','decision','completed','result_accepted',true,
        'rationale','Not satisfied yet','criteria',jsonb_build_array(jsonb_build_object(
          'id',cid,'assessment','not_satisfied')),'archived_ids','[]'::jsonb,
        'evidence','[]'::jsonb,'open_work_acknowledged',true,
        'open_work_disposition','Follow up'));
    raise exception 'unsatisfied completion accepted';
  exception when check_violation then
    if position('PROJECT_CRITERION_ASSESSMENT_INVALID' in sqlerrm)=0 then raise; end if;
  end;
  r := public.project_depth_command(p,'69000000-0000-4000-8000-000000000105','review.submit',rev,cyc,
    jsonb_build_object('fingerprint',c->>'fingerprint','decision','continue','result_accepted',false,
      'rationale','Continue work','criteria',jsonb_build_array(jsonb_build_object(
        'id',cid,'assessment','not_assessed')),'archived_ids','[]'::jsonb,
      'evidence','[]'::jsonb,'open_work_acknowledged',false));
  if (select status from public.projects where id=p) <> 'active' then raise exception 'continue changed status'; end if;
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  c := public.project_review_context(p);
  r := public.project_depth_command(p,'69000000-0000-4000-8000-000000000103','review.submit',rev,cyc,
    jsonb_build_object('fingerprint',c->>'fingerprint','decision','completed','result_accepted',true,
      'rationale','Accepted after inspection','criteria',jsonb_build_array(jsonb_build_object(
        'id',cid,'assessment','satisfied')),'archived_ids','[]'::jsonb,
      'evidence',jsonb_build_array(jsonb_build_object('relation_id',c->'resources'->0->>'relation_id','token',c->'resources'->0->>'token','criterion_id',null)),
      'open_work_acknowledged',true,'open_work_disposition','Follow up separately'));
  if (select status from public.projects where id=p) <> 'completed' then raise exception 'completion failed'; end if;
  if (select count(*) from public.project_review_criteria where review_id=(r->>'review_id')::uuid)<>1 then
    raise exception 'criterion snapshot missing'; end if;
  if not exists(select 1 from public.project_reviews where id=(r->>'review_id')::uuid and open_task_count=1 and open_milestone_count=1 and work_observed_at is not null) then
    raise exception 'dated work counts missing'; end if;
  if (select count(*) from public.project_review_resources where review_id=(r->>'review_id')::uuid)<>1 then
    raise exception 'resource snapshot missing'; end if;
  if (select count(*) from public.project_reviews where project_id=p)<>2 then raise exception 'review count'; end if;
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  begin
    perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000111','result.set',rev,cyc,
      '{"desired_result":"Forbidden completed edit"}'::jsonb);
    raise exception 'completed result edit accepted';
  exception when check_violation then
    if position('PROJECT_COMPLETED_FROZEN' in sqlerrm)=0 then raise; end if;
  end;
  begin
    perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000106','review.submit',rev,cyc,
      jsonb_build_object('fingerprint',c->>'fingerprint','decision','completed','criteria','[]'::jsonb,'archived_ids','[]'::jsonb,'evidence','[]'::jsonb));
    raise exception 'already completed accepted';
  exception when check_violation then
    if position('PROJECT_ALREADY_COMPLETED' in sqlerrm)=0 then raise; end if;
  end;
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000107','project.reopen',rev,cyc,'{}');
  if (select completion_cycle from public.projects where id=p)<>1 then raise exception 'reopen cycle'; end if;
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  c := public.project_review_context(p);
  perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000108','criterion.edit',rev,cyc,
    jsonb_build_object('criterion_id',cid,'text','Revised criterion'));
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  begin
    perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000109','review.submit',rev,cyc,
      jsonb_build_object('fingerprint',c->>'fingerprint','decision','continue','rationale','Stale',
        'criteria','[]'::jsonb,'archived_ids','[]'::jsonb,'evidence','[]'::jsonb));
    raise exception 'stale context accepted';
  exception when check_violation then
    if position('PROJECT_STALE_CONTEXT' in sqlerrm)=0 then raise; end if;
  end;
  c := public.project_review_context(p);
  insert into public.tasks(user_id,project_id,title) values(
    '69000000-0000-4000-8000-000000000001',p,'Task added after Review opened');
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  begin
    perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000119','review.submit',rev,cyc,
      jsonb_build_object('fingerprint',c->>'fingerprint','decision','continue',
        'rationale','Old work set','criteria',jsonb_build_array(jsonb_build_object(
          'id',cid,'assessment','not_assessed')),'archived_ids','[]'::jsonb,
        'evidence','[]'::jsonb));
    raise exception 'Task-set change accepted';
  exception when check_violation then
    if position('PROJECT_STALE_CONTEXT' in sqlerrm)=0 then raise; end if;
  end;
  if not exists (select 1 from public.project_review_criteria where project_id=p and text_snapshot='Acceptance is visible') then
    raise exception 'prior criterion snapshot changed';
  end if;
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  c := public.project_review_context(p);
  r := public.project_depth_command(p,'69000000-0000-4000-8000-000000000112','review.submit',rev,cyc,
    jsonb_build_object('fingerprint',c->>'fingerprint','decision','completed','result_accepted',true,
      'rationale','Second cycle completion','criteria',jsonb_build_array(jsonb_build_object(
        'id',cid,'assessment','satisfied')),'archived_ids','[]'::jsonb,
      'evidence','[]'::jsonb,'open_work_acknowledged',true,
      'open_work_disposition','Children retain their own status'));
  if (select count(*) from public.project_reviews where project_id=p and decision='completed')<>2 then
    raise exception 'recompletion history missing';
  end if;
  select completion_revision,completion_cycle into rev,cyc from public.projects where id=p;
  perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000113','project.archive',rev,cyc,'{}');
  if (select status from public.projects where id=p)<>'archived' or
     (select count(*) from public.project_lifecycle_events where project_id=p)<>2 then
    raise exception 'archive lifecycle missing';
  end if;
  if (select status from public.tasks where project_id=p limit 1)<>'planned' or
     (select status from public.project_milestones where project_id=p limit 1)<>'open' then
    raise exception 'child work was changed by Project lifecycle';
  end if;
  if exists (select 1 from public.project_reviews where project_id='69000000-0000-4000-8000-000000000011') then
    raise exception 'legacy history invented';
  end if;
  select completion_revision,completion_cycle into rev,cyc from public.projects
    where id='69000000-0000-4000-8000-000000000011';
  perform public.project_depth_command('69000000-0000-4000-8000-000000000011',
    '69000000-0000-4000-8000-000000000110','project.reopen',rev,cyc,'{}');
  if (select completion_cycle from public.projects where id='69000000-0000-4000-8000-000000000011')<>1 then
    raise exception 'legacy reopen failed';
  end if;
end $$;

-- Every result/criterion command shares the server-owned revision guard.
insert into public.projects(id,user_id,title,status)
values('69000000-0000-4000-8000-000000000018',
  '69000000-0000-4000-8000-000000000001','Stale and rollback proof','active');
do $$
declare
  p uuid := '69000000-0000-4000-8000-000000000018';
  cid uuid;
  rev bigint;
  v record;
begin
  perform public.project_depth_command(p,gen_random_uuid(),'result.set',0,0,
    '{"desired_result":"Snapshot rollback result"}'::jsonb);
  select completion_revision into rev from public.projects where id=p;
  cid := (public.project_depth_command(p,gen_random_uuid(),'criterion.create',rev,0,
    '{"text":"Snapshot rollback criterion","sort_order":0}'::jsonb)->>'criterion_id')::uuid;
  insert into public.tasks(user_id,project_id,title) values(
    '69000000-0000-4000-8000-000000000001',p,'Open snapshot work');
  select completion_revision into rev from public.projects where id=p;
  for v in select * from (values
    ('result.set',jsonb_build_object('desired_result','Stale result')),
    ('criterion.create',jsonb_build_object('text','Stale new criterion','sort_order',1)),
    ('criterion.edit',jsonb_build_object('criterion_id',cid,'text','Stale edit')),
    ('criterion.reorder',jsonb_build_object('criterion_id',cid,'sort_order',2)),
    ('criterion.archive',jsonb_build_object('criterion_id',cid,'reason','Stale archive'))
  ) as variants(operation,payload) loop
    begin
      perform public.project_depth_command(p,gen_random_uuid(),v.operation,rev-1,0,v.payload);
      raise exception 'stale % command accepted',v.operation;
    exception when check_violation then
      if position('PROJECT_STALE' in sqlerrm)=0 then raise; end if;
    end;
  end loop;
  if (select count(*) from public.project_completion_criteria where project_id=p)<>1 then
    raise exception 'stale command mutated Criteria';
  end if;
end $$;

-- Force failure after Review and Criterion snapshots were inserted. The
-- command transaction must leave no Review, receipt, status or revision change.
set local role postgres;
create function public.project_depth_test_fail_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin raise exception 'SYNTHETIC_SNAPSHOT_FAILURE'; end $$;
create trigger project_depth_test_fail_snapshot after insert on public.project_review_criteria
for each row execute function public.project_depth_test_fail_snapshot();
set local role authenticated;
do $$
declare
  p uuid := '69000000-0000-4000-8000-000000000018';
  rev bigint;
  c jsonb;
  cid uuid;
begin
  select completion_revision into rev from public.projects where id=p;
  select id into cid from public.project_completion_criteria where project_id=p;
  c := public.project_review_context(p);
  begin
    perform public.project_depth_command(p,'69000000-0000-4000-8000-000000000120',
      'review.submit',rev,0,jsonb_build_object(
        'fingerprint',c->>'fingerprint','decision','completed','result_accepted',true,
        'rationale','Snapshot failure must roll back',
        'criteria',jsonb_build_array(jsonb_build_object('id',cid,'assessment','satisfied')),
        'archived_ids','[]'::jsonb,'evidence','[]'::jsonb,
        'open_work_acknowledged',true,'open_work_disposition','Task stays open'));
    raise exception 'snapshot failure was accepted';
  exception when raise_exception then
    if position('SYNTHETIC_SNAPSHOT_FAILURE' in sqlerrm)=0 then raise; end if;
  end;
  if (select count(*) from public.project_reviews where project_id=p)<>0 or
     (select status from public.projects where id=p)<>'active' or
     (select completion_revision from public.projects where id=p)<>rev then
    raise exception 'partial Review transaction survived failure';
  end if;
end $$;

-- Direct Data API-equivalent role cannot write command-owned surfaces.
do $$begin
  begin
    insert into public.project_completion_criteria(user_id,project_id,text) values(
      '69000000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000010','Injected');
    raise exception 'direct criterion insert accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.projects set status='completed' where id='69000000-0000-4000-8000-000000000010';
    raise exception 'direct status update accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
do $$begin
  begin
    perform public.project_depth_command(
      '69000000-0000-4000-8000-000000000010',
      '69000000-0000-4000-8000-000000000118','result.set',0,0,
      jsonb_build_object('desired_result',repeat('x',1048577)));
    raise exception 'oversize payload accepted';
  exception when program_limit_exceeded then
    if position('PROJECT_PAYLOAD_LIMIT' in sqlerrm)=0 then raise; end if;
  end;
end $$;
insert into public.projects(id,user_id,title,status)
values('69000000-0000-4000-8000-000000000017',
  '69000000-0000-4000-8000-000000000001','Oversize context','active');
insert into public.tasks(user_id,project_id,title)
select '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000017','Synthetic task '||n
from generate_series(1,5001) n;
do $$begin
  begin
    perform public.project_review_context('69000000-0000-4000-8000-000000000017');
    raise exception 'oversize context accepted';
  exception when program_limit_exceeded then
    if position('PROJECT_CONTEXT_LIMIT' in sqlerrm)=0 then raise; end if;
  end;
end $$;
set constraints all immediate;
set constraints all deferred;
select set_config('request.jwt.claim.sub','69000000-0000-4000-8000-000000000002',true);
insert into public.projects(id,user_id,title,status)
values('69000000-0000-4000-8000-000000000012','69000000-0000-4000-8000-000000000002',
  'Other owner project','active');
do $$begin
  if exists (select 1 from public.projects where id='69000000-0000-4000-8000-000000000010') or
     exists (select 1 from public.project_completion_criteria where project_id='69000000-0000-4000-8000-000000000010') or
     exists (select 1 from public.project_review_resources where project_id='69000000-0000-4000-8000-000000000010') or
     exists (select 1 from public.project_lifecycle_events where project_id='69000000-0000-4000-8000-000000000010') then
    raise exception 'cross-user Project Depth read';
  end if;
  if exists (select 1 from public.project_reviews where project_id='69000000-0000-4000-8000-000000000010') then
    raise exception 'cross-user Review read';
  end if;
  begin
    perform public.project_review_context('69000000-0000-4000-8000-000000000010');
    raise exception 'cross-user context accepted';
  exception when insufficient_privilege then
    if position('PROJECT_NOT_FOUND' in sqlerrm)=0 then raise; end if;
  end;
  begin
    perform public.project_depth_command('69000000-0000-4000-8000-000000000010',
      '69000000-0000-4000-8000-000000000114','project.status.set',0,0,'{"status":"paused"}');
    raise exception 'cross-user command accepted';
  exception when insufficient_privilege then
    if position('PROJECT_NOT_FOUND' in sqlerrm)=0 then raise; end if;
  end;
end $$;
set local role anon;
do $$begin
  begin
    perform public.project_review_context('69000000-0000-4000-8000-000000000010');
    raise exception 'anonymous context accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname='life_os_project_command'
      and not rolcanlogin and not rolbypassrls and not rolsuper) then
    raise exception 'command role attributes incorrect';
  end if;
  if exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_roles r on r.oid=c.relowner
      where c.relnamespace='public'::pg_catalog.regnamespace
        and c.relname in ('projects','project_completion_criteria','project_reviews',
          'project_review_criteria','project_review_resources',
          'project_lifecycle_events','project_review_amendments','project_command_receipts')
        and r.rolname='life_os_project_command') then
    raise exception 'command role owns a protected table';
  end if;
  if (select pg_catalog.pg_get_userbyid(p.proowner) from pg_catalog.pg_proc p
      where p.oid='public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb)'::pg_catalog.regprocedure)
      <> 'life_os_project_command' then
    raise exception 'command function owner incorrect';
  end if;
  if (select array_to_string(p.proconfig, ',') from pg_catalog.pg_proc p
      where p.oid='public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb)'::pg_catalog.regprocedure)
      not like '%search_path=%' then
    raise exception 'command search path is not fixed';
  end if;
  foreach v_table in array array[
    'project_completion_criteria','project_reviews','project_review_criteria',
    'project_review_resources','project_lifecycle_events',
    'project_review_amendments','project_command_receipts'
  ] loop
    if pg_catalog.has_table_privilege('authenticated',format('public.%I',v_table),'INSERT')
      or pg_catalog.has_table_privilege('authenticated',format('public.%I',v_table),'UPDATE')
      or pg_catalog.has_table_privilege('authenticated',format('public.%I',v_table),'DELETE') then
      raise exception 'direct command-owned write privilege open: %',v_table;
    end if;
  end loop;
  if pg_catalog.has_column_privilege('authenticated','public.projects','completion_revision','UPDATE')
    or pg_catalog.has_column_privilege('authenticated','public.projects','completion_cycle','UPDATE')
    or pg_catalog.has_column_privilege('authenticated','public.projects','desired_result','UPDATE')
    or pg_catalog.has_function_privilege('anon',
      'public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb)','EXECUTE') then
    raise exception 'Project command grant boundary open';
  end if;
end $$;
set constraints all immediate;
rollback;
