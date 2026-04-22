/**
 * Command Dashboard — Dispatch Control Layout
 *
 * Renders the 3-zone "Command Bridge" shell inside #dd-panels when the active
 * department template is `dispatch`. Orchestrates the child modules (roster,
 * board, detail, intake, tones) via the window.cdDispatch* registry pattern.
 *
 * Shell-only for now. Child modules land in subsequent commits.
 *
 * Dependencies (provided by the host page):
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, departmentData }
 *   - window.esc()     HTML-escape helper
 *   - window.cdMdtSignal100 / window.cdMdtPanic (existing shell buttons)
 */
;(function () {
  'use strict';

  function esc(s) {
    return window.esc ? window.esc(s) :
      String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  }

  // Build the static shell HTML. Child modules mount into the zone bodies in
  // their own Init() functions (cdDispatchRosterInit, etc.).
  window.cdDispatchLayoutRender = function cdDispatchLayoutRender(dept) {
    // Department name already appears in the page topbar next to the dept-type
    // badge, so don't repeat it here — just stamp the layout identity.
    return (
      '<div id="cd-dispatch-bridge">' +

        '<div class="cd-dispatch-topbar">' +
          '<span class="cd-dispatch-topbar-title">Command Bridge</span>' +
          '<span id="cd-dispatch-rank-pill" class="cd-dispatch-rank-pill" style="display:none;" title="View rank">' +
            '<i class="fa fa-shield"></i>' +
            '<span id="cd-dispatch-rank-text">—</span>' +
          '</span>' +
          '<span id="cd-dispatch-reconnect" class="cd-dispatch-reconnect-pill" title="Live sync paused — reconnecting">' +
            '<i class="fa fa-plug" style="margin-right:0.375rem;"></i> Reconnecting' +
          '</span>' +
          '<span id="cd-dispatch-clock" class="cd-dispatch-topbar-clock">--:--:--</span>' +
          '<span id="cd-dispatch-tz" class="cd-dispatch-topbar-tz" aria-label="Timezone"></span>' +
          '<button type="button" class="cd-dispatch-topbar-btn is-signal" id="cd-dispatch-btn-signal100">' +
            '<i class="fa fa-exclamation-triangle"></i> Signal 100' +
          '</button>' +
        '</div>' +

        '<div class="cd-dispatch-grid">' +

          '<section class="cd-dispatch-zone" data-zone="roster" aria-label="Unit roster">' +
            '<header class="cd-dispatch-zone-header">' +
              '<i class="fa fa-users"></i><span>Units</span>' +
              '<span class="cd-dispatch-zone-count" id="cd-dispatch-roster-count">—</span>' +
            '</header>' +
            '<div class="cd-dispatch-zone-body" id="cd-dispatch-roster">' +
              renderPlaceholder('fa-users', 'Roster loads in the next commit.') +
            '</div>' +
          '</section>' +

          '<section class="cd-dispatch-zone" data-zone="board" aria-label="Call board">' +
            '<header class="cd-dispatch-zone-header">' +
              '<i class="fa fa-radio"></i><span>Call Board</span>' +
              '<span class="cd-dispatch-zone-count" id="cd-dispatch-board-count">—</span>' +
            '</header>' +
            '<div class="cd-dispatch-zone-body" id="cd-dispatch-board">' +
              renderPlaceholder('fa-radio', 'Priority lanes + call cards land in the next commit.') +
            '</div>' +
          '</section>' +

          '<section class="cd-dispatch-zone" data-zone="detail" aria-label="Call detail" id="cd-dispatch-detail-zone">' +
            '<header class="cd-dispatch-zone-header">' +
              '<i class="fa fa-file-lines"></i><span>Call Detail</span>' +
            '</header>' +
            '<div class="cd-dispatch-zone-body" id="cd-dispatch-detail">' +
              renderPlaceholder('fa-file-lines', 'Select a call to view details.') +
            '</div>' +
          '</section>' +

        '</div>' +

        '<div class="cd-dispatch-bottom" id="cd-dispatch-bottom">' +
          '<section class="cd-dispatch-zone" aria-label="BOLOs">' +
            '<header class="cd-dispatch-zone-header">' +
              '<i class="fa fa-bullhorn"></i><span>BOLOs</span>' +
            '</header>' +
            '<div class="cd-dispatch-zone-body" id="cd-dispatch-bolos">' +
              renderPlaceholder('fa-bullhorn', 'BOLO strip lands in step 9.') +
            '</div>' +
          '</section>' +
          '<section class="cd-dispatch-zone" aria-label="Tone board">' +
            '<header class="cd-dispatch-zone-header">' +
              '<i class="fa fa-tower-broadcast"></i><span>Tone Board</span>' +
            '</header>' +
            '<div class="cd-dispatch-zone-body" id="cd-dispatch-tones">' +
              renderPlaceholder('fa-tower-broadcast', 'Tone board lands in step 9.') +
            '</div>' +
          '</section>' +
        '</div>' +

      '</div>'
    );
  };

  function renderPlaceholder(icon, text) {
    return (
      '<div class="cd-dispatch-placeholder">' +
        '<i class="fa ' + icon + '"></i>' +
        '<div>' + esc(text) + '</div>' +
      '</div>'
    );
  }

  window.cdDispatchLayoutInit = function cdDispatchLayoutInit() {
    startClock();
    wireTopbarButtons();

    // Kick off the community-departments fetch early — intake modal and
    // detail drawer both need it to render dept routing, and fetching up
    // front means the modal opens without a loading state.
    loadCommunityDepartments();

    // Child module init hooks — each one is optional until its commit lands.
    // Realtime binds its socket listeners BEFORE board/roster/detail so it
    // runs first when events arrive. This lets it peek at pre-mutation
    // state (e.g., read the call title from the board cache before a
    // cleared_call wipes it) and flash DOM nodes while they're still
    // rendered — critical for close/delete toasts that otherwise race
    // the board's synchronous remove.
    if (typeof window.cdDispatchRealtimeInit === 'function') window.cdDispatchRealtimeInit();
    if (typeof window.cdDispatchRosterInit === 'function')  window.cdDispatchRosterInit();
    if (typeof window.cdDispatchBoardInit === 'function')   window.cdDispatchBoardInit();
    if (typeof window.cdDispatchDetailInit === 'function')  window.cdDispatchDetailInit();
    mountBolos();
    if (typeof window.cdDispatchTonesInit === 'function')   window.cdDispatchTonesInit();
    if (typeof window.cdDispatchDndInit === 'function')      window.cdDispatchDndInit();
  };

  // ── Community departments cache ──
  // Dispatch's call-routing UI (intake modal, detail drawer) needs every
  // community department — not just the logged-in user's memberships —
  // because a community lead may want to route calls to departments they
  // aren't personally in. We filter out civilian / judicial / dispatch
  // templates since those don't take dispatches.
  var communityDeptsCache = null;      // null = not loaded yet
  var communityDeptsPromise = null;
  function loadCommunityDepartments() {
    if (communityDeptsCache || communityDeptsPromise) return;
    var cfg = window.ddConfig || {};
    var communityId = cfg.communityId;
    var apiUrl = cfg.API_URL || '';
    if (!communityId) return;
    communityDeptsPromise = $.ajax({
      url: apiUrl + '/api/v1/community/' + encodeURIComponent(communityId) + '/departments',
      method: 'GET',
    }).done(function (resp) {
      var all = (resp && resp.departments) || [];
      var filtered = all.filter(function (d) {
        var t = String(((d && d.template && d.template.name) || '')).toLowerCase();
        return t !== 'civilian' && t !== 'judicial' && t !== 'dispatch';
      });
      communityDeptsCache = filtered;
      window.__cdDispatchCommunityDepts = filtered;
      // Let anything already on screen (e.g. an open detail drawer) re-render.
      $(document).trigger('cdDispatch:communityDeptsLoaded');
    }).fail(function (xhr) {
      communityDeptsCache = [];
      window.__cdDispatchCommunityDepts = [];
      console.error('[cd-dispatch-layout] failed to load community departments', xhr && xhr.responseText);
    });
  }
  window.cdDispatchGetCommunityDepts = function () { return communityDeptsCache || []; };
  window.cdDispatchEnsureCommunityDepts = function (cb) {
    if (communityDeptsCache) { if (cb) cb(communityDeptsCache); return; }
    if (!communityDeptsPromise) loadCommunityDepartments();
    if (communityDeptsPromise) communityDeptsPromise.always(function () { if (cb) cb(communityDeptsCache || []); });
  };

  // Reuse the existing cd-bolos.js component by mounting its output into
  // the bridge's bottom strip. No duplication — the dispatch bottom strip
  // displays the exact same BOLO create/list UI as the police overview.
  function mountBolos() {
    var $host = $('#cd-dispatch-bolos');
    if (!$host.length) return;
    if (typeof window.cdBolosRender === 'function') {
      $host.html(window.cdBolosRender('createBolos'));
      if (typeof window.cdBolosInit === 'function') window.cdBolosInit();
    } else {
      $host.html('<div class="cd-dispatch-placeholder"><i class="fa fa-bullhorn"></i><div>BOLO module not loaded.</div></div>');
    }
  }

  function startClock() {
    var $clock = $('#cd-dispatch-clock');
    if (!$clock.length) return;
    // Timezone is stable for the session — resolve once and cache.
    var tz = '';
    try {
      var parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'timeZoneName') { tz = parts[i].value; break; }
    } catch (e) { tz = ''; }
    $('#cd-dispatch-tz').text(tz);
    function tick() {
      var d = new Date();
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      $clock.text(pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()));
    }
    tick();
    if (window.__cdDispatchClockTimer) clearInterval(window.__cdDispatchClockTimer);
    window.__cdDispatchClockTimer = setInterval(tick, 1000);
  }

  function wireTopbarButtons() {
    // Reuse the existing MDT signal-100 flow. Panic is intentionally not
    // surfaced on the dispatch bridge — dispatchers aren't field units.
    $('#cd-dispatch-btn-signal100').off('click').on('click', function () {
      if (typeof window.cdMdtSignal100 === 'function') window.cdMdtSignal100();
    });
    $('#cd-dispatch-rank-pill').off('click').on('click', function () {
      if (typeof window.cdShowRankPanel === 'function') window.cdShowRankPanel();
    });

    // Poll the existing #myRankName element (populated async by rank-progress.js)
    // and surface the rank in the bridge top bar + sidebar user area when the
    // active department has ranks enabled. Mirrors the MDT behavior.
    pollRankPill();
  }

  function pollRankPill() {
    var attempts = 0;
    function tick() {
      var el = document.getElementById('myRankName');
      if (el && el.textContent && el.textContent.trim()) {
        var name = el.textContent.trim();
        $('#cd-dispatch-rank-text').text(name);
        $('#cd-dispatch-rank-pill').show();
        // Also mirror into the sidebar "under username" slot if present
        $('#cd-sidebar-rank').text(name).show();
      } else if (attempts++ < 10) {
        setTimeout(tick, 1000);
      } else {
        // No rank data configured — keep the pill hidden
        $('#cd-dispatch-rank-pill').hide();
        $('#cd-sidebar-rank').hide();
      }
    }
    tick();
  }
})();
