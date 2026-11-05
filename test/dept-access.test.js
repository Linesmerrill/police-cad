var assert = require("assert");

var ddDepartmentAccess = require("../public/js/dept-access").ddDepartmentAccess;
var legacyDepartmentAccessFor = require("../public/js/departments").departmentAccessFor;

/*
 * The owner/admin bypass for private departments on the command and
 * department dashboards. Those sidebars used to read ownerID and role off
 * dbUser.user.lastAccessedCommunity, which only holds
 * {communityID, createdAt}, so an owner saw their own private departments
 * locked with "Access Restricted".
 */
describe("dashboard sidebar department access", function () {
  function res(ownerID, roles) {
    return { community: { ownerID: ownerID, roles: roles || [] } };
  }

  var adminRole = [{ members: ["u2"], permissions: [{ name: "administrator", enabled: true }] }];

  it("treats the owner of the community being viewed as the owner", function () {
    assert.deepEqual(ddDepartmentAccess(res("owner1"), "owner1"), { isOwner: true, isAdmin: false });
  });

  it("accepts a bare community as well as the API envelope", function () {
    assert.deepEqual(ddDepartmentAccess({ ownerID: "owner1", roles: [] }, "owner1"), {
      isOwner: true,
      isAdmin: false,
    });
  });

  it("treats a member of a role with enabled administrator as an admin", function () {
    assert.deepEqual(ddDepartmentAccess(res("owner1", adminRole), "u2"), { isOwner: false, isAdmin: true });
  });

  it("ignores a disabled administrator permission and other permissions", function () {
    var roles = [{ members: ["u3"], permissions: [
      { name: "administrator", enabled: false },
      { name: "manage departments", enabled: true },
    ] }];
    assert.deepEqual(ddDepartmentAccess(res("owner1", roles), "u3"), { isOwner: false, isAdmin: false });
  });

  it("gives an administrator role no bypass to someone who is not in it", function () {
    assert.deepEqual(ddDepartmentAccess(res("owner1", adminRole), "u9"), { isOwner: false, isAdmin: false });
  });

  it("gives no bypass when the community could not be read", function () {
    assert.deepEqual(ddDepartmentAccess(null, "owner1"), { isOwner: false, isAdmin: false });
  });

  it("gives no bypass when there is no signed-in user", function () {
    assert.deepEqual(ddDepartmentAccess(res("owner1"), ""), { isOwner: false, isAdmin: false });
  });

  // The legacy sidebar (public/js/departments.js, used by the police,
  // dispatch and EMS dashboards) carries its own copy. Pin the two to the
  // same answers so a later fix to one is not lost on the other.
  it("agrees with the legacy sidebar's copy", function () {
    var cases = [
      [res("owner1"), "owner1"],
      [res("owner1", adminRole), "u2"],
      [res("owner1", adminRole), "u9"],
      [res("owner1", [{ members: ["u3"], permissions: [{ name: "administrator", enabled: false }] }]), "u3"],
      [null, "owner1"],
    ];
    cases.forEach(function (c) {
      assert.deepEqual(ddDepartmentAccess(c[0], c[1]), legacyDepartmentAccessFor(c[0], c[1]));
    });
  });
});
