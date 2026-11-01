'use client';

/**
 * The developer console's frame: the header, the section rail, and every style
 * the console uses.
 *
 * Modelled on GitHub's developer settings, because that is the thing our
 * developers already know: a narrow rail of sections, one subject per page, and
 * the dangerous actions kept at the bottom of their own page rather than beside
 * the ordinary ones.
 *
 * The visual language is the product's. This is a dispatch console, so: dark
 * surfaces, and a hard rule that anything a machine produced — keys, prefixes,
 * scope names, limits, counts — is set in mono, while anything written for a
 * person is set in Outfit. That is not decoration. A scope name is a string you
 * paste into code, and setting it in the same face as the sentence around it is
 * how people mistype them.
 *
 * The CSS lives here rather than beside each page so there is exactly one
 * definition of a card, a table row and a status dot. It loads once, with the
 * shell that wraps every page.
 */

import { ReactNode, useEffect, useState } from 'react';
import { consoleHref, docsHref, mainSiteHref, onConsoleHost } from '@/lib/developer-routes';
import type { SessionUser } from '@/lib/developer-api';

export type ConsoleSection = 'overview' | 'usage' | 'keys' | 'settings';

const NAV: { id: ConsoleSection; label: string; path: string; icon: ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z" />
      </svg>
    ),
  },
  {
    id: 'usage',
    label: 'Usage',
    path: '/usage',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 11h2v3H2zM6 7h2v7H6zM10 9h2v5h-2zM14 3h-2v11h2z" />
      </svg>
    ),
  },
  {
    id: 'keys',
    label: 'API keys',
    path: '/keys',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 1a5 5 0 0 0-4.8 6.4L1 11.6V15h3.4l.6-.6V13h1.4l.6-.6V11h1.4l1-1A5 5 0 1 0 10 1zm1.6 4.4a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5zm6.4 2.5c0-.4 0-.8-.1-1.2l1.4-1-1.4-2.5-1.7.6a6 6 0 0 0-1-.6L11.2 1H8.4l-.4 1.7a6 6 0 0 0-1 .6l-1.7-.6L3.9 5.2l1.4 1a7 7 0 0 0 0 2.4l-1.4 1 1.4 2.5 1.7-.6a6 6 0 0 0 1 .6l.4 1.7h2.8l.4-1.7a6 6 0 0 0 1-.6l1.7.6 1.4-2.5-1.4-1c.1-.4.1-.8.1-1.2z" />
      </svg>
    ),
  },
];

export default function ConsoleShell({
  active,
  user,
  planLabel,
  children,
}: {
  active: ConsoleSection;
  user?: SessionUser | null;
  planLabel?: string;
  children: ReactNode;
}) {
  // The rail's hrefs depend on which host is serving the page, which is only
  // knowable in the browser. Rendering /developer first and correcting after
  // hydration keeps the server and client markup identical on the main site,
  // and on the subdomain the links are right by the time anyone can click one.
  const [hostKnown, setHostKnown] = useState(false);
  useEffect(() => setHostKnown(true), []);
  const onSubdomain = hostKnown && onConsoleHost();

  return (
    <div className="dc">
      <ConsoleStyles />

      <header className="dc-top">
        <div className="dc-top-in">
          <a className="dc-brand" href={consoleHref('')}>
            <span className="dc-brand-mark" aria-hidden="true" />
            <span className="dc-brand-text">
              Developer<span className="dc-brand-dim">&nbsp;console</span>
            </span>
          </a>

          <nav className="dc-top-links" aria-label="Elsewhere">
            <a className="dc-top-link" href={docsHref()}>
              API reference
            </a>
            {/* The way back out. On the subdomain this is an absolute link to
                the main site, derived from the current hostname rather than
                hardcoded, so staging does not link to production. */}
            <a className="dc-top-link dc-top-back" href={mainSiteHref('/communities')}>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="dc-back-icon">
                <path d="M7 2 1.5 8 7 14v-3.5h7v-5H7z" />
              </svg>
              Back to LPC
            </a>
            {user ? (
              <span className="dc-who" title={user.username || user.email || 'Your account'}>
                {user.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="dc-avatar" src={user.profilePicture} alt="" />
                ) : (
                  <span className="dc-avatar dc-avatar-blank" aria-hidden="true" />
                )}
                <span className="dc-who-name">{user.username || 'Your account'}</span>
              </span>
            ) : null}
          </nav>
        </div>
      </header>

      <div className="dc-body">
        {/* A strip on phones, a rail on desktop. Chip rows scroll sideways
            rather than wrapping into two lines that push the content down. */}
        <nav className="dc-rail" aria-label="Console sections">
          <div className="dc-rail-scroll">
            {NAV.map((item) => (
              <a
                key={item.id}
                className={`dc-rail-item${active === item.id ? ' is-active' : ''}`}
                href={onSubdomain ? item.path || '/' : `/developer${item.path}`}
                aria-current={active === item.id ? 'page' : undefined}
              >
                <span className="dc-rail-icon">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
          {planLabel ? (
            <div className="dc-rail-plan">
              <span className="dc-rail-plan-label">Plan</span>
              <span className="dc-rail-plan-value">{planLabel}</span>
            </div>
          ) : null}
        </nav>

        <main className="dc-main">{children}</main>
      </div>
    </div>
  );
}

function ConsoleStyles() {
  return (
    <style jsx global>{`
      /* The product's palette, not a second one. Same tokens as the newer
         pages so the console does not read as somebody else's site. */
      .dc {
        --dc-bg: #08090c;
        --dc-surface: #0e1117;
        --dc-surface-2: #12161e;
        --dc-line: rgba(255, 255, 255, 0.08);
        --dc-line-strong: rgba(255, 255, 255, 0.16);
        --dc-text: #e2e8f0;
        --dc-muted: #94a3b8;
        --dc-dim: #64748b;
        --dc-accent: #38bdf8;
        --dc-accent-soft: rgba(56, 189, 248, 0.12);
        --dc-green: #34d399;
        --dc-amber: #fbbf24;
        --dc-red: #f87171;
        --dc-radius: 10px;
        --dc-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;

        background: var(--dc-bg);
        color: var(--dc-text);
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .dc *,
      .dc *::before,
      .dc *::after {
        box-sizing: border-box;
      }

      /* ---- header ---- */
      .dc-top {
        border-bottom: 1px solid var(--dc-line);
        background: rgba(8, 9, 12, 0.92);
        backdrop-filter: blur(8px);
        position: sticky;
        top: 0;
        z-index: 20;
      }
      .dc-top-in {
        max-width: 1180px;
        margin: 0 auto;
        padding: 0 1rem;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .dc-brand {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        color: var(--dc-text);
        text-decoration: none;
        font-weight: 700;
        letter-spacing: -0.01em;
        white-space: nowrap;
      }
      .dc-brand-mark {
        width: 20px;
        height: 20px;
        border-radius: 5px;
        background: linear-gradient(140deg, var(--dc-accent), #0ea5e9);
        box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.35);
        flex: none;
      }
      .dc-brand-dim {
        color: var(--dc-muted);
        font-weight: 500;
      }
      .dc-top-links {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
      }
      .dc-top-link {
        color: var(--dc-muted);
        text-decoration: none;
        font-size: 0.875rem;
        padding: 0.4rem 0.6rem;
        border-radius: 7px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      .dc-top-link:hover {
        color: var(--dc-text);
        background: rgba(255, 255, 255, 0.05);
      }
      .dc-back-icon {
        width: 13px;
        height: 13px;
        fill: currentColor;
      }
      .dc-who {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding-left: 0.6rem;
        margin-left: 0.25rem;
        border-left: 1px solid var(--dc-line);
        min-width: 0;
      }
      .dc-avatar {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        object-fit: cover;
        flex: none;
      }
      .dc-avatar-blank {
        background: var(--dc-surface-2);
        border: 1px solid var(--dc-line);
      }
      .dc-who-name {
        font-size: 0.875rem;
        color: var(--dc-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 11ch;
      }

      /* ---- rail + content ---- */
      .dc-body {
        flex: 1;
        width: 100%;
        max-width: 1180px;
        margin: 0 auto;
        padding: 1.75rem 1rem 5rem;
        display: grid;
        grid-template-columns: 196px minmax(0, 1fr);
        gap: 2.25rem;
        align-items: start;
      }
      .dc-rail {
        position: sticky;
        top: 76px;
        /* A grid item's min-width defaults to auto, so the section strip's
           own content width sets the column's width. On a phone that made the
           whole grid 420px inside a 390px viewport and every page scrolled
           sideways. The strip scrolls; the page must not. */
        min-width: 0;
      }
      .dc-rail-scroll {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .dc-rail-item {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.5rem 0.65rem;
        border-radius: 7px;
        color: var(--dc-muted);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        border-left: 2px solid transparent;
        white-space: nowrap;
      }
      .dc-rail-item:hover {
        color: var(--dc-text);
        background: rgba(255, 255, 255, 0.04);
      }
      .dc-rail-item.is-active {
        color: var(--dc-text);
        background: var(--dc-accent-soft);
        border-left-color: var(--dc-accent);
        font-weight: 600;
      }
      .dc-rail-icon {
        display: inline-flex;
        width: 15px;
        flex: none;
      }
      .dc-rail-icon svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }
      .dc-rail-plan {
        margin-top: 1.25rem;
        padding: 0.65rem 0.7rem;
        border: 1px solid var(--dc-line);
        border-radius: 8px;
        background: var(--dc-surface);
      }
      .dc-rail-plan-label {
        display: block;
        font-size: 0.68rem;
        letter-spacing: 0.08em;
        color: var(--dc-dim);
        text-transform: uppercase;
      }
      .dc-rail-plan-value {
        display: block;
        font-weight: 700;
        margin-top: 0.15rem;
      }
      .dc-main {
        min-width: 0;
        max-width: 100%;
      }

      /* ---- page furniture ---- */
      .dc-head {
        margin-bottom: 1.5rem;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .dc-h1 {
        font-size: 1.55rem;
        font-weight: 700;
        margin: 0 0 0.3rem;
        letter-spacing: -0.02em;
      }
      .dc-lede {
        margin: 0;
        color: var(--dc-muted);
        line-height: 1.6;
        max-width: 68ch;
      }
      .dc-h2 {
        font-size: 1.02rem;
        font-weight: 700;
        margin: 0 0 0.9rem;
      }
      .dc-h3 {
        font-size: 0.9rem;
        font-weight: 600;
        margin: 0 0 0.4rem;
      }
      .dc-crumb {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        color: var(--dc-muted);
        text-decoration: none;
        margin-bottom: 0.85rem;
      }
      .dc-crumb:hover {
        color: var(--dc-accent);
      }

      .dc-card {
        background: var(--dc-surface);
        border: 1px solid var(--dc-line);
        border-radius: var(--dc-radius);
        padding: 1.15rem 1.25rem;
        margin-bottom: 1.1rem;
      }
      .dc-card-tight {
        padding: 0;
        overflow: hidden;
      }
      .dc-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.9rem 1.25rem;
        border-bottom: 1px solid var(--dc-line);
        flex-wrap: wrap;
      }
      .dc-card-head .dc-h2 {
        margin: 0;
      }
      .dc-note {
        color: var(--dc-muted);
        font-size: 0.875rem;
        line-height: 1.6;
        margin: 0.5rem 0 0;
      }
      .dc-mono {
        font-family: var(--dc-mono);
        font-size: 0.86em;
      }

      /* ---- stat tiles ---- */
      .dc-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1.1rem;
      }
      .dc-stat {
        background: var(--dc-surface);
        border: 1px solid var(--dc-line);
        border-radius: var(--dc-radius);
        padding: 0.95rem 1.05rem;
      }
      .dc-stat-label {
        font-size: 0.72rem;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--dc-dim);
        margin: 0 0 0.35rem;
      }
      .dc-stat-value {
        font-family: var(--dc-mono);
        font-size: 1.5rem;
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: -0.02em;
      }
      .dc-stat-sub {
        margin: 0.3rem 0 0;
        font-size: 0.8rem;
        color: var(--dc-muted);
      }
      .dc-stat-accent .dc-stat-value {
        color: var(--dc-accent);
      }
      .dc-stat-warn .dc-stat-value {
        color: var(--dc-amber);
      }

      /* A limit bar. Clamped at 100%, since the request that trips the cap is
         itself counted and a bar past full reads as a bug. */
      .dc-meter {
        height: 5px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.07);
        overflow: hidden;
        margin-top: 0.6rem;
      }
      .dc-meter-fill {
        height: 100%;
        background: var(--dc-accent);
        border-radius: 3px;
      }
      .dc-meter-fill.is-high {
        background: var(--dc-amber);
      }
      .dc-meter-fill.is-full {
        background: var(--dc-red);
      }

      /* ---- buttons ---- */
      .dc-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0.5rem 0.9rem;
        border-radius: 8px;
        border: 1px solid var(--dc-line-strong);
        background: var(--dc-surface-2);
        color: var(--dc-text);
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        white-space: nowrap;
      }
      .dc-btn:hover:not(:disabled) {
        border-color: var(--dc-accent);
        color: var(--dc-accent);
      }
      .dc-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .dc-btn-primary {
        background: var(--dc-accent);
        border-color: var(--dc-accent);
        color: #04131c;
      }
      .dc-btn-primary:hover:not(:disabled) {
        background: #7dd3fc;
        border-color: #7dd3fc;
        color: #04131c;
      }
      .dc-btn-danger {
        border-color: rgba(248, 113, 113, 0.5);
        color: var(--dc-red);
      }
      .dc-btn-danger:hover:not(:disabled) {
        background: rgba(248, 113, 113, 0.12);
        border-color: var(--dc-red);
        color: var(--dc-red);
      }
      .dc-btn-sm {
        padding: 0.32rem 0.6rem;
        font-size: 0.8rem;
      }
      .dc-btn-ghost {
        background: transparent;
        border-color: transparent;
        color: var(--dc-muted);
        font-weight: 500;
      }
      .dc-btn-ghost:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.05);
        color: var(--dc-text);
        border-color: transparent;
      }
      .dc-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      /* ---- forms ---- */
      .dc-field {
        margin-bottom: 1.1rem;
      }
      .dc-label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 0.3rem;
      }
      .dc-req {
        color: var(--dc-accent);
        margin-left: 0.15rem;
      }
      .dc-hint {
        font-size: 0.8rem;
        color: var(--dc-muted);
        margin: 0.3rem 0 0;
        line-height: 1.55;
      }
      .dc-input,
      .dc-select {
        width: 100%;
        padding: 0.55rem 0.7rem;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid var(--dc-line);
        color: var(--dc-text);
        font-family: inherit;
        font-size: 0.925rem;
      }
      .dc-input:focus,
      .dc-select:focus {
        outline: none;
        border-color: var(--dc-accent);
        box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14);
      }
      /* The field itself is flagged, not only a banner at the top of a long
         page: a message about a field you cannot see is not a message. */
      .dc-input.is-bad,
      .dc-select.is-bad {
        border-color: var(--dc-red);
      }
      .dc-err {
        display: block;
        color: var(--dc-red);
        font-size: 0.8rem;
        margin-top: 0.3rem;
      }

      /* ---- notices ---- */
      .dc-notice {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        padding: 0.8rem 1rem;
        border-radius: var(--dc-radius);
        margin-bottom: 1.1rem;
        font-size: 0.9rem;
        line-height: 1.55;
        border: 1px solid;
      }
      .dc-notice-good {
        background: rgba(52, 211, 153, 0.1);
        border-color: rgba(52, 211, 153, 0.35);
        color: #a7f3d0;
      }
      .dc-notice-bad {
        background: rgba(248, 113, 113, 0.1);
        border-color: rgba(248, 113, 113, 0.35);
        color: #fecaca;
      }
      .dc-notice-info {
        background: rgba(56, 189, 248, 0.08);
        border-color: rgba(56, 189, 248, 0.3);
        color: #bae6fd;
      }
      .dc-notice-warn {
        background: rgba(251, 191, 36, 0.09);
        border-color: rgba(251, 191, 36, 0.32);
        color: #fde68a;
      }
      .dc-notice-body {
        flex: 1;
        min-width: 0;
      }
      .dc-notice-x {
        background: none;
        border: 0;
        color: inherit;
        opacity: 0.65;
        cursor: pointer;
        font-size: 1.1rem;
        line-height: 1;
        padding: 0 0.15rem;
        flex: none;
      }
      .dc-notice-x:hover {
        opacity: 1;
      }

      /* ---- status ---- */
      .dc-status {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.82rem;
        color: var(--dc-muted);
        white-space: nowrap;
      }
      .dc-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--dc-dim);
        flex: none;
      }
      .dc-dot-active {
        background: var(--dc-green);
        box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15);
      }
      .dc-dot-pending {
        background: var(--dc-amber);
        box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.15);
      }
      .dc-dot-revoked {
        background: var(--dc-dim);
      }

      .dc-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.14rem 0.45rem;
        border-radius: 5px;
        border: 1px solid var(--dc-line);
        background: var(--dc-surface-2);
        font-family: var(--dc-mono);
        font-size: 0.74rem;
        color: var(--dc-muted);
        white-space: nowrap;
      }
      .dc-chip-write {
        border-color: rgba(251, 191, 36, 0.35);
        color: var(--dc-amber);
      }
      .dc-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
      }

      /* ---- tables ---- */
      .dc-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      .dc-table th {
        text-align: left;
        font-size: 0.7rem;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--dc-dim);
        font-weight: 600;
        padding: 0.6rem 1.25rem;
        border-bottom: 1px solid var(--dc-line);
        white-space: nowrap;
      }
      .dc-table td {
        padding: 0.85rem 1.25rem;
        border-bottom: 1px solid var(--dc-line);
        vertical-align: middle;
      }
      .dc-table tr:last-child td {
        border-bottom: 0;
      }
      .dc-table tbody tr:hover {
        background: rgba(255, 255, 255, 0.02);
      }
      .dc-table-num {
        font-family: var(--dc-mono);
        text-align: right;
      }
      .dc-key-name {
        font-weight: 600;
        color: var(--dc-text);
        text-decoration: none;
      }
      .dc-key-name:hover {
        color: var(--dc-accent);
      }
      .dc-key-sub {
        display: block;
        font-family: var(--dc-mono);
        font-size: 0.76rem;
        color: var(--dc-dim);
        margin-top: 0.2rem;
      }

      /* ---- toolbar, search, paging ---- */
      .dc-toolbar {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        padding: 0.8rem 1.25rem;
        border-bottom: 1px solid var(--dc-line);
        flex-wrap: wrap;
      }
      .dc-search {
        position: relative;
        flex: 1;
        min-width: 180px;
      }
      .dc-search .dc-input {
        padding-left: 2rem;
      }
      .dc-search-icon {
        position: absolute;
        left: 0.65rem;
        top: 50%;
        transform: translateY(-50%);
        width: 13px;
        height: 13px;
        fill: var(--dc-dim);
        pointer-events: none;
      }
      .dc-filters {
        display: flex;
        gap: 0.35rem;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        flex-grow: 0;
        flex-shrink: 0;
        max-width: 100%;
        scrollbar-width: none;
      }
      .dc-filters::-webkit-scrollbar {
        display: none;
      }
      .dc-filter {
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        border: 1px solid var(--dc-line);
        background: transparent;
        color: var(--dc-muted);
        font-family: inherit;
        font-size: 0.82rem;
        cursor: pointer;
        white-space: nowrap;
      }
      .dc-filter:hover {
        color: var(--dc-text);
        border-color: var(--dc-line-strong);
      }
      .dc-filter.is-on {
        background: var(--dc-accent-soft);
        border-color: var(--dc-accent);
        color: var(--dc-accent);
        font-weight: 600;
      }
      .dc-pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.7rem 1.25rem;
        border-top: 1px solid var(--dc-line);
        font-size: 0.85rem;
        color: var(--dc-muted);
        flex-wrap: wrap;
      }
      .dc-pager-btns {
        display: flex;
        gap: 0.35rem;
      }

      /* ---- empty + loading ---- */
      .dc-empty {
        padding: 2.5rem 1.25rem;
        text-align: center;
        color: var(--dc-muted);
      }
      .dc-empty-title {
        font-weight: 600;
        color: var(--dc-text);
        margin: 0 0 0.3rem;
      }
      .dc-empty p {
        margin: 0 auto 1rem;
        max-width: 46ch;
        line-height: 1.6;
        font-size: 0.9rem;
      }
      .dc-skeleton {
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.04),
          rgba(255, 255, 255, 0.09),
          rgba(255, 255, 255, 0.04)
        );
        background-size: 200% 100%;
        animation: dc-shimmer 1.3s linear infinite;
      }
      @keyframes dc-shimmer {
        to {
          background-position: -200% 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .dc-skeleton {
          animation: none;
        }
      }

      /* ---- the one-time secret ---- */
      .dc-secret {
        border: 1px solid rgba(52, 211, 153, 0.4);
        background: rgba(52, 211, 153, 0.07);
        border-radius: var(--dc-radius);
        padding: 1.15rem 1.25rem;
        margin-bottom: 1.1rem;
      }
      .dc-secret-row {
        display: flex;
        gap: 0.5rem;
        align-items: stretch;
        margin-top: 0.75rem;
        flex-wrap: wrap;
      }
      .dc-secret-value {
        flex: 1;
        min-width: 200px;
        font-family: var(--dc-mono);
        font-size: 0.85rem;
        padding: 0.6rem 0.7rem;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid var(--dc-line);
        color: var(--dc-text);
        overflow-wrap: anywhere;
      }

      /* ---- dialog ---- */
      .dc-scrim {
        position: fixed;
        inset: 0;
        background: rgba(2, 4, 8, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        z-index: 60;
      }
      .dc-dialog {
        background: var(--dc-surface);
        border: 1px solid var(--dc-line-strong);
        border-radius: 12px;
        padding: 1.3rem;
        max-width: 460px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
      }
      .dc-dialog h3 {
        margin: 0 0 0.6rem;
        font-size: 1.05rem;
        font-weight: 700;
      }
      .dc-dialog-body {
        color: var(--dc-muted);
        font-size: 0.9rem;
        line-height: 1.6;
      }
      .dc-dialog-body strong {
        color: var(--dc-text);
      }
      .dc-dialog-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-top: 1.2rem;
        flex-wrap: wrap;
      }

      /* ---- danger zone ---- */
      .dc-danger {
        border-color: rgba(248, 113, 113, 0.32);
      }
      .dc-danger .dc-h2 {
        color: var(--dc-red);
      }
      .dc-danger-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.9rem 0;
        border-top: 1px solid var(--dc-line);
        flex-wrap: wrap;
      }
      .dc-danger-row:first-of-type {
        border-top: 0;
      }
      .dc-danger-row p {
        margin: 0.2rem 0 0;
        color: var(--dc-muted);
        font-size: 0.86rem;
        line-height: 1.55;
        max-width: 54ch;
      }

      /* ---- definition rows ---- */
      .dc-defs {
        display: grid;
        gap: 0.7rem;
      }
      .dc-def {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.9rem;
        align-items: baseline;
      }
      .dc-def dt {
        color: var(--dc-muted);
      }
      .dc-def dd {
        margin: 0;
        font-family: var(--dc-mono);
        font-size: 0.85rem;
        text-align: right;
      }

      /* ---- phones ---- */
      @media (max-width: 860px) {
        .dc-body {
          grid-template-columns: minmax(0, 1fr);
          gap: 1.1rem;
          padding: 1rem 1rem 4rem;
        }
        .dc-rail {
          position: static;
        }
        .dc-rail-scroll {
          flex-direction: row;
          gap: 0.35rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          flex-grow: 0;
          flex-shrink: 0;
          padding-bottom: 0.3rem;
          scrollbar-width: none;
        }
        .dc-rail-scroll::-webkit-scrollbar {
          display: none;
        }
        .dc-rail-item {
          border-left: 0;
          border-bottom: 2px solid transparent;
          border-radius: 7px 7px 0 0;
        }
        .dc-rail-item.is-active {
          border-left: 0;
          border-bottom-color: var(--dc-accent);
        }
        .dc-rail-plan {
          display: none;
        }
        .dc-top-link:not(.dc-top-back) {
          display: none;
        }
        .dc-who-name {
          display: none;
        }
        .dc-h1 {
          font-size: 1.3rem;
        }
        /* The table becomes stacked rows. A four-column table at 375px is a
           horizontal scrollbar nobody finds. */
        .dc-table thead {
          display: none;
        }
        .dc-table,
        .dc-table tbody,
        .dc-table tr,
        .dc-table td {
          display: block;
          width: 100%;
        }
        .dc-table tr {
          padding: 0.9rem 1rem;
          border-bottom: 1px solid var(--dc-line);
        }
        .dc-table td {
          padding: 0.2rem 0;
          border: 0;
          text-align: left;
        }
        .dc-table-num {
          text-align: left;
        }
        .dc-table td[data-label]::before {
          content: attr(data-label);
          display: block;
          font-size: 0.68rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--dc-dim);
          margin-top: 0.5rem;
        }
        .dc-card-head,
        .dc-toolbar,
        .dc-pager {
          padding-left: 1rem;
          padding-right: 1rem;
        }
        .dc-pager {
          flex-direction: column;
          align-items: stretch;
          gap: 0.6rem;
        }
        .dc-pager-btns {
          justify-content: space-between;
        }
        .dc-pager-btns .dc-btn {
          flex: 1;
        }
      }
    `}</style>
  );
}
