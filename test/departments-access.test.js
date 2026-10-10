var assert = require("assert");

var departmentAccessFor = require("../public/js/departments").departmentAccessFor;

/*
 * The department sidebar's owner/admin bypass for private departments. It used
 * to read ownerID and role off lastAccessedCommunity, which only ever holds
 * {communityID, createdAt}, so owners and admins saw every private
 * department as locked.
 */
describe("departments sidebar access", function () {
  function res(ownerID, roles) {
    return { community: { ownerID: ownerID, roles: roles || [] } };
  }

  it("treats the community owner as the owner", function () {
    assert.deepEqual(departmentAccessFor(res("owner1"), "owner1"), { isOwner: true, isAdmin: false });
  });

  it("treats a member of a role with enabled administrator as an admin", function () {
    var roles = [{ members: ["u2"], permissions: [{ name: "administrator", enabled: true }] }];
    assert.deepEqual(departmentAccessFor(res("owner1", roles), "u2"), { isOwner: false, isAdmin: true });
  });

  it("ignores a disabled administrator permission and other permissions", function () {
    var roles = [{ members: ["u3"], permissions: [
      { name: "administrator", enabled: false },
      { name: "manage departments", enabled: true },
    ] }];
    assert.deepEqual(departmentAccessFor(res("owner1", roles), "u3"), { isOwner: false, isAdmin: false });
  });

  it("gives no bypass when the community could not be read", function () {
    assert.deepEqual(departmentAccessFor(null, "owner1"), { isOwner: false, isAdmin: false });
  });
});
