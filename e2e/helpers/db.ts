/**
 * MongoDB helper for Phase 7 auth-lifecycle E2E tests.
 *
 * The test environment has no SMTP/MAIL_API_KEY, so we cannot exercise the
 * UI signup-email + forgot-password-email flows end-to-end. Instead, we seed
 * verification and reset tokens directly in the test DB and assert the
 * token-consumption routes (which are the actual regression risk) work.
 *
 * Connection mirrors seed.ts: DB_URI=mongodb://localhost:27018, DB_NAME=policecad_test.
 */
import { MongoClient, ObjectId, Db } from 'mongodb';
import crypto from 'crypto';
import bcrypt from 'bcrypt-nodejs';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27018';
const DB_NAME = process.env.DB_NAME || 'policecad_test';

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(DB_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    return await fn(client.db(DB_NAME));
  } finally {
    await client.close();
  }
}

export interface TestUserRecord {
  _id: ObjectId;
  user: {
    username: string;
    email: string;
    password: string;
    emailVerified?: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    isDeactivated?: boolean;
    deactivatedAt?: Date;
    restoreUntil?: Date;
    [key: string]: unknown;
  };
}

function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, bcrypt.genSaltSync(8));
}

/**
 * Insert a fresh test user directly. Mirrors the shape written by /api/signup
 * so the app's Passport strategies and lookups work against it.
 */
export async function createTestUser(opts: {
  email: string;
  password: string;
  username?: string;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  /** Milliseconds since epoch — converted to Date for Mongoose schema compat. */
  emailVerificationExpires?: number;
  resetPasswordToken?: string;
  /** Milliseconds since epoch — converted to Date for Mongoose schema compat. */
  resetPasswordExpires?: number;
}): Promise<ObjectId> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('users').insertOne({
      _id,
      user: {
        username: opts.username ?? `phase7-${_id.toHexString().slice(-8)}`,
        callSign: '',
        email: opts.email.toLowerCase(),
        password: hashPassword(opts.password),
        name: '',
        firstName: '',
        lastName: '',
        discordConnected: false,
        emailVerified: opts.emailVerified ?? true,
        emailVerificationToken: opts.emailVerificationToken,
        emailVerificationExpires:
          opts.emailVerificationExpires !== undefined
            ? new Date(opts.emailVerificationExpires)
            : undefined,
        resetPasswordToken: opts.resetPasswordToken,
        resetPasswordExpires:
          opts.resetPasswordExpires !== undefined
            ? new Date(opts.resetPasswordExpires)
            : undefined,
        isDeactivated: false,
        subscription: { plan: 'free', active: false },
        createdAt: now,
        updatedAt: now,
      },
    });
  });
  return _id;
}

export async function getUserByEmail(email: string): Promise<TestUserRecord | null> {
  return withDb(async (db) =>
    db
      .collection<TestUserRecord>('users')
      .findOne({ 'user.email': email.toLowerCase() })
  );
}

export async function deleteUserByEmail(email: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('users').deleteOne({ 'user.email': email.toLowerCase() });
  });
}

export async function setResetToken(
  email: string,
  token: string,
  expiresInMs = 60 * 60 * 1000
): Promise<void> {
  await withDb(async (db) => {
    await db.collection('users').updateOne(
      { 'user.email': email.toLowerCase() },
      {
        $set: {
          'user.resetPasswordToken': token,
          'user.resetPasswordExpires': new Date(Date.now() + expiresInMs),
        },
      }
    );
  });
}

export async function setEmailVerificationToken(
  email: string,
  token: string,
  expiresInMs = 24 * 60 * 60 * 1000
): Promise<void> {
  await withDb(async (db) => {
    await db.collection('users').updateOne(
      { 'user.email': email.toLowerCase() },
      {
        $set: {
          'user.emailVerified': false,
          'user.emailVerificationToken': token,
          'user.emailVerificationExpires': new Date(Date.now() + expiresInMs),
        },
      }
    );
  });
}

export function generateToken(): string {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Read the most-recent pendingVerifications row for an account-change flow.
 * Tests use this to grab the 6-digit code that the API would normally email out
 * (the test env has no SMTP, so we look at the row directly).
 */
export async function getPendingVerificationCode(
  userId: ObjectId,
  purpose: 'email_change' | 'password_change'
): Promise<{ code: string; newEmail?: string } | null> {
  return withDb(async (db) => {
    const row = await db.collection('pendingVerifications').findOne({
      userID: userId,
      purpose,
    });
    if (!row) return null;
    return { code: row.code as string, newEmail: row.newEmail as string | undefined };
  });
}

export async function deletePendingVerifications(userId: ObjectId): Promise<void> {
  await withDb(async (db) => {
    await db.collection('pendingVerifications').deleteMany({ userID: userId });
  });
}

export function uniqueTestEmail(prefix: string): string {
  return `phase7-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`;
}

// ---------------------------------------------------------------------------
// Phase 8 — Civilian / Vehicle / Firearm / License helpers
// ---------------------------------------------------------------------------

const TEST_USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const TEST_COMMUNITY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

export async function createTestCivilian(opts: {
  firstName: string;
  lastName?: string;
  birthday?: string;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('civilians').insertOne({
      _id,
      civilian: {
        firstName: opts.firstName.toLowerCase(),
        lastName: (opts.lastName ?? 'TestSurname').toLowerCase(),
        name: `${opts.firstName} ${opts.lastName ?? 'TestSurname'}`,
        searchName: `${opts.firstName} ${opts.lastName ?? 'TestSurname'}`.toLowerCase(),
        birthday: opts.birthday ?? '1990-01-15',
        address: '123 E2E Street',
        occupation: 'Tester',
        gender: 'Male',
        height: '180',
        heightClassification: 'Metric',
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
        activeCommunityID: TEST_COMMUNITY_ID,
        userID: TEST_USER_ID,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getCivilianByName(name: string) {
  return withDb(async (db) =>
    db.collection('civilians').findOne({
      $or: [
        { 'civilian.name': { $regex: name, $options: 'i' } },
        { 'civilian.firstName': name.toLowerCase() },
      ],
      'civilian.activeCommunityID': TEST_COMMUNITY_ID,
    })
  );
}

export async function deleteCivilianById(id: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('civilians').deleteOne({ _id: new ObjectId(id) });
  });
}

export async function deleteCiviliansByPrefix(prefix: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('civilians').deleteMany({
      'civilian.firstName': { $regex: `^${prefix.toLowerCase()}` },
      'civilian.activeCommunityID': TEST_COMMUNITY_ID,
    });
  });
}

export async function createTestVehicle(opts: {
  plate: string;
  civilianId?: string;
  vin?: string;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('vehicles').insertOne({
      _id,
      vehicle: {
        plate: opts.plate.toUpperCase(),
        licensePlateState: 'CA',
        vin: opts.vin ?? `1HGBH${Date.now().toString().slice(-12)}`,
        type: 'Sedan',
        make: 'TestMake',
        model: 'TestModel',
        year: '2024',
        color: 'Blue',
        validRegistration: 'true',
        validInsurance: 'true',
        isStolen: 'false',
        isExempt: 'false',
        registeredOwner: '',
        linkedCivilianID: opts.civilianId ?? '',
        activeCommunityID: TEST_COMMUNITY_ID,
        userID: TEST_USER_ID,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getVehicleByPlate(plate: string) {
  return withDb(async (db) =>
    db.collection('vehicles').findOne({
      'vehicle.plate': plate.toUpperCase(),
      'vehicle.activeCommunityID': TEST_COMMUNITY_ID,
    })
  );
}

export async function deleteVehicleById(id: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('vehicles').deleteOne({ _id: new ObjectId(id) });
  });
}

export async function deleteVehiclesByPrefix(prefix: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('vehicles').deleteMany({
      'vehicle.plate': { $regex: `^${prefix.toUpperCase()}` },
      'vehicle.activeCommunityID': TEST_COMMUNITY_ID,
    });
  });
}

export async function createTestFirearm(opts: {
  serialNumber: string;
  name: string;
  weaponType?: string;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('firearms').insertOne({
      _id,
      firearm: {
        serialNumber: opts.serialNumber,
        name: opts.name,
        weaponType: opts.weaponType ?? 'Pistol',
        caliber: '9mm',
        color: 'Black',
        isStolen: 'false',
        registeredOwner: '',
        linkedCivilianID: '',
        activeCommunityID: TEST_COMMUNITY_ID,
        userID: TEST_USER_ID,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getFirearmBySerial(serial: string) {
  return withDb(async (db) =>
    db.collection('firearms').findOne({
      'firearm.serialNumber': serial,
      'firearm.activeCommunityID': TEST_COMMUNITY_ID,
    })
  );
}

export async function deleteFirearmById(id: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('firearms').deleteOne({ _id: new ObjectId(id) });
  });
}

export async function createTestLicense(opts: {
  type: string;
  status: string;
  expirationDate: string;
  civilianId?: string;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('licenses').insertOne({
      _id,
      license: {
        licenseType: opts.type,
        status: opts.status,
        expirationDate: opts.expirationDate,
        additionalNotes: '',
        ownerID: opts.civilianId ?? '',
        ownerName: '',
        activeCommunityID: TEST_COMMUNITY_ID,
        userID: TEST_USER_ID,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getLicenseByType(type: string) {
  return withDb(async (db) =>
    db.collection('licenses').findOne({
      $or: [
        { 'license.type': type },
        { 'license.licenseType': type },
      ],
    })
  );
}

export async function deleteLicenseById(id: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('licenses').deleteOne({ _id: new ObjectId(id) });
  });
}

export function uniqueCivName(prefix: string): string {
  return `P8${prefix}${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Dispatch beta / person-search helpers
// ---------------------------------------------------------------------------

/**
 * Upsert the test user's beta-command-dashboard opt-in.
 * Filter is on `userId` (hex string) — matches the API handler's lookup.
 */
export async function setBetaCommandDashboard(enabled: boolean): Promise<void> {
  await withDb(async (db) => {
    await db.collection('userpreferences').updateOne(
      { userId: TEST_USER_ID },
      {
        $set: {
          userId: TEST_USER_ID,
          betaCommandDashboard: enabled,
          updatedAt: new Date(),
        },
        $setOnInsert: { _id: new ObjectId(), createdAt: new Date() },
      },
      { upsert: true }
    );
  });
}

/**
 * Upsert the test user's Command Bridge (dispatch) opt-in.
 * Gated separately from betaCommandDashboard so admin adoption metrics can
 * distinguish police vs. dispatch bridge adoption.
 */
export async function setBetaCommandDispatch(enabled: boolean): Promise<void> {
  await withDb(async (db) => {
    await db.collection('userpreferences').updateOne(
      { userId: TEST_USER_ID },
      {
        $set: {
          userId: TEST_USER_ID,
          betaCommandDispatch: enabled,
          updatedAt: new Date(),
        },
        $setOnInsert: { _id: new ObjectId(), createdAt: new Date() },
      },
      { upsert: true }
    );
  });
}

export async function deleteUserPreferences(): Promise<void> {
  await withDb(async (db) => {
    await db.collection('userpreferences').deleteOne({ userId: TEST_USER_ID });
  });
}

/**
 * Push a Dispatch department onto the seeded test community so the command
 * dashboard can resolve a real template.components list. `nameSearch` is the
 * canonical dispatch-template key for person search; enabling it should light
 * up the Person Search UI after the tplToReg alias.
 */
export async function addDispatchDepartment(opts: {
  name?: string;
  nameSearchEnabled?: boolean;
}): Promise<string> {
  const deptId = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('communities').updateOne(
      { _id: new ObjectId(TEST_COMMUNITY_ID) },
      {
        $push: {
          'community.departments': {
            _id: deptId,
            name: opts.name ?? 'Dispatch',
            description: 'E2E dispatch department',
            image: '',
            approvalRequired: false,
            members: [{ id: TEST_USER_ID, status: 'active' }],
            ranks: [],
            template: {
              _id: new ObjectId(),
              name: 'Dispatch',
              description: 'Default template for dispatch departments',
              components: [
                { _id: new ObjectId(), name: 'dispatchUnits', enabled: true },
                { _id: new ObjectId(), name: 'createAndManageCalls', enabled: true },
                { _id: new ObjectId(), name: 'createBolos', enabled: true },
                { _id: new ObjectId(), name: 'manage911Calls', enabled: true },
                { _id: new ObjectId(), name: 'nameSearch', enabled: opts.nameSearchEnabled ?? true },
                { _id: new ObjectId(), name: 'vehicleSearch', enabled: true },
                { _id: new ObjectId(), name: 'firearmSearch', enabled: true },
              ],
            },
            createdAt: now,
            updatedAt: now,
            onlineMemberCount: 0,
          },
        },
      }
    );
  });
  return deptId.toHexString();
}

/**
 * Push a law-enforcement (police) department onto the seeded test community
 * with the firearm-management component enabled, so the department dashboard
 * renders the Firearms tab (dd-firearms.js). Mirrors addDispatchDepartment —
 * the dashboard derives enabledComponents from `template.components`, so we
 * seed them explicitly rather than relying on backend template defaults.
 */
export async function addPoliceDepartment(opts: {
  name?: string;
  firearmsEnabled?: boolean;
} = {}): Promise<string> {
  const deptId = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('communities').updateOne(
      { _id: new ObjectId(TEST_COMMUNITY_ID) },
      {
        $push: {
          'community.departments': {
            _id: deptId,
            name: opts.name ?? 'E2E Police',
            description: 'E2E police department',
            image: '',
            approvalRequired: false,
            members: [{ id: TEST_USER_ID, status: 'active' }],
            ranks: [],
            template: {
              _id: new ObjectId(),
              name: 'Police',
              category: 'law-enforcement',
              description: 'E2E police template',
              components: [
                { _id: new ObjectId(), name: 'createCivilians', enabled: true },
                { _id: new ObjectId(), name: 'createVehicles', enabled: true },
                { _id: new ObjectId(), name: 'createFirearms', enabled: opts.firearmsEnabled ?? true },
              ],
            },
            createdAt: now,
            updatedAt: now,
            onlineMemberCount: 0,
          },
        },
      }
    );
  });
  return deptId.toHexString();
}

export async function removeDepartmentById(deptId: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('communities').updateOne(
      { _id: new ObjectId(TEST_COMMUNITY_ID) },
      { $pull: { 'community.departments': { _id: new ObjectId(deptId) } } }
    );
  });
}

/**
 * Base64url-encode a hex id the way command-dashboard expects in the `d` / `c`
 * query params (see routes.js command-dashboard handler).
 */
export function encodeIdForUrl(hexId: string): string {
  return Buffer.from(hexId, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Community soft-delete helpers — flip the seeded test community in and out
// of pending-deletion state without going through the API. Lets us assert
// that every server-rendered community page handles the 410 pending_deletion
// response correctly (route-block page, not generic 404).
// ---------------------------------------------------------------------------

/**
 * Dedicated community ID used by the pending-deletion test suite. Separate
 * from TEST_COMMUNITY_ID so flipping pending state in these tests can't poison
 * the seeded community that other tests run against in parallel workers.
 */
export const PENDING_DELETION_TEST_COMMUNITY_ID = 'b0b0b0b0b0b0b0b0b0b0b0b0';

/**
 * Seed (or reset) the dedicated pending-deletion test community. Idempotent.
 * Always starts in non-pending state — call setPendingDeletionTestCommunityPending
 * to flip it.
 *
 * IMPORTANT: This helper deliberately does NOT touch the shared TEST_USER's
 * `user.communities` array. Other parallel workers run dashboards/wallet/etc.
 * tests against TEST_USER and break if an extra community is injected. The
 * pending-deletion 410 gate runs at the route middleware layer BEFORE any
 * membership check, so the test user does not need to be a member for the
 * pending tests to hit 410. The baseline (non-pending) test only asserts
 * status != 410, not full page render, so membership isn't needed there either.
 */
export async function ensurePendingDeletionTestCommunity(): Promise<void> {
  const now = new Date();
  const cID = new ObjectId(PENDING_DELETION_TEST_COMMUNITY_ID);
  await withDb(async (db) => {
    // Set the whole `community` subdoc in one shot. This implicitly drops any
    // pendingDeletionAt / scheduledDeletionAt / etc. that a previous test left
    // behind, so we don't need a $unset clause (which would conflict with
    // $set on the same parent path).
    await db.collection('communities').updateOne(
      { _id: cID },
      {
        $set: {
          _id: cID,
          community: {
            name: 'pending-deletion test community',
            ownerID: TEST_USER_ID,
            code: 'PDTEST1',
            activeSignal100: false,
            activeHoldTraffic: false,
            departments: [],
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      { upsert: true }
    );
  });
}

/** Flip the dedicated pending-deletion test community into pending state. */
export async function setPendingDeletionTestCommunityPending(opts?: {
  scheduledInDays?: number;
}): Promise<void> {
  const days = opts?.scheduledInDays ?? 30;
  const now = new Date();
  const scheduled = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  await withDb(async (db) => {
    await db.collection('communities').updateOne(
      { _id: new ObjectId(PENDING_DELETION_TEST_COMMUNITY_ID) },
      {
        $set: {
          'community.pendingDeletionAt': now,
          'community.scheduledDeletionAt': scheduled,
          'community.deletionRequestedBy': TEST_USER_ID,
          'community.updatedAt': now,
        },
      }
    );
  });
}

/** Restore the dedicated pending-deletion test community to its normal state. */
export async function clearPendingDeletionTestCommunity(): Promise<void> {
  await withDb(async (db) => {
    await db.collection('communities').updateOne(
      { _id: new ObjectId(PENDING_DELETION_TEST_COMMUNITY_ID) },
      {
        $unset: {
          'community.pendingDeletionAt': '',
          'community.scheduledDeletionAt': '',
          'community.pendingDeletionNotifiedAt': '',
          'community.deletionRequestedBy': '',
        },
        $set: {
          'community.updatedAt': new Date(),
        },
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Arrest reports
// ---------------------------------------------------------------------------

/**
 * Seed `count` arrest reports against one arrestee.
 *
 * GET /api/v1/arrest-report/arrestee/{id} is paginated and defaults to 10 per
 * page, so any surface that renders a civilian's full history needs more than
 * one page of fixtures to prove it walks them all.
 */
export async function createTestArrestReports(opts: {
  civilianId: string;
  civilianName?: string;
  count: number;
  departmentId?: string;
  reportPrefix?: string;
}): Promise<string[]> {
  const now = new Date();
  const prefix = opts.reportPrefix ?? 'AR-PAGE';
  const docs = Array.from({ length: opts.count }, (_, i) => ({
    _id: new ObjectId(),
    arrestReport: {
      reportNumber: `${prefix}-${String(i + 1).padStart(3, '0')}`,
      arrestDate: '01/15/2026',
      arrestLocation: 'Test Highway',
      arrestee: { id: opts.civilianId, name: opts.civilianName ?? 'E2E Arrestee' },
      officer: { name: 'Test User', badgeNumber: 'T-1' },
      officerID: TEST_USER_ID,
      activeCommunityID: TEST_COMMUNITY_ID,
      departmentId: opts.departmentId ?? '',
      charges: `E2E Charge ${i + 1}`,
      narrative: `E2E arrest report #${i + 1} for pagination coverage.`,
      createdAt: new Date(now.getTime() + i * 1000),
      updatedAt: new Date(now.getTime() + i * 1000),
    },
    __v: 0,
  }));

  await withDb(async (db) => {
    await db.collection('arrestreports').insertMany(docs);
  });

  return docs.map((d) => d._id.toHexString());
}

/** Remove every arrest report seeded against an arrestee. */
export async function deleteArrestReportsByArresteeId(civilianId: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('arrestreports').deleteMany({
      'arrestReport.arrestee.id': civilianId,
    });
  });
}
