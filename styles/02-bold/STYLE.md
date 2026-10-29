# 02 · Bold

Big uppercase captions (1-3 words) where the spoken word lights up and pops, hard punch-in zooms on the
words that hit, and optional full-screen graphic cutaways. For coaches, hot takes, motivation, business
and finance creators: anything that should feel fast and loud.

## edit.json

```json
{
  "style": "bold",
  "accents": ["money", "never", "free"],
  "punches": ["never", "free#2", { "at": "million", "scale": 1.25 }],
  "beats": [
    { "type": "stat", "at": "lakh", "until": "but", "value": 12, "suffix": " lakh", "label": "in 30 days", "tone": "good" },
    { "type": "list", "at": "three", "heading": "3 rules", "mark": "number", "items": [{ "text": "Post daily", "at": "daily" }] }
  ],
  "merge": [["twelve lakh", "12 lakh"]],
  "bold": { "captionY": 1240, "highlight": "#FFE45C", "zoom": [1.12, 1.22], "shiftY": [-90, -80] }
}
```

- `accents`: words that stay in the highlight colour (5-15 per minute). Every spoken word flashes the
  highlight as it's said anyway.
- `punches`: instant punch-in zooms (held ~1.1s) on 1 word every 6-10s. Not on consecutive sentences.
- `beats` (optional): full-screen graphic cutaways over the brand paper; captions stay on top. Use 2-4 per
  minute, each on a moment that has a number, a list, a comparison or a quote. Block types and fields:
  `docs/BLOCKS.md`. Each beat lasts until the next one or its `until` word; keep them 2-5s.
- Numbers on screen must be what they said. Never invent a stat.
