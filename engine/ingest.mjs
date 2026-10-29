#!/usr/bin/env node
// Prepare the footage:  node engine/ingest.mjs <project>
// - iPhone footage is HDR (HLG). Edited as-is it looks washed out and the renderer needs ~28 GB of scratch,
//   so HDR clips are tone-mapped to SDR first (Apple's own tone mapping via avconvert, ffmpeg as fallback).
// - Writes src/<clip>.mov (what every later step reads) and clips.json (length, size, fps, audio, HDR).
import { readdirSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { projectDir, P, probe, run, writeJSON, stem, ok, die } from "./lib.mjs";

const dir = projectDir(process.argv[2]);
const raw = P(dir, "raw"), src = P(dir, "src");
mkdirSync(src, { recursive: true });
const files = readdirSync(raw).filter(f => /\.(mov|mp4|m4v|mkv|webm|mp3|m4a|wav|aac)$/i.test(f)).sort();
if (!files.length) die("raw/ is empty. Add clips with: node engine/new.mjs <project> <files>");

const hasAvconvert = run("which", ["avconvert"], { allowFail: true }).status === 0;
const clips = [];
for (const f of files) {
  const a = join(raw, f), name = stem(f), out = join(src, name + ".mov");
  const audioOnly = /\.(mp3|m4a|wav|aac)$/i.test(f);
  // a voiceover with no picture: wrap it in a plain 1080x1920 clip so every later step treats it the same
  if (audioOnly && !existsSync(out)) run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30", "-i", a, "-map", "0:v", "-map", "1:a", "-shortest", "-fflags", "+shortest", "-max_interleave_delta", "0", "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out]);
  const info = audioOnly ? { hdr: false } : probe(a);
  if (!existsSync(out)) {
    if (info.hdr && hasAvconvert) {
      const preset = Math.max(info.w, info.h) > 1920 ? "Preset3840x2160" : "Preset1920x1080";
      run("avconvert", ["-s", a, "-p", preset, "-o", out]);
    } else if (info.hdr) {
      run("ffmpeg", ["-v", "error", "-y", "-i", a, "-vf", "zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p",
        "-c:v", "libx264", "-crf", "16", "-c:a", "copy", out]);
    } else {
      symlinkSync(a, out);
    }
  }
  const s = probe(out);
  clips.push({ clip: name, file: `src/${name}.mov`, duration: s.duration, w: s.w, h: s.h, fps: s.fps, audio: s.hasAudio, hdrSource: info.hdr,
    shape: s.h > s.w * 1.2 ? "portrait" : s.w > s.h * 1.2 ? "landscape" : "square" });
  console.log(`  ${name}: ${s.duration}s ${s.w}x${s.h} ${s.fps}fps${info.hdr ? " (HDR → SDR)" : ""}${s.hasAudio ? "" : " (no sound: b-roll)"}`);
}
writeJSON(P(dir, "clips.json"), clips);
ok(`${clips.length} clip(s) ready, ${clips.reduce((s, c) => s + c.duration, 0).toFixed(1)}s of footage`);
console.log("next: node engine/transcribe.mjs " + process.argv[2]);
