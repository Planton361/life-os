-- #198 Project direct completion (parity with SQLite schema v12).
-- A one-click `project.status.set` → completed records its own lifecycle fact
-- (event_kind 'completed'); a later Reopen/Archive names its prior kind
-- 'direct'. No Review is synthesized. Existing rows satisfy every new check
-- unchanged (the new shapes only widen the accepted set). Local file only:
-- never pushed to a remote project without a separate approval.
alter table public.project_lifecycle_events drop constraint project_lifecycle_v4_shape;
alter table public.project_lifecycle_events add constraint project_lifecycle_v12_shape check (
 revision_after>=0 and cycle_before>=0 and cycle_after>=0
 and ((event_kind='completed' and prior_status in ('idea','active','paused','blocked') and resulting_status='completed' and cycle_after=cycle_before)
   or (event_kind='reopened' and prior_status='completed' and resulting_status='active' and cycle_after=cycle_before+1)
   or (event_kind='archived' and prior_status<>'archived' and resulting_status='archived' and cycle_after=cycle_before))
 and ((prior_status='completed' and ((prior_completion_kind='review' and prior_review_id is not null)
    or (prior_completion_kind in ('legacy_without_review','direct') and prior_review_id is null)))
   or (prior_status<>'completed' and prior_completion_kind is null and prior_review_id is null))
 and (not mistaken_completion or (event_kind='reopened' and reason is not null))
 );
alter table public.project_lifecycle_events drop constraint project_lifecycle_completion_identity;
alter table public.project_lifecycle_events add constraint project_lifecycle_completion_identity check (
 (prior_status='completed' and prior_completion_kind is not null and prior_completion_kind in ('review','legacy_without_review','direct'))
 or (prior_status<>'completed' and prior_completion_kind is null));
create unique index project_complete_direct_once on public.project_lifecycle_events(user_id,project_id,cycle_before) where event_kind='completed';

create or replace function public.project_depth_command(p_project_id uuid,p_command_id uuid,p_operation text,p_expected_revision bigint,p_expected_cycle bigint,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
 u uuid:=auth.uid(); p public.projects%rowtype; receipt public.project_command_receipts%rowtype;
 q jsonb; identity_payload jsonb; h text; ctx jsonb; result jsonb; x jsonb; evidence jsonb; c public.project_completion_criteria%rowtype;
 t text; note text; cid uuid; rid uuid; aid uuid; prior_review uuid; prior_kind text; d text;
 locked_resource_ids uuid[]:='{}'; changed boolean:=false; reopen boolean:=false; mistaken boolean:=false; count_active integer; count_archived integer; open_count integer;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_project_id is null or p_command_id is null or p_expected_revision is null or p_expected_cycle is null
   or p_expected_revision<0 or p_expected_cycle<0 or p_payload is null then raise exception 'PROJECT_COMMAND_INVALID' using errcode='22023'; end if;
 if octet_length(p_payload::text)>1048576 then raise exception 'PROJECT_PAYLOAD_LIMIT' using errcode='54000'; end if;
 q:=project_depth_private.canonical(p_operation,p_payload);
 identity_payload:=jsonb_build_object('version',1,'command_kind',p_operation,'project_id',p_project_id,
   'expected_revision',p_expected_revision::text,'expected_cycle',p_expected_cycle::text,'payload',q);
 h:=project_depth_private.sha256(identity_payload::text);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||p_command_id::text,0));
 select * into receipt from public.project_command_receipts where user_id=u and command_id=p_command_id;
 if found then
  if receipt.request_payload is distinct from identity_payload or receipt.request_fingerprint<>h then
   raise exception 'PROJECT_COMMAND_KEY_CONFLICT' using errcode='23505'; end if;
  return receipt.result_payload;
 end if;
 select * into p from public.projects where id=p_project_id and user_id=u for update;
 if not found then raise exception 'PROJECT_NOT_FOUND' using errcode='42501'; end if;
 if (p.completion_revision,p.completion_cycle) is distinct from (p_expected_revision,p_expected_cycle) then raise exception 'PROJECT_STALE' using errcode='23514'; end if;
 if (p.archived_at is not null or p.status='archived') and p_operation<>'review.amend' then raise exception 'PROJECT_ARCHIVED' using errcode='23514'; end if;
 if p.status='completed' and p_operation in ('result.set','criterion.create','criterion.edit','criterion.reorder','criterion.archive') then raise exception 'PROJECT_COMPLETED_FROZEN' using errcode='23514'; end if;
 result:=jsonb_build_object('project_id',p_project_id,'operation',p_operation,'command_id',p_command_id);
 if p_operation='result.set' then
  t:=q->>'desired_result';
  if char_length(t)>4000 then raise exception 'PROJECT_RESULT_INVALID' using errcode='22023'; end if;
  changed:=t is distinct from p.desired_result;
  if changed then update public.projects set desired_result=t where id=p.id and user_id=u; end if;
 elsif p_operation='criterion.create' then
  if (select count(*) from public.project_completion_criteria where user_id=u and project_id=p.id and (archived_at is null or archived_cycle=p.completion_cycle))>=1000 then raise exception 'PROJECT_CRITERION_LIMIT' using errcode='54000'; end if;
  insert into public.project_completion_criteria(user_id,project_id,text,sort_order) values(u,p.id,q->>'text',(q->>'sort_order')::bigint) returning id into cid;
  changed:=true; result:=result||jsonb_build_object('criterion_id',cid);
 elsif p_operation in ('criterion.edit','criterion.reorder','criterion.archive') then
  select * into c from public.project_completion_criteria where user_id=u and project_id=p.id and id=(q->>'criterion_id')::uuid and archived_at is null for update;
  if not found then raise exception 'PROJECT_CRITERION_NOT_FOUND' using errcode='42501'; end if;
  if p_operation='criterion.edit' then
   changed:=c.text is distinct from q->>'text';
   if changed then update public.project_completion_criteria set text=q->>'text',updated_at=now() where id=c.id and user_id=u; end if;
  elsif p_operation='criterion.reorder' then
   changed:=c.sort_order is distinct from (q->>'sort_order')::bigint;
   if changed then update public.project_completion_criteria set sort_order=(q->>'sort_order')::bigint,updated_at=now() where id=c.id and user_id=u; end if;
  else
   update public.project_completion_criteria set archived_at=now(),archive_reason=q->>'reason',archived_cycle=p.completion_cycle,archived_revision=p.completion_revision+1,updated_at=now() where id=c.id and user_id=u;
   changed:=true;
  end if;
 elsif p_operation='project.status.set' then
  if p.status='completed' or q->>'status' is null or q->>'status' not in ('idea','active','paused','blocked','completed') then raise exception 'PROJECT_STATUS_CONFLICT' using errcode='23514'; end if;
  changed:=p.status::text<>q->>'status';
  if changed then update public.projects set status=(q->>'status')::public.project_status where id=p.id and user_id=u; end if;
  -- #198: direct completion needs no Review; it is its own lifecycle fact.
  if q->>'status'='completed' then
   insert into public.project_lifecycle_events(user_id,project_id,command_id,event_kind,revision_after,cycle_before,cycle_after,project_title_snapshot,prior_status,resulting_status,prior_completion_kind,prior_review_id,reason,mistaken_completion)
    values(u,p.id,p_command_id,'completed',p.completion_revision+1,p.completion_cycle,p.completion_cycle,p.title,p.status,'completed'::public.project_status,null,null,null,false);
  end if;
 elsif p_operation in ('project.reopen','project.archive') then
  reopen:=p_operation='project.reopen'; mistaken:=coalesce((q->>'mistaken_completion')::boolean,false);
  if reopen and p.status<>'completed' then raise exception 'PROJECT_REOPEN_CONFLICT' using errcode='23514'; end if;
  if mistaken and nullif(q->>'reason','') is null then raise exception 'PROJECT_MISTAKEN_REASON_REQUIRED' using errcode='23514'; end if;
  changed:=true;
 elsif p_operation='review.amend' then
  select id into rid from public.project_reviews where user_id=u and project_id=p.id and id=(q->>'review_id')::uuid;
  if not found then raise exception 'PROJECT_REVIEW_NOT_FOUND' using errcode='42501'; end if;
  if q->>'kind'='evidence_withdrawn' then
   perform 1 from public.project_review_resources where user_id=u and project_id=p.id and review_id=rid and id=(q->>'review_resource_id')::uuid;
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
  end if;
  mistaken:=q->>'kind'='marked_mistaken';
  reopen:=mistaken and p.status='completed' and exists(select 1 from public.project_reviews where id=rid and user_id=u and project_id=p.id and decision='completed' and completion_cycle=p.completion_cycle);
  changed:=true;
 elsif p_operation='review.submit' then
  if p.status='completed' then raise exception 'PROJECT_ALREADY_COMPLETED' using errcode='23514'; end if;
  if jsonb_array_length(q->'evidence')>200 then raise exception 'PROJECT_RESOURCE_LIMIT' using errcode='54000'; end if;
  -- All selected resource locks, then concrete relation locks, in stable order.
  for cid in select distinct rr.resource_id from jsonb_array_elements(q->'evidence') e join public.resource_relations rr on rr.id=(e->>'relation_id')::uuid and rr.user_id=u and rr.target_type='project' and rr.target_id=p.id order by rr.resource_id loop
   perform 1 from public.resources where id=cid and user_id=u and archived_at is null for share;
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
   locked_resource_ids:=array_append(locked_resource_ids,cid);
  end loop;
  for x in select value from jsonb_array_elements(q->'evidence') order by (value->>'relation_id')::uuid loop
   select rr.resource_id into cid from public.resource_relations rr join public.resources r on r.id=rr.resource_id and r.user_id=rr.user_id
    where rr.id=(x->>'relation_id')::uuid and rr.user_id=u and rr.target_type='project' and rr.target_id=p.id and r.archived_at is null for share of rr;
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
   if not cid=any(locked_resource_ids) then raise exception 'PROJECT_STALE_RESOURCE' using errcode='23514'; end if;
  end loop;
  ctx:=public.project_review_context(p.id);
  if jsonb_array_length(ctx->'work')>5000 or jsonb_array_length(ctx->'criteria')>1000 or jsonb_array_length(ctx->'resources')>1000 or octet_length(ctx::text)>2097152 then raise exception 'PROJECT_CONTEXT_LIMIT' using errcode='54000'; end if;
  if q->>'fingerprint' is distinct from ctx->>'fingerprint' then raise exception 'PROJECT_STALE_CONTEXT' using errcode='23514'; end if;
  d:=q->>'decision'; t:=q->>'rationale'; note:=q->>'open_work_disposition';
  if d is null or d not in ('completed','continue') or t is null or char_length(t) not between 1 and 2000 then raise exception 'PROJECT_REVIEW_INVALID' using errcode='23514'; end if;
  if d='continue' and ((q->>'result_accepted')::boolean or (q->>'open_work_acknowledged')::boolean or note is not null) then raise exception 'PROJECT_CONTINUE_INVALID' using errcode='23514'; end if;
  select count(*) filter(where archived_at is null),count(*) filter(where archived_at is not null) into count_active,count_archived from public.project_completion_criteria where user_id=u and project_id=p.id and (archived_at is null or archived_cycle=p.completion_cycle);
  if d='completed' and (p.desired_result is null or count_active=0 or not (q->>'result_accepted')::boolean) then raise exception 'PROJECT_COMPLETION_PRECONDITION' using errcode='23514'; end if;
  if (q->>'archived_criteria_acknowledged')::boolean<>(count_archived>0) or jsonb_array_length(q->'archived_ids')<>count_archived or
    exists(select 1 from public.project_completion_criteria c where c.user_id=u and c.project_id=p.id and c.archived_at is not null and c.archived_cycle=p.completion_cycle and not q->'archived_ids' ? c.id::text) then raise exception 'PROJECT_ARCHIVED_SCOPE_STALE' using errcode='23514'; end if;
  for x in select value from jsonb_array_elements(q->'archived_notes') loop
   if not q->'archived_ids' ? (x->>'id') or char_length(x->>'note')>2000 or (select count(*) from jsonb_array_elements(q->'archived_notes') where value->>'id'=x->>'id')<>1 then raise exception 'PROJECT_ARCHIVED_SCOPE_INVALID' using errcode='23514'; end if;
  end loop;
  if jsonb_array_length(q->'criteria')<>count_active then raise exception 'PROJECT_CRITERION_SET_STALE' using errcode='23514'; end if;
  for c in select * from public.project_completion_criteria where user_id=u and project_id=p.id and archived_at is null order by id loop
   select value into x from jsonb_array_elements(q->'criteria') where value->>'id'=c.id::text;
   if not found or (select count(*) from jsonb_array_elements(q->'criteria') where value->>'id'=c.id::text)<>1 then raise exception 'PROJECT_CRITERION_SET_STALE' using errcode='23514'; end if;
   if x->>'assessment' is null or x->>'assessment' not in ('satisfied','not_satisfied','not_assessed') or (d='completed' and x->>'assessment'<>'satisfied') then raise exception 'PROJECT_CRITERION_ASSESSMENT_INVALID' using errcode='23514'; end if;
   if (x->>'assessment'='not_satisfied' and x->>'note' is null) or char_length(x->>'note')>2000 then raise exception 'PROJECT_CRITERION_RATIONALE_REQUIRED' using errcode='23514'; end if;
  end loop;
  open_count:=(ctx->>'open_task_count')::integer+(ctx->>'open_milestone_count')::integer;
  if d='completed' and ((open_count>0 and (not (q->>'open_work_acknowledged')::boolean or note is null or char_length(note) not between 1 and 2000)) or
    (open_count=0 and ((q->>'open_work_acknowledged')::boolean or note is not null))) then raise exception 'PROJECT_OPEN_WORK_ACK_REQUIRED' using errcode='23514'; end if;
  insert into public.project_reviews(user_id,project_id,command_id,completion_cycle,revision_before,revision_after,project_title_snapshot,desired_result_snapshot,goal_id_snapshot,goal_title_snapshot,
   decision,prior_status,resulting_status,result_accepted,rationale,work_observed_at,context_fingerprint,open_task_count,done_task_count,canceled_task_count,open_milestone_count,done_milestone_count,open_work_acknowledged,open_work_disposition,archived_criteria_acknowledged)
  values(u,p.id,p_command_id,p.completion_cycle,p.completion_revision,p.completion_revision+1,p.title,p.desired_result,p.goal_id,ctx->>'goal_title',d,p.status,case when d='completed' then 'completed'::public.project_status else p.status end,
   (q->>'result_accepted')::boolean,t,(ctx->>'work_observed_at')::timestamptz,ctx->>'fingerprint',(ctx->>'open_task_count')::integer,(ctx->>'done_task_count')::integer,(ctx->>'canceled_task_count')::integer,(ctx->>'open_milestone_count')::integer,(ctx->>'done_milestone_count')::integer,
   (q->>'open_work_acknowledged')::boolean,note,(q->>'archived_criteria_acknowledged')::boolean) returning id into rid;
  insert into public.project_review_criteria(user_id,project_id,review_id,criterion_id,text_snapshot,sort_order_snapshot,was_archived,archive_reason_snapshot,archived_cycle_snapshot,archived_revision_snapshot,decision,rationale)
   select u,p.id,rid,c.id,c.text,c.sort_order,c.archived_at is not null,c.archive_reason,c.archived_cycle,c.archived_revision,
    case when c.archived_at is not null then 'excluded' else a.value->>'assessment' end,case when c.archived_at is not null then b.value->>'note' else a.value->>'note' end
   from public.project_completion_criteria c left join lateral(select value from jsonb_array_elements(q->'criteria') where value->>'id'=c.id::text) a on true
   left join lateral(select value from jsonb_array_elements(q->'archived_notes') where value->>'id'=c.id::text) b on true
   where c.user_id=u and c.project_id=p.id and (c.archived_at is null or c.archived_cycle=p.completion_cycle);
  for x in select value from jsonb_array_elements(q->'evidence') loop
   select value into evidence from jsonb_array_elements(ctx->'resources') where value->>'relation_id'=x->>'relation_id';
   if not found then raise exception 'PROJECT_RESOURCE_UNAVAILABLE' using errcode='42501'; end if;
   if evidence->>'token' is distinct from x->>'token' then raise exception 'PROJECT_STALE_RESOURCE' using errcode='23514'; end if;
   insert into public.project_review_resources(user_id,project_id,review_id,criterion_id,resource_id,relation_id_snapshot,title_snapshot,resource_type_snapshot,safe_url_snapshot,project_role_snapshot,relation_type_snapshot,note)
    values(u,p.id,rid,(x->>'criterion_id')::uuid,(evidence->>'id')::uuid,(evidence->>'relation_id')::uuid,evidence->>'title',evidence->>'type',project_depth_private.safe_url(evidence->>'url'),evidence->>'role',evidence->>'relation_type',x->>'note');
  end loop;
  update public.projects set status=case when d='completed' then 'completed'::public.project_status else status end,completion_revision=p.completion_revision+1 where id=p.id and user_id=u;
  changed:=true; result:=result||jsonb_build_object('review_id',rid,'decision',d);
 end if;
 if p_operation in ('project.reopen','project.archive') or reopen then
  if p.status='completed' then
   select id into prior_review from public.project_reviews where user_id=u and project_id=p.id and decision='completed' and completion_cycle=p.completion_cycle;
   prior_kind:=case when prior_review is not null then 'review'
    when exists(select 1 from public.project_lifecycle_events where user_id=u and project_id=p.id and cycle_before=p.completion_cycle and event_kind='completed') then 'direct'
    else 'legacy_without_review' end;
  end if;
  update public.projects set status=case when reopen then 'active'::public.project_status else 'archived'::public.project_status end,
   archived_at=case when reopen then null else now() end,completion_cycle=p.completion_cycle+case when reopen then 1 else 0 end,completion_revision=p.completion_revision+1 where id=p.id and user_id=u;
  insert into public.project_lifecycle_events(user_id,project_id,command_id,event_kind,revision_after,cycle_before,cycle_after,project_title_snapshot,prior_status,resulting_status,prior_completion_kind,prior_review_id,reason,mistaken_completion)
   values(u,p.id,p_command_id,case when reopen then 'reopened' else 'archived' end,p.completion_revision+1,p.completion_cycle,p.completion_cycle+case when reopen then 1 else 0 end,p.title,p.status,
    case when reopen then 'active'::public.project_status else 'archived'::public.project_status end,prior_kind,prior_review,q->>'reason',mistaken);
 end if;
 if p_operation='review.amend' or (p_operation='project.reopen' and mistaken and prior_review is not null) then
  insert into public.project_review_amendments(user_id,project_id,review_id,command_id,revision_after,kind,review_resource_id,reason)
   values(u,p.id,case when p_operation='review.amend' then rid else prior_review end,p_command_id,p.completion_revision+1,
    case when p_operation='review.amend' then q->>'kind' else 'marked_mistaken' end,(q->>'review_resource_id')::uuid,q->>'reason') returning id into aid;
  result:=result||jsonb_build_object('amendment_id',aid);
 end if;
 -- Commands that changed Criteria/History without metadata still advance once.
 if changed then update public.projects set completion_revision=p.completion_revision+1 where id=p.id and user_id=u and completion_revision=p.completion_revision; end if;
 result:=result||(select jsonb_build_object('completion_revision',completion_revision::text,'completion_cycle',completion_cycle::text,'status',status,'no_op',not changed) from public.projects where id=p.id and user_id=u);
 insert into public.project_command_receipts(user_id,project_id,command_id,command_kind,request_payload,request_fingerprint,result_payload) values(u,p.id,p_command_id,p_operation,identity_payload,h,result);
 return result;
end $$;
alter function public.project_depth_command(uuid,uuid,text,bigint,bigint,jsonb) owner to life_os_project_command;
create or replace function public.check_project_depth_chain() returns trigger language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare r public.project_reviews%rowtype; l public.project_lifecycle_events%rowtype; a public.project_review_amendments%rowtype; begin
 if tg_table_name='projects' then
  if not exists(select 1 from public.projects where id=new.id and user_id=new.user_id) then return null; end if;
  if (new.status,new.archived_at,new.completion_cycle) is distinct from (old.status,old.archived_at,old.completion_cycle) then
   if new.status='completed' then
    if not exists(select 1 from public.project_reviews r where r.user_id=new.user_id and r.project_id=new.id and r.decision='completed'
     and r.completion_cycle=new.completion_cycle and r.revision_before=old.completion_revision and r.revision_after=new.completion_revision and r.prior_status=old.status)
     and not exists(select 1 from public.project_lifecycle_events l where l.user_id=new.user_id and l.project_id=new.id and l.event_kind='completed'
     and l.cycle_before=new.completion_cycle and l.revision_after=new.completion_revision and l.prior_status=old.status) then raise exception 'PROJECT_COMPLETION_REVIEW_REQUIRED' using errcode='23514'; end if;
   elsif old.status='completed' or new.status='archived' then
    if not exists(select 1 from public.project_lifecycle_events l where l.user_id=new.user_id and l.project_id=new.id and l.revision_after=new.completion_revision
     and l.cycle_before=old.completion_cycle and l.cycle_after=new.completion_cycle and l.prior_status=old.status and l.resulting_status=new.status) then raise exception 'PROJECT_LIFECYCLE_REQUIRED' using errcode='23514'; end if;
   elsif new.completion_cycle<>old.completion_cycle then raise exception 'PROJECT_CYCLE_REOPEN_REQUIRED' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='project_reviews' then
  select * into r from public.project_reviews where id=new.id and user_id=new.user_id;
  if not found then return null; end if;
  if r.decision='completed' and (not exists(select 1 from public.project_review_criteria c where c.review_id=r.id and not c.was_archived)
    or exists(select 1 from public.project_review_criteria c where c.review_id=r.id and not c.was_archived and c.decision<>'satisfied')) then raise exception 'PROJECT_COMPLETION_CRITERIA_REQUIRED' using errcode='23514'; end if;
  if exists(select 1 from public.project_review_criteria c where c.review_id=r.id and c.was_archived and c.archived_cycle_snapshot<>r.completion_cycle)
   or r.archived_criteria_acknowledged<>exists(select 1 from public.project_review_criteria c where c.review_id=r.id and c.was_archived) then raise exception 'PROJECT_ARCHIVED_SCOPE_INVALID' using errcode='23514'; end if;
  if not exists(select 1 from public.project_command_receipts c where c.user_id=r.user_id and c.project_id=r.project_id and c.command_id=r.command_id and c.command_kind='review.submit'
    and (c.result_payload->>'completion_revision')::bigint=r.revision_after and c.result_payload->>'status'=r.resulting_status::text
    and c.request_payload->'payload'->>'fingerprint'=r.context_fingerprint
    and jsonb_array_length(c.request_payload->'payload'->'criteria')=(select count(*) from public.project_review_criteria x where x.review_id=r.id and not x.was_archived)
    and jsonb_array_length(c.request_payload->'payload'->'archived_ids')=(select count(*) from public.project_review_criteria x where x.review_id=r.id and x.was_archived)) then raise exception 'PROJECT_REVIEW_RECEIPT_INVALID' using errcode='23514'; end if;
 elsif tg_table_name='project_lifecycle_events' then
  l:=new;
  -- #198: only project.status.set → completed records a direct completion, and
  -- a recorded prior kind names what actually completed that cycle.
  if (l.event_kind='completed') is distinct from exists(select 1 from public.project_command_receipts c where c.user_id=l.user_id and c.project_id=l.project_id
    and c.command_id=l.command_id and c.command_kind='project.status.set' and c.request_payload->'payload'->>'status'='completed') then raise exception 'PROJECT_PRIOR_COMPLETION_INVALID' using errcode='23514'; end if;
  if l.prior_status='completed' and l.prior_completion_kind is distinct from (case
    when exists(select 1 from public.project_reviews r where r.user_id=l.user_id and r.project_id=l.project_id and r.decision='completed' and r.completion_cycle=l.cycle_before) then 'review'
    when exists(select 1 from public.project_lifecycle_events e where e.user_id=l.user_id and e.project_id=l.project_id and e.event_kind='completed' and e.cycle_before=l.cycle_before) then 'direct'
    else 'legacy_without_review' end) then raise exception 'PROJECT_PRIOR_COMPLETION_INVALID' using errcode='23514'; end if;
  if l.prior_review_id is not null and not exists(select 1 from public.project_reviews r where r.id=l.prior_review_id and r.user_id=l.user_id and r.project_id=l.project_id and r.decision='completed' and r.completion_cycle=l.cycle_before) then raise exception 'PROJECT_PRIOR_COMPLETION_INVALID' using errcode='23514'; end if;
  if l.mistaken_completion and l.prior_review_id is not null and not exists(select 1 from public.project_review_amendments a where a.review_id=l.prior_review_id and a.command_id=l.command_id and a.kind='marked_mistaken' and a.revision_after=l.revision_after) then raise exception 'PROJECT_MISTAKEN_REOPEN_REQUIRED' using errcode='23514'; end if;
 elsif tg_table_name='project_review_amendments' then
  a:=new;
  if a.kind='marked_mistaken' and exists(select 1 from public.project_reviews r join public.projects p on p.id=r.project_id and p.user_id=r.user_id where r.id=a.review_id and r.decision='completed' and p.status='completed' and p.completion_cycle=r.completion_cycle)
    and not exists(select 1 from public.project_lifecycle_events l where l.prior_review_id=a.review_id and l.command_id=a.command_id and l.mistaken_completion) then raise exception 'PROJECT_MISTAKEN_REOPEN_REQUIRED' using errcode='23514'; end if;
 end if;
 return null;
end $$;
alter function public.check_project_depth_chain() owner to life_os_project_command;
revoke all on function public.check_project_depth_chain() from public,anon,authenticated;
