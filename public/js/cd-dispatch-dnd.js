/**
 * Command Dashboard — Dispatch Drag-and-Drop + Keyboard Fallback
 *
 * Wires Sortable.js groups for assigning units to calls, plus a keyboard
 * fallback via ddModal that is the only path on touch devices ≤1024 px.
 *
 * Public API (used by other dispatch modules):
 *   window.cdDispatchAssign(userId, callId)       — assign flow + optimistic UI
 *   window.cdDispatchUnassign(userId, callId)     — unassign flow + optimistic UI
 *   window.cdDispatchAssignMenuForUnit(userId)    — picker "Assign A-1 to which call?"
 *   window.cdDispatchAssignMenuForCall(callId)    — picker "Assign which unit to this call?"
 *
 * Touch: Sortable is still enabled on tablets, but DnD affordances are hidden
 * via CSS at ≤1024 px — step 10 can tune thresholds after device testing.
 */
;(function () {
  'use strict';

  function cfg()  { return window.ddConfig || {}; }
  function api()  { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }

  var bound = false;

  window.cdDispatchDndInit = function () {
    if (bound) return;
    if (typeof Sortable === 'undefined') {
      console.warn('[cd-dispatch-dnd] Sortable.js not loaded — DnD disabled.');
      return;
    }
    bound = true;
    // Defer until child modules have rendered their zones
    setTimeout(wireSortables, 0);
    wireMutationObserver();
  };

  // ── Assign / Unassign core ────────────────────────

  function getAssignedTo(callId) {
    var c = (typeof window.cdDispatchBoardGetCall === 'function') ? window.cdDispatchBoardGetCall(callId) : null;
    if (c && c.assignedTo) return c.assignedTo.slice();
    // Fallback: read from detail state if it's the selected call
    var detail = window.__cdDispatchDetailState;
    if (detail && detail.callId === callId && detail.call) return (detail.call.assignedTo || []).slice();
    return [];
  }

  function putAssignedTo(callId, assignedTo, label) {
    return $.ajax({
      url: api() + '/api/v1/call/' + encodeURIComponent(callId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ assignedTo: assignedTo }),
    }).done(function () {
      toast(label || 'Updated', 'success');
    }).fail(function (xhr) {
      toast((label || 'Update') + ' failed', 'error');
      console.error('[cd-dispatch-dnd] PUT failed', xhr && xhr.responseText);
    });
  }

  window.cdDispatchAssign = function (userId, callId) {
    if (!userId || !callId) return;
    var current = getAssignedTo(callId);
    if (current.indexOf(userId) !== -1) { toast('Already assigned', 'info'); return; }
    var next = current.concat([userId]);
    applyOptimistic(callId, next);
    putAssignedTo(callId, next, 'Unit assigned').fail(function () { applyOptimistic(callId, current); });
  };

  window.cdDispatchUnassign = function (userId, callId) {
    if (!userId || !callId) return;
    var current = getAssignedTo(callId);
    if (current.indexOf(userId) === -1) return;
    var next = current.filter(function (u) { return u !== userId; });
    applyOptimistic(callId, next);
    putAssignedTo(callId, next, 'Unit unassigned').fail(function () { applyOptimistic(callId, current); });
  };

  function applyOptimistic(callId, assignedTo) {
    // Patch board state + re-render the affected card
    var c = (typeof window.cdDispatchBoardGetCall === 'function') ? window.cdDispatchBoardGetCall(callId) : null;
    if (c) {
      c.assignedTo = assignedTo.slice();
      if (typeof window.cdDispatchBoardUpsertCall === 'function') {
        window.cdDispatchBoardUpsertCall({ _id: callId, call: Object.assign({}, c, { assignedTo: assignedTo.slice() }) });
      }
    }
    // If the detail pane is open on this call, re-fetch so the Assigned Units
    // section renders the new pill (or loses one, for unassign). This is the
    // same request the socket broadcast would trigger — doing it locally just
    // removes the wait for the round-trip.
    var detail = window.__cdDispatchDetailState;
    if (detail && detail.callId === callId && typeof window.cdDispatchDetailSelect === 'function') {
      window.cdDispatchDetailSelect(callId);
    }
  }

  // ── Sortable wiring ───────────────────────────────

  function wireSortables() {
    wireRoster();
    wireUnassignZone();
    wireCallCardZones();
    wireDetailPillZone();
  }

  function wireRoster() {
    var roster = document.getElementById('cd-dispatch-roster-list');
    if (!roster || roster.__cdSortable) return;
    roster.__cdSortable = Sortable.create(roster, {
      group: { name: 'dispatch-units', pull: 'clone', put: false },
      animation: 150,
      sort: false,
      delay: 80,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      dragClass: 'cd-sortable-drag',
      ghostClass: 'cd-sortable-ghost',
      chosenClass: 'cd-sortable-chosen',
      // Draggable: only chip tiles. Excludes the search input + filter pills above.
      draggable: '.cd-unit-chip',
      filter: '.cd-unit-chip-menu',
      preventOnFilter: true,
      onStart: function () { document.body.classList.add('cd-dnd-active'); },
      onEnd:   function () { document.body.classList.remove('cd-dnd-active'); },
    });
  }

  function wireUnassignZone() {
    var unassignZone = document.getElementById('cd-dispatch-roster-unassign');
    if (!unassignZone || unassignZone.__cdSortable) return;
    unassignZone.__cdSortable = Sortable.create(unassignZone, {
      group: { name: 'dispatch-units', pull: false, put: ['dispatch-units'] },
      animation: 150,
      onAdd: function (evt) {
        var userId = evt.item && evt.item.getAttribute('data-user-id');
        if (evt.item && evt.item.parentNode) evt.item.parentNode.removeChild(evt.item);
        if (!userId) return;
        var sourceCall = evt.clone && evt.clone.getAttribute('data-source-call');
        if (sourceCall) {
          window.cdDispatchUnassign(userId, sourceCall);
        } else {
          toast('Drag an assigned pill from a call onto here to unassign.', 'info');
        }
      },
    });
  }

  // Treat the ENTIRE .cd-call-card as the drop zone (not just the footer).
  // A tiny footer is hard to target; making the whole card accept drops is
  // the single biggest usability fix for DnD assignment.
  function wireCallCardZones() {
    $('.cd-call-card').each(function () {
      if (this.__cdSortable) return;
      var callId = this.getAttribute('data-call-id');
      if (!callId) return;
      this.__cdSortable = Sortable.create(this, {
        group: { name: 'dispatch-units', pull: false, put: ['dispatch-units'] },
        animation: 150,
        // No children are actually sortable in a card — this just makes the
        // element a drop target. Sortable won't reorder the card's layout.
        draggable: '.cd-sortable-no-match',
        onAdd: function (evt) {
          var userId = evt.item && evt.item.getAttribute('data-user-id');
          if (evt.item && evt.item.parentNode) evt.item.parentNode.removeChild(evt.item);
          if (!userId) return;
          window.cdDispatchAssign(userId, callId);
        },
      });
    });
  }

  function wireDetailPillZone() {
    $('.cd-detail-pill-zone').each(function () {
      if (this.__cdSortable) return;
      var callId = this.getAttribute('data-call-id');
      this.__cdSortable = Sortable.create(this, {
        group: { name: 'dispatch-units', pull: false, put: ['dispatch-units'] },
        animation: 150,
        draggable: '.cd-sortable-no-match',
        onAdd: function (evt) {
          var userId = evt.item && evt.item.getAttribute('data-user-id');
          if (evt.item && evt.item.parentNode) evt.item.parentNode.removeChild(evt.item);
          if (!userId || !callId) return;
          window.cdDispatchAssign(userId, callId);
        },
      });
    });
  }

  // React to board/detail/roster re-renders by re-wiring any new drop zones.
  function wireMutationObserver() {
    var targets = ['cd-board-lanes', 'cd-dispatch-detail', 'cd-dispatch-roster'];
    targets.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.__cdObserved) return;
      el.__cdObserved = true;
      var obs = new MutationObserver(function () {
        wireRoster();
        wireUnassignZone();
        wireCallCardZones();
        wireDetailPillZone();
      });
      obs.observe(el, { childList: true, subtree: true });
    });
  }

  // ── Keyboard / touch fallback: ddModal pickers ────

  window.cdDispatchAssignMenuForUnit = function (userId) {
    var unit = (typeof window.cdDispatchRosterGetUnit === 'function') ? window.cdDispatchRosterGetUnit(userId) : null;
    var calls = (typeof window.cdDispatchBoardGetAllCalls === 'function') ? window.cdDispatchBoardGetAllCalls() : [];
    if (!calls.length) { toast('No open calls to assign to', 'info'); return; }
    var label = unit ? (unit.callSign || unit.username) : 'unit';

    if (!window.ddModal) { toast('Modal helper missing', 'error'); return; }
    var listHtml = '<div class="cd-dnd-picker">' + calls.map(function (c) {
      var assigned = (c.assignedTo || []).indexOf(userId) !== -1;
      var title = (c.is911 ? '911: ' : '') + (c.title || 'Untitled');
      return (
        '<button type="button" class="cd-dnd-picker-item" data-call-id="' + esc(c.id) + '"' + (assigned ? ' data-already="1" disabled' : '') + '>' +
          '<span class="cd-dnd-picker-pip" style="background:' + esc(c.lane === 'p1' ? 'var(--cd-red)' : c.lane === 'p2' ? 'var(--cd-amber)' : c.lane === 'p3' ? 'var(--cd-accent)' : 'var(--cd-text-dim)') + ';"></span>' +
          '<span class="cd-dnd-picker-title">' + esc(title) + '</span>' +
          (assigned ? '<span class="cd-dnd-picker-tag">Already assigned</span>' : '') +
        '</button>'
      );
    }).join('') + '</div>';

    window.ddModal({
      type: 'confirm',
      icon: 'fa-users',
      title: 'Assign ' + label + ' to…',
      message: 'Pick a call to assign <strong>' + esc(label) + '</strong> to.',
      detail: listHtml,
      buttons: [{ label: 'Close', class: 'dd-modal-btn-secondary' }],
    });

    // Wire picker clicks after the modal opens (ddModal doesn't expose onBodyClick)
    setTimeout(function () {
      $('#dd-modal-detail').off('click.cdDnd').on('click.cdDnd', '.cd-dnd-picker-item:not([disabled])', function () {
        var callId = $(this).data('call-id');
        window.cdDispatchAssign(userId, callId);
        if (typeof window.ddCloseModal === 'function') window.ddCloseModal();
      });
    }, 10);
  };

  window.cdDispatchAssignMenuForCall = function (callId) {
    var call = (typeof window.cdDispatchBoardGetCall === 'function') ? window.cdDispatchBoardGetCall(callId) : null;
    var units = (window.__cdDispatchRosterState && window.__cdDispatchRosterState.units) || [];
    if (!units.length) { toast('No assignable units loaded', 'info'); return; }

    if (!window.ddModal) { toast('Modal helper missing', 'error'); return; }
    var assigned = (call && call.assignedTo) || [];
    var listHtml = '<div class="cd-dnd-picker">' + units.map(function (u) {
      var isAssigned = assigned.indexOf(u.id) !== -1;
      var dv = (typeof window.cdDispatchDeptVisual === 'function') ? window.cdDispatchDeptVisual(u.deptTemplate) : { icon: 'fa-user', color: 'var(--cd-accent)' };
      return (
        '<button type="button" class="cd-dnd-picker-item" data-user-id="' + esc(u.id) + '" data-assigned="' + (isAssigned ? '1' : '0') + '" style="--cd-dept-color:' + esc(dv.color) + ';">' +
          '<i class="fa ' + esc(dv.icon) + '" style="color:var(--cd-dept-color);"></i>' +
          '<span class="cd-dnd-picker-title">' + esc(u.callSign || u.username) + '</span>' +
          (isAssigned ? '<span class="cd-dnd-picker-tag cd-dnd-picker-tag-on">Assigned · click to unassign</span>' : '') +
        '</button>'
      );
    }).join('') + '</div>';

    window.ddModal({
      type: 'confirm',
      icon: 'fa-radio',
      title: 'Assign unit to call',
      message: 'Pick a unit to toggle on this call.',
      detail: listHtml,
      buttons: [{ label: 'Close', class: 'dd-modal-btn-secondary' }],
    });

    setTimeout(function () {
      $('#dd-modal-detail').off('click.cdDnd').on('click.cdDnd', '.cd-dnd-picker-item', function () {
        var uid = $(this).data('user-id');
        if ($(this).data('assigned') === 1 || $(this).attr('data-assigned') === '1') {
          window.cdDispatchUnassign(uid, callId);
        } else {
          window.cdDispatchAssign(uid, callId);
        }
        if (typeof window.ddCloseModal === 'function') window.ddCloseModal();
      });
    }, 10);
  };

  // Small stylesheet for the picker modal bodies
  (function injectPickerStyles() {
    if (document.getElementById('cd-dnd-picker-styles')) return;
    var css = [
      '.cd-dnd-picker{display:flex;flex-direction:column;gap:0.25rem;max-height:48vh;overflow-y:auto;padding:0.25rem 0;}',
      '.cd-dnd-picker-item{display:flex;align-items:center;gap:0.5rem;padding:0.5625rem 0.75rem;border-radius:8px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text);font:500 0.8125rem/1.2 inherit;cursor:pointer;text-align:left;transition:all .15s;}',
      '.cd-dnd-picker-item:hover:not([disabled]){background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.14);}',
      '.cd-dnd-picker-item[disabled]{opacity:0.5;cursor:not-allowed;}',
      '.cd-dnd-picker-pip{width:8px;height:8px;border-radius:999px;flex-shrink:0;}',
      '.cd-dnd-picker-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.cd-dnd-picker-tag{padding:0.0625rem 0.4375rem;border-radius:999px;background:rgba(100,116,139,0.18);color:var(--cd-text-dim);font-size:0.625rem;letter-spacing:0.04em;}',
      '.cd-dnd-picker-tag-on{background:rgba(34,197,94,0.14);color:#86efac;}',
      'body.cd-dnd-active .cd-call-card{transition:border-color .15s,background .15s;}',
      'body.cd-dnd-active .cd-call-card-assigned{outline:1px dashed rgba(56,189,248,0.25);}',
      '@media (max-width: 1024px){.cd-unit-chip{cursor:pointer;}.cd-unit-unassign-drop{display:none;}}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dnd-picker-styles';
    el.textContent = css;
    document.head.appendChild(el);
  })();
})();
