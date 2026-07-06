/**
 * Command Dashboard — Person Search Component
 *
 * Searches across the entire community's civilian database.
 * Registers window.cdPersonSearchRender and window.cdPersonSearchInit.
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
    warrantCache: {},   // { civilianId: [warrants] }
    vehicleCache: {},   // { civilianId: [vehicles] }
    firearmCache: {},   // { civilianId: [firearms] }
    licenseCache: {},   // { civilianId: [licenses] }
    arrestCache: {},    // { civilianId: [arrestReports] }
    detailCache: {}     // { civilianId: fullCivilian }
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

  function calcAge(birthday) {
    if (!birthday) return '';
    var d = new Date(birthday);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age > 0 ? String(age) : '';
  }

  /** Normalize boolean-ish API values. */
  function toBool(val) {
    return val === true || val === 1 || val === '1' || val === 'true';
  }

  /** Flatten { _id, civilian: {...} } → merged object */
  function flatten(item) {
    if (!item) return null;
    var civ = item.civilian || item.details || {};
    var out = {};
    var keys = Object.keys(civ);
    for (var i = 0; i < keys.length; i++) out[keys[i]] = civ[keys[i]];
    out._id = item._id || item.id || civ._id || '';
    if (out._id && typeof out._id === 'object' && out._id.$oid) out._id = out._id.$oid;
    return out;
  }

  /* ───────────────────────── CSS Injection ───────────────────────── */

  function injectStyles() {
    if (document.getElementById('cd-person-search-styles')) return;
    var css =
      /* Shared header (matches BOLO card style) */
      '.cd-bolo-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-bolo-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-bolo-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-bolo-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +
      /* Search input */
      '.cd-ps-search-wrap{position:relative;margin-bottom:1rem;}' +
      '.cd-ps-search-icon{position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--cd-text-muted);font-size:0.875rem;pointer-events:none;}' +
      '.cd-ps-search-input{width:100%;background:rgba(0,0,0,0.25);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.6rem 2rem 0.6rem 2.25rem;color:var(--cd-text);font-size:0.8125rem;outline:none;transition:border-color 0.2s;box-sizing:border-box;}' +
      '.cd-ps-search-clear{position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--cd-text-dim);font-size:0.75rem;cursor:pointer;padding:0.25rem;display:none;transition:color 0.15s;line-height:1;}' +
      '.cd-ps-search-clear:hover{color:var(--cd-text);}' +
      '.cd-ps-search-input::placeholder{color:var(--cd-text-dim);}' +
      '.cd-ps-search-input:focus{border-color:var(--cd-accent);}' +

      /* Results list */
      '.cd-ps-results{display:flex;flex-direction:column;gap:0.5rem;}' +

      /* Result item */
      '.cd-ps-item{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);cursor:pointer;transition:border-color 0.2s;overflow:hidden;}' +
      '.cd-ps-item:hover{border-color:rgba(255,255,255,0.12);}' +
      '.cd-ps-item.cd-ps-expanded{border-color:var(--cd-accent);}' +

      /* Summary row */
      '.cd-ps-item-summary{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;min-height:2.5rem;}' +
      '.cd-ps-item-summary .cd-ps-icon{color:var(--cd-text-muted);font-size:0.875rem;flex-shrink:0;width:1.25rem;text-align:center;}' +
      '.cd-ps-item-info{flex:1;min-width:0;}' +
      '.cd-ps-item-name{font-size:0.8125rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-ps-item-sub{font-size:0.6875rem;color:var(--cd-text-muted);margin-top:0.125rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-ps-badges{display:flex;gap:0.375rem;flex-shrink:0;align-items:center;}' +
      '.cd-ps-badge{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:0.125rem 0.5rem;border-radius:99px;white-space:nowrap;}' +
      '.cd-ps-badge-red{background:rgba(239,68,68,0.15);color:var(--cd-red);}' +
      '.cd-ps-badge-green{background:rgba(34,197,94,0.15);color:var(--cd-green);}' +
      '.cd-ps-badge-amber{background:rgba(245,158,11,0.15);color:var(--cd-amber);}' +
      '.cd-ps-expand-icon{color:var(--cd-text-dim);font-size:0.75rem;transition:transform 0.25s;flex-shrink:0;}' +
      '.cd-ps-expanded .cd-ps-expand-icon{transform:rotate(180deg);}' +

      /* Detail panel */
      '.cd-ps-item-detail{max-height:0;overflow:hidden;transition:max-height 0.4s ease;}' +
      '.cd-ps-expanded .cd-ps-item-detail{max-height:5000px;}' +
      '.cd-ps-detail-inner{padding:0.75rem 1rem 1rem;border-top:1px solid var(--cd-glass-border);}' +
      '.cd-ps-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1rem;}' +
      '.cd-ps-detail-field{display:flex;flex-direction:column;gap:0.125rem;}' +
      '.cd-ps-detail-label{font-size:0.625rem;font-weight:500;color:var(--cd-text-dim);text-transform:uppercase;letter-spacing:0.04em;}' +
      '.cd-ps-detail-value{font-size:0.8125rem;color:var(--cd-text);}' +

      /* Sections inside detail */
      '.cd-ps-detail-section{margin-top:0.75rem;}' +
      '.cd-ps-detail-section-title{font-size:0.6875rem;font-weight:700;color:var(--cd-text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;}' +
      '.cd-ps-detail-list-item{font-size:0.75rem;color:var(--cd-text);padding:0.35rem 0;border-bottom:1px solid var(--cd-glass-border);display:flex;align-items:center;gap:0.375rem;}' +
      '.cd-ps-detail-list-item:last-child{border-bottom:none;}' +
      '.cd-ps-detail-list-item.cd-ps-clickable{cursor:pointer;border-radius:4px;padding:0.35rem 0.375rem;margin:0 -0.375rem;transition:background 0.15s;}' +
      '.cd-ps-detail-list-item.cd-ps-clickable:hover{background:rgba(56,189,248,0.08);}' +

      /* Action buttons */
      '.cd-ps-actions{display:flex;flex-wrap:wrap;gap:0.375rem;margin-bottom:0.75rem;}' +
      '.cd-ps-action-btn{display:inline-flex;align-items:center;gap:0.375rem;padding:0.4rem 0.75rem;border-radius:var(--cd-radius-sm);font-family:Outfit,sans-serif;font-size:0.6875rem;font-weight:600;border:1px solid;cursor:pointer;transition:all 0.15s;}' +
      '.cd-ps-action-primary{background:rgba(59,130,246,0.12);border-color:rgba(59,130,246,0.25);color:var(--cd-blue);}' +
      '.cd-ps-action-primary:hover{background:rgba(59,130,246,0.2);border-color:rgba(59,130,246,0.4);}' +
      '.cd-ps-action-warn{background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.25);color:var(--cd-amber);}' +
      '.cd-ps-action-warn:hover{background:rgba(245,158,11,0.2);border-color:rgba(245,158,11,0.4);}' +
      '.cd-ps-action-danger{background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.25);color:var(--cd-red);}' +
      '.cd-ps-action-danger:hover{background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.4);}' +
      '.cd-ps-action-accent{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.25);color:var(--cd-accent);}' +
      '.cd-ps-action-accent:hover{background:rgba(56,189,248,0.2);border-color:rgba(56,189,248,0.4);}' +
      '.cd-ps-status-row{display:flex;flex-wrap:wrap;gap:0.375rem;margin-bottom:0.625rem;}' +
      '.cd-ps-toggle-row{display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:0.75rem;padding-top:0.625rem;border-top:1px solid var(--cd-glass-border);}' +
      '.cd-ps-toggle-btn{display:inline-flex;align-items:center;gap:0.375rem;padding:0.35rem 0.625rem;border-radius:var(--cd-radius-sm);font-family:Outfit,sans-serif;font-size:0.6875rem;font-weight:500;border:1px solid var(--cd-glass-border);background:var(--cd-glass);color:var(--cd-text-muted);cursor:pointer;transition:all 0.15s;}' +
      '.cd-ps-toggle-btn:hover{background:var(--cd-glass-hover);color:var(--cd-text);}' +

      /* Sub-items (clickable citations, warnings, vehicles) */
      '.cd-ps-sub-item{background:var(--cd-surface);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);margin-bottom:0.375rem;cursor:pointer;transition:border-color 0.15s;overflow:hidden;word-wrap:break-word;overflow-wrap:break-word;}' +
      '.cd-ps-sub-item:hover{border-color:rgba(255,255,255,0.12);}' +
      '.cd-ps-sub-item-header{display:flex;align-items:center;gap:0.5rem;padding:0.625rem 0.875rem;font-size:0.75rem;min-height:2.25rem;}' +
      '.cd-ps-sub-chevron{color:var(--cd-text-dim);font-size:0.625rem;transition:transform 0.2s;flex-shrink:0;margin-left:auto;}' +
      '.cd-ps-sub-item.sub-expanded .cd-ps-sub-chevron{transform:rotate(180deg);}' +
      '.cd-ps-sub-item-detail{max-height:0;overflow:hidden;transition:max-height 0.3s ease;}' +
      '.cd-ps-sub-item.sub-expanded .cd-ps-sub-item-detail{max-height:500px;}' +
      '.cd-ps-sub-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1rem;padding:0.75rem 0.875rem 0.875rem;border-top:1px solid var(--cd-glass-border);}' +
      '.cd-ps-sub-detail-grid .cd-ps-detail-value{word-wrap:break-word;overflow-wrap:break-word;white-space:normal;}' +

      /* Pagination */
      '.cd-ps-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.cd-ps-page-btn{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius-sm);padding:0.35rem 0.75rem;color:var(--cd-text);font-size:0.75rem;cursor:pointer;transition:border-color 0.2s,opacity 0.2s;}' +
      '.cd-ps-page-btn:hover:not(:disabled){border-color:var(--cd-accent);}' +
      '.cd-ps-page-btn:disabled{opacity:0.35;cursor:default;}' +
      '.cd-ps-page-info{font-size:0.75rem;color:var(--cd-text-muted);}' +

      /* Empty & loading states */
      '.cd-ps-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1rem;gap:0.5rem;}' +
      '.cd-ps-empty-icon{font-size:1.5rem;color:var(--cd-text-dim);}' +
      '.cd-ps-empty-msg{font-size:0.8125rem;color:var(--cd-text-muted);text-align:center;}' +
      '.cd-ps-loading{display:flex;align-items:center;justify-content:center;padding:2rem;}' +
      '@keyframes cd-ps-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}' +
      '.cd-ps-spinner{width:1.25rem;height:1.25rem;border:2px solid var(--cd-glass-border);border-top-color:var(--cd-accent);border-radius:50%;animation:cd-ps-spin 0.7s linear infinite;}' +

      /* Search history */
      '.cd-ps-history{padding:0.5rem 0.75rem;}' +
      '.cd-ps-history-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--cd-text-dim);}' +
      '.cd-ps-history-header button{background:none;border:none;color:var(--cd-text-dim);font-size:0.625rem;cursor:pointer;padding:0;font-family:inherit;}' +
      '.cd-ps-history-header button:hover{color:var(--cd-red);}' +
      '.cd-ps-history-item{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.625rem;border-radius:var(--cd-radius-sm);cursor:pointer;transition:background 0.15s;}' +
      '.cd-ps-history-item:hover{background:rgba(255,255,255,0.04);}' +
      '.cd-ps-history-item > i{color:var(--cd-text-dim);font-size:0.75rem;flex-shrink:0;}' +
      '.cd-ps-history-query{font-size:0.8125rem;color:var(--cd-text);font-weight:500;}' +
      '.cd-ps-history-label{font-size:0.6875rem;color:var(--cd-text-muted);}' +
      '.cd-ps-history-remove{background:none;border:none;color:var(--cd-text-dim);font-size:0.625rem;cursor:pointer;padding:0.25rem;margin-left:auto;opacity:0;transition:opacity 0.15s;}' +
      '.cd-ps-history-item:hover .cd-ps-history-remove{opacity:1;}' +
      '.cd-ps-history-remove:hover{color:var(--cd-red);}';

    var tag = document.createElement('style');
    tag.id = 'cd-person-search-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ───────────────────────── Render ───────────────────────── */

  function render() {
    return (
      '<div class="cd-ps-card">' +
        '<div class="cd-bolo-header">' +
          '<div class="cd-bolo-header-left">' +
            '<div class="cd-bolo-header-icon" style="background:rgba(59,130,246,0.12);color:var(--cd-blue);"><i class="fa fa-user-shield"></i></div>' +
            '<div class="cd-bolo-header-text">' +
              '<h3>Person Search</h3>' +
              '<span>Search community database</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cd-ps-search-wrap">' +
          '<i class="fa fa-search cd-ps-search-icon"></i>' +
          '<input type="text" class="cd-ps-search-input" id="cd-ps-input" placeholder="Search by name..." autocomplete="off" />' +
          '<button class="cd-ps-search-clear" id="cd-ps-clear" type="button"><i class="fa fa-times"></i></button>' +
        '</div>' +
        '<div id="cd-ps-results" class="cd-ps-results"></div>' +
        '<div id="cd-ps-pagination"></div>' +
      '</div>'
    );
  }

  /* ───────────────────────── Build result item HTML ───────────────────────── */

  function buildResultItem(person) {
    var name = esc(((person.firstName || '') + ' ' + (person.lastName || '')).trim() || person.name || '');
    var dob = fmtDate(person.birthday);
    var age = calcAge(person.birthday);
    var ageStr = age ? ' (Age ' + esc(age) + ')' : '';
    var gender = esc(person.gender || '');
    var address = esc(person.address || '');
    var sub = [];
    if (dob !== 'N/A') sub.push('DOB: ' + dob + ageStr);
    if (gender) sub.push(gender);
    if (address) sub.push(address.length > 30 ? address.substring(0, 30) + '...' : address);

    var warrants = state.warrantCache[person._id];
    var hasWarrants = warrants && warrants.length > 0;
    var isExpanded = state.expandedId === person._id;

    var html =
      '<div class="cd-ps-item' + (isExpanded ? ' cd-ps-expanded' : '') + '" data-id="' + esc(person._id) + '">' +
        '<div class="cd-ps-item-summary">' +
          (person.image
            ? '<img src="' + esc(person.image) + '" alt="" onclick="event.stopPropagation();cdVsShowImage(this.src)" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;cursor:zoom-in;" />'
            : '<i class="fa fa-user cd-ps-icon"></i>') +
          '<div class="cd-ps-item-info">' +
            '<div class="cd-ps-item-name">' + name + '</div>' +
            '<div class="cd-ps-item-sub">' + sub.join(' &middot; ') + '</div>' +
          '</div>' +
          '<div class="cd-ps-badges">' +
            (hasWarrants ? '<span class="cd-ps-badge cd-ps-badge-red">WARRANTS</span>' : '') +
          '</div>' +
          '<i class="fa fa-chevron-down cd-ps-expand-icon"></i>' +
        '</div>' +
        '<div class="cd-ps-item-detail">' +
          (isExpanded ? buildDetailHTML(person) : '') +
        '</div>' +
      '</div>';

    return html;
  }

  /* ───────────────────────── Build detail HTML ───────────────────────── */

  function buildDetailHTML(person) {
    var warrants = state.warrantCache[person._id] || [];
    var vehicles = state.vehicleCache[person._id] || [];
    var firearms = state.firearmCache[person._id] || [];
    var licenses = state.licenseCache[person._id] || [];
    var arrests = state.arrestCache[person._id] || [];
    var criminalHistory = person.criminalHistory || [];
    var citations = criminalHistory.filter(function(h) { return h.type === 'Citation'; });
    var warnings = criminalHistory.filter(function(h) { return h.type === 'Warning'; });
    var pid = person._id;

    var html =
      '<div class="cd-ps-detail-inner">' +
        // Action buttons row
        '<div class="cd-ps-actions">' +
          '<button class="cd-ps-action-btn cd-ps-action-primary" onclick="cdPsIssueCitation(\'' + pid + '\')"><i class="fa fa-file-lines"></i> Citation</button>' +
          '<button class="cd-ps-action-btn cd-ps-action-warn" onclick="cdPsIssueWarning(\'' + pid + '\')"><i class="fa fa-triangle-exclamation"></i> Warning</button>' +
          '<button class="cd-ps-action-btn cd-ps-action-danger" onclick="cdPsArrest(\'' + pid + '\')"><i class="fa fa-handcuffs"></i> Arrest</button>' +
          '<button class="cd-ps-action-btn cd-ps-action-accent" onclick="cdPsRequestWarrant(\'' + pid + '\')"><i class="fa fa-gavel"></i> Warrant</button>' +
          '<button class="cd-ps-action-btn" style="background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.25);color:#818cf8;" onclick="event.stopPropagation();cdPsViewId(\'' + pid + '\')"><i class="fa fa-id-card"></i> View ID</button>' +
        '</div>' +
        // Status badges
        '<div class="cd-ps-status-row">' +
          (toBool(person.onProbation) ? '<span class="cd-ps-badge cd-ps-badge-amber">ON PROBATION</span>' : '') +
          (toBool(person.onParole) ? '<span class="cd-ps-badge cd-ps-badge-red">ON PAROLE</span>' : '') +
          (warrants.length > 0 ? '<span class="cd-ps-badge cd-ps-badge-red">WARRANTS (' + warrants.length + ')</span>' : '') +
        '</div>' +
        // Detail grid
        '<div class="cd-ps-detail-grid">' +
          detailField('First Name', person.firstName) +
          detailField('Last Name', person.lastName) +
          detailField('Date of Birth', fmtDate(person.birthday)) +
          detailField('Gender', person.gender) +
          detailField('Address', person.address) +
          detailField('Age', calcAge(person.birthday) || 'N/A') +
          detailField('Height', person.height) +
          detailField('Weight', person.weight) +
          detailField('Hair Color', person.hairColor) +
          detailField('Eye Color', person.eyeColor) +
        '</div>' +
        // Toggle buttons
        '<div class="cd-ps-toggle-row">' +
          '<button class="cd-ps-toggle-btn" onclick="cdPsToggleProbation(\'' + pid + '\', ' + !toBool(person.onProbation) + ')">' +
            '<i class="fa ' + (toBool(person.onProbation) ? 'fa-toggle-on' : 'fa-toggle-off') + '"></i> ' +
            (toBool(person.onProbation) ? 'Remove Probation' : 'Set Probation') +
          '</button>' +
          '<button class="cd-ps-toggle-btn" onclick="cdPsToggleParole(\'' + pid + '\', ' + !toBool(person.onParole) + ')">' +
            '<i class="fa ' + (toBool(person.onParole) ? 'fa-toggle-on' : 'fa-toggle-off') + '"></i> ' +
            (toBool(person.onParole) ? 'Remove Parole' : 'Set Parole') +
          '</button>' +
        '</div>';

    // Stats nav bar — clickable pills that scroll to sections
    var statItems = [];
    if (warrants.length > 0) statItems.push({ id: 'sec-warrants-' + pid, icon: 'fa-gavel', label: 'Warrants', count: warrants.length, color: 'var(--cd-red)' });
    if (citations.length > 0) statItems.push({ id: 'sec-citations-' + pid, icon: 'fa-file-lines', label: 'Citations', count: citations.length, color: 'var(--cd-blue)' });
    if (warnings.length > 0) statItems.push({ id: 'sec-warnings-' + pid, icon: 'fa-triangle-exclamation', label: 'Warnings', count: warnings.length, color: 'var(--cd-amber)' });
    if (arrests.length > 0) statItems.push({ id: 'sec-arrests-' + pid, icon: 'fa-handcuffs', label: 'Arrests', count: arrests.length, color: '#f472b6' });
    if (vehicles.length > 0) statItems.push({ id: 'sec-vehicles-' + pid, icon: 'fa-car', label: 'Vehicles', count: vehicles.length, color: 'var(--cd-accent)' });
    if (firearms.length > 0) statItems.push({ id: 'sec-firearms-' + pid, icon: 'fa-crosshairs', label: 'Firearms', count: firearms.length, color: 'var(--cd-red)' });
    if (licenses.length > 0) statItems.push({ id: 'sec-licenses-' + pid, icon: 'fa-id-card', label: 'Licenses', count: licenses.length, color: '#818cf8' });

    if (statItems.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin:0.75rem 0;padding:0.75rem 0;border-top:1px solid var(--cd-glass-border);border-bottom:1px solid var(--cd-glass-border);">';
      for (var si = 0; si < statItems.length; si++) {
        var st = statItems[si];
        html += '<button onclick="event.stopPropagation();document.getElementById(\'' + st.id + '\').scrollIntoView({behavior:\'smooth\',block:\'start\'})" ' +
          'style="display:flex;align-items:center;gap:0.375rem;padding:0.35rem 0.625rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);cursor:pointer;transition:all 0.15s;font-family:Outfit,sans-serif;" ' +
          'onmouseover="this.style.background=\'rgba(255,255,255,0.06)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.03)\'">' +
          '<i class="fa ' + st.icon + '" style="font-size:0.625rem;color:' + st.color + ';"></i>' +
          '<span style="font-size:0.6875rem;color:var(--cd-text-muted);font-weight:500;">' + st.label + '</span>' +
          '<span style="font-size:0.6875rem;font-weight:700;color:var(--cd-text);background:rgba(255,255,255,0.06);padding:0.1rem 0.375rem;border-radius:4px;min-width:18px;text-align:center;">' + st.count + '</span>' +
        '</button>';
      }
      html += '</div>';
    }

    // Warrants section (clickable — opens warrant database filtered by this person)
    if (warrants.length > 0) {
      var searchName = (person.lastName || person.firstName || '').trim();
      html += '<div class="cd-ps-detail-section" id="sec-warrants-' + pid + '">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-gavel"></i> Active Warrants (' + warrants.length + ')</div>';
      for (var i = 0; i < warrants.length; i++) {
        var w = warrants[i].warrant || warrants[i];
        var wType = w.warrantType || w.type || 'arrest';
        var wCharges = Array.isArray(w.charges) ? w.charges.join(', ') : (w.charges || 'No charges');
        html += '<div class="cd-ps-detail-list-item cd-ps-clickable" onclick="event.stopPropagation(); if(window.cdWarrantDbOpenWith) window.cdWarrantDbOpenWith({name:\'' + esc(searchName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")) + '\'})">' +
          '<span class="cd-ps-badge cd-ps-badge-' + (wType === 'arrest' ? 'red' : wType === 'search' ? 'amber' : 'blue') + '" style="font-size:0.5625rem;">' + esc(wType.toUpperCase()) + '</span> ' +
          esc(wCharges) +
          '<i class="fa fa-external-link" style="margin-left:auto;font-size:0.5625rem;opacity:0.4;"></i>' +
        '</div>';
      }
      html += '</div>';
    }

    // Criminal history - Citations (clickable to expand)
    if (citations.length > 0) {
      html += '<div class="cd-ps-detail-section" id="sec-citations-' + pid + '">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-file-lines"></i> Citations (' + citations.length + ')</div>';
      for (var ci = 0; ci < citations.length; ci++) {
        var c = citations[ci];
        var finesList = c.fines || [];
        var finesSummary = finesList.map(function(f) { return f.fineType; }).join(', ') || 'N/A';
        var totalFine = finesList.reduce(function(sum, f) { return sum + (parseFloat(f.fineAmount) || 0); }, 0);
        var cIdx = 'cit-' + pid + '-' + ci;
        html += '<div class="cd-ps-sub-item" onclick="cdPsToggleSub(\'' + cIdx + '\')">' +
          '<div class="cd-ps-sub-item-header">' +
            '<span style="color:var(--cd-text-dim);font-size:0.625rem;min-width:70px;">' + fmtDate(c.createdAt) + '</span>' +
            '<span style="flex:1;font-size:0.75rem;color:var(--cd-text);">' + esc(finesSummary) + '</span>' +
            '<i class="fa fa-chevron-down cd-ps-sub-chevron"></i>' +
          '</div>' +
          '<div class="cd-ps-sub-item-detail" id="' + cIdx + '">' +
            '<div class="cd-ps-sub-detail-grid">' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Date</div><div class="cd-ps-detail-value">' + fmtDate(c.createdAt) + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Type</div><div class="cd-ps-detail-value">Citation</div></div>' +
              (totalFine > 0 ? '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Total Fine</div><div class="cd-ps-detail-value" style="color:var(--cd-amber);font-weight:600;">$' + totalFine.toFixed(2) + '</div></div>' : '') +
              (c.notes ? '<div class="cd-ps-detail-field" style="grid-column:1/-1;"><div class="cd-ps-detail-label">Notes</div><div class="cd-ps-detail-value">' + esc(c.notes) + '</div></div>' : '') +
            '</div>' +
            (finesList.length > 0 ? '<div style="margin-top:0.5rem;padding:0 0.125rem;"><div class="cd-ps-detail-label" style="margin-bottom:0.375rem;">Violations</div>' +
              finesList.map(function(f) {
                return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem;padding:0.375rem 0;font-size:0.6875rem;border-bottom:1px solid var(--cd-glass-border);">' +
                  '<span style="color:var(--cd-text);flex:1;min-width:0;word-wrap:break-word;overflow-wrap:break-word;">' + esc(f.fineType) + '</span>' +
                  (f.fineAmount ? '<span style="color:var(--cd-amber);font-weight:600;white-space:nowrap;flex-shrink:0;">$' + parseFloat(f.fineAmount).toFixed(2) + '</span>' : '') +
                '</div>';
              }).join('') +
            '</div>' : '') +
          '</div>' +
        '</div>';
      }
      html += '</div>';
    }

    // Criminal history - Warnings (clickable to expand)
    if (warnings.length > 0) {
      html += '<div class="cd-ps-detail-section" id="sec-warnings-' + pid + '">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-triangle-exclamation"></i> Warnings (' + warnings.length + ')</div>';
      for (var wi = 0; wi < warnings.length; wi++) {
        var wn = warnings[wi];
        var wIdx = 'warn-' + pid + '-' + wi;
        html += '<div class="cd-ps-sub-item" onclick="cdPsToggleSub(\'' + wIdx + '\')">' +
          '<div class="cd-ps-sub-item-header">' +
            '<span style="color:var(--cd-text-dim);font-size:0.625rem;min-width:70px;">' + fmtDate(wn.createdAt) + '</span>' +
            '<span style="flex:1;font-size:0.75rem;color:var(--cd-text);">' + esc((wn.notes || 'No notes').substring(0, 60)) + '</span>' +
            '<i class="fa fa-chevron-down cd-ps-sub-chevron"></i>' +
          '</div>' +
          '<div class="cd-ps-sub-item-detail" id="' + wIdx + '">' +
            '<div class="cd-ps-sub-detail-grid">' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Date</div><div class="cd-ps-detail-value">' + fmtDate(wn.createdAt) + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Type</div><div class="cd-ps-detail-value">Warning</div></div>' +
              (wn.notes ? '<div class="cd-ps-detail-field" style="grid-column:1/-1;"><div class="cd-ps-detail-label">Notes</div><div class="cd-ps-detail-value">' + esc(wn.notes) + '</div></div>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
    }

    // Arrest reports section
    if (arrests.length > 0) {
      html += '<div class="cd-ps-detail-section" id="sec-arrests-' + pid + '">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-handcuffs"></i> Arrest Reports (' + arrests.length + ')</div>';
      for (var ai = 0; ai < arrests.length; ai++) {
        var ar = arrests[ai].arrestReport || arrests[ai];
        var arDate = ar.arrestDate || '';
        var arCharges = ar.charges || '';
        var arOfficer = (ar.officer && ar.officer.name) || '';
        var arStatus = ar.status || '';

        var arStatusBadge = '';
        if (arStatus === 'contested') arStatusBadge = '<span class="cd-ps-badge cd-ps-badge-amber" style="font-size:0.5rem;">CONTESTED</span>';
        else if (arStatus === 'dismissed') arStatusBadge = '<span class="cd-ps-badge" style="font-size:0.5rem;background:rgba(99,102,241,0.15);color:#818cf8;">DISMISSED</span>';

        html += '<div class="cd-ps-sub-item" onclick="event.stopPropagation();cdPsViewArrestReport(\'' + pid + '\',' + ai + ')" style="cursor:pointer;">' +
          '<div class="cd-ps-sub-item-header" style="gap:0.625rem;">' +
            '<div style="width:32px;height:32px;border-radius:6px;background:rgba(244,114,182,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa fa-handcuffs" style="color:#f472b6;font-size:0.75rem;"></i></div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:0.8125rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(arCharges || 'No charges listed') + '</div>' +
              '<div style="font-size:0.6875rem;color:var(--cd-text-dim);">' + (arDate ? esc(arDate) : '') + (arOfficer ? ' &middot; Officer: ' + esc(arOfficer) : '') + '</div>' +
            '</div>' +
            arStatusBadge +
            '<i class="fa fa-arrow-up-right-from-square" style="font-size:0.625rem;color:var(--cd-text-dim);flex-shrink:0;"></i>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
    } else if (state.expandedId === person._id) {
      html += '<div class="cd-ps-detail-section">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-handcuffs"></i> Arrest Reports</div>' +
        '<div class="cd-ps-detail-list-item" style="color:var(--cd-text-dim);">No arrest reports found</div>' +
      '</div>';
    }

    // Vehicles section
    if (vehicles.length > 0) {
      html += '<div class="cd-ps-detail-section" id="sec-vehicles-' + pid + '">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-car"></i> Registered Vehicles (' + vehicles.length + ')</div>';
      for (var j = 0; j < vehicles.length; j++) {
        var v = vehicles[j].vehicle || vehicles[j];
        var plate = v.plate || 'N/A';
        var vMakeModel = [v.year, v.make, v.model].filter(Boolean).join(' ');
        var vIdx = 'veh-' + pid + '-' + j;
        var vRegOk = toBool(v.validRegistration);
        var vInsOk = toBool(v.validInsurance);
        var vStolen = toBool(v.isStolen);
        html += '<div class="cd-ps-sub-item" onclick="cdPsToggleSub(\'' + vIdx + '\')">' +
          '<div class="cd-ps-sub-item-header" style="gap:0.625rem;">' +
            (v.image
              ? '<img src="' + esc(v.image) + '" alt="" onclick="event.stopPropagation();cdVsShowImage(this.src)" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;cursor:zoom-in;" />'
              : '<div style="width:32px;height:32px;border-radius:6px;background:rgba(56,189,248,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa fa-car" style="color:var(--cd-text-dim);font-size:0.75rem;"></i></div>') +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:0.8125rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(vMakeModel || 'Unknown Vehicle') + (v.color ? '<span style="color:var(--cd-text-muted);font-weight:400;"> &middot; ' + esc(v.color) + '</span>' : '') + '</div>' +
              '<div style="font-size:0.6875rem;color:var(--cd-text-dim);font-family:\'JetBrains Mono\',monospace;letter-spacing:0.03em;">' + esc(plate) + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:0.25rem;flex-shrink:0;">' +
              (vStolen ? '<span class="cd-ps-badge cd-ps-badge-red" style="font-size:0.5625rem;">STOLEN</span>' : '') +
              (!vRegOk ? '<span class="cd-ps-badge cd-ps-badge-amber" style="font-size:0.5rem;">REG</span>' : '') +
              (!vInsOk ? '<span class="cd-ps-badge cd-ps-badge-amber" style="font-size:0.5rem;">INS</span>' : '') +
            '</div>' +
            '<i class="fa fa-chevron-down cd-ps-sub-chevron"></i>' +
          '</div>' +
          '<div class="cd-ps-sub-item-detail" id="' + vIdx + '">' +
            '<div class="cd-ps-sub-detail-grid">' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Plate</div><div class="cd-ps-detail-value" style="font-family:\'JetBrains Mono\',monospace;">' + esc(v.plate) + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">VIN</div><div class="cd-ps-detail-value" style="font-family:\'JetBrains Mono\',monospace;">' + esc(v.vin || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Make</div><div class="cd-ps-detail-value">' + esc(v.make || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Model</div><div class="cd-ps-detail-value">' + esc(v.model || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Year</div><div class="cd-ps-detail-value">' + esc(v.year || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Color</div><div class="cd-ps-detail-value">' + esc(v.color || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Plate State</div><div class="cd-ps-detail-value">' + esc(v.licensePlateState || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Owner</div><div class="cd-ps-detail-value">' + esc(v.registeredOwner || name || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Registration</div><div class="cd-ps-detail-value" style="color:' + (vRegOk ? 'var(--cd-green)' : 'var(--cd-amber)') + ';font-weight:600;">' + (vRegOk ? 'Valid' : 'Invalid') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Insurance</div><div class="cd-ps-detail-value" style="color:' + (vInsOk ? 'var(--cd-green)' : 'var(--cd-amber)') + ';font-weight:600;">' + (vInsOk ? 'Valid' : 'Invalid') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Stolen</div><div class="cd-ps-detail-value" style="color:' + (vStolen ? 'var(--cd-red)' : 'var(--cd-green)') + ';font-weight:600;">' + (vStolen ? 'Yes' : 'No') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Exempt</div><div class="cd-ps-detail-value" style="' + (toBool(v.isExempt) ? 'color:var(--cd-accent);font-weight:600;' : '') + '">' + (toBool(v.isExempt) ? 'Yes' : 'No') + '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
    } else if (state.expandedId === person._id) {
      html += '<div class="cd-ps-detail-section">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-car"></i> Registered Vehicles</div>' +
        '<div class="cd-ps-detail-list-item" style="color:var(--cd-text-dim);">No vehicles found</div>' +
      '</div>';
    }

    // Firearms section
    var firearms = state.firearmCache[person._id] || [];
    if (firearms.length > 0) {
      html += '<div class="cd-ps-detail-section" id="sec-firearms-' + pid + '">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-crosshairs"></i> Registered Firearms (' + firearms.length + ')</div>';
      for (var fi = 0; fi < firearms.length; fi++) {
        var fa = firearms[fi].firearm || firearms[fi];
        var faSerial = fa.serialNumber || 'N/A';
        var faName = fa.name || '';
        var faType = fa.weaponType || '';
        var faCaliber = fa.caliber || '';
        var faStolen = toBool(fa.isStolen);
        var faIdx = 'fa-' + pid + '-' + fi;
        var faDesc = [faType, faCaliber].filter(Boolean).join(' &middot; ');
        html += '<div class="cd-ps-sub-item" onclick="cdPsToggleSub(\'' + faIdx + '\')">' +
          '<div class="cd-ps-sub-item-header" style="gap:0.625rem;">' +
            (fa.image
              ? '<img src="' + esc(fa.image) + '" alt="" onclick="event.stopPropagation();cdVsShowImage(this.src)" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;cursor:zoom-in;" />'
              : '<div style="width:32px;height:32px;border-radius:6px;background:rgba(239,68,68,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa fa-crosshairs" style="color:var(--cd-text-dim);font-size:0.75rem;"></i></div>') +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:0.8125rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(faName || 'Unknown Firearm') + '</div>' +
              '<div style="font-size:0.6875rem;color:var(--cd-text-dim);">' + (faDesc || 'S/N: ' + esc(faSerial)) + '</div>' +
            '</div>' +
            (faStolen ? '<span class="cd-ps-badge cd-ps-badge-red" style="font-size:0.5625rem;">STOLEN</span>' : '') +
            '<i class="fa fa-chevron-down cd-ps-sub-chevron"></i>' +
          '</div>' +
          '<div class="cd-ps-sub-item-detail" id="' + faIdx + '">' +
            '<div class="cd-ps-sub-detail-grid">' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Serial Number</div><div class="cd-ps-detail-value" style="font-family:\'JetBrains Mono\',monospace;">' + esc(faSerial) + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Name</div><div class="cd-ps-detail-value">' + esc(faName || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Type</div><div class="cd-ps-detail-value">' + esc(faType || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Caliber</div><div class="cd-ps-detail-value">' + esc(faCaliber || 'N/A') + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Stolen</div><div class="cd-ps-detail-value" style="color:' + (faStolen ? 'var(--cd-red)' : 'var(--cd-green)') + ';font-weight:600;">' + (faStolen ? 'Yes' : 'No') + '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
    } else if (state.expandedId === person._id) {
      html += '<div class="cd-ps-detail-section">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-crosshairs"></i> Registered Firearms</div>' +
        '<div class="cd-ps-detail-list-item" style="color:var(--cd-text-dim);">No firearms found</div>' +
      '</div>';
    }

    // Licenses section
    var licenses = state.licenseCache[person._id] || [];
    if (licenses.length > 0) {
      html += '<div class="cd-ps-detail-section" id="sec-licenses-' + pid + '">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-id-card"></i> Licenses (' + licenses.length + ')</div>';
      for (var li = 0; li < licenses.length; li++) {
        var lic = licenses[li].license || licenses[li];
        var licId = licenses[li]._id || lic._id || ('lic' + li);
        var licType = lic.type || lic.licenseType || 'License';
        var licStatus = (lic.status || 'Valid');
        var licStatusLower = licStatus.toLowerCase();
        var licExp = fmtDate(lic.expirationDate);
        var licNotes = lic.notes || '';
        var isExpired = false;
        if (lic.expirationDate) {
          var expDate = new Date(lic.expirationDate);
          isExpired = !isNaN(expDate.getTime()) && expDate < new Date();
        }

        var statusColor = 'var(--cd-green)';
        if (licStatusLower === 'suspended') statusColor = 'var(--cd-amber)';
        else if (licStatusLower === 'revoked') statusColor = 'var(--cd-red)';

        var licIdx = 'lic-' + pid + '-' + li;
        html += '<div class="cd-ps-sub-item" onclick="cdPsToggleSub(\'' + licIdx + '\')">' +
          '<div class="cd-ps-sub-item-header" style="gap:0.625rem;">' +
            '<div style="width:32px;height:32px;border-radius:6px;background:rgba(99,102,241,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa fa-id-card" style="color:var(--cd-text-dim);font-size:0.75rem;"></i></div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:0.8125rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(licType) + '</div>' +
              '<div style="font-size:0.6875rem;color:var(--cd-text-dim);">' + (licExp !== 'N/A' ? 'Expires: ' + licExp : '') + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:0.25rem;flex-shrink:0;align-items:center;">' +
              '<span style="font-size:0.6875rem;font-weight:600;color:' + statusColor + ';">' + esc(licStatus) + '</span>' +
              (isExpired ? '<span class="cd-ps-badge cd-ps-badge-amber" style="font-size:0.5rem;">EXPIRED</span>' : '') +
            '</div>' +
            '<i class="fa fa-chevron-down cd-ps-sub-chevron"></i>' +
          '</div>' +
          '<div class="cd-ps-sub-item-detail" id="' + licIdx + '">' +
            '<div class="cd-ps-sub-detail-grid">' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Type</div><div class="cd-ps-detail-value">' + esc(licType) + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Status</div><div class="cd-ps-detail-value" style="color:' + statusColor + ';font-weight:600;">' + esc(licStatus) + '</div></div>' +
              '<div class="cd-ps-detail-field"><div class="cd-ps-detail-label">Expiration</div><div class="cd-ps-detail-value">' + esc(licExp) + '</div></div>' +
              (licNotes ? '<div class="cd-ps-detail-field" style="grid-column:1/-1;"><div class="cd-ps-detail-label">Notes</div><div class="cd-ps-detail-value">' + esc(licNotes) + '</div></div>' : '') +
            '</div>' +
            '<div style="display:flex;gap:0.375rem;padding:0.625rem 0.875rem 0.75rem;border-top:1px solid var(--cd-glass-border);">' +
              (licStatusLower !== 'suspended'
                ? '<button class="cd-ps-action-btn cd-ps-action-warn" onclick="event.stopPropagation();cdPsLicenseAction(\'' + esc(licId) + '\',\'suspend\')"><i class="fa fa-pause"></i> Suspend</button>'
                : '') +
              (licStatusLower !== 'revoked'
                ? '<button class="cd-ps-action-btn cd-ps-action-danger" onclick="event.stopPropagation();cdPsLicenseAction(\'' + esc(licId) + '\',\'revoke\')"><i class="fa fa-ban"></i> Revoke</button>'
                : '') +
              (licStatusLower === 'suspended' || licStatusLower === 'revoked'
                ? '<button class="cd-ps-action-btn cd-ps-action-accent" onclick="event.stopPropagation();cdPsLicenseAction(\'' + esc(licId) + '\',\'reinstate\')"><i class="fa fa-check"></i> Reinstate</button>'
                : '') +
            '</div>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
    } else if (state.expandedId === person._id) {
      html += '<div class="cd-ps-detail-section">' +
        '<div class="cd-ps-detail-section-title"><i class="fa fa-id-card"></i> Licenses</div>' +
        '<div class="cd-ps-detail-list-item" style="color:var(--cd-text-dim);">No licenses found</div>' +
      '</div>';
    }

    html += '</div>';
    return html;
  }

  // ── Officer Actions ──

  // ── Officer Actions (delegate to cd-action-forms.js slide-in panels) ──

  window.cdPsIssueCitation = function(civId) {
    var person = state.results.find(function(r) { return r._id === civId; });
    if (!person) return;
    var name = ((person.firstName || '') + ' ' + (person.lastName || '')).trim() || person.name || '';
    if (window.cdShowCitationForm) {
      window.cdShowCitationForm(civId, name, function() { doSearch(state.searchQuery, state.page); });
    } else {
      window.ddToast('Citation form not available', 'error');
    }
  };

  window.cdPsIssueWarning = function(civId) {
    var person = state.results.find(function(r) { return r._id === civId; });
    if (!person) return;
    var name = ((person.firstName || '') + ' ' + (person.lastName || '')).trim() || person.name || '';
    if (window.cdShowWarningForm) {
      window.cdShowWarningForm(civId, name, function() { doSearch(state.searchQuery, state.page); });
    } else {
      window.ddToast('Warning form not available', 'error');
    }
  };

  window.cdPsArrest = function(civId) {
    var person = state.results.find(function(r) { return r._id === civId; });
    if (!person) return;
    var name = ((person.firstName || '') + ' ' + (person.lastName || '')).trim() || person.name || '';
    if (window.cdShowArrestForm) {
      window.cdShowArrestForm(civId, name, person, function() {
        // Arrests live in arrest-report collection (not on the civilian doc),
        // so doSearch alone won't pick up the new entry — fetchArrests
        // short-circuits on its cache. Invalidate, refetch fresh, then re-search.
        delete state.arrestCache[civId];
        fetchArrests(civId, function () {
          doSearch(state.searchQuery, state.page);
        });
      });
    } else {
      window.ddToast('Arrest form not available', 'error');
    }
  };

  window.cdPsRequestWarrant = function(civId) {
    var person = state.results.find(function(r) { return r._id === civId; });
    if (!person) return;
    var name = ((person.firstName || '') + ' ' + (person.lastName || '')).trim() || person.name || '';
    if (window.cdShowWarrantForm) {
      window.cdShowWarrantForm(civId, name, person);
    } else {
      window.ddToast('Warrant form not available', 'error');
    }
  };

  window.cdPsToggleProbation = function(civId, value) {
    $.ajax({
      url: apiUrl() + '/api/v1/civilian/' + civId,
      method: 'PUT', contentType: 'application/json',
      data: JSON.stringify({ onProbation: value }),
      success: function() {
        window.ddToast(value ? 'Probation set' : 'Probation removed', 'success');
        // Update local state
        var p = state.results.find(function(r) { return r._id === civId; });
        if (p) p.onProbation = value;
        renderResults();
      },
      error: function() { window.ddToast('Failed to update', 'error'); }
    });
  };

  window.cdPsToggleParole = function(civId, value) {
    $.ajax({
      url: apiUrl() + '/api/v1/civilian/' + civId,
      method: 'PUT', contentType: 'application/json',
      data: JSON.stringify({ onParole: value }),
      success: function() {
        window.ddToast(value ? 'Parole set' : 'Parole removed', 'success');
        var p = state.results.find(function(r) { return r._id === civId; });
        if (p) p.onParole = value;
        renderResults();
      },
      error: function() { window.ddToast('Failed to update', 'error'); }
    });
  };

  // Toggle sub-item expand (citations, warnings, vehicles)
  window.cdPsToggleSub = function(id) {
    var $el = $('#' + id).closest('.cd-ps-sub-item');
    $el.toggleClass('sub-expanded');
    // Stop propagation so the parent item doesn't collapse
    event && event.stopPropagation && event.stopPropagation();
  };

  // ── View ID Card ──

  function cdPsGenLicNum(name, birthday, weight) {
    var seed = '' + name + birthday + weight;
    var hash = 0;
    for (var i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash)).substring(0, 8).padStart(8, '0');
  }

  function cdPsGenBarcode(licNum) {
    function sr(s) { var x = Math.sin(s) * 10000; return x - Math.floor(x); }
    var seed = parseInt(licNum, 36) || 12345;
    var html = '';
    for (var i = 0; i < 45; i++) {
      var w = 1 + Math.floor(sr(seed + i) * 3);
      var isBar = (Math.floor(sr(seed * (i + 3)) * 7) % 2) === 0;
      html += '<div style="display:inline-block;width:' + w + 'px;height:18px;background:' + (isBar ? '#c8d6e5' : 'transparent') + ';margin-right:0.5px;border-radius:0.5px;"></div>';
    }
    return html;
  }

  function cdPsFmtHeight(h, cls) {
    if (!h || h <= 0) return 'N/A';
    if (cls === 'Imperial') return Math.floor(h / 12) + "' " + (h % 12) + '"';
    return h + ' cm';
  }

  window.cdPsViewId = function(civId) {
    var person = state.results.find(function(r) { return r._id === civId; });
    if (!person) return;

    var name = ((person.firstName || '') + ' ' + (person.lastName || '')).trim() || person.name || 'Unknown';
    var dob = person.birthday || 'N/A';
    var licNum = cdPsGenLicNum(name, dob, person.weight || '');
    var expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 8);
    var expStr = expDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    var height = cdPsFmtHeight(person.height, person.heightClassification);
    var gender = person.gender || 'N/A';
    var address = person.address || 'N/A';
    var eyeColor = person.eyeColor || 'N/A';
    var imgUrl = person.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=1e293b&color=94a3b8&size=256';

    var overlay = document.createElement('div');
    overlay.id = 'cd-ps-id-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;animation:cdVsFadeIn 0.15s ease;';

    var cardHtml =
      '<div id="cd-ps-id-card" style="width:420px;max-width:92vw;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06) inset;font-family:\'Outfit\',sans-serif;">' +
        // Header band
        '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="width:28px;height:28px;border-radius:6px;background:rgba(56,189,248,0.15);display:flex;align-items:center;justify-content:center;"><i class="fa fa-shield" style="color:#38bdf8;font-size:0.75rem;"></i></div>' +
            '<div style="font-size:0.625rem;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;font-weight:600;">Identification Card</div>' +
          '</div>' +
          '<div style="font-size:0.625rem;color:#475569;font-family:\'JetBrains Mono\',monospace;">ID-' + esc(licNum) + '</div>' +
        '</div>' +
        // Body
        '<div style="background:linear-gradient(165deg,#1e293b 0%,#0f172a 100%);padding:20px;">' +
          '<div style="display:flex;gap:16px;">' +
            // Photo
            '<div style="flex-shrink:0;">' +
              '<img src="' + esc(imgUrl) + '" style="width:96px;height:112px;border-radius:10px;object-fit:cover;border:2px solid rgba(56,189,248,0.2);display:block;" crossorigin="anonymous" />' +
              '<div style="margin-top:8px;text-align:center;">' + cdPsGenBarcode(licNum) + '</div>' +
            '</div>' +
            // Info
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:1.125rem;font-weight:700;color:#f1f5f9;letter-spacing:0.01em;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(name.toUpperCase()) + '</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin-top:10px;">' +
                '<div><div style="font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.08em;color:#475569;font-weight:600;">Date of Birth</div><div style="font-size:0.8125rem;color:#cbd5e1;font-weight:500;margin-top:1px;">' + esc(dob) + '</div></div>' +
                '<div><div style="font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.08em;color:#475569;font-weight:600;">Gender</div><div style="font-size:0.8125rem;color:#cbd5e1;font-weight:500;margin-top:1px;">' + esc(gender) + '</div></div>' +
                '<div><div style="font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.08em;color:#475569;font-weight:600;">Height</div><div style="font-size:0.8125rem;color:#cbd5e1;font-weight:500;margin-top:1px;">' + esc(height) + '</div></div>' +
                '<div><div style="font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.08em;color:#475569;font-weight:600;">Eye Color</div><div style="font-size:0.8125rem;color:#cbd5e1;font-weight:500;margin-top:1px;">' + esc(eyeColor) + '</div></div>' +
              '</div>' +
              '<div style="margin-top:10px;"><div style="font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.08em;color:#475569;font-weight:600;">Address</div><div style="font-size:0.8125rem;color:#cbd5e1;font-weight:500;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(address) + '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        // Footer
        '<div style="background:#0f172a;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.04);">' +
          '<div style="font-size:0.5625rem;color:#475569;">EXP: ' + esc(expStr) + '</div>' +
          '<div style="font-size:0.5625rem;color:#334155;font-family:\'JetBrains Mono\',monospace;">LPC-' + esc(licNum.substring(0,4)) + '</div>' +
        '</div>' +
      '</div>';

    var buttonsHtml =
      '<div style="display:flex;gap:0.5rem;">' +
        '<button id="cd-ps-id-download" style="background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.25);color:#38bdf8;border-radius:8px;padding:8px 16px;font-size:0.8125rem;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;display:flex;align-items:center;gap:6px;"><i class="fa fa-download"></i> Download ID</button>' +
        '<button id="cd-ps-id-close" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#94a3b8;border-radius:8px;padding:8px 16px;font-size:0.8125rem;font-weight:500;cursor:pointer;font-family:Outfit,sans-serif;">Close</button>' +
      '</div>';

    overlay.innerHTML = cardHtml + buttonsHtml;
    document.body.appendChild(overlay);

    document.getElementById('cd-ps-id-close').onclick = function() { overlay.remove(); };
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
    });

    document.getElementById('cd-ps-id-download').onclick = function() {
      var card = document.getElementById('cd-ps-id-card');
      if (!card) return;
      if (typeof html2canvas === 'undefined') {
        // Load html2canvas dynamically
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = function() { doCapture(card, name); };
        document.head.appendChild(s);
      } else {
        doCapture(card, name);
      }
    };

    function doCapture(el, civName) {
      html2canvas(el, { backgroundColor: '#0f172a', scale: 2, useCORS: true, allowTaint: false, logging: false })
      .then(function(canvas) {
        var a = document.createElement('a');
        a.download = civName.replace(/\s+/g, '_') + '_ID.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
      })
      .catch(function() { window.ddToast('Failed to download ID', 'error'); });
    }
  };

  function detailField(label, value) {
    return '<div class="cd-ps-detail-field">' +
      '<div class="cd-ps-detail-label">' + esc(label) + '</div>' +
      '<div class="cd-ps-detail-value">' + esc(value || 'N/A') + '</div>' +
    '</div>';
  }

  /* ───────────────────────── Search History ───────────────────────── */

  var HISTORY_KEY = 'cd-person-search-history';

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
      return '<div class="cd-ps-empty">' +
        '<i class="fa fa-search cd-ps-empty-icon"></i>' +
        '<div class="cd-ps-empty-msg">Enter a name to search the community database</div>' +
      '</div>';
    }
    var html = '<div class="cd-ps-history">' +
      '<div class="cd-ps-history-header">' +
        '<span>Recent Searches</span>' +
        '<button onclick="cdClearAllHistory_person()">Clear All</button>' +
      '</div>';
    for (var i = 0; i < history.length; i++) {
      html += '<div class="cd-ps-history-item" onclick="cdClickHistory_person(' + i + ')">' +
        '<i class="fa fa-clock"></i>' +
        '<div>' +
          '<div class="cd-ps-history-query">' + esc(history[i].query) + '</div>' +
          '<div class="cd-ps-history-label">' + esc(history[i].label) + '</div>' +
        '</div>' +
        '<button class="cd-ps-history-remove" onclick="event.stopPropagation(); cdRemoveHistory_person(' + i + ')">' +
          '<i class="fa fa-times"></i>' +
        '</button>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  window.cdClearAllHistory_person = function() {
    localStorage.removeItem(HISTORY_KEY);
    renderResults();
  };

  window.cdRemoveHistory_person = function(index) {
    var history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderResults();
  };

  window.cdClickHistory_person = function(index) {
    var history = getHistory();
    if (!history[index]) return;
    var query = history[index].query;
    $('#cd-ps-input').val(query);
    doSearch(query, 1);
  };

  /* ───────────────────────── Render results list ───────────────────────── */

  function renderResults() {
    var $container = $('#cd-ps-results');
    var $pagination = $('#cd-ps-pagination');

    if (state.loading) {
      $container.html('<div class="cd-ps-loading"><div class="cd-ps-spinner"></div></div>');
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
        '<div class="cd-ps-empty">' +
          '<i class="fa fa-user-times cd-ps-empty-icon"></i>' +
          '<div class="cd-ps-empty-msg">No results found for &ldquo;' + esc(state.searchQuery) + '&rdquo;</div>' +
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
        '<div class="cd-ps-pagination">' +
          '<button class="cd-ps-page-btn" id="cd-ps-prev"' + (state.page <= 1 ? ' disabled' : '') + '><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="cd-ps-page-info">Page ' + state.page + ' of ' + state.totalPages + '</span>' +
          '<button class="cd-ps-page-btn" id="cd-ps-next"' + (state.page >= state.totalPages ? ' disabled' : '') + '>Next <i class="fa fa-chevron-right"></i></button>' +
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

    var url = apiUrl() + '/api/v1/civilians/search?name=' + encodeURIComponent(query) +
      '&active_community_id=' + encodeURIComponent(cfg().communityId) +
      '&limit=' + PAGE_SIZE +
      '&page=' + (state.page - 1);

    $.ajax({
      url: url,
      method: 'GET',
      dataType: 'json'
    })
    .done(function (data) {
      var arr = Array.isArray(data) ? data : (data.data || data.civilians || []);
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
        // If no total provided, estimate based on whether we got a full page
        state.totalCount = state.results.length < PAGE_SIZE
          ? ((state.page - 1) * PAGE_SIZE + state.results.length)
          : (state.page * PAGE_SIZE + 1);
      }
      state.totalPages = Math.max(1, Math.ceil(state.totalCount / PAGE_SIZE));

      // Save to search history if we got results
      if (state.results.length > 0) {
        var first = state.results[0];
        var label = ((first.firstName || '') + ' ' + (first.lastName || '')).trim() || first.name || '';
        saveToHistory(query, label);
      }

      // Fetch warrants for each result
      fetchWarrantsForResults();
    })
    .fail(function (xhr) {
      state.results = [];
      state.loading = false;
      toast('Search failed: ' + (xhr.responseJSON && xhr.responseJSON.message || xhr.statusText), 'error');
      renderResults();
    });
  }

  /* ───────────────────────── API: Fetch warrants for results ───────────────────────── */

  function fetchWarrantsForResults() {
    var pending = 0;
    var ids = [];

    for (var i = 0; i < state.results.length; i++) {
      var id = state.results[i]._id;
      if (id && !state.warrantCache.hasOwnProperty(id)) {
        ids.push(id);
      }
    }

    if (ids.length === 0) {
      state.loading = false;
      renderResults();
      return;
    }

    pending = ids.length;

    for (var j = 0; j < ids.length; j++) {
      (function (civId) {
        $.ajax({
          url: apiUrl() + '/api/v1/warrants/user/' + encodeURIComponent(civId) + '?limit=50',
          method: 'GET',
          dataType: 'json'
        })
        .done(function (data) {
          var warrants = Array.isArray(data) ? data : (data.warrants || data.data || []);
          // Only keep active warrants (approved by judicial) and pending ones
          var active = [];
          for (var k = 0; k < warrants.length; k++) {
            var w = warrants[k].warrant || warrants[k];
            var status = (w.status || '').toLowerCase();
            if (status === 'approved' || status === 'pending') {
              active.push(warrants[k]);
            }
          }
          state.warrantCache[civId] = active;
        })
        .fail(function () {
          state.warrantCache[civId] = [];
        })
        .always(function () {
          pending--;
          if (pending <= 0) {
            state.loading = false;
            renderResults();
            // Audible warrant alert (opt-in via CAD Alert Sounds): sound once
            // if any person in the CURRENT results has an active warrant. Scope
            // to state.results (not the whole warrantCache) — the cache
            // accumulates every civilian searched this session, so scanning it
            // would fire the tone on a later clean search and repeat it while
            // paginating. state.results is replaced per page, so this reflects
            // only what's on screen now.
            var anyWarrants = false;
            for (var r = 0; r < state.results.length; r++) {
              var rid = state.results[r] && state.results[r]._id;
              if (rid && state.warrantCache[rid] && state.warrantCache[rid].length > 0) {
                anyWarrants = true;
                break;
              }
            }
            if (anyWarrants && window.AlertSounds) AlertSounds.playAlert('warrantAlert');
          }
        });
      })(ids[j]);
    }
  }

  /* ───────────────────────── API: Fetch vehicles for expanded detail ───────────────────────── */

  function fetchVehicles(civId, callback) {
    if (state.vehicleCache.hasOwnProperty(civId)) {
      callback();
      return;
    }

    var PAGE_LIMIT = 25;
    var allVehicles = [];

    function fetchPage(page) {
      $.ajax({
        url: apiUrl() + '/api/v1/vehicles/registered-owner/' + encodeURIComponent(civId) +
          '?limit=' + PAGE_LIMIT + '&page=' + page,
        method: 'GET',
        dataType: 'json'
      })
      .done(function (data) {
        var arr = data.vehicles || data.data || [];
        allVehicles = allVehicles.concat(arr);
        var total = data.total || 0;
        var fetched = (page + 1) * PAGE_LIMIT;
        if (fetched < total) {
          fetchPage(page + 1);
        } else {
          state.vehicleCache[civId] = allVehicles;
          callback();
        }
      })
      .fail(function () {
        state.vehicleCache[civId] = allVehicles;
        callback();
      });
    }

    fetchPage(0);
  }

  /* ───────────────────────── API: Fetch firearms for expanded detail ───────────────────────── */

  function fetchFirearms(civId, callback) {
    if (state.firearmCache.hasOwnProperty(civId)) {
      callback();
      return;
    }

    var PAGE_LIMIT = 25;
    var allFirearms = [];

    function fetchPage(page) {
      $.ajax({
        url: apiUrl() + '/api/v1/firearms/registered-owner/' + encodeURIComponent(civId) +
          '?limit=' + PAGE_LIMIT + '&page=' + page,
        method: 'GET',
        dataType: 'json'
      })
      .done(function (data) {
        var arr = data.firearms || data.data || [];
        if (Array.isArray(data) && !data.firearms) arr = data;
        allFirearms = allFirearms.concat(arr);
        var total = data.total || data.totalCount || 0;
        var fetched = (page + 1) * PAGE_LIMIT;
        if (total > 0 && fetched < total) {
          fetchPage(page + 1);
        } else {
          state.firearmCache[civId] = allFirearms;
          callback();
        }
      })
      .fail(function () {
        state.firearmCache[civId] = allFirearms;
        callback();
      });
    }

    fetchPage(0);
  }

  /* ───────────────────────── API: Fetch arrest reports for expanded detail ───────────────────────── */

  function fetchArrests(civId, callback) {
    if (state.arrestCache.hasOwnProperty(civId)) {
      callback();
      return;
    }

    var PAGE_LIMIT = 25;
    var allArrests = [];

    function fetchPage(page) {
      $.ajax({
        url: apiUrl() + '/api/v1/arrest-report/arrestee/' + encodeURIComponent(civId) +
          '?limit=' + PAGE_LIMIT + '&page=' + page,
        method: 'GET',
        dataType: 'json'
      })
      .done(function (data) {
        var arr = data.data || data.arrestReports || [];
        if (Array.isArray(data) && !data.data) arr = data;
        allArrests = allArrests.concat(arr);
        var total = data.totalCount || data.total || 0;
        var fetched = (page + 1) * PAGE_LIMIT;
        if (total > 0 && fetched < total) {
          fetchPage(page + 1);
        } else {
          state.arrestCache[civId] = allArrests;
          callback();
        }
      })
      .fail(function () {
        state.arrestCache[civId] = allArrests;
        callback();
      });
    }

    fetchPage(0);
  }

  /* ───────────────────────── API: Fetch licenses for expanded detail ───────────────────────── */

  function fetchLicenses(civId, callback) {
    if (state.licenseCache.hasOwnProperty(civId)) {
      callback();
      return;
    }

    var PAGE_LIMIT = 25;
    var allLicenses = [];

    function fetchPage(page) {
      $.ajax({
        url: apiUrl() + '/api/v1/licenses/civilian/' + encodeURIComponent(civId) +
          '?limit=' + PAGE_LIMIT + '&page=' + page,
        method: 'GET',
        dataType: 'json'
      })
      .done(function (data) {
        var arr = data.licenses || data.data || [];
        if (Array.isArray(data) && !data.licenses) arr = data;
        allLicenses = allLicenses.concat(arr);
        var total = data.total || data.totalCount || 0;
        var fetched = (page + 1) * PAGE_LIMIT;
        if (total > 0 && fetched < total) {
          fetchPage(page + 1);
        } else {
          state.licenseCache[civId] = allLicenses;
          callback();
        }
      })
      .fail(function () {
        state.licenseCache[civId] = allLicenses;
        callback();
      });
    }

    fetchPage(0);
  }

  /* ───────────────────────── Arrest Report Modal ───────────────────────── */

  window.cdPsViewArrestReport = function(civId, index) {
    var arrests = state.arrestCache[civId] || [];
    if (!arrests[index]) return;
    var ar = arrests[index].arrestReport || arrests[index];
    var arrestee = ar.arrestee || {};
    var officer = ar.officer || {};
    var forms = ar.attachedForms || [];

    function field(label, value) {
      return '<div style="margin-bottom:0.75rem;">' +
        '<div style="font-size:0.5625rem;text-transform:uppercase;letter-spacing:0.08em;color:#475569;font-weight:600;margin-bottom:2px;">' + esc(label) + '</div>' +
        '<div style="font-size:0.8125rem;color:#e2e8f0;">' + esc(value || 'N/A') + '</div>' +
      '</div>';
    }
    function row2(l1, v1, l2, v2) {
      return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 1rem;">' + field(l1, v1) + field(l2, v2) + '</div>';
    }
    function sectionHead(title) {
      return '<div style="font-size:0.625rem;text-transform:uppercase;letter-spacing:0.1em;color:#38bdf8;font-weight:700;margin:1rem 0 0.5rem;padding-bottom:0.375rem;border-bottom:1px solid rgba(56,189,248,0.15);">' + title + '</div>';
    }

    // Status ribbon
    var statusText = ar.status === 'contested' ? 'CONTESTED' : ar.status === 'dismissed' ? 'DISMISSED' : '';
    var statusColor = ar.status === 'contested' ? '#f59e0b' : ar.status === 'dismissed' ? '#818cf8' : '';

    var modalHtml =
      '<div style="width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;border-radius:16px;background:linear-gradient(165deg,#1e293b 0%,#0f172a 100%);border:1px solid rgba(56,189,248,0.1);box-shadow:0 24px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.03) inset;font-family:Outfit,sans-serif;">' +
        // Header
        '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.04);position:relative;">' +
          '<button id="cd-ar-close-btn" style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.06);border:none;color:#64748b;width:28px;height:28px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.75rem;transition:all 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\';this.style.color=\'#e2e8f0\'" onmouseout="this.style.background=\'rgba(255,255,255,0.06)\';this.style.color=\'#64748b\'"><i class="fa fa-times"></i></button>' +
          '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>' +
            '<div style="font-size:0.625rem;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;font-weight:600;">Arrest Report</div>' +
          '</div>' +
          '<div style="font-size:1.25rem;font-weight:700;color:#f1f5f9;letter-spacing:-0.01em;">Case #' + esc(ar.reportNumber || '—') + '</div>' +
          (statusText ? '<div style="position:absolute;top:1rem;right:1.5rem;font-size:0.625rem;font-weight:700;letter-spacing:0.08em;color:' + statusColor + ';background:' + statusColor + '1a;padding:0.2rem 0.625rem;border-radius:4px;">' + statusText + '</div>' : '') +
        '</div>' +
        // Body
        '<div style="padding:0.75rem 1.5rem 1.5rem;">' +
          // Arrest info
          sectionHead('Arrest Information') +
          row2('Date', ar.arrestDate, 'Time', ar.arrestTime) +
          field('Location', ar.arrestLocation) +

          // Incident info
          sectionHead('Incident Information') +
          row2('Date', ar.incidentDate, 'Time', ar.incidentTime) +
          field('Location', ar.incidentLocation) +

          // Arrestee
          sectionHead('Arrestee') +
          row2('Name', arrestee.name, 'Date of Birth', arrestee.dob) +
          field('Address', arrestee.address) +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 1rem;">' +
            field('Height', arrestee.height) +
            field('Weight', arrestee.weight) +
            field('Phone', arrestee.phone) +
          '</div>' +
          row2('Eye Color', arrestee.eyeColor, 'Hair Color', arrestee.hairColor) +

          // Officer
          sectionHead('Arresting Officer') +
          row2('Name', officer.name, 'Badge #', officer.badgeNumber) +

          // Charges
          sectionHead('Charges') +
          '<div style="font-size:0.875rem;color:#f1f5f9;font-weight:500;line-height:1.5;margin-bottom:0.75rem;">' + esc(ar.charges || 'None') + '</div>' +

          // Narrative
          sectionHead('Narrative') +
          '<div style="font-size:0.8125rem;color:#cbd5e1;line-height:1.6;white-space:pre-wrap;background:rgba(0,0,0,0.2);border-radius:8px;padding:0.75rem;border:1px solid rgba(255,255,255,0.03);margin-bottom:0.75rem;">' + esc(ar.narrative || 'No narrative provided.') + '</div>' +

          // Witnesses
          (ar.witnesses ? sectionHead('Witnesses') + '<div style="font-size:0.8125rem;color:#cbd5e1;margin-bottom:0.75rem;">' + esc(ar.witnesses) + '</div>' : '') +

          // Force used
          '<div style="display:flex;gap:1rem;margin-top:0.5rem;">' +
            '<div style="display:flex;align-items:center;gap:0.375rem;">' +
              '<div style="font-size:0.625rem;text-transform:uppercase;letter-spacing:0.08em;color:#475569;font-weight:600;">Force Used</div>' +
              '<div style="font-size:0.75rem;font-weight:700;color:' + (ar.forceUsed ? 'var(--cd-red)' : 'var(--cd-green)') + ';">' + (ar.forceUsed ? 'YES' : 'NO') + '</div>' +
            '</div>' +
          '</div>' +

          // Attached forms
          (forms.length > 0 ?
            sectionHead('Attached Forms (' + forms.length + ')') +
            forms.map(function(f) {
              var fType = (f.type || 'form').replace(/_/g, ' ');
              var fData = f.data || {};
              var fDetails = Object.keys(fData).map(function(k) { return esc(k) + ': ' + esc(String(fData[k])); }).join(' &middot; ');
              return '<div style="padding:0.5rem 0.625rem;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04);margin-bottom:0.25rem;font-size:0.75rem;">' +
                '<span style="color:var(--cd-accent);font-weight:600;text-transform:capitalize;">' + esc(fType) + '</span>' +
                (fDetails ? '<span style="color:#64748b;margin-left:0.5rem;">' + fDetails + '</span>' : '') +
              '</div>';
            }).join('') : '') +

          // Dismissed by
          (ar.dismissedBy ? '<div style="margin-top:0.75rem;padding:0.5rem 0.75rem;border-radius:6px;background:rgba(129,140,248,0.08);border:1px solid rgba(129,140,248,0.15);font-size:0.75rem;color:#818cf8;">Dismissed by Judge ' + esc(ar.dismissedBy) + '</div>' : '') +
        '</div>' +
      '</div>';

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:cdVsFadeIn 0.15s ease;overflow-y:auto;';
    overlay.innerHTML = '<div style="padding:1rem 0;margin:auto;">' + modalHtml + '</div>';
    document.body.style.overflow = 'hidden';
    function closeArrestModal() {
      overlay.remove();
      document.body.style.overflow = '';
    }
    overlay.onclick = function(e) { if (e.target === overlay) closeArrestModal(); };
    var closeBtn = overlay.querySelector('#cd-ar-close-btn');
    if (closeBtn) closeBtn.onclick = function(e) { e.stopPropagation(); closeArrestModal(); };
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { closeArrestModal(); document.removeEventListener('keydown', onKey); }
    });
    document.body.appendChild(overlay);
  };

  /* ───────────────────────── License actions (suspend/revoke/reinstate) ───────────────────────── */

  window.cdPsLicenseAction = function(licenseId, action) {
    var newStatus = '';
    switch (action) {
      case 'suspend': newStatus = 'Suspended'; break;
      case 'revoke': newStatus = 'Revoked'; break;
      case 'reinstate': newStatus = 'Valid'; break;
      default: return;
    }

    $.ajax({
      url: apiUrl() + '/api/v1/license/' + encodeURIComponent(licenseId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ status: newStatus }),
      success: function() {
        window.ddToast('License ' + action + 'd', 'success');
        // Update cached license status and re-render
        var civId = state.expandedId;
        if (civId && state.licenseCache[civId]) {
          for (var i = 0; i < state.licenseCache[civId].length; i++) {
            var entry = state.licenseCache[civId][i];
            var id = entry._id || (entry.license && entry.license._id);
            if (id === licenseId) {
              var lic = entry.license || entry;
              lic.status = newStatus;
              break;
            }
          }
          renderResults();
        }
      },
      error: function() {
        window.ddToast('Failed to ' + action + ' license', 'error');
      }
    });
  };

  /* ───────────────────────── Toggle expand ───────────────────────── */

  function toggleExpand(civId) {
    if (state.expandedId === civId) {
      // Collapse
      state.expandedId = null;
      renderResults();
      return;
    }

    state.expandedId = civId;

    // Fetch vehicles, firearms, licenses, and arrests in parallel
    var pending = 4;
    function done() {
      pending--;
      if (pending <= 0) renderResults();
    }
    fetchVehicles(civId, done);
    fetchFirearms(civId, done);
    fetchLicenses(civId, done);
    fetchArrests(civId, done);
  }

  /* ───────────────────────── Init ───────────────────────── */

  function init() {
    injectStyles();

    // Remove previous handlers to avoid duplicates (init can be called multiple times)
    $(document).off('.cdPersonSearch');

    // Show/hide clear button based on input content
    $(document).on('input.cdPersonSearch', '#cd-ps-input', function () {
      $('#cd-ps-clear').toggle($(this).val().length > 0);
    });
    $(document).on('click.cdPersonSearch', '#cd-ps-clear', function () {
      $('#cd-ps-input').val('').focus();
      $(this).hide();
      doSearch('', 1);
    });

    // Search input debounce
    $(document).on('input.cdPersonSearch', '#cd-ps-input', function () {
      var val = $(this).val().trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        doSearch(val, 1);
      }, DEBOUNCE_MS);
    });

    // Click to expand/collapse
    $(document).on('click.cdPersonSearch', '.cd-ps-item-summary', function () {
      var id = $(this).closest('.cd-ps-item').data('id');
      if (id) toggleExpand(String(id));
    });

    // Pagination
    $(document).on('click.cdPersonSearch', '#cd-ps-prev', function () {
      if (state.page > 1) doSearch(state.searchQuery, state.page - 1);
    });
    $(document).on('click.cdPersonSearch', '#cd-ps-next', function () {
      if (state.page < state.totalPages) doSearch(state.searchQuery, state.page + 1);
    });

    // Render initial empty state
    renderResults();
  }

  /* ───────────────────────── Exports ───────────────────────── */

  window.cdPersonSearchRender = render;
  window.cdPersonSearchInit = init;

})();
