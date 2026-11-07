const assert = require("assert");
const crypto = require("crypto");
const {
  hashResetToken,
  isLegacyRawToken,
  resetTokenFilters,
} = require("../app/reset-token");

const FIELD = "user.resetPasswordToken";

// A token in the shape /forgot-password used to write: randomBytes(20) hex.
const legacyToken = crypto.randomBytes(20).toString("hex");
// A token in the shape both sides write now: randomBytes(32) hex.
const modernToken = crypto.randomBytes(32).toString("hex");

function storedValues(token) {
  return resetTokenFilters(token).map((f) => f[FIELD]);
}

describe("reset-token", function () {
  describe("hashResetToken", function () {
    it("is sha256 of the token, which is what both sides store", function () {
      assert.strictEqual(
        hashResetToken(modernToken),
        crypto.createHash("sha256").update(modernToken).digest("hex")
      );
    });

    it("never returns the token it was given", function () {
      assert.notStrictEqual(hashResetToken(modernToken), modernToken);
      assert.notStrictEqual(hashResetToken(legacyToken), legacyToken);
    });

    it("always produces the 64-hex shape", function () {
      assert.match(hashResetToken("anything at all"), /^[a-f0-9]{64}$/);
    });
  });

  describe("resetTokenFilters", function () {
    it("finds a token stored as its hash", function () {
      assert.ok(storedValues(modernToken).includes(hashResetToken(modernToken)));
    });

    it("also accepts a legacy raw token, so links already sent still work", function () {
      assert.deepStrictEqual(storedValues(legacyToken), [
        hashResetToken(legacyToken),
        legacyToken,
      ]);
    });

    it("offers no raw branch for a 64-hex token", function () {
      // The guard that matters. The supplied token and the stored value share
      // one field, so a raw branch here would mean handing back a stored hash
      // opened the account.
      assert.deepStrictEqual(storedValues(modernToken), [hashResetToken(modernToken)]);
    });

    it("cannot be satisfied by replaying a stored hash as the token", function () {
      const stored = hashResetToken(legacyToken);
      assert.ok(
        !storedValues(stored).includes(stored),
        "a stored hash supplied as a token must not match the row it came from"
      );
    });

    it("offers no raw branch for a token that is not hex", function () {
      const notHex = "z".repeat(40);
      assert.deepStrictEqual(storedValues(notHex), [hashResetToken(notHex)]);
    });

    it("offers no raw branch for a 39- or 41-character token", function () {
      assert.strictEqual(resetTokenFilters("a".repeat(39)).length, 1);
      assert.strictEqual(resetTokenFilters("a".repeat(41)).length, 1);
    });

    it("returns nothing for an empty token, so callers refuse instead of querying", function () {
      // Mongo rejects `$or: []`, so an empty list has to mean "do not query".
      assert.deepStrictEqual(resetTokenFilters(""), []);
      assert.deepStrictEqual(resetTokenFilters(null), []);
      assert.deepStrictEqual(resetTokenFilters(undefined), []);
    });
  });

  describe("isLegacyRawToken", function () {
    it("accepts the 40-hex legacy shape in either case", function () {
      assert.ok(isLegacyRawToken(legacyToken));
      assert.ok(isLegacyRawToken(legacyToken.toUpperCase()));
    });

    it("rejects a hash and anything else", function () {
      assert.ok(!isLegacyRawToken(hashResetToken(legacyToken)));
      assert.ok(!isLegacyRawToken(modernToken));
      assert.ok(!isLegacyRawToken(""));
      assert.ok(!isLegacyRawToken(null));
    });
  });
});
