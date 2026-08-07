#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== learning checks =="
npm run test:learning

echo "== build =="
npm run build

PORT=5179
echo "== preview =="
npx vite preview --host 127.0.0.1 --port "$PORT" >/tmp/ssuk-preview.log 2>&1 &
PID=$!
cleanup() { kill "$PID" 2>/dev/null || true; }
trap cleanup EXIT
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf -o /dev/null -m 2 "http://127.0.0.1:$PORT/"; then break; fi
  sleep 0.4
done

echo "== smoke routes =="
for path in / /games /games?cat=math /games/color-follow /games/sand-play /games/bus-count /parents /explore; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 "http://127.0.0.1:$PORT$path")
  echo "$path -> $code"
  [[ "$code" == "200" ]] || exit 1
done

echo "OK"
