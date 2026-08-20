create or replace function private.visible_profile_social_internal(viewer_character_id uuid, target_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  target_id uuid;
  allowed boolean := false;
  settings_row public.profile_interaction_settings%rowtype;
  presence_row public.character_presence%rowtype;
  total bigint := 0;
  top_friends jsonb := '[]'::jsonb;
  badges jsonb := '[]'::jsonb;
begin
  if not exists(select 1 from public.characters v where v.id=viewer_character_id and v.owner_user_id=auth.uid()) then return null; end if;
  select t.id,(t.owner_user_id=auth.uid() or t.visibility='public' or (t.visibility='friends_only' and private.characters_are_friends(viewer_character_id,t.id)))
    into target_id,allowed from public.characters t where t.handle=lower(trim(leading '@' from target_handle)) limit 1;
  if target_id is null or not allowed then return null; end if;
  select * into settings_row from public.profile_interaction_settings where character_id=target_id;
  select * into presence_row from public.character_presence where character_id=target_id;
  select coalesce(total_visits,0) into total from public.profile_visit_counters where character_id=target_id;
  select coalesce(jsonb_agg(jsonb_build_object('character_id',f.id,'display_name',f.display_name,'handle',f.handle,'role',f.role,'position',tf.position) order by tf.position),'[]'::jsonb)
    into top_friends from public.profile_top_friends tf join public.characters f on f.id=tf.friend_character_id where tf.character_id=target_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'badge_type',b.badge_type,'icon_text',b.icon_text,'description',b.description) order by b.awarded_at desc),'[]'::jsonb)
    into badges from public.character_profile_badges b where b.character_id=target_id and b.visible=true;
  return jsonb_build_object('character_id',target_id,'show_status',coalesce(settings_row.show_status,true),'status_kind',case when coalesce(settings_row.show_status,true) then coalesce(presence_row.status_kind,'offline') else null end,'status_message',case when coalesce(settings_row.show_status,true) then coalesce(presence_row.status_message,'') else null end,'show_visit_counter',coalesce(settings_row.show_visit_counter,true),'total_visits',case when coalesce(settings_row.show_visit_counter,true) then total else null end,'top_friends',top_friends,'badges',badges);
end;
$$;
revoke all on function private.visible_profile_social_internal(uuid,text) from public;

create or replace function public.lookup_visible_profile_social(viewer_character_id uuid, target_handle text)
returns jsonb language sql stable security invoker set search_path=public,private
as $$ select private.visible_profile_social_internal(viewer_character_id,target_handle); $$;
grant execute on function public.lookup_visible_profile_social(uuid,text) to authenticated;

create or replace function public.record_profile_visit(target_character_id uuid, viewer_character_id uuid default null)
returns bigint
language plpgsql
security definer
set search_path=public,private
as $$
declare total bigint:=0; named boolean:=false; target_owner uuid; target_visibility public.profile_visibility;
begin
 if auth.uid() is null or viewer_character_id is null then raise exception 'Authenticated viewer character required'; end if;
 if not exists(select 1 from public.characters v where v.id=viewer_character_id and v.owner_user_id=auth.uid()) then raise exception 'Viewer character is not owned by current account'; end if;
 select owner_user_id,visibility into target_owner,target_visibility from public.characters where id=target_character_id;
 if target_owner is null then raise exception 'Profile not found'; end if;
 if not (target_owner=auth.uid() or target_visibility='public' or (target_visibility='friends_only' and private.characters_are_friends(viewer_character_id,target_character_id))) then raise exception 'Profile is not visible to this character'; end if;
 if viewer_character_id=target_character_id then select total_visits into total from public.profile_visit_counters where character_id=target_character_id; return coalesce(total,0); end if;
 insert into public.profile_visit_counters(character_id,total_visits) values(target_character_id,1)
 on conflict(character_id) do update set total_visits=public.profile_visit_counters.total_visits+1,updated_at=now() returning total_visits into total;
 select coalesce(named_profile_visitors,false) into named from public.profile_interaction_settings where character_id=target_character_id;
 if named then insert into public.profile_named_visits(profile_character_id,viewer_character_id) values(target_character_id,viewer_character_id); end if;
 return total;
end;
$$;
revoke all on function public.record_profile_visit(uuid,uuid) from public;
grant execute on function public.record_profile_visit(uuid,uuid) to authenticated;
