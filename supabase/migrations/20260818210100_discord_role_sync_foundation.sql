create table if not exists public.account_discord_role_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discord_user_id text not null,
  role_ids text[] not null default '{}',
  synced_at timestamptz not null default now(),
  sync_status text not null default 'pending' check (sync_status in ('pending','synced','not_member','error')),
  last_error text
);

alter table public.account_discord_role_sync enable row level security;
revoke all on public.account_discord_role_sync from anon;
revoke insert, update, delete on public.account_discord_role_sync from authenticated;
grant select on public.account_discord_role_sync to authenticated;

drop policy if exists "users read own discord role sync" on public.account_discord_role_sync;
create policy "users read own discord role sync"
on public.account_discord_role_sync for select to authenticated
using (user_id = auth.uid());

create or replace function private.current_discord_role_sync_internal()
returns table(student boolean, faculty boolean, administrator boolean, owner boolean, synced_at timestamptz, sync_status text)
language sql stable security definer set search_path = public, private
as $$
  with cfg as (
    select
      max(value) filter (where key='student_discord_role_id') as student_role,
      max(value) filter (where key='faculty_discord_role_id') as faculty_role,
      max(value) filter (where key='administrator_discord_role_id_1') as admin_role_1,
      max(value) filter (where key='administrator_discord_role_id_2') as admin_role_2
    from public.portal_authorization_config
  ), synced as (
    select s.role_ids, s.synced_at, s.sync_status
    from public.account_discord_role_sync s
    where s.user_id = auth.uid()
  )
  select
    coalesce((select student_role = any(role_ids) from cfg, synced), false),
    coalesce((select faculty_role = any(role_ids) from cfg, synced), false),
    private.is_owner_discord_user() or coalesce((select admin_role_1 = any(role_ids) or admin_role_2 = any(role_ids) from cfg, synced), false),
    private.is_owner_discord_user(),
    (select synced_at from synced),
    coalesce((select sync_status from synced),'pending');
$$;

create or replace function public.current_discord_role_sync()
returns table(student boolean, faculty boolean, administrator boolean, owner boolean, synced_at timestamptz, sync_status text)
language sql stable security invoker set search_path = private
as $$ select * from private.current_discord_role_sync_internal(); $$;

revoke all on function private.current_discord_role_sync_internal() from public, anon;
grant execute on function private.current_discord_role_sync_internal() to authenticated;
grant execute on function public.current_discord_role_sync() to authenticated;
