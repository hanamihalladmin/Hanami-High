create table public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  profile_character_id uuid not null references public.characters(id) on delete cascade,
  author_character_id uuid not null references public.characters(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 1500),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (profile_character_id <> author_character_id)
);

create index guestbook_entries_profile_created_idx
  on public.guestbook_entries(profile_character_id, created_at desc);
create index guestbook_entries_author_created_idx
  on public.guestbook_entries(author_character_id, created_at desc);

alter table public.guestbook_entries enable row level security;

create policy guestbook_entries_select_visible
on public.guestbook_entries
for select
to authenticated
using (
  exists (
    select 1 from public.characters target
    where target.id = guestbook_entries.profile_character_id
      and (
        target.account_id = (select auth.uid())
        or guestbook_entries.author_character_id = (
          select a.active_character_id from public.accounts a where a.id = (select auth.uid())
        )
        or (
          guestbook_entries.status = 'visible'
          and target.character_state = 'active'
          and exists (
            select 1 from public.published_character_profiles p
            where p.character_id = target.id
              and p.guestbook_visibility <> 'disabled'
              and (
                p.profile_visibility = 'hanami'
                or (
                  p.profile_visibility = 'friends'
                  and exists (
                    select 1
                    from public.friendships f
                    join public.accounts a on a.id = (select auth.uid())
                    where f.status = 'accepted'
                      and a.active_character_id is not null
                      and (
                        (f.requester_character_id = target.id and f.addressee_character_id = a.active_character_id)
                        or (f.addressee_character_id = target.id and f.requester_character_id = a.active_character_id)
                      )
                  )
                )
              )
              and (
                p.guestbook_visibility = 'hanami'
                or (
                  p.guestbook_visibility = 'friends'
                  and exists (
                    select 1
                    from public.friendships f
                    join public.accounts a on a.id = (select auth.uid())
                    where f.status = 'accepted'
                      and a.active_character_id is not null
                      and (
                        (f.requester_character_id = target.id and f.addressee_character_id = a.active_character_id)
                        or (f.addressee_character_id = target.id and f.requester_character_id = a.active_character_id)
                      )
                  )
                )
              )
          )
        )
      )
  )
);

create policy guestbook_entries_insert_active_character
on public.guestbook_entries
for insert
to authenticated
with check (
  status = 'visible'
  and author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
  and profile_character_id <> author_character_id
  and exists (
    select 1
    from public.characters target
    join public.published_character_profiles p on p.character_id = target.id
    where target.id = guestbook_entries.profile_character_id
      and target.character_state = 'active'
      and p.guestbook_visibility <> 'disabled'
      and (
        p.profile_visibility = 'hanami'
        or (
          p.profile_visibility = 'friends'
          and exists (
            select 1
            from public.friendships f
            join public.accounts a on a.id = (select auth.uid())
            where f.status = 'accepted'
              and a.active_character_id is not null
              and (
                (f.requester_character_id = target.id and f.addressee_character_id = a.active_character_id)
                or (f.addressee_character_id = target.id and f.requester_character_id = a.active_character_id)
              )
          )
        )
      )
      and (
        p.guestbook_visibility = 'hanami'
        or (
          p.guestbook_visibility = 'friends'
          and exists (
            select 1
            from public.friendships f
            join public.accounts a on a.id = (select auth.uid())
            where f.status = 'accepted'
              and a.active_character_id is not null
              and (
                (f.requester_character_id = target.id and f.addressee_character_id = a.active_character_id)
                or (f.addressee_character_id = target.id and f.requester_character_id = a.active_character_id)
              )
          )
        )
      )
  )
);

create policy guestbook_entries_update_profile_owner
on public.guestbook_entries
for update
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = guestbook_entries.profile_character_id
      and c.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = guestbook_entries.profile_character_id
      and c.account_id = (select auth.uid())
  )
);

create policy guestbook_entries_delete_author_or_profile_owner
on public.guestbook_entries
for delete
to authenticated
using (
  author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
  or exists (
    select 1 from public.characters c
    where c.id = guestbook_entries.profile_character_id
      and c.account_id = (select auth.uid())
  )
);

grant select, insert, delete on public.guestbook_entries to authenticated;
grant update(status) on public.guestbook_entries to authenticated;

create or replace function private.prepare_guestbook_entry()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_guestbook_entry() from public, anon, authenticated;

create trigger guestbook_entries_prepare
  before update on public.guestbook_entries
  for each row execute function private.prepare_guestbook_entry();

create or replace function private.notify_guestbook_entry()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_target_account_id uuid;
  v_author_name text;
begin
  select c.account_id
  into v_target_account_id
  from public.characters c
  where c.id = new.profile_character_id;

  select coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Hanami Student'
  )
  into v_author_name
  from public.characters c
  where c.id = new.author_character_id;

  insert into public.notifications (
    account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
  ) values (
    v_target_account_id,
    new.profile_character_id,
    new.author_character_id,
    'guestbook_entry',
    'New guestbook message',
    v_author_name || ' signed your guestbook.',
    'profile',
    'guestbook',
    jsonb_build_object('entry_id', new.id, 'profile_character_id', new.profile_character_id)
  );

  return new;
end;
$$;

revoke all on function private.notify_guestbook_entry() from public, anon, authenticated;

create trigger guestbook_entries_notify
  after insert on public.guestbook_entries
  for each row execute function private.notify_guestbook_entry();
