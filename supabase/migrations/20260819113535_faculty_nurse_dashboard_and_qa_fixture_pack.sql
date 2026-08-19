create table if not exists public.test_bot_faculty (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 100),
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,40}$'),
  department text not null check (char_length(department) between 2 and 80),
  staff_title text not null check (char_length(staff_title) between 2 and 100),
  specialty text not null default '',
  is_test_data boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.test_bot_faculty enable row level security;
revoke all on table public.test_bot_faculty from anon;
grant select on table public.test_bot_faculty to authenticated;
drop policy if exists "authenticated read test bot faculty" on public.test_bot_faculty;
create policy "authenticated read test bot faculty" on public.test_bot_faculty for select to authenticated using (is_test_data=true);

create table if not exists public.test_bot_faculty_section_assignments (
  id uuid primary key default gen_random_uuid(),
  bot_faculty_id uuid not null references public.test_bot_faculty(id) on delete cascade,
  section_id uuid not null references public.class_sections(id) on delete cascade,
  relationship text not null default 'instructor' check (relationship in ('instructor','assistant','observer')),
  created_at timestamptz not null default now(),
  unique(bot_faculty_id,section_id)
);
alter table public.test_bot_faculty_section_assignments enable row level security;
revoke all on table public.test_bot_faculty_section_assignments from anon;
grant select on table public.test_bot_faculty_section_assignments to authenticated;
drop policy if exists "authenticated read bot faculty assignments" on public.test_bot_faculty_section_assignments;
create policy "authenticated read bot faculty assignments" on public.test_bot_faculty_section_assignments for select to authenticated using (true);

create table if not exists public.faculty_special_roles (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  special_role text not null check (special_role in ('nurse')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique(character_id,special_role)
);
alter table public.faculty_special_roles enable row level security;
revoke all on table public.faculty_special_roles from anon;
grant select,insert,update,delete on table public.faculty_special_roles to authenticated;
drop policy if exists "faculty read own special roles" on public.faculty_special_roles;
create policy "faculty read own special roles" on public.faculty_special_roles for select to authenticated using (
  exists(select 1 from public.characters c where c.id=character_id and c.owner_user_id=auth.uid() and c.role='faculty')
  or private.account_has_permission(auth.uid(),'site_admin'::hanami_account_permission)
);
drop policy if exists "site admins manage faculty special roles" on public.faculty_special_roles;
create policy "site admins manage faculty special roles" on public.faculty_special_roles for all to authenticated using (
  private.account_has_permission(auth.uid(),'site_admin'::hanami_account_permission)
) with check (
  private.account_has_permission(auth.uid(),'site_admin'::hanami_account_permission)
  and exists(select 1 from public.characters c where c.id=character_id and c.role='faculty')
);

create or replace function private.current_faculty_has_special_role_internal(target_character_id uuid, requested_role text)
returns boolean language sql security definer set search_path=public,private as $$
  select exists(
    select 1 from public.faculty_special_roles r
    join public.characters c on c.id=r.character_id
    where r.character_id=target_character_id
      and r.special_role=requested_role
      and c.role='faculty'
      and (c.owner_user_id=auth.uid() or private.account_has_permission(auth.uid(),'site_admin'::hanami_account_permission))
  );
$$;
revoke all on function private.current_faculty_has_special_role_internal(uuid,text) from public,anon;
grant execute on function private.current_faculty_has_special_role_internal(uuid,text) to authenticated;
create or replace function public.current_faculty_has_special_role(target_character_id uuid, requested_role text)
returns boolean language sql security invoker set search_path=public,private as $$
  select private.current_faculty_has_special_role_internal(target_character_id,requested_role);
$$;
revoke all on function public.current_faculty_has_special_role(uuid,text) from public,anon;
grant execute on function public.current_faculty_has_special_role(uuid,text) to authenticated;

drop policy if exists "nurses read health visits" on public.health_office_visits;
create policy "nurses read health visits" on public.health_office_visits for select to authenticated using (
  exists(
    select 1 from public.faculty_special_roles r
    join public.characters c on c.id=r.character_id
    where r.special_role='nurse' and c.id=r.character_id and c.owner_user_id=auth.uid() and c.role='faculty'
  )
);
drop policy if exists "nurses update health visits" on public.health_office_visits;
create policy "nurses update health visits" on public.health_office_visits for update to authenticated using (
  exists(
    select 1 from public.faculty_special_roles r
    join public.characters c on c.id=r.character_id
    where r.special_role='nurse' and c.id=r.character_id and c.owner_user_id=auth.uid() and c.role='faculty'
  )
) with check (status in ('requested','scheduled','seen','cancelled'));
drop policy if exists "nurses manage health notices" on public.health_office_notices;
create policy "nurses manage health notices" on public.health_office_notices for all to authenticated using (
  exists(
    select 1 from public.faculty_special_roles r
    join public.characters c on c.id=r.character_id
    where r.special_role='nurse' and c.id=r.character_id and c.owner_user_id=auth.uid() and c.role='faculty'
  )
) with check (
  exists(
    select 1 from public.faculty_special_roles r
    join public.characters c on c.id=r.character_id
    where r.special_role='nurse' and c.id=r.character_id and c.owner_user_id=auth.uid() and c.role='faculty'
  )
);

insert into public.academic_courses(code,title,department,description,credits,is_test_data) values
('QAJPN-101','TEST • Contemporary Japanese','Japanese Language & Literature','QA class for attendance, assignments, grading, announcements, and roster workflows.',3,true),
('QASCI-101','TEST • Basic Biology','Science','QA class for lab-style assignments, grading categories, attendance, and classroom scheduling.',3,true),
('QAMAT-101','TEST • Mathematics I','Mathematics','QA class for coursework, missing-work alerts, exams, waitlists, and report-card workflows.',3,true),
('QAPHE-101','TEST • Physical Education','Health & Physical Education','QA class for attendance, athletics eligibility, events, and school-day scheduling.',2,true)
on conflict (code) do update set title=excluded.title,department=excluded.department,description=excluded.description,credits=excluded.credits,is_test_data=true;

insert into public.class_sections(course_id,section_code,term,room,capacity,is_test_data)
select c.id,'TST-A','2006-2007',v.room,v.capacity,true
from public.academic_courses c
join (values
 ('QAJPN-101','2-201',24),
 ('QASCI-101','SCI-LAB-1',20),
 ('QAMAT-101','2-305',24),
 ('QAPHE-101','GYM-A',30)
) as v(code,room,capacity) on v.code=c.code
on conflict (course_id,section_code,term) do update set room=excluded.room,capacity=excluded.capacity,is_test_data=true;

insert into public.section_meetings(section_id,weekday,starts_at,ends_at,label)
select s.id,v.weekday,v.starts_at,v.ends_at,'TEST QA PACK'
from public.class_sections s join public.academic_courses c on c.id=s.course_id
join (values
 ('QAJPN-101',2::smallint,'10:00'::time,'10:50'::time),
 ('QAJPN-101',4::smallint,'10:00'::time,'10:50'::time),
 ('QASCI-101',3::smallint,'11:00'::time,'11:50'::time),
 ('QASCI-101',5::smallint,'11:00'::time,'11:50'::time),
 ('QAMAT-101',2::smallint,'13:00'::time,'13:50'::time),
 ('QAMAT-101',4::smallint,'13:00'::time,'13:50'::time),
 ('QAPHE-101',3::smallint,'14:00'::time,'14:50'::time)
) as v(code,weekday,starts_at,ends_at) on v.code=c.code
where s.section_code='TST-A' and s.term='2006-2007'
on conflict (section_id,weekday,starts_at) do nothing;

insert into public.test_bot_faculty(display_name,handle,department,staff_title,specialty) values
('TEST BOT • Aiko Tanaka','bot_tanaka','Japanese Language & Literature','QA Faculty Bot','Japanese / writing workflows'),
('TEST BOT • Ren Sato','bot_sato','Science','QA Faculty Bot','Biology / lab workflows'),
('TEST BOT • Emi Kobayashi','bot_kobayashi','Mathematics','QA Faculty Bot','Mathematics / assessment workflows'),
('TEST BOT • Daichi Kuroda','bot_kuroda','Health & Physical Education','QA Faculty Bot','PE / athletics workflows'),
('TEST BOT • Mika Mori','bot_nurse_mori','Health Office','QA Nurse Bot','Health Office / nurse workflows')
on conflict (handle) do update set display_name=excluded.display_name,department=excluded.department,staff_title=excluded.staff_title,specialty=excluded.specialty,is_test_data=true;

insert into public.test_bot_faculty_section_assignments(bot_faculty_id,section_id,relationship)
select b.id,s.id,'instructor'
from public.test_bot_faculty b
join (values
 ('bot_tanaka','QAJPN-101'),('bot_sato','QASCI-101'),('bot_kobayashi','QAMAT-101'),('bot_kuroda','QAPHE-101')
) x(handle,code) on x.handle=b.handle
join public.academic_courses c on c.code=x.code
join public.class_sections s on s.course_id=c.id and s.section_code='TST-A' and s.term='2006-2007'
on conflict (bot_faculty_id,section_id) do nothing;

create or replace function private.attach_owner_test_faculty_qa_pack_internal(target_character_id uuid, include_nurse boolean default true)
returns void language plpgsql security definer set search_path=public,private as $$
begin
  if not private.is_owner_discord_user() then raise exception 'Owner only'; end if;
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='faculty' and c.handle like 'testfaculty_%') then
    raise exception 'Target must be your Owner TEST Faculty character';
  end if;
  insert into public.section_memberships(section_id,character_id,relationship)
  select s.id,target_character_id,'instructor'
  from public.class_sections s join public.academic_courses c on c.id=s.course_id
  where c.is_test_data=true and c.code in ('TEST-101','QAJPN-101','QASCI-101','QAMAT-101','QAPHE-101')
  on conflict (section_id,character_id) do update set relationship='instructor';
  if include_nurse then
    insert into public.faculty_special_roles(character_id,special_role,assigned_by)
    values(target_character_id,'nurse',auth.uid())
    on conflict (character_id,special_role) do nothing;
  end if;
end;
$$;
revoke all on function private.attach_owner_test_faculty_qa_pack_internal(uuid,boolean) from public,anon;
grant execute on function private.attach_owner_test_faculty_qa_pack_internal(uuid,boolean) to authenticated;
create or replace function public.attach_owner_test_faculty_qa_pack(target_character_id uuid, include_nurse boolean default true)
returns void language sql security invoker set search_path=public,private as $$ select private.attach_owner_test_faculty_qa_pack_internal(target_character_id,include_nurse); $$;
revoke all on function public.attach_owner_test_faculty_qa_pack(uuid,boolean) from public,anon;
grant execute on function public.attach_owner_test_faculty_qa_pack(uuid,boolean) to authenticated;
