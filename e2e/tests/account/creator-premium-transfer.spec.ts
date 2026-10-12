/**
 * Creator dashboard: moving the free Partner Premium boost to another community
 * the creator owns (/content-creators/me).
 *
 * The feature is deliberately unpromoted, so the first thing these specs pin
 * down is where it is NOT: nothing renders without an active community boost.
 * The rest covers the parts that are expensive to get wrong -- the confirmation
 * naming both communities, the checkbox gate in front of a permanent action,
 * the request body, and the exhausted state pointing at support.
 *
 * Every API route is mocked at the website proxy level (/api/v1/...), because
 * the Go transfer endpoint is a parallel workstream: these specs must not
 * depend on it being deployed. See admin-finance.spec.ts for the same pattern.
 */
import { test, expect, Page, Route } from '@playwright/test';

const CURRENT_COMMUNITY_ID = 'b1b1b1b1b1b1b1b1b1b1b1b1';
const OTHER_COMMUNITY_ID = 'b2b2b2b2b2b2b2b2b2b2b2b2';
const PAID_COMMUNITY_ID = 'b3b3b3b3b3b3b3b3b3b3b3b3';

const CURRENT_COMMUNITY_NAME = 'Sandy Shores RP';
const OTHER_COMMUNITY_NAME = 'Paleto Bay RP';

interface TransferFields {
  active: boolean;
  transfersUsed?: number;
  transfersRemaining?: number;
  transferLimit?: number;
}

function creatorFixture(fields: TransferFields) {
  return {
    success: true,
    creator: {
      _id: 'c1c1c1c1c1c1c1c1c1c1c1c1',
      displayName: 'Test Creator',
      slug: 'test-creator',
      status: 'active',
      featured: false,
      joinedAt: '2026-01-04T00:00:00Z',
      bio: 'A creator profile seeded for the transfer specs.',
      themeColor: '#fbbf24',
      primaryPlatform: 'twitch',
      platforms: [
        {
          type: 'twitch',
          url: 'https://twitch.tv/testcreator',
          handle: 'testcreator',
          followerCount: 4200,
          verificationStatus: 'verified',
        },
      ],
      entitlements: {
        personalPlan: true,
        communityPlan: fields.active
          ? {
              active: true,
              communityName: CURRENT_COMMUNITY_NAME,
              communityId: CURRENT_COMMUNITY_ID,
            }
          : { active: false },
        transfersUsed: fields.transfersUsed,
        transfersRemaining: fields.transfersRemaining,
        transferLimit: fields.transferLimit,
      },
    },
  };
}

const OWNED_COMMUNITIES = {
  success: true,
  communities: [
    {
      _id: CURRENT_COMMUNITY_ID,
      name: CURRENT_COMMUNITY_NAME,
      hasPromotion: true,
      currentPlan: 'premium',
      isPromotionApplied: true,
    },
    {
      _id: OTHER_COMMUNITY_ID,
      name: OTHER_COMMUNITY_NAME,
      hasPromotion: false,
      isPromotionApplied: false,
    },
    {
      _id: PAID_COMMUNITY_ID,
      name: 'Grapeseed PD',
      hasPromotion: false,
      currentPlan: 'elite',
      isPromotionApplied: false,
    },
  ],
};

interface CreatorMocks {
  fields: TransferFields;
  /** Status + body for POST .../community-promotion/transfer. */
  transferStatus?: number;
  transferBody?: unknown;
  onTransfer?: (body: unknown) => void;
}

async function mockCreatorDashboard(page: Page, mocks: CreatorMocks) {
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  // One dispatching handler: several of these paths share a prefix, and
  // separate page.route calls would fight over last-registered-wins.
  await page.route('**/api/v1/content-creator**', (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (req.method() === 'GET' && path === '/api/v1/content-creator-applications/me') {
      return json(route, 200, creatorFixture(mocks.fields));
    }
    if (req.method() === 'GET' && path === '/api/v1/content-creators/me/owned-communities') {
      return json(route, 200, OWNED_COMMUNITIES);
    }
    if (req.method() === 'POST' && path === '/api/v1/content-creators/me/community-promotion/transfer') {
      if (mocks.onTransfer) mocks.onTransfer(req.postDataJSON());
      return json(
        route,
        mocks.transferStatus || 200,
        mocks.transferBody !== undefined
          ? mocks.transferBody
          : {
              success: true,
              fromCommunityId: CURRENT_COMMUNITY_ID,
              fromCommunityName: CURRENT_COMMUNITY_NAME,
              toCommunityId: OTHER_COMMUNITY_ID,
              toCommunityName: OTHER_COMMUNITY_NAME,
              transfersUsed: 2,
              transfersRemaining: 1,
              transferLimit: 3,
            }
      );
    }
    return route.fallback();
  });
}

async function openDashboard(page: Page) {
  await page.goto('/content-creators/me');
  // The benefits card only renders once the creator profile has loaded.
  await expect(page.getByTestId('community-plan-name').or(page.getByText('Premium Boost Available')))
    .toBeVisible({ timeout: 15_000 });
}

test.describe('Creator dashboard — transfer Partner Premium', { tag: '@auth' }, () => {
  test('is not offered at all when no community boost is active', async ({ page }) => {
    await mockCreatorDashboard(page, { fields: { active: false } });
    await openDashboard(page);

    // The claim CTA is what shows instead, which also proves the card rendered.
    await expect(page.getByRole('button', { name: /Claim Your Benefit/i })).toBeVisible();
    await expect(page.getByTestId('transfer-premium-link')).toHaveCount(0);
    await expect(page.getByTestId('transfer-count')).toHaveCount(0);
  });

  test('offers a quiet link and the running count when a boost is active', async ({ page }) => {
    await mockCreatorDashboard(page, {
      fields: { active: true, transfersUsed: 1, transfersRemaining: 2, transferLimit: 3 },
    });
    await openDashboard(page);

    const link = page.getByTestId('transfer-premium-link');
    await expect(link).toBeVisible();
    await expect(link).toBeEnabled();
    await expect(link).toHaveText(/Transfer Premium to another community/);
    await expect(page.getByTestId('transfer-count')).toHaveText('Transfers used: 1 of 3');
    await expect(page.getByTestId('transfer-exhausted-note')).toHaveCount(0);
  });

  test('the picker leaves out the community the boost is already on', async ({ page }) => {
    await mockCreatorDashboard(page, {
      fields: { active: true, transfersUsed: 0, transfersRemaining: 3, transferLimit: 3 },
    });
    await openDashboard(page);
    await page.getByTestId('transfer-premium-link').click();

    const picker = page.getByTestId('transfer-picker-modal');
    await expect(picker).toBeVisible();
    await expect(picker.getByTestId(`transfer-destination-${OTHER_COMMUNITY_ID}`)).toBeVisible();
    // Already holds the boost, so it is not a destination.
    await expect(picker.getByTestId(`transfer-destination-${CURRENT_COMMUNITY_ID}`)).toHaveCount(0);
    // Pays for its own plan: shown with the reason rather than offered.
    await expect(picker.getByTestId(`transfer-destination-${PAID_COMMUNITY_ID}`)).toBeDisabled();
    await expect(picker).toContainText('This community already has a paid plan');
  });

  test('confirmation names both communities, the immediate revert and what is left', async ({ page }) => {
    await mockCreatorDashboard(page, {
      fields: { active: true, transfersUsed: 1, transfersRemaining: 2, transferLimit: 3 },
    });
    await openDashboard(page);
    await page.getByTestId('transfer-premium-link').click();
    await page.getByTestId(`transfer-destination-${OTHER_COMMUNITY_ID}`).click();

    const confirm = page.getByTestId('transfer-confirm-modal');
    await expect(confirm).toBeVisible();
    await expect(confirm.getByTestId('transfer-confirm-from')).toHaveText(CURRENT_COMMUNITY_NAME);
    await expect(confirm.getByTestId('transfer-confirm-to')).toHaveText(OTHER_COMMUNITY_NAME);

    const detail = confirm.getByTestId('transfer-confirm-detail');
    await expect(detail).toContainText('This takes effect immediately.');
    await expect(detail).toContainText(`${CURRENT_COMMUNITY_NAME} drops back to the free plan right away`);
    await expect(detail).toContainText(`${OTHER_COMMUNITY_NAME} gets Premium at the same moment`);
    await expect(detail).toContainText('uses 1 of your 3 permanent lifetime transfers');
    await expect(detail).toContainText('leaving you 1 transfer after this one');
  });

  test('Confirm stays disabled until the acknowledgement is ticked', async ({ page }) => {
    await mockCreatorDashboard(page, {
      fields: { active: true, transfersUsed: 1, transfersRemaining: 2, transferLimit: 3 },
    });
    await openDashboard(page);
    await page.getByTestId('transfer-premium-link').click();
    await page.getByTestId(`transfer-destination-${OTHER_COMMUNITY_ID}`).click();

    const submit = page.getByTestId('transfer-confirm-submit');
    await expect(submit).toBeDisabled();
    await page.getByTestId('transfer-acknowledge').check();
    await expect(submit).toBeEnabled();
    // Un-ticking locks it again rather than leaving the gate open.
    await page.getByTestId('transfer-acknowledge').uncheck();
    await expect(submit).toBeDisabled();
  });

  test('posts the chosen community and updates the card without a reload', async ({ page }) => {
    const posted: unknown[] = [];
    await mockCreatorDashboard(page, {
      fields: { active: true, transfersUsed: 1, transfersRemaining: 2, transferLimit: 3 },
      onTransfer: (body) => posted.push(body),
    });
    await openDashboard(page);
    await page.getByTestId('transfer-premium-link').click();
    await page.getByTestId(`transfer-destination-${OTHER_COMMUNITY_ID}`).click();
    await page.getByTestId('transfer-acknowledge').check();
    await page.getByTestId('transfer-confirm-submit').click();

    await expect(page.getByTestId('transfer-confirm-modal')).toHaveCount(0);
    await expect(page.getByTestId('transfer-picker-modal')).toHaveCount(0);
    expect(posted).toEqual([{ communityId: OTHER_COMMUNITY_ID }]);

    // Patched locally from the response, not refetched.
    await expect(page.getByTestId('community-plan-name')).toHaveText(OTHER_COMMUNITY_NAME);
    await expect(page.getByTestId('transfer-count')).toHaveText('Transfers used: 2 of 3');
  });

  test('a refusal from the API is shown in the modal and nothing is claimed', async ({ page }) => {
    await mockCreatorDashboard(page, {
      fields: { active: true, transfersUsed: 2, transfersRemaining: 1, transferLimit: 3 },
      transferStatus: 409,
      transferBody: {
        error: 'transfer_limit_reached',
        message: "You've used all of your free transfers. Contact LPC support to request another.",
      },
    });
    await openDashboard(page);
    await page.getByTestId('transfer-premium-link').click();
    await page.getByTestId(`transfer-destination-${OTHER_COMMUNITY_ID}`).click();
    await page.getByTestId('transfer-acknowledge').check();
    await page.getByTestId('transfer-confirm-submit').click();

    await expect(page.getByTestId('transfer-confirm-error')).toContainText(
      "You've used all of your free transfers."
    );
    await expect(page.getByTestId('transfer-confirm-modal')).toBeVisible();
    await expect(page.getByTestId('community-plan-name')).toHaveText(CURRENT_COMMUNITY_NAME);
    await expect(page.getByTestId('transfer-count')).toHaveText('Transfers used: 2 of 3');
  });

  test('exhausted: the control is disabled and points at support', async ({ page }) => {
    await mockCreatorDashboard(page, {
      fields: { active: true, transfersUsed: 3, transfersRemaining: 0, transferLimit: 3 },
    });
    await openDashboard(page);

    await expect(page.getByTestId('transfer-premium-link')).toBeDisabled();
    const note = page.getByTestId('transfer-exhausted-note');
    await expect(note).toContainText(
      "You've used all of your free transfers. Contact LPC support to request another."
    );
    await expect(note.getByRole('link', { name: 'Contact LPC support' })).toHaveAttribute(
      'href',
      '/contact-us'
    );
    await expect(page.getByTestId('transfer-count')).toHaveText('Transfers used: 3 of 3');

    // Disabled means disabled: clicking must not open the picker.
    await page.getByTestId('transfer-premium-link').click({ force: true });
    await expect(page.getByTestId('transfer-picker-modal')).toHaveCount(0);
  });
});
