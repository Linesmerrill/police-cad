import { cleanupTestData } from './helpers/seed';

async function globalTeardown() {
  console.log('[global-teardown] Cleaning up test data...');
  await cleanupTestData();
  console.log('[global-teardown] Done');
}

export default globalTeardown;
