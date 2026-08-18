create type public.office_request_type as enum ('schedule_change','records','club_paperwork','technical_help','general');
create type public.office_request_status as enum ('submitted','in_review','waiting_on_member','resolved','closed');

create table public.school_office_requests (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  request_type public.office_request_type not null,
  subject text not null check (char_length(subject) between 2 and 140),
  body text not null check (char_length(body) between 1 and 5000),
  status public.office_request_status not null default 'submitted',
  staff_note text not null default '' check (char_length(staff_note) <= 5000),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index school_office_requests_character_idx on public.school_office_requests(character_id,created_at desc);
create index school_office_requests_status_idx on public.school_office_requests(status,created_at asc);

alter table public.school_office_requests enable row level security;
revoke delete on public.school_office_requests from authenticated;
grant select,insert,update on public.school_office_requests to authenticated;

create policy "members read own office requests"
on public.school_office_requests for select to authenticated
using (exists(select 1 from public.characters c where c.id=school_office_requests.character_id and c.owner_user_id=(select auth.uid())));

create policy "members create own office requests"
on public.school_office_requests for insert to authenticated
with check (
  exists(select 1 from public.characters c where c.id=school_office_requests.character_id and c.owner_user_id=(select auth.uid()))
  and status='submitted' and staff_note='' and assigned_to is null and closed_at is null
);

create policy "members update waiting office requests"
on public.school_office_requests for update to authenticated
using (
  status='waiting_on_member'
  and exists(select 1 from public.characters c where c.id=school_office_requests.character_id and c.owner_user_id=(select auth.uid()))
)
with check (
  exists(select 1 from public.characters c where c.id=school_office_requests.character_id and c.owner_user_id=(select auth.uid()))
  and status in ('submitted','waiting_on_member')
  and staff_note='' and assigned_to is null and closed_at is null
);

create policy "office staff read all office requests"
on public.school_office_requests for select to authenticated
using (
  private.account_has_permission((select auth.uid()),'site_admin')
  or private.account_has_permission((select auth.uid()),'content_editor')
);

create policy "office staff update office requests"
on public.school_office_requests for update to authenticated
using (
  private.account_has_permission((select auth.uid()),'site_admin')
  or private.account_has_permission((select auth.uid()),'content_editor')
)
with check (
  private.account_has_permission((select auth.uid()),'site_admin')
  or private.account_has_permission((select auth.uid()),'content_editor')
);

create or replace function private.office_request_queue_internal()
returns table(
  request_id uuid,
  request_type public.office_request_type,
  status public.office_request_status,
  subject text,
  body text,
  staff_note text,
  created_at timestamptz,
  updated_at timestamptz,
  character_id uuid,
  display_name text,
  handle text,
  role public.character_role
)
language plpgsql
security definer
set search_path=public,private
as $$
begin
  if not (
    private.account_has_permission(auth.uid(),'site_admin')
    or private.account_has_permission(auth.uid(),'content_editor')
  ) then
    raise exception 'office staff permission required';
  end if;

  return query
  select r.id,r.request_type,r.status,r.subject,r.body,r.staff_note,
         r.created_at,r.updated_at,c.id,c.display_name,c.handle,c.role
  from public.school_office_requests r
  join public.characters c on c.id=r.character_id
  order by case r.status
    when 'submitted' then 0
    when 'in_review' then 1
    when 'waiting_on_member' then 2
    when 'resolved' then 3
    else 4
  end,r.created_at asc;
end;
$$;
revoke all on function private.office_request_queue_internal() from public,anon;
grant execute on function private.office_request_queue_internal() to authenticated;

create or replace function public.office_request_queue()
returns table(
  request_id uuid,
  request_type public.office_request_type,
  status public.office_request_status,
  subject text,
  body text,
  staff_note text,
  created_at timestamptz,
  updated_at timestamptz,
  character_id uuid,
  display_name text,
  handle text,
  role public.character_role
)
language sql
security invoker
set search_path=public,private
as $$ select * from private.office_request_queue_internal(); $$;
revoke all on function public.office_request_queue() from public,anon;
grant execute on function public.office_request_queue() to authenticated;
