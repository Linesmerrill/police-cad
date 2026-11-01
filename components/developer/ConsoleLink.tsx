'use client';

/**
 * A link between console pages.
 *
 * Client-side navigation, so moving between sections does not reload the
 * document. Plain anchors meant every click on the rail was a full page load,
 * which repeated the first-paint flash on every section change and threw away
 * the account the provider had already fetched.
 *
 * The complication is the console's two addresses. On the main site its pages
 * live under /developer; on its own host they live at the root, and Express
 * rewrites the one onto the other (app/developer-host.js). Next's client router
 * only knows the /developer routes, so on the subdomain it would be asked to
 * navigate to a route that is not in its manifest. There, and only there, this
 * falls back to a real document navigation.
 *
 * The server cannot know the host, so it renders the /developer form; the
 * subdomain corrects itself after hydration. Both are valid on both hosts, so
 * a click before that moment still goes to the right page.
 */

import Link from 'next/link';
import { AnchorHTMLAttributes, ReactNode, useEffect, useState } from 'react';
import { onConsoleHost } from '@/lib/developer-routes';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** The path inside the console: '' for the overview, '/keys', `/keys/${id}`. */
  to: string;
  children: ReactNode;
};

export default function ConsoleLink({ to, children, ...rest }: Props) {
  const [subdomain, setSubdomain] = useState(false);
  useEffect(() => setSubdomain(onConsoleHost()), []);

  if (subdomain) {
    return (
      <a href={to || '/'} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={`/developer${to}`} {...rest}>
      {children}
    </Link>
  );
}
