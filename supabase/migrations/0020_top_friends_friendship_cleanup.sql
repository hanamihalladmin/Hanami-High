create or replace function private.cleanup_top_friends_for_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester uuid;
  v_addressee uuid;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'accepted' then
      return old;
    end if;
    v_requester := old.requester_character_id;
    v_addressee := old.addressee_character_id;
  else
    if old.status <> 'accepted' or new.status = 'accepted' then
      return new;
    end if;
    v_requester := new.requester_character_id;
    v_addressee := new.addressee_character_id;
  end if;

  delete from public.top_friends
  where (character_id = v_requester and friend_character_id = v_addressee)
     or (character_id = v_addressee and friend_character_id = v_requester);

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.cleanup_top_friends_for_friendship() from public, anon, authenticated;

create trigger friendships_cleanup_top_friends
  after delete or update of status on public.friendships
  for each row
  execute function private.cleanup_top_friends_for_friendship();
