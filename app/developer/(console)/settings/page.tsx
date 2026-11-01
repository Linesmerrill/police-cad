'use client';

/**
 * Settings: the account itself, the plan it gets its limits from, and the one
 * action that cannot be undone.
 *
 * Turning developer access off revokes every key, which is the sort of thing
 * that should not sit next to the project-name field. It lives in a danger
 * section at the bottom, behind a confirmation that counts the keys it is about
 * to kill — "revokes all your keys" is abstract; "revokes 3 keys" is not.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiError, developerApi, planLabel } from '@/lib/developer-api';
import type { KeyRow } from '@/lib/developer-api';
import { docsHref, mainSiteHref } from '@/lib/developer-routes';
import ConsoleLink from '@/components/developer/ConsoleLink';
import { useConsole } from '@/components/developer/ConsoleProvider';
import {
  Card,
  ConfirmDialog,
  Confirmation,
  Notice,
  PageHead,
  localDate,
  num,
  useNotice,
} from '@/components/developer/primitives';

export default function SettingsPage() {
  const { account, user, reload } = useConsole();
  const { notice, say, fail, dismiss } = useNotice();
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await developerApi.keys();
      setKeys(list.keys || []);
    } catch {
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const liveKeys = (keys || []).filter((row) => row.key.status !== 'revoked');
  const entitlement = account.entitlement;

  function confirmDisable() {
    const count = liveKeys.length;
    setConfirmation({
      title: 'Turn off developer access?',
      body: (
        <>
          <p style={{ margin: 0 }}>
            {count === 0
              ? 'You have no live keys, so nothing stops working.'
              : `This revokes ${count} key${count === 1 ? '' : 's'} immediately. Anything using ${count === 1 ? 'it' : 'them'} starts failing.`}
          </p>
          {count > 0 ? (
            <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem', lineHeight: 1.8 }}>
              {liveKeys.map((row) => (
                <li key={row.key.id}>
                  <strong>{row.key.name}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          <p style={{ marginBottom: 0 }}>
            You can turn developer access back on whenever you like, but revoked keys cannot be
            brought back — you would create new ones.
          </p>
        </>
      ),
      confirmText: 'Turn off and revoke',
      danger: true,
      onConfirm: disable,
    });
  }

  async function disable() {
    setBusy(true);
    try {
      await developerApi.disable();
      setConfirmation(null);
      say('Developer access is off and your keys were revoked.');
      await reload();
      await load();
    } catch (e) {
      setConfirmation(null);
      fail(e instanceof ApiError ? e.message : 'Could not turn off developer access');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Settings" lede="Your developer account, and where its limits come from." />

      <Notice notice={notice} onDismiss={dismiss} />

      <Card title="Account">
        <dl className="dc-defs">
          <div className="dc-def">
            <dt>Signed in as</dt>
            <dd>{user?.username || user?.email || '—'}</dd>
          </div>
          <div className="dc-def">
            <dt>Project name</dt>
            <dd>{account.account?.appName || 'Not set'}</dd>
          </div>
          <div className="dc-def">
            <dt>Project URL</dt>
            <dd>{account.account?.appUrl || 'Not set'}</dd>
          </div>
          <div className="dc-def">
            <dt>Developer since</dt>
            <dd>{account.account?.createdAt ? localDate(account.account.createdAt) : '—'}</dd>
          </div>
          <div className="dc-def">
            <dt>Keys in use</dt>
            <dd>
              {num(liveKeys.length)} / {num(account.limits.keysPerDeveloper)}
            </dd>
          </div>
        </dl>
        <p className="dc-note">
          Developer access attaches to this LPC account. It does not create a second one, and your
          keys are yours rather than any community&apos;s.
        </p>
      </Card>

      <Card
        title="Plan and limits"
        actions={
          <a className="dc-btn dc-btn-sm" href={account.upgradeUrl || '/pricing'}>
            Increase limits
          </a>
        }
      >
        <p className="dc-note" style={{ marginTop: 0 }}>
          Your API limits come from your LPC subscription. There is nothing separate to buy for the
          Developer API.
        </p>
        <dl className="dc-defs" style={{ marginTop: '0.9rem' }}>
          <div className="dc-def">
            <dt>Your plan</dt>
            <dd>{planLabel(entitlement?.plan)}</dd>
          </div>
          <div className="dc-def">
            <dt>Requests a minute, per key</dt>
            <dd>{num(account.limits.requestsPerMinute)}</dd>
          </div>
          <div className="dc-def">
            <dt>Requests a day, per key</dt>
            <dd>{num(account.limits.requestsPerDay)}</dd>
          </div>
          <div className="dc-def">
            <dt>Keys</dt>
            <dd>{num(account.limits.keysPerDeveloper)}</dd>
          </div>
          <div className="dc-def">
            <dt>Player accounts a day, per key</dt>
            <dd>{num(account.limits.accountsPerKeyDay)}</dd>
          </div>
          <div className="dc-def">
            <dt>Communities a day, per key</dt>
            <dd>{num(account.limits.communitiesPerKeyDay)}</dd>
          </div>
          {account.communities ? (
            <div className="dc-def">
              <dt>Communities you own</dt>
              <dd>
                {num(account.communities.owned)} /{' '}
                {account.communities.unlimited ? 'unlimited' : num(account.communities.cap)}
              </dd>
            </div>
          ) : null}
        </dl>
        {entitlement?.lapsed ? (
          <div className="dc-notice dc-notice-warn" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <div className="dc-notice-body">
              Your {planLabel(entitlement.websitePlan)} subscription has lapsed, so you are on Free
              limits. Your keys still work.
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="Terms and documentation">
        <p className="dc-note" style={{ marginTop: 0 }}>
          You accepted the Developer Terms
          {account.account?.termsVersion ? ` (version ${account.account.termsVersion})` : ''} when you
          turned developer access on.
          {account.termsReacceptRequired
            ? ' They have changed since, so please read the current version. Your keys keep working in the meantime.'
            : ''}
        </p>
        <div className="dc-actions" style={{ marginTop: '0.9rem' }}>
          <a className="dc-btn" href={docsHref()}>
            API reference
          </a>
          <a className="dc-btn dc-btn-ghost" href={mainSiteHref('/terms-and-conditions')}>
            Developer Terms
          </a>
          <a className="dc-btn dc-btn-ghost" href={mainSiteHref('/privacy-policy')}>
            Privacy Policy
          </a>
        </div>
      </Card>

      <Card title="Turn off developer access" danger>
        <div className="dc-danger-row">
          <div>
            <strong>Turn off and revoke every key</strong>
            <p>
              {liveKeys.length === 0
                ? 'You have no live keys, so nothing is using the API right now.'
                : `This revokes ${num(liveKeys.length)} live key${liveKeys.length === 1 ? '' : 's'} immediately. Anything using ${liveKeys.length === 1 ? 'it' : 'them'} starts failing.`}{' '}
              You can turn access back on later, but revoked keys cannot be brought back.
            </p>
          </div>
          <button type="button" className="dc-btn dc-btn-danger" onClick={confirmDisable} disabled={busy}>
            Turn off access
          </button>
        </div>
        <div className="dc-danger-row">
          <div>
            <strong>Revoke one key instead</strong>
            <p>
              If only one integration is a problem, revoke that key rather than turning everything
              off.
            </p>
          </div>
          <ConsoleLink className="dc-btn" to={'/keys'}>
            Manage keys
          </ConsoleLink>
        </div>
      </Card>

      <ConfirmDialog confirmation={confirmation} onCancel={() => setConfirmation(null)} busy={busy} />
    </>
  );
}
