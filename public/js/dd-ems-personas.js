/**
 * Department Dashboard — EMS Personnel Component
 *
 * Registers window.ddEmsPersonaRender and window.ddEmsPersonaInit for the
 * department dashboard component registry. Provides EMS persona listing,
 * search, creation, editing, and detail viewing.
 */
(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  var cfg = function () { return window.ddConfig || {}; };
  var esc = function (s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
  var toast = function (m, t) { if (window.ddToast) window.ddToast(m, t); };

  var PAGE_SIZE = window.innerWidth <= 600 ? 6 : 12;
  var ddPage = 0;
  var ddTotal = 0;
  var ddData = [];
  var ddSearchTerm = '';
  var ddSearchTimer = null;
  var detailModalReady = false;
  var newModalReady = false;

  var DEPARTMENTS = ['EMS', 'Fire'];

  /** Flatten API response item */
  function flatten(item) {
    if (!item) return null;
    var p = item.persona || item.details || {};
    var out = $.extend({}, p);
    out._id = item._id || item.id || p._id || '';
    if (out._id && typeof out._id === 'object' && out._id.$oid) {
      out._id = out._id.$oid;
    }
    return out;
  }

  /** Parse API response */
  function parseList(data) {
    var arr = data.personas || data.data || data || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.map(flatten).filter(Boolean);
  }

  /** Build initials from name */
  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  /* ───────────────────────────────────────────
     Inline Styles (<style> injected once)
     ─────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById('dd-ems-persona-styles')) return;

    var css = '' +
      /* Toolbar */
      '.dd-ep-toolbar{display:flex;align-items:center;gap:0.625rem;flex-wrap:wrap;}' +
      '.dd-ep-search-wrap{position:relative;flex:1;min-width:160px;}' +
      '.dd-ep-search-wrap i{position:absolute;left:0.625rem;top:50%;transform:translateY(-50%);color:var(--dd-text-dim);font-size:0.75rem;pointer-events:none;}' +
      '.dd-ep-search{width:100%;padding-left:2rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.5rem 0.75rem 0.5rem 2rem;color:var(--dd-text);font-family:inherit;font-size:0.8125rem;outline:none;transition:border-color 0.2s;}' +
      '.dd-ep-search:focus{border-color:rgba(255,255,255,0.15);}' +
      '.dd-ep-search::placeholder{color:var(--dd-text-dim);}' +

      /* Add button */
      '.dd-ep-add-btn{padding:0.5rem 0.875rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(59,130,246,0.25);background:rgba(59,130,246,0.1);color:#93c5fd;font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.dd-ep-add-btn:hover{background:rgba(59,130,246,0.18);border-color:rgba(59,130,246,0.4);color:#bfdbfe;}' +

      /* Grid */
      '.dd-ep-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.75rem;}' +

      /* Card */
      '.dd-ep-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:1rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:flex-start;gap:0.75rem;}' +
      '.dd-ep-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);transform:translateY(-2px);}' +
      '.dd-ep-avatar{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.8125rem;font-weight:700;color:#fff;background:var(--dd-blue);}' +
      '.dd-ep-info{flex:1;min-width:0;}' +
      '.dd-ep-name{font-size:0.875rem;font-weight:600;color:var(--dd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-ep-meta{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-ep-dept-badge{display:inline-block;font-size:0.625rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;text-transform:uppercase;letter-spacing:0.04em;margin-top:0.35rem;}' +
      '.dd-ep-dept-ems{background:rgba(34,197,94,0.15);color:var(--dd-green);}' +
      '.dd-ep-dept-fire{background:rgba(249,115,22,0.15);color:#fb923c;}' +

      /* Pagination */
      '.dd-ep-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.dd-ep-page-info{font-size:0.75rem;color:var(--dd-text-muted);}' +
      '.dd-ep-page-btn{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);color:var(--dd-text);padding:0.35rem 0.75rem;font-size:0.75rem;cursor:pointer;transition:all 0.2s;font-family:inherit;}' +
      '.dd-ep-page-btn:hover:not(:disabled){background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);}' +
      '.dd-ep-page-btn:disabled{opacity:0.35;cursor:default;}' +

      /* Responsive */
      '@media(max-width:600px){' +
        '.dd-ep-toolbar{flex-direction:column;align-items:stretch;}' +
        '.dd-ep-search-wrap{min-width:0;}' +
      '}' +
    '';

    var style = document.createElement('style');
    style.id = 'dd-ems-persona-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ───────────────────────────────────────────
     Render Function (returns HTML string)
     ─────────────────────────────────────────── */

  function ddEmsPersonaRender(/* key */) {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(59,130,246,0.15);color:var(--dd-blue);"><i class="fa fa-id-badge"></i></div>' +
          '<div><h3 class="dd-card-title">Personnel</h3><p class="dd-card-subtitle">Manage EMS/Fire personnel</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body">' +
        '<div class="dd-ep-toolbar" style="margin-bottom:0.875rem;">' +
          '<div class="dd-ep-search-wrap">' +
            '<i class="fa fa-search"></i>' +
            '<input type="text" class="dd-ep-search" id="dd-ep-search" placeholder="Search personnel..." autocomplete="off">' +
          '</div>' +
          '<button class="dd-ep-add-btn" id="dd-ep-add-btn"><i class="fa fa-plus"></i> Add Personnel</button>' +
        '</div>' +
        '<div class="dd-ep-loading dd-spinner"></div>' +
        '<div class="dd-ep-empty-state dd-empty" style="display:none;">' +
          '<div class="dd-empty-icon-wrap" style="background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.15);">' +
            '<i class="fa fa-id-badge" style="color:var(--dd-blue);"></i>' +
          '</div>' +
          '<p class="dd-empty-title">No personnel found</p>' +
          '<p class="dd-empty-sub">Create your first personnel to get started</p>' +
        '</div>' +
        '<div id="dd-ep-grid" class="dd-ep-grid" style="display:none;"></div>' +
        '<div class="dd-ep-pagination" id="dd-ep-pagination" style="display:none;">' +
          '<button class="dd-ep-page-btn" id="dd-ep-prev"><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="dd-ep-page-info" id="dd-ep-page-info">Page 1</span>' +
          '<button class="dd-ep-page-btn" id="dd-ep-next">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>';
  }

  /* ───────────────────────────────────────────
     Init Function
     ─────────────────────────────────────────── */

  function ddEmsPersonaInit() {
    injectStyles();
    ddPage = 0;
    ddSearchTerm = '';
    wireEvents();
    loadPersonas();
  }

  /* ───────────────────────────────────────────
     Event Wiring
     ─────────────────────────────────────────── */

  function wireEvents() {
    $(document)
      .off('input.ddEP', '#dd-ep-search')
      .on('input.ddEP', '#dd-ep-search', function () {
        clearTimeout(ddSearchTimer);
        var val = $(this).val().trim();
        ddSearchTimer = setTimeout(function () {
          ddSearchTerm = val;
          ddPage = 0;
          loadPersonas();
        }, 300);
      });

    $(document)
      .off('click.ddEP', '#dd-ep-prev')
      .on('click.ddEP', '#dd-ep-prev', function () {
        if (ddPage > 0) { ddPage--; loadPersonas(); }
      });

    $(document)
      .off('click.ddEP', '#dd-ep-next')
      .on('click.ddEP', '#dd-ep-next', function () {
        if ((ddPage + 1) * PAGE_SIZE < ddTotal) { ddPage++; loadPersonas(); }
      });

    $(document)
      .off('click.ddEP', '#dd-ep-add-btn')
      .on('click.ddEP', '#dd-ep-add-btn', function () {
        openNewModal();
      });

    $(document)
      .off('click.ddEP', '.dd-ep-card')
      .on('click.ddEP', '.dd-ep-card', function () {
        var id = $(this).attr('data-ep-id');
        if (id) openDetailModal(id);
      });
  }

  /* ───────────────────────────────────────────
     Data Loading
     ─────────────────────────────────────────── */

  function loadPersonas() {
    var c = cfg();
    var $grid = $('#dd-ep-grid');
    var $loading = $('.dd-ep-loading');
    var $empty = $('.dd-ep-empty-state');
    var $pagination = $('#dd-ep-pagination');

    $grid.hide();
    $empty.hide();
    $pagination.hide();
    $loading.show();

    var url = c.API_URL + '/api/v1/ems-personas' +
      '?active_community_id=' + encodeURIComponent(c.communityId) +
      '&user_id=' + encodeURIComponent(c.userId) +
      '&limit=' + PAGE_SIZE +
      '&page=' + ddPage;

    if (ddSearchTerm) {
      url += '&search=' + encodeURIComponent(ddSearchTerm);
    }

    $.ajax({
      url: url,
      method: 'GET',
      success: function (data) {
        $loading.hide();
        ddData = parseList(data);
        ddTotal = (data && data.totalCount != null) ? data.totalCount :
                  (data && data.pagination && data.pagination.totalCount != null) ? data.pagination.totalCount :
                  (ddData.length < PAGE_SIZE ? (ddPage * PAGE_SIZE + ddData.length) : -1);
        renderGrid();
      },
      error: function () {
        $loading.hide();
        ddData = [];
        renderGrid();
        toast('Failed to load personnel', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Grid Rendering
     ─────────────────────────────────────────── */

  function renderGrid() {
    var $grid = $('#dd-ep-grid');
    var $empty = $('.dd-ep-empty-state');
    $grid.empty();

    if (!ddData.length) {
      $grid.hide();
      $empty.find('.dd-empty-title').text(ddSearchTerm ? 'No results found' : 'No personnel yet');
      $empty.find('.dd-empty-sub').text(ddSearchTerm ? 'Try a different search term' : 'Create your first personnel to get started');
      $empty.show();
      updatePagination();
      return;
    }

    $empty.hide();
    $grid.show();

    ddData.forEach(function (p) {
      var name = esc((p.firstName || '') + ' ' + (p.lastName || '')).trim() || 'Unknown';
      var dept = (p.department || 'EMS').toLowerCase();
      var deptCls = dept === 'fire' ? 'dd-ep-dept-fire' : 'dd-ep-dept-ems';

      var meta = [];
      if (p.callSign) meta.push('CS: ' + esc(p.callSign));
      if (p.station) meta.push('Stn: ' + esc(p.station));
      if (p.assignmentArea) meta.push(esc(p.assignmentArea));

      var html = '' +
        '<div class="dd-ep-card" data-ep-id="' + esc(p._id) + '">' +
          '<div class="dd-ep-avatar">' + initials(name) + '</div>' +
          '<div class="dd-ep-info">' +
            '<div class="dd-ep-name">' + name + '</div>' +
            '<div class="dd-ep-meta">' + (meta.join(' &middot; ') || 'No details') + '</div>' +
            '<span class="dd-ep-dept-badge ' + deptCls + '">' + esc(p.department || 'EMS') + '</span>' +
          '</div>' +
        '</div>';

      $grid.append(html);
    });

    updatePagination();
  }

  function updatePagination() {
    var $pagination = $('#dd-ep-pagination');
    var $info = $('#dd-ep-page-info');
    var $prev = $('#dd-ep-prev');
    var $next = $('#dd-ep-next');

    if (ddTotal <= PAGE_SIZE && ddPage === 0) {
      $pagination.hide();
      return;
    }

    $pagination.show();
    var totalPages = ddTotal > 0 ? Math.ceil(ddTotal / PAGE_SIZE) : ddPage + 2;
    $info.text('Page ' + (ddPage + 1) + (ddTotal > 0 ? ' of ' + totalPages : ''));
    $prev.prop('disabled', ddPage <= 0);
    $next.prop('disabled', ddTotal > 0 ? (ddPage + 1) * PAGE_SIZE >= ddTotal : ddData.length < PAGE_SIZE);
  }

  /* ───────────────────────────────────────────
     Detail Modal
     ─────────────────────────────────────────── */

  function ensureDetailModal() {
    if (detailModalReady) return;
    detailModalReady = true;

    var html = '' +
      '<div class="dd-civ-new-overlay" id="dd-ep-detail-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:560px;">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title" id="dd-ep-detail-title">Personnel Details</span>' +
            '<button class="dd-civ-close" id="dd-ep-detail-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body" id="dd-ep-detail-body">' +
            '<div class="dd-spinner"></div>' +
          '</div>' +
          '<div class="dd-civ-new-footer" id="dd-ep-detail-footer"></div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    $(document).off('click.ddEPDetail', '#dd-ep-detail-close')
      .on('click.ddEPDetail', '#dd-ep-detail-close', closeDetailModal);
    $(document).off('click.ddEPDetail', '#dd-ep-detail-overlay')
      .on('click.ddEPDetail', '#dd-ep-detail-overlay', function (e) {
        if (e.target === this) closeDetailModal();
      });
  }

  function openDetailModal(id) {
    ensureDetailModal();
    var $overlay = $('#dd-ep-detail-overlay');
    var $body = $('#dd-ep-detail-body');
    var $footer = $('#dd-ep-detail-footer');

    $body.html('<div class="dd-spinner"></div>');
    $footer.empty();
    $overlay.addClass('dd-civ-visible');

    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/ems-personas/' + encodeURIComponent(id),
      method: 'GET',
      success: function (data) {
        var p = data.persona || data || {};

        var fields = [
          { label: 'First Name', val: p.firstName },
          { label: 'Last Name', val: p.lastName },
          { label: 'Department', val: p.department },
          { label: 'Assignment Area', val: p.assignmentArea },
          { label: 'Station', val: p.station },
          { label: 'Call Sign', val: p.callSign }
        ];

        var html = '<div class="dd-civ-form-grid">';
        fields.forEach(function (f) {
          html += '<div class="dd-civ-field"><label>' + esc(f.label) + '</label>' +
            '<div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(f.val || 'N/A') + '</div></div>';
        });
        html += '</div>';

        $('#dd-ep-detail-title').text((p.firstName || '') + ' ' + (p.lastName || ''));
        $body.html(html);
        $footer.html(
          '<button class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-ep-edit-btn" data-id="' + esc(id) + '"><i class="fa fa-edit"></i> Edit</button>' +
          '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-ep-delete-btn" data-id="' + esc(id) + '"><i class="fa fa-trash"></i> Delete</button>'
        );
      },
      error: function () {
        $body.html('<p style="color:var(--dd-red);">Failed to load details</p>');
        toast('Failed to load personnel details', 'error');
      }
    });
  }

  function closeDetailModal() {
    $('#dd-ep-detail-overlay').removeClass('dd-civ-visible');
  }

  // Edit button in detail modal
  $(document).on('click.ddEP', '#dd-ep-edit-btn', function () {
    var id = $(this).attr('data-id');
    closeDetailModal();
    openEditModal(id);
  });

  // Delete button in detail modal
  $(document).on('click.ddEP', '#dd-ep-delete-btn', function () {
    var id = $(this).attr('data-id');
    if (window.ddModal) {
      window.ddModal({
        title: 'Delete Personnel',
        message: 'Are you sure you want to delete this personnel? This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmClass: 'dd-civ-btn-danger',
        onConfirm: function () { deletePersona(id); }
      });
    } else {
      if (confirm('Delete this personnel?')) deletePersona(id);
    }
  });

  /* ───────────────────────────────────────────
     New Personnel Modal
     ─────────────────────────────────────────── */

  function ensureNewModal() {
    if (newModalReady) return;
    newModalReady = true;

    var deptOptions = DEPARTMENTS.map(function (d) {
      return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
    }).join('');

    var html = '' +
      '<div class="dd-civ-new-overlay" id="dd-ep-new-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:560px;">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title">New Personnel</span>' +
            '<button class="dd-civ-close" id="dd-ep-new-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<div class="dd-civ-form-grid">' +
              '<div class="dd-civ-field"><label>First Name *</label><input type="text" id="dd-ep-new-firstName" maxlength="50" placeholder="First name"></div>' +
              '<div class="dd-civ-field"><label>Last Name *</label><input type="text" id="dd-ep-new-lastName" maxlength="50" placeholder="Last name"></div>' +
              '<div class="dd-civ-field"><label>Department *</label><select id="dd-ep-new-dept">' + deptOptions + '</select></div>' +
              '<div class="dd-civ-field"><label>Assignment Area *</label><input type="text" id="dd-ep-new-area" maxlength="50" placeholder="e.g. Downtown"></div>' +
              '<div class="dd-civ-field"><label>Station</label><input type="text" id="dd-ep-new-station" maxlength="5" placeholder="e.g. 42"></div>' +
              '<div class="dd-civ-field"><label>Call Sign</label><input type="text" id="dd-ep-new-callSign" maxlength="10" placeholder="e.g. M-12"></div>' +
            '</div>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-ep-new-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-ep-new-save"><i class="fa fa-plus"></i> Create</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    $(document).off('click.ddEPNew', '#dd-ep-new-close, #dd-ep-new-cancel')
      .on('click.ddEPNew', '#dd-ep-new-close, #dd-ep-new-cancel', closeNewModal);
    $(document).off('click.ddEPNew', '#dd-ep-new-overlay')
      .on('click.ddEPNew', '#dd-ep-new-overlay', function (e) {
        if (e.target === this) closeNewModal();
      });
    $(document).off('click.ddEPNew', '#dd-ep-new-save')
      .on('click.ddEPNew', '#dd-ep-new-save', createPersona);
  }

  function openNewModal() {
    ensureNewModal();
    // Clear form
    $('#dd-ep-new-firstName').val('');
    $('#dd-ep-new-lastName').val('');
    $('#dd-ep-new-dept').val('EMS');
    $('#dd-ep-new-area').val('');
    $('#dd-ep-new-station').val('');
    $('#dd-ep-new-callSign').val('');
    $('#dd-ep-new-save').prop('disabled', false).html('<i class="fa fa-plus"></i> Create');
    $('#dd-ep-new-overlay').addClass('dd-civ-visible');
  }

  function closeNewModal() {
    $('#dd-ep-new-overlay').removeClass('dd-civ-visible');
  }

  function createPersona() {
    var firstName = $('#dd-ep-new-firstName').val().trim();
    var lastName = $('#dd-ep-new-lastName').val().trim();
    var department = $('#dd-ep-new-dept').val();
    var assignmentArea = $('#dd-ep-new-area').val().trim();
    var station = $('#dd-ep-new-station').val().trim();
    var callSign = $('#dd-ep-new-callSign').val().trim();
    var c = cfg();

    if (!firstName || !lastName || !department || !assignmentArea) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    if (assignmentArea.length > 50) { toast('Assignment area must be 50 characters or less', 'error'); return; }
    if (station && station.length > 5) { toast('Station must be 5 characters or less', 'error'); return; }
    if (callSign && callSign.length > 10) { toast('Call sign must be 10 characters or less', 'error'); return; }

    var $btn = $('#dd-ep-new-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');

    $.ajax({
      url: c.API_URL + '/api/v1/ems-personas',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        persona: {
          firstName: firstName,
          lastName: lastName,
          department: department,
          assignmentArea: assignmentArea,
          station: station || undefined,
          callSign: callSign || undefined,
          activeCommunityID: c.communityId,
          userID: c.userId
        }
      }),
      success: function () {
        toast('Personnel created successfully', 'success');
        closeNewModal();
        ddPage = 0;
        loadPersonas();
      },
      error: function (xhr) {
        var msg = 'Failed to create personnel';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) {}
        toast(msg, 'error');
      },
      complete: function () {
        $btn.prop('disabled', false).html('<i class="fa fa-plus"></i> Create');
      }
    });
  }

  /* ───────────────────────────────────────────
     Edit Modal
     ─────────────────────────────────────────── */

  function openEditModal(id) {
    ensureNewModal(); // reuse the same modal structure
    var c = cfg();
    var $overlay = $('#dd-ep-new-overlay');

    // Show loading
    $overlay.addClass('dd-civ-visible');
    $('#dd-ep-new-save').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');

    $.ajax({
      url: c.API_URL + '/api/v1/ems-personas/' + encodeURIComponent(id),
      method: 'GET',
      success: function (data) {
        var p = data.persona || data || {};
        $('#dd-ep-new-firstName').val(p.firstName || '');
        $('#dd-ep-new-lastName').val(p.lastName || '');
        $('#dd-ep-new-dept').val(p.department || 'EMS');
        $('#dd-ep-new-area').val(p.assignmentArea || '');
        $('#dd-ep-new-station').val(p.station || '');
        $('#dd-ep-new-callSign').val(p.callSign || '');

        // Switch save button to update mode
        var $btn = $('#dd-ep-new-save');
        $btn.prop('disabled', false).html('<i class="fa fa-save"></i> Update');
        $btn.off('click.ddEPNew').on('click.ddEPNew', function () { updatePersona(id); });
        $('.dd-civ-new-title', $overlay.find('.dd-civ-new-panel')).text('Edit Personnel');
      },
      error: function () {
        toast('Failed to load personnel for editing', 'error');
        closeNewModal();
      }
    });
  }

  function updatePersona(id) {
    var firstName = $('#dd-ep-new-firstName').val().trim();
    var lastName = $('#dd-ep-new-lastName').val().trim();
    var department = $('#dd-ep-new-dept').val();
    var assignmentArea = $('#dd-ep-new-area').val().trim();
    var station = $('#dd-ep-new-station').val().trim();
    var callSign = $('#dd-ep-new-callSign').val().trim();
    var c = cfg();

    if (!firstName || !lastName || !department || !assignmentArea) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    if (assignmentArea.length > 50) { toast('Assignment area must be 50 characters or less', 'error'); return; }
    if (station && station.length > 5) { toast('Station must be 5 characters or less', 'error'); return; }
    if (callSign && callSign.length > 10) { toast('Call sign must be 10 characters or less', 'error'); return; }

    var $btn = $('#dd-ep-new-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Updating...');

    $.ajax({
      url: c.API_URL + '/api/v1/ems-personas/' + encodeURIComponent(id),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        persona: {
          firstName: firstName,
          lastName: lastName,
          department: department,
          assignmentArea: assignmentArea,
          station: station || undefined,
          callSign: callSign || undefined,
          activeCommunityID: c.communityId,
          userID: c.userId
        }
      }),
      success: function () {
        toast('Personnel updated successfully', 'success');
        closeNewModal();
        // Rebind the save button to create mode
        $(document).off('click.ddEPNew', '#dd-ep-new-save').on('click.ddEPNew', '#dd-ep-new-save', createPersona);
        loadPersonas();
      },
      error: function (xhr) {
        var msg = 'Failed to update personnel';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) {}
        toast(msg, 'error');
      },
      complete: function () {
        $btn.prop('disabled', false).html('<i class="fa fa-save"></i> Update');
      }
    });
  }

  /* ───────────────────────────────────────────
     Delete
     ─────────────────────────────────────────── */

  function deletePersona(id) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/ems-personas/' + encodeURIComponent(id),
      method: 'DELETE',
      success: function () {
        toast('Personnel deleted successfully', 'success');
        closeDetailModal();
        loadPersonas();
      },
      error: function () {
        toast('Failed to delete personnel', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Exports
     ─────────────────────────────────────────── */

  window.ddEmsPersonaRender = ddEmsPersonaRender;
  window.ddEmsPersonaInit = ddEmsPersonaInit;

})();
