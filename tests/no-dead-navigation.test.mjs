import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../app",import.meta.url));
async function collect(dir){const rows=await readdir(dir,{withFileTypes:true});const out=[];for(const row of rows){const path=join(dir,row.name);if(row.isDirectory())out.push(...await collect(path));else if(/\.(?:tsx?|jsx?)$/.test(row.name))out.push(path);}return out;}

test("Hanami navigation contains no dead placeholder links",async()=>{
 const files=await collect(root);
 for(const path of files){const source=await readFile(path,"utf8");assert.doesNotMatch(source,/href\s*=\s*["']\s*(?:#|javascript:void\([^)]*\))?\s*["']/i,`Dead navigation found in ${path}`);}
});
