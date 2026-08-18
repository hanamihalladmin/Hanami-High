import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const liveAnnouncements = await readFile(new URL("../app/components/live-announcements.tsx", import.meta.url), "utf8");
const liveNextEvent = await readFile(new URL("../app/components/live-next-event.tsx", import.meta.url), "utf8");
const search = await readFile(new URL("../app/components/site-search.tsx", import.meta.url), "utf8");
const env = await readFile(new URL("../.env.example", import.meta.url), "utf8");

test("homepage includes every approved public-home requirement", () => {
  for (const expected of [
    "HANAMI HIGH SCHOOL", "ACADEMIC HIGHLIGHTS", "Hanami City weather",
    "QUICK LINKS", "Student Login", "Faculty Login",
  ]) assert.match(page, new RegExp(expected));
  assert.match(page, /LiveAnnouncements/);
  assert.match(page, /LiveNextEvent/);
  assert.match(liveAnnouncements, /FEATURED ANNOUNCEMENT/);
  assert.match(liveAnnouncements, /LATEST NEWS/);
  assert.match(liveAnnouncements, /site_announcements/);
  assert.match(liveNextEvent, /NEXT BIG EVENT/);
  assert.match(liveNextEvent, /school_calendar_events/);
  assert.match(search, /SEARCH THE SCHOOL NETWORK/);
});

test("public announcements use live Supabase data with a labeled fallback",()=>{
  assert.match(liveAnnouncements,/apikey:SUPABASE_PUBLISHABLE_KEY/);
  assert.match(liveAnnouncements,/FALLBACK PREVIEW/);
  assert.match(liveAnnouncements,/is_test_data/);
  assert.doesNotMatch(liveAnnouncements,/service_role/i);
});

test("public next event uses the live school calendar with a labeled fallback",()=>{
  assert.match(liveNextEvent,/apikey:SUPABASE_PUBLISHABLE_KEY/);
  assert.match(liveNextEvent,/Fallback preview/);
  assert.match(liveNextEvent,/is_test_data/);
  assert.match(liveNextEvent,/timeZone:"Asia\/Tokyo"/);
});

test("roleplay locale is fixed to Tokyo", () => {
  assert.match(page, /timeZone: "Asia\/Tokyo"/);
  assert.match(liveAnnouncements, /timeZone:"Asia\/Tokyo"/);
  assert.match(liveNextEvent, /timeZone:"Asia\/Tokyo"/);
  assert.match(env, /NEXT_PUBLIC_WEATHER_LOCATION=Tokyo, Japan/);
});

test("Supabase secrets are not committed", () => {
  assert.match(env, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace_/);
  assert.doesNotMatch(env, /service[_-]role/i);
});
