/**
 * The report-draft review queue, and the key-record cleanup beside it.
 *
 * What these specs are about is the one thing the feature exists to guarantee:
 * nothing an integration writes becomes a report until a person here says so,
 * and that person can see what they are agreeing to. So the assertions are on
 * what the page shows a reviewer and what it asks before each decision, not on
 * the Go API behind it — which has its own end-to-end tests.
 *
 * The proxy routes are mocked at the website's own Express endpoints, the
 * pattern developer-api.spec.ts and invite-codes.spec.ts already use.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { PHONE, shoot } from '../../helpers/shots';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

const COMMUNITY_ID = TEST_COMMUNITY_ID.toHexString();
const DRAFT_ID = 'cccccccccccccccccccccc01';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** A draft with both halves filled in and an AI narrative, the awkward case. */
function generatedArrestDraft(overrides: Record<string, unknown> = {}) {
  return {
    draft: {
      id: DRAFT_ID,
      externalId: 'sixpd-incident-42',
      source: 'SixPD',
      kind: 'arrest',
      status: 'draft',
      communityId: COMMUNITY_ID,
      reportingOfficerId: 'dddddddddddddddddddddd01',
      reportingOfficerName: 'Deputy Hale',
      subject: { displayName: 'John Doe', synthetic: false },
      facts: {
        occurredAt: '2026-11-01T21:14:00Z',
        location: 'Route 68 northbound',
        summary: 'Vehicle failed to stop, pursuit ended at the rail crossing.',
        forceUsed: true,
        witnesses: ['Jane Roe'],
        fields: { weather: 'clear' },
      },
      narrative: {
        text: 'The driver accelerated away from the stop and struck a parked vehicle.',
        generated: true,
        generatedBy: 'sixpd-llm',
      },
      charges: [{ name: 'Reckless Driving', category: 'Traffic Violations', amount: 1000, jailTime: '30 seconds' }],
      filed: false,
      createdAt: '2026-11-01T21:15:00Z',
      ...overrides,
    },
    writtenByKeyId: 'bbbbbbbbbbbbbbbbbbbbbbb1',
    writtenByKeyName: 'SixPD dispatch bridge',
    writtenByDeveloper: 'hiceguy',
  };
}

async function mockQueue(page: Page, rows: unknown[], totalCount = rows.length) {
  await page.route(`**/api/developer/community/${COMMUNITY_ID}/report-drafts?**`, (route: Route) =>
    json(route, { data: rows, totalCount, page: 1, limit: 10 })
  );
}

test.describe('Report draft review', () => {
  test('a reviewer sees the facts and the narrative apart, with the AI narrative flagged', async ({ page }) => {
    await mockQueue(page, [generatedArrestDraft()]);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);

    // The page says nothing has been filed, before anything else.
    await expect(page.getByText(/Nothing here has been filed/i)).toBeVisible();

    // Both halves, under headings that say which is which. This separation is
    // the whole point: a reviewer has to be able to weigh what the server saw
    // against what was written about it.
    await expect(page.getByRole('heading', { name: 'What the server saw' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Narrative' })).toBeVisible();
    await expect(page.getByText('Route 68 northbound')).toBeVisible();
    await expect(page.getByText(/accelerated away from the stop/)).toBeVisible();

    // The one thing that must not be missed.
    await expect(page.getByText(/Written by AI \(sixpd-llm\)/)).toBeVisible();
    await expect(page.getByText(/not evidence/i)).toBeVisible();

    // And who wrote it, which is a reviewer's first question.
    await expect(page.getByText(/SixPD dispatch bridge/)).toBeVisible();
    await expect(page.getByText(/Deputy Hale/)).toBeVisible();

    // Charges priced from the community's own penal code.
    await expect(page.getByText(/Reckless Driving/)).toBeVisible();
    await expect(page.getByText(/Priced from this community/)).toBeVisible();

  }

  test('cleanup is offered even for a key whose access is gone, and asks which scope', async ({ page }) => {
    await mockKeyList(page);

    let scope: string | null = null;
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/keys/*/records`, (route: Route) => {
      const body = route.request().postDataJSON() as { scope?: string };
      scope = body?.scope ?? '';
      return json(route, { removed: { civilians: 97, vehicles: 180 }, total: 277, more: false });
    });

    await page.goto(`/community/${COMMUNITY_ID}/api-keys`);

    // The case this exists for: the key is revoked and the integration has
    // stopped answering, so cleanup must not need its cooperation.
    await expect(page.getByText('Access withdrawn')).toBeVisible();
    await page.getByRole('button', { name: 'Remove its records' }).click();

    await expect(page.getByText('Remove its records?')).toBeVisible();
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();
    expect(scope).toBeNull();

    await page.locator('#ddm-overlay').getByRole('button', { name: 'Test records only' }).click();
    await expect.poll(() => scope).toBe('synthetic');

    // Counted per collection, because a single total is not something anyone
    // can check.
    await expect(page.getByText(/97 civilians/)).toBeVisible();
    await expect(page.getByText(/180 vehicles/)).toBeVisible();

  });

  test('the wider cleanup is a separate, differently-worded choice', async ({ page }) => {
    await mockKeyList(page);

    let scope: string | null = null;
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/keys/*/records`, (route: Route) => {
      scope = (route.request().postDataJSON() as { scope?: string })?.scope ?? '';
      return json(route, { removed: {}, total: 0, more: false });
    });

    await page.goto(`/community/${COMMUNITY_ID}/api-keys`);
    await page.getByRole('button', { name: 'Remove its records' }).click();

    // The dialog has to make the difference obvious: one choice cannot touch a
    // real player's records and the other can.
    await expect(page.getByText(/characters, vehicles and firearms this key made for real players/i)).toBeVisible();

    await page.locator('#ddm-overlay').getByRole('button', { name: 'Everything it made' }).click();
    await expect.poll(() => scope).toBe('all');
    // Matches the copy rather than quoting it: the punctuation between those
    // two clauses changed once already when em dashes came out, and an
    // assertion that breaks on punctuation is one that fails for no reason.
    await expect(page.getByText(/nothing to remove/i)).toBeVisible();
  });

  test('the key page points at the review queue', async ({ page }) => {
    await mockKeyList(page);
    await page.goto(`/community/${COMMUNITY_ID}/api-keys`);

    await expect(
      page.getByRole('link', { name: 'report drafts' })
    ).toHaveAttribute('href', `/community/${COMMUNITY_ID}/report-drafts`);
  });
});

test.describe('Developer API docs: the phase-3 surfaces', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the docs say plainly that a key cannot file a report or issue a warrant', async ({ page }) => {
    await page.goto('/api-docs', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Report drafts' })).toBeVisible();
    await expect(page.getByText(/It does not file a report/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Warrants', exact: true })).toBeVisible();
    await expect(page.getByText(/a request always lands pending/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Simulated characters' })).toBeVisible();
    await expect(page.getByText(/includeSynthetic=true/).first()).toBeVisible();
  });
});

/**
 * Pictures for the pull request, in their own block.
 *
 * Separate from the assertions above so a screenshot can never be the reason a
 * behavioural test fails, and so the cost is two renders rather than one per
 * existing test. Each runs at one width, set by test.use rather than by
 * resizing mid-test.
 */
test.describe('Screenshots: report drafts at desktop width', () => {
  test('the review queue', async ({ page }, testInfo) => {
    await mockQueue(page, [generatedArrestDraft()]);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);
    await expect(page.getByRole('heading', { name: 'What the server saw' })).toBeVisible();
    // Full page here on purpose: this is the shot that answers what is below
    // the fold on this screen, including whether a footer renders.
    await shoot(page, testInfo, 'report-draft review queue', { fullPage: true });
  });

  test('the empty queue', async ({ page }, testInfo) => {
    await mockQueue(page, [], 0);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);
    await expect(page.getByText(/Nothing is waiting for you/i)).toBeVisible();
    await shoot(page, testInfo, 'report-draft review queue, empty');
  });
});

test.describe('Screenshots: report drafts at phone width', () => {
  test.use({ viewport: PHONE });

  test('the review queue stacks', async ({ page }, testInfo) => {
    await mockQueue(page, [generatedArrestDraft()]);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);
    await expect(page.getByRole('heading', { name: 'What the server saw' })).toBeVisible();
    // The shot worth looking at: two halves side by side at desktop have to
    // stack here, and the AI label has to survive the narrower column.
    await expect(page.getByText(/Written by AI/)).toBeVisible();
    await shoot(page, testInfo, 'report-draft review queue', { fullPage: true });
  });
});

test.describe('Screenshots: the community API keys screen', () => {
  async function mockOneRevokedKey(page: Page) {
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/keys`, (route: Route) =>
      json(route, {
        keys: [
          {
            keyId: 'bbbbbbbbbbbbbbbbbbbbbbb1',
            status: 'revoked',
            source: 'Approved by an admin',
            keyName: 'SixPD dispatch bridge',
            displayPrefix: 'lpc_live_wwww',
            scopes: ['civilians:write', 'reports:write'],
            developerName: 'hiceguy',
            canApprove: false,
            canRevoke: false,
            writeScopes: ['civilians:write', 'reports:write'],
          },
        ],
        pendingCount: 0,
        activeCount: 0,
      })
    );
  }

  test('with the record cleanup on a withdrawn key', async ({ page }, testInfo) => {
    await mockOneRevokedKey(page);
    await page.goto(`/community/${COMMUNITY_ID}/api-keys`);
    await expect(page.getByRole('button', { name: 'Remove its records' })).toBeVisible();
    await shoot(page, testInfo, 'community API keys, with record cleanup', { fullPage: true });
  });

  test('the cleanup dialog, which is where the two scopes are explained', async ({ page }, testInfo) => {
    await mockOneRevokedKey(page);
    await page.goto(`/community/${COMMUNITY_ID}/api-keys`);
    await page.getByRole('button', { name: 'Remove its records' }).click();
    await expect(page.getByText('Remove its records?')).toBeVisible();
    await shoot(page, testInfo, 'community API keys, cleanup dialog');
  });
});
