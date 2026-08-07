# Deploy policy (standing user instruction)

After a successful app change that is ready to ship:

1. Deploy **Preview** (`npm run deploy:preview` → https://lightlab-92m8bq7.shipstatic.com)
2. Deploy **Production** (`npm run deploy:web` → https://jarvis-app.shipstatic.com)

Do **not** wait for the user to ask for a Production update. Always push the latest green build to `jarvis-app.shipstatic.com` unless the user explicitly says to hold Production.

Share only the fixed URLs — never random snapshot `*.shipstatic.com` links.
