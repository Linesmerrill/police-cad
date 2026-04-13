# Lessons Learned

## 2026-04-13: playwright.config.ts caused production outage

**What happened:** Adding `playwright.config.ts` to the project root broke the Heroku deploy. The file imports `@playwright/test` (a devDependency). On Heroku with `NODE_ENV=production`, devDependencies aren't installed, so `next build` (triggered by `postinstall`) failed trying to compile the file.

**Root cause:** `tsconfig.json` includes `**/*.ts` which matches root-level config files. The `e2e/` directory was excluded but `playwright.config.ts` in the root was not.

**Fix:** Added `"playwright.config.ts"` to `tsconfig.json`'s `exclude` array.

**Rule:** Any `.ts` file in the project root that imports a devDependency MUST be added to `tsconfig.json`'s `exclude` list. Always verify `next build` works with `NODE_ENV=production` before merging.
