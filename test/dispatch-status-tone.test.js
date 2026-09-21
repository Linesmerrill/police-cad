/* eslint-env mocha */
var assert = require("assert");
var fs = require("fs");
var path = require("path");

// window.cdStatusColor lives inline in command-dashboard.ejs, so it is lifted
// out of the template and evaluated here rather than copied — a copy would go
// stale the moment the real one changed.
function loadStatusColor() {
  var view = path.join(__dirname, "..", "views", "command-dashboard.ejs");
  var source = fs.readFileSync(view, "utf8");
  var marker = "window.cdStatusColor = window.cdStatusColor || function(code, desc, category) {";
  var start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, "cdStatusColor not found in command-dashboard.ejs");

  var open = source.indexOf("{", start + marker.length - 1);
  var depth = 0;
  var end = -1;
  for (var i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  assert.notStrictEqual(end, -1, "could not read the end of cdStatusColor");

  var window = {};
  // eslint-disable-next-line no-new-func
  new Function("window", source.slice(start, end) + ";")(window);
  return window.cdStatusColor;
}

describe("dispatch status tone", function () {
  var cdStatusColor = loadStatusColor();

  // The report: a community rewrote its ten-codes into plain Australian words,
  // marked a unit Available, and the unit never showed as available.
  describe("a community whose codes are words, not numbers", function () {
    it("reads the category the community set, whatever the wording", function () {
      assert.strictEqual(cdStatusColor("Mobile", "Free to respond", "available"), "available");
      assert.strictEqual(cdStatusColor("Tasked", "On a job", "busy"), "busy");
      assert.strictEqual(cdStatusColor("Urgent", "Assistance required", "emergency"), "emergency");
    });

    it("treats an off-duty code as not available", function () {
      assert.strictEqual(cdStatusColor("Knock off", "Shift over", "off-duty"), "busy");
    });

    it("still recognises a code literally named Available, with nothing set", function () {
      assert.strictEqual(cdStatusColor("Available", "", ""), "available");
    });

    it("is the case that used to fall through to other", function () {
      // No category, no English marker anywhere: nothing can be inferred, and
      // the unit is left alone rather than guessed at.
      assert.strictEqual(cdStatusColor("Mobile", "Free to respond", ""), "other");
    });
  });

  describe("the standard codes, with no category set", function () {
    it("still classifies by text", function () {
      assert.strictEqual(cdStatusColor("10-8", "In Service"), "available");
      assert.strictEqual(cdStatusColor("Code 4", "Under Control"), "available");
      assert.strictEqual(cdStatusColor("10-6", "Busy"), "busy");
      assert.strictEqual(cdStatusColor("10-7", "Out of Service"), "busy");
      assert.strictEqual(cdStatusColor("Signal 100", "HOLD ALL BUT EMERGENCY"), "emergency");
      assert.strictEqual(cdStatusColor("10-20", "Location"), "other");
    });
  });

  describe("precedence", function () {
    it("lets the community's category win over the text", function () {
      // A community that reuses "10-8" for something else says so, and dispatch
      // believes them rather than the number.
      assert.strictEqual(cdStatusColor("10-8", "In Service", "busy"), "busy");
    });

    it("ignores a category it does not know", function () {
      assert.strictEqual(cdStatusColor("10-8", "In Service", "banana"), "available");
    });
  });
});
