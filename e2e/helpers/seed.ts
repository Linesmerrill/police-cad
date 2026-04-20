/**
 * MongoDB seed helper for E2E tests.
 *
 * Seeds test data directly into the shared test MongoDB used by both
 * police-cad (website) and police-cad-api. Both services use the same
 * database and collections.
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
export const TEST_CIVILIAN_ID = new ObjectId('cccccccccccccccccccccccc');
export const TEST_VEHICLE_ID = new ObjectId('dddddddddddddddddddddddd');
export const TEST_FIREARM_ID = new ObjectId('eeeeeeeeeeeeeeeeeeeeeeee');
export const TEST_DEPARTMENT_ID = new ObjectId('ffffffffffffffffffffffffffff'.slice(0, 24));

export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@test.com';
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPass123!';

// Test civilian data — used by search tests
export const TEST_CIVILIAN = {
  firstName: 'John',
  lastName: 'TestDoe',
};
export const TEST_VEHICLE_PLATE = 'TST1234';
export const TEST_FIREARM_SERIAL = 'SN-E2E-9876';

// bcrypt hash of 'TestPass123!' — generated with cost factor 8 (same as bcrypt-nodejs)
const TEST_PASSWORD_HASH = '$2a$08$ZS.NasJakqkQEdT9wVl5EeZZNGCj8DPjarEyu36ajKeUvosiXiuya';

export async function seedTestData(): Promise<void> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const communityId = TEST_COMMUNITY_ID.toHexString();
    const userId = TEST_USER_ID.toHexString();
    const civilianId = TEST_CIVILIAN_ID.toHexString();
    const now = new Date();

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
            activeCommunity: communityId,
            lastAccessedCommunity: {
              communityID: communityId,
              createdAt: now,
            },
            dispatchStatus: '10-8',
            dispatchOnDuty: false,
            panicButtonSound: true,
            subscription: { plan: 'free', active: false },
            createdAt: now,
            updatedAt: now,
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
            ownerID: userId,
            code: 'TESTCD1',
            activeSignal100: false,
            activeHoldTraffic: false,
            departments: [
              {
                _id: TEST_DEPARTMENT_ID,
                name: 'Test PD',
                description: 'Test police department',
                image: '',
                approvalRequired: false,
                members: [{ id: userId, status: 'active' }],
                ranks: [],
              },
            ],
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      { upsert: true }
    );

    // Seed test civilian (for search tests)
    await db.collection('civilians').updateOne(
      { _id: TEST_CIVILIAN_ID },
      {
        $set: {
          _id: TEST_CIVILIAN_ID,
          civilian: {
            firstName: TEST_CIVILIAN.firstName,
            lastName: TEST_CIVILIAN.lastName,
            name: `${TEST_CIVILIAN.firstName} ${TEST_CIVILIAN.lastName}`,
            searchName: `${TEST_CIVILIAN.firstName} ${TEST_CIVILIAN.lastName}`.toLowerCase(),
            birthday: '1990-01-15',
            address: '123 Test Street',
            occupation: 'Engineer',
            gender: 'Male',
            height: '180',
            heightClassification: 'cm',
            weight: '75',
            weightClassification: 'kg',
            eyeColor: 'Brown',
            hairColor: 'Black',
            organDonor: false,
            veteran: false,
            onProbation: false,
            onParole: false,
            licenseStatus: 'Valid',
            ticketCount: '0',
            deceased: false,
            activeCommunityID: communityId,
            userID: userId,
            criminalHistory: [],
            createdAt: now,
            updatedAt: now,
          },
          __v: 0,
        },
      },
      { upsert: true }
    );

    // Seed test vehicle (for plate search tests)
    await db.collection('vehicles').updateOne(
      { _id: TEST_VEHICLE_ID },
      {
        $set: {
          _id: TEST_VEHICLE_ID,
          vehicle: {
            plate: TEST_VEHICLE_PLATE,
            licensePlateState: 'CA',
            vin: '1HGBH41JXMN109186',
            type: 'Sedan',
            make: 'Honda',
            model: 'Civic',
            year: '2020',
            color: 'Blue',
            validRegistration: 'true',
            validInsurance: 'true',
            isStolen: 'false',
            isExempt: 'false',
            registeredOwner: `${TEST_CIVILIAN.firstName} ${TEST_CIVILIAN.lastName}`,
            linkedCivilianID: civilianId,
            activeCommunityID: communityId,
            userID: userId,
            createdAt: now,
            updatedAt: now,
          },
          __v: 0,
        },
      },
      { upsert: true }
    );

    // Seed test firearm (for firearm search tests)
    await db.collection('firearms').updateOne(
      { _id: TEST_FIREARM_ID },
      {
        $set: {
          _id: TEST_FIREARM_ID,
          firearm: {
            serialNumber: TEST_FIREARM_SERIAL,
            name: 'Test Glock 19',
            weaponType: 'Pistol',
            caliber: '9mm',
            isStolen: 'false',
            registeredOwner: `${TEST_CIVILIAN.firstName} ${TEST_CIVILIAN.lastName}`,
            linkedCivilianID: civilianId,
            activeCommunityID: communityId,
            userID: userId,
            createdAt: now,
            updatedAt: now,
          },
          __v: 0,
        },
      },
      { upsert: true }
    );

    console.log('[seed] Test data seeded: user, community, civilian, vehicle, firearm');
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
    await db.collection('civilians').deleteOne({ _id: TEST_CIVILIAN_ID });
    await db.collection('vehicles').deleteOne({ _id: TEST_VEHICLE_ID });
    await db.collection('firearms').deleteOne({ _id: TEST_FIREARM_ID });
    // Clean up any data created during tests
    const communityId = TEST_COMMUNITY_ID.toHexString();
    await db.collection('bolos').deleteMany({ 'bolo.communityID': communityId });
    await db.collection('calls').deleteMany({ 'call.communityID': communityId });
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
