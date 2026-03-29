/**
 * Online Status Tracker
 * Reports user presence (online/offline) to the API via heartbeat,
 * visibility changes, and page unload events.
 */
(function () {
  var HEARTBEAT_INTERVAL = 60000; // 60 seconds
  var userId = null;
  var heartbeatTimer = null;
  var isOnline = false;

  function setOnlineStatus(online) {
    if (!userId || isOnline === online) return;
    isOnline = online;

    var url = '/api/v1/user/online-status';
    var body = JSON.stringify({ userId: userId, isOnline: online });

    // Use sendBeacon for offline signals (reliable during page unload)
    if (!online && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body
    }).catch(function () {
      // Silently ignore errors — best effort
    });
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(function () {
      if (!document.hidden) {
        // Reset isOnline so the heartbeat always sends
        isOnline = false;
        setOnlineStatus(true);
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      setOnlineStatus(false);
      stopHeartbeat();
    } else {
      setOnlineStatus(true);
      startHeartbeat();
    }
  }

  // Initialize: fetch current user, then start tracking
  fetch('/api/user/current', { credentials: 'include' })
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.user) return;
      userId = data.user.id || data.user._id;
      if (!userId) return;

      // Set online immediately
      setOnlineStatus(true);
      startHeartbeat();

      // Track visibility changes (tab switch, minimize)
      document.addEventListener('visibilitychange', onVisibilityChange);

      // Set offline on page close/navigation
      window.addEventListener('beforeunload', function () {
        setOnlineStatus(false);
      });
    })
    .catch(function () {
      // Not logged in or error — do nothing
    });
})();
