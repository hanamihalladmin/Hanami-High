-- Enforce Hanami High extracurricular participation limits.
-- Students may hold one club membership and one active/reserve sports team roster spot.

create unique index if not exists sports_team_roster_one_active_sport_per_student
on public.sports_team_roster (student_character_id)
where roster_status in ('active','reserve');

create or replace function public.enforce_one_club_membership_per_student()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_kind activity_kind;
  student_role character_role;
begin
  select kind into target_kind
  from public.campus_activities
  where id = new.activity_id;

  if target_kind <> 'club' then
    return new;
  end if;

  select role into student_role
  from public.characters
  where id = new.character_id;

  if student_role <> 'student' then
    return new;
  end if;

  if exists (
    select 1
    from public.campus_activity_memberships m
    join public.campus_activities a on a.id = m.activity_id
    where m.character_id = new.character_id
      and a.kind = 'club'
      and m.activity_id <> new.activity_id
      and m.status in ('member','officer')
  ) then
    raise exception 'Students may join only one club.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_one_club_membership_per_student
on public.campus_activity_memberships;

create trigger enforce_one_club_membership_per_student
before insert or update of activity_id, character_id, status
on public.campus_activity_memberships
for each row execute function public.enforce_one_club_membership_per_student();
