import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../app");
const jp=/[\u3040-\u30ff\u3400-\u9fff]/u;
async function walk(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else if(/\.(?:ts|tsx|js|jsx|css)$/.test(entry.name))out.push(full);}return out;}

test("website source contains no Japanese translations or Japanese-script branding",async()=>{
 const files=await walk(root);const offenders=[];
 for(const file of files){const text=await readFile(file,"utf8");if(jp.test(text))offenders.push(path.relative(root,file));}
 assert.deepEqual(offenders,[],`Japanese-script UI remains in: ${offenders.join(", ")}`);
});
