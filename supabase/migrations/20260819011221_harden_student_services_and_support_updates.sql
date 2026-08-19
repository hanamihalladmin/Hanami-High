drop policy if exists "students manage own counseling" on public.counseling_appointments;
create policy "students read own counseling" on public.counseling_appointments for select to authenticated using (
  exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
);
create policy "students request own counseling" on public.counseling_appointments for insert to authenticated with check (
  status='requested' and counselor_name is null and appointment_at is null and location is null and staff_note='' and
  exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student')
);
create policy "students cancel own counseling" on public.counseling_appointments for update to authenticated using (
  status in ('requested','scheduled') and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
) with check (
  status='cancelled' and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
);

create or replace function private.protect_counseling_student_update() returns trigger
language plpgsql security definer set search_path=public,private,auth as $$
begin
  if private.can_manage_school_operations(auth.uid()) then return new; end if;
  if exists(select 1 from public.characters c where c.id=old.student_character_id and c.owner_user_id=auth.uid()) then
    if new.student_character_id<>old.student_character_id or new.request_type<>old.request_type or new.student_note<>old.student_note or new.counselor_name is distinct from old.counselor_name or new.appointment_at is distinct from old.appointment_at or new.location is distinct from old.location or new.staff_note<>old.staff_note or new.status<>'cancelled' then
      raise exception 'Students may only cancel their own counseling request';
    end if;
  end if;
  return new;
end;$$;
drop trigger if exists trg_protect_counseling_student_update on public.counseling_appointments;
create trigger trg_protect_counseling_student_update before update on public.counseling_appointments for each row execute function private.protect_counseling_student_update();

drop policy if exists "students manage own health visits" on public.health_office_visits;
create policy "students read own health visits" on public.health_office_visits for select to authenticated using (
  exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
);
create policy "students request own health visits" on public.health_office_visits for insert to authenticated with check (
  status='requested' and staff_response='' and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student')
);
create policy "students cancel own health visits" on public.health_office_visits for update to authenticated using (
  status in ('requested','scheduled') and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
) with check (
  status='cancelled' and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
);

create or replace function private.protect_health_student_update() returns trigger
language plpgsql security definer set search_path=public,private,auth as $$
begin
  if private.account_has_permission(auth.uid(),'site_admin') then return new; end if;
  if exists(select 1 from public.characters c where c.id=old.student_character_id and c.owner_user_id=auth.uid()) then
    if new.student_character_id<>old.student_character_id or new.reason<>old.reason or new.requested_for is distinct from old.requested_for or new.staff_response<>old.staff_response or new.status<>'cancelled' then
      raise exception 'Students may only cancel their own Health Office request';
    end if;
  end if;
  return new;
end;$$;
drop trigger if exists trg_protect_health_student_update on public.health_office_visits;
create trigger trg_protect_health_student_update before update on public.health_office_visits for each row execute function private.protect_health_student_update();

drop policy if exists "students manage own organization applications" on public.organization_applications;
create policy "students read own organization applications" on public.organization_applications for select to authenticated using (
  exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
);
create policy "students submit own organization applications" on public.organization_applications for insert to authenticated with check (
  status='submitted' and staff_response='' and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student')
);
create policy "students withdraw own organization applications" on public.organization_applications for update to authenticated using (
  status in ('submitted','under_review') and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
) with check (
  status='withdrawn' and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())
);

create or replace function private.protect_organization_application_student_update() returns trigger
language plpgsql security definer set search_path=public,private,auth as $$
begin
  if private.can_manage_school_operations(auth.uid()) then return new; end if;
  if exists(select 1 from public.characters c where c.id=old.student_character_id and c.owner_user_id=auth.uid()) then
    if new.activity_id<>old.activity_id or new.student_character_id<>old.student_character_id or new.statement<>old.statement or new.staff_response<>old.staff_response or new.status<>'withdrawn' then
      raise exception 'Students may only withdraw their own organization application';
    end if;
  end if;
  return new;
end;$$;
drop trigger if exists trg_protect_organization_application_student_update on public.organization_applications;
create trigger trg_protect_organization_application_student_update before update on public.organization_applications for each row execute function private.protect_organization_application_student_update();

drop policy if exists "requesters create support tickets" on public.support_tickets;
create policy "requesters create support tickets" on public.support_tickets for insert to authenticated with check (
  requester_user_id=auth.uid() and status='open' and assigned_to is null and priority in ('low','normal','high')
);

create or replace function private.set_support_message_staff_flag() returns trigger
language plpgsql security definer set search_path=public,private,auth as $$
begin
  new.author_user_id=auth.uid();
  new.is_staff_reply=private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator');
  return new;
end;$$;
drop trigger if exists trg_set_support_message_staff_flag on public.support_ticket_messages;
create trigger trg_set_support_message_staff_flag before insert on public.support_ticket_messages for each row execute function private.set_support_message_staff_flag();
