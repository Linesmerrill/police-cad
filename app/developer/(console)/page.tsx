'use client';

/**
 * Overview: today, at a glance, and the way into everything else.
 *
 * It answers four questions in the order a developer asks them on arriving:
 * am I near a limit, are my keys working, is anything waiting on somebody else,
 * and what do I do next. Anything that needs more than a number has its own
 * page; this one does not try to be all four.
 *
 * Nothing here is behind a toggle. A number you have to ask for is a number
 * nobody looks at — the previous page hid usage behind a per-key button and
 * then had to be told that usage was missing.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiError, developerApi, isKeyInert, liveGrants, planLabel } from '@/lib/developer-api';
import type { AccountUsage, KeyRow } from '@/lib/developer-api';
import { docsHref } from '@/lib/developer-routes';
import { DEVELOPER_API_AUTH_EXAMPLE } from '@/lib/developer-api-public';
import ConsoleLink from '@/components/developer/ConsoleLink';
import { useConsole } from '@/components/developer/ConsoleProvider';
import NotSwitchedOnNotice from '@/components/developer/NotSwitchedOnNotice';
import UsageChart from '@/components/developer/UsageChart';
import {
  Card,
  EmptyState,
  Loading,
  Notice,
  PageHead,
  StatTile,
  StatusDot,
  localTime,
  num,
  relativeTime,
  useNotice,
} from '@/components/developer/primitives';

export default function OverviewPage() {
  const { account } = useConsole();
  const { notice, fail, dismiss } = useNotice();
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [usage, setUsage] = useState<AccountUsage | null>(null);

  const load = useCallback(async () => {
    try {
      const [keyList, usageData] = await Promise.all([
        developerApi.keys(),
        // Usage is a nicety next to the key list: a failure here should not
        // take the page down, so it resolves to null rather than rejecting the
        // pair.
        developerApi.usage(30).catch(() => null),
      ]);
      setKeys(keyList.keys || []);
      setUsage(usageData);
    } catch (e) {
      fail(e instanceof ApiError ? e.message : 'Could not load your keys');
      setKeys([]);
    }
  }, [fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const live = (keys || []).filter((row) => row.key.status !== 'revoked');
  const pending = (keys || []).flatMap((row) =>
    row.communities.filter((grant) => grant.grant.status === 'pending').map((grant) => ({ row, grant }))
  );
  const inert = live.filter((row) => isKeyInert(row.key, row.communities));
  const atLimit = live.length >= account.limits.keysPerDeveloper;
  // Treated as available unless the API explicitly says otherwise, so an older
  // API that does not send the field behaves exactly as it did before.
  const canIssue = account.keyIssuanceAvailable !== false;

  return (
    <>
      <PageHead
        title="Overview"
        lede={
          <>
            You are on <strong>{planLabel(account.entitlement?.plan)}</strong>, which allows{' '}
            {num(account.limits.requestsPerMinute)} requests a minute,{' '}
            {num(account.limits.requestsPerDay)} a day, and up to{' '}
            {num(account.limits.keysPerDeveloper)} key
            {account.limits.keysPerDeveloper === 1 ? '' : 's'}.
          </>
        }
        actions={
          canIssue ? (
            <ConsoleLink
              className={`dc-btn ${atLimit ? '' : 'dc-btn-primary'}`}
              aria-disabled={atLimit ? 'true' : undefined}
              to="/keys/new"
            >
              New key
            </ConsoleLink>
          ) : null
        }
      />

      {canIssue ? null : <NotSwitchedOnNotice />}

      <Notice notice={notice} onDismiss={dismiss} />

      {account.entitlement?.lapsed ? (
        <div className="dc-notice dc-notice-warn" role="status">
          <div className="dc-notice-body">
            Your {planLabel(account.entitlement.websitePlan)} subscription has lapsed, so your keys
            are on Free limits. Your keys still work.{' '}
            <a href={account.upgradeUrl || '/pricing'}>Renew</a> to get them back.
          </div>
        </div>
      ) : null}

      {account.termsReacceptRequired ? (
        <div className="dc-notice dc-notice-info" role="status">
          <div className="dc-notice-body">
            The Developer Terms have changed. Your keys keep working;{' '}
            <ConsoleLink to={'/settings'}>read and accept the new version</ConsoleLink> when you have a
            minute.
          </div>
        </div>
      ) : null}

      <div className="dc-stats">
        <StatTile
          label="Requests today"
          value={usage ? num(usage.requestsToday) : '—'}
          sub={
            usage
              ? `of ${num(usage.dailyLimit)}${usage.resetsAt ? `, resets ${localTime(usage.resetsAt)}` : ''}`
              : 'Loading'
          }
          percent={usage ? usage.dailyPercent : undefined}
          tone="accent"
        />
        <StatTile
          label="Requests (30 days)"
          value={usage ? num(usage.totalRequests) : '—'}
          sub={
            usage
              ? usage.peakDay > 0
                ? `Busiest day ${num(usage.peakDay)}`
                : 'No requests in the last 30 days'
              : 'Loading'
          }
        />
        <StatTile
          label="Failed requests today"
          value={usage ? num(usage.rejectedToday) : '—'}
          sub={
            usage && usage.rejectedToday > 0
              ? 'Refused for permissions or rate limits'
              : 'Nothing refused'
          }
          tone={usage && usage.rejectedToday > 0 ? 'warn' : undefined}
        />
        <StatTile
          label="Keys in use"
          value={`${num(live.length)} / ${num(account.limits.keysPerDeveloper)}`}
          sub={atLimit ? 'At your plan limit' : 'Revoke one or upgrade for more'}
        />
      </div>

      {usage ? (
        <Card
          title="Requests a day"
          actions={
            <ConsoleLink className="dc-btn dc-btn-sm dc-btn-ghost" to={'/usage'}>
              See usage
            </ConsoleLink>
          }
        >
          <UsageChart series={usage.series} dailyLimit={usage.dailyLimit} height={150} docsHref={docsHref()} />
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <Card title={`Waiting for approval (${pending.length})`}>
          <p className="dc-note" style={{ marginTop: 0 }}>
            These keys are made and working elsewhere. They start working in these communities when
            an owner or admin approves them. Ask them to look under Developer keys in their
            community settings.
          </p>
          <ul style={{ margin: '0.8rem 0 0', paddingLeft: '1.1rem', lineHeight: 1.9 }}>
            {pending.map(({ row, grant }) => (
              <li key={`${row.key.id}-${grant.grant.communityId}`}>
                <ConsoleLink className="dc-key-name" to={`/keys/${row.key.id}`}>
                  {row.key.name}
                </ConsoleLink>{' '}
                <span style={{ color: 'var(--dc-muted)' }}>in {grant.communityName || 'a community'}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {inert.length > 0 ? (
        <div className="dc-notice dc-notice-warn" role="status">
          <div className="dc-notice-body">
            {inert.length === 1 ? (
              <>
                <strong>{inert[0].key.name}</strong> cannot reach any community and cannot create
                one, so every call it makes will be refused.{' '}
                <ConsoleLink to={`/keys/${inert[0].key.id}`}>Add a community</ConsoleLink>.
              </>
            ) : (
              <>
                {inert.length} keys cannot reach any community and cannot create one, so their calls
                will be refused. <ConsoleLink to={'/keys'}>Review them</ConsoleLink>.
              </>
            )}
          </div>
        </div>
      ) : null}

      {keys === null ? (
        <Loading rows={3} label="Loading your keys" />
      ) : live.length === 0 ? (
        <Card tight>
          <EmptyState
            title="No keys yet"
            action={
              <ConsoleLink className="dc-btn dc-btn-primary" to={'/keys/new'}>
                Create your first key
              </ConsoleLink>
            }
          >
            A key is what your bot or game server sends with every request. Create one, pick what it
            may do, and copy the secret — it is shown once.
          </EmptyState>
        </Card>
      ) : (
        <Card
          title="Your keys"
          tight
          actions={
            <ConsoleLink className="dc-btn dc-btn-sm dc-btn-ghost" to={'/keys'}>
              Manage keys
            </ConsoleLink>
          }
        >
          <table className="dc-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Communities</th>
                <th>Last used</th>
                <th className="dc-table-num">Requests (30 days)</th>
              </tr>
            </thead>
            <tbody>
              {live.slice(0, 5).map((row) => {
                const grants = liveGrants(row.communities);
                const total = usage?.keys.find((k) => k.keyId === row.key.id);
                return (
                  <tr key={row.key.id}>
                    <td data-label="Key">
                      <ConsoleLink className="dc-key-name" to={`/keys/${row.key.id}`}>
                        {row.key.name}
                      </ConsoleLink>
                      <span className="dc-key-sub">
                        {row.key.displayPrefix}…{row.key.lastFour}
                      </span>
                    </td>
                    <td data-label="Communities">
                      {grants.length === 0 ? (
                        <span style={{ color: 'var(--dc-dim)' }}>None</span>
                      ) : (
                        grants.map((g) => g.communityName || 'Unnamed').join(', ')
                      )}
                    </td>
                    <td data-label="Last used">
                      {row.key.lastUsedAt ? (
                        relativeTime(row.key.lastUsedAt)
                      ) : (
                        <StatusDot status="never" />
                      )}
                    </td>
                    <td className="dc-table-num" data-label="Requests (30 days)">
                      {total ? num(total.requests) : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="Getting started">
        <p className="dc-note" style={{ marginTop: 0 }}>
          Send your key as <code className="dc-mono">{DEVELOPER_API_AUTH_EXAMPLE} &lt;key&gt;</code> on every
          request. The reference lists every endpoint, what each permission unlocks, and the errors
          you should expect.
        </p>
        <div className="dc-actions" style={{ marginTop: '0.9rem' }}>
          <a className="dc-btn" href={docsHref()}>
            API reference
          </a>
          <ConsoleLink className="dc-btn dc-btn-ghost" to={'/keys/new'}>
            Create a key
          </ConsoleLink>
        </div>
      </Card>
    </>
  );
}
