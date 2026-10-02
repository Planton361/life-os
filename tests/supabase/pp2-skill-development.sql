\set ON_ERROR_STOP on
begin;
do $$begin
 if exists(select 1 from public.skills where id='94000000-0000-4000-8000-000000000098') then
  if not exists(select 1 from public.skill_evidence e join public.skill_evidence_revisions v on v.evidence_id=e.id and v.revision=e.revision where e.id='94000000-0000-4000-8000-000000000097' and e.created_at='2025-01-16' and e.updated_at='2025-02-01' and e.title='Original evidence' and e.evidence_date='2025-01-15' and e.weight=3 and e.revision=1 and e.source_snapshot is null and v.source_snapshot is null and v.operation='baseline' and v.provenance_state='legacy_unverified' and v.source_id='94000000-0000-4000-8000-000000000096') then raise exception 'Legacy baseline fabricated or rewritten';end if;
  if (select count(*) from public.skill_evidence_revisions where evidence_id='94000000-0000-4000-8000-000000000097')<>1 then raise exception 'Legacy history invented';end if;
 end if;
end$$;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 ('94000000-0000-4000-8000-000000000001','authenticated','authenticated','pp2-owner-a@example.test','{}','{}'),
 ('94000000-0000-4000-8000-000000000003','authenticated','authenticated','pp2-owner-b@example.test','{}','{}');
insert into public.areas(id,user_id,key,name) values('94000000-0000-4000-8000-000000000004','94000000-0000-4000-8000-000000000003','coding','Foreign Area');
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
do $$declare s uuid;t uuid;m uuid;e uuid;r uuid;rev bigint:=0;key uuid:=gen_random_uuid();result jsonb;again jsonb;
begin
 result:=public.skill_development_command(null,key,'skill.create',null,'{"name":"  PP2 fixture  "}');s:=(result->>'skill_id')::uuid;
 again:=public.skill_development_command(null,key,'skill.create',null,'{"name":"PP2 fixture"}');
 if result<>again or (result->>'development_revision')::bigint<>0 then raise exception 'create retry/revision failed';end if;
 begin perform public.skill_development_command(null,key,'skill.create',null,'{"name":"different"}');raise exception 'key conflict missing';exception when unique_violation then null;end;
 begin perform public.skill_development_command(null,gen_random_uuid(),'skill.create',null,'{"name":"foreign","area_id":"94000000-0000-4000-8000-000000000004"}');raise exception 'area denial missing';exception when insufficient_privilege then null;end;
 begin insert into public.skills(user_id,name) values(auth.uid(),'bypass');raise exception 'direct insert permitted';exception when insufficient_privilege then null;end;
 begin update public.skills set development_revision=9 where id=s;raise exception 'direct update permitted';exception when insufficient_privilege then null;end;
 begin delete from public.skills where id=s;raise exception 'direct delete permitted';exception when insufficient_privilege then null;end;
 begin perform public.skill_development_command(s,gen_random_uuid(),'skill.edit',1,'{"name":"stale"}');raise exception 'stale accepted';exception when check_violation then null;end;
 result:=public.skill_development_command(s,gen_random_uuid(),'target.create',rev,'{"title":"Target"}');rev:=rev+1;t:=(result->>'target_id')::uuid;
 perform public.skill_development_command(s,gen_random_uuid(),'target.current',rev,jsonb_build_object('target_id',t));rev:=rev+1;
 result:=public.skill_development_command(s,gen_random_uuid(),'milestone.create',rev,jsonb_build_object('target_id',t,'title','Step'));rev:=rev+1;m:=(result->>'milestone_id')::uuid;
 perform public.skill_development_command(s,gen_random_uuid(),'milestone.current',rev,jsonb_build_object('target_id',t,'milestone_id',m));rev:=rev+1;
 perform public.skill_development_command(s,gen_random_uuid(),'target.archive',rev,jsonb_build_object('target_id',t));rev:=rev+1;
 if exists(select 1 from public.skill_milestones where id=m and status='current') then raise exception 'archive left Current child';end if;
 perform public.skill_development_command(s,gen_random_uuid(),'target.restore',rev,jsonb_build_object('target_id',t));rev:=rev+1;
 perform public.skill_development_command(s,gen_random_uuid(),'target.current',rev,jsonb_build_object('target_id',t));rev:=rev+1;
 begin perform public.skill_development_command(s,gen_random_uuid(),'milestone.reorder',rev,jsonb_build_object('target_id',t,'ids',jsonb_build_array(m,m)));raise exception 'bad ordering accepted';exception when invalid_parameter_value then null;end;
 perform public.skill_development_command(s,gen_random_uuid(),'milestone.reorder',rev,jsonb_build_object('target_id',t,'ids',jsonb_build_array(m)));rev:=rev+1;
 result:=public.skill_development_command(s,gen_random_uuid(),'evidence.create',rev,'{"title":"Observation","evidence_date":"2026-09-01","source_type":"manual_note","source_id":null}');rev:=rev+1;e:=(result->>'evidence_id')::uuid;
 begin perform public.skill_development_command(s,gen_random_uuid(),'evidence.correct',rev,jsonb_build_object('evidence_id',e,'title','Foreign source','evidence_date','2026-09-01','source_type','task','source_id',gen_random_uuid(),'reason','test'));raise exception 'source denial missing';exception when insufficient_privilege then null;end;
 begin perform public.skill_development_command(s,gen_random_uuid(),'evidence.create',rev,'{"title":"future","evidence_date":"2999-01-01","source_type":"manual_note","source_id":null}');raise exception 'future accepted';exception when invalid_parameter_value then null;end;
 result:=public.skill_development_command(s,gen_random_uuid(),'review.submit',rev,jsonb_build_object('target_id',t,'decision','completed','note','Explicit review','open_milestones_acknowledged',true,'evidence',jsonb_build_array(jsonb_build_object('id',e,'revision',1))));rev:=rev+1;r:=(result->>'review_id')::uuid;
 perform public.skill_development_command(s,gen_random_uuid(),'evidence.correct',rev,jsonb_build_object('evidence_id',e,'title','Corrected','evidence_date','2026-08-01','source_type','manual_note','source_id',null,'reason','Correction'));rev:=rev+1;
 if (select title from public.skill_evidence_revisions where evidence_id=e and revision=1)<>'Observation' then raise exception 'original evidence rewritten';end if;
 if (select evidence_revision from public.skill_development_review_evidence where review_id=r)<>1 then raise exception 'review evidence changed';end if;
 perform public.skill_development_command(s,gen_random_uuid(),'evidence.withdraw',rev,jsonb_build_object('evidence_id',e,'reason','withdraw'));rev:=rev+1;
 perform public.skill_development_command(s,gen_random_uuid(),'evidence.restore',rev,jsonb_build_object('evidence_id',e,'reason','restore'));rev:=rev+1;
 perform public.skill_development_command(s,gen_random_uuid(),'review.amend',rev,jsonb_build_object('review_id',r,'kind','mistaken','note','Mistaken terminal review'));rev:=rev+1;
 if exists(select 1 from public.skill_development_targets where id=t and (status<>'planned' or cycle<>2 or terminal_review_id is not null)) then raise exception 'mistaken reopen invalid';end if;
 perform public.skill_development_command(s,gen_random_uuid(),'skill.archive',rev,'{}');rev:=rev+1;
 perform public.skill_development_command(s,gen_random_uuid(),'skill.restore',rev,'{}');rev:=rev+1;
 if (select development_revision from public.skills where id=s)<>rev then raise exception 'revision not once';end if;
 begin update public.skill_evidence_revisions set title='rewrite' where evidence_id=e;raise exception 'history update permitted';exception when insufficient_privilege then null;end;
 begin delete from public.skill_evidence where id=e;raise exception 'evidence delete permitted';exception when insufficient_privilege then null;end;
 if (public.skill_development_read(s)->'skill'->>'development_revision')::bigint<>rev then raise exception 'read model failed';end if;
 perform set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000003',true);
 if public.skill_development_read(s) is not null or exists(select 1 from public.skill_evidence where id=e) then raise exception 'foreign reads permitted';end if;
 begin perform public.skill_development_command(s,gen_random_uuid(),'skill.archive',rev,'{}');raise exception 'foreign mutation permitted';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Deliberately combine individually valid IDs: every composite relationship must reject them.
do $$declare u uuid:='94000000-0000-4000-8000-000000000001';b uuid:='94000000-0000-4000-8000-000000000003';s uuid;t uuid;e uuid;r uuid;other uuid:=gen_random_uuid();own_other uuid:=gen_random_uuid();own_target uuid:=gen_random_uuid();mile uuid;own_review uuid:=gen_random_uuid();begin
 select id into s from public.skills where user_id=u;
 select id into t from public.skill_development_targets where skill_id=s limit 1;
 select id into e from public.skill_evidence where skill_id=s limit 1;
 select id into r from public.skill_development_reviews where skill_id=s limit 1;
 insert into public.skills(id,user_id,name) values(other,b,'Foreign Skill');
 begin
  insert into public.skill_evidence_revisions(user_id,skill_id,evidence_id,revision,title,evidence_date,source_type,provenance_state,operation)values(u,s,e,99,'Missing correction reason','2026-01-01','manual_note','captured','correct');raise exception 'null correction reason accepted';exception when check_violation then null;end;
 insert into public.skills(id,user_id,name) values(own_other,u,'Other owned Skill');
 insert into public.skill_development_targets(id,user_id,skill_id,title)values(own_target,u,s,'Other owned Target');
 select id into mile from public.skill_milestones where target_id=t limit 1;
 insert into public.skill_development_reviews(id,user_id,skill_id,target_id,cycle,decision,note,aggregate_revision,subject_snapshot,milestones_snapshot)values(own_review,u,s,t,2,'continue','Composite fixture',0,'{}','[]');
 begin
  insert into public.skill_milestones(user_id,skill_id,target_id,title,sort_order)values(u,own_other,t,'Wrong owned Skill',8);set constraints all immediate;raise exception 'same-owner skill FK missing';exception when foreign_key_violation then null;end;
 begin
  insert into public.skill_development_reviews(user_id,skill_id,target_id,milestone_id,cycle,decision,note,aggregate_revision,subject_snapshot,milestones_snapshot)values(u,s,own_target,mile,1,'continue','Wrong owned Target',0,'{}','[]');set constraints all immediate;raise exception 'same-skill target FK missing';exception when foreign_key_violation then null;end;
 begin
  update public.skill_development_targets set status='completed',terminal_review_id=r where id=own_target;set constraints all immediate;raise exception 'terminal target FK missing';exception when foreign_key_violation then null;end;
 begin
  insert into public.skill_development_review_evidence(user_id,skill_id,target_id,review_id,evidence_id,evidence_revision)values(u,s,own_target,own_review,e,1);set constraints all immediate;raise exception 'owned review child FK missing';exception when foreign_key_violation then null;end;

 begin
  insert into public.skill_development_targets(user_id,skill_id,title)values(b,s,'Wrong owner');set constraints all immediate;raise exception 'target owner FK missing';exception when foreign_key_violation then null;end;
 begin
  insert into public.skill_milestones(user_id,skill_id,target_id,title,sort_order)values(b,other,t,'Foreign Target',0);set constraints all immediate;raise exception 'milestone target FK missing';exception when foreign_key_violation then null;end;
 begin
  insert into public.skill_development_reviews(user_id,skill_id,target_id,cycle,decision,note,aggregate_revision,subject_snapshot,milestones_snapshot)values(b,other,t,1,'continue','Wrong target',0,'{}','[]');set constraints all immediate;raise exception 'review target FK missing';exception when foreign_key_violation then null;end;
 begin
  insert into public.skill_development_review_evidence(user_id,skill_id,target_id,review_id,evidence_id,evidence_revision)values(b,other,t,r,e,1);set constraints all immediate;raise exception 'review child FK missing';exception when foreign_key_violation then null;end;
 begin
  insert into public.skill_evidence_revisions(user_id,skill_id,evidence_id,revision,title,evidence_date,source_type,provenance_state,operation)values(b,other,e,9,'Wrong evidence','2026-01-01','manual_note','legacy_unverified','baseline');set constraints all immediate;raise exception 'evidence revision FK missing';exception when foreign_key_violation then null;end;
 begin
  insert into public.skill_development_review_amendments(user_id,skill_id,target_id,review_id,kind,note)values(b,other,t,r,'clarification','Wrong review');set constraints all immediate;raise exception 'amendment FK missing';exception when foreign_key_violation then null;end;
end$$;
-- Effective grants, role attributes, function owner and immutable guard independent of client role.
do $$declare t text;begin
 if exists(select 1 from pg_roles where rolname='life_os_skill_command' and (rolcanlogin or rolbypassrls or rolsuper)) then raise exception 'unsafe command role';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='skill_development_private' or p.oid in ('public.skill_development_command(uuid,uuid,text,bigint,jsonb)'::regprocedure,'public.skill_development_read(uuid)'::regprocedure)) and not ('search_path=""'=any(p.proconfig))) then raise exception 'unsafe search_path';end if;
 if exists(select 1 from pg_class where relname in ('skills','skill_evidence','skill_development_targets','skill_milestones','skill_development_reviews','skill_evidence_revisions','skill_command_receipts') and relowner=(select oid from pg_roles where rolname='life_os_skill_command')) then raise exception 'command role is table owner';end if;
 if (select proowner::regrole::text from pg_proc where oid='public.skill_development_command(uuid,uuid,text,bigint,jsonb)'::regprocedure)<>'life_os_skill_command' then raise exception 'wrong RPC owner';end if;
 foreach t in array array['skills','skill_evidence','skill_development_targets','skill_milestones','skill_development_reviews','skill_evidence_revisions','skill_development_review_evidence','skill_development_review_amendments','skill_command_receipts'] loop
  if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) or has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE') then raise exception 'unsafe grants/RLS %',t;end if;
 end loop;
 if has_table_privilege('authenticated','public.skill_command_receipts','SELECT') then raise exception 'receipt exposed';end if;
 begin update public.skill_evidence_revisions set title='rewrite';raise exception 'guard missing';exception when check_violation then null;end;
end$$;
set constraints all immediate;
-- Deferrable composite FKs and purge exercised with the real cascade.
set constraints all deferred;
delete from auth.users where id in ('94000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000003');
set constraints all immediate;
rollback;
