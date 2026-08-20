import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const profile=fs.readFileSync("app/portal/ProfileLookupPanel.tsx","utf8");

test("profile viewer renders the full saved canvas rather than truncating tall profiles",()=>{
 assert.match(profile,/height:design\.canvas\.canvas_height\*scale/);
 assert.doesNotMatch(profile,/Math\.min\(design\.canvas\.canvas_height\*scale,760\)/);
 assert.match(profile,/design\.canvas\.canvas_width/);
 assert.match(profile,/design\.canvas\.canvas_height/);
});

test("profile viewer signs and renders all photo strip media",()=>{
 assert.match(profile,/function photoPaths/);
 assert.match(profile,/flatMap\(widget=>\[widget\.content\.storage_path,\.\.\.photoPaths\(widget\)\]\)/);
 assert.match(profile,/sources\.map/);
});

test("profile viewer honors Studio image fit and appearance controls",()=>{
 for(const token of ["objectFit","objectPosition","borderWidth","borderStyle","borderColor","boxShadow","flipX","flipY"]) assert.match(profile,new RegExp(token));
});
