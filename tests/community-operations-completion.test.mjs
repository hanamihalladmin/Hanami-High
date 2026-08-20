import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("Admin and Owner have complete organization and election operations",async()=>{
 const panel=await read("app/portal/admin/AdminCommunityOperationsPanel.tsx");
 const workspace=await read("app/portal/admin/AdminWorkspace.tsx");
 for(const phrase of ["Election Lifecycle","Election Positions","Nomination Review","Organization Recruitment","Organization Applications","Open nominations","Open voting","Close voting"])assert.match(panel,new RegExp(phrase));
 assert.match(workspace,/AdminCommunityOperationsPanel/);
});

test("active election ballots show safe approved candidate identities",async()=>{
 const page=await read("app/elections/page.tsx");
 const migration=await read("supabase/migrations/20260821005000_safe_election_candidate_directory.sql");
 assert.match(page,/election_candidate_directory/);
 assert.match(page,/display_name/);
 assert.match(page,/Vote for this candidate/);
 assert.match(migration,/n\.status='approved'/);
 assert.match(migration,/e\.status in \('voting','closed','archived'\)/);
 assert.match(migration,/grant execute .* to authenticated/);
});
