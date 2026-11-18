#!/bin/bash
# Installs the model router for every Claude Code session on this Mac.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)/model-router"
DEST="$HOME/.claude/mods/model-router"
SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude/mods"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
cp "$SETTINGS" "$SETTINGS.backup-before-router"
python3 - "$SETTINGS" "$DEST" <<'PY'
import json, sys
path, dest = sys.argv[1], sys.argv[2]
s = json.load(open(path))
env = s.setdefault("env", {})
dirs = [d for d in env.get("CLAUDE_CODE_PLUGIN_DIRS", "").split(":") if d]
if dest not in dirs:
    dirs.append(dest)
env["CLAUDE_CODE_PLUGIN_DIRS"] = ":".join(dirs)
json.dump(s, open(path, "w"), indent=2)
PY
echo "Installed. Restart Claude Code. Use /router off to turn it off, /router opus to lock a model."
