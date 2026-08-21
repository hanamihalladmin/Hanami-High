begin;

alter table public.student_id_cards add column if not exists issued_by uuid null;

create or replace function private.make_student_id_number()
returns text
language plpgsql
volatile
security definer
set search_path=public,private
as $$
declare candidate text;
begin
  loop
    candidate:='HHS-'||lpad((floor(random()*10000))::int::text,4,'0')||'-'||lpad((floor(random()*10000))::int::text,4,'0');
    exit when not exists(select 1 from public.student_id_cards s where s.id_number=candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.admin_issue_student_id(target_character_id uuid)
returns text
language plpgsql
security definer
set search_path=public,private
as $$
declare result_id text; a record;
begin
  if not private.is_owner_discord_user() then
    select * into a from private.current_account_admin_access_internal() limit 1;
    if not (coalesce(a.site_admin,false) or coalesce(a.content_editor,false) or coalesce(a.moderator,false)) then
      raise exception 'Administrator or Owner access required';
    end if;
  end if;
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.role='student') then
    raise exception 'Target character is not a student';
  end if;
  select id_number into result_id from public.student_id_cards where character_id=target_character_id;
  if result_id is null then
    insert into public.student_id_cards(character_id,id_number,issued_by)
    values(target_character_id,private.make_student_id_number(),auth.uid())
    returning id_number into result_id;
  else
    update public.student_id_cards set status='active',updated_at=now(),issued_by=auth.uid() where character_id=target_character_id;
  end if;
  return result_id;
end;
$$;

create or replace function public.admin_list_student_ids()
returns table(character_id uuid,display_name text,handle text,id_number text,id_status text,issued_at timestamptz,homeroom_code text,grade_level smallint,school_year text)
language plpgsql
security definer
set search_path=public,private
as $$
declare a record;
begin
  if not private.is_owner_discord_user() then
    select * into a from private.current_account_admin_access_internal() limit 1;
    if not (coalesce(a.site_admin,false) or coalesce(a.content_editor,false) or coalesce(a.moderator,false)) then
      raise exception 'Administrator or Owner access required';
    end if;
  end if;
  return query
  select c.id,c.display_name,c.handle,s.id_number,s.status,s.issued_at,h.code,h.grade_level,h.school_year
  from public.characters c
  left join public.student_id_cards s on s.character_id=c.id
  left join public.homeroom_memberships hm on hm.student_character_id=c.id
  left join public.homerooms h on h.id=hm.homeroom_id
  where c.role='student'
  order by c.display_name;
end;
$$;

revoke all on function public.admin_issue_student_id(uuid) from public,anon;
revoke all on function public.admin_list_student_ids() from public,anon;
grant execute on function public.admin_issue_student_id(uuid) to authenticated;
grant execute on function public.admin_list_student_ids() to authenticated;

commit;
