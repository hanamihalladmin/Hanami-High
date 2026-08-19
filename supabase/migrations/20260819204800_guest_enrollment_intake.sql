create table if not exists public.guest_enrollment_intakes (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(trim(applicant_name)) between 2 and 80),
  discord_username text not null check (char_length(trim(discord_username)) between 2 and 80),
  desired_role text not null check (desired_role in ('student','faculty')),
  introduction text not null check (char_length(trim(introduction)) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','reviewing','approved','declined')),
  submitted_at timestamptz not null default now()
);

alter table public.guest_enrollment_intakes enable row level security;

revoke all on table public.guest_enrollment_intakes from anon, authenticated;
grant insert on table public.guest_enrollment_intakes to anon;

create policy "guests submit enrollment intake"
on public.guest_enrollment_intakes
for insert
to anon
with check (status = 'pending');

comment on table public.guest_enrollment_intakes is 'Public guest enrollment intake. Guests may submit only; records are not publicly readable.';
