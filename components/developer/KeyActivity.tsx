'use client';

/**
 * What this key called, and what we answered.
 *
 * This screen exists for one conversation. A developer sees a 403 in their own
 * logs, and the useful question, which of a dozen things went wrong, is one
 * they cannot answer from their side. So the row names the route, the
 * community, our own error code, and on a missing-scope refusal **which scope
 * was missing**, which is the single most common answer.
 *
 * It holds nothing of a request's contents, and the copy says so. A developer
 * who expects to find a payload here should find out from the page rather than
 * from a support ticket.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiError, developerApi } from '@/lib/developer-api';
import type { ActivityPage, ActivityRow } from '@/lib/developer-api';
import {
  Card,
  EmptyState,
  FilterChips,
  Pager,
  localDate,
  localTime,
  num,
  relativeTime,
} from './primitives';

type Filter = 'all' | 'denied' | 'rate_limited' | 'error';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  // The three a developer actually comes here for. "ok" is not offered as a
  // filter because nobody opens this page to look at the requests that worked.
  { id: 'denied', label: 'Refused' },
  { id: 'rate_limited', label: 'Rate limited' },
  { id: 'error', label: 'Our fault' },
];

export default function KeyActivity({ keyId }: { keyId: string }) {
  const [feed, setFeed] = useState<ActivityPage | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await developerApi.keyActivity(keyId, {
        page,
        outcome: filter === 'all' ? undefined : filter,
      });
      setFeed(data);
      setError(null);
    } catch (e) {
      // Recorded rather than swallowed: an empty feed and a failed load look
      // identical on screen otherwise, and the empty one says something about
      // this key that is not true.
      setFeed(null);
      setError(e instanceof ApiError ? e.message : 'Could not load this key’s activity');
    } finally {
      setLoading(false);
    }
  }, [keyId, page, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = feed?.data || [];
  const pageCount = feed ? Math.max(1, Math.ceil(feed.totalCount / feed.limit)) : 1;

  return (
    <Card
      title="Recent requests"
      actions={
        <button type="button" className="dc-btn dc-btn-sm" onClick={() => void load()}>
          Refresh
        </button>
      }
    >
      <p className="dc-note" style={{ marginTop: 0 }}>
        Every response from the API carries an <code className="dc-mono">X-Request-Id</code>. Quote
        one in a support ticket and we can find exactly that request.
        {feed ? ` Kept for ${feed.retentionDays} days.` : ''}
      </p>

      <FilterChips options={FILTERS} value={filter} onChange={(next) => {
        setFilter(next);
        setPage(1);
      }} label="Filter requests" />

      {error ? (
        <div className="dc-notice dc-notice-bad" role="status">
          <div className="dc-notice-body">{error}</div>
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <p className="dc-note">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title={filter === 'all' ? 'Nothing yet' : 'Nothing matching that'}>
          {filter === 'all'
            ? 'Requests show up here as soon as this key makes one.'
            : 'Try another filter, or Everything.'}
        </EmptyState>
      ) : (
        <>
          <div className="dc-table-wrap">
            <table className="dc-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Request</th>
                  <th>Answer</th>
                  <th>Took</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ActivityTableRow key={row.requestId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={feed?.page || 1}
            pageCount={pageCount}
            from={((feed?.page || 1) - 1) * (feed?.limit || 25) + 1}
            to={((feed?.page || 1) - 1) * (feed?.limit || 25) + rows.length}
            total={feed?.totalCount || rows.length}
            unit="requests"
            onPage={setPage}
          />
        </>
      )}

      <p className="dc-note">
        These rows hold no request or response bodies, no headers and no key material, only the
        shape of each exchange. If you need what you sent, log it your end.
      </p>
    </Card>
  );
}

function ActivityTableRow({ row }: { row: ActivityRow }) {
  // The answer column is where the work is. A status code on its own sends a
  // developer back to the docs; the error code is the string their own code
  // branched on, and the required scope is the fix.
  const refused = row.outcome !== 'ok';
  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>
        <div>{localTime(row.at)}</div>
        <div className="dc-dim">{localDate(row.at)}</div>
        <div className="dc-dim">{relativeTime(row.at)}</div>
      </td>
      <td>
        <div className="dc-mono" style={{ fontSize: '0.82rem' }}>
          {row.method} {row.route}
        </div>
        {row.correlationId ? (
          <div className="dc-dim">your id: {row.correlationId}</div>
        ) : null}
        <div className="dc-dim dc-mono" style={{ fontSize: '0.75rem' }}>
          {row.requestId}
        </div>
      </td>
      <td>
        <span className={refused ? 'dc-pill dc-pill-warn' : 'dc-pill'}>{row.status}</span>
        {row.errorCode ? (
          <div className="dc-mono" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
            {row.errorCode}
          </div>
        ) : null}
        {row.requiredScope ? (
          <div className="dc-dim">
            needed <code className="dc-mono">{row.requiredScope}</code>
          </div>
        ) : null}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>{num(row.durationMs)} ms</td>
    </tr>
  );
}
