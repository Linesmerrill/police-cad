'use client';

import { useEffect, useState } from 'react';

// Sign in with Google and Apple.
//
// Renders nothing until it knows a provider is configured, and nothing at all
// if neither is. A button that cannot work is worse than no button: it reads as
// broken rather than absent.
//
// The buttons are plain links. The flow is entirely server-side — /auth/google
// and /auth/apple start it, the provider posts back to a callback, and the
// session is minted there — so there is no client-side SDK, no client secret in
// the bundle, and nothing to go wrong if JavaScript is slow or blocked.

type Providers = { google: boolean; apple: boolean };

// Brand marks, inline so they render with the page rather than after it.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86a5.36 5.36 0 0 1-5.03-3.7H1.05v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H1.05a9 9 0 0 0 0 8.12l2.92-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.59A8.99 8.99 0 0 0 1.05 4.94l2.92 2.34A5.36 5.36 0 0 1 9 3.58Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 14.25 3.51 5.77 9.05 5.5c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 3.91l.01-.02ZM12.03 5.44C11.88 3.2 13.7 1.35 15.79 1.2c.29 2.58-2.34 4.5-3.76 4.24Z" />
    </svg>
  );
}

// What the buttons say. Both brands allow a sign-up wording on a registration
// screen and a neutral one elsewhere, and "Continue with" on a Register page
// reads as though the account already exists. One prop rather than a second
// component: everything else about these buttons is identical, and two copies
// would drift.
type SocialMode = 'login' | 'signup';

function buttonLabel(mode: SocialMode, provider: 'Google' | 'Apple') {
  return mode === 'signup' ? `Sign up with ${provider}` : `Continue with ${provider}`;
}

export default function SocialSignIn({
  redirect,
  mode = 'login',
}: {
  redirect?: string;
  mode?: SocialMode;
}) {
  const [providers, setProviders] = useState<Providers | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/social/providers', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setProviders(data);
      })
      .catch(() => {
        // Nothing to show and nothing to say: the password form below works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!providers || (!providers.google && !providers.apple)) return null;

  const href = (provider: string) =>
    redirect ? `/auth/${provider}?redirect=${encodeURIComponent(redirect)}` : `/auth/${provider}`;

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    width: '100%',
    padding: '0.75rem 0.875rem',
    borderRadius: '0.625rem',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.9375rem',
    textDecoration: 'none',
    lineHeight: 1.2,
    // One line, always. Side by side these buttons got 170px each while the
    // label alone wants about 154px plus 60px of icon, gap and padding, so
    // every width wrapped "Continue with Google" onto two lines.
    whiteSpace: 'nowrap',
    transition: 'background 150ms ease, border-color 150ms ease',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* globals.css removes the outline from every a and button, so focus has
          to be put back explicitly or these are unusable by keyboard. */}
      <style jsx>{`
        .social-btn:focus-visible {
          outline: 2px solid #38bdf8;
          outline-offset: 2px;
        }
        .social-btn:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(255, 255, 255, 0.32) !important;
        }
      `}</style>

      {/* Stacked rather than side by side: the card is about 350px wide and a
          one-line label needs roughly 215px of button, so two across never fit
          without wrapping. Full width also gives each button a larger target. */}
      <div
        className="social-row"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {providers.google && (
          <a className="social-btn" href={href('google')} style={buttonStyle}>
            <GoogleMark />
            <span>{buttonLabel(mode, 'Google')}</span>
          </a>
        )}
        {providers.apple && (
          <a className="social-btn" href={href('apple')} style={buttonStyle}>
            <AppleMark />
            <span>{buttonLabel(mode, 'Apple')}</span>
          </a>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '1.5rem 0 0',
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.14)' }} />
        <span
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.8125rem',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          or use your email
        </span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.14)' }} />
      </div>
    </div>
  );
}
