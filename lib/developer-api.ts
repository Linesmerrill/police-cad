/**
 * The developer console's API client.
 *
 * Every call the console makes goes through here, for three reasons that each
 * cost us something earlier in this feature:
 *
 *   1. One place knows the error envelope. The Go API answers
 *      `{ response: { message } }` and this site's own Express routes answer a
 *      top-level `{ message }` or `{ error }`. Every component reading
 *      `data.message` directly got one of the two wrong.
 *   2. One place owns the types. A field removed from the API but left in a
 *      page's local type is exactly how the plan label came to read "Free" for
 *      a Premium account: the page read a property nothing sent, got
 *      `undefined`, and TypeScript was satisfied because the field was still
 *      declared. Declaring the shapes once, here, means a removal is a
 *      compile error rather than a silent `undefined`.
 *   3. No absolute URLs. Every path is relative, so the console works at
 *      /developer on the main site and at the root of its own subdomain with
 *      no build-time base path.
 */

// ---- the shapes the API actually sends ----

export type Scope = { scope: string; description: string };

export type DeveloperLimits = {
  requestsPerMinute: number;
  requestsPerDay: number;
  keysPerDeveloper: number;
  accountsPerKeyDay: number;
  communitiesPerKeyDay: number;
};

export type DeveloperTier = { plan: string; limits: DeveloperLimits };

export type Entitlement = {
  plan: string;
  source: string;
  websitePlan: string;
  lapsed: boolean;
};

/**
 * No `plan` field. The tier comes from the website subscription and is reported
 * in `entitlement`, never on the account. One used to live here, was removed
 * when tiers moved to the subscription, and the page kept reading it.
 */
export type DeveloperAccount = {
  id: string;
  appName?: string;
  appUrl?: string;
  status: string;
  termsVersion?: string;
  createdAt?: string;
};

export type AccountResponse = {
  enabled: boolean;
  account?: DeveloperAccount;
  limits: DeveloperLimits;
  availableScopes: Scope[];
  keyCount: number;
  tiers?: DeveloperTier[];
  communityPlans?: { plan: string; cap: number; unlimited: boolean }[];
  websiteTiers?: {
    name: string;
    key: string;
    monthlyPrice: number;
    annualPrice: number;
    onSale?: boolean;
    originalMonthlyPrice?: number;
  }[];
  /**
   * False when the API is enabled but not yet configured with its signing
   * secret. Keys minted in that state would hash against an empty secret and
   * stop matching the moment it is set, so the console offers no key form
   * while this is false.
   */
  keyIssuanceAvailable?: boolean;
  upgradeUrl?: string;
  entitlement?: Entitlement;
  communities?: { plan: string; owned: number; cap: number; unlimited: boolean };
  termsReacceptRequired?: boolean;
};

export type Grant = {
  grant: {
    communityId: string;
    status: 'active' | 'pending' | 'revoked' | string;
    source: string;
    requestedAt?: string;
    approvedAt?: string;
  };
  communityName: string;
};

export type DeveloperKey = {
  id: string;
  name: string;
  displayPrefix: string;
  lastFour: string;
  scopes: string[];
  status: 'active' | 'revoked' | string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type KeyRow = { key: DeveloperKey; communities: Grant[] };

export type KeyDetail = {
  key: DeveloperKey;
  communities: Grant[];
  limits: DeveloperLimits;
  plan: string;
  availableScopes: Scope[];
};

export type CommunityOption = {
  id: string;
  name: string;
  /** Whether this person can approve a key into it themselves. */
  canGrant: boolean;
};

export type KeyUsage = {
  plan: string;
  requestsToday: number;
  requestsThisMonth: number;
  dailyLimit: number;
  minuteLimit: number;
  dailyPercent: number;
  resetsAt: string | null;
  errorsToday: { rateLimited: number; unauthorized: number; forbidden: number };
  hasErrorsToday: boolean;
  series: { day: string; requests: number; rejected: number }[];
};

export type UsageDay = {
  day: string;
  requests: number;
  rejected: number;
  rejected401: number;
  rejected403: number;
  rejected429: number;
  accountsMade: number;
};

export type UsageKeyTotal = {
  keyId: string;
  name: string;
  status: string;
  requests: number;
  rejected: number;
  lastUsedAt: string | null;
};

export type AccountUsage = {
  plan: string;
  days: number;
  from: string;
  to: string;
  series: UsageDay[];
  keys: UsageKeyTotal[];
  requestsToday: number;
  rejectedToday: number;
  requestsThisMonth: number;
  totalRequests: number;
  totalRejected: number;
  peakDay: number;
  dailyLimit: number;
  minuteLimit: number;
  dailyPercent: number;
  resetsAt: string | null;
};

export type CreatedKey = {
  key: DeveloperKey;
  /** The only time this value exists anywhere we can read it. */
  plaintextKey: string;
  warning?: string;
};

export type SessionUser = {
  username?: string;
  email?: string;
  profilePicture?: string;
};

// ---- the transport ----

/**
 * ApiError carries the status as well as the message, because the console
 * treats some statuses as information rather than failure: a 409 from key
 * creation is "you are at your limit", which belongs next to the field, not in
 * a red banner at the top of the page.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Envelope = {
  response?: { message?: string };
  message?: string;
  error?: string;
};

/** Pull a usable message out of either error envelope. */
function reasonFrom(data: unknown, fallback: string): string {
  const src = (data || {}) as Envelope;
  if (src.response && typeof src.response.message === 'string' && src.response.message) {
    return src.response.message;
  }
  if (typeof src.message === 'string' && src.message) return src.message;
  if (typeof src.error === 'string' && src.error) return src.error;
  return fallback;
}

async function call<T>(
  path: string,
  init: RequestInit & { fallback?: string } = {}
): Promise<T> {
  const { fallback = 'Something went wrong', ...rest } = init;
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...rest,
      headers: {
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(rest.headers || {}),
      },
    });
  } catch {
    // A network failure is not a 500 from us, and saying so stops people
    // reporting an outage when their wifi dropped.
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  // 204 and an empty body are both legitimate answers from the delete routes.
  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    throw new ApiError(reasonFrom(data, fallback), response.status);
  }
  return data as T;
}

function json(body: unknown): string {
  return JSON.stringify(body);
}

// ---- the calls ----

export const developerApi = {
  account(): Promise<AccountResponse> {
    return call<AccountResponse>('/api/developer/account', {
      fallback: 'Could not load your developer account',
    });
  },

  sessionUser(): Promise<{ user?: SessionUser }> {
    return call<{ user?: SessionUser }>('/api/user/current', {
      fallback: 'Could not load your account',
    });
  },

  enable(input: { appName?: string; appUrl?: string; acceptTerms: boolean }) {
    return call<unknown>('/api/developer/account/enable', {
      method: 'POST',
      body: json(input),
      fallback: 'Could not turn on developer access',
    });
  },

  disable() {
    return call<unknown>('/api/developer/account/disable', {
      method: 'POST',
      fallback: 'Could not turn off developer access',
    });
  },

  keys(): Promise<{ keys: KeyRow[]; limits?: DeveloperLimits }> {
    return call<{ keys: KeyRow[]; limits?: DeveloperLimits }>('/api/developer/keys', {
      fallback: 'Could not load your keys',
    });
  },

  key(keyId: string): Promise<KeyDetail> {
    return call<KeyDetail>(`/api/developer/keys/${encodeURIComponent(keyId)}`, {
      fallback: 'Could not load that key',
    });
  },

  createKey(input: { name: string; scopes: string[]; communityId?: string }): Promise<CreatedKey> {
    return call<CreatedKey>('/api/developer/keys', {
      method: 'POST',
      body: json(input),
      fallback: 'Could not create that key',
    });
  },

  /**
   * Edits a key in place. The secret does not change, which is the whole
   * reason this exists rather than rotate-and-redeploy.
   */
  updateKey(
    keyId: string,
    input: { name?: string; scopes?: string[] }
  ): Promise<{ key: DeveloperKey; communities: Grant[]; changed: boolean }> {
    return call(`/api/developer/keys/${encodeURIComponent(keyId)}`, {
      method: 'PATCH',
      body: json(input),
      fallback: 'Could not save that key',
    });
  },

  rotateKey(keyId: string): Promise<CreatedKey> {
    return call<CreatedKey>(`/api/developer/keys/${encodeURIComponent(keyId)}/rotate`, {
      method: 'POST',
      fallback: 'Could not rotate that key',
    });
  },

  revokeKey(keyId: string) {
    return call<unknown>(`/api/developer/keys/${encodeURIComponent(keyId)}`, {
      method: 'DELETE',
      fallback: 'Could not revoke that key',
    });
  },

  /**
   * Adds a community to an existing key. The response says whether the grant
   * went live or is waiting on the community's owner — the console never
   * assumes, because the answer depends on permissions it cannot see.
   */
  addKeyCommunity(
    keyId: string,
    communityId: string
  ): Promise<{ grant: { status: string }; communityName: string; added: boolean }> {
    return call(`/api/developer/keys/${encodeURIComponent(keyId)}/communities`, {
      method: 'POST',
      body: json({ communityId }),
      fallback: 'Could not add that community',
    });
  },

  removeKeyCommunity(
    keyId: string,
    communityId: string
  ): Promise<{ removed: boolean; remainingCommunity?: number; keyNowInert?: boolean }> {
    return call(
      `/api/developer/keys/${encodeURIComponent(keyId)}/communities/${encodeURIComponent(communityId)}`,
      { method: 'DELETE', fallback: 'Could not remove that community' }
    );
  },

  keyUsage(keyId: string): Promise<KeyUsage> {
    return call<KeyUsage>(`/api/developer/keys/${encodeURIComponent(keyId)}/usage`, {
      fallback: "Could not load that key's usage",
    });
  },

  usage(days: 7 | 30 | 90 = 30): Promise<AccountUsage> {
    return call<AccountUsage>(`/api/developer/usage?days=${days}`, {
      fallback: 'Could not load your usage',
    });
  },

  communities(): Promise<{ data: CommunityOption[]; totalCount?: number }> {
    return call<{ data: CommunityOption[]; totalCount?: number }>('/api/developer/communities', {
      fallback: 'Could not load your communities',
    });
  },
};

// ---- shared vocabulary ----

/**
 * The plan names people see. One map, so the console, the landing page and
 * /pricing cannot call the same plan three different things.
 */
export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  base: 'Base',
  premium: 'Premium',
  premium_plus: 'Premium Plus',
};

export function planLabel(plan?: string): string {
  return PLAN_LABELS[plan || 'free'] || 'Free';
}

/** Which heading a permission belongs under. */
export const SCOPE_GROUPS: Record<string, string> = {
  'community:read': 'Community',
  'units:read': 'Dispatch',
  'units:write': 'Dispatch',
  'calls:read': 'Dispatch',
  'calls:write': 'Dispatch',
  'bolos:read': 'Dispatch',
  'bolos:write': 'Dispatch',
  'civilians:read': 'Records',
  'civilians:write': 'Records',
  'vehicles:read': 'Records',
  'vehicles:write': 'Records',
  'firearms:read': 'Records',
  'firearms:write': 'Records',
  'licenses:write': 'Records',
  'players:provision': 'Provisioning',
  'communities:provision': 'Provisioning',
  'members:read': 'Members',
  'members:write': 'Members',
};

export const GROUP_ORDER = ['Community', 'Dispatch', 'Records', 'Members', 'Provisioning'];

export function groupScopes(scopes: Scope[]): { group: string; scopes: Scope[] }[] {
  const groups = new Map<string, Scope[]>();
  scopes.forEach((s) => {
    const group = SCOPE_GROUPS[s.scope] || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(s);
  });
  const ordered = GROUP_ORDER.filter((g) => groups.has(g));
  const extras = Array.from(groups.keys()).filter((g) => !GROUP_ORDER.includes(g));
  return [...ordered, ...extras].map((g) => ({ group: g, scopes: groups.get(g)! }));
}

/** A permission that can change or create something, rather than only read. */
export function isWriteScope(scope: string): boolean {
  return scope.endsWith(':write') || scope.endsWith(':provision');
}

/** The communities a key can actually act in right now. */
export function liveGrants(grants: Grant[]): Grant[] {
  return grants.filter((g) => g.grant.status !== 'revoked');
}

/**
 * A key that reaches no community and cannot create one can do nothing at all.
 * Worth saying on the key rather than leaving it to be found from a 403.
 *
 * A key whose only grant is pending is NOT inert. Its calls are refused today,
 * but it is waiting on somebody rather than misconfigured, and the console
 * already says so under "waiting for approval". Collapsing the two states told
 * people to go and fix a key that needed no fixing.
 */
export function isKeyInert(key: DeveloperKey, grants: Grant[]): boolean {
  if (key.status === 'revoked') return false;
  const usable = grants.filter((g) => g.grant.status !== 'revoked');
  return usable.length === 0 && !key.scopes.includes('communities:provision');
}

/** A key that will work, but only once somebody else approves it. */
export function isKeyWaiting(key: DeveloperKey, grants: Grant[]): boolean {
  if (key.status === 'revoked') return false;
  const active = grants.filter((g) => g.grant.status === 'active');
  const pending = grants.filter((g) => g.grant.status === 'pending');
  return active.length === 0 && pending.length > 0 && !key.scopes.includes('communities:provision');
}
