create table if not exists public.school_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null check (block_type in ('homeroom','class_period','break','lunch','closing_advisory','dismissal','club','study','extracurricular','assembly','other')),
  title text not null check (char_length(trim(title)) between 1 and 80),
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  homeroom_label text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_schedule_blocks_valid_time check (ends_at > starts_at)
);

alter table public.school_schedule_blocks enable row level security;

drop policy if exists "authenticated can read school schedule blocks" on public.school_schedule_blocks;
create policy "authenticated can read school schedule blocks"
on public.school_schedule_blocks for select to authenticated
using (true);

drop policy if exists "site admins can insert school schedule blocks" on public.school_schedule_blocks;
create policy "site admins can insert school schedule blocks"
on public.school_schedule_blocks for insert to authenticated
with check (private.account_has_permission(auth.uid(), 'site_admin'));

drop policy if exists "site admins can update school schedule blocks" on public.school_schedule_blocks;
create policy "site admins can update school schedule blocks"
on public.school_schedule_blocks for update to authenticated
using (private.account_has_permission(auth.uid(), 'site_admin'))
with check (private.account_has_permission(auth.uid(), 'site_admin'));

drop policy if exists "site admins can delete school schedule blocks" on public.school_schedule_blocks;
create policy "site admins can delete school schedule blocks"
on public.school_schedule_blocks for delete to authenticated
using (private.account_has_permission(auth.uid(), 'site_admin'));

grant select, insert, update, delete on public.school_schedule_blocks to authenticated;
revoke all on public.school_schedule_blocks from anon;

create index if not exists school_schedule_blocks_day_time_idx
on public.school_schedule_blocks(weekday, starts_at, sort_order);
