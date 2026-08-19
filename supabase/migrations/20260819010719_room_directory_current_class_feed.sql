create or replace function public.room_directory_feed()
returns table(room_id uuid,room_number text,building text,floor_label text,purpose text,department text,availability_status text,current_class text,current_section_code text,class_starts time,class_ends time,notes text)
language sql stable security definer set search_path=public,private,auth as $$
  select r.id,r.room_number,r.building,r.floor_label,r.purpose,r.department,
    case when live.section_id is not null then 'occupied' else r.availability_status end,
    live.course_title,live.section_code,live.starts_at,live.ends_at,r.notes
  from public.school_rooms r
  left join lateral (
    select s.id as section_id,c.title as course_title,s.section_code,m.starts_at,m.ends_at
    from public.class_sections s
    join public.academic_courses c on c.id=s.course_id
    join public.section_meetings m on m.section_id=s.id
    where s.room_id=r.id
      and m.weekday=extract(isodow from (now() at time zone 'Asia/Tokyo'))::int
      and (now() at time zone 'Asia/Tokyo')::time between m.starts_at and m.ends_at
    order by m.starts_at limit 1
  ) live on true
  order by r.building,r.floor_label,r.room_number;
$$;
revoke all on function public.room_directory_feed() from public,anon;
grant execute on function public.room_directory_feed() to authenticated;
