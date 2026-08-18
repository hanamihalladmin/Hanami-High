import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const about = await readFile(new URL("../app/about/page.tsx", import.meta.url), "utf8");
const directory = await readFile(new URL("../app/components/faculty-directory.tsx", import.meta.url), "utf8");

test("About Hanami includes all approved public requirements", () => {
  for (const expected of ["OUR STORY", "MISSION & VALUES", "SCHOOL LEADERSHIP", "HANAMI TRADITIONS", "SCHOOL AT A GLANCE", "CONTACT INFORMATION"]) {
    assert.match(about, new RegExp(expected));
  }
  assert.match(about, /FacultyDirectory/);
});

test("faculty directory supports search and department filters", () => {
  assert.match(directory, /type="search"/);
  assert.match(directory, /<select/);
  assert.match(directory, /aria-live="polite"/);
});

test("About dates follow the Tokyo roleplay timezone", () => {
  assert.match(about, /timeZone: "Asia\/Tokyo"/);
});
