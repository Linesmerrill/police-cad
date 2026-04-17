import { test, expect } from '@playwright/test';
import { DispatchDashboardPage } from '../../pages/dispatch-dashboard.page';
import {
  createTestCall,
  getCallByTitle,
  getCallById,
  deleteCallsByPrefix,
} from '../../helpers/db';

test.describe('Call CRUD', { tag: '@auth' }, () => {
  const PREFIX = 'P9Call';

  test.afterEach(async () => {
    await deleteCallsByPrefix(PREFIX);
  });

  test('creates a call via the modal', async ({ page }) => {
    const title = `${PREFIX}-Create-${Date.now().toString(36)}`;
    const dashboard = new DispatchDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCallsLoaded();

    await dashboard.openCreateCallModal();
    await dashboard.fillCallForm({ title, details: 'E2E test call' });
    await dashboard.submitCall();

    await dashboard.expectToast(/call created/i);

    const call = await getCallByTitle(title);
    expect(call).toBeTruthy();
  });

  test('adds a note to a call', async ({ page }) => {
    const title = `${PREFIX}-Note-${Date.now().toString(36)}`;
    const callId = await createTestCall({ title });

    const dashboard = new DispatchDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCallsLoaded();

    await dashboard.openCallDetails(title);
    await dashboard.addNote('E2E test note content');

    // Verify note was added in DB
    await expect
      .poll(async () => {
        const c = await getCallById(callId);
        const notes = c?.call?.callNotes ?? [];
        return notes.some((n: { note: string }) => n.note.includes('E2E test note'));
      }, { timeout: 10_000, intervals: [500, 1000, 2000] })
      .toBe(true);
  });

  test('marks a call as completed', async ({ page }) => {
    const title = `${PREFIX}-Close-${Date.now().toString(36)}`;
    const callId = await createTestCall({ title, status: true });

    const dashboard = new DispatchDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCallsLoaded();

    await dashboard.openCallDetails(title);
    await dashboard.markCompleted();

    await dashboard.expectToast(/call marked as completed/i);

    // Verify status changed in DB (false = completed)
    await expect
      .poll(async () => {
        const c = await getCallById(callId);
        return c?.call?.status;
      }, { timeout: 10_000, intervals: [500, 1000, 2000] })
      .toBe(false);
  });

  test('deletes a call', async ({ page }) => {
    const title = `${PREFIX}-Delete-${Date.now().toString(36)}`;
    const callId = await createTestCall({ title });

    const dashboard = new DispatchDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForCallsLoaded();

    await dashboard.openCallDetails(title);
    await dashboard.deleteCall();

    await dashboard.expectToast(/call deleted/i);

    const call = await getCallById(callId);
    expect(call).toBeNull();
  });
});
