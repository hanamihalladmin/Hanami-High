create type public.campus_opportunity_type as enum ('job','volunteer','internship','student_leadership');
create type public.campus_opportunity_status as enum ('draft','published','closed');
create type public.campus_application_status as enum ('submitted','under_review','accepted','declined','withdrawn');

create table public.campus_opportunities (
  id uuid primary key default gen_random_uuid(),
  opportunity_type public.campus_opportunity_type not null,
  title text not null check (char_length(title) between 2 and 120),
  department text not null check (char_length(department) between 2 and 120),
  description text not null check (char_length(description) between 1 and 5000),
  location text,
  status public.campus_opportunity_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  is_test_data boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create index campus_opportunities_public_idx on public.campus_opportunities(status, closes_at, created_at desc);

alter table public.campus_opportunities enable row level security;
grant select on public.campus_opportunities to anon, authenticated;
grant insert, update, delete on public.campus_opportunities to authenticated;

create policy "public reads published campus opportunities"
on public.campus_opportunities for select to anon, authenticated
using (
  status='published'
  and (opens_at is null or opens_at <= now())
  and (closes_at is null or closes_at > now())
);

create policy "content editors read all campus opportunities"
on public.campus_opportunities for select to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'));

create policy "content editors create campus opportunities"
on public.campus_opportunities for insert to authenticated
with check (
  private.account_has_permission((select auth.uid()), 'content_editor')
  and created_by=(select auth.uid())
);

create policy "content editors update campus opportunities"
on public.campus_opportunities for update to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'))
with check (private.account_has_permission((select auth.uid()), 'content_editor'));

create policy "site admins delete campus opportunities"
on public.campus_opportunities for delete to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'));

create table public.campus_opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.campus_opportunities(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  statement text not null check (char_length(statement) between 1 and 4000),
  status public.campus_application_status not null default 'submitted',
  staff_response text check (staff_response is null or char_length(staff_response) <= 4000),
  reviewed_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(opportunity_id, character_id)
);

create index campus_opportunity_applications_character_idx on public.campus_opportunity_applications(character_id, submitted_at desc);
create index campus_opportunity_applications_status_idx on public.campus_opportunity_applications(status, submitted_at asc);

alter table public.campus_opportunity_applications enable row level security;
revoke all on public.campus_opportunity_applications from anon;
grant select, insert, update on public.campus_opportunity_applications to authenticated;

create policy "students read own campus applications"
on public.campus_opportunity_applications for select to authenticated
using (
  exists(
    select 1 from public.characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid()) and c.role='student'
  )
);

create policy "content editors read campus applications"
on public.campus_opportunity_applications for select to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'));

create policy "students submit own campus applications"
on public.campus_opportunity_applications for insert to authenticated
with check (
  status='submitted'
  and staff_response is null
  and reviewed_by is null
  and reviewed_at is null
  and exists(
    select 1 from public.characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid()) and c.role='student'
  )
  and exists(
    select 1 from public.campus_opportunities o
    where o.id=opportunity_id
      and o.status='published'
      and (o.opens_at is null or o.opens_at <= now())
      and (o.closes_at is null or o.closes_at > now())
  )
);

create policy "students withdraw pending campus applications"
on public.campus_opportunity_applications for update to authenticated
using (
  status='submitted'
  and exists(
    select 1 from public.characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid()) and c.role='student'
  )
)
with check (
  status='withdrawn'
  and staff_response is null
  and reviewed_by is null
  and reviewed_at is null
  and exists(
    select 1 from public.characters c
    where c.id=character_id and c.owner_user_id=(select auth.uid()) and c.role='student'
  )
);

create policy "content editors review campus applications"
on public.campus_opportunity_applications for update to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'))
with check (private.account_has_permission((select auth.uid()), 'content_editor'));
