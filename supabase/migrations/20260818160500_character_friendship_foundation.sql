create type public.friendship_status as enum ('pending','accepted','declined');

create table public.character_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_character_id uuid not null references public.characters(id) on delete cascade,
  addressee_character_id uuid not null references public.characters(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_character_id <> addressee_character_id),
  unique (requester_character_id, addressee_character_id)
);
create index character_friendships_requester_idx on public.character_friendships(requester_character_id,status);
create index character_friendships_addressee_idx on public.character_friendships(addressee_character_id,status);
alter table public.character_friendships enable row level security;
grant select on public.character_friendships to authenticated;
revoke insert,update,delete on public.character_friendships from authenticated;

create policy "members read own character friendships"
on public.character_friendships for select to authenticated
using (
 exists(select 1 from public.characters c where c.id=character_friendships.requester_character_id and c.owner_user_id=(select auth.uid()))
 or exists(select 1 from public.characters c where c.id=character_friendships.addressee_character_id and c.owner_user_id=(select auth.uid()))
);

create or replace function private.characters_are_friends(a uuid,b uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.character_friendships f where f.status='accepted' and ((f.requester_character_id=a and f.addressee_character_id=b) or (f.requester_character_id=b and f.addressee_character_id=a)));
$$;
revoke all on function private.characters_are_friends(uuid,uuid) from public,anon;
grant execute on function private.characters_are_friends(uuid,uuid) to authenticated;

create or replace function private.send_friend_request_internal(sender_character_id uuid,target_handle text)
returns uuid language plpgsql security definer set search_path=public as $$
declare target_id uuid; existing_id uuid;
begin
 if not exists(select 1 from public.characters c where c.id=sender_character_id and c.owner_user_id=auth.uid()) then raise exception 'Sender character is not owned by this account'; end if;
 select c.id into target_id from public.characters c where c.handle=lower(trim(leading '@' from target_handle)) limit 1;
 if target_id is null then raise exception 'No Hanami character was found for that handle'; end if;
 if target_id=sender_character_id then raise exception 'A character cannot friend itself'; end if;
 select f.id into existing_id from public.character_friendships f where (f.requester_character_id=sender_character_id and f.addressee_character_id=target_id) or (f.requester_character_id=target_id and f.addressee_character_id=sender_character_id) limit 1;
 if existing_id is not null then return existing_id; end if;
 insert into public.character_friendships(requester_character_id,addressee_character_id) values(sender_character_id,target_id) returning id into existing_id;
 return existing_id;
end;$$;
revoke all on function private.send_friend_request_internal(uuid,text) from public,anon;
grant execute on function private.send_friend_request_internal(uuid,text) to authenticated;

create or replace function public.send_friend_request(sender_character_id uuid,target_handle text)
returns uuid language sql security invoker set search_path=public,private as $$ select private.send_friend_request_internal(sender_character_id,target_handle); $$;
revoke all on function public.send_friend_request(uuid,text) from public,anon;
grant execute on function public.send_friend_request(uuid,text) to authenticated;

create or replace function private.respond_friend_request_internal(viewer_character_id uuid,friendship_id uuid,new_status public.friendship_status)
returns void language plpgsql security definer set search_path=public as $$
begin
 if new_status not in ('accepted','declined') then raise exception 'Invalid friendship response'; end if;
 if not exists(select 1 from public.characters c join public.character_friendships f on f.addressee_character_id=c.id where c.id=viewer_character_id and c.owner_user_id=auth.uid() and f.id=friendship_id and f.status='pending') then raise exception 'Friend request is not available to this character'; end if;
 update public.character_friendships set status=new_status,updated_at=now() where id=friendship_id;
end;$$;
revoke all on function private.respond_friend_request_internal(uuid,uuid,public.friendship_status) from public,anon;
grant execute on function private.respond_friend_request_internal(uuid,uuid,public.friendship_status) to authenticated;

create or replace function public.respond_friend_request(viewer_character_id uuid,friendship_id uuid,new_status public.friendship_status)
returns void language sql security invoker set search_path=public,private as $$ select private.respond_friend_request_internal(viewer_character_id,friendship_id,new_status); $$;
revoke all on function public.respond_friend_request(uuid,uuid,public.friendship_status) from public,anon;
grant execute on function public.respond_friend_request(uuid,uuid,public.friendship_status) to authenticated;

create or replace function private.remove_friendship_internal(viewer_character_id uuid,friendship_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.character_friendships f join public.characters c on c.id=viewer_character_id and c.owner_user_id=auth.uid() where f.id=friendship_id and viewer_character_id in (f.requester_character_id,f.addressee_character_id)) then raise exception 'Friendship is not available to this character'; end if;
 delete from public.character_friendships where id=friendship_id;
end;$$;
revoke all on function private.remove_friendship_internal(uuid,uuid) from public,anon;
grant execute on function private.remove_friendship_internal(uuid,uuid) to authenticated;

create or replace function public.remove_friendship(viewer_character_id uuid,friendship_id uuid)
returns void language sql security invoker set search_path=public,private as $$ select private.remove_friendship_internal(viewer_character_id,friendship_id); $$;
revoke all on function public.remove_friendship(uuid,uuid) from public,anon;
grant execute on function public.remove_friendship(uuid,uuid) to authenticated;

create or replace function private.character_friendship_directory_internal(viewer_character_id uuid)
returns table(friendship_id uuid,direction text,status public.friendship_status,other_character_id uuid,display_name text,handle text,role public.character_role)
language sql stable security definer set search_path=public as $$
 select f.id,case when f.requester_character_id=viewer_character_id then 'outgoing' else 'incoming' end,f.status,other.id,other.display_name,other.handle,other.role
 from public.character_friendships f
 join public.characters owner on owner.id=viewer_character_id and owner.owner_user_id=auth.uid()
 join public.characters other on other.id=case when f.requester_character_id=viewer_character_id then f.addressee_character_id else f.requester_character_id end
 where viewer_character_id in (f.requester_character_id,f.addressee_character_id)
 order by f.updated_at desc;
$$;
revoke all on function private.character_friendship_directory_internal(uuid) from public,anon;
grant execute on function private.character_friendship_directory_internal(uuid) to authenticated;

create or replace function public.character_friendship_directory(viewer_character_id uuid)
returns table(friendship_id uuid,direction text,status public.friendship_status,other_character_id uuid,display_name text,handle text,role public.character_role)
language sql stable security invoker set search_path=public,private as $$ select * from private.character_friendship_directory_internal(viewer_character_id); $$;
revoke all on function public.character_friendship_directory(uuid) from public,anon;
grant execute on function public.character_friendship_directory(uuid) to authenticated;

create or replace function private.visible_character_profile_internal(viewer_character_id uuid,target_handle text)
returns table(character_id uuid,display_name text,handle text,role public.character_role,visibility public.profile_visibility,headline text,bio text,status_message text)
language sql stable security definer set search_path=public,private as $$
 select target.id,target.display_name,target.handle,target.role,target.visibility,coalesce(profile.headline,''),coalesce(profile.bio,''),coalesce(profile.status_message,'')
 from public.characters viewer join public.characters target on target.handle=lower(trim(leading '@' from target_handle)) left join public.character_profiles profile on profile.character_id=target.id
 where viewer.id=viewer_character_id and viewer.owner_user_id=auth.uid()
 and (target.owner_user_id=auth.uid() or target.visibility='public' or (target.visibility='friends_only' and private.characters_are_friends(viewer.id,target.id))) limit 1;
$$;

create or replace function private.visible_profile_design_internal(viewer_character_id uuid,target_handle text)
returns table(canvas jsonb,widgets jsonb)
language sql stable security definer set search_path=public,private as $$
 select jsonb_build_object('canvas_width',coalesce(pc.canvas_width,960),'canvas_height',coalesce(pc.canvas_height,1200),'background',coalesce(pc.background,'#fffafc'),'background_image_url',pc.background_image_url,'grid_enabled',coalesce(pc.grid_enabled,false),'snap_enabled',coalesce(pc.snap_enabled,false)),
 coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'widget_type',w.widget_type,'x',w.x,'y',w.y,'width',w.width,'height',w.height,'z_index',w.z_index,'rotation',w.rotation,'opacity',w.opacity,'content',w.content,'style',w.style,'locked',w.locked) order by w.z_index,w.id) from public.character_profile_widgets w where w.character_id=target.id),'[]'::jsonb)
 from public.characters viewer join public.characters target on target.handle=lower(trim(leading '@' from target_handle)) left join public.character_profile_canvases pc on pc.character_id=target.id
 where viewer.id=viewer_character_id and viewer.owner_user_id=auth.uid()
 and (target.owner_user_id=auth.uid() or target.visibility='public' or (target.visibility='friends_only' and private.characters_are_friends(viewer.id,target.id))) limit 1;
$$;
