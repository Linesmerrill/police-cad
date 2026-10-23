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
    it("resolves each of the five actions", function () {
      assert.equal(proxy.reportActionPath("preview"), "uphold/preview");
      assert.equal(proxy.reportActionPath("uphold"), "uphold");
      assert.equal(proxy.reportActionPath("dismiss"), "dismiss");
      assert.equal(proxy.reportActionPath("escalate"), "escalate");
      assert.equal(proxy.reportActionPath("reopen"), "reopen");
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

  describe("safeHttpUrl", function () {
    it("keeps plain http and https links", function () {
      assert.equal(proxy.safeHttpUrl("https://res.cloudinary.com/x/logo.png"), "https://res.cloudinary.com/x/logo.png");
      assert.equal(proxy.safeHttpUrl("  http://example.com/a.png  "), "http://example.com/a.png");
    });

    // Every link on the preview was typed by the community's owner. Anything
    // that is not a plain web link must never reach an href or a src.
    it("drops script, data and malformed links", function () {
      [
        "javascript:alert(1)",
        "JAVASCRIPT:alert(1)",
        "data:image/svg+xml;base64,PHN2Zz4=",
        "//evil.example/x.png",
        "https://ok.example/a.png\" onerror=\"alert(1)",
        "https://ok.example/a b.png",
        "ftp://example.com/x",
        "",
        null,
        undefined,
        42,
      ].forEach(function (v) { assert.strictEqual(proxy.safeHttpUrl(v), "", String(v)); });
    });
  });

  describe("communityPreviewView", function () {
    it("carries the community's presentation with every link checked", function () {
      const view = proxy.communityPreviewView({
        id: "6adab9b0c602a448a910d97e",
        name: "Chicago xbox roleplay",
        imageLink: "https://res.cloudinary.com/x/logo.png",
        description: "Serious RP on Xbox.",
        tags: ["Xbox", "", 7, "GTA RP"],
        membersCount: 2,
        discordInviteUrl: "javascript:alert(1)",
        owner: { id: "6ab2f588ff0ab400157a820a", username: "ghosthunter" },
        departments: [
          { name: "CPD", description: "Chicago Police", image: "https://res.cloudinary.com/x/cpd.png" },
          { name: "", image: "data:text/html,boom" },
        ],
        events: [{ title: "Patrol night", image: "https://res.cloudinary.com/x/e.png" }],
      });

      assert.equal(view.name, "Chicago xbox roleplay");
      assert.equal(view.imageLink, "https://res.cloudinary.com/x/logo.png");
      assert.deepEqual(view.tags, ["Xbox", "GTA RP"]);
      assert.equal(view.discordInviteUrl, "", "an unsafe invite is dropped, not shown as a link");
      assert.equal(view.ownerName, "ghosthunter");
      assert.equal(view.departments[0].image, "https://res.cloudinary.com/x/cpd.png");
      assert.equal(view.departments[1].name, "Unnamed department");
      assert.equal(view.departments[1].image, "");
      assert.equal(view.events[0].title, "Patrol night");
    });

    // A community created at 01:34 UTC on the 23rd was created on the 23rd,
    // whatever timezone the server rendering the page happens to run in.
    it("dates the community in UTC", function () {
      const view = proxy.communityPreviewView({ createdAt: "2026-10-23T01:34:40Z", pendingDeletionAt: "nonsense" });
      assert.equal(view.createdAt, "Oct 23, 2026");
      assert.equal(view.pendingDeletionAt, "");
    });

    it("fills every field for a sparse or missing community", function () {
      const view = proxy.communityPreviewView(undefined);
      assert.equal(view.name, "Unnamed community");
      assert.equal(view.membersCount, 0);
      assert.deepEqual(view.tags, []);
      assert.deepEqual(view.departments, []);
      assert.deepEqual(view.events, []);
      assert.deepEqual(view.onboardingSteps, []);
      assert.equal(view.listingSuspended, false);
    });
  });
});
