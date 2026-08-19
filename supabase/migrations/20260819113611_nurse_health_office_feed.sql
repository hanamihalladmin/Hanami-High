create or replace function private.nurse_health_office_feed_internal(nurse_character_id uuid)
returns table(
  visit_id uuid,
  student_character_id uuid,
  student_display_name text,
  student_handle text,
  reason text,
  requested_for timestamptz,
  status text,
  staff_response text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql security definer set search_path=public,private as $$
begin
  if not exists(
    select 1 from public.characters c
    join public.faculty_special_roles r on r.character_id=c.id and r.special_role='nurse'
    where c.id=nurse_character_id and c.owner_user_id=auth.uid() and c.role='faculty'
  ) then raise exception 'Nurse dashboard access required'; end if;
  return query
  select v.id,v.student_character_id,c.display_name,c.handle,v.reason,v.requested_for,v.status,v.staff_response,v.created_at,v.updated_at
  from public.health_office_visits v
  join public.characters c on c.id=v.student_character_id
  order by case v.status when 'requested' then 0 when 'scheduled' then 1 when 'seen' then 2 else 3 end,
           coalesce(v.requested_for,v.created_at) asc;
end;
$$;
revoke all on function private.nurse_health_office_feed_internal(uuid) from public,anon;
grant execute on function private.nurse_health_office_feed_internal(uuid) to authenticated;
create or replace function public.nurse_health_office_feed(nurse_character_id uuid)
returns table(
  visit_id uuid,
  student_character_id uuid,
  student_display_name text,
  student_handle text,
  reason text,
  requested_for timestamptz,
  status text,
  staff_response text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql security invoker set search_path=public,private as $$
  select * from private.nurse_health_office_feed_internal(nurse_character_id);
$$;
revoke all on function public.nurse_health_office_feed(uuid) from public,anon;
grant execute on function public.nurse_health_office_feed(uuid) to authenticated;
