// Graphic blocks: the reusable "beats" that motion styles place on screen, timed to words.
// A beat in edit.json:  { "type": "stat", "at": "views", "value": 195, "label": "views", ... }
// Each block returns { html, css, js } for a box (region) the style gives it, themed by the style.
// Rules baked in (from real feedback): something moves on every phrase; entrances 0.2-0.3s;
// no opacity/filter tweens on 3D elements; no CSS transforms on elements GSAP scales.
import { esc, f2 } from "./kit.mjs";
import { svg } from "./icons.mjs";

const card = (th) => `background: ${th.card}; border-radius: 28px; box-shadow: 0 2px 0 rgba(0,0,0,0.06), 0 5px 0 rgba(0,0,0,0.05), 0 30px 50px rgba(20,20,30,0.18);`;
const disp = (th) => `font-family: "${th.display}", sans-serif; font-variation-settings: "wdth" 112; font-weight: 900; letter-spacing: -0.03em; line-height: 0.92; text-transform: uppercase;`;
const body = (th) => `font-family: "${th.body}", sans-serif;`;
const imgSrc = (p) => /^https?:|^assets\//.test(p) ? p : "assets/user/" + p;
const items = (b) => (b.items || []).map(x => typeof x === "string" ? { text: x } : x);

export const BLOCKS = {
  /* kicker + big headline */
  title: {
    html: (b, id) => `<div class="b-title">${b.kicker ? `<div class="k">${esc(b.kicker)}</div>` : ""}<div class="h">${esc(b.text)}</div>${b.sub ? `<div class="s">${esc(b.sub)}</div>` : ""}</div>`,
    css: (id, th) => `#${id} .b-title { text-align: center; padding: 0 60px; }
      #${id} .k { display: inline-block; padding: 10px 18px 8px; border-radius: 999px; background: ${th.ink}; color: ${th.onInk}; ${body(th)} font-weight: 700; font-size: 26px; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 26px; opacity: 0; }
      #${id} .h { ${disp(th)} font-size: ${th.big}px; color: ${th.text}; opacity: 0; }
      #${id} .s { margin-top: 22px; ${body(th)} font-weight: 600; font-size: 34px; color: ${th.muted}; opacity: 0; }`,
    js: (b, id, t0) => `tl.fromTo("#${id} .k", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.25, ease: "power3.out", immediateRender: false }, ${f2(t0)});
      tl.fromTo("#${id} .h", { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.24, ease: "power4.out", immediateRender: false }, ${f2(t0 + 0.06)});
      tl.fromTo("#${id} .s", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, ${f2(t0 + 0.35)});`,
  },

  /* a number that counts up, with a label; "tone": bad | good | neutral */
  stat: {
    html: (b, id) => `<div class="b-stat"><div class="n">${esc(b.prefix || "")}<span id="${id}n">0</span>${esc(b.suffix || "")}</div>${b.label ? `<div class="l">${esc(b.label)}</div>` : ""}${b.note ? `<div class="card no">${esc(b.note)}</div>` : ""}</div>`,
    css: (id, th, b) => `#${id} .b-stat { text-align: center; }
      #${id} .n { ${disp(th)} font-size: ${Math.round(Math.min(230, 1180 / Math.max(1, (String(b.prefix || "") + Number(b.value).toLocaleString("en-US") + String(b.suffix || "")).length)))}px; white-space: nowrap; color: ${b.tone === "bad" ? th.bad : b.tone === "good" ? th.good : th.text}; opacity: 0; }
      #${id} .l { margin-top: 18px; ${body(th)} font-weight: 700; font-size: 34px; letter-spacing: 0.12em; text-transform: uppercase; color: ${th.muted}; opacity: 0; }
      #${id} .no { display: inline-block; margin-top: 36px; padding: 20px 30px; ${card(th)} ${body(th)} font-weight: 600; font-size: 32px; color: ${th.text}; opacity: 0; max-width: 820px; }`,
    js: (b, id, t0, t1, T) => `tl.fromTo("#${id} .n", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(1.8)", immediateRender: false }, ${f2(t0)});
      count("${id}n", ${+b.value}, ${f2(t0 + 0.05)}, ${b.value > 20 ? 0.9 : 0.5}, ${b.decimals || 0});
      tl.fromTo("#${id} .l", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, ${f2(t0 + 0.3)});
      ${b.note ? `tl.fromTo("#${id} .no", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.28, ease: "power3.out", immediateRender: false }, ${f2(T(b.noteAt, t0 + 0.9))});` : ""}
      ${b.tone === "bad" ? `tl.fromTo("#${id} .n", { x: 0 }, { x: 10, duration: 0.05, yoyo: true, repeat: 5, immediateRender: false }, ${f2(t0 + 0.95)});` : ""}`,
  },

  /* heading + items that pop on their words; "mark": check | cross | number | dot */
  list: {
    html: (b, id) => `<div class="b-list">${b.heading ? `<div class="hd">${esc(b.heading)}</div>` : ""}${items(b).map((x, i) => `<div class="it" id="${id}i${i}"><i>${b.mark === "number" ? i + 1 : b.mark === "cross" ? svg("cross", "#fff") : b.mark === "dot" ? "" : svg("check", "#fff")}</i><span>${esc(x.text)}</span></div>`).join("")}</div>`,
    css: (id, th, b) => `#${id} .b-list { width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
      #${id} .hd { ${disp(th)} font-size: 104px; color: ${th.text}; margin-bottom: 14px; opacity: 0; }
      #${id} .it { display: flex; align-items: center; gap: 30px; padding: 34px 36px; ${card(th)} opacity: 0; }
      #${id} .it i { flex: none; width: 88px; height: 88px; border-radius: 50%; background: ${b.mark === "cross" ? th.bad : th.accent}; display: flex; align-items: center; justify-content: center; font-style: normal; ${disp(th)} font-size: 40px; color: #fff; }
      #${id} .it i svg { width: 40px; height: 40px; }
      #${id} .it span { ${body(th)} font-weight: 700; font-size: ${items(b).length > 4 ? 44 : 54}px; color: ${th.text}; line-height: 1.15; }`,
    js: (b, id, t0, t1, T) => `tl.fromTo("#${id} .hd", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, ${f2(t0)});
      ${items(b).map((x, i) => { const a = T(x.at, t0 + 0.25 + i * Math.max(0.35, (t1 - t0 - 0.6) / Math.max(1, items(b).length))); return `tl.fromTo("#${id}i${i}", { opacity: 0, x: 160 }, { opacity: 1, x: 0, duration: 0.26, ease: "power3.out", immediateRender: false }, ${f2(a - 0.05)});
      tl.fromTo("#${id}i${i} i", { scale: 0.2 }, { scale: 1, duration: 0.3, ease: "back.out(2.4)", immediateRender: false }, ${f2(a + 0.05)});`; }).join("\n      ")}`,
  },

  /* A vs B; the loser gets struck through on "strikeAt" */
  compare: {
    html: (b, id) => `<div class="b-cmp">${["left", "right"].map(s => `<div class="sd ${b.winner === s ? "win" : "lose"}" id="${id}${s}"><div class="lb">${esc(b[s]?.label)}</div><div class="v">${esc(b[s]?.value)}</div>${b.winner && b.winner !== s ? `<i class="st"></i>` : ""}</div>`).join(`<div class="vs">${esc(b.vs || "vs")}</div>`)}</div>`,
    css: (id, th, b) => `#${id} .b-cmp { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 0 40px; }
      #${id} .sd { position: relative; flex: 1 1 0; min-width: 0; padding: 40px 22px; text-align: center; ${card(th)} opacity: 0; }
      #${id} .sd.win { background: ${th.ink}; }
      #${id} .lb { ${body(th)} font-weight: 700; font-size: 28px; letter-spacing: 0.1em; text-transform: uppercase; color: ${th.muted}; }
      #${id} .sd.win .lb { color: ${th.onInkMuted}; }
      #${id} .v { margin-top: 14px; ${disp(th)} font-size: ${Math.round(Math.min(92, 360 / (0.8 * Math.max(3, String(b.left?.value || "").length, String(b.right?.value || "").length))))}px; color: ${th.text}; white-space: nowrap; }
      #${id} .sd.win .v { color: ${th.accent}; }
      #${id} .vs { ${disp(th)} font-size: 48px; color: ${th.muted}; opacity: 0; }
      #${id} .st { position: absolute; left: 8%; right: 8%; top: 50%; height: 14px; margin-top: -7px; border-radius: 7px; background: ${th.bad}; transform-origin: left center; }`,
    js: (b, id, t0, t1, T) => `tl.fromTo("#${id}left", { opacity: 0, x: -200 }, { opacity: 1, x: 0, duration: 0.28, ease: "power3.out", immediateRender: false }, ${f2(t0)});
      tl.fromTo("#${id} .vs", { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.2, immediateRender: false }, ${f2(T(b.rightAt, t0 + 0.6) - 0.15)});
      tl.fromTo("#${id}right", { opacity: 0, x: 200 }, { opacity: 1, x: 0, duration: 0.28, ease: "power3.out", immediateRender: false }, ${f2(T(b.rightAt, t0 + 0.6))});
      ${b.winner ? `tl.set("#${id} .st", { scaleX: 0, rotation: -8 }, 0);
      tl.to("#${id} .st", { scaleX: 1, duration: 0.2, ease: "power4.out" }, ${f2(T(b.strikeAt, t0 + 1.4))});
      tl.to("#${id}${b.winner === "left" ? "left" : "right"}", { scale: 1.06, duration: 0.25, ease: "back.out(2)" }, ${f2(T(b.strikeAt, t0 + 1.4) + 0.1)});` : ""}`,
  },

  /* a quote that types itself out */
  quote: {
    html: (b, id) => `<div class="b-q card"><div class="mk">“</div><div class="tx" id="${id}t"></div>${b.by ? `<div class="by">${esc(b.by)}</div>` : ""}</div>`,
    css: (id, th) => `#${id} .b-q { width: 900px; margin: 0 auto; padding: 50px 54px; ${card(th)} opacity: 0; position: relative; }
      #${id} .mk { position: absolute; left: 30px; top: -40px; ${disp(th)} font-size: 200px; color: ${th.accent}; }
      #${id} .tx { font-family: "${th.serif}", serif; font-style: italic; font-size: 60px; line-height: 1.12; color: ${th.text}; min-height: 140px; }
      #${id} .by { margin-top: 26px; ${body(th)} font-weight: 700; font-size: 28px; letter-spacing: 0.1em; text-transform: uppercase; color: ${th.muted}; }`,
    js: (b, id, t0, t1) => `inU("#${id} .b-q", ${f2(t0)});
      typeTo("${id}t", ${JSON.stringify(b.text)}, ${f2(t0 + 0.15)}, ${f2(Math.min(t1 - t0 - 0.5, Math.max(0.8, b.text.length * 0.035)))});`,
  },

  /* numbered steps */
  steps: {
    html: (b, id) => `<div class="b-steps">${items(b).map((x, i) => `<div class="sp" id="${id}s${i}"><i>${i + 1}</i><span>${esc(x.text)}</span></div>`).join("")}</div>`,
    css: (id, th) => `#${id} .b-steps { width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 26px; }
      #${id} .sp { display: flex; align-items: center; gap: 30px; padding: 30px 34px; ${card(th)} opacity: 0; }
      #${id} .sp i { flex: none; width: 96px; height: 96px; border-radius: 50%; background: ${th.ink}; color: ${th.onInk}; display: flex; align-items: center; justify-content: center; font-style: normal; ${disp(th)} font-size: 56px; }
      #${id} .sp:nth-child(2n) i { background: ${th.accent}; }
      #${id} .sp span { ${disp(th)} font-size: 50px; color: ${th.text}; }`,
    js: (b, id, t0, t1, T) => items(b).map((x, i) => `inR("#${id}s${i}", ${f2(T(x.at, t0 + i * 0.25))});`).join("\n      "),
  },

  /* a user image (screenshot, product, photo) in a phone, a card, or bare; slow push while it's up */
  image: {
    html: (b, id) => `<div class="b-img ${b.frame || "card"}"><div class="in"><img src="${imgSrc(b.src)}" alt="" /></div>${b.caption ? `<div class="cp">${esc(b.caption)}</div>` : ""}</div>`,
    css: (id, th, b) => `#${id} .b-img { margin: 0 auto; opacity: 0; text-align: center; }
      #${id} .b-img.phone .in { width: ${b.w || 420}px; height: ${Math.round((b.w || 420) * 2.05)}px; margin: 0 auto; border-radius: 56px; background: #16161A; padding: 16px; box-shadow: 0 50px 70px rgba(0,0,0,0.3); }
      #${id} .b-img.phone img { width: 100%; height: 100%; object-fit: cover; border-radius: 42px; }
      #${id} .b-img.card .in { display: inline-block; padding: 18px; ${card(th)} }
      #${id} .b-img.card img { display: block; max-width: ${b.w || 860}px; max-height: ${b.h || 760}px; border-radius: 18px; }
      #${id} .b-img.bare img { max-width: ${b.w || 900}px; max-height: ${b.h || 800}px; }
      #${id} .cp { margin-top: 26px; ${body(th)} font-weight: 700; font-size: 32px; color: ${th.text}; }`,
    js: (b, id, t0, t1) => `tl.fromTo("#${id} .b-img", { opacity: 0, y: 120, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out", immediateRender: false }, ${f2(t0)});
      tl.to("#${id} .b-img", { scale: 1.05, duration: ${f2(Math.max(0.5, t1 - t0 - 0.4))}, ease: "none" }, ${f2(t0 + 0.35)});`,
  },

  /* two logos / images / words with a relation: plus | vs | arrow | slash ("X killed Y") */
  logos: {
    html: (b, id) => { const tile = (x, s) => `<div class="tl" id="${id}${s}">${/\.(png|jpe?g|svg|webp)$/i.test(x || "") ? `<img src="${imgSrc(x)}" alt="" />` : `<b>${esc(x)}</b>`}</div>`;
      return `<div class="b-logos">${tile(b.left, "a")}<div class="rel" id="${id}r">${b.relation === "vs" ? "VS" : b.relation === "arrow" ? "→" : b.relation === "slash" ? "" : "+"}</div>${tile(b.right, "b")}${b.relation === "slash" ? `<i class="sl" id="${id}x"></i>` : ""}</div>`; },
    css: (id, th) => `#${id} .b-logos { position: relative; display: flex; align-items: center; justify-content: center; gap: 40px; }
      #${id} .tl { width: 280px; height: 280px; border-radius: 66px; display: flex; align-items: center; justify-content: center; ${card(th)} opacity: 0; overflow: hidden; }
      #${id} .tl img { width: 72%; } #${id} .tl b { ${disp(th)} font-size: 54px; color: ${th.text}; text-align: center; padding: 10px; }
      #${id} .rel { ${disp(th)} font-size: 90px; color: ${th.accent}; opacity: 0; }
      #${id} .sl { position: absolute; right: 90px; top: 50%; width: 340px; height: 30px; margin-top: -15px; border-radius: 15px; background: ${th.bad}; transform-origin: left center; box-shadow: 0 6px 0 ${th.ink}; }`,
    js: (b, id, t0, t1, T) => `tl.fromTo("#${id}a", { opacity: 0, rotation: -14, scale: 0.7 }, { opacity: 1, rotation: -4, scale: 1, duration: 0.3, ease: "back.out(1.8)", immediateRender: false }, ${f2(t0)});
      tl.fromTo("#${id}r", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.22, immediateRender: false }, ${f2(t0 + 0.2)});
      tl.fromTo("#${id}b", { opacity: 0, rotation: 14, scale: 0.7 }, { opacity: 1, rotation: 4, scale: 1, duration: 0.3, ease: "back.out(1.8)", immediateRender: false }, ${f2(T(b.rightAt, t0 + 0.3))});
      ${b.relation === "slash" ? `tl.set("#${id}x", { scaleX: 0, rotation: -20 }, 0);
      tl.to("#${id}x", { scaleX: 1, duration: 0.18, ease: "power4.out" }, ${f2(T(b.slashAt, t0 + 0.7))});
      tl.to("#${id}b", { filter: "saturate(0.15)", duration: 0.2 }, ${f2(T(b.slashAt, t0 + 0.7))});` : ""}`,
  },

  /* chat bubbles: [{ from: "me" | "ai", text, at }]; the AI ones type themselves out */
  chat: {
    html: (b, id) => `<div class="b-chat">${(b.messages || []).map((m, i) => `<div class="m ${m.from === "me" ? "me" : "ai"}" id="${id}m${i}">${m.from !== "me" && b.aiName ? `<div class="nm">${esc(b.aiName)}</div>` : ""}<div class="tx" id="${id}t${i}">${m.from === "me" ? esc(m.text) : ""}</div></div>`).join("")}</div>`,
    css: (id, th) => `#${id} .b-chat { width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
      #${id} .m { max-width: 760px; padding: 26px 30px; border-radius: 32px; opacity: 0; ${body(th)} font-weight: 600; font-size: 38px; line-height: 1.25; }
      #${id} .m.me { align-self: flex-end; background: ${th.ink}; color: ${th.onInk}; border-bottom-right-radius: 8px; }
      #${id} .m.ai { align-self: flex-start; ${card(th)} color: ${th.text}; border-bottom-left-radius: 8px; min-width: 300px; }
      #${id} .nm { font-size: 24px; font-weight: 700; color: ${th.accentText}; margin-bottom: 8px; }`,
    js: (b, id, t0, t1, T) => (b.messages || []).map((m, i) => { const a = T(m.at, t0 + i * 0.8);
      return `tl.fromTo("#${id}m${i}", { opacity: 0, y: 50, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: "back.out(1.6)", immediateRender: false }, ${f2(a - 0.05)});${m.from !== "me" ? `\n      typeTo("${id}t${i}", ${JSON.stringify(m.text)}, ${f2(a + 0.15)}, ${f2(Math.max(0.6, m.text.length * 0.03))});` : ""}`; }).join("\n      "),
  },

  /* bar chart: [{ label, value }] bars grow, the highlighted one in accent */
  chart: {
    html: (b, id) => `<div class="b-chart">${b.heading ? `<div class="hd">${esc(b.heading)}</div>` : ""}${(b.bars || []).map((x, i) => `<div class="row"><span class="lb">${esc(x.label)}</span><div class="tr"><i id="${id}b${i}" class="${x.highlight ? "hl" : ""}"></i></div><b id="${id}v${i}">0</b></div>`).join("")}</div>`,
    css: (id, th) => `#${id} .b-chart { width: 900px; margin: 0 auto; padding: 44px 40px; ${card(th)} opacity: 0; }
      #${id} .hd { ${disp(th)} font-size: 56px; color: ${th.text}; margin-bottom: 30px; }
      #${id} .row { display: flex; align-items: center; gap: 20px; margin: 22px 0; }
      #${id} .lb { width: 220px; ${body(th)} font-weight: 700; font-size: 30px; color: ${th.text}; }
      #${id} .tr { flex: 1; height: 44px; border-radius: 22px; background: ${th.track}; overflow: hidden; }
      #${id} .tr i { display: block; height: 100%; border-radius: 22px; background: ${th.muted}; transform-origin: left center; }
      #${id} .tr i.hl { background: ${th.accent}; }
      #${id} .row b { width: 150px; text-align: right; ${disp(th)} font-size: 44px; color: ${th.text}; }`,
    js: (b, id, t0) => { const max = Math.max(...(b.bars || []).map(x => +x.value), 1);
      return `inU("#${id} .b-chart", ${f2(t0)});
      ${(b.bars || []).map((x, i) => `tl.set("#${id}b${i}", { scaleX: 0 }, 0); tl.to("#${id}b${i}", { scaleX: ${(+x.value / max).toFixed(3)}, duration: 0.6, ease: "power2.out" }, ${f2(t0 + 0.25 + i * 0.15)}); count("${id}v${i}", ${+x.value}, ${f2(t0 + 0.25 + i * 0.15)}, 0.6, ${x.decimals || 0});`).join("\n      ")}`; },
  },

  /* comment-keyword CTA, with an optional DM notification after */
  cta: {
    html: (b, id) => `<div class="b-cta"><div class="box">${esc(b.verb || "Comment")}<span id="${id}k"></span><i class="cur"></i></div>${b.dm ? `<div class="dm" id="${id}d"><i>${svg("comment", "#fff")}</i><div><b>${esc(b.handle || "")}</b><span>${esc(b.dm)}</span></div></div>` : ""}</div>`,
    css: (id, th) => `#${id} .b-cta { width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 26px; }
      #${id} .box { height: 120px; border-radius: 60px; background: #fff; display: flex; align-items: center; gap: 18px; padding: 0 40px; ${body(th)} font-weight: 600; font-size: 44px; color: #8A8D96; box-shadow: 0 20px 40px rgba(0,0,0,0.18); opacity: 0; }
      #${id} .box span { color: #16161A; font-weight: 700; } #${id} .cur { display: inline-block; width: 3px; height: 48px; background: ${th.accent}; }
      #${id} .dm { display: flex; align-items: center; gap: 18px; padding: 22px 26px; ${card(th)} opacity: 0; }
      #${id} .dm i { flex: none; width: 64px; height: 64px; border-radius: 18px; background: ${th.accent}; display: flex; align-items: center; justify-content: center; }
      #${id} .dm i svg { width: 34px; height: 34px; }
      #${id} .dm b { display: block; ${body(th)} font-weight: 700; font-size: 28px; color: ${th.text}; } #${id} .dm span { ${body(th)} font-weight: 600; font-size: 26px; color: ${th.muted}; }`,
    js: (b, id, t0, t1, T) => `inU("#${id} .box", ${f2(t0)});
      typeTo("${id}k", ${JSON.stringify(b.keyword || "")}, ${f2(T(b.keywordAt, t0 + 0.3))}, 0.3);
      ${b.dm ? `tl.fromTo("#${id}d", { opacity: 0, y: -40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.8)", immediateRender: false }, ${f2(T(b.dmAt, t0 + 1.2))});` : ""}`,
  },

  /* a big icon with a line of text (warning, tip, money, time...) */
  icon: {
    html: (b, id) => `<div class="b-icon"><div class="ic">${svg(b.icon || "bolt", "#fff")}</div><div class="tx">${esc(b.text)}</div>${b.sub ? `<div class="sb">${esc(b.sub)}</div>` : ""}</div>`,
    css: (id, th, b) => `#${id} .b-icon { text-align: center; padding: 0 70px; }
      #${id} .ic { width: 220px; height: 220px; margin: 0 auto 40px; border-radius: 60px; background: ${b.tone === "bad" ? th.bad : b.tone === "good" ? th.good : th.accent}; display: flex; align-items: center; justify-content: center; opacity: 0; box-shadow: 0 30px 50px rgba(0,0,0,0.2); }
      #${id} .ic svg { width: 120px; height: 120px; }
      #${id} .tx { ${disp(th)} font-size: 84px; color: ${th.text}; opacity: 0; }
      #${id} .sb { margin-top: 20px; ${body(th)} font-weight: 600; font-size: 36px; color: ${th.muted}; opacity: 0; }`,
    js: (b, id, t0) => `tl.fromTo("#${id} .ic", { opacity: 0, scale: 0.3, rotation: -30 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.32, ease: "back.out(2)", immediateRender: false }, ${f2(t0)});
      tl.fromTo("#${id} .tx", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, ${f2(t0 + 0.15)});
      tl.fromTo("#${id} .sb", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, ${f2(t0 + 0.4)});`,
  },
};
/* a code editor card; the "bad" line lights up red on "badAt" (secrets in code, a bug, a fix) */
BLOCKS.code = {
  html: (b, id) => `<div class="b-code"><div class="bar"><i></i><i></i><i></i><span>${esc(b.file || "app.js")}</span></div><div class="lines">${(b.lines || []).map((l, i) => `<div class="ln${i === b.bad ? " bad" : ""}" id="${id}l${i}"><u>${i + 1}</u><span>${esc(l)}</span></div>`).join("")}</div>${b.note ? `<div class="nt" id="${id}n">${esc(b.note)}</div>` : ""}</div>`,
  css: (id, th) => `#${id} .b-code { width: 920px; margin: 0 auto; border-radius: 26px; background: #15161B; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.3); opacity: 0; }
      #${id} .bar { height: 64px; background: #202128; display: flex; align-items: center; gap: 10px; padding: 0 22px; }
      #${id} .bar i { width: 14px; height: 14px; border-radius: 50%; background: #3A3B44; } #${id} .bar i:nth-child(1) { background: #FF5F57; } #${id} .bar i:nth-child(2) { background: #FEBC2E; } #${id} .bar i:nth-child(3) { background: #28C840; }
      #${id} .bar span { margin-left: 14px; font-family: "JetBrains Mono", monospace; font-size: 24px; color: #9A9CA5; }
      #${id} .lines { padding: 20px 0 26px; }
      #${id} .ln { position: relative; display: flex; gap: 24px; padding: 8px 30px; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 30px; line-height: 1.3; color: #D7D9E0; opacity: 0; white-space: pre; }
      #${id} .ln u { text-decoration: none; width: 30px; color: #5A5D66; text-align: right; }
      #${id} .ln.bad::before { content: ""; position: absolute; inset: 0; background: ${th.bad}; opacity: 0; }
      #${id} .ln.bad span, #${id} .ln.bad u { position: relative; }
      #${id} .nt { margin: 0 30px 28px; padding: 18px 22px; border-radius: 14px; background: ${th.bad}; color: #fff; font-family: "${th.body}", sans-serif; font-weight: 700; font-size: 30px; opacity: 0; }`,
  js: (b, id, t0, t1, T) => `inU("#${id} .b-code", ${f2(t0)});
      ${(b.lines || []).map((_, i) => `tl.fromTo("#${id}l${i}", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.14, immediateRender: false }, ${f2(t0 + 0.2 + i * 0.08)});`).join("\n      ")}
      ${b.bad !== undefined ? `tl.fromTo("#${id}l${b.bad}", { backgroundColor: "rgba(229,72,77,0)" }, { backgroundColor: "rgba(229,72,77,0.45)", duration: 0.2, immediateRender: false }, ${f2(T(b.badAt, t0 + 0.8))});
      tl.fromTo("#${id}l${b.bad}", { x: 0 }, { x: 8, duration: 0.05, yoyo: true, repeat: 5, immediateRender: false }, ${f2(T(b.badAt, t0 + 0.8) + 0.2)});` : ""}
      ${b.note ? `tl.fromTo("#${id}n", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, ${f2(T(b.noteAt, t0 + 1.4))});` : ""}`,
};

/* a signup form mock with a consent checkbox; "verdict" stamps it (e.g. pre-ticked = doesn't count) */
BLOCKS.form = {
  html: (b, id) => `<div class="b-form"><div class="ttl">${esc(b.title || "Create account")}</div>${(b.fields || ["Name", "Email", "Phone"]).map(f => `<div class="fld"><span>${esc(f)}</span><i></i></div>`).join("")}<div class="chk" id="${id}c"><b>${b.checked === false ? "" : "&#10003;"}</b><span>${esc(b.checkbox || "I agree to the terms")}</span></div><div class="btn">${esc(b.button || "Sign up")}</div>${b.verdict ? `<div class="vd" id="${id}v">${esc(b.verdict)}</div>` : ""}</div>`,
  css: (id, th) => `#${id} .b-form { position: relative; width: 760px; margin: 0 auto; padding: 44px 46px; ${card(th)} opacity: 0; }
      #${id} .ttl { ${disp(th)} font-size: 54px; color: ${th.text}; margin-bottom: 26px; }
      #${id} .fld { margin: 14px 0; padding: 20px 22px; border-radius: 16px; border: 2px solid #E4E4E8; display: flex; justify-content: space-between; ${body(th)} font-weight: 600; font-size: 30px; color: #8A8D96; }
      #${id} .chk { display: flex; align-items: center; gap: 18px; margin: 26px 0; ${body(th)} font-weight: 600; font-size: 28px; color: ${th.text}; }
      #${id} .chk b { flex: none; width: 46px; height: 46px; border-radius: 10px; background: ${th.accent}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30px; }
      #${id} .btn { padding: 22px; border-radius: 16px; background: ${th.ink}; color: ${th.onInk}; text-align: center; ${body(th)} font-weight: 700; font-size: 32px; }
      #${id} .vd { position: absolute; left: 50%; top: 52%; margin-left: -330px; width: 660px; padding: 16px 0 12px; text-align: center; background: ${th.bad}; color: #fff; ${disp(th)} font-size: 58px; box-shadow: 8px 8px 0 ${th.ink}; opacity: 0; }`,
  js: (b, id, t0, t1, T) => `tl.fromTo("#${id} .b-form", { opacity: 0, y: 80, rotation: -2 }, { opacity: 1, y: 0, rotation: 0, duration: 0.3, ease: "power3.out", immediateRender: false }, ${f2(t0)});
      tl.fromTo("#${id}c b", { scale: 0.2 }, { scale: 1, duration: 0.25, ease: "back.out(2.5)", immediateRender: false }, ${f2(T(b.checkAt, t0 + 0.5))});
      tl.fromTo("#${id}c", { backgroundColor: "rgba(229,72,77,0)" }, { backgroundColor: "rgba(229,72,77,0.18)", duration: 0.2, immediateRender: false }, ${f2(T(b.checkAt, t0 + 0.5) + 0.1)});
      ${b.verdict ? `tl.fromTo("#${id}v", { opacity: 0, scale: 1.8, rotation: 0 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.22, ease: "power4.out", immediateRender: false }, ${f2(T(b.verdictAt, t0 + 1.2))});` : ""}`,
};
export const BLOCK_TYPES = Object.keys(BLOCKS);

/** theme from brand + style overrides */
export function theme(brand, over = {}) {
  const c = brand.colors || {}, f = brand.fonts || {};
  return {
    ink: c.ink || "#16161A", onInk: "#FFFFFF", onInkMuted: "#B9BBC4", paper: c.paper || "#E9E8E4", card: "#FFFFFF",
    text: c.ink || "#16161A", muted: "#7A7D86", track: "#ECEBE7", accent: c.accent || "#D97757", accentText: c.accentText || "#C2562F",
    bad: "#E5484D", good: "#2DBE6C", display: f.display || "Archivo", body: f.body || "Instrument Sans", serif: f.serif || "Instrument Serif",
    big: 130, ...over,
  };
}

/**
 * Place beats into a region. Each beat runs from its "at" to the next beat's start (or "until"),
 * enters with its own animation and exits fast (pushed left) so the next can enter.
 * region: { top, height } (px). Returns { html, css, js, spans: [[t0,t1]] }.
 */
export function renderBeats(beats, { T, duration, th, region, prefix = "bt", exitGap = 0.2 }) {
  const out = { html: "", css: "", js: "", spans: [] };
  const starts = beats.map(b => Math.max(0, T(b.at) - 0.1));
  beats.forEach((b, i) => {
    const B = BLOCKS[b.type];
    if (!B) throw new Error(`unknown beat type "${b.type}" (types: ${BLOCK_TYPES.join(", ")})`);
    const id = `${prefix}${i}`, t0 = starts[i];
    const t1 = b.until !== undefined ? T(b.until) : (starts[i + 1] ?? duration);
    const r = b.region || region;
    out.spans.push([t0, t1]);
    // scaled graphics keep their layout width so the scaled result is exactly frame-wide
    const lw = Math.round(1080 / (r.scale || 1));
    const sc = r.scale && r.scale !== 1 ? ` style="width: ${lw}px; margin-left: ${Math.round((1080 - lw) / 2)}px; transform: scale(${r.scale}); transform-origin: 50% 50%;"` : "";
    out.html += `\n        <div class="beat" id="${id}" style="top:${r.top}px; height:${r.height}px;"><div class="bsc"${sc}>${B.html(b, id)}</div></div>`;
    out.css += `\n      ${B.css(id, th, b)}`;
    out.js += `\n      tl.set("#${id}", { opacity: 1 }, ${f2(t0)});\n      ${B.js(b, id, t0, t1, (ref, fb) => T(ref, fb))}`;
    if (t1 < duration - 0.05) out.js += `\n      tl.to("#${id}", { opacity: 0, x: -220, filter: "blur(10px)", duration: 0.18, ease: "power2.in" }, ${f2(Math.max(t0 + 0.3, t1 - exitGap))});\n      tl.set("#${id}", { x: 0, filter: "blur(0px)" }, ${f2(t1 + 0.01)});`;
  });
  out.css += `\n      .beat { position: absolute; left: 0; width: 1080px; display: flex; flex-direction: column; justify-content: center; opacity: 0; }`;
  return out;
}
