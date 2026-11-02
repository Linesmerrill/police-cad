'use client';

/**
 * Where this key's events get sent.
 *
 * Two things shape this screen. The first is that the signing secret is shown
 * exactly once, so the panel that shows it has to say what to do with it before
 * anything navigates away, the same rule the key's own secret follows.
 *
 * The second is that "my webhook is not receiving anything" is the question
 * every webhook integration eventually asks, and it has a small set of answers:
 * a 404 from their own router, a TLS failure, or an endpoint we switched off.
 * So the delivery log is on this screen rather than somewhere a developer has
 * to go looking, and an endpoint we turned off says why.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiError, developerApi } from '@/lib/developer-api';
import type { Webhook, WebhookDelivery, WebhookList } from '@/lib/developer-api';
import { Card, EmptyState, SecretReveal, localDate, localTime, relativeTime } from './primitives';

export default function KeyWebhooks({ keyId }: { keyId: string }) {
  const [list, setList] = useState<WebhookList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // The one-time secret, and which endpoint it belongs to. Held here rather
  // than in the list so nothing re-renders it away while it is being read.
  const [secret, setSecret] = useState<{ value: string; url: string } | null>(null);

  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await developerApi.webhooks(keyId));
      setError(null);
    } catch (e) {
      setList(null);
      setError(e instanceof ApiError ? e.message : 'Could not load this key’s webhooks');
    } finally {
      setLoading(false);
    }
  }, [keyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      // Beside the field, not in a banner. The field is what is wrong.
      setUrlError('Paste the https URL events should be sent to.');
      return;
    }
    setUrlError(undefined);
    setBusy(true);
    try {
      const result = await developerApi.createWebhook(keyId, { url: trimmed });
      setSecret({ value: result.signingSecret, url: result.webhook.url });
      setUrl('');
      await load();
    } catch (e) {
      // A refused URL is a fact about the field, so it goes beside it.
      setUrlError(e instanceof ApiError ? e.message : 'Could not add that webhook');
    } finally {
      setBusy(false);
    }
  }

  async function rotate(hook: Webhook) {
    setBusy(true);
    try {
      const result = await developerApi.rotateWebhookSecret(keyId, hook.id);
      setSecret({ value: result.signingSecret, url: hook.url });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not rotate that signing secret');
    } finally {
      setBusy(false);
    }
  }

  async function setEnabled(hook: Webhook, enabled: boolean) {
    setBusy(true);
    try {
      await developerApi.updateWebhook(keyId, hook.id, { enabled });
      setNotice(enabled ? 'Switched back on.' : 'Switched off. Nothing will be sent.');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save that webhook');
    } finally {
      setBusy(false);
    }
  }

  async function remove(hook: Webhook) {
    setBusy(true);
    try {
      await developerApi.deleteWebhook(keyId, hook.id);
      setNotice('Deleted.');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete that webhook');
    } finally {
      setBusy(false);
    }
  }

  // The secret, once. Nothing else renders until it has been dealt with:
  // leaving this panel is the one action here that cannot be undone.
  if (secret) {
    return (
      <Card title="Signing secret">
        <SecretReveal
          secret={secret.value}
          keyName={secret.url}
          onDone={() => setSecret(null)}
        />
        <p className="dc-note" style={{ marginTop: '0.9rem' }}>
          Verify every delivery with it. Recompute{' '}
          <code className="dc-mono">HMAC-SHA256(secret, &quot;&lt;t&gt;.&quot; + rawBody)</code> and
          compare against the <code className="dc-mono">v1</code> value in{' '}
          <code className="dc-mono">X-LPC-Signature</code>, then reject anything whose{' '}
          <code className="dc-mono">t</code> is more than{' '}
          {list?.limits.signatureToleranceSeconds || 300} seconds old, that last step is what stops
          a captured delivery being replayable. Use the <strong>raw body</strong>, before any JSON
          parsing.
        </p>
      </Card>
    );
  }

  const hooks = list?.webhooks || [];
  const atLimit = !!list && hooks.length >= list.limits.maxPerKey;

  return (
    <Card title="Webhooks">
      <p className="dc-note" style={{ marginTop: 0 }}>
        Events pushed to you instead of polled. The body carries the same event shape{' '}
        <code className="dc-mono">GET /communities/&#123;id&#125;/changes</code> returns, so moving
        from polling to webhooks does not mean rewriting your handler.
      </p>

      {notice ? (
        <div className="dc-notice dc-notice-good" role="status">
          <div className="dc-notice-body">{notice}</div>
        </div>
      ) : null}
      {error ? (
        <div className="dc-notice dc-notice-bad" role="status">
          <div className="dc-notice-body">{error}</div>
        </div>
      ) : null}

      {loading && hooks.length === 0 ? (
        <p className="dc-note">Loading…</p>
      ) : hooks.length === 0 ? (
        <EmptyState title="No webhooks">
          Add one below, or keep polling{' '}
          <code className="dc-mono">/changes</code>, both read the same events.
        </EmptyState>
      ) : (
        <div>
          {hooks.map((hook) => (
            <WebhookRow
              key={hook.id}
              keyId={keyId}
              hook={hook}
              busy={busy}
              onRotate={() => void rotate(hook)}
              onToggle={(enabled) => void setEnabled(hook, enabled)}
              onRemove={() => void remove(hook)}
            />
          ))}
        </div>
      )}

      <form onSubmit={add} noValidate style={{ marginTop: '1.1rem' }}>
        <div className="dc-field" style={{ marginBottom: '0.6rem' }}>
          <label className="dc-label" htmlFor="dc-hook-url">
            Add an endpoint
          </label>
          <input
            id="dc-hook-url"
            className={`dc-input${urlError ? ' is-bad' : ''}`}
            value={url}
            maxLength={1024}
            placeholder="https://your-server.example.com/lpc/webhook"
            onChange={(event) => {
              setUrl(event.target.value);
              if (urlError) setUrlError(undefined);
            }}
            aria-invalid={urlError ? 'true' : undefined}
            aria-describedby={urlError ? 'dc-hook-url-err' : 'dc-hook-url-hint'}
          />
          {urlError ? (
            <span className="dc-err" id="dc-hook-url-err">
              {urlError}
            </span>
          ) : (
            <p className="dc-hint" id="dc-hook-url-hint">
              https only, on a host reachable from the internet. We will not follow a redirect, and
              we never send to a private or loopback address.
            </p>
          )}
        </div>
        <div className="dc-actions">
          <button type="submit" className="dc-btn dc-btn-primary" disabled={busy || atLimit}>
            {busy ? 'Working…' : 'Add webhook'}
          </button>
        </div>
        {atLimit ? (
          <p className="dc-note">
            This key has {hooks.length} of {list?.limits.maxPerKey} webhooks. Delete one first.
          </p>
        ) : null}
      </form>

      <p className="dc-note">
        A delivery that fails is retried, then given up on: an endpoint that fails{' '}
        {list?.limits.disableAfterFailures || 20} in a row is switched off. Nothing is lost either
        way, the event stays readable from{' '}
        <code className="dc-mono">/changes</code> for its retention window, so a missed delivery
        means you poll for it rather than never seeing it.
      </p>
    </Card>
  );
}

function WebhookRow({
  keyId,
  hook,
  busy,
  onRotate,
  onToggle,
  onRemove,
}: {
  keyId: string;
  hook: Webhook;
  busy: boolean;
  onRotate: () => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null);
  const [showing, setShowing] = useState(false);
  const disabled = hook.status !== 'active';

  async function toggleDeliveries() {
    if (showing) {
      setShowing(false);
      return;
    }
    setShowing(true);
    if (deliveries) return;
    try {
      const data = await developerApi.webhookDeliveries(keyId, hook.id);
      setDeliveries(data.deliveries);
    } catch {
      setDeliveries([]);
    }
  }

  return (
    <div className="dc-hook">
      <div className="dc-hook-head">
        <div style={{ minWidth: 0 }}>
          <div className="dc-hook-url">{hook.url}</div>
          <div className="dc-dim">
            <span className={disabled ? 'dc-pill dc-pill-warn' : 'dc-pill dc-pill-good'}>
              {disabled ? 'Off' : 'On'}
            </span>{' '}
            {hook.eventsLabel || `${hook.events.length} event types`} ·{' '}
            {hook.communitiesLabel || `${hook.communities.length} communities`} · secret{' '}
            <code className="dc-mono">{hook.secretPrefix}…</code>
          </div>
          {hook.lastDeliveryAt ? (
            <div className="dc-dim">
              Last tried {relativeTime(hook.lastDeliveryAt)}
              {hook.lastStatus ? `: answered ${hook.lastStatus}` : ''}
              {hook.consecutiveFailures > 0
                ? `, ${hook.consecutiveFailures} failure${hook.consecutiveFailures === 1 ? '' : 's'} in a row`
                : ''}
            </div>
          ) : (
            <div className="dc-dim">Nothing sent yet.</div>
          )}
          {/* An endpoint we switched off says why. Without this the developer
              sees "Off" and has to guess whether they did it. */}
          {hook.disabledReason ? (
            <div className="dc-notice dc-notice-warn" style={{ marginTop: '0.5rem' }}>
              <div className="dc-notice-body">{hook.disabledReason}</div>
            </div>
          ) : null}
          {hook.lastError && !hook.disabledReason ? (
            <div className="dc-dim">Last error: {hook.lastError}</div>
          ) : null}
        </div>
        <div className="dc-actions" style={{ marginTop: 0 }}>
          <button type="button" className="dc-btn dc-btn-sm" onClick={() => void toggleDeliveries()}>
            {showing ? 'Hide attempts' : 'Attempts'}
          </button>
          <button type="button" className="dc-btn dc-btn-sm" onClick={onRotate} disabled={busy}>
            New secret
          </button>
          <button
            type="button"
            className="dc-btn dc-btn-sm"
            onClick={() => onToggle(disabled)}
            disabled={busy}
          >
            {disabled ? 'Switch on' : 'Switch off'}
          </button>
          <button
            type="button"
            className="dc-btn dc-btn-sm dc-btn-danger"
            onClick={onRemove}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>

      {showing ? (
        deliveries === null ? (
          <p className="dc-note">Loading attempts…</p>
        ) : deliveries.length === 0 ? (
          <p className="dc-note">Nothing has been attempted yet.</p>
        ) : (
          <div className="dc-table-wrap" style={{ marginTop: '0.7rem' }}>
            <table className="dc-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Answer</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={`${delivery.eventId}-${delivery.attempt}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div>{localTime(delivery.at)}</div>
                      <div className="dc-dim">{localDate(delivery.at)}</div>
                    </td>
                    <td>
                      <div className="dc-mono" style={{ fontSize: '0.82rem' }}>
                        {delivery.eventType}
                      </div>
                      <div className="dc-dim">attempt {delivery.attempt}</div>
                    </td>
                    <td>
                      <span
                        className={
                          delivery.succeeded ? 'dc-pill dc-pill-good' : 'dc-pill dc-pill-bad'
                        }
                      >
                        {delivery.status || ', '}
                      </span>
                      {delivery.error ? <div className="dc-dim">{delivery.error}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
