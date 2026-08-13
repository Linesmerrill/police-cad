'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

// Mirrors models.ApplicationCheck. Reason is written for the applicant by the
// API, so it is rendered verbatim rather than re-worded here.
export interface ApplicationCheck {
  key: string;
  platform?: string;
  handle?: string;
  status: 'pending' | 'passed' | 'failed' | 'manual';
  reason?: string;
  checkedAt?: string;
}

export interface VerifiablePlatform {
  type: string;
  url?: string;
  handle?: string;
  followerCount?: number;
  reportedFollowerCount?: number;
  verificationStatus?: string;
  verificationCode?: string;
  verificationMethod?: string;
  verifiedByAdmin?: boolean;
}

interface Props {
  platforms: VerifiablePlatform[];
  checks?: ApplicationCheck[];
  onRefresh: () => void;
}

const CHECK_LABELS: Record<string, string> = {
  channel_resolves: 'Channel found',
  ownership: 'Channel ownership',
  followers: 'Follower requirement',
};

// Platforms with no public API. Their Check button would always come back
// "waiting for a human", so we say that instead of offering a button that does
// nothing useful.
const MANUAL_PLATFORMS = ['tiktok', 'other'];

// Mirrors channelInstruction() in the API. Duplicated so a code that is already
// issued still comes with instructions after a page reload, when there is no
// verify-start response to read them from. Keep the two in step.
const INSTRUCTIONS: Record<string, string> = {
  youtube:
    'Add this code anywhere in your YouTube channel description (YouTube Studio → Customization → Basic info → Description), save, then click Check. You can remove it once verified.',
  twitch:
    'Add this code anywhere in your Twitch About panel / bio (Settings → Channel → About), save, then click Check. You can remove it once verified.',
  tiktok:
    'Add this code anywhere in your TikTok bio and leave it there. TikTok has no public API, so a member of our team confirms it by eye during review.',
};

function instructionFor(type: string) {
  return (
    INSTRUCTIONS[(type || '').toLowerCase()] ||
    'Add this code to your channel or profile bio and leave it there. A member of our team confirms it during review.'
  );
}

// The click path per platform. The one-line instruction above assumes you
// already know where these settings live; most people don't, and a failed check
// they can't diagnose is the thing that makes someone give up.
//
// Bold marks the exact label to look for on screen.
const STEPS: Record<string, { text: string; bold?: boolean }[][]> = {
  youtube: [
    [{ text: 'Open ' }, { text: 'studio.youtube.com', bold: true }, { text: ', signed in as the channel you listed.' }],
    [{ text: 'In the left sidebar click ' }, { text: 'Customization', bold: true }, { text: '.' }],
    [{ text: 'Open the ' }, { text: 'Basic info', bold: true }, { text: ' tab.' }],
    [{ text: 'Paste the code anywhere in the ' }, { text: 'Description', bold: true }, { text: ' box. It can sit alongside your existing text.' }],
    [{ text: 'Click ' }, { text: 'Publish', bold: true }, { text: ' at the top right.' }],
    [{ text: 'Come back here and press ' }, { text: 'Check', bold: true }, { text: '.' }],
  ],
  twitch: [
    [{ text: 'Open ' }, { text: 'twitch.tv', bold: true }, { text: ' and sign in as the channel you listed.' }],
    [{ text: 'Click your avatar at the top right, then ' }, { text: 'Settings', bold: true }, { text: '.' }],
    [{ text: 'Go to the ' }, { text: 'Channel', bold: true }, { text: ' tab.' }],
    [{ text: 'Paste the code into your ' }, { text: 'Bio', bold: true }, { text: ' / About panel.' }],
    [{ text: 'Click ' }, { text: 'Save Changes', bold: true }, { text: '.' }],
    [{ text: 'Come back here and press ' }, { text: 'Check', bold: true }, { text: '.' }],
  ],
  tiktok: [
    [{ text: 'Open the TikTok app, or ' }, { text: 'tiktok.com', bold: true }, { text: ', signed in as the account you listed.' }],
    [{ text: 'Go to ' }, { text: 'Profile', bold: true }, { text: ', then ' }, { text: 'Edit profile', bold: true }, { text: '.' }],
    [{ text: 'Paste the code into your ' }, { text: 'Bio', bold: true }, { text: '.' }],
    [{ text: 'Save.' }],
    [{ text: 'Leave the code in place. TikTok has no public API, so our team confirms it by eye during review — there is no Check button for TikTok.' }],
  ],
};

function stepsFor(type: string) {
  return (
    STEPS[(type || '').toLowerCase()] || [
      [{ text: 'Open your channel or profile settings on that platform.' }],
      [{ text: 'Find the ' }, { text: 'bio', bold: true }, { text: ' or ' }, { text: 'description', bold: true }, { text: ' field.' }],
      [{ text: 'Paste the code in and save.' }],
      [{ text: 'Leave it in place — our team confirms it during review.' }],
    ]
  );
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  passed: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: 'Passed' },
  failed: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'Action needed' },
  pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', label: 'Checking' },
  manual: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', label: 'Team review' },
};

function isVerified(p: VerifiablePlatform) {
  return p.verificationStatus === 'verified' || p.verifiedByAdmin === true;
}

export default function VerificationPanel({ platforms, checks = [], onRefresh }: Props) {
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [instructions, setInstructions] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<Record<number, { text: string; ok: boolean }>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

  const call = async (index: number, action: 'verify-start' | 'verify-check') => {
    setBusyIndex(index);
    setMessages((m) => ({ ...m, [index]: { text: '', ok: true } }));
    try {
      const res = await fetch(
        `/api/v1/content-creator-applications/me/platforms/${index}/${action}`,
        { method: 'POST', credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The API writes these for the applicant; show it rather than a status code.
        const reason =
          (data && data.response && data.response.message) || data.message || data.error || `HTTP ${res.status}`;
        setMessages((m) => ({ ...m, [index]: { text: reason, ok: false } }));
        return;
      }

      if (action === 'verify-start') {
        setCodes((c) => ({ ...c, [index]: data.code }));
        setInstructions((i) => ({ ...i, [index]: data.instruction || '' }));
        return;
      }

      if (data.verified) {
        setMessages((m) => ({ ...m, [index]: { text: 'Verified. Thanks!', ok: true } }));
        onRefresh();
        return;
      }
      setMessages((m) => ({
        ...m,
        [index]: { text: data.message || 'Not found yet, try again shortly.', ok: false },
      }));
    } catch {
      setMessages((m) => ({
        ...m,
        [index]: { text: 'Could not reach us just now. Try again in a moment.', ok: false },
      }));
    } finally {
      setBusyIndex(null);
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

  const checksFor = (p: VerifiablePlatform) =>
    checks.filter((c) => c.platform === p.type && (!c.handle || c.handle === p.handle || c.handle === p.url));
  const followerCheck = checks.find((c) => c.key === 'followers');

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
        Verify your channels
      </h3>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '0 0 20px', lineHeight: 1.6 }}>
        We confirm you own the channels on your application before it goes to review. Add the code
        we give you to your channel description, then hit Check. You can remove it once verified.
      </p>

      {platforms.map((p, index) => {
        const verified = isVerified(p);
        const manual = MANUAL_PLATFORMS.includes((p.type || '').toLowerCase());
        // Prefer a code just issued, but fall back to one already stored on the
        // application. Without this, reloading the page hid a live code and the
        // applicant had no way to see it again short of generating a new one.
        const code = codes[index] || p.verificationCode || '';
        const instruction = instructions[index] || (code ? instructionFor(p.type) : '');
        const msg = messages[index];
        const label = p.handle || p.url || p.type;

        return (
          <div
            key={`${p.type}-${index}`}
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px', textTransform: 'capitalize' }}>
                  {p.type}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{label}</div>
              </div>

              {verified ? (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    color: '#4ade80', background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '999px',
                    padding: '4px 12px', fontSize: '12px', fontWeight: 700,
                  }}
                >
                  <CheckCircleIcon style={{ width: 14, height: 14 }} />
                  Verified
                </span>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => call(index, 'verify-start')}
                    disabled={busyIndex === index}
                    style={{
                      background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
                      color: '#fbbf24', borderRadius: '8px', padding: '8px 14px',
                      fontSize: '13px', fontWeight: 600,
                      cursor: busyIndex === index ? 'default' : 'pointer',
                      opacity: busyIndex === index ? 0.6 : 1,
                    }}
                  >
                    {code ? 'New code' : 'Get code'}
                  </button>
                  {!manual && (
                    <button
                      onClick={() => call(index, 'verify-check')}
                      disabled={busyIndex === index}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff', borderRadius: '8px', padding: '8px 14px',
                        fontSize: '13px', fontWeight: 600,
                        cursor: busyIndex === index ? 'default' : 'pointer',
                        opacity: busyIndex === index ? 0.6 : 1,
                      }}
                    >
                      <ArrowPathIcon style={{ width: 14, height: 14 }} />
                      Check
                    </button>
                  )}
                </div>
              )}
            </div>

            {code && !verified && (
              <div style={{ marginTop: '14px' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(251,191,36,0.08)', border: '1px dashed rgba(251,191,36,0.4)',
                    borderRadius: '10px', padding: '12px 14px',
                  }}
                >
                  <code style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.06em', flex: 1, wordBreak: 'break-all' }}>
                    {code}
                  </code>
                  <button
                    onClick={() => copy(index, code)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'transparent', border: '1px solid rgba(251,191,36,0.4)',
                      color: '#fbbf24', borderRadius: '8px', padding: '6px 10px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />
                    {copied === index ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {instruction && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', lineHeight: 1.6 }}>
                    {instruction}
                  </p>
                )}

                <button
                  onClick={() => setOpenSteps((o) => ({ ...o, [index]: !o[index] }))}
                  aria-expanded={!!openSteps[index]}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'transparent', border: 'none', padding: '8px 0 0',
                    color: '#fbbf24', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <ChevronDownIcon
                    style={{
                      width: 14, height: 14,
                      transform: openSteps[index] ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                  {openSteps[index]
                    ? 'Hide step-by-step'
                    : `Show me exactly where on ${p.type.charAt(0).toUpperCase() + p.type.slice(1)}`}
                </button>

                {openSteps[index] && (
                  <ol
                    style={{
                      margin: '10px 0 0', padding: '14px 16px 14px 34px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.9,
                    }}
                  >
                    {stepsFor(p.type).map((parts, si) => (
                      <li key={si}>
                        {parts.map((part, pi) =>
                          part.bold ? (
                            <strong key={pi} style={{ color: '#fff' }}>{part.text}</strong>
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

            {msg?.text && (
              <p style={{ fontSize: '13px', margin: '10px 0 0', color: msg.ok ? '#4ade80' : '#f87171' }}>
                {msg.text}
              </p>
            )}

            {checksFor(p).map((c) => {
              const s = STATUS_STYLE[c.status] || STATUS_STYLE.pending;
              return (
                <div key={c.key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '10px' }}>
                  {c.status === 'passed' ? (
                    <CheckCircleIcon style={{ width: 16, height: 16, color: s.color, flexShrink: 0, marginTop: 2 }} />
                  ) : c.status === 'failed' ? (
                    <XCircleIcon style={{ width: 16, height: 16, color: s.color, flexShrink: 0, marginTop: 2 }} />
                  ) : (
                    <ClockIcon style={{ width: 16, height: 16, color: s.color, flexShrink: 0, marginTop: 2 }} />
                  )}
                  <div>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                      {CHECK_LABELS[c.key] || c.key}
                    </span>
                    {c.reason && (
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}> — {c.reason}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {followerCheck && (
        <div
          style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            background: (STATUS_STYLE[followerCheck.status] || STATUS_STYLE.pending).bg,
            border: `1px solid ${(STATUS_STYLE[followerCheck.status] || STATUS_STYLE.pending).border}`,
            borderRadius: '12px', padding: '14px 16px', marginTop: '4px',
          }}
        >
          <UserGroupIcon
            style={{
              width: 18, height: 18, flexShrink: 0, marginTop: 1,
              color: (STATUS_STYLE[followerCheck.status] || STATUS_STYLE.pending).color,
            }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Follower requirement</div>
            {followerCheck.reason && (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                {followerCheck.reason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
