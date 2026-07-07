/**
 * Seeds a live court session with an active case ready for the test user (the
 * judge) to sentence: one arrest (with a structured chargesList carrying fines +
 * jail time) and one citation (fine only). Used by the judge-flow E2E.
 *
 * Reuses the shared test community/civilian/user from seed.ts and inserts into
 * the same test DB both services read.
 */
import { MongoClient, ObjectId } from 'mongodb';
import {
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  TEST_CIVILIAN_ID,
  TEST_DEPARTMENT_ID,
} from './seed';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27018';
const DB_NAME = process.env.DB_NAME || 'policecad_test';

// Fixed IDs so the test can reference + assert deterministically.
export const COURT_ARREST_ID = '00000000000000000000a101';
export const COURT_CITATION_HIST_ID = '00000000000000000000c101';
export const COURT_CASE_ID = '00000000000000000000ca01';
export const COURT_SESSION_ID = '00000000000000000000e501';

// Charges the test asserts against.
export const COURT_SCENARIO = {
  arrestCharges: [
    { name: 'Grand Theft Auto', category: 'Felony', amount: 5000, jailTime: '6 months' },
    { name: 'Reckless Driving', category: 'Misdemeanor', amount: 500, jailTime: '2 minutes' },
  ],
  citationFines: [{ fineType: 'Speeding', fineAmount: 250, category: 'Infraction' }],
  // All-upheld baseline: 5000 + 500 + 250
  totalFineAllUpheld: 5750,
};

export async function seedCourtSentencingScenario(): Promise<void> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const communityId = TEST_COMMUNITY_ID.toHexString();
    const userId = TEST_USER_ID.toHexString();
    const civilianId = TEST_CIVILIAN_ID.toHexString();
    const departmentId = TEST_DEPARTMENT_ID.toHexString();
    const now = new Date();

    // 1) Arrest report with a structured chargesList (the net-new judge path).
    await db.collection('arrestreports').updateOne(
      { _id: new ObjectId(COURT_ARREST_ID) },
      {
        $set: {
          _id: new ObjectId(COURT_ARREST_ID),
          arrestReport: {
            reportNumber: 'AR-E2E-001',
            arrestDate: '01/15/2026',
            arrestLocation: 'Test Highway',
            arrestee: { id: civilianId, name: 'Court Defendant' },
            officer: { name: 'Test User', badgeNumber: 'T-1' },
            officerID: userId,
            activeCommunityID: communityId,
            departmentId,
            charges: 'Grand Theft Auto, Reckless Driving',
            chargesList: COURT_SCENARIO.arrestCharges,
            narrative: 'E2E arrest for court sentencing.',
            status: 'contested',
            courtCaseID: COURT_CASE_ID,
            createdAt: now,
            updatedAt: now,
          },
          __v: 0,
        },
      },
      { upsert: true }
    );

    // 2) Citation on the civilian's criminal history (fine-only path).
    await db.collection('civilians').updateOne(
      { _id: TEST_CIVILIAN_ID },
      {
        $set: {
          'civilian.criminalHistory': [
            {
              _id: new ObjectId(COURT_CITATION_HIST_ID),
              type: 'Citation',
              officerID: userId,
              departmentID: departmentId,
              fines: COURT_SCENARIO.citationFines,
              status: 'contested',
              courtCaseID: COURT_CASE_ID,
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      }
    );

    // 3) Court case contesting both, assigned to the test user (the judge).
    await db.collection('courtcases').updateOne(
      { _id: new ObjectId(COURT_CASE_ID) },
      {
        $set: {
          _id: new ObjectId(COURT_CASE_ID),
          courtCase: {
            caseNumber: 'CC-2026-000101',
            civilianID: civilianId,
            civilianName: 'Court Defendant',
            userID: userId,
            contestedItems: [
              { itemID: COURT_ARREST_ID, itemType: 'arrest', summary: 'Grand Theft Auto, Reckless Driving' },
              { itemID: COURT_CITATION_HIST_ID, itemType: 'citation', summary: 'Speeding' },
            ],
            statement: 'I was not driving.',
            departmentID: departmentId,
            communityID: communityId,
            judgeID: userId,
            judgeName: 'Test User',
            status: 'in_progress',
            courtSessionID: COURT_SESSION_ID,
            resolutions: [],
            history: [],
            createdAt: now,
            updatedAt: now,
          },
          __v: 0,
        },
      },
      { upsert: true }
    );

    // 4) Live session with the case active + the test user as judge.
    await db.collection('courtsessions').updateOne(
      { _id: new ObjectId(COURT_SESSION_ID) },
      {
        $set: {
          _id: new ObjectId(COURT_SESSION_ID),
          courtSession: {
            communityID: communityId,
            departmentID: departmentId,
            judgeID: userId,
            judgeName: 'Test User',
            title: 'E2E Sentencing Docket',
            status: 'in_progress',
            docket: [
              {
                courtCaseID: COURT_CASE_ID,
                caseNumber: 'CC-2026-000101',
                civilianName: 'Court Defendant',
                userID: userId,
                order: 0,
                status: 'active',
              },
            ],
            participants: [{ userID: userId, userName: 'Test User', role: 'judge', joinedAt: now }],
            startedAt: now,
            createdAt: now,
            updatedAt: now,
          },
          __v: 0,
        },
      },
      { upsert: true }
    );
  } finally {
    await client.close();
  }
}

export async function getSeededCourtCase(): Promise<any> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    return await client
      .db(DB_NAME)
      .collection('courtcases')
      .findOne({ _id: new ObjectId(COURT_CASE_ID) });
  } finally {
    await client.close();
  }
}

export async function cleanupCourtSentencingScenario(): Promise<void> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    await db.collection('arrestreports').deleteOne({ _id: new ObjectId(COURT_ARREST_ID) });
    await db.collection('courtcases').deleteOne({ _id: new ObjectId(COURT_CASE_ID) });
    await db.collection('courtsessions').deleteOne({ _id: new ObjectId(COURT_SESSION_ID) });
    await db.collection('civilians').updateOne(
      { _id: TEST_CIVILIAN_ID },
      { $set: { 'civilian.criminalHistory': [] } }
    );
  } finally {
    await client.close();
  }
}
