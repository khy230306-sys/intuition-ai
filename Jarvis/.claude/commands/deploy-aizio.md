Deploy AIZIO Preview then Production from `Jarvis/`.

1. Ensure tests relevant to the change pass
2. Bump version in `package.json` and `APP_VERSION` in `src/main.ts` if not already
3. `npm run deploy:preview`
4. `npm run deploy:web`
5. Commit build-meta sync
6. Report only the fixed URLs
