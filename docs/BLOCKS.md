# Graphic blocks (beats)

Motion styles put graphics on screen as **beats** in edit.json `"beats": [...]`. Every beat has a `type`,
an `at` (the word it lands on) and optionally `until` (the word it leaves on; default: when the next beat
starts). Inside a block, anything with its own `at` lands on that word. `at` can be `"word"`,
`"word#2"` (2nd time it's said), `"a phrase"`, or seconds. Write words exactly as they appear in
`cut-words.json` (the transcript often has digits: `"2"`, `"76%"`, not `"two"`). A wrong word stops the build with a clear error.

**The rule that matters most:** something on screen moves on every phrase. If a beat would sit still for
more than ~2s, give its items their own `at` words, or split it into two beats.
**Never invent** numbers, quotes or claims. Use what they said, or what they gave you.

| type | use for | fields |
|---|---|---|
| `title` | the hook, a section header | `kicker`, `text`, `sub` |
| `stat` | one number that matters | `value`, `decimals`, `prefix`, `suffix`, `label`, `tone`: good / bad, `note` + `noteAt` (a card under it) |
| `list` | 2-5 points said in a row | `heading`, `mark`: check / cross / number / dot, `items`: [{ `text`, `at` }] |
| `compare` | A vs B, before / after, old / new | `left` / `right`: { `label`, `value` }, `rightAt`, `winner`: left / right, `strikeAt` |
| `quote` | a line worth reading twice | `text`, `by` |
| `steps` | how-to steps | `items`: [{ `text`, `at` }] |
| `image` | a screenshot, product, photo they gave you (put it in `projects/<name>/assets/`) | `src` (file name), `frame`: phone / card / bare, `caption`, `w`, `h` |
| `logos` | two brands / tools / people | `left`, `right` (image file or text), `relation`: plus / vs / arrow / slash, `rightAt`, `slashAt` |
| `chat` | a conversation, an AI answer | `aiName`, `messages`: [{ `from`: me / ai, `text`, `at` }] (ai messages type out) |
| `chart` | a few numbers side by side | `heading`, `bars`: [{ `label`, `value`, `highlight` }] |
| `cta` | comment-to-get / follow | `verb` (Comment), `keyword`, `keywordAt`, `dm` + `dmAt` + `handle` (a DM notification after) |
| `code` | code on screen, a leaked key, a bug and its fix | `file`, `lines`: [..], `bad` (index of the line to light up red), `badAt`, `note` + `noteAt` |
| `form` | a signup / consent form, a checkout | `title`, `fields`: [..], `checkbox`, `checked`, `checkAt`, `button`, `verdict` + `verdictAt` (a stamp across it) |
| `icon` | a single idea, warning, tip | `icon`, `text`, `sub`, `tone`: good / bad |

Icons: bookmark, heart, comment, share, bell, check, cross, fire, phone, play, star, bolt, money, clock.

Example:

```json
{ "type": "compare", "at": "editor", "left": { "label": "Editor", "value": "₹3,000/reel" },
  "right": { "label": "This", "value": "₹0" }, "rightAt": "free", "winner": "right", "strikeAt": "never" }
```
