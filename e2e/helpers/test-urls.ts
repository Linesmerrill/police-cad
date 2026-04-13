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
