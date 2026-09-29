-- Keep every durable Review within the accepted Project status and note bounds,
-- including direct RPC callers that bypass the form.
alter table public.project_reviews
  add constraint project_reviews_prior_nonterminal
  check (prior_status in ('idea', 'active', 'paused', 'blocked'));

alter table public.project_reviews
  add constraint project_reviews_open_work_disposition_length
  check (open_work_disposition is null or
    char_length(open_work_disposition) between 1 and 2000);
