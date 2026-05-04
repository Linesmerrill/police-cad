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

  // Templates that are NOT dispatchable. Mirrors cd-dispatch-unit-console's
  // isEligibleTemplate() — civilians are not field units, judges aren't
  // assignable, and dispatchers shouldn't dispatch themselves.
  var NON_DISPATCHABLE = { civilian: 1, judicial: 1, dispatch: 1 };

  // On/off-duty classification used to decide whether a unit is in the
  // dispatchable roster vs. surfaced as a ghost during search.
  //
  // Matched on the unit's CURRENT TEN-CODE — the existing radio convention
  // is "X-42" = off-duty / "X-41" = on-duty across both 10-codes (10-41 /
  // 10-42) and signal-codes (signal 41 / signal 42). 10-7 (out of service)
  // also reads as off-duty. Any community custom code whose description
  // clearly says off-duty/end of/out of service/off shift also counts.
  // A unit with no code yet is treated as off-duty (hasn't started a
  // shift).
  //
  // Comparison is case-insensitive and tolerant of whitespace + the
  // common "10-" / "10 " / "signal-" / "signal " prefix variants so a
  // dispatcher who set "Signal-42" still classifies correctly.
  //
  // TODO(community-config): let community admins designate which codes
  // mean on-duty / off-duty per community when they configure ten-codes.
  var OFF_DUTY_CODE_SUFFIXES = { '42': 1, '7': 1 };
  var OFF_DUTY_DESC_FRAGMENTS = [
    'off duty', 'off-duty', 'end of', 'end-of', 'out of service',
    'off shift', 'off-shift', 'eos', 'going home',
  ];

  function unitCode(u) { return (u && u.tenCode && u.tenCode.code) || ''; }

  // Pull the numeric / mnemonic suffix from a code like "10-42" or
  // "signal 42" or "S42". Returns lowercase trimmed suffix, or '' when
  // the code doesn't fit the family pattern.
  function codeSuffix(code) {
    var c = String(code || '').toLowerCase().trim();
    if (!c) return '';
    // Strip common prefixes + the separator.
    c = c.replace(/^signal[\s\-_]*/, '').replace(/^s[\s\-_]+/, '');
    c = c.replace(/^10[\s\-_]+/, '');
    return c.trim();
  }

  // Resolve the description for a tenCode by looking it up in the
  // community's cached ten-code list (the /units endpoint only returns
  // {id, code} on the tenCode object).
  function unitCodeDesc(tenCode) {
    if (!tenCode) return '';
    var cache = (cfg().communityData || {}).tenCodes || [];
    for (var i = 0; i < cache.length; i++) {
      if (cache[i]._id === tenCode.id || cache[i]._id === tenCode._id) {
        return (cache[i].description || '').toLowerCase();
      }
    }
    return '';
  }

  function isOffDuty(u) {
    var code = unitCode(u);
    if (!code) return true; // no code yet = hasn't started a shift
    if (OFF_DUTY_CODE_SUFFIXES[codeSuffix(code)]) return true;
    var desc = unitCodeDesc(u && u.tenCode);
    for (var i = 0; i < OFF_DUTY_DESC_FRAGMENTS.length; i++) {
      if (desc.indexOf(OFF_DUTY_DESC_FRAGMENTS[i]) !== -1) return true;
    }
    return false;
  }
  function hasEligibleDept(u) {
    var depts = (u && u.departments) || [];
    for (var i = 0; i < depts.length; i++) {
      var t = String(depts[i].template || '').toLowerCase();
      if (t && !NON_DISPATCHABLE[t]) return true;
    }
    return false;
  }

  // In-memory state. deptFilter is a Set of selected template keys
  // (police/fire/ems). Empty Set = show all eligible templates.
  var state = {
    units: [],          // normalized {id, callSign, username, tenCode, tone, deptKey, deptName, ...}
    statusFilter: 'all', // all|available|busy|other
    deptFilter: new Set(),
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

  window.cdDispatchRosterRefresh = function (opts) { load(opts || { silent: true }); };

  window.cdDispatchRosterGetUnit = function (userId) {
    for (var i = 0; i < state.units.length; i++) if (state.units[i].id === userId) return state.units[i];
    return null;
  };

  // True once the roster has been hydrated at least once. Consumers (like the
  // call board) use this to tell "still loading" apart from "user not found".
  window.cdDispatchRosterIsReady = function () { return state.units.length > 0; };

  window.cdDispatchRosterPatchUnit = function (patch) {
    if (!patch || !patch.id) return;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].id === patch.id) {
        var unit = state.units[i];
        // Merge allowed fields
        if (patch.tenCode !== undefined) {
          unit.tenCode = patch.tenCode;
          unit.tone = toneFor(patch.tenCode);
        }
        if (patch.resolvedCallSign !== undefined) unit.callSign = patch.resolvedCallSign || unit.globalCallSign || '';
        if (patch.globalCallSign !== undefined) {
          unit.globalCallSign = patch.globalCallSign || '';
          // Chip shows the active dept's override if set, else global. Only
          // flip the visible callsign when no active-dept override exists.
          var activeOverride = unit.departmentCallSigns && unit.activeDepartmentId
            ? unit.departmentCallSigns[unit.activeDepartmentId]
            : '';
          if (!activeOverride) unit.callSign = unit.globalCallSign || '';
        }
        if (patch.departmentCallSign) {
          unit.departmentCallSigns = unit.departmentCallSigns || {};
          if (patch.departmentCallSign.callSign) {
            unit.departmentCallSigns[patch.departmentCallSign.departmentId] = patch.departmentCallSign.callSign;
          } else {
            delete unit.departmentCallSigns[patch.departmentCallSign.departmentId];
          }
          // If the patched dept is the unit's active dept, its chip-visible
          // callsign should follow the override (or fall back to global).
          if (unit.activeDepartmentId === patch.departmentCallSign.departmentId) {
            unit.callSign = patch.departmentCallSign.callSign || unit.globalCallSign || '';
          }
        }
        // Active-department change — recompute every derived field so the
        // chip, the console header, and the badge-row active ring all flip
        // without waiting for the async roster refresh.
        if (patch.activeDepartmentId !== undefined) {
          unit.activeDepartmentId = patch.activeDepartmentId || '';
          var matched = null;
          var depts = Array.isArray(unit.departments) ? unit.departments : [];
          for (var d = 0; d < depts.length; d++) {
            if (depts[d].id === unit.activeDepartmentId) { matched = depts[d]; break; }
          }
          var newName = patch.activeDepartmentName || (matched ? matched.name : '');
          var newTmpl = matched ? (matched.template || '') : '';
          unit.activeDepartmentName = newName;
          unit.deptName = newName;
          unit.deptTemplate = newTmpl;
          unit.deptKey = deptKey(newTmpl);
        }
        render();
        return;
      }
    }
  };

  // ── Data loading ──────────────────────────────────

  function load(opts) {
    var silent = !!(opts && opts.silent);
    var communityId = cfg().communityId;
    if (!communityId) return;
    if (!silent) {
      state.loading = true;
      render();
    }
    $.ajax({
      url: api() + '/api/v2/community/' + encodeURIComponent(communityId) + '/units?limit=100&page=1',
      method: 'GET',
    }).done(function (resp) {
      var next = normalize(resp && resp.units ? resp.units : []);
      if (silent && listsEqual(state.units, next)) {
        // No change — don't re-render at all; avoids all flicker.
        state.loading = false;
        return;
      }
      state.units = next;
      state.loading = false;
      render();
      // Let consumers (call board, call detail) re-resolve assigned-unit IDs
      // that couldn't be looked up before this load completed.
      $(document).trigger('cdDispatch:rosterLoaded');
    }).fail(function (xhr) {
      state.loading = false;
      if (!silent) render();
      if (!silent) toast('Failed to load units', 'error');
      console.error('[cd-dispatch-roster] load failed', xhr && xhr.responseText);
    });
  }

  // Shallow equality for the roster list so silent polls can skip re-render.
  function listsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      var u = a[i], v = b[i];
      if (u.id !== v.id) return false;
      if (u.callSign !== v.callSign) return false;
      if ((u.tenCode && u.tenCode.code) !== (v.tenCode && v.tenCode.code)) return false;
      if (u.deptKey !== v.deptKey) return false;
    }
    return true;
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
      // Skip pure civilians / judges. Dispatchers cannot assign them to calls,
      // so showing them in the roster is clutter at best and a realism break
      // at worst (community feedback: "civilians appearing in the All view
      // makes the dashboard feel like a contact list, not a unit board").
      if (!hasEligibleDept(u)) continue;
      var tmpl = active ? (active.template || '') : '';
      // Summarise every department the user is in, not just the active one,
      // so dispatchers can see at a glance that (e.g.) "1D-44" is in both
      // Patrol and EMS. Deduped by template key to avoid showing two Police
      // badges for a user in two police agencies.
      var allDepts = Array.isArray(u.departments) ? u.departments : [];
      var deptTemplatesSeen = {};
      var deptTemplates = [];
      for (var j = 0; j < allDepts.length; j++) {
        var dk = deptKey(allDepts[j].template || '');
        if (deptTemplatesSeen[dk]) continue;
        deptTemplatesSeen[dk] = true;
        deptTemplates.push({ template: allDepts[j].template || '', key: dk });
      }
      out.push({
        id: u.id,
        username: u.username || '',
        callSign: u.resolvedCallSign || u.globalCallSign || '',
        globalCallSign: u.globalCallSign || '',
        tenCode: u.tenCode || null,
        tone: toneFor(u.tenCode),
        deptName: u.activeDepartmentName || (active ? active.name : ''),
        deptTemplate: tmpl,
        deptKey: deptKey(tmpl),
        deptTemplates: deptTemplates,              // [{template, key}] for badge row
        departments: allDepts,                     // raw list for future use
        departmentCallSigns: u.departmentCallSigns || {},
        activeDepartmentId: u.activeDepartmentId || (active ? active.id : ''),
        activeDepartmentName: u.activeDepartmentName || (active ? active.name : ''),
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

    // List body. The roster is the on-duty (online) bucket; the off-duty
    // bucket only surfaces during text search so it doesn't crowd the
    // default view.
    var $body = $host.find('.cd-roster-body');
    var split = applyFilters(state.units);
    var filtered = split.online;
    var ghosts = split.offline;
    var GHOST_CAP = state.ghostExpanded ? ghosts.length : 5;
    var ghostsVisible = ghosts.slice(0, GHOST_CAP);
    var ghostsExtra = Math.max(0, ghosts.length - GHOST_CAP);

    if (state.loading) {
      $body.html('<div class="cd-dispatch-placeholder"><i class="fa fa-circle-notch fa-spin"></i><div>Loading units…</div></div>');
    } else {
      var html = '';

      if (filtered.length) {
        for (var i = 0; i < filtered.length; i++) html += chipHtml(filtered[i]);
      } else {
        // Empty on-duty list. Tailor the message based on whether the
        // search produced ghost matches we'll show below.
        var primaryMsg, hint;
        if (state.search) {
          primaryMsg = ghostsVisible.length
            ? 'No on-duty units match — but ' + ghosts.length + ' off-duty.'
            : 'No units match your search.';
          hint = 'Off-duty units appear below. Tap to view or update their status.';
        } else {
          primaryMsg = state.units.length ? 'No units in this status bucket.' : 'No assignable units in this community yet.';
          hint = 'Don’t see a unit? Have them mark themselves on-duty (10-41 / signal 41) — only on-duty units appear here.';
        }
        html += (
          '<div class="cd-dispatch-placeholder">' +
            (ghostsVisible.length ? '' : '<i class="fa fa-users"></i>') +
            '<div>' + esc(primaryMsg) + '</div>' +
            '<div class="cd-dispatch-placeholder-hint">' + esc(hint) + '</div>' +
          '</div>'
        );
      }

      // Ghost section — only when actively searching and there are matches.
      if (state.search && ghostsVisible.length) {
        html += (
          '<div class="cd-roster-section-divider" role="separator">' +
            '<span class="cd-roster-section-divider-label">OFF-DUTY · ' + ghosts.length + '</span>' +
          '</div>'
        );
        for (var g = 0; g < ghostsVisible.length; g++) html += chipHtml(ghostsVisible[g], { ghost: true });
        if (ghostsExtra > 0) {
          html += (
            '<div class="cd-roster-ghost-more" data-action="ghost-show-all">' +
              '+ ' + ghostsExtra + ' more off-duty' +
            '</div>'
          );
        }
        html += '<div class="cd-roster-ghost-foot">Off-duty units are not dispatchable. Tap to view or nudge.</div>';
      }

      $body.html(html);
    }

    // Update count in the zone header. Only on-duty units count toward
    // dispatchable capacity — off-duty/ghost units are not in the
    // denominator, so the "X / Y" reads as "showing X of Y dispatchable."
    var totalOnDuty = 0;
    for (var t = 0; t < state.units.length; t++) {
      if (!isOffDuty(state.units[t])) totalOnDuty++;
    }
    $('#cd-dispatch-roster-count').text(filtered.length + (filtered.length !== totalOnDuty ? ' / ' + totalOnDuty : ''));

    // Re-apply active filter pills
    $host.find('.cd-roster-pill[data-group="status"]').removeClass('is-active');
    $host.find('.cd-roster-pill[data-group="status"][data-filter="' + state.statusFilter + '"]').addClass('is-active');
    $host.find('.cd-roster-pill[data-group="dept"]').removeClass('is-active');
    if (state.deptFilter.size === 0) {
      $host.find('.cd-roster-pill[data-group="dept"][data-filter="all"]').addClass('is-active');
    } else {
      state.deptFilter.forEach(function (k) {
        $host.find('.cd-roster-pill[data-group="dept"][data-filter="' + k + '"]').addClass('is-active');
      });
    }
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

  function chipHtml(u, opts) {
    var ghost = !!(opts && opts.ghost);
    var code = (u.tenCode && u.tenCode.code) || '';
    var dv = deptVisual(u.deptTemplate);
    // Badges for every department template the user is a member of.
    // Active template always shown (highlighted); rest capped so many-dept
    // users don't overflow the chip — overflow collapses to a +N pill with
    // the hidden dept names in its tooltip.
    // Only surface field templates (police / fire / ems). Civilian, judicial,
    // and dispatch aren't meaningful on the chip since dispatch doesn't route
    // calls to them.
    var tmpls = (u.deptTemplates || []).filter(function (t) {
      var k = String(t.key || '').toLowerCase();
      return k === 'police' || k === 'fire' || k === 'ems';
    });
    // On a dedicated third line the chip can fit ~8 badges before the +N
    // would push past the kebab. Cap at 6 to leave breathing room.
    var BADGE_CAP = 6;
    // Pin the active template first so it's always visible when we cap.
    tmpls.sort(function (a, b) {
      var aActive = a.key === u.deptKey ? 0 : 1;
      var bActive = b.key === u.deptKey ? 0 : 1;
      return aActive - bActive;
    });
    var visible = tmpls.slice(0, BADGE_CAP);
    var hidden = tmpls.slice(BADGE_CAP);
    var deptBadges = '';
    for (var i = 0; i < visible.length; i++) {
      var tb = visible[i];
      var tv = deptVisual(tb.template);
      var isActive = tb.key === u.deptKey;
      deptBadges += (
        '<span class="cd-unit-chip-badge' + (isActive ? ' is-active' : '') + '" style="--cd-dept-color:' + esc(tv.color) + ';" title="' + esc(tv.label) + (isActive ? ' (active)' : '') + '" aria-label="' + esc(tv.label) + '">' +
          '<i class="fa ' + esc(tv.icon) + '"></i>' +
        '</span>'
      );
    }
    if (hidden.length) {
      var hiddenLabels = hidden.map(function (h) { return deptVisual(h.template).label; }).join(', ');
      deptBadges += (
        '<span class="cd-unit-chip-badge cd-unit-chip-badge-more" title="Also in: ' + esc(hiddenLabels) + '" aria-label="Also in ' + esc(hiddenLabels) + '">' +
          '+' + hidden.length +
        '</span>'
      );
    }
    // Ghosts: show an explicit OFF-DUTY pill in place of the ten-code
    // badge — dispatchers don't care about the live code (it's stale by
    // definition), they care that the unit is unavailable.
    var statusBadge = ghost
      ? '<span class="cd-unit-chip-code cd-unit-chip-code-ghost">' + esc(code || 'OFF-DUTY') + '</span>'
      : (code ? '<span class="cd-unit-chip-code">' + esc(code) + '</span>' : '');

    var rootClass = 'cd-unit-chip' + (ghost ? ' is-ghost' : '');
    // draggable=false on the root + Sortable.js's filter selector (.is-ghost)
    // wired in cd-dispatch-dnd will keep ghosts out of drag operations.
    var dragAttr = ghost ? ' draggable="false"' : '';
    var ariaSuffix = ghost ? ' off-duty' : '';
    return (
      '<div class="' + rootClass + '" data-user-id="' + esc(u.id) + '" data-tone="' + esc(u.tone) + '" data-dept="' + esc(u.deptKey) + '"' + (ghost ? ' data-ghost="1"' : '') + dragAttr + ' tabindex="0" role="listitem" aria-label="' + esc((u.callSign || u.username) + ' ' + dv.label + (code ? ' ' + code : '') + ariaSuffix) + '" style="--cd-dept-color:' + esc(dv.color) + ';">' +
        '<div class="cd-unit-chip-avatar" aria-hidden="true">' +
          '<i class="fa ' + esc(dv.icon) + '" title="' + esc(dv.label) + '"></i>' +
        '</div>' +
        '<div class="cd-unit-chip-main">' +
          '<div class="cd-unit-chip-top">' +
            '<span class="cd-unit-chip-dot" data-tone="' + (ghost ? 'ghost' : esc(u.tone)) + '" aria-hidden="true"></span>' +
            '<span class="cd-unit-chip-callsign">' + esc(u.callSign || '—') + '</span>' +
            statusBadge +
          '</div>' +
          '<div class="cd-unit-chip-sub">' +
            '<span class="cd-unit-chip-name">' + esc(u.username) + '</span>' +
            (u.deptName ? '<span class="cd-unit-chip-dept">' + esc(u.deptName) + '</span>' : '') +
          '</div>' +
          (deptBadges ? '<div class="cd-unit-chip-badges">' + deptBadges + '</div>' : '') +
        '</div>' +
        // Ghosts hide the kebab — there's no assign action when the unit
        // isn't on duty. Click-through opens the unit console instead.
        (ghost ? '' :
          '<button type="button" class="cd-unit-chip-menu" data-user-id="' + esc(u.id) + '" aria-label="Unit actions for ' + esc(u.callSign || u.username) + '" title="Unit actions…">' +
            '<i class="fa fa-ellipsis-vertical"></i>' +
          '</button>') +
      '</div>'
    );
  }

  function applyFilters(units) {
    var online = [];
    var offline = [];
    var q = state.search.toLowerCase();
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var off = isOffDuty(u);

      // Dept + status filter pills always apply, to both buckets — a
      // dispatcher who's filtered to Police shouldn't see Fire ghosts.
      if (state.deptFilter.size > 0) {
        var matchesDept = false;
        var dts = u.deptTemplates || [];
        for (var j = 0; j < dts.length; j++) {
          if (state.deptFilter.has(dts[j].key)) { matchesDept = true; break; }
        }
        if (!matchesDept) continue;
      }

      // Status filter (Avail/Busy/Other) applies only to the on-duty
      // bucket — off-duty units have no meaningful tone to match against.
      if (!off && state.statusFilter !== 'all' && u.tone !== state.statusFilter) continue;

      // Search filter applies to both buckets.
      if (q) {
        var hay = (u.callSign + ' ' + u.username + ' ' + (u.deptName || '')).toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }

      if (off) offline.push(u);
      else online.push(u);
    }
    // Off-duty bucket: same-dept first (matches the active dept filter
    // when one is set), then alphabetical by callsign/username.
    offline.sort(function (a, b) {
      var an = (a.callSign || a.username || '').toLowerCase();
      var bn = (b.callSign || b.username || '').toLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
    return { online: online, offline: offline };
  }

  // ── Events ────────────────────────────────────────

  function wireEvents() {
    // Namespaced delegated handlers so repeated init calls don't stack listeners
    $(document)
      .off('.cdDispatchRoster')
      .on('input.cdDispatchRoster', '#cd-roster-search-input', function () {
        state.search = String(this.value || '').trim();
        // Re-cap ghost results when the query changes — old "Show all"
        // shouldn't carry over to a different search term.
        state.ghostExpanded = false;
        render();
      })
      .on('click.cdDispatchRoster', '.cd-roster-pill', function () {
        var $pill = $(this);
        var group = $pill.data('group');
        var value = $pill.data('filter');
        if (group === 'dept') {
          // "All" clears every selected template (empty Set means show all).
          // Other pills toggle their template key in the Set, so dispatchers
          // can show, e.g., Police + Fire together while hiding EMS.
          if (value === 'all') {
            state.deptFilter.clear();
          } else if (state.deptFilter.has(value)) {
            state.deptFilter.delete(value);
          } else {
            state.deptFilter.add(value);
          }
        } else {
          state.statusFilter = value;
        }
        render();
      })
      // Kebab opens the Unit Console directly on the Assign tab — quick
      // dispatch action without needing to find a 10-code first.
      .on('click.cdDispatchRoster', '.cd-unit-chip-menu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var userId = $(this).data('user-id');
        openUnitConsole(userId, 'assign');
      })
      // Clicking the chip body opens the Unit Console on the Set Status
      // tab (the most common dispatcher action). Drag-and-drop still works —
      // Sortable.js delays the drag-start enough to distinguish click vs drag.
      .on('click.cdDispatchRoster', '.cd-unit-chip', function (e) {
        if ($(e.target).closest('.cd-unit-chip-menu').length) return;
        var userId = $(this).data('user-id');
        openUnitConsole(userId, 'status');
      })
      .on('keydown.cdDispatchRoster', '.cd-unit-chip', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var userId = $(this).data('user-id');
          openUnitConsole(userId, 'status');
        }
      })
      // "+ N more off-duty" expands the ghost cap so dispatchers can see
      // every match without opening a separate view.
      .on('click.cdDispatchRoster', '[data-action="ghost-show-all"]', function () {
        state.ghostExpanded = true;
        render();
      });
  }

  function openUnitConsole(userId, tab) {
    if (typeof window.cdDispatchUnitConsoleOpen === 'function') {
      window.cdDispatchUnitConsoleOpen(userId, tab);
    } else {
      toast('Unit console unavailable.', 'error');
    }
  }

  // ── Styles (scoped to the roster) ─────────────────

  function injectStyles() {
    if (document.getElementById('cd-dispatch-roster-styles')) return;
    var css = [
      // Sticky controls: use the bridge body background (SOLID) not --cd-glass,
      // so scrolled unit chips don't bleed through the search + filter pills.
      '.cd-roster-controls{display:flex;flex-direction:column;gap:0.5rem;padding:0.75rem 0 0.625rem;border-bottom:1px solid var(--cd-glass-border);margin:-0.75rem -0.75rem 0.625rem;padding-left:0.75rem;padding-right:0.75rem;position:sticky;top:-0.75rem;background:var(--cd-bg);z-index:3;box-shadow:0 4px 12px -6px rgba(0,0,0,0.5);}',
      '.cd-roster-search{display:flex;align-items:center;gap:0.5rem;padding:0.375rem 0.625rem;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--cd-glass-border);}',
      '.cd-roster-search i{color:var(--cd-text-dim);font-size:0.75rem;}',
      '.cd-roster-search input{flex:1;background:transparent;border:0;outline:0;color:var(--cd-text);font-family:inherit;font-size:0.8125rem;min-width:0;}',
      '.cd-roster-search input::placeholder{color:var(--cd-text-dim);}',
      '.cd-roster-pills{display:flex;gap:0.25rem;flex-wrap:wrap;min-width:0;}',
      '.cd-roster-pill{flex:1 1 auto;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:0.25rem;padding:0.3125rem 0.4375rem;border-radius:6px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text-dim);font:600 0.625rem/1 inherit;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.cd-roster-pill i{font-size:0.6875rem;flex-shrink:0;}',
      '.cd-roster-pill span{min-width:0;overflow:hidden;text-overflow:ellipsis;}',
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
      '.cd-unit-chip-sub{display:flex;align-items:center;gap:0.375rem;font-size:0.6875rem;color:var(--cd-text-dim);min-width:0;overflow:hidden;}',
      '.cd-unit-chip-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1 1 auto;}',
      '.cd-unit-chip-dept{padding:0.0625rem 0.375rem;border-radius:4px;background:rgba(255,255,255,0.02);color:var(--cd-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto;max-width:10rem;}',
      '.cd-unit-chip-badges{margin-top:0.25rem;display:flex;gap:0.1875rem;align-items:center;flex-wrap:nowrap;overflow:hidden;min-width:0;}',
      '.cd-unit-chip-badge{width:16px;height:16px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--cd-dept-color) 10%,transparent);border:1px solid color-mix(in srgb,var(--cd-dept-color) 24%,transparent);color:var(--cd-dept-color);font-size:0.5625rem;opacity:0.75;}',
      '.cd-unit-chip-badge.is-active{opacity:1;border-color:color-mix(in srgb,var(--cd-dept-color) 48%,transparent);background:color-mix(in srgb,var(--cd-dept-color) 18%,transparent);}',
      '.cd-unit-chip-badge.cd-unit-chip-badge-more{width:auto;min-width:18px;padding:0 0.3125rem;font:700 0.5625rem/1.15 "JetBrains Mono",ui-monospace,monospace;background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);color:var(--cd-text-muted);opacity:1;letter-spacing:0.02em;}',
      '.cd-unit-chip-badge.cd-unit-chip-badge-more:hover{background:rgba(255,255,255,0.09);color:var(--cd-text);}',
      '.cd-unit-chip-menu{flex-shrink:0;width:24px;height:24px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}',
      '.cd-unit-chip-menu:hover,.cd-unit-chip-menu:focus-visible{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text);outline:none;}',
      '.cd-unit-unassign-drop{margin-top:0.625rem;padding:0.625rem;border:1px dashed var(--cd-glass-border);border-radius:10px;color:var(--cd-text-dim);font-size:0.75rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:all .15s;}',
      '.cd-unit-unassign-drop.drop-target{border-color:rgba(239,68,68,0.4);color:#fca5a5;background:rgba(239,68,68,0.06);}',
      // Off-duty ghost section: muted divider, dimmed/dashed cards, no
      // drag affordance. Dispatchers can still tap to open the unit
      // console (status tab) and nudge them to come on duty.
      '.cd-roster-section-divider{display:flex;align-items:center;gap:0.5rem;margin:0.625rem 0 0.375rem;}',
      '.cd-roster-section-divider::before,.cd-roster-section-divider::after{content:"";flex:1 1 auto;height:1px;background:var(--cd-glass-border);}',
      '.cd-roster-section-divider-label{font:700 0.625rem/1 inherit;letter-spacing:0.08em;text-transform:uppercase;color:var(--cd-text-dim);}',
      '.cd-unit-chip.is-ghost{opacity:0.55;border-style:dashed;cursor:pointer;background:rgba(255,255,255,0.015);}',
      '.cd-unit-chip.is-ghost:hover{opacity:0.85;border-color:rgba(255,255,255,0.18);background:rgba(255,255,255,0.03);}',
      '.cd-unit-chip.is-ghost .cd-unit-chip-avatar{filter:grayscale(1);background:rgba(255,255,255,0.04);border-color:var(--cd-glass-border);color:var(--cd-text-dim);}',
      '.cd-unit-chip.is-ghost .cd-unit-chip-dot[data-tone="ghost"]{background:var(--cd-text-dim);box-shadow:none;}',
      '.cd-unit-chip-code-ghost{background:rgba(255,255,255,0.03);color:var(--cd-text-dim);border-color:var(--cd-glass-border);}',
      '.cd-roster-ghost-more{margin-top:0.25rem;padding:0.4375rem 0.625rem;border-radius:8px;border:1px dashed var(--cd-glass-border);color:var(--cd-text-dim);font-size:0.6875rem;text-align:center;cursor:pointer;transition:all .15s;}',
      '.cd-roster-ghost-more:hover{color:var(--cd-text);background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.14);}',
      '.cd-roster-ghost-foot{margin-top:0.375rem;font-size:0.625rem;color:var(--cd-text-dim);text-align:center;line-height:1.3;}',
      '@keyframes cd-dispatch-pulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.2);}50%{box-shadow:0 0 0 6px rgba(239,68,68,0.08);}}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dispatch-roster-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
