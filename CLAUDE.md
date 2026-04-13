# police-cad (Frontend Website)

## Tech Stack

- Next.js 14 + Express.js hybrid server
- EJS templates (legacy, being migrated to Next.js)
- Tailwind CSS, TypeScript
- MongoDB via Mongoose, Passport.js auth
- Socket.IO for real-time features

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
