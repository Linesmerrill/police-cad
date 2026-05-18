import { test, expect } from '@playwright/test';
import {
  PENDING_DELETION_TEST_COMMUNITY_ID,
  ensurePendingDeletionTestCommunity,
  setPendingDeletionTestCommunityPending,
  clearPendingDeletionTestCommunity,
} from '../../helpers/db';

/**
 * Pending-deletion eviction coverage.
 *
 * Soft-deleting a community puts it into a 30-day "pending deletion" state.
 * The API returns 410 with { error: "pending_deletion", communityName,
 * scheduledDeletionAt } for any direct-link community route. Server-rendered
 * pages must route that 410 to the friendly community-pending-deletion page,
 * NOT the generic "Something went sideways" 404 page — this regressed once
 * already on /community/:hash/map after the soft-delete refactor.
 *
 * Uses a dedicated community (PENDING_DELETION_TEST_COMMUNITY_ID) instead of
 * the shared seeded one so toggling pending state can't poison parallel
 * workers running other community-scoped tests.
 */

/** URL-safe base64 encode matching the website's encodeId(). */
function encodeHash(hex: string): string {
  return Buffer.from(hex, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const pendingHash = () => encodeHash(PENDING_DELETION_TEST_COMMUNITY_ID);
const pendingDetailsUrl = () => `/community/${pendingHash()}`;

test.describe('Pending-Deletion Eviction (server-rendered pages)', { tag: '@auth' }, () => {
  test.beforeAll(async () => {
    // Idempotent: creates the dedicated community on first run, resets it
    // on subsequent runs. Cheap so beforeAll is fine.
    await ensurePendingDeletionTestCommunity();
  });

  test.afterEach(async () => {
    // Always restore the community to non-pending so a failed assertion
    // can't leak state into the next test (or into the baseline test).
    await clearPendingDeletionTestCommunity();
  });

  test('/community/:hash returns 410 and renders the pending-deletion page', async ({ page }) => {
    await setPendingDeletionTestCommunityPending();

    const response = await page.goto(pendingDetailsUrl());
    expect(response?.status()).toBe(410);

    // The pending-deletion view is the canonical route-block page. Anchor
    // on copy unique to it, not the generic error page.
    await expect(page.getByText(/pending deletion/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/contact support/i).first()).toBeVisible();
    // Generic 404 page must NOT have rendered.
    await expect(page.getByText(/something went sideways/i)).not.toBeVisible();
  });

  test('/community/:hash/map returns 410 and renders the pending-deletion page', async ({ page }) => {
    await setPendingDeletionTestCommunityPending();

    const response = await page.goto(`${pendingDetailsUrl()}/map`);
    expect(response?.status()).toBe(410);

    await expect(page.getByText(/pending deletion/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/contact support/i).first()).toBeVisible();
    await expect(page.getByText(/something went sideways/i)).not.toBeVisible();
  });

  test('/community/:hash/forms returns 410 and renders the pending-deletion page', async ({ page }) => {
    await setPendingDeletionTestCommunityPending();

    const response = await page.goto(`${pendingDetailsUrl()}/forms`);
    expect(response?.status()).toBe(410);

    await expect(page.getByText(/pending deletion/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/contact support/i).first()).toBeVisible();
    await expect(page.getByText(/something went sideways/i)).not.toBeVisible();
  });

  test('non-pending community still loads normally (baseline)', async ({ page }) => {
    // Belt-and-suspenders: confirm the pending-deletion gate ONLY fires
    // when the soft-delete fields are actually set. A bug in the API
    // middleware that returns 410 unconditionally would 410 every
    // community; this guards against that regression.
    // The afterEach above already cleared pending state, so the community
    // is in its baseline (non-pending) form here.

    const response = await page.goto(`${pendingDetailsUrl()}`);
    expect(response?.status()).not.toBe(410);
    await expect(page.getByText(/pending deletion/i)).not.toBeVisible();
  });
});

/**
 * Client-side eviction coverage.
 *
 * Dashboards (police, dispatch, etc.) don't fail server-side when the
 * community is pending — the community fetch is wrapped in a silent
 * try/catch and the page renders anyway. The eviction happens client-side
 * via pending-deletion-gate.js, which monkey-patches window.fetch, peeks
 * at 410 pending_deletion responses, and triggers a modal + redirect.
 *
 * We verify the gate script is loaded on community-scoped pages so it's
 * ready to fire the moment a 410 comes back from any client-side fetch.
 */
test.describe('Pending-Deletion Eviction (client-side gate)', { tag: '@auth' }, () => {
  test.beforeAll(async () => {
    await ensurePendingDeletionTestCommunity();
  });

  test.afterEach(async () => {
    await clearPendingDeletionTestCommunity();
  });

  test('pending-deletion-gate.js is loaded and self-guards against double-install', async ({ page }) => {
    // No pending state needed — the gate must be installed on every
    // community-scoped page so it's ready when the soft-delete flips.
    await page.goto(`${pendingDetailsUrl()}/map`);
    await expect(page).not.toHaveURL(/\/login/);

    // The script sets window.__pendingDeletionGateInstalled to guard
    // against being included twice. If the flag is missing, the partial
    // wasn't included on the page (or the script failed to load).
    const installed = await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => Boolean((window as any).__pendingDeletionGateInstalled)
    );
    expect(installed).toBe(true);

    // suppressPendingDeletion must be exposed for owner-side delete
    // handlers to mute the eviction modal after a successful delete.
    const hasSuppress = await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => typeof (window as any).suppressPendingDeletion === 'function'
    );
    expect(hasSuppress).toBe(true);
  });
});
