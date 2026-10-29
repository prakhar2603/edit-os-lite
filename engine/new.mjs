#!/usr/bin/env node
// Start a new edit:  node engine/new.mjs <name> [clip files or a folder...]
// Creates projects/<name>/raw and copies the footage in (originals are never touched).
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { resolve, basename, join, extname } from "node:path";
import { ROOT, writeJSON, die, ok } from "./lib.mjs";

const [name, ...inputs] = process.argv.slice(2);
if (!name || !/^[a-z0-9][a-z0-9-_]*$/i.test(name)) die("usage: node engine/new.mjs <name> [clips or folder]   (name: letters, digits, - or _)");
const dir = resolve(ROOT, "projects", name), raw = join(dir, "raw");
mkdirSync(raw, { recursive: true });

const VID = /\.(mov|mp4|m4v|mkv|webm|mp3|m4a|wav|aac)$/i;   // audio alone = a voiceover for faceless styles
const files = inputs.flatMap(p => {
  const a = resolve(p);
  if (!existsSync(a)) die(`not found: ${p}`);
  return statSync(a).isDirectory() ? readdirSync(a).filter(f => VID.test(f)).sort().map(f => join(a, f)) : [a];
});
for (const f of files) {
  if (!VID.test(f)) { console.log("  skipped (not a video or audio file):", basename(f)); continue; }
  copyFileSync(f, join(raw, basename(f)));
  console.log("  + raw/" + basename(f));
}
if (!existsSync(join(dir, "edit.json"))) writeJSON(join(dir, "edit.json"), { style: null, notes: "" });
ok(`project ready: projects/${name}  (${readdirSync(raw).filter(f => VID.test(f)).length} clip(s) in raw/)`);
console.log("next: node engine/ingest.mjs " + name);
