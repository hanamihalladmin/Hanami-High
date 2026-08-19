create or replace function private.admin_create_academic_course_internal(requested_code text, requested_title text, requested_department text, requested_description text default '', requested_credits smallint default 1, requested_is_test_data boolean default false)
returns uuid
language plpgsql security definer set search_path=public,private,auth as $$
declare new_id uuid;
begin
  if not private.account_has_permission(auth.uid(),'site_admin') then raise exception 'Site Admin access required'; end if;
  insert into public.academic_courses(code,title,department,description,credits,is_test_data)
  values(upper(trim(requested_code)),trim(requested_title),trim(requested_department),coalesce(trim(requested_description),''),requested_credits,coalesce(requested_is_test_data,false))
  returning id into new_id;
  return new_id;
end;$$;
revoke all on function private.admin_create_academic_course_internal(text,text,text,text,smallint,boolean) from public,anon;
grant execute on function private.admin_create_academic_course_internal(text,text,text,text,smallint,boolean) to authenticated;

create or replace function public.admin_create_academic_course(requested_code text, requested_title text, requested_department text, requested_description text default '', requested_credits smallint default 1, requested_is_test_data boolean default false)
returns uuid
language sql security invoker set search_path=public,private,auth as $$
  select private.admin_create_academic_course_internal(requested_code,requested_title,requested_department,requested_description,requested_credits,requested_is_test_data);
$$;
revoke all on function public.admin_create_academic_course(text,text,text,text,smallint,boolean) from public,anon;
grant execute on function public.admin_create_academic_course(text,text,text,text,smallint,boolean) to authenticated;
