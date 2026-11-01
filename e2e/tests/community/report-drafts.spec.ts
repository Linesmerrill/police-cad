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
import { shootBothWidths } from '../../helpers/shots';
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

    // The shot that matters most: the two halves side by side at desktop, and
    // stacked at phone width, with the AI label in both.
    await shootBothWidths(page, test.info(), 'report-draft review queue', async () => {
      await expect(page.getByRole('heading', { name: 'What the server saw' })).toBeVisible();
    });
  });

  test('a human-written narrative is not flagged as AI', async ({ page }) => {
    await mockQueue(page, [
      generatedArrestDraft({
        narrative: { text: 'I stopped the vehicle myself.', generated: false },
      }),
    ]);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);

    await expect(page.getByText('I stopped the vehicle myself.')).toBeVisible();
    await expect(page.getByText(/Written by AI/)).toHaveCount(0);
  });

  test('filing asks first, through the page and not a native dialog', async ({ page }) => {
    await mockQueue(page, [generatedArrestDraft()]);

    let filed = false;
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/report-drafts/*/file`, (route: Route) => {
      filed = true;
      return json(route, { filed: true, record: { id: 'eeeeeeeeeeeeeeeeeeeeee01', kind: 'arrestReport' } });
    });

    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);
    await page.getByRole('button', { name: 'File this report' }).click();

    // ddModal, never a native confirm, and nothing has been sent yet.
    await expect(page.getByText('File this report?')).toBeVisible();
    await expect(page.getByText(/becomes a .*real arrest report/i)).toBeVisible();
    expect(filed).toBe(false);

    await page.locator('#ddm-overlay').getByRole('button', { name: 'File it' }).click();
    await expect.poll(() => filed).toBe(true);
    await expect(page.getByText(/now a real report in this community/i)).toBeVisible();
  });

  test('sending a draft back will not go through without a reason', async ({ page }) => {
    await mockQueue(page, [generatedArrestDraft()]);

    let rejectedWith: string | null = null;
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/report-drafts/*/reject`, (route: Route) => {
      const body = route.request().postDataJSON() as { notes?: string };
      rejectedWith = body?.notes ?? '';
      return json(route, { draft: { ...generatedArrestDraft().draft, status: 'rejected' } });
    });

    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);
    await page.getByRole('button', { name: 'Send back' }).first().click();

    // Confirming with the field empty re-opens the same question with the
    // field flagged, rather than closing and leaving a toast behind.
    await page.locator('#ddm-overlay').getByRole('button', { name: 'Send back' }).click();
    await expect(page.getByText(/A reason is required/i)).toBeVisible();
    expect(rejectedWith).toBeNull();

    await page.locator('#rejectNotes').fill('The narrative does not match the clip.');
    await page.locator('#ddm-overlay').getByRole('button', { name: 'Send back' }).click();

    await expect.poll(() => rejectedWith).toBe('The narrative does not match the clip.');
  });

  test('a filed draft shows who filed it and offers no decision', async ({ page }) => {
    await mockQueue(page, [
      generatedArrestDraft({
        status: 'submitted',
        filed: true,
        filedRecordId: 'eeeeeeeeeeeeeeeeeeeeee01',
        filedRecordKind: 'arrestReport',
        reviewedByName: 'Chief Vance',
        reviewedAt: '2026-11-01T22:00:00Z',
        reviewNotes: 'Checked the clip.',
      }),
    ]);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);

    await expect(page.getByText(/Filed by/)).toBeVisible();
    await expect(page.getByText(/Chief Vance/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'File this report' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send back' })).toHaveCount(0);
  });

  test('a draft about an NPC says so, so nobody files a report about scenery', async ({ page }) => {
    await mockQueue(page, [
      generatedArrestDraft({
        subject: { displayName: 'Store Clerk', synthetic: true },
      }),
    ]);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);

    await expect(page.getByText('Simulated character (NPC)')).toBeVisible();
  });

  test('an empty queue says what will appear here rather than nothing', async ({ page }) => {
    await mockQueue(page, [], 0);
    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);

    await expect(page.getByText(/Nothing is waiting for you/i)).toBeVisible();

    await shootBothWidths(page, test.info(), 'report-draft review queue, empty', async () => {
      await expect(page.getByText(/Nothing is waiting for you/i)).toBeVisible();
    });
  });

  test('the filter strip narrows the queue by status', async ({ page }) => {
    const seen: string[] = [];
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/report-drafts?**`, (route: Route) => {
      seen.push(new URL(route.request().url()).searchParams.get('status') || '');
      return json(route, { data: [], totalCount: 0, page: 1, limit: 10 });
    });

    await page.goto(`/community/${COMMUNITY_ID}/report-drafts`);
    await expect.poll(() => seen[0]).toBe('draft');

    await page.getByRole('button', { name: 'Filed' }).click();
    await expect.poll(() => seen[seen.length - 1]).toBe('submitted');
  });
});

test.describe('Removing a key\'s records', () => {
  async function mockKeyList(page: Page, overrides: Record<string, unknown> = {}) {
    await page.route(`**/api/developer/community/${COMMUNITY_ID}/keys`, (route: Route) =>
      json(route, {
        keys: [
          {
            keyId: 'bbbbbbbbbbbbbbbbbbbbbbb1',
            status: 'revoked',
            source: 'Approved by an admin',
            keyName: 'SixPD dispatch bridge',
            displayPrefix: 'lpc_live_wwww',
            scopes: ['civilians:write'],
            developerName: 'hiceguy',
            canApprove: false,
            canRevoke: false,
            writeScopes: ['civilians:write'],
            ...overrides,
          },
        ],
        pendingCount: 0,
        activeCount: 0,
      })
    );
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

    await shootBothWidths(page, test.info(), 'community API keys, with record cleanup', async () => {
      await expect(page.getByRole('heading', { name: 'API keys' })).toBeVisible();
    });
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
    await expect(page.getByText(/nothing — there was nothing to remove/i)).toBeVisible();
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
