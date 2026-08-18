create type public.school_event_status as enum ('draft','published','cancelled');
create type public.school_event_category as enum ('general','academic','campus','deadline','holiday');

create table public.school_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  description text not null default '' check (char_length(description) <= 5000),
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  category public.school_event_category not null default 'general',
  status public.school_event_status not null default 'draft',
  featured boolean not null default false,
  is_test_data boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index school_calendar_events_public_idx on public.school_calendar_events(status, starts_at);
create index school_calendar_events_featured_idx on public.school_calendar_events(featured, starts_at);

alter table public.school_calendar_events enable row level security;
grant select on public.school_calendar_events to anon, authenticated;
grant insert, update, delete on public.school_calendar_events to authenticated;

create policy "public reads published school events"
on public.school_calendar_events for select to anon, authenticated
using (status = 'published');

create policy "content editors read all school events"
on public.school_calendar_events for select to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'));

create policy "content editors create school events"
on public.school_calendar_events for insert to authenticated
with check (
  private.account_has_permission((select auth.uid()), 'content_editor')
  and created_by = (select auth.uid())
);

create policy "content editors update school events"
on public.school_calendar_events for update to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'))
with check (private.account_has_permission((select auth.uid()), 'content_editor'));

create policy "site admins delete school events"
on public.school_calendar_events for delete to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'));
