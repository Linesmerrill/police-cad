var assert = require("assert");
var cr = require("../app/community-report");

describe("community-report", function () {
  var COMMUNITY = "507f1f77bcf86cd799439081";
  function req(user, body) { return { user: user, body: body }; }
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
      var out = cr.buildCommunityReport(req(player, { reason: "Hate", details: "  slurs in the description  " }), COMMUNITY);
      assert.deepEqual(out.report, {
        itemId: COMMUNITY, itemType: "community", reportType: "COMMUNITY_REPORT",
        reportedIssue: "Hate", additionalDetails: "slurs in the description",
        reportedById: "507f1f77bcf86cd799439082",
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

    it("treats non-string details as empty rather than forwarding them", function () {
      var out = cr.buildCommunityReport(req(player, { reason: "Hate", details: { $gt: "" } }), COMMUNITY);
      assert.equal(out.report.additionalDetails, "");
    });
  });
});
