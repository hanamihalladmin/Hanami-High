alter table public.course_assignments alter column created_by_character_id drop not null;
alter table public.course_assignments drop constraint if exists course_assignments_created_by_character_id_fkey;
alter table public.course_assignments add constraint course_assignments_created_by_character_id_fkey foreign key (created_by_character_id) references public.characters(id) on delete set null;
