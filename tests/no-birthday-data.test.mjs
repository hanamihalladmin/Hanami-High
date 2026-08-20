import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";
import {extname,join} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const allowedExtensions=new Set([".ts",".tsx",".js",".mjs",".sql",".json"]);
const forbidden=/\b(?:birthday|birth_date|date_of_birth)\b/i;

async function scan(relative){
 const absolute=join(root,relative);
 const entries=await readdir(absolute,{withFileTypes:true});
 const matches=[];
 for(const entry of entries){
  const child=join(relative,entry.name);
  if(entry.isDirectory()){matches.push(...await scan(child));continue;}
  if(!allowedExtensions.has(extname(entry.name)))continue;
  const source=await readFile(join(root,child),"utf8");
  if(forbidden.test(source))matches.push(child);
 }
 return matches;
}

test("Hanami High does not collect or store birthdays",async()=>{
 const matches=[...await scan("app"),...await scan("supabase/migrations")];
 assert.deepEqual(matches,[],`Birthday/date-of-birth fields are intentionally out of scope. Found references in: ${matches.join(", ")}`);
});
