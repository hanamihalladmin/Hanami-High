create type public.school_operating_status as enum ('open','delayed','closed','holiday','emergency');

create table public.school_status_config (
  key text primary key default 'main' check (key = 'main'),
  status public.school_operating_status not null default 'open',
  message text not null default 'School is operating on the normal schedule.' check (char_length(message) <= 500),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.school_status_config(key,status,message)
values ('main','open','School is operating on the normal schedule.')
on conflict (key) do nothing;

alter table public.school_status_config enable row level security;
grant select on public.school_status_config to anon, authenticated;
grant update on public.school_status_config to authenticated;

create policy "public reads school status"
on public.school_status_config for select to anon, authenticated
using (key = 'main');

create policy "content editors update school status"
on public.school_status_config for update to authenticated
using (
  key = 'main'
  and private.account_has_permission((select auth.uid()), 'content_editor')
)
with check (
  key = 'main'
  and private.account_has_permission((select auth.uid()), 'content_editor')
);
