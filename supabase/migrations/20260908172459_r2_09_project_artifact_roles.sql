-- Existing relation types retain their meaning. No URL/name-based classification.
alter table public.resource_relations
  add column project_role text not null default 'reference',
  add constraint resource_relations_project_role_check check (
    project_role in ('reference', 'additional_artifact', 'primary_artifact')
    and (target_type = 'project' or project_role = 'reference')
  );
comment on column public.resource_relations.project_role is
  'Explicit Project use: reference, additional_artifact or primary_artifact. Orthogonal to relation_type; existing rows remain references.';

create unique index resource_relations_one_primary_project
  on public.resource_relations (target_id)
  where project_role = 'primary_artifact';
create unique index resource_relations_one_artifact_use
  on public.resource_relations (target_id, resource_id)
  where project_role <> 'reference';

-- Defense against direct Data API writes, beyond the application/RPC checks.
create function public.guard_project_artifact_role()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.project_role <> 'reference' then
    if auth.uid() is null or new.user_id <> auth.uid() then
      raise exception 'Artifact ownership required' using errcode = '42501';
    end if;
    perform 1 from public.projects p where p.id = new.target_id
      and p.user_id = auth.uid() and p.archived_at is null for update;
    if not found then raise exception 'Project unavailable' using errcode = '42501'; end if;
    -- Archived resources may retain their historical designation, but cannot
    -- be newly promoted. Primary -> Additional demotion preserves history.
    perform 1 from public.resources r where r.id = new.resource_id
      and r.user_id = auth.uid()
      and (r.archived_at is null or
        (tg_op = 'UPDATE' and old.project_role = 'primary_artifact'
         and new.project_role = 'additional_artifact'
         and old.resource_id = new.resource_id and old.target_id = new.target_id))
      for share;
    if not found then raise exception 'Resource unavailable' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;
create trigger guard_project_artifact_role before insert or update
  on public.resource_relations for each row execute function public.guard_project_artifact_role();
revoke all on function public.guard_project_artifact_role() from public, anon;
grant execute on function public.guard_project_artifact_role() to authenticated;

create function public.set_project_resource_role(p_project_id uuid, p_resource_id uuid, p_role text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_relation uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('reference','additional_artifact','primary_artifact','remove') then
    raise exception 'Invalid project role' using errcode = '22023';
  end if;
  -- Serializes role selection/swap/removal per Project, including first link.
  perform 1 from public.projects where id = p_project_id and user_id = v_user
    and (archived_at is null or p_role = 'remove') for update;
  if not found then raise exception 'Project unavailable' using errcode = '42501'; end if;
  perform 1 from public.resources where id = p_resource_id and user_id = v_user
    and (archived_at is null or p_role in ('reference','remove')) for share;
  if not found then raise exception 'Resource unavailable' using errcode = '42501'; end if;

  if p_role = 'remove' then
    delete from public.resource_relations where user_id = v_user
      and target_type = 'project' and target_id = p_project_id and resource_id = p_resource_id;
    return null;
  end if;

  -- Reuse an existing edge; preserve every pre-existing relation_type.
  select id into v_relation from public.resource_relations
    where user_id = v_user and target_type = 'project'
      and target_id = p_project_id and resource_id = p_resource_id
    order by (project_role <> 'reference') desc, created_at, id limit 1;
  if v_relation is null then
    insert into public.resource_relations(user_id,resource_id,target_type,target_id,relation_type)
      values(v_user,p_resource_id,'project',p_project_id,'context') returning id into v_relation;
  end if;
  if p_role = 'primary_artifact' then
    update public.resource_relations set project_role = 'additional_artifact'
      where user_id = v_user and target_type = 'project' and target_id = p_project_id
        and project_role = 'primary_artifact' and id <> v_relation;
  end if;
  update public.resource_relations set project_role = p_role where id = v_relation and user_id = v_user;
  return v_relation;
end;
$$;
revoke all on function public.set_project_resource_role(uuid,uuid,text) from public, anon;
grant execute on function public.set_project_resource_role(uuid,uuid,text) to authenticated;
