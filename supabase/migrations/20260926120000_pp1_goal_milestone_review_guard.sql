-- Keep Goal Milestone achievement and reopen transitions on canonical commands.
-- SECURITY DEFINER review commands run with their trusted function owner as
-- current_user; raw authenticated table updates keep current_user=authenticated.
create or replace function public.validate_goal_milestone_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'archived' then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if current_user = 'authenticated'
     and (
       (old.status = 'active' and new.status = 'achieved')
       or (old.status = 'achieved' and new.status = 'active')
     ) then
    raise exception 'GOAL_MILESTONE_REVIEW_REQUIRED' using errcode = '42501';
  end if;

  if old.status = 'planned' and new.status <> 'active' then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  elsif old.status = 'active' and new.status not in ('planned', 'achieved') then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  elsif old.status = 'achieved' and new.status <> 'active' then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  elsif old.status = 'archived' then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.validate_goal_milestone_status_transition() is
  'Blocks raw authenticated achievement/reopen status writes while preserving canonical SECURITY DEFINER review commands.';
