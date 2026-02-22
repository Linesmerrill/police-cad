// court-session-badge.js
// Shows a live session count badge next to the "Court Cases" sidebar link
(function() {
  var API_URL = 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

  function getCommunityId() {
    // Try dbUser global (police, dispatch, ems dashboards)
    if (typeof dbUser !== 'undefined' && dbUser && dbUser.user &&
        dbUser.user.lastAccessedCommunity && dbUser.user.lastAccessedCommunity.communityID) {
      return dbUser.user.lastAccessedCommunity.communityID;
    }
    // Try civUser global (civ dashboard)
    if (typeof civUser !== 'undefined' && civUser && civUser.user &&
        civUser.user.lastAccessedCommunity && civUser.user.lastAccessedCommunity.communityID) {
      return civUser.user.lastAccessedCommunity.communityID;
    }
    return null;
  }

  function updateBadge() {
    var communityId = getCommunityId();
    if (!communityId) return;

    var link = document.getElementById('sidebar-court-cases');
    if (!link) return;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '/api/v2/court-sessions/community/' + communityId + '?status=in_progress&limit=50');
    xhr.onload = function() {
      if (xhr.status !== 200) return;
      try {
        var resp = JSON.parse(xhr.responseText);
        var sessions = resp.data || [];
        var count = sessions.length;

        // Remove existing badge
        var existing = link.querySelector('.cc-sidebar-badge');
        if (existing) existing.remove();

        if (count > 0) {
          var badge = document.createElement('span');
          badge.className = 'cc-sidebar-badge';
          badge.textContent = count;
          link.appendChild(badge);
        }
      } catch (e) {}
    };
    xhr.send();
  }

  // Add badge styles
  var style = document.createElement('style');
  style.textContent =
    '.cc-sidebar-badge {' +
      'display: inline-flex; align-items: center; justify-content: center;' +
      'min-width: 18px; height: 18px; padding: 0 5px;' +
      'font-size: 0.68rem; font-weight: 700; line-height: 1;' +
      'color: #fff; background: #ef4444;' +
      'border-radius: 9px;' +
      'margin-left: 6px;' +
      'vertical-align: middle;' +
      'position: relative; top: -1px;' +
      'box-shadow: 0 0 8px rgba(239,68,68,0.4);' +
      'animation: cc-badge-pulse 2s ease-in-out infinite;' +
    '}' +
    '@keyframes cc-badge-pulse {' +
      '0%, 100% { box-shadow: 0 0 6px rgba(239,68,68,0.3); }' +
      '50% { box-shadow: 0 0 12px rgba(239,68,68,0.6); }' +
    '}';
  document.head.appendChild(style);

  // Run on load and poll every 30 seconds
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      updateBadge();
      setInterval(updateBadge, 30000);
    });
  } else {
    updateBadge();
    setInterval(updateBadge, 30000);
  }
})();
