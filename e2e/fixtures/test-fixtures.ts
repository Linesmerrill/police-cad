import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixtures for the police-cad E2E tests.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/test-fixtures';
 *
 * The default `page` already uses the authenticated user storage state
 * (configured in playwright.config.ts). These fixtures add convenience helpers.
 */
export const test = base.extend<{
  /** A page that is NOT authenticated — useful for testing login, public pages, etc. */
  unauthPage: ReturnType<typeof base.extend> extends infer T ? any : never;
}>({
  unauthPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
