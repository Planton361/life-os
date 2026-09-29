-- New Projects cannot enter a terminal state without the Project command.
-- Privileged migration fixtures may still represent pre-existing Legacy rows.
create or replace function public.guard_project_depth_initial_command_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'postgres' and
     (new.status in ('completed','archived') or new.desired_result is not null
      or new.completion_revision <> 0 or new.completion_cycle <> 0) then
    raise exception 'PROJECT_COMMAND_REQUIRED' using errcode = '42501';
  end if;
  return new;
end $$;
