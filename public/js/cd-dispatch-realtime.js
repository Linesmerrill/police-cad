/**
 * Command Dashboard — Dispatch Realtime Bridge
 *
 * Subscribes the Command Bridge to the shared socket (from cd-alerts.js)
 * and layers dispatcher awareness — toasts + flash animations — on top of
 * the board's existing state-patching listeners.
 *
 * Broadcast origin: the Go API (police-cad-api) fires a webhook to Node's
 * /internal/panic-broadcast endpoint after every successful call
 * create/update/delete, regardless of where the write came from (Command
 * Bridge, classic dashboards, mobile app, Discord bot). Node fans out the
 * matching created_call / updated_call / cleared_call event to the
 * community room. Every writer is covered without per-client emits.
 *
 * Self-echo suppression: the Go webhook tags each broadcast with the
 * actorId of the authenticated user who performed the write. Tabs whose
 * user matches the actorId skip the toast+flash (their UI already shows
 * their own action).
 *
 * Exposes:
 *   window.cdDispatchRealtimeInit()
 *   window.cdDispatchFlash(el, variant)
 */
;(function () {
  'use strict';

  var pollTimer = null;
  var bound = false;
  var socketRetry = 0;

  /**
   * Echo suppression: the Go API tags every broadcast with the actorId of
   * the authenticated user who made the write. When that matches the
   * current user, we skip the toast+flash — the dispatcher already sees
   * the result of their own action through the local UI update path.
   * Works the same regardless of whether the write came from the bridge,
   * the classic dashboards, or the mobile app.
   */
  function isSelfEcho(actorId) {
    if (!actorId) return false;
    var me = (window.ddConfig || {}).userId;
    return !!(me && actorId === me);
  }

  /**
   * Toast throttle: cap at 3 toasts per 2s window so a bulk refresh from
   * reconnect or a scripted dispatcher doesn't spam a wall of toasts.
   */
  var TOAST_WINDOW_MS = 2000;
  var TOAST_MAX = 3;
  var toastLog = [];
  function toastThrottled(msg, type) {
    if (typeof window.ddToast !== 'function') return;
    var now = Date.now();
    toastLog = toastLog.filter(function (t) { return now - t < TOAST_WINDOW_MS; });
    if (toastLog.length >= TOAST_MAX) return;
    toastLog.push(now);
    window.ddToast(msg, type);
  }

  /**
   * Flash an element with one of the cd-flash-* variants. Gracefully
   * no-ops when the element isn't in the DOM (item off-screen, detail
   * not open, etc.) so we can call it eagerly from every listener.
   *
   *   variant: 'accent' | 'green' | 'amber' | 'red'
   */
  var FLASH_MS = 1400; // matches the longest keyframe + a small buffer
  window.cdDispatchFlash = function (el, variant) {
    if (!el || !el.nodeType) return;
    var cls = 'is-cd-flash-' + (variant || 'accent');
    // Restart the animation cleanly if a previous flash is in-flight —
    // without this, rapid-fire events would just cling to the old run.
    el.classList.remove('is-cd-flash-accent', 'is-cd-flash-green', 'is-cd-flash-amber', 'is-cd-flash-red');
    // Force reflow so re-adding the class restarts the keyframe.
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, FLASH_MS);
  };

  function flashCall(callId, variant) {
    if (!callId) return;
    // Board card
    var card = document.querySelector('.cd-call-card[data-call-id="' + cssEsc(callId) + '"]');
    if (card) window.cdDispatchFlash(card, variant);
    // Detail pane when showing this call
    var detailState = window.__cdDispatchDetailState;
    if (detailState && detailState.callId === callId) {
      var detail = document.querySelector('#cd-dispatch-detail .cd-detail');
      if (detail) window.cdDispatchFlash(detail, variant);
    }
  }

  function flashUnit(userId, variant) {
    if (!userId) return;
    var chip = document.querySelector('.cd-unit-chip[data-user-id="' + cssEsc(userId) + '"]');
    if (chip) window.cdDispatchFlash(chip, variant);
    // Also flash any assigned pill showing this user on a call card.
    // (Pill renderer uses `data-uid`, not `data-user-id`.)
    var pills = document.querySelectorAll('.cd-assigned-pill[data-uid="' + cssEsc(userId) + '"]');
    for (var i = 0; i < pills.length; i++) window.cdDispatchFlash(pills[i], variant);
  }

  // CSS.escape polyfill — ids in this codebase are Mongo ObjectIds so the
  // escape is mostly defensive, but keeps the selector robust if the id
  // shape ever changes.
  function cssEsc(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }

  window.cdDispatchRealtimeInit = function () {
    if (bound) return;
    bound = true;
    attachSocket();
    startPoll();
  };

  /**
   * Legacy no-op — kept for backward compatibility with any callers that
   * predate the server-side broadcast flow. The Go API now fires
   * created_call / updated_call / cleared_call directly via its webhook
   * to Node, so callers no longer need to nudge the server themselves.
   * Safe to delete once every call site has been updated.
   */
  window.cdDispatchBroadcastCall = function () { /* server-side now */ };

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

    // ── Call-lifecycle awareness ────────────────────
    // The board module owns the actual state-patching (upsert/remove) on
    // these events. The realtime module layers awareness on top: toasts
    // for out-of-band changes + a visual flash on the affected item so
    // dispatchers can track activity without staring at every card. The
    // layout orchestrator inits realtime BEFORE the board so these
    // listeners register first — that way `cleared_call` can still peek
    // at the board's cache for a title, and `updated_call`-close can
    // flash the card before board removes it from the DOM.
    s.on('created_call', function (data) {
      var callDoc = data && (data.call || data);
      if (!callDoc) return;
      var inner = callDoc.call || callDoc;
      var cid = inner && inner.communityID;
      if (cid && cid !== (window.ddConfig || {}).communityId) return;
      if (isSelfEcho(data && data.actorId)) return;
      var callId = callDoc._id || inner._id;
      var title = inner.title || 'Untitled call';
      toastThrottled('New call · ' + title, 'success');
      // Wait a tick for the board to upsert + render the new card before
      // flashing — on created_call the element doesn't exist yet when
      // our listener runs, even though we bind first.
      setTimeout(function () { flashCall(callId, 'green'); }, 120);
    });

    s.on('updated_call', function (data) {
      var callDoc = data && (data.call || data);
      if (!callDoc) return;
      var inner = callDoc.call || callDoc;
      var cid = inner && inner.communityID;
      if (cid && cid !== (window.ddConfig || {}).communityId) return;
      if (isSelfEcho(data && data.actorId)) return;
      var callId = callDoc._id || inner._id;
      var title = inner.title || 'Call';
      if (inner.status === false) {
        // Close path: the board is about to remove this card. Flash
        // runs synchronously to get at least a frame of amber before
        // the element detaches; toast does the real talking.
        toastThrottled('Call completed · ' + title, 'warning');
        flashCall(callId, 'amber');
      } else {
        // Open update: card stays, flash plays in full.
        toastThrottled('Call updated · ' + title, 'info');
        flashCall(callId, 'accent');
      }
    });

    s.on('cleared_call', function (data) {
      if (!data) return;
      if (isSelfEcho(data.actorId)) return;
      var callId = data.callId || data._id || (data.call && data.call._id);
      // Reach into the board's local cache for a title — our listener
      // runs before the board's cleared_call handler drops the entry,
      // so this populates reliably on the other tabs.
      var cached = (typeof window.cdDispatchBoardGetCall === 'function') ? window.cdDispatchBoardGetCall(callId) : null;
      var title = (cached && cached.title) || (cached && cached.call && cached.call.title) || 'Call';
      toastThrottled('Call removed · ' + title, 'error');
      flashCall(callId, 'red');
    });

    // ── Unit status awareness ───────────────────────
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
      // Toast + flash the roster chip. We don't have the unit's display
      // name on this event so fall back to the 10-code for context.
      // Self-change suppression: if the dispatcher changed their own
      // code, don't toast themselves.
      if (data.userId && data.userId === cfg.userId) return;
      var code = data.tenCode || '—';
      var desc = data.tenCodeDescription || '';
      toastThrottled('Unit status · ' + code + (desc ? ' · ' + desc : ''), 'info');
      setTimeout(function () { flashUnit(data.userId, 'accent'); }, 60);
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
