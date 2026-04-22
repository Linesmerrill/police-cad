/**
 * Command Dashboard — Dispatch Realtime Bridge
 *
 * Subscribes the Command Bridge to the shared socket (from cd-alerts.js) and
 * keeps the roster / board / detail in sync. Also runs a lightweight 30s poll
 * as a fallback (and for REST-origin call lifecycle events that aren't
 * broadcast through socket today — see plan step 8 open items).
 *
 * Socket events consumed:
 *   dispatch:unit_status_changed  -> cdDispatchRosterPatchUnit
 *   created_call / updated_call / cleared_call (already wired by board)
 *
 * Exposes:
 *   window.cdDispatchRealtimeInit()
 */
;(function () {
  'use strict';

  var pollTimer = null;
  var bound = false;
  var socketRetry = 0;

  window.cdDispatchRealtimeInit = function () {
    if (bound) return;
    bound = true;
    attachSocket();
    startPoll();
  };

  function attachSocket() {
    var s = window._cdSharedSocket;
    if (!s) {
      if (socketRetry++ > 20) {
        console.warn('[cd-dispatch-realtime] Shared socket not available — relying on poll only.');
        return;
      }
      setTimeout(attachSocket, 500);
      return;
    }

    if (s.__cdDispatchRealtimeBound) return;
    s.__cdDispatchRealtimeBound = true;

    s.on('dispatch:unit_status_changed', function (data) {
      if (!data) return;
      var cfg = window.ddConfig || {};
      if (data.communityId && data.communityId !== cfg.communityId) return;
      if (typeof window.cdDispatchRosterPatchUnit === 'function') {
        window.cdDispatchRosterPatchUnit({
          id: data.userId,
          tenCode: { id: data.tenCodeId, code: data.tenCode, description: data.tenCodeDescription },
        });
      }
    });

    s.on('disconnect', function () { showReconnectPill(true); });
    s.on('connect', function () {
      showReconnectPill(false);
      // Re-join community room — cd-alerts.js also does this, but be defensive
      if ((window.ddConfig || {}).communityId) {
        s.emit('join_community_room', { communityId: window.ddConfig.communityId });
      }
      // Refresh board + roster on reconnect to pick up anything we missed.
      if (typeof window.cdDispatchBoardRefresh === 'function') window.cdDispatchBoardRefresh();
      if (typeof window.cdDispatchRosterRefresh === 'function') window.cdDispatchRosterRefresh();
    });
  }

  function showReconnectPill(visible) {
    var $pill = $('#cd-dispatch-reconnect');
    if (!$pill.length) return;
    $pill.toggleClass('is-visible', !!visible);
  }

  // Fallback poll — 30s full refresh for calls + roster.
  // Handles REST-origin updates we wouldn't otherwise see in realtime and is
  // cheap (v2 endpoints are paginated and fast).
  function startPoll() {
    stopPoll();
    pollTimer = setInterval(function () {
      // Only poll when the bridge is the visible panel
      if (!$('#cd-dispatch-bridge:visible').length) return;
      if (typeof window.cdDispatchBoardRefresh === 'function') window.cdDispatchBoardRefresh();
      if (typeof window.cdDispatchRosterRefresh === 'function') window.cdDispatchRosterRefresh();
    }, 30000);
  }

  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }
})();
