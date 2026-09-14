/* eslint-env mocha */
var assert = require("assert");
var BalanceAdjust = require("../public/js/balance-adjust");

// This turns what an admin typed into a change to someone's money, so the
// failure that matters is a silent misread, not a thrown error.

describe("balance-adjust", function () {
  describe("parseCents", function () {
    it("reads plain amounts", function () {
      assert.strictEqual(BalanceAdjust.parseCents("250"), 25000);
      assert.strictEqual(BalanceAdjust.parseCents("250.5"), 25050);
      assert.strictEqual(BalanceAdjust.parseCents("250.50"), 25050);
      assert.strictEqual(BalanceAdjust.parseCents(250), 25000);
    });

    it("reads thousands separators and a dollar sign", function () {
      // "1,000" misread as 1 would be a thousand-fold error.
      assert.strictEqual(BalanceAdjust.parseCents("1,000"), 100000);
      assert.strictEqual(BalanceAdjust.parseCents("$600,000"), 60000000);
      assert.strictEqual(BalanceAdjust.parseCents(" $1,200.00 "), 120000);
    });

    it("avoids floating point rounding traps", function () {
      // 0.29 * 100 is 28.999... in floating point.
      assert.strictEqual(BalanceAdjust.parseCents("0.29"), 29);
      assert.strictEqual(BalanceAdjust.parseCents("19.99"), 1999);
    });

    it("refuses a sign, so the toggle alone decides direction", function () {
      assert.strictEqual(BalanceAdjust.parseCents("-50"), null);
      assert.strictEqual(BalanceAdjust.parseCents("+50"), null);
    });

    it("refuses more than two decimal places rather than rounding", function () {
      assert.strictEqual(BalanceAdjust.parseCents("10.505"), null);
    });

    it("refuses zero, blanks and junk", function () {
      for (const bad of ["0", "0.00", "", "   ", "abc", "1e5", "12..5", null, undefined, {}]) {
        assert.strictEqual(BalanceAdjust.parseCents(bad), null, String(bad));
      }
    });
  });

  describe("signed", function () {
    it("adds as positive and removes as negative", function () {
      assert.strictEqual(BalanceAdjust.signed(5000, "add"), 5000);
      assert.strictEqual(BalanceAdjust.signed(5000, "remove"), -5000);
    });

    it("refuses an unknown direction instead of defaulting to add", function () {
      assert.strictEqual(BalanceAdjust.signed(5000, "subtract"), null);
      assert.strictEqual(BalanceAdjust.signed(5000, undefined), null);
    });

    it("refuses a non-positive amount", function () {
      assert.strictEqual(BalanceAdjust.signed(0, "add"), null);
      assert.strictEqual(BalanceAdjust.signed(-5, "add"), null);
      assert.strictEqual(BalanceAdjust.signed(NaN, "add"), null);
    });
  });

  describe("formatCents", function () {
    it("renders dollars with separators", function () {
      assert.strictEqual(BalanceAdjust.formatCents(25050), "$250.50");
      assert.strictEqual(BalanceAdjust.formatCents(60000000), "$600,000.00");
      assert.strictEqual(BalanceAdjust.formatCents(5), "$0.05");
      assert.strictEqual(BalanceAdjust.formatCents(0), "$0.00");
    });

    it("renders a negative balance", function () {
      assert.strictEqual(BalanceAdjust.formatCents(-1999), "-$19.99");
    });
  });
});
