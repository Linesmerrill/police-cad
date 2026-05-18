/**
 * Feature-request seed helpers for E2E tests.
 *
 * Seeds documents directly into the shared test MongoDB used by both
 * police-cad (website) and police-cad-api. All seeded titles are prefixed
 * with `TEST_FR_PREFIX` so cleanup is targeted and won't touch real data.
 */
import { MongoClient, ObjectId, Db } from 'mongodb';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27018';
const DB_NAME = process.env.DB_NAME || 'policecad_test';

// Author for all seeded feature requests — the shared test user from seed.ts.
const TEST_USER_ID = new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');

// Fixed IDs so tests can reference them deterministically.
export const TEST_FR_OPEN_ID = new ObjectId('a1a1a1a1a1a1a1a1a1a1a1a1');
export const TEST_FR_RELEASED_ID = new ObjectId('a2a2a2a2a2a2a2a2a2a2a2a2');
export const TEST_FR_BETA_ID = new ObjectId('a3a3a3a3a3a3a3a3a3a3a3a3');
export const TEST_FR_DECLINED_ID = new ObjectId('a4a4a4a4a4a4a4a4a4a4a4a4');

// Every seeded title starts with this prefix so cleanup can target only
// our test fixtures and never collide with production-like data.
export const TEST_FR_PREFIX = '[E2E-FR]';

export type FRStatus = 'open' | 'planned' | 'beta_testing' | 'released' | 'declined' | 'merged';

export interface FRSeed {
  _id: ObjectId;
  title: string;
  description: string;
  status: FRStatus;
  upvoteCount?: number;
  commentCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    return await fn(client.db(DB_NAME));
  } finally {
    await client.close();
  }
}

export async function seedFeatureRequest(opts: FRSeed): Promise<void> {
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('featureRequests').updateOne(
      { _id: opts._id },
      {
        $set: {
          _id: opts._id,
          title: opts.title,
          description: opts.description,
          author: TEST_USER_ID,
          status: opts.status,
          imageUrls: [],
          upvoteCount: opts.upvoteCount ?? 0,
          commentCount: opts.commentCount ?? 0,
          comments: [],
          createdAt: opts.createdAt ?? now,
          updatedAt: opts.updatedAt ?? now,
        },
      },
      { upsert: true }
    );
  });
}

/**
 * Delete every feature request whose title starts with our test prefix.
 * Safe to call before AND after tests — it never touches real data.
 */
export async function cleanupSeededFeatureRequests(): Promise<void> {
  await withDb(async (db) => {
    await db.collection('featureRequests').deleteMany({
      title: { $regex: `^${TEST_FR_PREFIX.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}` },
    });
    // Also delete any stray votes against our seeded IDs.
    await db.collection('featureRequestVotes').deleteMany({
      featureRequestId: { $in: [TEST_FR_OPEN_ID, TEST_FR_RELEASED_ID, TEST_FR_BETA_ID, TEST_FR_DECLINED_ID] },
    });
  });
}
