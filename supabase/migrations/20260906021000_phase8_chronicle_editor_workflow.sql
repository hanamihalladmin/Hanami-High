create or replace function public.chronicle_save_article(
  target_article_id uuid default null,
  target_author_character_id uuid default null,
  requested_section text default 'news',
  requested_headline text default '',
  requested_dek text default '',
  requested_body text default ''
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare result_id uuid; is_staff_editor boolean; is_admin_editor boolean; clean_section text:=lower(trim(coalesce(requested_section,'news'))); clean_headline text:=trim(coalesce(requested_headline,''));
begin
  if not private.account_has_publishing_capability(auth.uid(),'chronicle_publish') then raise exception 'chronicle_publish capability required'; end if;
  is_admin_editor:=private.account_has_permission(auth.uid(),'content_editor'::public.hanami_account_permission) or private.account_has_permission(auth.uid(),'site_admin'::public.hanami_account_permission);
  is_staff_editor:=target_author_character_id is not null and exists(select 1 from public.characters c join public.newspaper_editors e on e.character_id=c.id where c.id=target_author_character_id and c.owner_user_id=auth.uid());
  if target_author_character_id is not null and not is_staff_editor and not is_admin_editor then raise exception 'Chronicle author ownership or content-editor permission required'; end if;
  if clean_section !~ '^[a-z0-9][a-z0-9_-]{0,31}$' then raise exception 'invalid Chronicle section'; end if;
  if char_length(clean_headline)<3 or char_length(clean_headline)>180 then raise exception 'headline must be 3 to 180 characters'; end if;
  if char_length(coalesce(requested_dek,''))>500 then raise exception 'dek is too long'; end if;
  if char_length(coalesce(requested_body,''))>30000 then raise exception 'article body is too long'; end if;
  if target_article_id is null then
    insert into public.newspaper_articles(author_character_id,section,headline,dek,body,status,approved_by,published_at)
    values(target_author_character_id,clean_section,clean_headline,trim(coalesce(requested_dek,'')),coalesce(requested_body,''),'draft',null,null)
    returning id into result_id;
  else
    update public.newspaper_articles a set section=clean_section,headline=clean_headline,dek=trim(coalesce(requested_dek,'')),body=coalesce(requested_body,''),updated_at=now()
    where a.id=target_article_id and a.status<>'published' and (is_admin_editor or (target_author_character_id is not null and a.author_character_id=target_author_character_id and is_staff_editor) or (target_author_character_id is null and a.author_character_id is null and is_admin_editor))
    returning a.id into result_id;
    if result_id is null then raise exception 'editable Chronicle draft not found'; end if;
  end if;
  return result_id;
end;
$$;

create or replace function public.chronicle_publish_article(target_article_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare row_author uuid; is_admin_editor boolean;
begin
  if not private.account_has_publishing_capability(auth.uid(),'chronicle_publish') then raise exception 'chronicle_publish capability required'; end if;
  is_admin_editor:=private.account_has_permission(auth.uid(),'content_editor'::public.hanami_account_permission) or private.account_has_permission(auth.uid(),'site_admin'::public.hanami_account_permission);
  select a.author_character_id into row_author from public.newspaper_articles a where a.id=target_article_id for update;
  if not found then raise exception 'Chronicle article not found'; end if;
  if row_author is not null and not is_admin_editor and not exists(select 1 from public.characters c join public.newspaper_editors e on e.character_id=c.id where c.id=row_author and c.owner_user_id=auth.uid()) then raise exception 'Chronicle article is outside your editorial scope'; end if;
  if row_author is null and not is_admin_editor then raise exception 'Only school content editors may publish staff-bylined Chronicle stories'; end if;
  update public.newspaper_articles set status='published',approved_by=auth.uid(),published_at=coalesce(published_at,now()),updated_at=now() where id=target_article_id;
end;
$$;

create or replace function public.chronicle_archive_article(target_article_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare row_author uuid; is_admin_editor boolean;
begin
  if not private.account_has_publishing_capability(auth.uid(),'chronicle_publish') then raise exception 'chronicle_publish capability required'; end if;
  is_admin_editor:=private.account_has_permission(auth.uid(),'content_editor'::public.hanami_account_permission) or private.account_has_permission(auth.uid(),'site_admin'::public.hanami_account_permission);
  select author_character_id into row_author from public.newspaper_articles where id=target_article_id;
  if not found then raise exception 'Chronicle article not found'; end if;
  if not is_admin_editor and not exists(select 1 from public.characters c join public.newspaper_editors e on e.character_id=c.id where c.id=row_author and c.owner_user_id=auth.uid()) then raise exception 'Chronicle article is outside your editorial scope'; end if;
  update public.newspaper_articles set status='archived',updated_at=now() where id=target_article_id;
end;
$$;

revoke all on function public.chronicle_save_article(uuid,uuid,text,text,text,text) from public,anon;
revoke all on function public.chronicle_publish_article(uuid) from public,anon;
revoke all on function public.chronicle_archive_article(uuid) from public,anon;
grant execute on function public.chronicle_save_article(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.chronicle_publish_article(uuid) to authenticated;
grant execute on function public.chronicle_archive_article(uuid) to authenticated;
