var assert = require("assert");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/*
 * A warrant marked served (status "executed") had no actions at all in the
 * police dashboard's Warrant Database detail, so the officer who filed it
 * could not clear it. Withdraw only ever showed for pending/denied.
 *
 * The trap these tests guard: the fix is one line of gating away from handing
 * every officer a delete on every warrant in the community. The predicate must
 * stay exactly the one Withdraw already uses - the requesting officer - and
 * the new control must not appear on any civilian-facing warrant view.
 */
describe("deleting a served warrant", function () {
  var police = read("views/police-dashboard.ejs");

  describe("the police dashboard's warrant detail", function () {
    it("offers Delete on an executed warrant", function () {
      assert.ok(
        police.indexOf("d.status === 'executed' && d.requestingOfficerID === wmCurrentUserId") !== -1,
        "executed warrants have no delete branch"
      );
      assert.ok(
        /onclick="wmDeleteWarrant\(\\'' \+ w\._id \+ '\\'\)"><i class="fa fa-trash"><\/i> Delete</.test(police),
        "the Delete button is gone, or its label drifted"
      );
    });

    it("gives it to the requesting officer and nobody else", function () {
      // The same predicate as Withdraw. If these two ever disagree, somebody
      // widened one of them.
      var withdrawGate = "(d.status === 'pending' || d.status === 'denied') && d.requestingOfficerID === wmCurrentUserId";
      var deleteGate = "d.status === 'executed' && d.requestingOfficerID === wmCurrentUserId";
      assert.ok(police.indexOf(withdrawGate) !== -1, "the withdraw gate moved");
      assert.ok(police.indexOf(deleteGate) !== -1, "the delete gate moved");

      // Exactly one control invokes it, and it is the one inside the
      // executed-and-requesting-officer branch above. A second caller would
      // be a second, unreviewed gate.
      var callers = police.match(/onclick="wmDeleteWarrant\(/g) || [];
      assert.strictEqual(
        callers.length,
        1,
        "wmDeleteWarrant should have exactly one caller - a second is a new gate"
      );
      var branch = police.slice(
        police.indexOf(deleteGate),
        police.indexOf("// Build history timeline")
      );
      assert.ok(
        branch.indexOf("wmDeleteWarrant(") !== -1,
        "the Delete button is not inside the gated branch"
      );
    });

    it("asks before deleting, in the house modal", function () {
      var fn = police.slice(
        police.indexOf("function wmDeleteWarrant(warrantId)"),
        police.indexOf("window.wmDeleteWarrant = wmDeleteWarrant;")
      );
      assert.ok(fn.length > 0, "wmDeleteWarrant is gone");
      // ddModal, never a native confirm().
      assert.ok(fn.indexOf("ddModal({") !== -1, "the confirm is not the house modal");
      assert.ok(fn.indexOf("confirm(") === -1, "a native confirm() crept in");
      assert.ok(
        fn.indexOf("message: \"Delete this warrant? This can't be undone.\"") !== -1,
        "the confirm copy drifted"
      );
      assert.ok(fn.indexOf("confirmText: 'Delete'") !== -1, "the confirm button copy drifted");
      assert.ok(fn.indexOf("cancelText: 'Cancel'") !== -1, "the cancel button copy drifted");
    });

    it("deletes through the warrant endpoint and says so", function () {
      var fn = police.slice(
        police.indexOf("function wmDeleteWarrant(warrantId)"),
        police.indexOf("window.wmDeleteWarrant = wmDeleteWarrant;")
      );
      assert.ok(fn.indexOf("method: 'DELETE'") !== -1, "the delete does not DELETE");
      assert.ok(
        fn.indexOf("`${API_URL}/api/v1/warrant/${warrantId}`") !== -1,
        "the delete points somewhere other than the warrant endpoint"
      );
      assert.ok(
        fn.indexOf("showToast('Warrant deleted.', 'success')") !== -1,
        "the success toast copy drifted"
      );
      assert.ok(fn.indexOf("alert(") === -1, "a native alert() crept in");
    });

    it("has a modal to confirm with", function () {
      // ddModal comes from the partial; without it the button would throw.
      assert.ok(
        police.indexOf("include('partials/dd-modal')") !== -1,
        "the police dashboard no longer includes the shared modal"
      );
    });
  });

  describe("the surfaces that must not gain a delete", function () {
    it("leaves the civilian dashboard's warrants read-only", function () {
      var civ = read("public/js/civ-dashboard.js");
      assert.ok(
        (civ.match(/wmDeleteWarrant|ddDeleteWarrant/g) || []).length === 0,
        "a delete reached a civilian-facing warrant view"
      );
    });

    it("leaves the dispatch dashboard's warrant detail alone", function () {
      // Dispatch renders the same detail modal; this change is police-only.
      var dispatch = read("views/dispatch-dashboard.ejs");
      assert.ok(
        (dispatch.match(/wmDeleteWarrant/g) || []).length === 0,
        "the dispatch warrant detail picked up a delete"
      );
    });

    it("does not change who can delete in the shared warrant panels", function () {
      // dd-components.js already deletes any status, gated by the department's
      // allWarrants/reviewWarrants component flags. Untouched by this fix.
      var dd = read("public/js/dd-components.js");
      assert.ok(
        dd.indexOf("window.ddDeleteWarrant = function(warrantId, accusedName)") !== -1,
        "ddDeleteWarrant's signature changed - check the panels still work"
      );
    });
  });
});
