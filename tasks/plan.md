# Playwright E2E Testing — Remaining Phases

## Completed

- **Phase 1**: Foundation — scaffold, public page tests, auth tests (PR #885, merged)
- **Phase 2**: Dashboard smoke tests — all 8 dashboard types, navigation, auth redirects (PR #885, merged)
- **Phase 3**: Search & BOLO tests — name/plate/firearm search, BOLO section (PR #888, merged)
- **CI Workflow**: `.github/workflows/e2e-tests.yml` running on every PR (Docker Compose + Playwright)

**Current test count: 51 passing**

## Phase 4: Community & Real-Time Features

**Goal**: Community management and Socket.IO live updates tested.

**Branch**: `feature/playwright-phase4-realtime-tests`

**Steps**:
1. Create `e2e/fixtures/socket-fixture.ts` with `socket.io-client`
   - Note: website uses `transports: ['websocket']` only (no polling)
2. Test community creation flow
3. Test joining a community via invite code
4. Test community settings page
5. Test announcements CRUD (create, view, delete)
6. Test panic alert broadcast via socket
7. Test status updates broadcast (dispatch status changes)
8. Test BOLO/call real-time updates (emit from socket, verify UI reflects)

**Key files to understand**:
- `app/routes.js` — Socket.IO setup (search for `io.on('connection'`)
- `views/command-dashboard.ejs` — Socket event listeners
- `public/js/cd-*.js` — Component JS that listens for socket events

**Catches**: Socket.IO regressions, community management bugs, real-time update failures.

---

## Phase 5: CI/CD Improvements + Account Tests

**Goal**: Harden CI reliability and add account management tests.

**Branch**: `feature/playwright-phase5-ci-account`

**Steps**:
1. Add account management tests:
   - Profile page loads, displays user info
   - Settings page loads
   - Profile edit form validation
2. Consider parallelizing CI test shards (currently `workers: 1` in CI)
   - Note: Tests share seeded data, so parallel may cause flakiness. Test carefully.
3. Add retry logic for flaky Docker Compose startup
4. Pin Playwright version in CI for reproducibility
5. Add test coverage reporting (which routes/pages are tested vs not)
6. Update GitHub Actions Node.js version warning (currently using Node 20, will need Node 24 by June 2026)

**Catches**: Profile/settings regressions, CI reliability issues.

---

## Phase 6: Error Handling & Edge Cases

**Goal**: Negative paths and robustness.

**Branch**: `feature/playwright-phase6-error-tests`

**Steps**:
1. Test 404 page — navigate to `/nonexistent-route`, verify error page renders
2. Test 401 unauthorized — access protected route without auth, verify redirect to login
3. Test invalid ObjectId params — e.g., `/community/not-a-valid-id`
4. Test rate limiting behavior (set `RATE_LIMIT_MAX` low, verify 429 response)
5. Test expired/invalid session handling
6. Test error page styling and back navigation

**Catches**: Error page regressions, auth guard gaps, invalid input handling.

---

## Infrastructure Notes

### Running tests locally
```bash
# Start test services
docker compose -f docker-compose.test.yml up -d

# Run tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Stop services
docker compose -f docker-compose.test.yml down
```

### Key architecture decisions
- Tests run against real police-cad-api via Docker Compose (not mocked)
- Test MongoDB on port 27018 (tmpfs, wiped on stop) — never touches production
- Seed data uses fixed ObjectIds for deterministic references
- Auth state saved to `e2e/.auth/user.json` (gitignored)
- Public page tests use `unauthPage` fixture (no stored session)
- Command dashboard has duplicate element IDs between MDT overview and focused cards — use scoped selectors

### Known quirks
- BOLO "New BOLO" button hidden in MDT overview column in CI (1280px viewport with 280px sidebar) — test uses `#createBolos` hash for focused view instead
- `wait-on` checks `http://localhost:8080` (no /health endpoint on website) and `http://localhost:8081/health` (API has /health)
- Website `postinstall` runs `next build` — CI needs `NEXT_PUBLIC_POLICE_CAD_API_URL` set during `npm ci`
- `mongodb` must be in production dependencies (not devDeps) because Next.js bundles seed helper imports
- `playwright.config.ts` must be in tsconfig `exclude` or Heroku build crashes (imports devDep)
