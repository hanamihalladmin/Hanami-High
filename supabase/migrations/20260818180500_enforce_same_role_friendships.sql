create or replace function private.enforce_same_role_friendship()
returns trigger language plpgsql security definer set search_path=public as $$
declare requester_role public.character_role; addressee_role public.character_role;
begin
  select role into requester_role from public.characters where id=new.requester_character_id;
  select role into addressee_role from public.characters where id=new.addressee_character_id;
  if requester_role is null or addressee_role is null then raise exception 'Friendship character could not be resolved'; end if;
  if requester_role<>addressee_role then raise exception 'Students can only add students, and faculty can only add faculty'; end if;
  return new;
end;$$;

drop trigger if exists enforce_same_role_friendship on public.character_friendships;
create trigger enforce_same_role_friendship
before insert or update of requester_character_id,addressee_character_id on public.character_friendships
for each row execute function private.enforce_same_role_friendship();

create or replace function private.send_friend_request_internal(sender_character_id uuid,target_handle text)
returns uuid language plpgsql security definer set search_path=public as $$
declare target_id uuid; existing_id uuid; sender_role public.character_role; target_role public.character_role;
begin
 select c.role into sender_role from public.characters c where c.id=sender_character_id and c.owner_user_id=auth.uid();
 if sender_role is null then raise exception 'Sender character is not owned by this account'; end if;
 select c.id,c.role into target_id,target_role from public.characters c where c.handle=lower(trim(leading '@' from target_handle)) limit 1;
 if target_id is null then raise exception 'No Hanami character was found for that handle'; end if;
 if target_id=sender_character_id then raise exception 'A character cannot friend itself'; end if;
 if sender_role<>target_role then raise exception 'Students can only add students, and faculty can only add faculty'; end if;
 select f.id into existing_id from public.character_friendships f where (f.requester_character_id=sender_character_id and f.addressee_character_id=target_id) or (f.requester_character_id=target_id and f.addressee_character_id=sender_character_id) limit 1;
 if existing_id is not null then return existing_id; end if;
 insert into public.character_friendships(requester_character_id,addressee_character_id) values(sender_character_id,target_id) returning id into existing_id;
 return existing_id;
end;$$;

create or replace function private.respond_friend_request_internal(viewer_character_id uuid,friendship_id uuid,new_status public.friendship_status)
returns void language plpgsql security definer set search_path=public as $$
declare viewer_role public.character_role; other_role public.character_role;
begin
 if new_status not in ('accepted','declined') then raise exception 'Invalid friendship response'; end if;
 select c.role into viewer_role from public.characters c join public.character_friendships f on f.addressee_character_id=c.id where c.id=viewer_character_id and c.owner_user_id=auth.uid() and f.id=friendship_id and f.status='pending';
 if viewer_role is null then raise exception 'Friend request is not available to this character'; end if;
 select other.role into other_role from public.character_friendships f join public.characters other on other.id=f.requester_character_id where f.id=friendship_id;
 if viewer_role<>other_role then raise exception 'Students can only add students, and faculty can only add faculty'; end if;
 update public.character_friendships set status=new_status,updated_at=now() where id=friendship_id;
end;$$;
