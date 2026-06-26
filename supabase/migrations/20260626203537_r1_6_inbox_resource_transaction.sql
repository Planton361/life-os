create or replace function public.create_resource_from_inbox(
  p_inbox_item_id uuid,
  p_title text,
  p_type public.resource_type,
  p_summary text default null,
  p_url text default null,
  p_area_id uuid default null,
  p_review_needed boolean default true
)
returns public.resources
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_inbox public.inbox_items%rowtype;
  v_resource public.resources%rowtype;
  v_title text := nullif(btrim(p_title), '');
  v_summary text := nullif(btrim(p_summary), '');
  v_url text := nullif(btrim(p_url), '');
  v_source text;
  v_resolved_at timestamptz := now();
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

  v_source := 'inbox:' || p_inbox_item_id::text;

  select *
    into v_inbox
    from public.inbox_items
   where id = p_inbox_item_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'Inbox item not found' using errcode = 'P0002';
  end if;

  select *
    into v_resource
    from public.resources
   where user_id = v_user_id
     and source = v_source
     and archived_at is null
   order by created_at asc
   limit 1;

  if found then
    update public.inbox_items
       set status = 'archived',
           processed_at = coalesce(processed_at, v_resolved_at),
           archived_at = coalesce(archived_at, v_resolved_at),
           updated_at = v_resolved_at
     where id = v_inbox.id
       and user_id = v_user_id;

    return v_resource;
  end if;

  if v_inbox.status in ('triaged', 'processed', 'archived') or
     v_inbox.archived_at is not null or
     v_inbox.processed_at is not null or
     v_inbox.created_task_id is not null then
    raise exception 'Inbox item is already processed' using errcode = '23505';
  end if;

  if p_area_id is not null and not exists (
    select 1
      from public.areas
     where id = p_area_id
       and user_id = v_user_id
       and archived_at is null
  ) then
    raise exception 'Area not found' using errcode = 'P0002';
  end if;

  insert into public.resources (
    user_id,
    area_id,
    type,
    title,
    summary,
    url,
    source,
    review_needed
  )
  values (
    v_user_id,
    coalesce(p_area_id, v_inbox.area_id),
    p_type,
    v_title,
    coalesce(v_summary, nullif(btrim(v_inbox.body), '')),
    v_url,
    v_source,
    coalesce(p_review_needed, true)
  )
  returning * into v_resource;

  update public.inbox_items
     set status = 'archived',
         processed_at = v_resolved_at,
         archived_at = v_resolved_at,
         updated_at = v_resolved_at
   where id = v_inbox.id
     and user_id = v_user_id;

  return v_resource;
end;
$$;

revoke execute on function public.create_resource_from_inbox(
  uuid,
  text,
  public.resource_type,
  text,
  text,
  uuid,
  boolean
) from public;

revoke execute on function public.create_resource_from_inbox(
  uuid,
  text,
  public.resource_type,
  text,
  text,
  uuid,
  boolean
) from anon;

grant execute on function public.create_resource_from_inbox(
  uuid,
  text,
  public.resource_type,
  text,
  text,
  uuid,
  boolean
) to authenticated;
