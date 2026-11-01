/**
 * What we tell developers to call, and how to authenticate.
 *
 * One module, because these two facts were wrong in different places at the
 * same time: the docs named a hostname with no DNS record, and the console
 * named a header the API has never read. Both are now stated once.
 */

/**
 * The origin developers should call, without a trailing slash.
 *
 * This hostname had no DNS record when the docs were written, so every example
 * built on it failed to resolve; it now has a Heroku custom domain and a
 * proxied Cloudflare CNAME. The value is here, once, so a future move costs
 * one line instead of a hunt through the quickstart, the OpenAPI servers list,
 * the capability map and this console — which is how it came to be wrong.
 */
export const DEVELOPER_API_BASE_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_API_BASE_URL?.replace(/\/+$/, '') ||
  'https://api.linespolice-cad.com';

/** The full prefix for the developer surface. */
export const DEVELOPER_API_URL = `${DEVELOPER_API_BASE_URL}/api/v1/dev`;

/**
 * The only header the middleware reads.
 *
 * The console used to say `X-Developer-Key`, which this API has never
 * accepted, so every request a developer built from that instruction was
 * rejected with a message about a different header entirely.
 */
export const DEVELOPER_API_AUTH_HEADER = 'Authorization';

/** How the key is presented in that header. */
export const DEVELOPER_API_AUTH_SCHEME = 'Bearer';

/** `Authorization: Bearer` — the thing to put in copy. */
export const DEVELOPER_API_AUTH_EXAMPLE = `${DEVELOPER_API_AUTH_HEADER}: ${DEVELOPER_API_AUTH_SCHEME}`;
