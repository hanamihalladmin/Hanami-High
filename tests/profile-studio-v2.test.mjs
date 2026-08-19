import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const studio=await readFile(new URL("../app/portal/ProfileStudioV2Panel.tsx",import.meta.url),"utf8");
const workspace=await readFile(new URL("../app/portal/ProfileDesignWorkspace.tsx",import.meta.url),"utf8");

test("Design Your Character uses Profile Studio V2",()=>{
  assert.match(workspace,/ProfileStudioV2Panel/);
  assert.match(workspace,/PROFILE STUDIO V2/);
  assert.match(studio,/ENHANCED CANVA-STYLE EDITOR/);
});

test("Profile Studio V2 provides stronger Canva-style editing controls",()=>{
  for(const feature of ["showLayers","zoom","copiedStyle","borderWidth","borderStyle","boxShadow","objectFit","objectPosition","flipX","flipY"]){
    assert.match(studio,new RegExp(feature));
  }
  assert.match(studio,/duplicateSelected/);
  assert.match(studio,/selectedIds/);
  assert.match(studio,/align\("left"\)/);
  assert.match(studio,/undo/);
  assert.match(studio,/redo/);
  assert.match(studio,/KeyboardEvent/);
  assert.match(studio,/shiftKey/);
  assert.match(studio,/Arrow/);
});

test("Profile Studio V2 remains upload-first and privately stored",()=>{
  assert.match(studio,/Upload image/);
  assert.match(studio,/profile-media/);
  assert.match(studio,/storage_path/);
  assert.match(studio,/Private Hanami media/);
  assert.doesNotMatch(studio,/external image URL/i);
  assert.doesNotMatch(studio,/Background image URL/i);
});

test("Profile Studio V2 supports explicit shape and presentation styling",()=>{
  assert.match(studio,/>Sharp</);
  assert.match(studio,/>Soft</);
  assert.match(studio,/>Rounded</);
  assert.match(studio,/>Pill</);
  assert.match(studio,/borderRadius/);
  assert.match(studio,/boxShadow/);
  assert.match(studio,/borderColor/);
  assert.match(studio,/objectPosition/);
});
