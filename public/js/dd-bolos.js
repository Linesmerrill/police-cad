/**
 * Department Dashboard — BOLOs & Warrants Components
 *
 * Exports:
 *   window.ddBoloCreateRender / window.ddBoloCreateInit  — BOLO management (create/edit/delete)
 *   window.ddBoloViewRender   / window.ddBoloViewInit    — Read-only BOLOs + warrants view
 */
(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  var cfg = function () { return window.ddConfig || {}; };
  var esc = function (s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
  var toast = function (m, t) { if (window.ddToast) window.ddToast(m, t); };

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function fmtDate(d) {
    if (!d) return 'N/A';
    var dt = new Date(d);
    if (isNaN(dt) || dt.getFullYear() <= 1970) return 'N/A';
    var h = dt.getHours(), m = dt.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return (dt.getMonth()+1) + '/' + dt.getDate() + '/' + dt.getFullYear() + ' ' + h + ':' + (m < 10 ? '0' : '') + m + ampm;
  }

  /* ═══════════════════════════════════════════
     BOLO MANAGEMENT (createBolos component)
     ═══════════════════════════════════════════ */

  var boloPage = 0;
  var boloLimit = 10;
  var boloTotal = 0;
  var boloData = [];
  var boloNewModalReady = false;
  var boloDetailModalReady = false;

  /* ───────────────────────────────────────────
     Styles
     ─────────────────────────────────────────── */

  function injectBoloStyles() {
    if (document.getElementById('dd-bolo-styles')) return;

    var css = '' +
      '.dd-bolo-toolbar{display:flex;align-items:center;gap:0.625rem;flex-wrap:wrap;margin-bottom:0.875rem;}' +
      '.dd-bolo-add-btn{padding:0.5rem 0.875rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.1);color:#fcd34d;font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.dd-bolo-add-btn:hover{background:rgba(245,158,11,0.18);border-color:rgba(245,158,11,0.4);color:#fde68a;}' +

      /* Tabs */
      '.dd-bolo-tabs{display:flex;gap:0.25rem;margin-bottom:0.75rem;background:var(--dd-glass);border:1.5px solid var(--dd-glass-border);border-radius:8px;padding:0.2rem;}' +
      '.dd-bolo-tab{background:transparent;color:var(--dd-text-muted);border:none;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;flex:1;text-align:center;}' +
      '.dd-bolo-tab.active{background:var(--dd-amber);color:#fff;}' +

      /* List */
      '.dd-bolo-list{display:flex;flex-direction:column;gap:0.5rem;}' +
      '.dd-bolo-item{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.875rem 1rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:flex-start;gap:0.75rem;}' +
      '.dd-bolo-item:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);transform:translateY(-1px);}' +
      '.dd-bolo-item-icon{width:36px;height:36px;border-radius:var(--dd-radius-sm);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.875rem;color:var(--dd-amber);background:rgba(245,158,11,0.1);}' +
      '.dd-bolo-item-info{flex:1;min-width:0;}' +
      '.dd-bolo-item-title{font-size:0.875rem;font-weight:600;color:var(--dd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-bolo-item-meta{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.15rem;}' +
      '.dd-bolo-item-desc{font-size:0.75rem;color:var(--dd-text-dim);margin-top:0.25rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.dd-bolo-badge-active{display:inline-block;font-size:0.625rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;background:rgba(34,197,94,0.15);color:var(--dd-green);}' +
      '.dd-bolo-badge-inactive{display:inline-block;font-size:0.625rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;background:rgba(100,116,139,0.15);color:var(--dd-text-muted);}' +

      /* Pagination */
      '.dd-bolo-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.dd-bolo-page-info{font-size:0.75rem;color:var(--dd-text-muted);}' +
      '.dd-bolo-page-btn{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);color:var(--dd-text);padding:0.35rem 0.75rem;font-size:0.75rem;cursor:pointer;transition:all 0.2s;font-family:inherit;}' +
      '.dd-bolo-page-btn:hover:not(:disabled){background:rgba(255,255,255,0.06);}' +
      '.dd-bolo-page-btn:disabled{opacity:0.35;cursor:default;}' +

      /* Scope radio */
      '.dd-bolo-scope-row{display:flex;gap:1rem;grid-column:1/-1;margin-top:0.25rem;}' +
      '.dd-bolo-scope-opt{display:flex;align-items:center;gap:0.35rem;font-size:0.8125rem;color:var(--dd-text);cursor:pointer;}' +
      '.dd-bolo-scope-opt input{accent-color:var(--dd-amber);cursor:pointer;}' +

      /* Responsive */
      '@media(max-width:600px){' +
        '.dd-bolo-toolbar{flex-direction:column;align-items:stretch;}' +
      '}' +
    '';

    var style = document.createElement('style');
    style.id = 'dd-bolo-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ───────────────────────────────────────────
     createBolos: Render
     ─────────────────────────────────────────── */

  function ddBoloCreateRender() {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(245,158,11,0.15);color:var(--dd-amber);"><i class="fa fa-bullhorn"></i></div>' +
          '<div><h3 class="dd-card-title">BOLOs</h3><p class="dd-card-subtitle">Manage Be On Lookout alerts</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body">' +
        '<div class="dd-bolo-toolbar">' +
          '<button class="dd-bolo-add-btn" id="dd-bolo-add-btn"><i class="fa fa-plus"></i> Create BOLO</button>' +
        '</div>' +
        '<div class="dd-bolo-loading dd-spinner"></div>' +
        '<div class="dd-bolo-empty dd-empty" style="display:none;">' +
          '<div class="dd-empty-icon-wrap" style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.15);">' +
            '<i class="fa fa-bullhorn" style="color:var(--dd-amber);"></i>' +
          '</div>' +
          '<p class="dd-empty-title">No BOLOs found</p>' +
          '<p class="dd-empty-sub">Create your first BOLO alert</p>' +
        '</div>' +
        '<div id="dd-bolo-list" class="dd-bolo-list" style="display:none;"></div>' +
        '<div class="dd-bolo-pagination" id="dd-bolo-pagination" style="display:none;">' +
          '<button class="dd-bolo-page-btn" id="dd-bolo-prev"><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="dd-bolo-page-info" id="dd-bolo-page-info">Page 1</span>' +
          '<button class="dd-bolo-page-btn" id="dd-bolo-next">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>';
  }

  /* ───────────────────────────────────────────
     createBolos: Init
     ─────────────────────────────────────────── */

  function ddBoloCreateInit() {
    injectBoloStyles();
    boloPage = 0;
    wireBoloEvents();
    loadBolos();
  }

  function wireBoloEvents() {
    $(document).off('click.ddBolo', '#dd-bolo-add-btn')
      .on('click.ddBolo', '#dd-bolo-add-btn', openBoloNewModal);

    $(document).off('click.ddBolo', '#dd-bolo-prev')
      .on('click.ddBolo', '#dd-bolo-prev', function () {
        if (boloPage > 0) { boloPage--; loadBolos(); }
      });

    $(document).off('click.ddBolo', '#dd-bolo-next')
      .on('click.ddBolo', '#dd-bolo-next', function () {
        if ((boloPage + 1) * boloLimit < boloTotal) { boloPage++; loadBolos(); }
      });

    $(document).off('click.ddBolo', '.dd-bolo-item')
      .on('click.ddBolo', '.dd-bolo-item', function () {
        var id = $(this).attr('data-bolo-id');
        if (id) openBoloDetailModal(id);
      });
  }

  /* ───────────────────────────────────────────
     createBolos: Load
     ─────────────────────────────────────────── */

  function loadBolos() {
    var c = cfg();
    var $list = $('#dd-bolo-list');
    var $loading = $('.dd-bolo-loading');
    var $empty = $('.dd-bolo-empty');
    var $pagination = $('#dd-bolo-pagination');

    $list.hide(); $empty.hide(); $pagination.hide();
    $loading.show();

    var deptData = c.departmentData || {};
    var deptId = deptData._id || c.departmentId || '';

    $.ajax({
      url: c.API_URL + '/api/v1/bolos' +
        '?communityId=' + encodeURIComponent(c.communityId) +
        '&departmentId=' + encodeURIComponent(deptId) +
        '&limit=' + boloLimit +
        '&page=' + boloPage,
      method: 'GET',
      success: function (data) {
        $loading.hide();
        boloData = data.data || [];
        boloTotal = data.totalCount || boloData.length;
        renderBoloList();
      },
      error: function () {
        $loading.hide();
        boloData = [];
        renderBoloList();
        toast('Failed to load BOLOs', 'error');
      }
    });
  }

  function renderBoloList() {
    var $list = $('#dd-bolo-list');
    var $empty = $('.dd-bolo-empty');
    $list.empty();

    if (!boloData.length) {
      $list.hide();
      $empty.show();
      updateBoloPagination();
      return;
    }

    $empty.hide();
    $list.show();

    boloData.forEach(function (item) {
      var b = item.bolo || item || {};
      var statusCls = b.status ? 'dd-bolo-badge-active' : 'dd-bolo-badge-inactive';
      var statusLabel = b.status ? 'Active' : 'Inactive';

      $list.append(
        '<div class="dd-bolo-item" data-bolo-id="' + esc(item._id) + '">' +
          '<div class="dd-bolo-item-icon"><i class="fa fa-bullhorn"></i></div>' +
          '<div class="dd-bolo-item-info">' +
            '<div style="display:flex;align-items:center;gap:0.5rem;">' +
              '<div class="dd-bolo-item-title">' + esc(b.title || 'Untitled') + '</div>' +
              '<span class="' + statusCls + '">' + statusLabel + '</span>' +
            '</div>' +
            '<div class="dd-bolo-item-meta">' +
              '<i class="fa fa-map-marker-alt" style="opacity:0.5;"></i> ' + esc(b.location || 'Unknown') +
              ' &middot; ' + fmtDate(b.createdAt) +
              (b.scope ? ' &middot; ' + esc(b.scope) : '') +
            '</div>' +
            (b.description ? '<div class="dd-bolo-item-desc">' + esc(b.description) + '</div>' : '') +
          '</div>' +
        '</div>'
      );
    });

    updateBoloPagination();
  }

  function updateBoloPagination() {
    var $pagination = $('#dd-bolo-pagination');
    if (boloTotal <= boloLimit && boloPage === 0) { $pagination.hide(); return; }

    $pagination.show();
    var totalPages = Math.max(1, Math.ceil(boloTotal / boloLimit));
    $('#dd-bolo-page-info').text('Page ' + (boloPage + 1) + ' of ' + totalPages);
    $('#dd-bolo-prev').prop('disabled', boloPage <= 0);
    $('#dd-bolo-next').prop('disabled', (boloPage + 1) * boloLimit >= boloTotal);
  }

  /* ───────────────────────────────────────────
     createBolos: New Modal
     ─────────────────────────────────────────── */

  function ensureBoloNewModal() {
    if (boloNewModalReady) return;
    boloNewModalReady = true;

    var html = '' +
      '<div class="dd-civ-new-overlay" id="dd-bolo-new-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:560px;">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title" id="dd-bolo-new-title">New BOLO</span>' +
            '<button class="dd-civ-close" id="dd-bolo-new-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<div class="dd-civ-form-grid">' +
              '<div class="dd-civ-field dd-civ-form-full"><label>Title *</label><input type="text" id="dd-bolo-new-title-input" maxlength="50" placeholder="e.g. Missing Person"></div>' +
              '<div class="dd-civ-field"><label>Location *</label><input type="text" id="dd-bolo-new-location" maxlength="50" placeholder="e.g. Downtown"></div>' +
              '<div class="dd-civ-field"><label>Scope</label>' +
                '<div class="dd-bolo-scope-row">' +
                  '<label class="dd-bolo-scope-opt"><input type="radio" name="dd-bolo-scope" value="Community" checked> Community</label>' +
                  '<label class="dd-bolo-scope-opt"><input type="radio" name="dd-bolo-scope" value="Department"> Department</label>' +
                '</div>' +
              '</div>' +
              '<div class="dd-civ-field dd-civ-form-full"><label>Description *</label><textarea id="dd-bolo-new-desc" maxlength="500" rows="4" placeholder="Detailed description..." style="resize:vertical;"></textarea></div>' +
            '</div>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-bolo-new-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-bolo-new-save"><i class="fa fa-plus"></i> Create</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    $(document).off('click.ddBoloNew', '#dd-bolo-new-close, #dd-bolo-new-cancel')
      .on('click.ddBoloNew', '#dd-bolo-new-close, #dd-bolo-new-cancel', closeBoloNewModal);
    $(document).off('click.ddBoloNew', '#dd-bolo-new-overlay')
      .on('click.ddBoloNew', '#dd-bolo-new-overlay', function (e) { if (e.target === this) closeBoloNewModal(); });
    $(document).off('click.ddBoloNew', '#dd-bolo-new-save')
      .on('click.ddBoloNew', '#dd-bolo-new-save', createBolo);
  }

  function openBoloNewModal() {
    ensureBoloNewModal();
    $('#dd-bolo-new-title-input').val('');
    $('#dd-bolo-new-location').val('');
    $('#dd-bolo-new-desc').val('');
    $('input[name="dd-bolo-scope"][value="Community"]').prop('checked', true);
    $('#dd-bolo-new-title').text('New BOLO');
    var $btn = $('#dd-bolo-new-save');
    $btn.prop('disabled', false).html('<i class="fa fa-plus"></i> Create');
    $btn.off('click.ddBoloNew').on('click.ddBoloNew', createBolo);
    $('#dd-bolo-new-overlay').addClass('dd-civ-visible');
  }

  function closeBoloNewModal() {
    $('#dd-bolo-new-overlay').removeClass('dd-civ-visible');
  }

  function createBolo() {
    var title = $('#dd-bolo-new-title-input').val().trim();
    var location = $('#dd-bolo-new-location').val().trim();
    var description = $('#dd-bolo-new-desc').val().trim();
    var scope = $('input[name="dd-bolo-scope"]:checked').val() || 'Community';
    var c = cfg();

    if (!title || !location || !description) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    var deptData = c.departmentData || {};
    var $btn = $('#dd-bolo-new-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');

    $.ajax({
      url: c.API_URL + '/api/v1/bolo',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        bolo: {
          title: title,
          location: location,
          description: description,
          scope: scope,
          communityID: c.communityId,
          departmentID: deptData._id || c.departmentId || '',
          reportedByID: c.userId,
          status: true
        }
      }),
      success: function () {
        toast('BOLO created successfully', 'success');
        closeBoloNewModal();
        boloPage = 0;
        loadBolos();
      },
      error: function (xhr) {
        var msg = 'Failed to create BOLO';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) {}
        toast(msg, 'error');
      },
      complete: function () {
        $btn.prop('disabled', false).html('<i class="fa fa-plus"></i> Create');
      }
    });
  }

  /* ───────────────────────────────────────────
     createBolos: Detail Modal
     ─────────────────────────────────────────── */

  function ensureBoloDetailModal() {
    if (boloDetailModalReady) return;
    boloDetailModalReady = true;

    var html = '' +
      '<div class="dd-civ-new-overlay" id="dd-bolo-detail-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:560px;">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title" id="dd-bolo-detail-title">BOLO Details</span>' +
            '<button class="dd-civ-close" id="dd-bolo-detail-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body" id="dd-bolo-detail-body"><div class="dd-spinner"></div></div>' +
          '<div class="dd-civ-new-footer" id="dd-bolo-detail-footer"></div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    $(document).off('click.ddBoloDetail', '#dd-bolo-detail-close')
      .on('click.ddBoloDetail', '#dd-bolo-detail-close', closeBoloDetailModal);
    $(document).off('click.ddBoloDetail', '#dd-bolo-detail-overlay')
      .on('click.ddBoloDetail', '#dd-bolo-detail-overlay', function (e) { if (e.target === this) closeBoloDetailModal(); });
  }

  function openBoloDetailModal(id) {
    ensureBoloDetailModal();
    var $overlay = $('#dd-bolo-detail-overlay');
    var $body = $('#dd-bolo-detail-body');
    var $footer = $('#dd-bolo-detail-footer');

    $body.html('<div class="dd-spinner"></div>');
    $footer.empty();
    $overlay.addClass('dd-civ-visible');

    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/bolo/' + encodeURIComponent(id),
      method: 'GET',
      success: function (data) {
        var b = data.bolo || data || {};

        var fields = [
          { label: 'Title', val: b.title },
          { label: 'Location', val: b.location },
          { label: 'Scope', val: b.scope },
          { label: 'Status', val: b.status ? 'Active' : 'Inactive' },
          { label: 'Created', val: fmtDate(b.createdAt) },
          { label: 'Updated', val: fmtDate(b.updatedAt) }
        ];

        var html = '<div class="dd-civ-form-grid">';
        fields.forEach(function (f) {
          html += '<div class="dd-civ-field"><label>' + esc(f.label) + '</label>' +
            '<div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(f.val || 'N/A') + '</div></div>';
        });
        if (b.description) {
          html += '<div class="dd-civ-field dd-civ-form-full"><label>Description</label>' +
            '<div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;line-height:1.6;">' + esc(b.description) + '</div></div>';
        }
        html += '</div>';

        $('#dd-bolo-detail-title').text(b.title || 'BOLO Details');
        $body.html(html);
        $footer.html(
          '<button class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-bolo-edit-btn" data-id="' + esc(id) + '"><i class="fa fa-edit"></i> Edit</button>' +
          '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-bolo-del-btn" data-id="' + esc(id) + '"><i class="fa fa-trash"></i> Delete</button>'
        );
      },
      error: function () {
        $body.html('<p style="color:var(--dd-red);">Failed to load BOLO details</p>');
        toast('Failed to load BOLO details', 'error');
      }
    });
  }

  function closeBoloDetailModal() {
    $('#dd-bolo-detail-overlay').removeClass('dd-civ-visible');
  }

  // Edit
  $(document).on('click.ddBolo', '#dd-bolo-edit-btn', function () {
    var id = $(this).attr('data-id');
    closeBoloDetailModal();
    openBoloEditModal(id);
  });

  // Delete
  $(document).on('click.ddBolo', '#dd-bolo-del-btn', function () {
    var id = $(this).attr('data-id');
    if (window.ddModal) {
      window.ddModal({
        title: 'Delete BOLO',
        message: 'Are you sure you want to delete this BOLO? This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmClass: 'dd-civ-btn-danger',
        onConfirm: function () { deleteBolo(id); }
      });
    } else {
      if (confirm('Delete this BOLO?')) deleteBolo(id);
    }
  });

  function openBoloEditModal(id) {
    ensureBoloNewModal();
    var c = cfg();
    var $overlay = $('#dd-bolo-new-overlay');

    $overlay.addClass('dd-civ-visible');
    $('#dd-bolo-new-save').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');

    $.ajax({
      url: c.API_URL + '/api/v1/bolo/' + encodeURIComponent(id),
      method: 'GET',
      success: function (data) {
        var b = data.bolo || data || {};
        $('#dd-bolo-new-title-input').val(b.title || '');
        $('#dd-bolo-new-location').val(b.location || '');
        $('#dd-bolo-new-desc').val(b.description || '');
        $('input[name="dd-bolo-scope"][value="' + (b.scope || 'Community') + '"]').prop('checked', true);
        $('#dd-bolo-new-title').text('Edit BOLO');

        var $btn = $('#dd-bolo-new-save');
        $btn.prop('disabled', false).html('<i class="fa fa-save"></i> Update');
        $btn.off('click.ddBoloNew').on('click.ddBoloNew', function () { updateBolo(id); });
      },
      error: function () {
        toast('Failed to load BOLO for editing', 'error');
        closeBoloNewModal();
      }
    });
  }

  function updateBolo(id) {
    var title = $('#dd-bolo-new-title-input').val().trim();
    var location = $('#dd-bolo-new-location').val().trim();
    var description = $('#dd-bolo-new-desc').val().trim();
    var c = cfg();

    if (!title || !location || !description) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    var $btn = $('#dd-bolo-new-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Updating...');

    $.ajax({
      url: c.API_URL + '/api/v1/bolo/' + encodeURIComponent(id),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        bolo: {
          title: title,
          location: location,
          description: description
        }
      }),
      success: function () {
        toast('BOLO updated successfully', 'success');
        closeBoloNewModal();
        $('#dd-bolo-new-save').off('click.ddBoloNew').on('click.ddBoloNew', createBolo);
        loadBolos();
      },
      error: function (xhr) {
        var msg = 'Failed to update BOLO';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) {}
        toast(msg, 'error');
      },
      complete: function () {
        $btn.prop('disabled', false).html('<i class="fa fa-save"></i> Update');
      }
    });
  }

  function deleteBolo(id) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/bolo/' + encodeURIComponent(id),
      method: 'DELETE',
      success: function () {
        toast('BOLO deleted successfully', 'success');
        closeBoloDetailModal();
        loadBolos();
      },
      error: function () {
        toast('Failed to delete BOLO', 'error');
      }
    });
  }


  /* ═══════════════════════════════════════════
     VIEW BOLOs & WARRANTS (viewBolosAndWarrants)
     ═══════════════════════════════════════════ */

  var viewTab = 'bolos'; // 'bolos' or 'warrants'
  var viewBoloPage = 0;
  var viewBoloLimit = 10;
  var viewBoloTotal = 0;
  var viewBoloData = [];
  var wmPage = 0;
  var wmLimit = 8;
  var wmTotalPages = 1;
  var wmDetailReady = false;

  /* ───────────────────────────────────────────
     viewBolosAndWarrants: Render
     ─────────────────────────────────────────── */

  function ddBoloViewRender() {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(245,158,11,0.15);color:var(--dd-amber);"><i class="fa fa-eye"></i></div>' +
          '<div><h3 class="dd-card-title">BOLOs & Warrants</h3><p class="dd-card-subtitle">View active alerts and warrants</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body">' +
        '<div class="dd-bolo-tabs" id="dd-bv-tabs">' +
          '<button class="dd-bolo-tab active" data-bv-tab="bolos">BOLOs</button>' +
          '<button class="dd-bolo-tab" data-bv-tab="warrants">Warrants</button>' +
        '</div>' +
        '<div id="dd-bv-content"></div>' +
      '</div>';
  }

  /* ───────────────────────────────────────────
     viewBolosAndWarrants: Init
     ─────────────────────────────────────────── */

  function ddBoloViewInit() {
    injectBoloStyles();
    injectWarrantStyles();
    viewTab = 'bolos';
    viewBoloPage = 0;
    wmPage = 0;

    $(document).off('click.ddBV', '.dd-bolo-tab[data-bv-tab]')
      .on('click.ddBV', '.dd-bolo-tab[data-bv-tab]', function () {
        var tab = $(this).attr('data-bv-tab');
        if (tab === viewTab) return;
        viewTab = tab;
        $('#dd-bv-tabs .dd-bolo-tab').removeClass('active');
        $(this).addClass('active');
        if (tab === 'bolos') loadViewBolos();
        else loadWarrants();
      });

    loadViewBolos();
  }

  /* ── BOLOs tab ── */

  function loadViewBolos() {
    var c = cfg();
    var $content = $('#dd-bv-content');
    $content.html('<div class="dd-spinner"></div>');

    var deptData = c.departmentData || {};
    var deptId = deptData._id || c.departmentId || '';

    $.ajax({
      url: c.API_URL + '/api/v1/bolos' +
        '?communityId=' + encodeURIComponent(c.communityId) +
        '&departmentId=' + encodeURIComponent(deptId) +
        '&limit=' + viewBoloLimit +
        '&page=' + viewBoloPage,
      method: 'GET',
      success: function (data) {
        viewBoloData = data.data || [];
        viewBoloTotal = data.totalCount || viewBoloData.length;
        renderViewBolos();
      },
      error: function () {
        $content.html('<div class="dd-empty"><i class="fa fa-bullhorn"></i><p>Failed to load BOLOs</p></div>');
      }
    });
  }

  function renderViewBolos() {
    var $content = $('#dd-bv-content');

    if (!viewBoloData.length) {
      $content.html('<div class="dd-empty" style="padding:2rem 1rem;"><div class="dd-empty-icon-wrap" style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.15);"><i class="fa fa-bullhorn" style="color:var(--dd-amber);"></i></div><p class="dd-empty-title">No BOLOs found</p></div>');
      return;
    }

    var html = '<div class="dd-bolo-list">';
    viewBoloData.forEach(function (item) {
      var b = item.bolo || item || {};
      var statusCls = b.status ? 'dd-bolo-badge-active' : 'dd-bolo-badge-inactive';
      var statusLabel = b.status ? 'Active' : 'Inactive';

      html += '<div class="dd-bolo-item" style="cursor:default;">' +
        '<div class="dd-bolo-item-icon"><i class="fa fa-bullhorn"></i></div>' +
        '<div class="dd-bolo-item-info">' +
          '<div style="display:flex;align-items:center;gap:0.5rem;">' +
            '<div class="dd-bolo-item-title">' + esc(b.title || 'Untitled') + '</div>' +
            '<span class="' + statusCls + '">' + statusLabel + '</span>' +
          '</div>' +
          '<div class="dd-bolo-item-meta">' +
            '<i class="fa fa-map-marker-alt" style="opacity:0.5;"></i> ' + esc(b.location || 'Unknown') +
            ' &middot; ' + fmtDate(b.createdAt) +
          '</div>' +
          (b.description ? '<div class="dd-bolo-item-desc">' + esc(b.description) + '</div>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';

    // Pagination
    if (viewBoloTotal > viewBoloLimit || viewBoloPage > 0) {
      var totalPages = Math.max(1, Math.ceil(viewBoloTotal / viewBoloLimit));
      html += '<div class="dd-bolo-pagination">' +
        '<button class="dd-bolo-page-btn" id="dd-bv-bolo-prev"' + (viewBoloPage <= 0 ? ' disabled' : '') + '><i class="fa fa-chevron-left"></i> Prev</button>' +
        '<span class="dd-bolo-page-info">Page ' + (viewBoloPage + 1) + ' of ' + totalPages + '</span>' +
        '<button class="dd-bolo-page-btn" id="dd-bv-bolo-next"' + ((viewBoloPage + 1) * viewBoloLimit >= viewBoloTotal ? ' disabled' : '') + '>Next <i class="fa fa-chevron-right"></i></button>' +
      '</div>';
    }

    $content.html(html);

    $(document).off('click.ddBVPag', '#dd-bv-bolo-prev').on('click.ddBVPag', '#dd-bv-bolo-prev', function () {
      if (viewBoloPage > 0) { viewBoloPage--; loadViewBolos(); }
    });
    $(document).off('click.ddBVPag', '#dd-bv-bolo-next').on('click.ddBVPag', '#dd-bv-bolo-next', function () {
      if ((viewBoloPage + 1) * viewBoloLimit < viewBoloTotal) { viewBoloPage++; loadViewBolos(); }
    });
  }

  /* ── Warrants tab (read-only) ── */

  function injectWarrantStyles() {
    if (document.getElementById('dd-bv-warrant-styles')) return;

    var css = '' +
      '.dd-wm-notice{background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:var(--dd-radius-sm);padding:0.625rem 0.875rem;margin-bottom:0.75rem;font-size:0.75rem;color:#93c5fd;display:flex;align-items:center;gap:0.5rem;}' +
      '.dd-wm-search-bar{display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;}' +
      '.dd-wm-input{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.5rem 0.65rem;color:var(--dd-text);font-family:inherit;font-size:0.8125rem;outline:none;transition:border-color 0.2s;flex:1;min-width:120px;}' +
      '.dd-wm-input:focus{border-color:rgba(255,255,255,0.15);}' +
      '.dd-wm-input option{background:#1a1a24;color:var(--dd-text);}' +
      '.dd-wm-search-btn{padding:0.5rem 1rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(59,130,246,0.25);background:rgba(59,130,246,0.1);color:#93c5fd;font-family:inherit;font-size:0.8125rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.dd-wm-search-btn:hover{background:rgba(59,130,246,0.18);}' +

      '.dd-wm-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.5rem;}' +
      '.dd-wm-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.875rem 1rem;cursor:pointer;transition:all 0.2s;}' +
      '.dd-wm-card:hover{background:rgba(255,255,255,0.06);transform:translateY(-1px);}' +
      '.dd-wm-card h5{font-size:0.875rem;font-weight:600;color:var(--dd-text);margin:0.35rem 0 0.15rem;}' +
      '.dd-wm-card p{font-size:0.75rem;color:var(--dd-text-muted);margin:0;}' +
      '.dd-wm-card-meta{display:flex;justify-content:space-between;font-size:0.6875rem;color:var(--dd-text-dim);margin-top:0.35rem;}' +

      '.dd-wm-badge{display:inline-block;font-size:0.625rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;text-transform:capitalize;}' +
      '.dd-wm-badge-pending{background:rgba(245,158,11,0.15);color:var(--dd-amber);}' +
      '.dd-wm-badge-approved{background:rgba(34,197,94,0.15);color:var(--dd-green);}' +
      '.dd-wm-badge-denied{background:rgba(239,68,68,0.15);color:var(--dd-red);}' +
      '.dd-wm-badge-executed{background:rgba(139,92,246,0.15);color:#a78bfa;}' +
      '.dd-wm-badge-expired{background:rgba(100,116,139,0.15);color:var(--dd-text-muted);}' +
      '.dd-wm-badge-withdrawn{background:rgba(100,116,139,0.15);color:var(--dd-text-muted);}' +

      '@media(max-width:600px){.dd-wm-search-bar{flex-direction:column;}}' +
    '';

    var style = document.createElement('style');
    style.id = 'dd-bv-warrant-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function loadWarrants() {
    var $content = $('#dd-bv-content');
    wmPage = 0;

    $content.html(
      '<div class="dd-wm-notice"><i class="fa fa-info-circle"></i> Fire/EMS personnel have view-only access to warrants.</div>' +
      '<div class="dd-wm-search-bar">' +
        '<input type="text" class="dd-wm-input" id="dd-wm-name" placeholder="Search by accused name...">' +
        '<select class="dd-wm-input" id="dd-wm-type" style="flex:0 1 auto;min-width:100px;"><option value="">All Types</option><option value="arrest">Arrest</option><option value="search">Search</option><option value="bench">Bench</option></select>' +
        '<select class="dd-wm-input" id="dd-wm-status" style="flex:0 1 auto;min-width:110px;"><option value="">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="denied">Denied</option><option value="executed">Executed</option><option value="expired">Expired</option><option value="withdrawn">Withdrawn</option></select>' +
        '<button class="dd-wm-search-btn" id="dd-wm-search-btn"><i class="fa fa-search"></i> Search</button>' +
      '</div>' +
      '<div id="dd-wm-loading" style="display:none;" class="dd-spinner"></div>' +
      '<div id="dd-wm-empty" style="display:none;" class="dd-empty"><i class="fa fa-gavel"></i><p>No warrants found</p></div>' +
      '<div id="dd-wm-results" style="display:none;">' +
        '<div id="dd-wm-cards" class="dd-wm-cards"></div>' +
        '<div class="dd-bolo-pagination" style="margin-top:0.75rem;">' +
          '<button class="dd-bolo-page-btn" id="dd-wm-prev" disabled><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="dd-bolo-page-info" id="dd-wm-page-info">Page 1</span>' +
          '<button class="dd-bolo-page-btn" id="dd-wm-next">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>'
    );

    // Wire search events
    $(document).off('click.ddBVWm', '#dd-wm-search-btn').on('click.ddBVWm', '#dd-wm-search-btn', function () { searchWarrants(0); });
    $(document).off('keydown.ddBVWm', '#dd-wm-name').on('keydown.ddBVWm', '#dd-wm-name', function (e) { if (e.key === 'Enter') searchWarrants(0); });
    $(document).off('click.ddBVWm', '#dd-wm-prev').on('click.ddBVWm', '#dd-wm-prev', function () { if (wmPage > 0) searchWarrants(wmPage - 1); });
    $(document).off('click.ddBVWm', '#dd-wm-next').on('click.ddBVWm', '#dd-wm-next', function () { if (wmPage < wmTotalPages - 1) searchWarrants(wmPage + 1); });

    // Auto-search
    searchWarrants(0);
  }

  function searchWarrants(page) {
    wmPage = page;
    var c = cfg();
    var params = new URLSearchParams();
    var name = $('#dd-wm-name').val() || '';
    var type = $('#dd-wm-type').val() || '';
    var status = $('#dd-wm-status').val() || '';

    if (name) params.append('name', name);
    if (type) params.append('warrantType', type);
    if (status) params.append('status', status);
    params.append('communityId', c.communityId);
    params.append('limit', wmLimit);
    params.append('page', wmPage);

    $('#dd-wm-loading').show();
    $('#dd-wm-results, #dd-wm-empty').hide();

    $.ajax({
      url: c.API_URL + '/api/v1/warrants/search?' + params.toString(),
      method: 'GET',
      success: function (result) {
        $('#dd-wm-loading').hide();
        var warrants = result.data || [];
        var totalCount = result.totalCount || 0;
        wmTotalPages = Math.max(1, Math.ceil(totalCount / wmLimit));

        if (!warrants.length) {
          $('#dd-wm-empty').show();
          return;
        }

        $('#dd-wm-results').show();
        var $cards = $('#dd-wm-cards').empty();

        warrants.forEach(function (w) {
          var d = w.warrant || {};
          var chargesPreview = (d.charges || []).slice(0, 2).join(', ');
          if ((d.charges || []).length > 2) chargesPreview += ' +' + (d.charges.length - 2);

          $cards.append(
            '<div class="dd-wm-card" data-warrant-id="' + esc(w._id) + '">' +
              '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
                '<span class="dd-wm-badge dd-wm-badge-' + esc(d.status || 'unknown') + '">' + esc(cap(d.status)) + '</span>' +
                '<span class="dd-wm-badge" style="background:rgba(255,255,255,0.04);color:#64748b;">' + esc(cap(d.warrantType)) + '</span>' +
              '</div>' +
              '<h5>' + esc((d.accusedFirstName || '') + ' ' + (d.accusedLastName || '')) + '</h5>' +
              '<p>' + esc(chargesPreview || 'No charges listed') + '</p>' +
              '<div class="dd-wm-card-meta"><span>' + fmtDate(d.createdAt) + '</span><span><i class="fa fa-arrow-right" style="font-size:10px;opacity:0.3;"></i></span></div>' +
            '</div>'
          );
        });

        $('#dd-wm-page-info').text('Page ' + (wmPage + 1) + ' of ' + wmTotalPages);
        $('#dd-wm-prev').prop('disabled', wmPage <= 0);
        $('#dd-wm-next').prop('disabled', wmPage >= wmTotalPages - 1);
      },
      error: function () {
        $('#dd-wm-loading').hide();
        $('#dd-wm-empty').show();
      }
    });
  }

  // Warrant detail (read-only overlay)
  $(document).on('click.ddBV', '.dd-wm-card', function () {
    var id = $(this).attr('data-warrant-id');
    if (id) openWarrantDetail(id);
  });

  function ensureWarrantDetailModal() {
    if (wmDetailReady) return;
    wmDetailReady = true;

    var html = '' +
      '<div class="dd-civ-new-overlay" id="dd-wm-detail-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:640px;">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title" id="dd-wm-detail-title">Warrant Details</span>' +
            '<button class="dd-civ-close" id="dd-wm-detail-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body" id="dd-wm-detail-body"><div class="dd-spinner"></div></div>' +
        '</div>' +
      '</div>';

    $('body').append(html);
    $(document).off('click.ddWMDetail', '#dd-wm-detail-close')
      .on('click.ddWMDetail', '#dd-wm-detail-close', function () { $('#dd-wm-detail-overlay').removeClass('dd-civ-visible'); });
    $(document).off('click.ddWMDetail', '#dd-wm-detail-overlay')
      .on('click.ddWMDetail', '#dd-wm-detail-overlay', function (e) { if (e.target === this) $(this).removeClass('dd-civ-visible'); });
  }

  function openWarrantDetail(id) {
    ensureWarrantDetailModal();
    var $overlay = $('#dd-wm-detail-overlay');
    var $body = $('#dd-wm-detail-body');

    $body.html('<div class="dd-spinner"></div>');
    $overlay.addClass('dd-civ-visible');

    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/warrant/' + encodeURIComponent(id),
      method: 'GET',
      success: function (w) {
        var d = w.warrant || {};

        var fields = [
          { label: 'Warrant Type', val: cap(d.warrantType) },
          { label: 'Status', val: cap(d.status) },
          { label: 'Accused', val: (d.accusedFirstName || '') + ' ' + (d.accusedLastName || '') },
          { label: 'Charges', val: (d.charges || []).join(', ') || 'N/A' },
          { label: 'Requesting Officer', val: d.requestingOfficerName },
          { label: 'Judge', val: d.judgeName ? 'The Honorable ' + d.judgeName : 'N/A' },
          { label: 'Date Filed', val: fmtDate(d.createdAt) }
        ];

        if (d.warrantType === 'search' && d.searchLocation) {
          fields.push({ label: 'Search Location', val: d.searchLocation });
        }
        if (d.judgeNotes) {
          fields.push({ label: 'Judge Notes', val: d.judgeNotes });
        }

        var html = '<div style="text-align:center;margin-bottom:1rem;"><span class="dd-wm-badge dd-wm-badge-' + esc(d.status) + '" style="font-size:0.8125rem;padding:0.35rem 1rem;">' + esc(cap(d.status)) + '</span></div>';
        html += '<div class="dd-civ-form-grid">';
        fields.forEach(function (f) {
          html += '<div class="dd-civ-field"><label>' + esc(f.label) + '</label>' +
            '<div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(f.val || 'N/A') + '</div></div>';
        });

        if (d.probableCause) {
          html += '<div class="dd-civ-field dd-civ-form-full"><label>Probable Cause</label>' +
            '<div style="padding:0.75rem;background:rgba(255,255,255,0.02);border:1px solid var(--dd-glass-border);border-radius:8px;color:var(--dd-text);font-size:0.8125rem;line-height:1.65;">' + esc(d.probableCause) + '</div></div>';
        }
        html += '</div>';

        // History timeline
        var history = d.history || [];
        if (history.length > 0) {
          var actionLabels = { created: 'Warrant Filed', approved: 'Approved', denied: 'Denied', edited: 'Edited', resubmitted: 'Resubmitted', executed: 'Served', withdrawn: 'Withdrawn' };
          var actionColors = { created: '#6366f1', approved: '#22c55e', denied: '#ef4444', edited: '#f59e0b', resubmitted: '#f59e0b', executed: '#8b5cf6', withdrawn: '#64748b' };

          html += '<div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--dd-glass-border);">' +
            '<div style="font-size:0.75rem;font-weight:600;color:var(--dd-text-muted);margin-bottom:0.75rem;">Warrant History</div>';

          history.forEach(function (h) {
            var label = actionLabels[h.action] || cap(h.action);
            var color = actionColors[h.action] || '#64748b';
            html += '<div style="display:flex;align-items:flex-start;gap:0.75rem;margin-bottom:0.625rem;">' +
              '<div style="width:8px;height:8px;border-radius:50%;background:' + color + ';margin-top:0.35rem;flex-shrink:0;"></div>' +
              '<div><div style="font-size:0.8125rem;font-weight:600;color:var(--dd-text);">' + esc(label) + '</div>' +
              '<div style="font-size:0.6875rem;color:var(--dd-text-muted);">' + esc(h.userName || 'System') + ' &middot; ' + fmtDate(h.timestamp) + '</div>' +
              (h.notes ? '<div style="font-size:0.75rem;color:var(--dd-text-dim);margin-top:0.15rem;">' + esc(h.notes) + '</div>' : '') +
              '</div></div>';
          });

          html += '</div>';
        }

        $('#dd-wm-detail-title').text(cap(d.warrantType || 'Unknown') + ' Warrant');
        $body.html(html);
      },
      error: function () {
        $body.html('<p style="color:var(--dd-red);">Failed to load warrant details</p>');
      }
    });
  }


  /* ───────────────────────────────────────────
     Exports
     ─────────────────────────────────────────── */

  window.ddBoloCreateRender = ddBoloCreateRender;
  window.ddBoloCreateInit = ddBoloCreateInit;
  window.ddBoloViewRender = ddBoloViewRender;
  window.ddBoloViewInit = ddBoloViewInit;

})();
