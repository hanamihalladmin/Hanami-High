begin;

create table if not exists public.student_id_cards(
  character_id uuid primary key references public.characters(id) on delete cascade,
  id_number text not null unique,
  issued_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','inactive','reissued')),
  updated_at timestamptz not null default now()
);

alter table public.student_id_cards enable row level security;

revoke all on public.student_id_cards from anon;
grant select on public.student_id_cards to authenticated;

drop policy if exists student_id_cards_select_own on public.student_id_cards;
create policy student_id_cards_select_own on public.student_id_cards
for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id=student_id_cards.character_id
      and c.owner_user_id=auth.uid()
      and c.role='student'
  )
);

create or replace function public.ensure_my_student_id(target_character_id uuid)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  existing_id text;
  candidate text;
  attempts int:=0;
begin
  if not exists (
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

  loop
    attempts:=attempts+1;
    candidate:='HHS-'||lpad((floor(random()*10000))::int::text,4,'0')||'-'||lpad((floor(random()*10000))::int::text,4,'0');
    begin
      insert into public.student_id_cards(character_id,id_number)
      values(target_character_id,candidate);
      return candidate;
    exception when unique_violation then
      if attempts>=25 then
        raise exception 'A unique student ID number could not be generated';
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.ensure_my_student_id(uuid) from public,anon;
grant execute on function public.ensure_my_student_id(uuid) to authenticated;

commit;
