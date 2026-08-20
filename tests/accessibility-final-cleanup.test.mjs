import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("dark mode styling is completely absent from accessibility CSS",async()=>{
 const css=await read("app/accessibility.css");
 assert.doesNotMatch(css,/hanami-theme=.?dark/i);
 assert.doesNotMatch(css,/dark-surface/i);
});

test("keyboard focus remains visibly accessible site-wide",async()=>{
 const css=await read("app/accessibility.css");
 assert.match(css,/:focus-visible/);
 assert.match(css,/outline:3px solid #17375f/);
 assert.match(css,/outline-offset:3px/);
});
