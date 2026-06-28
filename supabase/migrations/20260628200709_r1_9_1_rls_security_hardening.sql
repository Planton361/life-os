-- R1.9.1 RLS / Security Audit hardening.
-- This migration does not change table ownership policies or product behavior.
-- It tightens function/table privilege surface found during the local audit.

alter function public.set_updated_at()
  set search_path = public;

revoke execute on function public.triage_inbox_item_to_task(
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  public.task_priority,
  public.task_energy,
  date,
  timestamptz,
  integer,
  timestamptz
) from public;

revoke execute on function public.triage_inbox_item_to_task(
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  public.task_priority,
  public.task_energy,
  date,
  timestamptz,
  integer,
  timestamptz
) from anon;

grant execute on function public.triage_inbox_item_to_task(
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  public.task_priority,
  public.task_energy,
  date,
  timestamptz,
  integer,
  timestamptz
) to authenticated;

revoke truncate, references, trigger
  on all tables in schema public
  from public;

revoke truncate, references, trigger
  on all tables in schema public
  from anon;

revoke truncate, references, trigger
  on all tables in schema public
  from authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables
  from public;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables
  from anon;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables
  from authenticated;
