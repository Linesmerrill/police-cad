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

  describe("the Reports editor", function () {
    var src = read("views/report-edit.ejs");

    it("caps the narrative at 1000", function () {
      assert.ok(
        src.indexOf("var NARRATIVE_MAX_LENGTH = 1000;") !== -1,
        "the cap is gone"
      );
      // The textarea branch is generic, so the maxlength has to be conditional
      // on the field being the narrative - otherwise it caps every textarea.
      assert.ok(
        /capped \? ' maxlength="' \+ NARRATIVE_MAX_LENGTH \+ '"' : ''/.test(src),
        "the narrative textarea has no maxlength"
      );
      assert.ok(
        src.indexOf("var capped = isNarrativeField(f);") !== -1,
        "the cap is not gated on the field being the narrative"
      );
    });

    it("caps the narrative and nothing else", function () {
      assert.ok(
        /function isNarrativeField\(f\) \{\s*return !!f && f\.id === NARRATIVE_FIELD_ID;/.test(src),
        "the narrative is no longer identified by field id"
      );
      assert.ok(
        src.indexOf("var NARRATIVE_FIELD_ID = 'narrative';") !== -1,
        "the narrative field id changed"
      );
      // Every other field type must stay uncapped: one maxlength in the whole
      // renderField switch, and it is the conditional one above.
      var render = src.slice(
        src.indexOf("function renderField(f, sectionId, rowIdx)"),
        src.indexOf("function readValue(data, sectionId, fieldId, rowIdx)")
      );
      assert.ok(render.length > 0, "renderField is gone");
      assert.strictEqual(
        (render.match(/maxlength/g) || []).length,
        1,
        "a second field in the reports editor picked up a maxlength"
      );
    });

    it("counts in the house format, <n>/1000", function () {
      // No spaces around the slash, same as the arrest form's counter.
      assert.ok(
        src.indexOf("counter.textContent = len + '/' + NARRATIVE_MAX_LENGTH;") !== -1,
        "the counter copy drifted from <n>/1000"
      );
      assert.ok(
        /'<div class="rp-char-count">' \+ String\(value \|\| ''\)\.length \+ '\/' \+ NARRATIVE_MAX_LENGTH/.test(src),
        "the counter does not render the current length on load"
      );
    });

    it("keeps the counter live, and honest about an over-length report", function () {
      // A report saved before the cap can already be over it; maxlength will
      // not trim it, so the counter has to say so on load as well as on input.
      assert.ok(
        src.indexOf("el.addEventListener('input', function () { updateCharCount(el, counter); });") !== -1,
        "the counter does not update as the narrative is typed"
      );
      assert.ok(
        src.indexOf("counter.classList.toggle('is-over', len > NARRATIVE_MAX_LENGTH);") !== -1,
        "nothing marks an over-length narrative"
      );
      assert.ok(
        src.indexOf(".rp-char-count.is-over") !== -1,
        "the over-length state has no styling"
      );
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
