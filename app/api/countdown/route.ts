import { NextResponse } from 'next/server';
import { GTA6_FALLBACK, pickCountdown, type Countdown } from '@/lib/countdown';

// Server-side proxy for the platform countdown.
//
// The Go API sits behind a bearer token and a gateway key, neither of which
// should reach the browser, so the landing page asks this route instead. It is
// also where the caching lives: countdowns change roughly never, and the
// landing page is the busiest thing we serve.
//
// The ceiling on CACHE_TTL is the delay between correcting a slipped launch
// date in Mongo and the site showing the new one.
const CACHE_TTL = 5 * 60 * 1000;

let cached: Countdown | null = null;
let cachedAt = 0;
let cacheValid = false;

export async function GET() {
  const now = Date.now();
  if (cacheValid && now - cachedAt < CACHE_TTL) {
    return NextResponse.json({ countdown: cached });
  }

  const base = process.env.POLICE_CAD_API_URL;
  if (!base) {
    return NextResponse.json({ countdown: GTA6_FALLBACK });
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.POLICE_CAD_API_TOKEN) {
      headers['Authorization'] = process.env.POLICE_CAD_API_TOKEN;
    }
    if (process.env.POLICE_CAD_API_KEY) {
      headers['X-API-Key'] = process.env.POLICE_CAD_API_KEY;
    }

    // Bounded so a slow API degrades the strip rather than the landing page.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    let list: unknown;
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/api/v1/countdowns?surface=web`, {
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`countdowns ${res.status}`);
      list = await res.json();
    } finally {
      clearTimeout(timeout);
    }

    // A deliberately deactivated countdown is a real answer, so null gets
    // cached too — otherwise every request would retry a healthy API.
    cached = pickCountdown(list, 'gta6');
    cachedAt = now;
    cacheValid = true;
    return NextResponse.json({ countdown: cached });
  } catch {
    // Do not cache the fallback: we want the next request to try the API again
    // rather than sit on a stale date for five minutes after a blip.
    return NextResponse.json({ countdown: GTA6_FALLBACK });
  }
}
