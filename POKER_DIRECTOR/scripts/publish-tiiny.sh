#!/usr/bin/env bash
# Publish/refresh POKER DIRECTOR to tiiny.host
# Permanent publish requires TIINYHOST_API_KEY; anonymous email uploads expire ~1h.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${TIINY_DOMAIN:-poker-director.tiiny.site}"
EMAIL="${TIINYHOST_EMAIL:-khy230306@gmail.com}"

if [[ ! -f "$ROOT/dist/index.html" ]]; then
  echo "Missing dist/. Run npm run build first." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
(cd "$ROOT/dist" && zip -qr "$TMP/site.zip" . -x '*.netlify*' -x '.netlify/*')

ARGS=(-F "domain=${DOMAIN}" -F "files=@${TMP}/site.zip")
if [[ -n "${TIINYHOST_API_KEY:-}" ]]; then
  curl -sS -X PUT "https://ext.tiiny.host/v1/upload" \
    -H "x-api-key: ${TIINYHOST_API_KEY}" \
    "${ARGS[@]}"
else
  curl -sS -X POST "https://ext.tiiny.host/v1/upload" \
    -H "x-email: ${EMAIL}" \
    "${ARGS[@]}"
fi
echo
echo "URL: https://${DOMAIN}/"
