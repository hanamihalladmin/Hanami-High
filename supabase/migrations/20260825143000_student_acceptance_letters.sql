create table if not exists public.student_acceptance_letters (
  character_id uuid primary key references public.characters(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_acceptance_letters enable row level security;

create policy "students read own acceptance letter"
on public.student_acceptance_letters for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
);

create policy "students create own acceptance letter"
on public.student_acceptance_letters for insert to authenticated
with check (
  exists (
    select 1 from public.characters c
    where c.id = character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
);

create policy "students update own acceptance letter"
on public.student_acceptance_letters for update to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
);

grant select, insert, update on table public.student_acceptance_letters to authenticated;
