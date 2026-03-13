/**
 * Department Dashboard — EMS Vehicles Component
 *
 * Registers window.ddEmsVehRender and window.ddEmsVehInit for the
 * department dashboard component registry. Provides EMS vehicle listing,
 * creation, editing, and detail viewing.
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

  var VEHICLE_MODELS = [
    'FireTruck',
    'Fire Dept. Vehicle',
    'Fire Dept. Chief Vehicle',
    'Ambulance',
    'Medical Dept. Vehicle',
    'Medical Dept. Chief Vehicle',
    'LifeGuard Patrol Vehicle',
    'LifeGuard Boat'
  ];

  /** Flatten API response item */
  function flatten(item) {
    if (!item) return null;
    var v = item.vehicle || item.details || {};
    var out = $.extend({}, v);
    out._id = item._id || item.id || v._id || '';
    if (out._id && typeof out._id === 'object' && out._id.$oid) {
      out._id = out._id.$oid;
    }
    return out;
  }

  /** Parse API response */
  function parseList(data) {
    var arr = data.vehicles || data.data || data || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.map(flatten).filter(Boolean);
  }

  /* ───────────────────────────────────────────
     Inline Styles
     ─────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById('dd-ems-veh-styles')) return;

    var css = '' +
      /* Toolbar */
      '.dd-ev-toolbar{display:flex;align-items:center;gap:0.625rem;flex-wrap:wrap;}' +
      '.dd-ev-search-wrap{position:relative;flex:1;min-width:160px;}' +
      '.dd-ev-search-wrap i{position:absolute;left:0.625rem;top:50%;transform:translateY(-50%);color:var(--dd-text-dim);font-size:0.75rem;pointer-events:none;}' +
      '.dd-ev-search{width:100%;padding-left:2rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.5rem 0.75rem 0.5rem 2rem;color:var(--dd-text);font-family:inherit;font-size:0.8125rem;outline:none;transition:border-color 0.2s;}' +
      '.dd-ev-search:focus{border-color:rgba(255,255,255,0.15);}' +
      '.dd-ev-search::placeholder{color:var(--dd-text-dim);}' +

      /* Add button */
      '.dd-ev-add-btn{padding:0.5rem 0.875rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(34,197,94,0.25);background:rgba(34,197,94,0.1);color:#86efac;font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.dd-ev-add-btn:hover{background:rgba(34,197,94,0.18);border-color:rgba(34,197,94,0.4);color:#bbf7d0;}' +

      /* Grid */
      '.dd-ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.75rem;}' +

      /* Card */
      '.dd-ev-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:1rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:flex-start;gap:0.75rem;}' +
      '.dd-ev-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);transform:translateY(-2px);}' +
      '.dd-ev-icon{width:44px;height:44px;border-radius:var(--dd-radius-sm);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1rem;color:#fff;background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.1));}' +
      '.dd-ev-info{flex:1;min-width:0;}' +
      '.dd-ev-name{font-size:0.875rem;font-weight:600;color:var(--dd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-ev-meta{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-ev-plate{display:inline-block;font-size:0.625rem;font-weight:700;padding:0.2rem 0.5rem;border-radius:4px;background:rgba(255,255,255,0.08);color:var(--dd-text);letter-spacing:0.05em;margin-top:0.35rem;border:1px solid var(--dd-glass-border);}' +

      /* Pagination */
      '.dd-ev-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.dd-ev-page-info{font-size:0.75rem;color:var(--dd-text-muted);}' +
      '.dd-ev-page-btn{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);color:var(--dd-text);padding:0.35rem 0.75rem;font-size:0.75rem;cursor:pointer;transition:all 0.2s;font-family:inherit;}' +
      '.dd-ev-page-btn:hover:not(:disabled){background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);}' +
      '.dd-ev-page-btn:disabled{opacity:0.35;cursor:default;}' +

      /* Responsive */
      '@media(max-width:600px){' +
        '.dd-ev-toolbar{flex-direction:column;align-items:stretch;}' +
        '.dd-ev-search-wrap{min-width:0;}' +
      '}' +
    '';

    var style = document.createElement('style');
    style.id = 'dd-ems-veh-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ───────────────────────────────────────────
     Render Function
     ─────────────────────────────────────────── */

  function ddEmsVehRender(/* key */) {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(34,197,94,0.15);color:var(--dd-green);"><i class="fa fa-ambulance"></i></div>' +
          '<div><h3 class="dd-card-title">Vehicles</h3><p class="dd-card-subtitle">Manage EMS/Fire vehicles</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body">' +
        '<div class="dd-ev-toolbar" style="margin-bottom:0.875rem;">' +
          '<div class="dd-ev-search-wrap">' +
            '<i class="fa fa-search"></i>' +
            '<input type="text" class="dd-ev-search" id="dd-ev-search" placeholder="Search vehicles..." autocomplete="off">' +
          '</div>' +
          '<button class="dd-ev-add-btn" id="dd-ev-add-btn"><i class="fa fa-plus"></i> Add Vehicle</button>' +
        '</div>' +
        '<div class="dd-ev-loading dd-spinner"></div>' +
        '<div class="dd-ev-empty-state dd-empty" style="display:none;">' +
          '<div class="dd-empty-icon-wrap" style="background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.15);">' +
            '<i class="fa fa-ambulance" style="color:var(--dd-green);"></i>' +
          '</div>' +
          '<p class="dd-empty-title">No vehicles found</p>' +
          '<p class="dd-empty-sub">Create your first vehicle to get started</p>' +
        '</div>' +
        '<div id="dd-ev-grid" class="dd-ev-grid" style="display:none;"></div>' +
        '<div class="dd-ev-pagination" id="dd-ev-pagination" style="display:none;">' +
          '<button class="dd-ev-page-btn" id="dd-ev-prev"><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="dd-ev-page-info" id="dd-ev-page-info">Page 1</span>' +
          '<button class="dd-ev-page-btn" id="dd-ev-next">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>';
  }

  /* ───────────────────────────────────────────
     Init Function
     ─────────────────────────────────────────── */

  function ddEmsVehInit() {
    injectStyles();
    ddPage = 0;
    ddSearchTerm = '';
    wireEvents();
    loadVehicles();
  }

  /* ───────────────────────────────────────────
     Event Wiring
     ─────────────────────────────────────────── */

  function wireEvents() {
    $(document)
      .off('input.ddEV', '#dd-ev-search')
      .on('input.ddEV', '#dd-ev-search', function () {
        clearTimeout(ddSearchTimer);
        var val = $(this).val().trim();
        ddSearchTimer = setTimeout(function () {
          ddSearchTerm = val;
          ddPage = 0;
          loadVehicles();
        }, 300);
      });

    $(document)
      .off('click.ddEV', '#dd-ev-prev')
      .on('click.ddEV', '#dd-ev-prev', function () {
        if (ddPage > 0) { ddPage--; loadVehicles(); }
      });

    $(document)
      .off('click.ddEV', '#dd-ev-next')
      .on('click.ddEV', '#dd-ev-next', function () {
        if ((ddPage + 1) * PAGE_SIZE < ddTotal) { ddPage++; loadVehicles(); }
      });

    $(document)
      .off('click.ddEV', '#dd-ev-add-btn')
      .on('click.ddEV', '#dd-ev-add-btn', function () {
        openNewModal();
      });

    $(document)
      .off('click.ddEV', '.dd-ev-card')
      .on('click.ddEV', '.dd-ev-card', function () {
        var id = $(this).attr('data-ev-id');
        if (id) openDetailModal(id);
      });
  }

  /* ───────────────────────────────────────────
     Data Loading
     ─────────────────────────────────────────── */

  function loadVehicles() {
    var c = cfg();
    var $grid = $('#dd-ev-grid');
    var $loading = $('.dd-ev-loading');
    var $empty = $('.dd-ev-empty-state');
    var $pagination = $('#dd-ev-pagination');

    $grid.hide();
    $empty.hide();
    $pagination.hide();
    $loading.show();

    var url = c.API_URL + '/api/v1/ems-vehicles' +
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
        toast('Failed to load vehicles', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Grid Rendering
     ─────────────────────────────────────────── */

  function renderGrid() {
    var $grid = $('#dd-ev-grid');
    var $empty = $('.dd-ev-empty-state');
    $grid.empty();

    if (!ddData.length) {
      $grid.hide();
      $empty.find('.dd-empty-title').text(ddSearchTerm ? 'No results found' : 'No vehicles yet');
      $empty.find('.dd-empty-sub').text(ddSearchTerm ? 'Try a different search term' : 'Create your first vehicle to get started');
      $empty.show();
      updatePagination();
      return;
    }

    $empty.hide();
    $grid.show();

    ddData.forEach(function (v) {
      var model = esc(v.model || 'Unknown');
      var meta = [];
      if (v.engineNumber) meta.push('Eng: ' + esc(v.engineNumber));
      if (v.color) meta.push(esc(v.color));

      var icon = 'fa-ambulance';
      if (model.toLowerCase().indexOf('fire') >= 0) icon = 'fa-fire-extinguisher';
      else if (model.toLowerCase().indexOf('lifeguard') >= 0) icon = 'fa-life-ring';

      var html = '' +
        '<div class="dd-ev-card" data-ev-id="' + esc(v._id) + '">' +
          '<div class="dd-ev-icon"><i class="fa ' + icon + '"></i></div>' +
          '<div class="dd-ev-info">' +
            '<div class="dd-ev-name">' + model + '</div>' +
            '<div class="dd-ev-meta">' + (meta.join(' &middot; ') || 'No details') + '</div>' +
            (v.plate ? '<span class="dd-ev-plate">' + esc(v.plate) + '</span>' : '') +
          '</div>' +
        '</div>';

      $grid.append(html);
    });

    updatePagination();
  }

  function updatePagination() {
    var $pagination = $('#dd-ev-pagination');
    var $info = $('#dd-ev-page-info');
    var $prev = $('#dd-ev-prev');
    var $next = $('#dd-ev-next');

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
      '<div class="dd-civ-new-overlay" id="dd-ev-detail-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:560px;">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title" id="dd-ev-detail-title">Vehicle Details</span>' +
            '<button class="dd-civ-close" id="dd-ev-detail-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body" id="dd-ev-detail-body">' +
            '<div class="dd-spinner"></div>' +
          '</div>' +
          '<div class="dd-civ-new-footer" id="dd-ev-detail-footer"></div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    $(document).off('click.ddEVDetail', '#dd-ev-detail-close')
      .on('click.ddEVDetail', '#dd-ev-detail-close', closeDetailModal);
    $(document).off('click.ddEVDetail', '#dd-ev-detail-overlay')
      .on('click.ddEVDetail', '#dd-ev-detail-overlay', function (e) {
        if (e.target === this) closeDetailModal();
      });
  }

  function openDetailModal(id) {
    ensureDetailModal();
    var $overlay = $('#dd-ev-detail-overlay');
    var $body = $('#dd-ev-detail-body');
    var $footer = $('#dd-ev-detail-footer');

    $body.html('<div class="dd-spinner"></div>');
    $footer.empty();
    $overlay.addClass('dd-civ-visible');

    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/ems-vehicles/' + encodeURIComponent(id),
      method: 'GET',
      success: function (data) {
        var v = data.vehicle || data || {};

        var fields = [
          { label: 'Plate Number', val: v.plate },
          { label: 'Model', val: v.model },
          { label: 'Engine Number', val: v.engineNumber },
          { label: 'Color', val: v.color },
          { label: 'Registered Owner', val: v.registeredOwner }
        ];

        var html = '<div class="dd-civ-form-grid">';
        fields.forEach(function (f) {
          html += '<div class="dd-civ-field"><label>' + esc(f.label) + '</label>' +
            '<div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(f.val || 'N/A') + '</div></div>';
        });
        html += '</div>';

        $('#dd-ev-detail-title').text(v.model || 'Vehicle Details');
        $body.html(html);
        $footer.html(
          '<button class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-ev-edit-btn" data-id="' + esc(id) + '"><i class="fa fa-edit"></i> Edit</button>' +
          '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-ev-delete-btn" data-id="' + esc(id) + '"><i class="fa fa-trash"></i> Delete</button>'
        );
      },
      error: function () {
        $body.html('<p style="color:var(--dd-red);">Failed to load details</p>');
        toast('Failed to load vehicle details', 'error');
      }
    });
  }

  function closeDetailModal() {
    $('#dd-ev-detail-overlay').removeClass('dd-civ-visible');
  }

  // Edit button in detail modal
  $(document).on('click.ddEV', '#dd-ev-edit-btn', function () {
    var id = $(this).attr('data-id');
    closeDetailModal();
    openEditModal(id);
  });

  // Delete button in detail modal
  $(document).on('click.ddEV', '#dd-ev-delete-btn', function () {
    var id = $(this).attr('data-id');
    if (window.ddModal) {
      window.ddModal({
        title: 'Delete Vehicle',
        message: 'Are you sure you want to delete this vehicle? This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmClass: 'dd-civ-btn-danger',
        onConfirm: function () { deleteVehicle(id); }
      });
    } else {
      if (confirm('Delete this vehicle?')) deleteVehicle(id);
    }
  });

  /* ───────────────────────────────────────────
     New Vehicle Modal
     ─────────────────────────────────────────── */

  function ensureNewModal() {
    if (newModalReady) return;
    newModalReady = true;

    var modelOptions = VEHICLE_MODELS.map(function (m) {
      return '<option value="' + esc(m) + '">' + esc(m) + '</option>';
    }).join('');

    var html = '' +
      '<div class="dd-civ-new-overlay" id="dd-ev-new-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:560px;">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title" id="dd-ev-new-title">New Vehicle</span>' +
            '<button class="dd-civ-close" id="dd-ev-new-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<div class="dd-civ-form-grid">' +
              '<div class="dd-civ-field"><label>Plate Number *</label><input type="text" id="dd-ev-new-plate" maxlength="8" placeholder="e.g. FD-1234"></div>' +
              '<div class="dd-civ-field"><label>Model *</label><select id="dd-ev-new-model">' + modelOptions + '</select></div>' +
              '<div class="dd-civ-field"><label>Engine Number *</label><input type="text" id="dd-ev-new-engine" maxlength="10" placeholder="e.g. ENG-001"></div>' +
              '<div class="dd-civ-field"><label>Color</label><input type="text" id="dd-ev-new-color" maxlength="30" placeholder="e.g. Red"></div>' +
              '<div class="dd-civ-field dd-civ-form-full"><label>Registered Owner</label><input type="text" id="dd-ev-new-owner" maxlength="100" placeholder="e.g. Fire Department"></div>' +
            '</div>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-ev-new-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-ev-new-save"><i class="fa fa-plus"></i> Create</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    $(document).off('click.ddEVNew', '#dd-ev-new-close, #dd-ev-new-cancel')
      .on('click.ddEVNew', '#dd-ev-new-close, #dd-ev-new-cancel', closeNewModal);
    $(document).off('click.ddEVNew', '#dd-ev-new-overlay')
      .on('click.ddEVNew', '#dd-ev-new-overlay', function (e) {
        if (e.target === this) closeNewModal();
      });
    $(document).off('click.ddEVNew', '#dd-ev-new-save')
      .on('click.ddEVNew', '#dd-ev-new-save', createVehicle);
  }

  function openNewModal() {
    ensureNewModal();
    $('#dd-ev-new-plate').val('');
    $('#dd-ev-new-model').val('Ambulance');
    $('#dd-ev-new-engine').val('');
    $('#dd-ev-new-color').val('');
    $('#dd-ev-new-owner').val('');
    $('#dd-ev-new-title').text('New Vehicle');
    var $btn = $('#dd-ev-new-save');
    $btn.prop('disabled', false).html('<i class="fa fa-plus"></i> Create');
    $btn.off('click.ddEVNew').on('click.ddEVNew', createVehicle);
    $('#dd-ev-new-overlay').addClass('dd-civ-visible');
  }

  function closeNewModal() {
    $('#dd-ev-new-overlay').removeClass('dd-civ-visible');
  }

  function createVehicle() {
    var plate = $('#dd-ev-new-plate').val().trim();
    var model = $('#dd-ev-new-model').val();
    var engineNumber = $('#dd-ev-new-engine').val().trim();
    var color = $('#dd-ev-new-color').val().trim();
    var registeredOwner = $('#dd-ev-new-owner').val().trim();
    var c = cfg();

    if (!plate || !model || !engineNumber) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    if (plate.length > 8) { toast('Plate number must be 8 characters or less', 'error'); return; }
    if (engineNumber.length > 10) { toast('Engine number must be 10 characters or less', 'error'); return; }

    var $btn = $('#dd-ev-new-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');

    $.ajax({
      url: c.API_URL + '/api/v1/ems-vehicles',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        vehicle: {
          plate: plate,
          model: model,
          engineNumber: engineNumber,
          color: color || undefined,
          registeredOwner: registeredOwner || 'N/A',
          activeCommunityID: c.communityId,
          userID: c.userId
        }
      }),
      success: function () {
        toast('Vehicle created successfully', 'success');
        closeNewModal();
        ddPage = 0;
        loadVehicles();
      },
      error: function (xhr) {
        var msg = 'Failed to create vehicle';
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
    ensureNewModal();
    var c = cfg();
    var $overlay = $('#dd-ev-new-overlay');

    $overlay.addClass('dd-civ-visible');
    $('#dd-ev-new-save').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');

    $.ajax({
      url: c.API_URL + '/api/v1/ems-vehicles/' + encodeURIComponent(id),
      method: 'GET',
      success: function (data) {
        var v = data.vehicle || data || {};
        $('#dd-ev-new-plate').val(v.plate || '');
        $('#dd-ev-new-model').val(v.model || 'Ambulance');
        $('#dd-ev-new-engine').val(v.engineNumber || '');
        $('#dd-ev-new-color').val(v.color || '');
        $('#dd-ev-new-owner').val(v.registeredOwner || '');
        $('#dd-ev-new-title').text('Edit Vehicle');

        var $btn = $('#dd-ev-new-save');
        $btn.prop('disabled', false).html('<i class="fa fa-save"></i> Update');
        $btn.off('click.ddEVNew').on('click.ddEVNew', function () { updateVehicle(id); });
      },
      error: function () {
        toast('Failed to load vehicle for editing', 'error');
        closeNewModal();
      }
    });
  }

  function updateVehicle(id) {
    var plate = $('#dd-ev-new-plate').val().trim();
    var model = $('#dd-ev-new-model').val();
    var engineNumber = $('#dd-ev-new-engine').val().trim();
    var color = $('#dd-ev-new-color').val().trim();
    var c = cfg();

    if (!plate || !model || !engineNumber) {
      toast('Please fill in all required fields', 'error');
      return;
    }

    if (plate.length > 8) { toast('Plate number must be 8 characters or less', 'error'); return; }
    if (engineNumber.length > 10) { toast('Engine number must be 10 characters or less', 'error'); return; }

    var $btn = $('#dd-ev-new-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Updating...');

    $.ajax({
      url: c.API_URL + '/api/v1/ems-vehicles/' + encodeURIComponent(id),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        vehicle: {
          plate: plate,
          model: model,
          engineNumber: engineNumber,
          color: color || undefined,
          activeCommunityID: c.communityId,
          userID: c.userId
        }
      }),
      success: function () {
        toast('Vehicle updated successfully', 'success');
        closeNewModal();
        $('#dd-ev-new-save').off('click.ddEVNew').on('click.ddEVNew', createVehicle);
        loadVehicles();
      },
      error: function (xhr) {
        var msg = 'Failed to update vehicle';
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

  function deleteVehicle(id) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/ems-vehicles/' + encodeURIComponent(id),
      method: 'DELETE',
      success: function () {
        toast('Vehicle deleted successfully', 'success');
        closeDetailModal();
        loadVehicles();
      },
      error: function () {
        toast('Failed to delete vehicle', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Exports
     ─────────────────────────────────────────── */

  window.ddEmsVehRender = ddEmsVehRender;
  window.ddEmsVehInit = ddEmsVehInit;

})();
