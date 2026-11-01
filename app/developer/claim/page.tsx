'use client';

/**
 * Where a player redeems the code a game server showed them, and takes
 * ownership of the characters a mod made on their behalf.
 *
 * This page is the whole point of the provisioning design: a mod can create an
 * account and fill it with characters, but only the player can claim it. So the
 * page has one job and says one thing, and it assumes the person arriving has
 * never seen it before and is reading it on a phone next to a game.
 */

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type Moved = {
  civilians: number;
  vehicles: number;
  firearms: number;
  licenses: number;
  communities: number;
};

type ClaimResult = {
  claimed: boolean;
  moved?: Moved;
  message?: string;
};

// Grouped as the code is shown in game (XXXX-XXXX-XX), which is what a player
// is copying from. Case and dashes do not matter; the server normalizes.
function formatCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 10);
  const parts = [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 10)].filter(Boolean);
  return parts.join('-');
}

export default function ClaimPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimResult | null>(null);

  async function submit(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'That did not work');
      setResult(data as ClaimResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work');
    } finally {
      setBusy(false);
    }
  }

  const moved = result?.moved;
  const movedLines = moved
    ? [
        [moved.civilians, 'character', 'characters'],
        [moved.vehicles, 'vehicle', 'vehicles'],
        [moved.firearms, 'firearm', 'firearms'],
        [moved.licenses, 'license', 'licenses'],
        [moved.communities, 'community', 'communities'],
      ]
        .filter(([n]) => Number(n) > 0)
        .map(([n, one, many]) => `${n} ${Number(n) === 1 ? one : many}`)
    : [];

  return (
    <>
      <style jsx global>{`
        :root {
          --rp-bg: #08090c;
          --rp-surface: #0e1117;
          --rp-glass: rgba(255, 255, 255, 0.04);
          --rp-glass-border: rgba(255, 255, 255, 0.08);
          --rp-text: #e2e8f0;
          --rp-text-muted: #94a3b8;
          --rp-text-dim: #64748b;
          --rp-accent: #38bdf8;
          --rp-green: #34d399;
          --rp-red: #f87171;
          --rp-radius: 12px;
        }
        .claim-page {
          background: var(--rp-bg);
          color: var(--rp-text);
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
        }
        .claim-shell { max-width: 520px; margin: 0 auto; padding: 3rem 1.25rem 5rem; }
        .claim-card {
          background: var(--rp-surface);
          border: 1px solid var(--rp-glass-border);
          border-radius: var(--rp-radius);
          padding: 1.75rem;
        }
        .claim-h1 { font-size: 1.75rem; font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
        .claim-sub { color: var(--rp-text-muted); line-height: 1.6; margin: 0 0 1.75rem; }
        .claim-input {
          width: 100%; padding: 0.9rem 1rem; border-radius: 10px;
          background: rgba(0, 0, 0, 0.4); border: 1px solid var(--rp-glass-border);
          color: var(--rp-text); font-size: 1.4rem; letter-spacing: 0.18em;
          text-align: center; text-transform: uppercase;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .claim-input:focus { outline: 2px solid var(--rp-accent); outline-offset: 1px; }
        .claim-btn {
          width: 100%; margin-top: 1rem; padding: 0.85rem 1rem;
          border-radius: 10px; border: 0; background: var(--rp-accent);
          color: #04121c; font-weight: 700; font-size: 1rem;
          font-family: inherit; cursor: pointer;
        }
        .claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .claim-btn-ghost {
          background: var(--rp-glass); color: var(--rp-text);
          border: 1px solid var(--rp-glass-border);
        }

        /* app/globals.css strips outlines from every a and button, so focus
           has to be put back explicitly or the page is unusable by keyboard. */
        .claim-btn:focus-visible,
        .claim-page a:focus-visible {
          outline: 2px solid var(--rp-accent);
          outline-offset: 2px;
        }
        .claim-notice { border-radius: 10px; padding: 0.9rem 1rem; margin-bottom: 1.25rem; line-height: 1.5; font-size: 0.93rem; }
        .claim-notice-err { background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.35); color: #fecaca; }
        .claim-notice-ok { background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.35); color: #a7f3d0; }
        .claim-steps { color: var(--rp-text-dim); font-size: 0.87rem; line-height: 1.7; margin: 1.75rem 0 0; padding-left: 1.15rem; }
        .claim-or { text-align: center; color: var(--rp-text-dim); font-size: 0.8rem; margin: 1.25rem 0 0.75rem; }
      `}</style>

      <div className="claim-page">
        <Navbar />
        <main className="claim-shell">
          {result?.claimed ? (
            <div className="claim-card" data-testid="claim-success">
              <h1 className="claim-h1">That&apos;s yours now</h1>
              <div className="claim-notice claim-notice-ok">
                {result.message || 'Your in-game characters are now on this account.'}
              </div>
              {movedLines.length > 0 && (
                <p style={{ color: 'var(--rp-text-muted)', lineHeight: 1.7, margin: '0 0 1.5rem' }}>
                  Moved across: {movedLines.join(', ')}.
                </p>
              )}
              <a className="claim-btn" href="/communities" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Go to my communities
              </a>
            </div>
          ) : (
            <div className="claim-card">
              <h1 className="claim-h1">Claim your characters</h1>
              <p className="claim-sub">
                Played on a server that uses our API? Enter the code it showed you and everything
                you made in game lands on this account.
              </p>

              {error && <div className="claim-notice claim-notice-err">{error}</div>}

              <label htmlFor="claim-code" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--rp-text-muted)', marginBottom: '0.4rem' }}>
                Your code
              </label>
              <input
                id="claim-code"
                className="claim-input"
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
                placeholder="XXXX-XXXX-XX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                data-testid="claim-code-input"
              />
              <button
                type="button"
                className="claim-btn"
                disabled={busy || code.replace(/-/g, '').length < 6}
                onClick={() => submit('/api/developer/claim', { code })}
                data-testid="claim-submit"
              >
                {busy ? 'Checking…' : 'Claim'}
              </button>

              <div className="claim-or">OR</div>
              <button
                type="button"
                className="claim-btn claim-btn-ghost"
                disabled={busy}
                onClick={() => submit('/api/developer/claim/discord')}
                data-testid="claim-discord"
              >
                I played with my Discord account linked
              </button>

              <ol className="claim-steps">
                <li>Codes last 30 minutes and work once.</li>
                <li>If yours has expired, ask the server to show you a new one.</li>
                <li>
                  Already have characters here? They stay. Claiming adds your in-game ones to this
                  same account.
                </li>
              </ol>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
