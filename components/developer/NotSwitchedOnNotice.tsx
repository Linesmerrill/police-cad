'use client';

/**
 * Shown when the Developer API is switched on but not yet configured.
 *
 * Production was found in exactly this state: the surface was enabled, the
 * signing secret was not set, and the console happily issued keys. Those keys
 * hash against an empty secret, so they match nothing now and will match
 * nothing once the secret is set — a developer would be holding a credential
 * that has never worked, with nothing on screen to explain it.
 *
 * The API refuses to mint in this state. This is the other half: say so before
 * someone tries, and make clear it is our setting and not their account.
 */

import { docsHref } from '@/lib/developer-routes';

export default function NotSwitchedOnNotice({ compact }: { compact?: boolean }) {
  return (
    <div className="dc-notice dc-notice-warn" role="status" data-testid="api-not-switched-on">
      <div className="dc-notice-body">
        <strong>The Developer API isn&apos;t switched on yet.</strong>{' '}
        New keys can&apos;t be created until it is. Nothing is wrong with your account — this is a
        server setting on our side, and it is being turned on.
        {compact ? null : (
          <>
            {' '}
            Existing pages still work, and you can read the{' '}
            <a href={docsHref()}>API reference</a> in the meantime.
          </>
        )}
      </div>
    </div>
  );
}
