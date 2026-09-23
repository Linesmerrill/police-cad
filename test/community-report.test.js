var assert = require("assert");
var cr = require("../app/community-report");

describe("community-report", function () {
  var COMMUNITY = "507f1f77bcf86cd799439081";
  // Every report now says where it happened; only in_app is filed.
  function req(user, body) {
    return { user: user, body: Object.assign({ location: "in_app", details: "they keep posting scam links" }, body) };
  }
  var player = { _doc: { _id: "507f1f77bcf86cd799439082" } };

  describe("REPORT_REASONS", function () {
    // The API tiers a report by the exact title. A typo here would drop a
    // child safety report into the minor tier.
    it("has the eleven mobile reasons with the exact titles the API tiers by", function () {
      assert.deepEqual(cr.REPORT_REASONS.map(function (r) { return r.title; }), [
        "Hate", "Abuse & Harassment", "Violent Speech", "Child Safety", "Privacy",
        "Illegal & Regulated Behavior", "Spam", "Suicide or Self-Harm",
        "Sensitive or Disturbing Media", "Impersonation", "Violent & Hateful Entities",
      ]);
      cr.REPORT_REASONS.forEach(function (r) { assert.ok(r.subtext.length > 10, r.title); });
    });

    it("cannot be changed at runtime", function () {
      assert.equal(Object.isFrozen(cr.REPORT_REASONS), true);
      assert.equal(Object.isFrozen(cr.REPORT_REASONS[0]), true);
    });
  });

  describe("buildCommunityReport", function () {
    it("builds a community report filed by the session user", function () {
      var out = cr.buildCommunityReport(req(player, { reason: "Hate", details: "  slurs all over the description  " }), COMMUNITY);
      assert.deepEqual(out.report, {
        itemId: COMMUNITY, itemType: "community", reportType: "COMMUNITY_REPORT",
        reportedIssue: "Hate", additionalDetails: "slurs all over the description",
        reportedById: "507f1f77bcf86cd799439082",
        location: "in_app", impersonatedName: "",
        target: { kind: "community", id: COMMUNITY, fields: [] },
      });
    });

    // The page must not be able to choose who is reporting.
    it("ignores a reporter the page tries to set", function () {
      var out = cr.buildCommunityReport(req(player, { reason: "Spam", reportedById: "someone-else", itemId: "x" }), COMMUNITY);
      assert.equal(out.report.reportedById, "507f1f77bcf86cd799439082");
      assert.equal(out.report.itemId, COMMUNITY);
    });

    it("reads the id from either shape of session user", function () {
      assert.equal(cr.sessionUserId(req({ _id: "abc" })), "abc");
      assert.equal(cr.sessionUserId(req(null)), "");
    });

    it("refuses a logged-out request with 401", function () {
      var out = cr.buildCommunityReport(req(null, { reason: "Hate" }), COMMUNITY);
      assert.equal(out.status, 401);
      assert.equal(out.report, undefined);
    });

    it("refuses a reason that is not on the list", function () {
      ["", "hate", "Other", { $ne: "" }, undefined].forEach(function (reason) {
        var out = cr.buildCommunityReport(req(player, { reason: reason }), COMMUNITY);
        assert.equal(out.status, 400, JSON.stringify(reason));
      });
    });

    it("refuses a malformed community id", function () {
      ["", "abc", "../admin", COMMUNITY + "/x"].forEach(function (id) {
        assert.equal(cr.buildCommunityReport(req(player, { reason: "Hate" }), id).status, 400, id);
      });
    });

    it("enforces the same 2,000 character limit as the API and the app", function () {
      assert.equal(cr.MAX_REPORT_DETAILS, 2000);
      var ok = cr.buildCommunityReport(req(player, { reason: "Hate", details: new Array(2001).join("a") }), COMMUNITY);
      assert.ok(ok.report, "exactly 2,000 is allowed");
      var tooLong = cr.buildCommunityReport(req(player, { reason: "Hate", details: new Array(2002).join("a") }), COMMUNITY);
      assert.equal(tooLong.status, 400);
    });

    it("treats non-string details as empty, which then fails the length check", function () {
      var out = cr.buildCommunityReport(req(player, { reason: "Hate", details: { $gt: "" } }), COMMUNITY);
      assert.equal(out.status, 400);
      assert.match(out.error, /at least 20 characters/);
    });
  });

  // Every Child Safety report filed so far described something on Discord,
  // Xbox or in a game. We cannot see it, cannot verify it, and the platform
  // that could never hears about it.
  describe("location", function () {
    it("files only in-app reports", function () {
      ["discord", "xbox", "playstation", "in_game", "elsewhere"].forEach(function (loc) {
        var out = cr.buildCommunityReport(req(player, { reason: "Child Safety", location: loc }), COMMUNITY);
        assert.equal(out.status, 400, loc);
        assert.match(out.error, /posted in Lines Police CAD/);
      });
    });

    it("refuses a missing or invented location", function () {
      ["", "somewhere", undefined, 7].forEach(function (loc) {
        assert.equal(cr.buildCommunityReport(req(player, { reason: "Hate", location: loc }), COMMUNITY).status, 400, String(loc));
      });
    });

    it("offers the six locations, in-app first, with somewhere to send each", function () {
      assert.equal(cr.REPORT_LOCATIONS[0].id, "in_app");
      assert.deepEqual(cr.REPORT_LOCATIONS.map(function (l) { return l.id; }),
        ["in_app", "discord", "xbox", "playstation", "in_game", "elsewhere"]);
      ["discord", "xbox", "playstation"].forEach(function (id) {
        assert.ok(cr.OFF_PLATFORM_HELP[id].url.startsWith("https://"), id);
      });
      assert.equal(Object.isFrozen(cr.REPORT_LOCATIONS), true);
    });
  });

  describe("details and impersonation", function () {
    // A category with no detail is not actionable, and that is most of the
    // backlog.
    it("needs a real description", function () {
      ["", "   ", "spam", "he is bad"].forEach(function (details) {
        var out = cr.buildCommunityReport(req(player, { reason: "Spam", details: details }), COMMUNITY);
        assert.equal(out.status, 400, JSON.stringify(details));
        assert.match(out.error, /at least 20 characters/);
      });
    });

    it("needs to know who is being impersonated", function () {
      var out = cr.buildCommunityReport(req(player, {
        reason: "Impersonation", details: "this is a copy of the real community",
      }), COMMUNITY);
      assert.equal(out.status, 400);
      assert.match(out.error, /pretending to be/);

      out = cr.buildCommunityReport(req(player, {
        reason: "Impersonation", details: "this is a copy of the real community",
        impersonatedName: "  TROPICAL RP  ",
      }), COMMUNITY);
      assert.equal(out.report.impersonatedName, "TROPICAL RP");
    });

    it("only asks for that name on impersonation", function () {
      var out = cr.buildCommunityReport(req(player, { reason: "Spam", details: "scam links in the description" }), COMMUNITY);
      assert.equal(out.report.impersonatedName, "");
    });
  });
});

describe("community-report targets", function () {
  var COMMUNITY = "507f1f77bcf86cd799439081";
  var player = { _doc: { _id: "507f1f77bcf86cd799439082" } };
  function req(body) {
    return { user: player, body: Object.assign({ location: "in_app", details: "slurs all through the description" }, body) };
  }

  // The report says what is wrong, and the server then reads the community and
  // copies those fields. Nothing about the content is sent from the browser.
  it("carries a target the server can resolve", function () {
    var out = cr.buildCommunityReport(req({ reason: "Hate", fields: ["description", "imageLink"] }), COMMUNITY);
    assert.deepEqual(out.report.target, {
      kind: "community", id: COMMUNITY, fields: ["description", "imageLink"],
    });
    assert.equal("snapshot" in out.report, false, "the browser never sends the content itself");
  });

  // Someone who cannot pin down which part is wrong still has a real
  // complaint; the server snapshots the whole profile.
  it("allows no fields at all", function () {
    var out = cr.buildCommunityReport(req({ reason: "Hate" }), COMMUNITY);
    assert.deepEqual(out.report.target.fields, []);
  });

  // The field list is the allowlist. A report must not be able to name an
  // owner id, which would then be handed to the takedown action.
  it("refuses anything that is not part of a community profile", function () {
    ["ownerID", "subscription", "banList", "listingSuspension", "__proto__"].forEach(function (field) {
      var out = cr.buildCommunityReport(req({ reason: "Hate", fields: [field] }), COMMUNITY);
      assert.equal(out.status, 400, field);
    });
    assert.equal(cr.areCommunityFields(["description"]), true);
    assert.equal(cr.areCommunityFields([]), false);
    assert.equal(cr.areCommunityFields("description"), false);
  });
});
