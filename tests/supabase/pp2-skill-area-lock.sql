\set ON_ERROR_STOP on
begin;
-- On the fresh stack, also exercise the upgrade from the unchanged PP2 schema.
drop policy skill_command_area_lock on public.areas;
create temp table area_security_before as
select relacl, relrowsecurity, relowner from pg_class where oid='public.areas'::regclass;
create temp table area_columns_before as
select attnum, attacl from pg_attribute where attrelid='public.areas'::regclass;
create temp table area_policies_before as
select * from pg_policy where polrelid='public.areas'::regclass;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 ('10400000-0000-4000-8000-000000000001','authenticated','authenticated','area-lock-a@example.test','{}','{}'),
 ('10400000-0000-4000-8000-000000000002','authenticated','authenticated','area-lock-b@example.test','{}','{}');
insert into public.areas(id,user_id,key,name,archived_at) values
 ('10400000-0000-4000-8000-000000000011','10400000-0000-4000-8000-000000000001','coding','Owned A',null),
 ('10400000-0000-4000-8000-000000000012','10400000-0000-4000-8000-000000000001','education','Owned B',null),
 ('10400000-0000-4000-8000-000000000013','10400000-0000-4000-8000-000000000001','work','Archived',now()),
 ('10400000-0000-4000-8000-000000000014','10400000-0000-4000-8000-000000000002','coding','Foreign',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','10400000-0000-4000-8000-000000000001',true);
do $$begin
 begin
  perform public.skill_development_command(null,gen_random_uuid(),'skill.create',null,
   '{"name":"Before repair","area_id":"10400000-0000-4000-8000-000000000011"}');
  raise exception 'Pre-repair defect not reproduced';
 exception when insufficient_privilege then
  if sqlerrm <> 'SKILL_AREA_UNAVAILABLE' then raise; end if;
 end;
end$$;
reset role;
-- APPLY_FORWARD_MIGRATION
do $$begin
 if not exists(select 1 from pg_policy where polrelid='public.areas'::regclass
  and polname='skill_command_area_lock' and polcmd='w'
  and polroles=array['life_os_skill_command'::regrole::oid]
  and pg_get_expr(polwithcheck,polrelid)='false') then raise exception 'Wrong lock policy';end if;
 if exists((select relacl,relrowsecurity,relowner from pg_class where oid='public.areas'::regclass)
  except (select * from area_security_before)) then raise exception 'Area grants/RLS/owner changed';end if;
 if exists((select attnum,attacl from pg_attribute where attrelid='public.areas'::regclass)
  except (select * from area_columns_before)) then raise exception 'Column authority changed';end if;
 if exists((select * from pg_policy where polrelid='public.areas'::regclass and polname<>'skill_command_area_lock')
  except (select * from area_policies_before)) then raise exception 'Existing Area policies changed';end if;
 if not (select relrowsecurity from pg_class where oid='public.areas'::regclass) then raise exception 'Area RLS disabled';end if;
 if not exists(select 1 from pg_roles where rolname='life_os_skill_command' and not rolcanlogin and not rolbypassrls and not rolsuper)
  or pg_has_role('life_os_skill_command','authenticated','MEMBER') then raise exception 'Unsafe command role';end if;
end$$;
set local role life_os_skill_command;
do $$declare locked uuid;message text;begin
 select id into locked from public.areas where id='10400000-0000-4000-8000-000000000011' and archived_at is null for share;
 if locked is null then raise exception 'Owned FOR SHARE filtered';end if;
 if exists(select 1 from public.areas where user_id<>auth.uid()) then raise exception 'Foreign Area leaked';end if;
 perform 1 from public.areas where id='10400000-0000-4000-8000-000000000014' for share;
 if found then raise exception 'Foreign Area locked';end if;
 begin
  update public.areas set name='Forbidden mutation' where id=locked;
  raise exception 'Command role UPDATE permitted';
 exception when insufficient_privilege then
  get stacked diagnostics message=message_text;
  if message not like '%row-level security%' then raise exception 'UPDATE failed for wrong reason: %',message;end if;
 end;
end$$;
reset role;
set local role authenticated;
do $$declare s uuid;rev bigint:=0;result jsonb;bad text;operation text;before jsonb;begin
 result:=public.skill_development_command(null,gen_random_uuid(),'skill.create',null,
  '{"name":"Area command proof","area_id":"10400000-0000-4000-8000-000000000011"}');
 s:=(result->>'skill_id')::uuid;
 if public.skill_development_read(s)->'skill'->>'area_id'<>'10400000-0000-4000-8000-000000000011' then raise exception 'Create Area not stored';end if;
 perform public.skill_development_command(s,gen_random_uuid(),'skill.edit',rev,
  '{"area_id":"10400000-0000-4000-8000-000000000012","status":"paused"}');rev:=rev+1;
 perform public.skill_development_command(s,gen_random_uuid(),'skill.edit',rev,'{"status":"active"}');rev:=rev+1;
 perform public.skill_development_command(s,gen_random_uuid(),'skill.edit',rev,'{"summary":"Existing active Area retained"}');rev:=rev+1;
 if not exists(select 1 from public.skills where id=s and area_id='10400000-0000-4000-8000-000000000012'
  and status='active' and development_revision=rev) then raise exception 'Edit/switch/resume failed';end if;
 before:=public.skill_development_read(s);
 foreach bad in array array['10400000-0000-4000-8000-000000000013','10400000-0000-4000-8000-000000000014','10400000-0000-4000-8000-000000000099','invalid-area'] loop
  foreach operation in array array['skill.create','skill.edit'] loop
   begin
    perform public.skill_development_command(case when operation='skill.create' then null else s end,
     gen_random_uuid(),operation,case when operation='skill.create' then null else rev end,
     jsonb_build_object('name','Denied Area','area_id',bad));
    raise exception 'Bad Area accepted: % %',operation,bad;
   exception when insufficient_privilege then
    if sqlerrm <> 'SKILL_AREA_UNAVAILABLE' then raise;end if;
   when invalid_text_representation then
    if bad<>'invalid-area' then raise;end if;
   end;
  end loop;
 end loop;
 if public.skill_development_read(s)<>before then raise exception 'Denied command mutated Skill';end if;
 -- Authenticated owner Area updates still work, foreign updates still affect zero rows.
 update public.areas set archived_at=now() where id='10400000-0000-4000-8000-000000000012';
 if not found then raise exception 'Existing authenticated Area authority lost';end if;
 begin
  perform public.skill_development_command(s,gen_random_uuid(),'skill.edit',rev,'{"status":"active"}');
  raise exception 'Archived stored Area accepted on resume';
 exception when insufficient_privilege then
  if sqlerrm <> 'SKILL_AREA_UNAVAILABLE' then raise;end if;
 end;
 update public.areas set name='Foreign overwrite' where id='10400000-0000-4000-8000-000000000014';
 if found then raise exception 'Foreign authenticated update permitted';end if;
 perform set_config('request.jwt.claim.sub','10400000-0000-4000-8000-000000000002',true);
 if public.skill_development_read(s) is not null or exists(select 1 from public.skills where id=s)
  or exists(select 1 from public.areas where user_id<>auth.uid()) then raise exception 'Cross-owner leak';end if;
 begin
  perform public.skill_development_command(s,gen_random_uuid(),'skill.edit',rev,'{"status":"active"}');
  raise exception 'Foreign Skill edit accepted';
 exception when insufficient_privilege then
  if sqlerrm <> 'SKILL_NOT_FOUND' then raise;end if;
 end;
end$$;
reset role;
do $$begin
 if (select name from public.areas where id='10400000-0000-4000-8000-000000000011')<>'Owned A'
  or (select name from public.areas where id='10400000-0000-4000-8000-000000000014')<>'Foreign'
  or (select count(*) from public.skills where user_id='10400000-0000-4000-8000-000000000001')<>1 then raise exception 'Denied write persisted';end if;
end$$;
rollback;
\echo PASS upgrade defect/repair, owner create/switch/resume/edit, invalid/foreign/archive DENY, noLeak, lock-only RLS and unchanged grants
