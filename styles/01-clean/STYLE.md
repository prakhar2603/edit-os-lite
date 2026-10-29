# 01 · Clean

A tight, polished talking head, the way a good editor would cut a phone video. No motion design:
jump cuts hidden by alternating framing, smooth captions with a few highlighted words, an optional
small title on the hook, an optional info card and icon pops. The default; most creators need nothing more.

Reference: `reference.mp4`.

## edit.json

```json
{
  "style": "clean",
  "title":   { "kicker": "Psychology, simply", "text": "What is BPD?", "until": 6.5 },
  "accents": ["borderline", "rock", "trigger"],
  "card":    { "at": "self-harm", "title": "Struggling? Call Tele-MANAS 14416", "text": "Free, confidential, 24x7", "icon": "phone" },
  "cues":    [{ "at": "save", "icon": "bookmark" }],
  "merge":   [["left on red", "left on read"]],
  "clean":   { "zoom": [1.14, 1.28], "shiftY": [-110, -100], "captionY": 1190 }
}
```

- `title` (optional): a short kicker (2-4 words) and a headline (2-5 words) for the first ~6s. Write it
  from what they say; don't invent a claim. `until` is when it leaves (word or seconds).
- `accents`: 10-25 key words across the video (topic terms, emotional words, the CTA verb). They show in
  the highlight colour. Never more than one per caption on average.
- `card` (optional): one info card from a word to the end (or `until`). Use for helplines, a handle, a link.
- `cues`: an icon pop on a word. Icons: bookmark, heart, comment, share, bell, check, cross, fire, phone,
  play, star, bolt, money, clock. One per CTA word ("save", "follow", "comment") at most.
- `clean` (optional): framing. `zoom` = the two alternating scales, `shiftY` = how far to raise the frame
  (negative = up, removes headroom). Look at the preview: the head should sit just below y 240 and the
  frame must never show an edge. Landscape footage is centred and cropped automatically.
