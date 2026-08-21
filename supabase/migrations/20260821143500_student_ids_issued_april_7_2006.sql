alter table public.student_id_cards
  alter column issued_at set default '2006-04-07 00:00:00+09'::timestamptz;

update public.student_id_cards
set issued_at = '2006-04-07 00:00:00+09'::timestamptz
where issued_at is distinct from '2006-04-07 00:00:00+09'::timestamptz;

create or replace function public.ensure_my_student_id(target_character_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare existing_id text;
begin
 if not exists(
  select 1 from public.characters c
  where c.id=target_character_id
    and c.owner_user_id=auth.uid()
    and c.role='student'
 ) then
  raise exception 'Student ID cards can only be issued to your own student character';
 end if;

 select id_number into existing_id
 from public.student_id_cards
 where character_id=target_character_id;

 if existing_id is not null then
  return existing_id;
 end if;

 insert into public.student_id_cards(character_id,id_number,issued_at,issued_by)
 values(
  target_character_id,
  private.make_student_id_number(),
  '2006-04-07 00:00:00+09'::timestamptz,
  auth.uid()
 )
 returning id_number into existing_id;

 return existing_id;
end;
$function$;
