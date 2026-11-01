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

type Scope = { scope: string; description: string };

type DeveloperAccount = {
  id: string;
  plan: string;
  planActive: boolean;
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
    communitiesPerKey: number;
  };
  availableScopes: Scope[];
  keyCount: number;
  upgradeAvailable: boolean;
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

  const [usageFor, setUsageFor] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

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

  const refresh = useCallback(async () => {
    try {
      const acct = await loadAccount();
      setAccount(acct);
      setKeys(acct.enabled ? await loadKeys() : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [loadAccount, loadKeys]);

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

  async function createKey() {
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
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function confirmRevokeKey(keyId: string, name: string) {
    setConfirmation({
      title: 'Revoke this key?',
      message: `Anything using <strong>${escapeHtml(name)}</strong> stops working immediately.`,
      confirmText: 'Revoke key',
      danger: true,
      onConfirm: () => revokeKey(keyId, name),
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

  function confirmRotateKey(keyId: string, name: string) {
    setConfirmation({
      title: 'Rotate this key?',
      message: `You get a new key now, and <strong>${escapeHtml(name)}</strong> stops working. Its communities carry across.`,
      confirmText: 'Rotate key',
      onConfirm: () => rotateKey(keyId, name),
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

  async function openUsage(keyId: string) {
    if (usageFor === keyId) {
      setUsageFor(null);
      setUsage(null);
      return;
    }
    setUsageFor(keyId);
    setUsage(null);
    const response = await fetch(`/api/developer/keys/${keyId}/usage`, { credentials: 'include' });
    if (response.ok) setUsage(await response.json());
  }

  async function disableAccount() {
    setBusy(true);
    try {
      await postJson('/api/developer/account/disable');
      setNotice('Developer account turned off and all keys revoked.');
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
        .dev-notice { border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.92rem; line-height: 1.5; }
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
        .dev-scope {
          display: flex; gap: 0.6rem; align-items: flex-start;
          padding: 0.5rem 0.65rem; border-radius: 8px; cursor: pointer;
        }
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
        @media (max-width: 640px) {
          .dev-shell { padding: 1.5rem 1rem 4rem; }
          .dev-h1 { font-size: 1.6rem; }
        }
      `}</style>

      <div className="dev-page">
        <Navbar />
        <main className="dev-shell">
          <h1 className="dev-h1">Developer API</h1>
          <p className="dev-sub">
            Build against Lines Police CAD with a key scoped to one community. Push live game
            activity in, read the CAD back out, and let your players find everything they made
            in-game on the website and in the app.{' '}
            <a href="/api-docs" style={{ color: 'var(--rp-accent)' }}>
              Read the docs
            </a>
            .
          </p>

          {error && <div className="dev-notice dev-notice-err">{error}</div>}
          {notice && <div className="dev-notice dev-notice-ok">{notice}</div>}

          {newKey && (
            <div className="dev-reveal" data-testid="key-reveal">
              <strong>Copy your key now.</strong>
              <p style={{ color: 'var(--rp-text-muted)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
                We store only a hash of it, so this is the one and only time it can be shown. If
                you lose it, rotate the key rather than asking us for it.
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
                  I have saved it
                </button>
              </div>
            </div>
          )}

          {loading && <div className="dev-card">Loading…</div>}

          {!loading && account && !account.enabled && (
            <div className="dev-card">
              <h2 className="dev-h2">Turn on your developer account</h2>
              <p style={{ color: 'var(--rp-text-muted)', marginTop: 0, lineHeight: 1.6 }}>
                Free, and you can turn it off whenever you like. Turning it off revokes every key
                you hold.
              </p>

              <div style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
                <div>
                  <label className="dev-label" htmlFor="dev-app-name">
                    What are you building? (optional)
                  </label>
                  <input
                    id="dev-app-name"
                    className="dev-input"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="My FiveM server"
                    maxLength={80}
                  />
                </div>
                <div>
                  <label className="dev-label" htmlFor="dev-app-url">
                    Project link (optional)
                  </label>
                  <input
                    id="dev-app-url"
                    className="dev-input"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://"
                    maxLength={200}
                  />
                </div>
                <label className="dev-scope" htmlFor="dev-terms" style={{ paddingLeft: 0 }}>
                  <input
                    id="dev-terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>
                    I accept the{' '}
                    <a href="/terms-and-conditions" style={{ color: 'var(--rp-accent)' }}>
                      Developer Terms
                    </a>
                    . I understand a key can create accounts for my players, and that I am
                    responsible for how my integration uses them.
                  </span>
                </label>
                <div>
                  <button
                    type="button"
                    className="dev-btn"
                    disabled={!acceptTerms || busy}
                    onClick={enableAccount}
                  >
                    Turn on developer account
                  </button>
                </div>
              </div>
            </div>
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
                      Your plan: {account.account?.plan === 'pro' ? 'Pro' : 'Free'}
                    </h2>
                    <p style={{ color: 'var(--rp-text-muted)', margin: 0, fontSize: '0.9rem' }}>
                      {account.limits.requestsPerMinute} requests a minute,{' '}
                      {account.limits.requestsPerDay.toLocaleString()} a day, up to{' '}
                      {account.limits.keysPerDeveloper} keys.
                    </p>
                  </div>
                  {account.upgradeAvailable ? (
                    <a className="dev-btn" href="/pricing">
                      Upgrade for higher limits
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
                    You are at your plan&apos;s key limit. Revoke one to make another.
                  </div>
                )}

                {showCreate && (
                  <div style={{ marginTop: '1.5rem' }} data-testid="create-key-form">
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="dev-label" htmlFor="dev-key-name">
                        Name
                      </label>
                      <input
                        id="dev-key-name"
                        className="dev-input"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="My FiveM server"
                        maxLength={60}
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label className="dev-label" htmlFor="dev-key-community">
                        Community id
                      </label>
                      <input
                        id="dev-key-community"
                        className="dev-input dev-mono"
                        value={keyCommunity}
                        onChange={(e) => setKeyCommunity(e.target.value)}
                        placeholder="Leave blank if this key will create its own communities"
                      />
                      <p
                        style={{
                          color: 'var(--rp-text-dim)',
                          fontSize: '0.8rem',
                          margin: '0.4rem 0 0',
                          lineHeight: 1.5,
                        }}
                      >
                        A key works in one community unless it can create its own. If you are not
                        the owner or an admin there, your request waits for one of them to approve
                        it.
                      </p>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <span className="dev-label">What may this key do?</span>
                      {groupedScopes.map(({ group, scopes: groupScopes }) => (
                        <div className="dev-scope-group" key={group}>
                          <div className="dev-scope-group-name">{group.toUpperCase()}</div>
                          {groupScopes.map((s) => (
                            <label className="dev-scope" key={s.scope}>
                              <input
                                type="checkbox"
                                checked={keyScopes.includes(s.scope)}
                                onChange={() => toggleScope(s.scope)}
                                value={s.scope}
                              />
                              <span>
                                <span className="dev-mono" style={{ fontSize: '0.85rem' }}>
                                  {s.scope}
                                </span>
                                <br />
                                <span style={{ color: 'var(--rp-text-muted)', fontSize: '0.85rem' }}>
                                  {s.description}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="dev-btn"
                      disabled={busy || !keyName.trim() || keyScopes.length === 0}
                      onClick={createKey}
                      data-testid="create-key-submit"
                    >
                      Create key
                    </button>
                  </div>
                )}

                {liveKeys.length === 0 && !showCreate && (
                  <p style={{ color: 'var(--rp-text-muted)', marginBottom: 0 }}>
                    No keys yet. Make one and follow the{' '}
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
                            onClick={() => openUsage(row.key.id)}
                          >
                            {usageFor === row.key.id ? 'Hide usage' : 'Usage'}
                          </button>
                          <button
                            type="button"
                            className="dev-btn dev-btn-ghost"
                            disabled={busy}
                            onClick={() => confirmRotateKey(row.key.id, row.key.name)}
                          >
                            Rotate
                          </button>
                          <button
                            type="button"
                            className="dev-btn dev-btn-danger"
                            disabled={busy}
                            onClick={() => confirmRevokeKey(row.key.id, row.key.name)}
                          >
                            Revoke
                          </button>
                        </div>
                      </div>

                      {usageFor === row.key.id && (
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
                                    Daily limit resets{' '}
                                    {new Date(usage.resetsAt).toLocaleString(undefined, {
                                      timeZone: 'UTC',
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })}{' '}
                                    UTC
                                  </div>
                                )}
                              </div>

                              <div style={{ marginTop: '1.1rem' }}>
                                <div className="dev-stat-label" style={{ marginBottom: '0.4rem' }}>
                                  REFUSED TODAY
                                </div>
                                {usage.hasErrorsToday ? (
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span className="dev-chip">
                                      429 rate limited: {usage.errorsToday.rateLimited}
                                    </span>
                                    <span className="dev-chip">
                                      401 unauthorized: {usage.errorsToday.unauthorized}
                                    </span>
                                    <span className="dev-chip">
                                      403 forbidden: {usage.errorsToday.forbidden}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--rp-text-muted)', fontSize: '0.9rem' }}>
                                    Nothing refused today.
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
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
