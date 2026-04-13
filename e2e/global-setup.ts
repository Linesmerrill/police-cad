import { seedTestData } from './helpers/seed';

async function globalSetup() {
  console.log('[global-setup] Seeding test data...');
  await seedTestData();
  console.log('[global-setup] Done');
}

export default globalSetup;
