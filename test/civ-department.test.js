var assert = require("assert");
var civ = require("../app/civ-department");

describe("civ-department", function () {
  var CIV = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Civilians", templateName: "Civilian", accessStatus: "approved" };
  var POLICE = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "LSPD", templateName: "Police", accessStatus: "approved" };

  function pages(list, totalCount) {
    var calls = [];
    var fetch = async function (page) {
      calls.push(page);
      return { data: list[page - 1] || [], totalCount: totalCount };
    };
    fetch.calls = calls;
    return fetch;
  }

  describe("findCivilianDepartment", function () {
    it("finds it on the first page", async function () {
      var f = pages([[POLICE, CIV]]);
      assert.strictEqual(await civ.findCivilianDepartment(f, 2), CIV);
      assert.deepStrictEqual(f.calls, [1]);
    });

    // A community with more departments than one page holds.
    it("keeps paging until it finds it", async function () {
      var f = pages([[POLICE, POLICE], [CIV]], 3);
      assert.strictEqual(await civ.findCivilianDepartment(f, 2), CIV);
      assert.deepStrictEqual(f.calls, [1, 2]);
    });

    // Pending or locked means the dashboard would refuse them anyway.
    it("skips a civilian department the player can't open", async function () {
      var pending = Object.assign({}, CIV, { accessStatus: "pending" });
      var f = pages([[pending]]);
      assert.strictEqual(await civ.findCivilianDepartment(f, 2), null);
    });

    it("returns null when there is none", async function () {
      var f = pages([[POLICE]]);
      assert.strictEqual(await civ.findCivilianDepartment(f, 2), null);
    });

    // A full last page must not send it paging forever.
    it("stops at the total even when the last page is full", async function () {
      var f = pages([[POLICE, POLICE]], 2);
      assert.strictEqual(await civ.findCivilianDepartment(f, 2), null);
      assert.deepStrictEqual(f.calls, [1]);
    });

    it("passes an API failure up so the route can fall back", async function () {
      await assert.rejects(civ.findCivilianDepartment(async function () { throw new Error("down"); }, 2));
    });

    it("ignores an id that isn't an ObjectId", async function () {
      var bad = Object.assign({}, CIV, { _id: "../../admin" });
      assert.strictEqual(await civ.findCivilianDepartment(pages([[bad]]), 2), null);
    });
  });

  describe("civDashboardPath", function () {
    // The same URL the community page builds, so the dashboard's access
    // check runs as it always has.
    it("builds the community page's URL", function () {
      var enc = function (s) { return "E(" + s + ")"; };
      assert.strictEqual(
        civ.civDashboardPath({ _id: CIV._id, name: "Civ & Co" }, "cccccccccccccccccccccccc", enc),
        "/civ-dashboard?dept=Civ%20%26%20Co&d=E(" + CIV._id + ")&c=E(cccccccccccccccccccccccc)"
      );
    });
  });
});
