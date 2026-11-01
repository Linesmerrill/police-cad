'use client';

/**
 * Usage: the whole account's traffic, and which key is spending it.
 *
 * The chart is the account, not one key, because "am I about to hit my daily
 * cap" is a question about the account — the cap is per key, but a developer
 * running three keys wants the shape of all of it before drilling in.
 *
 * The per-key table answers the next question, which is always "which one". It
 * is sorted busiest first by the API, so the answer is the top row rather than
 * something to find by reading.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiError, developerApi, planLabel } from '@/lib/developer-api';
import type { AccountUsage } from '@/lib/developer-api';
import { docsHref } from '@/lib/developer-routes';
import ConsoleLink from '@/components/developer/ConsoleLink';
import { useConsole } from '@/components/developer/ConsoleProvider';
import UsageChart from '@/components/developer/UsageChart';
import {
  Card,
  EmptyState,
  FilterChips,
  Loading,
  Notice,
  PageHead,
  StatTile,
  localTime,
  num,
  relativeTime,
  useNotice,
} from '@/components/developer/primitives';

type Range = '7' | '30' | '90';

export default function UsagePage() {
  const { account } = useConsole();
  const { notice, fail, dismiss } = useNotice();
  const [range, setRange] = useState<Range>('30');
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (days: Range) => {
      setLoading(true);
      try {
        setUsage(await developerApi.usage(Number(days) as 7 | 30 | 90));
        dismiss();
      } catch (e) {
        fail(e instanceof ApiError ? e.message : 'Could not load your usage');
      } finally {
        setLoading(false);
      }
    },
    [fail, dismiss]
  );

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const failureRate =
    usage && usage.totalRequests + usage.totalRejected > 0
      ? Math.round((usage.totalRejected / (usage.totalRequests + usage.totalRejected)) * 100)
      : 0;

  return (
    <>
      <PageHead
        title="Usage"
        lede={
          <>
            Counted per key and reset at midnight UTC, shown here in your own time.{' '}
            {planLabel(account.entitlement?.plan)} allows{' '}
            {num(account.limits.requestsPerMinute)} requests a minute and{' '}
            {num(account.limits.requestsPerDay)} a day for each key.
          </>
        }
      />

      <Notice notice={notice} onDismiss={dismiss} />

      <div style={{ marginBottom: '1.1rem' }}>
        <FilterChips<Range>
          label="Date range"
          value={range}
          onChange={setRange}
          options={[
            { id: '7', label: 'Last 7 days' },
            { id: '30', label: 'Last 30 days' },
            { id: '90', label: 'Last 90 days' },
          ]}
        />
      </div>

      {loading && !usage ? (
        <Loading rows={5} label="Loading your usage" />
      ) : !usage ? null : (
        <>
          <div className="dc-stats">
            <StatTile
              label="Requests today"
              value={num(usage.requestsToday)}
              sub={`of ${num(usage.dailyLimit)}${usage.resetsAt ? `, resets ${localTime(usage.resetsAt)}` : ''}`}
              percent={usage.dailyPercent}
              tone="accent"
            />
            <StatTile
              label={`Requests (${usage.days} days)`}
              value={num(usage.totalRequests)}
              sub={
                usage.peakDay > 0
                  ? `Busiest day ${num(usage.peakDay)}`
                  : 'No requests in this range'
              }
            />
            <StatTile
              label="Requests this month"
              value={num(usage.requestsThisMonth)}
              sub="Calendar month, UTC"
            />
            <StatTile
              label="Failed requests"
              value={num(usage.totalRejected)}
              sub={failureRate > 0 ? `${failureRate}% of all calls` : 'None in this range'}
              tone={failureRate >= 5 ? 'warn' : undefined}
            />
          </div>

          <Card title={`Requests a day, last ${usage.days} days`}>
            <UsageChart series={usage.series} dailyLimit={usage.dailyLimit} height={200} docsHref={docsHref()} />
            {/* Which failures count, traced in the API rather than asserted.
                401s are refused before anything is recorded; the others are
                refused after, so they do count against the daily total. */}
            <p className="dc-note">
              A refused call counts toward your daily total if it got as far as a permission check or
              your own rate limit. Calls refused for a bad or revoked key are not counted at all.
            </p>
          </Card>

          <Card title="By key" tight>
            {usage.keys.length === 0 ? (
              <EmptyState title="No keys yet">
                Create a key and its traffic will show up here.
              </EmptyState>
            ) : (
              <table className="dc-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Status</th>
                    <th>Last used</th>
                    <th className="dc-table-num">Requests</th>
                    <th className="dc-table-num">Failed</th>
                    <th className="dc-table-num">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.keys.map((key) => {
                    const share =
                      usage.totalRequests > 0
                        ? Math.round((key.requests / usage.totalRequests) * 100)
                        : 0;
                    return (
                      <tr key={key.keyId}>
                        <td data-label="Key">
                          <ConsoleLink className="dc-key-name" to={`/keys/${key.keyId}`}>
                            {key.name}
                          </ConsoleLink>
                        </td>
                        <td data-label="Status">
                          {key.status === 'revoked' ? (
                            <span style={{ color: 'var(--dc-dim)' }}>Revoked</span>
                          ) : (
                            <span style={{ color: 'var(--dc-green)' }}>Active</span>
                          )}
                        </td>
                        <td data-label="Last used">
                          {key.lastUsedAt ? relativeTime(key.lastUsedAt) : 'Never'}
                        </td>
                        <td className="dc-table-num" data-label="Requests">
                          {num(key.requests)}
                        </td>
                        <td className="dc-table-num" data-label="Failed">
                          {num(key.rejected)}
                        </td>
                        <td className="dc-table-num" data-label="Share">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
