/**
 * Command Dashboard — Warrant Database Component
 *
 * Search & browse warrants with filtering by type and status.
 * Registers window.cdWarrantDbRender and window.cdWarrantDbInit.
 *
 * Dependencies:
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 */
;(function () {
  'use strict';

  /* ───────────────────────── Constants & State ───────────────────────── */

  var PAGE_SIZE = 12;
  var DEBOUNCE_MS = 300;

  var state = {
    warrants: [],
    page: 1,
    totalCount: 0,
    totalPages: 1,
    nameQuery: '',
    warrantType: '',
    status: '',
    loading: false,
    expandedId: null
  };

  var searchTimer = null;

  /* ───────────────────────── Helpers ───────────────────────── */

  function cfg() { return window.ddConfig || {}; }
  function apiUrl() { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, type) { if (window.ddToast) window.ddToast(msg, type); }

  function fmtDate(d) {
    if (!d) return 'N/A';
    var dt = new Date(d);
    if (isNaN(dt.getTime()) || dt.getFullYear() <= 1970) return 'N/A';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function truncate(s, max) {
    if (!s) return '';
    return s.length > max ? s.substring(0, max) + '\u2026' : s;
  }

  /* ───────────────────────── Status / Type Helpers ───────────────────────── */

  var STATUS_COLORS = {
    pending:   { bg: 'rgba(245,158,11,0.15)', color: 'var(--cd-amber)',    border: 'var(--cd-amber)'    },
    approved:  { bg: 'rgba(34,197,94,0.15)',   color: 'var(--cd-green)',    border: 'var(--cd-green)'    },
    denied:    { bg: 'rgba(239,68,68,0.15)',   color: 'var(--cd-red)',      border: 'var(--cd-red)'      },
    executed:  { bg: 'rgba(59,130,246,0.15)',   color: 'var(--cd-blue)',     border: 'var(--cd-blue)'     },
    expired:   { bg: 'rgba(100,116,139,0.15)', color: 'var(--cd-text-dim)', border: 'var(--cd-text-dim)' },
    withdrawn: { bg: 'rgba(100,116,139,0.15)', color: 'var(--cd-text-dim)', border: 'var(--cd-text-dim)' }
  };

  var TYPE_COLORS = {
    arrest: { bg: 'transparent', color: 'var(--cd-red)',   border: 'var(--cd-red)'   },
    search: { bg: 'transparent', color: 'var(--cd-amber)', border: 'var(--cd-amber)' },
    bench:  { bg: 'transparent', color: 'var(--cd-blue)',  border: 'var(--cd-blue)'  }
  };

  function statusStyle(status) {
    var s = STATUS_COLORS[status] || STATUS_COLORS.pending;
    return 'background:' + s.bg + ';color:' + s.color + ';';
  }

  function typeStyle(type) {
    var t = TYPE_COLORS[type] || TYPE_COLORS.arrest;
    return 'background:' + t.bg + ';color:' + t.color + ';border:1px solid ' + t.border + ';';
  }

  function statusBorderColor(status) {
    var s = STATUS_COLORS[status] || STATUS_COLORS.pending;
    return s.border;
  }

  /* ───────────────────────── CSS Injection ───────────────────────── */

  function injectStyles() {
    if (document.getElementById('cd-wd-styles')) return;

    var css =
      /* ── Shared BOLO header (duplicated for independence) ── */
      '.cd-bolo-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-bolo-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-bolo-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-bolo-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +

      /* ── Search / Filter bar ── */
      '.cd-wd-filters{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;padding:0.75rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-wd-search-input{flex:1;min-width:160px;background:rgba(0,0,0,0.25);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.5rem 0.75rem;color:var(--cd-text);font-size:0.8125rem;font-family:inherit;outline:none;transition:border-color 0.2s;box-sizing:border-box;}' +
      '.cd-wd-search-input::placeholder{color:var(--cd-text-dim);}' +
      '.cd-wd-search-input:focus{border-color:var(--cd-accent);}' +
      '.cd-wd-select{background:rgba(0,0,0,0.25);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.5rem 2rem 0.5rem 0.75rem;color:var(--cd-text);font-size:0.8125rem;font-family:inherit;outline:none;transition:border-color 0.2s;appearance:none;-webkit-appearance:none;' +
        'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%2364748b\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11L3 6h10z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 0.75rem center;}' +
      '.cd-wd-select:focus{border-color:var(--cd-accent);}' +
      '.cd-wd-select option{background:#0c0d12;color:var(--cd-text);}' +
      '.cd-wd-search-btn{padding:0.5rem 1rem;border-radius:var(--cd-radius-sm);border:none;background:rgba(56,189,248,0.15);color:var(--cd-accent);font-family:inherit;font-size:0.8125rem;font-weight:600;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.cd-wd-search-btn:hover{background:rgba(56,189,248,0.25);}' +

      /* ── Grid ── */
      '.cd-wd-body{padding:0.75rem 1.25rem;}' +
      '.cd-wd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:0.625rem;}' +

      /* ── Card ── */
      '.cd-wd-card{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);overflow:hidden;transition:border-color 0.2s;cursor:pointer;}' +
      '.cd-wd-card:hover{border-color:rgba(255,255,255,0.12);}' +
      '.cd-wd-card.cd-wd-expanded{border-color:var(--cd-accent);}' +

      /* Card summary */
      '.cd-wd-card-summary{padding:0.75rem 1rem;display:flex;flex-direction:column;gap:0.5rem;}' +
      '.cd-wd-card-top{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;}' +
      '.cd-wd-badge{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:0.125rem 0.5rem;border-radius:99px;white-space:nowrap;}' +
      '.cd-wd-card-name{font-size:0.875rem;font-weight:600;color:var(--cd-text);}' +
      '.cd-wd-card-charges{font-size:0.75rem;color:var(--cd-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-wd-card-bottom{display:flex;align-items:center;justify-content:space-between;}' +
      '.cd-wd-card-date{font-size:0.6875rem;color:var(--cd-text-dim);}' +
      '.cd-wd-card-chevron{color:var(--cd-text-dim);font-size:0.75rem;transition:transform 0.25s;}' +
      '.cd-wd-expanded .cd-wd-card-chevron{transform:rotate(180deg);}' +

      /* Card detail */
      '.cd-wd-card-detail{max-height:0;overflow:hidden;transition:max-height 0.35s ease;}' +
      '.cd-wd-expanded .cd-wd-card-detail{max-height:800px;}' +
      '.cd-wd-detail-inner{padding:0.75rem 1rem 1rem;border-top:1px solid var(--cd-glass-border);}' +
      '.cd-wd-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1rem;}' +
      '.cd-wd-detail-field{display:flex;flex-direction:column;gap:0.125rem;}' +
      '.cd-wd-detail-label{font-size:0.625rem;font-weight:500;color:var(--cd-text-dim);text-transform:uppercase;letter-spacing:0.04em;}' +
      '.cd-wd-detail-value{font-size:0.8125rem;color:var(--cd-text);word-wrap:break-word;overflow-wrap:break-word;white-space:normal;}' +
      '.cd-wd-detail-full{grid-column:1/-1;}' +
      '.cd-wd-charges-list{list-style:none;margin:0;padding:0;}' +
      '.cd-wd-charges-list li{font-size:0.75rem;color:var(--cd-text);padding:0.25rem 0;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-wd-charges-list li:last-child{border-bottom:none;}' +
      '.cd-wd-charges-list li::before{content:"\\2022";color:var(--cd-text-dim);margin-right:0.5rem;}' +

      /* ── Pagination ── */
      '.cd-wd-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.cd-wd-page-btn{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.35rem 0.75rem;color:var(--cd-text);font-size:0.75rem;font-family:inherit;cursor:pointer;transition:border-color 0.2s,opacity 0.2s;}' +
      '.cd-wd-page-btn:hover:not(:disabled){border-color:var(--cd-accent);}' +
      '.cd-wd-page-btn:disabled{opacity:0.35;cursor:default;}' +
      '.cd-wd-page-info{font-size:0.75rem;color:var(--cd-text-muted);}' +

      /* ── Empty & loading ── */
      '.cd-wd-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem 1rem;gap:0.5rem;}' +
      '.cd-wd-empty-icon{font-size:1.5rem;color:var(--cd-text-dim);opacity:0.4;}' +
      '.cd-wd-empty-msg{font-size:0.8125rem;color:var(--cd-text-muted);text-align:center;}' +
      '.cd-wd-loading{display:flex;align-items:center;justify-content:center;padding:2rem;gap:0.5rem;color:var(--cd-text-muted);font-size:0.8125rem;}' +
      '@keyframes cd-wd-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}' +
      '.cd-wd-spinner{width:1.25rem;height:1.25rem;border:2px solid var(--cd-glass-border);border-top-color:var(--cd-accent);border-radius:50%;animation:cd-wd-spin 0.7s linear infinite;}' +

      /* ── Responsive ── */
      '@media(max-width:900px){.cd-wd-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr));}}' +
      '@media(max-width:600px){' +
        '.cd-wd-grid{grid-template-columns:1fr;}' +
        '.cd-wd-filters{flex-direction:column;}' +
        '.cd-wd-search-input{min-width:100%;}' +
        '.cd-wd-select{width:100%;}' +
        '.cd-wd-search-btn{width:100%;justify-content:center;}' +
      '}';

    var tag = document.createElement('style');
    tag.id = 'cd-wd-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ───────────────────────── API ───────────────────────── */

  function loadWarrants(callback) {
    state.loading = true;
    renderResults();

    var params = {
      limit: PAGE_SIZE,
      page: state.page - 1
    };

    if (state.nameQuery) params.name = state.nameQuery;
    if (state.warrantType) params.warrantType = state.warrantType;
    if (state.status) params.status = state.status;

    $.ajax({
      url: apiUrl() + '/api/v2/warrants/community/' + encodeURIComponent(cfg().communityId),
      method: 'GET',
      data: params,
      success: function (resp) {
        state.warrants = resp.data || [];
        state.page = resp.page || 1;
        state.totalCount = resp.totalCount || 0;
        state.totalPages = resp.totalPages || 1;
        state.loading = false;
        state.expandedId = null;
        renderResults();
        renderPagination();
        if (callback) callback();
      },
      error: function (xhr, statusText, err) {
        state.loading = false;
        state.warrants = [];
        state.totalCount = 0;
        state.totalPages = 1;
        renderResults();
        renderPagination();
        toast('Failed to load warrants', 'error');
        console.error('[cd-warrant-db] Load error:', statusText, err);
      }
    });
  }

  /* ───────────────────────── Render — Card ───────────────────────── */

  function buildCard(item) {
    var w = item.warrant || {};
    var id = item._id || '';
    var wStatus = (w.status || 'pending').toLowerCase();
    var wType = (w.warrantType || 'arrest').toLowerCase();
    var name = esc((w.accusedFirstName || '') + ' ' + (w.accusedLastName || '')).trim() || 'Unknown';
    var charges = Array.isArray(w.charges) ? w.charges : [];
    var chargesSummary = charges.length > 0
      ? esc(truncate(charges.join(', '), 80))
      : '<span style="color:var(--cd-text-dim);">No charges listed</span>';
    var date = fmtDate(w.createdAt);
    var isExpanded = state.expandedId === id;
    var borderColor = statusBorderColor(wStatus);

    var html =
      '<div class="cd-wd-card' + (isExpanded ? ' cd-wd-expanded' : '') + '" data-id="' + esc(id) + '" style="border-left:3px solid ' + borderColor + ';">' +
        '<div class="cd-wd-card-summary">' +
          '<div class="cd-wd-card-top">' +
            '<span class="cd-wd-badge" style="' + statusStyle(wStatus) + '">' + esc(wStatus) + '</span>' +
            '<span class="cd-wd-badge" style="' + typeStyle(wType) + '">' + esc(wType) + '</span>' +
          '</div>' +
          '<div class="cd-wd-card-name">' + name + '</div>' +
          '<div class="cd-wd-card-charges">' + chargesSummary + '</div>' +
          '<div class="cd-wd-card-bottom">' +
            '<span class="cd-wd-card-date"><i class="far fa-clock"></i> ' + esc(date) + '</span>' +
            '<i class="fa fa-chevron-down cd-wd-card-chevron"></i>' +
          '</div>' +
        '</div>' +
        '<div class="cd-wd-card-detail">' +
          (isExpanded ? buildDetail(item) : '') +
        '</div>' +
      '</div>';

    return html;
  }

  /* ───────────────────────── Render — Detail ───────────────────────── */

  function buildDetail(item) {
    var w = item.warrant || {};
    var wStatus = (w.status || 'pending').toLowerCase();
    var wType = (w.warrantType || 'arrest').toLowerCase();
    var charges = Array.isArray(w.charges) ? w.charges : [];

    var chargesHtml = '';
    if (charges.length > 0) {
      chargesHtml = '<ul class="cd-wd-charges-list">';
      for (var i = 0; i < charges.length; i++) {
        chargesHtml += '<li>' + esc(charges[i]) + '</li>';
      }
      chargesHtml += '</ul>';
    } else {
      chargesHtml = '<span style="color:var(--cd-text-dim);">None</span>';
    }

    var html =
      '<div class="cd-wd-detail-inner">' +

        /* Probable Cause */
        '<div class="cd-wd-detail-field cd-wd-detail-full" style="margin-bottom:0.75rem;">' +
          '<div class="cd-wd-detail-label">Probable Cause</div>' +
          '<div class="cd-wd-detail-value">' + (w.probableCause ? esc(w.probableCause) : '<span style="color:var(--cd-text-dim);">Not provided</span>') + '</div>' +
        '</div>' +

        /* Charges */
        '<div class="cd-wd-detail-field cd-wd-detail-full" style="margin-bottom:0.75rem;">' +
          '<div class="cd-wd-detail-label">Charges</div>' +
          chargesHtml +
        '</div>' +

        /* Detail grid */
        '<div class="cd-wd-detail-grid">';

    /* Search location (only for search warrants) */
    if (wType === 'search' && w.searchLocation) {
      html +=
        '<div class="cd-wd-detail-field cd-wd-detail-full">' +
          '<div class="cd-wd-detail-label">Search Location</div>' +
          '<div class="cd-wd-detail-value">' + esc(w.searchLocation) + '</div>' +
        '</div>';
    }

    html +=
        '<div class="cd-wd-detail-field">' +
          '<div class="cd-wd-detail-label">Accused ID</div>' +
          '<div class="cd-wd-detail-value">' + (w.accusedID ? esc(w.accusedID) : 'N/A') + '</div>' +
        '</div>' +
        '<div class="cd-wd-detail-field">' +
          '<div class="cd-wd-detail-label">Requesting Officer</div>' +
          '<div class="cd-wd-detail-value">' + (w.requestingOfficerName ? esc(w.requestingOfficerName) : 'N/A') + '</div>' +
        '</div>' +
        '<div class="cd-wd-detail-field">' +
          '<div class="cd-wd-detail-label">Status</div>' +
          '<div class="cd-wd-detail-value"><span class="cd-wd-badge" style="' + statusStyle(wStatus) + 'font-size:0.6875rem;">' + esc(wStatus) + '</span></div>' +
        '</div>' +
        '<div class="cd-wd-detail-field">' +
          '<div class="cd-wd-detail-label">Last Updated</div>' +
          '<div class="cd-wd-detail-value">' + fmtDate(w.updatedAt) + '</div>' +
        '</div>';

    /* Judge notes */
    if (w.judgeNotes) {
      html +=
        '<div class="cd-wd-detail-field cd-wd-detail-full" style="margin-top:0.5rem;">' +
          '<div class="cd-wd-detail-label">Judge Notes</div>' +
          '<div class="cd-wd-detail-value">' + esc(w.judgeNotes) + '</div>' +
        '</div>';
    }

    html +=
        '</div>' + /* close detail-grid */
      '</div>';    /* close detail-inner */

    return html;
  }

  /* ───────────────────────── Render — Results ───────────────────────── */

  function renderResults() {
    var $container = $('#cd-wd-results');
    if (!$container.length) return;

    if (state.loading) {
      $container.html(
        '<div class="cd-wd-loading">' +
          '<div class="cd-wd-spinner"></div> Loading warrants&hellip;' +
        '</div>'
      );
      return;
    }

    if (!state.warrants.length) {
      $container.html(
        '<div class="cd-wd-empty">' +
          '<i class="fas fa-gavel cd-wd-empty-icon"></i>' +
          '<div class="cd-wd-empty-msg">No warrants found</div>' +
        '</div>'
      );
      return;
    }

    var html = '<div class="cd-wd-grid">';
    for (var i = 0; i < state.warrants.length; i++) {
      html += buildCard(state.warrants[i]);
    }
    html += '</div>';
    $container.html(html);
  }

  /* ───────────────────────── Render — Pagination ───────────────────────── */

  function renderPagination() {
    var $pag = $('#cd-wd-pagination');
    if (!$pag.length) return;

    if (state.totalPages <= 1) {
      $pag.html('');
      return;
    }

    $pag.html(
      '<div class="cd-wd-pagination">' +
        '<button class="cd-wd-page-btn" id="cd-wd-prev"' + (state.page <= 1 ? ' disabled' : '') + '>' +
          '<i class="fas fa-chevron-left"></i> Previous' +
        '</button>' +
        '<span class="cd-wd-page-info">Page ' + state.page + ' of ' + state.totalPages + '</span>' +
        '<button class="cd-wd-page-btn" id="cd-wd-next"' + (state.page >= state.totalPages ? ' disabled' : '') + '>' +
          'Next <i class="fas fa-chevron-right"></i>' +
        '</button>' +
      '</div>'
    );
  }

  /* ───────────────────────── Search Trigger ───────────────────────── */

  function triggerSearch() {
    state.nameQuery = ($('#cd-wd-name').val() || '').trim();
    state.warrantType = $('#cd-wd-type').val() || '';
    state.status = $('#cd-wd-status').val() || '';
    state.page = 1;
    loadWarrants();
  }

  function debouncedSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(triggerSearch, DEBOUNCE_MS);
  }

  /* ───────────────────────── Expand / Collapse ───────────────────────── */

  function toggleCard(id) {
    if (state.expandedId === id) {
      state.expandedId = null;
    } else {
      state.expandedId = id;
    }
    renderResults();
    renderPagination();
  }

  /* ───────────────────────── Render Component ───────────────────────── */

  function cdWarrantDbRender() {
    injectStyles();

    return '' +
      '<div style="background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius);overflow:hidden;">' +

        /* Header */
        '<div class="cd-bolo-header">' +
          '<div class="cd-bolo-header-left">' +
            '<div class="cd-bolo-header-icon"><i class="fas fa-gavel"></i></div>' +
            '<div class="cd-bolo-header-text">' +
              '<h3>Warrant Database</h3>' +
              '<span>Search &amp; browse warrants</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* Filters */
        '<div class="cd-wd-filters">' +
          '<input type="text" class="cd-wd-search-input" id="cd-wd-name" placeholder="Search by accused name\u2026" autocomplete="off" />' +
          '<select class="cd-wd-select" id="cd-wd-type">' +
            '<option value="">All Types</option>' +
            '<option value="arrest">Arrest</option>' +
            '<option value="search">Search</option>' +
            '<option value="bench">Bench</option>' +
          '</select>' +
          '<select class="cd-wd-select" id="cd-wd-status">' +
            '<option value="">All Statuses</option>' +
            '<option value="pending">Pending</option>' +
            '<option value="approved">Approved</option>' +
            '<option value="denied">Denied</option>' +
            '<option value="executed">Executed</option>' +
            '<option value="expired">Expired</option>' +
            '<option value="withdrawn">Withdrawn</option>' +
          '</select>' +
          '<button class="cd-wd-search-btn" id="cd-wd-search-btn">' +
            '<i class="fas fa-search"></i> Search' +
          '</button>' +
        '</div>' +

        /* Results */
        '<div class="cd-wd-body">' +
          '<div id="cd-wd-results">' +
            '<div class="cd-wd-loading"><div class="cd-wd-spinner"></div> Loading warrants&hellip;</div>' +
          '</div>' +
          '<div id="cd-wd-pagination"></div>' +
        '</div>' +

      '</div>';
  }

  /* ───────────────────────── Init Component ───────────────────────── */

  function cdWarrantDbInit() {
    /* Load first page */
    loadWarrants();

    /* Search button */
    $(document).off('click.cdWdSearch').on('click.cdWdSearch', '#cd-wd-search-btn', function () {
      triggerSearch();
    });

    /* Enter key on search input */
    $(document).off('keydown.cdWdInput').on('keydown.cdWdInput', '#cd-wd-name', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        clearTimeout(searchTimer);
        triggerSearch();
      }
    });

    /* Debounced input */
    $(document).off('input.cdWdInput').on('input.cdWdInput', '#cd-wd-name', function () {
      debouncedSearch();
    });

    /* Dropdown changes */
    $(document).off('change.cdWdType').on('change.cdWdType', '#cd-wd-type', function () {
      triggerSearch();
    });

    $(document).off('change.cdWdStatus').on('change.cdWdStatus', '#cd-wd-status', function () {
      triggerSearch();
    });

    /* Card expand / collapse */
    $(document).off('click.cdWdCard').on('click.cdWdCard', '.cd-wd-card', function (e) {
      /* Ignore clicks on links or buttons inside detail */
      if ($(e.target).closest('a, button').length) return;
      var id = $(this).data('id');
      if (id) toggleCard(id);
    });

    /* Pagination — Previous */
    $(document).off('click.cdWdPrev').on('click.cdWdPrev', '#cd-wd-prev', function () {
      if (state.page > 1) {
        state.page--;
        loadWarrants();
      }
    });

    /* Pagination — Next */
    $(document).off('click.cdWdNext').on('click.cdWdNext', '#cd-wd-next', function () {
      if (state.page < state.totalPages) {
        state.page++;
        loadWarrants();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     REGISTER ON WINDOW
     ═══════════════════════════════════════════════════════════ */

  window.cdWarrantDbRender = cdWarrantDbRender;
  window.cdWarrantDbInit = cdWarrantDbInit;

})();
