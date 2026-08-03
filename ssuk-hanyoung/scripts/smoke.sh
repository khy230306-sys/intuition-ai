#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== build =="
npm run build

echo "== local =="
if curl -sf -o /dev/null -m 5 http://127.0.0.1:5173/; then
  echo "vite: OK http://127.0.0.1:5173/"
else
  echo "vite: DOWN — run: npm run dev -- --host 0.0.0.0 --port 5173"
  exit 1
fi

echo "== smoke routes =="
for path in / /games /games/color-follow /games/sand-play; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 "http://127.0.0.1:5173$path")
  echo "$path -> $code"
  [[ "$code" == "200" ]] || exit 1
done

echo "OK"
