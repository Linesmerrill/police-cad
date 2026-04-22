/**
 * Command Dashboard — Dispatch Unit Roster
 *
 * Left zone of the Command Bridge. Shows all assignable units in the
 * community, grouped by search + status filter. Each chip is a drag source
 * for Sortable.js (step 7) and exposes a kebab-menu keyboard fallback.
 *
 * Dependencies:
 *   - jQuery ($)
 *   - window.ddConfig { API_URL, communityId, communityData }
 *   - window.cdStatusColor(code, desc) -> 'emergency'|'available'|'busy'|'other'
 *   - window.esc()
 */
;(function () {
  'use strict';

  function cfg()    { return window.ddConfig || {}; }
  function api()    { return cfg().API_URL || ''; }
  function esc(s)   { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }

  // Department-type visuals. Colors per user spec (police=blue, fire=red, ems=white).
  // Keyed on the template.name (lowercased). Kept as a shared window helper so the
  // board's call cards can reuse the same icon/color when showing assigned units.
  var DEPT_VISUALS = {
    police:   { icon: 'fa-shield-halved',  color: '#3b82f6', label: 'Police' },
    fire:     { icon: 'fa-fire',           color: '#ef4444', label: 'Fire' },
    ems:      { icon: 'fa-truck-medical',  color: '#f8fafc', label: 'EMS' },
    civilian: { icon: 'fa-user',           color: '#94a3b8', label: 'Civ' },
    judicial: { icon: 'fa-scale-balanced', color: '#a855f7', label: 'Jud' },
  };
  function deptVisual(template) {
    var key = String(template || '').toLowerCase();
    return DEPT_VISUALS[key] || { icon: 'fa-circle-question', color: '#64748b', label: 'Other', key: 'other' };
  }
  function deptKey(template) {
    var key = String(template || '').toLowerCase();
    return DEPT_VISUALS[key] ? key : 'other';
  }
  window.cdDispatchDeptVisual = deptVisual; // for reuse by call cards, detail pills

  // In-memory state
  var state = {
    units: [],          // normalized {id, callSign, username, tenCode, tone, deptKey, deptName, ...}
    statusFilter: 'all', // all|available|busy|other
    deptFilter: 'all',   // all|police|fire|ems|other
    search: '',
    loading: false,
  };
  window.__cdDispatchRosterState = state; // debugging handle

  // ── Public API ────────────────────────────────────

  window.cdDispatchRosterInit = function () {
    injectStyles();
    render();
    load();
    wireEvents();
  };

  window.cdDispatchRosterRefresh = function () { load(); };

  window.cdDispatchRosterGetUnit = function (userId) {
    for (var i = 0; i < state.units.length; i++) if (state.units[i].id === userId) return state.units[i];
    return null;
  };

  window.cdDispatchRosterPatchUnit = function (patch) {
    if (!patch || !patch.id) return;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].id === patch.id) {
        // Merge allowed fields
        if (patch.tenCode !== undefined) {
          state.units[i].tenCode = patch.tenCode;
          state.units[i].tone = toneFor(patch.tenCode);
        }
        if (patch.resolvedCallSign) state.units[i].callSign = patch.resolvedCallSign;
        render();
        return;
      }
    }
  };

  // ── Data loading ──────────────────────────────────

  function load() {
    var communityId = cfg().communityId;
    if (!communityId) return;
    state.loading = true;
    render();
    $.ajax({
      url: api() + '/api/v2/community/' + encodeURIComponent(communityId) + '/units?limit=100&page=1',
      method: 'GET',
    }).done(function (resp) {
      state.units = normalize(resp && resp.units ? resp.units : []);
      state.loading = false;
      render();
    }).fail(function (xhr) {
      state.loading = false;
      render();
      toast('Failed to load units', 'error');
      console.error('[cd-dispatch-roster] load failed', xhr && xhr.responseText);
    });
  }

  function normalize(raw) {
    var me = (cfg().userId || '').toString();
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var u = raw[i] || {};
      var active = findActiveDept(u);
      var isDispatcher = active && String(active.template || '').toLowerCase() === 'dispatch';
      if (isDispatcher) continue;        // hide other dispatchers from the assignable pool
      if (u.id === me) continue;         // hide self — you can't assign yourself from this roster
      var tmpl = active ? (active.template || '') : '';
      out.push({
        id: u.id,
        username: u.username || '',
        callSign: u.resolvedCallSign || u.globalCallSign || '',
        tenCode: u.tenCode || null,
        tone: toneFor(u.tenCode),
        deptName: u.activeDepartmentName || (active ? active.name : ''),
        deptTemplate: tmpl,
        deptKey: deptKey(tmpl),
        profilePicture: u.profilePicture || '',
      });
    }
    return out;
  }

  function findActiveDept(u) {
    if (!u || !u.departments) return null;
    for (var i = 0; i < u.departments.length; i++) {
      if (u.departments[i].id === u.activeDepartmentId) return u.departments[i];
    }
    return u.departments[0] || null;
  }

  // Resolve tone by looking up the description in the community's cached
  // tenCodes (the /units endpoint only returns {id, code}, not description).
  function toneFor(tenCode) {
    if (!tenCode || !tenCode.code) return 'other';
    var desc = '';
    var cache = (cfg().communityData || {}).tenCodes || [];
    for (var i = 0; i < cache.length; i++) {
      if (cache[i]._id === tenCode.id || cache[i]._id === tenCode._id) { desc = cache[i].description || ''; break; }
    }
    return typeof window.cdStatusColor === 'function'
      ? window.cdStatusColor(tenCode.code, desc)
      : 'other';
  }

  // ── Rendering ─────────────────────────────────────

  function render() {
    var $host = $('#cd-dispatch-roster');
    if (!$host.length) return;

    // Filter controls + search are rendered once; only the list body refreshes
    // after the initial render to preserve focus in the search input.
    if (!$host.find('.cd-roster-controls').length) {
      $host.html(controlsHtml());
    }

    // List body
    var $body = $host.find('.cd-roster-body');
    var filtered = applyFilters(state.units);

    if (state.loading) {
      $body.html('<div class="cd-dispatch-placeholder"><i class="fa fa-circle-notch fa-spin"></i><div>Loading units…</div></div>');
    } else if (!filtered.length) {
      var msg = state.search ? 'No units match your search.' : (state.units.length ? 'No units in this status bucket.' : 'No assignable units in this community yet.');
      $body.html('<div class="cd-dispatch-placeholder"><i class="fa fa-users"></i><div>' + esc(msg) + '</div></div>');
    } else {
      var html = '';
      for (var i = 0; i < filtered.length; i++) html += chipHtml(filtered[i]);
      $body.html(html);
    }

    // Update count in the zone header
    $('#cd-dispatch-roster-count').text(filtered.length + (filtered.length !== state.units.length ? ' / ' + state.units.length : ''));

    // Re-apply active filter pills
    $host.find('.cd-roster-pill[data-group="status"]').removeClass('is-active');
    $host.find('.cd-roster-pill[data-group="status"][data-filter="' + state.statusFilter + '"]').addClass('is-active');
    $host.find('.cd-roster-pill[data-group="dept"]').removeClass('is-active');
    $host.find('.cd-roster-pill[data-group="dept"][data-filter="' + state.deptFilter + '"]').addClass('is-active');
  }

  function controlsHtml() {
    return (
      '<div class="cd-roster-controls">' +
        '<label class="cd-roster-search">' +
          '<i class="fa fa-magnifying-glass"></i>' +
          '<input type="search" id="cd-roster-search-input" placeholder="Search callsign or name" autocomplete="off">' +
        '</label>' +
        // Department-type filter — active department is derived from the last
        // department where the unit set their status (server-side activeDepartmentId).
        '<div class="cd-roster-pills cd-roster-pills-dept" role="tablist" aria-label="Filter units by department">' +
          '<button type="button" class="cd-roster-pill is-active" data-group="dept" data-filter="all" role="tab">All</button>' +
          deptPill('police') +
          deptPill('fire') +
          deptPill('ems') +
        '</div>' +
        '<div class="cd-roster-pills" role="tablist" aria-label="Filter units by status">' +
          '<button type="button" class="cd-roster-pill is-active" data-group="status" data-filter="all" role="tab">All</button>' +
          '<button type="button" class="cd-roster-pill" data-group="status" data-filter="available" role="tab">Avail</button>' +
          '<button type="button" class="cd-roster-pill" data-group="status" data-filter="busy" role="tab">Busy</button>' +
          '<button type="button" class="cd-roster-pill" data-group="status" data-filter="other" role="tab">Other</button>' +
        '</div>' +
      '</div>' +
      '<div class="cd-roster-body" id="cd-dispatch-roster-list" aria-live="polite"></div>' +
      '<div class="cd-unit-unassign-drop" id="cd-dispatch-roster-unassign" aria-hidden="true">' +
        '<i class="fa fa-arrow-up-from-bracket"></i>' +
        '<span>Drop here to unassign</span>' +
      '</div>'
    );
  }

  function deptPill(key) {
    var v = DEPT_VISUALS[key];
    if (!v) return '';
    return (
      '<button type="button" class="cd-roster-pill cd-roster-pill-dept" data-group="dept" data-filter="' + esc(key) + '" role="tab" title="' + esc(v.label) + '" style="--cd-dept-color:' + esc(v.color) + ';">' +
        '<i class="fa ' + esc(v.icon) + '" aria-hidden="true"></i>' +
        '<span>' + esc(v.label) + '</span>' +
      '</button>'
    );
  }

  function chipHtml(u) {
    var code = (u.tenCode && u.tenCode.code) || '';
    var dv = deptVisual(u.deptTemplate);
    return (
      '<div class="cd-unit-chip" data-user-id="' + esc(u.id) + '" data-tone="' + esc(u.tone) + '" data-dept="' + esc(u.deptKey) + '" tabindex="0" role="listitem" aria-label="' + esc((u.callSign || u.username) + ' ' + dv.label + (code ? ' ' + code : '')) + '" style="--cd-dept-color:' + esc(dv.color) + ';">' +
        '<div class="cd-unit-chip-avatar" aria-hidden="true">' +
          '<i class="fa ' + esc(dv.icon) + '" title="' + esc(dv.label) + '"></i>' +
        '</div>' +
        '<div class="cd-unit-chip-main">' +
          '<div class="cd-unit-chip-top">' +
            '<span class="cd-unit-chip-dot" data-tone="' + esc(u.tone) + '" aria-hidden="true"></span>' +
            '<span class="cd-unit-chip-callsign">' + esc(u.callSign || '—') + '</span>' +
            (code ? '<span class="cd-unit-chip-code">' + esc(code) + '</span>' : '') +
          '</div>' +
          '<div class="cd-unit-chip-sub">' +
            '<span class="cd-unit-chip-name">' + esc(u.username) + '</span>' +
            (u.deptName ? '<span class="cd-unit-chip-dept">' + esc(u.deptName) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<button type="button" class="cd-unit-chip-menu" data-user-id="' + esc(u.id) + '" aria-label="Assign ' + esc(u.callSign || u.username) + ' to a call" title="Assign to…">' +
          '<i class="fa fa-ellipsis-vertical"></i>' +
        '</button>' +
      '</div>'
    );
  }

  function applyFilters(units) {
    var out = [];
    var q = state.search.toLowerCase();
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (state.statusFilter !== 'all' && u.tone !== state.statusFilter) continue;
      if (state.deptFilter !== 'all' && u.deptKey !== state.deptFilter) continue;
      if (q) {
        var hay = (u.callSign + ' ' + u.username + ' ' + (u.deptName || '')).toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      out.push(u);
    }
    return out;
  }

  // ── Events ────────────────────────────────────────

  function wireEvents() {
    // Namespaced delegated handlers so repeated init calls don't stack listeners
    $(document)
      .off('.cdDispatchRoster')
      .on('input.cdDispatchRoster', '#cd-roster-search-input', function () {
        state.search = String(this.value || '').trim();
        render();
      })
      .on('click.cdDispatchRoster', '.cd-roster-pill', function () {
        var $pill = $(this);
        var group = $pill.data('group');
        var value = $pill.data('filter');
        if (group === 'dept') state.deptFilter = value;
        else state.statusFilter = value;
        render();
      })
      .on('click.cdDispatchRoster', '.cd-unit-chip-menu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var userId = $(this).data('user-id');
        if (typeof window.cdDispatchAssignMenuForUnit === 'function') {
          window.cdDispatchAssignMenuForUnit(userId);
        } else {
          toast('Assignment menu lands with the board (step 4).', 'info');
        }
      })
      .on('keydown.cdDispatchRoster', '.cd-unit-chip', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var userId = $(this).data('user-id');
          if (typeof window.cdDispatchAssignMenuForUnit === 'function') {
            window.cdDispatchAssignMenuForUnit(userId);
          }
        }
      });
  }

  // ── Styles (scoped to the roster) ─────────────────

  function injectStyles() {
    if (document.getElementById('cd-dispatch-roster-styles')) return;
    var css = [
      '.cd-roster-controls{display:flex;flex-direction:column;gap:0.5rem;padding:0 0 0.625rem;border-bottom:1px solid var(--cd-glass-border);margin-bottom:0.625rem;position:sticky;top:-0.75rem;background:var(--cd-glass);padding-top:0.5rem;z-index:2;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}',
      '.cd-roster-search{display:flex;align-items:center;gap:0.5rem;padding:0.375rem 0.625rem;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--cd-glass-border);}',
      '.cd-roster-search i{color:var(--cd-text-dim);font-size:0.75rem;}',
      '.cd-roster-search input{flex:1;background:transparent;border:0;outline:0;color:var(--cd-text);font-family:inherit;font-size:0.8125rem;min-width:0;}',
      '.cd-roster-search input::placeholder{color:var(--cd-text-dim);}',
      '.cd-roster-pills{display:flex;gap:0.25rem;}',
      '.cd-roster-pill{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:0.3125rem;padding:0.3125rem 0.5rem;border-radius:6px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text-dim);font:600 0.6875rem/1 inherit;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;transition:all .15s;}',
      '.cd-roster-pill i{font-size:0.75rem;}',
      '.cd-roster-pill:hover{color:var(--cd-text-muted);background:rgba(255,255,255,0.04);}',
      '.cd-roster-pill.is-active{color:var(--cd-accent);border-color:rgba(56,189,248,0.4);background:rgba(56,189,248,0.08);}',
      '.cd-roster-pill-dept i{color:var(--cd-dept-color);}',
      '.cd-roster-pill-dept.is-active{color:var(--cd-dept-color);border-color:color-mix(in srgb,var(--cd-dept-color) 40%,transparent);background:color-mix(in srgb,var(--cd-dept-color) 10%,transparent);}',
      '.cd-roster-pill-dept.is-active i{color:var(--cd-dept-color);}',
      '.cd-roster-body{display:flex;flex-direction:column;gap:0.375rem;}',
      '.cd-unit-chip{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:0.625rem;padding:0.5rem 0.625rem;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--cd-glass-border);cursor:grab;transition:background .15s,border-color .15s,transform .15s;}',
      '.cd-unit-chip:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);}',
      '.cd-unit-chip:focus-visible{outline:2px solid var(--cd-accent);outline-offset:2px;}',
      '.cd-unit-chip.is-assigning{opacity:0.5;cursor:wait;}',
      '.cd-unit-chip.sortable-ghost{opacity:0.4;}',
      '.cd-unit-chip.sortable-drag{transform:rotate(-2deg) scale(1.02);box-shadow:0 8px 28px rgba(0,0,0,0.4);}',
      '.cd-unit-chip-avatar{width:28px;height:28px;border-radius:8px;background:color-mix(in srgb,var(--cd-dept-color,var(--cd-accent)) 14%,transparent);border:1px solid color-mix(in srgb,var(--cd-dept-color,var(--cd-accent)) 32%,transparent);display:flex;align-items:center;justify-content:center;color:var(--cd-dept-color,var(--cd-accent));font-size:0.75rem;}',
      '.cd-unit-chip-main{display:flex;flex-direction:column;gap:0.125rem;min-width:0;}',
      '.cd-unit-chip-top{display:flex;align-items:center;gap:0.4375rem;min-width:0;}',
      '.cd-unit-chip-dot{width:7px;height:7px;border-radius:999px;flex-shrink:0;background:var(--cd-text-dim);}',
      '.cd-unit-chip-dot[data-tone="available"]{background:var(--cd-green);box-shadow:0 0 0 3px rgba(34,197,94,0.15);}',
      '.cd-unit-chip-dot[data-tone="busy"]{background:var(--cd-amber);box-shadow:0 0 0 3px rgba(245,158,11,0.15);}',
      '.cd-unit-chip-dot[data-tone="emergency"]{background:var(--cd-red);box-shadow:0 0 0 3px rgba(239,68,68,0.2);animation:cd-dispatch-pulse 1.8s ease-in-out infinite;}',
      '.cd-unit-chip-dot[data-tone="other"]{background:var(--cd-accent);box-shadow:0 0 0 3px rgba(56,189,248,0.1);}',
      '.cd-unit-chip-callsign{font:600 0.8125rem/1.1 inherit;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.cd-unit-chip-code{margin-left:auto;padding:0.0625rem 0.375rem;border-radius:4px;background:rgba(255,255,255,0.04);border:1px solid var(--cd-glass-border);font:600 0.625rem/1.3 "JetBrains Mono",ui-monospace,monospace;color:var(--cd-text-muted);letter-spacing:0.04em;}',
      '.cd-unit-chip-sub{display:flex;align-items:center;gap:0.375rem;font-size:0.6875rem;color:var(--cd-text-dim);min-width:0;}',
      '.cd-unit-chip-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}',
      '.cd-unit-chip-dept{padding:0.0625rem 0.375rem;border-radius:4px;background:rgba(255,255,255,0.02);color:var(--cd-text-muted);white-space:nowrap;}',
      '.cd-unit-chip-menu{flex-shrink:0;width:24px;height:24px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}',
      '.cd-unit-chip-menu:hover,.cd-unit-chip-menu:focus-visible{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text);outline:none;}',
      '.cd-unit-unassign-drop{margin-top:0.625rem;padding:0.625rem;border:1px dashed var(--cd-glass-border);border-radius:10px;color:var(--cd-text-dim);font-size:0.75rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:all .15s;}',
      '.cd-unit-unassign-drop.drop-target{border-color:rgba(239,68,68,0.4);color:#fca5a5;background:rgba(239,68,68,0.06);}',
      '@keyframes cd-dispatch-pulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.2);}50%{box-shadow:0 0 0 6px rgba(239,68,68,0.08);}}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dispatch-roster-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
