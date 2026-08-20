import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("Hanami City content can be published and hidden without deletion",async()=>{
 const panel=await read("app/portal/admin/AdminCityLifecyclePanel.tsx");
 const workspace=await read("app/portal/admin/AdminWorkspace.tsx");
 for(const token of ["city_transit_lines","city_transit_services","city_commute_routes","city_neighborhoods","Published","Hidden","Publish / Hide City Content"])assert.match(panel,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
 assert.match(workspace,/AdminCityLifecyclePanel/);
});
