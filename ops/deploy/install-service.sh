#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="${CLAWPOINT_DEPLOY_DRY_RUN:-0}"
SERVICE_NAME="clawpoint.service"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
APP_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/clawpoint"
APP_STATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/clawpoint"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  eval "$@"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_SRC="$SCRIPT_DIR/../systemd/clawpoint.service"
SERVICE_DST="$SYSTEMD_USER_DIR/$SERVICE_NAME"
ENV_EXAMPLE="$SCRIPT_DIR/../../.env.production.example"
ENV_DST="$APP_CONFIG_DIR/.env.production"

run "mkdir -p '$SYSTEMD_USER_DIR' '$APP_CONFIG_DIR' '$APP_STATE_DIR/releases'"
run "cp '$SERVICE_SRC' '$SERVICE_DST'"

if [[ ! -f "$ENV_DST" ]]; then
  run "cp '$ENV_EXAMPLE' '$ENV_DST'"
fi

run "systemctl --user daemon-reload"
run "systemctl --user enable $SERVICE_NAME"

if command -v loginctl >/dev/null 2>&1; then
  run "loginctl enable-linger '$(id -un)'"
fi

printf 'service-installed:%s\n' "$SERVICE_DST"
