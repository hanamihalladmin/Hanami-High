create table if not exists public.roleplay_session_participation (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  status text not null default 'checked_in' check (status in ('checked_in','confirmed','excused','declined')),
  checked_in_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid,
  staff_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id,character_id)
);

alter table public.roleplay_session_participation enable row level security;
revoke all on public.roleplay_session_participation from anon;
grant select on public.roleplay_session_participation to authenticated;

create policy "characters read own roleplay participation"
on public.roleplay_session_participation for select to authenticated
using (private.user_owns_character(character_id) or public.school_staff_can_manage());

create policy "staff manage roleplay participation"
on public.roleplay_session_participation for all to authenticated
using (public.school_staff_can_manage())
with check (public.school_staff_can_manage());

create or replace function public.roleplay_check_in(viewer_character_id uuid, target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  session_row public.roleplay_sessions%rowtype;
  participation_row public.roleplay_session_participation%rowtype;
begin
  if not private.user_owns_character(viewer_character_id) then
    raise exception 'Character is not owned by the signed-in account.';
  end if;
  select * into session_row from public.roleplay_sessions where id=target_session_id;
  if session_row.id is null then raise exception 'Roleplay session not found.'; end if;
  if session_row.status not in ('active','closing') then raise exception 'This roleplay session is not accepting check-ins.'; end if;

  insert into public.roleplay_session_participation(session_id,character_id,status,checked_in_at,updated_at)
  values(target_session_id,viewer_character_id,'checked_in',now(),now())
  on conflict(session_id,character_id) do update
    set status=case when public.roleplay_session_participation.status='confirmed' then 'confirmed' else 'checked_in' end,
        checked_in_at=case when public.roleplay_session_participation.status='confirmed' then public.roleplay_session_participation.checked_in_at else now() end,
        updated_at=now()
  returning * into participation_row;

  return jsonb_build_object('id',participation_row.id,'status',participation_row.status,'checked_in_at',participation_row.checked_in_at);
end;
$$;

grant execute on function public.roleplay_check_in(uuid,uuid) to authenticated;

create or replace function public.roleplay_participation_summary(viewer_character_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare result jsonb;
begin
  if not private.user_owns_character(viewer_character_id) and not public.school_staff_can_manage() then
    raise exception 'Character access denied.';
  end if;
  select jsonb_build_object(
    'confirmed_count',(select count(*) from public.roleplay_session_participation p where p.character_id=viewer_character_id and p.status='confirmed'),
    'checkins',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'session_id',p.session_id,'status',p.status,'checked_in_at',p.checked_in_at,'confirmed_at',p.confirmed_at,'staff_note',p.staff_note
    ) order by p.checked_in_at desc) from public.roleplay_session_participation p where p.character_id=viewer_character_id),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

grant execute on function public.roleplay_participation_summary(uuid) to authenticated;

create or replace function public.staff_set_roleplay_participation(target_session_id uuid,target_character_id uuid,new_status text,new_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  row_out public.roleplay_session_participation%rowtype;
  confirmed_total integer;
  session_title text;
  happened date;
begin
  if not public.school_staff_can_manage() then raise exception 'Staff permission required.'; end if;
  if new_status not in ('checked_in','confirmed','excused','declined') then raise exception 'Invalid participation status.'; end if;
  if not exists(select 1 from public.roleplay_sessions where id=target_session_id) then raise exception 'Roleplay session not found.'; end if;
  if not exists(select 1 from public.characters where id=target_character_id) then raise exception 'Character not found.'; end if;

  insert into public.roleplay_session_participation(session_id,character_id,status,checked_in_at,confirmed_at,confirmed_by,staff_note,updated_at)
  values(target_session_id,target_character_id,new_status,now(),case when new_status='confirmed' then now() end,case when new_status='confirmed' then auth.uid() end,coalesce(new_note,''),now())
  on conflict(session_id,character_id) do update
  set status=excluded.status,
      confirmed_at=case when excluded.status='confirmed' then coalesce(public.roleplay_session_participation.confirmed_at,now()) else null end,
      confirmed_by=case when excluded.status='confirmed' then auth.uid() else null end,
      staff_note=excluded.staff_note,
      updated_at=now()
  returning * into row_out;

  if new_status='confirmed' then
    select count(*) into confirmed_total from public.roleplay_session_participation where character_id=target_character_id and status='confirmed';
    if confirmed_total=10 and not exists(
      select 1 from public.memory_scrapbook_entries where character_id=target_character_id and entry_type='milestone' and title='10 RP Sessions'
    ) then
      select title,
        make_date(2006,extract(month from coalesce(starts_at,now()) at time zone 'Asia/Tokyo')::int,extract(day from coalesce(starts_at,now()) at time zone 'Asia/Tokyo')::int)
      into session_title,happened from public.roleplay_sessions where id=target_session_id;
      insert into public.memory_scrapbook_entries(character_id,entry_type,title,description,source_entity_type,source_entity_id,happened_on,visibility)
      values(target_character_id,'milestone','10 RP Sessions','Reached ten confirmed Hanami High roleplay sessions. Tenth session: '||coalesce(session_title,'Roleplay session')||'.','roleplay_session',target_session_id,happened,'friends_only');
      insert into public.activity_feed_events(character_id,event_type,title,description,visibility,entity_type,entity_id)
      values(target_character_id,'milestone','10 RP Sessions','Reached ten confirmed Hanami High roleplay sessions.','friends_only','roleplay_session',target_session_id);
    end if;
  end if;

  return jsonb_build_object('id',row_out.id,'status',row_out.status,'confirmed_count',coalesce(confirmed_total,(select count(*) from public.roleplay_session_participation where character_id=target_character_id and status='confirmed')));
end;
$$;

grant execute on function public.staff_set_roleplay_participation(uuid,uuid,text,text) to authenticated;
