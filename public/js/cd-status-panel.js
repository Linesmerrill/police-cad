/**
 * Command Dashboard — 10-Codes Status Panel
 *
 * Registers window.cdStatusPanelRender and window.cdStatusPanelInit for the
 * command dashboard component registry. Provides interactive 10-code status
 * selection, Signal 100, and Panic alerts.
 *
 * Dependencies (provided by the host page):
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, departmentId, departmentData, communityData? }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 *   - window.ddModal() Unified modal helper
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

  function deptName() {
    var d = cfg().departmentData;
    if (d && d.name) return d.name;
    if (d && d.department && d.department.name) return d.department.name;
    return '';
  }

  /* ───────────────────────────────────────────
     State
     ─────────────────────────────────────────── */

  var QUICK_COUNT = 8;
  var ALL_PAGE_SIZE = 20;

  var state = {
    tenCodes: [],
    activeTenCodeID: null,
    communityData: null,
    allExpanded: false,
    searchQuery: '',
    allPage: 1,
    loading: false,
    settingCode: null  // ID of code currently being set
  };

  /* ───────────────────────────────────────────
     Code Category Colors
     ─────────────────────────────────────────── */

  function codeCategory(code, description) {
    var c = (code || '').toLowerCase();
    var d = (description || '').toLowerCase();

    if (c.indexOf('signal 100') !== -1 || d.indexOf('emergency') !== -1) return 'red';
    if (c.indexOf('10-6') === 0 || c.indexOf('10-7') === 0 ||
        d.indexOf('out of service') !== -1 || d.indexOf('busy') !== -1 || d.indexOf('off duty') !== -1) return 'amber';
    if (c.indexOf('10-8') === 0 || d.indexOf('in service') !== -1 || d.indexOf('available') !== -1 ||
        d.indexOf('under control') !== -1 || d.indexOf('code 4') !== -1) return 'green';
    return 'blue';
  }

  function categoryColor(cat) {
    switch (cat) {
      case 'red':   return 'var(--cd-red)';
      case 'amber': return 'var(--cd-amber)';
      case 'green': return 'var(--cd-green)';
      default:      return 'var(--cd-blue)';
    }
  }

  function categoryBg(cat) {
    switch (cat) {
      case 'red':   return 'rgba(239,68,68,0.12)';
      case 'amber': return 'rgba(245,158,11,0.12)';
      case 'green': return 'rgba(34,197,94,0.12)';
      default:      return 'rgba(59,130,246,0.12)';
    }
  }

  function categoryBorder(cat) {
    switch (cat) {
      case 'red':   return 'rgba(239,68,68,0.25)';
      case 'amber': return 'rgba(245,158,11,0.25)';
      case 'green': return 'rgba(34,197,94,0.25)';
      default:      return 'rgba(59,130,246,0.25)';
    }
  }

  /* ───────────────────────────────────────────
     Inline Styles (injected once)
     ─────────────────────────────────────────── */

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('cd-sp-styles')) { stylesInjected = true; return; }
    stylesInjected = true;

    var css = '' +
      /* ── Card container ── */
      '.cd-sp-wrap{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius);overflow:hidden;}' +

      /* ── Header (BOLO-style) ── */
      '.cd-sp-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-sp-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-sp-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-sp-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-sp-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +
      '.cd-sp-status-badge{padding:0.25rem 0.75rem;border-radius:999px;font-size:0.6875rem;font-weight:600;background:rgba(56,189,248,0.12);color:var(--cd-accent);white-space:nowrap;}' +

      /* ── Emergency buttons ── */
      '.cd-sp-emergency-row{display:flex;gap:0.5rem;padding:0.75rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-sp-emergency-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.5rem 0.75rem;border-radius:var(--cd-radius-sm);font-family:inherit;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;cursor:pointer;transition:all 0.2s;background:transparent;}' +
      '.cd-sp-btn-signal100{color:var(--cd-red);border:1.5px solid var(--cd-red);animation:cd-sp-pulse-red 2s ease-in-out infinite;}' +
      '.cd-sp-btn-signal100:hover{background:rgba(239,68,68,0.15);}' +
      '.cd-sp-btn-panic{color:var(--cd-amber);border:1.5px solid var(--cd-amber);animation:cd-sp-pulse-amber 2s ease-in-out infinite;}' +
      '.cd-sp-btn-panic:hover{background:rgba(245,158,11,0.15);}' +
      '.cd-sp-emergency-btn:disabled{opacity:0.5;cursor:default;animation:none;}' +

      '@keyframes cd-sp-pulse-red{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0);}50%{box-shadow:0 0 0 4px rgba(239,68,68,0.2);}}' +
      '@keyframes cd-sp-pulse-amber{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0);}50%{box-shadow:0 0 0 4px rgba(245,158,11,0.2);}}' +

      /* ── Quick grid ── */
      '.cd-sp-grid-section{padding:1rem 1.25rem;}' +
      '.cd-sp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;}' +

      /* ── Code card ── */
      '.cd-sp-card{background:rgba(255,255,255,0.02);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.625rem 0.75rem;cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden;}' +
      '.cd-sp-card:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);}' +
      '.cd-sp-card-active{border-color:var(--cd-accent);box-shadow:0 0 0 1px var(--cd-accent),0 0 12px rgba(56,189,248,0.15);background:rgba(56,189,248,0.06);}' +
      '.cd-sp-card-loading{pointer-events:none;opacity:0.6;}' +
      '.cd-sp-card-code{font-size:0.8125rem;font-weight:700;line-height:1.3;}' +
      '.cd-sp-card-desc{font-size:0.6875rem;color:var(--cd-text-muted);margin-top:0.1875rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.cd-sp-card-spinner{position:absolute;top:50%;right:0.5rem;transform:translateY(-50%);font-size:0.75rem;color:var(--cd-accent);}' +

      /* ── Expand section ── */
      '.cd-sp-expand-section{border-top:1px solid var(--cd-glass-border);}' +
      '.cd-sp-expand-toggle{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.625rem;border:none;background:rgba(255,255,255,0.02);color:var(--cd-text-muted);font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;}' +
      '.cd-sp-expand-toggle:hover{background:rgba(255,255,255,0.05);color:var(--cd-text);}' +
      '.cd-sp-expand-body{display:none;padding:0.75rem 1.25rem 1rem;}' +
      '.cd-sp-expand-body.cd-sp-expanded{display:block;}' +

      /* ── Search ── */
      '.cd-sp-search-wrap{position:relative;margin-bottom:0.75rem;}' +
      '.cd-sp-search-icon{position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--cd-text-muted);font-size:0.875rem;pointer-events:none;}' +
      '.cd-sp-search-input{width:100%;background:rgba(0,0,0,0.25);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.6rem 0.75rem 0.6rem 2.25rem;color:var(--cd-text);font-size:0.8125rem;outline:none;transition:border-color 0.2s;box-sizing:border-box;}' +
      '.cd-sp-search-input::placeholder{color:var(--cd-text-dim);}' +
      '.cd-sp-search-input:focus{border-color:var(--cd-accent);}' +

      /* ── Pagination ── */
      '.cd-sp-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:0.75rem;}' +
      '.cd-sp-page-btn{padding:0.3125rem 0.75rem;border-radius:6px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text-muted);font-family:inherit;font-size:0.6875rem;font-weight:500;cursor:pointer;transition:all 0.2s;}' +
      '.cd-sp-page-btn:hover:not(:disabled){background:rgba(255,255,255,0.08);color:var(--cd-text);}' +
      '.cd-sp-page-btn:disabled{opacity:0.3;cursor:default;}' +
      '.cd-sp-page-info{font-size:0.6875rem;color:var(--cd-text-dim);}' +

      /* ── Loading / Empty ── */
      '.cd-sp-loading{display:flex;align-items:center;justify-content:center;padding:2rem;color:var(--cd-text-muted);font-size:0.8125rem;gap:0.5rem;}' +
      '.cd-sp-empty{text-align:center;padding:2rem 1rem;color:var(--cd-text-dim);font-size:0.8125rem;}' +
      '.cd-sp-empty i{font-size:1.25rem;margin-bottom:0.375rem;display:block;opacity:0.4;}' +

      /* ── Responsive ── */
      '@media(max-width:900px){.cd-sp-grid{grid-template-columns:repeat(3,1fr);}}' +
      '@media(max-width:600px){.cd-sp-grid{grid-template-columns:repeat(2,1fr);}.cd-sp-emergency-row{flex-direction:column;}}' +
    '';

    var $style = $('<style>').attr('id', 'cd-sp-styles').text(css);
    $('head').append($style);
  }

  /* ───────────────────────────────────────────
     Community Data Fetch
     ─────────────────────────────────────────── */

  function fetchCommunityData(callback) {
    if (cfg().communityData) {
      callback(cfg().communityData);
      return;
    }

    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(cfg().communityId),
      method: 'GET',
      success: function (resp) {
        var data = resp.community || resp.data || resp;
        window.ddConfig.communityData = data;
        callback(data);
      },
      error: function (xhr, status, err) {
        toast('Failed to load community data', 'error');
        console.error('[cd-status-panel] Community fetch error:', status, err);
        callback(null);
      }
    });
  }

  /* ───────────────────────────────────────────
     Extract Current TenCode
     ─────────────────────────────────────────── */

  function extractActiveTenCodeID(community) {
    if (!community || !community.members) return null;
    var userId = cfg().userId;
    var members = community.members;

    // members may be an object keyed by userId or an array
    if (Array.isArray(members)) {
      for (var i = 0; i < members.length; i++) {
        var m = members[i];
        var mId = m.userID || m.userId || m._id || '';
        if (String(mId) === String(userId)) return m.tenCodeID || null;
      }
    } else if (typeof members === 'object') {
      var member = members[userId];
      if (member) return member.tenCodeID || null;
    }
    return null;
  }

  function findCodeById(id) {
    if (!id) return null;
    for (var i = 0; i < state.tenCodes.length; i++) {
      var tc = state.tenCodes[i];
      var tcId = tc._id;
      if (tcId && typeof tcId === 'object' && tcId.$oid) tcId = tcId.$oid;
      if (String(tcId) === String(id)) return tc;
    }
    return null;
  }

  /* ───────────────────────────────────────────
     Set Status API
     ─────────────────────────────────────────── */

  function setTenCode(codeId, onDone) {
    state.settingCode = codeId;
    renderQuickGrid();
    renderAllGrid();

    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(cfg().communityId) +
           '/members/' + encodeURIComponent(cfg().userId) + '/tenCode',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        departmentID: cfg().departmentId,
        tenCodeID: codeId,
        activeDepartmentId: cfg().departmentId,
        activeDepartmentName: deptName()
      }),
      success: function () {
        state.activeTenCodeID = codeId;
        state.settingCode = null;
        var tc = findCodeById(codeId);
        toast('Status set to ' + (tc ? tc.code : 'updated'), 'success');
        updateStatusBadge();
        renderQuickGrid();
        renderAllGrid();
        if (onDone) onDone(true);
      },
      error: function (xhr, status, err) {
        state.settingCode = null;
        toast('Failed to set status', 'error');
        console.error('[cd-status-panel] Set ten-code error:', status, err);
        renderQuickGrid();
        renderAllGrid();
        if (onDone) onDone(false);
      }
    });
  }

  /* ───────────────────────────────────────────
     Signal 100 & Panic
     ─────────────────────────────────────────── */

  function sendSignal100() {
    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(cfg().communityId) + '/signal-100',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({}),
      success: function () {
        toast('Signal 100 activated', 'success');
      },
      error: function (xhr, status, err) {
        toast('Failed to send Signal 100', 'error');
        console.error('[cd-status-panel] Signal 100 error:', status, err);
      }
    });
  }

  function sendPanic() {
    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(cfg().communityId) + '/panic-alerts',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        userId: cfg().userId,
        username: cfg().userName || '',
        callSign: '',
        department: deptName()
      }),
      success: function () {
        toast('Panic alert sent', 'success');
      },
      error: function (xhr, status, err) {
        toast('Failed to send panic alert', 'error');
        console.error('[cd-status-panel] Panic error:', status, err);
      }
    });
  }

  /* ───────────────────────────────────────────
     Rendering — Code Card
     ─────────────────────────────────────────── */

  function renderCodeCard(tc) {
    var id = tc._id;
    if (id && typeof id === 'object' && id.$oid) id = id.$oid;
    var cat = codeCategory(tc.code, tc.description);
    var isActive = String(id) === String(state.activeTenCodeID);
    var isLoading = String(id) === String(state.settingCode);

    return '' +
      '<div class="cd-sp-card' + (isActive ? ' cd-sp-card-active' : '') + (isLoading ? ' cd-sp-card-loading' : '') + '" ' +
           'data-code-id="' + esc(id) + '">' +
        '<div class="cd-sp-card-code" style="color:' + categoryColor(cat) + ';">' + esc(tc.code) + '</div>' +
        '<div class="cd-sp-card-desc">' + esc(tc.description) + '</div>' +
        (isLoading ? '<span class="cd-sp-card-spinner"><i class="fas fa-circle-notch fa-spin"></i></span>' : '') +
      '</div>';
  }

  /* ───────────────────────────────────────────
     Rendering — Status Badge
     ─────────────────────────────────────────── */

  function updateStatusBadge() {
    var $badge = $('#cd-sp-current-badge');
    if (!$badge.length) return;

    var tc = findCodeById(state.activeTenCodeID);
    if (tc) {
      var cat = codeCategory(tc.code, tc.description);
      $badge.text('Current: ' + tc.code)
        .css({ background: categoryBg(cat), color: categoryColor(cat) });
    } else {
      $badge.text('No Status')
        .css({ background: 'rgba(255,255,255,0.06)', color: 'var(--cd-text-dim)' });
    }
  }

  /* ───────────────────────────────────────────
     Rendering — Quick Grid
     ─────────────────────────────────────────── */

  function renderQuickGrid() {
    var $grid = $('#cd-sp-quick-grid');
    if (!$grid.length) return;

    var codes = state.tenCodes.slice(0, QUICK_COUNT);
    if (!codes.length) {
      $grid.html('<div class="cd-sp-empty"><i class="fas fa-broadcast-tower"></i>No status codes configured</div>');
      return;
    }

    var html = '';
    for (var i = 0; i < codes.length; i++) {
      html += renderCodeCard(codes[i]);
    }
    $grid.html(html);
  }

  /* ───────────────────────────────────────────
     Rendering — All Codes Grid
     ─────────────────────────────────────────── */

  function getFilteredCodes() {
    var q = state.searchQuery.toLowerCase().trim();
    if (!q) return state.tenCodes;

    var out = [];
    for (var i = 0; i < state.tenCodes.length; i++) {
      var tc = state.tenCodes[i];
      if ((tc.code || '').toLowerCase().indexOf(q) !== -1 ||
          (tc.description || '').toLowerCase().indexOf(q) !== -1) {
        out.push(tc);
      }
    }
    return out;
  }

  function renderAllGrid() {
    var $body = $('#cd-sp-all-body');
    if (!$body.length) return;

    var $grid = $('#cd-sp-all-grid');
    var $pagination = $('#cd-sp-pagination');

    var filtered = getFilteredCodes();
    var totalPages = Math.max(1, Math.ceil(filtered.length / ALL_PAGE_SIZE));
    if (state.allPage > totalPages) state.allPage = totalPages;

    var start = (state.allPage - 1) * ALL_PAGE_SIZE;
    var pageItems = filtered.slice(start, start + ALL_PAGE_SIZE);

    if (!pageItems.length) {
      $grid.html('<div class="cd-sp-empty"><i class="fas fa-search"></i>No codes match your search</div>');
      $pagination.hide();
      return;
    }

    var html = '';
    for (var i = 0; i < pageItems.length; i++) {
      html += renderCodeCard(pageItems[i]);
    }
    $grid.html(html);

    // Pagination
    if (totalPages > 1) {
      $pagination.show().html(
        '<button class="cd-sp-page-btn" id="cd-sp-prev"' + (state.allPage <= 1 ? ' disabled' : '') + '>' +
          '<i class="fas fa-chevron-left"></i> Prev' +
        '</button>' +
        '<span class="cd-sp-page-info">Page ' + state.allPage + ' of ' + totalPages + '</span>' +
        '<button class="cd-sp-page-btn" id="cd-sp-next"' + (state.allPage >= totalPages ? ' disabled' : '') + '>' +
          'Next <i class="fas fa-chevron-right"></i>' +
        '</button>'
      );
    } else {
      $pagination.hide();
    }
  }

  /* ───────────────────────────────────────────
     Render Component (returns HTML string)
     ─────────────────────────────────────────── */

  function cdStatusPanelRender() {
    injectStyles();

    return '' +
      '<div class="cd-sp-wrap">' +

        /* Header */
        '<div class="cd-sp-header">' +
          '<div class="cd-sp-header-left">' +
            '<div class="cd-sp-header-icon"><i class="fas fa-broadcast-tower"></i></div>' +
            '<div class="cd-sp-header-text">' +
              '<h3>Status Codes</h3>' +
              '<span>10-Code Status Panel</span>' +
            '</div>' +
          '</div>' +
          '<span class="cd-sp-status-badge" id="cd-sp-current-badge">Loading&hellip;</span>' +
        '</div>' +

        /* Emergency action buttons */
        '<div class="cd-sp-emergency-row">' +
          '<button class="cd-sp-emergency-btn cd-sp-btn-signal100" id="cd-sp-signal100">' +
            '<i class="fas fa-exclamation-triangle"></i> Signal 100' +
          '</button>' +
          '<button class="cd-sp-emergency-btn cd-sp-btn-panic" id="cd-sp-panic">' +
            '<i class="fas fa-bolt"></i> Panic' +
          '</button>' +
        '</div>' +

        /* Quick grid */
        '<div class="cd-sp-grid-section">' +
          '<div class="cd-sp-grid" id="cd-sp-quick-grid">' +
            '<div class="cd-sp-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading codes&hellip;</div>' +
          '</div>' +
        '</div>' +

        /* Expand section */
        '<div class="cd-sp-expand-section">' +
          '<button class="cd-sp-expand-toggle" id="cd-sp-expand-toggle">' +
            '<span id="cd-sp-expand-label">Show All Codes</span> <i class="fas fa-chevron-down" id="cd-sp-expand-icon"></i>' +
          '</button>' +
          '<div class="cd-sp-expand-body" id="cd-sp-all-body">' +
            '<div class="cd-sp-search-wrap">' +
              '<i class="fas fa-search cd-sp-search-icon"></i>' +
              '<input type="text" class="cd-sp-search-input" id="cd-sp-search" placeholder="Search codes&hellip;">' +
            '</div>' +
            '<div class="cd-sp-grid" id="cd-sp-all-grid"></div>' +
            '<div class="cd-sp-pagination" id="cd-sp-pagination" style="display:none;"></div>' +
          '</div>' +
        '</div>' +

      '</div>';
  }

  /* ───────────────────────────────────────────
     Init Component (wires events)
     ─────────────────────────────────────────── */

  function cdStatusPanelInit() {
    state.loading = true;

    fetchCommunityData(function (community) {
      state.loading = false;

      if (!community) {
        $('#cd-sp-quick-grid').html(
          '<div class="cd-sp-empty"><i class="fas fa-exclamation-circle"></i>Failed to load status codes</div>'
        );
        updateStatusBadge();
        return;
      }

      state.communityData = community;
      state.tenCodes = community.tenCodes || [];
      state.activeTenCodeID = extractActiveTenCodeID(community);

      updateStatusBadge();
      renderQuickGrid();
    });

    /* ── Code card click (delegated for both grids) ── */
    $(document).off('click.cdSpCard').on('click.cdSpCard', '.cd-sp-card', function () {
      var id = $(this).data('code-id');
      if (!id || state.settingCode) return;
      if (String(id) === String(state.activeTenCodeID)) return; // already active

      setTenCode(id);
    });

    /* ── Signal 100 ── */
    $(document).off('click.cdSpSignal').on('click.cdSpSignal', '#cd-sp-signal100', function () {
      var $btn = $(this);
      if ($btn.prop('disabled')) return;

      if (window.ddModal) {
        window.ddModal({
          type: 'danger',
          icon: 'fas fa-exclamation-triangle',
          title: 'Activate Signal 100',
          message: 'Are you sure you want to activate Signal 100?',
          detail: 'This will broadcast an emergency signal to all units.',
          confirmText: 'Activate',
          cancelText: 'Cancel',
          onConfirm: function () {
            $btn.prop('disabled', true);
            sendSignal100();
            setTimeout(function () { $btn.prop('disabled', false); }, 3000);
          }
        });
      } else {
        $btn.prop('disabled', true);
        sendSignal100();
        setTimeout(function () { $btn.prop('disabled', false); }, 3000);
      }
    });

    /* ── Panic ── */
    $(document).off('click.cdSpPanic').on('click.cdSpPanic', '#cd-sp-panic', function () {
      var $btn = $(this);
      if ($btn.prop('disabled')) return;

      if (window.ddModal) {
        window.ddModal({
          type: 'danger',
          icon: 'fas fa-bolt',
          title: 'Send Panic Alert',
          message: 'Are you sure you want to send a panic alert?',
          detail: 'All units will be notified of your emergency.',
          confirmText: 'Send Panic',
          cancelText: 'Cancel',
          onConfirm: function () {
            $btn.prop('disabled', true);
            sendPanic();
            setTimeout(function () { $btn.prop('disabled', false); }, 3000);
          }
        });
      } else {
        $btn.prop('disabled', true);
        sendPanic();
        setTimeout(function () { $btn.prop('disabled', false); }, 3000);
      }
    });

    /* ── Expand / Collapse toggle ── */
    $(document).off('click.cdSpExpand').on('click.cdSpExpand', '#cd-sp-expand-toggle', function () {
      state.allExpanded = !state.allExpanded;
      var $body = $('#cd-sp-all-body');
      var $label = $('#cd-sp-expand-label');
      var $icon = $('#cd-sp-expand-icon');

      if (state.allExpanded) {
        $body.addClass('cd-sp-expanded');
        $label.text('Hide All Codes');
        $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        state.allPage = 1;
        state.searchQuery = '';
        $('#cd-sp-search').val('');
        renderAllGrid();
      } else {
        $body.removeClass('cd-sp-expanded');
        $label.text('Show All Codes');
        $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      }
    });

    /* ── Search input ── */
    var searchTimer = null;
    $(document).off('input.cdSpSearch').on('input.cdSpSearch', '#cd-sp-search', function () {
      var val = $(this).val();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.searchQuery = val;
        state.allPage = 1;
        renderAllGrid();
      }, 250);
    });

    /* ── Pagination ── */
    $(document).off('click.cdSpPrev').on('click.cdSpPrev', '#cd-sp-prev', function () {
      if (state.allPage > 1) {
        state.allPage--;
        renderAllGrid();
      }
    });

    $(document).off('click.cdSpNext').on('click.cdSpNext', '#cd-sp-next', function () {
      var filtered = getFilteredCodes();
      var totalPages = Math.max(1, Math.ceil(filtered.length / ALL_PAGE_SIZE));
      if (state.allPage < totalPages) {
        state.allPage++;
        renderAllGrid();
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
     REGISTER ON WINDOW
     ═════════════════════════════════════════════════════════════════════ */

  window.cdStatusPanelRender = cdStatusPanelRender;
  window.cdStatusPanelInit = cdStatusPanelInit;

})();
