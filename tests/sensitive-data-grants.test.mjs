import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("sensitive roadmap and messaging tables deny anon and keep narrow authenticated grants",async()=>{
 const sql=(await read("supabase/migrations/20260821011000_tighten_sensitive_roadmap_data_api_grants.sql")).toLowerCase();
 const tables=["school_rumors","profile_named_visits","event_rsvps","study_match_profiles","activity_signup_entries","volunteer_hours","student_work_shifts","character_archives","profile_template_library","conversation_messages","message_attachments"];
 for(const table of tables)assert.match(sql,new RegExp(`public\\.${table}`));
 assert.match(sql,/revoke all privileges[\s\S]*from anon;/);
 assert.match(sql,/revoke all privileges[\s\S]*from authenticated;/);
 assert.match(sql,/grant select, insert, update, delete[\s\S]*to authenticated;/);
 assert.doesNotMatch(sql,/grant[^;]*(?:truncate|trigger|references)[^;]*to authenticated;/);
 assert.doesNotMatch(sql,/grant[^;]*to anon;/);
});
