// Style 01 · Clean. A tight, polished talking head: no motion design. Jump cuts hidden by alternating
// framing, smooth captions, an optional small title on the hook, optional cue pops and an info card.
import { captions, captionHTML, captionJS, framing, fontsLink, page, esc, f2 } from "../../engine/kit.mjs";
import { svg } from "../../engine/icons.mjs";

export default function build({ edit, brand, cut, words, duration, T }) {
  const o = edit.clean || {};
  const accent = brand.colors?.highlight || "#FFE45C";
  // framing: push in past phone headroom; two framings alternate at every cut
  const z = o.zoom || [1.14, 1.28], y = o.shiftY || [-110, -100];
  const portrait = cut.height > cut.width;
  const FR = portrait ? [{ s: z[0], y: y[0] }, { s: z[1], y: y[1] }] : [{ s: 1.0, y: 0 }, { s: 1.12, y: 0 }];
  const fr = framing(cut.cuts, duration, FR);

  const caps = captions(words, { duration, maxChars: 18, merge: edit.merge || [] });
  const capY = o.captionY ?? 1190;

  const title = edit.title;                 // { kicker, text, until }
  const cues = edit.cues || [];              // [{ at, icon }]
  const card = edit.card;                    // { at, title, text, icon, until }

  const css = `
      #v { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; transform-origin: 540px 960px; }
      #shade { position: absolute; left: 0; right: 0; bottom: 0; height: 900px; background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.38)); }
      .cap { position: absolute; left: 60px; width: 960px; top: ${capY}px; text-align: center; opacity: 0; white-space: nowrap;
             font-family: "Instrument Sans", sans-serif; font-weight: 700; font-size: 74px; line-height: 1; letter-spacing: -0.02em; color: #FFFFFF;
             text-shadow: 0 3px 0 rgba(0,0,0,0.25), 0 6px 26px rgba(0,0,0,0.55); }
      .cap .ac { font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; font-size: 1.16em; color: ${accent}; letter-spacing: -0.01em; }
      #title { position: absolute; left: 0; right: 0; top: 236px; display: flex; flex-direction: column; align-items: center; gap: 12px; opacity: 0; }
      #title .k { padding: 10px 18px 8px; border-radius: 999px; background: rgba(255,255,255,0.92); font-family: "Instrument Sans", sans-serif; font-weight: 700;
                  font-size: 24px; letter-spacing: 0.14em; text-transform: uppercase; color: #3A3D46; }
      #title .h { font-family: "Instrument Serif", serif; font-style: italic; font-size: 76px; line-height: 1; color: #FFFFFF; text-shadow: 0 6px 30px rgba(0,0,0,0.5); text-align: center; max-width: 900px; }
      #card { position: absolute; left: 140px; width: 800px; top: 246px; display: flex; align-items: center; gap: 18px; padding: 20px 26px; border-radius: 26px;
              background: rgba(255,255,255,0.94); box-shadow: 0 16px 40px rgba(0,0,0,0.25); opacity: 0; }
      #card i { flex: none; width: 58px; height: 58px; border-radius: 50%; background: ${accent}; display: flex; align-items: center; justify-content: center; }
      #card i svg { width: 30px; height: 30px; }
      #card b { display: block; font-family: "Instrument Sans", sans-serif; font-weight: 700; font-size: 30px; color: #16161A; line-height: 1.15; }
      #card span { display: block; margin-top: 4px; font-family: "Instrument Sans", sans-serif; font-weight: 500; font-size: 24px; color: #5A5D66; }
      .cue { position: absolute; left: 860px; top: 1060px; width: 96px; height: 96px; border-radius: 28px; background: #FFFFFF; opacity: 0;
             display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 30px rgba(0,0,0,0.3); }
      .cue svg { width: 46px; height: 46px; }`;

  const body = `
      <video id="v" class="clip" src="assets/cut.mp4" muted playsinline data-start="0" data-duration="${duration}" data-media-start="0" data-track-index="0"
             data-layout-allow-overlap data-layout-allow-occlusion></video>
      <div id="over" class="clip" data-start="0" data-duration="${duration}" data-track-index="1" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion>
        <div id="shade"></div>
        ${title ? `<div id="title">${title.kicker ? `<div class="k">${esc(title.kicker)}</div>` : ""}<div class="h">${esc(title.text)}</div></div>` : ""}
        ${card ? `<div id="card"><i>${svg(card.icon || "phone")}</i><div><b>${esc(card.title)}</b>${card.text ? `<span>${esc(card.text)}</span>` : ""}</div></div>` : ""}
        ${cues.map((c, i) => `<div class="cue" id="cue${i}">${svg(c.icon || "bookmark")}</div>`).join("")}
        ${captionHTML(caps, edit.accents || [])}
      </div>`;

  let js = fr.js + "\n      " + captionJS(caps);
  if (title) {
    const until = T(title.until, Math.min(6.5, duration - 1));
    js += `\n      tl.fromTo("#title", { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, ${f2(T(title.at, 0.25))});
      tl.to("#title", { opacity: 0, y: -16, duration: 0.3, ease: "power2.in" }, ${f2(until)});`;
  }
  if (card) {
    const a = T(card.at) - 0.2;
    js += `\n      tl.fromTo("#card", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${f2(a)});`;
    if (card.until !== undefined) js += `\n      tl.to("#card", { opacity: 0, y: -20, duration: 0.3 }, ${f2(T(card.until))});`;
  }
  cues.forEach((c, i) => {
    const a = T(c.at);
    js += `\n      tl.fromTo("#cue${i}", { opacity: 0, scale: 0.5, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.3, ease: "power3.out" }, ${f2(a - 0.1)});
      tl.to("#cue${i} svg path", { fill: "${accent === "#FFE45C" ? "#E0A800" : accent}", duration: 0.15 }, ${f2(a + 0.25)});
      tl.to("#cue${i}", { opacity: 0, scale: 0.8, duration: 0.25 }, ${f2(Math.min(duration - 0.1, a + 2.4))});`;
  });

  return {
    html: page({ duration, head: fontsLink(["Instrument+Sans:wght@500;600;700", "Instrument+Serif:ital@1"]), css, body, js }),
    captions: caps,
    boundaries: fr.cuts,
  };
}
