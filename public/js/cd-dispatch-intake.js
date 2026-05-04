/**
 * Command Dashboard — Dispatch Call Intake Modal
 *
 * Fullscreen overlay for creating or editing a call.
 *
 *   cdDispatchIntakeOpen('create')
 *   cdDispatchIntakeOpen('edit', callId)
 *
 * POST  /api/v1/calls
 * PUT   /api/v1/call/{callId}
 *
 * The classifier field on the Call model is []interface{}. We store a single
 * object entry { priority, label } so the board can derive the priority lane
 * and the detail pane can render a human label. Backwards compatible with
 * legacy string classifiers (board.normalize handles both shapes).
 */
;(function () {
  'use strict';

  function cfg()  { return window.ddConfig || {}; }
  function api()  { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }

  var state = {
    mode: 'create',   // create | edit
    callId: null,
    call: null,       // existing call details for edit mode
    priority: '2',    // default P2
    assignedIds: [],
    departmentIds: [],// routed departments (shows call on those dept dashboards)
    pickerSearch: '', // filter query for the roster picker
    deptSearch: '',   // filter query for the department picker
  };

  var PRIORITIES = [
    { key: '1', label: 'P1 · High',    accent: 'var(--cd-red)',    hint: 'Life-safety, in-progress' },
    { key: '2', label: 'P2 · Medium',  accent: 'var(--cd-amber)',  hint: 'Urgent, not in progress' },
    { key: '3', label: 'P3 · Low',     accent: 'var(--cd-accent)', hint: 'Routine, cold report' },
  ];

  window.cdDispatchIntakeOpen = function (mode, callId) {
    state.mode = mode === 'edit' ? 'edit' : 'create';
    state.callId = callId || null;
    state.call = null;
    state.priority = '2';
    state.assignedIds = [];
    state.departmentIds = [];
    state.deptSearch = '';

    injectStyles();
    openOverlay();
    // Make sure the community departments cache is populated so the dept
    // picker has data to render — no-op if already loaded.
    if (typeof window.cdDispatchEnsureCommunityDepts === 'function') {
      window.cdDispatchEnsureCommunityDepts(function () {
        // If the modal is already open rendering a form, re-render the dept
        // picker section to show the freshly-loaded options.
        if ($('#cd-intake-dept-picker').length) renderDepartmentsField();
      });
    }
    // Re-render dept pills when the community-depts cache (re)loads — without
    // this, departments that finish fetching after the modal opens stay stuck
    // on their placeholder label.
    $(document)
      .off('.cdDispatchIntake')
      .on('cdDispatch:communityDeptsLoaded.cdDispatchIntake', function () {
        if ($('#cd-intake-dept-picker').length) renderDepartmentsField();
      });
    if (state.mode === 'edit' && callId) {
      // Try to read from the detail state first (already fetched), else GET
      var fromDetail = window.__cdDispatchDetailState && window.__cdDispatchDetailState.callId === callId
        ? window.__cdDispatchDetailState.call
        : null;
      if (fromDetail) {
        state.call = fromDetail;
        state.priority = readPriority(fromDetail);
        state.assignedIds = (fromDetail.assignedTo || []).slice();
        state.departmentIds = (fromDetail.departments || []).slice();
        renderForm();
      } else {
        renderLoading();
        $.ajax({
          url: api() + '/api/v1/call/' + encodeURIComponent(callId),
          method: 'GET',
        }).done(function (resp) {
          var c = resp && (resp.call || resp);
          if (c && c.call) c = c.call;
          state.call = c;
          state.priority = readPriority(c);
          state.assignedIds = (c.assignedTo || []).slice();
          state.departmentIds = ((c && c.departments) || []).slice();
          renderForm();
        }).fail(function () {
          toast('Failed to load call', 'error');
          closeOverlay();
        });
      }
    } else {
      // Default create-mode to the dispatcher's own department so the call
      // shows up on their dashboard immediately. They can add/remove from
      // the picker before dispatching.
      var defaultDept = cfg().departmentId;
      if (defaultDept) state.departmentIds = [defaultDept];
      renderForm();
    }
  };

  window.cdDispatchIntakeClose = function () { closeOverlay(); };

  function readPriority(c) {
    if (!c || !c.classifier || !c.classifier.length) return '2';
    var entry = c.classifier[0];
    // Server can return primitive.D `[{Key:"priority",Value:"2"},...]` — flatten.
    if (Array.isArray(entry)) {
      var flat = {};
      for (var k = 0; k < entry.length; k++) {
        var kv = entry[k];
        if (kv && typeof kv === 'object' && 'Key' in kv) flat[kv.Key] = kv.Value;
      }
      entry = flat;
    }
    if (typeof entry === 'object' && entry && entry.priority != null) return String(entry.priority);
    var s = String(typeof entry === 'string' ? entry : (entry && (entry.label || entry.name)) || '');
    var m = s.match(/p\s*(\d)/i);
    return m ? m[1] : '2';
  }

  // ── Overlay ───────────────────────────────────────

  function openOverlay() {
    if ($('#cd-intake-overlay').length) return;
    var $ov = $(
      '<div id="cd-intake-overlay" role="dialog" aria-modal="true" aria-labelledby="cd-intake-title">' +
        '<div class="cd-intake-backdrop"></div>' +
        '<div class="cd-intake-panel">' +
          '<header class="cd-intake-head">' +
            '<h2 id="cd-intake-title" class="cd-intake-title"></h2>' +
            '<button type="button" class="cd-intake-close" aria-label="Close"><i class="fa fa-xmark"></i></button>' +
          '</header>' +
          '<div class="cd-intake-body"></div>' +
        '</div>' +
      '</div>'
    );
    $ov.find('.cd-intake-close,.cd-intake-backdrop').on('click', closeOverlay);
    $(document).on('keydown.cdIntake', function (e) { if (e.key === 'Escape') closeOverlay(); });
    $('body').append($ov);
    // next frame to enable CSS transition
    requestAnimationFrame(function () { $ov.addClass('is-open'); });
  }

  function closeOverlay() {
    var $ov = $('#cd-intake-overlay');
    if (!$ov.length) return;
    $ov.removeClass('is-open');
    $(document).off('keydown.cdIntake');
    $(document).off('.cdDispatchIntake');
    setTimeout(function () { $ov.remove(); }, 200);
  }

  function renderLoading() {
    $('#cd-intake-title').text('Loading…');
    $('.cd-intake-body').html('<div class="cd-dispatch-placeholder"><i class="fa fa-circle-notch fa-spin"></i></div>');
  }

  function renderForm() {
    var editing = state.mode === 'edit';
    var c = state.call || {};
    $('#cd-intake-title').text(editing ? 'Edit Call' : 'New Call');

    var priorityPills = PRIORITIES.map(function (p) {
      var active = state.priority === p.key;
      return (
        '<button type="button" class="cd-intake-priority-pill' + (active ? ' is-active' : '') + '" data-priority="' + esc(p.key) + '" style="--cd-pri-accent:' + esc(p.accent) + ';" title="' + esc(p.hint) + '">' +
          '<span class="cd-intake-priority-pip"></span>' +
          '<span>' + esc(p.label) + '</span>' +
        '</button>'
      );
    }).join('');

    $('.cd-intake-body').html(
      '<form id="cd-intake-form" class="cd-intake-form" autocomplete="off">' +
        '<label class="cd-intake-field">' +
          '<span>Title <em>*</em></span>' +
          '<input type="text" id="cd-intake-title-input" maxlength="200" required placeholder="e.g. MVA with injuries at I-90 mp 5" value="' + esc(c.title || '') + '">' +
        '</label>' +

        '<div class="cd-intake-field">' +
          '<span>Priority</span>' +
          '<div class="cd-intake-priority-grid">' + priorityPills + '</div>' +
        '</div>' +

        '<label class="cd-intake-field">' +
          '<span>Details</span>' +
          '<textarea id="cd-intake-details" rows="4" maxlength="4000" placeholder="Location, number of subjects, weapon involved, callback number…">' + esc(c.details || '') + '</textarea>' +
        '</label>' +

        '<div class="cd-intake-field">' +
          '<span>Departments <em class="cd-intake-field-hint">Calls show on each selected dept\'s dashboard</em></span>' +
          '<div id="cd-intake-dept-chosen" class="cd-intake-assigned"></div>' +
          '<div id="cd-intake-dept-picker" class="cd-intake-unit-picker"></div>' +
        '</div>' +

        '<div class="cd-intake-field">' +
          '<span>Assigned Units</span>' +
          '<div id="cd-intake-assigned" class="cd-intake-assigned"></div>' +
          '<div id="cd-intake-unit-picker" class="cd-intake-unit-picker"></div>' +
        '</div>' +

        '<footer class="cd-intake-footer">' +
          '<button type="button" class="cd-detail-btn-ghost" id="cd-intake-cancel">Cancel</button>' +
          '<button type="submit" class="cd-detail-btn-primary" id="cd-intake-save">' +
            '<i class="fa fa-' + (editing ? 'check' : 'radio') + '"></i> ' + (editing ? 'Save changes' : 'Dispatch call') +
          '</button>' +
        '</footer>' +
      '</form>'
    );

    renderAssignedPicker();
    renderDepartmentsField();
    wireForm();

    // Focus title on create
    if (!editing) setTimeout(function () { $('#cd-intake-title-input').focus(); }, 50);
  }

  function renderDepartmentsField() {
    var $chosen = $('#cd-intake-dept-chosen');
    var $picker = $('#cd-intake-dept-picker');
    if (!$chosen.length) return;

    var all = (typeof window.cdDispatchGetCommunityDepts === 'function') ? window.cdDispatchGetCommunityDepts() : [];
    var byId = {};
    all.forEach(function (d) { byId[d._id] = d; });
    // If the cache hasn't been populated yet, an ID we can't resolve might
    // still arrive in a later fetch — show "Loading…". Once the cache is
    // populated, an unresolved ID means the department was deleted.
    var cacheReady = all.length > 0;

    // Chosen pills — render even if dept isn't yet in cache (edit-mode may
    // open before fetch completes; we show the id as a fallback).
    if (!state.departmentIds.length) {
      $chosen.html('<span class="cd-detail-empty-inline">No departments — call routes to all dashboards.</span>');
    } else {
      $chosen.html(state.departmentIds.map(function (did) {
        var d = byId[did];
        var tpl = d && d.template && d.template.name ? String(d.template.name).toLowerCase() : '';
        var dv = (typeof window.cdDispatchDeptVisual === 'function') ? window.cdDispatchDeptVisual(tpl) : { icon: 'fa-building', color: 'var(--cd-accent)' };
        var label = d ? (d.name || '—') : (cacheReady ? 'Unknown department' : 'Loading…');
        var missing = !d && cacheReady;
        return (
          '<span class="cd-assigned-pill cd-intake-dept-pill' + (missing ? ' is-missing' : '') + '" data-intake-dept-remove="' + esc(did) + '" style="--cd-dept-color:' + esc(dv.color) + ';" title="Remove ' + esc(label) + '">' +
            '<i class="fa ' + esc(missing ? 'fa-triangle-exclamation' : dv.icon) + '" aria-hidden="true"></i>' +
            '<span class="cd-assigned-pill-label">' + esc(label) + '</span>' +
            '<i class="fa fa-xmark cd-assigned-pill-remove-icon" aria-hidden="true"></i>' +
          '</span>'
        );
      }).join(''));
    }

    // Loading placeholder while the cache fetch is in flight
    if (!all.length) {
      $picker.html('<span class="cd-detail-empty-inline"><i class="fa fa-circle-notch fa-spin"></i> Loading community departments…</span>');
      return;
    }

    // Available = everything not already selected
    var available = all.filter(function (d) { return state.departmentIds.indexOf(d._id) === -1; });
    if (!available.length) {
      $picker.html('<span class="cd-detail-empty-inline">All eligible departments already selected.</span>');
      return;
    }

    var q = String(state.deptSearch || '').toLowerCase();
    var filtered = !q ? available : available.filter(function (d) {
      return String(d.name || '').toLowerCase().indexOf(q) !== -1;
    });

    $picker.html(
      '<div class="cd-intake-picker-head">' +
        '<label class="cd-intake-picker-search">' +
          '<i class="fa fa-magnifying-glass"></i>' +
          '<input type="search" id="cd-intake-dept-search-input" placeholder="Filter departments" autocomplete="off" value="' + esc(state.deptSearch) + '">' +
        '</label>' +
        '<span class="cd-intake-picker-count">' + filtered.length + (filtered.length !== available.length ? ' / ' + available.length : '') + '</span>' +
      '</div>' +
      (filtered.length
        ? '<div class="cd-intake-picker-list">' +
            filtered.map(function (d) {
              var tpl = d.template && d.template.name ? String(d.template.name).toLowerCase() : '';
              var dv = (typeof window.cdDispatchDeptVisual === 'function') ? window.cdDispatchDeptVisual(tpl) : { icon: 'fa-building', color: 'var(--cd-accent)' };
              return (
                '<button type="button" class="cd-intake-picker-item" data-intake-dept-add="' + esc(d._id) + '" style="--cd-dept-color:' + esc(dv.color) + ';" title="' + esc(d.name || '') + '">' +
                  '<i class="fa ' + esc(dv.icon) + '"></i>' +
                  '<span>' + esc(d.name || '—') + '</span>' +
                '</button>'
              );
            }).join('') +
          '</div>'
        : '<div class="cd-detail-empty-inline">No departments match your filter.</div>')
    );

    if (state.deptSearch) {
      var el = document.getElementById('cd-intake-dept-search-input');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }

  function renderAssignedPicker() {
    var $chosen = $('#cd-intake-assigned');
    var $picker = $('#cd-intake-unit-picker');
    if (!$chosen.length) return;

    // Chosen pills
    if (!state.assignedIds.length) {
      $chosen.html('<span class="cd-detail-empty-inline">No units selected.</span>');
    } else {
      $chosen.html(state.assignedIds.map(function (uid) {
        // Use the shared pill renderer if available
        if (typeof window.cdRenderAssignedPill === 'function') {
          return window.cdRenderAssignedPill(uid, { removable: false })
            .replace('<span class="cd-assigned-pill ', '<span data-intake-remove="' + esc(uid) + '" class="cd-assigned-pill cd-intake-assigned-pill ');
        }
        return '<span class="cd-assigned-pill" data-intake-remove="' + esc(uid) + '">' + esc(uid) + '</span>';
      }).join(''));
    }

    // Picker: searchable list of roster units
    var rosterUnits = (window.__cdDispatchRosterState && window.__cdDispatchRosterState.units) || [];
    var available = rosterUnits.filter(function (u) { return state.assignedIds.indexOf(u.id) === -1; });
    if (!available.length) {
      $picker.html('<span class="cd-detail-empty-inline">All roster units already selected.</span>');
      return;
    }

    // Apply search filter
    var q = String(state.pickerSearch || '').toLowerCase();
    var filtered = !q ? available : available.filter(function (u) {
      var hay = ((u.callSign || '') + ' ' + (u.username || '') + ' ' + (u.deptName || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    var VISIBLE = 40;
    var head = filtered.slice(0, VISIBLE);
    $picker.html(
      '<div class="cd-intake-picker-head">' +
        '<label class="cd-intake-picker-search">' +
          '<i class="fa fa-magnifying-glass"></i>' +
          '<input type="search" id="cd-intake-picker-search-input" placeholder="Filter units by callsign, name, or department" autocomplete="off" value="' + esc(state.pickerSearch) + '">' +
        '</label>' +
        '<span class="cd-intake-picker-count">' + filtered.length + (filtered.length !== available.length ? ' / ' + available.length : '') + '</span>' +
      '</div>' +
      (head.length
        ? '<div class="cd-intake-picker-list">' +
            head.map(function (u) {
              var dv = (typeof window.cdDispatchDeptVisual === 'function') ? window.cdDispatchDeptVisual(u.deptTemplate) : { icon: 'fa-user', color: 'var(--cd-accent)' };
              return (
                '<button type="button" class="cd-intake-picker-item" data-intake-add="' + esc(u.id) + '" style="--cd-dept-color:' + esc(dv.color) + ';" title="' + esc((u.callSign || u.username) + (u.deptName ? ' · ' + u.deptName : '')) + '">' +
                  '<i class="fa ' + esc(dv.icon) + '"></i>' +
                  '<span>' + esc(u.callSign || u.username) + '</span>' +
                '</button>'
              );
            }).join('') +
          '</div>'
        : '<div class="cd-detail-empty-inline">No units match your filter.</div>') +
      (filtered.length > VISIBLE ? '<span class="cd-detail-empty-inline">+' + (filtered.length - VISIBLE) + ' more — refine the filter to narrow results.</span>' : '')
    );

    // Re-focus the search input if it was focused before re-render
    if (state.pickerSearch) {
      var el = document.getElementById('cd-intake-picker-search-input');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }

  function wireForm() {
    $('#cd-intake-form').on('submit', function (e) { e.preventDefault(); submit(); });
    $('#cd-intake-cancel').on('click', closeOverlay);

    $('.cd-intake-priority-pill').on('click', function () {
      state.priority = String($(this).data('priority'));
      $('.cd-intake-priority-pill').removeClass('is-active');
      $(this).addClass('is-active');
    });

    $('#cd-intake-assigned').on('click', '[data-intake-remove]', function () {
      var uid = $(this).data('intake-remove');
      state.assignedIds = state.assignedIds.filter(function (id) { return id !== uid; });
      renderAssignedPicker();
    });

    $('#cd-intake-unit-picker').on('click', '[data-intake-add]', function () {
      var uid = $(this).data('intake-add');
      if (state.assignedIds.indexOf(uid) === -1) state.assignedIds.push(uid);
      renderAssignedPicker();
    });

    $('#cd-intake-unit-picker').on('input', '#cd-intake-picker-search-input', function () {
      state.pickerSearch = String(this.value || '').trim();
      renderAssignedPicker();
    });

    $('#cd-intake-dept-chosen').on('click', '[data-intake-dept-remove]', function () {
      var did = $(this).data('intake-dept-remove');
      state.departmentIds = state.departmentIds.filter(function (id) { return id !== did; });
      renderDepartmentsField();
    });

    $('#cd-intake-dept-picker').on('click', '[data-intake-dept-add]', function () {
      var did = $(this).data('intake-dept-add');
      if (state.departmentIds.indexOf(did) === -1) state.departmentIds.push(did);
      state.deptSearch = '';
      renderDepartmentsField();
    });

    $('#cd-intake-dept-picker').on('input', '#cd-intake-dept-search-input', function () {
      state.deptSearch = String(this.value || '').trim();
      renderDepartmentsField();
    });
  }

  function submit() {
    var title = String($('#cd-intake-title-input').val() || '').trim();
    if (!title) { toast('Title is required', 'error'); return; }
    var details = String($('#cd-intake-details').val() || '').trim();

    // Classifier is a []interface{} on the backend; we stash the priority
    // here so the board can derive lane placement. No separate classifier
    // label is surfaced in the UI anymore — priority is the single meaningful
    // signal from intake. Legacy string classifiers are still rendered
    // read-only on the call card if present.
    var classifier = [{
      priority: state.priority,
      label: 'P' + state.priority,
    }];

    // Smart routing: assigned units automatically contribute their active
    // department to the call's departments list. The dispatcher's explicit
    // picks stay authoritative — we only ADD from units, never remove.
    var mergedDepts = state.departmentIds.slice();
    if (typeof window.cdDispatchRosterGetUnit === 'function') {
      state.assignedIds.forEach(function (uid) {
        var u = window.cdDispatchRosterGetUnit(uid);
        if (!u || !u.activeDepartmentId) return;
        var tmpl = String(u.deptTemplate || '').toLowerCase();
        if (tmpl === 'civilian' || tmpl === 'judicial' || tmpl === 'dispatch') return;
        if (mergedDepts.indexOf(u.activeDepartmentId) === -1) mergedDepts.push(u.activeDepartmentId);
      });
    }

    var body = {
      title: title,
      details: details,
      classifier: classifier,
      assignedTo: state.assignedIds.slice(),
      departments: mergedDepts,
    };

    if (state.mode === 'create') {
      var dbUser = cfg().dbUser || {};
      var me = dbUser.user || {};
      body.status = true;
      body.communityId = cfg().communityId;
      body.createdByID = me._id || cfg().userId;
      body.createdByUsername = me.username || cfg().userName || '';
      body.callNotes = [];
      $.ajax({
        url: api() + '/api/v1/calls',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(body),
      }).done(function (resp) {
        toast('Call dispatched', 'success');
        closeOverlay();
        if (typeof window.cdDispatchBoardRefresh === 'function') window.cdDispatchBoardRefresh();
        var newId = resp && (resp._id || (resp.call && resp.call._id));
        if (newId && typeof window.cdDispatchDetailSelect === 'function') {
          setTimeout(function () { window.cdDispatchDetailSelect(newId); }, 150);
        }
      }).fail(function (xhr) {
        toast('Failed to create call', 'error');
        console.error('[cd-dispatch-intake] create failed', xhr && xhr.responseText);
      });
    } else {
      $.ajax({
        url: api() + '/api/v1/call/' + encodeURIComponent(state.callId),
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(body),
      }).done(function () {
        toast('Call updated', 'success');
        closeOverlay();
        if (typeof window.cdDispatchDetailSelect === 'function') window.cdDispatchDetailSelect(state.callId);
        if (typeof window.cdDispatchBoardRefresh === 'function') window.cdDispatchBoardRefresh();
      }).fail(function (xhr) {
        toast('Failed to update call', 'error');
        console.error('[cd-dispatch-intake] update failed', xhr && xhr.responseText);
      });
    }
  }

  // ── Styles ────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('cd-dispatch-intake-styles')) return;
    var css = [
      '#cd-intake-overlay{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem;}',
      '.cd-intake-backdrop{position:absolute;inset:0;background:rgba(3,7,18,0.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;transition:opacity .2s;}',
      '#cd-intake-overlay.is-open .cd-intake-backdrop{opacity:1;}',
      '.cd-intake-panel{position:relative;width:min(560px,100%);max-height:90vh;display:flex;flex-direction:column;background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.05);color:var(--cd-text);opacity:0;transform:translateY(12px);transition:opacity .2s,transform .2s;overflow:hidden;}',
      '#cd-intake-overlay.is-open .cd-intake-panel{opacity:1;transform:none;}',
      '.cd-intake-head{display:flex;align-items:center;padding:0.875rem 1rem;border-bottom:1px solid var(--cd-glass-border);}',
      '.cd-intake-title{margin:0;flex:1;font:600 0.9375rem/1.2 inherit;letter-spacing:0.02em;}',
      '.cd-intake-close{width:28px;height:28px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}',
      '.cd-intake-close:hover{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text);}',
      '.cd-intake-body{flex:1;overflow-y:auto;padding:1rem;}',
      '.cd-intake-form{display:flex;flex-direction:column;gap:0.875rem;}',
      '.cd-intake-field{display:flex;flex-direction:column;gap:0.375rem;}',
      '.cd-intake-field > span{font:700 0.6875rem/1 inherit;letter-spacing:0.1em;text-transform:uppercase;color:var(--cd-text-muted);}',
      '.cd-intake-field > span em{color:var(--cd-red);font-style:normal;}',
      '.cd-intake-field > span em.cd-intake-field-hint{color:var(--cd-text-dim);font-weight:500;font-size:0.625rem;text-transform:none;letter-spacing:0;margin-left:0.5rem;}',
      '.cd-intake-dept-pill{cursor:pointer;}',
      '.cd-intake-dept-pill .cd-assigned-pill-remove-icon{font-size:0.625rem;opacity:0.5;margin-left:0.25rem;}',
      '.cd-intake-dept-pill:hover{box-shadow:inset 0 0 0 9999px rgba(239,68,68,0.08);}',
      '.cd-intake-dept-pill:hover .cd-assigned-pill-remove-icon{opacity:1;}',
      '.cd-intake-dept-pill.is-missing{--cd-dept-color:var(--cd-amber);color:var(--cd-amber);opacity:0.85;}',
      '.cd-intake-field input[type="text"],.cd-intake-field textarea{padding:0.5625rem 0.75rem;border-radius:8px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.03);color:var(--cd-text);font-family:inherit;font-size:0.875rem;line-height:1.4;resize:vertical;}',
      '.cd-intake-field input:focus,.cd-intake-field textarea:focus{outline:none;border-color:rgba(56,189,248,0.5);background:rgba(56,189,248,0.04);}',
      '.cd-intake-priority-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0.375rem;}',
      '.cd-intake-priority-pill{display:flex;align-items:center;gap:0.5rem;padding:0.5625rem 0.75rem;border-radius:8px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text-muted);font:600 0.8125rem/1 inherit;cursor:pointer;transition:all .15s;}',
      '.cd-intake-priority-pill:hover{background:rgba(255,255,255,0.04);color:var(--cd-text);}',
      '.cd-intake-priority-pill.is-active{border-color:color-mix(in srgb,var(--cd-pri-accent) 50%,transparent);background:color-mix(in srgb,var(--cd-pri-accent) 12%,transparent);color:var(--cd-text);}',
      '.cd-intake-priority-pip{width:10px;height:10px;border-radius:999px;background:var(--cd-pri-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cd-pri-accent) 18%,transparent);}',
      '.cd-intake-assigned{display:flex;flex-wrap:wrap;gap:0.375rem;min-height:32px;padding:0.375rem;border-radius:8px;border:1px dashed var(--cd-glass-border);}',
      '.cd-intake-assigned-pill{cursor:pointer;}',
      '.cd-intake-assigned-pill:hover{box-shadow:inset 0 0 0 9999px rgba(239,68,68,0.08);}',
      '.cd-intake-unit-picker{display:flex;flex-direction:column;gap:0.5rem;}',
      '.cd-intake-picker-head{display:flex;align-items:center;gap:0.5rem;}',
      '.cd-intake-picker-search{flex:1;display:flex;align-items:center;gap:0.4375rem;padding:0.375rem 0.625rem;border-radius:8px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.03);}',
      '.cd-intake-picker-search i{color:var(--cd-text-dim);font-size:0.75rem;}',
      '.cd-intake-picker-search input{flex:1;background:transparent;border:0;outline:0;color:var(--cd-text);font-family:inherit;font-size:0.8125rem;min-width:0;}',
      '.cd-intake-picker-search input::placeholder{color:var(--cd-text-dim);}',
      '.cd-intake-picker-count{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:0.6875rem;color:var(--cd-text-dim);}',
      '.cd-intake-picker-list{display:flex;flex-wrap:wrap;gap:0.3125rem;max-height:180px;overflow-y:auto;padding:0.125rem;}',
      '.cd-intake-picker-item{display:inline-flex;align-items:center;gap:0.3125rem;padding:0.25rem 0.5625rem;border-radius:999px;border:1px solid color-mix(in srgb,var(--cd-dept-color) 30%,transparent);background:color-mix(in srgb,var(--cd-dept-color) 8%,transparent);color:var(--cd-dept-color);font:600 0.6875rem/1 "JetBrains Mono",ui-monospace,monospace;cursor:pointer;transition:all .15s;}',
      '.cd-intake-picker-item:hover{background:color-mix(in srgb,var(--cd-dept-color) 16%,transparent);}',
      '.cd-intake-picker-item i{font-size:0.625rem;}',
      '.cd-intake-picker-item span{color:var(--cd-text);font-family:inherit;}',
      '.cd-intake-footer{display:flex;gap:0.4375rem;justify-content:flex-end;padding-top:0.875rem;border-top:1px solid var(--cd-glass-border);}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dispatch-intake-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
