# Finance P&L Dashboard (owner-only)

The admin console's **Finance** tab gives the owner a monthly profit-and-loss
view: income broken down by source (Stripe, app-store IAP gross + net,
AdSense, AdMob), manual expenses, and profit. It lives entirely in the
website repo (`police-cad`); the Go API (`police-cad-api`) owns the data
layer (`models/finance.go`, `databases/finance.go`, HTTP handlers).

## Architecture

```
Browser ──► Express proxy (/admin/api/finance/*) ──► Go API (/api/v1/finance/*)
                ▲ requireOwnerSession                    ▲ Bearer JWT (admin scope)
                │                                        │
                └── JWT lives ONLY in the server session ─┘
```

The browser never talks to the Go API for finance and never sees any API
credential. All finance traffic goes through same-origin Express proxies
that attach the owner's API JWT server-side.

## Owner gating (two layers)

1. **Client-side (cosmetic):** the Finance nav item and panel are
   `display:none` unless the rendered `admin.roles` includes `owner`
   (`updateUIForUserRoles` in `views/admin-console.ejs`).
2. **Server-side (real enforcement):** `requireOwnerSession` in
   `app/routes.js` requires `req.session.adminToken` **and** the server-set
   `req.session.isOwner` flag. Every `/admin/api/finance/*` route uses it.
   A non-owner (or logged-out) caller gets **403** before any API call is
   made.

`isOwner` is set at `POST /admin` login time from the `admin_users` doc
(`role === 'owner'` or `roles` includes `'owner'`) — never from client input.

## API JWT handling

On owner login, the website calls `POST {POLICE_CAD_API_URL}/api/v1/admin/login`
with the same email + password. On success the returned JWT is stashed in
`req.session.apiAdminJwt`. Notes:

- Non-owner admins skip this entirely (they get no API credentials).
- A failed API login is **non-fatal**: the local console session is still
  established; finance proxies then return `401 "API session not
  established. Please log out and log in again."` and the Finance tab shows
  a clear error instead of silently empty data.
- If the API ever returns 401 on a proxied call, the stale JWT is cleared
  from the session and the client gets 401 (re-login prompt).
- The JWT is never rendered into a view, never logged, and never sent to
  the browser. Error paths never leak it.

No new environment variables were added. The proxies reuse the existing
`POLICE_CAD_API_URL`.

## Proxy routes (`app/routes.js`)

| Method | Website route | API route |
|---|---|---|
| GET | `/admin/api/finance/summary?from=YYYY-MM&to=YYYY-MM` | `GET /api/v1/finance/summary?from=&to=` |
| GET | `/admin/api/finance/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD` | `GET /api/v1/finance/expenses?from=&to=` |
| POST | `/admin/api/finance/expenses` | `POST /api/v1/finance/expenses` |
| PUT | `/admin/api/finance/expenses/:id` | `PUT /api/v1/finance/expenses/:id` |
| DELETE | `/admin/api/finance/expenses/:id` | `DELETE /api/v1/finance/expenses/:id` |
| GET | `/admin/api/finance/adsense/oauth/start` | `GET /api/v1/finance/adsense/oauth/start` |

Input hygiene: `from`/`to`/`date` are regex-validated (`YYYY-MM`,
`YYYY-MM-DD`); expense IDs must be 24-hex; POST/PUT bodies are whitelisted
to `{date, amount, currency, category, vendor, notes, receiptUrl, source}` —
`createdBy` is always set server-side from the session, never from the
client.

## UI (`views/admin-console.ejs`, `#panel-finance`)

- **P&L table:** one row per month — Stripe, IAP gross, IAP net, AdSense,
  AdMob, Total income, Expenses, Profit. Profit cells carry
  `data-testid="finance-profit-<YYYY-MM>"`.
- **Charts:** two SVG cards (income vs expenses, expenses over time) reusing
  the console's shared `renderLineChart` (extended with an optional 7th
  `opts` param: `{formatValue, noDataText}` — backwards compatible).
- **Source badges:** per-source `connected` flags from the latest month
  (`Stripe: Connected`, `AdSense: Not connected`, …) plus API warnings.
- **Expense manager:** add/edit/delete form + table. Edit pre-fills from the
  row; delete asks for confirmation.
- **AdSense connect card:** status badge + "Connect AdSense" button. Opens
  the OAuth URL returned by `oauth/start` in a new tab (`window.open(url,
  '_blank', 'noopener')`).

All finance element hooks use `data-testid="finance-*"` selectors (see
`e2e/pages/admin-finance.page.ts`).

## Related security fix: most-wanted token leak

`views/most-wanted.ejs` used to render the server's `POLICE_CAD_API_TOKEN`
into client JS (`var apiToken = ...`) and call the Go API directly from the
browser. It now calls same-origin proxies (`/mw/api/*` in `app/routes.js`):

- Reads (`GET community/:cid/most-wanted`, `POST civilians/search`,
  `GET community/:cid`) behind the normal `authCheck` session.
- Mutations (`PUT /mw/api/reorder`, `POST/PUT/DELETE /mw/api/entries[/:id]`,
  `PATCH /mw/api/community/:cid/settings`) additionally require
  `requireMwManage`, which checks `req.session.mwPerms[cid].canManage`
  (stashed at page render from `isAdmin || isDepartmentMember`). The acting
  `userId` comes from the session, not the client.
- IDs are validated with the existing `isValidObjectId`.

## E2E tests

- Page object: `e2e/pages/admin-finance.page.ts`
- Spec: `e2e/tests/account/admin-finance.spec.ts` (10 tests)
  - Owner: P&L table renders from mocked summary; 401-without-API-session
    error; expense add/edit/delete (asserting request payloads/URLs);
    AdSense connect opens the OAuth URL.
  - Non-owner staff: Finance tab hidden; all six proxy routes return 403
    (real proxies, no mocks); anonymous caller also 403.
  - Token-leak regression: `/most-wanted` HTML contains no `var apiToken`,
    no `POLICE_CAD_API_TOKEN`, and not the configured token value.
- Finance API calls are mocked at the website proxy level with
  `page.route` — the Go API finance HTTP handlers are a separate
  workstream, so the spec must not depend on them. Run:
  `npx playwright test e2e/tests/account/admin-finance.spec.ts --project=chromium`
  (with the docker-compose test env up; the spec follows the
  `admin-changelog-preview.spec.ts` login-once-per-describe pattern and uses
  dedicated storage-state files to avoid parallel-worker races).

## Deferred to v2

- **Plaid auto-sync:** bank as automated ground truth for money in/out
  (covers Stripe/AdSense/Apple payouts + all expenses in one connection).
- **AdMob UI:** API exposes AdMob; the tab shows the column but there is no
  connect flow yet (AdMob has no OAuth connect like AdSense).
- **CSV import** for historical expenses.
- **AdSense OAuth callback wiring** on the API side (the website proxy for
  `oauth/start` exists; token storage/refresh lives in the API).
