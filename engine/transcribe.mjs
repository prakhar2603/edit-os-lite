#!/usr/bin/env node
// Transcribe every clip:  node engine/transcribe.mjs <project> [--model small.en|medium.en]
// Writes words/<clip>.json and takes.txt: each clip's speech as numbered lines with start/end times,
// split at pauses. Claude reads takes.txt to pick the best take of every line (people record twice).
import { readdirSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { projectDir, P, readJSON, transcribe, ok, die } from "./lib.mjs";

const name = process.argv[2];
const dir = projectDir(name);
const mi = process.argv.indexOf("--model"), model = mi > 0 ? process.argv[mi + 1] : "medium.en";   // small.en hallucinates repeats over silence
const clips = readJSON(P(dir, "clips.json"), null);
if (!clips) die("run ingest first: node engine/ingest.mjs " + name);

let out = "";
for (const c of clips) {
  if (!c.audio) { out += `\n## ${c.clip} (${c.duration}s, no audio: b-roll)\n`; continue; }
  // drop anything stamped past the end of the clip (a sign of a hallucinated repeat)
  const words = transcribe(P(dir, c.file), P(dir, "words", c.clip + ".json"), model).filter(w => w.t < c.duration - 0.05);
  out += `\n## ${c.clip} (${c.duration}s)\n`;
  // a new line at every pause over 0.55s or sentence end
  let line = [];
  const flush = () => { if (!line.length) return; out += `${line[0].t.toFixed(2).padStart(6)} - ${line.at(-1).e.toFixed(2).padEnd(6)} ${line.map(w => w.w).join(" ")}\n`; line = []; };
  words.forEach((w, i) => {
    if (line.length && (w.t - line.at(-1).e > 0.55 || line.length >= 16 || (line.length >= 8 && /,$/.test(line.at(-1).w)))) flush();
    line.push(w);
    if (/[.?!]$/.test(w.w)) flush();
  });
  flush();
  console.log(`  ${c.clip}: ${words.length} words`);
}
writeFileSync(P(dir, "takes.txt"), `# Every clip's speech, by line (times in seconds within that clip).\n# Pick the best take of each line, in story order, into segs.txt as:  <clip> <start> <end>\n${out}`);
ok("transcribed → takes.txt");
console.log("next: choose the takes (segs.txt), show the cut as text, then: node engine/roughcut.mjs " + name);
