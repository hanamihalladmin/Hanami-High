import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const resources=await readFile(new URL("../app/portal/SchoolResourcesPanel.tsx",import.meta.url),"utf8");

test("normal School Resources never loads or renders form submission history",()=>{
  const loadBlock=resources.slice(resources.indexOf("const load="),resources.indexOf("async function submitForm"));
  assert.doesNotMatch(loadBlock,/school_form_submissions/);
  assert.doesNotMatch(resources,/Recent submissions/);
  assert.doesNotMatch(resources,/created_at.*status|status.*created_at/);
  assert.match(resources,/Submission history is private to the Owner portal/);
});

test("normal users can still submit school forms without reading history",()=>{
  const submitBlock=resources.slice(resources.indexOf("async function submitForm"),resources.indexOf("async function downloadDocument"));
  assert.match(submitBlock,/school_form_submissions/);
  assert.match(submitBlock,/method:"POST"/);
  assert.doesNotMatch(submitBlock,/method:"GET"/);
  assert.doesNotMatch(submitBlock,/created_at/);
});
