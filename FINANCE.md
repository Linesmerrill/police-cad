# Finance P&L Dashboard (owner-only)

The admin console's **Finance** tab gives the owner a monthly profit-and-loss
view on a **cash basis from the bank feed** (Plaid bank sync): bank income,
bank expenses, and profit per month, plus subscription earned revenue (Stripe,
app-store IAP gross + net) as a complement. It lives entirely in the website
repo (`police-cad`); the Go API (`police-cad-api`) owns the data layer
(`models/finance.go`, `databases/finance.go`, HTTP handlers).

## Architecture

```
Browser ──► Express proxy (/admin/api/finance/*) ──► Go API (/api/v1/admin/finance/*)
                ▲ requireOwnerSession                    ▲ Bearer JWT (admin scope)
                │                                        │
                └── JWT lives ONLY in the server session ─┘
```

The browser never talks to the Go API for finance and never sees any API
credential. All finance traffic goes through same-origin Express proxies
that attach the owner's API JWT server-side. The Plaid access token is the
one exception: after a successful Link exchange the tab shows it to the owner
**once** so they can paste it into the Heroku config var — it is never
logged, never stored in the page, and vanishes on reload.

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
- The JWT is never rendered into a view, never logged, and never sent to the
  browser. Error paths never leak it.

No new environment variables were added. The proxies reuse the existing
`POLICE_CAD_API_URL`. All Plaid credentials (client id/secret, access token)
live on the API side.

## Proxy routes (`app/routes.js`)

| Method | Website route | API route |
|---|---|---|
| GET | `/admin/api/finance/summary?from=YYYY-MM&to=YYYY-MM` | `GET /api/v1/admin/finance/summary?from=&to=` |
| POST | `/admin/api/finance/plaid/link-token` | `POST /api/v1/admin/finance/plaid/link-token` |
| POST | `/admin/api/finance/plaid/exchange` (`{public_token}`) | `POST /api/v1/admin/finance/plaid/exchange` |
| POST | `/admin/api/finance/plaid/sync` | `POST /api/v1/admin/finance/plaid/sync` |
| GET | `/admin/api/finance/plaid/status` | `GET /api/v1/admin/finance/plaid/status` |

Input hygiene: `from`/`to` are regex-validated (`YYYY-MM`); the exchange
proxy requires `public_token` to be a non-empty string (400 otherwise) and
forwards only that field.

### Summary shape (consumed defensively — the API is a separate workstream)

```json
{
  "months": [
    {
      "month": "2026-09",
      "income": { "stripe": n, "iap_gross": n, "iap_net": n, "total": n },
      "expenses": n,
      "profit": n,
      "bank": { "connected": true, "income": n, "expenses": n },
      "sources": { "stripe": { "connected": true }, "revenuecat": { "connected": true }, "bank": { "connected": true } }
    }
  ],
  "bank_connected": true,
  "warnings": ["..."]
}
```

Semantics: `bank_connected: true` → `income.total` / `expenses` / `profit`
are bank cash-basis numbers. `bank_connected: false` → `income.total` is
subscription earned revenue, `expenses` is 0. There are no ad-revenue fields
and no manual expenses; the tab renders from `income.total` / `expenses` /
`profit` directly so both modes work.

## UI (`views/admin-console.ejs`, `#panel-finance`)

- **Bank connection card** (`data-testid="finance-bank-card"`): "Connect
  bank" + "Sync now" buttons, connection status, connected accounts list
  (name, mask, type) and last-sync timestamp from the status proxy.
- **Connect-bank flow:** "Connect bank" → `POST plaid/link-token` → Plaid
  Link is loaded from `https://cdn.plaid.com/link/v2/stable/link-initialize.js`
  **on demand, only on this owner-only page** (never globally) →
  `Plaid.create({ token, onSuccess })` → onSuccess posts `{public_token}` to
  `POST plaid/exchange` → the returned `access_token` is displayed **once** in
  a callout with instructions to set the Heroku config var
  `PLAID_ACCESS_TOKEN` (never logged, never persisted).
- **Empty state** (`data-testid="finance-bank-empty"`): shown when
  `bank_connected` is false — "Connect your bank to see expenses and true
  profit". Income then shows subscription earned revenue only, expenses $0.00.
- **P&L table** (`data-testid="finance-table"`): one row per month —
  Bank income, Bank expenses, Profit — under a "Cash basis — bank feed"
  heading. Profit cells carry `data-testid="finance-profit-<YYYY-MM>"`.
- **Earned revenue table** (`data-testid="finance-earned-table"`):
  per-month Stripe / IAP gross / IAP net complement.
- **Charts:** two SVG cards (income vs expenses) reuse the console's shared
  `renderLineChart`, wired to the bank series (`income.total`, `expenses`).
- **Source badges:** Stripe / RevenueCat / Bank `connected` flags from the
  latest month, plus API warnings.

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
- Spec: `e2e/tests/account/admin-finance.spec.ts` (8 tests)
  - Owner: cash-basis P&L table renders from mocked summary; bank empty
    state in `bank_connected=false` mode (earned revenue only, expenses $0);
    401-without-API-session error; Plaid connect flow (stubbed
    `window.Plaid`, link token → onSuccess → exchange payload → access
    token shown once); "Sync now" hits the sync proxy.
  - Non-owner staff: Finance tab (incl. Connect bank) hidden; summary and
    all four plaid proxy routes return 403 (real proxies, no mocks);
    anonymous caller also 403.
  - Token-leak regression: `/most-wanted` HTML contains no `var apiToken`,
    no `POLICE_CAD_API_TOKEN`, and not the configured token value.
- Finance calls are mocked at the website proxy level with
  `page.route` — the Go API finance HTTP handlers are a separate
  workstream, so the spec must not depend on them. Run:
  `npx playwright test e2e/tests/account/admin-finance.spec.ts --project=chromium`
  (with the docker-compose test env up; the spec follows the
  `admin-changelog-preview.spec.ts` login-once-per-describe pattern and uses
  dedicated storage-state files to avoid parallel-worker races).

## End-to-end owner steps (Plaid bank sync)

1. Sign up at the Plaid dashboard and create an app (Sandbox to test).
2. Set the API app's Heroku config vars: `PLAID_CLIENT_ID`,
   `PLAID_SECRET`, `PLAID_ENV` (`sandbox` / `production`).
3. Open the admin console → Finance tab → **Connect bank**; approve the
   account in Plaid Link.
4. Copy the one-time access token from the callout and set it as the
   `PLAID_ACCESS_TOKEN` Heroku config var on the API app.
5. Press **Sync now** (or wait for the scheduled sync) — the P&L flips to
   cash basis and the empty state clears.
