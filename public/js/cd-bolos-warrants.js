/**
 * Command Dashboard — BOLOs & Warrants Combined View
 *
 * Registers window.cdBolosWarrantsRender and window.cdBolosWarrantsInit for
 * the command dashboard component registry. Read-only combined view of
 * active BOLOs and warrants for officers.
 *
 * Dependencies (provided by the host page):
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, departmentId, userName }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 */
;(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  function cfg() { return window.ddConfig || {}; }
  function esc(s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }
  function apiUrl() { return cfg().API_URL || ''; }

  /* ───────────────────────────────────────────
     Relative Time Helper
     ─────────────────────────────────────────── */

  function relativeTime(dateStr) {
    if (!dateStr) return '';
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    if (isNaN(then)) return '';
    var diff = Math.max(0, now - then);
    var sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    var day = Math.floor(hr / 24);
    if (day < 30) return day + 'd ago';
    var mo = Math.floor(day / 30);
    return mo + 'mo ago';
  }

  /* ───────────────────────────────────────────
     State
     ─────────────────────────────────────────── */

  var state = {
    bolos: [],
    warrants: [],
    activeTab: 'bolos', // 'bolos' | 'warrants'
    loadingBolos: false,
    loadingWarrants: false
  };

  var refreshTimer = null;
  var REFRESH_INTERVAL = 30000; // 30 seconds

  /* ───────────────────────────────────────────
     Inline Styles (<style> injected once)
     ─────────────────────────────────────────── */

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('cd-bw-styles')) { stylesInjected = true; return; }
    stylesInjected = true;

    var css = '' +
      /* ── Card container ── */
      '.cd-bw-card{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius);overflow:hidden;}' +

      /* ── Header ── */
      '.cd-bw-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bw-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-bw-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-bw-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-bw-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +

      /* ── Tabs ── */
      '.cd-bw-tabs{display:flex;gap:0.375rem;padding:0.75rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bw-tab{padding:0.375rem 0.875rem;border-radius:999px;border:none;background:transparent;color:var(--cd-text-muted);font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.cd-bw-tab:hover{color:var(--cd-text);background:rgba(255,255,255,0.04);}' +
      '.cd-bw-tab.cd-bw-tab-active{background:rgba(56,189,248,0.15);color:var(--cd-accent);font-weight:600;}' +
      '.cd-bw-tab-count{padding:0.0625rem 0.4375rem;border-radius:999px;font-size:0.625rem;font-weight:700;background:rgba(255,255,255,0.06);color:var(--cd-text-dim);min-width:18px;text-align:center;}' +
      '.cd-bw-tab.cd-bw-tab-active .cd-bw-tab-count{background:rgba(56,189,248,0.2);color:var(--cd-accent);}' +

      /* ── Tab panes ── */
      '.cd-bw-pane{display:none;padding:0.75rem 1.25rem;max-height:500px;overflow-y:auto;}' +
      '.cd-bw-pane.cd-bw-pane-active{display:flex;flex-direction:column;gap:0.5rem;}' +

      /* ── BOLO Item (read-only) ── */
      '.cd-bw-bolo{background:rgba(255,255,255,0.02);border:1px solid var(--cd-glass-border);border-left:3px solid var(--cd-green);border-radius:var(--cd-radius-sm);padding:0.75rem 1rem;transition:all 0.2s;}' +
      '.cd-bw-bolo:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);}' +
      '.cd-bw-bolo-title-row{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;}' +
      '.cd-bw-bolo-dot{width:8px;height:8px;border-radius:50%;background:var(--cd-green);flex-shrink:0;}' +
      '.cd-bw-bolo-title{font-size:0.875rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-bw-scope-badge{padding:0.125rem 0.5rem;border-radius:999px;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0;}' +
      '.cd-bw-scope-community{background:rgba(56,189,248,0.12);color:var(--cd-accent);}' +
      '.cd-bw-scope-department{background:rgba(245,158,11,0.12);color:var(--cd-amber);}' +
      '.cd-bw-bolo-location{display:flex;align-items:center;gap:0.375rem;font-size:0.75rem;color:var(--cd-text-muted);margin-top:0.25rem;}' +
      '.cd-bw-bolo-location i{font-size:0.625rem;color:var(--cd-text-dim);}' +
      '.cd-bw-bolo-desc{font-size:0.8125rem;color:var(--cd-text-muted);margin-top:0.375rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer;transition:all 0.2s;}' +
      '.cd-bw-bolo-desc.cd-bw-bolo-desc-expanded{-webkit-line-clamp:unset;display:block;}' +
      '.cd-bw-bolo-meta{display:flex;align-items:center;gap:0.75rem;margin-top:0.5rem;font-size:0.6875rem;color:var(--cd-text-dim);}' +

      /* ── Warrant Item ── */
      '.cd-bw-warrant{background:rgba(255,255,255,0.02);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);overflow:hidden;transition:all 0.2s;}' +
      '.cd-bw-warrant:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);}' +
      '.cd-bw-warrant-header{padding:0.75rem 1rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:0.75rem;}' +
      '.cd-bw-warrant-left{display:flex;align-items:center;gap:0.625rem;flex:1;min-width:0;}' +
      '.cd-bw-warrant-name{font-size:0.875rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-bw-warrant-badges{display:flex;gap:0.375rem;flex-shrink:0;align-items:center;}' +
      '.cd-bw-warrant-type{padding:0.125rem 0.5rem;border-radius:999px;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;}' +
      '.cd-bw-type-arrest{background:rgba(239,68,68,0.12);color:var(--cd-red);}' +
      '.cd-bw-type-search{background:rgba(245,158,11,0.12);color:var(--cd-amber);}' +
      '.cd-bw-type-bench{background:rgba(59,130,246,0.12);color:var(--cd-blue);}' +
      '.cd-bw-warrant-status{padding:0.125rem 0.5rem;border-radius:999px;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;background:rgba(34,197,94,0.12);color:var(--cd-green);}' +
      '.cd-bw-warrant-status-inactive{background:rgba(100,116,139,0.12);color:var(--cd-text-dim);}' +
      '.cd-bw-warrant-chevron{color:var(--cd-text-dim);font-size:0.625rem;transition:transform 0.2s;flex-shrink:0;}' +
      '.cd-bw-warrant.cd-bw-warrant-open .cd-bw-warrant-chevron{transform:rotate(90deg);}' +
      '.cd-bw-warrant-summary{font-size:0.75rem;color:var(--cd-text-muted);margin-top:0.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-bw-warrant-officer{font-size:0.6875rem;color:var(--cd-text-dim);margin-top:0.125rem;}' +

      /* ── Warrant Detail (expandable) ── */
      '.cd-bw-warrant-detail{display:none;padding:0 1rem 0.875rem;border-top:1px solid var(--cd-glass-border);margin-top:0;}' +
      '.cd-bw-warrant.cd-bw-warrant-open .cd-bw-warrant-detail{display:block;}' +
      '.cd-bw-detail-section{margin-top:0.75rem;}' +
      '.cd-bw-detail-label{font-size:0.625rem;font-weight:600;color:var(--cd-text-dim);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem;}' +
      '.cd-bw-detail-text{font-size:0.8125rem;color:var(--cd-text-muted);line-height:1.5;}' +
      '.cd-bw-charges-list{list-style:none;padding:0;margin:0.25rem 0 0;}' +
      '.cd-bw-charges-list li{font-size:0.8125rem;color:var(--cd-text-muted);padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.03);}' +
      '.cd-bw-charges-list li:last-child{border-bottom:none;}' +

      /* ── Loading / Empty ── */
      '.cd-bw-loading{display:flex;align-items:center;justify-content:center;padding:2rem;color:var(--cd-text-muted);font-size:0.8125rem;gap:0.5rem;}' +
      '.cd-bw-empty{text-align:center;padding:2.5rem 1rem;color:var(--cd-text-dim);font-size:0.8125rem;}' +
      '.cd-bw-empty i{font-size:1.5rem;margin-bottom:0.5rem;display:block;opacity:0.4;}' +

      /* ── Responsive ── */
      '@media(max-width:600px){' +
        '.cd-bw-warrant-header{flex-wrap:wrap;}' +
        '.cd-bw-warrant-badges{flex-wrap:wrap;}' +
      '}' +
    '';

    var $style = $('<style>').attr('id', 'cd-bw-styles').text(css);
    $('head').append($style);
  }

  /* ───────────────────────────────────────────
     API — Load BOLOs
     ─────────────────────────────────────────── */

  function loadBolos(callback, silent) {
    if (!silent) { state.loadingBolos = true; renderBolosPane(); }

    $.ajax({
      url: apiUrl() + '/api/v1/bolos',
      method: 'GET',
      data: {
        communityId: cfg().communityId,
        departmentId: cfg().departmentId,
        status: true,
        limit: 50,
        page: 0
      },
      success: function (resp) {
        var items = resp.bolos || resp.data || resp || [];
        if (!Array.isArray(items)) items = [];
        state.bolos = items;
        state.loadingBolos = false;
        updateTabCounts();
        renderBolosPane();
        if (callback) callback();
      },
      error: function (xhr, status, err) {
        state.loadingBolos = false;
        state.bolos = [];
        updateTabCounts();
        renderBolosPane();
        console.error('[cd-bw] BOLOs load error:', status, err);
      }
    });
  }

  /* ───────────────────────────────────────────
     API — Load Warrants
     ─────────────────────────────────────────── */

  function loadWarrants(callback, silent) {
    if (!silent) { state.loadingWarrants = true; renderWarrantsPane(); }

    $.ajax({
      url: apiUrl() + '/api/v2/warrants/community/' + encodeURIComponent(cfg().communityId),
      method: 'GET',
      data: {
        limit: 20,
        page: 0
      },
      success: function (resp) {
        var items = resp.warrants || resp.data || resp || [];
        if (!Array.isArray(items)) items = [];
        state.warrants = items;
        state.loadingWarrants = false;
        updateTabCounts();
        renderWarrantsPane();
        if (callback) callback();
      },
      error: function (xhr, status, err) {
        state.loadingWarrants = false;
        state.warrants = [];
        updateTabCounts();
        renderWarrantsPane();
        console.error('[cd-bw] Warrants load error:', status, err);
      }
    });
  }

  /* ───────────────────────────────────────────
     Load All Data
     ─────────────────────────────────────────── */

  function loadAll() {
    loadBolos();
    loadWarrants();
  }

  /* ───────────────────────────────────────────
     Tab Count Badges
     ─────────────────────────────────────────── */

  function updateTabCounts() {
    $('#cd-bw-bolos-count').text(state.bolos.length);
    $('#cd-bw-warrants-count').text(state.warrants.length);
  }

  /* ───────────────────────────────────────────
     Rendering — BOLO Item (read-only)
     ─────────────────────────────────────────── */

  function renderBoloItem(item) {
    var b = item.bolo || item;
    var scopeIsComm = (b.scope || '').toLowerCase() === 'community';

    return '' +
      '<div class="cd-bw-bolo">' +
        '<div class="cd-bw-bolo-title-row">' +
          '<span class="cd-bw-bolo-dot"></span>' +
          '<span class="cd-bw-bolo-title">' + esc(b.title) + '</span>' +
          '<span class="cd-bw-scope-badge ' + (scopeIsComm ? 'cd-bw-scope-community' : 'cd-bw-scope-department') + '">' +
            (scopeIsComm ? 'Community' : 'Dept') +
          '</span>' +
        '</div>' +
        (b.location ? '<div class="cd-bw-bolo-location"><i class="fas fa-map-pin"></i> ' + esc(b.location) + '</div>' : '') +
        (b.description ? '<div class="cd-bw-bolo-desc">' + esc(b.description) + '</div>' : '') +
        '<div class="cd-bw-bolo-meta">' +
          (b.createdAt ? '<span><i class="far fa-clock"></i> ' + relativeTime(b.createdAt) + '</span>' : '') +
        '</div>' +
      '</div>';
  }

  /* ───────────────────────────────────────────
     Rendering — Warrant Item
     ─────────────────────────────────────────── */

  function warrantTypeCls(type) {
    var t = (type || '').toLowerCase();
    if (t === 'arrest') return 'cd-bw-type-arrest';
    if (t === 'search') return 'cd-bw-type-search';
    if (t === 'bench') return 'cd-bw-type-bench';
    return 'cd-bw-type-arrest'; // fallback
  }

  function warrantTypeLabel(type) {
    var t = (type || '').toLowerCase();
    if (t === 'arrest') return 'Arrest';
    if (t === 'search') return 'Search';
    if (t === 'bench') return 'Bench';
    return type || 'Unknown';
  }

  function renderChargesSummary(charges) {
    if (!charges || !charges.length) return '';
    var names = [];
    for (var i = 0; i < Math.min(charges.length, 3); i++) {
      var c = charges[i];
      var name = (typeof c === 'string') ? c : (c.name || c.title || c.charge || '');
      if (name) names.push(esc(name));
    }
    var text = names.join(', ');
    if (charges.length > 3) text += ' +' + (charges.length - 3) + ' more';
    return text;
  }

  function renderChargesList(charges) {
    if (!charges || !charges.length) return '<span class="cd-bw-detail-text">No charges listed</span>';
    var html = '<ul class="cd-bw-charges-list">';
    for (var i = 0; i < charges.length; i++) {
      var c = charges[i];
      var name = (typeof c === 'string') ? c : (c.name || c.title || c.charge || 'Unknown charge');
      html += '<li>' + esc(name) + '</li>';
    }
    html += '</ul>';
    return html;
  }

  function renderWarrantItem(item) {
    var w = item.warrant || item;
    var id = item._id || w._id || '';
    var accusedName = w.accusedName || w.suspectName || w.name || 'Unknown';
    var type = w.warrantType || w.type || 'arrest';
    var status = w.status || 'active';
    var isActive = (status === true || status === 'active' || status === 'Active');
    var charges = w.charges || [];
    var officer = w.requestingOfficer || w.officer || w.requestedBy || '';
    var probableCause = w.probableCause || w.reason || '';
    var searchLocation = w.searchLocation || w.location || '';
    var judgeNotes = w.judgeNotes || w.notes || '';
    var chargesSummary = renderChargesSummary(charges);

    return '' +
      '<div class="cd-bw-warrant" data-warrant-id="' + esc(id) + '">' +
        '<div class="cd-bw-warrant-header">' +
          '<div class="cd-bw-warrant-left">' +
            '<div>' +
              '<div class="cd-bw-warrant-name">' + esc(accusedName) + '</div>' +
              (chargesSummary ? '<div class="cd-bw-warrant-summary">' + chargesSummary + '</div>' : '') +
              (officer ? '<div class="cd-bw-warrant-officer"><i class="fas fa-user-shield"></i> ' + esc(officer) + '</div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="cd-bw-warrant-badges">' +
            '<span class="cd-bw-warrant-type ' + warrantTypeCls(type) + '">' + esc(warrantTypeLabel(type)) + '</span>' +
            '<span class="cd-bw-warrant-status' + (isActive ? '' : ' cd-bw-warrant-status-inactive') + '">' + esc(isActive ? 'Active' : String(status)) + '</span>' +
            '<i class="fas fa-chevron-right cd-bw-warrant-chevron"></i>' +
          '</div>' +
        '</div>' +
        '<div class="cd-bw-warrant-detail">' +
          (probableCause ? (
            '<div class="cd-bw-detail-section">' +
              '<div class="cd-bw-detail-label">Probable Cause</div>' +
              '<div class="cd-bw-detail-text">' + esc(probableCause) + '</div>' +
            '</div>'
          ) : '') +
          '<div class="cd-bw-detail-section">' +
            '<div class="cd-bw-detail-label">Charges</div>' +
            renderChargesList(charges) +
          '</div>' +
          ((type || '').toLowerCase() === 'search' && searchLocation ? (
            '<div class="cd-bw-detail-section">' +
              '<div class="cd-bw-detail-label">Search Location</div>' +
              '<div class="cd-bw-detail-text">' + esc(searchLocation) + '</div>' +
            '</div>'
          ) : '') +
          (judgeNotes ? (
            '<div class="cd-bw-detail-section">' +
              '<div class="cd-bw-detail-label">Judge Notes</div>' +
              '<div class="cd-bw-detail-text">' + esc(judgeNotes) + '</div>' +
            '</div>'
          ) : '') +
        '</div>' +
      '</div>';
  }

  /* ───────────────────────────────────────────
     Rendering — Panes
     ─────────────────────────────────────────── */

  function renderBolosPane() {
    var $pane = $('#cd-bw-pane-bolos');
    if (!$pane.length) return;

    if (state.loadingBolos) {
      $pane.html('<div class="cd-bw-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading BOLOs&hellip;</div>');
      return;
    }

    if (!state.bolos.length) {
      $pane.html(
        '<div class="cd-bw-empty">' +
          '<i class="fas fa-bullhorn"></i>' +
          'No active BOLOs' +
        '</div>'
      );
      return;
    }

    var html = '';
    for (var i = 0; i < state.bolos.length; i++) {
      html += renderBoloItem(state.bolos[i]);
    }
    $pane.html(html);
  }

  function renderWarrantsPane() {
    var $pane = $('#cd-bw-pane-warrants');
    if (!$pane.length) return;

    if (state.loadingWarrants) {
      $pane.html('<div class="cd-bw-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading warrants&hellip;</div>');
      return;
    }

    if (!state.warrants.length) {
      $pane.html(
        '<div class="cd-bw-empty">' +
          '<i class="fas fa-scroll"></i>' +
          'No active warrants' +
        '</div>'
      );
      return;
    }

    var html = '';
    for (var i = 0; i < state.warrants.length; i++) {
      html += renderWarrantItem(state.warrants[i]);
    }
    $pane.html(html);
  }

  /* ───────────────────────────────────────────
     Render Component (returns HTML string)
     ─────────────────────────────────────────── */

  function cdBolosWarrantsRender() {
    injectStyles();

    return '' +
      '<div class="cd-bw-card">' +

        /* Header */
        '<div class="cd-bw-header">' +
          '<div class="cd-bw-header-left">' +
            '<div class="cd-bw-header-icon"><i class="fas fa-scroll"></i></div>' +
            '<div class="cd-bw-header-text">' +
              '<h3>BOLOs &amp; Warrants</h3>' +
              '<span>Active alerts and warrants</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* Tabs */
        '<div class="cd-bw-tabs">' +
          '<button class="cd-bw-tab cd-bw-tab-active" data-bw-tab="bolos">' +
            'BOLOs <span class="cd-bw-tab-count" id="cd-bw-bolos-count">0</span>' +
          '</button>' +
          '<button class="cd-bw-tab" data-bw-tab="warrants">' +
            'Warrants <span class="cd-bw-tab-count" id="cd-bw-warrants-count">0</span>' +
          '</button>' +
        '</div>' +

        /* Panes */
        '<div class="cd-bw-pane cd-bw-pane-active" id="cd-bw-pane-bolos">' +
          '<div class="cd-bw-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading BOLOs&hellip;</div>' +
        '</div>' +
        '<div class="cd-bw-pane" id="cd-bw-pane-warrants">' +
          '<div class="cd-bw-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading warrants&hellip;</div>' +
        '</div>' +

      '</div>';
  }

  /* ───────────────────────────────────────────
     Init Component (wires events)
     ─────────────────────────────────────────── */

  function cdBolosWarrantsInit() {
    /* Load both datasets */
    loadAll();

    /* Tab switching */
    $(document).off('click.cdBwTab').on('click.cdBwTab', '.cd-bw-tab', function () {
      var $btn = $(this);
      var tab = $btn.data('bw-tab');
      if (tab === state.activeTab) return;

      state.activeTab = tab;
      $('.cd-bw-tab').removeClass('cd-bw-tab-active');
      $btn.addClass('cd-bw-tab-active');

      $('.cd-bw-pane').removeClass('cd-bw-pane-active');
      $('#cd-bw-pane-' + tab).addClass('cd-bw-pane-active');
    });

    /* Warrant expand / collapse */
    $(document).off('click.cdBwWarrantToggle').on('click.cdBwWarrantToggle', '.cd-bw-warrant-header', function () {
      $(this).closest('.cd-bw-warrant').toggleClass('cd-bw-warrant-open');
    });

    /* BOLO description expand / collapse */
    $(document).off('click.cdBwBoloDescToggle').on('click.cdBwBoloDescToggle', '.cd-bw-bolo-desc', function () {
      $(this).toggleClass('cd-bw-bolo-desc-expanded');
    });

    /* Auto-refresh every 30 seconds */
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(function () {
      if (!document.hidden) {
        loadBolos(null, true);  // silent refresh
        loadWarrants(null, true);
      }
    }, REFRESH_INTERVAL);
  }

  /* ═════════════════════════════════════════════════════════════════════
     REGISTER ON WINDOW
     ═════════════════════════════════════════════════════════════════════ */

  window.cdBolosWarrantsRender = cdBolosWarrantsRender;
  window.cdBolosWarrantsInit = cdBolosWarrantsInit;

})();
