// Style 02 · Bold. Big uppercase captions, 1-3 words, the spoken word lights up and pops; hard punch-in
// zooms on the words that matter; optional graphic cards (blocks) in the top band.
import { captions, captionJS, framing, fontsLink, page, esc, f2 } from "../../engine/kit.mjs";
import { renderBeats, theme } from "../../engine/blocks.mjs";

export default function build({ edit, brand, cut, words, duration, T }) {
  const o = edit.bold || {};
  const hl = o.highlight || brand.colors?.highlight || "#FFE45C";
  const portrait = cut.height > cut.width;
  const z = o.zoom || [1.12, 1.22], y = o.shiftY || [-90, -80];
  const FR = portrait ? [{ s: z[0], y: y[0] }, { s: z[1], y: y[1] }] : [{ s: 1.0, y: 0 }, { s: 1.1, y: 0 }];
  const fr = framing(cut.cuts, duration, FR, { push: 0.015 });

  const caps = captions(words, { duration, maxChars: 14, maxWords: 3, lead: 0.08, merge: edit.merge || [] });
  // each caption's words carry their own times so the spoken one can light up
  const cw = [];
  { let k = 0; const W = words; caps.forEach((c, i) => c.words.forEach((w, j) => {
      while (k < W.length && W[k].t < c.t0 - 0.5) k++;
      const hit = W.slice(k, k + 6).find(x => x.w.replace(/[^a-z0-9]/gi, "").toLowerCase() === w.replace(/[^a-z0-9]/gi, "").toLowerCase());
      cw.push({ i, j, t: hit ? hit.t : c.t0 + j * 0.2 });
    })); }
  const A = new Set((edit.accents || []).map(s => s.toLowerCase()));
  const capY = o.captionY ?? 1240;

  // punch-ins: an instant zoom on a word, held ~1.1s, then back
  const punches = (edit.punches || []).map(p => typeof p === "string" ? { at: p } : p).map(p => ({ t: T(p.at), s: p.scale || 1.18 }));
  const beats = edit.beats || [];
  const th = theme(brand, { big: 110 });
  // graphics are cutaways: the face gives way to a full-screen card on the brand's paper, captions stay on top
  const B = beats.length ? renderBeats(beats, { T, duration, th, region: { top: 300, height: 760 } }) : { html: "", css: "", js: "", spans: [] };

  const css = `
      #wrap { position: absolute; inset: 0; transform-origin: 540px 760px; }
      #v { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; transform-origin: 540px 960px; }
      #bd { position: absolute; inset: 0; background: ${th.paper}; opacity: 0;
            background-image: repeating-linear-gradient(0deg, rgba(40,44,52,0.05) 0 1px, transparent 1px 128px), repeating-linear-gradient(90deg, rgba(40,44,52,0.05) 0 1px, transparent 1px 128px); }
      #shade { position: absolute; left: 0; right: 0; bottom: 0; height: 1000px; background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.45)); }
      .cap { position: absolute; left: 40px; width: 1000px; top: ${capY}px; text-align: center; opacity: 0; white-space: nowrap;
             font-family: "Montserrat", sans-serif; font-weight: 900; font-size: 92px; line-height: 1; letter-spacing: -0.01em; text-transform: uppercase; color: #FFFFFF;
             -webkit-text-stroke: 3px rgba(0,0,0,0.9); paint-order: stroke fill; text-shadow: 0 8px 0 rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.5); }
      .cap span { display: inline-block; }
      .cap span.ac { color: ${hl}; }
      ${B.css}`;

  const body = `
      <div id="wrap">
        <video id="v" class="clip" src="assets/cut.mp4" muted playsinline data-start="0" data-duration="${duration}" data-media-start="0" data-track-index="0"
               data-layout-allow-overlap data-layout-allow-occlusion></video>
      </div>
      <div id="over" class="clip" data-start="0" data-duration="${duration}" data-track-index="1" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion>
        <div id="shade"></div>
        <div id="bd"></div>
        ${B.html}
        ${caps.map((c, i) => `<div class="cap" id="k${i}">${c.words.map((w, j) => `<span id="k${i}w${j}"${A.has(w.replace(/[^a-z0-9%]/gi, "").toLowerCase()) ? ' class="ac"' : ""}>${esc(w)}</span>`).join(" ")}</div>`).join("\n        ")}
      </div>`;

  let js = fr.js + "\n      " + captionJS(caps);
  // the spoken word: a quick pop, and lit in the highlight colour while it's being said
  js += "\n      " + cw.map(({ i, j, t }) => `tl.fromTo("#k${i}w${j}", { scale: 1.25, color: "${hl}" }, { scale: 1, duration: 0.16, ease: "power2.out", immediateRender: false }, ${f2(Math.max(0, t - 0.06))});`).join("\n      ");
  cw.forEach(({ i, j, t }, n) => {
    const next = cw[n + 1]; const end = next && next.i === i ? next.t : caps[i].t1;
    const isAcc = A.has(caps[i].words[j].replace(/[^a-z0-9%]/gi, "").toLowerCase());
    if (!isAcc) js += `\n      tl.set("#k${i}w${j}", { color: "#FFFFFF" }, ${f2(Math.max(t + 0.05, end - 0.06))});`;
  });
  punches.forEach(p => { js += `\n      tl.set("#wrap", { scale: ${p.s} }, ${f2(p.t - 0.04)}); tl.set("#wrap", { scale: 1 }, ${f2(Math.min(duration - 0.05, p.t + 1.1))});`; });
  B.spans.forEach(([a, b]) => { js += `\n      tl.set("#bd", { opacity: 1 }, ${f2(a)}); tl.set("#bd", { opacity: 0 }, ${f2(b)});`; });
  js += B.js;

  return {
    html: page({ duration, head: fontsLink(["Montserrat:wght@800;900", "Archivo:wdth,wght@100..125,800;100..125,900", "Instrument+Sans:wght@500;600;700", "Instrument+Serif:ital@1"]), css, body, js }),
    captions: caps,
    boundaries: [...fr.cuts, ...punches.flatMap(p => [p.t - 0.04, Math.min(duration - 0.05, p.t + 1.1)]), ...B.spans.flat()],
  };
}
