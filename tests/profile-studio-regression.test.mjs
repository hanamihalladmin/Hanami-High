import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const studio=await readFile(new URL("../app/portal/ProfileStudioV2Panel.tsx",import.meta.url),"utf8");
const workspace=await readFile(new URL("../app/portal/ProfileDesignWorkspace.tsx",import.meta.url),"utf8");
const presets=await readFile(new URL("../app/portal/ProfileDecorativePresetGallery.tsx",import.meta.url),"utf8");
const overrides=await readFile(new URL("../app/profile-studio-overrides.css",import.meta.url),"utf8");
const layout=await readFile(new URL("../app/layout.tsx",import.meta.url),"utf8");

test("Profile Studio keeps image upload controls visible",()=>{
  assert.match(studio,/IMAGE_TYPES/);
  assert.match(studio,/MAX_IMAGE_SIZE/);
  assert.match(studio,/uploadPath\(characterId:string,file:File/);
  assert.match(studio,/profile-media/);
  assert.match(overrides,/uploadField/);
  assert.match(overrides,/input\[type="file"\]/);
  assert.match(overrides,/display:block!important/);
  assert.match(layout,/profile-studio-overrides\.css/);
});

test("Profile Studio exposes a decorative preset library",()=>{
  assert.match(workspace,/ProfileDecorativePresetGallery/);
  assert.match(presets,/Dividers/);
  assert.match(presets,/Stickers/);
  assert.match(presets,/Badges/);
  assert.match(presets,/Cards/);
  assert.match(presets,/Sakura Line/);
  assert.match(presets,/School Flower/);
  assert.match(presets,/Retro Label/);
  assert.match(presets,/Notebook Card/);
});

test("decorative presets are saved as character-owned profile widgets",()=>{
  assert.match(presets,/character_profile_widgets/);
  assert.match(presets,/character_id:characterId/);
  assert.match(presets,/Authorization:`Bearer \$\{token\}`/);
  assert.match(presets,/method:"POST"/);
  assert.match(presets,/onAdded\(\)/);
});
