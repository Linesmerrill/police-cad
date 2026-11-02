const assert = require("assert");
const {
  DEVELOPER_SCOPES,
  isObjectIdLike,
  buildCreateKeyBody,
  buildEnableBody,
  normalizeClaimCode,
  buildClaimBody,
  usageDashboardView,
  communityKeysView,
  apiErrorReason,
} = require("../app/developer-proxy");

describe("developer-proxy", function () {
  describe("buildCreateKeyBody", function () {
    it("accepts a named key with scopes and a community", function () {
      const result = buildCreateKeyBody({
        name: "  My FiveM server  ",
        scopes: ["civilians:write", "players:provision"],
        communityId: "6adab9b0c602a448a910d97e",
      });
      assert.strictEqual(result.error, undefined);
      assert.strictEqual(result.body.name, "My FiveM server");
      assert.deepStrictEqual(result.body.scopes, ["civilians:write", "players:provision"]);
      assert.strictEqual(result.body.communityId, "6adab9b0c602a448a910d97e");
    });

    it("requires a name", function () {
      assert.ok(buildCreateKeyBody({ name: "   ", scopes: ["units:read"] }).error);
    });

    it("caps the name length", function () {
      const result = buildCreateKeyBody({ name: "x".repeat(61), scopes: ["units:read"] });
      assert.ok(result.error);
    });

    it("requires at least one scope", function () {
      assert.ok(buildCreateKeyBody({ name: "k", scopes: [] }).error);
      assert.ok(buildCreateKeyBody({ name: "k" }).error);
    });

    // Dropping an unknown scope silently would hand back a key that does less
    // than the developer asked for, and they would find out from a 403 in
    // production rather than from this form.
    it("refuses an unknown scope instead of dropping it", function () {
      const result = buildCreateKeyBody({ name: "k", scopes: ["units:read", "money:write"] });
      assert.ok(result.error);
      assert.ok(/money:write/.test(result.error));
    });

    it("refuses a non-string scope", function () {
      assert.ok(buildCreateKeyBody({ name: "k", scopes: [{ scope: "units:read" }] }).error);
    });

    it("de-duplicates scopes", function () {
      const result = buildCreateKeyBody({
        name: "k",
        scopes: ["units:read", "units:read"],
        communityId: "6adab9b0c602a448a910d97e",
      });
      assert.deepStrictEqual(result.body.scopes, ["units:read"]);
    });

    it("refuses a malformed community id", function () {
      assert.ok(buildCreateKeyBody({ name: "k", scopes: ["units:read"], communityId: "nope" }).error);
    });

    // A key with no community and no way to make one would be inert, so the
    // form says so rather than issuing it and letting every call 403.
    it("refuses a key that has no community and cannot create one", function () {
      const result = buildCreateKeyBody({ name: "k", scopes: ["units:read"] });
      assert.ok(result.error);
      assert.ok(/community/i.test(result.error));
    });

    it("allows no community when the key can create its own", function () {
      const result = buildCreateKeyBody({ name: "k", scopes: ["communities:provision"] });
      assert.strictEqual(result.error, undefined);
      assert.strictEqual(result.body.communityId, undefined);
    });
  });

  describe("buildEnableBody", function () {
    // A developer can create accounts for players who have never seen our
    // Terms, so the box has to actually be ticked.
    it("requires the terms to be accepted", function () {
      assert.ok(buildEnableBody({}).error);
      assert.ok(buildEnableBody({ acceptTerms: false }).error);
      assert.ok(buildEnableBody({ acceptTerms: "yes" }).error);
    });

    it("accepts a plain enable", function () {
      const result = buildEnableBody({ acceptTerms: true });
      assert.deepStrictEqual(result.body, { acceptTerms: true });
    });

    it("keeps an optional app name and url", function () {
      const result = buildEnableBody({
        acceptTerms: true,
        appName: "  My server  ",
        appUrl: "https://example.com/mod",
      });
      assert.strictEqual(result.body.appName, "My server");
      assert.strictEqual(result.body.appUrl, "https://example.com/mod");
    });

    // The url is rendered as a link, so anything that could become a
    // javascript: or data: URL has to be refused here.
    it("refuses a url that is not http(s)", function () {
      for (const appUrl of [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "ftp://example.com",
        "//example.com",
        "example.com",
        'https://example.com/"onmouseover="alert(1)',
      ]) {
        const result = buildEnableBody({ acceptTerms: true, appUrl });
        assert.ok(result.error, `expected ${appUrl} to be refused`);
      }
    });
  });

  describe("normalizeClaimCode", function () {
    // The code is read off a game screen, so it arrives in whatever case the
    // player felt like, often without the dashes.
    it("accepts the ways a person types a code", function () {
      assert.strictEqual(normalizeClaimCode("K7M2-QX9P-4T"), "K7M2QX9P4T");
      assert.strictEqual(normalizeClaimCode("k7m2qx9p4t"), "K7M2QX9P4T");
      assert.strictEqual(normalizeClaimCode("  k7m2 qx9p 4t  "), "K7M2QX9P4T");
      assert.strictEqual(normalizeClaimCode("K7M2_QX9P_4T"), "K7M2QX9P4T");
    });

    it("handles non-strings", function () {
      assert.strictEqual(normalizeClaimCode(undefined), "");
      assert.strictEqual(normalizeClaimCode(null), "");
      assert.strictEqual(normalizeClaimCode(12345), "");
    });
  });

  describe("buildClaimBody", function () {
    it("normalizes before sending", function () {
      assert.deepStrictEqual(buildClaimBody({ code: "k7m2-qx9p-4t" }).body, { code: "K7M2QX9P4T" });
    });

    it("requires a code", function () {
      assert.ok(buildClaimBody({}).error);
      assert.ok(buildClaimBody({ code: "   " }).error);
      assert.ok(buildClaimBody({ code: "----" }).error);
    });

    it("refuses something that is not a code", function () {
      assert.ok(buildClaimBody({ code: "ab" }).error);
      assert.ok(buildClaimBody({ code: "x".repeat(40) }).error);
    });
  });

  describe("usageDashboardView", function () {
    it("shapes the dashboard numbers", function () {
      const view = usageDashboardView({
        plan: "free",
        limits: { requestsPerDay: 10000, requestsPerMinute: 60 },
        requestsToday: 2500,
        requestsThisMonth: 40000,
        errorsToday: { rateLimited: 3, unauthorized: 1, forbidden: 0 },
        dailyLimitResetsAt: "2026-11-01T00:00:00Z",
        days: [
          { day: "2026-10-30", requests: 100, rejected429: 1, rejected401: 0, rejected403: 2 },
          { day: "2026-10-31", requests: 2500, rejected429: 3 },
        ],
      });

      assert.strictEqual(view.plan, "free");
      assert.strictEqual(view.requestsToday, 2500);
      assert.strictEqual(view.dailyPercent, 25);
      assert.strictEqual(view.minuteLimit, 60);
      assert.strictEqual(view.resetsAt, "2026-11-01T00:00:00Z");
      assert.strictEqual(view.hasErrorsToday, true);
      assert.strictEqual(view.series.length, 2);
      assert.strictEqual(view.series[0].rejected, 3);
      assert.strictEqual(view.series[1].rejected, 3);
    });

    // Being over the limit is possible, because the request that trips it is
    // counted. A bar past 100% looks like a bug.
    it("clamps the bar at 100%", function () {
      const view = usageDashboardView({
        limits: { requestsPerDay: 100 },
        requestsToday: 250,
      });
      assert.strictEqual(view.dailyPercent, 100);
    });

    it("survives a missing or junk payload", function () {
      for (const input of [undefined, null, {}, { limits: null, days: "nope" }]) {
        const view = usageDashboardView(input);
        assert.strictEqual(view.requestsToday, 0);
        assert.strictEqual(view.dailyPercent, 0);
        assert.strictEqual(view.hasErrorsToday, false);
        assert.deepStrictEqual(view.series, []);
      }
    });

    it("reports no errors when there are none", function () {
      const view = usageDashboardView({
        limits: { requestsPerDay: 10 },
        errorsToday: { rateLimited: 0, unauthorized: 0, forbidden: 0 },
      });
      assert.strictEqual(view.hasErrorsToday, false);
    });
  });

  describe("communityKeysView", function () {
    const payload = {
      keys: [
        {
          grant: { keyId: "a".repeat(24), status: "active", source: "owner_approved" },
          key: { name: "Zeta mod", displayPrefix: "lpc_live_zzzz", scopes: ["units:read"], status: "active" },
          developerName: "zoe",
        },
        {
          grant: { keyId: "b".repeat(24), status: "pending", source: "owner_approved" },
          key: { name: "Alpha mod", displayPrefix: "lpc_live_aaaa", scopes: ["civilians:write"], status: "active" },
          developerName: "al",
        },
        {
          grant: { keyId: "c".repeat(24), status: "revoked", source: "created_by_key" },
          key: { name: "Old mod", displayPrefix: "lpc_live_cccc", scopes: [], status: "revoked" },
        },
      ],
    };

    // A request waiting on somebody is the only row with an action attached, so
    // burying it under the active ones is how it gets missed.
    it("puts pending requests first", function () {
      const view = communityKeysView(payload);
      assert.strictEqual(view.keys[0].status, "pending");
      assert.strictEqual(view.keys[1].status, "active");
      assert.strictEqual(view.keys[2].status, "revoked");
      assert.strictEqual(view.pendingCount, 1);
      assert.strictEqual(view.activeCount, 1);
    });

    it("offers approve only on a pending grant whose key is still live", function () {
      const view = communityKeysView(payload);
      const pending = view.keys.find((k) => k.status === "pending");
      assert.strictEqual(pending.canApprove, true);
      assert.strictEqual(pending.canRevoke, false);

      const active = view.keys.find((k) => k.status === "active");
      assert.strictEqual(active.canApprove, false);
      assert.strictEqual(active.canRevoke, true);
    });

    // A revoked key cannot be approved back into life, so the page must not
    // offer it.
    it("does not offer approve for a pending grant on a revoked key", function () {
      const view = communityKeysView({
        keys: [
          {
            grant: { keyId: "d".repeat(24), status: "pending" },
            key: { name: "Dead", scopes: [], status: "revoked" },
          },
        ],
      });
      assert.strictEqual(view.keys[0].canApprove, false);
    });

    it("separates out the scopes that can change data", function () {
      const view = communityKeysView({
        keys: [
          {
            grant: { keyId: "e".repeat(24), status: "active" },
            key: {
              name: "Mixed",
              status: "active",
              scopes: ["units:read", "units:write", "players:provision", "calls:read"],
            },
          },
        ],
      });
      assert.deepStrictEqual(view.keys[0].writeScopes, ["units:write", "players:provision"]);
    });

    it("labels where the access came from", function () {
      const view = communityKeysView(payload);
      const created = view.keys.find((k) => k.keyName === "Old mod");
      assert.strictEqual(created.source, "Created by this key");
      assert.strictEqual(view.keys.find((k) => k.keyName === "Zeta mod").source, "Approved by an admin");
    });

    it("survives a deleted key and a junk payload", function () {
      const view = communityKeysView({ keys: [{ grant: { keyId: "f".repeat(24), status: "active" } }] });
      assert.strictEqual(view.keys[0].keyName, "(deleted key)");

      for (const input of [undefined, null, {}, { keys: "nope" }]) {
        assert.deepStrictEqual(communityKeysView(input).keys, []);
      }
    });
  });

  describe("apiErrorReason", function () {
    // The Go API answers { response: { message } } while our own Express routes
    // answer a top-level { message } or { error }.
    it("reads both envelopes", function () {
      assert.strictEqual(apiErrorReason({ response: { message: "from go" } }), "from go");
      assert.strictEqual(apiErrorReason({ message: "from express" }), "from express");
      assert.strictEqual(apiErrorReason({ error: "bare error" }), "bare error");
    });

    it("prefers the Go envelope when both are present", function () {
      assert.strictEqual(apiErrorReason({ response: { message: "go" }, message: "express" }), "go");
    });

    it("falls back", function () {
      assert.strictEqual(apiErrorReason(undefined, "fallback"), "fallback");
      assert.strictEqual(apiErrorReason({}, "fallback"), "fallback");
      assert.strictEqual(apiErrorReason({ response: {} }, "fallback"), "fallback");
      assert.strictEqual(apiErrorReason({ message: "" }, "fallback"), "fallback");
    });
  });

  describe("isObjectIdLike", function () {
    it("accepts a 24-character hex id", function () {
      assert.strictEqual(isObjectIdLike("6adab9b0c602a448a910d97e"), true);
      assert.strictEqual(isObjectIdLike("6ADAB9B0C602A448A910D97E"), true);
    });

    it("rejects anything else", function () {
      for (const value of ["", "abc", "6adab9b0c602a448a910d97", "6adab9b0c602a448a910d97ez", undefined, null, 123, {}]) {
        assert.strictEqual(isObjectIdLike(value), false);
      }
    });
  });

  describe("DEVELOPER_SCOPES", function () {
    // The page renders from the API's list at runtime and falls back to this
    // one, so a drift here shows up as a scope nobody can pick.
    it("has a unique scope and a description for every entry", function () {
      const seen = new Set();
      DEVELOPER_SCOPES.forEach(function (entry) {
        assert.ok(entry.scope, "every entry needs a scope");
        assert.ok(entry.description, `${entry.scope} needs a description`);
        assert.ok(entry.group, `${entry.scope} needs a group`);
        assert.ok(!seen.has(entry.scope), `${entry.scope} is listed twice`);
        seen.add(entry.scope);
      });
    });

    // The bug this test exists for: `reports:*` and `warrants:*` were added to
    // the API and to the console's own label table, but not here. The page
    // renders the API's live list, so the four appeared as tickable rows, and
    // then this file's allowlist refused them on save with "Unknown
    // permission". Nothing caught it, because every check on this list only
    // ever looked at this list.
    //
    // So compare the two hand-maintained mirrors against each other. Read the
    // TypeScript as text rather than importing it: mocha runs plain JS here,
    // and the point is only to read the keys of a literal.
    it("covers every scope the console has a group for", function () {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(path.join(__dirname, "..", "lib", "developer-api.ts"), "utf8");
      const block = src.match(/SCOPE_GROUPS[^=]*=\s*\{([\s\S]*?)\n\};/);
      assert.ok(block, "could not find SCOPE_GROUPS in lib/developer-api.ts");

      const grouped = (block[1].match(/'([a-z]+:[a-z]+)'/g) || []).map((q) => q.slice(1, -1));
      assert.ok(grouped.length > 10, "SCOPE_GROUPS parsed as suspiciously short");

      const allowed = new Set(DEVELOPER_SCOPES.map((e) => e.scope));
      const missing = grouped.filter((scope) => !allowed.has(scope));
      assert.deepStrictEqual(
        missing,
        [],
        "these scopes are offered by the console but rejected by the proxy: " + missing.join(", ")
      );
    });

    // Not a matter of scopes: these are not on the developer surface at all.
    it("offers nothing for money, auth, billing or admin", function () {
      DEVELOPER_SCOPES.forEach(function (entry) {
        assert.ok(
          !/money|wallet|balance|transfer|auth|password|email|billing|stripe|subscription|admin|role|permission|settings/i.test(
            entry.scope
          ),
          `${entry.scope} should not be an offerable scope`
        );
      });
    });
  });
});
