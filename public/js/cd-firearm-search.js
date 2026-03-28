/**
 * Command Dashboard — Firearm Search Component
 *
 * Searches across the entire community's firearms registry.
 * Registers window.cdFirearmSearchRender and window.cdFirearmSearchInit.
 *
 * Dependencies:
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, departmentId }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 */
;(function () {
  'use strict';

  /* ───────────────────────── Constants & State ───────────────────────── */

  var PAGE_SIZE = 10;
  var DEBOUNCE_MS = 300;

  var state = {
    results: [],
    page: 1,
    totalCount: 0,
    totalPages: 1,
    searchQuery: '',
    loading: false,
    expandedId: null,
    ownerCache: {}   // { civilianId: { firstName, lastName } }
  };

  var searchTimer = null;

  /* ───────────────────────── Helpers ───────────────────────── */

  function cfg() { return window.ddConfig || {}; }
  function apiUrl() { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, type) { if (window.ddToast) window.ddToast(msg, type); }

  /** Normalize boolean-ish API values. */
  function toBool(val) {
    return val === true || val === 1 || val === '1' || val === 'true';
  }

  /** Flatten { _id, firearm: {...} } → merged object */
  function flatten(item) {
    if (!item) return null;
    var f = item.firearm || item.details || {};
    var out = {};
    var keys = Object.keys(f);
    for (var i = 0; i < keys.length; i++) out[keys[i]] = f[keys[i]];
    out._id = item._id || item.id || f._id || '';
    if (out._id && typeof out._id === 'object' && out._id.$oid) out._id = out._id.$oid;
    return out;
  }

  /** Normalize API response to array */
  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.firearms)) return data.firearms;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  }

  /** Extract total count from API response */
  function extractTotal(data) {
    if (data && typeof data.totalCount === 'number') return data.totalCount;
    if (data && typeof data.total === 'number') return data.total;
    return 0;
  }

  /** Extract total pages from API response */
  function extractTotalPages(data) {
    if (data && typeof data.totalPages === 'number') return data.totalPages;
    return 0;
  }

  /* ───────────────────────── CSS Injection ───────────────────────── */

  function injectStyles() {
    if (document.getElementById('cd-firearm-search-styles')) return;
    var css =
      /* Shared header */
      '.cd-bolo-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-bolo-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-bolo-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-bolo-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +
      /* Search input */
      '.cd-fs-search-wrap{position:relative;margin-bottom:1rem;}' +
      '.cd-fs-search-icon{position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--cd-text-muted);font-size:0.875rem;pointer-events:none;}' +
      '.cd-fs-search-input{width:100%;background:rgba(0,0,0,0.25);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.6rem 2rem 0.6rem 2.25rem;color:var(--cd-text);font-size:0.8125rem;outline:none;transition:border-color 0.2s;box-sizing:border-box;}' +
      '.cd-fs-search-clear{position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--cd-text-dim);font-size:0.75rem;cursor:pointer;padding:0.25rem;display:none;transition:color 0.15s;line-height:1;}' +
      '.cd-fs-search-clear:hover{color:var(--cd-text);}' +
      '.cd-fs-search-input::placeholder{color:var(--cd-text-dim);}' +
      '.cd-fs-search-input:focus{border-color:var(--cd-accent);}' +

      /* Results list */
      '.cd-fs-results{display:flex;flex-direction:column;gap:0.5rem;}' +

      /* Result item */
      '.cd-fs-item{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);cursor:pointer;transition:border-color 0.2s;overflow:hidden;}' +
      '.cd-fs-item:hover{border-color:rgba(255,255,255,0.12);}' +
      '.cd-fs-item.cd-fs-expanded{border-color:var(--cd-accent);}' +

      /* Summary row */
      '.cd-fs-item-summary{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;min-height:2.5rem;}' +
      '.cd-fs-item-summary .cd-fs-icon{color:var(--cd-text-muted);font-size:0.875rem;flex-shrink:0;width:1.25rem;text-align:center;}' +
      '.cd-fs-item-info{flex:1;min-width:0;}' +
      '.cd-fs-item-serial{font-size:0.8125rem;font-weight:700;color:var(--cd-text);font-family:monospace;letter-spacing:0.04em;}' +
      '.cd-fs-item-sub{font-size:0.6875rem;color:var(--cd-text-muted);margin-top:0.125rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-fs-badges{display:flex;gap:0.375rem;flex-shrink:0;align-items:center;}' +
      '.cd-fs-badge{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:0.125rem 0.5rem;border-radius:99px;white-space:nowrap;}' +
      '.cd-fs-badge-red{background:rgba(239,68,68,0.15);color:var(--cd-red);}' +
      '.cd-fs-badge-green{background:rgba(34,197,94,0.15);color:var(--cd-green);}' +
      '.cd-fs-expand-icon{color:var(--cd-text-dim);font-size:0.75rem;transition:transform 0.25s;flex-shrink:0;}' +
      '.cd-fs-expanded .cd-fs-expand-icon{transform:rotate(180deg);}' +

      /* Detail panel */
      '.cd-fs-item-detail{max-height:0;overflow:hidden;transition:max-height 0.35s ease;}' +
      '.cd-fs-expanded .cd-fs-item-detail{max-height:5000px;}' +
      '.cd-fs-detail-inner{padding:0.75rem 1rem 1rem;border-top:1px solid var(--cd-glass-border);}' +
      '.cd-fs-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1rem;}' +
      '.cd-fs-detail-field{display:flex;flex-direction:column;gap:0.125rem;}' +
      '.cd-fs-detail-label{font-size:0.625rem;font-weight:500;color:var(--cd-text-dim);text-transform:uppercase;letter-spacing:0.04em;}' +
      '.cd-fs-detail-value{font-size:0.8125rem;color:var(--cd-text);}' +

      /* Owner section */
      '.cd-fs-detail-section{margin-top:0.75rem;}' +
      '.cd-fs-detail-section-title{font-size:0.6875rem;font-weight:700;color:var(--cd-text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;}' +

      /* Pagination */
      '.cd-fs-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.cd-fs-page-btn{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.35rem 0.75rem;color:var(--cd-text);font-size:0.75rem;cursor:pointer;transition:border-color 0.2s,opacity 0.2s;}' +
      '.cd-fs-page-btn:hover:not(:disabled){border-color:var(--cd-accent);}' +
      '.cd-fs-page-btn:disabled{opacity:0.35;cursor:default;}' +
      '.cd-fs-page-info{font-size:0.75rem;color:var(--cd-text-muted);}' +

      /* Empty & loading states */
      '.cd-fs-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1rem;gap:0.5rem;}' +
      '.cd-fs-empty-icon{font-size:1.5rem;color:var(--cd-text-dim);}' +
      '.cd-fs-empty-msg{font-size:0.8125rem;color:var(--cd-text-muted);text-align:center;}' +
      '.cd-fs-loading{display:flex;align-items:center;justify-content:center;padding:2rem;}' +
      '@keyframes cd-fs-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}' +
      '.cd-fs-spinner{width:1.25rem;height:1.25rem;border:2px solid var(--cd-glass-border);border-top-color:var(--cd-accent);border-radius:50%;animation:cd-fs-spin 0.7s linear infinite;}' +

      /* Search history */
      '.cd-fs-history{padding:0.5rem 0.75rem;}' +
      '.cd-fs-history-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--cd-text-dim);}' +
      '.cd-fs-history-header button{background:none;border:none;color:var(--cd-text-dim);font-size:0.625rem;cursor:pointer;padding:0;font-family:inherit;}' +
      '.cd-fs-history-header button:hover{color:var(--cd-red);}' +
      '.cd-fs-history-item{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.625rem;border-radius:var(--cd-radius-sm);cursor:pointer;transition:background 0.15s;}' +
      '.cd-fs-history-item:hover{background:rgba(255,255,255,0.04);}' +
      '.cd-fs-history-item > i{color:var(--cd-text-dim);font-size:0.75rem;flex-shrink:0;}' +
      '.cd-fs-history-query{font-size:0.8125rem;color:var(--cd-text);font-weight:500;}' +
      '.cd-fs-history-label{font-size:0.6875rem;color:var(--cd-text-muted);}' +
      '.cd-fs-history-remove{background:none;border:none;color:var(--cd-text-dim);font-size:0.625rem;cursor:pointer;padding:0.25rem;margin-left:auto;opacity:0;transition:opacity 0.15s;}' +
      '.cd-fs-history-item:hover .cd-fs-history-remove{opacity:1;}' +
      '.cd-fs-history-remove:hover{color:var(--cd-red);}';

    var tag = document.createElement('style');
    tag.id = 'cd-firearm-search-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ───────────────────────── Render ───────────────────────── */

  function render() {
    return (
      '<div class="cd-fs-card">' +
        '<div class="cd-bolo-header">' +
          '<div class="cd-bolo-header-left">' +
            '<div class="cd-bolo-header-icon" style="background:rgba(239,68,68,0.12);color:var(--cd-red);"><i class="fa fa-crosshairs"></i></div>' +
            '<div class="cd-bolo-header-text">' +
              '<h3>Firearm Search</h3>' +
              '<span>Search firearms registry</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cd-fs-search-wrap">' +
          '<i class="fa fa-search cd-fs-search-icon"></i>' +
          '<input type="text" class="cd-fs-search-input" id="cd-fs-input" placeholder="Search by name or serial..." autocomplete="off" />' +
          '<button class="cd-fs-search-clear" id="cd-fs-clear" type="button"><i class="fa fa-times"></i></button>' +
        '</div>' +
        '<div id="cd-fs-results" class="cd-fs-results"></div>' +
        '<div id="cd-fs-pagination"></div>' +
      '</div>'
    );
  }

  /* ───────────────────────── Build result item HTML ───────────────────────── */

  function buildResultItem(firearm) {
    var serial = esc(firearm.serialNumber || 'N/A');
    var name = esc(firearm.name || '');
    var caliber = esc(firearm.caliber || '');
    var weaponType = esc(firearm.weaponType || '');
    var isStolen = toBool(firearm.isStolen);
    var isExpanded = state.expandedId === firearm._id;

    var sub = [name, caliber, weaponType].filter(Boolean).join(' &middot; ');

    var html =
      '<div class="cd-fs-item' + (isExpanded ? ' cd-fs-expanded' : '') + '" data-id="' + esc(firearm._id) + '">' +
        '<div class="cd-fs-item-summary">' +
          (firearm.image
            ? '<img src="' + esc(firearm.image) + '" alt="" onclick="event.stopPropagation();cdVsShowImage(this.src)" style="width:28px;height:28px;border-radius:6px;object-fit:cover;flex-shrink:0;cursor:zoom-in;" />'
            : '<i class="fa fa-crosshairs cd-fs-icon"></i>') +
          '<div class="cd-fs-item-info">' +
            '<div class="cd-fs-item-serial">' + serial + '</div>' +
            '<div class="cd-fs-item-sub">' + (sub || '&mdash;') + '</div>' +
          '</div>' +
          '<div class="cd-fs-badges">' +
            (isStolen ? '<span class="cd-fs-badge cd-fs-badge-red">STOLEN</span>' : '') +
          '</div>' +
          '<i class="fa fa-chevron-down cd-fs-expand-icon"></i>' +
        '</div>' +
        '<div class="cd-fs-item-detail">' +
          (isExpanded ? buildDetailHTML(firearm) : '') +
        '</div>' +
      '</div>';

    return html;
  }

  /* ───────────────────────── Build detail HTML ───────────────────────── */

  function buildDetailHTML(firearm) {
    var ownerInfo = '';
    var linkedId = firearm.linkedCivilianID || firearm.userID || '';

    if (linkedId && state.ownerCache[linkedId]) {
      var owner = state.ownerCache[linkedId];
      ownerInfo = esc((owner.firstName || '') + ' ' + (owner.lastName || ''));
    } else if (linkedId) {
      ownerInfo = '<span style="color:var(--cd-text-dim);">Loading...</span>';
    }

    var html =
      '<div class="cd-fs-detail-inner">' +
        '<div class="cd-fs-detail-grid">' +
          detailField('Serial Number', firearm.serialNumber) +
          detailField('Name', firearm.name) +
          detailField('Weapon Type', firearm.weaponType) +
          detailField('Caliber', firearm.caliber) +
          detailField('Color', firearm.color) +
          detailField('Stolen', toBool(firearm.isStolen) ? 'Yes' : 'No', toBool(firearm.isStolen) ? 'var(--cd-red)' : 'var(--cd-green)') +
        '</div>';

    // Owner section
    if (linkedId) {
      html += '<div class="cd-fs-detail-section">' +
        '<div class="cd-fs-detail-section-title">Registered Owner</div>' +
        '<div class="cd-fs-detail-grid">' +
          '<div class="cd-fs-detail-field">' +
            '<div class="cd-fs-detail-label">Owner</div>' +
            '<div class="cd-fs-detail-value" id="cd-fs-owner-' + esc(firearm._id) + '">' + (ownerInfo || '<span style="color:var(--cd-text-dim);">Unknown</span>') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    // Action button
    var isStolen = toBool(firearm.isStolen);
    html += '<div style="margin-top:0.75rem;padding-top:0.625rem;border-top:1px solid var(--cd-glass-border);">' +
      '<button style="display:inline-flex;align-items:center;gap:0.375rem;padding:0.4rem 0.75rem;border-radius:var(--cd-radius-sm);font-family:Outfit,sans-serif;font-size:0.6875rem;font-weight:600;border:1px solid;cursor:pointer;transition:all 0.15s;' +
        (isStolen ? 'background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.25);color:var(--cd-green);' : 'background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.25);color:var(--cd-red);') +
      '" onclick="cdFsToggleStolen(\'' + esc(firearm._id) + '\', ' + !isStolen + ')">' +
        '<i class="fa ' + (isStolen ? 'fa-check' : 'fa-flag') + '"></i> ' +
        (isStolen ? 'Mark as Not Stolen' : 'Report Stolen') +
      '</button>' +
    '</div>';

    html += '</div>';
    return html;
  }

  window.cdFsToggleStolen = function(firearmId, value) {
    $.ajax({
      url: apiUrl() + '/api/v1/firearm/' + firearmId,
      method: 'PUT', contentType: 'application/json',
      data: JSON.stringify({ isStolen: value ? 'true' : 'false' }),
      success: function() {
        window.ddToast(value ? 'Reported as stolen' : 'Marked as not stolen', 'success');
        var f = state.results.find(function(r) { return r._id === firearmId; });
        if (f) f.isStolen = value ? 'true' : 'false';
        renderResults();
      },
      error: function() { window.ddToast('Failed to update', 'error'); }
    });
  };

  function detailField(label, value, color) {
    var style = color ? ' style="color:' + color + ';font-weight:600;"' : '';
    return '<div class="cd-fs-detail-field">' +
      '<div class="cd-fs-detail-label">' + esc(label) + '</div>' +
      '<div class="cd-fs-detail-value"' + style + '>' + esc(value || 'N/A') + '</div>' +
    '</div>';
  }

  /* ───────────────────────── Search History ───────────────────────── */

  var HISTORY_KEY = 'cd-firearm-search-history';

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveToHistory(query, label) {
    var history = getHistory();
    history = history.filter(function(h) { return h.query.toLowerCase() !== query.toLowerCase(); });
    history.unshift({ query: query, label: label || query, timestamp: Date.now() });
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function renderHistory() {
    var history = getHistory();
    if (history.length === 0) {
      return '<div class="cd-fs-empty">' +
        '<i class="fa fa-search cd-fs-empty-icon"></i>' +
        '<div class="cd-fs-empty-msg">Enter a name or serial number to search</div>' +
      '</div>';
    }
    var html = '<div class="cd-fs-history">' +
      '<div class="cd-fs-history-header">' +
        '<span>Recent Searches</span>' +
        '<button onclick="cdClearAllHistory_firearm()">Clear All</button>' +
      '</div>';
    for (var i = 0; i < history.length; i++) {
      html += '<div class="cd-fs-history-item" onclick="cdClickHistory_firearm(' + i + ')">' +
        '<i class="fa fa-clock"></i>' +
        '<div>' +
          '<div class="cd-fs-history-query">' + esc(history[i].query) + '</div>' +
          '<div class="cd-fs-history-label">' + esc(history[i].label) + '</div>' +
        '</div>' +
        '<button class="cd-fs-history-remove" onclick="event.stopPropagation(); cdRemoveHistory_firearm(' + i + ')">' +
          '<i class="fa fa-times"></i>' +
        '</button>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  window.cdClearAllHistory_firearm = function() {
    localStorage.removeItem(HISTORY_KEY);
    renderResults();
  };

  window.cdRemoveHistory_firearm = function(index) {
    var history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderResults();
  };

  window.cdClickHistory_firearm = function(index) {
    var history = getHistory();
    if (!history[index]) return;
    var query = history[index].query;
    $('#cd-fs-input').val(query);
    doSearch(query, 1);
  };

  /* ───────────────────────── Render results list ───────────────────────── */

  function renderResults() {
    var $container = $('#cd-fs-results');
    var $pagination = $('#cd-fs-pagination');

    if (state.loading) {
      $container.html('<div class="cd-fs-loading"><div class="cd-fs-spinner"></div></div>');
      $pagination.empty();
      return;
    }

    if (!state.searchQuery) {
      $container.html(renderHistory());
      $pagination.empty();
      return;
    }

    if (state.results.length === 0) {
      $container.html(
        '<div class="cd-fs-empty">' +
          '<i class="fa fa-crosshairs cd-fs-empty-icon" style="opacity:0.4;"></i>' +
          '<div class="cd-fs-empty-msg">No firearms found for &ldquo;' + esc(state.searchQuery) + '&rdquo;</div>' +
        '</div>'
      );
      $pagination.empty();
      return;
    }

    var html = '';
    for (var i = 0; i < state.results.length; i++) {
      html += buildResultItem(state.results[i]);
    }
    $container.html(html);

    // Pagination
    if (state.totalPages > 1) {
      $pagination.html(
        '<div class="cd-fs-pagination">' +
          '<button class="cd-fs-page-btn" id="cd-fs-prev"' + (state.page <= 1 ? ' disabled' : '') + '><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="cd-fs-page-info">Page ' + state.page + ' of ' + state.totalPages + '</span>' +
          '<button class="cd-fs-page-btn" id="cd-fs-next"' + (state.page >= state.totalPages ? ' disabled' : '') + '>Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>'
      );
    } else {
      $pagination.empty();
    }
  }

  /* ───────────────────────── API: Search ───────────────────────── */

  function doSearch(query, page) {
    if (!query || query.length < 1) {
      state.results = [];
      state.totalCount = 0;
      state.totalPages = 1;
      state.page = 1;
      state.searchQuery = '';
      renderResults();
      return;
    }

    state.searchQuery = query;
    state.page = page || 1;
    state.loading = true;
    state.expandedId = null;
    renderResults();

    var encoded = encodeURIComponent(query);
    var url = apiUrl() + '/api/v1/firearms/search?name=' + encoded +
      '&serialNumber=' + encoded +
      '&communityId=' + encodeURIComponent(cfg().communityId) +
      '&limit=' + PAGE_SIZE +
      '&page=' + (state.page - 1);

    $.ajax({
      url: url,
      method: 'GET',
      dataType: 'json'
    })
    .done(function (data) {
      var raw = normalizeList(data);
      state.results = [];
      for (var i = 0; i < raw.length; i++) {
        var f = flatten(raw[i]);
        if (f) state.results.push(f);
      }

      // Determine totals for pagination
      var apiTotal = extractTotal(data);
      var apiTotalPages = extractTotalPages(data);

      if (apiTotalPages > 0) {
        state.totalPages = apiTotalPages;
        state.totalCount = apiTotal || (state.totalPages * PAGE_SIZE);
      } else if (apiTotal > 0) {
        state.totalCount = apiTotal;
        state.totalPages = Math.max(1, Math.ceil(state.totalCount / PAGE_SIZE));
      } else {
        state.totalCount = state.results.length < PAGE_SIZE
          ? ((state.page - 1) * PAGE_SIZE + state.results.length)
          : (state.page * PAGE_SIZE + 1);
        state.totalPages = Math.max(1, Math.ceil(state.totalCount / PAGE_SIZE));
      }

      // Save to search history if we got results
      if (state.results.length > 0) {
        var first = state.results[0];
        var label = first.serialNumber || first.name || query;
        saveToHistory(query, label);
      }

      state.loading = false;
      renderResults();
    })
    .fail(function (xhr) {
      state.results = [];
      state.loading = false;
      toast('Firearm search failed: ' + (xhr.responseJSON && xhr.responseJSON.message || xhr.statusText), 'error');
      renderResults();
    });
  }

  /* ───────────────────────── API: Fetch owner name ───────────────────────── */

  function fetchOwner(civilianId, firearmId) {
    if (!civilianId) return;
    if (state.ownerCache.hasOwnProperty(civilianId)) {
      // Already cached, just update the DOM
      updateOwnerDOM(civilianId, firearmId);
      return;
    }

    $.ajax({
      url: apiUrl() + '/api/v1/civilians/' + encodeURIComponent(civilianId),
      method: 'GET',
      dataType: 'json'
    })
    .done(function (data) {
      var civ = data.civilian || data.details || data || {};
      state.ownerCache[civilianId] = {
        firstName: civ.firstName || '',
        lastName: civ.lastName || ''
      };
    })
    .fail(function () {
      state.ownerCache[civilianId] = { firstName: 'Unknown', lastName: '' };
    })
    .always(function () {
      updateOwnerDOM(civilianId, firearmId);
    });
  }

  function updateOwnerDOM(civilianId, firearmId) {
    var owner = state.ownerCache[civilianId];
    if (!owner) return;
    var name = esc((owner.firstName + ' ' + owner.lastName).trim() || 'Unknown');
    var $el = $('#cd-fs-owner-' + firearmId.replace(/[^a-zA-Z0-9_-]/g, ''));
    if ($el.length) $el.html(name);
  }

  /* ───────────────────────── Toggle expand ───────────────────────── */

  function toggleExpand(firearmId) {
    if (state.expandedId === firearmId) {
      state.expandedId = null;
      renderResults();
      return;
    }

    state.expandedId = firearmId;
    renderResults();

    // Fetch owner if we have a linked civilian ID
    for (var i = 0; i < state.results.length; i++) {
      if (state.results[i]._id === firearmId) {
        var linkedId = state.results[i].linkedCivilianID || state.results[i].userID || '';
        if (linkedId) {
          fetchOwner(linkedId, firearmId);
        }
        break;
      }
    }
  }

  /* ───────────────────────── Init ───────────────────────── */

  function init() {
    injectStyles();

    // Remove previous handlers to avoid duplicates (init can be called multiple times)
    $(document).off('.cdFirearmSearch');

    // Show/hide clear button
    $(document).on('input.cdFirearmSearch', '#cd-fs-input', function () {
      $('#cd-fs-clear').toggle($(this).val().length > 0);
    });
    $(document).on('click.cdFirearmSearch', '#cd-fs-clear', function () {
      $('#cd-fs-input').val('').focus();
      $(this).hide();
      doSearch('', 1);
    });

    // Search input debounce
    $(document).on('input.cdFirearmSearch', '#cd-fs-input', function () {
      var val = $(this).val().trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        doSearch(val, 1);
      }, DEBOUNCE_MS);
    });

    // Click to expand/collapse
    $(document).on('click.cdFirearmSearch', '.cd-fs-item-summary', function () {
      var id = $(this).closest('.cd-fs-item').data('id');
      if (id) toggleExpand(String(id));
    });

    // Pagination
    $(document).on('click.cdFirearmSearch', '#cd-fs-prev', function () {
      if (state.page > 1) doSearch(state.searchQuery, state.page - 1);
    });
    $(document).on('click.cdFirearmSearch', '#cd-fs-next', function () {
      if (state.page < state.totalPages) doSearch(state.searchQuery, state.page + 1);
    });

    // Render initial empty state
    renderResults();
  }

  /* ───────────────────────── Exports ───────────────────────── */

  window.cdFirearmSearchRender = render;
  window.cdFirearmSearchInit = init;

})();
