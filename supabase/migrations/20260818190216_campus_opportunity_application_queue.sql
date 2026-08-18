create or replace function private.administration_campus_application_queue_internal()
returns table(
  application_id uuid,
  opportunity_id uuid,
  opportunity_title text,
  opportunity_type public.campus_opportunity_type,
  character_id uuid,
  character_display_name text,
  character_handle text,
  statement text,
  application_status public.campus_application_status,
  staff_response text,
  submitted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public,private
as $$
begin
  if not private.account_has_permission(auth.uid(),'content_editor') then
    raise exception 'content editor permission required';
  end if;
  return query
  select a.id,a.opportunity_id,o.title,o.opportunity_type,c.id,c.display_name,c.handle,a.statement,a.status,a.staff_response,a.submitted_at,a.updated_at
  from public.campus_opportunity_applications a
  join public.campus_opportunities o on o.id=a.opportunity_id
  join public.characters c on c.id=a.character_id
  order by case a.status when 'submitted' then 0 when 'under_review' then 1 else 2 end,a.submitted_at asc;
end;$$;
revoke all on function private.administration_campus_application_queue_internal() from public,anon;
grant execute on function private.administration_campus_application_queue_internal() to authenticated;

create or replace function public.administration_campus_application_queue()
returns table(
  application_id uuid,
  opportunity_id uuid,
  opportunity_title text,
  opportunity_type public.campus_opportunity_type,
  character_id uuid,
  character_display_name text,
  character_handle text,
  statement text,
  application_status public.campus_application_status,
  staff_response text,
  submitted_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path=private
as $$ select * from private.administration_campus_application_queue_internal(); $$;
revoke all on function public.administration_campus_application_queue() from public,anon;
grant execute on function public.administration_campus_application_queue() to authenticated;
