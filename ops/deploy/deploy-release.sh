#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <release-bundle-dir>" >&2
  exit 1
fi

DRY_RUN="${CLAWPOINT_DEPLOY_DRY_RUN:-0}"
BUNDLE_DIR="$1"
APP_STATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/clawpoint"
RELEASES_DIR="$APP_STATE_DIR/releases"
CURRENT_LINK="$APP_STATE_DIR/current"
SERVICE_NAME="clawpoint.service"
HEALTHCHECK_URL="${CLAWPOINT_HEALTHCHECK_URL:-http://127.0.0.1:4176/api/healthz}"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET_DIR="$RELEASES_DIR/$RELEASE_ID"
PREVIOUS_TARGET=""

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  eval "$@"
}

healthcheck() {
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsS "$HEALTHCHECK_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if [[ ! -d "$BUNDLE_DIR" ]]; then
  echo "bundle directory not found: $BUNDLE_DIR" >&2
  exit 1
fi

mkdir -p "$RELEASES_DIR"
if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK")"
fi

run "mkdir -p '$TARGET_DIR'"
run "cp -R '$BUNDLE_DIR'/.' '$TARGET_DIR'/"
run "cd '$TARGET_DIR' && npm ci --omit=dev"

if systemctl --user list-unit-files "$SERVICE_NAME" >/dev/null 2>&1; then
  run "systemctl --user stop $SERVICE_NAME || true"
fi

run "ln -sfn '$TARGET_DIR' '$CURRENT_LINK'"
run "systemctl --user start $SERVICE_NAME"

if [[ "$DRY_RUN" == "1" ]]; then
  printf 'release-deployed:%s\n' "$TARGET_DIR"
  exit 0
fi

if healthcheck; then
  printf 'release-deployed:%s\n' "$TARGET_DIR"
  exit 0
fi

echo "health check failed after deploy" >&2
if [[ -n "$PREVIOUS_TARGET" && -d "$PREVIOUS_TARGET" ]]; then
  ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
  systemctl --user restart "$SERVICE_NAME" || true
fi
exit 1
