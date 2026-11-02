/**
 * URL helpers for dashboard tests.
 *
 * Dashboards expect query params:
 *   dept  = department name (plain text)
 *   d     = base64-encoded department ID
 *   c     = base64-encoded community ID
 *
 * Since our test user is the community owner, they have admin access
 * and can access any department dashboard without a specific department.
 * For smoke tests, we just need the community ID.
 */
import { TEST_COMMUNITY_ID } from './seed';

const communityIdB64 = Buffer.from(TEST_COMMUNITY_ID.toHexString()).toString('base64');

export function dashboardUrl(path: string): string {
  return `${path}?c=${encodeURIComponent(communityIdB64)}`;
}

/** URL-safe base64 encoding (matches the app's encodeId pattern) */
function toUrlSafeBase64(hex: string): string {
  return Buffer.from(hex)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Returns the community details page URL for the test community */
export function communityDetailsUrl(): string {
  return `/community/${communityHash()}`;
}

/**
 * The encoded community id, which is how every /community/... path spells a
 * community. A page there decodes its first segment, so a test that navigates
 * with the raw ObjectId is not exercising the URL a real link uses.
 */
export function communityHash(): string {
  return toUrlSafeBase64(TEST_COMMUNITY_ID.toHexString());
}
