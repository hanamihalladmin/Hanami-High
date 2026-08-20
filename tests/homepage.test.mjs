import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const liveAnnouncements = await readFile(new URL("../app/components/live-announcements.tsx", import.meta.url), "utf8");
const liveNextEvent = await readFile(new URL("../app/components/live-next-event.tsx", import.meta.url), "utf8");
const liveSchoolStatus = await readFile(new URL("../app/components/live-school-status.tsx", import.meta.url), "utf8");
const search = await readFile(new URL("../app/components/site-search.tsx", import.meta.url), "utf8");
const roleplayDate = await readFile(new URL("../app/components/roleplay-date.ts", import.meta.url), "utf8");
const env = await readFile(new URL("../.env.example", import.meta.url), "utf8");

test("homepage includes every approved public-home requirement", () => {
  for (const expected of ["HANAMI HIGH SCHOOL", "ACADEMIC HIGHLIGHTS", "TODAY AT HANAMI", "QUICK LINKS", "Student Login", "Faculty Login"]) assert.match(page, new RegExp(expected));
  assert.match(page, /LiveAnnouncements/);assert.match(page, /LiveNextEvent/);assert.match(page, /LiveSchoolStatus/);assert.match(liveAnnouncements, /FEATURED ANNOUNCEMENT/);assert.match(liveAnnouncements, /LATEST NEWS/);assert.match(liveAnnouncements, /site_announcements/);assert.match(liveNextEvent, /NEXT BIG EVENT/);assert.match(liveNextEvent, /school_calendar_events/);assert.match(liveSchoolStatus, /SCHOOL STATUS:/);assert.match(liveSchoolStatus, /school_status_config/);assert.match(search, /SEARCH THE SCHOOL NETWORK/);
});

test("public announcements use live Supabase data with a clean empty state",()=>{assert.match(liveAnnouncements,/apikey:SUPABASE_PUBLISHABLE_KEY/);assert.match(liveAnnouncements,/No announcements published yet/);assert.doesNotMatch(liveAnnouncements,/FALLBACK PREVIEW|is_test_data|service_role/i);});
test("public next event uses the live school calendar with a clean empty state",()=>{assert.match(liveNextEvent,/apikey:SUPABASE_PUBLISHABLE_KEY/);assert.match(liveNextEvent,/No upcoming school event has been published yet/);assert.doesNotMatch(liveNextEvent,/Fallback preview|is_test_data/i);assert.match(liveNextEvent,/timeZone:"Asia\/Tokyo"/);});
test("public school status reads the Administration status record",()=>{assert.match(liveSchoolStatus,/apikey:SUPABASE_PUBLISHABLE_KEY/);assert.match(liveSchoolStatus,/status:"open"/);assert.match(liveSchoolStatus,/row\.status\.toUpperCase\(\)/);assert.doesNotMatch(liveSchoolStatus,/service_role/i);});
test("roleplay locale is Tokyo and public chronology is fixed to 2006", () => {assert.match(page,/hanamiRoleplayDate/);assert.match(roleplayDate,/HANAMI_ROLEPLAY_YEAR=2006/);assert.match(roleplayDate,/timeZone:"Asia\/Tokyo"/);assert.match(liveAnnouncements,/timeZone:"Asia\/Tokyo"/);assert.match(liveNextEvent,/timeZone:"Asia\/Tokyo"/);assert.match(env,/NEXT_PUBLIC_WEATHER_LOCATION=Tokyo, Japan/);assert.match(page,/ONLINE • 2006/);assert.match(page,/EST\. 1836/);});
test("Supabase secrets are not committed", () => {assert.match(env,/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace_/);assert.doesNotMatch(env,/service[_-]role/i);});
