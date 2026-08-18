import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

async function sourceFiles(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const full=path.join(directory,entry.name);
    if(entry.isDirectory()) files.push(...await sourceFiles(full));
    else if(/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

test("application never opens an external email client",async()=>{
  for(const file of await sourceFiles(fileURLToPath(new URL("../app",import.meta.url)))){
    const source=await readFile(file,"utf8");
    assert.doesNotMatch(source,/mailto:/i,`${file} contains a forbidden mailto link`);
  }
});

test("communication architecture requires authenticated in-site messaging",async()=>{
  const policy=await readFile(new URL("../docs/communication-system.md",import.meta.url),"utf8");
  assert.match(policy,/website-native/); assert.match(policy,/Row Level Security/); assert.match(policy,/internal teacher conversation/);
});
