'use client';

/**
 * The console's layout.
 *
 * A route group, so /developer/claim — a player redeeming a code off a game
 * screen, not a developer administering keys — is not wrapped in a console
 * frame it has no use for.
 *
 * The active section comes from the path rather than from a prop on each page.
 * Express rewrites the subdomain's URLs onto these same /developer routes
 * (app/developer-host.js), so the path Next sees is the same on both hosts and
 * this stays correct at either URL.
 */

import { usePathname } from 'next/navigation';
// Imported here rather than inlined in the shell, so the rules are in the
// build's CSS and reach the browser as a <link> in the initial HTML. See the
// file's own header for what went wrong when they did not.
import './console.css';
import ConsoleProvider from '@/components/developer/ConsoleProvider';
import type { ConsoleSection } from '@/components/developer/ConsoleShell';

function sectionFor(pathname: string | null): ConsoleSection {
  const path = pathname || '';
  if (path.startsWith('/developer/usage')) return 'usage';
  if (path.startsWith('/developer/keys')) return 'keys';
  if (path.startsWith('/developer/settings')) return 'settings';
  return 'overview';
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleProvider section={sectionFor(usePathname())}>{children}</ConsoleProvider>;
}
