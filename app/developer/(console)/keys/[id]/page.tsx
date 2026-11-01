'use client';

/**
 * One key: what it is, what it may do, where it may do it, and how to stop it.
 *
 * Everything on this page is editable without changing the secret, which is the
 * point of it. Rotating a key to widen its permissions means redeploying
 * whatever holds it, so people over-scoped keys at creation to avoid the churn
 * — and narrowing one cost exactly the same, which is how the safe direction
 * ends up being the inconvenient one.
 *
 * Communities are a list, not a field. Several live grants on one key always
 * worked server-side; only the first create form insisted on exactly one. The
 * consequence that needs saying out loud is that limits are counted per key, so
 * a key covering three communities spends one allowance across all three. It is
 * stated here rather than left to be discovered from a 429.
 *
 * Rotate and revoke are at the bottom, in their own section, away from the
 * ordinary controls.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  developerApi,
  isWriteScope,
  liveGrants,
  planLabel,
} from '@/lib/developer-api';
import type { CommunityOption, CreatedKey, KeyDetail, KeyUsage } from '@/lib/developer-api';
import { consoleHref } from '@/lib/developer-routes';
import { useConsole } from '@/components/developer/ConsoleProvider';
import CommunityPicker from '@/components/developer/CommunityPicker';
import ScopePicker from '@/components/developer/ScopePicker';
import UsageChart from '@/components/developer/UsageChart';
import {
  Card,
  ConfirmDialog,
  Confirmation,
  Notice,
  PageHead,
  ScopeChip,
  SecretReveal,
  StatTile,
  StatusDot,
  localDate,
  localTime,
  num,
  relativeTime,
  useNotice,
} from '@/components/developer/primitives';

export default function KeyDetailPage({ params }: { params: { id: string } }) {
  const keyId = params.id;
  const { account, reload } = useConsole();
  const { notice, setNotice, say, warn, inform, fail, dismiss } = useNotice();

  const [detail, setDetail] = useState<KeyDetail | null>(null);
  const [usage, setUsage] = useState<KeyUsage | null>(null);
  const [communities, setCommunities] = useState<CommunityOption[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [rotated, setRotated] = useState<CreatedKey | null>(null);

  // Editing state. Separate from `detail` so a half-typed name is never what
  // the rest of the page renders from.
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [scopes, setScopes] = useState<string[]>([]);
  const [scopeError, setScopeError] = useState<string | undefined>();
  const [addCommunity, setAddCommunity] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await developerApi.key(keyId);
      setDetail(data);
      setName(data.key.name);
      setScopes(data.key.scopes);
      setNotFound(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
        return;
      }
      fail(e instanceof ApiError ? e.message : 'Could not load that key');
    }
  }, [keyId, fail]);

  useEffect(() => {
    void load();
    developerApi.keyUsage(keyId).then(setUsage).catch(() => setUsage(null));
    developerApi
      .communities()
      .then((data) => setCommunities(data.data || []))
      .catch(() => setCommunities([]));
  }, [keyId, load]);

  const grants = detail ? liveGrants(detail.communities) : [];
  const activeGrants = grants.filter((g) => g.grant.status === 'active');
  const revoked = detail?.key.status === 'revoked';
  const canProvision = scopes.includes('communities:provision');
  const inert = !!detail && !revoked && grants.length === 0 && !canProvision;
  // Waiting is not broken. The key is made and correct; somebody else has to
  // say yes. Collapsing the two states sent people looking for a problem that
  // was not theirs to fix.
  const waiting =
    !!detail && !revoked && !inert && activeGrants.length === 0 && grants.length > 0 && !canProvision;

  const nameDirty = !!detail && name.trim() !== detail.key.name;
  const scopesDirty = useMemo(() => {
    if (!detail) return false;
    return [...scopes].sort().join(',') !== [...detail.key.scopes].sort().join(',');
  }, [detail, scopes]);

  if (notFound) {
    return (
      <>
        <a className="dc-crumb" href={consoleHref('/keys')}>
          ← All keys
        </a>
        <PageHead title="Key not found" />
        <Card>
          <p className="dc-note" style={{ marginTop: 0 }}>
            That key does not exist, or it belongs to another account. If you revoked it on another
            device, it will still be in your list marked revoked.
          </p>
          <a className="dc-btn" href={consoleHref('/keys')} style={{ marginTop: '0.9rem' }}>
            Back to your keys
          </a>
        </Card>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <a className="dc-crumb" href={consoleHref('/keys')}>
          ← All keys
        </a>
        <Card>
          <div className="dc-skeleton" style={{ width: '40%', marginBottom: '0.7rem' }} />
          <div className="dc-skeleton" style={{ width: '70%' }} />
        </Card>
      </>
    );
  }

  async function saveName() {
    if (!name.trim()) {
      setNameError('Give the key a name so you can tell it apart later.');
      return;
    }
    setNameError(undefined);
    setBusy(true);
    try {
      await developerApi.updateKey(keyId, { name: name.trim() });
      say('Name saved.');
      await load();
    } catch (e) {
      fail(e instanceof ApiError ? e.message : 'Could not save that name');
    } finally {
      setBusy(false);
    }
  }

  async function saveScopes() {
    if (scopes.length === 0) {
      setScopeError('Pick at least one permission.');
      return;
    }
    setScopeError(undefined);
    setBusy(true);
    try {
      await developerApi.updateKey(keyId, { scopes });
      say('Permissions saved. The key itself has not changed, so nothing needs redeploying.');
      await load();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Could not save those permissions';
      // The API refuses a key that would reach nothing, which is a fact about
      // the permission list and belongs beside it.
      setScopeError(message);
      fail(message);
    } finally {
      setBusy(false);
    }
  }

  async function addGrant() {
    if (!addCommunity) {
      inform('Pick a community to add.');
      return;
    }
    setBusy(true);
    try {
      const result = await developerApi.addKeyCommunity(keyId, addCommunity);
      setAddCommunity('');
      // The API decides whether the grant is live or waiting, based on
      // permissions this page cannot see. Report what it actually did.
      if (!result.added) {
        inform(`${result.communityName} is already on this key.`);
      } else if (result.grant.status === 'pending') {
        warn(
          `Asked ${result.communityName} to approve this key. It works everywhere else straight away, and starts working there once an owner or admin approves it.`
        );
      } else {
        say(`${result.communityName} added. This key can act there now.`);
      }
      await load();
    } catch (e) {
      fail(e instanceof ApiError ? e.message : 'Could not add that community');
    } finally {
      setBusy(false);
    }
  }

  function confirmRemoveGrant(communityId: string, communityName: string) {
    // Counted over every grant that is not revoked, not just the live ones.
    // A key whose only community is still pending is left with nothing when
    // that one goes, and saying nothing there was the whole point of warning.
    const last = grants.length === 1 && !canProvision;
    setConfirmation({
      title: `Remove ${communityName}?`,
      body: (
        <>
          <p style={{ margin: 0 }}>
            This key stops working in <strong>{communityName}</strong> immediately. The key itself
            keeps working and the secret does not change.
          </p>
          {last ? (
            <p style={{ marginBottom: 0 }}>
              It is this key&apos;s last community, and the key cannot create its own, so afterwards
              every call it makes will be refused until you add a community back.
            </p>
          ) : null}
        </>
      ),
      confirmText: 'Remove community',
      danger: true,
      onConfirm: () => removeGrant(communityId, communityName),
    });
  }

  async function removeGrant(communityId: string, communityName: string) {
    setBusy(true);
    try {
      const result = await developerApi.removeKeyCommunity(keyId, communityId);
      setConfirmation(null);
      if (result.keyNowInert) {
        warn(
          `${communityName} removed. This key now reaches no community and cannot create one, so its calls will be refused.`
        );
      } else {
        say(`${communityName} removed. This key can no longer act there.`);
      }
      await load();
    } catch (e) {
      setConfirmation(null);
      fail(e instanceof ApiError ? e.message : 'Could not remove that community');
    } finally {
      setBusy(false);
    }
  }

  /** What this key actually reaches, by name, for the dialogs. */
  function accessSummary() {
    const permissions = detail!.key.scopes.length
      ? detail!.key.scopes.join(', ')
      : 'no permissions';
    const where = grants.length
      ? grants
          .map((g) =>
            g.grant.status === 'pending'
              ? `${g.communityName || 'Unnamed'} (waiting for approval)`
              : g.communityName || 'Unnamed'
          )
          .join(', ')
      : 'no communities';
    return { permissions, where };
  }

  function confirmRotate() {
    const { permissions, where } = accessSummary();
    setConfirmation({
      title: `Rotate ${detail!.key.name}?`,
      body: (
        <>
          <p style={{ margin: 0 }}>
            We issue a new secret and the current one stops working immediately. Anything still
            using the old secret starts failing.
          </p>
          <p>The new secret keeps exactly the same access:</p>
          <p style={{ margin: 0 }}>
            <strong>Permissions:</strong> <span className="dc-mono">{permissions}</span>
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Communities:</strong> {where}
          </p>
        </>
      ),
      confirmText: 'Rotate key',
      onConfirm: rotate,
    });
  }

  async function rotate() {
    setBusy(true);
    try {
      const result = await developerApi.rotateKey(keyId);
      setConfirmation(null);
      setRotated(result);
      setNotice(null);
      await load();
    } catch (e) {
      setConfirmation(null);
      fail(e instanceof ApiError ? e.message : 'Could not rotate that key');
    } finally {
      setBusy(false);
    }
  }

  function confirmRevoke() {
    const { permissions, where } = accessSummary();
    setConfirmation({
      title: `Revoke ${detail!.key.name}?`,
      body: (
        <>
          <p style={{ margin: 0 }}>
            This key stops working immediately and cannot be brought back. Anything using it starts
            failing.
          </p>
          <p>It currently has:</p>
          <p style={{ margin: 0 }}>
            <strong>Permissions:</strong> <span className="dc-mono">{permissions}</span>
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Communities:</strong> {where}
          </p>
        </>
      ),
      confirmText: 'Revoke key',
      danger: true,
      onConfirm: revoke,
    });
  }

  async function revoke() {
    setBusy(true);
    try {
      await developerApi.revokeKey(keyId);
      await reload();
      window.location.href = consoleHref('/keys');
    } catch (e) {
      setConfirmation(null);
      fail(e instanceof ApiError ? e.message : 'Could not revoke that key');
      setBusy(false);
    }
  }

  return (
    <>
      <a className="dc-crumb" href={consoleHref('/keys')}>
        ← All keys
      </a>
      <PageHead
        title={detail.key.name}
        lede={
          <>
            <span className="dc-mono">
              {detail.key.displayPrefix}…{detail.key.lastFour}
            </span>
            {' · made '}
            {localDate(detail.key.createdAt)}
            {' · '}
            {detail.key.lastUsedAt ? `last used ${relativeTime(detail.key.lastUsedAt)}` : 'never used'}
          </>
        }
        actions={<StatusDot status={detail.key.status} />}
      />

      <Notice notice={notice} onDismiss={dismiss} />

      {rotated ? (
        <SecretReveal
          secret={rotated.plaintextKey}
          keyName={`${detail.key.name} has a new secret`}
          onDone={() => setRotated(null)}
        />
      ) : null}

      {revoked ? (
        <div className="dc-notice dc-notice-info" role="status">
          <div className="dc-notice-body">
            This key is revoked and cannot be edited or brought back. It is kept so its usage and
            audit history stay readable.
          </div>
        </div>
      ) : null}

      {inert ? (
        <div className="dc-notice dc-notice-warn" role="status">
          <div className="dc-notice-body">
            This key reaches no community and cannot create one, so every call it makes will be
            refused. Add a community below, or give it the{' '}
            <span className="dc-mono">communities:provision</span> permission.
          </div>
        </div>
      ) : waiting ? (
        <div className="dc-notice dc-notice-info" role="status">
          <div className="dc-notice-body">
            Nothing is wrong with this key. It is waiting for an owner or admin to approve it, and
            starts working the moment they do. Ask them to look under Developer keys in their
            community settings.
          </div>
        </div>
      ) : null}

      {usage ? (
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
              label="This month"
              value={num(usage.requestsThisMonth)}
              sub={`${num(usage.minuteLimit)} a minute allowed`}
            />
            <StatTile
              label="Failed requests today"
              value={num(
                usage.errorsToday.rateLimited +
                  usage.errorsToday.unauthorized +
                  usage.errorsToday.forbidden
              )}
              sub={
                usage.hasErrorsToday
                  ? `${num(usage.errorsToday.forbidden)} permission, ${num(usage.errorsToday.rateLimited)} rate limit, ${num(usage.errorsToday.unauthorized)} bad key`
                  : 'Nothing refused'
              }
              tone={usage.hasErrorsToday ? 'warn' : undefined}
            />
          </div>
          <Card title="Requests a day, last 30 days">
            <UsageChart series={usage.series} dailyLimit={usage.dailyLimit} height={150} />
          </Card>
        </>
      ) : null}

      {/* ---- name ---- */}
      <Card title="Name">
        <div className="dc-field" style={{ marginBottom: 0 }}>
          <label className="dc-label" htmlFor="dc-key-name">
            What this key is for
          </label>
          <input
            id="dc-key-name"
            className={`dc-input${nameError ? ' is-bad' : ''}`}
            value={name}
            maxLength={60}
            disabled={revoked}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(undefined);
            }}
          />
          {nameError ? <span className="dc-err">{nameError}</span> : null}
          {nameDirty && !revoked ? (
            <div className="dc-actions" style={{ marginTop: '0.7rem' }}>
              <button
                type="button"
                className="dc-btn dc-btn-primary dc-btn-sm"
                onClick={() => void saveName()}
                disabled={busy}
              >
                Save name
              </button>
              <button
                type="button"
                className="dc-btn dc-btn-ghost dc-btn-sm"
                onClick={() => {
                  setName(detail.key.name);
                  setNameError(undefined);
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* ---- communities ---- */}
      <Card title="Communities" tight>
        <div style={{ padding: '1.15rem 1.25rem 0' }}>
          <p className="dc-note" style={{ marginTop: 0 }}>
            This key can act in every community listed here. One key can cover several.
          </p>
          {/* The one real consequence of several communities on one key. Said
              here rather than left to be worked out from a 429. */}
          <p className="dc-note">
            Your limits are counted <strong>per key</strong>, not per community, so these
            communities share this key&apos;s {num(detail.limits.requestsPerMinute)} requests a
            minute and {num(detail.limits.requestsPerDay)} a day. Use separate keys if you want
            separate budgets.
          </p>
        </div>

        {grants.length === 0 ? (
          <div style={{ padding: '0 1.25rem 1.15rem' }}>
            <p className="dc-note" style={{ marginTop: 0 }}>
              {canProvision
                ? 'No communities yet. This key can create its own, and anything it creates is added here automatically.'
                : 'No communities yet, and this key cannot create one.'}
            </p>
          </div>
        ) : (
          <table className="dc-table">
            <thead>
              <tr>
                <th>Community</th>
                <th>Status</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {grants.map((grant) => (
                <tr key={grant.grant.communityId}>
                  <td data-label="Community">
                    <span className="dc-key-name">{grant.communityName || 'Unnamed community'}</span>
                    {grant.grant.source === 'created_by_key' ? (
                      <span className="dc-key-sub">Created by this key</span>
                    ) : null}
                  </td>
                  <td data-label="Status">
                    <StatusDot status={grant.grant.status} />
                  </td>
                  <td data-label="Added">{localDate(grant.grant.requestedAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {revoked ? null : (
                      <button
                        type="button"
                        className="dc-btn dc-btn-sm dc-btn-danger"
                        onClick={() =>
                          confirmRemoveGrant(
                            grant.grant.communityId,
                            grant.communityName || 'this community'
                          )
                        }
                        disabled={busy}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {revoked ? null : (
          <div style={{ padding: '1.1rem 1.25rem', borderTop: '1px solid var(--dc-line)' }}>
            <h3 className="dc-h3">Add a community</h3>
            <CommunityPicker
              communities={communities}
              value={addCommunity}
              onChange={setAddCommunity}
              exclude={grants.map((g) => g.grant.communityId)}
              id="dc-add-community"
              label="Community"
            />
            <div className="dc-actions" style={{ marginTop: '0.7rem' }}>
              <button
                type="button"
                className="dc-btn dc-btn-sm"
                onClick={() => void addGrant()}
                disabled={busy || !addCommunity}
              >
                Add community
              </button>
            </div>
            <p className="dc-hint">
              If you can manage the community, the key works there right away. If you are only a
              member, the key waits for an owner or admin to approve it. Removing one takes effect
              immediately either way.
            </p>
          </div>
        )}
      </Card>

      {/* ---- permissions ---- */}
      <Card title="Permissions">
        {revoked ? (
          <div className="dc-chips">
            {detail.key.scopes.map((scope) => (
              <ScopeChip key={scope} scope={scope} />
            ))}
          </div>
        ) : (
          <>
            <p className="dc-note" style={{ marginTop: 0 }}>
              Changing these does not change the key itself, so nothing needs redeploying.{' '}
              {detail.key.scopes.filter(isWriteScope).length > 0
                ? 'The amber ones can change or create data.'
                : 'This key can only read.'}
            </p>
            <div style={{ marginTop: '1rem' }}>
              <ScopePicker
                available={detail.availableScopes.length ? detail.availableScopes : account.availableScopes}
                chosen={scopes}
                onChange={(next) => {
                  setScopes(next);
                  setScopeError(undefined);
                }}
                error={scopeError}
                id="dc-scopes"
              />
            </div>
            {scopesDirty ? (
              <div className="dc-actions" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="dc-btn dc-btn-primary dc-btn-sm"
                  onClick={() => void saveScopes()}
                  disabled={busy}
                >
                  Save permissions
                </button>
                <button
                  type="button"
                  className="dc-btn dc-btn-ghost dc-btn-sm"
                  onClick={() => {
                    setScopes(detail.key.scopes);
                    setScopeError(undefined);
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card title="Plan">
        <dl className="dc-defs">
          <div className="dc-def">
            <dt>Plan</dt>
            <dd>{planLabel(detail.plan)}</dd>
          </div>
          <div className="dc-def">
            <dt>Requests a minute, this key</dt>
            <dd>{num(detail.limits.requestsPerMinute)}</dd>
          </div>
          <div className="dc-def">
            <dt>Requests a day, this key</dt>
            <dd>{num(detail.limits.requestsPerDay)}</dd>
          </div>
          <div className="dc-def">
            <dt>Player accounts a day, this key</dt>
            <dd>{num(detail.limits.accountsPerKeyDay)}</dd>
          </div>
          <div className="dc-def">
            <dt>Communities a day, this key</dt>
            <dd>{num(detail.limits.communitiesPerKeyDay)}</dd>
          </div>
        </dl>
      </Card>

      {revoked ? null : (
        <Card title="Rotate or revoke" danger>
          <div className="dc-danger-row">
            <div>
              <strong>Rotate the secret</strong>
              <p>
                Issues a new secret and stops the current one at once. Permissions and communities
                carry across. Use this if the secret leaked or you lost it.
              </p>
            </div>
            <button
              type="button"
              className="dc-btn"
              onClick={confirmRotate}
              disabled={busy}
            >
              Rotate key
            </button>
          </div>
          <div className="dc-danger-row">
            <div>
              <strong>Revoke this key</strong>
              <p>
                Stops it immediately and permanently. Anything using it starts failing. The key stays
                in your list, marked revoked, so its history is still readable.
              </p>
            </div>
            <button
              type="button"
              className="dc-btn dc-btn-danger"
              onClick={confirmRevoke}
              disabled={busy}
            >
              Revoke key
            </button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        confirmation={confirmation}
        onCancel={() => setConfirmation(null)}
        busy={busy}
      />
    </>
  );
}
