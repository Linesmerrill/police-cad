const assert = require("assert");
const {
  buildUpdateKeyBody,
  buildAddCommunityBody,
  accountUsageView,
} = require("../app/developer-proxy");
const developerHost = require("../app/developer-host");

// The console's own request shaping, and the subdomain middleware.
//
// Both are pure enough to test directly, and both are places where being
// slightly wrong is invisible until production: a partial update that blanks a
// field by omission, or a redirect that sends a signed-in developer round in a
// circle.

describe("buildUpdateKeyBody", function () {
  it("sends only what was given", function () {
    // The point of a partial update: renaming must not require the caller to
    // send the scope list back, and sending scopes must not blank the name.
    assert.deepStrictEqual(buildUpdateKeyBody({ name: "Bridge" }).body, { name: "Bridge" });
    assert.deepStrictEqual(buildUpdateKeyBody({ scopes: ["calls:read"] }).body, {
      scopes: ["calls:read"],
    });
  });

  it("trims a name and refuses a blank one", function () {
    assert.deepStrictEqual(buildUpdateKeyBody({ name: "  Bridge  " }).body, { name: "Bridge" });
    assert.ok(buildUpdateKeyBody({ name: "   " }).error);
    assert.ok(buildUpdateKeyBody({ name: "" }).error);
  });

  it("refuses a name over 60 characters", function () {
    assert.ok(buildUpdateKeyBody({ name: "x".repeat(61) }).error);
  });

  it("refuses an unknown permission rather than dropping it", function () {
    // Dropping it would hand back a key that does less than asked for, and the
    // developer would find out from a 403 in production.
    const result = buildUpdateKeyBody({ scopes: ["calls:read", "everything:always"] });
    assert.ok(result.error);
    assert.ok(/everything:always/.test(result.error));
  });

  it("de-duplicates permissions", function () {
    assert.deepStrictEqual(
      buildUpdateKeyBody({ scopes: ["calls:read", "calls:read"] }).body.scopes,
      ["calls:read"]
    );
  });

  it("refuses an empty permission list", function () {
    assert.ok(buildUpdateKeyBody({ scopes: [] }).error);
    assert.ok(buildUpdateKeyBody({ scopes: "calls:read" }).error);
  });

  it("refuses an update that says nothing", function () {
    // An error rather than a no-op, so a bug that sends nothing is visible.
    assert.ok(buildUpdateKeyBody({}).error);
    assert.ok(buildUpdateKeyBody(null).error);
  });
});

describe("buildAddCommunityBody", function () {
  it("accepts an object id", function () {
    const id = "507f1f77bcf86cd799439011";
    assert.deepStrictEqual(buildAddCommunityBody({ communityId: id }).body, { communityId: id });
  });

  it("refuses anything that is not one", function () {
    assert.ok(buildAddCommunityBody({ communityId: "" }).error);
    assert.ok(buildAddCommunityBody({ communityId: "my-server" }).error);
    assert.ok(buildAddCommunityBody({ communityId: { $ne: null } }).error);
    assert.ok(buildAddCommunityBody({}).error);
  });
});

describe("accountUsageView", function () {
  const payload = {
    plan: "premium",
    days: 30,
    from: "2026-10-03",
    to: "2026-11-01",
    limits: { requestsPerDay: 100000, requestsPerMinute: 300 },
    series: [
      { day: "2026-10-31", requests: 40, rejected: 2, rejected429: 2 },
      { day: "2026-11-01", requests: 10, rejected: 1, rejected403: 1 },
    ],
    keys: [{ keyId: "abc", name: "Bridge", status: "active", requests: 50, rejected: 3 }],
    requestsToday: 10,
    rejectedToday: 1,
    peakDay: 40,
  };

  it("totals the range once, here", function () {
    // Two components deriving the same total is how a page ends up showing 61%
    // in one place and 62% in another.
    const view = accountUsageView(payload);
    assert.strictEqual(view.totalRequests, 50);
    assert.strictEqual(view.totalRejected, 3);
    assert.strictEqual(view.peakDay, 40);
  });

  it("clamps the daily percentage at 100", function () {
    // Going over is possible: the request that trips the cap is itself counted.
    const view = accountUsageView(
      Object.assign({}, payload, { requestsToday: 150000 })
    );
    assert.strictEqual(view.dailyPercent, 100);
  });

  it("is zero rather than NaN with no limit", function () {
    const view = accountUsageView(Object.assign({}, payload, { limits: {} }));
    assert.strictEqual(view.dailyPercent, 0);
    assert.strictEqual(view.dailyLimit, 0);
  });

  it("survives a response with nothing in it", function () {
    const view = accountUsageView(undefined);
    assert.deepStrictEqual(view.series, []);
    assert.deepStrictEqual(view.keys, []);
    assert.strictEqual(view.plan, "free");
    assert.strictEqual(view.totalRequests, 0);
  });

  it("normalizes a day that is missing counters", function () {
    const view = accountUsageView({ series: [{ day: "2026-11-01" }] });
    assert.deepStrictEqual(view.series[0], {
      day: "2026-11-01",
      requests: 0,
      rejected: 0,
      rejected401: 0,
      rejected403: 0,
      rejected429: 0,
      accountsMade: 0,
    });
  });
});

describe("developer-host", function () {
  const saved = {};
  const vars = ["DEVELOPER_CONSOLE_HOST", "DEVELOPER_CONSOLE_CUTOVER", "SESSION_COOKIE_DOMAIN"];

  beforeEach(function () {
    vars.forEach(function (name) {
      saved[name] = process.env[name];
      delete process.env[name];
    });
  });

  afterEach(function () {
    vars.forEach(function (name) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    });
  });

  // Express derives req.path from req.url, so a fake that holds `path` fixed
  // hides every bug where one middleware rewrites the url and the next reads
  // the path. That is not hypothetical: it hid a double "/developer" prefix
  // that only showed up against a running server.
  function req(host, path, authenticated) {
    var r = {
      get: function (header) {
        return header === "Host" ? host : "";
      },
      originalUrl: path,
      url: path,
      session: {},
      isAuthenticated: function () {
        return !!authenticated;
      },
    };
    Object.defineProperty(r, "path", {
      get: function () {
        var q = this.url.indexOf("?");
        return q === -1 ? this.url : this.url.slice(0, q);
      },
    });
    return r;
  }

  function res() {
    const captured = { status: null, location: null };
    return {
      captured: captured,
      redirect: function (status, location) {
        captured.status = status;
        captured.location = location;
      },
    };
  }

  describe("ships dark", function () {
    it("does nothing at all with no configuration", function () {
      // This is the property that lets the code deploy before the DNS exists.
      const r = req("www.linespolice-cad.com", "/developer");
      const out = res();
      let nexted = false;
      developerHost.rewriteConsoleHost(r, out, function () {
        nexted = true;
      });
      assert.ok(nexted);
      assert.strictEqual(r.url, "/developer");

      nexted = false;
      developerHost.redirectConsolePaths(r, out, function () {
        nexted = true;
      });
      assert.ok(nexted, "no redirect without the cutover flag");
      assert.strictEqual(out.captured.location, null);
    });

    it("leaves the session cookie host-only until the cutover", function () {
      // Undefined means nobody is signed out by deploying this.
      assert.strictEqual(developerHost.sessionCookieDomain(), undefined);
      process.env.DEVELOPER_CONSOLE_CUTOVER = "true";
      assert.strictEqual(developerHost.sessionCookieDomain(), ".linespolice-cad.com");
      process.env.SESSION_COOKIE_DOMAIN = ".example.test";
      assert.strictEqual(developerHost.sessionCookieDomain(), ".example.test");
    });
  });

  describe("rewriteConsoleHost", function () {
    beforeEach(function () {
      process.env.DEVELOPER_CONSOLE_HOST = "developer.linespolice-cad.com";
    });

    it("maps the console host's own paths onto the /developer routes", function () {
      const cases = [
        ["/", "/developer"],
        ["/keys", "/developer/keys"],
        ["/keys/507f1f77bcf86cd799439011", "/developer/keys/507f1f77bcf86cd799439011"],
        ["/settings", "/developer/settings"],
      ];
      cases.forEach(function (pair) {
        const r = req("developer.linespolice-cad.com", pair[0]);
        developerHost.rewriteConsoleHost(r, res(), function () {});
        assert.strictEqual(r.url, pair[1], pair[0] + " should rewrite to " + pair[1]);
      });
    });

    it("leaves /developer paths alone, so a pasted link works on either host", function () {
      const r = req("developer.linespolice-cad.com", "/developer/keys");
      developerHost.rewriteConsoleHost(r, res(), function () {});
      assert.strictEqual(r.url, "/developer/keys");
    });

    it("never rewrites framework assets or the API", function () {
      ["/_next/static/x.js", "/static/css/a.css", "/api/developer/keys", "/login", "/logout"].forEach(
        function (path) {
          const r = req("developer.linespolice-cad.com", path);
          developerHost.rewriteConsoleHost(r, res(), function () {});
          assert.strictEqual(r.url, path, path + " must be served as-is");
        }
      );
    });

    it("keeps the query string", function () {
      const r = req("developer.linespolice-cad.com", "/usage");
      r.originalUrl = "/usage?days=90";
      developerHost.rewriteConsoleHost(r, res(), function () {});
      assert.strictEqual(r.url, "/developer/usage?days=90");
    });

    it("ignores the port", function () {
      const r = req("developer.linespolice-cad.com:8080", "/keys");
      developerHost.rewriteConsoleHost(r, res(), function () {});
      assert.strictEqual(r.url, "/developer/keys");
    });

    it("does not touch the main site", function () {
      const r = req("www.linespolice-cad.com", "/communities");
      developerHost.rewriteConsoleHost(r, res(), function () {});
      assert.strictEqual(r.url, "/communities");
    });
  });

  describe("bounceConsoleSignIn", function () {
    beforeEach(function () {
      process.env.DEVELOPER_CONSOLE_HOST = "developer.linespolice-cad.com";
    });

    it("sends a signed-out visitor to the main site to sign in", function () {
      // Sign-in has to happen on the main site: the Google and Apple redirect
      // URIs are registered for www and the apex only.
      const r = req("developer.linespolice-cad.com", "/keys", false);
      const out = res();
      developerHost.bounceConsoleSignIn(r, out, function () {
        assert.fail("should have redirected");
      });
      assert.strictEqual(out.captured.status, 302);
      assert.strictEqual(
        out.captured.location,
        "https://www.linespolice-cad.com/login?redirect=" + encodeURIComponent("/developer/keys")
      );
    });

    it("returns to the overview from the console root", function () {
      const r = req("developer.linespolice-cad.com", "/", false);
      const out = res();
      developerHost.bounceConsoleSignIn(r, out, function () {});
      assert.ok(out.captured.location.endsWith(encodeURIComponent("/developer")));
    });

    it("does not prefix /developer twice after the rewrite", function () {
      // install() runs rewriteConsoleHost first, so by the time the bounce
      // reads req.path it already says "/developer/keys". Prefixing again
      // produced "/developer/developer/keys", a path that exists nowhere.
      const r = req("developer.linespolice-cad.com", "/keys", false);
      developerHost.rewriteConsoleHost(r, res(), function () {});
      const out = res();
      developerHost.bounceConsoleSignIn(r, out, function () {});
      assert.strictEqual(
        out.captured.location,
        "https://www.linespolice-cad.com/login?redirect=" + encodeURIComponent("/developer/keys")
      );
    });

    it("carries the query string through the sign-in round trip", function () {
      const r = req("developer.linespolice-cad.com", "/usage", false);
      r.url = "/usage?days=90";
      r.originalUrl = "/usage?days=90";
      developerHost.rewriteConsoleHost(r, res(), function () {});
      const out = res();
      developerHost.bounceConsoleSignIn(r, out, function () {});
      assert.strictEqual(
        out.captured.location,
        "https://www.linespolice-cad.com/login?redirect=" +
          encodeURIComponent("/developer/usage?days=90")
      );
    });

    it("leaves a signed-in visitor alone", function () {
      const r = req("developer.linespolice-cad.com", "/keys", true);
      let nexted = false;
      developerHost.bounceConsoleSignIn(r, res(), function () {
        nexted = true;
      });
      assert.ok(nexted);
    });

    it("does not bounce the API or the assets, which have their own answers", function () {
      ["/api/developer/keys", "/_next/static/x.js", "/login"].forEach(function (path) {
        const r = req("developer.linespolice-cad.com", path, false);
        let nexted = false;
        developerHost.bounceConsoleSignIn(r, res(), function () {
          nexted = true;
        });
        assert.ok(nexted, path + " must not be bounced");
      });
    });

    it("does not touch the main site", function () {
      const r = req("www.linespolice-cad.com", "/developer", false);
      let nexted = false;
      developerHost.bounceConsoleSignIn(r, res(), function () {
        nexted = true;
      });
      assert.ok(nexted);
    });
  });

  describe("redirectConsolePaths", function () {
    beforeEach(function () {
      process.env.DEVELOPER_CONSOLE_HOST = "developer.linespolice-cad.com";
      process.env.DEVELOPER_CONSOLE_CUTOVER = "true";
    });

    it("301s the old URLs to the subdomain", function () {
      const r = req("www.linespolice-cad.com", "/developer/keys", true);
      const out = res();
      developerHost.redirectConsolePaths(r, out, function () {
        assert.fail("should have redirected");
      });
      // 301, not 302: this is a permanent move, so the docs and whatever people
      // bookmarked end up pointing at the new host on their own.
      assert.strictEqual(out.captured.status, 301);
      assert.strictEqual(out.captured.location, "https://developer.linespolice-cad.com/keys");
    });

    it("maps /developer itself to the console root", function () {
      const r = req("www.linespolice-cad.com", "/developer", true);
      const out = res();
      developerHost.redirectConsolePaths(r, out, function () {});
      assert.strictEqual(out.captured.location, "https://developer.linespolice-cad.com/");
    });

    it("keeps the query string", function () {
      const r = req("www.linespolice-cad.com", "/developer/usage", true);
      r.originalUrl = "/developer/usage?days=7";
      const out = res();
      developerHost.redirectConsolePaths(r, out, function () {});
      assert.strictEqual(
        out.captured.location,
        "https://developer.linespolice-cad.com/usage?days=7"
      );
    });

    it("widens the session cookie before redirecting", function () {
      // The trap: express-session runs with resave:false, so an established
      // session's cookie is never re-sent and would stay scoped to www. The
      // subdomain would not see it and the visitor would bounce forever.
      // Writing one field marks the session modified, so Set-Cookie goes out
      // on this very response, carrying the widened domain.
      const r = req("www.linespolice-cad.com", "/developer", true);
      developerHost.redirectConsolePaths(r, res(), function () {});
      assert.strictEqual(r.session.cookieDomainWidened, true);
    });

    it("does not widen the cookie for somebody who is not signed in", function () {
      const r = req("www.linespolice-cad.com", "/developer", false);
      developerHost.redirectConsolePaths(r, res(), function () {});
      assert.strictEqual(r.session.cookieDomainWidened, undefined);
    });

    it("leaves /developer/claim on the main site", function () {
      // A player redeeming a code off a game screen, not a developer
      // administering keys. They already have a session on the main site.
      const r = req("www.linespolice-cad.com", "/developer/claim", true);
      let nexted = false;
      developerHost.redirectConsolePaths(r, res(), function () {
        nexted = true;
      });
      assert.ok(nexted);
    });

    it("leaves every other path alone", function () {
      ["/communities", "/pricing", "/api/developer/keys", "/"].forEach(function (path) {
        const r = req("www.linespolice-cad.com", path, true);
        let nexted = false;
        developerHost.redirectConsolePaths(r, res(), function () {
          nexted = true;
        });
        assert.ok(nexted, path + " must not be redirected");
      });
    });

    it("does not redirect the console host to itself", function () {
      const r = req("developer.linespolice-cad.com", "/developer/keys", true);
      let nexted = false;
      developerHost.redirectConsolePaths(r, res(), function () {
        nexted = true;
      });
      assert.ok(nexted, "a loop here would make the console unreachable");
    });
  });

  describe("mainSiteOrigin", function () {
    it("derives the main site from the console host", function () {
      process.env.DEVELOPER_CONSOLE_HOST = "developer.linespolice-cad.com";
      assert.strictEqual(developerHost.mainSiteOrigin(), "https://www.linespolice-cad.com");
    });

    it("derives a staging pair rather than pointing at production", function () {
      // The reason this is derived and not hardcoded.
      process.env.DEVELOPER_CONSOLE_HOST = "developer-dev.police-cad-dev.herokuapp.com";
      assert.strictEqual(
        developerHost.mainSiteOrigin(),
        "https://www.police-cad-dev.herokuapp.com"
      );
    });

    it("is empty with no console host", function () {
      assert.strictEqual(developerHost.mainSiteOrigin(), "");
    });
  });
});
