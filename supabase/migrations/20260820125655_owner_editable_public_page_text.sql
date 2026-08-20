begin;
create table if not exists public.public_page_text_blocks (
  page_path text not null,
  block_key text not null,
  content text not null,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (page_path, block_key),
  constraint public_page_text_blocks_page_path_check check (page_path ~ '^/[a-z0-9/_-]*$'),
  constraint public_page_text_blocks_block_key_check check (block_key ~ '^[a-z0-9._-]{1,120}$'),
  constraint public_page_text_blocks_content_length check (char_length(content) <= 12000)
);
alter table public.public_page_text_blocks enable row level security;
revoke all on table public.public_page_text_blocks from public;
grant select on table public.public_page_text_blocks to anon, authenticated;
create policy public_page_text_blocks_public_read on public.public_page_text_blocks for select to anon,authenticated using (true);
create or replace function public.owner_save_public_page_text(requested_page_path text,requested_block_key text,requested_content text)
returns void language plpgsql security definer set search_path=public,private,auth as $$
begin
 if not private.is_owner_discord_user() then raise exception 'Owner access required'; end if;
 if requested_page_path is null or requested_page_path !~ '^/[a-z0-9/_-]*$' then raise exception 'Invalid page path'; end if;
 if requested_block_key is null or requested_block_key !~ '^[a-z0-9._-]{1,120}$' then raise exception 'Invalid block key'; end if;
 if requested_content is null or char_length(requested_content)>12000 then raise exception 'Invalid content'; end if;
 insert into public.public_page_text_blocks(page_path,block_key,content,updated_by,updated_at)
 values(requested_page_path,requested_block_key,requested_content,auth.uid(),now())
 on conflict(page_path,block_key) do update set content=excluded.content,updated_by=auth.uid(),updated_at=now();
end;$$;
revoke all on function public.owner_save_public_page_text(text,text,text) from public;
grant execute on function public.owner_save_public_page_text(text,text,text) to authenticated;
create or replace function public.owner_delete_public_page_text(requested_page_path text,requested_block_key text)
returns void language plpgsql security definer set search_path=public,private as $$
begin
 if not private.is_owner_discord_user() then raise exception 'Owner access required'; end if;
 delete from public.public_page_text_blocks where page_path=requested_page_path and block_key=requested_block_key;
end;$$;
revoke all on function public.owner_delete_public_page_text(text,text) from public;
grant execute on function public.owner_delete_public_page_text(text,text) to authenticated;
commit;
