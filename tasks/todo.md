# Reports — locked-document + reopen-for-edits + audit history

Branch: `feature/incident-report-pages` (police-cad) + `feature/configurable-forms-system` (police-cad-api)

## Goal

When a report is **submitted**, the form should be locked so random community members can't change it. The original submitter and community admins can use a kebab-menu action to **reopen for edits** (flips back to draft), make changes, and resubmit. Every state transition is logged in a per-report audit trail.

## Backend (police-cad-api)

- [x] Add `History []FormSubmissionHistoryEntry` to `FormSubmissionDetails` ([models/formSubmission.go](../../police-cad-api/models/formSubmission.go))
- [x] On `Create` with `status=submitted`: append a `submitted` history entry
- [x] On `Update` from `submitted`→`draft`: append a `reopened` entry; from `draft`→`submitted`: append `submitted`/`resubmitted` (depending on whether history already exists)
- [x] Inject `CommDB databases.CommunityDatabase` into the `FormSubmission` handler struct ([handlers/api.go](../../police-cad-api/api/handlers/api.go))
- [x] Add `canManageSubmission(actorUserID, sub)` helper: returns true when actor is the original signer, the community owner, or holds an `administrator` permission role in the submission's community
- [x] Block edits on `status=submitted` reports unless caller passes the auth check (returns 403)
- [x] Accept body field `actor: { userID, username }` as a server-trusted website-proxy fallback when the API has no auth context (matches the existing `signedBy` fallback pattern on `Create`)

## Frontend (police-cad)

- [x] Pass `canManageForms` to `report-edit` view from both `/reports/new` and `/reports/:id` routes ([app/routes.js](../app/routes.js))
- [x] Auto-lock when loaded report has `status === 'submitted'` (force `readOnly = true` regardless of `?view=1`)
- [x] Add **lock banner** below header: green lock icon + "Locked · Submitted by `<username>` · `<date>`"
- [x] Add **kebab menu (⋯)** in the header with: *Print / Save as PDF* (always), *Reopen for edits* (only when locked AND caller is original submitter OR community admin)
- [x] Reopen flow: in-page confirmation modal styled to match existing `rp-conf-*` modals → PUT `status: 'draft'` with `actor` block → refetch + re-render unlocked
- [x] Hide "Required only" toggle while locked (irrelevant for read-only documents)
- [x] **Revision history footer** below the form: action dot (green/amber/cyan), action label, "by `<username>` · `<datetime>`"
- [x] Send `actor: { userID, username }` on every PUT so backend authz/history can identify the caller
- [x] On 403 responses: show toast with "Only the report's author or a community admin can edit a submitted report"
- [x] After resubmit success modal: refetch the submission so lock banner + history reflect the new entry without a hard reload

## Verification

- [x] `go build -mod=mod ./...` clean in police-cad-api
- [x] `npx tsc --noEmit` clean in police-cad
- [x] `ejs.compile()` clean on report-edit.ejs
- [x] Inline `<script>` JS extracted from rendered EJS passes `vm.compileFunction` (no runtime syntax errors)
- [ ] **Manual UI test in dev**: submit a report → confirm lock banner + kebab; click Reopen → confirm modal → status flips to draft → make edit → resubmit → see two history entries
- [ ] **Manual permission test**: log in as a different community member (non-admin, non-submitter) → confirm Reopen is hidden from kebab → manually POST a status flip and confirm 403

## Review

### What changed

**Backend** (`police-cad-api`):
- New `FormSubmissionHistoryEntry` model with `action`, `userID`, `username`, `at`
- `CreateFormSubmissionHandler` seeds a `submitted` entry when status starts as submitted
- `UpdateFormSubmissionHandler` was rewritten to:
  - Load the existing submission first
  - Block any edit on a `submitted` report unless the actor is the signer or a community admin (403)
  - On status transitions, push a history entry with the action (`reopened`, `submitted`, or `resubmitted`)
  - Accept an `actor` body field for the website-proxy auth case (mirrors the existing `signedBy` fallback)

**Frontend** (`police-cad`):
- Routes pass `canManageForms` to the report-edit view
- View auto-locks any submitted report on load (no more dependence on `?view=1`)
- New lock banner below the header with submitter+date metadata
- New kebab menu in the header (always shows Print; conditionally shows Reopen for edits)
- New reopen confirmation modal in `rp-conf-*` style + handler that PUTs `status:'draft'` with the actor block, then refetches so the page rerenders unlocked with the new history entry
- New revision history footer rendered when the submission has any audit entries
- All existing PUTs now include `actor` so the backend can authorize and stamp history
- 403 responses surface as a friendly toast instead of a generic "HTTP 403"
- A small `body.rp-locked` class flattens disabled-input chrome so the locked report reads more like a document than a greyed-out form

### Why this design (not just "disable inputs")

The locked report should feel finished, not broken. The lock banner declares status visibly, the kebab keeps power-user actions out of the read flow, the audit history makes accountability visible, and the reopen modal forces an intentional confirmation. Civilians never see a Reopen affordance at all.

### Server-side enforcement

The UI hides the Reopen button for unauthorized users, but the API also rejects edits on submitted reports server-side — so a hostile/buggy client (mobile app, direct curl) gets a 403, not a write.
