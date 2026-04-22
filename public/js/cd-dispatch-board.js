/**
 * Command Dashboard — Dispatch Call Board
 *
 * Center zone of the Command Bridge. Renders open calls grouped into priority
 * lanes (P1 / P2 / P3 / Other). Each call card is a drop target for unit
 * chips in step 7, a keyboard-nav target for the kebab-menu fallback, and
 * live-updates via the existing created_call / updated_call / cleared_call
 * socket events (subscribed in step 8 via cd-dispatch-realtime.js).
 *
 * Dependencies:
 *   - jQuery ($)
 *   - window.ddConfig { API_URL, communityId, userId }
 *   - window.cdDispatchRosterGetUnit(userId) (step 3 — for unit pill metadata)
 *   - window.cdDispatchDetailSelect(callId) (step 5 — opens the detail drawer)
 *   - window.cdDispatchIntakeOpen() (step 6 — opens the create-call modal)
 *   - window.cdDispatchDeptVisual(template) (step 3 — dept icon/color)
 */
;(function () {
  'use strict';

  function cfg()  { return window.ddConfig || {}; }
  function api()  { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }

  var LANES = [
    { key: 'p1',    label: 'Priority 1', accent: 'var(--cd-red)',    match: function(p){ return p === 1 || p === '1' || /p.?1/i.test(String(p||'')) || /high|critical/i.test(String(p||'')); } },
    { key: 'p2',    label: 'Priority 2', accent: 'var(--cd-amber)',  match: function(p){ return p === 2 || p === '2' || /p.?2/i.test(String(p||'')) || /medium/i.test(String(p||'')); } },
    { key: 'p3',    label: 'Priority 3', accent: 'var(--cd-accent)', match: function(p){ return p === 3 || p === '3' || /p.?3/i.test(String(p||'')) || /low|routine/i.test(String(p||'')); } },
    { key: 'other', label: 'Other',      accent: 'var(--cd-text-dim)', match: function(){ return true; } },
  ];

  var state = {
    calls: {},             // id -> normalized call
    selectedCallId: null,
    loading: false,
    tickTimer: null,
    // Lane collapse state persisted across re-renders. Default: P1 expanded,
    // others collapsed so dispatchers see what matters most first.
    laneCollapsed: { p1: false, p2: true, p3: true, other: true },
    priorityFilter: 'all', // all | p1 | p2 | p3 | other
    search: '', // filters call title + details + classifier label
  };
  window.__cdDispatchBoardState = state; // debug handle

  // ── Public API ────────────────────────────────────

  window.cdDispatchBoardInit = function () {
    injectStyles();
    renderShell();
    load();
    wireEvents();
    startElapsedTicker();
  };

  window.cdDispatchBoardRefresh = function (opts) { load(opts || { silent: true }); };

  window.cdDispatchBoardUpsertCall = function (raw) {
    var c = normalize(raw);
    if (!c || !c.id) return;
    state.calls[c.id] = c;
    renderLanes();
    // If the detail pane is open on this call, patch its state from the
    // payload we already have — avoid a refetch that can race the PUT
    // that triggered this upsert in the first place.
    if (state.selectedCallId === c.id && typeof window.cdDispatchDetailPatchAssigned === 'function') {
      window.cdDispatchDetailPatchAssigned(c.id, c.assignedTo || []);
    }
  };

  window.cdDispatchBoardRemoveCall = function (callId) {
    if (!callId || !state.calls[callId]) return;
    delete state.calls[callId];
    if (state.selectedCallId === callId) {
      state.selectedCallId = null;
      if (typeof window.cdDispatchDetailClear === 'function') window.cdDispatchDetailClear();
    }
    renderLanes();
  };

  window.cdDispatchBoardSelectCall = function (callId) {
    state.selectedCallId = callId || null;
    $('.cd-call-card').removeClass('is-selected');
    if (callId) $('.cd-call-card[data-call-id="' + cssEsc(callId) + '"]').addClass('is-selected');
  };

  window.cdDispatchBoardGetCall = function (callId) { return state.calls[callId] || null; };

  window.cdDispatchBoardGetAllCalls = function () {
    var out = [];
    for (var k in state.calls) if (state.calls.hasOwnProperty(k)) out.push(state.calls[k]);
    return out;
  };

  // ── Data loading ──────────────────────────────────

  function load(opts) {
    var silent = !!(opts && opts.silent);
    var communityId = cfg().communityId;
    if (!communityId) return;
    if (!silent) {
      state.loading = true;
      renderLanes();
    }

    $.ajax({
      url: api() + '/api/v2/calls/community/' + encodeURIComponent(communityId) + '?status=true&limit=100&page=1',
      method: 'GET',
    }).done(function (resp) {
      var next = {};
      var items = (resp && resp.data) || [];
      for (var i = 0; i < items.length; i++) {
        var c = normalize(items[i]);
        if (c && c.id) next[c.id] = c;
      }
      if (silent && callsEqual(state.calls, next)) {
        state.loading = false;
        return;
      }
      state.calls = next;
      state.loading = false;
      renderLanes();
    }).fail(function (xhr) {
      state.loading = false;
      if (!silent) renderLanes();
      if (!silent) toast('Failed to load calls', 'error');
      console.error('[cd-dispatch-board] load failed', xhr && xhr.responseText);
    });
  }

  // Signature check — only compares fields the UI renders so we can skip
  // no-op re-renders. Misses deep note updates (those land via detail reload).
  function callsEqual(a, b) {
    var ka = Object.keys(a || {}), kb = Object.keys(b || {});
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) {
      var id = ka[i];
      if (!b[id]) return false;
      var x = a[id], y = b[id];
      if (x.title !== y.title) return false;
      if (x.details !== y.details) return false;
      if (x.lane !== y.lane) return false;
      if (x.status !== y.status) return false;
      if (x.notesCount !== y.notesCount) return false;
      if ((x.assignedTo || []).join(',') !== (y.assignedTo || []).join(',')) return false;
    }
    return true;
  }

  function normalize(raw) {
    if (!raw) return null;
    var c = raw.call || raw;
    var id = raw._id || c._id || '';
    if (!id) return null;
    var classifier = c.classifier || [];
    var priority = derivePriority(classifier);
    var is911 = /^911\s*:/i.test(c.title || '');
    // 911 calls default to P1 — dispatch can downgrade by editing the call.
    // Only override when no explicit priority was set by intake.
    if (priority == null && is911) priority = '1';
    return {
      id: id,
      title: c.title || 'Untitled Call',
      details: c.details || c.shortDescription || '',
      classifier: classifier,
      classifierLabel: classifierLabel(classifier),
      priority: priority,
      lane: laneKey(priority),
      assignedTo: c.assignedTo || [],
      status: c.status !== false, // true = open, default true
      createdAt: c.createdAt || null,
      createdAtMs: toMs(c.createdAt),
      createdByUsername: c.createdByUsername || '',
      departments: c.departments || [],
      is911: is911,
      notesCount: (c.callNotes || []).length,
    };
  }

  // Go's BSON driver decodes []interface{} into primitive.D (ordered
  // pairs) which JSON-serializes as `[{"Key":"priority","Value":"2"},...]`
  // instead of `{priority:"2"}`. Normalize both shapes into a plain map
  // so priority detection survives the roundtrip.
  function toPlainObject(v) {
    if (v == null) return null;
    if (typeof v === 'string') return { label: v };
    if (Array.isArray(v)) {
      var out = {};
      for (var i = 0; i < v.length; i++) {
        var kv = v[i];
        if (kv && typeof kv === 'object' && 'Key' in kv) out[kv.Key] = kv.Value;
      }
      return Object.keys(out).length ? out : null;
    }
    if (typeof v === 'object') return v;
    return null;
  }

  function derivePriority(classifier) {
    if (!classifier || !classifier.length) return null;
    var first = toPlainObject(classifier[0]);
    if (first == null) return null;
    if (first.priority != null) return first.priority;
    if (first.level != null) return first.level;
    if (first.code) return first.code;
    if (first.name) return first.name;
    if (first.label) return first.label;
    return null;
  }

  function classifierLabel(classifier) {
    if (!classifier || !classifier.length) return '';
    var entry = classifier[0];
    if (typeof entry === 'string') return entry;
    var first = toPlainObject(entry);
    if (!first) return '';
    return first.label || first.name || first.description || first.code || '';
  }

  function laneKey(priority) {
    for (var i = 0; i < LANES.length; i++) if (LANES[i].match(priority)) return LANES[i].key;
    return 'other';
  }

  function toMs(createdAt) {
    if (!createdAt) return 0;
    if (typeof createdAt === 'number') return createdAt;
    var t = new Date(createdAt).getTime();
    return isFinite(t) ? t : 0;
  }

  // ── Rendering ─────────────────────────────────────

  function renderShell() {
    var $host = $('#cd-dispatch-board');
    if (!$host.length) return;
    $host.html(
      '<div class="cd-board-toolbar">' +
        '<button type="button" class="cd-board-new" id="cd-dispatch-new-call">' +
          '<i class="fa fa-plus"></i> New Call' +
        '</button>' +
        '<label class="cd-board-search">' +
          '<i class="fa fa-magnifying-glass"></i>' +
          '<input type="search" id="cd-board-search-input" placeholder="Search calls by title or details" autocomplete="off">' +
        '</label>' +
        '<div class="cd-board-priority-pills" role="tablist" aria-label="Filter calls by priority">' +
          '<button type="button" class="cd-board-pill is-active" data-priority="all" role="tab">All</button>' +
          '<button type="button" class="cd-board-pill cd-board-pill-p1" data-priority="p1" role="tab"><span class="cd-board-pill-pip"></span>P1</button>' +
          '<button type="button" class="cd-board-pill cd-board-pill-p2" data-priority="p2" role="tab"><span class="cd-board-pill-pip"></span>P2</button>' +
          '<button type="button" class="cd-board-pill cd-board-pill-p3" data-priority="p3" role="tab"><span class="cd-board-pill-pip"></span>P3</button>' +
          '<button type="button" class="cd-board-pill cd-board-pill-other" data-priority="other" role="tab"><span class="cd-board-pill-pip"></span>Other</button>' +
        '</div>' +
      '</div>' +
      '<div class="cd-board-lanes" id="cd-board-lanes"></div>'
    );
  }

  function renderLanes() {
    var $lanes = $('#cd-board-lanes');
    if (!$lanes.length) return;

    if (state.loading) {
      $lanes.html('<div class="cd-dispatch-placeholder"><i class="fa fa-circle-notch fa-spin"></i><div>Loading calls…</div></div>');
      return;
    }

    var q = String(state.search || '').toLowerCase();
    var grouped = { p1: [], p2: [], p3: [], other: [] };
    Object.keys(state.calls).forEach(function (id) {
      var c = state.calls[id];
      if (q) {
        var hay = ((c.title || '') + ' ' + (c.details || '') + ' ' + (c.classifierLabel || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      grouped[c.lane].push(c);
    });

    // Sort within each lane by createdAt desc
    Object.keys(grouped).forEach(function (k) {
      grouped[k].sort(function (a, b) { return b.createdAtMs - a.createdAtMs; });
    });

    var total = Object.keys(state.calls).length;
    var filteredTotal = grouped.p1.length + grouped.p2.length + grouped.p3.length + grouped.other.length;
    $('#cd-dispatch-board-count').text(q ? filteredTotal + ' / ' + total : total);

    if (total === 0) {
      $lanes.html(
        '<div class="cd-board-empty">' +
          '<div class="cd-board-empty-ring"><i class="fa fa-radio"></i></div>' +
          '<div class="cd-board-empty-title">Channel quiet</div>' +
          '<div class="cd-board-empty-hint">No open calls. Click <strong>+ New Call</strong> — or drag a unit to stage one — to dispatch.</div>' +
        '</div>'
      );
      return;
    }

    if (q && filteredTotal === 0) {
      $lanes.html(
        '<div class="cd-board-empty">' +
          '<div class="cd-board-empty-ring"><i class="fa fa-magnifying-glass"></i></div>' +
          '<div class="cd-board-empty-title">No matches</div>' +
          '<div class="cd-board-empty-hint">No open calls match <strong>&ldquo;' + esc(state.search) + '&rdquo;</strong>. Clear the search to see everything.</div>' +
        '</div>'
      );
      return;
    }

    // Render all lanes (even empty ones so dispatchers see the priority
    // hierarchy) in priority order. Respect the priority filter pill.
    var html = '';
    for (var i = 0; i < LANES.length; i++) {
      var lane = LANES[i];
      if (state.priorityFilter !== 'all' && state.priorityFilter !== lane.key) continue;
      html += laneHtml(lane, grouped[lane.key] || []);
    }
    $lanes.html(html);

    // Apply active priority filter pill
    $('.cd-board-pill').removeClass('is-active');
    $('.cd-board-pill[data-priority="' + state.priorityFilter + '"]').addClass('is-active');

    // Restore selection highlight
    if (state.selectedCallId) {
      $('.cd-call-card[data-call-id="' + cssEsc(state.selectedCallId) + '"]').addClass('is-selected');
    }
  }

  function laneHtml(lane, items) {
    var collapsed = state.laneCollapsed[lane.key];
    return (
      '<section class="cd-board-lane' + (collapsed ? ' is-collapsed' : '') + (items.length ? '' : ' is-empty') + '" data-lane="' + esc(lane.key) + '" style="--cd-lane-accent:' + esc(lane.accent) + ';">' +
        '<button type="button" class="cd-board-lane-header" data-lane-toggle="' + esc(lane.key) + '" aria-expanded="' + (!collapsed) + '">' +
          '<i class="fa fa-chevron-down cd-board-lane-chevron"></i>' +
          '<span class="cd-board-lane-pip"></span>' +
          '<span class="cd-board-lane-label">' + esc(lane.label) + '</span>' +
          '<span class="cd-board-lane-count">' + items.length + '</span>' +
        '</button>' +
        (collapsed
          ? ''
          : '<div class="cd-board-lane-body">' +
              (items.length
                ? items.map(callCardHtml).join('')
                : '<div class="cd-board-lane-empty">No open ' + esc(lane.label.toLowerCase()) + ' calls.</div>') +
            '</div>') +
      '</section>'
    );
  }

  function callCardHtml(c) {
    var elapsed = formatElapsed(c.createdAtMs);
    var title = c.is911 ? c.title.replace(/^911\s*:\s*/i, '') : c.title;
    var assignedHtml = renderAssignedPills(c.assignedTo);
    var classifierPill = c.classifierLabel ? '<span class="cd-call-classifier">' + esc(c.classifierLabel) + '</span>' : '';

    return (
      '<article class="cd-call-card" data-call-id="' + esc(c.id) + '" data-lane="' + esc(c.lane) + '" tabindex="0" role="button" aria-label="Call: ' + esc(title) + '">' +
        '<header class="cd-call-card-header">' +
          (c.is911 ? '<span class="cd-call-badge-911">911</span>' : '') +
          '<span class="cd-call-card-title">' + esc(title) + '</span>' +
          '<span class="cd-call-card-elapsed" data-created-ms="' + esc(String(c.createdAtMs || 0)) + '">' + esc(elapsed) + '</span>' +
        '</header>' +
        (c.details ? '<p class="cd-call-card-details">' + esc(c.details) + '</p>' : '') +
        '<footer class="cd-call-card-footer">' +
          '<div class="cd-call-card-assigned" data-drop-zone="call" data-call-id="' + esc(c.id) + '">' +
            (assignedHtml || '<span class="cd-call-unassigned">Unassigned</span>') +
          '</div>' +
          '<div class="cd-call-card-meta">' +
            classifierPill +
            (c.notesCount ? '<span class="cd-call-notes-count" title="' + esc(c.notesCount) + ' note' + (c.notesCount === 1 ? '' : 's') + '"><i class="fa fa-comment-dots"></i> ' + c.notesCount + '</span>' : '') +
            '<button type="button" class="cd-call-card-menu" data-call-id="' + esc(c.id) + '" aria-label="Call actions" title="Call actions"><i class="fa fa-ellipsis-vertical"></i></button>' +
          '</div>' +
        '</footer>' +
      '</article>'
    );
  }

  function renderAssignedPills(userIds) {
    if (!userIds || !userIds.length) return '';
    var html = '';
    for (var i = 0; i < userIds.length && i < 6; i++) {
      var uid = userIds[i];
      var unit = (typeof window.cdDispatchRosterGetUnit === 'function') ? window.cdDispatchRosterGetUnit(uid) : null;
      html += assignedPillHtml(unit, uid);
    }
    if (userIds.length > 6) {
      html += '<span class="cd-assigned-more" title="' + userIds.length + ' assigned">+' + (userIds.length - 6) + '</span>';
    }
    return html;
  }

  function assignedPillHtml(unit, fallbackId) {
    if (!unit) {
      return '<span class="cd-assigned-pill" data-uid="' + esc(fallbackId) + '" data-dept="other">' +
        '<i class="fa fa-user" aria-hidden="true"></i>' +
        '<span class="cd-assigned-pill-label">…</span>' +
      '</span>';
    }
    var dv = (typeof window.cdDispatchDeptVisual === 'function') ? window.cdDispatchDeptVisual(unit.deptTemplate) : null;
    var icon = dv && dv.icon ? dv.icon : 'fa-user';
    var color = dv && dv.color ? dv.color : 'var(--cd-accent)';
    return (
      '<span class="cd-assigned-pill" data-uid="' + esc(unit.id) + '" data-dept="' + esc(unit.deptKey || 'other') + '" data-tone="' + esc(unit.tone || 'other') + '" style="--cd-dept-color:' + esc(color) + ';" title="' + esc(unit.callSign || unit.username) + '">' +
        '<i class="fa ' + esc(icon) + '" aria-hidden="true"></i>' +
        '<span class="cd-assigned-pill-label">' + esc(unit.callSign || '—') + '</span>' +
      '</span>'
    );
  }

  function formatElapsed(ms) {
    if (!ms) return '—';
    var diff = Date.now() - ms;
    if (diff < 0) diff = 0;
    var s = Math.floor(diff / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    if (h) return h + ':' + pad(m % 60) + ':' + pad(s % 60);
    return pad(m) + ':' + pad(s % 60);
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function cssEsc(s) { return String(s || '').replace(/["\\]/g, '\\$&'); }

  function startElapsedTicker() {
    if (state.tickTimer) clearInterval(state.tickTimer);
    state.tickTimer = setInterval(function () {
      $('.cd-call-card-elapsed').each(function () {
        var ms = parseInt(this.getAttribute('data-created-ms'), 10) || 0;
        this.textContent = formatElapsed(ms);
      });
    }, 1000);
  }

  // ── Events ────────────────────────────────────────

  function wireEvents() {
    $(document)
      .off('.cdDispatchBoard')
      .on('click.cdDispatchBoard', '#cd-dispatch-new-call', function () {
        if (typeof window.cdDispatchIntakeOpen === 'function') {
          window.cdDispatchIntakeOpen('create');
        } else {
          toast('Call intake modal lands in step 6.', 'info');
        }
      })
      .on('click.cdDispatchBoard', '.cd-call-card', function (e) {
        if ($(e.target).closest('.cd-call-card-menu').length) return;
        var id = $(this).data('call-id');
        if (!id) return;
        if (typeof window.cdDispatchDetailSelect === 'function') {
          window.cdDispatchDetailSelect(id);
        }
        window.cdDispatchBoardSelectCall(id);
      })
      .on('keydown.cdDispatchBoard', '.cd-call-card', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          $(this).trigger('click');
        }
      })
      .on('click.cdDispatchBoard', '.cd-call-card-menu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).data('call-id');
        if (typeof window.cdDispatchAssignMenuForCall === 'function') {
          window.cdDispatchAssignMenuForCall(id);
        } else {
          toast('Assignment menu lands with drag-and-drop (step 7).', 'info');
        }
      })
      .on('click.cdDispatchBoard', '[data-lane-toggle]', function (e) {
        e.preventDefault();
        var k = $(this).data('lane-toggle');
        state.laneCollapsed[k] = !state.laneCollapsed[k];
        renderLanes();
      })
      .on('click.cdDispatchBoard', '.cd-board-pill', function () {
        state.priorityFilter = $(this).data('priority');
        // Auto-expand a lane when its pill is filtered to so the user isn't
        // staring at a collapsed lane they just selected.
        if (state.priorityFilter !== 'all') state.laneCollapsed[state.priorityFilter] = false;
        renderLanes();
      })
      .on('input.cdDispatchBoard', '#cd-board-search-input', function () {
        state.search = String(this.value || '').trim();
        // When searching, expand every lane so matches aren't hidden behind
        // a collapsed header. Restore when the search is cleared.
        if (state.search) {
          state.laneCollapsed = { p1: false, p2: false, p3: false, other: false };
        }
        renderLanes();
      });

    // Subscribe to existing call-lifecycle socket events on the shared socket.
    attachSocket();
  }

  function attachSocket() {
    var s = window._cdSharedSocket;
    if (!s) {
      // Retry shortly — cd-alerts.js initialises the socket asynchronously.
      setTimeout(attachSocket, 500);
      return;
    }
    // Avoid double-binding on re-init
    if (s.__cdDispatchBoardBound) return;
    s.__cdDispatchBoardBound = true;

    s.on('created_call', function (data) {
      if (!data) return;
      // created_call payload historically emits the raw call doc; accept either shape.
      var communityId = cfg().communityId;
      var callDoc = data.call || data;
      var cid = (callDoc && callDoc.communityID) || (callDoc && callDoc.call && callDoc.call.communityID);
      if (cid && cid !== communityId) return;
      window.cdDispatchBoardUpsertCall(callDoc);
    });
    s.on('updated_call', function (data) {
      if (!data) return;
      var callDoc = data.call || data;
      var cid = callDoc && callDoc.communityID;
      if (cid && cid !== cfg().communityId) return;
      // If the call has been closed, remove it from the open board
      var inner = callDoc.call || callDoc;
      if (inner && inner.status === false) {
        window.cdDispatchBoardRemoveCall(callDoc._id || inner._id);
      } else {
        window.cdDispatchBoardUpsertCall(callDoc);
      }
    });
    s.on('cleared_call', function (data) {
      if (!data) return;
      var id = data.callId || data._id || (data.call && data.call._id);
      if (id) window.cdDispatchBoardRemoveCall(id);
    });
  }

  // ── Styles ────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('cd-dispatch-board-styles')) return;
    var css = [
      // container-type lets inner cards use container queries to drop to
      // full-width layout when the board column itself is narrow.
      '#cd-dispatch-board{container-type:inline-size;}',
      // Sticky toolbar: solid --cd-bg so call cards don't bleed through the
      // "+ New Call" button and priority filter when the list scrolls.
      '.cd-board-toolbar{display:flex;align-items:center;gap:0.625rem;padding:0.75rem 0 0.75rem;border-bottom:1px solid var(--cd-glass-border);margin:-0.75rem -0.75rem 0.75rem;padding-left:0.75rem;padding-right:0.75rem;position:sticky;top:-0.75rem;background:var(--cd-bg);z-index:3;box-shadow:0 4px 12px -6px rgba(0,0,0,0.5);flex-wrap:wrap;}',
      '.cd-board-new{display:inline-flex;align-items:center;gap:0.4375rem;padding:0.4375rem 0.8125rem;border-radius:8px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.12);color:var(--cd-accent);font:600 0.75rem/1 inherit;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;transition:all .15s;}',
      '.cd-board-new:hover{background:rgba(56,189,248,0.2);color:#fff;border-color:rgba(56,189,248,0.5);}',
      '.cd-board-toolbar-sep{width:1px;height:18px;background:var(--cd-glass-border);}',
      '.cd-board-hint{font-size:0.6875rem;color:var(--cd-text-dim);}',
      '.cd-board-search{flex:1;min-width:140px;display:flex;align-items:center;gap:0.4375rem;padding:0.375rem 0.625rem;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--cd-glass-border);}',
      '.cd-board-search i{color:var(--cd-text-dim);font-size:0.75rem;}',
      '.cd-board-search input{flex:1;background:transparent;border:0;outline:0;color:var(--cd-text);font-family:inherit;font-size:0.8125rem;min-width:0;}',
      '.cd-board-search input::placeholder{color:var(--cd-text-dim);}',
      '.cd-board-search:focus-within{border-color:rgba(56,189,248,0.4);background:rgba(56,189,248,0.04);}',
      '.cd-board-priority-pills{display:flex;gap:0.25rem;min-width:0;flex-wrap:wrap;}',
      '.cd-board-pill{display:inline-flex;align-items:center;gap:0.3125rem;padding:0.3125rem 0.5rem;border-radius:6px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text-dim);font:600 0.6875rem/1 inherit;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;transition:all .15s;white-space:nowrap;}',
      '.cd-board-pill:hover{color:var(--cd-text-muted);background:rgba(255,255,255,0.04);}',
      '.cd-board-pill.is-active{color:var(--cd-text);background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.18);}',
      '.cd-board-pill-pip{width:7px;height:7px;border-radius:999px;}',
      '.cd-board-pill-p1 .cd-board-pill-pip{background:var(--cd-red);box-shadow:0 0 0 2px rgba(239,68,68,0.18);}',
      '.cd-board-pill-p2 .cd-board-pill-pip{background:var(--cd-amber);box-shadow:0 0 0 2px rgba(245,158,11,0.18);}',
      '.cd-board-pill-p3 .cd-board-pill-pip{background:var(--cd-accent);box-shadow:0 0 0 2px rgba(56,189,248,0.18);}',
      '.cd-board-pill-other .cd-board-pill-pip{background:var(--cd-text-dim);}',
      '.cd-board-pill-p1.is-active{color:#fca5a5;border-color:rgba(239,68,68,0.35);background:rgba(239,68,68,0.08);}',
      '.cd-board-pill-p2.is-active{color:#fcd34d;border-color:rgba(245,158,11,0.35);background:rgba(245,158,11,0.08);}',
      '.cd-board-pill-p3.is-active{color:#7dd3fc;border-color:rgba(56,189,248,0.35);background:rgba(56,189,248,0.08);}',
      '.cd-board-lane.is-collapsed .cd-board-lane-body{display:none;}',
      '.cd-board-lane.is-collapsed .cd-board-lane-chevron{transform:rotate(-90deg);}',
      '.cd-board-lane.is-empty .cd-board-lane-header{opacity:0.55;}',
      '.cd-board-lane-header{width:100%;display:flex;align-items:center;gap:0.5rem;padding:0.4375rem 0.5rem;border:0;background:transparent;color:var(--cd-text-muted);font:700 0.6875rem/1 inherit;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;border-radius:6px;transition:background .15s;}',
      '.cd-board-lane-header:hover{background:rgba(255,255,255,0.03);color:var(--cd-text);}',
      '.cd-board-lane-chevron{font-size:0.625rem;color:var(--cd-text-dim);transition:transform .15s;}',
      '.cd-board-lane-empty{font-size:0.75rem;color:var(--cd-text-dim);font-style:italic;padding:0.5rem 0.25rem;grid-column:1 / -1;flex-basis:100%;}',
      '.cd-board-lanes{display:flex;flex-direction:column;gap:0.875rem;min-width:0;}',
      '.cd-board-lane{display:flex;flex-direction:column;gap:0.5rem;min-width:0;}',
      '.cd-board-lane-header{display:flex;align-items:center;gap:0.5rem;padding:0 0.25rem;font:700 0.6875rem/1 inherit;letter-spacing:0.1em;text-transform:uppercase;color:var(--cd-text-muted);}',
      '.cd-board-lane-pip{width:8px;height:8px;border-radius:999px;background:var(--cd-lane-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cd-lane-accent) 18%,transparent);}',
      '.cd-board-lane-count{margin-left:auto;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:0.75rem;color:var(--cd-text-dim);letter-spacing:0;}',
      // Flex-wrap with min-width cards: cards stay readable at small widths and
      // wrap to multiple rows as the column gets wider. Prevents squish.
      '.cd-board-lane-body{display:flex;flex-wrap:wrap;gap:0.5rem;min-width:0;}',
      '.cd-board-lane-body > .cd-call-card{flex:1 1 240px;min-width:240px;max-width:100%;}',
      // Under ~640 px inner width, cards go full width to avoid awkward single-column squish
      '@container (max-width: 640px){.cd-board-lane-body > .cd-call-card{flex-basis:100%;}}',
      '.cd-call-card{position:relative;display:flex;flex-direction:column;gap:0.375rem;padding:0.625rem 0.75rem;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--cd-glass-border);cursor:pointer;transition:all .15s;border-left:3px solid var(--cd-lane-accent);}',
      '.cd-call-card::before{content:"";position:absolute;inset:0;border-radius:10px;pointer-events:none;background:linear-gradient(90deg,color-mix(in srgb,var(--cd-lane-accent) 6%,transparent) 0%,transparent 50%);opacity:0.7;}',
      '.cd-call-card > *{position:relative;}',
      '.cd-call-card:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);border-left-color:var(--cd-lane-accent);}',
      '.cd-call-card[data-lane="p1"]{border-left-width:4px;box-shadow:-8px 0 24px -16px rgba(239,68,68,0.4);}',
      '.cd-call-card[data-lane="p1"] .cd-call-card-elapsed{color:#fca5a5;}',
      '.cd-call-card:focus-visible{outline:2px solid var(--cd-accent);outline-offset:2px;}',
      '.cd-call-card.is-selected{background:rgba(56,189,248,0.08);border-color:rgba(56,189,248,0.4);}',
      '.cd-call-card.drop-target{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.55);transform:scale(1.015);}',
      '.cd-call-card-header{display:flex;align-items:center;gap:0.4375rem;}',
      '.cd-call-badge-911{padding:0.0625rem 0.375rem;border-radius:4px;background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;font:700 0.625rem/1.3 "JetBrains Mono",ui-monospace,monospace;letter-spacing:0.06em;flex-shrink:0;}',
      '.cd-call-card-title{flex:1;font:600 0.8125rem/1.25 inherit;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.cd-call-card-elapsed{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:0.6875rem;color:var(--cd-text-dim);flex-shrink:0;}',
      '.cd-call-card-details{margin:0;font-size:0.75rem;line-height:1.35;color:var(--cd-text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.cd-call-card-footer{display:flex;align-items:center;gap:0.5rem;padding-top:0.25rem;border-top:1px dashed var(--cd-glass-border);}',
      '.cd-call-card-assigned{flex:1;display:flex;flex-wrap:wrap;gap:0.25rem;min-height:24px;align-items:center;padding:2px;border-radius:6px;}',
      '.cd-call-card-assigned.drop-target{background:rgba(56,189,248,0.1);outline:1px dashed rgba(56,189,248,0.4);}',
      '.cd-call-unassigned{font-size:0.6875rem;color:var(--cd-text-dim);font-style:italic;padding:0 0.25rem;}',
      '.cd-call-card-meta{display:flex;align-items:center;gap:0.4375rem;flex-shrink:0;}',
      '.cd-call-classifier{padding:0.0625rem 0.4375rem;border-radius:4px;background:rgba(255,255,255,0.04);border:1px solid var(--cd-glass-border);font-size:0.625rem;color:var(--cd-text-muted);letter-spacing:0.02em;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;}',
      '.cd-call-notes-count{display:inline-flex;align-items:center;gap:0.25rem;font-size:0.6875rem;color:var(--cd-text-dim);}',
      '.cd-call-notes-count i{font-size:0.6875rem;}',
      '.cd-call-card-menu{width:22px;height:22px;border-radius:5px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}',
      '.cd-call-card-menu:hover,.cd-call-card-menu:focus-visible{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text);outline:none;}',
      '.cd-assigned-pill{display:inline-flex;align-items:center;gap:0.3125rem;padding:0.125rem 0.4375rem;border-radius:999px;background:color-mix(in srgb,var(--cd-dept-color,var(--cd-accent)) 10%,transparent);border:1px solid color-mix(in srgb,var(--cd-dept-color,var(--cd-accent)) 30%,transparent);color:var(--cd-dept-color,var(--cd-accent));font:600 0.6875rem/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:0.04em;}',
      '.cd-assigned-pill i{font-size:0.625rem;}',
      '.cd-assigned-pill-label{color:var(--cd-text);font-family:inherit;font-weight:600;letter-spacing:0;}',
      '.cd-assigned-more{display:inline-flex;align-items:center;padding:0.125rem 0.4375rem;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid var(--cd-glass-border);color:var(--cd-text-muted);font:600 0.6875rem/1 "JetBrains Mono",ui-monospace,monospace;}',
      '.cd-board-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1.5rem;text-align:center;color:var(--cd-text-muted);}',
      '.cd-board-empty-ring{width:64px;height:64px;border-radius:999px;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;background:radial-gradient(circle,rgba(56,189,248,0.12) 0%,transparent 70%);border:1px solid rgba(56,189,248,0.2);color:var(--cd-accent);font-size:1.25rem;box-shadow:0 0 0 0 rgba(56,189,248,0.4);animation:cd-board-empty-pulse 3s ease-in-out infinite;}',
      '.cd-board-empty-title{font:700 0.8125rem/1 inherit;letter-spacing:0.1em;text-transform:uppercase;color:var(--cd-text);margin-bottom:0.375rem;}',
      '.cd-board-empty-hint{font-size:0.75rem;line-height:1.5;max-width:280px;color:var(--cd-text-dim);}',
      '.cd-board-empty-hint strong{color:var(--cd-text-muted);}',
      '@keyframes cd-board-empty-pulse{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,0.2);}50%{box-shadow:0 0 0 12px rgba(56,189,248,0);}}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dispatch-board-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
