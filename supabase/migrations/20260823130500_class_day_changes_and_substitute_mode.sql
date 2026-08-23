create table if not exists public.class_day_changes (
 id uuid primary key default gen_random_uuid(),
 section_id uuid not null references public.class_sections(id) on delete cascade,
 roleplay_date date not null,
 change_type text not null check (change_type in ('room_change','substitute','cancelled','special_instructions')),
 replacement_room text,
 substitute_character_id uuid references public.characters(id) on delete set null,
 note text not null default '',
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(section_id,roleplay_date,change_type)
);
alter table public.class_day_changes enable row level security;
grant select,insert,update,delete on public.class_day_changes to authenticated;
drop policy if exists "class_day_changes_read" on public.class_day_changes;
create policy "class_day_changes_read" on public.class_day_changes for select to authenticated using (
 public.school_staff_can_manage() or exists (
  select 1 from public.section_memberships sm join public.characters c on c.id=sm.character_id
  where sm.section_id=class_day_changes.section_id and c.owner_user_id=auth.uid()
 )
);
drop policy if exists "class_day_changes_staff_manage" on public.class_day_changes;
create policy "class_day_changes_staff_manage" on public.class_day_changes for all to authenticated using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());
