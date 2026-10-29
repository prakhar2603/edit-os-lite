#!/bin/bash
# One-time setup for Edit OS (macOS). Safe to run again: it only installs what's missing.
#   ./setup.sh          install + check
#   ./setup.sh --check  check only
set -u
cd "$(dirname "$0")"
HF="hyperframes@0.8.33"
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad()  { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=1; }
FAIL=0
CHECK_ONLY=0; [ "${1:-}" = "--check" ] && CHECK_ONLY=1

echo "Edit OS setup"
[ "$(uname)" = "Darwin" ] || { echo "This version runs on macOS."; exit 1; }

if ! command -v brew >/dev/null 2>&1; then
  bad "Homebrew is missing. Install it first (it asks for your Mac password), then run ./setup.sh again:"
  echo '      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  exit 1
fi
ok "Homebrew"

need() {  # need <command> <brew package>
  if command -v "$1" >/dev/null 2>&1; then ok "$2"
  elif [ $CHECK_ONLY = 1 ]; then bad "$2 missing (run ./setup.sh)"
  else echo "  … installing $2"; brew install "$2" >/dev/null && ok "$2 installed" || bad "could not install $2"; fi
}
need node node
need ffmpeg ffmpeg
need whisper-cli whisper-cpp

if command -v node >/dev/null 2>&1; then
  v=$(node -p 'process.versions.node.split(".")[0]'); [ "$v" -ge 20 ] && ok "Node $v" || bad "Node $v is too old (need 20+): brew upgrade node"
fi

# HyperFrames (the renderer) downloads its headless browser and the speech model on first use
if [ $CHECK_ONLY = 0 ]; then echo "  … preparing the renderer (first time takes a few minutes)"; fi
npx --yes "$HF" doctor >/tmp/editos-doctor.txt 2>&1
grep -q "FFmpeg" /tmp/editos-doctor.txt && ok "HyperFrames renderer" || bad "HyperFrames did not start: see /tmp/editos-doctor.txt"

# the speech model, fetched once (~1.5 GB) so the first edit doesn't stall
if [ $CHECK_ONLY = 0 ] && [ -f samples/hello.mp4 ]; then
  echo "  … downloading the speech model (one time)"
  mkdir -p /tmp/editos-tx && npx --yes "$HF" transcribe samples/hello.mp4 -d /tmp/editos-tx -m medium.en --json >/dev/null 2>&1 && ok "speech model" || bad "speech model download failed"
fi

df -g . | awk 'NR==2 { if ($4 < 10) { print "  ! less than 10 GB free; renders need room" } }'
echo
[ $FAIL = 0 ] && echo "All set. Open this folder in Claude Code and say: edit my video" || echo "Fix the ✗ lines above, then run ./setup.sh again."
exit $FAIL
