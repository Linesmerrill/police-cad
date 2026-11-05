var assert = require("assert");

var mod = require("../app/select-department-community");
var selectDepartmentCommunity = mod.selectDepartmentCommunity;
var encodedCommunityFromRedirect = mod.encodedCommunityFromRedirect;

function encodeId(id) {
  return Buffer.from(id, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

var COMMUNITY_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
var COMMUNITY_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

function req(memberships) {
  return { user: { _doc: { user: { communities: memberships } } } };
}

function redirectTo(communityId) {
  return "/command-dashboard?dept=Fire&d=" + encodeId("222222222222222222222222") +
    "&c=" + encodeId(communityId);
}

/*
 * POST /select-department validated the chosen department against
 * lastAccessedCommunity, which is only written when a community page is
 * visited. A dashboard reached by link, bookmark or in a second tab could be
 * on another community, and a department the user had every right to enter was
 * rejected as invalid.
 */
describe("select-department community", function () {
  it("takes the community the redirect is for", function () {
    var r = req([{ communityId: COMMUNITY_A, status: "approved" }]);
    assert.strictEqual(selectDepartmentCommunity(r, redirectTo(COMMUNITY_A)), COMMUNITY_A);
  });

  it("accepts an ObjectId membership entry, not only a string", function () {
    var r = req([{ communityId: { toString: function () { return COMMUNITY_A; } }, status: "approved" }]);
    assert.strictEqual(selectDepartmentCommunity(r, redirectTo(COMMUNITY_A)), COMMUNITY_A);
  });

  it("ignores a community the user is not an approved member of", function () {
    var r = req([{ communityId: COMMUNITY_A, status: "approved" }]);
    assert.strictEqual(selectDepartmentCommunity(r, redirectTo(COMMUNITY_B)), null);
  });

  it("ignores a membership that is still pending", function () {
    var r = req([{ communityId: COMMUNITY_A, status: "pending" }]);
    assert.strictEqual(selectDepartmentCommunity(r, redirectTo(COMMUNITY_A)), null);
  });

  it("ignores a redirect with no community on it", function () {
    var r = req([{ communityId: COMMUNITY_A, status: "approved" }]);
    assert.strictEqual(selectDepartmentCommunity(r, "/command-dashboard"), null);
  });

  it("ignores a ?c= that does not decode to an ObjectId", function () {
    var r = req([{ communityId: COMMUNITY_A, status: "approved" }]);
    assert.strictEqual(selectDepartmentCommunity(r, "/command-dashboard?c=not-an-id"), null);
  });

  it("ignores a raw ObjectId in ?c=, which is not the encoded form", function () {
    var r = req([{ communityId: COMMUNITY_A, status: "approved" }]);
    assert.strictEqual(selectDepartmentCommunity(r, "/command-dashboard?c=" + COMMUNITY_A), null);
  });

  it("returns null when there is no redirect or no user", function () {
    assert.strictEqual(selectDepartmentCommunity(req([]), ""), null);
    assert.strictEqual(selectDepartmentCommunity(req([]), undefined), null);
    assert.strictEqual(selectDepartmentCommunity({}, redirectTo(COMMUNITY_A)), null);
  });

  it("reads memberships off req.user.user when there is no _doc", function () {
    var r = { user: { user: { communities: [{ communityId: COMMUNITY_A, status: "approved" }] } } };
    assert.strictEqual(selectDepartmentCommunity(r, redirectTo(COMMUNITY_A)), COMMUNITY_A);
  });

  describe("encodedCommunityFromRedirect", function () {
    it("pulls ?c= out of a relative path", function () {
      assert.strictEqual(encodedCommunityFromRedirect("/x?a=1&c=abc&b=2"), "abc");
    });

    it("has nothing to pull from a path without it", function () {
      assert.strictEqual(encodedCommunityFromRedirect("/x?a=1"), null);
      assert.strictEqual(encodedCommunityFromRedirect(null), null);
    });
  });
});
