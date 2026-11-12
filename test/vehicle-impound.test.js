var assert = require("assert");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

var Flags = require("../public/js/vehicle-flags");

function loadHelper(overrides) {
  var stubWindow = Object.assign({ VehicleFlags: Flags }, overrides || {});
  var src = read("public/js/vehicle-impound.js");
  var mod = { exports: {} };
  new Function("window", "module", src)(stubWindow, mod);
  return stubWindow.VehicleImpound;
}

describe("vehicle-impound", function () {
  describe("copy", function () {
    // Exact strings, pinned so a refactor cannot reword them.
    it("uses the agreed wording", function () {
      var api = loadHelper();
      assert.strictEqual(api.COPY.impound, "Impound");
      assert.strictEqual(api.COPY.release, "Release");
      assert.strictEqual(api.COPY.badge, "Impounded");
      assert.strictEqual(api.COPY.impounded, "Vehicle impounded.");
      assert.strictEqual(api.COPY.released, "Vehicle released.");
    });

    it("labels the action by the vehicle's current state", function () {
      var api = loadHelper();
      assert.strictEqual(api.actionLabel({ isImpounded: "false" }), "Impound");
      assert.strictEqual(api.actionLabel({}), "Impound");
      assert.strictEqual(api.actionLabel({ isImpounded: "true" }), "Release");
    });
  });

  describe("the write", function () {
    function capture(overrides) {
      var sent = null;
      var ajaxOpts = null;
      var stub = Object.assign({
        jQuery: {
          ajax: function (opts) { ajaxOpts = opts; return opts; },
        },
      }, overrides || {});
      var api = loadHelper(stub);
      return {
        api: api,
        run: function (impound, done) {
          api.set("https://api.example", "veh1", impound, done);
          sent = ajaxOpts;
          return sent;
        },
        get opts() { return ajaxOpts; },
      };
    }

    it("PUTs the canonical encoding to the vehicle endpoint", function () {
      var c = capture();
      var opts = c.run(true);
      assert.strictEqual(opts.url, "https://api.example/api/v1/vehicle/veh1");
      assert.strictEqual(opts.method, "PUT");
      assert.deepStrictEqual(JSON.parse(opts.data), { isImpounded: "true" });
    });

    // The flag is written through VehicleFlags.toApi, not a literal — the
    // numeric encoding is read-only legacy and must never be written back.
    it("writes 'false' to release, never a select index", function () {
      var opts = capture().run(false);
      assert.deepStrictEqual(JSON.parse(opts.data), { isImpounded: "false" });
    });

    it("sends nothing but isImpounded, so no other flag is disturbed", function () {
      var body = JSON.parse(capture().run(true).data);
      assert.deepStrictEqual(Object.keys(body), ["isImpounded"]);
    });

    it("announces the impound, then calls back so the UI can update at once", function () {
      var toasts = [];
      var calledBack = 0;
      var c = capture({ ddToast: function (m, t) { toasts.push([m, t]); } });
      c.run(true, function () { calledBack++; });
      c.opts.success();
      assert.deepStrictEqual(toasts, [["Vehicle impounded.", "success"]]);
      assert.strictEqual(calledBack, 1);
    });

    it("announces a release", function () {
      var toasts = [];
      var c = capture({ ddToast: function (m, t) { toasts.push([m, t]); } });
      c.run(false);
      c.opts.success();
      assert.deepStrictEqual(toasts, [["Vehicle released.", "success"]]);
    });

    it("does not call back when the write fails", function () {
      var calledBack = 0;
      var toasts = [];
      var c = capture({ ddToast: function (m, t) { toasts.push([m, t]); } });
      c.run(true, function () { calledBack++; });
      c.opts.error();
      assert.strictEqual(calledBack, 0, "the UI would have shown an impound that never happened");
      assert.strictEqual(toasts[0][1], "error");
    });
  });

  describe("toasts", function () {
    // ddToast exists on the command and department dashboards; showToast on
    // the police, dispatch and EMS ones. No page has both.
    it("prefers ddToast", function () {
      var seen = [];
      var api = loadHelper({
        ddToast: function (m, t) { seen.push(["dd", m, t]); },
        showToast: function (m, t) { seen.push(["show", m, t]); },
      });
      api.notify("hi", "success");
      assert.deepStrictEqual(seen, [["dd", "hi", "success"]]);
    });

    it("falls back to showToast where ddToast does not exist", function () {
      var seen = [];
      var api = loadHelper({ showToast: function (m, t) { seen.push([m, t]); } });
      api.notify("hi", "success");
      assert.deepStrictEqual(seen, [["hi", "success"]]);
    });

    it("reports rather than throwing on a page with neither", function () {
      assert.strictEqual(loadHelper().notify("hi", "success"), false);
    });
  });
});

/*
 * Guards. The badge has to appear everywhere the Stolen badge appears, and the
 * civilian-facing surfaces must show it without offering a way to clear it.
 */
describe("impound is wired into every vehicle surface", function () {
  var BADGE_SURFACES = [
    ["public/js/cd-vehicle-search.js", "the command dashboard's plate/vehicle search"],
    ["public/js/plate-database.js", "the police and dispatch plate lookup"],
    ["public/js/search-database.js", "the police and dispatch search results"],
    ["public/js/details-modal.js", "the vehicle details modal"],
    ["public/js/cd-person-search.js", "the person search's vehicle cards"],
    ["public/js/dd-vehicles.js", "the department dashboard's vehicles panel"],
    ["public/js/dd-civilians.js", "the civilian's own vehicle cards"],
    ["public/js/community-details.js", "the community records browser"],
    ["public/js/modern-dashboard.js", "the civilian dashboard"],
  ];

  BADGE_SURFACES.forEach(function (pair) {
    it(pair[1] + " shows the Impounded badge", function () {
      var src = read(pair[0]);
      assert.ok(/VehicleFlags\.impounded|Flags\.impounded/.test(src),
        pair[0] + " does not read the impound flag");
      assert.ok(src.indexOf("VehicleImpound.COPY.badge") !== -1,
        pair[0] + " does not render the badge copy");
    });
  });

  it("reads the flag through the shared helper, never a hand-rolled test", function () {
    BADGE_SURFACES.concat([["public/js/vehicle-impound.js", "the helper"]]).forEach(function (pair) {
      var src = read(pair[0]);
      assert.ok(
        !/isImpounded\s*===\s*["']2["']/.test(src),
        pair[0] + ' treats "2" as impounded; isImpounded has no select-index encoding'
      );
    });
  });

  // Only the surfaces that can already mark a vehicle stolen get the action.
  it("offers Impound/Release exactly where Report Stolen is offered", function () {
    var withAction = ["public/js/cd-vehicle-search.js", "public/js/details-modal.js"];
    withAction.forEach(function (rel) {
      var src = read(rel);
      assert.ok(/Report Stolen|Mark as Not Stolen/.test(src), rel + " has no stolen action to sit beside");
      assert.ok(src.indexOf("VehicleImpound.set(") !== -1, rel + " cannot write the flag");
    });
  });

  it("gives the civilian's own vehicle cards no way to clear it", function () {
    ["public/js/dd-civilians.js", "public/js/modern-dashboard.js", "public/js/community-details.js"].forEach(function (rel) {
      var src = read(rel);
      assert.ok(src.indexOf("VehicleImpound.set(") === -1,
        rel + " lets a civilian release their own vehicle");
      assert.ok(src.indexOf("VehicleImpound.actionLabel") === -1,
        rel + " renders an Impound/Release control on a civilian surface");
    });
  });

  it("every page that shows the badge loads the helper and the flag reader", function () {
    var PAGES = [
      "views/police-dashboard.ejs",
      "views/dispatch-dashboard.ejs",
      "views/command-dashboard.ejs",
      "views/department-dashboard.ejs",
      "views/civ-dashboard.ejs",
      "views/community-details.ejs",
    ];
    PAGES.forEach(function (rel) {
      var src = read(rel);
      assert.ok(src.indexOf("/static/js/vehicle-impound.js") !== -1, rel + " does not load vehicle-impound.js");
      assert.ok(src.indexOf("/static/js/vehicle-flags.js") !== -1, rel + " does not load vehicle-flags.js");
    });
  });
});
