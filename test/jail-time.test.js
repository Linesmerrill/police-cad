/* eslint-env mocha */
var assert = require("assert");
var JailTime = require("../public/js/jail-time");

// Jail time is free text in every existing community — the shipped defaults
// spell it "3 minutes 30 seconds" — so splitting the editor into two number
// boxes has to read what is already there before it can write anything back.

describe("jail-time", function () {
  describe("parse", function () {
    it("reads the format the shipped defaults use", function () {
      assert.deepStrictEqual(JailTime.parse("3 minutes 30 seconds"), { minutes: 3, seconds: 30 });
      assert.deepStrictEqual(JailTime.parse("2 minutes"), { minutes: 2, seconds: 0 });
      assert.deepStrictEqual(JailTime.parse("45 seconds"), { minutes: 0, seconds: 45 });
      assert.deepStrictEqual(JailTime.parse("1 minute"), { minutes: 1, seconds: 0 });
    });

    it("reads abbreviations people actually type", function () {
      assert.deepStrictEqual(JailTime.parse("3m 30s"), { minutes: 3, seconds: 30 });
      assert.deepStrictEqual(JailTime.parse("3 min 30 sec"), { minutes: 3, seconds: 30 });
      assert.deepStrictEqual(JailTime.parse("5 mins"), { minutes: 5, seconds: 0 });
      assert.deepStrictEqual(JailTime.parse("30 secs"), { minutes: 0, seconds: 30 });
    });

    it("reads clock notation", function () {
      assert.deepStrictEqual(JailTime.parse("3:30"), { minutes: 3, seconds: 30 });
      assert.deepStrictEqual(JailTime.parse("10:05"), { minutes: 10, seconds: 5 });
    });

    it("treats a bare number as minutes, matching the old placeholder", function () {
      assert.deepStrictEqual(JailTime.parse("5"), { minutes: 5, seconds: 0 });
    });

    it("is case and whitespace insensitive", function () {
      assert.deepStrictEqual(JailTime.parse("  3 MINUTES 30 Seconds "), { minutes: 3, seconds: 30 });
    });

    it("gives zeroes for anything it cannot read, rather than throwing", function () {
      for (const bad of ["", "   ", "a while", "life", null, undefined, 42, {}]) {
        assert.deepStrictEqual(JailTime.parse(bad), { minutes: 0, seconds: 0 }, String(bad));
      }
    });

    it("does not read the s in minutes as seconds", function () {
      // The obvious way to write the seconds pattern also matches "minutes".
      assert.deepStrictEqual(JailTime.parse("3 minutes"), { minutes: 3, seconds: 0 });
    });
  });

  describe("normalize", function () {
    it("carries seconds over 59 into minutes", function () {
      assert.deepStrictEqual(JailTime.normalize({ minutes: 0, seconds: 90 }), { minutes: 1, seconds: 30 });
      assert.deepStrictEqual(JailTime.normalize({ minutes: 2, seconds: 120 }), { minutes: 4, seconds: 0 });
    });

    it("clamps negatives and rounds fractions down", function () {
      assert.deepStrictEqual(JailTime.normalize({ minutes: -5, seconds: -10 }), { minutes: 0, seconds: 0 });
      assert.deepStrictEqual(JailTime.normalize({ minutes: 1.9, seconds: 30.7 }), { minutes: 1, seconds: 30 });
    });

    it("survives junk input", function () {
      assert.deepStrictEqual(JailTime.normalize(null), { minutes: 0, seconds: 0 });
      assert.deepStrictEqual(JailTime.normalize({}), { minutes: 0, seconds: 0 });
    });
  });

  describe("format", function () {
    it("writes exactly what the shipped defaults look like", function () {
      assert.strictEqual(JailTime.format({ minutes: 3, seconds: 30 }), "3 minutes 30 seconds");
      assert.strictEqual(JailTime.format({ minutes: 2, seconds: 0 }), "2 minutes");
      assert.strictEqual(JailTime.format({ minutes: 0, seconds: 45 }), "45 seconds");
    });

    it("singularises", function () {
      assert.strictEqual(JailTime.format({ minutes: 1, seconds: 1 }), "1 minute 1 second");
    });

    it("gives an empty string for zero rather than '0 minutes'", function () {
      // "0 minutes" would read as a deliberate no-jail sentence.
      assert.strictEqual(JailTime.format({ minutes: 0, seconds: 0 }), "");
    });
  });

  describe("round trip", function () {
    it("leaves the shipped defaults byte-identical", function () {
      // The point of matching the canonical format: editing an untouched
      // violation and saving it must not rewrite the value.
      for (const v of ["3 minutes 30 seconds", "2 minutes", "45 seconds", "1 minute"]) {
        assert.strictEqual(JailTime.format(JailTime.parse(v)), v, v);
      }
    });

    it("canonicalises the variants", function () {
      assert.strictEqual(JailTime.format(JailTime.parse("3m 30s")), "3 minutes 30 seconds");
      assert.strictEqual(JailTime.format(JailTime.parse("3:30")), "3 minutes 30 seconds");
    });
  });

  describe("toSeconds", function () {
    it("totals for sorting and sentence maths", function () {
      assert.strictEqual(JailTime.toSeconds({ minutes: 3, seconds: 30 }), 210);
      assert.strictEqual(JailTime.toSeconds({ minutes: 0, seconds: 90 }), 90);
    });
  });
});
