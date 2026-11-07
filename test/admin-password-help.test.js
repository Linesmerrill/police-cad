const assert = require("assert");
const {
  isObjectId,
  resetSendBody,
  canIdentifyActor,
  resetSendPath,
} = require("../app/admin-password-help");

function reqWith(admin, body) {
  return { session: admin === null ? {} : { admin }, body: body || {} };
}

const STAFF = { id: "507f1f77bcf86cd799439021", email: "staff@example.com", roles: ["admin"] };

describe("admin-password-help", function () {
  describe("resetSendPath", function () {
    it("builds the member's reset-send path", function () {
      assert.strictEqual(
        resetSendPath("507f1f77bcf86cd799439022"),
        "/api/v1/admin/users/507f1f77bcf86cd799439022/reset-password"
      );
    });

    it("refuses anything that is not a member id", function () {
      // Validated rather than interpolated: a crafted segment must not be
      // able to steer the proxy at another endpoint.
      assert.strictEqual(resetSendPath("../../admin/users"), null);
      assert.strictEqual(resetSendPath("507f1f77bcf86cd799439022/../other"), null);
      assert.strictEqual(resetSendPath("not-an-id"), null);
      assert.strictEqual(resetSendPath(""), null);
      assert.strictEqual(resetSendPath(null), null);
    });
  });

  describe("resetSendBody", function () {
    it("takes the acting admin from the session", function () {
      assert.deepStrictEqual(resetSendBody(reqWith(STAFF)), {
        currentUser: { id: STAFF.id },
      });
    });

    it("sends the id and nothing else", function () {
      // An email would be a request string in a Mongo filter for no gain: the
      // API resolves the staff member by id and derives the name itself.
      assert.deepStrictEqual(Object.keys(resetSendBody(reqWith(STAFF)).currentUser), ["id"]);
    });

    it("ignores an identity the page tries to post", function () {
      // The whole point of proxying this is that the page cannot choose who
      // the reset is recorded against.
      const req = reqWith(STAFF, {
        currentUser: { id: "507f1f77bcf86cd799439099", email: "someone@else.com" },
        sentBy: "Someone Else",
      });
      assert.deepStrictEqual(resetSendBody(req), {
        currentUser: { id: STAFF.id },
      });
    });

    it("sends an empty string rather than undefined for a session with no admin", function () {
      assert.deepStrictEqual(resetSendBody(reqWith(null)), { currentUser: { id: "" } });
      assert.deepStrictEqual(resetSendBody(undefined), { currentUser: { id: "" } });
    });

    it("drops a non-string id, so an operator object cannot be forwarded", function () {
      assert.deepStrictEqual(resetSendBody(reqWith({ id: { $ne: null } })), {
        currentUser: { id: "" },
      });
    });
  });

  describe("canIdentifyActor", function () {
    it("accepts a session with an admin id", function () {
      assert.ok(canIdentifyActor(reqWith({ id: STAFF.id })));
    });

    it("rejects a session carrying only an email", function () {
      // Those sessions predate session.admin.id and need a fresh login.
      assert.ok(!canIdentifyActor(reqWith({ email: STAFF.email })));
    });

    it("rejects a session that names nobody the API could look up", function () {
      assert.ok(!canIdentifyActor(reqWith(null)));
      assert.ok(!canIdentifyActor(reqWith({ id: "not-an-id" })));
      assert.ok(!canIdentifyActor(reqWith({ id: { $ne: null } })));
    });
  });

  describe("isObjectId", function () {
    it("accepts 24 hex characters in either case", function () {
      assert.ok(isObjectId("507f1f77bcf86cd799439021"));
      assert.ok(isObjectId("507F1F77BCF86CD799439021"));
    });

    it("rejects everything else", function () {
      assert.ok(!isObjectId("507f1f77bcf86cd79943902"));
      assert.ok(!isObjectId("507f1f77bcf86cd7994390211"));
      assert.ok(!isObjectId(""));
      assert.ok(!isObjectId(null));
    });
  });
});
