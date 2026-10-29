// Shared helpers for the engine scripts. Node only, no extra packages.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const HF = "hyperframes@0.8.33";          // pinned: renders stay identical over time
export const FPS = 30;
export const snap = (t) => Math.round(t * FPS) / FPS;

export function projectDir(name) {
  if (!name) die("usage: node engine/<script>.mjs <project-name>");
  const d = resolve(ROOT, "projects", name);
  if (!existsSync(d)) die(`no project "${name}" (expected ${d}). Create it with: node engine/new.mjs ${name}`);
  return d;
}
export const P = (dir, ...p) => join(dir, ...p);
export const readJSON = (f, fallback) => existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : fallback;
export const writeJSON = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2)); };
export const stem = (f) => basename(f, extname(f));

export function die(msg) { console.error("✗ " + msg); process.exit(1); }
export function ok(msg) { console.log("✓ " + msg); }

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0 && !opts.allowFail) die(`${cmd} ${args.slice(0, 4).join(" ")}… failed:\n${(r.stderr || r.stdout || "").slice(-1500)}`);
  return r;
}
export const npx = (args, opts) => run("npx", ["--yes", HF, ...args], opts);

export function probe(file) {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file], { encoding: "utf8" }));
  const v = j.streams.find(s => s.codec_type === "video"), a = j.streams.find(s => s.codec_type === "audio");
  const rot = Math.abs(+(v?.side_data_list?.find(s => s.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0));
  let w = v?.width, h = v?.height; if (rot === 90 || rot === 270) [w, h] = [h, w];
  const [n, d] = (v?.avg_frame_rate || "30/1").split("/").map(Number);
  return {
    duration: +(+j.format.duration).toFixed(3), w, h, fps: d ? +(n / d).toFixed(2) : 30, hasAudio: !!a,
    hdr: ["arib-std-b67", "smpte2084"].includes(v?.color_transfer), transfer: v?.color_transfer || null,
  };
}

// integrated loudness of a file, in LUFS
export function loudness(file) {
  const r = run("ffmpeg", ["-hide_banner", "-nostdin", "-i", file, "-af", "ebur128", "-f", "null", "-"], { allowFail: true });
  const m = [...(r.stderr || "").matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  return m ? +m[1] : null;
}

// word list [{w,t,e}] from a hyperframes transcript.json
export const fromHF = (arr) => arr.map(x => ({ w: String(x.text).trim(), t: +(+x.start).toFixed(2), e: +(+x.end).toFixed(2) })).filter(x => x.w);

export function transcribe(file, outJson, model = "small.en") {
  const tmp = P(dirname(outJson), ".tx-" + stem(outJson));
  mkdirSync(tmp, { recursive: true });
  const r = npx(["transcribe", file, "-d", tmp, "-m", model, "--json"]);
  const res = JSON.parse(r.stdout.trim().split("\n").filter(l => l.startsWith("{")).pop());
  const words = fromHF(readJSON(res.transcriptPath, []));
  writeJSON(outJson, words);
  run("rm", ["-rf", tmp]);
  return words;
}
