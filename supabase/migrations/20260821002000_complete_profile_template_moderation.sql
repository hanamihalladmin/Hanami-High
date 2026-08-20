alter table public.profile_template_library drop constraint if exists profile_template_library_status_check;
alter table public.profile_template_library add constraint profile_template_library_status_check check (status in ('draft','pending_review','published','rejected'));
drop policy if exists "owners update own draft templates" on public.profile_template_library;
create policy "owners update own draft templates" on public.profile_template_library for update to authenticated
using (exists(select 1 from public.characters c where c.id=profile_template_library.owner_character_id and c.owner_user_id=auth.uid()) and status in ('draft','rejected'))
with check (exists(select 1 from public.characters c where c.id=profile_template_library.owner_character_id and c.owner_user_id=auth.uid()) and status in ('draft','pending_review'));
drop policy if exists "content staff review profile templates" on public.profile_template_library;
create policy "content staff review profile templates" on public.profile_template_library for update to authenticated
using (private.account_has_permission(auth.uid(),'content_editor'::hanami_account_permission) or private.account_has_permission(auth.uid(),'site_admin'::hanami_account_permission) or private.is_owner_discord_user())
with check (private.account_has_permission(auth.uid(),'content_editor'::hanami_account_permission) or private.account_has_permission(auth.uid(),'site_admin'::hanami_account_permission) or private.is_owner_discord_user());
create or replace function public.submit_profile_template_for_review(target_template_id uuid,target_character_id uuid)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid()) then return false; end if;
 update public.profile_template_library set status='pending_review',updated_at=now() where id=target_template_id and owner_character_id=target_character_id and status in ('draft','rejected');
 if not found then return false; end if;
 insert into public.content_approval_queue(content_type,source_id,submitted_by_user_id,submitted_by_character_id,title,summary,payload,status,submitted_at,updated_at)
 select 'profile_template',t.id::text,auth.uid(),t.owner_character_id,t.title,t.description,jsonb_build_object('template_id',t.id),'pending',now(),now() from public.profile_template_library t where t.id=target_template_id;
 return true;
end;$$;
revoke all on function public.submit_profile_template_for_review(uuid,uuid) from public,anon;
grant execute on function public.submit_profile_template_for_review(uuid,uuid) to authenticated;
create or replace function public.sync_profile_template_approval() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.content_type='profile_template' and new.source_id is not null and new.status is distinct from old.status then
   if new.status='approved' then update public.profile_template_library set status='published',updated_at=now() where id=new.source_id::uuid;
   elsif new.status in ('rejected','dismissed') then update public.profile_template_library set status='rejected',updated_at=now() where id=new.source_id::uuid;
   end if;
 end if;
 return new;
exception when invalid_text_representation then return new;
end;$$;
revoke all on function public.sync_profile_template_approval() from public,anon,authenticated;
drop trigger if exists sync_profile_template_approval_trigger on public.content_approval_queue;
create trigger sync_profile_template_approval_trigger after update of status on public.content_approval_queue for each row execute function public.sync_profile_template_approval();
