create or replace function public.public_newspaper_feed(row_limit integer default 60)
returns table(id uuid,section text,headline text,dek text,body text,published_at timestamptz,author_name text,author_handle text)
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
 select a.id,a.section,a.headline,a.dek,a.body,a.published_at,c.display_name,c.handle
 from public.newspaper_articles a
 left join public.characters c on c.id=a.author_character_id
 where a.status='published' and a.published_at is not null
 order by a.published_at desc
 limit greatest(1,least(coalesce(row_limit,60),200));
$$;
revoke all on function public.public_newspaper_feed(integer) from public;
grant execute on function public.public_newspaper_feed(integer) to anon, authenticated;
