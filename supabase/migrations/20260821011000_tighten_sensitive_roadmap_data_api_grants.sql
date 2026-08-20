revoke all privileges on table
 public.school_rumors,
 public.profile_named_visits,
 public.event_rsvps,
 public.study_match_profiles,
 public.activity_signup_entries,
 public.volunteer_hours,
 public.student_work_shifts,
 public.character_archives,
 public.profile_template_library,
 public.conversation_messages,
 public.message_attachments
from anon;

revoke all privileges on table
 public.school_rumors,
 public.profile_named_visits,
 public.event_rsvps,
 public.study_match_profiles,
 public.activity_signup_entries,
 public.volunteer_hours,
 public.student_work_shifts,
 public.character_archives,
 public.profile_template_library,
 public.conversation_messages,
 public.message_attachments
from authenticated;

grant select, insert, update, delete on table
 public.school_rumors,
 public.profile_named_visits,
 public.event_rsvps,
 public.study_match_profiles,
 public.activity_signup_entries,
 public.volunteer_hours,
 public.student_work_shifts,
 public.character_archives,
 public.profile_template_library,
 public.conversation_messages,
 public.message_attachments
to authenticated;
