create or replace function public.current_exam_week_mode()
returns table(enabled boolean,title text,starts_on date,ends_on date,temporary_style text,announcement text)
language sql security definer set search_path=public,pg_temp as $$
 select e.enabled,e.title,e.starts_on,e.ends_on,e.temporary_style,e.announcement from public.exam_week_config e where e.key='current' limit 1;
$$;
revoke all on function public.current_exam_week_mode() from public;
grant execute on function public.current_exam_week_mode() to anon,authenticated;
