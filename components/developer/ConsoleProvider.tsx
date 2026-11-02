'use client';

/**
 * One account load for the whole console.
 *
 * Every page needs the plan, the limits and the permission catalogue, and every
 * page fetching them for itself would mean four requests to render four pages
 * and four chances for two of them to disagree about which plan you are on.
 * The layout loads it once and the pages read it from here.
 *
 * It also decides which of the three states the console is in:
 *
 *   loading    , a skeleton, not a spinner over an empty page
 *   not enabled, the public landing page with its sign-up form, on /developer
 *                 only; the other pages send you there, because "Usage" for an
 *                 account that has none is a page about nothing
 *   enabled    , the console frame around the page
 */

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Navbar from '@/components/Navbar';
import DeveloperLanding from '@/components/DeveloperLanding';
import { ApiError, developerApi, planLabel } from '@/lib/developer-api';
import type { AccountResponse, SessionUser } from '@/lib/developer-api';
import { consoleHref } from '@/lib/developer-routes';
import ConsoleShell, { ConsoleSection } from './ConsoleShell';
import { Loading } from './primitives';

type ConsoleContextValue = {
  account: AccountResponse;
  user: SessionUser | null;
  /** Re-reads the account. Pages call it after anything that changes a count. */
  reload: () => Promise<void>;
};

const ConsoleContext = createContext<ConsoleContextValue | null>(null);

/**
 * The console's account. Throws outside the provider rather than handing back a
 * half-empty object, since a page rendered outside the shell is a bug in the
 * route tree, not a state to degrade into.
 */
export function useConsole(): ConsoleContextValue {
  const value = useContext(ConsoleContext);
  if (!value) throw new Error('useConsole must be used inside the developer console layout');
  return value;
}

export default function ConsoleProvider({
  section,
  children,
}: {
  section: ConsoleSection;
  children: ReactNode;
}) {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The enable form's state. It lives up here because the form is part of the
  // landing page, which this component owns.
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setAccount(await developerApi.account());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your developer account');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    developerApi
      .sessionUser()
      .then((data) => {
        if (!cancelled && data.user) setUser(data.user);
      })
      .catch(() => {
        // The header falls back to no name. Not worth an error for.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A console page for an account that does not exist yet has nothing to show,
  // so it hands over to the one page that does. Replaced rather than pushed:
  // Back should leave the console, not bounce between these two.
  useEffect(() => {
    if (!account || account.enabled || section === 'overview') return;
    window.location.replace(consoleHref(''));
  }, [account, section]);

  async function enable() {
    setBusy(true);
    try {
      await developerApi.enable({ appName, appUrl, acceptTerms });
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not turn on developer access');
    } finally {
      setBusy(false);
    }
  }

  if (error && !account) {
    return (
      <div className="dc">
        <Navbar />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1rem' }}>
          <div className="dc-notice dc-notice-bad" role="alert">
            <div className="dc-notice-body">{error}</div>
          </div>
          <button type="button" className="dc-btn" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <ConsoleShell active={section} user={user}>
        <Loading rows={4} label="Loading your developer account" />
      </ConsoleShell>
    );
  }

  // Not enabled yet: the public landing page, with the sign-up form on it. No
  // console frame, there is nothing to navigate between.
  if (!account.enabled) {
    return (
      <div className="dev-page" style={{ background: '#08090c', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.25rem 5rem' }}>
          {error ? (
            <div className="dc-notice dc-notice-bad" role="alert" data-testid="notice-error">
              <div className="dc-notice-body">{error}</div>
              <button
                type="button"
                className="dc-notice-x"
                aria-label="Dismiss"
                onClick={() => setError(null)}
              >
                ×
              </button>
            </div>
          ) : null}
          <DeveloperLanding
            data={account}
            user={user}
            appName={appName}
            appUrl={appUrl}
            acceptTerms={acceptTerms}
            busy={busy}
            onAppName={setAppName}
            onAppURL={setAppUrl}
            onAcceptTerms={setAcceptTerms}
            onEnable={() => void enable()}
          />
        </main>
      </div>
    );
  }

  return (
    <ConsoleShell
      active={section}
      user={user}
      planLabel={planLabel(account.entitlement?.plan)}
    >
      <ConsoleContext.Provider value={{ account, user, reload }}>{children}</ConsoleContext.Provider>
    </ConsoleShell>
  );
}
