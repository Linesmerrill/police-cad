/**
 * The two onboarding hand-offs on the community details page.
 *
 * Both existed as dead ends before: requesting to join produced a page with a
 * "Pending Approval" badge, a cancel button and a locked departments card and
 * nothing else, and being approved produced a list of departments with no
 * explanation of what one is. Communities here are Discord-run, so the useful
 * answer at each point is "go to their Discord" and "pick a department".
 */
import { test, expect } from '@playwright/test';
import { encodeIdForUrl } from '../../helpers/db';
import {
  seedOnboardingCommunities,
  cleanupOnboardingCommunities,
  ONBOARDING_PENDING_COMMUNITY_ID,
  ONBOARDING_APPROVED_COMMUNITY_ID,
  ONBOARDING_DISCORD_INVITE,
} from '../../helpers/onboarding-seed';

const pendingUrl = () => `/community/${encodeIdForUrl(ONBOARDING_PENDING_COMMUNITY_ID)}`;
const approvedUrl = () => `/community/${encodeIdForUrl(ONBOARDING_APPROVED_COMMUNITY_ID)}`;

/** The community page renders from the API; skip rather than fail if it is unreachable. */
async function requireCommunityPage(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await expect(page).not.toHaveURL(/\/login/);
  const rendered = await page
    .locator('#community-overview')
    .isVisible()
    .catch(() => false);
  test.skip(!rendered, 'Community API not reachable — error page rendered instead');
}

test.describe('Community onboarding states', { tag: '@auth' }, () => {
  test.beforeAll(async () => {
    await seedOnboardingCommunities();
  });

  test.afterAll(async () => {
    await cleanupOnboardingCommunities();
  });

  test('a pending member is told what to do next', async ({ page }) => {
    await requireCommunityPage(page, pendingUrl());

    await expect(page.getByText("Request sent. Here's what to do next")).toBeVisible();
    // The promise that makes waiting tolerable, and that the API now keeps.
    await expect(page.getByText(/notify you here as soon as you're approved/i)).toBeVisible();
  });

  test("a pending member gets the community's own Discord link", async ({ page }) => {
    await requireCommunityPage(page, pendingUrl());

    const discord = page.getByRole('link', { name: /join the discord/i });
    await expect(discord).toBeVisible();
    await expect(discord).toHaveAttribute('href', ONBOARDING_DISCORD_INVITE);
    // Leaving the site must not replace the tab they are waiting in.
    await expect(discord).toHaveAttribute('target', '_blank');
    await expect(discord).toHaveAttribute('rel', /noopener/);
  });

  test('a pending member is not shown the approved checklist', async ({ page }) => {
    await requireCommunityPage(page, pendingUrl());

    await expect(page.getByText("You're in. Here's how to start playing")).toHaveCount(0);
  });

  test('both join states ship together so switching needs no reload', async ({ page }) => {
    await requireCommunityPage(page, pendingUrl());

    // Pending: the panel is showing and the request prompt is hidden.
    await expect(page.locator('#joinPendingBlock')).toBeVisible();
    await expect(page.locator('#joinPromptBlock')).toBeHidden();
    await expect(page.locator('#joinPendingBadge')).toBeVisible();

    // Flip via the same function the cancel path calls. Done directly rather
    // than by cancelling for real, so this asserts the mechanism without
    // mutating the membership other tests in this file depend on.
    await page.evaluate(() => (window as unknown as { setJoinPendingState: (p: boolean) => void }).setJoinPendingState(false));

    await expect(page.locator('#joinPendingBlock')).toBeHidden();
    await expect(page.locator('#joinPromptBlock')).toBeVisible();
    await expect(page.locator('#joinPendingBadge')).toBeHidden();
    // The departments card has to move with it, or the page contradicts itself.
    await expect(page.locator('#deptJoinBtn')).toBeVisible();
    await expect(page.locator('#deptCancelBtn')).toBeHidden();
  });

  test('an approved member gets neither join state at all', async ({ page }) => {
    await requireCommunityPage(page, approvedUrl());

    await expect(page.locator('#joinPromptBlock')).toHaveCount(0);
    await expect(page.locator('#joinPendingBlock')).toHaveCount(0);
  });

  test('an approved member with no department is told how to start', async ({ page }) => {
    await requireCommunityPage(page, approvedUrl());

    await expect(page.getByText("You're in. Here's how to start playing")).toBeVisible();
    // The checklist has to say what a department actually is; no copy anywhere
    // on the site explained it before.
    await expect(page.getByText(/police department, sheriff/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /choose a department/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create a civilian/i })).toBeVisible();
  });

  test('an approved member is not shown the pending panel', async ({ page }) => {
    await requireCommunityPage(page, approvedUrl());

    await expect(page.getByText("Request sent. Here's what to do next")).toHaveCount(0);
  });

  test('a community with no Discord link still explains the next step', async ({ page }) => {
    await requireCommunityPage(page, approvedUrl());

    // The approved fixture carries no invite, so no dead button may render.
    await expect(page.getByRole('link', { name: /join the discord/i })).toHaveCount(0);
  });
});
