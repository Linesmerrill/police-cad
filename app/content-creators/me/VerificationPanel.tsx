'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
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
  minFollowers?: number;
  onRefresh: () => void;
}

// Result of the last Check press, kept as three independent answers rather than
// one verdict. A single "could not verify" left people unable to tell a wrong
// handle from an unsaved description from a channel that is simply too small.
interface CheckResult {
  channelFound?: boolean;
  followersOk?: boolean;
  codeFound?: boolean;
  channelMessage?: string;
  followerMessage?: string;
  codeMessage?: string;
}

// Mirrors models.MinFollowers in the API. Exported so the progress timeline
// reads the same number rather than repeating the literal a third time.
export const DEFAULT_MIN_FOLLOWERS = 500;

// Platforms with no public API. Their Check button would always come back
// "waiting for a human", so we say that instead of offering a button that does
// nothing useful.
const MANUAL_PLATFORMS = ['tiktok', 'other'];

// Mirrors channelInstruction() in the API. Duplicated so a code that is already
// issued still comes with instructions after a page reload, when there is no
// verify-start response to read them from. Keep the two in step.
const INSTRUCTIONS: Record<string, string> = {
  youtube:
    'Add this code anywhere in your YouTube channel description (YouTube Studio → Customization → Profile → Description), save, then press Check.',
  twitch:
    'Add this code anywhere in your Twitch About panel / bio (Settings → Channel → About), save, then press Check.',
  tiktok:
    'Add this code anywhere in your TikTok bio and leave it there. TikTok has no public API, so our team confirms it by eye.',
};

function instructionFor(type: string) {
  return (
    INSTRUCTIONS[(type || '').toLowerCase()] ||
    'Add this code to your channel or profile bio and leave it there. Our team confirms it during review.'
  );
}

// The click path per platform. The one-line instruction assumes you already know
// where these settings live; most people don't, and a failed check they can't
// diagnose is what makes someone give up.
const STEPS: Record<string, { text: string; bold?: boolean }[][]> = {
  youtube: [
    [{ text: 'Open ' }, { text: 'studio.youtube.com', bold: true }, { text: ', signed in as the channel you listed.' }],
    [{ text: 'In the left sidebar click ' }, { text: 'Customization', bold: true }, { text: '.' }],
    [{ text: 'Open the ' }, { text: 'Profile', bold: true }, { text: ' tab (next to Home tab).' }],
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
    [{ text: 'Leave the code in place. TikTok has no public API, so our team confirms it by eye — there is no Check button for TikTok.' }],
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

// Mirrors NormalizeHandle in the API's platforms package, so the link resolves
// the same way the lookup does.
function normalizeHandle(raw: string): string {
  let h = (raw || '').trim();
  if (!h) return '';
  const scheme = h.indexOf('://');
  if (scheme >= 0) h = h.slice(scheme + 3);
  const q = h.search(/[?#]/);
  if (q >= 0) h = h.slice(0, q);
  h = h.replace(/^\/+|\/+$/g, '');
  const slash = h.indexOf('/');
  if (slash > 0 && h.slice(0, slash).includes('.')) h = h.slice(slash + 1);
  for (const prefix of ['channel/', 'c/', 'user/', '@']) {
    if (h.toLowerCase().startsWith(prefix)) {
      h = h.slice(prefix.length);
      break;
    }
  }
  const trailing = h.indexOf('/');
  if (trailing >= 0) h = h.slice(0, trailing);
  return h.replace(/^@/, '').trim();
}

// The URL we actually scan. Built from the handle rather than the url field,
// because the handle is what the API looks up — so if this opens the wrong
// channel, that IS the bug.
function scannedUrlFor(p: VerifiablePlatform): string {
  const h = normalizeHandle(p.handle || p.url || '');
  if (!h) return p.url || '';
  switch ((p.type || '').toLowerCase()) {
    case 'youtube':
      return /^UC[\w-]{22}$/.test(h)
        ? `https://www.youtube.com/channel/${h}`
        : `https://www.youtube.com/@${h}`;
    case 'twitch':
      return `https://twitch.tv/${h}`;
    case 'tiktok':
      return `https://tiktok.com/@${h}`;
    default:
      return p.url || '';
  }
}

function ownershipProven(p: VerifiablePlatform) {
  return p.verificationStatus === 'verified' || p.verifiedByAdmin === true;
}

function meetsFollowerBar(p: VerifiablePlatform, min: number) {
  return (p.followerCount ?? 0) >= min;
}

// The API measures the largest channel, not every channel — see the follower
// check in screenApplication. A small second channel alongside a big one costs
// nothing, so it must not be drawn as a failure here either.
function applicationQualifies(platforms: VerifiablePlatform[], min: number) {
  return platforms.some((p) => meetsFollowerBar(p, min));
}

// Platforms we read through an API. Once we have found the code in the
// description it has done its job and can come straight back out. TikTok is
// excluded on purpose: a human confirms that one by eye during review, so the
// code has to stay put until a decision is made.
const REMOVABLE_CODE_PLATFORMS = ['youtube', 'twitch'];

function codeRemovable(p: VerifiablePlatform) {
  return (
    ownershipProven(p) &&
    p.verifiedByAdmin !== true &&
    REMOVABLE_CODE_PLATFORMS.includes((p.type || '').toLowerCase())
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  tiktok: 'TikTok',
};

function platformLabel(type: string) {
  const t = (type || '').toLowerCase();
  return PLATFORM_LABELS[t] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : type);
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// "You can take the code out of your YouTube description now." Empty when there
// is nothing to take out, so the caller can leave the sentence off entirely
// rather than telling a TikTok-only applicant to undo work they still need.
export function codeRemovalSentence(platforms: VerifiablePlatform[]) {
  const names = platforms.filter(codeRemovable).map((p) => platformLabel(p.type));
  if (names.length === 0) return '';
  return `You can take the code back out of your ${joinList(names)} description${
    names.length > 1 ? 's' : ''
  } now.`;
}

// The panel header used to say the same thing forever: "we confirm you own the
// channels, add the code, hit Check". Once a channel is verified that sentence
// is noise, and once one has failed it is actively misleading. The heading now
// reports the state the applicant is actually in.
function derivePanelState(
  platforms: VerifiablePlatform[],
  checks: ApplicationCheck[],
  min: number
): { tone: 'neutral' | 'good' | 'warn' | 'bad'; headline: string; sub: string } {
  const failedCheck = checks.find((c) => c.status === 'failed');
  const allOwned = platforms.length > 0 && platforms.every(ownershipProven);
  const someOwned = platforms.some(ownershipProven);
  const qualifies = applicationQualifies(platforms, min);
  const counted = platforms.some((p) => p.followerCount != null);

  if (failedCheck) {
    return {
      tone: 'bad',
      headline: 'Something needs your attention',
      sub: failedCheck.reason || 'One of our checks did not pass. See the details below.',
    };
  }

  // Ownership proven and still short of the bar. That is a program requirement
  // measured off the channel itself, so it is settled — the API rejects it on
  // the next screening pass. Saying "our team will decide" here would be a
  // false hope, and pointing at the Check button would be worse.
  if (allOwned && counted && !qualifies) {
    return {
      tone: 'bad',
      headline: `Below our ${min.toLocaleString()} follower minimum`,
      sub: `You have proved ${
        platforms.length === 1 ? 'this channel is yours' : 'these channels are yours'
      }, but the program needs at least ${min.toLocaleString()} followers on one of them. That is a requirement we cannot waive, so this application will not be approved. You are very welcome to apply again once you are over ${min.toLocaleString()}.`,
    };
  }

  if (allOwned) {
    const removal = codeRemovalSentence(platforms);
    return {
      tone: 'good',
      headline: platforms.length === 1 ? 'Channel verified' : 'All channels verified',
      sub: `Nothing left for you to do. Your application is with our team.${
        removal ? ` ${removal}` : ''
      }`,
    };
  }

  if (someOwned) {
    const left = platforms.filter((p) => !ownershipProven(p)).length;
    const removal = codeRemovalSentence(platforms);
    return {
      tone: 'neutral',
      headline: `${left} channel${left === 1 ? '' : 's'} left to verify`,
      sub: `Add the code to the remaining channel${left === 1 ? '' : 's'} and press Check.${
        removal ? ` ${removal}` : ''
      }`,
    };
  }

  return {
    tone: 'neutral',
    headline: 'Verify your channels',
    sub: 'We confirm you own the channels on your application before it goes to review. Add the code below to your channel description, then press Check.',
  };
}

const TONE: Record<string, { color: string; bg: string; border: string }> = {
  neutral: { color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.22)' },
  good: { color: '#4ade80', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.22)' },
  warn: { color: '#fbbf24', bg: 'rgba(251,191,36,0.09)', border: 'rgba(251,191,36,0.3)' },
  bad: { color: '#f87171', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.26)' },
};

export default function VerificationPanel({
  platforms,
  checks = [],
  minFollowers = DEFAULT_MIN_FOLLOWERS,
  onRefresh,
}: Props) {
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [instructions, setInstructions] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, CheckResult>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});
  // Once every channel is verified and clears the bar there is nothing left to
  // do here, so the section folds itself away to a single line and lets the
  // progress timeline carry the page.
  const [expanded, setExpanded] = useState(false);

  const state = derivePanelState(platforms, checks, minFollowers);
  const tone = TONE[state.tone];
  const qualifies = applicationQualifies(platforms, minFollowers);
  const allSettled =
    platforms.length > 0 && platforms.every(ownershipProven) && qualifies;
  const collapsed = allSettled && !expanded;

  const call = async (index: number, action: 'verify-start' | 'verify-check') => {
    setBusyIndex(index);
    setErrors((e) => ({ ...e, [index]: '' }));
    if (action === 'verify-check') setResults((r) => ({ ...r, [index]: {} }));
    try {
      const res = await fetch(
        `/api/v1/content-creator-applications/me/platforms/${index}/${action}`,
        { method: 'POST', credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const reason =
          (data && data.response && data.response.message) || data.message || data.error || `HTTP ${res.status}`;
        setErrors((e) => ({ ...e, [index]: reason }));
        return;
      }

      if (action === 'verify-start') {
        setCodes((c) => ({ ...c, [index]: data.code }));
        setInstructions((i) => ({ ...i, [index]: data.instruction || '' }));
        return;
      }

      setResults((r) => ({
        ...r,
        [index]: {
          channelFound: data.channelFound,
          followersOk: data.followersOk,
          codeFound: data.codeFound,
          channelMessage: data.channelMessage,
          followerMessage: data.followerMessage,
          codeMessage: data.codeMessage,
        },
      }));
      if (data.verified) onRefresh();
    } catch {
      setErrors((e) => ({ ...e, [index]: 'Could not reach us just now. Try again in a moment.' }));
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

  return (
    <div className="vp-root">
      {/* Real CSS rather than inline styles for anything that needs a media
          query. The header and action rows have to stack on a phone, and inline
          styles cannot express that. */}
      <style>{`
        .vp-root {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .vp-head { margin-bottom: 18px; }
        .vp-hide {
          margin-top: 10px; background: transparent; border: none; padding: 0;
          color: rgba(255,255,255,0.45); font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .vp-hide:hover { color: #fff; }
        /* Collapsed: one row that says "done", and gets out of the way. */
        .vp-collapsed {
          display: flex; align-items: center; gap: 14px; width: 100%;
          background: transparent; border: none; padding: 0;
          font-family: inherit; text-align: left; cursor: pointer;
        }
        .vp-collapsed-badge {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: #4ade80; background: rgba(34,197,94,0.14);
          border: 1px solid rgba(34,197,94,0.32);
        }
        .vp-collapsed-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .vp-collapsed-text strong { color: #fff; font-size: 15px; font-weight: 700; }
        .vp-collapsed-text span { color: rgba(255,255,255,0.5); font-size: 13px; line-height: 1.5; }
        .vp-collapsed-more {
          display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
          color: rgba(255,255,255,0.45); font-size: 13px; font-weight: 600;
        }
        .vp-collapsed:hover .vp-collapsed-more { color: #fff; }
        .vp-head h3 {
          font-size: 18px; font-weight: 700; color: #fff;
          margin: 0 0 6px; line-height: 1.3;
        }
        .vp-head p { font-size: 14px; margin: 0; line-height: 1.6; }
        .vp-card {
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .vp-card-top {
          display: flex; justify-content: space-between;
          align-items: flex-start; gap: 12px;
        }
        .vp-ident { min-width: 0; flex: 1; }
        .vp-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .vp-btn {
          border-radius: 8px; padding: 8px 14px; font-size: 13px;
          font-weight: 600; cursor: pointer; font-family: inherit;
          white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;
        }
        .vp-btn:disabled { opacity: 0.55; cursor: default; }
        .vp-btn-primary { background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.35); color: #fbbf24; }
        .vp-btn-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; }
        .vp-code-row {
          display: flex; align-items: center; gap: 10px;
          background: rgba(251,191,36,0.08);
          border: 1px dashed rgba(251,191,36,0.4);
          border-radius: 10px; padding: 12px 14px;
        }
        .vp-code {
          font-size: 15px; font-weight: 700; color: #fbbf24;
          letter-spacing: 0.06em; flex: 1; min-width: 0;
          overflow-wrap: anywhere;
        }
        .vp-steps {
          margin: 10px 0 0; padding: 14px 16px 14px 32px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          color: rgba(255,255,255,0.75); font-size: 13px; line-height: 1.9;
        }
        /* Phones: the platform name and its buttons cannot share a row without
           squeezing the handle to nothing, so they stack. */
        @media (max-width: 560px) {
          .vp-root { padding: 16px; border-radius: 14px; }
          .vp-card { padding: 14px; }
          .vp-card-top { flex-direction: column; align-items: stretch; gap: 10px; }
          .vp-actions { width: 100%; }
          .vp-actions .vp-btn { flex: 1; justify-content: center; }
          .vp-code-row { flex-direction: column; align-items: stretch; gap: 8px; }
          .vp-code-row .vp-btn { justify-content: center; }
          .vp-steps { padding-left: 28px; }
          .vp-collapsed-more { display: none; }
        }
      `}</style>

      {collapsed ? (
        <button className="vp-collapsed" onClick={() => setExpanded(true)}>
          <span className="vp-collapsed-badge">
            <ShieldCheckIcon style={{ width: 16, height: 16 }} />
          </span>
          <span className="vp-collapsed-text">
            <strong>
              {platforms.length === 1
                ? 'Channel verified'
                : `All ${platforms.length} channels verified`}
            </strong>
            <span>
              {platforms.map((p) => platformLabel(p.type)).join(', ')} — nothing left for you to do here.
            </span>
          </span>
          <span className="vp-collapsed-more">
            Details
            <ChevronDownIcon style={{ width: 14, height: 14 }} />
          </span>
        </button>
      ) : (
        <div className="vp-head">
          <h3>{state.headline}</h3>
          <p style={{ color: state.tone === 'neutral' ? 'rgba(255,255,255,0.55)' : tone.color }}>{state.sub}</p>
          {allSettled && (
            <button className="vp-hide" onClick={() => setExpanded(false)}>Hide details</button>
          )}
        </div>
      )}

      {!collapsed && platforms.map((p, index) => {
        const owned = ownershipProven(p);
        const bigEnough = meetsFollowerBar(p, minFollowers);
        const manual = MANUAL_PLATFORMS.includes((p.type || '').toLowerCase());
        const code = codes[index] || p.verificationCode || '';
        const instruction = instructions[index] || (code ? instructionFor(p.type) : '');
        const result = results[index];
        const err = errors[index];
        const label = p.handle || p.url || p.type;
        const href = scannedUrlFor(p);

        // Three answers, from the live check if there is one, otherwise from
        // what is stored on the application.
        const lines = [
          {
            ok: result?.channelFound ?? (owned ? true : undefined),
            text: result?.channelMessage ?? (owned ? 'We reached your channel.' : undefined),
            fallback: 'Channel reachable',
          },
          {
            // Judged the way the API judges it: the largest channel carries the
            // application, so a small second channel is a fact, not a failure.
            ok: result?.followersOk ?? (p.followerCount != null ? bigEnough || qualifies : undefined),
            text:
              result?.followerMessage ??
              (p.followerCount != null
                ? bigEnough
                  ? `${p.followerCount.toLocaleString()} followers, above the ${minFollowers.toLocaleString()} minimum.`
                  : qualifies
                    ? `${p.followerCount.toLocaleString()} followers. We measure your largest channel, so this one does not need to reach ${minFollowers.toLocaleString()}.`
                    : `${p.followerCount.toLocaleString()} followers, under the ${minFollowers.toLocaleString()} minimum.`
                : undefined),
            fallback: 'Follower minimum',
          },
          {
            ok: result?.codeFound ?? (owned ? true : undefined),
            text: result?.codeMessage ?? (owned ? 'You have proved this channel is yours.' : undefined),
            fallback: 'Channel ownership',
          },
        ].filter((l) => l.ok !== undefined);

        // Green only when this channel is both ours and carried by a channel
        // that clears the bar. Ownership alone used to show a plain "Verified",
        // which read as a pass on a channel that had failed the follower bar.
        const allGood = owned && (bigEnough || qualifies);

        return (
          <div className="vp-card" key={`${p.type}-${index}`}>
            <div className="vp-card-top">
              <div className="vp-ident">
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{platformLabel(p.type)}</div>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Opens the channel we check for your code"
                    style={{
                      fontSize: '13px', color: '#7dd3fc',
                      textDecoration: 'underline', textUnderlineOffset: '2px',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {label}
                    <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
                  </a>
                ) : (
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{label}</div>
                )}
              </div>

              {/* Once we have found the channel and the code, both buttons are
                  spent: there is nothing left to fetch a code for, and pressing
                  Check again cannot move a follower count that was measured at
                  submission. Leaving them there invites people to hammer a
                  button that will never change their answer. */}
              {owned ? (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    color: allGood ? '#4ade80' : '#f87171',
                    background: allGood ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${allGood ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    borderRadius: '999px',
                    padding: '5px 12px', fontSize: '12px', fontWeight: 700,
                    flexShrink: 0, alignSelf: 'flex-start',
                  }}
                >
                  {allGood ? (
                    <ShieldCheckIcon style={{ width: 14, height: 14 }} />
                  ) : (
                    <XCircleIcon style={{ width: 14, height: 14 }} />
                  )}
                  {allGood ? 'Verified' : 'Below minimum'}
                </span>
              ) : (
                <div className="vp-actions">
                  <button className="vp-btn vp-btn-primary" onClick={() => call(index, 'verify-start')} disabled={busyIndex === index}>
                    {code ? 'New code' : 'Get code'}
                  </button>
                  {!manual && (
                    <button className="vp-btn vp-btn-ghost" onClick={() => call(index, 'verify-check')} disabled={busyIndex === index}>
                      <ArrowPathIcon style={{ width: 14, height: 14 }} />
                      Check
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Ownership done but the channel is too small: the code is no longer
                the thing standing in their way, so stop showing it. */}
            {code && !owned && (
              <div style={{ marginTop: '14px' }}>
                <div className="vp-code-row">
                  <code className="vp-code">{code}</code>
                  <button className="vp-btn" style={{ background: 'transparent', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }} onClick={() => copy(index, code)}>
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
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <ChevronDownIcon
                    style={{
                      width: 14, height: 14, flexShrink: 0,
                      transform: openSteps[index] ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                  {openSteps[index] ? 'Hide step-by-step' : `Show me exactly where on ${platformLabel(p.type)}`}
                </button>
                {openSteps[index] && (
                  <ol className="vp-steps">
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

            {lines.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {lines.map((line, li) => (
                  <div key={li} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    {line.ok ? (
                      <CheckCircleIcon style={{ width: 16, height: 16, color: '#4ade80', flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <XCircleIcon style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span style={{ fontSize: '13px', color: line.ok ? 'rgba(255,255,255,0.72)' : '#fca5a5', lineHeight: 1.5 }}>
                      {line.text || line.fallback}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {err && (
              <p style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', margin: '12px 0 0', color: '#fbbf24', lineHeight: 1.5 }}>
                <ClockIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                {err}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
