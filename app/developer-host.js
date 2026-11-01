// Serving the developer console on its own host, developer.linespolice-cad.com.
//
// Option A from the proposal: the same Express/Next app answers both hosts,
// rather than a second deploy. One session, one codebase, one release. A
// separate app would duplicate auth and double the deploys for a surface that
// shares every one of its endpoints with the main site.
//
// Everything here is inert until the environment says otherwise, so this ships
// dark and Hark can do the DNS and the Heroku domain whenever he likes:
//
//   DEVELOPER_CONSOLE_HOST    the console's hostname. Setting it makes the app
//                             answer that host. Nothing else changes: www keeps
//                             serving /developer exactly as it does today.
//   DEVELOPER_CONSOLE_CUTOVER "true" flips the switch — /developer/* on the
//                             main site 301s to the subdomain, and the session
//                             cookie widens to the parent domain so the two
//                             hosts share a sign-in.
//   SESSION_COOKIE_DOMAIN     the cookie's domain, default ".linespolice-cad.com".
//
// The order matters, and it is the reason the cutover is one flag rather than
// two. Widening the cookie is what lets the subdomain see a session at all, so
// it has to be in effect on the same response that issues the redirect. See
// upgradeSessionCookieDomain below for the part that is easy to get wrong.

var DEFAULT_COOKIE_DOMAIN = ".linespolice-cad.com";

// Paths that must be served as-is on the console host rather than rewritten
// into the console: framework assets, the API proxies the console itself calls,
// and the auth routes a sign-in bounce lands on.
var PASSTHROUGH_PREFIXES = [
  "/_next/",
  "/static/",
  "/api/",
  "/favicon",
  "/robots.txt",
  "/sitemap",
  "/health",
];

var PASSTHROUGH_EXACT = ["/logout", "/login"];

function consoleHost() {
  var host = process.env.DEVELOPER_CONSOLE_HOST;
  return typeof host === "string" && host.trim() ? host.trim().toLowerCase() : "";
}

function cutoverEnabled() {
  return String(process.env.DEVELOPER_CONSOLE_CUTOVER || "").toLowerCase() === "true";
}

function cookieDomain() {
  var domain = process.env.SESSION_COOKIE_DOMAIN;
  return typeof domain === "string" && domain.trim() ? domain.trim() : DEFAULT_COOKIE_DOMAIN;
}

// sessionCookieDomain is what app.js puts on the session cookie.
//
// Undefined until the cutover, which keeps today's cookie host-only and means
// nobody is signed out by deploying this. Flipping it changes the cookie's
// scope, so every existing session is replaced once — one sign-in, for
// everybody, whenever Merrill chooses the moment.
function sessionCookieDomain() {
  if (!cutoverEnabled()) return undefined;
  return cookieDomain();
}

// requestHost is the host the browser asked for, without its port.
function requestHost(req) {
  var host = req.get("Host") || "";
  return String(host).split(":")[0].toLowerCase();
}

function isConsoleHost(req) {
  var configured = consoleHost();
  return configured !== "" && requestHost(req) === configured;
}

function isPassthrough(path) {
  for (var i = 0; i < PASSTHROUGH_EXACT.length; i++) {
    if (path === PASSTHROUGH_EXACT[i]) return true;
  }
  for (var j = 0; j < PASSTHROUGH_PREFIXES.length; j++) {
    if (path.indexOf(PASSTHROUGH_PREFIXES[j]) === 0) return true;
  }
  return false;
}

// mainSiteOrigin is the main site, derived from the console's own hostname
// rather than hardcoded.
//
// developer.linespolice-cad.com -> https://www.linespolice-cad.com. Deriving it
// keeps staging working: developer-dev.herokuapp.com would otherwise be sent to
// production, which is the sort of thing nobody notices until it matters.
function mainSiteOrigin() {
  var host = consoleHost();
  if (!host) return "";
  var parts = host.split(".");
  if (parts.length < 3) return "https://" + host;
  return "https://www." + parts.slice(1).join(".");
}

// rewriteConsoleHost maps the console host's own URLs onto the Next routes.
//
// On the subdomain the console lives at the root: `/` is the overview, `/keys`
// is the key list. Next only knows these pages as `/developer/*`, so the path
// is prefixed here and the React app is none the wiser. That is what lets the
// same pages work at either URL with no basePath and no second build.
//
// `/developer/...` is left alone so a pasted link keeps working on either host.
function rewriteConsoleHost(req, res, next) {
  if (!isConsoleHost(req)) return next();
  var path = req.path || "/";
  if (isPassthrough(path)) return next();
  if (path === "/developer" || path.indexOf("/developer/") === 0) return next();

  var suffix = path === "/" ? "" : path;
  var query = req.originalUrl.indexOf("?") === -1 ? "" : req.originalUrl.slice(req.originalUrl.indexOf("?"));
  req.url = "/developer" + suffix + query;
  return next();
}

// bounceConsoleSignIn sends a signed-out console visitor to the main site to
// sign in, and brings them back.
//
// Sign-in has to happen on the main site for two reasons. The Google and Apple
// redirect URIs are registered for www and the apex only, so an OAuth round
// trip started on the subdomain would be refused by the provider; and the
// session cookie is written by the main site, so that is where it has to be
// issued. The console therefore never renders a sign-in form of its own.
//
// Without this the subdomain would use the ordinary guard, redirect to its own
// /login, and the console would ask people to sign in on a host that cannot
// sign anybody in.
function bounceConsoleSignIn(req, res, next) {
  if (!isConsoleHost(req)) return next();
  if (isPassthrough(req.path || "/")) return next();
  if (req.isAuthenticated && req.isAuthenticated()) return next();

  var origin = mainSiteOrigin();
  if (!origin) return next();

  // The return path is the console page on the main site, which the cutover
  // redirect then hands back to the subdomain. A relative path, so the main
  // site's own open-redirect guard accepts it.
  //
  // rewriteConsoleHost has already run and rewritten req.url, so req.path is
  // usually "/developer/..." by now. Prefixing unconditionally produced
  // "/developer/developer/keys" — a path that exists nowhere, which the unit
  // test missed because its fake request held `path` fixed while the real one
  // derives it from `url`.
  var current = req.path || "/";
  var target;
  if (current === "/developer" || current.indexOf("/developer/") === 0) {
    target = current;
  } else {
    target = current === "/" ? "/developer" : "/developer" + current;
  }
  // Carry the query string, so a link to /usage?days=90 comes back as that
  // page rather than its default.
  var q = req.originalUrl.indexOf("?");
  if (q !== -1) target += req.originalUrl.slice(q);
  return res.redirect(302, origin + "/login?redirect=" + encodeURIComponent(target));
}

// upgradeSessionCookieDomain re-issues the session cookie once per session.
//
// This is the part that is easy to get wrong. express-session runs with
// `resave: false`, so an established session's cookie is never sent again — it
// would still be scoped to www after the cutover, the subdomain would not see
// it, and a redirect to the subdomain would bounce the visitor back to the main
// site forever.
//
// Writing one field marks the session modified, which makes express-session
// issue Set-Cookie with the widened domain on this very response. Doing it
// before the redirect below means the browser stores the shared cookie and then
// follows the redirect carrying it. One extra session write per person, once.
function upgradeSessionCookieDomain(req) {
  if (!cutoverEnabled() || !req.session) return;
  if (!(req.isAuthenticated && req.isAuthenticated())) return;
  if (req.session.cookieDomainWidened === true) return;
  req.session.cookieDomainWidened = true;
}

// redirectConsolePaths moves /developer/* on the main site to the subdomain.
//
// Behind the cutover flag, so the old URLs keep serving the console until the
// DNS exists. Afterwards they 301 rather than 302: this is a permanent move,
// and the docs, the footer and whatever people have bookmarked should end up
// pointing at the new host on their own.
function redirectConsolePaths(req, res, next) {
  if (!cutoverEnabled()) return next();
  var host = consoleHost();
  if (!host || isConsoleHost(req)) return next();

  var path = req.path || "";
  if (path !== "/developer" && path.indexOf("/developer/") !== 0) return next();

  // /developer/claim is a player redeeming a code from a game screen, not a
  // developer administering keys. It stays on the main site, where that player
  // already has a session.
  if (path === "/developer/claim" || path.indexOf("/developer/claim/") === 0) return next();

  upgradeSessionCookieDomain(req);

  var suffix = path === "/developer" ? "/" : path.slice("/developer".length);
  var query = req.originalUrl.indexOf("?") === -1 ? "" : req.originalUrl.slice(req.originalUrl.indexOf("?"));
  return res.redirect(301, "https://" + host + suffix + query);
}

// install wires the middleware in the order it has to run: accept the host,
// then bounce anyone who is not signed in, then move the old URLs.
function install(app) {
  app.use(rewriteConsoleHost);
  app.use(bounceConsoleSignIn);
  app.use(redirectConsolePaths);
}

module.exports = {
  install: install,
  consoleHost: consoleHost,
  cutoverEnabled: cutoverEnabled,
  cookieDomain: cookieDomain,
  sessionCookieDomain: sessionCookieDomain,
  isConsoleHost: isConsoleHost,
  mainSiteOrigin: mainSiteOrigin,
  rewriteConsoleHost: rewriteConsoleHost,
  bounceConsoleSignIn: bounceConsoleSignIn,
  redirectConsolePaths: redirectConsolePaths,
  upgradeSessionCookieDomain: upgradeSessionCookieDomain,
};
