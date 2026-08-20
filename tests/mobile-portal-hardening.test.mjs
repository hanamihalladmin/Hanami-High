import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("mobile layer contains portal-safe overflow and form hardening",async()=>{
 const css=await read("app/mobile.css");
 for(const token of ["overflow-x:hidden","overflow-x:auto","-webkit-overflow-scrolling:touch","max-width:100%","box-sizing:border-box","overflow-wrap:anywhere","font-size:16px!important"])assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/table\{display:block;width:100%;overflow-x:auto/);
});
