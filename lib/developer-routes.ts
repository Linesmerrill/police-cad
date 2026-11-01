/**
 * Where the console's own pages live, which depends on the host it is served
 * from.
 *
 * On the main site the console is at /developer, /developer/keys and so on. On
 * its own host it is at the root: / and /keys. Express rewrites the subdomain's
 * paths onto the /developer routes (app/developer-host.js), so Next only ever
 * sees one route table and there is no build-time base path.
 *
 * Which means a link written as a literal "/developer/keys" is wrong on the
 * subdomain and a link written as "/keys" is wrong on the main site. Every
 * internal link in the console goes through consoleHref so neither host has a
 * hardcoded path.
 *
 * Nav uses plain anchors rather than next/link on purpose. Next's client router
 * pushes the href and then asks the server for that route's payload; on the
 * subdomain "/keys" is not a route Next knows, so client-side navigation would
 * ask for a page that does not exist. A console is a handful of pages people
 * move between deliberately — a full load each time is no real cost, and it
 * removes a whole class of basePath bugs.
 */

const CONSOLE_HOST_PREFIX = 'developer.';

/** True when the page is being served from the console's own host. */
export function onConsoleHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.startsWith(CONSOLE_HOST_PREFIX) || host.startsWith('developer-dev.');
}

/**
 * The prefix the console's pages sit behind. Empty on the console's own host.
 *
 * Server-rendered output always uses /developer: it has no host to read, and
 * /developer is correct on both hosts because the rewrite leaves it alone. The
 * client corrects to the shorter form after hydration.
 */
export function consoleBase(): string {
  return onConsoleHost() ? '' : '/developer';
}

/**
 * An href for a console page. Pass the path within the console, starting with a
 * slash, or '' for the overview.
 *
 *   consoleHref('/keys')  ->  '/developer/keys'  or  '/keys'
 *   consoleHref('')       ->  '/developer'       or  '/'
 */
export function consoleHref(path: string): string {
  const base = consoleBase();
  if (!path || path === '/') return base || '/';
  return `${base}${path}`;
}

/**
 * The main site, for the way back out of the console.
 *
 * Derived from the current hostname rather than hardcoded, so the staging host
 * does not link to production. On the main site this is relative, which keeps
 * the link working on localhost and on police-cad-dev with no configuration.
 */
export function mainSiteHref(path: string): string {
  if (typeof window === 'undefined') return path;
  if (!onConsoleHost()) return path;
  const parts = window.location.hostname.split('.');
  if (parts.length < 3) return path;
  return `https://www.${parts.slice(1).join('.')}${path}`;
}

/** Where the API reference lives. Public, and on the main site. */
export function docsHref(): string {
  return mainSiteHref('/api-docs');
}
