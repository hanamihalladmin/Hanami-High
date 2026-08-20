import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("Lore Wiki supports full editorial updates",async()=>{
 const panel=await read("app/portal/admin/AdminLoreCanonEditor.tsx");
 const workspace=await read("app/portal/admin/AdminWorkspace.tsx");
 for(const phrase of ["Living Wiki & Canon Desk","Save lore article","Full lore article","Published","Archived"])assert.match(panel,new RegExp(phrase));
 assert.match(panel,/lore_pages/);
 assert.match(workspace,/AdminLoreCanonEditor/);
});

test("Canon Tracker supports reclassification retcons and source notes",async()=>{
 const panel=await read("app/portal/admin/AdminLoreCanonEditor.tsx");
 for(const phrase of ["Confirmed canon","Rumor","Headcanon","Retconned","Source\/session\/retcon note","Save canon entry"])assert.match(panel,new RegExp(phrase));
 assert.match(panel,/source_note/);
 assert.match(panel,/canon_facts/);
});
