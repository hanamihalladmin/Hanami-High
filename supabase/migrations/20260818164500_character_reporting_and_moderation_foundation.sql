create type public.character_report_reason as enum ('profile_content','harassment','spam','impersonation','other');
create type public.character_report_status as enum ('open','reviewing','resolved','dismissed');

create table public.character_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_character_id uuid not null references public.characters(id) on delete cascade,
  target_character_id uuid not null references public.characters(id) on delete cascade,
  reason public.character_report_reason not null,
  details text not null default '' check (char_length(details) <= 3000),
  status public.character_report_status not null default 'open',
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text not null default '' check (char_length(review_note) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reporter_character_id <> target_character_id)
);

create index character_reports_reporter_idx on public.character_reports(reporter_character_id, created_at desc);
create index character_reports_status_idx on public.character_reports(status, created_at desc);

alter table public.character_reports enable row level security;
grant select, insert, update on public.character_reports to authenticated;
revoke delete on public.character_reports from authenticated;

create policy "characters create own reports"
on public.character_reports for insert to authenticated
with check (
  exists (
    select 1 from public.characters reporter
    where reporter.id = reporter_character_id
      and reporter.owner_user_id = (select auth.uid())
  )
  and status = 'open'
  and reviewed_by is null
  and review_note = ''
);

create policy "characters read own submitted reports"
on public.character_reports for select to authenticated
using (
  exists (
    select 1 from public.characters reporter
    where reporter.id = reporter_character_id
      and reporter.owner_user_id = (select auth.uid())
  )
);

create policy "moderators read all reports"
on public.character_reports for select to authenticated
using (private.account_has_permission((select auth.uid()), 'moderator'));

create policy "moderators update reports"
on public.character_reports for update to authenticated
using (private.account_has_permission((select auth.uid()), 'moderator'))
with check (private.account_has_permission((select auth.uid()), 'moderator'));

create or replace function public.moderation_report_queue()
returns table(
  report_id uuid,
  reason public.character_report_reason,
  status public.character_report_status,
  details text,
  review_note text,
  created_at timestamptz,
  target_character_id uuid,
  target_display_name text,
  target_handle text,
  target_role public.character_role,
  reporter_display_name text,
  reporter_handle text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.account_has_permission(auth.uid(), 'moderator') then
    raise exception 'moderator permission required';
  end if;
  return query
  select r.id, r.reason, r.status, r.details, r.review_note, r.created_at,
         target.id, target.display_name, target.handle, target.role,
         reporter.display_name, reporter.handle
  from public.character_reports r
  join public.characters target on target.id = r.target_character_id
  join public.characters reporter on reporter.id = r.reporter_character_id
  order by case r.status when 'open' then 0 when 'reviewing' then 1 else 2 end, r.created_at desc;
end;
$$;
revoke all on function public.moderation_report_queue() from public, anon;
grant execute on function public.moderation_report_queue() to authenticated;
