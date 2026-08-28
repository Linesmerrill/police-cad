'use client';

import { useEffect, useState } from 'react';
import { countdownState, type Countdown, type CountdownState } from '@/lib/countdown';

// "Sunset Strip" — the strip is the horizon. Styling lives in
// public/css/gta6-countdown.css, shared verbatim with the EJS pages so the two
// surfaces cannot drift apart. Loaded over HTTP from /static (Express serves
// public/ there) rather than imported, because the same file has to reach both.

const DISMISS_KEY = 'gta6_countdown_dismissed_gta6';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

// The zone is rendered on its own line, so the date line deliberately omits
// it rather than repeating it.
const formatLocal = (target: Date | null): string => {
  if (!target) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(target);
  } catch {
    return target.toDateString();
  }
};

const localZone = (target: Date): string => {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: 'short',
    }).formatToParts(target);
    const zone = parts.find((p) => p.type === 'timeZoneName');
    if (zone) return `your time · ${zone.value}`;
  } catch {
    /* fall through */
  }
  return 'your local time';
};

export default function Gta6Countdown() {
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [state, setState] = useState<CountdownState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [tickKey, setTickKey] = useState(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === 'true') setDismissed(true);
    } catch {
      // Storage throws in some private modes. Showing the strip is the safe
      // failure, not hiding it.
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/countdown')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (alive && json?.countdown) setCountdown(json.countdown as Countdown);
      })
      .catch(() => {
        // The strip is decoration; a failed lookup means no strip, not an error.
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!countdown) return;

    const update = () => {
      const next = countdownState(countdown);
      setState(next);
      // Retirement is the point of the hidden phase: without it a passed
      // countdown becomes a negative timer.
      if (next.phase === 'hidden') setCountdown(null);
      setTickKey((k) => k + 1);
    };

    update();
    setEntered(true);
    const id = setInterval(update, 1000);

    // Background tabs throttle intervals; resync on return.
    const onVisible = () => {
      if (!document.hidden) update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [countdown]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      /* dismissing for this pageview only is an acceptable degradation */
    }
    setDismissed(true);
  };

  if (dismissed || !countdown || !state || state.phase === 'hidden') return null;

  const r = state.remaining;
  const launched = state.phase === 'launched';

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/static/css/gta6-countdown.css?v=2" />
      <aside
        className={`gta6-strip${entered ? ' gta6-strip--enter' : ''}`}
        data-phase={state.phase}
        aria-label={`${countdown.title} launch countdown`}
      >
        <span className="gta6-strip__sun" aria-hidden="true" />
        <span className="gta6-strip__grain" aria-hidden="true" />

        <div className="gta6-strip__inner">
          <div className="gta6-strip__lede">
            <p className="gta6-strip__eyebrow">Countdown</p>
            <h2 className="gta6-strip__title">{countdown.title}</h2>
            {countdown.subtitle ? (
              <p className="gta6-strip__subtitle">{countdown.subtitle}</p>
            ) : null}
          </div>

          {!launched && r ? (
            <ol className="gta6-clock" aria-hidden="true">
              <li className="gta6-unit">
                <span className="gta6-unit__value">{r.days}</span>
                <span className="gta6-unit__label">Days</span>
              </li>
              <li className="gta6-sep">:</li>
              <li className="gta6-unit">
                <span className="gta6-unit__value">{pad(r.hours)}</span>
                <span className="gta6-unit__label">Hrs</span>
              </li>
              <li className="gta6-sep">:</li>
              <li className="gta6-unit">
                <span className="gta6-unit__value">{pad(r.minutes)}</span>
                <span className="gta6-unit__label">Min</span>
              </li>
              <li className="gta6-sep">:</li>
              {/* Keyed so the heartbeat animation replays each second. Only the
                  seconds column — a pulse on every unit would read as jitter. */}
              <li className="gta6-unit gta6-unit--tick" key={tickKey}>
                <span className="gta6-unit__value">{pad(r.seconds)}</span>
                <span className="gta6-unit__label">Sec</span>
              </li>
            </ol>
          ) : null}

          {launched ? <p className="gta6-strip__out">Out now</p> : null}

          <div className="gta6-strip__meta">
            <p className="gta6-strip__local">
              {formatLocal(state.target)}
              <span className="gta6-strip__zone">
                {state.target ? localZone(state.target) : ''}
              </span>
            </p>
            {countdown.ctaUrl && countdown.ctaLabel ? (
              <a
                className="gta6-strip__cta"
                href={countdown.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {countdown.ctaLabel}
              </a>
            ) : null}
          </div>

          {/* Announced once a minute rather than every second, which would be
              unusable read aloud. */}
          <p className="gta6-sr-only" role="status">
            {launched
              ? 'Out now.'
              : r
                ? `${r.days} days, ${r.hours} hours and ${r.minutes} minutes until launch.`
                : ''}
          </p>
        </div>

        <button
          type="button"
          className="gta6-strip__dismiss"
          onClick={handleDismiss}
          aria-label={`Hide the ${countdown.title} countdown`}
        >
          &times;
        </button>

        <span className="gta6-strip__horizon" aria-hidden="true" />
      </aside>
    </>
  );
}
