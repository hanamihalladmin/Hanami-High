alter table public.academic_courses add column if not exists is_active boolean not null default true;
create index if not exists academic_courses_active_code_idx on public.academic_courses(is_active,code);
comment on column public.academic_courses.is_active is 'Allows authorized school administration to retire a course without deleting its academic history.';
