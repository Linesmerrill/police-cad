const assert = require("assert");
const {
  isObjectId,
  resetSendBody,
  canIdentifyActor,
  resetSendPath,
  resetDeliveryPath,
  deliveryStatus,
  DELIVERY_LABELS,
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

  describe("resetDeliveryPath", function () {
    it("builds the delivery-status path", function () {
      assert.strictEqual(
        resetDeliveryPath("507f1f77bcf86cd799439022"),
        "/api/v1/admin/users/507f1f77bcf86cd799439022/reset-email-delivery"
      );
    });

    it("refuses anything that is not a member id", function () {
      assert.strictEqual(resetDeliveryPath("507f1f77bcf86cd799439022/../other"), null);
      assert.strictEqual(resetDeliveryPath("not-an-id"), null);
      assert.strictEqual(resetDeliveryPath(""), null);
      assert.strictEqual(resetDeliveryPath(null), null);
    });
  });

  describe("deliveryStatus", function () {
    it("passes the five known labels through", function () {
      for (const label of DELIVERY_LABELS) {
        assert.strictEqual(deliveryStatus({ label }).label, label);
      }
    });

    it("keeps SendGrid's reason", function () {
      assert.deepStrictEqual(deliveryStatus({ label: "Blocked", reason: "  550 banned IP  " }), {
        label: "Blocked",
        reason: "550 banned IP",
      });
    });

    it("turns anything unrecognized into Unknown with no reason", function () {
      // Best-effort: a shape we did not expect must not reach the page.
      for (const body of [
        null,
        undefined,
        {},
        "Delivered",
        42,
        { label: "Exploded" },
        { label: "delivered" },
        { label: ["Delivered"] },
        { label: '<img src=x onerror="alert(1)">' },
      ]) {
        assert.deepStrictEqual(
          deliveryStatus(body),
          { label: "Unknown", reason: "" },
          `body ${JSON.stringify(body)} should be Unknown`
        );
      }
    });

    it("drops a reason on an Unknown, and a non-string reason", function () {
      assert.strictEqual(deliveryStatus({ label: "Unknown", reason: "anything" }).reason, "");
      assert.strictEqual(deliveryStatus({ label: "Bounced", reason: { $ne: null } }).reason, "");
      assert.strictEqual(deliveryStatus({ label: "Bounced" }).reason, "");
    });

    it("carries a reason containing HTML through verbatim", function () {
      // Verbatim is correct because the only sink is .text(); the console's
      // own test asserts that sink.
      const injected = '<img src=x onerror="alert(1)">';
      assert.strictEqual(deliveryStatus({ label: "Bounced", reason: injected }).reason, injected);
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
