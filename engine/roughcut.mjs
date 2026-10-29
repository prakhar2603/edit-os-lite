#!/usr/bin/env node
// The rough cut:  node engine/roughcut.mjs <project>
// Reads segs.txt (one chosen take per line: "<clip> <start> <end>") and makes cut.mp4 in ONE ffmpeg pass:
//   - dead air before the first word of a take is cut (if > 0.3s); tails are left alone, because a strict
//     tail trim clips soft word endings ("rock" became "roof")
//   - pauses inside a take longer than 0.3s are tightened to 0.08s of air each side
//   - every cut snaps to a frame, picture and sound are cut in the same pass (no drift), no speed-up
//     (1.05x dropped frames and read as glitching)
//   - voice: high-pass, denoise, gentle compression, -14 LUFS
// Then it transcribes the cut (cut-words.json) and flags doubled words at the splices.
import { readFileSync, existsSync } from "node:fs";
import { projectDir, P, readJSON, writeJSON, run, snap, FPS, transcribe, ok, die, probe } from "./lib.mjs";

const name = process.argv[2];
const dir = projectDir(name);
const clips = Object.fromEntries((readJSON(P(dir, "clips.json"), []) || []).map(c => [c.clip, c]));
if (!existsSync(P(dir, "segs.txt"))) die("no segs.txt yet. Pick the takes from takes.txt first.");
const segs = readFileSync(P(dir, "segs.txt"), "utf8").split("\n").map(l => l.replace(/#.*/, "").trim()).filter(Boolean).map(l => {
  const [c, a, b] = l.split(/\s+/);
  if (!clips[c]) die(`segs.txt: unknown clip "${c}" (known: ${Object.keys(clips).join(", ")})`);
  if (!(+b > +a)) die(`segs.txt: bad times in "${l}"`);
  return [c, +a, Math.min(+b, clips[c].duration)];
});

const src = (c) => P(dir, clips[c].file);
function silences(c, a, b, thr = -36, d = 0.30) {
  const log = run("ffmpeg", ["-nostdin", "-ss", String(a), "-to", String(b), "-i", src(c), "-map", "0:a:0", "-af", `silencedetect=noise=${thr}dB:d=${d}`, "-f", "null", "-"], { allowFail: true }).stderr;
  const st = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1] + a);
  const en = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1] + a);
  return st.map((s, i) => [s, en[i] ?? b]);
}
function headTrim(c, a, b, thr = -34, hold = 3, pad = 0.12) {
  const r = run("ffmpeg", ["-nostdin", "-v", "error", "-ss", String(a), "-to", String(Math.min(b, a + 2.5)), "-i", src(c), "-map", "0:a:0", "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], { encoding: "buffer" });
  const buf = r.stdout, n = 320, db = [];                                         // 20 ms frames
  for (let i = 0; i + n * 2 <= buf.length; i += n * 2) {
    let s = 0; for (let k = 0; k < n; k++) { const v = buf.readInt16LE(i + k * 2); s += v * v; }
    db.push(20 * Math.log10(Math.max(1, Math.sqrt(s / n)) / 32768));
  }
  const i0 = db.findIndex((_, i) => i + hold <= db.length && db.slice(i, i + hold).every(v => v > thr));
  const s0 = Math.max(0, i0) * 0.02;
  return s0 - pad > 0.3 ? a + s0 - pad : a;
}

const pieces = [];
for (let [c, a, b] of segs) {
  a = headTrim(c, a, b); let t = a;
  for (const [s, e] of silences(c, a, b)) {
    if (s - a < 0.15) { t = Math.max(t, e - 0.08); continue; }
    if (b - e < 0.15) { b = s + 0.08; break; }
    if (s + 0.08 - t > 0.25) pieces.push([c, t, s + 0.08]);
    t = e - 0.08;
  }
  pieces.push([c, t, b]);
}
const P2 = pieces.map(([c, a, b]) => [c, snap(a), snap(b)]).filter(([, a, b]) => b - a >= 2 / FPS);

// one canvas for the whole cut: the first clip's frame size (styles decide the framing later)
const first = clips[P2[0][0]];
const scale = Math.min(1, 1920 / Math.max(first.w, first.h));
const W = Math.round(first.w * scale / 2) * 2, H = Math.round(first.h * scale / 2) * 2;
const files = [...new Set(P2.map(p => p[0]))], idx = Object.fromEntries(files.map((f, i) => [f, i]));
const fc = []; let cat = "";
P2.forEach(([c, a, b], k) => {
  const i = idx[c], d = b - a;
  fc.push(`[${i}:v:0]trim=start=${a.toFixed(4)}:end=${b.toFixed(4)},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${k}]`);
  fc.push(`[${i}:a:0]atrim=start=${a.toFixed(4)}:end=${b.toFixed(4)},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, d - 0.02).toFixed(4)}:d=0.02[a${k}]`);
  cat += `[v${k}][a${k}]`;
});
fc.push(`${cat}concat=n=${P2.length}:v=1:a=1[vc][ac]`);
fc.push("[ac]highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-14:TP=-1:LRA=9,aresample=48000[ao]");
run("ffmpeg", ["-nostdin", "-v", "error", "-y", ...files.flatMap(f => ["-i", src(f)]), "-filter_complex", fc.join(";"), "-map", "[vc]", "-map", "[ao]",
  "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-r", String(FPS), "-g", "30", "-keyint_min", "30", "-pix_fmt", "yuv420p",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", P(dir, "cut.mp4")]);

let t = 0; const cuts = [];
for (const [, a, b] of P2.slice(0, -1)) { t += b - a; cuts.push(+t.toFixed(4)); }
const dur = probe(P(dir, "cut.mp4")).duration;
writeJSON(P(dir, "cut.json"), { duration: dur, width: W, height: H, cuts, pieces: P2 });
ok(`cut.mp4: ${P2.length} pieces, ${dur}s (${W}x${H})`);

// listen to the result: doubled words at a splice mean a take boundary is off
const words = transcribe(P(dir, "cut.mp4"), P(dir, "cut-words.json"), "medium.en");   // captions come from this, so the accurate model
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
const dup = words.filter((w, i) => i && norm(w.w) && norm(w.w) === norm(words[i - 1].w) && cuts.some(c => Math.abs(c - w.t) < 0.6));
console.log(dup.length ? "⚠ doubled words at splices (fix segs.txt): " + dup.map(w => `"${w.w}" @${w.t}s`).join(", ") : "✓ no doubled words at the splices");
console.log("transcript of the cut:\n  " + words.map(w => w.w).join(" ").replace(/(.{1,110})(\s|$)/g, "$1\n  "));
console.log("next: pick a style and build: node engine/render.mjs " + name);
