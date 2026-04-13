/**
 * MongoDB seed helper for E2E tests.
 *
 * Seeds test data directly into the shared test MongoDB used by both
 * police-cad (website) and police-cad-api. Both services use the same
 * database and `users` / `communities` collections.
 *
 * Usage:
 *   Called from e2e/global-setup.ts before tests run.
 */
import { MongoClient, ObjectId } from 'mongodb';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27018';
const DB_NAME = process.env.DB_NAME || 'policecad_test';

// Fixed IDs so tests can reference them deterministically
export const TEST_USER_ID = new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');
export const TEST_COMMUNITY_ID = new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb');

export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@test.com';
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPass123!';

// bcrypt hash of 'TestPass123!' — generated with cost factor 8 (same as bcrypt-nodejs)
// This is a pre-computed hash to avoid needing bcrypt at seed time.
const TEST_PASSWORD_HASH = '$2a$08$ZS.NasJakqkQEdT9wVl5EeZZNGCj8DPjarEyu36ajKeUvosiXiuya';

export async function seedTestData(): Promise<void> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Seed test user
    await db.collection('users').updateOne(
      { _id: TEST_USER_ID },
      {
        $set: {
          _id: TEST_USER_ID,
          user: {
            username: 'testuser',
            callSign: 'T-1',
            email: TEST_USER_EMAIL,
            password: TEST_PASSWORD_HASH,
            name: 'Test User',
            firstName: 'Test',
            lastName: 'User',
            discordConnected: false,
            emailVerified: true,
            isDeactivated: false,
            activeCommunity: TEST_COMMUNITY_ID.toHexString(),
            lastAccessedCommunity: {
              communityID: TEST_COMMUNITY_ID.toHexString(),
              createdAt: new Date(),
            },
            dispatchStatus: '10-8',
            dispatchOnDuty: false,
            panicButtonSound: true,
            subscription: { plan: 'free', active: false },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
      { upsert: true }
    );

    // Seed test community
    await db.collection('communities').updateOne(
      { _id: TEST_COMMUNITY_ID },
      {
        $set: {
          _id: TEST_COMMUNITY_ID,
          community: {
            name: 'test community',
            ownerID: TEST_USER_ID.toHexString(),
            code: 'TESTCD1',
            activeSignal100: false,
            activeHoldTraffic: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
      { upsert: true }
    );

    console.log('[seed] Test user and community seeded successfully');
  } catch (err: any) {
    if (err?.message?.includes('ECONNREFUSED')) {
      console.log('[seed] MongoDB not available — skipping seed (tests will use existing dev data)');
      return;
    }
    throw err;
  } finally {
    await client.close();
  }
}

export async function cleanupTestData(): Promise<void> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    await db.collection('users').deleteOne({ _id: TEST_USER_ID });
    await db.collection('communities').deleteOne({ _id: TEST_COMMUNITY_ID });
    console.log('[seed] Test data cleaned up');
  } catch (err: any) {
    if (err?.message?.includes('ECONNREFUSED')) {
      console.log('[seed] MongoDB not available — skipping cleanup');
      return;
    }
    throw err;
  } finally {
    await client.close();
  }
}
