// The style kit: everything a style's build.mjs shares, so every style gets the same hard-won fixes.
//   - captions that never stack (a short caption's fade-in can't outlive it) and never wrap
//   - word lookup for timing graphics to speech ("at": "flopped" or "flopped#2" or 12.4)
//   - alternating framing at jump cuts, so cuts read as edits
//   - one GSAP timeline registered for HyperFrames
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const f2 = (x) => (+x).toFixed(2);
const NUMW = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20", thirty: "30", forty: "40", fifty: "50", hundred: "100" };
// whisper writes numbers either way ("two" / "2"), so matching treats them as the same word
const norm = (s) => { const x = String(s).toLowerCase().replace(/[^a-z0-9%']/g, ""); return NUMW[x] ?? x; };

/** time of a word in the cut: "word", "word#2" (2nd occurrence), "two words" (a phrase), or a number of seconds */
export function makeT(words) {
  return (ref, fallback) => {
    if (ref === undefined || ref === null) return fallback;
    if (typeof ref === "number") return ref;
    const [phrase, nth] = String(ref).split("#");
    const parts = phrase.trim().split(/\s+/).map(norm);
    let n = +(nth || 1);
    for (let i = 0; i + parts.length <= words.length; i++) {
      if (parts.every((p, k) => norm(words[i + k].w) === p) && --n === 0) return words[i].t;
    }
    if (fallback !== undefined) return fallback;
    throw new Error(`edit.json: word "${ref}" not found in the transcript of the cut`);
  };
}
/** end time of a word/phrase */
export function makeE(words) {
  return (ref) => {
    const [phrase, nth] = String(ref).split("#");
    const parts = phrase.trim().split(/\s+/).map(norm);
    let n = +(nth || 1);
    for (let i = 0; i + parts.length <= words.length; i++) if (parts.every((p, k) => norm(words[i + k].w) === p) && --n === 0) return words[i + parts.length - 1].e;
    throw new Error(`edit.json: word "${ref}" not found`);
  };
}

/**
 * Captions: 1-3 words, max `maxChars`, break at punctuation and pauses, lead the voice by `lead`.
 * `zones` (optional): [[t0,t1,key]] so a caption never straddles a layout change; captions carry the key.
 * Captions under 0.3s fold into the next one (no one-word flashes).
 */
export function captions(words, { duration, maxChars = 18, maxWords = 3, lead = 0.12, maxSpan = 1.3, zones = null, merge = [] } = {}) {
  const W = mergeWords(words.map(w => ({ ...w, w: w.w.trim() })).filter(w => w.w), merge);
  const zoneAt = (t) => zones ? (zones.find(([a, b]) => t >= a && t < b) || zones.at(-1)) : [0, duration, null];
  const out = [];
  let ch = [];
  const flush = (nextT) => {
    if (!ch.length) return;
    const [za, zb, key] = zoneAt(ch[0].t);
    const t0 = Math.max(za, ch[0].t - lead);
    const t1 = Math.min((nextT ?? duration) - lead, ch.at(-1).e + 0.6, zb - 0.02, duration - 0.05);
    if (t1 > t0 + 0.08) out.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), key, words: ch.map(w => w.w) });
    ch = [];
  };
  for (const w of W) {
    const f = ch[0], txt = ch.map(x => x.w).join(" ");
    const mc = typeof maxChars === "object" ? maxChars[zoneAt(f ? f.t : w.t)[2]] ?? 18 : maxChars;
    if (f && (zoneAt(f.t) !== zoneAt(w.t) || ch.length >= maxWords || /[.,?!:;]$/.test(ch.at(-1).w) || (txt + " " + w.w).length > mc || w.t - f.t > maxSpan)) flush(w.t);
    ch.push(w);
  }
  flush(null);
  for (let i = out.length - 2; i >= 0; i--) {
    const c = out[i], n = out[i + 1];
    const mc = typeof maxChars === "object" ? maxChars[c.key] ?? 18 : maxChars;
    if (c.t1 - c.t0 < 0.3 && c.key === n.key && (c.words.join(" ") + " " + n.words.join(" ")).length <= mc + 3) out.splice(i, 2, { ...c, t1: n.t1, words: [...c.words, ...n.words] });
  }
  // still too short (it sits at a layout change): join the previous caption if it fits, else borrow time from the next
  for (let i = out.length - 1; i >= 0; i--) {
    const c = out[i]; if (c.t1 - c.t0 >= 0.3) continue;
    const p = out[i - 1], n = out[i + 1];
    if (p && p.key === c.key && (p.words.join(" ") + " " + c.words.join(" ")).length <= 22) { out.splice(i - 1, 2, { ...p, t1: c.t1, words: [...p.words, ...c.words] }); continue; }
    const want = c.t0 + 0.3;
    if (n) { c.t1 = Math.min(want, n.t1 - 0.3); if (n.t0 < c.t1) n.t0 = +c.t1.toFixed(3); } else c.t1 = Math.min(want, duration - 0.02);
    c.t1 = +c.t1.toFixed(3);
  }
  return out;
}
/** spoken numbers to digits etc: merge = [["seventy six percent","76%"], ...] */
function mergeWords(W, merge) {
  if (!merge.length) return W;
  const out = [];
  for (let i = 0; i < W.length; i++) {
    const m = merge.find(([k]) => W.slice(i, i + k.split(" ").length).map(w => norm(w.w)).join(" ") === k.split(" ").map(norm).join(" "));
    if (!m) { out.push(W[i]); continue; }
    const n = m[0].split(" ").length, last = W[i + n - 1];
    out.push({ ...W[i], e: last.e, w: m[1] + ((last.w.match(/[.,?!]$/) || [""])[0]) });
    i += n - 1;
  }
  return out;
}
/** caption html, with accent words wrapped in <span class="ac"> */
export function captionHTML(caps, accents = [], cls = "cap") {
  const A = new Set(accents.map(norm));
  return caps.map((c, i) => `<div class="${cls}${c.key ? " " + c.key : ""}" id="k${i}">${c.words.map(w => A.has(norm(w)) ? `<span class="ac">${esc(w)}</span>` : esc(w)).join(" ")}</div>`).join("\n        ");
}
export const captionJS = (caps) => caps.map((c, i) => `cap("#k${i}", ${f2(c.t0)}, ${f2(c.t1)});`).join("\n      ");

/** jump-cut framing: alternate two framings at every cut (cuts under `minGap` apart are skipped) */
export function framing(cuts, duration, frames, { minGap = 0.6, push = 0.02, sel = "#v" } = {}) {
  const C = cuts.filter(c => c > 0.3 && c < duration - 0.3).reduce((acc, c) => (c - (acc.at(-1) ?? 0) >= minGap ? [...acc, c] : acc), []);
  const seg = [0, ...C, duration];
  const js = seg.slice(0, -1).map((a, i) => {
    const b = seg[i + 1], f = frames[i % frames.length];
    return `tl.fromTo("${sel}", { scale: ${f.s}, y: ${f.y}, x: ${f.x || 0} }, { scale: ${(f.s + push).toFixed(3)}, y: ${f.y}, x: ${f.x || 0}, duration: ${(b - a).toFixed(3)}, ease: "none", immediateRender: false }, ${a.toFixed(3)});`;
  }).join("\n      ");
  return { js, cuts: C };
}

export const fontsLink = (families) => `<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families.map(f => "family=" + f).join("&")}&display=swap" />`;
export const GSAP = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`;

/** the shared runtime helpers every style's timeline uses */
export const RUNTIME = `
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // capped fade: a short caption can never outlive its own fade-in (the "stacked captions" bug)
      const cap = (sel, a, b) => {
        const d = Math.min(0.14, (b - a) * 0.45);
        tl.fromTo(sel, { opacity: 0, y: 10, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: d, ease: "power2.out", immediateRender: false }, a);
        const o = Math.max(a + d, b - 0.1);
        tl.to(sel, { opacity: 0, duration: Math.max(0.01, b - o), ease: "power1.in" }, o);
      };
      const show = (sel, a, b) => { tl.set(sel, { opacity: 1 }, a); if (b !== undefined) tl.set(sel, { opacity: 0 }, b); };
      const inR = (sel, at, d) => tl.fromTo(sel, { opacity: 0, x: 380, filter: "blur(12px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: d || 0.3, ease: "power3.out", immediateRender: false }, at);
      const inU = (sel, at, d) => tl.fromTo(sel, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: d || 0.28, ease: "power3.out", immediateRender: false }, at);
      const outL = (sel, at) => tl.to(sel, { opacity: 0, x: -200, filter: "blur(10px)", duration: 0.18, ease: "power2.in" }, at);
      const outD = (sel, at) => tl.to(sel, { opacity: 0, y: 30, duration: 0.18, ease: "power2.in" }, at);
      const slam = (sel, at, rot) => tl.fromTo(sel, { opacity: 0, scale: 1.8, rotation: 0 }, { opacity: 1, scale: 1, rotation: rot ?? -4, duration: 0.2, ease: "power4.out", immediateRender: false }, at);
      const pop = (sel, at) => tl.fromTo(sel, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.24, ease: "back.out(2.2)", immediateRender: false }, at);
      const count = (id, to, at, d, dec) => { const o = { n: 0 }; tl.to(o, { n: to, duration: d, ease: "power2.out", onUpdate: () => { const v = o.n.toFixed(dec || 0); document.getElementById(id).textContent = (+v).toLocaleString("en-US", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); } }, at); };
      const typeTo = (id, text, at, dur) => { const o = { n: 0 }; tl.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => { document.getElementById(id).textContent = text.slice(0, Math.round(o.n)); } }, at); };
`;

/** standard HyperFrames shell */
export function page({ duration, head = "", css = "", body = "", js = "", bg = "#000" }) {
  return `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    ${head}
    ${GSAP}
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${bg}; }
      ${css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
      ${body}
      <audio id="vo" src="assets/audio.m4a" data-start="0"></audio>
    </div>
    <script>${RUNTIME}
      ${js}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}

/**
 * B-roll inserts: other clips from the project shown full-screen over the main video, on words.
 * edit.json "broll": [{ "at": "cap", "until": "stitched", "clip": "IMG_0412", "from": 2.5 }]
 * clip = a clip name from clips.json (its picture only; the voice keeps playing underneath).
 */
export function brollHTML(broll, T, duration, { track = 5, fit = "cover" } = {}) {
  const items = (broll || []).map((b, i) => {
    const a = Math.max(0, T(b.at) - 0.05), e = Math.min(duration, T(b.until, a + (b.duration || 2)));
    return { ...b, i, a, e };
  }).filter(b => b.e - b.a > 0.2);
  return {
    html: items.map(b => `<video id="br${b.i}" class="clip broll" src="assets/src/${b.clip}.mov" muted playsinline data-start="${f2(b.a)}" data-duration="${f2(b.e - b.a)}" data-media-start="${f2(b.from || 0)}" data-track-index="${track}" data-layout-allow-overlap data-layout-allow-occlusion style="position:absolute; left:0; top:0; width:1080px; height:1920px; object-fit:${fit};"></video>`).join("\n      "),
    js: items.map(b => `tl.fromTo("#br${b.i}", { scale: 1.08 }, { scale: 1, duration: ${f2(b.e - b.a)}, ease: "none", immediateRender: false }, ${f2(b.a)});`).join("\n      "),
    boundaries: items.flatMap(b => [b.a, b.e]),
  };
}
