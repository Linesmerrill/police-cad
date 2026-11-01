// Sign in with Google and Apple.
//
// The division of labour matters here, so it is worth stating plainly:
//
//   - this file starts the flow and receives the provider's answer;
//   - the API verifies the ID token and decides which LPC account it proves;
//   - this file then mints the session, because sessions already live here.
//
// Nothing in this file inspects a token's contents. It cannot: an unverified
// token is a string a caller chose, and treating any claim in it as true before
// the signature is checked is the one mistake that makes the whole flow
// worthless. The token is passed through to the API and the API's answer is
// what we act on.
//
// **There is no code exchange, and so there is no client secret.**
//
// Both providers are asked for an ID token directly in the redirect response
// (`response_type=id_token` for Google, `code id_token` for Apple, both with
// `response_mode=form_post`). The authorization code Apple also returns is
// ignored. That is a deliberate choice rather than a shortcut: exchanging a
// code would require a client secret, and for Apple that secret is a JWT signed
// with a downloaded private key that expires every six months. Carrying a
// rotating private key to learn something the ID token already tells us would
// be a maintenance burden and one more secret to leak, for nothing.
//
// What follows from that: no Apple Team ID, no Key ID, no .p8 private key, and
// no Google client secret in any environment.

const crypto = require("crypto");
const axios = require("axios");

// Where each provider's authorize endpoint lives.
const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const APPLE_AUTHORIZE = "https://appleid.apple.com/auth/authorize";

// How long a started sign-in stays valid.
//
// Short, because this only has to survive the round trip to the provider and
// back. A stale entry is a sign-in nobody completed, and keeping it would widen
// the window for replaying a captured token into our flow.
const FLOW_TTL_MS = 10 * 60 * 1000;

const PROVIDERS = {
  google: {
    authorizeURL: GOOGLE_AUTHORIZE,
    clientIDEnv: "GOOGLE_OAUTH_CLIENT_ID",
    redirectEnv: "GOOGLE_OAUTH_REDIRECT_URI",
    defaultRedirectPath: "/auth/google/callback",
    // openid gets us an ID token; email and profile populate it.
    scope: "openid email profile",
    responseType: "id_token",
    label: "Google",
  },
  apple: {
    authorizeURL: APPLE_AUTHORIZE,
    clientIDEnv: "APPLE_OAUTH_CLIENT_ID",
    redirectEnv: "APPLE_OAUTH_REDIRECT_URI",
    defaultRedirectPath: "/auth/apple/callback",
    // Apple requires form_post once name or email are requested, and will only
    // return an id_token alongside a code for this response type.
    scope: "name email",
    responseType: "code id_token",
    label: "Apple",
  },
};

function providerConfig(name) {
  return PROVIDERS[String(name || "").toLowerCase()] || null;
}

// clientID returns a provider's configured client id, or "" when it is unset.
//
// Unset means the provider is switched off, and the buttons are not rendered.
// There is deliberately no default: a client id is the audience the API checks a
// token against, so guessing one would be guessing at who a token was for.
function clientID(name) {
  const cfg = providerConfig(name);
  if (!cfg) return "";
  return String(process.env[cfg.clientIDEnv] || "").trim();
}

function isConfigured(name) {
  return clientID(name) !== "";
}

// availableProviders is what the sign-in buttons should offer.
function availableProviders() {
  return {
    google: isConfigured("google"),
    apple: isConfigured("apple"),
  };
}

// redirectURI is the callback the provider will send the answer to.
//
// Taken from config rather than built from the request, because it has to match
// what is registered with the provider byte for byte, and a value derived from
// a Host header is a value an attacker can influence.
function redirectURI(name) {
  const cfg = providerConfig(name);
  if (!cfg) return "";
  const configured = String(process.env[cfg.redirectEnv] || "").trim();
  if (configured) return configured;
  const base = String(process.env.BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return base + cfg.defaultRedirectPath;
}

// randomToken produces a state or nonce value.
//
// base64url of 32 random bytes, which matches the shape the API's nonce
// validator accepts and is far past guessable.
function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// buildAuthorizeURL assembles the provider URL to send someone to.
//
// Exported and pure so the query string can be asserted in a test. Getting a
// parameter wrong here fails in a way that is awkward to notice: a missing
// nonce, for instance, would produce a token the API then refuses, and the
// visible symptom is "sign-in does not work" rather than anything pointing
// here.
function buildAuthorizeURL(name, { state, nonce }) {
  const cfg = providerConfig(name);
  if (!cfg) throw new Error("unknown provider");
  const id = clientID(name);
  const uri = redirectURI(name);
  if (!id || !uri) throw new Error(cfg.label + " sign-in is not configured");
  if (!state || !nonce) throw new Error("state and nonce are required");

  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: uri,
    response_type: cfg.responseType,
    scope: cfg.scope,
    state,
    nonce,
    // form_post keeps the token out of the URL, so it does not land in browser
    // history, a Referer header, or a server access log.
    response_mode: "form_post",
  });
  return cfg.authorizeURL + "?" + params.toString();
}

// rememberFlow stores the state and nonce for a sign-in being started.
//
// Kept in the session rather than in a cookie we read back, so neither value is
// ever something the browser can choose. The nonce is the thing that binds the
// token we receive to the sign-in we started, and the state is what stops a
// response from an unrelated flow being accepted.
function rememberFlow(session, name, { state, nonce, redirect }) {
  if (!session) throw new Error("no session");
  session.socialAuth = {
    provider: String(name).toLowerCase(),
    state,
    nonce,
    redirect: redirect || null,
    startedAt: Date.now(),
  };
}

// takeFlow consumes a stored sign-in, returning it only when it matches.
//
// Single use and deleted on the way out, whether or not it matched: a state
// that has been answered once must not be answerable again, and leaving a
// failed attempt in place would let it be retried with a different token.
function takeFlow(session, name, state, now = Date.now()) {
  if (!session) return null;
  const flow = session.socialAuth;
  delete session.socialAuth;

  if (!flow || !flow.state || !state) return null;
  if (flow.provider !== String(name).toLowerCase()) return null;
  if (now - flow.startedAt > FLOW_TTL_MS) return null;

  // Constant time, because a state comparison that leaks its progress leaks how
  // much of a guess was right.
  const a = Buffer.from(String(flow.state));
  const b = Buffer.from(String(state));
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  return flow;
}

// parseCallback reads the fields a provider posts back.
//
// Everything here is caller-controlled, so this only sorts the shapes out; it
// makes no judgement about whether any of it is true.
function parseCallback(body = {}) {
  const pick = (v) => (typeof v === "string" ? v.trim() : "");
  return {
    idToken: pick(body.id_token),
    state: pick(body.state),
    error: pick(body.error) || pick(body.error_description),
    // Apple sends the name once, in its own JSON blob, outside the token.
    // Recorded only if the API asks for it; never trusted as identity.
    userJSON: pick(body.user),
  };
}

// verifyWithAPI hands the token to the API and returns its verdict.
//
// The API is the only thing that reads the token. It answers with one of
// signed_in, signed_up or link_required, and this file does not second-guess
// which.
async function verifyWithAPI(provider, idToken, nonce) {
  const base = String(process.env.POLICE_CAD_API_URL || "").replace(/\/+$/, "");
  const { data } = await axios.post(
    base + "/api/v1/auth/social/verify",
    { provider, idToken, nonce },
    { timeout: 15000 }
  );
  return data || {};
}

// apiErrorReason pulls a readable reason out of either error envelope.
//
// The Go API nests under `response.message`; the website's own Express routes
// use a top-level `message`. Both shapes appear in this codebase, so both are
// handled rather than one being assumed.
function apiErrorReason(err) {
  const data = err && err.response && err.response.data;
  if (!data) return "";
  if (data.response && typeof data.response.message === "string") {
    return data.response.message;
  }
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return "";
}

module.exports = {
  PROVIDERS,
  FLOW_TTL_MS,
  providerConfig,
  clientID,
  isConfigured,
  availableProviders,
  redirectURI,
  randomToken,
  buildAuthorizeURL,
  rememberFlow,
  takeFlow,
  parseCallback,
  verifyWithAPI,
  apiErrorReason,
};
