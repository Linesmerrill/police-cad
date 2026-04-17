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

export function uniqueTestEmail(prefix: string): string {
  return `phase7-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`;
}

// ---------------------------------------------------------------------------
// Phase 8 — Civilian / Vehicle / Firearm / License helpers
// ---------------------------------------------------------------------------

const TEST_USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const TEST_COMMUNITY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

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
// Phase 9 — Call helpers
// ---------------------------------------------------------------------------

export async function createTestCall(opts: {
  title: string;
  details?: string;
  status?: boolean;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('calls').insertOne({
      _id,
      call: {
        title: opts.title,
        details: opts.details ?? 'E2E test call details',
        shortDescription: opts.title,
        classifier: [],
        departments: [],
        assignedOfficers: [],
        assignedFireEms: [],
        assignedTo: [],
        callNotes: [],
        communityID: TEST_COMMUNITY_ID,
        createdByUsername: 'testuser',
        createdByID: TEST_USER_ID,
        status: opts.status ?? true,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getCallByTitle(title: string) {
  return withDb(async (db) =>
    db.collection('calls').findOne({
      $or: [
        { 'call.title': { $regex: title, $options: 'i' } },
        { 'call.shortDescription': { $regex: title, $options: 'i' } },
      ],
    })
  );
}

export async function getCallById(id: string) {
  return withDb(async (db) =>
    db.collection('calls').findOne({ _id: new ObjectId(id) })
  );
}

export async function deleteCallById(id: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('calls').deleteOne({ _id: new ObjectId(id) });
  });
}

export async function deleteCallsByPrefix(prefix: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('calls').deleteMany({
      'call.title': { $regex: `^${prefix}`, $options: 'i' },
    });
  });
}

// ---------------------------------------------------------------------------
// Phase 10 — Record helpers (warrants, BOLOs, most wanted, arrests, tickets,
// warnings, medical reports)
//
// All helpers attach records to TEST_COMMUNITY_ID and, where applicable,
// TEST_CIVILIAN_ID so tests don't need to create a civilian per case.
// ---------------------------------------------------------------------------

export async function createTestWarrant(opts: {
  accusedFirstName: string;
  accusedLastName: string;
  accusedId?: string;
  warrantType?: string;
  status?: string;
  charges?: string[];
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('warrants').insertOne({
      _id,
      warrant: {
        warrantType: opts.warrantType ?? 'arrest',
        status: opts.status ?? 'approved',
        accusedID: opts.accusedId ?? '',
        accusedFirstName: opts.accusedFirstName,
        accusedLastName: opts.accusedLastName,
        probableCause: 'E2E test probable cause',
        charges: opts.charges ?? ['E2E Test Charge'],
        searchLocation: '',
        requestingOfficerID: TEST_USER_ID,
        requestingOfficerName: 'testuser',
        judgeID: '',
        judgeName: '',
        judgeNotes: '',
        reportingOfficerID: TEST_USER_ID,
        reportingOfficerUsername: 'testuser',
        clearingOfficerID: '',
        reasons: opts.charges ?? ['E2E Test Charge'],
        communityID: TEST_COMMUNITY_ID,
        activeCommunityID: TEST_COMMUNITY_ID,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getWarrantById(id: string) {
  return withDb(async (db) =>
    db.collection('warrants').findOne({ _id: new ObjectId(id) })
  );
}

export async function deleteWarrantsByAccusedLastName(
  lastName: string
): Promise<void> {
  await withDb(async (db) => {
    await db.collection('warrants').deleteMany({
      'warrant.accusedLastName': { $regex: `^${lastName}`, $options: 'i' },
    });
  });
}

export async function createTestBolo(opts: {
  title: string;
  description?: string;
  location?: string;
  scope?: string;
  status?: boolean;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('bolos').insertOne({
      _id,
      bolo: {
        title: opts.title,
        location: opts.location ?? 'E2E Test Location',
        description: opts.description ?? 'E2E test BOLO description',
        scope: opts.scope ?? 'community',
        communityID: TEST_COMMUNITY_ID,
        departmentID: '',
        reportedByID: TEST_USER_ID,
        reportingOfficerUsername: 'testuser',
        reportingOfficerID: TEST_USER_ID,
        status: opts.status ?? true,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getBoloById(id: string) {
  return withDb(async (db) =>
    db.collection('bolos').findOne({ _id: new ObjectId(id) })
  );
}

export async function deleteBolosByTitlePrefix(prefix: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('bolos').deleteMany({
      'bolo.title': { $regex: `^${prefix}`, $options: 'i' },
    });
  });
}

export async function createTestMostWanted(opts: {
  civilianId?: string;
  charges?: string[];
  description?: string;
  stars?: number;
  status?: string;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('most_wanted_entries').insertOne({
      _id,
      mostWanted: {
        communityID: TEST_COMMUNITY_ID,
        civilianID: opts.civilianId ?? 'cccccccccccccccccccccccc',
        listOrder: 0,
        stars: opts.stars ?? 3,
        charges: opts.charges ?? ['E2E Test Charge'],
        description: opts.description ?? 'E2E test most wanted',
        status: opts.status ?? 'active',
        addedByUserID: TEST_USER_ID,
        customFields: {},
        civilianSnapshot: {},
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getMostWantedById(id: string) {
  return withDb(async (db) =>
    db.collection('most_wanted_entries').findOne({ _id: new ObjectId(id) })
  );
}

export async function deleteMostWantedByDescriptionPrefix(
  prefix: string
): Promise<void> {
  await withDb(async (db) => {
    await db.collection('most_wanted_entries').deleteMany({
      'mostWanted.description': { $regex: `^${prefix}`, $options: 'i' },
    });
  });
}

export async function createTestArrestReport(opts: {
  reportNumber: string;
  arresteeFirstName?: string;
  arresteeLastName?: string;
  civilianId?: string;
  charges?: string;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  const firstName = opts.arresteeFirstName ?? 'Test';
  const lastName = opts.arresteeLastName ?? 'Suspect';
  await withDb(async (db) => {
    await db.collection('arrestreports').insertOne({
      _id,
      arrestReport: {
        reportNumber: opts.reportNumber,
        arrestDate: '04/17/2026',
        arrestTime: '14:30',
        arrestLocation: '123 Test St',
        incidentDate: '04/17/2026',
        incidentTime: '14:00',
        incidentLocation: '123 Test St',
        arrestee: {
          id: opts.civilianId ?? 'cccccccccccccccccccccccc',
          name: `${firstName} ${lastName}`,
          dob: '01/15/1990',
          address: '123 Test Street',
          height: '5\'10"',
          weight: '180',
          eyeColor: 'Brown',
          hairColor: 'Black',
          phone: '',
        },
        officer: {
          id: TEST_USER_ID,
          name: 'testuser',
          badge: 'T-1',
        },
        officerID: TEST_USER_ID,
        activeCommunityID: TEST_COMMUNITY_ID,
        departmentId: '',
        charges: opts.charges ?? 'E2E Test Charge',
        narrative: 'E2E test narrative',
        witnesses: '',
        forceUsed: false,
        attachedForms: [],
        status: '',
        dismissedBy: '',
        courtCaseID: '',
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getArrestReportById(id: string) {
  return withDb(async (db) =>
    db.collection('arrestreports').findOne({ _id: new ObjectId(id) })
  );
}

export async function deleteArrestReportsByPrefix(prefix: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection('arrestreports').deleteMany({
      'arrestReport.reportNumber': { $regex: `^${prefix}`, $options: 'i' },
    });
  });
}

/**
 * Tickets and warnings share one collection — a warning is a ticket with
 * `ticket.isWarning === true`. The create-ticket form POST on the Node.js
 * side sets this flag based on a form field.
 */
export async function createTestTicket(opts: {
  caseNumber: string;
  civilianId?: string;
  civFirstName?: string;
  civLastName?: string;
  violations?: string[];
  amount?: string;
  isWarning?: boolean;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('tickets').insertOne({
      _id,
      ticket: {
        officerID: TEST_USER_ID,
        caseNumber: opts.caseNumber,
        violation: opts.violations ?? ['E2E Test Violation'],
        plate: '',
        model: '',
        color: '',
        registeredOwner: '',
        amount: opts.amount ?? '100',
        date: '2026-04-17',
        time: '14:30',
        civID: opts.civilianId ?? 'cccccccccccccccccccccccc',
        civEmail: '',
        civFirstName: opts.civFirstName ?? 'Test',
        civLastName: opts.civLastName ?? 'Civilian',
        isWarning: opts.isWarning ?? false,
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getTicketByCaseNumber(caseNumber: string) {
  return withDb(async (db) =>
    db.collection('tickets').findOne({ 'ticket.caseNumber': caseNumber })
  );
}

export async function deleteTicketsByCaseNumberPrefix(
  prefix: string
): Promise<void> {
  await withDb(async (db) => {
    await db.collection('tickets').deleteMany({
      'ticket.caseNumber': { $regex: `^${prefix}`, $options: 'i' },
    });
  });
}

export async function createTestMedicalReport(opts: {
  details: string;
  civilianId?: string;
  hospitalized?: boolean;
  deceased?: boolean;
}): Promise<string> {
  const _id = new ObjectId();
  const now = new Date();
  await withDb(async (db) => {
    await db.collection('medicalreports').insertOne({
      _id,
      report: {
        date: '2026-04-17',
        details: opts.details,
        civilianID: opts.civilianId ?? 'cccccccccccccccccccccccc',
        reportingEmsID: TEST_USER_ID,
        hospitalized: opts.hospitalized ?? false,
        deceased: opts.deceased ?? false,
        activeCommunityID: TEST_COMMUNITY_ID,
        userID: TEST_USER_ID,
        name: 'Test Civilian',
        dateOfBirth: '1990-01-15',
        createdAt: now,
        updatedAt: now,
      },
      __v: 0,
    });
  });
  return _id.toHexString();
}

export async function getMedicalReportById(id: string) {
  return withDb(async (db) =>
    db.collection('medicalreports').findOne({ _id: new ObjectId(id) })
  );
}

export async function deleteMedicalReportsByDetailsPrefix(
  prefix: string
): Promise<void> {
  await withDb(async (db) => {
    await db.collection('medicalreports').deleteMany({
      'report.details': { $regex: `^${prefix}`, $options: 'i' },
    });
  });
}
