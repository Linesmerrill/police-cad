'use client';

/**
 * Creating a key.
 *
 * Its own page rather than a panel that unfolds inside the key list, because it
 * has three decisions in it and the one-time secret has to be read before
 * anything navigates away.
 *
 * The button is never disabled. A disabled button with nothing beside it is
 * what sent people hunting for what they had done wrong; the form submits,
 * tells you which field is missing, and puts the message next to that field.
 *
 * "No community" is coherent only for a key that can make its own, so choosing
 * it ticks that permission and says so. The old form told people to leave the
 * field blank and then refused the result.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiError, developerApi } from '@/lib/developer-api';
import type { CommunityOption, CreatedKey } from '@/lib/developer-api';
import { consoleHref } from '@/lib/developer-routes';
import { DEVELOPER_API_AUTH_EXAMPLE } from '@/lib/developer-api-public';
import ConsoleLink from '@/components/developer/ConsoleLink';
import { useConsole } from '@/components/developer/ConsoleProvider';
import NotSwitchedOnNotice from '@/components/developer/NotSwitchedOnNotice';
import CommunityPicker, { NO_COMMUNITY } from '@/components/developer/CommunityPicker';
import ScopePicker from '@/components/developer/ScopePicker';
import {
  Card,
  Notice,
  PageHead,
  SecretReveal,
  num,
  useNotice,
} from '@/components/developer/primitives';

export default function NewKeyPage() {
  const { account, reload } = useConsole();
  const { notice, fail, inform, dismiss } = useNotice();

  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [community, setCommunity] = useState('');
  const [communities, setCommunities] = useState<CommunityOption[] | null>(null);
  const [communitiesFailed, setCommunitiesFailed] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; scopes?: string; community?: string }>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [keyCount, setKeyCount] = useState<number | null>(null);

  const loadCommunities = useCallback(async () => {
    try {
      const data = await developerApi.communities();
      setCommunities(data.data || []);
      setCommunitiesFailed(false);
    } catch {
      // Recorded rather than swallowed. An empty list and a failed load look
      // identical on screen otherwise, and the empty one says something about
      // the user's account that is not true.
      setCommunities([]);
      setCommunitiesFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadCommunities();
    developerApi
      .keys()
      .then((list) => setKeyCount((list.keys || []).filter((r) => r.key.status !== 'revoked').length))
      .catch(() => setKeyCount(null));
  }, [loadCommunities]);

  const atLimit = keyCount !== null && keyCount >= account.limits.keysPerDeveloper;
  const canIssue = account.keyIssuanceAvailable !== false;

  function onCommunityChange(value: string) {
    setCommunity(value);
    setErrors((current) => ({ ...current, community: undefined }));
    if (value === NO_COMMUNITY && !scopes.includes('communities:provision')) {
      const available = account.availableScopes.map((s) => s.scope);
      if (available.includes('communities:provision')) {
        setScopes((current) => [...current, 'communities:provision']);
        setErrors((current) => ({ ...current, scopes: undefined }));
        inform(
          'A key with no community needs to be able to make its own, so "communities:provision" is now ticked.'
        );
      }
    }
  }

  function validate(): boolean {
    const next: { name?: string; scopes?: string; community?: string } = {};
    if (!name.trim()) next.name = 'Give the key a name so you can tell it apart later.';
    if (!community) {
      // "Not chosen yet" is its own state now, so the form can say which
      // decision is outstanding instead of refusing a choice nobody made.
      next.community =
        'Pick a community, or choose "No community" if this key will make its own.';
    }
    if (scopes.length === 0) {
      next.scopes = 'Pick at least one permission.';
    } else if (community === NO_COMMUNITY && !scopes.includes('communities:provision')) {
      // Reachable only by unticking the permission after choosing no
      // community. The copy and the rule say the same thing.
      next.scopes =
        'With no community chosen, this key needs "communities:provision" so it can make one.';
    }
    setErrors(next);
    if (next.name) {
      document.getElementById('dc-key-name')?.focus();
    } else if (next.community) {
      document.getElementById('dc-community')?.focus();
    } else if (next.scopes) {
      document.getElementById('dc-scopes')?.scrollIntoView({ block: 'center' });
    }
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    dismiss();
    try {
      const result = await developerApi.createKey({
        name: name.trim(),
        scopes,
        communityId: community === NO_COMMUNITY ? undefined : community,
      });
      setCreated(result);
      await reload();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Could not create that key';
      // Being at the key limit is a fact about the account, not a form error,
      // so it goes in the banner rather than beside a field that is fine.
      fail(message);
    } finally {
      setBusy(false);
    }
  }

  // The secret, once. Nothing navigates away until it has been dealt with:
  // leaving this page is the one action that cannot be undone.
  if (created) {
    return (
      <>
        <PageHead title="Key created" />
        <SecretReveal
          secret={created.plaintextKey}
          keyName={created.key.name}
          onDone={() => {
            window.location.href = consoleHref(`/keys/${created.key.id}`);
          }}
        />
        <Card title="What next">
          <p className="dc-note" style={{ marginTop: 0 }}>
            Send it as <code className="dc-mono">{DEVELOPER_API_AUTH_EXAMPLE} &lt;key&gt;</code> on every
            request.
            If you lose it, rotate the key — that issues a new secret and keeps the key&apos;s
            permissions and communities.
          </p>
          <div className="dc-actions" style={{ marginTop: '0.9rem' }}>
            <ConsoleLink className="dc-btn dc-btn-primary" to={`/keys/${created.key.id}`}>
              Open this key
            </ConsoleLink>
            <ConsoleLink className="dc-btn dc-btn-ghost" to={'/keys'}>
              All keys
            </ConsoleLink>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <ConsoleLink className="dc-crumb" to={'/keys'}>
        ← All keys
      </ConsoleLink>
      <PageHead
        title="New key"
        lede="You will see the secret once, when the key is made. We store a hash of it and nothing else."
      />

      {/* The form is not shown at all while the API is unconfigured. Showing
          it and failing on submit would waste the one decision this page asks
          for, and the API refuses the write anyway. */}
      {canIssue ? null : (
        <>
          <NotSwitchedOnNotice />
          <Card>
            <p className="dc-note" style={{ marginTop: 0 }}>
              Come back once it is on and this form will work normally. Nothing you do here is
              lost; no key has been created.
            </p>
            <div className="dc-actions" style={{ marginTop: '0.9rem' }}>
              <ConsoleLink className="dc-btn" to="/keys">
                Back to your keys
              </ConsoleLink>
            </div>
          </Card>
        </>
      )}

      {canIssue ? <Notice notice={notice} onDismiss={dismiss} /> : null}

      {atLimit ? (
        <div className="dc-notice dc-notice-warn" role="status">
          <div className="dc-notice-body">
            You have {num(keyCount || 0)} of {num(account.limits.keysPerDeveloper)} keys, which is
            your plan&apos;s limit. Revoke one you no longer use, or{' '}
            <a href={account.upgradeUrl || '/pricing'}>increase your limits</a>.
          </div>
        </div>
      ) : null}

      {canIssue ? (
      <form onSubmit={submit} noValidate>
        <Card title="Name">
          <div className="dc-field" style={{ marginBottom: 0 }}>
            <label className="dc-label" htmlFor="dc-key-name">
              What is this key for<span className="dc-req">*</span>
            </label>
            <input
              id="dc-key-name"
              className={`dc-input${errors.name ? ' is-bad' : ''}`}
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value);
                if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="FiveM dispatch bridge"
              aria-invalid={errors.name ? 'true' : undefined}
              aria-describedby={errors.name ? 'dc-key-name-err' : 'dc-key-name-hint'}
            />
            {errors.name ? (
              <span className="dc-err" id="dc-key-name-err">
                {errors.name}
              </span>
            ) : (
              <p className="dc-hint" id="dc-key-name-hint">
                Name it after the thing that will hold it, so you know which one to rotate later.
                Owners of the communities you add see this name too.
              </p>
            )}
          </div>
        </Card>

        <Card title="Community">
          <div className="dc-field" style={{ marginBottom: 0 }}>
            <CommunityPicker
              communities={communities}
              value={community}
              onChange={onCommunityChange}
              allowNone
              failed={communitiesFailed}
              id="dc-community"
              label="Which community may this key act in"
              error={errors.community}
            />
            <p className="dc-hint">
              You can add more communities to this key afterwards. One key can cover several.
            </p>
          </div>
        </Card>

        <Card title="Permissions">
          <ScopePicker
            available={account.availableScopes}
            chosen={scopes}
            onChange={(next) => {
              setScopes(next);
              if (errors.scopes) setErrors((current) => ({ ...current, scopes: undefined }));
            }}
            error={errors.scopes}
            id="dc-scopes"
          />
        </Card>

        <div className="dc-actions">
          <button type="submit" className="dc-btn dc-btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create key'}
          </button>
          <ConsoleLink className="dc-btn dc-btn-ghost" to={'/keys'}>
            Cancel
          </ConsoleLink>
        </div>
      </form>
      ) : null}
    </>
  );
}
