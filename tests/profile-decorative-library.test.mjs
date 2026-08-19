import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const gallery=await readFile(new URL("../app/portal/ProfileDecorativePresetGallery.tsx",import.meta.url),"utf8");

test("Profile Studio offers a broad divider preset library",()=>{
  for(const name of ["Bow Divider","Sparkle Divider","Heart Divider","Celestial Divider","Flower Divider","Tiny Star Divider","Lace Divider","Y2K Divider","Notebook Dots","Pink Glow"]){
    assert.match(gallery,new RegExp(name));
  }
});

test("cute decorative symbols are editable profile widgets",()=>{
  assert.match(gallery,/widget_type:\"sticker\"/);
  assert.match(gallery,/୨୧/);
  assert.match(gallery,/☾/);
  assert.match(gallery,/꒰ა/);
  assert.match(gallery,/Sparkle Cluster/);
  assert.match(gallery,/Tiny Hearts/);
});

test("decorative library keeps multiple badges and cards",()=>{
  for(const name of ["Bestie Badge","Star Student","Coquette Note","Y2K Card"]){
    assert.match(gallery,new RegExp(name));
  }
});
