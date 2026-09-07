create table if not exists public.academic_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_type text not null check (room_type in ('class','homeroom')),
  section_id uuid references public.academic_sections(id) on delete cascade,
  homeroom_code text,
  channel text not null default 'general' check (channel in ('general','announcements','questions','lounge')),
  author_character_id uuid not null references public.characters(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint academic_room_messages_target_check check (
    (room_type = 'class' and section_id is not null and homeroom_code is null)
    or
    (room_type = 'homeroom' and section_id is null and homeroom_code is not null and btrim(homeroom_code) <> '')
  )
);

create index if not exists academic_room_messages_section_channel_created_idx
  on public.academic_room_messages(section_id, channel, created_at)
  where room_type = 'class' and deleted_at is null;
create index if not exists academic_room_messages_homeroom_channel_created_idx
  on public.academic_room_messages(homeroom_code, channel, created_at)
  where room_type = 'homeroom' and deleted_at is null;
create index if not exists academic_room_messages_author_created_idx
  on public.academic_room_messages(author_character_id, created_at desc);

create or replace function private.academic_account_is_homeroom_member(p_account_id uuid, p_homeroom_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts a
    join public.academic_enrollments e
      on e.student_character_id = a.active_character_id
     and e.status = 'active'
    join public.academic_sections s
      on s.id = e.section_id
     and s.is_active
    where a.id = p_account_id
      and s.homeroom_code = p_homeroom_code
  );
$$;

create or replace function private.academic_account_can_manage_homeroom(p_account_id uuid, p_homeroom_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.academic_sections s
    where s.is_active
      and s.homeroom_code = p_homeroom_code
      and private.academic_account_can_manage_section(p_account_id, s.id)
  );
$$;

revoke all on function private.academic_account_is_homeroom_member(uuid, text) from public, anon;
revoke all on function private.academic_account_can_manage_homeroom(uuid, text) from public, anon;
grant execute on function private.academic_account_is_homeroom_member(uuid, text) to authenticated;
grant execute on function private.academic_account_can_manage_homeroom(uuid, text) to authenticated;

create or replace function public.academic_is_homeroom_member(p_homeroom_code text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.academic_account_is_homeroom_member((select auth.uid()), p_homeroom_code);
$$;

create or replace function public.academic_can_manage_homeroom(p_homeroom_code text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.academic_account_can_manage_homeroom((select auth.uid()), p_homeroom_code);
$$;

grant execute on function public.academic_is_homeroom_member(text) to authenticated;
grant execute on function public.academic_can_manage_homeroom(text) to authenticated;

alter table public.academic_room_messages enable row level security;

drop policy if exists academic_room_messages_select on public.academic_room_messages;
create policy academic_room_messages_select
on public.academic_room_messages
for select
to authenticated
using (
  deleted_at is null
  and (
    (room_type = 'class' and section_id is not null and (public.academic_is_enrolled(section_id) or public.academic_can_manage_section(section_id)))
    or
    (room_type = 'homeroom' and homeroom_code is not null and (public.academic_is_homeroom_member(homeroom_code) or public.academic_can_manage_homeroom(homeroom_code)))
  )
);

drop policy if exists academic_room_messages_insert on public.academic_room_messages;
create policy academic_room_messages_insert
on public.academic_room_messages
for insert
to authenticated
with check (
  author_character_id = (select a.active_character_id from public.accounts a where a.id = (select auth.uid()))
  and deleted_at is null
  and (
    (
      room_type = 'class' and section_id is not null
      and (public.academic_is_enrolled(section_id) or public.academic_can_manage_section(section_id))
      and (channel <> 'announcements' or public.academic_can_manage_section(section_id))
    )
    or
    (
      room_type = 'homeroom' and homeroom_code is not null
      and (public.academic_is_homeroom_member(homeroom_code) or public.academic_can_manage_homeroom(homeroom_code))
      and (channel <> 'announcements' or public.academic_can_manage_homeroom(homeroom_code))
    )
  )
);

drop policy if exists academic_room_messages_update on public.academic_room_messages;
create policy academic_room_messages_update
on public.academic_room_messages
for update
to authenticated
using (
  author_character_id = (select a.active_character_id from public.accounts a where a.id = (select auth.uid()))
  or (room_type = 'class' and section_id is not null and public.academic_can_manage_section(section_id))
  or (room_type = 'homeroom' and homeroom_code is not null and public.academic_can_manage_homeroom(homeroom_code))
)
with check (
  author_character_id = (select a.active_character_id from public.accounts a where a.id = (select auth.uid()))
  or (room_type = 'class' and section_id is not null and public.academic_can_manage_section(section_id))
  or (room_type = 'homeroom' and homeroom_code is not null and public.academic_can_manage_homeroom(homeroom_code))
);

drop policy if exists academic_room_messages_delete on public.academic_room_messages;
create policy academic_room_messages_delete
on public.academic_room_messages
for delete
to authenticated
using (
  author_character_id = (select a.active_character_id from public.accounts a where a.id = (select auth.uid()))
  or (room_type = 'class' and section_id is not null and public.academic_can_manage_section(section_id))
  or (room_type = 'homeroom' and homeroom_code is not null and public.academic_can_manage_homeroom(homeroom_code))
);

revoke all on public.academic_room_messages from anon;
grant select, insert, update, delete on public.academic_room_messages to authenticated;

comment on table public.academic_room_messages is 'Discord-like communication rooms for enrolled class sections and homerooms. Official announcements are restricted to authorized academic managers.';