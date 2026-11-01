'use client';

/**
 * The developer's own page: turn a developer account on, make and revoke keys,
 * and see what each one is doing.
 *
 * Styled with the rp- token set the rest of our newer pages use (Outfit, the
 * cyan/glass palette), rather than a look of its own. A developer page that
 * matched nothing else in the product would read as somebody else's site.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DeveloperLanding from '@/components/DeveloperLanding';

type Scope = { scope: string; description: string };

// The plan names people see. One map, so the dashboard and the landing page
// cannot call the same plan different things.
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  base: 'Base',
  premium: 'Premium',
  premium_plus: 'Premium Plus',
};

type DeveloperAccount = {
  id: string;
  // No plan here on purpose. The tier comes from the website subscription and
  // is reported in `entitlement` on the response, not on the account. A `plan`
  // field used to live here, was removed when tiers moved to the subscription,
  // and the page went on reading it — so it was undefined and every account
  // rendered as "Free" regardless of what they were paying for.
  appName?: string;
  appUrl?: string;
  status: string;
};

type AccountResponse = {
  enabled: boolean;
  account?: DeveloperAccount;
  limits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    keysPerDeveloper: number;
    accountsPerKeyDay: number;
    communitiesPerKeyDay: number;
  };
  availableScopes: Scope[];
  keyCount: number;
  // Published by the API from the same values the middleware enforces and the
  // same tier list /pricing renders, so this page cannot drift from either.
  tiers?: {
    plan: string;
    limits: {
      requestsPerMinute: number;
      requestsPerDay: number;
      keysPerDeveloper: number;
      accountsPerKeyDay: number;
      communitiesPerKeyDay: number;
    };
  }[];
  communityPlans?: { plan: string; cap: number; unlimited: boolean }[];
  websiteTiers?: {
    name: string;
    key: string;
    monthlyPrice: number;
    annualPrice: number;
    onSale?: boolean;
    originalMonthlyPrice?: number;
  }[];
  upgradeUrl?: string;
  entitlement?: { plan: string; source: string; websitePlan: string; lapsed: boolean };
  communities?: { plan: string; owned: number; cap: number; unlimited: boolean };
  termsReacceptRequired?: boolean;
};

type CommunityOption = {
  id: string;
  name: string;
  // Whether this person can approve a key into it themselves. False means the
  // key is created and then waits, which the form says before they commit.
  canGrant: boolean;
};

type Grant = {
  grant: { communityId: string; status: string; source: string };
  communityName: string;
};

type KeyRow = {
  key: {
    id: string;
    name: string;
    displayPrefix: string;
    lastFour: string;
    scopes: string[];
    status: string;
    lastUsedAt?: string;
    createdAt: string;
  };
  communities: Grant[];
};

type Confirmation = {
  title: string;
  message: string;
  confirmText: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

type Usage = {
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

const SCOPE_GROUPS: Record<string, string> = {
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

const GROUP_ORDER = ['Community', 'Dispatch', 'Records', 'Members', 'Provisioning'];

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Something went wrong');
  return data;
}

export default function DeveloperPage() {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  // The signed-in account, so the landing page can show which account developer
  // access attaches to. That was the most common confusion with the old page:
  // people thought it created a second account.
  const [sessionUser, setSessionUser] = useState<{
    username?: string;
    email?: string;
    profilePicture?: string;
  } | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Enable form
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Create-key form
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState<string[]>([]);
  const [keyCommunity, setKeyCommunity] = useState('');
  const [busy, setBusy] = useState(false);

  // The one-time key reveal.
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Confirmations go through an in-page dialog. window.confirm is not
  // something we ship, and ddModal lives in an EJS partial that a Next page
  // does not load.
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  // Usage is shown for every key rather than behind a toggle, keyed by key id.
  // A number you have to ask for is a number nobody looks at.
  const [usageByKey, setUsageByKey] = useState<Record<string, Usage>>({});

  // The communities this user is in, for the key form's picker. Replaces a
  // free-text "Community id" field, which asked people to know something they
  // do not know.
  const [communities, setCommunities] = useState<CommunityOption[] | null>(null);

  // Per-field errors, so a problem is shown next to the field that has it
  // rather than only in a banner at the top of a long page.
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; scopes?: string }>({});

  const loadAccount = useCallback(async () => {
    const response = await fetch('/api/developer/account', { credentials: 'include' });
    if (!response.ok) throw new Error('Could not load your developer account');
    return (await response.json()) as AccountResponse;
  }, []);

  const loadKeys = useCallback(async () => {
    const response = await fetch('/api/developer/keys', { credentials: 'include' });
    if (!response.ok) return [] as KeyRow[];
    const data = await response.json();
    return (data?.keys || []) as KeyRow[];
  }, []);

  // Load usage for every live key, rather than one at a time behind a toggle.
  //
  // Each key is its own request, which is what the endpoint offers, but they go
  // out together and a failure on one leaves the others showing. Usage is a
  // nicety: a key whose counters did not load still renders.
  const loadUsage = useCallback(async (rows: KeyRow[]) => {
    const live = rows.filter((row) => row.key.status !== 'revoked');
    if (live.length === 0) {
      setUsageByKey({});
      return;
    }
    const results = await Promise.all(
      live.map(async (row) => {
        try {
          const response = await fetch(`/api/developer/keys/${row.key.id}/usage`, {
            credentials: 'include',
          });
          if (!response.ok) return null;
          return [row.key.id, (await response.json()) as Usage] as const;
        } catch {
          return null;
        }
      })
    );
    const next: Record<string, Usage> = {};
    results.forEach((entry) => {
      if (entry) next[entry[0]] = entry[1];
    });
    setUsageByKey(next);
  }, []);

  // The communities this user belongs to, for the picker.
  const loadCommunities = useCallback(async () => {
    try {
      const response = await fetch('/api/developer/communities', { credentials: 'include' });
      if (!response.ok) {
        setCommunities([]);
        return;
      }
      const data = await response.json();
      setCommunities((data?.data || []) as CommunityOption[]);
    } catch {
      // An empty list renders the empty state, which is a better failure than
      // a form that will not open.
      setCommunities([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const acct = await loadAccount();
      setAccount(acct);
      const rows = acct.enabled ? await loadKeys() : [];
      setKeys(rows);
      setError(null);
      if (acct.enabled) {
        // Both are secondary to the page rendering, so neither is awaited.
        void loadUsage(rows);
        void loadCommunities();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [loadAccount, loadKeys, loadUsage, loadCommunities]);

  // Notices clear themselves.
  //
  // A success banner that never goes away stops being a notice and becomes part
  // of the page: it was still announcing a key created ten minutes ago. Errors
  // stay until dismissed or until the next action replaces them, because the
  // reader may need to act on them.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/current', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && data.user) setSessionUser(data.user);
      })
      .catch(() => {
        // The card falls back to "Your account". Not worth an error for.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const groupedScopes = useMemo(() => {
    const scopes = account?.availableScopes || [];
    const groups = new Map<string, Scope[]>();
    scopes.forEach((s) => {
      const group = SCOPE_GROUPS[s.scope] || 'Other';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(s);
    });
    return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({ group: g, scopes: groups.get(g)! }));
  }, [account?.availableScopes]);

  const liveKeys = keys.filter((k) => k.key.status !== 'revoked');
  const atKeyLimit = !!account && liveKeys.length >= account.limits.keysPerDeveloper;

  async function enableAccount() {
    setBusy(true);
    setError(null);
    try {
      await postJson('/api/developer/account/enable', { appName, appUrl, acceptTerms });
      setNotice('Developer account is on. Make your first key below.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  // Presets, because the scope list is long and most keys are one of three
  // shapes. Picking one ticks its scopes; everything stays editable after.
  const SCOPE_PRESETS: { id: string; label: string; hint: string; match: (s: string) => boolean }[] = [
    {
      id: 'read',
      label: 'Read only',
      hint: 'Everything this key can see, nothing it can change.',
      match: (scope) => scope.endsWith(':read'),
    },
    {
      id: 'dispatch',
      label: 'Dispatch',
      hint: 'Run a CAD from a game server: calls, units and BOLOs.',
      match: (scope) =>
        scope.startsWith('calls:') ||
        scope.startsWith('units:') ||
        scope.startsWith('bolos:') ||
        scope === 'community:read',
    },
    {
      id: 'full',
      label: 'Everything',
      hint: 'Every permission your plan allows.',
      match: () => true,
    },
  ];

  function applyPreset(presetId: string) {
    const preset = SCOPE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const available = (account?.availableScopes || []).map((s) => s.scope);
    const picked = available.filter(preset.match);
    setKeyScopes(picked);
    setFieldErrors((prev) => ({ ...prev, scopes: undefined }));
  }

  // Which preset, if any, the current selection is exactly.
  const activePreset = useMemo(() => {
    const available = (account?.availableScopes || []).map((s) => s.scope);
    const chosen = [...keyScopes].sort().join(',');
    if (!chosen) return null;
    const found = SCOPE_PRESETS.find(
      (preset) => available.filter(preset.match).sort().join(',') === chosen
    );
    return found ? found.id : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyScopes, account?.availableScopes]);

  // Choosing "no community" means the key must be able to make its own, which
  // is the one scope that makes that coherent. Ticked automatically rather
  // than left as a trap: the old form told people to leave the field blank and
  // then refused the result.
  function onCommunityChange(value: string) {
    setKeyCommunity(value);
    if (value === '' && !keyScopes.includes('communities:provision')) {
      const available = (account?.availableScopes || []).map((s) => s.scope);
      if (available.includes('communities:provision')) {
        setKeyScopes((prev) => [...prev, 'communities:provision']);
        setFieldErrors((prev) => ({ ...prev, scopes: undefined }));
      }
    }
  }

  function validateKeyForm(): boolean {
    const next: { name?: string; scopes?: string } = {};
    if (!keyName.trim()) next.name = 'Give the key a name.';
    if (keyScopes.length === 0) next.scopes = 'Pick at least one permission.';
    else if (!keyCommunity && !keyScopes.includes('communities:provision')) {
      // The copy and the rule now say the same thing. This is reachable only if
      // someone unticks the scope after choosing "no community".
      next.scopes =
        'With no community chosen, this key needs "Create communities owned by you".';
    }
    setFieldErrors(next);
    if (next.name) {
      document.getElementById('dev-key-name')?.focus();
    } else if (next.scopes) {
      document.getElementById('dev-key-scopes')?.scrollIntoView({ block: 'center' });
    }
    return Object.keys(next).length === 0;
  }

  async function createKey() {
    // Validated here rather than by disabling the button. A disabled button
    // with no explanation is the thing that sent people looking for what they
    // had done wrong.
    if (!validateKeyForm()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postJson('/api/developer/keys', {
        name: keyName,
        scopes: keyScopes,
        communityId: keyCommunity.trim(),
      });
      // Shown once. It is not stored anywhere we can read it back from.
      setNewKey(data?.plaintextKey || null);
      setShowCreate(false);
      setKeyName('');
      setKeyScopes([]);
      setKeyCommunity('');
      setFieldErrors({});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function confirmRevokeKey(row: KeyRow) {
    setConfirmation({
      title: `Revoke ${row.key.name}?`,
      message:
        `This key stops working immediately and can't be brought back. ` +
        `Anything using it will start failing.<br /><br />It currently has:<br /><br />` +
        keyAccessSummary(row),
      confirmText: 'Revoke key',
      danger: true,
      onConfirm: () => revokeKey(row.key.id, row.key.name),
    });
  }

  async function revokeKey(keyId: string, name: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/developer/keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Could not revoke that key');
      }
      setNotice(`Revoked ${name}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  // What a key actually reaches, by name.
  //
  // "Its communities carry across" told somebody nothing: they still had to go
  // and look at which communities those were. These dialogs list them.
  function keyAccessSummary(row: KeyRow): string {
    const permissions = row.key.scopes.length
      ? row.key.scopes.map(escapeHtml).join(', ')
      : 'No permissions';
    const live = row.communities.filter((c) => c.grant.status !== 'revoked');
    const communities = live.length
      ? live
          .map((c) =>
            c.grant.status === 'pending'
              ? `${escapeHtml(c.communityName)} (waiting for approval)`
              : escapeHtml(c.communityName)
          )
          .join(', ')
      : 'No communities yet';
    return `Permissions: ${permissions}.<br />Communities: ${communities}.`;
  }

  function confirmRotateKey(row: KeyRow) {
    setConfirmation({
      title: `Rotate ${row.key.name}?`,
      message:
        `We'll create a new key and the old one stops working immediately. ` +
        `The new key keeps:<br /><br />${keyAccessSummary(row)}`,
      confirmText: 'Rotate key',
      onConfirm: () => rotateKey(row.key.id, row.key.name),
    });
  }

  async function rotateKey(keyId: string, name: string) {
    setBusy(true);
    try {
      const data = await postJson(`/api/developer/keys/${keyId}/rotate`);
      setNewKey(data?.plaintextKey || null);
      // Name the key that was replaced: the reveal panel shows a new secret
      // without saying which integration it belongs to, and a developer with
      // several keys needs to know which one to go and update.
      setNotice(`Rotated ${name}. Its communities carried across; the old key no longer works.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }


  async function disableAccount() {
    setBusy(true);
    try {
      await postJson('/api/developer/account/disable');
      setNotice('Developer access is off. All your keys were revoked.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function toggleScope(scope: string) {
    setKeyScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]
    );
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --rp-bg: #08090c;
          --rp-surface: #0e1117;
          --rp-glass: rgba(255, 255, 255, 0.04);
          --rp-glass-border: rgba(255, 255, 255, 0.08);
          --rp-text: #e2e8f0;
          --rp-text-muted: #94a3b8;
          --rp-text-dim: #64748b;
          --rp-accent: #38bdf8;
          --rp-green: #34d399;
          --rp-amber: #fbbf24;
          --rp-red: #f87171;
          --rp-radius: 12px;
        }
        .dev-page {
          background: var(--rp-bg);
          color: var(--rp-text);
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
        }
        .dev-shell { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.25rem 5rem; }
        .dev-card {
          background: var(--rp-surface);
          border: 1px solid var(--rp-glass-border);
          border-radius: var(--rp-radius);
          padding: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .dev-h1 { font-size: 2rem; font-weight: 800; margin: 0 0 0.35rem; letter-spacing: -0.02em; }
        .dev-sub { color: var(--rp-text-muted); margin: 0 0 2rem; line-height: 1.6; max-width: 62ch; }
        .dev-h2 { font-size: 1.05rem; font-weight: 700; margin: 0 0 1rem; }
        .dev-label { display: block; font-size: 0.8rem; color: var(--rp-text-muted); margin-bottom: 0.35rem; }
        .dev-input {
          width: 100%; padding: 0.6rem 0.75rem; border-radius: 8px;
          background: rgba(0, 0, 0, 0.35); border: 1px solid var(--rp-glass-border);
          color: var(--rp-text); font-family: inherit; font-size: 0.95rem;
        }
        .dev-input:focus { outline: 2px solid var(--rp-accent); outline-offset: 1px; }
        .dev-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1.1rem; border-radius: 8px; border: 1px solid transparent;
          background: var(--rp-accent); color: #04121c; font-weight: 700;
          font-family: inherit; font-size: 0.95rem; cursor: pointer;
        }
        .dev-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dev-btn-ghost {
          background: var(--rp-glass); color: var(--rp-text);
          border-color: var(--rp-glass-border);
        }
        .dev-btn-danger { background: rgba(248, 113, 113, 0.14); color: var(--rp-red); border-color: rgba(248, 113, 113, 0.35); }

        /* app/globals.css strips outlines from every a and button, so focus
           has to be put back explicitly or the page is unusable by keyboard. */
        .dev-btn:focus-visible,
        .dev-page a:focus-visible {
          outline: 2px solid var(--rp-accent);
          outline-offset: 2px;
        }
        .dev-chip {
          display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px;
          font-size: 0.75rem; background: var(--rp-glass);
          border: 1px solid var(--rp-glass-border); color: var(--rp-text-muted);
        }
        .dev-chip-write { color: var(--rp-amber); border-color: rgba(251, 191, 36, 0.35); }
        .dev-notice {
          border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1.25rem;
          font-size: 0.92rem; line-height: 1.5;
          display: flex; align-items: flex-start; gap: 0.75rem; justify-content: space-between;
        }
        .dev-notice-ok { background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.35); color: #a7f3d0; }
        .dev-notice-err { background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.35); color: #fecaca; }
        .dev-notice-warn { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.35); color: #fde68a; }
        .dev-key-row { border-top: 1px solid var(--rp-glass-border); padding: 1.1rem 0; }
        .dev-key-row:first-of-type { border-top: 0; }
        .dev-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .dev-bar { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.07); overflow: hidden; }
        .dev-bar-fill { height: 100%; background: var(--rp-accent); }
        .dev-stat { font-size: 1.6rem; font-weight: 800; line-height: 1.1; }
        .dev-stat-label { font-size: 0.78rem; color: var(--rp-text-dim); }
        .dev-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        .dev-scope-group { margin-bottom: 1.1rem; }
        .dev-scope-group-name { font-size: 0.75rem; letter-spacing: 0.05em; color: var(--rp-text-dim); margin-bottom: 0.5rem; }
        /* The checkbox is centred on the scope-name line, with the
           description on its own line underneath. Aligning the checkbox to the
           top of the whole label left it floating above the name, because the
           label is two lines tall and the name is only one. */
        .dev-scope {
          display: block; padding: 0.5rem 0.65rem; border-radius: 8px; cursor: pointer;
        }
        .dev-scope-head { display: flex; align-items: center; gap: 0.6rem; }
        .dev-scope-head input { margin: 0; flex: 0 0 auto; }
        .dev-scope-name { font-size: 0.85rem; }
        .dev-scope-desc {
          display: block; color: var(--rp-text-muted); font-size: 0.85rem;
          line-height: 1.5; margin-top: 0.2rem;
          /* Lines up under the name rather than under the checkbox. */
          padding-left: calc(13px + 0.6rem);
        }
        .dev-req { color: var(--rp-red); }
        .dev-sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        .dev-field-hint {
          color: var(--rp-text-dim); font-size: 0.8rem; margin: 0.4rem 0 0; line-height: 1.5;
        }
        .dev-field-err {
          color: #fecaca; font-size: 0.82rem; margin: 0.4rem 0 0; line-height: 1.5;
        }
        .dev-input-bad { border-color: rgba(248, 113, 113, 0.65); }
        .dev-presets { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.6rem 0 0.25rem; }
        .dev-preset {
          padding: 0.35rem 0.7rem; border-radius: 999px; cursor: pointer;
          background: transparent; border: 1px solid var(--rp-glass-border);
          color: var(--rp-text-muted); font-family: inherit; font-size: 0.8rem;
        }
        .dev-preset:hover { background: var(--rp-glass); color: var(--rp-text); }
        .dev-preset-on {
          background: rgba(56, 189, 248, 0.14); border-color: rgba(56, 189, 248, 0.5);
          color: var(--rp-accent);
        }
        .dev-preset:focus-visible,
        .dev-notice-close:focus-visible { outline: 2px solid var(--rp-accent); outline-offset: 2px; }
        .dev-notice-close {
          background: transparent; border: 0; cursor: pointer; color: inherit;
          font-size: 1.25rem; line-height: 1; padding: 0 0.25rem; opacity: 0.75;
          flex: 0 0 auto;
        }
        .dev-notice-close:hover { opacity: 1; }
        .dev-scope:hover { background: var(--rp-glass); }
        .dev-reveal {
          background: rgba(56, 189, 248, 0.07); border: 1px solid rgba(56, 189, 248, 0.4);
          border-radius: var(--rp-radius); padding: 1.25rem; margin-bottom: 1.25rem;
        }
        .dev-reveal-key {
          display: block; width: 100%; padding: 0.75rem; margin: 0.75rem 0;
          border-radius: 8px; background: #04121c; border: 1px solid rgba(56, 189, 248, 0.3);
          color: var(--rp-accent); word-break: break-all; font-size: 0.9rem;
        }
        .dev-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(4, 6, 10, 0.72);
          display: grid; place-items: center; padding: 1.25rem;
        }
        .dev-dialog {
          width: 100%; max-width: 420px;
          background: var(--rp-surface); border: 1px solid var(--rp-glass-border);
          border-radius: var(--rp-radius); padding: 1.5rem;
        }
        .dev-dialog h3 { margin: 0 0 0.6rem; font-size: 1.1rem; font-weight: 700; }
        .dev-dialog p { margin: 0 0 1.25rem; color: var(--rp-text-muted); line-height: 1.6; font-size: 0.93rem; }
        .dev-dialog-actions { display: flex; gap: 0.6rem; justify-content: flex-end; flex-wrap: wrap; }
        /* ---- the landing page ---- */

        .dl-hero { padding: 1rem 0 0.5rem; }
        .dl-title {
          font-size: clamp(2rem, 5.5vw, 3.25rem);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1.04;
          margin: 0 0 0.75rem; max-width: 20ch;
        }
        .dl-lede {
          color: var(--rp-text-muted); font-size: clamp(1rem, 1.9vw, 1.1875rem);
          line-height: 1.55; margin: 0 0 1.75rem; max-width: 48ch;
        }
        .dl-cta-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
        .dl-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.7rem 1.25rem; border-radius: 10px; border: 1px solid transparent;
          background: var(--rp-accent); color: #04121c; font-weight: 700;
          font-size: 0.9375rem; text-decoration: none; cursor: pointer;
          font-family: inherit; transition: filter 150ms ease, background 150ms ease;
        }
        .dl-btn:hover { filter: brightness(1.08); }
        .dl-btn:disabled { opacity: 0.45; cursor: not-allowed; filter: none; }
        .dl-btn-ghost {
          background: transparent; color: var(--rp-text); border-color: var(--rp-glass-border);
        }
        .dl-btn-ghost:hover { background: var(--rp-glass); filter: none; }
        /* globals.css strips the outline from every a and button, so focus has
           to be put back or the page is unusable by keyboard. */
        .dl-btn:focus-visible,
        .dl-inline-link:focus-visible,
        .dl-terms input:focus-visible { outline: 2px solid var(--rp-accent); outline-offset: 2px; }
        .dl-inline-link { color: var(--rp-accent); text-decoration: underline; text-underline-offset: 2px; }

        /* Which account. Flat and quiet: a statement of fact, not a card
           competing with the hero. */
        .dl-account {
          display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem;
          padding: 0.875rem 1rem; margin: 1.75rem 0 2.5rem;
          border: 1px solid var(--rp-glass-border); border-left: 2px solid var(--rp-accent);
          border-radius: 10px; background: var(--rp-glass);
        }
        .dl-account-id { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
        .dl-avatar {
          width: 38px; height: 38px; border-radius: 50%; flex: 0 0 auto;
          object-fit: cover; background: rgba(255, 255, 255, 0.08);
        }
        .dl-avatar-fallback {
          display: grid; place-items: center; font-weight: 700; font-size: 1rem;
          color: var(--rp-accent); border: 1px solid var(--rp-glass-border);
        }
        .dl-account-text { display: flex; flex-direction: column; min-width: 0; }
        .dl-account-name { font-size: 0.9375rem; }
        .dl-account-email { font-size: 0.8125rem; color: var(--rp-text-dim); }
        .dl-account-note { margin: 0; font-size: 0.875rem; color: var(--rp-text-muted); line-height: 1.5; }

        .dl-section { margin: 0 0 3rem; }
        .dl-h2 { font-size: 1.375rem; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 0.5rem; }
        .dl-section-note {
          color: var(--rp-text-muted); font-size: 0.9375rem; line-height: 1.6;
          margin: 0.5rem 0 1.25rem; max-width: 62ch;
        }

        .dl-build-grid {
          display: grid; gap: 1rem; margin-top: 1.25rem;
          grid-template-columns: 1fr;
        }
        /* Two columns, not auto-fit: four cards across three tracks leaves one
           orphaned on its own row at a different width. */
        @media (min-width: 640px) {
          .dl-build-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .dl-build-card {
          background: var(--rp-surface); border: 1px solid var(--rp-glass-border);
          border-radius: var(--rp-radius); padding: 1.125rem;
        }
        .dl-diagram-wrap {
          background: rgba(0, 0, 0, 0.28); border-radius: 8px;
          padding: 0.75rem; margin-bottom: 0.875rem;
        }
        /* Capped and centred: left to fill a two-column card the diagram
           out-shouts the words it is supposed to introduce. */
        .dl-diagram { width: 100%; max-width: 250px; height: auto; display: block; margin: 0 auto; }
        .dl-diagram-tag {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 8px; fill: var(--rp-text-muted);
        }
        .dl-diagram-tag-dim { fill: var(--rp-text-dim); }
        .dl-build-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.4rem; }
        .dl-build-body { margin: 0; font-size: 0.875rem; line-height: 1.6; color: var(--rp-text-muted); }

        .dl-why { list-style: none; margin: 1.25rem 0 0; padding: 0; display: grid; gap: 0.875rem; }
        .dl-why-item { display: flex; gap: 0.75rem; align-items: flex-start; }
        .dl-why-mark {
          width: 6px; height: 6px; border-radius: 50%; background: var(--rp-accent);
          flex: 0 0 auto; margin-top: 0.5rem;
        }
        .dl-why-title { display: block; font-size: 0.9375rem; }
        .dl-why-body {
          display: block; font-size: 0.875rem; line-height: 1.55;
          color: var(--rp-text-muted); max-width: 64ch;
        }

        /* The table is wider than a phone, so it scrolls. A fade on the right
           edge is what tells someone there is more, instead of the columns just
           appearing to be cut off. */
        .dl-table-wrap { position: relative; }
        .dl-table-wrap::after {
          content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 42px;
          pointer-events: none;
          background: linear-gradient(to right, rgba(8, 9, 12, 0), rgba(8, 9, 12, 0.92));
        }
        .dl-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (min-width: 760px) {
          .dl-table-wrap::after { display: none; }
        }
        .dl-table { width: 100%; border-collapse: collapse; min-width: 560px; font-size: 0.875rem; }
        .dl-table th, .dl-table td {
          padding: 0.7rem 0.75rem; text-align: left;
          border-bottom: 1px solid var(--rp-glass-border);
        }
        .dl-table thead th { vertical-align: bottom; }
        .dl-table tbody th { font-weight: 500; color: var(--rp-text-muted); white-space: nowrap; }
        .dl-table td { color: var(--rp-text); white-space: nowrap; }
        .dl-col-plan { display: block; font-weight: 700; font-size: 0.9375rem; }
        .dl-col-price { display: block; font-size: 0.75rem; color: var(--rp-text-dim); }
        .dl-col-current { background: rgba(56, 189, 248, 0.06); }
        .dl-cell-current { background: rgba(56, 189, 248, 0.045); }
        .dl-col-badge {
          display: inline-block; margin-top: 0.3rem; padding: 0.1rem 0.4rem;
          border-radius: 999px; font-size: 0.6875rem; font-weight: 600;
          color: var(--rp-accent); background: rgba(56, 189, 248, 0.12);
        }
        .dl-row-note { display: block; font-weight: 400; font-size: 0.75rem; color: var(--rp-text-dim); }
        .dl-row-split th, .dl-row-split td { border-top: 1px solid var(--rp-glass-border); }

        .dl-steps { list-style: none; margin: 1.25rem 0 1.5rem; padding: 0; display: grid; gap: 1rem; }
        .dl-step { display: flex; gap: 0.875rem; align-items: flex-start; }
        .dl-step-n {
          display: grid; place-items: center; flex: 0 0 auto;
          width: 26px; height: 26px; border-radius: 7px;
          background: rgba(56, 189, 248, 0.12); color: var(--rp-accent);
          font-size: 0.8125rem; font-weight: 700;
        }
        .dl-step-title { display: block; font-size: 0.9375rem; }
        .dl-step-body { display: block; font-size: 0.875rem; line-height: 1.55; color: var(--rp-text-muted); }
        .dl-code {
          margin: 0; padding: 1rem; border-radius: 10px; overflow-x: auto;
          background: rgba(0, 0, 0, 0.42); border: 1px solid var(--rp-glass-border);
          font-size: 0.8125rem; line-height: 1.65; color: var(--rp-text);
        }

        .dl-enable {
          background: var(--rp-surface); border: 1px solid var(--rp-glass-border);
          border-radius: var(--rp-radius); padding: 1.5rem; margin-bottom: 2rem;
          scroll-margin-top: 1.5rem;
        }
        .dl-fields { display: grid; gap: 1rem; margin-top: 1.25rem; }
        .dl-terms {
          display: flex; gap: 0.6rem; align-items: flex-start;
          font-size: 0.875rem; line-height: 1.55; color: var(--rp-text-muted); cursor: pointer;
        }
        .dl-terms input { margin-top: 0.2rem; flex: 0 0 auto; }
        .dl-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .dl-sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }

        @media (prefers-reduced-motion: reduce) { .dl-btn { transition: none; } }

        @media (max-width: 560px) {
          .dl-account { align-items: flex-start; flex-direction: column; }
          .dl-enable { padding: 1.125rem; }
          .dl-cta-row .dl-btn { flex: 1 1 100%; }
        }

        @media (max-width: 640px) {
          .dev-shell { padding: 1.5rem 1rem 4rem; }
          .dev-h1 { font-size: 1.6rem; }
        }
      `}</style>

      <div className="dev-page">
        <Navbar />
        <main className="dev-shell">
          {/* The h1 lives in DeveloperLanding for the landing state, which needs
              it as part of the hero. Once developer access is on, this page is a
              dashboard and gets a plain title. */}
          {!loading && account?.enabled && <h1 className="dev-h1">Developer API</h1>}

          {error && (
            <div className="dev-notice dev-notice-err" role="alert" data-testid="notice-error">
              <span>{error}</span>
              <button
                type="button"
                className="dev-notice-close"
                aria-label="Dismiss"
                onClick={() => setError(null)}
              >
                &times;
              </button>
            </div>
          )}
          {notice && (
            <div className="dev-notice dev-notice-ok" role="status" data-testid="notice-ok">
              <span>{notice}</span>
              <button
                type="button"
                className="dev-notice-close"
                aria-label="Dismiss"
                onClick={() => setNotice(null)}
              >
                &times;
              </button>
            </div>
          )}

          {newKey && (
            <div className="dev-reveal" data-testid="key-reveal">
              <strong>Copy your key now</strong>
              <p style={{ color: 'var(--rp-text-muted)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
                This is the only time we can show it. We store a hash, not the key, so we
                can&apos;t show it to you again. If you lose it, rotate the key.
              </p>
              <code className="dev-reveal-key dev-mono">{newKey}</code>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="dev-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(newKey).then(
                      () => setCopied(true),
                      () => setCopied(false)
                    );
                  }}
                >
                  {copied ? 'Copied' : 'Copy key'}
                </button>
                <button
                  type="button"
                  className="dev-btn dev-btn-ghost"
                  onClick={() => {
                    setNewKey(null);
                    setCopied(false);
                  }}
                >
                  I&apos;ve saved it
                </button>
              </div>
            </div>
          )}

          {loading && <div className="dev-card">Loading…</div>}

          {!loading && account && !account.enabled && (
            <DeveloperLanding
              data={account}
              user={sessionUser}
              appName={appName}
              appUrl={appUrl}
              acceptTerms={acceptTerms}
              busy={busy}
              onAppName={setAppName}
              onAppURL={setAppUrl}
              onAcceptTerms={setAcceptTerms}
              onEnable={enableAccount}
            />
          )}

          {!loading && account?.enabled && (
            <>
              <div className="dev-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h2 className="dev-h2" style={{ marginBottom: '0.35rem' }}>
                      Your plan: {PLAN_LABELS[account.entitlement?.plan || 'free'] || 'Free'}
                    </h2>
                    <p style={{ color: 'var(--rp-text-muted)', margin: 0, fontSize: '0.9rem' }}>
                      {account.limits.requestsPerMinute.toLocaleString()} requests a minute,{' '}
                      {account.limits.requestsPerDay.toLocaleString()} a day, up to{' '}
                      {account.limits.keysPerDeveloper} keys.
                    </p>
                    {account.entitlement?.lapsed && (
                      <p className="dev-field-hint">
                        Your {PLAN_LABELS[account.entitlement.websitePlan] ||
                          account.entitlement.websitePlan}{' '}
                        subscription has lapsed, so these are the Free limits.
                      </p>
                    )}
                  </div>
                  {/* There is no Developer API product to buy: limits follow the
                      website subscription, so the only upgrade path is the plan
                      page. Shown unless they are already on the top plan. */}
                  {account.entitlement?.plan !== 'premium_plus' ? (
                    <a className="dev-btn" href={account.upgradeUrl || '/pricing'}>
                      Raise your limits
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="dev-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <h2 className="dev-h2" style={{ margin: 0 }}>
                    Your keys ({liveKeys.length}/{account.limits.keysPerDeveloper})
                  </h2>
                  <button
                    type="button"
                    className="dev-btn"
                    disabled={atKeyLimit}
                    onClick={() => setShowCreate((v) => !v)}
                    data-testid="new-key-button"
                  >
                    {showCreate ? 'Cancel' : 'New key'}
                  </button>
                </div>

                {atKeyLimit && (
                  <div className="dev-notice dev-notice-warn" style={{ marginTop: '1rem' }}>
                    You&apos;ve reached your plan&apos;s key limit. Revoke a key, or raise your
                    limits, to create another.
                  </div>
                )}

                {showCreate && (
                  <div style={{ marginTop: '1.5rem' }} data-testid="create-key-form">
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="dev-label" htmlFor="dev-key-name">
                        Name <span className="dev-req" aria-hidden="true">*</span>
                        <span className="dev-sr-only">(required)</span>
                      </label>
                      <input
                        id="dev-key-name"
                        className={`dev-input${fieldErrors.name ? ' dev-input-bad' : ''}`}
                        value={keyName}
                        onChange={(e) => {
                          setKeyName(e.target.value);
                          if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                        }}
                        placeholder="e.g. My FiveM server"
                        maxLength={60}
                        required
                        aria-invalid={fieldErrors.name ? true : undefined}
                        aria-describedby={fieldErrors.name ? 'dev-key-name-err' : undefined}
                      />
                      {fieldErrors.name && (
                        <p className="dev-field-err" id="dev-key-name-err" role="alert">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label className="dev-label" htmlFor="dev-key-community">
                        Community
                      </label>
                      {communities === null ? (
                        <p className="dev-field-hint">Loading your communities…</p>
                      ) : (
                        <>
                          <select
                            id="dev-key-community"
                            className="dev-input"
                            value={keyCommunity}
                            onChange={(e) => onCommunityChange(e.target.value)}
                          >
                            <option value="">None — this key creates its own communities</option>
                            {communities.map((c) => (
                              <option value={c.id} key={c.id}>
                                {c.name}
                                {c.canGrant ? '' : ' — needs owner/admin approval'}
                              </option>
                            ))}
                          </select>
                          <p className="dev-field-hint">
                            {keyCommunity === '' ? (
                              <>
                                With no community chosen, this key can only work in communities it
                                creates itself, so{' '}
                                <span className="dev-mono">communities:provision</span> is ticked
                                below.
                              </>
                            ) : communities.find((c) => c.id === keyCommunity)?.canGrant ? (
                              'You can approve this key yourself, so it will work straight away.'
                            ) : (
                              'You are not the owner or an admin there, so the key waits for one of them to approve it.'
                            )}
                          </p>
                          {communities.length === 0 && (
                            <p className="dev-field-hint">
                              You are not in any communities yet. A key with no community can still
                              create its own.
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div style={{ marginBottom: '1rem' }} id="dev-key-scopes">
                      <span className="dev-label">
                        What may this key do? <span className="dev-req" aria-hidden="true">*</span>
                      </span>
                      <p className="dev-field-hint" style={{ marginTop: 0 }}>
                        Pick at least one. Start from a preset and adjust.
                      </p>

                      <div className="dev-presets" role="group" aria-label="Permission presets">
                        {SCOPE_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            className={`dev-preset${activePreset === preset.id ? ' dev-preset-on' : ''}`}
                            onClick={() => applyPreset(preset.id)}
                            title={preset.hint}
                            aria-pressed={activePreset === preset.id}
                          >
                            {preset.label}
                          </button>
                        ))}
                        {keyScopes.length > 0 && (
                          <button
                            type="button"
                            className="dev-preset"
                            onClick={() => setKeyScopes([])}
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {fieldErrors.scopes && (
                        <p className="dev-field-err" role="alert">
                          {fieldErrors.scopes}
                        </p>
                      )}

                      {groupedScopes.map(({ group, scopes: groupScopes }) => (
                        <div className="dev-scope-group" key={group}>
                          <div className="dev-scope-group-name">{group}</div>
                          {groupScopes.map((s) => {
                            const writes = s.scope.includes(':write') || s.scope.includes(':provision');
                            return (
                              <label className="dev-scope" key={s.scope}>
                                {/* The checkbox sits on the scope-name row and
                                    is centred on it; the description lives
                                    underneath, outside that row. Aligning it to
                                    the top of the whole block left it floating
                                    above the name. */}
                                <span className="dev-scope-head">
                                  <input
                                    type="checkbox"
                                    checked={keyScopes.includes(s.scope)}
                                    onChange={() => {
                                      toggleScope(s.scope);
                                      if (fieldErrors.scopes) {
                                        setFieldErrors((p) => ({ ...p, scopes: undefined }));
                                      }
                                    }}
                                    value={s.scope}
                                  />
                                  <span className="dev-mono dev-scope-name">{s.scope}</span>
                                  {writes && <span className="dev-chip dev-chip-write">writes</span>}
                                </span>
                                <span className="dev-scope-desc">{s.description}</span>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="dev-btn"
                      disabled={busy || atKeyLimit}
                      onClick={createKey}
                      data-testid="create-key-submit"
                    >
                      {busy ? 'Creating…' : 'Create key'}
                    </button>
                    {atKeyLimit && (
                      <p className="dev-field-hint">
                        You are at your plan&apos;s key limit. Revoke one, or raise your limits, to
                        make another.
                      </p>
                    )}
                  </div>
                )}

                {liveKeys.length === 0 && !showCreate && (
                  <p style={{ color: 'var(--rp-text-muted)', marginBottom: 0 }}>
                    No keys yet. Create one, then follow the{' '}
                    <a href="/api-docs" style={{ color: 'var(--rp-accent)' }}>
                      quickstart
                    </a>
                    .
                  </p>
                )}

                <div style={{ marginTop: liveKeys.length ? '1.25rem' : 0 }}>
                  {liveKeys.map((row) => (
                    <div className="dev-key-row" key={row.key.id} data-testid="key-row">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <strong>{row.key.name}</strong>
                          <div
                            className="dev-mono"
                            style={{ color: 'var(--rp-text-dim)', fontSize: '0.85rem' }}
                          >
                            {row.key.displayPrefix}…{row.key.lastFour}
                          </div>
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {row.key.scopes.map((scope) => (
                              <span
                                className={
                                  scope.includes(':write') || scope.includes(':provision')
                                    ? 'dev-chip dev-chip-write'
                                    : 'dev-chip'
                                }
                                key={scope}
                              >
                                {scope}
                              </span>
                            ))}
                          </div>
                          <div
                            style={{
                              marginTop: '0.5rem',
                              color: 'var(--rp-text-muted)',
                              fontSize: '0.85rem',
                            }}
                          >
                            {row.communities.length === 0
                              ? 'No community yet'
                              : row.communities
                                  .map(
                                    (g) =>
                                      `${g.communityName || g.grant.communityId}${
                                        g.grant.status === 'pending' ? ' (waiting for approval)' : ''
                                      }${g.grant.status === 'revoked' ? ' (access withdrawn)' : ''}`
                                  )
                                  .join(', ')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <button
                            type="button"
                            className="dev-btn dev-btn-ghost"
                            disabled={busy}
                            onClick={() => confirmRotateKey(row)}
                          >
                            Rotate
                          </button>
                          <button
                            type="button"
                            className="dev-btn dev-btn-danger"
                            disabled={busy}
                            onClick={() => confirmRevokeKey(row)}
                          >
                            Revoke
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const usage = usageByKey[row.key.id];
                        return (
                        <div style={{ marginTop: '1.25rem' }} data-testid="usage-panel">
                          {!usage && <span style={{ color: 'var(--rp-text-muted)' }}>Loading usage…</span>}
                          {usage && (
                            <>
                              <div className="dev-grid">
                                <div>
                                  <div className="dev-stat">{usage.requestsToday.toLocaleString()}</div>
                                  <div className="dev-stat-label">
                                    requests today of {usage.dailyLimit.toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="dev-stat">{usage.requestsThisMonth.toLocaleString()}</div>
                                  <div className="dev-stat-label">this month</div>
                                </div>
                                <div>
                                  <div className="dev-stat">{usage.minuteLimit}</div>
                                  <div className="dev-stat-label">per minute burst</div>
                                </div>
                              </div>

                              <div style={{ marginTop: '1rem' }}>
                                <div className="dev-bar">
                                  <div
                                    className="dev-bar-fill"
                                    style={{ width: `${usage.dailyPercent}%` }}
                                  />
                                </div>
                                {usage.resetsAt && (
                                  <div
                                    style={{
                                      color: 'var(--rp-text-dim)',
                                      fontSize: '0.8rem',
                                      marginTop: '0.4rem',
                                    }}
                                  >
                                    {/* The viewer's own timezone. The limit
                                        resets at midnight UTC, but telling
                                        someone "11:59 PM UTC" makes them do the
                                        arithmetic to find out when that is. */}
                                    Daily limit resets{' '}
                                    {new Date(usage.resetsAt).toLocaleString(undefined, {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })}
                                  </div>
                                )}
                              </div>

                              <div style={{ marginTop: '1.1rem' }}>
                                <div className="dev-stat-label" style={{ marginBottom: '0.4rem' }}>
                                  Failed requests today
                                </div>
                                {usage.hasErrorsToday ? (
                                  <>
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span className="dev-chip">
                                      Over rate limit (429): {usage.errorsToday.rateLimited}
                                    </span>
                                    <span className="dev-chip">
                                      Invalid or revoked key (401):{' '}
                                      {usage.errorsToday.unauthorized}
                                    </span>
                                    <span className="dev-chip">
                                      Missing permission or community access (403):{' '}
                                      {usage.errorsToday.forbidden}
                                    </span>
                                  </div>
                                  {/* Accurate rather than reassuring: whether a
                                      failed call counts depends on how far it
                                      got. A key we do not recognise is turned
                                      away before anything is counted; a key we
                                      do recognise has already been counted by
                                      the time a permission check refuses it. */}
                                  <p className="dev-field-hint">
                                    A request refused with 401 is turned away before it counts
                                    toward your daily total. Requests refused with 403, or for
                                    going over your limit, have already been counted.
                                  </p>
                                  </>
                                ) : (
                                  <span style={{ color: 'var(--rp-text-muted)', fontSize: '0.9rem' }}>
                                    No failed requests today.
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              <div className="dev-card">
                <h2 className="dev-h2">Turn off your developer account</h2>
                <p style={{ color: 'var(--rp-text-muted)', marginTop: 0, lineHeight: 1.6 }}>
                  This revokes every key you hold, so anything using them stops working
                  immediately. You can turn it back on later.
                </p>
                <button
                  type="button"
                  className="dev-btn dev-btn-danger"
                  disabled={busy}
                  onClick={() =>
                    setConfirmation({
                      title: 'Turn off your developer account?',
                      message:
                        'Every key you hold is revoked, so anything using them stops working immediately.',
                      confirmText: 'Turn off and revoke',
                      danger: true,
                      onConfirm: disableAccount,
                    })
                  }
                >
                  Turn off and revoke all keys
                </button>
              </div>
            </>
          )}
        </main>
        <Footer />

        {confirmation && (
          <div
            className="dev-backdrop"
            role="presentation"
            onClick={() => setConfirmation(null)}
            data-testid="confirm-backdrop"
          >
            <div
              className="dev-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dev-dialog-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="dev-dialog-title">{confirmation.title}</h3>
              <p dangerouslySetInnerHTML={{ __html: confirmation.message }} />
              <div className="dev-dialog-actions">
                <button
                  type="button"
                  className="dev-btn dev-btn-ghost"
                  onClick={() => setConfirmation(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={confirmation.danger ? 'dev-btn dev-btn-danger' : 'dev-btn'}
                  disabled={busy}
                  onClick={async () => {
                    const action = confirmation.onConfirm;
                    setConfirmation(null);
                    await action();
                  }}
                  data-testid="confirm-action"
                >
                  {confirmation.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// escapeHtml guards the one place a dialog message carries user-supplied text.
// The message is rendered as HTML so it can bold the key being acted on, which
// means a key named with angle brackets would otherwise inject markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
