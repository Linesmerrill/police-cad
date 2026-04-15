/**
 * Socket.IO test fixture for Playwright E2E tests.
 *
 * Provides a connected socket.io-client instance that authenticates
 * using the same session cookie as the Playwright browser context.
 * This allows tests to emit events as a "second user" or verify
 * server-side broadcast behavior.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/socket-fixture';
 *   test('receives panic alert', async ({ page, socket }) => { ... });
 */
import { test as base, expect, Page, Browser } from '@playwright/test';
import { io, Socket } from 'socket.io-client';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const AUTH_STATE_PATH = path.resolve(__dirname, '../.auth/user.json');

/**
 * Extract the connect.sid cookie from Playwright's stored auth state.
 */
function getSessionCookie(): string | undefined {
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf8'));
    const cookie = state.cookies?.find(
      (c: { name: string; value: string }) => c.name === 'connect.sid'
    );
    return cookie?.value;
  } catch {
    return undefined;
  }
}

export const test = base.extend<{
  /** A page that is NOT authenticated */
  unauthPage: Page;
  /** A connected Socket.IO client authenticated via the test user's session */
  socket: Socket;
}>({
  unauthPage: async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  socket: async ({}, use) => {
    const sid = getSessionCookie();
    const extraHeaders: Record<string, string> = {};
    if (sid) {
      extraHeaders['Cookie'] = `connect.sid=${sid}`;
    }

    const socket = io(BASE_URL, {
      transports: ['websocket'],
      extraHeaders,
      autoConnect: false,
    });

    // Connect and wait for successful connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket.IO connection timed out after 10s'));
      }, 10_000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Socket.IO connection error: ${err.message}`));
      });
      socket.connect();
    });

    await use(socket);

    socket.disconnect();
  },
});

export { expect };
