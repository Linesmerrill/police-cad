var assert = require("assert");

var HousePromo = require("../public/js/house-promo");

/*
 * House promo records are hand-edited in Mongo and rendered into an ad slot on
 * a page the user is logged in to. safeUrl is the boundary between those two
 * facts: it is what stops a pasted ctaUrl from becoming a click handler.
 *
 * The DOM-driven parts of this file are exercised in a real browser during
 * verification; this pins the pure function that carries the security weight.
 */
describe("house promo safeUrl", function () {
  it("accepts the links these promos actually use", function () {
    assert.strictEqual(
      HousePromo.safeUrl("https://www.gofundme.com/f/help-my-brother-recover-2b-lost-runescape-gp"),
      "https://www.gofundme.com/f/help-my-brother-recover-2b-lost-runescape-gp"
    );
    assert.strictEqual(HousePromo.safeUrl("http://example.com/x?a=1&b=2"), "http://example.com/x?a=1&b=2");
  });

  it("trims surrounding whitespace rather than rejecting the link", function () {
    // Copy-pasted into a Mongo shell, a trailing newline is easy to leave in.
    assert.strictEqual(HousePromo.safeUrl("  https://example.com/x \n"), "https://example.com/x");
  });

  it("refuses a javascript: URL", function () {
    // The whole point. This would otherwise run on a logged-in dashboard.
    assert.strictEqual(HousePromo.safeUrl("javascript:alert(1)"), "");
    assert.strictEqual(HousePromo.safeUrl("JaVaScRiPt:alert(1)"), "");
    assert.strictEqual(HousePromo.safeUrl("  javascript:alert(1)"), "");
  });

  it("refuses other non-http schemes", function () {
    assert.strictEqual(HousePromo.safeUrl("data:text/html,<script>alert(1)</script>"), "");
    assert.strictEqual(HousePromo.safeUrl("vbscript:msgbox(1)"), "");
    assert.strictEqual(HousePromo.safeUrl("file:///etc/passwd"), "");
  });

  it("refuses a protocol-relative or bare path, which cannot be verified by eye", function () {
    assert.strictEqual(HousePromo.safeUrl("//evil.test/x"), "");
    assert.strictEqual(HousePromo.safeUrl("/somewhere"), "");
  });

  it("treats missing values as no link", function () {
    assert.strictEqual(HousePromo.safeUrl(""), "");
    assert.strictEqual(HousePromo.safeUrl(null), "");
    assert.strictEqual(HousePromo.safeUrl(undefined), "");
  });
});

describe("house promo isUnfilled", function () {
  it("treats a missing <ins> as unfilled", function () {
    // Nothing to displace, so the slot is ours to use.
    assert.strictEqual(HousePromo.isUnfilled(null), true);
  });
});
