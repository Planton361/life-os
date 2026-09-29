-- Existing Project INSERT privileges must not let a Data API caller seed
-- command-owned result or lifecycle tokens when creating a Project.
create function public.guard_project_depth_initial_command_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user = 'authenticated' and
     (new.desired_result is not null or new.completion_revision <> 0 or new.completion_cycle <> 0) then
    raise exception 'PROJECT_COMMAND_REQUIRED' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_project_depth_initial_command_fields
before insert on public.projects for each row
execute function public.guard_project_depth_initial_command_fields();

revoke all on function public.guard_project_depth_initial_command_fields()
  from public, anon, authenticated;
