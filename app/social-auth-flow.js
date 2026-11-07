// The two halves of a Google or Apple sign-in callback, and why there are two.
//
// Both providers are asked for response_mode=form_post, so their answer arrives
// as a top-level POST from accounts.google.com or appleid.apple.com. That is a
// cross-site POST, and our session cookie does not carry a SameSite attribute,
// so every browser applies its own default of Lax and does not send the cookie
// on it. req.session is then a brand new empty session, the state and nonce
// stored when the flow began are not in it, takeFlow() returns null, and the
// member gets "Something went sideways" no matter who they are.
//
// Chrome softens this for two minutes after a cookie is set (the Lax+POST
// grace), which is why this could look intermittent rather than total: someone
// signing in within two minutes of their very first page view would succeed.
// Everyone else would not.
//
// The fix is a same-site bounce. The provider's POST lands on /callback, which
// touches no session and renders one small form that re-posts the same fields
// to /complete on our own origin. That second POST is same-site, so the Lax
// cookie rides along, and /complete runs the real logic with the member's own
// session.
//
// Chosen over a SameSite=None flow cookie for two reasons. It introduces no
// cross-site-sendable cookie at all, and more importantly /complete runs with
// the member's real session, so req.logIn writes to the session they already
// had. The cookie approach would have to mint the session on a request where
// the member's own session was not sent, quietly replacing it.
//
// What the bounce does not change: state is still server-side, single use,
// constant-time compared, and the nonce still binds the token to the sign-in we
// started. The bounce moves where the check happens, not whether it happens.

// The longest field we will carry through the bounce. An ID token is a JWT of
// roughly one to two kilobytes; Apple's user blob is smaller. Anything past
// this is not a provider's answer, and a page should not be built around it.
const MAX_FIELD_LENGTH = 8192;

// The fields a provider can post back and that /complete needs. Whitelisted
// rather than forwarded wholesale: the bounce writes these into a form, and
// only what the next step reads has any business being there.
const BOUNCE_FIELDS = ["id_token", "state", "user", "error", "error_description"];

// bounceFields picks the fields to carry across the bounce, bounded.
//
// Everything here is caller-controlled. It is not inspected, not trusted and
// not decoded; it is only handed back to our own next request, where the state
// check decides whether any of it means anything.
function bounceFields(body) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  for (const name of BOUNCE_FIELDS) {
    const value = src[name];
    if (typeof value !== "string" || value === "") continue;
    if (value.length > MAX_FIELD_LENGTH) continue;
    out[name] = value;
  }
  return out;
}

// sameOriginPost reports whether a POST came from our own page.
//
// Defence in depth, not the control: the state check is what actually stops a
// forged callback, and it runs either way. Browsers send Origin on form posts,
// so a mismatch is worth refusing; its absence is not worth failing over,
// because an absent header proves nothing about where a request came from.
function sameOriginPost(req) {
  const origin = req && req.headers && req.headers.origin;
  if (!origin || origin === "null") return true;
  const host = req.headers.host;
  if (!host) return true;
  try {
    return new URL(origin).host === host;
  } catch (err) {
    return false;
  }
}

// maskEmail is the fallback when the API did not give us a masked address.
// Never shows more than the first character and the domain.
function maskEmail(email) {
  const value = String(email || "").trim();
  const at = value.lastIndexOf("@");
  if (at < 1) return "";
  return value[0] + "••••" + value.slice(at);
}

// How long the link-required handoff stays valid. It only has to survive one
// redirect, and it names an account that exists, so it should not linger.
const LINK_NOTICE_TTL_MS = 5 * 60 * 1000;

// takeLinkNotice consumes the link-required handoff stored by /complete.
// Single use: a reload should not keep re-asserting that an account exists.
function takeLinkNotice(session, now = Date.now()) {
  if (!session) return null;
  const notice = session.socialLink;
  delete session.socialLink;
  if (!notice || !notice.provider) return null;
  if (!notice.at || now - notice.at > LINK_NOTICE_TTL_MS) return null;
  return notice;
}


// mount wires both providers' routes onto the app.
//
// Here rather than inline in routes.js so the wiring itself is what the tests
// drive: the cross-site callback is a property of how these two routes relate,
// and a test of a handler in isolation would not see it.
//
// deps: socialAuth (app/social-auth.js), User (the model), sanitizeRedirect.
function mount(app, deps) {
  const socialAuth = deps.socialAuth;
  const User = deps.User;
  const sanitizeRedirect = deps.sanitizeRedirect;
  const log = deps.log || console;
  const rateLimit = deps.rateLimit || require("express-rate-limit");

  // These are unauthenticated endpoints that reach the database and decide who
  // somebody is, and app.js's global 500-per-5-minutes is not much of a bound
  // on that. Generous on purpose: a lot of members share one address behind a
  // school or household NAT, and locking a classroom out of signing in would
  // be a worse bug than the one this file fixes. Real use is a couple of
  // attempts; this allows far more while still bounding a script.
  const SIGNIN_WINDOW_MS = 15 * 60 * 1000;
  const limiterOptions = {
    windowMs: SIGNIN_WINDOW_MS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
  };
  // Starting a sign-in writes a flow to the session; finishing one takes two
  // requests per sign-in because of the bounce, so it gets the larger budget.
  const startLimiter = rateLimit(Object.assign({}, limiterOptions, { max: 30 }));
  const finishLimiter = rateLimit(Object.assign({}, limiterOptions, { max: 60 }));

  ["google", "apple"].forEach(function (provider) {
    const label = socialAuth.providerConfig(provider).label;

    app.get("/auth/" + provider, startLimiter, function (req, res) {
      if (!socialAuth.isConfigured(provider)) {
        return res.status(404).render("error", {
          user: req.user,
          message: label + " sign-in is not available right now.",
          redirect: null,
        });
      }

      const state = socialAuth.randomToken();
      const nonce = socialAuth.randomToken();
      socialAuth.rememberFlow(req.session, provider, {
        state,
        nonce,
        redirect: sanitizeRedirect(req.query.redirect, null),
      });

      let url;
      try {
        url = socialAuth.buildAuthorizeURL(provider, { state, nonce });
      } catch (err) {
        log.error("[LPS] [level=error] " + provider + " authorize URL:", err.message);
        return res.status(500).render("error", {
          user: req.user,
          message: label + " sign-in is not configured correctly.",
          redirect: null,
        });
      }
      // The session has to be written before the browser leaves, or the nonce
      // will not be there when the answer comes back.
      return req.session.save(function () {
        res.redirect(url);
      });
    });

    // The provider's answer lands here, and this is the half that cannot see a
    // session: this POST is cross-site, so the browser withholds our Lax
    // session cookie and req.session is a fresh empty one. Nothing is read
    // from it and nothing is written to it here, so no session is created.
    const bounce = function (req, res) {
      const fields = bounceFields(req.body);
      // Never cached: it carries a single-use token in its markup.
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.set("Pragma", "no-cache");
      res.set("Referrer-Policy", "no-referrer");
      return res.render("social-bounce", {
        user: null,
        label,
        action: "/auth/" + provider + "/complete",
        fields,
      });
    };

    // The same fields, re-posted from our own page, so the session cookie is
    // present and the flow stored when this sign-in began can be found.
    const complete = async function (req, res) {
      const source = req.method === "POST" ? req.body : req.query;
      const parsed = socialAuth.parseCallback(source);
      const flow = socialAuth.takeFlow(req.session, provider, parsed.state);

      const fail = function (message) {
        return res.status(400).render("error", {
          user: req.user,
          message,
          retryHref: "/auth/" + provider,
          retryLabel: "Try " + label + " again",
          redirect: null,
        });
      };

      // Defence in depth. The state check below is what actually stops a
      // forged completion, and it runs whatever this says; a browser that
      // posts here from somewhere else is still worth refusing outright.
      if (req.method === "POST" && !sameOriginPost(req)) {
        return fail(
          "That " + label + " sign-in could not be completed. Signing in again will start a fresh one."
        );
      }

      // A declined consent screen is a deliberate choice, not an error worth a
      // page about it.
      if (parsed.error && !parsed.idToken) {
        return res.redirect(sanitizeRedirect(flow && flow.redirect, "/login"));
      }
      // No stored flow means the state did not match, expired, or was already
      // answered. All three are the same answer.
      if (!flow) {
        return fail(
          "That " + label + " sign-in could not be completed. Signing in again will start a fresh one."
        );
      }
      if (!parsed.idToken) {
        return fail("That " + label + " sign-in did not return anything we could verify.");
      }

      let verdict;
      try {
        verdict = await socialAuth.verifyWithAPI(provider, parsed.idToken, flow.nonce);
      } catch (err) {
        const reason = socialAuth.apiErrorReason(err);
        log.warn(
          "[LPS] [level=warn] " + provider + " sign-in refused:",
          reason || (err && err.message)
        );
        return fail(
          reason || "We could not verify that " + label + " sign-in. Signing in again will start a fresh one."
        );
      }

      // The address already belongs to an account. Nothing is linked here: the
      // API will not do it without proof, and neither will we. The member gets
      // a page that says so, rather than the generic failure or a bare login
      // form with no explanation of why they are looking at it.
      if (verdict.outcome === "link_required") {
        req.session.socialLink = {
          provider,
          maskedEmail: verdict.maskedEmail || maskEmail(verdict.email),
          at: Date.now(),
        };
        return req.session.save(function () {
          res.redirect("/auth/social/link-required");
        });
      }

      if (!verdict.userId) {
        return fail("We could not finish signing you in with " + label + ".");
      }

      // The API decided which account this is. Load it and mint the session.
      let account;
      try {
        account = await User.findById(verdict.userId);
      } catch (err) {
        log.error("[LPS] [level=error] " + provider + " sign-in lookup:", err);
        account = null;
      }
      if (!account) {
        return fail("We could not finish signing you in with " + label + ".");
      }

      // req.logIn writes to the session this request arrived with, which is
      // the member's own because the bounce made this request same-site.
      return req.logIn(account, function (loginErr) {
        if (loginErr) {
          log.error("[LPS] [level=error] " + provider + " session:", loginErr);
          return fail("We could not finish signing you in with " + label + ".");
        }
        return res.redirect(sanitizeRedirect(flow.redirect, "/communities"));
      });
    };

    app.post("/auth/" + provider + "/callback", finishLimiter, bounce);
    app.post("/auth/" + provider + "/complete", finishLimiter, complete);
    // Somebody loading the callback directly, or a provider that fell back to a
    // GET, gets the same friendly failure rather than a 404.
    app.get("/auth/" + provider + "/callback", finishLimiter, complete);
  });

  // "You already have an account." Shown after a social sign-in whose email is
  // already an LPC account, instead of dropping the member on a login form with
  // no idea why they are there.
  app.get("/auth/social/link-required", function (req, res) {
    const notice = takeLinkNotice(req.session);
    if (!notice) return res.redirect("/login");
    return req.session.save(function () {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res.render("social-link-required", {
        user: req.user,
        maskedEmail: notice.maskedEmail || "that email address",
      });
    });
  });
}

module.exports = {
  mount,
  MAX_FIELD_LENGTH,
  BOUNCE_FIELDS,
  LINK_NOTICE_TTL_MS,
  bounceFields,
  sameOriginPost,
  maskEmail,
  takeLinkNotice,
};
