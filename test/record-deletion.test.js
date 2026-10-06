var assert = require("assert");

var RecordDeletion = require("../public/js/record-deletion");

/*
 * Mirrors civilianRecordDeletionBlocked in police-cad-api
 * (api/handlers/record_deletion.go): the community setting only ever takes the
 * delete button away from the character's owner, and never from the community
 * owner or anyone holding administrator / manage records.
 */
describe("record-deletion", function () {
  function community(allow, roles) {
    var c = { ownerID: "community-owner", roles: roles || [] };
    if (allow !== undefined) c.allowCivilianRecordDeletion = allow;
    return c;
  }
  function role(perm, member, enabled) {
    return { members: [member], permissions: [{ name: perm, enabled: enabled !== false }] };
  }

  it("allows when the setting was never set", function () {
    assert.equal(RecordDeletion.canDelete(community(undefined), "player", "player"), true);
  });

  it("allows when the setting is on", function () {
    assert.equal(RecordDeletion.canDelete(community(true), "player", "player"), true);
  });

  it("allows when there is no community", function () {
    assert.equal(RecordDeletion.canDelete(null, "player", "player"), true);
  });

  it("blocks the character's owner when the setting is off", function () {
    assert.equal(RecordDeletion.canDelete(community(false), "player", "player"), false);
  });

  it("does not block an officer viewing someone else's character", function () {
    assert.equal(RecordDeletion.canDelete(community(false), "player", "officer"), true);
  });

  it("lets the community owner delete on their own character", function () {
    assert.equal(RecordDeletion.canDelete(community(false), "community-owner", "community-owner"), true);
  });

  it("lets administrator and manage records delete on their own character", function () {
    var c = community(false, [role("administrator", "admin"), role("manage records", "keeper")]);
    assert.equal(RecordDeletion.canDelete(c, "admin", "admin"), true);
    assert.equal(RecordDeletion.canDelete(c, "keeper", "keeper"), true);
  });

  it("does not treat a disabled permission or manage community settings as a bypass", function () {
    var c = community(false, [role("manage records", "p1", false), role("manage community settings", "p2")]);
    assert.equal(RecordDeletion.canDelete(c, "p1", "p1"), false);
    assert.equal(RecordDeletion.canDelete(c, "p2", "p2"), false);
  });

  it("recognises the API's restricted 403", function () {
    assert.equal(RecordDeletion.isRestrictedError({ status: 403, responseJSON: { error: "record_deletion_restricted" } }), true);
    assert.equal(RecordDeletion.isRestrictedError({ status: 403, responseText: '{"error":"record_deletion_restricted"}' }), true);
    assert.equal(RecordDeletion.isRestrictedError({ status: 403, responseJSON: { error: "forbidden" } }), false);
    assert.equal(RecordDeletion.isRestrictedError({ status: 500 }), false);
  });
});
