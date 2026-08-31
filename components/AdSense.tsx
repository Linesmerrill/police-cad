'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

/**
 * Loads the Google AdSense base tag on Next.js pages.
 *
 * Every page migrated from EJS to Next.js silently lost its ads: the EJS views
 * pull the tag in through views/ad-header.ejs, and nothing in the App Router
 * ever replaced it. That included the home page. This is the replacement, and
 * it belongs in the root layout so a future page cannot miss it the same way.
 *
 * Auto ads mean the tag is all that is needed -- placement is decided in the
 * AdSense dashboard rather than by markup on the page, so there is no per-page
 * work to keep in step.
 */

const AD_CLIENT = 'ca-pub-3842696805773142';

// Mirrors _skipAdsense in views/ad-header.ejs. Paying for Premium buys fewer
// ads, and that promise has to hold on the Next.js pages too -- otherwise
// restoring ads here quietly takes something away from subscribers.
function paysForFewerAds(user: any): boolean {
  const sub = user?.subscription;
  if (!sub?.active) return false;
  return sub.plan === 'premium' || sub.plan === 'premium_plus';
}

export default function AdSense() {
  // Three states, and the distinction matters: null means "still asking", and
  // loading the tag then would show ads to a subscriber for the moment before
  // the answer arrives.
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch('/api/user/current', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted) setAllowed(!paysForFewerAds(data?.user));
      })
      .catch(() => {
        // Logged out, or the lookup failed. Both are the common case for the
        // pages that carry the most ad traffic, so show ads rather than
        // withholding them over a failed request.
        if (mounted) setAllowed(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!allowed) return null;

  return (
    <Script
      id="adsbygoogle-init"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
