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

## Phase 7: Account Management & Auth Flows

**Goal**: Cover the full auth lifecycle beyond form rendering.

**Branch**: `feature/playwright-phase7-account-auth`

**Steps**:
1. Signup → email verification (`/signup/verify/:token`) end-to-end
2. Password reset end-to-end: request → `/reset/:token` → login with new password
3. Password change flow in `/manageAccount`
4. Email change flow
5. Account deactivation ("Danger Zone" button, `/api/v1/user/:userId/deactivate`)
6. Invalid / expired reset token handling
7. Logout + session invalidation (subsequent protected-route access redirects)

**Catches**: Broken verification links, reset-token regressions, deactivation bugs, session-teardown gaps.

---

## Phase 8: Civilian CRUD

**Goal**: Exercise civilian dashboard write paths — currently only reads are tested.

**Branch**: `feature/playwright-phase8-civilian-crud`

**Steps**:
1. Create civilian
2. Edit civilian fields
3. Delete civilian
4. Add / edit / delete vehicle (`/updateOrDeleteVeh`)
5. Add / edit / delete firearm (`/updateOrDeleteFirearm`)
6. Add / edit / delete license (`/updateOrDeleteLicense`)
7. Clean up all created records at end of each test

**Note**: `views/civ-dashboard.ejs` is ~248 KB with many duplicate IDs across civilian cards — use scoped selectors (parent card → child control).

**Catches**: Civilian form regressions, orphaned vehicle/firearm/license rows, modal wiring bugs.

---

## Phase 9: Dispatch Operations & Call Management

**Goal**: Cover active-duty officer/dispatcher write paths.

**Branch**: `feature/playwright-phase9-dispatch-ops`

**Steps**:
1. Create call via `/create-call` (UI form submission)
2. Assign unit(s) to a call
3. Change officer status via `/updateUserDispatchStatus`
4. Update call notes / status
5. Close call (`/updateOrDeleteCall`)
6. 10-code selection
7. Round-trip check: UI-driven write should trigger the socket events already asserted in `call-realtime.spec`

**Catches**: Call-creation regressions, status-broadcast mismatches, unit-assignment bugs.

---

## Phase 10: Records — Warrants, BOLOs, Most Wanted, Arrests & Citations

**Goal**: CRUD for every record a user can file against a civilian.

**Branch**: `feature/playwright-phase10-records-crud`

**Steps**:
1. Create / edit / delete warrant (`/create-warrant`)
2. Create / edit / delete BOLO — actual form submission, not just button visibility. Use the `#createBolos` hash workaround noted in Phase 3 quirks so the button is reachable in 1280px CI viewport.
3. Most Wanted add / edit / remove
4. Arrest report create / edit / delete (`/create-arrest-report`, `arrest-modal.ejs`)
5. Ticket / citation create (`/create-ticket`)
6. Warning create
7. Medical report create (`/create-medical-report`)
8. Reuse the seeded civilian from Phase 8 fixtures if possible

**Catches**: Record-form regressions, modal submit handlers, record-to-civilian linkage.

---

## Phase 11: Community & Admin Management

**Goal**: Community lifecycle + admin console + real permission enforcement.

**Branch**: `feature/playwright-phase11-community-admin`

**Steps**:
1. Create community: `/createCommunity` plus police (`/createPoliceCommunity`) and EMS (`/createEmsCommunity`) variants
2. Edit community name / settings (`/updateCommunityName`)
3. Delete community (`/delete-community`)
4. Invite join flow (`/invite/:code`)
5. Role assignment: owner / member / guest
6. Admin login + `/admin/console` user search & edit
7. `/admin/reset-user-password`
8. Permissions matrix: civilian user attempting officer-only routes should be rejected (403 / redirect, not 500)

**Catches**: Community-creation regressions, invite-link bugs, admin privilege-escalation gaps.

---

## Phase 12: Court, Billing, Content Creators & Feature Requests

**Goal**: Peripheral but business-critical flows. Mock Stripe at the network boundary — do not hit the live Stripe API from CI.

**Branch**: `feature/playwright-phase12-court-billing`

**Steps**:
1. Court case create / edit / view (`/court-cases`, 57 KB view)
2. Court session scheduling (`/court-session`)
3. Subscription checkout: click through, assert redirect URL shape from `/api/v1/user/create-checkout-session` and `/api/v1/community/create-checkout-session`
4. `/manage-subscription` page renders
5. `/subscription/success` and `/subscription/cancel` return pages render
6. Feature request: create (`/feature-requests/new`), upvote, comment
7. Announcement create + visibility in community dashboard
8. Content creator apply (`/app/content-creators/apply`) + directory browse (`/app/content-creators`)

**Catches**: Checkout-redirect regressions, court-case form bugs, feature-request voting logic, content-creator portal regressions.

---

## Phase 13: Uploads, Validation & Responsive

**Goal**: Boundary and polish coverage that doesn't fit elsewhere.

**Branch**: `feature/playwright-phase13-uploads-validation`

**Steps**:
1. Avatar upload via Cloudinary signed request (small test image fixture, uses `/api/v1/cloudinary-config` and `/api/v1/generate-signature`)
2. Evidence photo upload on arrest / incident report
3. Signup rejects duplicate email + duplicate username
4. XSS-ish payloads in name / plate fields are escaped in rendered output
5. Max-length field rejection
6. Empty-results state for search (name / plate / firearm)
7. Mobile-viewport runs for landing + civilian dashboard + one officer flow (iPhone 13 preset via Playwright `devices`)

**Catches**: Upload regressions, validation bypasses, XSS rendering bugs, mobile layout breakage.

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
