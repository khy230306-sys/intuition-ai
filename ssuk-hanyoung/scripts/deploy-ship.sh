#!/usr/bin/env bash
# Deploy 쑥쑥놀이터 to ShipStatic (snapshot URL).
# For a FIXED custom subdomain, claim the deployment once in the browser, or set SHIP_API_KEY.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
npx -y @shipstatic/ship ./dist --json | tee /tmp/ssuk-ship.json
node -e '
const j=JSON.parse(require("fs").readFileSync("/tmp/ssuk-ship.json","utf8"));
console.log("\nURL:", j.url);
console.log("CLAIM (고정주소로 저장):", j.claim);
'
