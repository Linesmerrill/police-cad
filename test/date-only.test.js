/* eslint-env mocha */
var assert = require("assert");
var dateOnly = require("../public/js/date-only");

// The report: "some of my members have the day they were born off by 1 in the
// CAD". A birthday stored as "1998-03-15" or "1998-03-15T00:00:00Z" is UTC
// midnight, so `new Date(...).toLocaleDateString()` renders March 14 for every
// viewer behind UTC. These tests run under a timezone behind UTC on purpose.
describe("date-only", function () {
  var originalTZ;

  before(function () {
    originalTZ = process.env.TZ;
    process.env.TZ = "America/Los_Angeles"; // UTC-7/8
  });

  after(function () {
    process.env.TZ = originalTZ;
  });

  describe("the reported case: born on the 15th of March", function () {
    it("reads the 15th from a plain date", function () {
      assert.strictEqual(dateOnly.format("1998-03-15"), "Mar 15, 1998");
    });

    it("reads the 15th from a full ISO instant at UTC midnight", function () {
      assert.strictEqual(dateOnly.format("1998-03-15T00:00:00Z"), "Mar 15, 1998");
    });

    it("is what the old approach got wrong", function () {
      var theOldWay = new Date("1998-03-15T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      assert.strictEqual(theOldWay, "Mar 14, 1998", "precondition: the bug reproduces here");
      assert.notStrictEqual(dateOnly.format("1998-03-15T00:00:00Z"), theOldWay);
    });
  });

  describe("format", function () {
    it("handles the first of a month, where the shift crosses into the month before", function () {
      assert.strictEqual(dateOnly.format("2001-01-01T00:00:00Z"), "Jan 1, 2001");
    });

    it("accepts MM/DD/YYYY, which arrest reports store", function () {
      assert.strictEqual(dateOnly.format("03/15/1998"), "Mar 15, 1998");
    });

    it("spells the month out when asked", function () {
      assert.strictEqual(dateOnly.format("1998-03-15", { month: "long" }), "March 15, 1998");
    });

    it("says N/A for a missing date, and honours a given fallback", function () {
      assert.strictEqual(dateOnly.format(""), "N/A");
      assert.strictEqual(dateOnly.format(null), "N/A");
      assert.strictEqual(dateOnly.format(undefined, { fallback: "" }), "");
    });

    it("rejects the epoch placeholder older records carry", function () {
      assert.strictEqual(dateOnly.format("1970-01-01T00:00:00Z"), "N/A");
    });

    it("rejects a date that does not exist", function () {
      assert.strictEqual(dateOnly.format("1998-02-30"), "N/A");
      assert.strictEqual(dateOnly.format("1998-13-01"), "N/A");
    });

    it("accepts February 29 in a leap year and refuses it otherwise", function () {
      assert.strictEqual(dateOnly.format("2024-02-29"), "Feb 29, 2024");
      assert.strictEqual(dateOnly.format("2023-02-29"), "N/A");
    });
  });

  describe("age", function () {
    it("counts whole years on the calendar", function () {
      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, "0");
      var day = String(now.getDate()).padStart(2, "0");

      // A birthday that falls today, thirty years ago.
      assert.strictEqual(dateOnly.age(year - 30 + "-" + month + "-" + day), "30");
    });

    it("turns over on the day, not the day before", function () {
      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, "0");
      var day = String(now.getDate()).padStart(2, "0");
      var bornToday = year - 21 + "-" + month + "-" + day;

      assert.strictEqual(dateOnly.age(bornToday + "T00:00:00Z"), "21");
    });

    it("is blank without a usable date", function () {
      assert.strictEqual(dateOnly.age(""), "");
      assert.strictEqual(dateOnly.age("not a date"), "");
    });
  });

  describe("toInputValue", function () {
    it("gives an input type=date the day that was stored", function () {
      assert.strictEqual(dateOnly.toInputValue("1998-03-15T00:00:00Z"), "1998-03-15");
      assert.strictEqual(dateOnly.toInputValue("03/15/1998"), "1998-03-15");
      assert.strictEqual(dateOnly.toInputValue("1998-3-5"), "1998-03-05");
    });

    it("is blank when there is nothing to show", function () {
      assert.strictEqual(dateOnly.toInputValue(""), "");
    });
  });
});
