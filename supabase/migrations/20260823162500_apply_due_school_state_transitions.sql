create or replace function public.apply_due_school_state_transitions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  applied_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  for rec in
    select * from public.school_state_transitions
    where applied_at is null and effective_at <= now()
    order by effective_at asc, created_at asc
    for update skip locked
  loop
    update public.school_state_config
    set day_type = coalesce(rec.day_type, day_type),
        closure_state = coalesce(rec.closure_state, closure_state),
        exam_week = coalesce(rec.exam_week, exam_week),
        festival_mode = coalesce(rec.festival_mode, festival_mode),
        election_mode = coalesce(rec.election_mode, election_mode),
        seasonal_state = coalesce(rec.seasonal_state, seasonal_state),
        rp_focus = coalesce(rec.rp_focus, rp_focus),
        status_message = coalesce(rec.status_message, status_message),
        updated_at = now()
    where id = 1;

    update public.school_state_transitions
    set applied_at = now()
    where id = rec.id;

    applied_count := applied_count + 1;
  end loop;

  return applied_count;
end;
$$;

revoke all on function public.apply_due_school_state_transitions() from public;
grant execute on function public.apply_due_school_state_transitions() to authenticated;
