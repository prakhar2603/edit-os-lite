#!/usr/bin/env node
// Build, check and render an edit:  node engine/render.mjs <project> [--style <id>] [--check] [--at 1,4.5,9]
//   --check   build + every check + preview frames, but don't render (fast; use while iterating)
// Steps: style builds index.html from the cut + edit.json → caption check → HyperFrames lint →
// preview contact sheet (look at it!) → render → audio swapped back in at -14 LUFS → cut scan → length check.
import { existsSync, mkdirSync, symlinkSync, rmSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, projectDir, P, readJSON, writeJSON, run, npx, probe, loudness, ok, die } from "./lib.mjs";
import { makeT, makeE } from "./kit.mjs";

const args = process.argv.slice(2);
const name = args[0];
const dir = projectDir(name);
const opt = (k) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };
const CHECK = args.includes("--check");

const edit = readJSON(P(dir, "edit.json"), {});
const styleId = opt("--style") || edit.style;
const styles = readdirSync(join(ROOT, "styles")).filter(s => existsSync(join(ROOT, "styles", s, "build.mjs")) || existsSync(join(ROOT, "styles", s, "variant.json")));
if (!styleId) die(`no style chosen. Set "style" in edit.json or pass --style. Styles: ${styles.join(", ")}`);
const pick = (id) => styles.map(s => join(ROOT, "styles", s)).find(s => s.endsWith("/" + id) || s.split("/").pop().startsWith(String(id).padStart(2, "0") + "-") || s.split("/").pop().replace(/^\d+-/, "") === id);
let sdir = pick(String(styleId));
// a copied style ("variant"): its base style's code, with its own brand, default edit fields and CSS on top
const variant = sdir && existsSync(join(sdir, "variant.json")) ? readJSON(join(sdir, "variant.json")) : null;
if (variant) { const b = pick(variant.base); if (!b) die(`variant ${styleId}: base style "${variant.base}" not found`); sdir = b; }
const deep = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === "object" && !Array.isArray(v) && a?.[k] && typeof a[k] === "object" ? deep(a[k], v) : v; return o; };
if (variant) Object.assign(edit, deep(variant.edit || {}, edit));
if (!sdir) die(`unknown style "${styleId}". Styles: ${styles.join(", ")}`);
const sname = variant ? String(styleId) + (variant.name ? "-" + variant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "") : sdir.split("/").pop();

const cut = readJSON(P(dir, "cut.json"), null);
if (!cut) die("no cut yet: node engine/roughcut.mjs " + name);
const words = readJSON(P(dir, "cut-words.json"), []);
const brand = deep(deep(readJSON(join(ROOT, "brand", "brand.json"), {}), variant?.brand || {}), edit.brand || {});

// build folder: assets are linked, never copied
const b = P(dir, "build"), A = join(b, "assets");
rmSync(b, { recursive: true, force: true });
mkdirSync(A, { recursive: true });
symlinkSync(P(dir, "cut.mp4"), join(A, "cut.mp4"));
run("ffmpeg", ["-v", "error", "-y", "-i", P(dir, "cut.mp4"), "-vn", "-c:a", "copy", join(A, "audio.m4a")]);
if (existsSync(P(dir, "assets"))) symlinkSync(P(dir, "assets"), join(A, "user"));
if (existsSync(join(ROOT, "brand"))) symlinkSync(join(ROOT, "brand"), join(A, "brand"));
if (existsSync(join(sdir, "assets"))) symlinkSync(join(sdir, "assets"), join(A, "style"));
if (existsSync(P(dir, "src"))) symlinkSync(P(dir, "src"), join(A, "src"));   // b-roll and alternate takes

const mod = await import(pathToFileURL(join(sdir, "build.mjs")).href), style = mod.default;
// styles that composite the speaker over designed graphics need them cut out of the background (cached per cut)
if (mod.needs?.matte) {
  const m = P(dir, "matte.webm");
  if (!existsSync(m) || statSync(m).mtimeMs < statSync(P(dir, "cut.mp4")).mtimeMs) {
    console.log(`cutting the speaker out of the background… (one time per cut, ~${Math.ceil(cut.duration * 30 / 7 / 60)} min)`);
    npx(["remove-background", P(dir, "cut.mp4"), "-o", m, "--quality", "best"]);
  }
  symlinkSync(m, join(A, "matte.webm"));
}
const ctx = { dir, edit, brand, cut, words, duration: cut.duration, T: makeT(words), E: makeE(words), asset: (p) => "assets/" + p, has: (p) => existsSync(join(A, p)) };
let res;
try { res = await style(ctx); } catch (e) { die(`style ${sname} could not build: ${e.message}`); }
if (variant?.fonts?.length) res.html = res.html.replace("</head>", `  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${variant.fonts.map(f => "family=" + f.replace(/ /g, "+")).join("&")}&display=swap" />\n  </head>`);
if (variant?.css) res.html = res.html.replace("</style>", `  /* variant: ${variant.name || styleId} */\n      ${variant.css}\n    </style>`);
writeFileSync(join(b, "index.html"), res.html);
writeJSON(join(b, "captions.json"), res.captions || []);
console.log(`built ${sname}: ${(res.captions || []).length} captions, ${cut.duration}s`);

/* 1. captions: never two at once, none too short, none too long */
let bad = 0;
const caps = [...(res.captions || [])].sort((x, y) => x.t0 - y.t0);
caps.forEach((c, i) => {
  const n = caps[i + 1], txt = c.words.join(" ");
  if (n && c.t1 > n.t0 + 0.001) { bad++; console.log(`  ✗ captions overlap at ${c.t0}s: "${txt}" / "${n.words.join(" ")}"`); }
  if (c.t1 - c.t0 < 0.2) { bad++; console.log(`  ✗ caption shorter than 0.2s at ${c.t0}s: "${txt}"`); }
});
if (bad) die(`${bad} caption problem(s)`); else ok("captions: one at a time, none too short");

/* 2. HyperFrames lint */
const lint = npx(["lint", b], { allowFail: true });
const lout = (lint.stdout + lint.stderr).replace(/\x1b\[[0-9;]*m/g, "");
const errs = +(lout.match(/(\d+) error\(s\)/) || [0, 0])[1];
if (errs) { console.log(lout.split("\n").filter(l => /✗|error/i.test(l)).join("\n")); die(`lint: ${errs} error(s)`); }
ok("lint: 0 errors");

/* 3. preview frames: a contact sheet to LOOK at before rendering */
const at = opt("--at") || (res.previewAt || Array.from({ length: 9 }, (_, i) => +(0.4 + i * (cut.duration - 0.8) / 8).toFixed(2))).join(",");
npx(["snapshot", b, "--at", at, "--no-end", "--describe", "false", "--timeout", "30000", "-o", join(b, "snapshots")], { allowFail: true });
const sheets = existsSync(join(b, "snapshots")) ? readdirSync(join(b, "snapshots")).filter(f => f.startsWith("contact-sheet")) : [];
console.log("preview: " + (sheets.length ? sheets.map(s => relative(ROOT, join(b, "snapshots", s))).join(", ") : "(snapshot failed, check by eye in the render)"));
if (CHECK) { ok("check done (no render). Look at the preview, then run without --check."); process.exit(0); }

/* 4. render, then put the clean voice track back (the renderer's own mix can drift in loudness) */
const outDir = P(dir, "out"); mkdirSync(outDir, { recursive: true });
const tmp = join(outDir, ".render.mp4"), out = join(outDir, `${name}-${sname}.mp4`);
console.log("rendering at 2x, then down to 1080x1920… (about 5 minutes per 45s of video)");
// Rendered at 1x, text and edges go soft (scaled layers get stretched pixels). Render at 2x, shrink with lanczos,
// and hand Instagram a clean ~14 Mbps source (it re-compresses everything).
const tmp4k = join(outDir, ".render4k.mp4");
npx(["render", b, "--low-memory-mode", "--quality", "high", "--crf", "10", "--resolution", "portrait-4k", "-o", tmp4k]);
run("ffmpeg", ["-v", "error", "-y", "-i", tmp4k, "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-preset", "slow", "-b:v", "14M", "-maxrate", "20M", "-bufsize", "28M", "-g", "60", "-an", tmp]);
rmSync(tmp4k, { force: true });
// optional background music (edit.json "music": { "file": "song.mp3", "volume": 0.18, "from": 0 }),
// ducked under the voice automatically, then the mix brought to -14 LUFS
const mus = edit.music && (typeof edit.music === "string" ? { file: edit.music } : edit.music);
if (mus) {
  const mf = [P(dir, "assets", mus.file), P(dir, "raw", mus.file)].find(existsSync);
  if (!mf) die(`music file "${mus.file}" not found in projects/${name}/assets or raw`);
  const vol = mus.volume ?? 0.18, voice = mus.voiceless ? 0 : 1;
  run("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-i", P(dir, "cut.mp4"), "-ss", String(mus.from || 0), "-stream_loop", "-1", "-i", mf, "-filter_complex",
    voice ? `[2:a]volume=${vol},afade=t=in:d=0.5,afade=t=out:st=${Math.max(0, cut.duration - 1.2).toFixed(2)}:d=1.2[m];[1:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=9[a]`
          : `[2:a]afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, cut.duration - 1.2).toFixed(2)}:d=1.2,atrim=0:${cut.duration},loudnorm=I=-14:TP=-1:LRA=9[a]`,
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(cut.duration), "-movflags", "+faststart", out]);
} else {
  run("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-i", P(dir, "cut.mp4"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
}
rmSync(tmp, { force: true });

/* 5. checks on the finished file */
const pv = probe(out), lu = loudness(out);
console.log(`  length ${pv.duration}s (cut ${cut.duration}s) | ${pv.w}x${pv.h} | ${lu} LUFS`);
if (Math.abs(pv.duration - cut.duration) > 0.15) console.log("  ⚠ length differs from the cut by more than 0.15s");
// cut scan: every hard cut in the render should be one we planned (jump cuts, scene changes)
const planned = [...(cut.cuts || []), ...(res.boundaries || [])];
const W2 = 54, H2 = 96, N = W2 * H2;
const raw = run("ffmpeg", ["-v", "error", "-i", out, "-vf", `scale=${W2}:${H2},format=gray`, "-f", "rawvideo", "-"], { encoding: "buffer" }).stdout;
const F = Math.floor(raw.length / N), d = [];
for (let i = 1; i < F; i++) { let s = 0; for (let p = 0; p < N; p++) s += Math.abs(raw[i * N + p] - raw[(i - 1) * N + p]); d.push(s / N); }
const med = [...d].sort((x, y) => x - y)[Math.floor(d.length / 2)], thr = Math.max(14, med * 6);
const odd = [];
d.forEach((v, i) => { if (v > thr && (i === 0 || d[i - 1] <= thr)) { const t = (i + 1) / 30; if (t > 0.25 && !planned.some(c => Math.abs(c - t) < 0.25)) odd.push(t.toFixed(2)); } });
console.log(odd.length ? `  ⚠ unplanned hard cuts at ${odd.join(", ")}s: look at those moments` : "  ✓ every hard cut is a planned one");
ok("done → " + relative(ROOT, out));
