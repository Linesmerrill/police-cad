// Countdown target resolution for the Next.js side of the site.
//
// The same rules exist in two other places, because the three runtimes cannot
// share a module: `public/js/countdown.js` for the EJS pages (a standalone
// browser script, no build step) and `police-cad-app/utils/countdown.js` for
// the mobile app. Change one, change all three. The mobile copy carries the
// unit tests.

export const COUNTDOWN_MODE_LOCAL_MIDNIGHT = "localMidnight";
export const COUNTDOWN_MODE_INSTANT = "instant";

export const DEFAULT_POST_LAUNCH_HOURS = 72;

export type CountdownPhase = "counting" | "launched" | "hidden";

export interface Countdown {
  slug: string;
  title: string;
  subtitle?: string;
  launchDate?: string;
  launchesAt?: string;
  mode?: string;
  theme?: string;
  postLaunchHours?: number;
  ctaLabel?: string;
  ctaUrl?: string;
  active?: boolean;
}

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface CountdownState {
  phase: CountdownPhase;
  target: Date | null;
  remaining: Remaining | null;
}

// Baked-in fallback so the strip renders even if the API is unreachable or
// predates the countdowns endpoint. Whatever the API returns wins.
export const GTA6_FALLBACK: Countdown = {
  slug: "gta6",
  title: "Grand Theft Auto VI",
  subtitle: "Back to Vice City.",
  launchDate: "2026-11-19",
  launchesAt: "2026-11-18T23:00:00Z",
  mode: COUNTDOWN_MODE_LOCAL_MIDNIGHT,
  theme: "gta6",
  postLaunchHours: DEFAULT_POST_LAUNCH_HOURS,
  active: true,
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Resolves the instant a countdown is aiming at.
//
// `localMidnight` returns midnight on launchDate in the visitor's own timezone.
// That is deliberate: console storefronts list GTA 6 at local midnight in every
// market rather than one synchronized worldwide moment, so a single UTC instant
// converted to local time would read zero well after a New Zealand player could
// already play, and well before a Los Angeles player could.
//
// Returns null when the record cannot produce a target, so callers render
// nothing instead of counting down to NaN.
export const resolveTarget = (countdown: Countdown | null | undefined): Date | null => {
  if (!countdown) return null;

  if (countdown.mode === COUNTDOWN_MODE_INSTANT) {
    if (!countdown.launchesAt) return null;
    const at = new Date(countdown.launchesAt);
    return Number.isNaN(at.getTime()) ? null : at;
  }

  const match = DATE_ONLY.exec(String(countdown.launchDate || ""));
  if (!match) return null;

  const [, year, month, day] = match;
  // Month is 0-indexed. This constructor reads as local time, which is the
  // point — the same call yields a different instant per timezone.
  const target = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  return Number.isNaN(target.getTime()) ? null : target;
};

const postLaunchMs = (countdown: Countdown): number => {
  const hours = Number(countdown?.postLaunchHours);
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_POST_LAUNCH_HOURS) * 3600000;
};

export const splitRemaining = (ms: number): Remaining => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

// The single call the component makes each tick.
//
// Retirement is part of this on purpose: without it a countdown that has passed
// becomes a negative timer, or dead UI nobody remembers to take down.
export const countdownState = (
  countdown: Countdown | null | undefined,
  now: Date = new Date()
): CountdownState => {
  const hidden: CountdownState = { phase: "hidden", target: null, remaining: null };

  if (!countdown || countdown.active === false) return hidden;

  const target = resolveTarget(countdown);
  if (!target) return hidden;

  const delta = target.getTime() - now.getTime();
  if (delta > 0) {
    return { phase: "counting", target, remaining: splitRemaining(delta) };
  }
  if (-delta < postLaunchMs(countdown)) {
    return { phase: "launched", target, remaining: null };
  }
  return hidden;
};

// "Thu, Nov 19, 12:00 AM EST" — the visitor's own local time.
export const formatLocalTarget = (target: Date | null): string => {
  if (!target) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(target);
  } catch {
    return target.toDateString();
  }
};

// Picks the countdown to feature from an API response: the soonest one that is
// still worth showing.
export const pickCountdown = (
  list: unknown,
  slug?: string,
  now: Date = new Date()
): Countdown | null => {
  if (!Array.isArray(list)) return null;
  const candidates = (list as Countdown[]).filter(
    (c) => c && (!slug || c.slug === slug) && countdownState(c, now).phase !== "hidden"
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => {
    const at = resolveTarget(a);
    const bt = resolveTarget(b);
    return (at ? at.getTime() : Infinity) - (bt ? bt.getTime() : Infinity);
  })[0];
};
