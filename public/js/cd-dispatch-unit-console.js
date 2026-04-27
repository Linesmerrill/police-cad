/**
 * Command Dashboard — Unit Console Modal
 *
 * Central place for all unit-level actions dispatchers can take. Currently
 * has two tabs:
 *   - Set Status  — grid of community 10-codes, click to set
 *                   PUT /api/v1/community/{communityId}/members/{userId}/tenCode
 *   - Assign Call — list of open calls; click toggles assignment (re-uses
 *                   window.cdDispatchAssign / cdDispatchUnassign)
 *
 * Future tabs can slot in (transfer unit, add unit note, kick off-duty, etc.)
 * without changing callers.
 *
 *   window.cdDispatchUnitConsoleOpen(userId, tab)
 *   tab (optional): 'status' | 'assign' — defaults to 'status'
 */
;(function () {
  'use strict';

  function cfg()  { return window.ddConfig || {}; }
  function api()  { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }

  // Community admin check — mirrors the backend's userHasCommunityPermission.
  // The backend accepts the edit if you're the owner OR are in a role that
  // has `administrator` or `manage members` enabled. The `role.admin` bool
  // on lastAccessedCommunity is a denormalized shortcut that isn't set for
  // every admin, so we also walk communityData.roles the way the backend
  // does — otherwise admins-via-role-permissions get incorrectly gated.
  function isCommunityAdmin() {
    var me = (cfg().dbUser && cfg().dbUser._id) || cfg().userId || '';
    if (!me) return false;
    var dbUser = (cfg().dbUser && cfg().dbUser.user) || {};
    var lac = dbUser.lastAccessedCommunity || {};
    if (lac.ownerID && lac.ownerID === me) return true;
    if (lac.role && lac.role.admin === true) return true;
    var community = cfg().communityData || {};
    if (community.ownerID === me) return true;
    var roles = Array.isArray(community.roles) ? community.roles : [];
    for (var i = 0; i < roles.length; i++) {
      var role = roles[i];
      var members = Array.isArray(role.members) ? role.members : [];
      if (members.indexOf(me) === -1) continue;
      var perms = Array.isArray(role.permissions) ? role.permissions : [];
      for (var j = 0; j < perms.length; j++) {
        var p = perms[j] || {};
        if (!p.enabled) continue;
        if (p.name === 'administrator' || p.name === 'manage members') return true;
      }
    }
    return false;
  }

  var state = {
    userId: null,
    unit: null,
    tab: 'status',
    codeSearch: '',
    callSearch: '',
    // If dispatch switches the unit to a different department from the Set
    // Status tab, we stash the target id here until a 10-code commit bundles
    // both changes into a single PUT. Null means "use the unit's current
    // activeDepartmentId" (no change).
    activeDeptOverride: null,
  };

  window.cdDispatchUnitConsoleOpen = function (userId, tab) {
    if (!userId) return;
    state.userId = userId;
    state.tab = tab || 'status';
    state.codeSearch = '';
    state.callSearch = '';
    state.activeDeptOverride = null;
    state.unit = (typeof window.cdDispatchRosterGetUnit === 'function') ? window.cdDispatchRosterGetUnit(userId) : null;
    injectStyles();
    openOverlay();
    render();
  };

  window.cdDispatchUnitConsoleClose = function () { closeOverlay(); };

  // ── Overlay ───────────────────────────────────────

  function openOverlay() {
    if ($('#cd-unit-console-overlay').length) return;
    var $ov = $(
      '<div id="cd-unit-console-overlay" role="dialog" aria-modal="true" aria-labelledby="cd-unit-console-title">' +
        '<div class="cd-unit-console-backdrop"></div>' +
        '<div class="cd-unit-console-panel">' +
          '<header class="cd-unit-console-head">' +
            '<div class="cd-unit-console-identity" id="cd-unit-console-identity"></div>' +
            '<button type="button" class="cd-unit-console-close" aria-label="Close"><i class="fa fa-xmark"></i></button>' +
          '</header>' +
          '<nav class="cd-unit-console-tabs" role="tablist">' +
            '<button type="button" class="cd-unit-console-tab" data-tab="status" role="tab"><i class="fa fa-broadcast-tower"></i> Set Status</button>' +
            '<button type="button" class="cd-unit-console-tab" data-tab="assign" role="tab"><i class="fa fa-radio"></i> Assign to Call</button>' +
          '</nav>' +
          '<div class="cd-unit-console-body" id="cd-unit-console-body"></div>' +
        '</div>' +
      '</div>'
    );
    $ov.find('.cd-unit-console-close,.cd-unit-console-backdrop').on('click', closeOverlay);
    $ov.find('.cd-unit-console-tab').on('click', function () {
      state.tab = $(this).data('tab');
      render();
    });
    // Delegated because the identity block is re-rendered on each tab switch.
    $ov.on('click', '.cd-unit-console-callsign-edit', function () {
      if ($(this).attr('data-admin') === '1') openCallsignEditor();
      else showCallsignPermissionModal();
    });
    $(document).on('keydown.cdUnitConsole', function (e) { if (e.key === 'Escape') closeOverlay(); });
    $('body').append($ov);
    requestAnimationFrame(function () { $ov.addClass('is-open'); });
  }

  function closeOverlay() {
    var $ov = $('#cd-unit-console-overlay');
    if (!$ov.length) return;
    $ov.removeClass('is-open');
    $(document).off('keydown.cdUnitConsole');
    setTimeout(function () { $ov.remove(); }, 200);
  }

  // ── Callsign editor (admin-only) ──────────────────

  function showCallsignPermissionModal() {
    if (!window.ddModal) { toast('Admin permission required to edit callsigns', 'info'); return; }
    window.ddModal({
      type: 'info',
      icon: 'fa-lock',
      title: 'Admin permission required',
      message: 'Only community owners and administrators can edit another member\'s callsign. Ask an admin in your community to change this unit\'s callsign for you.',
      buttons: [{ label: 'OK', class: 'dd-modal-btn-primary' }],
    });
  }

  function isEligibleTemplate(tpl) {
    var t = String(tpl || '').toLowerCase();
    return t !== 'civilian' && t !== 'judicial' && t !== 'dispatch';
  }

  // Eligible memberships — field depts (not civilian/judicial/dispatch) the
  // unit is actually in.
  function eligibleMemberships(u) {
    var all = (u && Array.isArray(u.departments)) ? u.departments : [];
    return all.filter(function (d) { return isEligibleTemplate(d && d.template); });
  }

  // Public eligible depts the unit is NOT a member of. Used as a fallback
  // tier when the unit has no eligible memberships — admins may still want
  // to stage a dept-scoped callsign ahead of them joining.
  function publicNonMemberDepartments(u) {
    var memberIds = {};
    var memberships = (u && Array.isArray(u.departments)) ? u.departments : [];
    memberships.forEach(function (d) { if (d && d.id) memberIds[d.id] = true; });
    var all = (typeof window.cdDispatchGetCommunityDepts === 'function') ? window.cdDispatchGetCommunityDepts() : [];
    return all.filter(function (d) {
      if (!d || memberIds[d._id]) return false;
      if (d.approvalRequired) return false;
      var tpl = (d.template && d.template.name) || '';
      return isEligibleTemplate(tpl);
    });
  }

  function openCallsignEditor() {
    var u = state.unit;
    if (!u) return;

    // Fast path: active dept is an eligible membership → edit that directly.
    var memberships = eligibleMemberships(u);
    for (var i = 0; i < memberships.length; i++) {
      if (memberships[i].id === u.activeDepartmentId) {
        renderCallsignEditor(memberships[i].id, 'dept');
        return;
      }
    }

    // Otherwise figure out what tiers are available.
    var publics = publicNonMemberDepartments(u);
    var totalOptions = memberships.length + publics.length + 1; // +1 = global

    // No depts anywhere that this user can be scoped to → skip the picker
    // and jump straight to global callsign edit.
    if (memberships.length === 0 && publics.length === 0) {
      renderCallsignEditor(null, 'global');
      return;
    }
    // Exactly one eligible membership + no publics → straight to that dept.
    if (memberships.length === 1 && publics.length === 0) {
      renderCallsignEditor(memberships[0].id, 'dept');
      return;
    }
    // Multiple options — show the picker so the admin picks explicitly.
    openCallsignScopePicker(memberships, publics);
  }

  function openCallsignScopePicker(memberships, publics) {
    if (!window.ddModal) { toast('Modal helper missing', 'error'); return; }
    var u = state.unit;
    function renderOptionRow(d, tier) {
      var tpl = String((d.template && d.template.name) || d.template || '').toLowerCase();
      var dv = (typeof window.cdDispatchDeptVisual === 'function') ? window.cdDispatchDeptVisual(tpl) : { icon: 'fa-building', color: 'var(--cd-accent)' };
      var id = d._id || d.id;
      var existing = (u && u.departmentCallSigns && u.departmentCallSigns[id]) || '';
      var tagHtml = existing
        ? '<span class="cd-dnd-picker-tag cd-dnd-picker-tag-on">' + esc(existing) + '</span>'
        : '<span class="cd-dnd-picker-tag">No override</span>';
      return (
        '<button type="button" class="cd-dnd-picker-item cd-callsign-scope-pick" data-scope="' + esc(tier) + '" data-dept-id="' + esc(id) + '" style="--cd-dept-color:' + esc(dv.color) + ';">' +
          '<i class="fa ' + esc(dv.icon) + '" style="color:var(--cd-dept-color);"></i>' +
          '<span class="cd-dnd-picker-title">' + esc(d.name || tpl) + '</span>' +
          tagHtml +
        '</button>'
      );
    }
    var sections = '';
    if (memberships.length) {
      sections += (
        '<div class="cd-callsign-scope-section">' +
          '<div class="cd-callsign-scope-label">Their departments</div>' +
          memberships.map(function (d) { return renderOptionRow(d, 'dept'); }).join('') +
        '</div>'
      );
    }
    if (publics.length) {
      sections += (
        '<div class="cd-callsign-scope-section">' +
          '<div class="cd-callsign-scope-label">Public departments <span class="cd-callsign-scope-sublabel">(they aren\'t a member yet)</span></div>' +
          publics.map(function (d) { return renderOptionRow(d, 'dept'); }).join('') +
        '</div>'
      );
    }
    // Global fallback always at the bottom.
    var globalCurrent = (u && u.globalCallSign) || '';
    sections += (
      '<div class="cd-callsign-scope-section">' +
        '<div class="cd-callsign-scope-label">Profile</div>' +
        '<button type="button" class="cd-dnd-picker-item cd-callsign-scope-pick" data-scope="global">' +
          '<i class="fa fa-id-badge" style="color:var(--cd-accent);"></i>' +
          '<span class="cd-dnd-picker-title">Global callsign</span>' +
          (globalCurrent
            ? '<span class="cd-dnd-picker-tag cd-dnd-picker-tag-on">' + esc(globalCurrent) + '</span>'
            : '<span class="cd-dnd-picker-tag">Unset</span>') +
        '</button>' +
      '</div>'
    );

    window.ddModal({
      type: 'confirm',
      icon: 'fa-id-card',
      title: 'Pick a callsign scope',
      message: 'Callsigns can be set per-department (takes precedence on that dept\'s dashboard) or on their global profile (fallback everywhere else).',
      detail: '<div class="cd-callsign-scope-picker">' + sections + '</div>',
      buttons: [{ label: 'Cancel', class: 'dd-modal-btn-secondary' }],
    });
    setTimeout(function () {
      $('#dd-modal-detail').off('click.cdCallsign').on('click.cdCallsign', '.cd-callsign-scope-pick', function () {
        var scope = $(this).data('scope');
        var deptId = $(this).data('dept-id') || null;
        if (typeof window.ddCloseModal === 'function') window.ddCloseModal();
        setTimeout(function () { renderCallsignEditor(deptId, scope); }, 50);
      });
    }, 10);
  }

  // scope: 'dept' (deptId required) or 'global' (deptId ignored).
  function renderCallsignEditor(deptId, scope) {
    var u = state.unit;
    var $row = $('#cd-unit-console-identity').find('.cd-unit-console-title-row');
    if (!$row.length) return;
    var original = $row.html();
    var isGlobal = scope === 'global';
    var current = '';
    var scopeLabel = '';
    if (isGlobal) {
      current = (u && u.globalCallSign) || (u && u.callSign) || '';
      scopeLabel = 'global callsign';
    } else {
      var perDept = (u && u.departmentCallSigns && u.departmentCallSigns[deptId]) || '';
      current = perDept || u.callSign || '';
      var depts = (u && u.departments) || [];
      for (var i = 0; i < depts.length; i++) {
        if (depts[i].id === deptId) { scopeLabel = depts[i].name || ''; break; }
      }
      if (!scopeLabel) {
        var all = (typeof window.cdDispatchGetCommunityDepts === 'function') ? window.cdDispatchGetCommunityDepts() : [];
        for (var j = 0; j < all.length; j++) {
          if (all[j]._id === deptId) { scopeLabel = all[j].name || ''; break; }
        }
      }
    }
    $row.html(
      '<form class="cd-unit-console-callsign-form" id="cd-unit-console-callsign-form">' +
        '<input type="text" id="cd-unit-console-callsign-input" maxlength="10" autocomplete="off" placeholder="Callsign" value="' + esc(current) + '">' +
        '<button type="submit" class="cd-unit-console-callsign-save" title="Save callsign"><i class="fa fa-check"></i></button>' +
        '<button type="button" class="cd-unit-console-callsign-cancel" title="Cancel"><i class="fa fa-xmark"></i></button>' +
        '<span class="cd-unit-console-callsign-hint">' +
          'Max 10 chars · blank ' + (isGlobal ? 'clears global callsign' : 'clears override') +
          (scopeLabel ? ' · editing <strong>' + esc(scopeLabel) + '</strong>' : '') +
        '</span>' +
      '</form>'
    );
    var $input = $('#cd-unit-console-callsign-input').focus().select();
    function restore() { $row.html(original); }
    $('#cd-unit-console-callsign-form').on('submit', function (e) {
      e.preventDefault();
      var value = String($input.val() || '').trim();
      if (value.length > 10) { toast('Callsign must be 10 characters or fewer', 'error'); return; }
      if (isGlobal) saveGlobalCallsign(value, restore);
      else saveCallsign(deptId, value, restore);
    });
    $('.cd-unit-console-callsign-cancel').on('click', restore);
    $input.on('keydown', function (e) { if (e.key === 'Escape') restore(); });
  }

  function saveCallsign(departmentId, callSign, restore) {
    var communityId = cfg().communityId;
    var me = (cfg().dbUser && cfg().dbUser._id) || cfg().userId || '';
    if (!communityId || !state.userId) return;
    $('.cd-unit-console-callsign-save,.cd-unit-console-callsign-cancel').prop('disabled', true);
    $.ajax({
      url: api() + '/api/v1/community/' + encodeURIComponent(communityId) + '/members/' + encodeURIComponent(state.userId) + '/department-callsigns',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        departmentId: departmentId,
        callSign: callSign,
        requestingUserId: me,
      }),
    }).done(function () {
      toast(callSign ? 'Callsign updated' : 'Callsign override cleared', 'success');
      if (typeof window.cdDispatchRosterPatchUnit === 'function') {
        window.cdDispatchRosterPatchUnit({
          id: state.userId,
          departmentCallSign: { departmentId: departmentId, callSign: callSign },
        });
      }
      if (typeof window.cdDispatchRosterRefresh === 'function') {
        window.cdDispatchRosterRefresh({ silent: true });
      }
      state.unit = (typeof window.cdDispatchRosterGetUnit === 'function') ? window.cdDispatchRosterGetUnit(state.userId) : state.unit;
      render();
    }).fail(function (xhr) {
      var msg = 'Failed to update callsign';
      if (xhr && xhr.status === 403) msg = 'Permission denied';
      toast(msg, 'error');
      console.error('[cd-dispatch-unit-console] callsign update failed', xhr && xhr.responseText);
      if (restore) restore();
    });
  }

  function saveGlobalCallsign(callSign, restore) {
    if (!state.userId) return;
    $('.cd-unit-console-callsign-save,.cd-unit-console-callsign-cancel').prop('disabled', true);
    $.ajax({
      url: api() + '/api/v1/user/' + encodeURIComponent(state.userId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ callSign: callSign }),
    }).done(function () {
      toast(callSign ? 'Global callsign updated' : 'Global callsign cleared', 'success');
      // Patch roster: update globalCallSign and (if no per-dept override
      // applies to active dept) the visible chip callsign. The
      // globalCallSign branch below handles that when we refresh.
      if (typeof window.cdDispatchRosterPatchUnit === 'function') {
        window.cdDispatchRosterPatchUnit({
          id: state.userId,
          globalCallSign: callSign,
        });
      }
      if (typeof window.cdDispatchRosterRefresh === 'function') {
        window.cdDispatchRosterRefresh({ silent: true });
      }
      state.unit = (typeof window.cdDispatchRosterGetUnit === 'function') ? window.cdDispatchRosterGetUnit(state.userId) : state.unit;
      render();
    }).fail(function (xhr) {
      var msg = 'Failed to update global callsign';
      if (xhr && xhr.status === 403) msg = 'Permission denied';
      toast(msg, 'error');
      console.error('[cd-dispatch-unit-console] global callsign update failed', xhr && xhr.responseText);
      if (restore) restore();
    });
  }

  // ── Render ────────────────────────────────────────

  function render() {
    var u = state.unit;
    var dv = u && typeof window.cdDispatchDeptVisual === 'function' ? window.cdDispatchDeptVisual(u.deptTemplate) : { icon: 'fa-user', color: 'var(--cd-accent)', label: '' };

    // Header identity
    var $identity = $('#cd-unit-console-identity').empty();
    if (!u) {
      $identity.html('<h2 id="cd-unit-console-title" class="cd-unit-console-title">Unit</h2>');
    } else {
      var code = (u.tenCode && u.tenCode.code) || '';
      var admin = isCommunityAdmin();
      // Always show the pencil — the click handler either opens an inline
      // editor (admin) or explains why it's disabled (non-admin). Keeps
      // everyone aware the feature exists.
      var editBtn = (
        '<button type="button" class="cd-unit-console-callsign-edit' + (admin ? '' : ' is-gated') + '" ' +
          'data-admin="' + (admin ? '1' : '0') + '" ' +
          'title="' + (admin ? 'Edit callsign' : 'Admin permission required') + '" ' +
          'aria-label="Edit callsign">' +
          '<i class="fa fa-pencil"></i>' +
        '</button>'
      );
      $identity.html(
        '<div class="cd-unit-console-avatar" style="--cd-dept-color:' + esc(dv.color) + ';">' +
          '<i class="fa ' + esc(dv.icon) + '"></i>' +
        '</div>' +
        '<div class="cd-unit-console-identity-main">' +
          '<div class="cd-unit-console-title-row">' +
            '<h2 id="cd-unit-console-title" class="cd-unit-console-title">' + esc(u.callSign || u.username || 'Unit') + '</h2>' +
            editBtn +
          '</div>' +
          '<div class="cd-unit-console-sub">' +
            '<span>' + esc(u.username) + '</span>' +
            (u.deptName ? '<span>·</span><span>' + esc(u.deptName) + '</span>' : '') +
            (code ? '<span>·</span><span class="cd-unit-console-code" data-tone="' + esc(u.tone) + '">' + esc(code) + '</span>' : '') +
          '</div>' +
        '</div>'
      );
    }

    // Active tab indicator
    $('.cd-unit-console-tab').removeClass('is-active');
    $('.cd-unit-console-tab[data-tab="' + state.tab + '"]').addClass('is-active');

    var $body = $('#cd-unit-console-body');
    if (state.tab === 'status') $body.html(statusTabHtml(u));
    else $body.html(assignTabHtml(u));

    // Wire tab content
    if (state.tab === 'status') wireStatusTab();
    else wireAssignTab();
  }

  // ── Set Status tab ────────────────────────────────

  function statusTabHtml(u) {
    var codes = ((cfg().communityData || {}).tenCodes) || [];
    var currentCodeId = u && u.tenCode && (u.tenCode.id || u.tenCode._id) || '';
    if (!codes.length) {
      return '<div class="cd-dispatch-placeholder"><i class="fa fa-broadcast-tower"></i><div>This community hasn\'t configured any 10-codes yet.</div></div>';
    }

    // Filter codes by search query (matches code or description)
    var q = String(state.codeSearch || '').toLowerCase();
    var visible = !q ? codes : codes.filter(function (c) {
      return ((c.code || '') + ' ' + (c.description || '')).toLowerCase().indexOf(q) !== -1;
    });

    var grid = visible.length
      ? '<div class="cd-unit-console-codes">' + visible.map(function (c) {
          var id = c._id || c.id;
          var tone = (typeof window.cdStatusColor === 'function') ? window.cdStatusColor(c.code, c.description) : 'other';
          var active = id === currentCodeId;
          return (
            '<button type="button" class="cd-unit-console-code-btn' + (active ? ' is-active' : '') + '" data-ten-code-id="' + esc(id) + '" data-tone="' + esc(tone) + '">' +
              '<span class="cd-unit-console-code-dot" data-tone="' + esc(tone) + '"></span>' +
              '<span class="cd-unit-console-code-code">' + esc(c.code || '') + '</span>' +
              (c.description ? '<span class="cd-unit-console-code-desc">' + esc(c.description) + '</span>' : '') +
            '</button>'
          );
        }).join('') + '</div>'
      : '<div class="cd-unit-console-empty">No codes match "' + esc(state.codeSearch) + '".</div>';

    return (
      deptSwitcherHtml(u) +
      '<div class="cd-unit-console-code-search">' +
        '<label class="cd-unit-console-search">' +
          '<i class="fa fa-magnifying-glass"></i>' +
          '<input type="search" id="cd-unit-console-code-search-input" placeholder="Search codes (e.g. 10-8, Signal 100, Scene)" autocomplete="off" value="' + esc(state.codeSearch) + '">' +
        '</label>' +
        '<span class="cd-unit-console-code-count">' + visible.length + (visible.length !== codes.length ? ' / ' + codes.length : '') + '</span>' +
      '</div>' +
      grid
    );
  }

  // Render a selector row showing every department the unit is a member of.
  // Clicking a different dept stages it as activeDeptOverride — the next
  // 10-code commit bundles both changes into a single PUT so the unit gets
  // moved to the new dept AND set to the chosen status in one operation.
  function deptSwitcherHtml(u) {
    if (!u) return '';
    var allDepts = Array.isArray(u.departments) ? u.departments : [];
    // Civilian / judicial / dispatch don't participate in field dispatch —
    // never surface them as assignable active departments even if the unit
    // is a member.
    var depts = allDepts.filter(function (d) {
      var t = String((d && d.template) || '').toLowerCase();
      return t !== 'civilian' && t !== 'judicial' && t !== 'dispatch';
    });
    if (depts.length === 0) {
      return '<p class="cd-unit-console-tab-hint">' + esc('Click a code to set this unit\'s status.') + '</p>';
    }

    var currentId = state.activeDeptOverride || u.activeDepartmentId || (depts[0] && depts[0].id) || '';
    // deptVisual expects a template key; make the chip render exactly like the
    // roster dept filter pills.
    var pills = depts.map(function (d) {
      var dv = (typeof window.cdDispatchDeptVisual === 'function') ? window.cdDispatchDeptVisual(d.template) : { icon: 'fa-user', color: 'var(--cd-accent)', label: d.name };
      var isActive = d.id === currentId;
      var isOverride = state.activeDeptOverride && d.id === state.activeDeptOverride;
      return (
        '<button type="button" class="cd-unit-console-dept-pill' + (isActive ? ' is-active' : '') + (isOverride ? ' is-staged' : '') + '" data-dept-id="' + esc(d.id) + '" data-dept-name="' + esc(d.name || '') + '" style="--cd-dept-color:' + esc(dv.color) + ';" title="' + esc(d.name || dv.label) + '">' +
          '<i class="fa ' + esc(dv.icon) + '"></i>' +
          '<span>' + esc(d.name || dv.label) + '</span>' +
        '</button>'
      );
    }).join('');

    var banner;
    if (state.activeDeptOverride) {
      banner = '<div class="cd-unit-console-dept-banner"><i class="fa fa-circle-info"></i> Click a 10-code below to move this unit to the selected department AND set their status in one step.</div>';
    } else if (depts.length === 1) {
      banner = '<p class="cd-unit-console-tab-hint">This unit is only in one eligible department. Click a 10-code to set their status.</p>';
    } else {
      banner = '<p class="cd-unit-console-tab-hint">Set the unit\'s active department (optional), then pick a 10-code. A dept change is only committed when you choose a status.</p>';
    }

    return (
      '<section class="cd-unit-console-dept-section">' +
        '<div class="cd-unit-console-dept-label">Active Department</div>' +
        '<div class="cd-unit-console-dept-pills">' + pills + '</div>' +
        banner +
      '</section>'
    );
  }

  function wireStatusTab() {
    var $body = $('#cd-unit-console-body').off('.cdUnitConsoleStatus');
    $body.on('click.cdUnitConsoleStatus', '.cd-unit-console-code-btn', function () {
      var tenCodeId = $(this).data('ten-code-id');
      setUnitStatus(tenCodeId);
    });
    $body.on('click.cdUnitConsoleStatus', '.cd-unit-console-dept-pill', function () {
      var deptId = $(this).data('dept-id');
      var u = state.unit;
      // Clicking the already-active dept clears the override (no-op on commit).
      var currentActiveId = u ? u.activeDepartmentId : '';
      if (deptId === currentActiveId) {
        state.activeDeptOverride = null;
      } else {
        state.activeDeptOverride = deptId;
      }
      render();
    });
    $body.on('input.cdUnitConsoleStatus', '#cd-unit-console-code-search-input', function () {
      state.codeSearch = String(this.value || '').trim();
      render();
      var el = document.getElementById('cd-unit-console-code-search-input');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    });
  }

  function setUnitStatus(tenCodeId) {
    var communityId = cfg().communityId;
    if (!communityId || !state.userId || !tenCodeId) return;
    var $btns = $('.cd-unit-console-code-btn');
    $btns.prop('disabled', true);

    // If the dispatcher staged a different active department, bundle it into
    // the same PUT — the tenCode endpoint accepts activeDepartmentId +
    // activeDepartmentName alongside tenCodeId (see SetMemberTenCodeHandler).
    var body = { tenCodeId: tenCodeId };
    if (state.activeDeptOverride) {
      var u = state.unit;
      var depts = (u && u.departments) || [];
      var matched = null;
      for (var i = 0; i < depts.length; i++) {
        if (depts[i].id === state.activeDeptOverride) { matched = depts[i]; break; }
      }
      body.activeDepartmentId = state.activeDeptOverride;
      body.activeDepartmentName = matched ? (matched.name || '') : '';
    }

    $.ajax({
      url: api() + '/api/v1/community/' + encodeURIComponent(communityId) + '/members/' + encodeURIComponent(state.userId) + '/tenCode',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(body),
    }).done(function () {
      toast(state.activeDeptOverride ? 'Department + status updated' : 'Status updated', 'success');
      // Patch local roster cache so the chip dot flips immediately — the
      // dispatch:unit_status_changed socket broadcast reconciles across
      // other tabs.
      var codes = ((cfg().communityData || {}).tenCodes) || [];
      var matched = null;
      for (var i = 0; i < codes.length; i++) {
        var cid = codes[i]._id || codes[i].id;
        if (cid === tenCodeId) { matched = codes[i]; break; }
      }
      var patch = { id: state.userId };
      if (matched) {
        patch.tenCode = { id: tenCodeId, code: matched.code, description: matched.description };
      }
      if (state.activeDeptOverride) {
        patch.activeDepartmentId = state.activeDeptOverride;
        patch.activeDepartmentName = body.activeDepartmentName || '';
      }
      if (typeof window.cdDispatchRosterPatchUnit === 'function') {
        window.cdDispatchRosterPatchUnit(patch);
      }
      state.activeDeptOverride = null;
      // Refresh the console with the freshly patched unit
      state.unit = (typeof window.cdDispatchRosterGetUnit === 'function') ? window.cdDispatchRosterGetUnit(state.userId) : state.unit;
      render();
    }).fail(function (xhr) {
      toast('Failed to update status', 'error');
      console.error('[cd-dispatch-unit-console] set status failed', xhr && xhr.responseText);
    }).always(function () {
      $btns.prop('disabled', false);
    });
  }

  // ── Assign to Call tab ────────────────────────────

  function assignTabHtml(u) {
    var calls = (typeof window.cdDispatchBoardGetAllCalls === 'function') ? window.cdDispatchBoardGetAllCalls() : [];
    if (!calls.length) {
      return '<div class="cd-dispatch-placeholder"><i class="fa fa-radio"></i><div>No open calls to assign.</div></div>';
    }
    // Sort by priority lane (P1 first) then recency
    var laneOrder = { p1: 0, p2: 1, p3: 2, other: 3 };
    calls = calls.slice().sort(function (a, b) {
      var la = laneOrder[a.lane] == null ? 99 : laneOrder[a.lane];
      var lb = laneOrder[b.lane] == null ? 99 : laneOrder[b.lane];
      if (la !== lb) return la - lb;
      return (b.createdAtMs || 0) - (a.createdAtMs || 0);
    });
    var total = calls.length;
    var q = String(state.callSearch || '').toLowerCase();
    if (q) {
      calls = calls.filter(function (c) {
        return ((c.title || '') + ' ' + (c.details || '') + ' ' + (c.location || '')).toLowerCase().indexOf(q) !== -1;
      });
    }
    var searchBar = (
      '<div class="cd-unit-console-code-search">' +
        '<label class="cd-unit-console-search">' +
          '<i class="fa fa-magnifying-glass"></i>' +
          '<input type="search" id="cd-unit-console-call-search-input" placeholder="Search calls (title, details, location)" autocomplete="off" value="' + esc(state.callSearch) + '">' +
        '</label>' +
        '<span class="cd-unit-console-code-count">' + calls.length + (calls.length !== total ? ' / ' + total : '') + '</span>' +
      '</div>'
    );
    if (!calls.length) {
      return (
        '<p class="cd-unit-console-tab-hint">Click a call to toggle assignment. Already-assigned calls unassign on click.</p>' +
        searchBar +
        '<div class="cd-unit-console-empty">No calls match "' + esc(state.callSearch) + '".</div>'
      );
    }
    var list = '<div class="cd-unit-console-call-list">' + calls.map(function (c) {
      var assigned = (c.assignedTo || []).indexOf(state.userId) !== -1;
      var laneColor = c.lane === 'p1' ? 'var(--cd-red)'
                    : c.lane === 'p2' ? 'var(--cd-amber)'
                    : c.lane === 'p3' ? 'var(--cd-accent)'
                    : 'var(--cd-text-dim)';
      var title = (c.is911 ? '911: ' : '') + (c.title || 'Untitled');
      return (
        '<button type="button" class="cd-unit-console-call" data-call-id="' + esc(c.id) + '" data-assigned="' + (assigned ? '1' : '0') + '" style="--cd-lane-accent:' + esc(laneColor) + ';">' +
          '<span class="cd-unit-console-call-pip"></span>' +
          '<span class="cd-unit-console-call-title">' + esc(title) + '</span>' +
          (assigned
            ? '<span class="cd-unit-console-call-tag is-on"><i class="fa fa-check"></i> Assigned</span>'
            : '<span class="cd-unit-console-call-tag">Assign</span>') +
        '</button>'
      );
    }).join('') + '</div>';
    return (
      '<p class="cd-unit-console-tab-hint">Click a call to toggle assignment. Already-assigned calls unassign on click.</p>' +
      searchBar +
      list
    );
  }

  function wireAssignTab() {
    var $body = $('#cd-unit-console-body').off('.cdUnitConsoleAssign');
    $body.on('click.cdUnitConsoleAssign', '.cd-unit-console-call', function () {
      var callId = $(this).data('call-id');
      var assigned = $(this).attr('data-assigned') === '1';
      if (!callId || !state.userId) return;
      if (assigned && typeof window.cdDispatchUnassign === 'function') {
        window.cdDispatchUnassign(state.userId, callId);
      } else if (!assigned && typeof window.cdDispatchAssign === 'function') {
        window.cdDispatchAssign(state.userId, callId);
      }
      // Re-render to reflect new state
      setTimeout(render, 100);
    });
    $body.on('input.cdUnitConsoleAssign', '#cd-unit-console-call-search-input', function () {
      state.callSearch = String(this.value || '').trim();
      render();
      var el = document.getElementById('cd-unit-console-call-search-input');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    });
  }

  // ── Styles ────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('cd-dispatch-unit-console-styles')) return;
    var css = [
      '#cd-unit-console-overlay{position:fixed;inset:0;z-index:410;display:flex;align-items:center;justify-content:center;padding:1rem;}',
      '.cd-unit-console-backdrop{position:absolute;inset:0;background:rgba(3,7,18,0.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;transition:opacity .2s;}',
      '#cd-unit-console-overlay.is-open .cd-unit-console-backdrop{opacity:1;}',
      '.cd-unit-console-panel{position:relative;width:min(640px,100%);max-height:90vh;display:flex;flex-direction:column;background:var(--cd-bg);border:1px solid var(--cd-glass-border);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.05);color:var(--cd-text);opacity:0;transform:translateY(12px);transition:opacity .2s,transform .2s;overflow:hidden;}',
      '#cd-unit-console-overlay.is-open .cd-unit-console-panel{opacity:1;transform:none;}',
      '.cd-unit-console-head{display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border-bottom:1px solid var(--cd-glass-border);}',
      '.cd-unit-console-identity{display:flex;align-items:center;gap:0.75rem;min-width:0;flex:1;}',
      '.cd-unit-console-identity-main{min-width:0;flex:1;}',
      '.cd-unit-console-title-row{display:flex;align-items:center;gap:0.5rem;min-width:0;}',
      '.cd-unit-console-callsign-edit{width:24px;height:24px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:0.6875rem;transition:all .15s;flex-shrink:0;}',
      '.cd-unit-console-callsign-edit:hover{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-accent);}',
      '.cd-unit-console-callsign-edit.is-gated{color:var(--cd-text-dim);opacity:0.6;}',
      '.cd-unit-console-callsign-edit.is-gated:hover{color:var(--cd-amber);border-color:color-mix(in srgb,var(--cd-amber) 35%,transparent);background:color-mix(in srgb,var(--cd-amber) 8%,transparent);}',
      '.cd-unit-console-callsign-form{display:flex;align-items:center;gap:0.375rem;flex-wrap:wrap;}',
      '.cd-unit-console-callsign-form input{padding:0.3125rem 0.5625rem;border-radius:6px;border:1px solid color-mix(in srgb,var(--cd-accent) 45%,transparent);background:rgba(56,189,248,0.06);color:var(--cd-text);font:700 0.9375rem/1.2 "JetBrains Mono",ui-monospace,monospace;letter-spacing:0.03em;width:120px;text-transform:uppercase;outline:none;}',
      '.cd-unit-console-callsign-form input:focus{border-color:var(--cd-accent);background:rgba(56,189,248,0.1);}',
      '.cd-unit-console-callsign-save,.cd-unit-console-callsign-cancel{width:26px;height:26px;border-radius:6px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.03);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;transition:all .15s;}',
      '.cd-unit-console-callsign-save{color:#86efac;}',
      '.cd-unit-console-callsign-save:hover{background:rgba(34,197,94,0.14);border-color:rgba(34,197,94,0.4);}',
      '.cd-unit-console-callsign-cancel{color:var(--cd-text-dim);}',
      '.cd-unit-console-callsign-cancel:hover{background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.4);color:#fca5a5;}',
      '.cd-unit-console-callsign-hint{font-size:0.625rem;color:var(--cd-text-dim);width:100%;letter-spacing:0.02em;}',
      '.cd-callsign-scope-picker{display:flex;flex-direction:column;gap:0.75rem;max-height:54vh;overflow-y:auto;padding:0.25rem 0;}',
      '.cd-callsign-scope-section{display:flex;flex-direction:column;gap:0.3125rem;}',
      '.cd-callsign-scope-label{font:700 0.625rem/1 inherit;letter-spacing:0.12em;text-transform:uppercase;color:var(--cd-text-muted);padding:0 0.25rem;}',
      '.cd-callsign-scope-sublabel{font-weight:500;text-transform:none;letter-spacing:0;color:var(--cd-text-dim);margin-left:0.375rem;}',
      '.cd-unit-console-avatar{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--cd-dept-color) 14%,transparent);border:1px solid color-mix(in srgb,var(--cd-dept-color) 30%,transparent);color:var(--cd-dept-color);font-size:1rem;flex-shrink:0;}',
      '.cd-unit-console-title{margin:0;font:700 1rem/1.2 inherit;letter-spacing:0.01em;color:var(--cd-text);}',
      '.cd-unit-console-sub{display:flex;flex-wrap:wrap;align-items:center;gap:0.375rem;font-size:0.75rem;color:var(--cd-text-dim);}',
      '.cd-unit-console-code[data-tone="available"]{color:#86efac;}',
      '.cd-unit-console-code[data-tone="busy"]{color:#fcd34d;}',
      '.cd-unit-console-code[data-tone="emergency"]{color:#fca5a5;}',
      '.cd-unit-console-code[data-tone="other"]{color:var(--cd-accent);}',
      '.cd-unit-console-close{width:28px;height:28px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}',
      '.cd-unit-console-close:hover{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text);}',
      '.cd-unit-console-tabs{display:flex;gap:0;border-bottom:1px solid var(--cd-glass-border);padding:0 0.5rem;}',
      '.cd-unit-console-tab{display:inline-flex;align-items:center;gap:0.4375rem;padding:0.6875rem 0.875rem;border:0;background:transparent;color:var(--cd-text-muted);font:600 0.8125rem/1 inherit;cursor:pointer;position:relative;transition:color .15s;}',
      '.cd-unit-console-tab:hover{color:var(--cd-text);}',
      '.cd-unit-console-tab.is-active{color:var(--cd-accent);}',
      '.cd-unit-console-tab.is-active::after{content:"";position:absolute;left:0.5rem;right:0.5rem;bottom:-1px;height:2px;background:var(--cd-accent);border-radius:2px 2px 0 0;}',
      '.cd-unit-console-tab i{font-size:0.8125rem;}',
      '.cd-unit-console-body{flex:1;overflow-y:auto;padding:1rem;}',
      '.cd-unit-console-tab-hint{margin:0 0 0.875rem;font-size:0.75rem;color:var(--cd-text-dim);line-height:1.45;}',
      // Department switcher
      '.cd-unit-console-dept-section{margin-bottom:1rem;padding-bottom:0.875rem;border-bottom:1px solid var(--cd-glass-border);}',
      '.cd-unit-console-dept-label{font:700 0.625rem/1 inherit;letter-spacing:0.12em;text-transform:uppercase;color:var(--cd-text-muted);margin-bottom:0.5rem;}',
      '.cd-unit-console-dept-pills{display:flex;flex-wrap:wrap;gap:0.375rem;margin-bottom:0.625rem;}',
      '.cd-unit-console-dept-pill{display:inline-flex;align-items:center;gap:0.4375rem;padding:0.375rem 0.6875rem;border-radius:999px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text-muted);font:600 0.75rem/1 inherit;cursor:pointer;transition:all .15s;}',
      '.cd-unit-console-dept-pill i{color:var(--cd-dept-color);font-size:0.75rem;}',
      '.cd-unit-console-dept-pill:hover{background:rgba(255,255,255,0.05);color:var(--cd-text);}',
      '.cd-unit-console-dept-pill.is-active{color:var(--cd-text);border-color:color-mix(in srgb,var(--cd-dept-color) 46%,transparent);background:color-mix(in srgb,var(--cd-dept-color) 12%,transparent);}',
      '.cd-unit-console-dept-pill.is-staged{box-shadow:0 0 0 2px color-mix(in srgb,var(--cd-dept-color) 28%,transparent);animation:cd-unit-staged 1.6s ease-in-out infinite;}',
      '@keyframes cd-unit-staged{0%,100%{box-shadow:0 0 0 2px color-mix(in srgb,var(--cd-dept-color) 18%,transparent);}50%{box-shadow:0 0 0 4px color-mix(in srgb,var(--cd-dept-color) 0%,transparent);}}',
      '.cd-unit-console-dept-banner{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border-radius:8px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.24);color:#7dd3fc;font-size:0.75rem;line-height:1.4;}',
      // Code search
      '.cd-unit-console-code-search{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;}',
      '.cd-unit-console-search{flex:1;display:flex;align-items:center;gap:0.5rem;padding:0.4375rem 0.625rem;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--cd-glass-border);}',
      '.cd-unit-console-search i{color:var(--cd-text-dim);font-size:0.75rem;}',
      '.cd-unit-console-search input{flex:1;background:transparent;border:0;outline:0;color:var(--cd-text);font-family:inherit;font-size:0.8125rem;min-width:0;}',
      '.cd-unit-console-search input::placeholder{color:var(--cd-text-dim);}',
      '.cd-unit-console-code-count{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:0.6875rem;color:var(--cd-text-dim);}',
      '.cd-unit-console-empty{padding:1.5rem;text-align:center;color:var(--cd-text-dim);font-size:0.8125rem;}',
      // Set Status grid
      '.cd-unit-console-codes{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.5rem;}',
      '.cd-unit-console-code-btn{display:flex;flex-direction:column;align-items:flex-start;gap:0.25rem;padding:0.625rem 0.75rem;border-radius:10px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text);cursor:pointer;transition:all .15s;text-align:left;}',
      '.cd-unit-console-code-btn:hover:not([disabled]){background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.14);transform:translateY(-1px);}',
      '.cd-unit-console-code-btn.is-active{border-color:rgba(56,189,248,0.45);background:rgba(56,189,248,0.08);box-shadow:0 0 0 2px rgba(56,189,248,0.12);}',
      '.cd-unit-console-code-btn[disabled]{opacity:0.55;cursor:progress;}',
      '.cd-unit-console-code-dot{width:8px;height:8px;border-radius:999px;}',
      '.cd-unit-console-code-dot[data-tone="available"]{background:var(--cd-green);box-shadow:0 0 0 2px rgba(34,197,94,0.2);}',
      '.cd-unit-console-code-dot[data-tone="busy"]{background:var(--cd-amber);box-shadow:0 0 0 2px rgba(245,158,11,0.2);}',
      '.cd-unit-console-code-dot[data-tone="emergency"]{background:var(--cd-red);box-shadow:0 0 0 2px rgba(239,68,68,0.2);}',
      '.cd-unit-console-code-dot[data-tone="other"]{background:var(--cd-accent);box-shadow:0 0 0 2px rgba(56,189,248,0.15);}',
      '.cd-unit-console-code-code{font:700 0.8125rem/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:0.04em;color:var(--cd-text);}',
      '.cd-unit-console-code-desc{font-size:0.6875rem;color:var(--cd-text-dim);line-height:1.3;}',
      // Assign list
      '.cd-unit-console-call-list{display:flex;flex-direction:column;gap:0.3125rem;}',
      '.cd-unit-console-call{display:flex;align-items:center;gap:0.5625rem;padding:0.5625rem 0.75rem;border-radius:8px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text);cursor:pointer;text-align:left;transition:all .15s;border-left:3px solid var(--cd-lane-accent);}',
      '.cd-unit-console-call:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.14);border-left-color:var(--cd-lane-accent);}',
      '.cd-unit-console-call-pip{width:7px;height:7px;border-radius:999px;background:var(--cd-lane-accent);flex-shrink:0;}',
      '.cd-unit-console-call-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.8125rem;}',
      '.cd-unit-console-call-tag{padding:0.125rem 0.5rem;border-radius:999px;background:rgba(255,255,255,0.05);color:var(--cd-text-dim);font:600 0.625rem/1 inherit;letter-spacing:0.04em;text-transform:uppercase;}',
      '.cd-unit-console-call-tag.is-on{background:rgba(34,197,94,0.14);color:#86efac;}',
      '.cd-unit-console-call-tag.is-on i{margin-right:0.25rem;font-size:0.5625rem;}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dispatch-unit-console-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
