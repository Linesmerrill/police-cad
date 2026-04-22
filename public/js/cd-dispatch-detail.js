/**
 * Command Dashboard — Dispatch Call Detail Drawer
 *
 * Right zone (1440+), slide-over drawer at ≤1024 px. Displays the currently
 * selected call — title, classifier, assigned units, notes timeline, and
 * action buttons. All per-note CRUD happens here via:
 *   POST   /api/v1/call/{callId}/note
 *   PUT    /api/v1/call/{callId}/note/{noteId}
 *   DELETE /api/v1/call/{callId}/note/{noteId}
 *
 * Also authors window.cdRenderAssignedPill for reuse by the detail pane itself
 * and any future surface that needs to render a single assigned-unit pill.
 */
;(function () {
  'use strict';

  function cfg()  { return window.ddConfig || {}; }
  function api()  { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }

  var state = {
    callId: null,
    call: null,     // full call doc (with notes)
    loading: false,
    editingNoteId: null,
  };
  window.__cdDispatchDetailState = state;

  // ── Public API ────────────────────────────────────

  window.cdDispatchDetailInit = function () {
    injectStyles();
    renderEmpty();
    wireEvents();
  };

  window.cdDispatchDetailSelect = function (callId) {
    if (!callId) return;
    state.callId = callId;
    state.loading = true;
    render();
    openDrawerIfMobile();

    $.ajax({
      url: api() + '/api/v1/call/' + encodeURIComponent(callId),
      method: 'GET',
    }).done(function (resp) {
      var c = (resp && (resp.call || resp)) || null;
      // Unwrap: endpoint may return {_id, call:{...}} or just call details
      if (c && c.call) c = c.call;
      state.call = c;
      state.loading = false;
      render();
    }).fail(function (xhr) {
      state.loading = false;
      state.call = null;
      render();
      toast('Failed to load call', 'error');
      console.error('[cd-dispatch-detail] load failed', xhr && xhr.responseText);
    });
  };

  window.cdDispatchDetailClear = function () {
    state.callId = null;
    state.call = null;
    renderEmpty();
    closeDrawer();
  };

  // Shared pill renderer — also exposed on window for other modules.
  window.cdRenderAssignedPill = function (userId, opts) {
    opts = opts || {};
    var unit = (typeof window.cdDispatchRosterGetUnit === 'function') ? window.cdDispatchRosterGetUnit(userId) : null;
    var dv = (typeof window.cdDispatchDeptVisual === 'function')
      ? window.cdDispatchDeptVisual(unit ? unit.deptTemplate : '')
      : { icon: 'fa-user', color: 'var(--cd-accent)' };
    var label = unit ? (unit.callSign || unit.username || '—') : '…';
    var tone  = unit ? (unit.tone || 'other') : 'other';
    var removeBtn = opts.removable
      ? '<button type="button" class="cd-detail-pill-remove" data-user-id="' + esc(userId) + '" aria-label="Unassign ' + esc(label) + '" title="Unassign"><i class="fa fa-xmark"></i></button>'
      : '';
    return (
      '<span class="cd-assigned-pill cd-assigned-pill-lg" data-uid="' + esc(userId) + '" data-tone="' + esc(tone) + '" style="--cd-dept-color:' + esc(dv.color) + ';" title="' + esc(label) + '">' +
        '<i class="fa ' + esc(dv.icon) + '" aria-hidden="true"></i>' +
        '<span class="cd-assigned-pill-label">' + esc(label) + '</span>' +
        removeBtn +
      '</span>'
    );
  };

  // ── Render ────────────────────────────────────────

  function renderEmpty() {
    var $host = $('#cd-dispatch-detail');
    if (!$host.length) return;
    $host.html(
      '<div class="cd-dispatch-placeholder">' +
        '<i class="fa fa-file-lines"></i>' +
        '<div>Select a call to view details.</div>' +
      '</div>'
    );
  }

  function render() {
    var $host = $('#cd-dispatch-detail');
    if (!$host.length) return;
    if (state.loading) {
      $host.html(
        '<div class="cd-dispatch-placeholder">' +
          '<i class="fa fa-circle-notch fa-spin"></i>' +
          '<div>Loading call…</div>' +
        '</div>'
      );
      return;
    }
    if (!state.call) { renderEmpty(); return; }

    var c = state.call;
    var title = c.title || 'Untitled Call';
    var is911 = /^911\s*:/i.test(title);
    if (is911) title = title.replace(/^911\s*:\s*/i, '');

    var assignedTo = c.assignedTo || [];
    var assignedHtml = assignedTo.length
      ? assignedTo.map(function (uid) { return window.cdRenderAssignedPill(uid, { removable: true }); }).join('')
      : '<span class="cd-detail-empty-inline">No units assigned yet. Drag a unit from the roster onto this card.</span>';

    var classifierLabel = '';
    var priority = null;
    var classifier = c.classifier || [];
    if (classifier.length) {
      var first = classifier[0];
      if (typeof first === 'string') {
        classifierLabel = first;
        var m = first.match(/p\s*(\d)/i); if (m) priority = m[1];
      } else if (first && typeof first === 'object') {
        classifierLabel = first.label || first.name || first.description || first.code || '';
        if (first.priority != null) priority = String(first.priority);
      }
    }
    // 911 calls default to P1 if no priority was set. Matches the board's
    // normalize() logic so the detail pane lane matches the card's lane.
    if (priority == null && is911) priority = '1';
    var priorityMap = {
      '1': { label: 'P1 · High',   accent: 'var(--cd-red)' },
      '2': { label: 'P2 · Medium', accent: 'var(--cd-amber)' },
      '3': { label: 'P3 · Low',    accent: 'var(--cd-accent)' },
    };
    var priorityPill = priority && priorityMap[priority]
      ? '<span class="cd-detail-priority" style="--cd-pri-accent:' + esc(priorityMap[priority].accent) + ';">' +
          '<span class="cd-detail-priority-pip"></span>' +
          esc(priorityMap[priority].label) +
        '</span>'
      : '';

    var notes = (c.callNotes || []).slice().sort(function (a, b) {
      var ta = new Date(a.createdAt || 0).getTime() || 0;
      var tb = new Date(b.createdAt || 0).getTime() || 0;
      return tb - ta;
    });

    var isClosed = c.status === false;

    $host.html(
      '<div class="cd-detail">' +

        // Header
        '<header class="cd-detail-head">' +
          (is911 ? '<span class="cd-call-badge-911">911</span>' : '') +
          '<h2 class="cd-detail-title">' + esc(title) + '</h2>' +
          '<button type="button" class="cd-detail-close" id="cd-detail-close" aria-label="Close detail"><i class="fa fa-xmark"></i></button>' +
        '</header>' +

        // Meta line
        '<div class="cd-detail-meta">' +
          priorityPill +
          (classifierLabel && !priority ? '<span class="cd-call-classifier">' + esc(classifierLabel) + '</span>' : '') +
          '<span class="cd-detail-created">Created by <strong>' + esc(c.createdByUsername || 'unknown') + '</strong> · ' + esc(formatDate(c.createdAt)) + '</span>' +
          (isClosed ? '<span class="cd-detail-closed-tag">Closed</span>' : '<span class="cd-detail-open-tag">Open</span>') +
        '</div>' +

        // Body
        (c.details ? '<section class="cd-detail-section"><h3>Details</h3><p class="cd-detail-body-text">' + esc(c.details) + '</p></section>' : '') +

        // Assigned
        '<section class="cd-detail-section">' +
          '<h3>Assigned Units <span class="cd-detail-counter">' + assignedTo.length + '</span></h3>' +
          '<div class="cd-detail-pill-zone" data-drop-zone="call" data-call-id="' + esc(state.callId) + '">' + assignedHtml + '</div>' +
          '<button type="button" class="cd-detail-btn-ghost" id="cd-detail-assign"><i class="fa fa-plus"></i> Assign unit…</button>' +
        '</section>' +

        // Notes
        '<section class="cd-detail-section">' +
          '<h3>Notes <span class="cd-detail-counter">' + notes.length + '</span></h3>' +
          '<form class="cd-detail-note-form" id="cd-detail-note-form">' +
            '<textarea id="cd-detail-note-input" rows="2" placeholder="Add a dispatch note (e.g. \'10-97 on scene\')…" maxlength="2000"></textarea>' +
            '<button type="submit" class="cd-detail-btn-primary"><i class="fa fa-paper-plane"></i> Post</button>' +
          '</form>' +
          renderNotesList(notes) +
        '</section>' +

        // Actions
        '<section class="cd-detail-actions">' +
          (isClosed
            ? '<button type="button" class="cd-detail-btn-primary" id="cd-detail-reopen"><i class="fa fa-arrow-rotate-left"></i> Reopen</button>'
            : '<button type="button" class="cd-detail-btn-primary" id="cd-detail-close-call"><i class="fa fa-check"></i> Close Call</button>') +
          '<button type="button" class="cd-detail-btn-ghost" id="cd-detail-edit"><i class="fa fa-pen"></i> Edit</button>' +
          '<button type="button" class="cd-detail-btn-danger" id="cd-detail-delete"><i class="fa fa-trash"></i> Delete</button>' +
        '</section>' +

      '</div>'
    );
  }

  function renderNotesList(notes) {
    if (!notes.length) return '<div class="cd-detail-empty-inline">No notes yet.</div>';
    var me = (cfg().dbUser && cfg().dbUser.user && cfg().dbUser.user.username) || '';
    return '<ul class="cd-detail-note-list">' + notes.map(function (n) {
      var canEdit = n.createdBy === me;
      return (
        '<li class="cd-detail-note" data-note-id="' + esc(n._id) + '">' +
          '<div class="cd-detail-note-head">' +
            '<span class="cd-detail-note-author">' + esc(n.createdBy || '—') + '</span>' +
            '<span class="cd-detail-note-time">' + esc(formatDate(n.createdAt)) + '</span>' +
          '</div>' +
          '<div class="cd-detail-note-body" data-note-id="' + esc(n._id) + '">' + esc(n.note) + '</div>' +
          (canEdit
            ? '<div class="cd-detail-note-actions">' +
                '<button type="button" class="cd-detail-note-edit" data-note-id="' + esc(n._id) + '" aria-label="Edit note"><i class="fa fa-pen"></i></button>' +
                '<button type="button" class="cd-detail-note-delete" data-note-id="' + esc(n._id) + '" aria-label="Delete note"><i class="fa fa-trash"></i></button>' +
              '</div>'
            : '') +
        '</li>'
      );
    }).join('') + '</ul>';
  }

  function formatDate(d) {
    if (!d) return '—';
    var dt = new Date(d);
    if (!isFinite(dt.getTime())) return String(d);
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · ' + dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // ── Events ────────────────────────────────────────

  function wireEvents() {
    $(document)
      .off('.cdDispatchDetail')
      .on('click.cdDispatchDetail', '#cd-detail-close', function () {
        window.cdDispatchDetailClear();
        if (typeof window.cdDispatchBoardSelectCall === 'function') window.cdDispatchBoardSelectCall(null);
      })
      .on('submit.cdDispatchDetail', '#cd-detail-note-form', function (e) {
        e.preventDefault();
        submitNewNote();
      })
      .on('click.cdDispatchDetail', '.cd-detail-note-edit', function () {
        var id = $(this).data('note-id');
        startEditNote(id);
      })
      .on('click.cdDispatchDetail', '.cd-detail-note-delete', function () {
        var id = $(this).data('note-id');
        deleteNote(id);
      })
      .on('click.cdDispatchDetail', '.cd-detail-pill-remove', function (e) {
        e.stopPropagation();
        var uid = $(this).data('user-id');
        unassignUnit(uid);
      })
      .on('click.cdDispatchDetail', '#cd-detail-assign', function () {
        if (typeof window.cdDispatchAssignMenuForCall === 'function') {
          window.cdDispatchAssignMenuForCall(state.callId);
        } else {
          toast('Assign menu lands with drag-and-drop (step 7).', 'info');
        }
      })
      .on('click.cdDispatchDetail', '#cd-detail-close-call', function () { closeCall(false); })
      .on('click.cdDispatchDetail', '#cd-detail-reopen',      function () { closeCall(true); })
      .on('click.cdDispatchDetail', '#cd-detail-edit', function () {
        if (typeof window.cdDispatchIntakeOpen === 'function') {
          window.cdDispatchIntakeOpen('edit', state.callId);
        } else {
          toast('Edit modal lands in step 6.', 'info');
        }
      })
      .on('click.cdDispatchDetail', '#cd-detail-delete', function () { deleteCall(); });
  }

  function submitNewNote() {
    var $ta = $('#cd-detail-note-input');
    var text = String($ta.val() || '').trim();
    if (!text || !state.callId) return;
    var username = (cfg().dbUser && cfg().dbUser.user && cfg().dbUser.user.username) || (cfg().userName || '');
    $.ajax({
      url: api() + '/api/v1/call/' + encodeURIComponent(state.callId) + '/note',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ note: text, createdBy: username, createdAt: new Date().toISOString() }),
    }).done(function () {
      $ta.val('');
      toast('Note added', 'success');
      reload();
    }).fail(function (xhr) {
      toast('Failed to add note', 'error');
      console.error('[cd-dispatch-detail] add-note failed', xhr && xhr.responseText);
    });
  }

  function startEditNote(noteId) {
    var $body = $('.cd-detail-note-body[data-note-id="' + cssEsc(noteId) + '"]');
    if (!$body.length) return;
    var current = $body.text();
    var $editor = $(
      '<form class="cd-detail-note-edit-form">' +
        '<textarea rows="3">' + esc(current) + '</textarea>' +
        '<div class="cd-detail-note-edit-actions">' +
          '<button type="submit" class="cd-detail-btn-primary">Save</button>' +
          '<button type="button" class="cd-detail-btn-ghost" data-action="cancel">Cancel</button>' +
        '</div>' +
      '</form>'
    );
    $body.hide().after($editor);
    $editor.find('textarea').focus();
    $editor.on('submit', function (e) {
      e.preventDefault();
      var newText = String($editor.find('textarea').val() || '').trim();
      if (!newText) return;
      saveEditedNote(noteId, newText, $body, $editor);
    });
    $editor.on('click', '[data-action="cancel"]', function () {
      $editor.remove();
      $body.show();
    });
  }

  function saveEditedNote(noteId, text, $body, $editor) {
    var username = (cfg().dbUser && cfg().dbUser.user && cfg().dbUser.user.username) || (cfg().userName || '');
    $.ajax({
      url: api() + '/api/v1/call/' + encodeURIComponent(state.callId) + '/note/' + encodeURIComponent(noteId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ note: text, updatedBy: username }),
    }).done(function () {
      toast('Note updated', 'success');
      reload();
    }).fail(function (xhr) {
      toast('Failed to update note', 'error');
      console.error('[cd-dispatch-detail] edit-note failed', xhr && xhr.responseText);
      $editor.remove();
      $body.show();
    });
  }

  function deleteNote(noteId) {
    // Use the site-wide ddModal for destructive confirms (never browser confirm()).
    if (!window.ddModal) return;
    window.ddModal({
      type: 'danger',
      icon: 'fa-trash',
      title: 'Delete note?',
      message: 'This note will be permanently removed from the call.',
      detail: 'This action cannot be undone.',
      confirmText: 'Delete note',
      confirmIcon: 'fa-trash',
      onConfirm: function () {
        $.ajax({
          url: api() + '/api/v1/call/' + encodeURIComponent(state.callId) + '/note/' + encodeURIComponent(noteId),
          method: 'DELETE',
        }).done(function () {
          toast('Note deleted', 'success');
          reload();
        }).fail(function (xhr) {
          toast('Failed to delete note', 'error');
          console.error('[cd-dispatch-detail] delete-note failed', xhr && xhr.responseText);
        });
      },
    });
  }

  function unassignUnit(userId) {
    if (!state.call) return;
    var current = (state.call.assignedTo || []).slice();
    var next = current.filter(function (u) { return u !== userId; });
    if (next.length === current.length) return;
    // Optimistic
    state.call.assignedTo = next;
    render();
    $.ajax({
      url: api() + '/api/v1/call/' + encodeURIComponent(state.callId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ assignedTo: next }),
    }).fail(function (xhr) {
      toast('Failed to unassign', 'error');
      console.error('[cd-dispatch-detail] unassign failed', xhr && xhr.responseText);
      // Roll back
      state.call.assignedTo = current;
      render();
    });
  }

  function closeCall(reopen) {
    if (!state.callId) return;
    $.ajax({
      url: api() + '/api/v1/call/' + encodeURIComponent(state.callId),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ status: !!reopen }),
    }).done(function () {
      toast(reopen ? 'Call reopened' : 'Call closed', 'success');
      if (!reopen && typeof window.cdDispatchBoardRemoveCall === 'function') {
        window.cdDispatchBoardRemoveCall(state.callId);
      }
      reload();
    }).fail(function (xhr) {
      toast('Failed to update call', 'error');
      console.error('[cd-dispatch-detail] close-call failed', xhr && xhr.responseText);
    });
  }

  function deleteCall() {
    if (!state.callId) return;
    if (!window.ddModal) return;
    var callId = state.callId;
    window.ddModal({
      type: 'danger',
      icon: 'fa-trash',
      title: 'Delete call?',
      message: 'This permanently removes the call, its notes, and its assignment history.',
      detail: 'This action cannot be undone.',
      confirmText: 'Delete call',
      confirmIcon: 'fa-trash',
      onConfirm: function () {
        $.ajax({
          url: api() + '/api/v1/call/' + encodeURIComponent(callId),
          method: 'DELETE',
        }).done(function () {
          toast('Call deleted', 'success');
          if (typeof window.cdDispatchBoardRemoveCall === 'function') {
            window.cdDispatchBoardRemoveCall(callId);
          }
          window.cdDispatchDetailClear();
        }).fail(function (xhr) {
          toast('Failed to delete call', 'error');
          console.error('[cd-dispatch-detail] delete-call failed', xhr && xhr.responseText);
        });
      },
    });
  }

  function reload() {
    if (state.callId) window.cdDispatchDetailSelect(state.callId);
  }

  // ── Drawer (mobile) ───────────────────────────────

  function openDrawerIfMobile() {
    var $zone = $('#cd-dispatch-detail-zone');
    if (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) {
      $zone.addClass('is-open');
      // Tap outside the drawer closes it
      $(document).off('click.cdDispatchDrawer').on('click.cdDispatchDrawer', function (e) {
        if (!window.matchMedia('(max-width: 1024px)').matches) return;
        if ($(e.target).closest('#cd-dispatch-detail-zone').length) return;
        if ($(e.target).closest('.cd-call-card').length) return; // clicks that opened the drawer
        window.cdDispatchDetailClear();
        if (typeof window.cdDispatchBoardSelectCall === 'function') window.cdDispatchBoardSelectCall(null);
      });
    }
  }

  function closeDrawer() {
    $('#cd-dispatch-detail-zone').removeClass('is-open');
    $(document).off('click.cdDispatchDrawer');
  }

  function cssEsc(s) { return String(s || '').replace(/["\\]/g, '\\$&'); }

  // ── Styles ────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('cd-dispatch-detail-styles')) return;
    var css = [
      '.cd-detail{display:flex;flex-direction:column;gap:0.875rem;}',
      '.cd-detail-head{display:flex;align-items:center;gap:0.5rem;padding-bottom:0.625rem;border-bottom:1px solid var(--cd-glass-border);}',
      '.cd-detail-title{margin:0;flex:1;font:600 0.9375rem/1.3 inherit;color:var(--cd-text);}',
      '.cd-detail-close{width:26px;height:26px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}',
      '.cd-detail-close:hover,.cd-detail-close:focus-visible{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text);outline:none;}',
      '.cd-detail-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;font-size:0.6875rem;color:var(--cd-text-dim);}',
      '.cd-detail-meta strong{color:var(--cd-text-muted);font-weight:600;}',
      '.cd-detail-priority{display:inline-flex;align-items:center;gap:0.3125rem;padding:0.125rem 0.5rem;border-radius:999px;border:1px solid color-mix(in srgb,var(--cd-pri-accent) 40%,transparent);background:color-mix(in srgb,var(--cd-pri-accent) 12%,transparent);color:color-mix(in srgb,var(--cd-pri-accent) 80%,white);font:700 0.6875rem/1 inherit;letter-spacing:0.04em;text-transform:uppercase;}',
      '.cd-detail-priority-pip{width:6px;height:6px;border-radius:999px;background:var(--cd-pri-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cd-pri-accent) 18%,transparent);}',
      '.cd-detail-open-tag,.cd-detail-closed-tag{padding:0.0625rem 0.4375rem;border-radius:999px;font:700 0.625rem/1.3 inherit;letter-spacing:0.06em;text-transform:uppercase;}',
      '.cd-detail-open-tag{background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);color:#86efac;}',
      '.cd-detail-closed-tag{background:rgba(100,116,139,0.18);border:1px solid rgba(100,116,139,0.35);color:#94a3b8;}',
      '.cd-detail-section{display:flex;flex-direction:column;gap:0.5rem;}',
      '.cd-detail-section h3{margin:0;font:700 0.6875rem/1 inherit;letter-spacing:0.1em;text-transform:uppercase;color:var(--cd-text-muted);display:flex;align-items:center;gap:0.375rem;}',
      '.cd-detail-counter{padding:0.0625rem 0.4375rem;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid var(--cd-glass-border);color:var(--cd-text-dim);font-family:"JetBrains Mono",ui-monospace,monospace;font-size:0.625rem;letter-spacing:0;}',
      '.cd-detail-body-text{margin:0;font-size:0.8125rem;line-height:1.5;color:var(--cd-text);white-space:pre-wrap;}',
      '.cd-detail-pill-zone{display:flex;flex-wrap:wrap;gap:0.375rem;min-height:32px;padding:0.375rem;border-radius:8px;border:1px dashed var(--cd-glass-border);transition:all .15s;}',
      '.cd-detail-pill-zone.drop-target{border-color:rgba(56,189,248,0.5);background:rgba(56,189,248,0.06);}',
      '.cd-detail-empty-inline{font-size:0.75rem;color:var(--cd-text-dim);font-style:italic;padding:0.25rem;}',
      '.cd-assigned-pill-lg{padding:0.25rem 0.5625rem;font-size:0.75rem;}',
      '.cd-detail-pill-remove{margin-left:0.25rem;width:16px;height:16px;border-radius:4px;border:0;background:transparent;color:currentColor;opacity:0.5;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;}',
      '.cd-detail-pill-remove:hover{opacity:1;background:rgba(239,68,68,0.2);color:#fca5a5;}',
      '.cd-detail-note-form{display:flex;gap:0.375rem;align-items:flex-start;}',
      '.cd-detail-note-form textarea,.cd-detail-note-edit-form textarea{flex:1;padding:0.5rem 0.625rem;border-radius:8px;border:1px solid var(--cd-glass-border);background:rgba(255,255,255,0.03);color:var(--cd-text);font-family:inherit;font-size:0.8125rem;line-height:1.4;resize:vertical;min-height:38px;}',
      '.cd-detail-note-form textarea:focus,.cd-detail-note-edit-form textarea:focus{outline:none;border-color:rgba(56,189,248,0.5);background:rgba(56,189,248,0.04);}',
      '.cd-detail-note-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.5rem;}',
      '.cd-detail-note{padding:0.5rem 0.625rem;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid var(--cd-glass-border);}',
      '.cd-detail-note-head{display:flex;align-items:baseline;justify-content:space-between;gap:0.5rem;margin-bottom:0.25rem;font-size:0.6875rem;color:var(--cd-text-dim);}',
      '.cd-detail-note-author{color:var(--cd-text-muted);font-weight:600;}',
      '.cd-detail-note-body{font-size:0.8125rem;line-height:1.45;color:var(--cd-text);white-space:pre-wrap;word-break:break-word;}',
      '.cd-detail-note-actions{display:flex;gap:0.25rem;margin-top:0.375rem;}',
      '.cd-detail-note-edit,.cd-detail-note-delete{width:22px;height:22px;border-radius:5px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-size:0.625rem;}',
      '.cd-detail-note-edit:hover{border-color:var(--cd-glass-border);color:var(--cd-text);background:rgba(255,255,255,0.04);}',
      '.cd-detail-note-delete:hover{border-color:rgba(239,68,68,0.3);color:#fca5a5;background:rgba(239,68,68,0.1);}',
      '.cd-detail-note-edit-form{display:flex;flex-direction:column;gap:0.375rem;margin-top:0.375rem;}',
      '.cd-detail-note-edit-actions{display:flex;gap:0.375rem;justify-content:flex-end;}',
      '.cd-detail-actions{display:flex;gap:0.4375rem;flex-wrap:wrap;padding-top:0.75rem;border-top:1px solid var(--cd-glass-border);}',
      '.cd-detail-btn-primary,.cd-detail-btn-ghost,.cd-detail-btn-danger{display:inline-flex;align-items:center;gap:0.3125rem;padding:0.4375rem 0.75rem;border-radius:8px;font:600 0.75rem/1 inherit;letter-spacing:0.04em;cursor:pointer;transition:all .15s;border:1px solid;}',
      '.cd-detail-btn-primary{border-color:rgba(56,189,248,0.4);background:rgba(56,189,248,0.12);color:var(--cd-accent);}',
      '.cd-detail-btn-primary:hover{background:rgba(56,189,248,0.22);color:#fff;}',
      '.cd-detail-btn-ghost{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.02);color:var(--cd-text-muted);}',
      '.cd-detail-btn-ghost:hover{background:rgba(255,255,255,0.05);color:var(--cd-text);}',
      '.cd-detail-btn-danger{border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#fca5a5;}',
      '.cd-detail-btn-danger:hover{background:rgba(239,68,68,0.18);color:#fff;}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dispatch-detail-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
