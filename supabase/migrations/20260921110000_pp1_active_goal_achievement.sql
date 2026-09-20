create or replace function public.validate_goal_achievement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'achieved'
     and (tg_op = 'INSERT' or old.status is distinct from 'achieved') then
    if tg_op = 'INSERT' then
      raise exception 'GOAL_ACHIEVEMENT_REQUIRES_ACTIVE' using errcode = 'P0001';
    elsif old.status is distinct from 'active' then
      raise exception 'GOAL_ACHIEVEMENT_REQUIRES_ACTIVE' using errcode = 'P0001';
    end if;

    if new.archived_at is not null then
      raise exception 'GOAL_ARCHIVED' using errcode = 'P0001';
    end if;

    if not exists (
      select 1
        from public.goal_outcome_criteria c
       where c.user_id = new.user_id
         and c.goal_id = new.id
         and c.archived_at is null
    ) then
      raise exception 'GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA' using errcode = 'P0001';
    end if;

    if exists (
      select 1
        from public.goal_outcome_criteria c
       where c.user_id = new.user_id
         and c.goal_id = new.id
         and c.archived_at is null
         and not public.goal_outcome_criterion_is_met(c.user_id, c.id)
    ) then
      raise exception 'GOAL_ACHIEVEMENT_CRITERIA_NOT_MET' using errcode = 'P0001';
    end if;

    if exists (
      select 1
        from public.goal_milestones m
       where m.user_id = new.user_id
         and m.goal_id = new.id
         and m.archived_at is null
         and m.status <> 'achieved'
    ) then
      raise exception 'GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED' using errcode = 'P0001';
    end if;

    if new.achieved_at is null then
      new.achieved_at := now();
    end if;
  end if;

  return new;
end;
$$;
