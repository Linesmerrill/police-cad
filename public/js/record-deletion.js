/**
 * Civilian record deletion gate — window.RecordDeletion.
 *
 * Communities choose whether players may delete records (citations, written
 * warnings, arrest reports) on characters they own, via the community setting
 * "Allow civilians to delete their own records"
 * (community.allowCivilianRecordDeletion; unset means allowed).
 *
 * When it is off, only the character's OWNER loses the delete button, and only
 * if they are not the community owner and hold neither "administrator" nor
 * "manage records". Officers and everyone else keep the access they had.
 *
 * Mirrors civilianRecordDeletionBlocked in police-cad-api
 * (api/handlers/record_deletion.go) and police-cad-app/utils/permissions.js.
 */
(function (window) {
  'use strict';

  var BYPASS_PERMISSIONS = ['administrator', 'manage records'];

  function idOf(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (v.$oid) return String(v.$oid);
    return String(v);
  }

  /** Unset or anything but an explicit false reads as allowed. */
  function settingAllows(community) {
    return !community || community.allowCivilianRecordDeletion !== false;
  }

  function hasBypass(community, userId) {
    if (!community || !userId) return false;
    if (idOf(community.ownerID) === userId) return true;
    var roles = community.roles || [];
    for (var r = 0; r < roles.length; r++) {
      var role = roles[r];
      if (!role || !Array.isArray(role.members) || role.members.indexOf(userId) === -1) continue;
      var perms = role.permissions || [];
      for (var p = 0; p < perms.length; p++) {
        var perm = perms[p];
        if (perm && perm.enabled === true && BYPASS_PERMISSIONS.indexOf(perm.name) !== -1) return true;
      }
    }
    return false;
  }

  var RecordDeletion = {
    /**
     * Whether the viewer may delete a record on a character.
     *
     * @param {object} community inner community object (with ownerID, roles,
     *   allowCivilianRecordDeletion). Missing community means allowed.
     * @param {string} civilianOwnerId userID of the player who owns the character
     * @param {string} viewerId the signed-in user's id
     * @returns {boolean}
     */
    canDelete: function (community, civilianOwnerId, viewerId) {
      if (settingAllows(community)) return true;
      var owner = idOf(civilianOwnerId);
      var viewer = idOf(viewerId);
      if (!owner || !viewer || owner !== viewer) return true;
      return hasBypass(community, viewer);
    },

    settingAllows: settingAllows,

    /** True when a jqXHR is the API's record_deletion_restricted 403. */
    isRestrictedError: function (xhr) {
      if (!xhr || xhr.status !== 403) return false;
      var body = xhr.responseJSON;
      if (!body && typeof xhr.responseText === 'string') {
        try { body = JSON.parse(xhr.responseText); } catch (e) { body = null; }
      }
      return !!body && body.error === 'record_deletion_restricted';
    },

    /** Explain a refused delete. Uses ddModal when the page has it. */
    showRestricted: function () {
      if (window.ddModal) {
        window.ddModal({
          type: 'warning',
          icon: 'fa-lock',
          title: 'Record deletion is off',
          message: "This community doesn't let players delete records on their <strong>own characters</strong>.",
          detail: 'An admin or someone with Manage Records can still remove it.',
          buttons: [{ label: 'Got it', class: 'dd-modal-btn-primary' }],
        });
      } else if (typeof window.ddToast === 'function') {
        window.ddToast("This community doesn't let players delete records on their own characters", 'warning');
      } else if (typeof window.showToast === 'function') {
        window.showToast("This community doesn't let players delete records on their own characters", 'error');
      }
    },
  };

  window.RecordDeletion = RecordDeletion;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecordDeletion;
  }
})(typeof window !== 'undefined' ? window : globalThis);
