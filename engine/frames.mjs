#!/usr/bin/env node
// Look at a reference reel:  node engine/frames.mjs <video> [count]
// Writes a contact sheet (and single frames) to docs/refs/<name>/ so Claude can study its look:
// caption font/size/position, colours, layout, graphics, pacing (it also prints the cut rhythm).
import { mkdirSync } from "node:fs";
import { resolve, join, basename, extname } from "node:path";
import { ROOT, run, probe, die, ok } from "./lib.mjs";

const [file, n = "12"] = process.argv.slice(2);
if (!file) die("usage: node engine/frames.mjs <video> [count]");
const src = resolve(file), name = basename(src, extname(src)).replace(/[^a-z0-9-_]/gi, "-");
const out = join(ROOT, "docs", "refs", name);
mkdirSync(out, { recursive: true });
const info = probe(src), count = +n;
for (let i = 0; i < count; i++) {
  const t = (0.3 + i * (info.duration - 0.6) / Math.max(1, count - 1)).toFixed(2);
  run("ffmpeg", ["-v", "error", "-y", "-ss", t, "-i", src, "-frames:v", "1", "-vf", "scale=540:-2", join(out, `f${String(i).padStart(2, "0")}-${t}s.jpg`)]);
}
run("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `fps=${count}/${info.duration.toFixed(2)},scale=270:-2,tile=6x${Math.ceil(count / 6)}`, "-frames:v", "1", join(out, "sheet.jpg")]);
// pacing: hard cuts per second, from frame differences
const W = 54, H = 96, N = W * H;
const raw = run("ffmpeg", ["-v", "error", "-i", src, "-vf", `scale=${W}:${H},format=gray,fps=30`, "-f", "rawvideo", "-"], { encoding: "buffer" }).stdout;
const F = Math.floor(raw.length / N), d = [];
for (let i = 1; i < F; i++) { let s = 0; for (let p = 0; p < N; p++) s += Math.abs(raw[i * N + p] - raw[(i - 1) * N + p]); d.push(s / N); }
const med = [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)], thr = Math.max(14, med * 6);
const cuts = d.filter((v, i) => v > thr && (i === 0 || d[i - 1] <= thr)).length;
ok(`${info.duration}s, ${info.w}x${info.h}: ${cuts} hard cuts (one every ${(info.duration / Math.max(1, cuts)).toFixed(1)}s)`);
console.log("look at: " + join("docs", "refs", name, "sheet.jpg") + " and the single frames next to it");
