create unique index if not exists school_memory_timeline_roleplay_session_unique on public.school_memory_timeline(source_type,source_id) where source_type='roleplay_session' and source_id is not null;
create unique index if not exists roleplay_continuity_session_auto_unique on public.roleplay_continuity_archive(session_id,entry_type) where session_id is not null and entry_type='session_archive';

create or replace function public.materialize_roleplay_archive_memory()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  rp_day date;
begin
  if new.status='archived' and old.status is distinct from 'archived' then
    rp_day:=make_date(2006,extract(month from timezone('Asia/Tokyo',coalesce(new.ends_at,new.updated_at,new.created_at)))::int,extract(day from timezone('Asia/Tokyo',coalesce(new.ends_at,new.updated_at,new.created_at)))::int);

    insert into public.roleplay_continuity_archive(session_id,entry_type,title,summary,payload,sort_date,created_by)
    values(new.id,'session_archive',new.title,coalesce(nullif(new.summary,''),'Roleplay chapter archived.'),jsonb_build_object('code',new.code,'chapter_number',new.chapter_number,'season',new.season,'school_year',new.school_year),rp_day,new.created_by)
    on conflict (session_id,entry_type) where session_id is not null and entry_type='session_archive' do update
    set title=excluded.title,summary=excluded.summary,payload=excluded.payload,sort_date=excluded.sort_date;

    insert into public.school_memory_timeline(title,summary,category,scope,target_id,roleplay_date,source_type,source_id,visibility,created_by)
    values(new.title,coalesce(nullif(new.summary,''),'A major Hanami roleplay chapter concluded.'),'roleplay','schoolwide',null,rp_day,'roleplay_session',new.id,'public',new.created_by)
    on conflict (source_type,source_id) where source_type='roleplay_session' and source_id is not null do update
    set title=excluded.title,summary=excluded.summary,roleplay_date=excluded.roleplay_date,visibility='public';
  end if;
  return new;
end;
$$;

drop trigger if exists roleplay_archive_memory_trigger on public.roleplay_sessions;
create trigger roleplay_archive_memory_trigger
after update of status on public.roleplay_sessions
for each row execute function public.materialize_roleplay_archive_memory();
