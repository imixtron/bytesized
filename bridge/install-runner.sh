#!/bin/zsh
# Installs (or reinstalls) the host runner as a launchd agent for this user.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Library/LaunchAgents/com.bytesized.runner.plist"
mkdir -p "$ROOT/bridge/inbox" "$ROOT/bridge/logs" "$(dirname "$DEST")"
sed -e "s#__ROOT__#$ROOT#g" -e "s#__HOME__#$HOME#g" "$ROOT/bridge/launchd/com.bytesized.runner.plist" > "$DEST"
launchctl bootout "gui/$(id -u)/com.bytesized.runner" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "✔ com.bytesized.runner installed ($DEST)"
