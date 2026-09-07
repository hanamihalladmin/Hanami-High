create table if not exists private.legacy_v1_profiles (
  legacy_character_id uuid primary key references private.legacy_v1_characters(legacy_character_id) on delete cascade,
  headline text,
  bio text,
  status_message text,
  legacy_updated_at timestamptz
);
revoke all on private.legacy_v1_profiles from public, anon, authenticated;

create or replace function private.apply_legacy_v1_profile(p_legacy_character_id uuid, p_character_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_visibility text;
begin
  select case c.visibility when 'private' then 'private' when 'friends_only' then 'friends' else 'hanami' end
  into v_visibility
  from private.legacy_v1_characters c where c.legacy_character_id=p_legacy_character_id;

  update public.character_profiles p
  set bio = case when p.bio is null or btrim(p.bio)='' then lp.bio else p.bio end,
      custom_status = case when p.custom_status is null or btrim(p.custom_status)='' then coalesce(nullif(btrim(lp.status_message),''),nullif(btrim(lp.headline),'')) else p.custom_status end,
      profile_visibility = case when p.profile_visibility='hanami' then coalesce(v_visibility,'hanami') else p.profile_visibility end,
      updated_at = now()
  from private.legacy_v1_profiles lp
  where lp.legacy_character_id=p_legacy_character_id and p.character_id=p_character_id;
end;
$$;
revoke all on function private.apply_legacy_v1_profile(uuid,uuid) from public,anon,authenticated;

create or replace function private.claim_legacy_v1_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_discord_id text;
  v_legacy_user_id uuid;
  r record;
  v_character_id uuid;
  v_new_handle text;
begin
  select a.discord_user_id into v_discord_id from public.accounts a where a.id=p_account_id;
  if v_discord_id is null or btrim(v_discord_id)='' then return; end if;
  select m.legacy_user_id into v_legacy_user_id from private.legacy_v1_members m where m.discord_user_id=v_discord_id;
  if v_legacy_user_id is null then return; end if;

  for r in select * from private.legacy_v1_characters c where c.legacy_owner_user_id=v_legacy_user_id order by c.slot_no loop
    select c.id into v_character_id from public.characters c where c.account_id=p_account_id and c.slot_no=r.slot_no;
    if v_character_id is null then
      v_new_handle:=null;
      if r.handle is not null and btrim(r.handle)<>'' and not exists(select 1 from public.characters c where c.handle=r.handle) then v_new_handle:=r.handle; end if;
      insert into public.characters(account_id,slot_no,handle,display_name,character_kind,character_state,school_role,created_at,updated_at)
      values(p_account_id,r.slot_no,v_new_handle,r.display_name,
        case when r.role='faculty' then 'faculty' else 'student' end,
        'active',case when r.role='faculty' then 'faculty' else 'student' end,
        coalesce(r.legacy_created_at,now()),now()) returning id into v_character_id;
    else
      update public.characters c
      set handle=case when c.handle is null and r.handle is not null and btrim(r.handle)<>'' and not exists(select 1 from public.characters other where other.handle=r.handle and other.id<>c.id) then r.handle else c.handle end,
          updated_at=now()
      where c.id=v_character_id;
    end if;

    update private.legacy_v1_characters set claimed_character_id=v_character_id,claimed_at=now() where legacy_character_id=r.legacy_character_id;
    perform private.apply_legacy_v1_memberships(r.legacy_character_id,v_character_id);
    perform private.apply_legacy_v1_profile(r.legacy_character_id,v_character_id);
  end loop;

  if (select active_character_id from public.accounts where id=p_account_id) is null then
    update public.accounts a set active_character_id=(select c.id from public.characters c where c.account_id=p_account_id and c.character_state='active' order by c.slot_no limit 1),updated_at=now() where a.id=p_account_id;
  end if;
end;
$$;
revoke all on function private.claim_legacy_v1_account(uuid) from public,anon,authenticated;
