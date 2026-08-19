import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("accessibility and notification preferences bind to signed-in user automatically",async()=>{
  const migration=await read("supabase/migrations/20260819133058_bind_member_preferences_to_auth_user.sql");
  assert.match(migration,/accessibility_preferences alter column user_id set default auth\.uid\(\)/);
  assert.match(migration,/notification_preferences alter column user_id set default auth\.uid\(\)/);
});

test("group chat creation uses a validated private helper and creator management",async()=>{
  const migration=await read("supabase/migrations/20260819133523_harden_group_chat_creation.sql");
  assert.match(migration,/private\.start_group_conversation_internal/);
  assert.match(migration,/security definer/i);
  assert.match(migration,/can_manage\)\s*values\(new_conversation_id,sender_character_id,now\(\),true\)/);
  assert.match(migration,/public\.start_group_conversation/);
  assert.match(migration,/security invoker/i);
});

test("Nurse dashboard refresh is explicit and input fields are visually defined",async()=>{
  const nurse=await read("app/portal/FacultyNurseDashboard.tsx");
  const css=await read("app/portal/FacultyNurseDashboard.module.css");
  assert.match(nurse,/Refreshing Health Office appointments/);
  assert.match(nurse,/cache:"no-store"/);
  assert.match(nurse,/refreshing\?"Refreshing…":"Refresh"/);
  assert.match(css,/border:2px solid #8fa2b5/);
  assert.match(css,/input:focus/);
});

test("School Office separates staff action waiting member and archive queues",async()=>{
  const office=await read("app/portal/admin/AdminOfficeRequestManager.tsx");
  assert.match(office,/NEEDS STAFF ACTION/);
  assert.match(office,/AWAITING MEMBER RESPONSE/);
  assert.match(office,/Completed \/ archive/);
  assert.match(office,/removed from the active staff queue/);
});

test("Help has a direct router and support anchor",async()=>{
  const help=await read("app/portal/help/page.tsx");
  const support=await read("app/portal/SupportTicketPanel.tsx");
  const gateway=await read("app/portal/page.tsx");
  assert.match(help,/\/portal\/faculty\/#help/);
  assert.match(help,/\/portal\/student\/#help/);
  assert.match(support,/id="help"/);
  assert.match(gateway,/href="\.\/help\/"/);
});
