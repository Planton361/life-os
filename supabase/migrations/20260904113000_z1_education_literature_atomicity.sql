-- Z1: Education literature is a single canonical Resource plus Project source-link.
-- Keep both writes inside one invoker transaction so a failed link cannot orphan a
-- newly created Resource.
create or replace function public.create_education_literature_resource(
  p_project_id uuid,
  p_area_id uuid,
  p_title text,
  p_type public.resource_type,
  p_summary text default null,
  p_url text default null
)
returns public.resources
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_resource public.resources%rowtype;
  v_title text := nullif(btrim(p_title), '');
  v_summary text := nullif(btrim(p_summary), '');
  v_url text := nullif(btrim(p_url), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_title is null then
    raise exception 'Resource title is required' using errcode = '23514';
  end if;

  if p_type is null then
    raise exception 'Resource type is required' using errcode = '23514';
  end if;

  if not exists (
    select 1
      from public.areas
     where id = p_area_id
       and user_id = v_user_id
       and key = 'education'
       and archived_at is null
  ) then
    raise exception 'Education area not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
      from public.projects
     where id = p_project_id
       and area_id = p_area_id
       and user_id = v_user_id
       and archived_at is null
  ) then
    raise exception 'Education project not found' using errcode = 'P0002';
  end if;

  -- A retry of this exact create request returns its existing canonical Resource.
  -- The transaction-scoped lock also prevents concurrent retry duplicates without
  -- changing the reusable Resource model or global idempotency behavior.
  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':' || p_project_id::text || ':' ||
      p_type::text || ':' || v_title || ':' || coalesce(v_summary, '') || ':' || coalesce(v_url, ''),
      0
    )
  );

  select r.*
    into v_resource
    from public.resources r
    join public.resource_relations rr on rr.resource_id = r.id
   where r.user_id = v_user_id
     and r.archived_at is null
     and r.type = p_type
     and r.title = v_title
     and r.summary is not distinct from v_summary
     and r.url is not distinct from v_url
     and rr.user_id = v_user_id
     and rr.target_type = 'project'
     and rr.target_id = p_project_id
     and rr.relation_type = 'source'
   order by r.created_at asc
   limit 1;

  if found then
    return v_resource;
  end if;

  insert into public.resources (
    user_id,
    area_id,
    type,
    title,
    summary,
    url,
    review_needed
  )
  values (
    v_user_id,
    p_area_id,
    p_type,
    v_title,
    v_summary,
    v_url,
    false
  )
  returning * into v_resource;

  insert into public.resource_relations (
    user_id,
    resource_id,
    target_type,
    target_id,
    relation_type
  )
  values (
    v_user_id,
    v_resource.id,
    'project',
    p_project_id,
    'source'
  );

  return v_resource;
end;
$$;

revoke execute on function public.create_education_literature_resource(
  uuid,
  uuid,
  text,
  public.resource_type,
  text,
  text
) from public;

revoke execute on function public.create_education_literature_resource(
  uuid,
  uuid,
  text,
  public.resource_type,
  text,
  text
) from anon;

grant execute on function public.create_education_literature_resource(
  uuid,
  uuid,
  text,
  public.resource_type,
  text,
  text
) to authenticated;
