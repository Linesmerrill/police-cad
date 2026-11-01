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

import { ReactNode, useEffect } from 'react';
import { docsHref, mainSiteHref } from '@/lib/developer-routes';
import ConsoleLink from './ConsoleLink';
import type { SessionUser } from '@/lib/developer-api';

export type ConsoleSection = 'overview' | 'usage' | 'keys' | 'settings';

const NAV: { id: ConsoleSection; label: string; path: string; icon: ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '',
    icon: (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z" />
      </svg>
    ),
  },
  {
    id: 'usage',
    label: 'Usage',
    path: '/usage',
    icon: (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M2 11h2v3H2zM6 7h2v7H6zM10 9h2v5h-2zM14 3h-2v11h2z" />
      </svg>
    ),
  },
  {
    id: 'keys',
    label: 'API keys',
    path: '/keys',
    icon: (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M10 1a5 5 0 0 0-4.8 6.4L1 11.6V15h3.4l.6-.6V13h1.4l.6-.6V11h1.4l1-1A5 5 0 1 0 10 1zm1.6 4.4a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
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

  // The tab should say where you are and whose product this is. These pages are
  // client components, so they cannot export Next metadata; the shell already
  // knows the section, so it sets the title. The favicon is the site's, from
  // the root layout.
  useEffect(() => {
    const page = NAV.find((item) => item.id === active)?.label || 'Developers';
    document.title = `${page} · LPC Developers`;
  }, [active]);

  return (
    <div className="dc">
      <header className="dc-top">
        <div className="dc-top-in">
          <ConsoleLink className="dc-brand" to={''}>
            {/* The same badge the main site's nav and footer use, from the same
                path, so this reads as part of linespolice-cad.com rather than
                as a console that could belong to anyone. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="dc-brand-logo"
              src="/static/images/lines-police-cad-discord-logo-2024-github-profile.png"
              alt="Lines Police CAD"
              // The asset is 740x740. Without these it paints at full size
              // before the stylesheet lands, which is the same failure the
              // unsized SVGs had.
              width={28}
              height={28}
            />
            <span className="dc-brand-text">
              LPC<span className="dc-brand-dim">&nbsp;Developers</span>
            </span>
          </ConsoleLink>

          <nav className="dc-top-links" aria-label="Elsewhere">
            <a className="dc-top-link" href={docsHref()}>
              API reference
            </a>
            {/* The way back out. On the subdomain this is an absolute link to
                the main site, derived from the current hostname rather than
                hardcoded, so staging does not link to production. */}
            <a className="dc-top-link dc-top-back" href={mainSiteHref('/communities')}>
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" className="dc-back-icon">
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
              <ConsoleLink
                key={item.id}
                className={`dc-rail-item${active === item.id ? ' is-active' : ''}`}
                to={item.path}
                aria-current={active === item.id ? 'page' : undefined}
              >
                <span className="dc-rail-icon">{item.icon}</span>
                {item.label}
              </ConsoleLink>
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

