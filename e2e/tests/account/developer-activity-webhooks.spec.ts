/**
 * The console's two new screens: a key's request history, and where its events
 * go.
 *
 * What these specs defend is the copy as much as the behaviour. The activity
 * feed exists because a developer cannot tell from their own logs which of a
 * dozen things went wrong, so the row has to name the missing scope. The
 * webhook panel exists because the signing secret is shown once, so the panel
 * has to say what to do with it before anything navigates away.
 *
 * Proxied at the website's own Express endpoints, the pattern
 * developer-api.spec.ts already uses.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { PHONE, shoot } from '../../helpers/shots';

const KEY_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const HOOK_ID = 'ffffffffffffffffffffff01';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

const SCOPES = [
  { scope: 'community:read', description: "Read the community's profile, departments and ten-codes" },
  { scope: 'reports:write', description: 'Write report drafts for a person to review and file' },
];

const LIMITS = {
  requestsPerMinute: 60,
  requestsPerDay: 10000,
  keysPerDeveloper: 2,
  accountsPerKeyDay: 25,
  communitiesPerKeyDay: 2,
};

/** Enough of the console's own prerequisites for the key page to render. */
async function mockConsole(page: Page) {
  await page.route('**/api/developer/account', (route: Route) =>
    json(route, {
      enabled: true,
      account: { id: 'dev1', status: 'active', termsAcceptedAt: '2026-10-01T00:00:00Z' },
      limits: LIMITS,
      availableScopes: SCOPES,
      keyCount: 1,
      entitlement: { plan: 'free', source: 'website_plan', websitePlan: 'free', lapsed: false },
      upgradeUrl: '/pricing',
    })
  );
  await page.route('**/api/user/current', (route: Route) =>
    json(route, { user: { _id: 'u1', username: 'dev' } })
  );
  await page.route(`**/api/developer/keys/${KEY_ID}`, (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return json(route, {
      key: {
        id: KEY_ID,
        name: 'SixPD bridge',
        displayPrefix: 'lpc_live_a1b2c3d4',
        lastFour: 'ef01',
        scopes: ['community:read', 'reports:write'],
        status: 'active',
        createdAt: '2026-10-20T00:00:00Z',
      },
      communities: [],
      limits: LIMITS,
      plan: 'free',
      availableScopes: SCOPES,
    });
  });
  await page.route(`**/api/developer/keys/${KEY_ID}/usage`, (route: Route) =>
    json(route, {
      plan: 'free',
      requestsToday: 0,
      requestsThisMonth: 0,
      dailyLimit: LIMITS.requestsPerDay,
      minuteLimit: LIMITS.requestsPerMinute,
      dailyPercent: 0,
      resetsAt: null,
      errorsToday: { rateLimited: 0, unauthorized: 0, forbidden: 0 },
      hasErrorsToday: false,
      series: [],
    })
  );
  await page.route('**/api/developer/communities', (route: Route) => json(route, { data: [] }));
}

async function mockNoWebhooks(page: Page) {
  await page.route(`**/api/developer/keys/${KEY_ID}/webhooks`, (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return json(route, {
      webhooks: [],
      limits: {
        maxPerKey: 3,
        maxAttempts: 6,
        signatureToleranceSeconds: 300,
        disableAfterFailures: 20,
        deliveryRetentionDays: 14,
      },
      eventTypes: ['call.created', 'call.closed'],
    });
  });
}

test.describe('A key’s request history', () => {
  test('a refused request names the scope that was missing', async ({ page }) => {
    await mockConsole(page);
    await mockNoWebhooks(page);
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, {
        data: [
          {
            requestId: 'req_abc123def456',
            correlationId: 'sixpd-tick-8821',
            communityId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
            method: 'POST',
            route: '/communities/{communityId}/reports/drafts',
            status: 403,
            outcome: 'denied',
            errorCode: 'missing_scope',
            requiredScope: 'reports:write',
            durationMs: 12,
            at: '2026-11-01T21:14:00Z',
          },
        ],
        totalCount: 1,
        page: 1,
        limit: 25,
        retentionDays: 30,
      })
    );

    await page.goto(`/developer/keys/${KEY_ID}`);

    // The whole point of the screen: the fix, not just the status code.
    await expect(page.getByText('missing_scope')).toBeVisible();
    await expect(page.getByText(/needed/)).toBeVisible();
    await expect(page.getByText('reports:write').first()).toBeVisible();

    // Our id, and the caller's own alongside it.
    await expect(page.getByText('req_abc123def456')).toBeVisible();
    await expect(page.getByText(/your id: sixpd-tick-8821/)).toBeVisible();

    // The route template, not a path with a community id in it.
    await expect(page.getByText('/communities/{communityId}/reports/drafts')).toBeVisible();

  });

  test('the page says what the feed does not hold, and for how long', async ({ page }) => {
    await mockConsole(page);
    await mockNoWebhooks(page);
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 })
    );

    await page.goto(`/developer/keys/${KEY_ID}`);

    // A developer who expects to find a payload here should find out from the
    // page rather than from a support ticket.
    await expect(page.getByText(/hold no request or response bodies/i)).toBeVisible();
    await expect(page.getByText(/Kept for 30 days/)).toBeVisible();
    await expect(page.getByText(/X-Request-Id/)).toBeVisible();

  });

  test('the filter asks the API for that outcome', async ({ page }) => {
    await mockConsole(page);
    await mockNoWebhooks(page);
    const seen: (string | null)[] = [];
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) => {
      seen.push(new URL(route.request().url()).searchParams.get('outcome'));
      return json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 });
    });

    await page.goto(`/developer/keys/${KEY_ID}`);
    await expect.poll(() => seen.length).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Refused' }).click();
    await expect.poll(() => seen[seen.length - 1]).toBe('denied');
  });
});

test.describe('Webhooks', () => {
  test('the signing secret is shown once, with what to do with it', async ({ page }) => {
    await mockConsole(page);
    await mockNoWebhooks(page);
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 })
    );
    await page.route(`**/api/developer/keys/${KEY_ID}/webhooks`, (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      return json(
        route,
        {
          webhook: { id: HOOK_ID, url: 'https://sixpd.example.com/lpc', status: 'active' },
          signingSecret: 'whsec_0123456789abcdef',
        },
        201
      );
    });

    await page.goto(`/developer/keys/${KEY_ID}`);

    await page.getByLabel('Add an endpoint').fill('https://sixpd.example.com/lpc');
    await page.getByRole('button', { name: 'Add webhook' }).click();

    await expect(page.getByText('whsec_0123456789abcdef')).toBeVisible();
    // The verification recipe, on the one screen where the secret exists.
    await expect(page.getByText(/HMAC-SHA256/)).toBeVisible();
    await expect(page.getByText(/300 seconds old/)).toBeVisible();
    await expect(page.getByText(/raw body/i)).toBeVisible();
  });

  test('the form says which field is wrong rather than disabling itself', async ({ page }) => {
    await mockConsole(page);
    await mockNoWebhooks(page);
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 })
    );

    let posted = false;
    await page.route(`**/api/developer/keys/${KEY_ID}/webhooks`, (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      posted = true;
      return json(route, { message: 'a webhook URL must be https' }, 400);
    });

    await page.goto(`/developer/keys/${KEY_ID}`);

    // Empty: refused on our side, with the message beside the field.
    await page.getByRole('button', { name: 'Add webhook' }).click();
    await expect(page.getByText(/Paste the https URL/)).toBeVisible();
    expect(posted).toBe(false);

    // Refused by the API: the reason still lands beside the field, because
    // that is the thing that is wrong.
    await page.getByLabel('Add an endpoint').fill('http://sixpd.example.com/lpc');
    await page.getByRole('button', { name: 'Add webhook' }).click();
    await expect(page.getByText(/must be https/)).toBeVisible();
  });

  test('an endpoint we switched off says why, and can be switched back on', async ({ page }) => {
    await mockConsole(page);
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 })
    );
    await page.route(`**/api/developer/keys/${KEY_ID}/webhooks`, (route: Route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      return json(route, {
        webhooks: [
          {
            id: HOOK_ID,
            url: 'https://sixpd.example.com/lpc',
            events: [],
            communities: [],
            status: 'disabled',
            secretPrefix: 'whsec_0123',
            consecutiveFailures: 20,
            lastStatus: 502,
            disabledReason:
              'Turned off after 20 deliveries in a row failed. Fix the endpoint and save it again to switch it back on.',
            lastDeliveryAt: '2026-11-01T20:00:00Z',
            createdAt: '2026-10-20T00:00:00Z',
            eventsLabel: 'every event',
            communitiesLabel: 'every community this key can reach',
          },
        ],
        limits: {
          maxPerKey: 3,
          maxAttempts: 6,
          signatureToleranceSeconds: 300,
          disableAfterFailures: 20,
          deliveryRetentionDays: 14,
        },
        eventTypes: ['call.created'],
      });
    });

    let enabled: boolean | null = null;
    await page.route(`**/api/developer/keys/${KEY_ID}/webhooks/${HOOK_ID}`, (route: Route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      enabled = (route.request().postDataJSON() as { enabled?: boolean })?.enabled ?? null;
      return json(route, { webhook: { id: HOOK_ID, status: 'active' } });
    });

    await page.goto(`/developer/keys/${KEY_ID}`);

    // Without this a developer sees "Off" and has to guess whether they did it.
    await expect(page.getByText(/Turned off after 20 deliveries in a row failed/)).toBeVisible();
    await expect(page.getByText('Off')).toBeVisible();
    // "Empty means everything" is not the same statement as "nothing", and is
    // the one a reader would otherwise get wrong.
    await expect(page.getByText('every event')).toBeVisible();

    await page.getByRole('button', { name: 'Switch on' }).click();
    await expect.poll(() => enabled).toBe(true);
  });

  test('the attempt log is on the same screen as the endpoint', async ({ page }) => {
    await mockConsole(page);
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 })
    );
    await page.route(`**/api/developer/keys/${KEY_ID}/webhooks`, (route: Route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      return json(route, {
        webhooks: [
          {
            id: HOOK_ID,
            url: 'https://sixpd.example.com/lpc',
            events: [],
            communities: [],
            status: 'active',
            secretPrefix: 'whsec_0123',
            consecutiveFailures: 0,
            createdAt: '2026-10-20T00:00:00Z',
          },
        ],
        limits: {
          maxPerKey: 3,
          maxAttempts: 6,
          signatureToleranceSeconds: 300,
          disableAfterFailures: 20,
          deliveryRetentionDays: 14,
        },
        eventTypes: ['call.created'],
      });
    });
    await page.route(
      `**/api/developer/keys/${KEY_ID}/webhooks/${HOOK_ID}/deliveries`,
      (route: Route) =>
        json(route, {
          deliveries: [
            {
              eventId: 'e1',
              eventType: 'call.created',
              attempt: 1,
              status: 404,
              succeeded: false,
              error: 'endpoint answered 404',
              durationMs: 85,
              at: '2026-11-01T20:00:00Z',
            },
          ],
          totalCount: 1,
          retentionDays: 14,
        })
    );

    await page.goto(`/developer/keys/${KEY_ID}`);
    await page.getByRole('button', { name: 'Attempts' }).click();

    // The answer to "why is my webhook not receiving anything", which is the
    // question every webhook integration eventually asks.
    await expect(page.getByText('call.created')).toBeVisible();
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('endpoint answered 404')).toBeVisible();

  });

  test('a revoked key is offered no webhooks at all', async ({ page }) => {
    await mockConsole(page);
    await page.route(`**/api/developer/keys/${KEY_ID}`, (route: Route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      return json(route, {
        key: {
          id: KEY_ID,
          name: 'SixPD bridge',
          displayPrefix: 'lpc_live_a1b2c3d4',
          lastFour: 'ef01',
          scopes: ['community:read'],
          status: 'revoked',
          createdAt: '2026-10-20T00:00:00Z',
        },
        communities: [],
        limits: LIMITS,
        plan: 'free',
        availableScopes: SCOPES,
      });
    });
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 })
    );

    await page.goto(`/developer/keys/${KEY_ID}`);

    await expect(page.getByRole('heading', { name: 'Webhooks' })).toHaveCount(0);
    // The history stays, though. A revoked key's history is exactly what
    // somebody wants to look at afterwards.
    await expect(page.getByRole('heading', { name: 'Recent requests' })).toBeVisible();
  });
});

test.describe('Developer API docs: polling, webhooks, attachments', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the docs carry the verification recipe and the retry schedule', async ({ page }) => {
    await page.goto('/api-docs', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Polling cheaply' })).toBeVisible();
    await expect(page.getByText(/excludeSelf=true/).first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Webhooks' })).toBeVisible();
    await expect(page.getByText(/HMAC-SHA256/)).toBeVisible();
    await expect(page.getByText(/300 seconds/)).toBeVisible();
    // The commonest first-integration mistake, called out by name.
    await expect(page.getByText(/raw body/i).first()).toBeVisible();
    await expect(page.getByText(/10s, 30s, 2m, 5m and 15m/)).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Attachments' })).toBeVisible();
    await expect(page.getByText(/is never/).first()).toBeVisible();
  });
});

/**
 * Pictures for the pull request, in their own block.
 *
 * Separate from the assertions above so a screenshot can never be the reason a
 * behavioural test fails, and one width each via test.use rather than resizing
 * mid-test.
 */
test.describe('Screenshots: the key page at desktop width', () => {
  test('activity and webhooks, populated', async ({ page }, testInfo) => {
    await mockConsole(page);
    await mockOneWebhook(page);
    await mockBusyActivity(page);

    await page.goto(`/developer/keys/${KEY_ID}`);
    await expect(page.getByRole('heading', { name: 'Recent requests' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Webhooks' })).toBeVisible();
    await shoot(page, testInfo, 'console key page, activity and webhooks', { fullPage: true });
  });

  test('both panels empty, which is what a new key looks like', async ({ page }, testInfo) => {
    await mockConsole(page);
    await mockNoWebhooks(page);
    await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
      json(route, { data: [], totalCount: 0, page: 1, limit: 25, retentionDays: 30 })
    );

    await page.goto(`/developer/keys/${KEY_ID}`);
    await expect(page.getByRole('heading', { name: 'Recent requests' })).toBeVisible();
    await shoot(page, testInfo, 'console key page, activity and webhooks empty', { fullPage: true });
  });
});

test.describe('Screenshots: the key page at phone width', () => {
  test.use({ viewport: PHONE });

  test('the activity table scrolls inside its card', async ({ page }, testInfo) => {
    await mockConsole(page);
    await mockOneWebhook(page);
    await mockBusyActivity(page);

    await page.goto(`/developer/keys/${KEY_ID}`);
    await expect(page.getByRole('heading', { name: 'Recent requests' })).toBeVisible();
    // The shot worth looking at. Four columns and a route template in one of
    // them, so this table is always wider than 390px: it has to scroll inside
    // its card rather than push the page sideways.
    await shoot(page, testInfo, 'console key page, activity and webhooks', { fullPage: true });
  });
});

/** One webhook, mid-life: delivered before, one failure since. */
async function mockOneWebhook(page: Page) {
  await page.route(`**/api/developer/keys/${KEY_ID}/webhooks`, (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return json(route, {
      webhooks: [
        {
          id: HOOK_ID,
          url: 'https://sixpd.example.com/lpc/webhook',
          events: [],
          communities: [],
          status: 'active',
          secretPrefix: 'whsec_0123',
          consecutiveFailures: 1,
          lastStatus: 502,
          lastError: 'endpoint answered 502',
          lastDeliveryAt: '2026-11-01T21:50:00Z',
          createdAt: '2026-10-20T00:00:00Z',
          eventsLabel: 'every event',
          communitiesLabel: 'every community this key can reach',
        },
      ],
      limits: {
        maxPerKey: 3,
        maxAttempts: 6,
        signatureToleranceSeconds: 300,
        disableAfterFailures: 20,
        deliveryRetentionDays: 14,
      },
      eventTypes: ['call.created', 'call.closed'],
    });
  });
}

/** A feed with one of each outcome, so the shot shows all three pill states. */
async function mockBusyActivity(page: Page) {
  await page.route(`**/api/developer/keys/${KEY_ID}/activity**`, (route: Route) =>
    json(route, {
      data: [
        {
          requestId: 'req_abc123def456',
          correlationId: 'sixpd-tick-8821',
          communityId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
          method: 'POST',
          route: '/communities/{communityId}/reports/drafts',
          status: 403,
          outcome: 'denied',
          errorCode: 'missing_scope',
          requiredScope: 'reports:write',
          durationMs: 12,
          at: '2026-11-01T21:14:00Z',
        },
        {
          requestId: 'req_0f1e2d3c4b5a',
          communityId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
          method: 'PUT',
          route: '/communities/{communityId}/units/status/bulk',
          status: 200,
          outcome: 'ok',
          durationMs: 31,
          at: '2026-11-01T21:13:02Z',
        },
        {
          requestId: 'req_9a8b7c6d5e4f',
          method: 'GET',
          route: '/communities/{communityId}/changes',
          status: 429,
          outcome: 'rate_limited',
          errorCode: 'rate_limited',
          durationMs: 4,
          at: '2026-11-01T21:12:40Z',
        },
      ],
      totalCount: 3,
      page: 1,
      limit: 25,
      retentionDays: 30,
    })
  );
}
