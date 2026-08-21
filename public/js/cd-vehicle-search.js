/**
 * Command Dashboard — Vehicle Search Component
 *
 * Searches across the entire community's vehicle database by plate.
 * Registers window.cdVehicleSearchRender and window.cdVehicleSearchInit.
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
    expandedId: null
  };

  var searchTimer = null;

  /* ───────────────────────── Helpers ───────────────────────── */

  function cfg() { return window.ddConfig || {}; }
  function apiUrl() { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, type) { if (window.ddToast) window.ddToast(msg, type); }

  /**
   * Vehicle flag helpers. A single local toBool() used to serve all four
   * flags, which inverted isStolen — the legacy numeric encoding is a select
   * index, not a boolean. See /static/js/vehicle-flags.js.
   */
  var Flags = window.VehicleFlags;

  /** Flatten { _id, vehicle: {...} } → merged object */
  function flatten(item) {
    if (!item) return null;
    var v = item.vehicle || item.details || {};
    var out = {};
    var keys = Object.keys(v);
    for (var i = 0; i < keys.length; i++) out[keys[i]] = v[keys[i]];
    out._id = item._id || item.id || v._id || '';
    if (out._id && typeof out._id === 'object' && out._id.$oid) out._id = out._id.$oid;
    return out;
  }

  /* ───────────────────────── CSS Injection ───────────────────────── */

  function injectStyles() {
    if (document.getElementById('cd-vehicle-search-styles')) return;
    var css =
      /* Shared header */
      '.cd-bolo-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-bolo-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-bolo-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-bolo-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +
      /* Search input */
      '.cd-vs-search-wrap{position:relative;margin-bottom:1rem;}' +
      '.cd-vs-search-icon{position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--cd-text-muted);font-size:0.875rem;pointer-events:none;}' +
      '.cd-vs-search-input{width:100%;background:rgba(0,0,0,0.25);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.6rem 2rem 0.6rem 2.25rem;color:var(--cd-text);font-size:0.8125rem;outline:none;transition:border-color 0.2s;box-sizing:border-box;}' +
      '.cd-vs-search-clear{position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--cd-text-dim);font-size:0.75rem;cursor:pointer;padding:0.25rem;display:none;transition:color 0.15s;line-height:1;}' +
      '.cd-vs-search-clear:hover{color:var(--cd-text);}' +
      '.cd-vs-search-input::placeholder{color:var(--cd-text-dim);}' +
      '.cd-vs-search-input:focus{border-color:var(--cd-accent);}' +

      /* Results list */
      '.cd-vs-results{display:flex;flex-direction:column;gap:0.5rem;}' +

      /* Result item */
      '.cd-vs-item{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);cursor:pointer;transition:border-color 0.2s;overflow:hidden;}' +
      '.cd-vs-item:hover{border-color:rgba(255,255,255,0.12);}' +
      '.cd-vs-item.cd-vs-expanded{border-color:var(--cd-accent);}' +

      /* Summary row */
      '.cd-vs-item-summary{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;min-height:2.5rem;}' +
      '.cd-vs-item-summary .cd-vs-icon{color:var(--cd-text-muted);font-size:0.875rem;flex-shrink:0;width:1.25rem;text-align:center;}' +
      '.cd-vs-item-info{flex:1;min-width:0;}' +
      '.cd-vs-item-plate{font-size:0.875rem;font-weight:700;color:var(--cd-text);font-family:monospace;letter-spacing:0.05em;}' +
      '.cd-vs-item-sub{font-size:0.6875rem;color:var(--cd-text-muted);margin-top:0.125rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-vs-badges{display:flex;gap:0.375rem;flex-shrink:0;align-items:center;flex-wrap:wrap;}' +
      '.cd-vs-badge{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:0.125rem 0.5rem;border-radius:99px;white-space:nowrap;}' +
      '.cd-vs-badge-red{background:rgba(239,68,68,0.15);color:var(--cd-red);}' +
      '.cd-vs-badge-amber{background:rgba(245,158,11,0.15);color:var(--cd-amber);}' +
      '.cd-vs-badge-green{background:rgba(34,197,94,0.15);color:var(--cd-green);}' +
      '.cd-vs-expand-icon{color:var(--cd-text-dim);font-size:0.75rem;transition:transform 0.25s;flex-shrink:0;}' +
      '.cd-vs-expanded .cd-vs-expand-icon{transform:rotate(180deg);}' +

      /* Detail panel */
      '.cd-vs-item-detail{max-height:0;overflow:hidden;transition:max-height 0.35s ease;}' +
      '.cd-vs-expanded .cd-vs-item-detail{max-height:5000px;}' +
      '.cd-vs-detail-inner{padding:0.75rem 1rem 1rem;border-top:1px solid var(--cd-glass-border);}' +
      '.cd-vs-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1rem;}' +
      '.cd-vs-detail-field{display:flex;flex-direction:column;gap:0.125rem;}' +
      '.cd-vs-detail-label{font-size:0.625rem;font-weight:500;color:var(--cd-text-dim);text-transform:uppercase;letter-spacing:0.04em;}' +
      '.cd-vs-detail-value{font-size:0.8125rem;color:var(--cd-text);}' +

      /* Pagination */
      '.cd-vs-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.cd-vs-page-btn{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.35rem 0.75rem;color:var(--cd-text);font-size:0.75rem;cursor:pointer;transition:border-color 0.2s,opacity 0.2s;}' +
      '.cd-vs-page-btn:hover:not(:disabled){border-color:var(--cd-accent);}' +
      '.cd-vs-page-btn:disabled{opacity:0.35;cursor:default;}' +
      '.cd-vs-page-info{font-size:0.75rem;color:var(--cd-text-muted);}' +

      /* Empty & loading states */
      '.cd-vs-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1rem;gap:0.5rem;}' +
      '.cd-vs-empty-icon{font-size:1.5rem;color:var(--cd-text-dim);}' +
      '.cd-vs-empty-msg{font-size:0.8125rem;color:var(--cd-text-muted);text-align:center;}' +
      '.cd-vs-loading{display:flex;align-items:center;justify-content:center;padding:2rem;}' +
      '@keyframes cd-vs-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}' +
      '.cd-vs-spinner{width:1.25rem;height:1.25rem;border:2px solid var(--cd-glass-border);border-top-color:var(--cd-accent);border-radius:50%;animation:cd-vs-spin 0.7s linear infinite;}' +

      /* Search history */
      '.cd-vs-history{padding:0.5rem 0.75rem;}' +
      '.cd-vs-history-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--cd-text-dim);}' +
      '.cd-vs-history-header button{background:none;border:none;color:var(--cd-text-dim);font-size:0.625rem;cursor:pointer;padding:0;font-family:inherit;}' +
      '.cd-vs-history-header button:hover{color:var(--cd-red);}' +
      '.cd-vs-history-item{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.625rem;border-radius:var(--cd-radius-sm);cursor:pointer;transition:background 0.15s;}' +
      '.cd-vs-history-item:hover{background:rgba(255,255,255,0.04);}' +
      '.cd-vs-history-item > i{color:var(--cd-text-dim);font-size:0.75rem;flex-shrink:0;}' +
      '.cd-vs-history-query{font-size:0.8125rem;color:var(--cd-text);font-weight:500;}' +
      '.cd-vs-history-label{font-size:0.6875rem;color:var(--cd-text-muted);}' +
      '.cd-vs-history-remove{background:none;border:none;color:var(--cd-text-dim);font-size:0.625rem;cursor:pointer;padding:0.25rem;margin-left:auto;opacity:0;transition:opacity 0.15s;}' +
      '.cd-vs-history-item:hover .cd-vs-history-remove{opacity:1;}' +
      '.cd-vs-history-remove:hover{color:var(--cd-red);}';

    var tag = document.createElement('style');
    tag.id = 'cd-vehicle-search-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ───────────────────────── Render ───────────────────────── */

  function render() {
    return (
      '<div class="cd-vs-card">' +
        '<div class="cd-bolo-header">' +
          '<div class="cd-bolo-header-left">' +
            '<div class="cd-bolo-header-icon" style="background:rgba(34,197,94,0.12);color:var(--cd-green);"><i class="fa fa-car"></i></div>' +
            '<div class="cd-bolo-header-text">' +
              '<h3>Vehicle Search</h3>' +
              '<span>Search plates &amp; vehicles</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cd-vs-search-wrap">' +
          '<i class="fa fa-search cd-vs-search-icon"></i>' +
          '<input type="text" class="cd-vs-search-input" id="cd-vs-input" placeholder="Search by plate, VIN, make, or model..." autocomplete="off" />' +
          '<button class="cd-vs-search-clear" id="cd-vs-clear" type="button"><i class="fa fa-times"></i></button>' +
        '</div>' +
        '<div id="cd-vs-results" class="cd-vs-results"></div>' +
        '<div id="cd-vs-pagination"></div>' +
      '</div>'
    );
  }

  /* ───────────────────────── Build result item HTML ───────────────────────── */

  function buildResultItem(veh) {
    var plate = esc(veh.plate || 'N/A');
    var color = esc(veh.color || '');
    var model = esc(veh.model || '');
    var desc = [color, model].filter(Boolean).join(' ');
    var ownerName = esc(veh._resolvedOwner || veh.registeredOwner || '');
    var isStolen = Flags.stolen(veh);
    var invalidReg = !Flags.registrationValid(veh);
    var invalidIns = !Flags.insuranceValid(veh);
    var isExpanded = state.expandedId === veh._id;

    var sub = [];
    if (desc) sub.push(desc);
    if (ownerName) sub.push('Owner: ' + ownerName);

    var html =
      '<div class="cd-vs-item' + (isExpanded ? ' cd-vs-expanded' : '') + '" data-id="' + esc(veh._id) + '">' +
        '<div class="cd-vs-item-summary">' +
          (veh.image
            ? '<img src="' + esc(veh.image) + '" alt="" onclick="event.stopPropagation();cdVsShowImage(this.src)" style="width:28px;height:28px;border-radius:6px;object-fit:cover;flex-shrink:0;cursor:zoom-in;" />'
            : '<i class="fa fa-car cd-vs-icon"></i>') +
          '<div class="cd-vs-item-info">' +
            '<div class="cd-vs-item-plate">' + plate + '</div>' +
            '<div class="cd-vs-item-sub">' + sub.join(' &middot; ') + '</div>' +
          '</div>' +
          '<div class="cd-vs-badges">' +
            (isStolen ? '<span class="cd-vs-badge cd-vs-badge-red">STOLEN</span>' : '') +
            (invalidReg ? '<span class="cd-vs-badge cd-vs-badge-amber">INVALID REG</span>' : '') +
            (invalidIns ? '<span class="cd-vs-badge cd-vs-badge-amber">INVALID INS</span>' : '') +
          '</div>' +
          '<i class="fa fa-chevron-down cd-vs-expand-icon"></i>' +
        '</div>' +
        '<div class="cd-vs-item-detail">' +
          (isExpanded ? buildDetailHTML(veh) : '') +
        '</div>' +
      '</div>';

    return html;
  }

  /* ───────────────────────── Build detail HTML ───────────────────────── */

  function buildDetailHTML(veh) {
    var isStolen = Flags.stolen(veh);
    return (
      '<div class="cd-vs-detail-inner">' +
        '<div class="cd-vs-detail-grid">' +
          detailField('Plate', veh.plate) +
          detailField('VIN', veh.vin) +
          detailField('Make', veh.make) +
          detailField('Model', veh.model) +
          detailField('Year', veh.year) +
          detailField('Color', veh.color) +
          detailField('Type', veh.type) +
          detailField('Plate State', veh.licensePlateState) +
          '<div class="cd-vs-detail-field"><div class="cd-vs-detail-label">Owner</div><div class="cd-vs-detail-value" id="cd-vs-owner-' + esc(veh._id) + '">' + (veh.registeredOwner ? '<a href="#" onclick="event.preventDefault();event.stopPropagation();cdVsSearchOwner(\'' + esc(veh.registeredOwner.replace(/'/g, "\\'")) + '\')" style="color:var(--cd-accent);text-decoration:none;">' + esc(veh.registeredOwner) + '</a>' : '') + (veh.linkedCivilianID && !veh.registeredOwner ? '<i class="fa fa-circle-notch fa-spin" style="font-size:0.625rem;color:var(--cd-text-dim);"></i>' : (!veh.registeredOwner && !veh.linkedCivilianID ? 'N/A' : '')) + '</div></div>' +
          detailField('Stolen', isStolen ? 'Yes' : 'No', isStolen ? 'var(--cd-red)' : 'var(--cd-green)') +
          detailField('Exempt', Flags.exempt(veh) ? 'Yes' : 'No', Flags.exempt(veh) ? 'var(--cd-accent)' : '') +
          detailField('Registration', Flags.registrationValid(veh) ? 'Valid' : 'Invalid', Flags.registrationValid(veh) ? 'var(--cd-green)' : 'var(--cd-amber)') +
          detailField('Insurance', Flags.insuranceValid(veh) ? 'Valid' : 'Invalid', Flags.insuranceValid(veh) ? 'var(--cd-green)' : 'var(--cd-amber)') +
        '</div>' +
        '<div style="margin-top:0.75rem;padding-top:0.625rem;border-top:1px solid var(--cd-glass-border);">' +
          '<button style="display:inline-flex;align-items:center;gap:0.375rem;padding:0.4rem 0.75rem;border-radius:var(--cd-radius-sm);font-family:Outfit,sans-serif;font-size:0.6875rem;font-weight:600;border:1px solid;cursor:pointer;transition:all 0.15s;' +
            (isStolen ? 'background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.25);color:var(--cd-green);' : 'background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.25);color:var(--cd-red);') +
          '" onclick="cdVsToggleStolen(\'' + esc(veh._id) + '\', ' + !isStolen + ')">' +
            '<i class="fa ' + (isStolen ? 'fa-check' : 'fa-flag') + '"></i> ' +
            (isStolen ? 'Mark as Not Stolen' : 'Report Stolen') +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  window.cdVsSearchOwner = function(name) {
    // Navigate to person search and search for the owner name
    if (window.ddNavTo) window.ddNavTo('personSearch');
    setTimeout(function() {
      var $input = $('#cd-ps-input');
      if ($input.length) {
        $input.val(name).trigger('input');
      }
    }, 200);
  };

  window.cdVsToggleStolen = function(vehicleId, value) {
    $.ajax({
      url: apiUrl() + '/api/v1/vehicle/' + vehicleId,
      method: 'PUT', contentType: 'application/json',
      data: JSON.stringify({ isStolen: value ? 'true' : 'false' }),
      success: function() {
        window.ddToast(value ? 'Reported as stolen' : 'Marked as not stolen', 'success');
        var v = state.results.find(function(r) { return r._id === vehicleId; });
        if (v) v.isStolen = value ? 'true' : 'false';
        renderResults();
      },
      error: function() { window.ddToast('Failed to update', 'error'); }
    });
  };

  function detailField(label, value, color) {
    var style = color ? ' style="color:' + color + ';font-weight:600;"' : '';
    return '<div class="cd-vs-detail-field">' +
      '<div class="cd-vs-detail-label">' + esc(label) + '</div>' +
      '<div class="cd-vs-detail-value"' + style + '>' + esc(value || 'N/A') + '</div>' +
    '</div>';
  }

  /* ───────────────────────── Search History ───────────────────────── */

  var HISTORY_KEY = 'cd-vehicle-search-history';

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
      return '<div class="cd-vs-empty">' +
        '<i class="fa fa-search cd-vs-empty-icon"></i>' +
        '<div class="cd-vs-empty-msg">Enter a plate number to search</div>' +
      '</div>';
    }
    var html = '<div class="cd-vs-history">' +
      '<div class="cd-vs-history-header">' +
        '<span>Recent Searches</span>' +
        '<button onclick="cdClearAllHistory_vehicle()">Clear All</button>' +
      '</div>';
    for (var i = 0; i < history.length; i++) {
      html += '<div class="cd-vs-history-item" onclick="cdClickHistory_vehicle(' + i + ')">' +
        '<i class="fa fa-clock"></i>' +
        '<div>' +
          '<div class="cd-vs-history-query">' + esc(history[i].query) + '</div>' +
          '<div class="cd-vs-history-label">' + esc(history[i].label) + '</div>' +
        '</div>' +
        '<button class="cd-vs-history-remove" onclick="event.stopPropagation(); cdRemoveHistory_vehicle(' + i + ')">' +
          '<i class="fa fa-times"></i>' +
        '</button>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  window.cdClearAllHistory_vehicle = function() {
    localStorage.removeItem(HISTORY_KEY);
    renderResults();
  };

  window.cdRemoveHistory_vehicle = function(index) {
    var history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderResults();
  };

  window.cdClickHistory_vehicle = function(index) {
    var history = getHistory();
    if (!history[index]) return;
    var query = history[index].query;
    $('#cd-vs-input').val(query);
    doSearch(query, 1);
  };

  /* ───────────────────────── Render results list ───────────────────────── */

  function renderResults() {
    var $container = $('#cd-vs-results');
    var $pagination = $('#cd-vs-pagination');

    if (state.loading) {
      $container.html('<div class="cd-vs-loading"><div class="cd-vs-spinner"></div></div>');
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
        '<div class="cd-vs-empty">' +
          '<i class="fa fa-car cd-vs-empty-icon" style="opacity:0.4;"></i>' +
          '<div class="cd-vs-empty-msg">No vehicles found for &ldquo;' + esc(state.searchQuery) + '&rdquo;</div>' +
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
        '<div class="cd-vs-pagination">' +
          '<button class="cd-vs-page-btn" id="cd-vs-prev"' + (state.page <= 1 ? ' disabled' : '') + '><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="cd-vs-page-info">Page ' + state.page + ' of ' + state.totalPages + '</span>' +
          '<button class="cd-vs-page-btn" id="cd-vs-next"' + (state.page >= state.totalPages ? ' disabled' : '') + '>Next <i class="fa fa-chevron-right"></i></button>' +
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

    var q = encodeURIComponent(query);
    var url = apiUrl() + '/api/v1/vehicles/search?plate=' + q +
      '&vin=' + q + '&make=' + q + '&model=' + q +
      '&active_community_id=' + encodeURIComponent(cfg().communityId) +
      '&limit=' + PAGE_SIZE +
      '&page=' + (state.page - 1);

    $.ajax({
      url: url,
      method: 'GET',
      dataType: 'json'
    })
    .done(function (data) {
      var arr = Array.isArray(data) ? data : (data.data || data.vehicles || []);
      state.results = [];
      for (var i = 0; i < arr.length; i++) {
        var f = flatten(arr[i]);
        if (f) state.results.push(f);
      }

      // Determine total for pagination
      if (typeof data.totalCount === 'number') {
        state.totalCount = data.totalCount;
      } else if (typeof data.total === 'number') {
        state.totalCount = data.total;
      } else {
        state.totalCount = state.results.length < PAGE_SIZE
          ? ((state.page - 1) * PAGE_SIZE + state.results.length)
          : (state.page * PAGE_SIZE + 1);
      }
      state.totalPages = Math.max(1, Math.ceil(state.totalCount / PAGE_SIZE));

      // Save to search history if we got results
      if (state.results.length > 0) {
        var label = state.results[0].plate || query;
        saveToHistory(query, label);
      }

      state.loading = false;
      renderResults();
    })
    .fail(function (xhr) {
      state.results = [];
      state.loading = false;
      toast('Vehicle search failed: ' + (xhr.responseJSON && xhr.responseJSON.message || xhr.statusText), 'error');
      renderResults();
    });
  }

  /* ───────────────────────── Toggle expand ───────────────────────── */

  function toggleExpand(vehId) {
    if (state.expandedId === vehId) {
      state.expandedId = null;
    } else {
      state.expandedId = vehId;
    }
    renderResults();
    // Resolve owner name from linkedCivilianID if needed
    if (state.expandedId) {
      var veh = state.results.find(function(r) { return r._id === vehId; });
      if (veh && veh.linkedCivilianID && !veh._resolvedOwner) {
        $.ajax({
          url: apiUrl() + '/api/v1/civilian/' + encodeURIComponent(veh.linkedCivilianID),
          method: 'GET', dataType: 'json'
        }).done(function(data) {
          var civ = data.civilian || data.details || data;
          var name = ((civ.firstName || '') + ' ' + (civ.lastName || '')).trim() || civ.name || '';
          veh._resolvedOwner = name || 'Unknown';
          var $el = $('#cd-vs-owner-' + veh._id);
          if ($el.length) {
            if (name) {
              $el.html('<a href="#" onclick="event.preventDefault();event.stopPropagation();cdVsSearchOwner(\'' + esc(name.replace(/'/g, "\\'")) + '\')" style="color:var(--cd-accent);text-decoration:none;">' + esc(name) + '</a>');
            } else {
              $el.text('Unknown');
            }
          }
        }).fail(function() {
          veh._resolvedOwner = 'Unknown';
          var $el = $('#cd-vs-owner-' + veh._id);
          if ($el.length) $el.text('Unknown');
        });
      }
    }
  }

  /* ───────────────────────── Init ───────────────────────── */

  function init() {
    injectStyles();

    // Remove previous handlers to avoid duplicates (init can be called multiple times)
    $(document).off('.cdVehicleSearch');

    // Show/hide clear button
    $(document).on('input.cdVehicleSearch', '#cd-vs-input', function () {
      $('#cd-vs-clear').toggle($(this).val().length > 0);
    });
    $(document).on('click.cdVehicleSearch', '#cd-vs-clear', function () {
      $('#cd-vs-input').val('').focus();
      $(this).hide();
      doSearch('', 1);
    });

    // Search input debounce
    $(document).on('input.cdVehicleSearch', '#cd-vs-input', function () {
      var val = $(this).val().trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        doSearch(val, 1);
      }, DEBOUNCE_MS);
    });

    // Click to expand/collapse
    $(document).on('click.cdVehicleSearch', '.cd-vs-item-summary', function () {
      var id = $(this).closest('.cd-vs-item').data('id');
      if (id) toggleExpand(String(id));
    });

    // Pagination
    $(document).on('click.cdVehicleSearch', '#cd-vs-prev', function () {
      if (state.page > 1) doSearch(state.searchQuery, state.page - 1);
    });
    $(document).on('click.cdVehicleSearch', '#cd-vs-next', function () {
      if (state.page < state.totalPages) doSearch(state.searchQuery, state.page + 1);
    });

    // Render initial empty state
    renderResults();
  }

  /* ───────────────────────── Exports ───────────────────────── */

  window.cdVehicleSearchRender = render;
  window.cdVehicleSearchInit = init;

  window.cdVsShowImage = function(src) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out;animation:cdVsFadeIn 0.15s ease;';
    overlay.innerHTML = '<img src="' + src + '" style="max-width:90vw;max-height:85vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);object-fit:contain;" />';
    overlay.onclick = function() { overlay.remove(); };
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
    });
    if (!document.getElementById('cdVsFadeStyle')) {
      var s = document.createElement('style');
      s.id = 'cdVsFadeStyle';
      s.textContent = '@keyframes cdVsFadeIn{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(overlay);
  };

})();
