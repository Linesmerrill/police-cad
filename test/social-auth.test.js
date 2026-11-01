const assert = require("assert");
const social = require("../app/social-auth");

// The flow's security rests on three things: a nonce that binds the token to
// the sign-in we started, a state that stops an unrelated response being
// accepted, and the fact that nothing here reads the token. These test the
// first two; the third is a property of the code's shape.

describe("social sign-in", () => {
  const env = {};
  beforeEach(() => {
    for (const k of [
      "GOOGLE_OAUTH_CLIENT_ID", "APPLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_REDIRECT_URI", "APPLE_OAUTH_REDIRECT_URI", "BASE_URL",
    ]) {
      env[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe("configuration", () => {
    it("treats an unset client id as the provider being off", () => {
      assert.deepStrictEqual(social.availableProviders(), { google: false, apple: false });
      assert.strictEqual(social.isConfigured("google"), false);
    });

    it("offers only the providers that are configured", () => {
      process.env.GOOGLE_OAUTH_CLIENT_ID = "web.apps.googleusercontent.com";
      assert.deepStrictEqual(social.availableProviders(), { google: true, apple: false });
    });

    it("ignores whitespace-only configuration", () => {
      process.env.APPLE_OAUTH_CLIENT_ID = "   ";
      assert.strictEqual(social.isConfigured("apple"), false);
    });

    it("prefers the configured callback over one derived from BASE_URL", () => {
      // The registered callback has to match byte for byte, and a value built
      // from a request is a value someone else can influence.
      process.env.BASE_URL = "https://www.linespolice-cad.com";
      process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://www.linespolice-cad.com/auth/google/callback";
      assert.strictEqual(
        social.redirectURI("google"),
        "https://www.linespolice-cad.com/auth/google/callback"
      );
    });

    it("falls back to BASE_URL plus the provider path", () => {
      process.env.BASE_URL = "https://www.linespolice-cad.com/";
      assert.strictEqual(
        social.redirectURI("apple"),
        "https://www.linespolice-cad.com/auth/apple/callback"
      );
    });
  });

  describe("buildAuthorizeURL", () => {
    beforeEach(() => {
      process.env.GOOGLE_OAUTH_CLIENT_ID = "web.apps.googleusercontent.com";
      process.env.APPLE_OAUTH_CLIENT_ID = "com.linesmerrill.policecad.web";
      process.env.BASE_URL = "https://www.linespolice-cad.com";
    });

    it("asks Google for an ID token, posted back, with a nonce", () => {
      const url = new URL(social.buildAuthorizeURL("google", { state: "s", nonce: "n" }));
      const q = url.searchParams;
      assert.strictEqual(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
      assert.strictEqual(q.get("response_type"), "id_token");
      assert.strictEqual(q.get("response_mode"), "form_post");
      assert.strictEqual(q.get("nonce"), "n");
      assert.strictEqual(q.get("state"), "s");
      assert.ok(q.get("scope").includes("openid"));
      assert.strictEqual(q.get("client_id"), "web.apps.googleusercontent.com");
    });

    it("asks Apple for an ID token alongside the code it insists on", () => {
      const q = new URL(social.buildAuthorizeURL("apple", { state: "s", nonce: "n" })).searchParams;
      assert.strictEqual(q.get("response_type"), "code id_token");
      // Apple requires form_post once name or email are requested.
      assert.strictEqual(q.get("response_mode"), "form_post");
      assert.strictEqual(q.get("client_id"), "com.linesmerrill.policecad.web");
      assert.strictEqual(q.get("nonce"), "n");
    });

    it("never requests a flow that would need a client secret", () => {
      // A bare `code` response would have to be exchanged, which for Apple
      // means a JWT signed with a rotating private key. Nothing here should
      // ever drift into needing one.
      for (const provider of ["google", "apple"]) {
        const q = new URL(social.buildAuthorizeURL(provider, { state: "s", nonce: "n" })).searchParams;
        assert.ok(
          q.get("response_type").includes("id_token"),
          provider + " must request an id_token directly"
        );
        assert.strictEqual(q.get("client_secret"), null);
      }
    });

    it("refuses to build a URL without a nonce", () => {
      assert.throws(() => social.buildAuthorizeURL("google", { state: "s" }), /nonce/);
      assert.throws(() => social.buildAuthorizeURL("google", { nonce: "n" }), /state/);
    });

    it("refuses to build a URL for an unconfigured provider", () => {
      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
      assert.throws(
        () => social.buildAuthorizeURL("google", { state: "s", nonce: "n" }),
        /not configured/
      );
    });
  });

  describe("state and nonce handling", () => {
    const start = (session, provider = "google") => {
      const state = social.randomToken();
      const nonce = social.randomToken();
      social.rememberFlow(session, provider, { state, nonce, redirect: "/developer" });
      return { state, nonce };
    };

    it("returns the stored nonce when the state matches", () => {
      const session = {};
      const { state, nonce } = start(session);
      const flow = social.takeFlow(session, "google", state);
      assert.ok(flow);
      assert.strictEqual(flow.nonce, nonce);
      assert.strictEqual(flow.redirect, "/developer");
    });

    it("refuses a state that does not match", () => {
      const session = {};
      start(session);
      assert.strictEqual(social.takeFlow(session, "google", social.randomToken()), null);
    });

    it("is single use", () => {
      const session = {};
      const { state } = start(session);
      assert.ok(social.takeFlow(session, "google", state));
      // A state that has been answered must not be answerable again, or a
      // captured response could be replayed.
      assert.strictEqual(social.takeFlow(session, "google", state), null);
    });

    it("clears the flow even when it did not match", () => {
      const session = {};
      const { state } = start(session);
      social.takeFlow(session, "google", "wrong");
      assert.strictEqual(session.socialAuth, undefined);
      // So the real state cannot be retried afterwards either.
      assert.strictEqual(social.takeFlow(session, "google", state), null);
    });

    it("refuses a response from the other provider", () => {
      const session = {};
      const { state } = start(session, "google");
      assert.strictEqual(social.takeFlow(session, "apple", state), null);
    });

    it("expires", () => {
      const session = {};
      const { state } = start(session);
      const later = Date.now() + social.FLOW_TTL_MS + 1000;
      assert.strictEqual(social.takeFlow(session, "google", state, later), null);
    });

    it("refuses an empty or missing state", () => {
      const session = {};
      start(session);
      assert.strictEqual(social.takeFlow(session, "google", ""), null);
      assert.strictEqual(social.takeFlow({}, "google", "anything"), null);
    });

    it("produces distinct, URL-safe tokens", () => {
      const seen = new Set();
      for (let i = 0; i < 200; i++) {
        const t = social.randomToken();
        assert.ok(/^[A-Za-z0-9_-]{16,128}$/.test(t), "token must match the API's nonce shape: " + t);
        assert.ok(!seen.has(t), "tokens must not repeat");
        seen.add(t);
      }
    });
  });

  describe("parseCallback", () => {
    it("reads the fields a provider posts", () => {
      const got = social.parseCallback({ id_token: " tok ", state: " st ", user: '{"name":{}}' });
      assert.strictEqual(got.idToken, "tok");
      assert.strictEqual(got.state, "st");
      assert.strictEqual(got.userJSON, '{"name":{}}');
    });

    it("yields empty strings for anything that is not a string", () => {
      // The body is caller-controlled, so an object where a string belongs must
      // not become one by accident.
      const got = social.parseCallback({ id_token: { $ne: "" }, state: ["a"], error: 7 });
      assert.strictEqual(got.idToken, "");
      assert.strictEqual(got.state, "");
      assert.strictEqual(got.error, "");
    });

    it("survives an absent body", () => {
      assert.strictEqual(social.parseCallback().idToken, "");
    });

    it("reports a declined consent screen", () => {
      const got = social.parseCallback({ error: "user_cancelled_authorize" });
      assert.strictEqual(got.error, "user_cancelled_authorize");
      assert.strictEqual(got.idToken, "");
    });
  });

  describe("apiErrorReason", () => {
    it("reads the Go API's nested envelope", () => {
      const err = { response: { data: { response: { message: "that sign-in could not be verified" } } } };
      assert.strictEqual(social.apiErrorReason(err), "that sign-in could not be verified");
    });

    it("reads a top-level message from our own Express routes", () => {
      assert.strictEqual(social.apiErrorReason({ response: { data: { message: "nope" } } }), "nope");
    });

    it("returns empty when there is nothing readable", () => {
      assert.strictEqual(social.apiErrorReason({}), "");
      assert.strictEqual(social.apiErrorReason(new Error("socket hang up")), "");
    });
  });
});
