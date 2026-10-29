# Edit OS Lite (free)

Drop in your raw phone clips. Say "edit my video". Get a finished, captioned vertical reel.

Edit OS turns Claude Code into your video editor. It cuts your retakes and pauses, picks the best take of
every line, frames you, captions every word, and renders a ready-to-post 1080x1920 video. Then you tell it
what to change, and it changes it.

Lite includes 2 styles:
- **Style 1, Clean:** polished captions, no graphics.
- **Style 2, Bold:** big word-pop captions, punch zooms, graphic cutaways.

The premium styles from my reels (collage, animated explainer, cinematic, neon, "copy any reel's style") are in
the full version. Waitlist: DM @prakhardoesai on Instagram.

## What you need
- A Mac (Apple silicon or Intel) with about 10 GB free.
- A Claude subscription with Claude Code (Pro or higher).
- 10 minutes for the one-time setup.

## Setup (once)
1. Put this folder somewhere you'll keep it (e.g. `Documents/Edit OS Lite`).
2. Open Terminal, type `cd ` (with a space), drag the folder in, press Enter, then run:
   ```
   ./setup.sh
   ```
   It installs what's missing (Homebrew asks for your Mac password once) and checks everything.
3. Open the folder in Claude Code and say **"edit my video"**.

## Using it
Talk to Claude like you'd talk to an editor:
- "Edit the clips in my Downloads folder: IMG_6159 to IMG_6164. Style 2."
- "Make the captions smaller."
- "Cut the line about Gen Z."
- "Same video, style 1."

Claude shows you the cut as text first (which lines it kept, what it cut) and waits for your yes. Then it builds
the edit, checks it, renders it, and tells you where the file is.

**Filming tips:** film vertical, face the light, phone at eye level, and don't worry about mistakes: just say the
line again. Edit OS keeps the best take.
