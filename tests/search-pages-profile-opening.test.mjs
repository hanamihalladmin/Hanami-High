import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const search=fs.readFileSync("app/portal/SearchEverythingPanel.tsx","utf8");
const bridge=fs.readFileSync("app/components/ProfileOpenBridge.tsx","utf8");
const dashboard=fs.readFileSync("app/portal/DashboardShell.tsx","utf8");

test("Search Everything includes the shipped website and portal page index",()=>{
 for(const page of ["About Hanami","Academics","Campus Life","School Calendar","Organizations","Sports","Elections","Homeroom","Rooms","Traditions","Rules & Conduct","Apply","Website Updates","Changelog","Portal Help","Hanami City","Roadmap Hub","Lore & Canon"]) assert.match(search,new RegExp(page.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
 assert.match(search,/kind:"Website Page"/);
 assert.match(search,/Open page →/);
});

test("people results expose one-click profile opening",()=>{
 assert.match(search,/profileHandle:row\.handle/);
 assert.match(search,/hanami-open-profile/);
 assert.match(search,/Open profile →/);
 assert.match(bridge,/form\.requestSubmit\(\)/);
 assert.match(dashboard,/ProfileLookupPanel accessToken=\{accessToken\} viewerCharacterId=\{character\.id\}/);
 assert.match(dashboard,/SearchEverythingPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
});
