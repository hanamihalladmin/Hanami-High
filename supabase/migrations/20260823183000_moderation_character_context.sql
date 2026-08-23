create or replace function public.moderation_character_context(target_character_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','private'
as $function$
declare result jsonb;
begin
  if not (
    coalesce(public.current_owner_status(),false)
    or exists(select 1 from public.account_permissions ap where ap.user_id=auth.uid() and ap.permission::text in ('site_admin','moderator'))
  ) then
    raise exception 'Moderator permission required.';
  end if;

  select jsonb_build_object(
    'journals',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'title',j.title,'body',j.body,'visibility',j.visibility,'created_at',j.created_at) order by j.created_at desc) from (select * from public.character_journals where character_id=$1 order by created_at desc limit 8) j),'[]'::jsonb),
    'guestbook_authored',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'profile_character_id',g.profile_character_id,'body',g.body,'status',g.status,'reported',g.reported,'entry_mode',g.entry_mode,'created_at',g.created_at) order by g.created_at desc) from (select * from public.profile_guestbook_entries where author_character_id=$1 order by created_at desc limit 8) g),'[]'::jsonb),
    'guestbook_received',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'author_character_id',g.author_character_id,'body',g.body,'status',g.status,'reported',g.reported,'entry_mode',g.entry_mode,'created_at',g.created_at) order by g.created_at desc) from (select * from public.profile_guestbook_entries where profile_character_id=$1 order by created_at desc limit 8) g),'[]'::jsonb),
    'rumors',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'display_alias',r.display_alias,'rumor_text',r.rumor_text,'status',r.status,'created_at',r.created_at) order by r.created_at desc) from (select * from public.school_rumors where submitted_by_character_id=$1 order by created_at desc limit 8) r),'[]'::jsonb),
    'confessions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'status',c.status,'is_anonymous',c.is_anonymous,'moderator_note',c.moderator_note,'created_at',c.created_at) order by c.created_at desc) from (select * from public.school_confessions where author_character_id=$1 order by created_at desc limit 8) c),'[]'::jsonb),
    'report_history',coalesce((select jsonb_agg(jsonb_build_object('id',cr.id,'reason',cr.reason,'details',cr.details,'status',cr.status,'review_note',cr.review_note,'created_at',cr.created_at,'updated_at',cr.updated_at) order by cr.created_at desc) from (select * from public.character_reports where target_character_id=$1 order by created_at desc limit 12) cr),'[]'::jsonb)
  ) into result;
  return result;
end;
$function$;
revoke all on function public.moderation_character_context(uuid) from public,anon;
grant execute on function public.moderation_character_context(uuid) to authenticated;
