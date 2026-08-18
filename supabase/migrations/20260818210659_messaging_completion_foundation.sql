alter table public.conversation_participants
  add column if not exists last_read_at timestamptz,
  add column if not exists can_manage boolean not null default false;

update public.conversation_participants cp
set can_manage = true
from public.conversations c
where c.id=cp.conversation_id and c.kind='group' and c.created_by_character_id=cp.character_id;

create or replace function private.character_manages_conversation(target_conversation_id uuid,target_character_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
 select private.user_owns_character(target_character_id)
   and exists(select 1 from public.conversations c join public.conversation_participants cp on cp.conversation_id=c.id and cp.character_id=target_character_id where c.id=target_conversation_id and c.kind='group' and (c.created_by_character_id=target_character_id or cp.can_manage=true));
$$;
revoke all on function private.character_manages_conversation(uuid,uuid) from public,anon;
grant execute on function private.character_manages_conversation(uuid,uuid) to authenticated;

create or replace function private.mark_conversation_read_internal(viewer_character_id uuid,target_conversation_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
begin
 if not private.user_owns_character(viewer_character_id) then return false; end if;
 update public.conversation_participants set last_read_at=now()
 where conversation_id=target_conversation_id and character_id=viewer_character_id;
 return found;
end;$$;
create or replace function public.mark_conversation_read(viewer_character_id uuid,target_conversation_id uuid)
returns boolean language sql security invoker set search_path=private as $$select private.mark_conversation_read_internal(viewer_character_id,target_conversation_id);$$;
revoke all on function private.mark_conversation_read_internal(uuid,uuid) from public,anon;
grant execute on function private.mark_conversation_read_internal(uuid,uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid,uuid) to authenticated;

create or replace function private.conversation_unread_counts_internal(viewer_character_id uuid)
returns table(conversation_id uuid,unread_count bigint,last_message_at timestamptz)
language sql stable security definer set search_path=public,private as $$
 select cp.conversation_id,
   count(m.id) filter(where m.sender_character_id is distinct from viewer_character_id and m.created_at>coalesce(cp.last_read_at,cp.joined_at)) as unread_count,
   max(m.created_at) as last_message_at
 from public.conversation_participants cp
 left join public.conversation_messages m on m.conversation_id=cp.conversation_id
 where cp.character_id=viewer_character_id and private.user_owns_character(viewer_character_id)
 group by cp.conversation_id,cp.last_read_at,cp.joined_at;
$$;
create or replace function public.conversation_unread_counts(viewer_character_id uuid)
returns table(conversation_id uuid,unread_count bigint,last_message_at timestamptz)
language sql stable security invoker set search_path=private as $$select * from private.conversation_unread_counts_internal(viewer_character_id);$$;
revoke all on function private.conversation_unread_counts_internal(uuid) from public,anon;
grant execute on function private.conversation_unread_counts_internal(uuid) to authenticated;
grant execute on function public.conversation_unread_counts(uuid) to authenticated;

create or replace function private.add_group_participant_internal(manager_character_id uuid,target_conversation_id uuid,target_handle text)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare target_id uuid; member_count integer;
begin
 if not private.character_manages_conversation(target_conversation_id,manager_character_id) then raise exception 'Group manager required'; end if;
 select count(*) into member_count from public.conversation_participants where conversation_id=target_conversation_id;
 if member_count>=8 then raise exception 'Group member limit reached'; end if;
 target_id:=private.resolve_character_id_by_handle(target_handle);
 if target_id is null then raise exception 'Character handle not found'; end if;
 insert into public.conversation_participants(conversation_id,character_id,last_read_at,can_manage) values(target_conversation_id,target_id,now(),false) on conflict do nothing;
 return true;
end;$$;
create or replace function public.add_group_participant(manager_character_id uuid,target_conversation_id uuid,target_handle text)
returns boolean language sql security invoker set search_path=private as $$select private.add_group_participant_internal(manager_character_id,target_conversation_id,target_handle);$$;

create or replace function private.remove_group_participant_internal(manager_character_id uuid,target_conversation_id uuid,target_character_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
begin
 if not private.character_manages_conversation(target_conversation_id,manager_character_id) then raise exception 'Group manager required'; end if;
 if target_character_id=manager_character_id then raise exception 'Use leave group to remove yourself'; end if;
 delete from public.conversation_participants where conversation_id=target_conversation_id and character_id=target_character_id;
 return found;
end;$$;
create or replace function public.remove_group_participant(manager_character_id uuid,target_conversation_id uuid,target_character_id uuid)
returns boolean language sql security invoker set search_path=private as $$select private.remove_group_participant_internal(manager_character_id,target_conversation_id,target_character_id);$$;

create or replace function private.leave_group_conversation_internal(viewer_character_id uuid,target_conversation_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
begin
 if not private.user_owns_character(viewer_character_id) then return false; end if;
 if not exists(select 1 from public.conversations where id=target_conversation_id and kind='group') then return false; end if;
 delete from public.conversation_participants where conversation_id=target_conversation_id and character_id=viewer_character_id;
 return found;
end;$$;
create or replace function public.leave_group_conversation(viewer_character_id uuid,target_conversation_id uuid)
returns boolean language sql security invoker set search_path=private as $$select private.leave_group_conversation_internal(viewer_character_id,target_conversation_id);$$;

create or replace function private.rename_group_conversation_internal(manager_character_id uuid,target_conversation_id uuid,new_title text)
returns boolean language plpgsql security definer set search_path=public,private as $$
begin
 if not private.character_manages_conversation(target_conversation_id,manager_character_id) then raise exception 'Group manager required'; end if;
 if char_length(trim(new_title))<1 or char_length(trim(new_title))>80 then raise exception 'Group title must be 1-80 characters'; end if;
 update public.conversations set title=trim(new_title),updated_at=now() where id=target_conversation_id and kind='group';
 return found;
end;$$;
create or replace function public.rename_group_conversation(manager_character_id uuid,target_conversation_id uuid,new_title text)
returns boolean language sql security invoker set search_path=private as $$select private.rename_group_conversation_internal(manager_character_id,target_conversation_id,new_title);$$;

grant execute on function private.add_group_participant_internal(uuid,uuid,text) to authenticated;
grant execute on function private.remove_group_participant_internal(uuid,uuid,uuid) to authenticated;
grant execute on function private.leave_group_conversation_internal(uuid,uuid) to authenticated;
grant execute on function private.rename_group_conversation_internal(uuid,uuid,text) to authenticated;
grant execute on function public.add_group_participant(uuid,uuid,text) to authenticated;
grant execute on function public.remove_group_participant(uuid,uuid,uuid) to authenticated;
grant execute on function public.leave_group_conversation(uuid,uuid) to authenticated;
grant execute on function public.rename_group_conversation(uuid,uuid,text) to authenticated;

create table if not exists public.message_attachments(
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.conversation_messages(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 uploader_character_id uuid references public.characters(id) on delete set null,
 storage_path text not null unique,
 file_name text not null,
 mime_type text not null,
 byte_size bigint not null check(byte_size>0 and byte_size<=8388608),
 created_at timestamptz not null default now()
);
alter table public.message_attachments enable row level security;
grant select,insert,delete on public.message_attachments to authenticated;
revoke all on public.message_attachments from anon;
create policy "conversation members read message attachments" on public.message_attachments for select to authenticated using(private.user_participates_in_conversation(conversation_id));
create policy "members attach files to own messages" on public.message_attachments for insert to authenticated with check(private.user_owns_character(uploader_character_id) and private.user_participates_in_conversation(conversation_id) and exists(select 1 from public.conversation_messages m where m.id=message_id and m.conversation_id=message_attachments.conversation_id and m.sender_character_id=message_attachments.uploader_character_id));
create policy "uploaders delete own message attachments" on public.message_attachments for delete to authenticated using(private.user_owns_character(uploader_character_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('message-media','message-media',false,8388608,array['image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "members upload message media" on storage.objects for insert to authenticated
with check(bucket_id='message-media' and private.user_owns_character((storage.foldername(name))[1]::uuid) and private.user_participates_in_conversation((storage.foldername(name))[2]::uuid));
create policy "members remove own message media" on storage.objects for delete to authenticated
using(bucket_id='message-media' and private.user_owns_character((storage.foldername(name))[1]::uuid));
