import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const workspace=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const commandCenter=await readFile(new URL("../app/portal/admin/AdminCommandCenter.tsx",import.meta.url),"utf8");
const reports=await readFile(new URL("../app/portal/admin/AdminReportsOverview.tsx",import.meta.url),"utf8");
const website=await readFile(new URL("../app/portal/admin/AdminWebsiteOverview.tsx",import.meta.url),"utf8");
const settings=await readFile(new URL("../app/portal/admin/AdminSettingsOverview.tsx",import.meta.url),"utf8");

const canonical=["Dashboard","People","Academics","Communications","Campus","Events","Moderation","Website","Reports","Settings"];

test("Phase 9 Admin uses the canonical ten-section OperationsShell while Owner remains separate",()=>{
 for(const label of canonical)assert.match(workspace,new RegExp(`\\\"${label}\\\"`));
 assert.match(workspace,/const ownerNav/);
 assert.match(workspace,/Classrooms/);
 assert.match(workspace,/ownerMode\?ownerNav:adminNav/);
});

test("Admin tools are filtered by the same role predicates used by their managers",()=>{
 assert.match(workspace,/function canUseTool/);
 assert.match(workspace,/access\.site_admin/);
 assert.match(workspace,/canEditContent/);
 assert.match(workspace,/canModerate/);
 assert.match(workspace,/filter\(\(\[id\]\)=>canUseTool\(id\)\)/);
 assert.match(workspace,/if\(!canUseTool\(requestedTool\)\)return/);
});

test("Website Reports and Settings have permission-aware landing views",()=>{
 assert.match(workspace,/websiteOverview/);
 assert.match(workspace,/reportsOverview/);
 assert.match(workspace,/settingsOverview/);
 assert.match(website,/School Publishing/);
 assert.match(website,/Website Roadmap/);
 assert.match(settings,/Governance/);
 assert.match(settings,/Economy & Exchange/);
 assert.match(settings,/Roleplay Systems/);
 assert.match(reports,/Staff Analytics/);
 assert.match(reports,/Continuity Archive/);
});

test("Administration dashboard quick actions use canonical destinations and hide unauthorized actions",()=>{
 assert.match(commandCenter,/view:\"communications\",tool:\"requests\"/);
 assert.match(commandCenter,/view:\"communications\",tool:\"tickets\"/);
 assert.match(commandCenter,/view:\"people\",tool:\"applications\"/);
 assert.match(commandCenter,/view:\"campus\",tool:\"campusOps\"/);
 assert.match(commandCenter,/access\.site_admin/);
 assert.match(commandCenter,/access\.content_editor/);
 assert.match(commandCenter,/access\.moderator/);
});
