import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tools=fs.readFileSync("app/portal/ProfileStudioRoadmapTools.tsx","utf8");
const studio=fs.readFileSync("app/portal/ProfileStudioV2Panel.tsx","utf8");

test("uploaded Sticker Creator media uses the private image rendering path",()=>{
  assert.match(tools,/widget_type:"image"/);
  assert.match(tools,/media_kind:"sticker"/);
  assert.match(tools,/storage_path:path/);
  assert.match(tools,/objectFit:"contain"/);
  assert.match(tools,/Content-Type":"image\/png"/);
  assert.match(studio,/if\(widget\.widget_type==="image"\)/);
  assert.match(studio,/const src=path\?mediaUrls\[path\]:widget\.content\.url/);
});

test("seasonal emoji stickers remain real text sticker widgets",()=>{
  assert.match(tools,/widget_type:"sticker"/);
  assert.match(tools,/content:\{text:pack\.emoji\}/);
});
