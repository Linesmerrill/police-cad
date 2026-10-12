'use client';

import { useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  DEFAULT_MIN_FOLLOWERS,
  channelUrlFor,
  followersLabel,
  instructionFor,
  normalizeHandle,
  platformLabel,
  stepsFor,
} from './VerificationPanel';
import { errorReason } from './apiError';

// One linked platform on an approved creator record. The creator's copy is the
// authoritative one after approval, so this is what the resync and re-verify
// endpoints read and write.
export interface MaintainablePlatform {
  type: string;
  url?: string;
  handle: string;
  followerCount: number;
  lastSyncedAt?: string;
  verificationStatus?: string;
  verificationCode?: string;
  verificationCodeExpiresAt?: string;
  // A handle change that has been started but not yet proved. The live handle
  // above keeps working until the code is found on this one.
  pendingHandle?: string;
  pendingURL?: string;
}

interface Props {
  platforms: MaintainablePlatform[];
  /** Collection the indexes belong to, without a trailing slash. */
  endpointBase: string;
  minFollowers?: number;
  /**
   * Patches one platform in the page's own state. Everything here reports what
   * the API just did, so the row has to change on the spot rather than waiting
   * on a refetch.
   */
  onPlatformPatch: (index: number, patch: Partial<MaintainablePlatform>) => void;
}

const platformColors: Record<string, string> = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  tiktok: '#00F2EA',
  other: '#6366f1',
};

type Tone = 'good' | 'warn' | 'bad';

interface Note {
  tone: Tone;
  text: string;
}

const NOTE_TONE: Record<Tone, { color: string; bg: string; border: string }> = {
  good: { color: '#4ade80', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  warn: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.28)' },
  bad: { color: '#fca5a5', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.26)' },
};

// Platforms with no public API. Nothing here can read them, so they get neither
// a resync button nor a code check: an admin confirms those by hand.
const MANUAL_PLATFORMS = ['other'];

function isManual(type: string) {
  return MANUAL_PLATFORMS.includes((type || '').toLowerCase());
}

// Written for someone looking at a row they just pressed a button on, so recent
// times are relative and older ones are a date they can match against memory.
function syncedLabel(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) {
    const m = Math.round(secs / 60);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (secs < 86400) {
    const h = Math.round(secs / 3600);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Retry-After arrives in seconds. Said the way a person would say it, because
// "try again in 86400 seconds" is not an answer anyone can act on.
function waitLabel(seconds: number): string {
  if (seconds <= 90) return `${Math.max(1, Math.round(seconds))} seconds`;
  if (seconds <= 5400) {
    const m = Math.ceil(seconds / 60);
    return `${m} minute${m === 1 ? '' : 's'}`;
  }
  const h = Math.ceil(seconds / 3600);
  return `${h} hour${h === 1 ? '' : 's'}`;
}

interface PostResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
  retryAfter: number | null;
}

export default function PlatformMaintenance({
  platforms,
  endpointBase,
  minFollowers = DEFAULT_MIN_FOLLOWERS,
  onPlatformPatch,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, Note>>({});
  const [openHandle, setOpenHandle] = useState<number | null>(null);
  const [handleInput, setHandleInput] = useState<Record<number, string>>({});
  const [codes, setCodes] = useState<Record<number, { code: string; instruction: string }>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

  const setNote = (index: number, tone: Tone, text: string) =>
    setNotes((n) => ({ ...n, [index]: { tone, text } }));
  const clearNote = (index: number) =>
    setNotes((n) => {
      const next = { ...n };
      delete next[index];
      return next;
    });

  const post = async (index: number, action: string, body?: unknown): Promise<PostResult> => {
    const res = await fetch(`${endpointBase}/${index}/${action}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const raw = res.headers.get('Retry-After');
    const retryAfter = raw && /^\d+$/.test(raw) ? parseInt(raw, 10) : null;
    return { ok: res.ok, status: res.status, data, retryAfter };
  };

  // Every refusal here is the API's to word, because only it knows which of the
  // platform's own answers it got. The fallbacks exist for a gateway page that
  // carries no JSON body at all.
  const failureNote = (r: PostResult, label: string, pendingSafe: boolean): Note => {
    const reason = errorReason(r.data, '');
    if (r.status === 429) {
      return {
        tone: 'warn',
        text:
          reason ||
          `Too many checks on ${label} just now. Try again in ${
            r.retryAfter ? waitLabel(r.retryAfter) : 'a few minutes'
          }.`,
      };
    }
    if (r.status === 503 || r.status === 502) {
      // A platform blocking us is not the creator's problem to solve, so the
      // way out gets named rather than left for a support ping.
      const base =
        reason ||
        `${label} would not let us read that channel just now. Nothing was changed, try again later.`;
      const tail = pendingSafe
        ? ' Your handle change is still pending, and an admin can verify it manually.'
        : ' An admin can verify it manually.';
      return { tone: 'warn', text: base + tail };
    }
    if (r.status === 410) {
      return {
        tone: 'warn',
        text: reason || 'That code has expired. Get a new one and add it to your bio.',
      };
    }
    if (r.status === 404) {
      return {
        tone: 'bad',
        text: reason || `We could not find that ${label} channel. Nothing was changed.`,
      };
    }
    return {
      tone: 'bad',
      text: reason || 'That did not work just now. Nothing was changed.',
    };
  };

  const belowMinimumNote = (count: number): string =>
    `${followersLabel(count)} is below the ${minFollowers.toLocaleString()} minimum. An admin will review it. Nothing on your profile has changed.`;

  const resync = async (index: number) => {
    const p = platforms[index];
    const label = platformLabel(p.type);
    setBusy(`${index}:resync`);
    clearNote(index);
    try {
      const r = await post(index, 'resync');
      if (!r.ok) {
        const note = failureNote(r, label, false);
        setNote(index, note.tone, note.text);
        return;
      }
      const platform = (r.data.platform || {}) as Partial<MaintainablePlatform>;
      const count =
        typeof platform.followerCount === 'number' ? platform.followerCount : p.followerCount;
      onPlatformPatch(index, {
        followerCount: count,
        lastSyncedAt: platform.lastSyncedAt || new Date().toISOString(),
      });
      const message = typeof r.data.message === 'string' ? r.data.message : '';
      if (r.data.belowMinimum) {
        setNote(index, 'warn', message || belowMinimumNote(count));
      } else {
        setNote(index, 'good', message || `Read from ${label}. You have ${followersLabel(count)}.`);
      }
    } catch {
      setNote(index, 'bad', 'Could not reach us just now. Nothing was changed.');
    } finally {
      setBusy(null);
    }
  };

  const startHandleChange = async (index: number) => {
    const p = platforms[index];
    const label = platformLabel(p.type);
    const proposed = normalizeHandle(handleInput[index] ?? p.pendingHandle ?? '');
    if (!proposed) {
      setNote(index, 'bad', 'Enter the new handle or the link to your channel.');
      return;
    }
    if (proposed.toLowerCase() === normalizeHandle(p.handle).toLowerCase()) {
      setNote(index, 'bad', `That is already your ${label} handle.`);
      return;
    }
    setBusy(`${index}:start`);
    clearNote(index);
    try {
      const r = await post(index, 'reverify-start', { handle: proposed });
      if (!r.ok) {
        const note = failureNote(r, label, false);
        setNote(index, note.tone, note.text);
        return;
      }
      const code = typeof r.data.code === 'string' ? r.data.code : '';
      const instruction =
        typeof r.data.instruction === 'string' && r.data.instruction
          ? r.data.instruction
          : instructionFor(p.type);
      setCodes((c) => ({ ...c, [index]: { code, instruction } }));
      onPlatformPatch(index, { pendingHandle: proposed, verificationCode: code });
    } catch {
      setNote(index, 'bad', 'Could not reach us just now. Nothing was changed.');
    } finally {
      setBusy(null);
    }
  };

  const checkHandleChange = async (index: number) => {
    const p = platforms[index];
    const label = platformLabel(p.type);
    const pending = p.pendingHandle || '';
    setBusy(`${index}:check`);
    clearNote(index);
    try {
      const r = await post(index, 'reverify-check');
      if (!r.ok) {
        const note = failureNote(r, label, !!pending);
        setNote(index, note.tone, note.text);
        return;
      }
      const verified = r.data.verified === true || r.data.codeFound === true;
      if (!verified) {
        const reason =
          (typeof r.data.codeMessage === 'string' && r.data.codeMessage) ||
          (typeof r.data.channelMessage === 'string' && r.data.channelMessage) ||
          (typeof r.data.message === 'string' && r.data.message) ||
          `We could not find the code on ${pending || 'that handle'} yet.`;
        setNote(
          index,
          'warn',
          `${reason} Your ${label} handle is still ${p.handle}, and the change is still waiting.`
        );
        return;
      }
      const platform = (r.data.platform || {}) as Partial<MaintainablePlatform>;
      const newHandle = platform.handle || (typeof r.data.handle === 'string' ? r.data.handle : '') || pending;
      const count =
        typeof platform.followerCount === 'number'
          ? platform.followerCount
          : typeof r.data.followerCount === 'number'
            ? (r.data.followerCount as number)
            : p.followerCount;
      const newUrl =
        platform.url ||
        (typeof r.data.profileUrl === 'string' ? r.data.profileUrl : '') ||
        p.url ||
        '';
      onPlatformPatch(index, {
        handle: newHandle,
        ...(newUrl ? { url: newUrl } : {}),
        followerCount: count,
        verificationStatus: 'verified',
        lastSyncedAt: platform.lastSyncedAt || new Date().toISOString(),
        pendingHandle: '',
        pendingURL: '',
        verificationCode: '',
      });
      setCodes((c) => {
        const next = { ...c };
        delete next[index];
        return next;
      });
      setOpenHandle(null);
      setHandleInput((h) => ({ ...h, [index]: '' }));
      if (r.data.belowMinimum) {
        setNote(index, 'warn', (typeof r.data.message === 'string' && r.data.message) || belowMinimumNote(count));
      } else {
        setNote(index, 'good', `${newHandle} is now your ${label} handle, with ${followersLabel(count)}.`);
      }
    } catch {
      setNote(index, 'bad', 'Could not reach us just now. Nothing was changed.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (index: number, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked; the code is selectable on screen anyway */
    }
  };

  return (
    <div className="pm-root">
      {/* Real CSS for anything that needs a media query: the handle and its two
          buttons cannot share a row on a phone without squeezing the handle to
          nothing, and inline styles cannot express that. */}
      <style>{`
        .pm-row {
          padding: 14px 16px;
          border-radius: 10px;
          margin-bottom: 12px;
        }
        .pm-row:last-child { margin-bottom: 0; }
        .pm-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .pm-ident { display: flex; align-items: center; gap: 12px; min-width: 0; flex-wrap: wrap; }
        .pm-foot {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-top: 12px; flex-wrap: wrap;
        }
        .pm-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .pm-btn {
          border-radius: 8px; padding: 7px 13px; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit; white-space: nowrap;
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
        }
        .pm-btn:disabled { opacity: 0.55; cursor: default; }
        .pm-btn-primary {
          background: rgba(251,191,36,0.12);
          border: 1px solid rgba(251,191,36,0.35);
          color: #fbbf24;
        }
        .pm-note {
          margin-top: 12px; border-radius: 9px; padding: 10px 12px;
          font-size: 13px; line-height: 1.55;
          display: flex; gap: 8px; align-items: flex-start;
        }
        .pm-note svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
        .pm-panel {
          margin-top: 12px; padding: 14px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
        }
        .pm-label {
          display: block; font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.55); margin-bottom: 6px;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .pm-input {
          width: 100%; padding: 11px 13px; font-size: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 9px; color: #fff; font-family: inherit;
        }
        .pm-code-row {
          display: flex; align-items: center; gap: 10px;
          background: rgba(251,191,36,0.08);
          border: 1px dashed rgba(251,191,36,0.4);
          border-radius: 10px; padding: 12px 14px;
        }
        .pm-code {
          font-size: 15px; font-weight: 700; color: #fbbf24;
          letter-spacing: 0.06em; flex: 1; min-width: 0; overflow-wrap: anywhere;
        }
        .pm-steps {
          margin: 10px 0 0; padding: 14px 16px 14px 32px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          color: rgba(255,255,255,0.75); font-size: 13px; line-height: 1.9;
        }
        @media (max-width: 560px) {
          .pm-top { flex-direction: column; align-items: flex-start; }
          .pm-foot { flex-direction: column; align-items: stretch; }
          .pm-actions { width: 100%; }
          .pm-actions .pm-btn { flex: 1; justify-content: center; }
          .pm-code-row { flex-direction: column; align-items: stretch; gap: 8px; }
          .pm-code-row .pm-btn { justify-content: center; }
          .pm-steps { padding-left: 28px; }
        }
      `}</style>

      {platforms.map((p, index) => {
        const accent = platformColors[(p.type || '').toLowerCase()] || platformColors.other;
        const label = platformLabel(p.type);
        const manual = isManual(p.type);
        const href = channelUrlFor(p.type, p.handle) || p.url || '';
        const note = notes[index];
        const issued = codes[index];
        const code = issued?.code || p.verificationCode || '';
        const pending = p.pendingHandle || '';
        const changing = openHandle === index || !!pending;
        const synced = syncedLabel(p.lastSyncedAt);

        return (
          <div
            className="pm-row"
            key={`${p.type}-${index}`}
            data-testid={`platform-row-${index}`}
            style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}
          >
            <div className="pm-top">
              <div className="pm-ident">
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: accent,
                    textTransform: 'capitalize',
                  }}
                >
                  {p.type}
                </span>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`platform-handle-${index}`}
                    style={{
                      fontSize: '14px',
                      color: '#7dd3fc',
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    @{p.handle}
                    <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
                  </a>
                ) : (
                  <span
                    data-testid={`platform-handle-${index}`}
                    style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    @{p.handle}
                  </span>
                )}
              </div>
              <span
                data-testid={`platform-followers-${index}`}
                style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}
              >
                {followersLabel(p.followerCount)}
              </span>
            </div>

            <div className="pm-foot">
              <span
                data-testid={`platform-last-synced-${index}`}
                style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}
              >
                {manual
                  ? 'We cannot read this platform automatically.'
                  : synced
                    ? `Last read from ${label} ${synced}`
                    : `Not read from ${label} yet`}
              </span>
              <div className="pm-actions">
                {!manual && (
                  <button
                    className="pm-btn"
                    data-testid={`platform-resync-${index}`}
                    onClick={() => resync(index)}
                    disabled={busy !== null}
                    title={`Read your follower count straight from ${label}`}
                  >
                    <ArrowPathIcon style={{ width: 14, height: 14 }} />
                    {busy === `${index}:resync` ? 'Reading...' : 'Resync followers'}
                  </button>
                )}
                {!manual && !pending && (
                  <button
                    className="pm-btn"
                    data-testid={`platform-change-handle-${index}`}
                    onClick={() => {
                      clearNote(index);
                      setOpenHandle(openHandle === index ? null : index);
                    }}
                    disabled={busy !== null}
                  >
                    <PencilSquareIcon style={{ width: 14, height: 14 }} />
                    Change handle
                  </button>
                )}
              </div>
            </div>

            {note && (
              <div
                className="pm-note"
                data-testid={`platform-note-${index}`}
                style={{
                  background: NOTE_TONE[note.tone].bg,
                  border: `1px solid ${NOTE_TONE[note.tone].border}`,
                  color: NOTE_TONE[note.tone].color,
                }}
              >
                {note.tone === 'good' ? (
                  <CheckCircleIcon />
                ) : note.tone === 'warn' ? (
                  <ExclamationTriangleIcon />
                ) : (
                  <XCircleIcon />
                )}
                <span>{note.text}</span>
              </div>
            )}

            {changing && (
              <div className="pm-panel" data-testid={`handle-panel-${index}`}>
                {pending && (
                  <p
                    data-testid={`handle-pending-${index}`}
                    style={{
                      margin: '0 0 12px',
                      fontSize: '13px',
                      color: '#fbbf24',
                      lineHeight: 1.6,
                    }}
                  >
                    Waiting on <strong style={{ color: '#fff' }}>{pending}</strong>. Your {label}{' '}
                    handle is still <strong style={{ color: '#fff' }}>{p.handle}</strong> and keeps
                    working until we find the code on the new one.
                  </p>
                )}
                {/* The input stays on screen while a change is pending: asking
                    for a fresh code is the way out of an expired one, and that
                    needs the handle it applies to. */}
                <label className="pm-label" htmlFor={`pm-handle-${index}`}>
                  New {label} handle or link
                </label>
                <input
                  id={`pm-handle-${index}`}
                  className="pm-input"
                  data-testid={`handle-input-${index}`}
                  value={handleInput[index] ?? pending}
                  maxLength={200}
                  placeholder={`Your new ${label} handle`}
                  onChange={(e) => setHandleInput((h) => ({ ...h, [index]: e.target.value }))}
                />
                {!pending && (
                  <p
                    style={{
                      margin: '10px 0 0',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.6,
                    }}
                  >
                    Your current handle <strong style={{ color: '#fff' }}>{p.handle}</strong> keeps
                    working until we find the code on the new one. Nothing changes on your profile
                    before then.
                  </p>
                )}

                {code && (
                  <div style={{ marginTop: '12px' }}>
                    <div className="pm-code-row">
                      <code className="pm-code" data-testid={`handle-code-${index}`}>
                        {code}
                      </code>
                      <button
                        className="pm-btn"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(251,191,36,0.4)',
                          color: '#fbbf24',
                        }}
                        onClick={() => copy(index, code)}
                      >
                        <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />
                        {copied === index ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p
                      data-testid={`handle-instruction-${index}`}
                      style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.6)',
                        margin: '10px 0 0',
                        lineHeight: 1.6,
                      }}
                    >
                      {issued?.instruction || instructionFor(p.type)}
                    </p>
                    <button
                      onClick={() => setOpenSteps((o) => ({ ...o, [index]: !o[index] }))}
                      aria-expanded={!!openSteps[index]}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'transparent',
                        border: 'none',
                        padding: '8px 0 0',
                        color: '#fbbf24',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                    >
                      <ChevronDownIcon
                        style={{
                          width: 14,
                          height: 14,
                          flexShrink: 0,
                          transform: openSteps[index] ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.15s ease',
                        }}
                      />
                      {openSteps[index] ? 'Hide step-by-step' : `Show me exactly where on ${label}`}
                    </button>
                    {openSteps[index] && (
                      <ol className="pm-steps">
                        {stepsFor(p.type).map((parts, si) => (
                          <li key={si}>
                            {parts.map((part, pi) =>
                              part.bold ? (
                                <strong key={pi} style={{ color: '#fff' }}>
                                  {part.text}
                                </strong>
                              ) : (
                                <span key={pi}>{part.text}</span>
                              )
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                <div className="pm-actions" style={{ marginTop: '14px' }}>
                  <button
                    className="pm-btn pm-btn-primary"
                    data-testid={`handle-start-${index}`}
                    onClick={() => startHandleChange(index)}
                    disabled={busy !== null}
                  >
                    {busy === `${index}:start` ? 'Getting code...' : code ? 'New code' : 'Get code'}
                  </button>
                  {code && (
                    <button
                      className="pm-btn"
                      data-testid={`handle-check-${index}`}
                      onClick={() => checkHandleChange(index)}
                      disabled={busy !== null}
                    >
                      <ArrowPathIcon style={{ width: 14, height: 14 }} />
                      {busy === `${index}:check` ? 'Checking...' : 'Check'}
                    </button>
                  )}
                  {!pending && (
                    <button
                      className="pm-btn"
                      data-testid={`handle-cancel-${index}`}
                      onClick={() => {
                        setOpenHandle(null);
                        clearNote(index);
                      }}
                      disabled={busy !== null}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
