'use client';

/**
 * The key list: search, filter, page, and the way into each key.
 *
 * Search and paging are not decoration. A plan allows at most ten live keys,
 * but revoked ones accumulate without limit — they are kept on purpose, because
 * the usage rows and the audit trail point at the key id and a deleted key
 * would take the record of what it did with it. So the list grows, and thirty
 * rows of history should not bury the three keys that are working.
 *
 * Live keys come first regardless of age, because that is what somebody opening
 * this page came to see.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  developerApi,
  isKeyInert,
  isKeyWaiting,
  isWriteScope,
  liveGrants,
} from '@/lib/developer-api';
import type { AccountUsage, KeyRow } from '@/lib/developer-api';
import ConsoleLink from '@/components/developer/ConsoleLink';
import { useConsole } from '@/components/developer/ConsoleProvider';
import NotSwitchedOnNotice from '@/components/developer/NotSwitchedOnNotice';
import {
  Card,
  EmptyState,
  FilterChips,
  Loading,
  Notice,
  PageHead,
  Pager,
  ScopeChip,
  SearchInput,
  localDate,
  num,
  relativeTime,
  useNotice,
  usePaging,
} from '@/components/developer/primitives';

type Filter = 'all' | 'active' | 'pending' | 'revoked';
const PER_PAGE = 10;

export default function KeysPage() {
  const { account } = useConsole();
  const { notice, fail, dismiss } = useNotice();
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    try {
      const [list, usageData] = await Promise.all([
        developerApi.keys(),
        developerApi.usage(30).catch(() => null),
      ]);
      setKeys(list.keys || []);
      setUsage(usageData);
    } catch (e) {
      fail(e instanceof ApiError ? e.message : 'Could not load your keys');
      setKeys([]);
    }
  }, [fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const rows = keys || [];
    return {
      all: rows.length,
      active: rows.filter((r) => r.key.status === 'active').length,
      pending: rows.filter((r) => r.communities.some((g) => g.grant.status === 'pending')).length,
      revoked: rows.filter((r) => r.key.status === 'revoked').length,
    };
  }, [keys]);

  const filtered = useMemo(() => {
    const rows = keys || [];
    const needle = query.trim().toLowerCase();

    const matches = rows.filter((row) => {
      if (filter === 'active' && row.key.status !== 'active') return false;
      if (filter === 'revoked' && row.key.status !== 'revoked') return false;
      if (filter === 'pending' && !row.communities.some((g) => g.grant.status === 'pending')) {
        return false;
      }
      if (!needle) return true;
      // Searched against everything a person might remember about a key: its
      // name, the visible part of the secret, a permission, or a community.
      const haystack = [
        row.key.name,
        row.key.displayPrefix,
        row.key.lastFour,
        ...row.key.scopes,
        ...row.communities.map((g) => g.communityName || ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });

    // Live first, then newest. A revoked key is history, however recent.
    return matches.slice().sort((a, b) => {
      const aLive = a.key.status !== 'revoked' ? 0 : 1;
      const bLive = b.key.status !== 'revoked' ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return (b.key.createdAt || '').localeCompare(a.key.createdAt || '');
    });
  }, [keys, query, filter]);

  const paging = usePaging(filtered, PER_PAGE);
  const liveCount = counts.active;
  const atLimit = liveCount >= account.limits.keysPerDeveloper;
  const canIssue = account.keyIssuanceAvailable !== false;

  return (
    <>
      <PageHead
        title="API keys"
        lede={
          <>
            {num(liveCount)} of {num(account.limits.keysPerDeveloper)} keys in use.{' '}
            {atLimit
              ? 'You are at your plan limit. Revoke one you no longer need, or upgrade.'
              : 'A key carries its own permissions and the communities it may act in.'}
          </>
        }
        actions={
          !canIssue ? null : atLimit ? (
            <a className="dc-btn" href={account.upgradeUrl || '/pricing'}>
              Increase limits
            </a>
          ) : (
            <ConsoleLink className="dc-btn dc-btn-primary" to={'/keys/new'}>
              New key
            </ConsoleLink>
          )
        }
      />

      <Notice notice={notice} onDismiss={dismiss} />

      {canIssue ? null : <NotSwitchedOnNotice />}

      {keys === null ? (
        <Loading rows={4} label="Loading your keys" />
      ) : counts.all === 0 ? (
        <Card tight>
          <EmptyState
            title="No keys yet"
            action={
              <ConsoleLink className="dc-btn dc-btn-primary" to={'/keys/new'}>
                Create your first key
              </ConsoleLink>
            }
          >
            A key is what your bot or game server sends with every request. You choose what it may
            do and which communities it may act in.
          </EmptyState>
        </Card>
      ) : (
        <Card tight>
          <div className="dc-toolbar">
            <SearchInput
              label="Search keys"
              value={query}
              onChange={setQuery}
              placeholder="Search by name, permission or community"
            />
            <FilterChips<Filter>
              label="Filter keys"
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'active', label: 'Active', count: counts.active },
                { id: 'pending', label: 'Waiting', count: counts.pending },
                { id: 'revoked', label: 'Revoked', count: counts.revoked },
              ]}
            />
          </div>

          {paging.total === 0 ? (
            <EmptyState title="Nothing matches">
              {query
                ? `No key matches “${query}”. Try part of a name, a permission, or a community.`
                : 'No key is in that state right now.'}
            </EmptyState>
          ) : (
            <table className="dc-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Permissions</th>
                  <th>Communities</th>
                  <th>Last used</th>
                  <th className="dc-table-num">Requests (30 days)</th>
                  <th><span className="dc-sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody>
                {paging.visible.map((row) => {
                  const grants = liveGrants(row.communities);
                  const writes = row.key.scopes.filter(isWriteScope);
                  const total = usage?.keys.find((k) => k.keyId === row.key.id);
                  const revoked = row.key.status === 'revoked';
                  const inert = isKeyInert(row.key, row.communities);
                  const waiting = isKeyWaiting(row.key, row.communities);
                  return (
                    <tr
                      key={row.key.id}
                      className="dc-row-link"
                      style={revoked ? { opacity: 0.55 } : undefined}
                    >
                      <td data-label="Key">
                        <ConsoleLink className="dc-key-name" to={`/keys/${row.key.id}`}>
                          {row.key.name}
                        </ConsoleLink>
                        <span className="dc-key-sub">
                          {row.key.displayPrefix}…{row.key.lastFour}
                          {revoked ? ' · revoked' : ''}
                        </span>
                        {inert ? (
                          <span className="dc-key-sub" style={{ color: 'var(--dc-amber)' }}>
                            No community — calls will be refused
                          </span>
                        ) : waiting ? (
                          <span className="dc-key-sub" style={{ color: 'var(--dc-amber)' }}>
                            Waiting for a community owner to approve it
                          </span>
                        ) : null}
                      </td>
                      <td data-label="Permissions">
                        <span className="dc-chips">
                          {row.key.scopes.length === 0 ? (
                            <span style={{ color: 'var(--dc-dim)' }}>None</span>
                          ) : (
                            <>
                              <span className="dc-chip">
                                {row.key.scopes.length} permission
                                {row.key.scopes.length === 1 ? '' : 's'}
                              </span>
                              {writes.length > 0 ? (
                                <span className="dc-chip dc-chip-write">
                                  {writes.length} can change data
                                </span>
                              ) : null}
                            </>
                          )}
                        </span>
                      </td>
                      <td data-label="Communities">
                        {grants.length === 0 ? (
                          <span style={{ color: 'var(--dc-dim)' }}>
                            {row.key.scopes.includes('communities:provision')
                              ? 'Creates its own'
                              : 'None'}
                          </span>
                        ) : (
                          <span style={{ lineHeight: 1.5 }}>
                            {grants.map((g) => (
                              <span key={g.grant.communityId} style={{ display: 'block' }}>
                                {g.communityName || 'Unnamed'}
                                {g.grant.status === 'pending' ? (
                                  <span style={{ color: 'var(--dc-amber)', fontSize: '0.8em' }}>
                                    {' '}
                                    · waiting
                                  </span>
                                ) : null}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td data-label="Last used">
                        {row.key.lastUsedAt ? (
                          relativeTime(row.key.lastUsedAt)
                        ) : (
                          <span style={{ color: 'var(--dc-dim)' }}>
                            Never · made {localDate(row.key.createdAt)}
                          </span>
                        )}
                      </td>
                      <td className="dc-table-num" data-label="Requests (30 days)">
                        {total ? num(total.requests) : '0'}
                      </td>
                      {/* The row was already a link through the key's name, but
                          nothing said so, and the thing people came here to do
                          is edit a key. This names the action. */}
                      <td className="dc-row-action">
                        <ConsoleLink
                          className="dc-btn dc-btn-sm dc-edit-btn"
                          to={`/keys/${row.key.id}`}
                          aria-label={`${revoked ? 'View' : 'Edit'} ${row.key.name}`}
                        >
                          {revoked ? 'View' : 'Edit'}
                          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                            <path d="M5.7 2.3 4.3 3.7 8.6 8l-4.3 4.3 1.4 1.4L11.4 8z" />
                          </svg>
                        </ConsoleLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <Pager
            page={paging.page}
            pageCount={paging.pageCount}
            from={paging.from}
            to={paging.to}
            total={paging.total}
            unit="keys"
            onPage={paging.setPage}
          />
        </Card>
      )}

      {counts.all > 0 ? (
        <Card title="What a permission chip means">
          <p className="dc-note" style={{ marginTop: 0 }}>
            A chip marked in amber is a permission that can change or create data. Click{' '}
            <strong>Edit</strong> on a key to see exactly which ones it has, and to add or remove
            them without changing the secret.
          </p>
          <div className="dc-chips" style={{ marginTop: '0.7rem' }}>
            <ScopeChip scope="calls:read" />
            <ScopeChip scope="calls:write" />
            <ScopeChip scope="players:provision" />
          </div>
        </Card>
      ) : null}
    </>
  );
}
