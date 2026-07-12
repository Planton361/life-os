grant update on table public.review_task_decisions to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'review_task_decisions'
      and policyname = 'Users can update own review_task_decisions'
  ) then
    create policy "Users can update own review_task_decisions"
    on public.review_task_decisions for update to authenticated
    using ((select auth.uid()) = user_id)
    with check (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.review_records reviews
        where reviews.id = review_id
          and reviews.user_id = (select auth.uid())
      )
      and exists (
        select 1 from public.tasks tasks
        where tasks.id = task_id
          and tasks.user_id = (select auth.uid())
      )
    );
  end if;
end
$$;
