# Dispatch Rewrite — Command Bridge Layout

Tracking doc for the `feature/dispatch-control-layout` branch. Each step lands in the same PR; final merge once all boxes are checked and verified end-to-end.

## Why

The new `/command-dashboard` currently shows the same MDT-style grid for every department template. That works for patrol officer self-service but is missing every core dispatcher workflow (unit roster, unit→call assignment, call intake, per-note CRUD, tone board). This rewrite adds a purpose-built **Command Bridge** layout that activates whenever `template.name === 'dispatch'`. It is fully template-driven — zero hardcoded law-enforcement assumptions. A community can create a department with template `dispatch` and name it whatever they want (Police Dispatch, Fire Comms, EMS Control) and get the same UI; the roster simply renders whatever units the community has.

## Decisions locked in

- Extend `/command-dashboard` (no new `/control-dashboard` URL).
- v1 scope: unit roster + status change, drag-and-drop assignment, call intake + detail (with per-note CRUD), BOLOs + Signal 100 / Panic / tone board.
- Realtime in v1 — socket events end-to-end; polling only as disconnect fallback.
- Template-driven — `template.name === 'dispatch'` is the only switch. No police/fire/ems branching.
- Single PR to merge end-of-day.

## Steps

- [x] **Step 0 — Branch**
  - Created `feature/dispatch-control-layout` off `main` on `police-cad`.
  - API branch: cut `feature/dispatch-unit-status-broadcast` off `main` on `police-cad-api` when step 8 lands.

- [x] **Step 1 — Shared helpers**
  - `window.cdStatusColor(code, desc)` + `window.cdStatusToneStyle(tone)` in `command-dashboard.ejs`; `applyMDTStatus` refactored to use them.
  - `window._cdSharedSocket` exposed from `cd-alerts.js` so dispatch modules share the socket.
  - `cdRenderAssignedPill` deferred — will be written in-context when the detail drawer lands.
  - `dispatchAssignFieldFor` dropped — `Call.assignedTo` is now a single unified string array ([models/call.go:25](police-cad-api/models/call.go#L25)); the legacy `assignedOfficers` / `assignedFireEms` fields are deprecated. No per-unit branching needed.

- [x] **Step 2 — Shell**
  - New: [public/css/cd-dispatch.css](public/css/cd-dispatch.css) — 3-zone grid, top bar, responsive breakpoints (≥1440 / 1280 / 1024 drawer / 768 stacked).
  - New: [public/js/cd-dispatch-layout.js](public/js/cd-dispatch-layout.js) — `cdDispatchLayoutRender(dept)` + `cdDispatchLayoutInit()` render labeled 3-zone shell + top bar (clock, Signal 100, Panic), call child `*Init()` hooks if present.
  - Modified [views/command-dashboard.ejs](views/command-dashboard.ejs): `<link>` added; `buildPanels()` branches on `currentTemplateName === 'dispatch'`; `ddNavTo()` toggles `#cd-dispatch-bridge` alongside `#cd-mdt-overview`; `<script>` tag added.
  - Non-dispatch departments unaffected.

- [x] **Step 3 — Unit roster (read-only)**
  - New: `public/js/cd-dispatch-roster.js` — fetches `GET /api/v2/community/{id}/units`, renders unit chips (callsign + 10-code dot + name), search box, filter pills (All / Available / Busy / Out).
  - Exposes `cdDispatchRosterInit`, `cdDispatchRosterRefresh`, `cdDispatchRosterPatchUnit`, `cdDispatchRosterGetUnit`.
  - Roster CSS appended to `cd-dispatch.css`.
  - Script tag added.

- [x] **Step 4 — Call board (read-only)**
  - New: `public/js/cd-dispatch-board.js` — fetches `GET /api/v2/calls/community/{id}?status=true&limit=100`, renders priority lanes (derived from `classifier` via a client-side mapping), call cards with title / location / assigned pills / elapsed timer.
  - Subscribes to existing `created_call` / `updated_call` / `cleared_call` socket events (via `window._cdSharedSocket`) and upserts/removes cards live.
  - "+ New Call" button hooks to intake (step 6).
  - Exposes `cdDispatchBoardInit`, `cdDispatchBoardUpsertCall`, `cdDispatchBoardRemoveCall`, `cdDispatchBoardSelectCall`.

- [x] **Step 5 — Call detail drawer + per-note CRUD**
  - New: `public/js/cd-dispatch-detail.js` — renders selected-call pane with title / location / classifier / assigned pill list / notes timeline / action buttons.
  - Per-note CRUD via `POST / PUT / DELETE /api/v1/call/{callId}/note[/noteId]`.
  - Close / reopen / delete call via `PUT / DELETE /api/v1/call/{callId}`.
  - `window.cdRenderAssignedPill(user, opts)` authored here.
  - Tablet (≤1024 px) slide-over behaviour wired.

- [x] **Step 6 — Call intake modal**
  - New: `public/js/cd-dispatch-intake.js` — create/edit modal with title, location, details, classifier chip picker, departments chip picker, assigned-unit chip picker.
  - Replaces Select2 (no new dependency) with lightweight chip picker reusing existing `ddModal` shell.
  - `POST /api/v1/calls` / `PUT /api/v1/call/{id}`.

- [x] **Step 7 — Drag-and-drop**
  - Sortable.js groups: `.cd-unit-chip` as `pull:'clone', put:false` sources; `.cd-call-card` + `.cd-detail-pill-zone` + `.cd-unit-unassign-drop` as targets.
  - Optimistic UI: render pill, `PUT /api/v1/call/{id}` with full replacement `assignedTo` array; revert + toast on failure.
  - Keyboard / touch fallback: every chip + card has a kebab button opening a `ddModal` picker (Assign to → call list / Assign → unit list).
  - At ≤1024 px, DnD hidden, kebab-only.

- [x] **Step 8 — `dispatch:unit_status_changed` socket event**
  - `police-cad-api` (new branch `feature/dispatch-unit-status-broadcast` off `main`): after successful tenCode update in the `PUT /api/v1/community/{id}/members/{userId}/tenCode` handler, call `notifyNodeServerDispatch("unit_status_changed", { communityId, userId, tenCodeId, tenCode, tenCodeDescription })`, modelled on `notifyNodeServerPanic`.
  - `police-cad` [app/routes.js](app/routes.js): new `POST /internal/dispatch-broadcast` handler, emits `dispatch:unit_status_changed` to `community:{communityId}`.
  - New: `public/js/cd-dispatch-realtime.js` — subscribes to shared socket, dispatches `updated_call` diffs as local `dispatch:unit_assigned` / `_unassigned` events, handles `dispatch:unit_status_changed`, manages polling fallback on disconnect + reconnect pill in top bar.

- [x] **Step 9 — BOLOs + tone board**
  - New: `public/js/cd-dispatch-bolos.js` — bottom-strip BOLO list with create/edit parity to legacy.
  - New: `public/js/cd-dispatch-tones.js` — tone board ported from `dispatch-dashboard.js` (LEO / FD / EMS + community tones), listening to existing `tone_activated` socket event.

- [x] **Step 10 — Responsive + touch fallback**
  - Verify breakpoints 1440 / 1280 / 1024 / 768 hold for every zone.
  - iPad: tune Sortable `delay: 100, touchStartThreshold: 5`; fall back to kebab-menu if DnD unusable.

- [x] **Step 11 — Playwright specs + seed helper**
  - `e2e/helpers/seed.ts` — `seedDispatchDepartment(communityId)` inserts dispatch-template department + test units into test Mongo (27018).
  - `e2e/pages/dispatch-bridge.page.ts` — POM for roster, board, detail, intake, DnD.
  - `e2e/tests/dashboards/dispatch-bridge.spec.ts` — loads bridge; happy-path (create → drag-assign → close); keyboard-only assignment.
  - `e2e/tests/realtime/dispatch-unit-status.spec.ts` — asserts roster chip tone flips on socket event.

- [x] **Step 12 — Visual polish pass** (P1 lane urgency cues, warm empty-state, drawer backdrop, tone-color rings)
  - Run the `frontend-design` skill against the bridge once structure is stable. Target a distinctive, polished look — glass cards, tone-correct dots, smooth drag preview, calm typography. Avoid generic AI-default aesthetics.

- [ ] **PR** — single PR `feature/dispatch-control-layout → main` on `police-cad`, linked to the API PR on `feature/dispatch-unit-status-broadcast`.

## Open questions / risks

1. **Priority field** — `models/call.go:21` only has `Classifier []interface{}`. Client-side maps the first classifier entry to a P1/P2/P3/Other lane. Backend `Priority string` can be added in a follow-up without breaking the UI.
2. **Dispatcher self-assignment** — filter users whose `activeDepartmentTemplate === 'dispatch'` out of the assignable roster? Confirm with product; for v1 **do filter** to keep the UI clean, with a setting override later.
3. **Tone endpoints** — exact routes need to be grep-verified from legacy `dispatch-dashboard.js` when porting.
4. **Touch DnD on iPad** — validate on real hardware.
5. **Full-array replacement on assign** — requires a reliable client-side cache of current assignments. Seed from initial load, patch from `updated_call` socket. Careful ordering so optimistic writes use post-patch cache.

## Verification

Run in Docker Compose test env per [CLAUDE.md](CLAUDE.md):
```
docker compose -f docker-compose.test.yml up -d
npm run test:e2e
```
Manual smoke uses two browser tabs against `police-cad-dev` (staging) before main merge.
