var assert = require("assert");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/*
 * The arrest/police report narrative ("Narrative of Events", detailOfEvent)
 * was capped at 500 characters, which officers kept hitting mid-sentence.
 *
 * The trap these tests guard: maxlength="500" appears on dozens of other
 * textareas across the dashboards, and a blanket search-and-replace would have
 * widened all of them. Only the narrative moves.
 */
describe("report narrative length", function () {
  describe("the legacy arrest modal", function () {
    var src = read("views/arrest-modal.ejs");

    it("lets the narrative run to 1000 characters", function () {
      var narrative = src.match(/<textarea id="detail" name="detailOfEvent"[^>]*>/);
      assert.ok(narrative, "the narrative textarea is gone");
      assert.ok(/maxlength="1000"/.test(narrative[0]), narrative[0]);
    });

    it("leaves the Witnesses field at 500", function () {
      var witnesses = src.match(/<textarea id="actions-taken" name="actionsTaken"[\s\S]*?><\/textarea>/);
      assert.ok(witnesses, "the witnesses textarea is gone");
      assert.ok(/maxlength="500"/.test(witnesses[0]), witnesses[0]);
    });
  });

  describe("the command dashboard's arrest form", function () {
    var src = read("public/js/cd-action-forms.js");

    it("lets the narrative run to 1000 characters", function () {
      var ta = src.match(/<textarea id="cd-af-arr-narrative"[^>]*>/);
      assert.ok(ta, "the narrative textarea is gone");
      assert.ok(/maxlength="1000"/.test(ta[0]), ta[0]);
    });

    it("counts up to 1000", function () {
      assert.ok(
        src.indexOf("bindCharCounter('cd-af-arr-narrative', 'cd-af-arr-narrative-count', 1000, '/')") !== -1,
        "the counter is not bound to 1000"
      );
      // The counter copy is "<n>/1000" — no spaces around the slash.
      assert.ok(src.indexOf(">0/1000</div>") !== -1, "the counter does not start at 0/1000");
    });

    it("validates against 1000, and says so", function () {
      assert.ok(src.indexOf("narrative.length > 1000") !== -1, "the submit guard still uses 500");
      assert.ok(src.indexOf("'Narrative exceeds 1000 characters'") !== -1, "the error message still says 500");
      assert.ok(src.indexOf("narrative.length > 500") === -1, "a 500 narrative check survives");
    });

    it("leaves the Witnesses field and its counter at 500", function () {
      var ta = src.match(/<textarea id="cd-af-arr-witnesses"[^>]*>/);
      assert.ok(/maxlength="500"/.test(ta[0]), ta[0]);
      assert.ok(src.indexOf("bindCharCounter('cd-af-arr-witnesses', 'cd-af-arr-witnesses-count', 500)") !== -1);
      assert.ok(src.indexOf("witnesses.length > 500") !== -1, "the witnesses guard moved");
    });
  });

  // The blast radius check: every other 500-char textarea on the site is
  // untouched. 500 is still the right cap for a one-line note.
  it("does not widen any other textarea", function () {
    var FILES = [
      "views/arrest-modal.ejs",
      "views/police-dashboard.ejs",
      "views/ems-dashboard.ejs",
      "views/dispatch-dashboard.ejs",
      "views/civ-dashboard.ejs",
      "views/court-session.ejs",
      "public/js/dd-911.js",
      "public/js/cd-action-forms.js",
    ];
    var total = 0;
    FILES.forEach(function (rel) {
      total += (read(rel).match(/maxlength="500"/g) || []).length;
    });
    // 20 as of this change: 21 before, minus the one narrative that moved.
    assert.strictEqual(total, 20,
      "the number of maxlength=500 textareas changed — if that was deliberate, " +
      "update this count; if not, a narrative-only change has leaked");
  });

  it("raises only the narrative, by name", function () {
    // detailOfEvent is the narrative's field name end to end.
    var src = read("views/arrest-modal.ejs");
    var thousands = src.match(/maxlength="1000"/g) || [];
    assert.strictEqual(thousands.length, 1, "more than one field was widened in the arrest modal");
  });
});
