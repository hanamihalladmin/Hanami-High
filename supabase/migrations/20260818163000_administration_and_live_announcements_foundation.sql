create type public.hanami_account_permission as enum ('site_admin','content_editor','moderator');
create type public.announcement_status as enum ('draft','published','archived');
create type public.announcement_category as enum ('general','event','urgent');

create table public.account_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission public.hanami_account_permission not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, permission)
);

alter table public.account_permissions enable row level security;
revoke all on public.account_permissions from anon, authenticated;

create or replace function private.account_has_permission(target_user_id uuid, required_permission public.hanami_account_permission)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.account_permissions ap
    where ap.user_id = target_user_id
      and (ap.permission = required_permission or ap.permission = 'site_admin')
  );
$$;
revoke all on function private.account_has_permission(uuid, public.hanami_account_permission) from public, anon, authenticated;

create or replace function public.current_account_admin_access()
returns table(site_admin boolean, content_editor boolean, moderator boolean)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    private.account_has_permission(auth.uid(), 'site_admin'),
    private.account_has_permission(auth.uid(), 'content_editor'),
    private.account_has_permission(auth.uid(), 'moderator');
$$;
revoke all on function public.current_account_admin_access() from public, anon;
grant execute on function public.current_account_admin_access() to authenticated;

create table public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  category public.announcement_category not null default 'general',
  status public.announcement_status not null default 'draft',
  featured boolean not null default false,
  is_test_data boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or published_at is null or expires_at > published_at)
);

create index site_announcements_public_idx on public.site_announcements(status, published_at desc);
create index site_announcements_featured_idx on public.site_announcements(featured, published_at desc);

alter table public.site_announcements enable row level security;
grant select on public.site_announcements to anon, authenticated;
grant insert, update, delete on public.site_announcements to authenticated;

create policy "public reads published announcements"
on public.site_announcements for select to anon, authenticated
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
  and (expires_at is null or expires_at > now())
);

create policy "content editors read all announcements"
on public.site_announcements for select to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'));

create policy "content editors create announcements"
on public.site_announcements for insert to authenticated
with check (
  private.account_has_permission((select auth.uid()), 'content_editor')
  and created_by = (select auth.uid())
);

create policy "content editors update announcements"
on public.site_announcements for update to authenticated
using (private.account_has_permission((select auth.uid()), 'content_editor'))
with check (private.account_has_permission((select auth.uid()), 'content_editor'));

create policy "site admins delete announcements"
on public.site_announcements for delete to authenticated
using (private.account_has_permission((select auth.uid()), 'site_admin'));
