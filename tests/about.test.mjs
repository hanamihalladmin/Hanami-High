import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const about = await readFile(new URL("../app/about/page.tsx", import.meta.url), "utf8");
const directory = await readFile(new URL("../app/components/faculty-directory.tsx", import.meta.url), "utf8");
const roleplayDate = await readFile(new URL("../app/components/roleplay-date.ts", import.meta.url), "utf8");

test("About Hanami includes all approved public requirements", () => {
  for (const expected of ["OUR STORY", "MISSION & VALUES", "SCHOOL LEADERSHIP", "HANAMI TRADITIONS", "SCHOOL AT A GLANCE", "CONTACT INFORMATION"]) assert.match(about, new RegExp(expected));
  assert.match(about, /FacultyDirectory/);
});

test("faculty directory supports search and department filters", () => {
  assert.match(directory, /type="search"/);
  assert.match(directory, /<select/);
  assert.match(directory, /aria-live="polite"/);
});

test("About keeps the shared Tokyo 2006 roleplay clock while preserving 1836 school history", () => {
  assert.match(about, /hanamiRoleplayDate/);
  assert.match(roleplayDate, /HANAMI_ROLEPLAY_YEAR=2006/);
  assert.match(roleplayDate, /timeZone:"Asia\/Tokyo"/);
  assert.match(about, /EST\. 1836/);
  assert.doesNotMatch(about, /INAUGURAL YEAR • 2006/);
});

test("About and Contact use real portal routes",()=>{
  assert.doesNotMatch(about,/#portal-access/);
  assert.match(about,/href="\.\.\/portal\/"/);
  assert.match(about,/href="\.\.\/portal\/student\/"/);
  assert.match(about,/href="\.\.\/calendar\/"/);
});
