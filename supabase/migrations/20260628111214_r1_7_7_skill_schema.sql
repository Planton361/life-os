create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  summary text,
  category text,
  status text not null default 'active',
  level text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_name_not_blank check (length(btrim(name)) > 0),
  constraint skills_status_valid check (
    status in ('active', 'paused', 'archived')
  )
);

comment on table public.skills is
  'Canonical user-owned skills. R1.7.7B keeps status as lifecycle and level as nullable text pending later competency semantics.';
comment on column public.skills.archived_at is
  'Soft archive marker. App-facing delete should archive skills unless a later action explicitly hard-deletes.';
comment on column public.skills.level is
  'Optional user-facing skill level. No hard enum in R1.7.7B because level semantics are not final.';

create table public.skill_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  title text not null,
  note text,
  evidence_date date not null,
  weight integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_evidence_title_not_blank check (length(btrim(title)) > 0),
  constraint skill_evidence_source_type_valid check (
    source_type in ('task', 'project', 'goal', 'resource', 'manual_note')
  ),
  constraint skill_evidence_weight_range check (
    weight is null or (weight >= 1 and weight <= 5)
  )
);

comment on table public.skill_evidence is
  'User-owned evidence records linking a skill to a bounded source type or manual note.';
comment on column public.skill_evidence.source_id is
  'Polymorphic optional target id. R1.7.7B intentionally does not add source FKs; future actions must validate same-user ownership.';
comment on column public.skill_evidence.weight is
  'Optional bounded evidence weight from 1 to 5. It is not an AI confidence score.';

create index skills_user_status_idx
  on public.skills (user_id, status);

create index skills_user_area_idx
  on public.skills (user_id, area_id);

create index skills_user_created_idx
  on public.skills (user_id, created_at desc);

create index skill_evidence_user_skill_date_idx
  on public.skill_evidence (user_id, skill_id, evidence_date desc);

create index skill_evidence_user_source_idx
  on public.skill_evidence (user_id, source_type, source_id);

create index skill_evidence_user_date_idx
  on public.skill_evidence (user_id, evidence_date desc);

create trigger skills_set_updated_at
  before update on public.skills
  for each row
  execute function public.set_updated_at();

create trigger skill_evidence_set_updated_at
  before update on public.skill_evidence
  for each row
  execute function public.set_updated_at();

alter table public.skills enable row level security;
alter table public.skill_evidence enable row level security;

create policy "Users can select own skills"
on public.skills for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own skills"
on public.skills for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own skills"
on public.skills for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own skills"
on public.skills for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can select own skill_evidence"
on public.skill_evidence for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own skill_evidence"
on public.skill_evidence for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own skill_evidence"
on public.skill_evidence for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own skill_evidence"
on public.skill_evidence for delete
to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.skills to authenticated;
grant select, insert, update, delete on table public.skill_evidence to authenticated;
