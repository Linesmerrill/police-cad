var assert = require("assert");
var cr = require("../app/content-report");

describe("content-report", function () {
  var ID = "507f1f77bcf86cd799439095";
  var PARENT = "507f1f77bcf86cd799439094";
  var COMMUNITY = "507f1f77bcf86cd799439081";
  var player = { _doc: { _id: "507f1f77bcf86cd799439082" } };

  function req(body) {
    return {
      user: player,
      body: Object.assign({
        kind: "announcement_comment", id: ID, parentId: PARENT, communityId: COMMUNITY,
        reason: "Hate", location: "in_app", details: "this comment is full of slurs",
      }, body),
    };
  }

  it("builds a report pointing at the comment", function () {
    var out = cr.buildContentReport(req({}));
    assert.deepEqual(out.report.target, {
      kind: "announcement_comment", id: ID, fields: [], parentId: PARENT,
    });
    assert.equal(out.report.reportedById, "507f1f77bcf86cd799439082");
    assert.equal("snapshot" in out.report, false, "the browser never sends the content itself");
  });

  // The queue groups by community, so a comment inside one still shows under
  // it rather than floating loose.
  it("groups a community's content under that community", function () {
    var out = cr.buildContentReport(req({}));
    assert.equal(out.report.itemId, COMMUNITY);
    assert.equal(out.report.itemType, "community");
  });

  it("refuses a kind that is not reportable", function () {
    ["civilian", "", "__proto__", "constructor", "toString"].forEach(function (kind) {
      assert.equal(cr.buildContentReport(req({ kind: kind })).status, 400, String(kind));
    });
  });

  // Content that lives inside something else cannot be found without knowing
  // what holds it.
  it("needs the parent for content inside another document", function () {
    assert.equal(cr.buildContentReport(req({ parentId: "" })).status, 400);
    assert.equal(cr.buildContentReport(req({ parentId: "nope" })).status, 400);
    // A feature request stands on its own.
    var out = cr.buildContentReport(req({ kind: "feature_request", parentId: "", communityId: "" }));
    assert.ok(out.report, out.error);
  });

  it("only accepts fields belonging to the kind", function () {
    assert.deepEqual(cr.buildContentReport(req({ fields: ["content"] })).report.target.fields, ["content"]);
    ["title", "ownerID", "imageUrls"].forEach(function (f) {
      assert.equal(cr.buildContentReport(req({ fields: [f] })).status, 400, f);
    });
  });

  it("carries the phase 1 rules", function () {
    assert.equal(cr.buildContentReport(req({ location: "discord" })).status, 400);
    assert.equal(cr.buildContentReport(req({ details: "nope" })).status, 400);
    assert.equal(cr.buildContentReport(req({ reason: "Impersonation" })).status, 400);
    assert.equal(cr.buildContentReport({ user: null, body: {} }).status, 401);
  });

  it("offers a field list for every kind it accepts", function () {
    Object.keys(cr.CONTENT_KINDS).forEach(function (kind) {
      var k = cr.contentKind(kind);
      assert.ok(k.fields.length > 0, kind);
      assert.ok(k.label, kind);
    });
    assert.equal(cr.contentKind("nonsense"), null);
  });
});
