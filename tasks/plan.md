# Playwright E2E Testing — Remaining Phases

## Completed

- **Phase 1**: Foundation — scaffold, public page tests, auth tests (PR #885, merged)
- **Phase 2**: Dashboard smoke tests — all 8 dashboard types, navigation, auth redirects (PR #885, merged)
- **Phase 3**: Search & BOLO tests — name/plate/firearm search, BOLO section (PR #888, merged)
- **Phase 8**: Civilian CRUD + vehicle/firearm/license writes (merged) — shipped the `createTestCivilian`/`createTestVehicle`/`createTestFirearm`/`createTestLicense` DB helpers and the `policecad_test` Docker Compose test rig
- **Phase 9**: Dispatch call CRUD (PR #897, green) — create/note/complete/delete a call via the modal + via seeded data. Uncovered and fixed the hardcoded-production-`API_URL` bug in `public/js/dispatch-dashboard.js` (commit 62e2c0fb). Same pattern was already fixed in `civ-dashboard.ejs` in Phase 8 (53771cd); assume every other dashboard JS still has it and fix pre-emptively in later phases.
- **CI Workflow**: `.github/workflows/e2e-tests.yml` running on every PR (Docker Compose + Playwright)

**Current test count: ~113 passing** (51 from Phase 1–3 + Phase 8 civ/vehicle/firearm/license + Phase 9's 4 call CRUD)

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

**Branch**: `feature/playwright-phase10-records-crud` (branched off phase 9 head so PR #897 can land first or both can rebase onto main cleanly)

### Surface-area map (confirmed via repo exploration, 2026-04-17)

| Record | Create route / API | Modal / view | Collection | Dashboard |
|---|---|---|---|---|
| Warrant | POST `/create-warrant`, clear via POST `/clear-warrant` | `#createWarrantModal` in `views/police-dashboard.ejs` | `warrants` — `{ _id, warrant: {...}, __v }` | police-dashboard |
| BOLO | POST `/create-bolo`, update/delete via `/updateOrDeleteBolo` + `/api/v1/bolo/{id}` | `#createBolos` component in `command-dashboard.ejs`, rendered by `cdBolosRender()` | `bolos` — `{ _id, bolo: {...}, __v }` | command-dashboard & dispatch-dashboard |
| Most Wanted | POST `/api/v1/most-wanted`, PUT/DELETE `/api/v1/most-wanted/{id}` | `#addMostWantedModal` (custom overlay, NOT Bootstrap `.modal`) in `views/most-wanted.ejs` | `mostwanted` (TBC) — `{ _id, civilianId, charges[], threatLevel, ... }` | standalone `/most-wanted` page |
| Arrest report | POST `/create-arrest-report` (server route) | `#arrestModal` in `views/arrest-modal.ejs`, included from police-dashboard | `arrestreports` — `{ _id, arrestReport: {...}, __v }` | police-dashboard |
| Ticket / citation | POST `/create-ticket` (server route) | `#ticketModal` in dispatch-dashboard.ejs and police-dashboard.ejs | `tickets` — `{ _id, ticket: {...}, __v }` | police & dispatch dashboards |
| Warning | POST `/api/v1/civilian/{id}/criminal-history` (no dedicated collection) | `#warningModal` in dispatch-dashboard.ejs | stored inline as `civilians.criminalHistory[] { type: "Warning", ... }` | police & dispatch dashboards |
| Medical report | POST `/create-medical-report` (form POST, not AJAX) | form embedded in `ems-dashboard.ejs` — no modal ID, likely inline | `medicalreports` — `{ _id, report: {...}, __v }` | ems-dashboard |

### Key findings from exploration

- **Existing helpers** in `e2e/helpers/db.ts` cover civilian / vehicle / firearm / license / call only. Phase 10 must add: `createTestWarrant`, `createTestBolo`, `createTestArrestReport`, `createTestTicket`, `createTestMostWanted`, `createTestMedicalReport`, plus matching `getXxxById` + `deleteXxxByPrefix`. Warnings have no collection — seed via `$push` into `civilians.criminalHistory[]` on the seeded civilian.
- **Reuse `TEST_CIVILIAN_ID` = `'cccccccccccccccccccccccc'`** from `e2e/helpers/seed.ts` for every record — no per-test civilian creation.
- **Admin/role gating (confirmed with user 2026-04-17, rechecked against `police-cad-api` 2026-04-17)**:
  - The dashboard admin check in `app/routes.js` calls `/api/v1/community/{id}/roles` and looks for a role with `{ permissions: [{ name: 'administrator', enabled: true }] }` whose `members` includes the user ID string. Community owner alone is NOT automatically admin — the API's `CreateCommunity` handler seeds a "Head Admin" role on creation, but our `e2e/helpers/seed.ts` short-circuits that and inserts a community without any `roles[]` array. Result: today's test user has zero roles.
  - HOWEVER the dashboards have a fallback path: if `department.approvalRequired === false` (public department), `accessStatus` defaults to `"approved"` regardless of admin status (`community.go:4538`). Our seed creates Test PD with `approvalRequired: false`. So the user CAN reach `/police-dashboard?d=<b64-dept-id>&dept=Test%20PD` and `/ems-dashboard?...` without any roles edits. **No seed change needed for Phase 10.**
  - Record-creation routes (`/create-warrant`, `/create-bolo`, `/create-arrest-report`, `/create-ticket`, `/create-medical-report`) only use `auth` middleware with no permission checks — auth alone is enough.
  - For Phase 11's permissions-matrix tests we'll need to seed a non-admin / department-less user and assert rejections. Out of scope here.
- **Hardcoded-`API_URL` audit (completed 2026-04-17)** — real offenders that will break Phase 10 CI:
  - `views/police-dashboard.ejs:3794` — `var API_URL = 'https://...herokuapp.com';`. Must switch to `<%= typeof apiUrl !== 'undefined' && apiUrl ? apiUrl : 'fallback' %>` pattern (same fix Phase 8 applied to `civ-dashboard.ejs`).
  - `views/most-wanted.ejs:1647` — same bug, same fix.
  - `public/js/dispatch-dashboard.js:205,285,351,377` — four inline BOLO AJAX URLs hardcoded to Heroku (template-literal backticks with the full prod URL baked in). Only hit if BOLO tests go through dispatch-dashboard. Prefer routing BOLO tests through `command-dashboard` (`views/command-dashboard.ejs:604` wires `window.ddConfig.API_URL` from the `apiUrl` template var correctly → `cd-bolos.js` reads it → no bug).
  - `views/command-dashboard.ejs` — OK (uses `<%= apiUrl %>`).
  - `public/js/ems-dashboard.js` — OK (uses `POLICE_CAD_API_URL` which `ems-dashboard.ejs:4490` sets from env at render time).
  - `public/js/police-dashboard.js` — references a bare `API_URL` (global), so will be correct once the EJS is fixed.
  - `views/civ-dashboard-backup.ejs` — dead file, ignore.
- **BOLO 1280px CI quirk**: phase 3 worked around the MDT overview column clipping the "New BOLO" button by navigating via the `#createBolos` hash to force the focused view. Reuse that pattern for phase 10 BOLO writes.

### Work order

**Step 0 — Scaffolding (single commit)**
- Probe `/police-dashboard` and `/ems-dashboard` with current auth to confirm role gating and discover the medical-report form shape. If blocked, extend `e2e/helpers/seed.ts` to add an administrator role with the test user as a member.
- Add all DB helpers to `e2e/helpers/db.ts` (see "Key findings" above).
- Audit `public/js/police-dashboard.js`, `public/js/ems-dashboard.js`, `public/js/command-dashboard.js` for hardcoded `API_URL` and fix by deleting the local declaration to use the EJS global (same pattern as dispatch-dashboard.js in commit 62e2c0fb).

**Step 1 — Warrants** — `e2e/pages/police-dashboard.page.ts`, `e2e/tests/records/warrants.spec.ts` — 3–4 tests (create via `#createWarrantModal`, edit, delete/clear).

**Step 2 — BOLOs** — `e2e/pages/bolo.page.ts`, `e2e/tests/records/bolos.spec.ts` — 3 tests using `#createBolos` hash for focused view.

**Step 3 — Most Wanted** — `e2e/pages/most-wanted.page.ts`, `e2e/tests/records/most-wanted.spec.ts` — 3 tests. Note custom overlay, not Bootstrap `.modal`.

**Step 4 — Arrest reports** — extend police-dashboard page object, `e2e/tests/records/arrests.spec.ts` — 3 tests via `#arrestModal`.

**Step 5 — Tickets / Citations** — `e2e/tests/records/tickets.spec.ts` — 2 tests (create + verify linkage to civilian criminal history).

**Step 6 — Warnings** — `e2e/tests/records/warnings.spec.ts` — 2 tests (create + assert `criminalHistory[].type === "Warning"`).

**Step 7 — Medical reports** — `e2e/pages/ems-dashboard.page.ts`, `e2e/tests/records/medical.spec.ts` — 2–3 tests. Form POST, not AJAX — may need to assert via DB polling rather than toast.

**Step 8 — Verify** — run full suite locally, push, verify CI green.

**Catches**: Record-form regressions, modal submit handlers, record-to-civilian linkage, and (pre-emptively) any remaining hardcoded-`API_URL` bugs in other dashboard JS files.

### Deferred to Phase 11
- Permissions matrix: civilian-only user hitting officer-only routes should be rejected (403/redirect, not 500).
- Owner vs admin vs member role distinctions.

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
