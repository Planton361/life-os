-- One explicit UI commit. Existing authenticated, locked and user-scoped functions
-- remain canonical. A routing failure rolls back clarification in this transaction.
create function public.complete_inbox_triage(
  p_inbox_item_id uuid, p_expected_updated_at timestamptz, p_title text,
  p_body text, p_next_action text, p_missing_info text, p_priority public.task_priority,
  p_energy public.task_energy, p_duration_minutes integer, p_area_id uuid,
  p_review_needed boolean, p_today_candidate boolean, p_deadline_hint date,
  p_route text, p_target_id uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_item public.inbox_items%rowtype;
begin
  v_item := public.save_inbox_clarification(
    p_inbox_item_id, p_expected_updated_at, p_title, p_body, p_next_action,
    p_missing_info, p_priority, p_energy, p_duration_minutes, p_area_id,
    p_review_needed, p_today_candidate, p_deadline_hint
  );
  return public.route_saved_inbox_item(v_item.id, v_item.updated_at, p_route, p_target_id);
end;
$$;
revoke all on function public.complete_inbox_triage(uuid,timestamptz,text,text,text,text,public.task_priority,public.task_energy,integer,uuid,boolean,boolean,date,text,uuid) from public, anon;
grant execute on function public.complete_inbox_triage(uuid,timestamptz,text,text,text,text,public.task_priority,public.task_energy,integer,uuid,boolean,boolean,date,text,uuid) to authenticated;
