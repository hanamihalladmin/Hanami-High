create or replace function public.current_school_theme()
returns table(theme_key text,title text,starts_on date,ends_on date)
language sql
stable
security definer
set search_path=public,private
as $$
  select s.theme_key,s.title,s.starts_on,s.ends_on
  from public.school_theme_schedule s
  where s.enabled=true
    and (now() at time zone 'Asia/Tokyo')::date between s.starts_on and s.ends_on
  order by s.starts_on desc,s.created_at desc
  limit 1;
$$;
revoke all on function public.current_school_theme() from public;
grant execute on function public.current_school_theme() to anon,authenticated;
