create or replace function private.enforce_profile_widget_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  existing_count integer;
begin
  if tg_op = 'INSERT' or old.character_id is distinct from new.character_id then
    select count(*)::integer
      into existing_count
      from public.character_profile_widgets
     where character_id = new.character_id;

    if existing_count >= 40 then
      raise exception using
        errcode = 'check_violation',
        message = 'Each Hanami character page can have at most 40 widgets.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_profile_widget_limit() from public;

drop trigger if exists enforce_profile_canvas_capacity on public.character_profile_widgets;
drop trigger if exists enforce_profile_widget_limit on public.character_profile_widgets;

create trigger enforce_profile_widget_limit
before insert or update of character_id on public.character_profile_widgets
for each row execute function private.enforce_profile_widget_limit();

drop function if exists private.enforce_profile_canvas_capacity();
