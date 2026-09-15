/* eslint-env mocha */
var assert = require("assert");
var SV = require("../public/js/settings-validation");

function ok(key, raw, expected) {
  var r = SV.validate(key, raw);
  assert.strictEqual(r.ok, true, key + " " + JSON.stringify(raw) + ": " + r.message);
  assert.strictEqual(r.value, expected);
}
function bad(key, raw) {
  var r = SV.validate(key, raw);
  assert.strictEqual(r.ok, false, key + " " + JSON.stringify(raw) + " should be rejected");
  assert.ok(r.message && r.message.length > 0, "a rejection must say why");
}

// The reported case: the response window accepted -20, silently saved a typed 0
// as 3, and let around 4 billion through to the API.

describe("settings-validation", function () {
  describe("the reported response window inputs", function () {
    it("rejects -20, 0 and 4 billion, each with a message", function () {
      bad("respondDays", "-20");
      bad("respondDays", "0");
      bad("respondDays", "4000000000");
    });

    it("accepts a sensible window, up to a year", function () {
      ok("respondDays", "1", 1);
      ok("respondDays", "3", 3);
      ok("respondDays", "365", 365);
      bad("respondDays", "366");
    });

    it("names the allowed range in the message", function () {
      var r = SV.validate("respondDays", "0");
      assert.ok(/1 to 365 days/.test(r.message), r.message);
    });
  });

  describe("day fields", function () {
    ["defaultDueDays", "contestExtensionDays"].forEach(function (key) {
      it(key + " is 1 to 365", function () {
        ok(key, "14", 14);
        ok(key, "365", 365);
        bad(key, "0");
        bad(key, "366");
      });
    });

    it("rejects decimals, exponents, words and blanks rather than guessing", function () {
      ["12.5", "1e3", "abc", "", "   ", null, undefined].forEach(function (raw) {
        bad("defaultDueDays", raw);
      });
    });
  });

  describe("money fields come back in cents", function () {
    it("reads dollars, separators and a dollar sign", function () {
      ok("defaultStartingBalance", "500", 50000);
      ok("defaultStartingBalance", "1,000.50", 100050);
      ok("defaultStartingBalance", "$10,000,000", 1000000000);
    });

    it("caps the starting balance at $10,000,000", function () {
      bad("defaultStartingBalance", "10000000.01");
      bad("defaultStartingBalance", "4000000000");
      bad("defaultStartingBalance", "-5");
    });

    it("refuses more than two decimal places", function () {
      bad("defaultStartingBalance", "10.505");
    });

    it("lets max transfer be 0 for the default, otherwise $1 to $100,000,000", function () {
      ok("maxTransferCents", "0", 0);
      ok("maxTransferCents", "1", 100);
      ok("maxTransferCents", "100,000,000", 10000000000);
      bad("maxTransferCents", "0.50");
      bad("maxTransferCents", "100000000.01");
    });

    it("says when zero means the default", function () {
      var r = SV.validate("maxTransferCents", "0.5");
      assert.ok(/0 to use the default/.test(r.message), r.message);
    });
  });

  describe("department fields match the API bounds", function () {
    it("max session is 1 minute to a week", function () {
      ok("maxSessionMinutes", "120", 120);
      ok("maxSessionMinutes", "10080", 10080);
      bad("maxSessionMinutes", "0");
      bad("maxSessionMinutes", "10081");
    });

    it("AFK grace is 10 seconds to a day, and 5 is reported, not turned into 60", function () {
      bad("afkGraceSeconds", "5");
      ok("afkGraceSeconds", "10", 10);
      ok("afkGraceSeconds", "86400", 86400);
    });

    it("AFK prompt is 30 seconds to a day", function () {
      bad("afkPromptIntervalSeconds", "29");
      ok("afkPromptIntervalSeconds", "600", 600);
    });

    it("base pay is $0 to $10,000,000", function () {
      ok("basePayPerHour", "25", 2500);
      bad("basePayPerHour", "10000000.01");
    });
  });

  it("rejects an unknown field rather than passing it through", function () {
    assert.strictEqual(SV.validate("nope", "5").ok, false);
  });
});
