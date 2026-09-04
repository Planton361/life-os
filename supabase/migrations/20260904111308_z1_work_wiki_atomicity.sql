-- Z1: a Work Wiki entry is one canonical Resource and, when selected, one
-- canonical Work-Project context relation. Keep the coupled writes atomic.
create or replace function public.create_work_wiki_resource(
  p_area_id uuid,
  p_title text,
  p_body text,
  p_project_id uuid default null
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
  v_body text := nullif(btrim(p_body), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_title is null or v_body is null then
    raise exception 'Work Wiki title and content are required' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.areas
     where id = p_area_id and user_id = v_user_id and key = 'work' and archived_at is null
  ) then
    raise exception 'Work area not found' using errcode = 'P0002';
  end if;

  if p_project_id is not null and not exists (
    select 1 from public.projects
     where id = p_project_id and area_id = p_area_id and user_id = v_user_id and archived_at is null
  ) then
    raise exception 'Work project not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':' || p_area_id::text || ':' ||
      coalesce(p_project_id::text, 'no-project') || ':' || v_title || ':' || v_body,
      0
    )
  );

  if p_project_id is not null then
    select r.* into v_resource
      from public.resources r
      join public.resource_relations rr on rr.resource_id = r.id
     where r.user_id = v_user_id and r.area_id = p_area_id and r.type = 'note'
       and r.title = v_title and r.summary = v_body and r.archived_at is null
       and rr.user_id = v_user_id and rr.target_type = 'project'
       and rr.target_id = p_project_id and rr.relation_type = 'context'
     order by r.created_at asc limit 1;
  else
    select r.* into v_resource
      from public.resources r
     where r.user_id = v_user_id and r.area_id = p_area_id and r.type = 'note'
       and r.title = v_title and r.summary = v_body and r.archived_at is null
       and not exists (
         select 1 from public.resource_relations rr
         join public.projects p on p.id = rr.target_id
          where rr.resource_id = r.id and rr.user_id = v_user_id
            and rr.target_type = 'project' and rr.relation_type = 'context'
            and p.user_id = v_user_id and p.area_id = p_area_id
       )
     order by r.created_at asc limit 1;
  end if;

  if found then
    return v_resource;
  end if;

  insert into public.resources (user_id, area_id, type, title, summary, review_needed)
  values (v_user_id, p_area_id, 'note', v_title, v_body, false)
  returning * into v_resource;

  if p_project_id is not null then
    insert into public.resource_relations (user_id, resource_id, target_type, target_id, relation_type)
    values (v_user_id, v_resource.id, 'project', p_project_id, 'context');
  end if;

  return v_resource;
end;
$$;

revoke execute on function public.create_work_wiki_resource(uuid, text, text, uuid) from public;
revoke execute on function public.create_work_wiki_resource(uuid, text, text, uuid) from anon;
grant execute on function public.create_work_wiki_resource(uuid, text, text, uuid) to authenticated;
