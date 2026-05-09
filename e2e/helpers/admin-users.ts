/**
 * admin_users helpers for tests that need to exercise the real admin
 * resolution path in /api/user/current (linkedUserId match + email match).
 *
 * These helpers seed/remove rows on demand inside individual tests rather
 * than at global setup, so the default seeded test user stays a non-admin
 * for unrelated specs.
 */
import { MongoClient, ObjectId } from 'mongodb';
import { TEST_USER_ID, TEST_USER_EMAIL } from './seed';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27018';
const DB_NAME = process.env.DB_NAME || 'policecad_test';

// Fixed IDs so we can clean up deterministically even if a previous run
// crashed mid-test.
export const TEST_LINKED_ADMIN_ID = new ObjectId('a1a1a1a1a1a1a1a1a1a1a1a1');
export const TEST_UNLINKED_ADMIN_ID = new ObjectId('a2a2a2a2a2a2a2a2a2a2a2a2');

async function withDb<T>(fn: (db: import('mongodb').Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    return await fn(client.db(DB_NAME));
  } finally {
    await client.close();
  }
}

/**
 * Seed an admin_users row whose linkedUserId points at the standard test
 * user. /api/user/current will resolve that user to isAdmin: true via the
 * linkedUserId branch (no email match needed).
 */
export async function seedLinkedAdminForTestUser(): Promise<void> {
  await withDb(async (db) => {
    await db.collection('admin_users').replaceOne(
      { _id: TEST_LINKED_ADMIN_ID },
      {
        _id: TEST_LINKED_ADMIN_ID,
        email: 'linked-admin@test.com',
        // bcrypt hash of any string — never used for login in this test, but
        // the schema requires the field to exist.
        password: '$2a$08$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        firstName: 'Linked',
        lastName: 'Admin',
        role: 'admin',
        roles: ['admin'],
        linkedUserId: TEST_USER_ID,
        createdAt: new Date(),
      },
      { upsert: true }
    );
  });
}

/**
 * Seed an admin_users row whose email matches the test user's, with no
 * linkedUserId set. Exercises the legacy / unlinked-admin email-match
 * branch of /api/user/current.
 */
export async function seedUnlinkedAdminMatchingTestUserEmail(): Promise<void> {
  await withDb(async (db) => {
    await db.collection('admin_users').replaceOne(
      { _id: TEST_UNLINKED_ADMIN_ID },
      {
        _id: TEST_UNLINKED_ADMIN_ID,
        email: TEST_USER_EMAIL,
        password: '$2a$08$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        firstName: 'Unlinked',
        lastName: 'Admin',
        role: 'admin',
        roles: ['admin'],
        // linkedUserId intentionally omitted
        createdAt: new Date(),
      },
      { upsert: true }
    );
  });
}

export async function removeSeededAdminUsers(): Promise<void> {
  await withDb(async (db) => {
    await db.collection('admin_users').deleteMany({
      _id: { $in: [TEST_LINKED_ADMIN_ID, TEST_UNLINKED_ADMIN_ID] },
    });
  });
}
