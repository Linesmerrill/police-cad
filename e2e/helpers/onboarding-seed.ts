/**
 * Fixtures for the new-member onboarding states on the community details page.
 *
 * Two extra communities alongside the shared one from seed.ts, because the
 * states being tested are mutually exclusive and the shared community has the
 * test user approved and in departments:
 *
 *   pending  - user has requested to join and is waiting. Carries a Discord
 *              invite so the "join their Discord" hand-off can be asserted.
 *   approved - user is a member but is in no department, which is the state the
 *              "here's how to start playing" checklist exists for.
 *
 * Both are inserted into the same test DB the website and API containers read.
 */
import { MongoClient, ObjectId } from 'mongodb';
import { TEST_USER_ID } from './seed';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27018';
const DB_NAME = process.env.DB_NAME || 'policecad_test';

// Fixed ids so the specs can build URLs and assert deterministically.
export const ONBOARDING_PENDING_COMMUNITY_ID = '00000000000000000000b101';
export const ONBOARDING_APPROVED_COMMUNITY_ID = '00000000000000000000b102';

export const ONBOARDING_DISCORD_INVITE = 'https://discord.gg/e2eonboarding';
export const ONBOARDING_PENDING_NAME = 'Onboarding Pending Community';
export const ONBOARDING_APPROVED_NAME = 'Onboarding Approved Community';

function communityDoc(opts: {
  id: string;
  name: string;
  discordInviteUrl?: string;
  now: Date;
}) {
  return {
    _id: new ObjectId(opts.id),
    community: {
      name: opts.name,
      ownerID: 'ffffffffffffffffffffffff', // deliberately not the test user
      code: opts.id.slice(-7).toUpperCase(),
      visibility: 'public',
      description: 'Seeded for the onboarding e2e.',
      membersCount: 4,
      tags: ['PC'],
      ...(opts.discordInviteUrl ? { discordInviteUrl: opts.discordInviteUrl } : {}),
      activeSignal100: false,
      roles: [],
      departments: [
        {
          _id: new ObjectId('00000000000000000000d101'),
          name: 'Onboarding PD',
          description: 'A department the test user is deliberately NOT in.',
          image: '',
          approvalRequired: false,
          members: [],
          ranks: [],
          template: { name: 'police', category: 'law-enforcement' },
        },
      ],
      createdAt: opts.now,
      updatedAt: opts.now,
    },
  };
}

export async function seedOnboardingCommunities(): Promise<void> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const now = new Date();

    for (const doc of [
      communityDoc({
        id: ONBOARDING_PENDING_COMMUNITY_ID,
        name: ONBOARDING_PENDING_NAME,
        discordInviteUrl: ONBOARDING_DISCORD_INVITE,
        now,
      }),
      communityDoc({
        id: ONBOARDING_APPROVED_COMMUNITY_ID,
        name: ONBOARDING_APPROVED_NAME,
        now,
      }),
    ]) {
      await db.collection('communities').updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    }

    // Give the test user one pending and one approved membership, without
    // disturbing the shared community membership other specs rely on.
    await db.collection('users').updateOne(
      { _id: TEST_USER_ID },
      {
        $pull: {
          'user.communities': {
            communityId: {
              $in: [ONBOARDING_PENDING_COMMUNITY_ID, ONBOARDING_APPROVED_COMMUNITY_ID],
            },
          },
        },
      } as never
    );
    await db.collection('users').updateOne(
      { _id: TEST_USER_ID },
      {
        $push: {
          'user.communities': {
            $each: [
              { communityId: ONBOARDING_PENDING_COMMUNITY_ID, status: 'pending' },
              { communityId: ONBOARDING_APPROVED_COMMUNITY_ID, status: 'approved' },
            ],
          },
        },
      } as never
    );
  } finally {
    await client.close();
  }
}

export async function cleanupOnboardingCommunities(): Promise<void> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    await db.collection('communities').deleteMany({
      _id: {
        $in: [
          new ObjectId(ONBOARDING_PENDING_COMMUNITY_ID),
          new ObjectId(ONBOARDING_APPROVED_COMMUNITY_ID),
        ],
      },
    });
    await db.collection('users').updateOne(
      { _id: TEST_USER_ID },
      {
        $pull: {
          'user.communities': {
            communityId: {
              $in: [ONBOARDING_PENDING_COMMUNITY_ID, ONBOARDING_APPROVED_COMMUNITY_ID],
            },
          },
        },
      } as never
    );
  } finally {
    await client.close();
  }
}
