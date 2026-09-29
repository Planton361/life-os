-- A stale domain command is a user-visible conflict, not a database
-- serialization failure. SQLSTATE 40001 is reserved for genuine transaction
-- retries by clients and can leave a browser action pending indefinitely.
do $$
declare
  v_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb)'::pg_catalog.regprocedure)
    into v_definition;
  if v_definition is null or
     v_definition not like '%PROJECT_STALE%errcode=''40001''%' then
    raise exception 'Project command stale-error definition changed';
  end if;
  execute pg_catalog.replace(v_definition, 'errcode=''40001''', 'errcode=''23514''');
end $$;
