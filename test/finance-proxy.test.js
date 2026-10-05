var assert = require("assert");
var financeProxy = require("../app/finance-proxy");

describe("finance-proxy", function () {
  describe("buildTransactionPatch", function () {
    var build = financeProxy.buildTransactionPatch;

    // The eye menu's "Hide all from <merchant>" and "Stop hiding". Dropping
    // this field left the API with nothing to change, so the click did nothing.
    it("forwards hide_merchant both ways", function () {
      assert.deepEqual(build({ hide_merchant: true }).body, { hide_merchant: true });
      assert.deepEqual(build({ hide_merchant: false }).body, { hide_merchant: false });
    });

    it("forwards hidden, tag_id and apply_to_merchant", function () {
      var tag = "0123456789abcdef01234567";
      assert.deepEqual(build({ hidden: true, tag_id: tag, apply_to_merchant: true }).body,
        { hidden: true, tag_id: tag, apply_to_merchant: true });
      assert.deepEqual(build({ tag_id: "" }).body, { tag_id: "" });
    });

    it("drops unknown fields and wrong types", function () {
      assert.deepEqual(build({ hidden: "true", hide_merchant: 1, apply_to_merchant: "yes", amount: 5 }).body, {});
      assert.deepEqual(build(undefined).body, {});
    });

    it("rejects a malformed tag id", function () {
      assert.equal(build({ tag_id: "{$gt:''}" }).error, "invalid tag id");
    });
  });
});
