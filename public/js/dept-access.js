/*
 * Owner and admin bypass for private departments in the dashboard sidebars.
 *
 * The sidebars used to read ownerID and role off dbUser.user.lastAccessedCommunity.
 * That document only ever holds {communityID, createdAt} (see the API's
 * models/lastaccessedcommunity.go), so the bypass was always false and owners
 * were shown their own private departments as locked. It is also the last
 * community the user touched, which is not necessarily the one on the page.
 *
 * Both answers come from the community actually being viewed instead.
 *
 * public/js/departments.js carries its own copy of ddDepartmentAccess for the
 * legacy sidebar; test/dept-access.test.js pins the two to the same answers.
 */
(function (root) {
  'use strict';

  // Accepts either the API envelope ({ community: {...} }) or a bare community.
  function ddDepartmentAccess(communityRes, userId) {
    var community = communityRes && (communityRes.community || communityRes);
    if (!community || !userId) return { isOwner: false, isAdmin: false };
    var isOwner = String(community.ownerID || '') === String(userId);
    var isAdmin = (community.roles || []).some(function (role) {
      return (role.members || []).indexOf(userId) !== -1 &&
        (role.permissions || []).some(function (p) {
          return p && p.enabled === true && String(p.name).toLowerCase() === 'administrator';
        });
    });
    return { isOwner: isOwner, isAdmin: isAdmin };
  }

  // Resolves the bypass for the community on the page, reusing the community
  // the dashboard has already fetched when it is there. A community that
  // cannot be read falls back to membership rules only, so a failed request
  // narrows the sidebar rather than breaking it.
  function ddResolveDepartmentAccess(opts) {
    var $ = root.jQuery;
    var o = opts || {};
    var cached = (root.ddConfig || {}).communityData;
    if (cached) {
      return $.Deferred().resolve(ddDepartmentAccess(cached, o.userId)).promise();
    }
    if (!o.communityId || !o.apiUrl) {
      return $.Deferred().resolve({ isOwner: false, isAdmin: false }).promise();
    }
    return $.ajax({
      url: o.apiUrl + '/api/v1/community/' + encodeURIComponent(o.communityId),
      method: 'GET'
    }).then(
      function (res) {
        var community = (res && (res.community || res)) || null;
        if (community && root.ddConfig) root.ddConfig.communityData = community;
        return ddDepartmentAccess(community, o.userId);
      },
      function () {
        return $.Deferred().resolve({ isOwner: false, isAdmin: false }).promise();
      }
    );
  }

  root.ddDepartmentAccess = ddDepartmentAccess;
  root.ddResolveDepartmentAccess = ddResolveDepartmentAccess;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ddDepartmentAccess: ddDepartmentAccess,
      ddResolveDepartmentAccess: ddResolveDepartmentAccess
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
