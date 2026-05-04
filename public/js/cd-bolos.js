/**
 * Command Dashboard — BOLOs Component
 *
 * Registers window.cdBolosRender and window.cdBolosInit for the
 * command dashboard component registry. Provides BOLO listing,
 * creation, clearing, and deletion.
 *
 * Dependencies (provided by the host page):
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, departmentId, userName }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 *   - window.ddModal() Unified modal helper
 */
;(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  function cfg() { return window.ddConfig || {}; }
  function esc(s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }
  function apiUrl() { return cfg().API_URL || ''; }

  /* ───────────────────────────────────────────
     Relative Time Helper
     ─────────────────────────────────────────── */

  function relativeTime(dateStr) {
    if (!dateStr) return '';
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    if (isNaN(then)) return '';
    var diff = Math.max(0, now - then);
    var sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    var day = Math.floor(hr / 24);
    if (day < 30) return day + 'd ago';
    var mo = Math.floor(day / 30);
    return mo + 'mo ago';
  }

  /* ───────────────────────────────────────────
     State
     ─────────────────────────────────────────── */

  var PAGE_SIZE = 20;
  var state = {
    bolos: [],
    filter: 'active', // 'active' | 'cleared' | 'all'
    loading: false,
    submitting: false
  };

  /* ───────────────────────────────────────────
     Inline Styles (<style> injected once)
     ─────────────────────────────────────────── */

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('cd-bolos-styles')) { stylesInjected = true; return; }
    stylesInjected = true;

    var css = '' +
      /* ── Card container ── */
      '.cd-bolo-card-wrap{background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:var(--cd-radius);overflow:hidden;}' +

      /* ── Header ── */
      '.cd-bolo-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-header-left{display:flex;align-items:center;gap:0.625rem;}' +
      '.cd-bolo-header-icon{width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:var(--cd-accent);font-size:1rem;}' +
      '.cd-bolo-header-text h3{margin:0;font-size:0.9375rem;font-weight:700;color:#fff;line-height:1.2;}' +
      '.cd-bolo-header-text span{font-size:0.6875rem;color:var(--cd-text-muted);font-weight:400;}' +
      '.cd-bolo-new-btn{padding:0.4375rem 0.875rem;border-radius:var(--cd-radius-sm);border:none;background:rgba(56,189,248,0.15);color:var(--cd-accent);font-family:inherit;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.cd-bolo-new-btn:hover{background:rgba(56,189,248,0.25);}' +

      /* ── Tabs ── */
      '.cd-bolo-tabs{display:flex;gap:0.375rem;padding:0.75rem 1.25rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-tab{padding:0.375rem 0.875rem;border-radius:999px;border:none;background:transparent;color:var(--cd-text-muted);font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;}' +
      '.cd-bolo-tab:hover{color:var(--cd-text);background:rgba(255,255,255,0.04);}' +
      '.cd-bolo-tab.cd-bolo-tab-active{background:rgba(56,189,248,0.15);color:var(--cd-accent);font-weight:600;}' +

      /* ── List ── */
      '.cd-bolo-list{padding:0.75rem 1.25rem;display:flex;flex-direction:column;gap:0.5rem;max-height:500px;overflow-y:auto;}' +

      /* ── BOLO Item ── */
      '.cd-bolo-item{background:rgba(255,255,255,0.02);border:1px solid var(--cd-glass-border);border-left:3px solid var(--cd-green);border-radius:var(--cd-radius-sm);padding:0.75rem 1rem;transition:all 0.2s;}' +
      '.cd-bolo-item:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);}' +
      '.cd-bolo-item.cd-bolo-cleared{border-left-color:var(--cd-text-dim);opacity:0.7;}' +
      '.cd-bolo-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;}' +
      '.cd-bolo-item-main{flex:1;min-width:0;}' +
      '.cd-bolo-title-row{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;}' +
      '.cd-bolo-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}' +
      '.cd-bolo-status-dot.cd-bolo-active{background:var(--cd-green);}' +
      '.cd-bolo-status-dot.cd-bolo-inactive{background:var(--cd-text-dim);}' +
      '.cd-bolo-title{font-size:0.875rem;font-weight:600;color:var(--cd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-bolo-scope-badge{padding:0.125rem 0.5rem;border-radius:999px;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0;}' +
      '.cd-bolo-scope-community{background:rgba(56,189,248,0.12);color:var(--cd-accent);}' +
      '.cd-bolo-scope-department{background:rgba(245,158,11,0.12);color:var(--cd-amber);}' +
      '.cd-bolo-location{display:flex;align-items:center;gap:0.375rem;font-size:0.75rem;color:var(--cd-text-muted);margin-top:0.25rem;}' +
      '.cd-bolo-location i{font-size:0.625rem;color:var(--cd-text-dim);}' +
      '.cd-bolo-desc{font-size:0.8125rem;color:var(--cd-text-muted);margin-top:0.375rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer;transition:all 0.2s;}' +
      '.cd-bolo-desc.cd-bolo-desc-expanded{-webkit-line-clamp:unset;display:block;}' +
      '.cd-bolo-meta{display:flex;align-items:center;gap:0.75rem;margin-top:0.5rem;font-size:0.6875rem;color:var(--cd-text-dim);}' +

      /* ── Actions ── */
      '.cd-bolo-actions{display:flex;gap:0.375rem;flex-shrink:0;align-items:flex-start;}' +
      '.cd-bolo-btn{padding:0.3125rem 0.625rem;border-radius:6px;border:none;font-family:inherit;font-size:0.6875rem;font-weight:500;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:0.25rem;}' +
      '.cd-bolo-btn-clear{background:rgba(255,255,255,0.04);color:var(--cd-text-muted);border:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-btn-clear:hover{background:rgba(255,255,255,0.08);color:var(--cd-text);}' +
      '.cd-bolo-btn-delete{background:rgba(239,68,68,0.1);color:var(--cd-red);border:1px solid rgba(239,68,68,0.15);}' +
      '.cd-bolo-btn-delete:hover{background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.3);}' +

      /* ── Modal ── */
      '#cd-bolo-modal{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem;}' +
      '#cd-bolo-modal .cd-bolo-modal-backdrop{position:absolute;inset:0;background:rgba(3,7,18,0.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;transition:opacity .2s;}' +
      '#cd-bolo-modal.is-open .cd-bolo-modal-backdrop{opacity:1;}' +
      '.cd-bolo-modal-panel{position:relative;width:min(560px,100%);max-height:90vh;display:flex;flex-direction:column;background:var(--cd-glass);border:1px solid var(--cd-glass-border);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.05);color:var(--cd-text);opacity:0;transform:translateY(12px);transition:opacity .2s,transform .2s;overflow:hidden;}' +
      '#cd-bolo-modal.is-open .cd-bolo-modal-panel{opacity:1;transform:none;}' +
      '.cd-bolo-modal-head{display:flex;align-items:center;padding:0.875rem 1rem;border-bottom:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-modal-title{margin:0;flex:1;font:600 0.9375rem/1.2 inherit;letter-spacing:0.02em;}' +
      '.cd-bolo-modal-close{width:28px;height:28px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--cd-text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}' +
      '.cd-bolo-modal-close:hover{border-color:var(--cd-glass-border);background:rgba(255,255,255,0.04);color:var(--cd-text);}' +
      '.cd-bolo-modal-body{flex:1;overflow-y:auto;padding:1rem;}' +

      /* ── Form ── */
      '.cd-bolo-form-grid{display:flex;flex-direction:column;gap:0.875rem;}' +
      '.cd-bolo-form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;}' +
      '.cd-bolo-field{display:flex;flex-direction:column;gap:0.375rem;}' +
      '.cd-bolo-field label{font:700 0.6875rem/1 inherit;letter-spacing:0.1em;text-transform:uppercase;color:var(--cd-text-muted);}' +
      '.cd-bolo-field input,.cd-bolo-field textarea,.cd-bolo-field select{background:rgba(255,255,255,0.03);border:1px solid var(--cd-glass-border);border-radius:8px;color:var(--cd-text);padding:0.5625rem 0.75rem;font-size:0.875rem;line-height:1.4;font-family:inherit;outline:none;transition:border-color 0.15s,background 0.15s;resize:vertical;}' +
      '.cd-bolo-field input:focus,.cd-bolo-field textarea:focus,.cd-bolo-field select:focus{border-color:rgba(56,189,248,0.5);background:rgba(56,189,248,0.04);}' +
      '.cd-bolo-field input::placeholder,.cd-bolo-field textarea::placeholder{color:var(--cd-text-dim);opacity:0.7;}' +
      '.cd-bolo-field select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%2364748b\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11L3 6h10z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 0.75rem center;padding-right:2rem;}' +
      '.cd-bolo-field select option{background:#0c0d12;color:var(--cd-text);}' +
      '.cd-bolo-form-actions{display:flex;justify-content:flex-end;gap:0.4375rem;padding-top:0.875rem;border-top:1px solid var(--cd-glass-border);margin-top:0.25rem;}' +
      '.cd-bolo-form-btn{padding:0.5rem 1rem;border-radius:8px;border:none;font-family:inherit;font-size:0.8125rem;font-weight:600;cursor:pointer;transition:all 0.15s;}' +
      '.cd-bolo-form-cancel{background:rgba(255,255,255,0.04);color:var(--cd-text);border:1px solid var(--cd-glass-border);}' +
      '.cd-bolo-form-cancel:hover{background:rgba(255,255,255,0.08);}' +
      '.cd-bolo-form-submit{background:rgba(56,189,248,0.15);color:var(--cd-accent);border:1px solid rgba(56,189,248,0.25);}' +
      '.cd-bolo-form-submit:hover{background:rgba(56,189,248,0.25);}' +
      '.cd-bolo-form-submit:disabled{opacity:0.5;cursor:default;}' +

      /* ── Loading / Empty ── */
      '.cd-bolo-loading{display:flex;align-items:center;justify-content:center;padding:2rem;color:var(--cd-text-muted);font-size:0.8125rem;gap:0.5rem;}' +
      '.cd-bolo-empty{text-align:center;padding:2.5rem 1rem;color:var(--cd-text-dim);font-size:0.8125rem;}' +
      '.cd-bolo-empty i{font-size:1.5rem;margin-bottom:0.5rem;display:block;opacity:0.4;}' +

      /* ── Responsive ── */
      '@media(max-width:600px){' +
        '.cd-bolo-form-row{grid-template-columns:1fr;}' +
        '.cd-bolo-item-top{flex-direction:column;}' +
        '.cd-bolo-actions{align-self:flex-end;}' +
      '}' +
    '';

    var $style = $('<style>').attr('id', 'cd-bolos-styles').text(css);
    $('head').append($style);
  }

  /* ───────────────────────────────────────────
     API
     ─────────────────────────────────────────── */

  function loadBolos(callback) {
    state.loading = true;
    renderList();

    var params = {
      communityId: cfg().communityId,
      departmentId: cfg().departmentId,
      limit: PAGE_SIZE,
      page: 0
    };

    if (state.filter === 'active') params.status = true;
    else if (state.filter === 'cleared') params.status = false;

    $.ajax({
      url: apiUrl() + '/api/v1/bolos',
      method: 'GET',
      data: params,
      success: function (resp) {
        var items = resp.data || resp.bolos || resp || [];
        if (!Array.isArray(items)) items = [];
        state.bolos = items;
        state.loading = false;
        renderList();
        if (callback) callback();
      },
      error: function (xhr, status, err) {
        state.loading = false;
        state.bolos = [];
        renderList();
        toast('Failed to load BOLOs', 'error');
        console.error('[cd-bolos] Load error:', status, err);
      }
    });
  }

  function createBolo(data, callback) {
    state.submitting = true;
    $('#cd-bolo-submit').prop('disabled', true);

    var payload = {
      bolo: {
        title: data.title,
        location: data.location,
        description: data.description,
        communityID: cfg().communityId,
        departmentID: cfg().departmentId,
        scope: data.scope,
        reportedByID: cfg().userId,
        status: true
      }
    };

    $.ajax({
      url: apiUrl() + '/api/v1/bolo',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        state.submitting = false;
        $('#cd-bolo-submit').prop('disabled', false);
        toast('BOLO created', 'success');
        closeModal();
        loadBolos();
        if (callback) callback();
      },
      error: function (xhr, status, err) {
        state.submitting = false;
        $('#cd-bolo-submit').prop('disabled', false);
        toast('Failed to create BOLO', 'error');
        console.error('[cd-bolos] Create error:', status, err);
      }
    });
  }

  function clearBolo(id) {
    // Note: UpdateBoloHandler prepends `bolo.` to every top-level key it
    // receives and uses that as the Mongo $set path. Send the flat shape
    // `{status:false}` so the write lands on `bolo.status`, not
    // `bolo.bolo.status`. Wrapping with {bolo:{...}} here silently no-ops.
    $.ajax({
      url: apiUrl() + '/api/v1/bolo/' + encodeURIComponent(id),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ status: false }),
      success: function () {
        toast('BOLO cleared', 'success');
        loadBolos();
      },
      error: function (xhr, status, err) {
        toast('Failed to clear BOLO', 'error');
        console.error('[cd-bolos] Clear error:', status, err);
      }
    });
  }

  function deleteBolo(id) {
    $.ajax({
      url: apiUrl() + '/api/v1/bolo/' + encodeURIComponent(id),
      method: 'DELETE',
      success: function () {
        toast('BOLO deleted', 'success');
        loadBolos();
      },
      error: function (xhr, status, err) {
        toast('Failed to delete BOLO', 'error');
        console.error('[cd-bolos] Delete error:', status, err);
      }
    });
  }

  /* ───────────────────────────────────────────
     Rendering — BOLO Item
     ─────────────────────────────────────────── */

  function renderBoloItem(item) {
    var b = item.bolo || item;
    var id = item._id || '';
    var isActive = b.status === true || b.status === 'true';
    var scopeIsComm = (b.scope || '').toLowerCase() === 'community';

    var html = '' +
      '<div class="cd-bolo-item' + (isActive ? '' : ' cd-bolo-cleared') + '" data-bolo-id="' + esc(id) + '">' +
        '<div class="cd-bolo-item-top">' +
          '<div class="cd-bolo-item-main">' +
            '<div class="cd-bolo-title-row">' +
              '<span class="cd-bolo-status-dot ' + (isActive ? 'cd-bolo-active' : 'cd-bolo-inactive') + '"></span>' +
              '<span class="cd-bolo-title">' + esc(b.title) + '</span>' +
              '<span class="cd-bolo-scope-badge ' + (scopeIsComm ? 'cd-bolo-scope-community' : 'cd-bolo-scope-department') + '">' +
                (scopeIsComm ? 'Community' : 'Dept') +
              '</span>' +
            '</div>' +
            (b.location ? '<div class="cd-bolo-location"><i class="fas fa-map-pin"></i> ' + esc(b.location) + '</div>' : '') +
            (b.description ? '<div class="cd-bolo-desc">' + esc(b.description) + '</div>' : '') +
            '<div class="cd-bolo-meta">' +
              (b.createdAt ? '<span><i class="far fa-clock"></i> ' + relativeTime(b.createdAt) + '</span>' : '') +
            '</div>' +
          '</div>' +
          (isActive ? (
            '<div class="cd-bolo-actions">' +
              '<button class="cd-bolo-btn cd-bolo-btn-clear" data-action="clear" data-id="' + esc(id) + '" title="Mark as cleared">' +
                '<i class="fas fa-check"></i> Clear' +
              '</button>' +
              '<button class="cd-bolo-btn cd-bolo-btn-delete" data-action="delete" data-id="' + esc(id) + '" title="Delete BOLO">' +
                '<i class="fas fa-trash-alt"></i>' +
              '</button>' +
            '</div>'
          ) : (
            '<div class="cd-bolo-actions">' +
              '<button class="cd-bolo-btn cd-bolo-btn-delete" data-action="delete" data-id="' + esc(id) + '" title="Delete BOLO">' +
                '<i class="fas fa-trash-alt"></i>' +
              '</button>' +
            '</div>'
          )) +
        '</div>' +
      '</div>';

    return html;
  }

  /* ───────────────────────────────────────────
     Rendering — List
     ─────────────────────────────────────────── */

  function renderList() {
    // Target the class, not the id: the dispatch bridge mounts one BOLO
    // card into the bottom strip AND the focused-card registry mounts
    // another hidden copy for sidebar navigation, so two `#cd-bolo-list`
    // nodes coexist. jQuery's id selector only returns the first match,
    // which leaves the focused card stuck on the initial placeholder.
    var $list = $('.cd-bolo-list');
    if (!$list.length) return;

    if (state.loading) {
      $list.html('<div class="cd-bolo-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading BOLOs&hellip;</div>');
      return;
    }

    if (!state.bolos.length) {
      var filterLabel = state.filter === 'active' ? 'active' : state.filter === 'cleared' ? 'cleared' : '';
      $list.html(
        '<div class="cd-bolo-empty">' +
          '<i class="fas fa-bullhorn"></i>' +
          'No ' + filterLabel + ' BOLOs found' +
        '</div>'
      );
      return;
    }

    var html = '';
    for (var i = 0; i < state.bolos.length; i++) {
      html += renderBoloItem(state.bolos[i]);
    }
    $list.html(html);
  }

  /* ───────────────────────────────────────────
     New-BOLO Modal
     ─────────────────────────────────────────── */

  function modalFormMarkup() {
    return '' +
      '<form id="cd-bolo-form" class="cd-bolo-form-grid" autocomplete="off">' +
        '<div class="cd-bolo-field">' +
          '<label for="cd-bolo-title-input">Title</label>' +
          '<input type="text" id="cd-bolo-title-input" placeholder="e.g. Red sedan fleeing I-90 westbound" maxlength="120" required>' +
        '</div>' +
        '<div class="cd-bolo-field">' +
          '<label for="cd-bolo-location-input">Location</label>' +
          '<input type="text" id="cd-bolo-location-input" placeholder="Last known location" maxlength="200">' +
        '</div>' +
        '<div class="cd-bolo-field">' +
          '<label for="cd-bolo-desc-input">Description</label>' +
          '<textarea id="cd-bolo-desc-input" rows="4" placeholder="Describe the suspect, vehicle, or situation" maxlength="2000"></textarea>' +
        '</div>' +
        '<div class="cd-bolo-field">' +
          '<label for="cd-bolo-scope-input">Scope</label>' +
          '<select id="cd-bolo-scope-input">' +
            '<option value="Community">Community &mdash; visible to all departments</option>' +
            '<option value="Department">Department &mdash; this department only</option>' +
          '</select>' +
        '</div>' +
        '<div class="cd-bolo-form-actions">' +
          '<button class="cd-bolo-form-btn cd-bolo-form-cancel" id="cd-bolo-cancel" type="button">Cancel</button>' +
          '<button class="cd-bolo-form-btn cd-bolo-form-submit" id="cd-bolo-submit" type="submit">' +
            '<i class="fas fa-plus"></i> Create BOLO' +
          '</button>' +
        '</div>' +
      '</form>';
  }

  function openModal() {
    if ($('#cd-bolo-modal').length) return;
    var $ov = $(
      '<div id="cd-bolo-modal" role="dialog" aria-modal="true" aria-labelledby="cd-bolo-modal-title">' +
        '<div class="cd-bolo-modal-backdrop"></div>' +
        '<div class="cd-bolo-modal-panel">' +
          '<header class="cd-bolo-modal-head">' +
            '<h2 id="cd-bolo-modal-title" class="cd-bolo-modal-title">New BOLO</h2>' +
            '<button type="button" class="cd-bolo-modal-close" aria-label="Close"><i class="fas fa-xmark"></i></button>' +
          '</header>' +
          '<div class="cd-bolo-modal-body">' + modalFormMarkup() + '</div>' +
        '</div>' +
      '</div>'
    );
    $ov.find('.cd-bolo-modal-close,.cd-bolo-modal-backdrop').on('click', closeModal);
    $(document).on('keydown.cdBoloModal', function (e) { if (e.key === 'Escape') closeModal(); });
    $('body').append($ov);
    requestAnimationFrame(function () { $ov.addClass('is-open'); });
    setTimeout(function () { $('#cd-bolo-title-input').focus(); }, 50);
  }

  function closeModal() {
    var $ov = $('#cd-bolo-modal');
    if (!$ov.length) return;
    $ov.removeClass('is-open');
    $(document).off('keydown.cdBoloModal');
    setTimeout(function () { $ov.remove(); }, 200);
  }

  /* ───────────────────────────────────────────
     Render Component (returns HTML string)
     ─────────────────────────────────────────── */

  function cdBolosRender() {
    injectStyles();

    return '' +
      '<div class="cd-bolo-card-wrap">' +

        /* Header */
        '<div class="cd-bolo-header">' +
          '<div class="cd-bolo-header-left">' +
            '<div class="cd-bolo-header-icon"><i class="fas fa-bullhorn"></i></div>' +
            '<div class="cd-bolo-header-text">' +
              '<h3>BOLOs</h3>' +
              '<span>Be On The Lookout</span>' +
            '</div>' +
          '</div>' +
          '<button class="cd-bolo-new-btn" id="cd-bolo-new-btn">' +
            '<i class="fas fa-plus"></i> New BOLO' +
          '</button>' +
        '</div>' +

        /* Tabs */
        '<div class="cd-bolo-tabs">' +
          '<button class="cd-bolo-tab cd-bolo-tab-active" data-filter="active">Active</button>' +
          '<button class="cd-bolo-tab" data-filter="cleared">Cleared</button>' +
          '<button class="cd-bolo-tab" data-filter="all">All</button>' +
        '</div>' +

        /* List */
        '<div class="cd-bolo-list">' +
          '<div class="cd-bolo-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading BOLOs&hellip;</div>' +
        '</div>' +

      '</div>';
  }

  /* ───────────────────────────────────────────
     Init Component (wires events)
     ─────────────────────────────────────────── */

  function cdBolosInit() {
    /* Load active BOLOs by default; honor ?bolos= query param when present. */
    var allowed = ['active', 'cleared', 'all'];
    var requested = (new URLSearchParams(window.location.search)).get('bolos');
    state.filter = allowed.indexOf(requested) !== -1 ? requested : 'active';
    $('.cd-bolo-tab').removeClass('cd-bolo-tab-active');
    $('.cd-bolo-tab[data-filter="' + state.filter + '"]').addClass('cd-bolo-tab-active');
    loadBolos();

    /* New BOLO button */
    $(document).off('click.cdBoloNew').on('click.cdBoloNew', '#cd-bolo-new-btn', function () {
      openModal();
    });

    /* Cancel modal */
    $(document).off('click.cdBoloCancel').on('click.cdBoloCancel', '#cd-bolo-cancel', function () {
      closeModal();
    });

    /* Submit form — handle via form submit (covers Enter key) and click */
    $(document).off('submit.cdBoloSubmit').on('submit.cdBoloSubmit', '#cd-bolo-form', function (e) {
      e.preventDefault();
      submitNewBolo();
    });

    function submitNewBolo() {
      var title = $('#cd-bolo-title-input').val().trim();
      var location = $('#cd-bolo-location-input').val().trim();
      var description = $('#cd-bolo-desc-input').val().trim();
      var scope = $('#cd-bolo-scope-input').val();

      if (!title) {
        toast('Title is required', 'error');
        $('#cd-bolo-title-input').focus();
        return;
      }

      createBolo({
        title: title,
        location: location,
        description: description,
        scope: scope
      });
    }

    /* Tab switching */
    $(document).off('click.cdBoloTab').on('click.cdBoloTab', '.cd-bolo-tab', function () {
      var $btn = $(this);
      var filter = $btn.data('filter');
      if (filter === state.filter) return;

      state.filter = filter;
      $('.cd-bolo-tab').removeClass('cd-bolo-tab-active');
      $btn.addClass('cd-bolo-tab-active');
      try {
        var params = new URLSearchParams(window.location.search);
        params.set('bolos', filter);
        var qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
      } catch (e) { /* no-op */ }
      loadBolos();
    });

    /* Clear BOLO */
    $(document).off('click.cdBoloClear').on('click.cdBoloClear', '.cd-bolo-btn-clear', function () {
      var id = $(this).data('id');
      if (!id) return;
      clearBolo(id);
    });

    /* Delete BOLO (with confirmation) */
    $(document).off('click.cdBoloDelete').on('click.cdBoloDelete', '.cd-bolo-btn-delete', function () {
      var id = $(this).data('id');
      if (!id) return;

      if (window.ddModal) {
        window.ddModal({
          type: 'danger',
          icon: 'fas fa-trash-alt',
          title: 'Delete BOLO',
          message: 'Are you sure you want to permanently delete this BOLO?',
          detail: 'This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          onConfirm: function () {
            deleteBolo(id);
          }
        });
      } else {
        deleteBolo(id);
      }
    });

    /* Expand / collapse description */
    $(document).off('click.cdBoloDescToggle').on('click.cdBoloDescToggle', '.cd-bolo-desc', function () {
      $(this).toggleClass('cd-bolo-desc-expanded');
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
     REGISTER ON WINDOW
     ═════════════════════════════════════════════════════════════════════ */

  window.cdBolosRender = cdBolosRender;
  window.cdBolosInit = cdBolosInit;

})();
