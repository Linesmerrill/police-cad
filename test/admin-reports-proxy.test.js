var assert = require("assert");
var proxy = require("../app/admin-reports-proxy");

describe("admin-reports-proxy", function () {
  function req(session, body) {
    return { session: session, body: body };
  }

  describe("buildActionBody", function () {
    // The reason the reports queue is proxied at all. If the page could say
    // who it was, a logged-in staff member could post as an owner.
    it("ignores a currentUser posted by the page", function () {
      var out = proxy.buildActionBody(req(
        { admin: { email: "staff@example.com", roles: ["admin"] } },
        { currentUser: { email: "owner@example.com", roles: ["owner"] }, reason: "confirmed" }
      ));
      assert.deepEqual(out.currentUser, { id: "", name: "", roles: ["admin"] });
      assert.equal(out.reason, "confirmed");
    });

    it("carries no roles at all when there is no admin session", function () {
      var out = proxy.buildActionBody(req({}, { currentUser: { roles: ["owner"] } }));
      assert.deepEqual(out.currentUser.roles, []);
    });

    it("drops non-string free text rather than forwarding objects", function () {
      var out = proxy.buildActionBody(req(
        { admin: { roles: ["admin"] } },
        { reason: { $gt: "" }, note: ["x"] }
      ));
      assert.equal(out.reason, "");
      assert.equal(out.note, "");
    });

    it("forwards sendEmail only when it is a real boolean", function () {
      var session = { admin: { roles: ["admin"] } };
      assert.equal(proxy.buildActionBody(req(session, { sendEmail: false })).sendEmail, false);
      assert.equal(proxy.buildActionBody(req(session, { sendEmail: true })).sendEmail, true);
      assert.equal("sendEmail" in proxy.buildActionBody(req(session, { sendEmail: "false" })), false);
      assert.equal("sendEmail" in proxy.buildActionBody(req(session, {})), false);
    });
  });

  describe("adminActor", function () {
    // Every admin who opens a report sees who decided it. That must be a name,
    // never a staff member's email address.
    it("never carries an email address", function () {
      var actor = proxy.adminActor(req({ admin: {
        id: "abc", email: "linesmerrill@gmail.com", name: "linesmerrill",
        firstName: "Merrill", lastName: "Lines", roles: ["owner"],
      } }));
      assert.equal(actor.name, "Merrill Lines");
      assert.equal(actor.id, "abc");
      assert.equal("email" in actor, false);
      assert.equal(JSON.stringify(actor).indexOf("@"), -1);
    });

    // session.admin.name falls back to the part of the email before the @.
    it("does not fall back to the session name when no first or last name is set", function () {
      var actor = proxy.adminActor(req({ admin: { email: "someone@example.com", name: "someone", roles: ["admin"] } }));
      assert.equal(actor.name, "");
    });

    it("uses whichever of first and last name is set", function () {
      assert.equal(proxy.adminDisplayName({ firstName: " Merrill " }), "Merrill");
      assert.equal(proxy.adminDisplayName({ lastName: "Lines" }), "Lines");
      assert.equal(proxy.adminDisplayName({ firstName: "a@b.com" }), "");
    });

    it("falls back to the single role field older admin records use", function () {
      var actor = proxy.adminActor(req({ admin: { email: "a@b.c", role: "owner" } }));
      assert.deepEqual(actor.roles, ["owner"]);
    });

    it("keeps only string roles", function () {
      var actor = proxy.adminActor(req({ admin: { roles: ["admin", 7, null, { x: 1 }] } }));
      assert.deepEqual(actor.roles, ["admin"]);
    });
  });

  describe("REPORT_ACTIONS", function () {
    it("maps the preview action to the nested API path", function () {
      assert.equal(proxy.REPORT_ACTIONS.preview, "uphold/preview");
    });

  });

  describe("reportActionPath", function () {
    it("resolves each of the four actions", function () {
      assert.equal(proxy.reportActionPath("preview"), "uphold/preview");
      assert.equal(proxy.reportActionPath("uphold"), "uphold");
      assert.equal(proxy.reportActionPath("dismiss"), "dismiss");
      assert.equal(proxy.reportActionPath("escalate"), "escalate");
    });

    // A crafted action segment must not reach another endpoint. "constructor"
    // and "__proto__" are the ones a plain object lookup gets wrong: both
    // resolve to something truthy from the prototype chain.
    it("returns null for anything else, including prototype keys", function () {
      ["reverse", "../offenses", "delete", "__proto__", "constructor", "toString", "hasOwnProperty", "", null, undefined]
        .forEach(function (a) { assert.strictEqual(proxy.reportActionPath(a), null, String(a)); });
    });

  });

  describe("REPORT_ACTIONS table", function () {
    it("cannot be modified at runtime", function () {
      assert.equal(Object.isFrozen(proxy.REPORT_ACTIONS), true);
    });
  });

  describe("isObjectId", function () {
    it("accepts a 24-character hex id", function () {
      assert.equal(proxy.isObjectId("507f1f77bcf86cd799439021"), true);
    });

    it("rejects anything that could reshape the upstream path", function () {
      ["", "507f1f77bcf86cd79943902", "../admin/reports", "507f1f77bcf86cd799439021/uphold", null, undefined]
        .forEach(function (v) { assert.equal(proxy.isObjectId(v), false, String(v)); });
    });
  });
});
