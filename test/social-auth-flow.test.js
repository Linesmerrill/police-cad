const assert = require("assert");
const express = require("express");
const session = require("express-session");

const socialAuth = require("../app/social-auth");
const socialFlow = require("../app/social-auth-flow");

// Google and Apple sign-in, driven over real HTTP.
//
// The bug these cover was invisible to a handler-level test: the provider's
// callback is a cross-site POST, so the browser does not send our Lax session
// cookie, and req.session arrives empty. That is a property of two routes and
// a cookie, not of one function, so these mount the real wiring on a real
// server and control the Cookie header by hand. Omitting it is exactly what
// the browser does.

const PROVIDERS = ["google", "apple"];

// A tiny stand-in for the provider and the API: the flow never reads a token,
// so a test does not need a real one.
function buildApp(options = {}) {
  const app = express();
  // Mirrors production: Heroku terminates TLS and the app trusts the proxy, so
  // the session cookie is marked Secure and X-Forwarded-Proto is what says the
  // request arrived over https. The tests set that header and carry the cookie
  // by hand, so a Secure cookie is testable over a plain local socket.
  app.set("trust proxy", 1);
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { path: "/", httpOnly: true, secure: true, sameSite: "lax" },
    })
  );

  // Stand in for passport's req.logIn, recording what it wrote and where.
  app.use(function (req, res, next) {
    req.logIn = function (account, done) {
      req.session.passport = { user: account.id };
      req.session.save(function () { done(null); });
    };
    next();
  });

  // render() without a view engine: report what would have been rendered.
  app.use(function (req, res, next) {
    res.render = function (view, locals) {
      res.set("X-Test-View", view);
      res.json({ view, locals });
    };
    next();
  });

  const verdicts = options.verdicts || {};
  const stubAuth = Object.assign({}, socialAuth, {
    isConfigured: () => true,
    providerConfig: (p) => socialAuth.providerConfig(p),
    verifyWithAPI: async (provider) => {
      if (options.verifyThrows) throw options.verifyThrows;
      return verdicts[provider] || verdicts.default || {};
    },
  });

  socialFlow.mount(app, {
    limits: options.limits,
    socialAuth: stubAuth,
    User: { findById: async (id) => (options.missingUser ? null : { id, _id: id }) },
    sanitizeRedirect: (value, fallback) =>
      typeof value === "string" && value.startsWith("/") ? value : fallback,
    log: { warn() {}, error() {} },
  });

  return app;
}

// listen/stop keep each test on its own port.
function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function urlFor(server, path) {
  return `http://127.0.0.1:${server.address().port}${path}`;
}

// request() is deliberately explicit about cookies: whether one is sent is the
// thing under test, so nothing may send one implicitly.
async function request(server, path, { method = "GET", form, cookie, origin, redirect = "manual" } = {}) {
  const headers = { "X-Forwarded-Proto": "https" };
  if (form) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  const res = await fetch(urlFor(server, path), {
    method,
    headers,
    body: form ? new URLSearchParams(form).toString() : undefined,
    redirect,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (err) { /* a redirect has no body */ }
  return {
    status: res.status,
    location: res.headers.get("location"),
    setCookie: res.headers.get("set-cookie"),
    view: res.headers.get("x-test-view"),
    text,
    json,
  };
}

function cookieFrom(setCookie) {
  return String(setCookie || "").split(";")[0];
}

// startFlow walks the first half: begin a sign-in and keep the session cookie
// and the state, the way a browser would.
async function startFlow(server, provider) {
  process.env[provider === "google" ? "GOOGLE_OAUTH_CLIENT_ID" : "APPLE_OAUTH_CLIENT_ID"] = "test-client-id";
  process.env.BASE_URL = "https://www.linespolice-cad.com";
  const res = await request(server, `/auth/${provider}`);
  const cookie = cookieFrom(res.setCookie);
  const state = new URL(res.location).searchParams.get("state");
  return { cookie, state };
}

describe("social sign-in flow (helpers)", function () {
  describe("bounceFields", function () {
    it("carries only what the next step reads", function () {
      assert.deepStrictEqual(
        socialFlow.bounceFields({
          id_token: "t", state: "s", user: "{}", error: "e", error_description: "d",
          // Not forwarded: the bounce writes these into a form, and anything
          // the next step does not read has no business being there.
          redirect_uri: "https://evil.example.com", scope: "x",
        }),
        { id_token: "t", state: "s", user: "{}", error: "e", error_description: "d" }
      );
    });

    it("drops absurdly long values rather than building a page around them", function () {
      const huge = "a".repeat(socialFlow.MAX_FIELD_LENGTH + 1);
      assert.deepStrictEqual(socialFlow.bounceFields({ id_token: huge, state: "s" }), { state: "s" });
    });

    it("drops anything that is not a non-empty string", function () {
      assert.deepStrictEqual(
        socialFlow.bounceFields({ id_token: "", state: { $ne: null }, user: 42, error: null }),
        {}
      );
      assert.deepStrictEqual(socialFlow.bounceFields(null), {});
      assert.deepStrictEqual(socialFlow.bounceFields(undefined), {});
    });
  });

  describe("sameOriginPost", function () {
    const req = (origin, host = "www.linespolice-cad.com") => ({ headers: { origin, host } });

    it("accepts our own origin", function () {
      assert.strictEqual(socialFlow.sameOriginPost(req("https://www.linespolice-cad.com")), true);
    });

    it("refuses another origin", function () {
      assert.strictEqual(socialFlow.sameOriginPost(req("https://evil.example.com")), false);
      assert.strictEqual(socialFlow.sameOriginPost(req("https://accounts.google.com")), false);
      // A lookalike host must not pass on a prefix.
      assert.strictEqual(socialFlow.sameOriginPost(req("https://www.linespolice-cad.com.evil.test")), false);
    });

    it("refuses an unparseable origin", function () {
      assert.strictEqual(socialFlow.sameOriginPost(req("not a url")), false);
    });

    it("does not fail over a missing origin, which proves nothing either way", function () {
      // The state check is the control; an absent header is not evidence.
      assert.strictEqual(socialFlow.sameOriginPost(req(undefined)), true);
      assert.strictEqual(socialFlow.sameOriginPost(req("null")), true);
      assert.strictEqual(socialFlow.sameOriginPost({ headers: {} }), true);
    });
  });

  describe("maskEmail", function () {
    it("shows the first character and the domain, nothing else", function () {
      assert.strictEqual(socialFlow.maskEmail("linesmerrill@gmail.com"), "l\u2022\u2022\u2022\u2022@gmail.com");
    });

    it("returns nothing it cannot mask safely", function () {
      assert.strictEqual(socialFlow.maskEmail("@gmail.com"), "");
      assert.strictEqual(socialFlow.maskEmail("not-an-email"), "");
      assert.strictEqual(socialFlow.maskEmail(""), "");
      assert.strictEqual(socialFlow.maskEmail(null), "");
    });
  });

  describe("takeLinkNotice", function () {
    const notice = () => ({ socialLink: { provider: "google", maskedEmail: "a@b.c", at: Date.now() } });

    it("is single use, so a reload does not keep asserting it", function () {
      const session = notice();
      assert.ok(socialFlow.takeLinkNotice(session));
      assert.strictEqual(session.socialLink, undefined);
      assert.strictEqual(socialFlow.takeLinkNotice(session), null);
    });

    it("expires", function () {
      const session = { socialLink: { provider: "google", at: Date.now() - socialFlow.LINK_NOTICE_TTL_MS - 1 } };
      assert.strictEqual(socialFlow.takeLinkNotice(session), null);
    });

    it("ignores a malformed or missing notice", function () {
      assert.strictEqual(socialFlow.takeLinkNotice({}), null);
      assert.strictEqual(socialFlow.takeLinkNotice({ socialLink: {} }), null);
      assert.strictEqual(socialFlow.takeLinkNotice(null), null);
    });
  });
});

describe("social sign-in flow (routes)", function () {
  const saved = {};
  let server;

  beforeEach(async function () {
    for (const k of ["GOOGLE_OAUTH_CLIENT_ID", "APPLE_OAUTH_CLIENT_ID", "BASE_URL",
      "GOOGLE_OAUTH_REDIRECT_URI", "APPLE_OAUTH_REDIRECT_URI"]) {
      saved[k] = process.env[k];
    }
  });

  afterEach(async function () {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    if (server) { await new Promise((r) => server.close(r)); server = null; }
  });

  // -------------------------------------------------------------------------
  // The bug itself
  // -------------------------------------------------------------------------

  PROVIDERS.forEach(function (provider) {
    it(`${provider}: the cross-site callback carries no session cookie and must still work`, async function () {
      server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
      const { cookie, state } = await startFlow(server, provider);

      // Exactly what the browser sends: a top-level POST from the provider's
      // origin, with no Cookie header at all.
      const cb = await request(server, `/auth/${provider}/callback`, {
        method: "POST",
        form: { id_token: "tok", state },
        origin: provider === "google" ? "https://accounts.google.com" : "https://appleid.apple.com",
      });

      assert.strictEqual(cb.status, 200, "the callback should answer, not fail");
      assert.strictEqual(cb.view, "social-bounce", "it should hand back the same-site bounce");
      assert.strictEqual(cb.json.locals.action, `/auth/${provider}/complete`);
      assert.strictEqual(cb.json.locals.fields.state, state, "the state must survive the bounce");
      assert.strictEqual(cb.json.locals.fields.id_token, "tok");
      assert.ok(!cb.setCookie, "the bounce must not mint a session of its own");

      // The bounce posts from our own page, so the cookie is sent this time,
      // and the Origin is our own host.
      const done = await request(server, `/auth/${provider}/complete`, {
        method: "POST",
        form: cb.json.locals.fields,
        cookie,
        origin: `http://127.0.0.1:${server.address().port}`,
      });
      assert.strictEqual(done.status, 302);
      assert.strictEqual(done.location, "/communities");
    });

    it(`${provider}: completing without the session cookie is refused`, async function () {
      // The old behaviour, now contained to the half that cannot do harm.
      server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
      const { state } = await startFlow(server, provider);
      const done = await request(server, `/auth/${provider}/complete`, {
        method: "POST",
        form: { id_token: "tok", state },
      });
      assert.strictEqual(done.status, 400);
      assert.strictEqual(done.view, "error");
    });
  });

  // -------------------------------------------------------------------------
  // The three outcomes, for both providers
  // -------------------------------------------------------------------------

  // Walks a whole sign-in the way a browser does, bounce included.
  async function signInThroughBounce(server, provider, extraForm = {}) {
    const { cookie, state } = await startFlow(server, provider);
    const cb = await request(server, `/auth/${provider}/callback`, {
      method: "POST",
      form: Object.assign({ id_token: "tok", state }, extraForm),
    });
    const done = await request(server, `/auth/${provider}/complete`, {
      method: "POST",
      form: cb.json.locals.fields,
      cookie,
    });
    return { cookie, state, done };
  }

  PROVIDERS.forEach(function (provider) {
    it(`${provider}: a new user is signed up and lands signed in`, async function () {
      server = await listen(buildApp({ verdicts: { default: { outcome: "signed_up", userId: "new-user" } } }));
      const { done } = await signInThroughBounce(server, provider);
      assert.strictEqual(done.status, 302);
      assert.strictEqual(done.location, "/communities");
    });

    it(`${provider}: a returning linked user signs straight in`, async function () {
      server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "known" } } }));
      const { done } = await signInThroughBounce(server, provider);
      assert.strictEqual(done.status, 302);
      assert.strictEqual(done.location, "/communities");
    });

    it(`${provider}: an existing email gets the "already have an account" page, never the generic error`, async function () {
      server = await listen(buildApp({
        verdicts: { default: { outcome: "link_required", maskedEmail: "l••••@gmail.com" } },
      }));
      const { cookie, done } = await signInThroughBounce(server, provider);

      assert.strictEqual(done.status, 302);
      assert.strictEqual(done.location, "/auth/social/link-required",
        "it must not go to a bare /login, and must not render the error page");

      const page = await request(server, "/auth/social/link-required", {
        cookie: cookieFrom(done.setCookie) || cookie,
      });
      assert.strictEqual(page.view, "social-link-required");
      assert.strictEqual(page.json.locals.maskedEmail, "l••••@gmail.com");
    });
  });

  // -------------------------------------------------------------------------
  // The state check, which the bounce must not have weakened
  // -------------------------------------------------------------------------

  it("rejects a forged state", async function () {
    server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
    const { cookie } = await startFlow(server, "google");
    const done = await request(server, "/auth/google/complete", {
      method: "POST",
      form: { id_token: "tok", state: socialAuth.randomToken() },
      cookie,
    });
    assert.strictEqual(done.status, 400);
    assert.strictEqual(done.view, "error");
  });

  it("rejects a state belonging to the other provider", async function () {
    server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
    const { cookie, state } = await startFlow(server, "google");
    const done = await request(server, "/auth/apple/complete", {
      method: "POST",
      form: { id_token: "tok", state },
      cookie,
    });
    assert.strictEqual(done.status, 400);
  });

  it("rejects a replayed state", async function () {
    server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
    const { cookie, state } = await startFlow(server, "google");
    const form = { id_token: "tok", state };

    const first = await request(server, "/auth/google/complete", { method: "POST", form, cookie });
    assert.strictEqual(first.status, 302, "the first use should work");

    const second = await request(server, "/auth/google/complete", { method: "POST", form, cookie });
    assert.strictEqual(second.status, 400, "the same state must not work twice");
  });

  it("rejects an expired flow", async function () {
    server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
    const { cookie, state } = await startFlow(server, "google");

    // Age the stored flow past its TTL by moving the clock, not by waiting.
    const realNow = Date.now;
    Date.now = () => realNow() + socialAuth.FLOW_TTL_MS + 1000;
    try {
      const done = await request(server, "/auth/google/complete", {
        method: "POST",
        form: { id_token: "tok", state },
        cookie,
      });
      assert.strictEqual(done.status, 400);
    } finally {
      Date.now = realNow;
    }
  });

  it("refuses a completion posted from another origin", async function () {
    server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
    const { cookie, state } = await startFlow(server, "google");
    const done = await request(server, "/auth/google/complete", {
      method: "POST",
      form: { id_token: "tok", state },
      cookie,
      origin: "https://evil.example.com",
    });
    assert.strictEqual(done.status, 400);
  });

  it("sends a declined consent screen back to login without an error page", async function () {
    server = await listen(buildApp({}));
    const { cookie, state } = await startFlow(server, "google");
    const cb = await request(server, "/auth/google/callback", {
      method: "POST",
      form: { error: "access_denied", state },
    });
    const done = await request(server, "/auth/google/complete", {
      method: "POST",
      form: cb.json.locals.fields,
      cookie,
    });
    assert.strictEqual(done.status, 302);
    assert.strictEqual(done.location, "/login");
  });

  it("keeps the redirect the sign-in started with", async function () {
    server = await listen(buildApp({ verdicts: { default: { outcome: "signed_in", userId: "u1" } } }));
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
    process.env.BASE_URL = "https://www.linespolice-cad.com";
    const started = await request(server, "/auth/google?redirect=%2Fcommunities%2Fabc");
    const cookie = cookieFrom(started.setCookie);
    const state = new URL(started.location).searchParams.get("state");

    const cb = await request(server, "/auth/google/callback", { method: "POST", form: { id_token: "t", state } });
    const done = await request(server, "/auth/google/complete", {
      method: "POST", form: cb.json.locals.fields, cookie,
    });
    assert.strictEqual(done.location, "/communities/abc");
  });

  it("rate-limits the sign-in routes", async function () {
    // Unauthenticated, reaches the database, and decides who somebody is.
    // A tiny budget here only proves the limiter is actually wired on; the
    // real ones are generous, because members share addresses behind a school
    // or household NAT.
    server = await listen(buildApp({
      verdicts: { default: { outcome: "signed_in", userId: "u1" } },
      limits: { start: 2, finish: 2 },
    }));
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
    process.env.BASE_URL = "https://www.linespolice-cad.com";

    const codes = [];
    for (let i = 0; i < 4; i += 1) {
      codes.push((await request(server, "/auth/google")).status);
    }
    assert.deepStrictEqual(codes.slice(0, 2), [302, 302], "real attempts should work");
    assert.ok(codes.slice(2).every((c) => c === 429), `expected 429s, got ${codes}`);
  });

  it("marks the session cookie Secure and HttpOnly behind the proxy", async function () {
    server = await listen(buildApp({}));
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
    process.env.BASE_URL = "https://www.linespolice-cad.com";
    const res = await request(server, "/auth/google");
    assert.match(res.setCookie, /HttpOnly/i);
    assert.match(res.setCookie, /Secure/i);
  });

  it("does not render the link-required page without a notice", async function () {
    server = await listen(buildApp({}));
    const page = await request(server, "/auth/social/link-required");
    assert.strictEqual(page.status, 302);
    assert.strictEqual(page.location, "/login");
  });
});
