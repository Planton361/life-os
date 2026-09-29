-- Contract repair proofs; synthetic identities only. Real deferred guards run.
begin;
insert into auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('69400000-0000-4000-8000-000000000001','69400000-0000-4000-8000-000000000001','authenticated','authenticated','p-data-v4-a@example.test','{}','{}',now(),now()),
('69400000-0000-4000-8000-000000000002','69400000-0000-4000-8000-000000000002','authenticated','authenticated','p-data-v4-b@example.test','{}','{}',now(),now());
insert into public.projects(id,user_id,title,status) values
('69400000-0000-4000-8000-000000000010','69400000-0000-4000-8000-000000000001','V4 contract','active'),
('69400000-0000-4000-8000-000000000011','69400000-0000-4000-8000-000000000001','V4 Legacy','completed'),
('69400000-0000-4000-8000-000000000012','69400000-0000-4000-8000-000000000002','Other project','active');
insert into public.resources(id,user_id,title,type,url) values
('69400000-0000-4000-8000-000000000020','69400000-0000-4000-8000-000000000001','Selected','link','https://example.test/path?q=credential#secret'),
('69400000-0000-4000-8000-000000000021','69400000-0000-4000-8000-000000000001','Unselected','link','https://example.test/'),
('69400000-0000-4000-8000-000000000022','69400000-0000-4000-8000-000000000002','Other evidence','link','https://example.test/');
insert into public.project_completion_criteria(id,user_id,project_id,text,sort_order) values('69400000-0000-4000-8000-000000000030','69400000-0000-4000-8000-000000000002','69400000-0000-4000-8000-000000000012','Other criterion',0);
insert into public.resource_relations(id,user_id,resource_id,target_type,target_id,relation_type) values('69400000-0000-4000-8000-000000000040','69400000-0000-4000-8000-000000000002','69400000-0000-4000-8000-000000000022','project','69400000-0000-4000-8000-000000000012','context');
set local role authenticated;
select set_config('request.jwt.claim.sub','69400000-0000-4000-8000-000000000001',true);
do $$declare
 p uuid:='69400000-0000-4000-8000-000000000010'; u uuid:='69400000-0000-4000-8000-000000000001';
 resource uuid:='69400000-0000-4000-8000-000000000020'; unselected uuid:='69400000-0000-4000-8000-000000000021';
 c1 uuid; c2 uuid; c3 uuid; c4 uuid; k uuid; r jsonb; original jsonb; ctx jsonb; fresh jsonb; payload jsonb; ev jsonb; rev bigint; review uuid; snap uuid;
begin
 perform public.project_depth_command(p,gen_random_uuid(),'result.set',0,0,'{"desired_result":"Deliver accepted work"}');
 c1:=(public.project_depth_command(p,gen_random_uuid(),'criterion.create',1,0,'{"text":"First","sort_order":0}')->>'criterion_id')::uuid;
 c2:=(public.project_depth_command(p,gen_random_uuid(),'criterion.create',2,0,'{"text":"Second","sort_order":1}')->>'criterion_id')::uuid;
 c3:=(public.project_depth_command(p,gen_random_uuid(),'criterion.create',3,0,'{"text":"Removed A","sort_order":0}')->>'criterion_id')::uuid;
 c4:=(public.project_depth_command(p,gen_random_uuid(),'criterion.create',4,0,'{"text":"Removed B","sort_order":0}')->>'criterion_id')::uuid;
 perform public.project_depth_command(p,gen_random_uuid(),'criterion.archive',5,0,jsonb_build_object('criterion_id',c3,'reason','Explicit removal A'));
 perform public.project_depth_command(p,gen_random_uuid(),'criterion.archive',6,0,jsonb_build_object('criterion_id',c4,'reason','Explicit removal B'));
 ctx:=public.project_review_context(p); rev:=(ctx->>'completion_revision')::bigint;
 update public.projects set updated_at=now() where id=p;
 if (select completion_revision from public.projects where id=p)<>rev or public.project_review_context(p)->>'fingerprint'<>ctx->>'fingerprint' then raise exception 'updated_at-only changed revision/context'; end if;
 perform public.project_depth_command(p,gen_random_uuid(),'result.set',rev,0,'{"desired_result":"Deliver accepted work"}');
 perform public.project_depth_command(p,gen_random_uuid(),'criterion.edit',rev,0,jsonb_build_object('criterion_id',c1,'text','First'));
 perform public.project_depth_command(p,gen_random_uuid(),'criterion.reorder',rev,0,jsonb_build_object('criterion_id',c1,'sort_order',0));
 if (select completion_revision from public.projects where id=p)<>rev then raise exception 'no-op bumped revision'; end if;
 update public.projects set title='V4 metadata change' where id=p;
 if (select completion_revision from public.projects where id=p)<>rev+1 then raise exception 'metadata revision not exactly +1'; end if;
 perform public.set_project_resource_role(p,resource,'reference'); perform public.set_project_resource_role(p,unselected,'reference');
 ctx:=public.project_review_context(p); rev:=(ctx->>'completion_revision')::bigint;
 select value into ev from jsonb_array_elements(ctx->'resources') where value->>'id'=resource::text;
 payload:=jsonb_build_object('fingerprint',ctx->>'fingerprint','decision','continue','result_accepted',false,'rationale','  Reviewed intermediate work  ',
 'criteria',jsonb_build_array(jsonb_build_object('id',c2,'assessment','not_satisfied','note','  Remaining work  '),jsonb_build_object('id',c1,'assessment','satisfied','note','')),
 'archived_ids',jsonb_build_array(c4,c3),'archived_criteria_acknowledged',true,'evidence',jsonb_build_array(
 jsonb_build_object('relation_id',ev->>'relation_id','token',ev->>'token','criterion_id',c1,'note','  Version one  '),
 jsonb_build_object('relation_id',ev->>'relation_id','token',ev->>'token','criterion_id',null)), 'open_work_acknowledged',false);
 update public.resources set title='Unselected changed' where id=unselected;
 if public.project_review_context(p)->>'fingerprint'<>ctx->>'fingerprint' then raise exception 'unselected Resource staled core'; end if;
 k:=gen_random_uuid(); original:=public.project_depth_command(p,k,'review.submit',rev,0,payload); review:=(original->>'review_id')::uuid;
 if (original->>'completion_revision')::bigint<>rev+1 then raise exception 'continue did not bump exactly once'; end if;
 if public.project_review_context(p)->>'fingerprint'=ctx->>'fingerprint' then raise exception 'continue did not stale context'; end if;
 payload:=payload||jsonb_build_object('rationale','Reviewed intermediate work','criteria',jsonb_build_array(jsonb_build_object('id',c1,'assessment','satisfied','note',null),jsonb_build_object('id',c2,'assessment','not_satisfied','note','Remaining work')),
 'archived_ids',jsonb_build_array(c3,c4),'evidence',jsonb_build_array(payload->'evidence'->1,payload->'evidence'->0));
 if public.project_depth_command(p,k,'review.submit',rev,0,payload)<>original then raise exception 'normalized/reordered retry changed result'; end if;
 begin perform public.project_depth_command(p,k,'review.submit',rev,0,payload||'{"rationale":"Different"}'); raise exception 'different payload reused key'; exception when unique_violation then null; end;
 begin perform public.project_depth_command(p,k,'project.archive',rev,0,'{}'); raise exception 'different operation reused key'; exception when unique_violation then null; end;
 begin perform public.project_depth_command('69400000-0000-4000-8000-000000000011',k,'review.submit',rev,0,payload); raise exception 'different Project reused key'; exception when unique_violation then null; end;
 if not exists(select 1 from public.project_review_resources where review_id=review and safe_url_snapshot is null and criterion_id=c1 and note='Version one') then raise exception 'criterion Resource snapshot/privacy'; end if;
 if not exists(select 1 from public.project_review_criteria where review_id=review and was_archived and archived_cycle_snapshot=0 and archived_revision_snapshot=6 and archive_reason_snapshot='Explicit removal A') then raise exception 'archived Criterion snapshot'; end if;
 ctx:=public.project_review_context(p); rev:=(ctx->>'completion_revision')::bigint;
 r:=public.project_depth_command(p,gen_random_uuid(),'review.amend',rev,0,jsonb_build_object('review_id',review,'kind','clarification','reason','Added explanation'));
 if (r->>'completion_revision')::bigint<>rev+1 or public.project_review_context(p)->>'fingerprint'=ctx->>'fingerprint' then raise exception 'amendment revision/context'; end if;
 ctx:=public.project_review_context(p); rev:=(ctx->>'completion_revision')::bigint;
 -- Three invalid continue decisions plus missing not_satisfied rationale.
 payload:=payload||jsonb_build_object('fingerprint',ctx->>'fingerprint','evidence','[]'::jsonb);
 for fresh in select value from jsonb_array_elements(jsonb_build_array('{"result_accepted":true}'::jsonb,'{"open_work_acknowledged":true}'::jsonb,'{"open_work_disposition":"Forbidden"}'::jsonb,
 jsonb_build_object('criteria',jsonb_build_array(jsonb_build_object('id',c1,'assessment','satisfied'),jsonb_build_object('id',c2,'assessment','not_satisfied'))),jsonb_build_object('rationale',repeat('x',2001)))) loop
  begin perform public.project_depth_command(p,gen_random_uuid(),'review.submit',rev,0,payload||fresh); raise exception 'invalid continue accepted'; exception when check_violation then null; end;
 end loop;
 -- A selected edit changes only its token, not core fingerprint.
 select value into ev from jsonb_array_elements(ctx->'resources') where value->>'id'=resource::text;
 payload:=payload||jsonb_build_object('evidence',jsonb_build_array(jsonb_build_object('relation_id',ev->>'relation_id','token',ev->>'token','criterion_id',null)));
 update public.resources set title='Selected renamed',url='https://user:credential@example.test/path' where id=resource;
 if public.project_review_context(p)->>'fingerprint'<>ctx->>'fingerprint' then raise exception 'Resource staled core fingerprint'; end if;
 begin perform public.project_depth_command(p,gen_random_uuid(),'review.submit',rev,0,payload); raise exception 'selected old token accepted'; exception when check_violation then if position('PROJECT_STALE_RESOURCE' in sqlerrm)=0 then raise; end if; end;
 ctx:=public.project_review_context(p);
 select value into ev from jsonb_array_elements(ctx->'resources') where value->>'id'=resource::text;
 payload:=payload||jsonb_build_object('evidence',jsonb_build_array(jsonb_build_object('relation_id',ev->>'relation_id','token',ev->>'token','criterion_id',null)));
 delete from public.resource_relations where id=(ev->>'relation_id')::uuid;
 begin perform public.project_depth_command(p,gen_random_uuid(),'review.submit',rev,0,payload); raise exception 'selected unlink accepted'; exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.project_review_resources where review_id=review and title_snapshot='Selected' and safe_url_snapshot is null) then raise exception 'rename/unlink changed snapshot'; end if;
 select id into snap from public.project_review_resources where review_id=review and criterion_id is null;
 r:=public.project_depth_command(p,gen_random_uuid(),'review.amend',rev,0,jsonb_build_object('review_id',review,'kind','evidence_withdrawn','review_resource_id',snap,'reason','Wrong evidence selected'));
 rev:=(r->>'completion_revision')::bigint;
 begin perform public.project_depth_command(p,gen_random_uuid(),'review.amend',rev,0,jsonb_build_object('review_id',review,'kind','evidence_withdrawn','review_resource_id',snap,'reason','Duplicate withdrawal')); raise exception 'duplicate withdrawal'; exception when unique_violation then null; end;
 -- Counts are dated; full work sets, not equal counts, invalidate context.
 insert into public.tasks(user_id,project_id,title,status) values(u,p,'Open','planned'),(u,p,'Done','done'),(u,p,'Canceled','canceled'),(u,p,'Ignored','archived');
 insert into public.project_milestones(user_id,project_id,title,status,sort_order) values(u,p,'Open milestone','open',0),(u,p,'Done milestone','done',1);
 ctx:=public.project_review_context(p);
 update public.tasks set title='Changed title, same count' where user_id=u and project_id=p and title='Open';
 if public.project_review_context(p)->>'fingerprint'=ctx->>'fingerprint' then raise exception 'same counts concealed changed work set'; end if;
 if (select completion_revision from public.projects where id=p)<>rev then raise exception 'R2-10 child serialization bumped revision'; end if;
 ctx:=public.project_review_context(p);
 payload:=payload||jsonb_build_object('fingerprint',ctx->>'fingerprint','decision','completed','result_accepted',true,'rationale','Accepted final work',
 'criteria',jsonb_build_array(jsonb_build_object('id',c1,'assessment','satisfied'),jsonb_build_object('id',c2,'assessment','satisfied')),'evidence','[]'::jsonb,'open_work_acknowledged',true,'open_work_disposition','Optional work remains');
 r:=public.project_depth_command(p,gen_random_uuid(),'review.submit',rev,0,payload); review:=(r->>'review_id')::uuid; rev:=(r->>'completion_revision')::bigint;
 if not exists(select 1 from public.project_reviews where id=review and open_task_count=1 and done_task_count=1 and canceled_task_count=1 and open_milestone_count=1 and done_milestone_count=1 and result_accepted and revision_after=revision_before+1) then raise exception 'accepted durable Review shape'; end if;
 r:=public.project_depth_command(p,gen_random_uuid(),'review.amend',rev,0,jsonb_build_object('review_id',review,'kind','marked_mistaken','reason','Mistaken current acceptance')); rev:=(r->>'completion_revision')::bigint;
 if r->>'status'<>'active' or r->>'completion_cycle'<>'1' or not exists(select 1 from public.project_lifecycle_events where prior_review_id=review and mistaken_completion and reason='Mistaken current acceptance' and cycle_before=0 and cycle_after=1) then raise exception 'marked_mistaken not coupled Reopen'; end if;
 ctx:=public.project_review_context(p);
 if jsonb_array_length(ctx->'criteria')<>2 then raise exception 'prior-cycle archives repeated'; end if;
 payload:=payload||jsonb_build_object('fingerprint',ctx->>'fingerprint','archived_ids','[]'::jsonb,'archived_criteria_acknowledged',false);
 r:=public.project_depth_command(p,gen_random_uuid(),'review.submit',rev,1,payload); rev:=(r->>'completion_revision')::bigint;
 r:=public.project_depth_command(p,gen_random_uuid(),'project.archive',rev,1,'{}'); rev:=(r->>'completion_revision')::bigint;
 perform public.project_depth_command(p,gen_random_uuid(),'review.amend',rev,1,jsonb_build_object('review_id',review,'kind','clarification','reason','Historical note after archive'));
 if (select status from public.projects where id=p)<>'archived' then raise exception 'archived Amendment restored Project'; end if;
 perform public.project_depth_command('69400000-0000-4000-8000-000000000011',gen_random_uuid(),'project.reopen',0,0,'{"mistaken_completion":true,"reason":"Legacy mistake"}');
 if not exists(select 1 from public.project_lifecycle_events where project_id='69400000-0000-4000-8000-000000000011' and prior_completion_kind='legacy_without_review' and prior_review_id is null and mistaken_completion) then raise exception 'Legacy truth missing'; end if;
end $$;
do $$<<locator>> declare p uuid:=gen_random_uuid(); u uuid:='69400000-0000-4000-8000-000000000001'; resource uuid:='69400000-0000-4000-8000-000000000021'; g uuid:=gen_random_uuid(); ctx jsonb; ev jsonb; result jsonb; rev bigint:=0; c uuid; review uuid; url text; first_page jsonb; next_page jsonb; begin
 insert into public.goals(id,user_id,title) values(g,u,'Goal capture context');
 insert into public.projects(id,user_id,title,goal_id) values(p,u,'Locator and Goal proof',g);
 perform public.set_project_resource_role(p,resource,'reference');
 foreach url in array array['https://name:credential@example.test/a','https://example.test/a?credential=secret','https://example.test/a#secret','https://example.test/a'] loop
  update public.resources set url=locator.url where id=resource;
  ctx:=public.project_review_context(p); select value into ev from jsonb_array_elements(ctx->'resources') where value->>'id'=resource::text;
  result:=public.project_depth_command(p,gen_random_uuid(),'review.submit',rev,0,jsonb_build_object('fingerprint',ctx->>'fingerprint','decision','continue','rationale','Locator inspected','criteria','[]'::jsonb,'archived_ids','[]'::jsonb,'evidence',jsonb_build_array(jsonb_build_object('relation_id',ev->>'relation_id','token',ev->>'token','criterion_id',null))));
  rev:=(result->>'completion_revision')::bigint;
  if not exists(select 1 from public.project_review_resources where review_id=(result->>'review_id')::uuid and safe_url_snapshot is not distinct from case when url='https://example.test/a' then url else null end) then raise exception 'unsafe locator part persisted'; end if;
 end loop;
 ctx:=public.project_review_context(p);
 update public.goals set title='Goal renamed later' where id=g;
 if public.project_review_context(p)->>'fingerprint'=ctx->>'fingerprint' then raise exception 'Goal title absent from fingerprint'; end if;
 if not exists(select 1 from public.project_reviews where project_id=p and goal_id_snapshot=g and goal_title_snapshot='Goal capture context') then raise exception 'Goal snapshot changed'; end if;
 p:=gen_random_uuid(); insert into public.projects(id,user_id,title) values(p,u,'History pagination proof');
 perform public.project_depth_command(p,gen_random_uuid(),'result.set',0,0,jsonb_build_object('desired_result',chr(160)||'End result'||chr(160)));
 c:=(public.project_depth_command(p,gen_random_uuid(),'criterion.create',1,0,'{"text":"Done","sort_order":0}')->>'criterion_id')::uuid;
 ctx:=public.project_review_context(p);
 result:=public.project_depth_command(p,gen_random_uuid(),'review.submit',2,0,jsonb_build_object('fingerprint',ctx->>'fingerprint','decision','completed','result_accepted',true,'rationale','Accepted','criteria',jsonb_build_array(jsonb_build_object('id',c,'assessment','satisfied')),'archived_ids','[]'::jsonb,'evidence','[]'::jsonb));
 review:=(result->>'review_id')::uuid;
 perform public.project_depth_command(p,gen_random_uuid(),'review.amend',3,0,jsonb_build_object('review_id',review,'kind','marked_mistaken','reason','Correction and Reopen'));
 for rev in 4..52 loop perform public.project_depth_command(p,gen_random_uuid(),'review.amend',rev,1,jsonb_build_object('review_id',review,'kind','clarification','reason','Chronological note '||rev)); end loop;
 first_page:=public.project_depth_history(p);
 if jsonb_array_length(first_page->'items')<>51 or jsonb_array_length(first_page->'lifecycle')<>1 or first_page->>'next_revision'<>'4' then raise exception 'pagination split coupled revision'; end if;
 next_page:=public.project_depth_history(p,4);
 if jsonb_array_length(next_page->'items')<>1 or jsonb_array_length(next_page->'criteria')<>1 or next_page->>'next_revision' is not null then raise exception 'history omitted oldest full Review detail'; end if;
 if public.project_review_context(p)->>'desired_result'<>'End result' then raise exception 'Unicode trim differs'; end if;
end $$;
set constraints all immediate;
reset role;
do $$declare t text; s text; begin
 if to_regclass('public.project_review_work') is not null then raise exception 'forbidden child history survives'; end if;
 if exists(select 1 from public.project_command_receipts where user_id='69400000-0000-4000-8000-000000000001' and (length(request_fingerprint)<>64 or request_payload is null or request_fingerprint<>project_depth_private.sha256(request_payload::text))) then raise exception 'receipt contract'; end if;
 foreach s in array array['https://user:password@example.test/a','https://example.test/a?token=secret','https://example.test/a#secret','ftp://example.test/a','javascript:alert(1)'] loop
  if project_depth_private.safe_url(s) is not null then raise exception 'unsafe URL captured'; end if;
 end loop;
 if project_depth_private.safe_url('https://example.test/a')<>'https://example.test/a' then raise exception 'safe URL lost'; end if;
 foreach t in array array['project_reviews','project_review_criteria','project_review_resources','project_lifecycle_events','project_review_amendments','project_command_receipts'] loop
  if has_table_privilege('life_os_project_command','public.'||t,'UPDATE') or has_table_privilege('life_os_project_command','public.'||t,'DELETE') then raise exception 'immutable command grant'; end if;
 end loop;
 if exists(select 1 from pg_constraint where conrelid in ('public.project_reviews'::regclass,'public.project_review_resources'::regclass,'public.project_review_amendments'::regclass,'public.project_lifecycle_events'::regclass) and contype='f' and confrelid<>'auth.users'::regclass and (not condeferrable or not condeferred or confdeltype<>'a')) then raise exception 'FK retention differs'; end if;
end $$;
-- Account purge is administrative only; deferred NO ACTION permits a complete
-- owner cascade, but an isolated referent deletion must fail.
do $$begin
 begin
  delete from public.resources where id='69400000-0000-4000-8000-000000000020';
  set constraints all immediate;
  raise exception 'isolated evidence Resource deletion accepted';
 exception when foreign_key_violation then null; end;
end $$;
delete from auth.users where id='69400000-0000-4000-8000-000000000001';
set constraints all immediate;
do $$begin
 if exists(select 1 from public.project_reviews where user_id='69400000-0000-4000-8000-000000000001') or exists(select 1 from public.project_command_receipts where user_id='69400000-0000-4000-8000-000000000001') then raise exception 'purge left partial owner History'; end if;
end $$;
rollback;
