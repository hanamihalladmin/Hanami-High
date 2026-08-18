create policy "deny direct permission reads"
on public.account_permissions for select to authenticated
using (false);

grant usage on schema private to authenticated;

create or replace function private.current_account_admin_access_internal()
returns table(site_admin boolean, content_editor boolean, moderator boolean)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    private.account_has_permission(auth.uid(), 'site_admin'),
    private.account_has_permission(auth.uid(), 'content_editor'),
    private.account_has_permission(auth.uid(), 'moderator');
$$;
revoke all on function private.current_account_admin_access_internal() from public, anon;
grant execute on function private.current_account_admin_access_internal() to authenticated;

create or replace function public.current_account_admin_access()
returns table(site_admin boolean, content_editor boolean, moderator boolean)
language sql
stable
security invoker
set search_path = public, private
as $$
  select * from private.current_account_admin_access_internal();
$$;
revoke all on function public.current_account_admin_access() from public, anon;
grant execute on function public.current_account_admin_access() to authenticated;

create or replace function private.moderation_report_queue_internal()
returns table(
  report_id uuid,
  reason public.character_report_reason,
  status public.character_report_status,
  details text,
  review_note text,
  created_at timestamptz,
  target_character_id uuid,
  target_display_name text,
  target_handle text,
  target_role public.character_role,
  reporter_display_name text,
  reporter_handle text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.account_has_permission(auth.uid(), 'moderator') then
    raise exception 'moderator permission required';
  end if;
  return query
  select r.id, r.reason, r.status, r.details, r.review_note, r.created_at,
         target.id, target.display_name, target.handle, target.role,
         reporter.display_name, reporter.handle
  from public.character_reports r
  join public.characters target on target.id = r.target_character_id
  join public.characters reporter on reporter.id = r.reporter_character_id
  order by case r.status when 'open' then 0 when 'reviewing' then 1 else 2 end, r.created_at desc;
end;
$$;
revoke all on function private.moderation_report_queue_internal() from public, anon;
grant execute on function private.moderation_report_queue_internal() to authenticated;

create or replace function public.moderation_report_queue()
returns table(
  report_id uuid,
  reason public.character_report_reason,
  status public.character_report_status,
  details text,
  review_note text,
  created_at timestamptz,
  target_character_id uuid,
  target_display_name text,
  target_handle text,
  target_role public.character_role,
  reporter_display_name text,
  reporter_handle text
)
language sql
security invoker
set search_path = public, private
as $$
  select * from private.moderation_report_queue_internal();
$$;
revoke all on function public.moderation_report_queue() from public, anon;
grant execute on function public.moderation_report_queue() to authenticated;
