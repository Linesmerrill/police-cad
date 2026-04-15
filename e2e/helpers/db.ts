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
    emailVerificationExpires?: number;
    resetPasswordToken?: string;
    resetPasswordExpires?: number;
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
  emailVerificationExpires?: number;
  resetPasswordToken?: string;
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
        emailVerificationExpires: opts.emailVerificationExpires,
        resetPasswordToken: opts.resetPasswordToken,
        resetPasswordExpires: opts.resetPasswordExpires,
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
          'user.resetPasswordExpires': Date.now() + expiresInMs,
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
          'user.emailVerificationExpires': Date.now() + expiresInMs,
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
