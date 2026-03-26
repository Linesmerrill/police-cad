/**
 * Command Dashboard — Active Calls Component
 *
 * Registers window.cdCallsRender and window.cdCallsInit for the
 * command dashboard component registry. Provides active call listing
 * with filtering by assignment, department, and community.
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

  var PAGE_SIZE = 20;
  var state = {
    calls: [],
    totalCount: 0,
    page: 1,
    tab: 'department', // 'mine' | 'department' | 'all'
    loading: false,
    expanded: {}       // call id -> boolean
  };

  var refreshTimer = null;

  /* ───────────────────────────────────────────
     Inline Styles (<style> injected once)
     ─────────────────────────────────────────── */

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('cd-calls-styles')) { stylesInjected = true; return; }
    stylesInjected = true;

    var css = '' +
      /* ── Force text visibility ── */
      '#dd-component-activeCalls{font-size:16px !important;opacity:1 !important;transform:none !important;animation:none !important;}' +
      '#dd-component-activeCalls .cd-call-card-wrap{font-size:16px !important;color:#e2e8f0 !important;}' +
      '#dd-component-activeCalls .cd-call-item-header{font-size:14px !important;}' +
      '#dd-component-activeCalls .cd-call-title{color:#f1f5f9 !important;font-size:15px !important;font-weight:600 !important;}' +
      '#dd-component-activeCalls .cd-call-desc{color:#94a3b8 !important;font-size:13px !important;}' +
      '#dd-component-activeCalls .cd-call-meta{color:#64748b !important;font-size:11px !important;}' +
      '#dd-component-activeCalls .cd-call-meta span{color:#64748b !important;font-size:11px !important;}' +
      /* ── Shared BOLO header ── */
      '.cd-bolo-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-bolo-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-bolo-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-bolo-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +
      /* ── Count badge ── */
      '.cd-call-count-badge{padding:0.25rem 0.625rem;border-radius:999px;background:rgba(34,197,94,0.15);color:var(--cd-green);font-size:0.75rem;font-weight:700;min-width:1.5rem;text-align:center;font-family:"JetBrains Mono",monospace;}' +

      /* ── Tabs ── */
      '.cd-call-tabs{display:flex;gap:0.375rem;padding:0.75rem 1.25rem 0.75rem;flex-wrap:wrap;}' +
      '.cd-call-tab{padding:0.4375rem 1rem;border-radius:var(--cd-radius-sm);border:1px solid var(--cd-glass-border);background:var(--cd-glass);color:var(--cd-text-muted);font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.cd-call-tab:hover{color:var(--cd-text);background:var(--cd-glass-hover);border-color:rgba(255,255,255,0.1);}' +
      '.cd-call-tab.cd-call-tab-active{background:rgba(56,189,248,0.12);color:var(--cd-accent);font-weight:600;border-color:rgba(56,189,248,0.25);}' +
      '.cd-call-tab-count{padding:0.0625rem 0.4375rem;border-radius:999px;background:rgba(255,255,255,0.06);font-size:0.625rem;font-weight:700;line-height:1.4;font-family:"JetBrains Mono",monospace;}' +
      '.cd-call-tab.cd-call-tab-active .cd-call-tab-count{background:rgba(56,189,248,0.2);}' +

      /* ── List ── */
      '.cd-call-list{padding:0.625rem 1rem;display:flex;flex-direction:column;gap:0.5rem;max-height:600px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.06) transparent;}' +
      '.cd-call-list::-webkit-scrollbar{width:4px;}' +
      '.cd-call-list::-webkit-scrollbar-track{background:transparent;}' +
      '.cd-call-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:2px;}' +

      /* ── Call Item ── */
      '.cd-call-item{background:rgba(255,255,255,0.025);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);transition:border-color 0.15s,background 0.15s;overflow:hidden;position:relative;}' +
      '.cd-call-item::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--cd-green);border-radius:3px 0 0 3px;}' +
      '.cd-call-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);}' +
      '.cd-call-item.cd-call-911::before{background:var(--cd-red);}' +
      '.cd-call-item-header{padding:1rem 1rem 1rem 1.25rem;cursor:pointer;display:flex;align-items:flex-start;gap:0.75rem;min-height:3.5rem;}' +
      '.cd-call-status-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:0.25rem;background:var(--cd-green);box-shadow:0 0 8px rgba(34,197,94,0.5);}' +
      '.cd-call-item.cd-call-911 .cd-call-status-dot{background:var(--cd-red);box-shadow:0 0 8px rgba(239,68,68,0.5);}' +
      '.cd-call-item-main{flex:1;min-width:0;font-size:0.875rem !important;color:#e2e8f0 !important;}' +
      '.cd-call-title-row{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.25rem;}' +
      '.cd-call-title{font-size:0.9375rem;font-weight:600;color:#f1f5f9 !important;line-height:1.3;display:block !important;visibility:visible !important;opacity:1 !important;}' +
      '.cd-call-911-badge{padding:0.125rem 0.5rem;border-radius:999px;font-size:0.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.2);flex-shrink:0;}' +
      '.cd-call-assigned-badge{padding:0.125rem 0.5rem;border-radius:999px;font-size:0.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:rgba(56,189,248,0.12);color:var(--cd-accent);border:1px solid rgba(56,189,248,0.2);flex-shrink:0;}' +
      '.cd-call-desc{font-size:0.8125rem;color:#94a3b8 !important;margin-top:0.125rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.cd-call-meta{display:flex;align-items:center;gap:0.875rem;margin-top:0.5rem;font-size:0.6875rem;color:#64748b !important;flex-wrap:wrap;}' +
      '.cd-call-meta span{display:inline-flex;align-items:center;gap:0.25rem;}' +
      '.cd-call-meta i{font-size:0.625rem;}' +
      '.cd-call-expand-icon{color:var(--cd-text-dim);font-size:0.6875rem;flex-shrink:0;margin-top:0.375rem;transition:transform 0.2s;}' +
      '.cd-call-item.cd-call-expanded .cd-call-expand-icon{transform:rotate(180deg);}' +

      /* ── Expanded Detail ── */
      '.cd-call-detail{max-height:0;overflow:hidden;transition:max-height 0.3s ease;}' +
      '.cd-call-item.cd-call-expanded .cd-call-detail{max-height:600px;}' +
      '.cd-call-detail-inner{padding:0.75rem 1rem 1rem;border-top:1px solid var(--cd-glass-border);margin-left:1.75rem;}' +
      '.cd-call-detail-section{margin-top:0.75rem;}' +
      '.cd-call-detail-section:first-child{margin-top:0;}' +
      '.cd-call-detail-label{font-size:0.625rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.375rem;}' +
      '.cd-call-detail-text{font-size:0.8125rem;color:#e2e8f0;line-height:1.6;white-space:pre-wrap;word-break:break-word;}' +
      '.cd-call-notes-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.375rem;}' +
      '.cd-call-note-item{padding:0.5rem 0.75rem;background:rgba(0,0,0,0.2);border:1px solid var(--cd-glass-border);border-radius:6px;font-size:0.75rem;color:#cbd5e1;line-height:1.5;}' +
      '.cd-call-note-meta{font-size:0.625rem;color:#475569;margin-top:0.25rem;}' +
      '.cd-call-officers{display:flex;flex-wrap:wrap;gap:0.375rem;}' +
      '.cd-call-officer-chip{padding:0.1875rem 0.5rem;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid var(--cd-glass-border);font-size:0.6875rem;color:#94a3b8;}' +

      /* ── Pagination ── */
      '.cd-call-pagination{display:flex;align-items:center;justify-content:center;gap:0.375rem;padding:0.75rem 1rem;border-top:1px solid var(--cd-glass-border);}' +
      '.cd-call-page-btn{padding:0.3125rem 0.625rem;border-radius:6px;border:1px solid var(--cd-glass-border);background:var(--cd-glass);color:var(--cd-text-muted);font-family:inherit;font-size:0.75rem;cursor:pointer;transition:all 0.15s;}' +
      '.cd-call-page-btn:hover:not(:disabled){background:var(--cd-glass-hover);color:var(--cd-text);}' +
      '.cd-call-page-btn:disabled{opacity:0.3;cursor:default;}' +
      '.cd-call-page-btn.cd-call-page-active{background:rgba(56,189,248,0.15);color:var(--cd-accent);border-color:rgba(56,189,248,0.25);font-weight:600;}' +

      /* ── Loading / Empty ── */
      '.cd-call-loading{display:flex;align-items:center;justify-content:center;padding:2.5rem;color:var(--cd-text-muted);font-size:0.8125rem;gap:0.5rem;}' +
      '.cd-call-empty{text-align:center;padding:3rem 1.5rem;color:#475569;}' +
      '.cd-call-empty i{font-size:1.75rem;margin-bottom:0.75rem;display:block;opacity:0.3;}' +
      '.cd-call-empty p{font-size:0.8125rem;margin:0;}' +

      /* ── Action Buttons ── */
      '.cd-call-action-btn{display:inline-flex;align-items:center;gap:0.375rem;padding:0.375rem 0.75rem;border-radius:var(--cd-radius-sm);font-family:inherit;font-size:0.6875rem;font-weight:600;border:1px solid;cursor:pointer;transition:all 0.15s;}' +
      '.cd-call-action-accent{background:rgba(56,189,248,0.1);border-color:rgba(56,189,248,0.25);color:var(--cd-accent);}' +
      '.cd-call-action-accent:hover{background:rgba(56,189,248,0.2);border-color:rgba(56,189,248,0.4);}' +
      '.cd-call-action-green{background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.25);color:var(--cd-green);}' +
      '.cd-call-action-green:hover{background:rgba(34,197,94,0.2);border-color:rgba(34,197,94,0.4);}' +
      '.cd-call-action-red{background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.25);color:var(--cd-red);}' +
      '.cd-call-action-red:hover{background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.4);}' +
      '.cd-call-action-muted{background:var(--cd-glass);border-color:var(--cd-glass-border);color:var(--cd-text-muted);}' +
      '.cd-call-action-muted:hover{background:var(--cd-glass-hover);color:var(--cd-text);}' +

      /* ── Responsive ── */
      '@media(max-width:600px){' +
        '.cd-call-tabs{gap:0.25rem;}' +
        '.cd-call-tab{padding:0.375rem 0.75rem;font-size:0.6875rem;}' +
        '.cd-call-detail-inner{margin-left:0;}' +
      '}' +
    '';

    var $style = $('<style>').attr('id', 'cd-calls-styles').text(css);
    $('head').append($style);
  }

  /* ───────────────────────────────────────────
     API
     ─────────────────────────────────────────── */

  function buildUrl(tab, page) {
    var base = apiUrl() + '/api/v2/calls/community/' + encodeURIComponent(cfg().communityId);
    var params = ['status=true', 'limit=' + PAGE_SIZE, 'page=' + page];

    // Department tab filters by departmentId; "all" omits it; "mine" also uses departmentId
    // but we filter client-side for assigned calls
    if (tab === 'department' || tab === 'mine') {
      var deptId = cfg().departmentId;
      if (deptId) params.push('departmentId=' + encodeURIComponent(deptId));
    }

    return base + '?' + params.join('&');
  }

  function loadCalls(callback, silent) {
    if (!silent) {
      state.loading = true;
      renderList();
    }

    var url = buildUrl(state.tab, state.page);

    $.ajax({
      url: url,
      method: 'GET',
      success: function (resp) {
        var items = resp.data || [];
        if (!Array.isArray(items)) items = [];

        if (state.tab === 'mine') {
          // Client-side filter: only calls assigned to current user
          var userId = cfg().userId;
          items = items.filter(function (item) {
            var call = item.call || item;
            var assigned = call.assignedTo || [];
            return assigned.indexOf(userId) !== -1;
          });
        }

        state.calls = items;
        state.totalCount = state.tab === 'mine' ? items.length : (resp.totalCount || items.length);
        state.loading = false;
        renderList();
        renderPagination();
        renderCountBadge();
        if (callback) callback();
      },
      error: function (xhr, status, err) {
        state.loading = false;
        state.calls = [];
        state.totalCount = 0;
        renderList();
        renderPagination();
        renderCountBadge();
        toast('Failed to load calls', 'error');
        console.error('[cd-calls] Load error:', status, err);
      }
    });

    // Also fetch counts for the other tabs in the background
    loadTabCounts();
  }

  /**
   * Fetches a lightweight page-1 request for each tab to populate
   * the tab count badges. Only runs when not already in flight.
   */
  var countsFetching = false;

  function loadTabCounts() {
    if (countsFetching) return;
    countsFetching = true;

    var communityId = cfg().communityId;
    var deptId = cfg().departmentId;
    var userId = cfg().userId;

    // Department count
    var deptUrl = apiUrl() + '/api/v2/calls/community/' + encodeURIComponent(communityId) +
      '?status=true&limit=1&page=1' + (deptId ? '&departmentId=' + encodeURIComponent(deptId) : '');

    // All open count
    var allUrl = apiUrl() + '/api/v2/calls/community/' + encodeURIComponent(communityId) +
      '?status=true&limit=1&page=1';

    // "My Calls" count — need to fetch a larger set to filter client-side
    var myUrl = apiUrl() + '/api/v2/calls/community/' + encodeURIComponent(communityId) +
      '?status=true&limit=100&page=1' + (deptId ? '&departmentId=' + encodeURIComponent(deptId) : '');

    var finished = 0;
    var total = 3;

    function done() {
      finished++;
      if (finished >= total) countsFetching = false;
    }

    $.ajax({
      url: deptUrl, method: 'GET',
      success: function (r) { updateTabCount('department', r.totalCount || 0); done(); },
      error: done
    });

    $.ajax({
      url: allUrl, method: 'GET',
      success: function (r) { updateTabCount('all', r.totalCount || 0); done(); },
      error: done
    });

    $.ajax({
      url: myUrl, method: 'GET',
      success: function (r) {
        var items = r.data || [];
        var count = 0;
        for (var i = 0; i < items.length; i++) {
          var call = items[i].call || items[i];
          if ((call.assignedTo || []).indexOf(userId) !== -1) count++;
        }
        updateTabCount('mine', count);
        done();
      },
      error: done
    });
  }

  function updateTabCount(tab, count) {
    var $badge = $('.cd-call-tab[data-tab="' + tab + '"] .cd-call-tab-count');
    if ($badge.length) $badge.text(count);
  }

  /* ───────────────────────────────────────────
     Rendering — Call Item
     ─────────────────────────────────────────── */

  function renderCallItem(item) {
    var c = item.call || item;
    var id = item._id || '';
    var title = c.title || 'Untitled Call';
    var is911 = title.indexOf('911:') === 0 || title.indexOf('911 :') === 0;
    var details = c.details || '';
    var createdBy = c.createdByUsername || '';
    var createdAt = c.createdAt || '';
    var notes = c.callNotes || [];
    var assigned = c.assignedTo || [];
    var userId = cfg().userId;
    var isAssigned = assigned.indexOf(userId) !== -1;
    var isExpanded = state.expanded[id] || false;

    var html = '' +
      '<div class="cd-call-item' + (is911 ? ' cd-call-911' : '') + (isExpanded ? ' cd-call-expanded' : '') + '" data-call-id="' + esc(id) + '">' +

        /* Clickable header */
        '<div class="cd-call-item-header" data-toggle-call="' + esc(id) + '" style="padding:12px 16px!important;min-height:48px!important;">' +
          '<span class="cd-call-status-dot"></span>' +
          '<div class="cd-call-item-main">' +
            '<div class="cd-call-title-row">' +
              '<span class="cd-call-title" style="font-size:15px!important;color:#f1f5f9!important;font-weight:600!important;display:inline!important;">' + esc(title) + '</span>' +
              (is911 ? '<span class="cd-call-911-badge">911</span>' : '') +
              (isAssigned ? '<span class="cd-call-assigned-badge">Assigned to you</span>' : '') +
            '</div>' +
            (details ? '<div class="cd-call-desc" style="font-size:13px!important;color:#94a3b8!important;margin-top:4px!important;">' + esc(details) + '</div>' : '') +
            '<div class="cd-call-meta" style="font-size:11px!important;color:#64748b!important;margin-top:6px!important;">' +
              (createdAt ? '<span><i class="far fa-clock"></i>' + relativeTime(createdAt) + '</span>' : '') +
              (createdBy ? '<span><i class="far fa-user"></i>' + esc(createdBy) + '</span>' : '') +
              (notes.length ? '<span><i class="far fa-comment-alt"></i>' + notes.length + ' note' + (notes.length !== 1 ? 's' : '') + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<i class="fas fa-chevron-down cd-call-expand-icon"></i>' +
        '</div>' +

        /* Expandable detail */
        '<div class="cd-call-detail">' +
          '<div class="cd-call-detail-inner">' +

            /* Full details */
            (details ? (
              '<div class="cd-call-detail-section">' +
                '<div class="cd-call-detail-label">Details</div>' +
                '<div class="cd-call-detail-text">' + esc(details) + '</div>' +
              '</div>'
            ) : '') +

            /* Assigned officers */
            (assigned.length ? (
              '<div class="cd-call-detail-section">' +
                '<div class="cd-call-detail-label">Assigned (' + assigned.length + ')</div>' +
                '<div class="cd-call-officers">' +
                  renderOfficerChips(assigned, userId) +
                '</div>' +
              '</div>'
            ) : '') +

            /* Notes */
            (notes.length ? (
              '<div class="cd-call-detail-section">' +
                '<div class="cd-call-detail-label">Notes (' + notes.length + ')</div>' +
                '<ul class="cd-call-notes-list">' +
                  renderNotes(notes) +
                '</ul>' +
              '</div>'
            ) : '') +

            /* Action Buttons */
            '<div class="cd-call-actions" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--cd-glass-border);display:flex;flex-wrap:wrap;gap:0.375rem;">' +
              (isAssigned
                ? '<button class="cd-call-action-btn cd-call-action-muted" onclick="cdCallUnassignMe(\'' + esc(id) + '\')"><i class="fa fa-user-minus"></i> Unassign Me</button>'
                : '<button class="cd-call-action-btn cd-call-action-accent" onclick="cdCallAssignMe(\'' + esc(id) + '\')"><i class="fa fa-user-plus"></i> Assign to Me</button>'
              ) +
              '<button class="cd-call-action-btn cd-call-action-accent" onclick="cdCallAddNote(\'' + esc(id) + '\')"><i class="fa fa-comment-plus"></i> Add Note</button>' +
              '<button class="cd-call-action-btn cd-call-action-green" onclick="cdCallComplete(\'' + esc(id) + '\')"><i class="fa fa-check"></i> Complete</button>' +
              '<button class="cd-call-action-btn cd-call-action-red" onclick="cdCallDelete(\'' + esc(id) + '\')"><i class="fa fa-trash"></i> Delete</button>' +
            '</div>' +

          '</div>' +
        '</div>' +

      '</div>';

    return html;
  }

  function renderOfficerChips(assigned, currentUserId) {
    var html = '';
    for (var i = 0; i < assigned.length; i++) {
      var uid = assigned[i];
      var label = uid === currentUserId ? 'You' : uid;
      html += '<span class="cd-call-officer-chip">' + esc(label) + '</span>';
    }
    return html;
  }

  function renderNotes(notes) {
    // Sort newest first
    var sorted = notes.slice().sort(function (a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var n = sorted[i];
      html += '<li class="cd-call-note-item">' +
        esc(n.note || '') +
        '<div class="cd-call-note-meta">' +
          esc(n.createdBy || '') +
          (n.createdAt ? ' &middot; ' + relativeTime(n.createdAt) : '') +
        '</div>' +
      '</li>';
    }
    return html;
  }

  /* ───────────────────────────────────────────
     Rendering — List
     ─────────────────────────────────────────── */

  function renderList() {
    var $list = $('#cd-call-list');
    if (!$list.length) return;

    if (state.loading) {
      $list.html('<div class="cd-call-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading calls&hellip;</div>');
      return;
    }

    if (!state.calls.length) {
      var msg = state.tab === 'mine'
        ? 'No calls assigned to you'
        : 'No active calls';
      $list.html(
        '<div class="cd-call-empty">' +
          '<i class="fas fa-radio"></i>' +
          msg +
        '</div>'
      );
      return;
    }

    var html = '';
    for (var i = 0; i < state.calls.length; i++) {
      html += renderCallItem(state.calls[i]);
    }
    $list.html(html);
  }

  /* ───────────────────────────────────────────
     Rendering — Pagination
     ─────────────────────────────────────────── */

  function renderPagination() {
    var $pag = $('#cd-call-pagination');
    if (!$pag.length) return;

    // For 'mine' tab, pagination is not applicable (client-side filter)
    if (state.tab === 'mine' || state.totalCount <= PAGE_SIZE) {
      $pag.html('');
      return;
    }

    var totalPages = Math.ceil(state.totalCount / PAGE_SIZE);
    if (totalPages <= 1) {
      $pag.html('');
      return;
    }

    var html = '';
    html += '<button class="cd-call-page-btn" data-page="' + (state.page - 1) + '"' +
      (state.page <= 1 ? ' disabled' : '') + '><i class="fas fa-chevron-left"></i></button>';

    // Show up to 5 page buttons around the current page
    var startPage = Math.max(1, state.page - 2);
    var endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (var p = startPage; p <= endPage; p++) {
      html += '<button class="cd-call-page-btn' + (p === state.page ? ' cd-call-page-active' : '') +
        '" data-page="' + p + '">' + p + '</button>';
    }

    html += '<button class="cd-call-page-btn" data-page="' + (state.page + 1) + '"' +
      (state.page >= totalPages ? ' disabled' : '') + '><i class="fas fa-chevron-right"></i></button>';

    html += '<span class="cd-call-page-info">' + state.totalCount + ' total</span>';

    $pag.html(html);
  }

  /* ───────────────────────────────────────────
     Rendering — Header Count Badge
     ─────────────────────────────────────────── */

  function renderCountBadge() {
    var $badge = $('#cd-call-count');
    if ($badge.length) {
      $badge.text(state.tab === 'mine' ? state.calls.length : state.totalCount);
    }
  }

  /* ───────────────────────────────────────────
     Auto-Refresh (visibility-aware)
     ─────────────────────────────────────────── */

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(function () {
      if (!document.hidden) {
        loadCalls(null, true); // silent refresh — no loading spinner
      }
    }, 30000);
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  /* ───────────────────────────────────────────
     Render Component (returns HTML string)
     ─────────────────────────────────────────── */

  function cdCallsRender() {
    injectStyles();

    return '' +
      '<div class="cd-call-card-wrap">' +

        /* Header (BOLO-style) */
        '<div class="cd-bolo-header">' +
          '<div class="cd-bolo-header-left">' +
            '<div class="cd-bolo-header-icon" style="background:rgba(34,197,94,0.12);color:var(--cd-green);"><i class="fas fa-radio"></i></div>' +
            '<div class="cd-bolo-header-text">' +
              '<h3>Active Calls</h3>' +
              '<span>Dispatch &amp; assignments</span>' +
            '</div>' +
          '</div>' +
          '<span class="cd-call-count-badge" id="cd-call-count">0</span>' +
        '</div>' +

        /* Tabs */
        '<div class="cd-call-tabs">' +
          '<button class="cd-call-tab" data-tab="mine">' +
            'My Calls <span class="cd-call-tab-count">0</span>' +
          '</button>' +
          '<button class="cd-call-tab cd-call-tab-active" data-tab="department">' +
            'Department <span class="cd-call-tab-count">0</span>' +
          '</button>' +
          '<button class="cd-call-tab" data-tab="all">' +
            'All Open <span class="cd-call-tab-count">0</span>' +
          '</button>' +
        '</div>' +

        /* List */
        '<div class="cd-call-list" id="cd-call-list">' +
          '<div class="cd-call-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading calls&hellip;</div>' +
        '</div>' +

        /* Pagination */
        '<div id="cd-call-pagination" class="cd-call-pagination"></div>' +

      '</div>';
  }

  /* ───────────────────────────────────────────
     Init Component (wires events)
     ─────────────────────────────────────────── */

  function cdCallsInit() {
    /* Load department calls by default */
    state.tab = 'department';
    state.page = 1;
    state.expanded = {};
    loadCalls();

    /* Tab switching */
    $(document).off('click.cdCallTab').on('click.cdCallTab', '.cd-call-tab', function () {
      var $btn = $(this);
      var tab = $btn.data('tab');
      if (tab === state.tab) return;

      state.tab = tab;
      state.page = 1;
      state.expanded = {};
      $('.cd-call-tab').removeClass('cd-call-tab-active');
      $btn.addClass('cd-call-tab-active');
      loadCalls();
    });

    /* Expand / collapse call detail */
    $(document).off('click.cdCallToggle').on('click.cdCallToggle', '[data-toggle-call]', function () {
      var callId = $(this).data('toggle-call');
      if (!callId) return;
      state.expanded[callId] = !state.expanded[callId];
      var $item = $(this).closest('.cd-call-item');
      $item.toggleClass('cd-call-expanded');
    });

    /* Pagination */
    $(document).off('click.cdCallPage').on('click.cdCallPage', '.cd-call-page-btn:not(:disabled)', function () {
      var page = parseInt($(this).data('page'), 10);
      if (isNaN(page) || page < 1 || page === state.page) return;
      state.page = page;
      state.expanded = {};
      loadCalls();
    });

    /* Auto-refresh every 30 seconds */
    startAutoRefresh();

    /* Stop refresh when navigating away (if the component is ever torn down) */
    $(window).off('beforeunload.cdCalls').on('beforeunload.cdCalls', function () {
      stopAutoRefresh();
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
     REGISTER ON WINDOW
     ═════════════════════════════════════════════════════════════════════ */

  window.cdCallsRender = cdCallsRender;
  window.cdCallsInit = cdCallsInit;

  /* ───────────────────────────────────────────
     Action Handlers
     ─────────────────────────────────────────── */

  function findCallById(callId) {
    for (var i = 0; i < state.calls.length; i++) {
      var item = state.calls[i];
      if ((item._id || '') === callId) return item;
    }
    return null;
  }

  window.cdCallAssignMe = function (callId) {
    var item = findCallById(callId);
    if (!item) return;
    var c = item.call || item;
    var assigned = (c.assignedTo || []).slice();
    var userId = cfg().userId;
    if (assigned.indexOf(userId) !== -1) return;
    assigned.push(userId);

    $.ajax({
      url: apiUrl() + '/api/v1/call/' + encodeURIComponent(callId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ assignedTo: assigned }),
      success: function () {
        toast('Assigned to you', 'success');
        loadCalls(null, true);
      },
      error: function () {
        toast('Failed to assign call', 'error');
      }
    });
  };

  window.cdCallUnassignMe = function (callId) {
    var item = findCallById(callId);
    if (!item) return;
    var c = item.call || item;
    var assigned = (c.assignedTo || []).slice();
    var userId = cfg().userId;
    var filtered = assigned.filter(function (uid) { return uid !== userId; });

    $.ajax({
      url: apiUrl() + '/api/v1/call/' + encodeURIComponent(callId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ assignedTo: filtered }),
      success: function () {
        toast('Unassigned from call', 'success');
        loadCalls(null, true);
      },
      error: function () {
        toast('Failed to unassign from call', 'error');
      }
    });
  };

  window.cdCallAddNote = function (callId) {
    var mid = 'cd-call-note-modal';
    $('#' + mid).remove();
    var $ov = $(
      '<div id="' + mid + '" style="position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;">' +
        '<div style="width:90%;max-width:440px;background:rgba(16,17,24,0.97);border:1px solid rgba(255,255,255,0.08);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,0.5);position:relative;overflow:hidden;">' +
          '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:#38bdf8;opacity:0.6;"></div>' +
          '<div style="padding:1.25rem 1.25rem 0;display:flex;align-items:center;justify-content:space-between;">' +
            '<h3 style="margin:0;font-size:0.9375rem;font-weight:600;color:#fff;display:flex;align-items:center;gap:0.5rem;">' +
              '<i class="fa fa-comment" style="color:#38bdf8;"></i> Add Call Note</h3>' +
            '<button onclick="$(\'#' + mid + '\').css(\'opacity\',\'0\');setTimeout(function(){$(\'#' + mid + '\').remove()},200)" style="width:28px;height:28px;border-radius:8px;background:transparent;border:none;color:#475569;font-size:0.875rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
              '<i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div style="padding:1rem 1.25rem;">' +
            '<textarea id="cd-call-note-input" placeholder="Type your note here..." style="width:100%;min-height:110px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#e2e8f0;font-family:Outfit,sans-serif;font-size:0.8125rem;padding:0.75rem;resize:vertical;outline:none;transition:border-color 0.15s;box-sizing:border-box;line-height:1.6;"></textarea>' +
          '</div>' +
          '<div style="padding:0 1.25rem 1.25rem;display:flex;gap:0.5rem;">' +
            '<button onclick="$(\'#' + mid + '\').css(\'opacity\',\'0\');setTimeout(function(){$(\'#' + mid + '\').remove()},200)" style="flex:1;padding:0.5625rem 1rem;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:#64748b;font-family:Outfit,sans-serif;font-size:0.8125rem;font-weight:600;cursor:pointer;">Cancel</button>' +
            '<button id="cd-call-note-submit" style="flex:1;padding:0.5625rem 1rem;border-radius:8px;background:rgba(56,189,248,0.2);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;font-family:Outfit,sans-serif;font-size:0.8125rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.375rem;">' +
              '<i class="fa fa-paper-plane" style="font-size:0.6875rem;"></i> Add Note</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    $('body').append($ov);
    requestAnimationFrame(function() { $ov.css('opacity', '1'); });
    setTimeout(function() { $('#cd-call-note-input').focus(); }, 100);
    $ov.on('click', function(e) { if (e.target === this) { $ov.css('opacity','0'); setTimeout(function(){$ov.remove();},200); } });
    $(document).on('keydown.callNote', function(e) { if (e.key === 'Escape') { $ov.css('opacity','0'); setTimeout(function(){$ov.remove();},200); $(document).off('keydown.callNote'); } });
    $('#cd-call-note-input').on('focus', function() { this.style.borderColor='rgba(56,189,248,0.4)'; }).on('blur', function() { this.style.borderColor=''; });
    $('#cd-call-note-submit').on('click', function() {
      var txt = $('#cd-call-note-input').val().trim();
      if (!txt) { $('#cd-call-note-input').css('border-color','#ef4444').focus(); return; }
      var $b = $(this); $b.prop('disabled',true).html('<i class="fa fa-spinner fa-spin" style="font-size:0.6875rem;"></i> Saving...');
      $.ajax({
        url: apiUrl() + '/api/v1/call/' + encodeURIComponent(callId) + '/note',
        method: 'POST', contentType: 'application/json',
        data: JSON.stringify({ note: txt, createdBy: cfg().userName || 'Officer', createdAt: new Date().toISOString() }),
        success: function() { toast('Note added','success'); $ov.css('opacity','0'); setTimeout(function(){$ov.remove();},200); $(document).off('keydown.callNote'); loadCalls(null,true); },
        error: function() { toast('Failed to add note','error'); $b.prop('disabled',false).html('<i class="fa fa-paper-plane" style="font-size:0.6875rem;"></i> Add Note'); }
      });
    });
  };

  window.cdCallComplete = function (callId) {
    if (window.ddModal) {
      window.ddModal({
        title: 'Complete Call',
        message: 'Mark this call as completed?',
        confirmText: 'Complete',
        onConfirm: function () { doCompleteCall(callId); }
      });
    } else {
      if (!confirm('Mark this call as completed?')) return;
      doCompleteCall(callId);
    }
  };

  function doCompleteCall(callId) {
    var userName = cfg().userName || 'Officer';
    $.ajax({
      url: apiUrl() + '/api/v1/call/' + encodeURIComponent(callId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ status: false }),
      success: function () {
        // Add a system note recording who completed it
        $.ajax({
          url: apiUrl() + '/api/v1/call/' + encodeURIComponent(callId) + '/note',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            note: 'Call marked as completed by ' + userName,
            createdBy: 'System',
            createdAt: new Date().toISOString()
          }),
          complete: function () {
            toast('Call completed', 'success');
            loadCalls(null, true);
          }
        });
      },
      error: function () {
        toast('Failed to complete call', 'error');
      }
    });
  }

  window.cdCallDelete = function (callId) {
    if (window.ddModal) {
      window.ddModal({
        title: 'Delete Call',
        message: 'Are you sure you want to delete this call?',
        type: 'danger',
        confirmText: 'Delete',
        onConfirm: function () { doDeleteCall(callId); }
      });
    } else {
      if (!confirm('Are you sure you want to delete this call?')) return;
      doDeleteCall(callId);
    }
  };

  function doDeleteCall(callId) {
    $.ajax({
      url: apiUrl() + '/api/v1/call/' + encodeURIComponent(callId),
      method: 'DELETE',
      success: function () {
        toast('Call deleted', 'success');
        loadCalls(null, true);
      },
      error: function () {
        toast('Failed to delete call', 'error');
      }
    });
  }

})();
