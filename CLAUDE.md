# police-cad (Frontend Website)

## Tech Stack

- Next.js 14 + Express.js hybrid server
- EJS templates (legacy, being migrated to Next.js)
- Tailwind CSS, TypeScript
- MongoDB via Mongoose, Passport.js auth
- Socket.IO for real-time features

## Deploys: a merge to `main` is a release

**Merging to `main` deploys to Heroku immediately. Merged means live.**

Back-to-back merges mean back-to-back deploys, and each deploy disrupts live
API calls for customers who are mid-session. One feature spread over five PRs
merged into `main` is five disruptions, not one.

### Never target `main` directly — use one integration branch per workstream

1. Pick **one integration branch** for the workstream, e.g. `feature/developer-api-website`.
2. Every PR in that workstream targets the **integration branch**, never `main`.
3. Merrill merges those PRs into the integration branch and tests the branch as a whole.
4. **One** PR takes the integration branch into `main`, so the feature deploys once.

Only the integration branch gets a `-> main` PR. Several PRs from one
workstream open against `main` is a mistake to fix by retargeting them, not a
reason to merge them one at a time.

Never push to `main` directly, not even for a hotfix.

### Consequence: no CI on the stacked PRs

Both workflows here are gated on `pull_request: branches: [main]`
(`.github/workflows/e2e-tests.yml`, `codeql-analysis.yml`), so a PR targeting
an integration branch gets **no checks at all** — no Playwright run, no CodeQL.
That is expected. Do not retarget a PR to `main` to make CI run.

Verify those PRs locally instead:

```bash
npx next lint          # tsc --noEmit alone misses ESLint errors that fail `next build`
npx tsc --noEmit
```

The integration branch's own `-> main` PR is the CI gate. Do not run the full
E2E stack locally; let it run in CI on that PR.

## Running Locally

```bash
npm install
npm run dev        # Starts on port 8080
```

Requires `.envrc` with `DB_URI`, `POLICE_CAD_API_URL`, etc.

## Testing

### E2E Tests (Playwright)

- **All new features MUST include Playwright tests** covering the happy path and key error cases
- Tests live in `e2e/tests/` organized by feature area
- Use Page Object Model pattern — page objects in `e2e/pages/`
- NEVER point tests at production — always use the Docker Compose test environment

#### Running Tests

```bash
# Start isolated test services (MongoDB + API in containers)
docker compose -f docker-compose.test.yml up -d

# Run all tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run a specific test file
npx playwright test e2e/tests/public/landing.spec.ts

# Stop test services
docker compose -f docker-compose.test.yml down
```

#### Writing Tests

1. Create a page object in `e2e/pages/` if the page doesn't have one yet
2. Create test file in the appropriate `e2e/tests/<category>/` directory
3. Use `test-fixtures.ts` for unauthenticated pages, default `@playwright/test` for authenticated
4. Auth state is stored in `e2e/.auth/` (gitignored) — set up via `e2e/auth.setup.ts`
5. CI runs tests on every PR via `.github/workflows/e2e-tests.yml`

#### Test Environment

- `docker-compose.test.yml` — spins up isolated MongoDB (port 27018) + police-cad-api (port 8081)
- `e2e/.env.test` — test environment variables (gitignored, see `.env.test.example`)
- Test database is ephemeral (tmpfs) — wiped when containers stop
