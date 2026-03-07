/**
 * Department Dashboard — Vehicles Component
 *
 * Registers window.ddVehRender and window.ddVehInit for the
 * department dashboard component registry.
 *
 * Dependencies (provided by department-dashboard.ejs):
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, dbUser }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 *   - window.ddModal() Confirmation modal helper
 */
;(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────
  var PAGE_SIZE = window.innerWidth <= 600 ? 6 : 12;
  var DEBOUNCE_MS = 300;
  var VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'; // excludes I, O, Q

  // ── State ──────────────────────────────────────────────────────────
  var vehicles = [];
  var currentPage = 0;
  var totalCount = 0;
  var searchQuery = '';
  var searchTimer = null;
  var detailModalReady = false;
  var newModalReady = false;

  // ── Helpers ────────────────────────────────────────────────────────

  function cfg() {
    return window.ddConfig || {};
  }

  function esc(str) {
    return window.esc ? window.esc(str) : String(str || '');
  }

  /**
   * Normalize boolean-ish API values.
   * The backend stores some booleans as strings ("1"/"2", "true"/"false")
   * or numbers (1/2). Normalize to a real boolean.
   */
  function toBool(val) {
    if (val === true || val === 1 || val === '1' || val === 'true') return true;
    return false;
  }

  /**
   * Convert a boolean back to the string the API expects.
   * "1" = true, "2" = false  (matches existing data convention).
   */
  function boolToApi(val) {
    return val ? '1' : '2';
  }

  function generateVin() {
    var vin = '';
    for (var i = 0; i < 17; i++) {
      vin += VIN_CHARS.charAt(Math.floor(Math.random() * VIN_CHARS.length));
    }
    return vin;
  }

  function totalPages() {
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }

  // ── Inject shared modal styles (dd-civ-* classes used by detail/new modals) ─
  function injectSharedModalStyles() {
    if (document.getElementById('dd-shared-modal-styles')) return;
    var css =
      '.dd-civ-new-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;}' +
      '.dd-civ-new-overlay.dd-civ-visible{opacity:1;pointer-events:auto;}' +
      '.dd-civ-new-panel{background:var(--dd-surface,#13131a);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);width:94vw;max-width:560px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);}' +
      '.dd-civ-new-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--dd-glass-border);}' +
      '.dd-civ-new-title{font-size:1rem;font-weight:700;color:#fff;}' +
      '.dd-civ-new-body{flex:1;overflow-y:auto;padding:1.25rem;}' +
      '.dd-civ-new-footer{display:flex;justify-content:flex-end;gap:0.5rem;padding:0.75rem 1.25rem;border-top:1px solid var(--dd-glass-border);}' +
      '.dd-civ-close{background:none;border:none;color:var(--dd-text-muted);font-size:1.125rem;cursor:pointer;padding:0.25rem;transition:color 0.2s;line-height:1;}' +
      '.dd-civ-close:hover{color:var(--dd-text);}' +
      '.dd-civ-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem 0.75rem;}' +
      '.dd-civ-field{display:flex;flex-direction:column;gap:0.25rem;}' +
      '.dd-civ-field label{font-size:0.6875rem;font-weight:500;color:var(--dd-text-muted);text-transform:uppercase;letter-spacing:0.04em;}' +
      '.dd-civ-field input[type="text"],.dd-civ-field select,.dd-civ-field textarea{background:rgba(255,255,255,0.05);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm,8px);padding:0.45rem 0.6rem;color:var(--dd-text);font-size:0.8125rem;outline:none;transition:border-color 0.2s;font-family:inherit;}' +
      '.dd-civ-field input:focus,.dd-civ-field select:focus,.dd-civ-field textarea:focus{border-color:var(--dd-accent);}' +
      '.dd-civ-checkbox-row{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:0.75rem 1.25rem;padding:0.25rem 0;}' +
      '.dd-civ-checkbox{display:flex;align-items:center;gap:0.4rem;font-size:0.8125rem;color:var(--dd-text);cursor:pointer;}' +
      '.dd-civ-checkbox input{accent-color:var(--dd-accent);width:15px;height:15px;cursor:pointer;}' +
      '.dd-civ-btn{border:none;border-radius:var(--dd-radius-sm,8px);padding:0.5rem 1rem;font-size:0.8125rem;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:inherit;display:inline-flex;align-items:center;gap:0.35rem;}' +
      '.dd-civ-btn-primary{background:var(--dd-accent);color:#fff;}.dd-civ-btn-primary:hover{filter:brightness(1.15);}' +
      '.dd-civ-btn-secondary{background:rgba(255,255,255,0.08);color:var(--dd-text);}.dd-civ-btn-secondary:hover{background:rgba(255,255,255,0.12);}' +
      '.dd-civ-btn-danger{background:rgba(239,68,68,0.15);color:#fca5a5;}.dd-civ-btn-danger:hover{background:rgba(239,68,68,0.25);}' +
      '.dd-civ-btn-small{padding:0.35rem 0.7rem;font-size:0.75rem;}' +
      '.dd-civ-photo-upload{position:relative;display:inline-block;cursor:pointer;}' +
      '.dd-civ-photo-upload input[type="file"]{display:none;}' +
      '.dd-civ-photo-overlay{position:absolute;inset:0;border-radius:8px;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;}' +
      '.dd-civ-photo-upload:hover .dd-civ-photo-overlay{opacity:1;}' +
      '.dd-civ-photo-overlay i{color:#fff;font-size:0.75rem;}' +
      '@media(max-width:600px){' +
        '.dd-civ-form-grid{grid-template-columns:1fr;}' +
        '.dd-civ-new-panel{width:100vw;max-width:100vw;max-height:100vh;height:100vh;border-radius:0;}' +
      '}';
    var style = document.createElement('style');
    style.id = 'dd-shared-modal-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Inject Styles (once) ───────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('dd-veh-styles')) return;
    injectSharedModalStyles();
    var css =
      /* ── Toolbar ── */
      '.dd-veh-toolbar{display:flex;align-items:center;gap:0.625rem;flex-wrap:wrap}' +
      '.dd-veh-search-wrap{position:relative;flex:1;min-width:160px}' +
      '.dd-veh-search-wrap i{position:absolute;left:0.625rem;top:50%;transform:translateY(-50%);color:var(--dd-text-dim);font-size:0.75rem;pointer-events:none}' +
      '.dd-veh-search{width:100%;padding:0.5rem 0.625rem 0.5rem 2rem;border-radius:var(--dd-radius-sm);border:1px solid var(--dd-glass-border);background:var(--dd-glass);color:var(--dd-text);font-family:inherit;font-size:0.8125rem;outline:none;transition:border-color 0.2s}' +
      '.dd-veh-search:focus{border-color:rgba(255,255,255,0.15)}' +
      '.dd-veh-search::placeholder{color:var(--dd-text-dim)}' +

      /* ── Add button (outline style) ── */
      '.dd-veh-add-btn{padding:0.5rem 0.875rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(59,130,246,0.25);background:rgba(59,130,246,0.1);color:#93c5fd;font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.375rem}' +
      '.dd-veh-add-btn:hover{background:rgba(59,130,246,0.18);border-color:rgba(59,130,246,0.4);color:#bfdbfe}' +

      /* ── Modal action buttons ── */
      '.dd-veh-btn{background:var(--dd-blue);color:#fff;border:none;border-radius:var(--dd-radius-sm,8px);padding:0.45rem 0.9rem;font-size:0.8125rem;font-weight:500;cursor:pointer;transition:opacity 0.2s;white-space:nowrap}' +
      '.dd-veh-btn:hover{opacity:0.85}' +
      '.dd-veh-btn-danger{background:var(--dd-red)}' +
      '.dd-veh-btn-secondary{background:rgba(255,255,255,0.08);color:var(--dd-text)}' +
      '.dd-veh-btn-secondary:hover{background:rgba(255,255,255,0.12)}' +
      '.dd-veh-btn-sm{padding:0.3rem 0.6rem;font-size:0.75rem}' +

      '.dd-veh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.75rem;min-height:120px}' +

      '.dd-veh-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:1rem;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;gap:0.5rem}' +
      '.dd-veh-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);transform:translateY(-2px)}' +

      '.dd-veh-card-top{display:flex;align-items:center;gap:0.75rem}' +
      '.dd-veh-card-img{width:48px;height:48px;border-radius:var(--dd-radius-sm,8px);object-fit:cover;background:rgba(255,255,255,0.04);flex-shrink:0}' +
      '.dd-veh-card-icon{width:48px;height:48px;border-radius:var(--dd-radius-sm,8px);background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;color:var(--dd-blue);font-size:1.15rem;flex-shrink:0}' +
      '.dd-veh-card-info{flex:1;min-width:0}' +
      '.dd-veh-card-plate{font-weight:600;font-size:0.9375rem;color:var(--dd-text);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.dd-veh-card-sub{font-size:0.75rem;color:var(--dd-text-muted);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +

      '.dd-veh-card-meta{display:flex;flex-wrap:wrap;gap:0.35rem}' +
      '.dd-veh-badge{font-size:0.625rem;font-weight:600;padding:0.15rem 0.4rem;border-radius:4px;text-transform:uppercase;letter-spacing:0.03em}' +
      '.dd-veh-badge-red{background:rgba(239,68,68,0.15);color:#fca5a5}' +
      '.dd-veh-badge-blue{background:rgba(59,130,246,0.15);color:#93c5fd}' +
      '.dd-veh-badge-green{background:rgba(34,197,94,0.15);color:#86efac}' +

      '.dd-veh-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem}' +
      '.dd-veh-page-btn{background:rgba(255,255,255,0.06);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm,8px);padding:0.35rem 0.75rem;color:var(--dd-text);font-size:0.8125rem;cursor:pointer;transition:all 0.2s}' +
      '.dd-veh-page-btn:hover:not(:disabled){background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.15)}' +
      '.dd-veh-page-btn:disabled{opacity:0.35;cursor:default}' +
      '.dd-veh-page-info{font-size:0.75rem;color:var(--dd-text-muted)}' +

      /* Detail / New modals */
      '.dd-veh-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s}' +
      '.dd-veh-overlay.active{opacity:1;pointer-events:auto}' +

      '.dd-veh-modal{background:rgba(15,23,42,0.95);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);width:94%;max-width:520px;max-height:90vh;overflow-y:auto;padding:1.5rem;position:relative;transform:translateY(12px) scale(0.97);transition:transform 0.25s}' +
      '.dd-veh-overlay.active .dd-veh-modal{transform:translateY(0) scale(1)}' +

      '.dd-veh-modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}' +
      '.dd-veh-modal-title{font-size:1.05rem;font-weight:600;color:var(--dd-text);margin:0}' +
      '.dd-veh-modal-close{background:none;border:none;color:var(--dd-text-muted);font-size:1.15rem;cursor:pointer;padding:0.25rem;transition:color 0.2s}' +
      '.dd-veh-modal-close:hover{color:var(--dd-text)}' +

      '.dd-veh-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}' +
      '.dd-veh-form-full{grid-column:1/-1}' +
      '.dd-veh-form-group{display:flex;flex-direction:column;gap:0.25rem}' +
      '.dd-veh-form-label{font-size:0.6875rem;font-weight:500;color:var(--dd-text-muted);text-transform:uppercase;letter-spacing:0.04em}' +
      '.dd-veh-form-input{background:rgba(255,255,255,0.05);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm,8px);padding:0.45rem 0.6rem;color:var(--dd-text);font-size:0.8125rem;outline:none;transition:border-color 0.2s}' +
      '.dd-veh-form-input:focus{border-color:var(--dd-blue)}' +

      '.dd-veh-vin-row{display:flex;gap:0.5rem}' +
      '.dd-veh-vin-row .dd-veh-form-input{flex:1}' +

      /* Photo upload */
      '.dd-veh-photo-section{display:flex;align-items:center;gap:1rem;margin-bottom:1rem}' +
      '.dd-veh-photo-wrap{width:80px;height:56px;border-radius:var(--dd-radius-sm,8px);overflow:hidden;position:relative;cursor:pointer;flex-shrink:0;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center}' +
      '.dd-veh-photo-wrap img{width:100%;height:100%;object-fit:cover}' +
      '.dd-veh-photo-wrap .dd-veh-photo-icon{font-size:1.5rem;color:var(--dd-blue)}' +
      '.dd-veh-photo-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;border-radius:inherit}' +
      '.dd-veh-photo-wrap:hover .dd-veh-photo-overlay{opacity:1}' +
      '.dd-veh-photo-overlay i{color:#fff;font-size:0.9rem}' +
      '.dd-veh-photo-wrap input[type="file"]{display:none}' +

      '.dd-veh-toggles{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-top:0.25rem}' +
      '.dd-veh-toggle{display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.8125rem;color:var(--dd-text)}' +
      '.dd-veh-toggle input{accent-color:var(--dd-blue);width:15px;height:15px;cursor:pointer}' +

      '.dd-veh-modal-actions{display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1.25rem}' +

      /* ── Responsive ── */
      '@media(max-width:600px){' +
        '.dd-veh-grid{grid-template-columns:1fr;gap:0.5rem}' +
        '.dd-veh-toolbar{flex-direction:column;align-items:stretch}' +
        '.dd-veh-search-wrap{min-width:0}' +
        '.dd-veh-form-grid{grid-template-columns:1fr}' +
        '.dd-veh-toggles{grid-template-columns:1fr}' +
      '}';

    var style = document.createElement('style');
    style.id = 'dd-veh-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Render (returns HTML string for the panel) ─────────────────────

  function ddVehRender() {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(59,130,246,0.15);color:var(--dd-blue);"><i class="fa fa-car"></i></div>' +
          '<div><h3 class="dd-card-title">Vehicles</h3><p class="dd-card-subtitle">Manage registered vehicles</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body">' +
        '<div class="dd-veh-toolbar" style="margin-bottom:0.875rem;">' +
          '<div class="dd-veh-search-wrap">' +
            '<i class="fa fa-search"></i>' +
            '<input type="text" class="dd-veh-search" id="dd-veh-search" placeholder="Search plate, make, model..." autocomplete="off">' +
          '</div>' +
          '<button class="dd-veh-add-btn" id="dd-veh-add-btn"><i class="fa fa-plus"></i> Add New Vehicle</button>' +
        '</div>' +
        '<div class="dd-veh-loading dd-spinner"></div>' +
        '<div class="dd-veh-empty dd-empty" style="display:none;">' +
          '<div class="dd-empty-icon-wrap" style="background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.15);">' +
            '<i class="fa fa-car" style="color:var(--dd-blue);"></i>' +
          '</div>' +
          '<p class="dd-empty-title">No vehicles found</p>' +
          '<p class="dd-empty-sub">Register your first vehicle to get started</p>' +
        '</div>' +
        '<div id="dd-veh-grid" class="dd-veh-grid" style="display:none;"></div>' +
        '<div class="dd-veh-pagination" id="dd-veh-pagination" style="display:none;">' +
          '<button class="dd-veh-page-btn" id="dd-veh-prev"><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="dd-veh-page-info" id="dd-veh-page-info">Page 1 of 1</span>' +
          '<button class="dd-veh-page-btn" id="dd-veh-next">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>';
  }

  // ── Init (called after panel is in the DOM) ────────────────────────

  function ddVehInit() {
    injectStyles();
    currentPage = 0;
    searchQuery = '';
    loadVehicles();

    // Search input
    $(document).off('input.ddVeh', '#dd-veh-search').on('input.ddVeh', '#dd-veh-search', function () {
      var q = $.trim($(this).val());
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchQuery = q;
        currentPage = 0;
        loadVehicles();
      }, DEBOUNCE_MS);
    });

    // Pagination
    $(document).off('click.ddVehPrev', '#dd-veh-prev').on('click.ddVehPrev', '#dd-veh-prev', function () {
      if (currentPage > 0) {
        currentPage--;
        loadVehicles();
      }
    });
    $(document).off('click.ddVehNext', '#dd-veh-next').on('click.ddVehNext', '#dd-veh-next', function () {
      if (currentPage < totalPages() - 1) {
        currentPage++;
        loadVehicles();
      }
    });

    // Add new vehicle button
    $(document).off('click.ddVehAdd', '#dd-veh-add-btn').on('click.ddVehAdd', '#dd-veh-add-btn', function () {
      openNewModal();
    });

    if (window.ddLimits) window.ddLimits.check('vehicle');
  }

  // ── API: Load Vehicles ─────────────────────────────────────────────

  function loadVehicles() {
    var config = cfg();
    if (!config.userId || !config.communityId) return;

    var $grid = $('#dd-veh-grid');
    var $loading = $('.dd-veh-loading');
    var $empty = $('.dd-veh-empty');
    var $pagination = $('#dd-veh-pagination');

    $grid.hide();
    $empty.hide();
    $pagination.hide();
    $loading.show();

    var url = config.API_URL + '/api/v2/vehicles/user/' +
      encodeURIComponent(config.userId) +
      '?active_community_id=' + encodeURIComponent(config.communityId) +
      '&limit=' + PAGE_SIZE +
      '&page=' + currentPage;

    $.ajax({
      url: url,
      method: 'GET',
      headers: {},
      success: function (data) {
        $loading.hide();
        var items = normalizeVehicleList(data);
        if (data && typeof data.totalCount === 'number') {
          totalCount = data.totalCount;
        } else {
          totalCount = items.length < PAGE_SIZE
            ? currentPage * PAGE_SIZE + items.length
            : (currentPage + 2) * PAGE_SIZE;
        }
        vehicles = items;

        if (vehicles.length === 0 && currentPage === 0) {
          $empty.show();
          return;
        }

        renderCards(filterLocal(vehicles));
        $grid.show();
        updatePagination();
      },
      error: function () {
        $loading.hide();
        $empty.find('.dd-empty-title').text('Unable to load vehicles');
        $empty.find('.dd-empty-sub').text('Check your connection and try again');
        $empty.show();
      }
    });
  }

  /**
   * Normalize the API response into an array of vehicle objects.
   * The response shape may vary: { data: [...] }, { vehicles: [...] },
   * or a plain array.
   */
  function normalizeVehicleList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.vehicles)) return data.vehicles;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  }

  /**
   * Apply local search filter (plate, make, model, type).
   */
  function filterLocal(list) {
    if (!searchQuery) return list;
    var q = searchQuery.toLowerCase();
    return list.filter(function (v) {
      var d = v.vehicle || v;
      return (
        (d.plate || '').toLowerCase().indexOf(q) !== -1 ||
        (d.make || '').toLowerCase().indexOf(q) !== -1 ||
        (d.model || '').toLowerCase().indexOf(q) !== -1 ||
        (d.type || '').toLowerCase().indexOf(q) !== -1
      );
    });
  }

  // ── Render Cards ───────────────────────────────────────────────────

  function renderCards(list) {
    var $grid = $('#dd-veh-grid');
    var $empty = $('.dd-veh-empty');
    $grid.empty();

    if (list.length === 0) {
      $grid.hide();
      $empty.find('.dd-empty-title').text(searchQuery ? 'No vehicles match your search' : 'No vehicles found');
      $empty.find('.dd-empty-sub').text(searchQuery ? 'Try a different search term' : 'Register your first vehicle to get started');
      $empty.show();
      updatePagination();
      return;
    }

    $empty.hide();
    $grid.show();

    list.forEach(function (v, i) {
      var d = v.vehicle || v;
      var id = v._id || v.id || '';

      // Image or icon
      var visual;
      if (d.image) {
        visual = '<img class="dd-veh-card-img" src="' + esc(d.image) + '" alt="Vehicle" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
                 '<div class="dd-veh-card-icon" style="display:none"><i class="fa fa-car"></i></div>';
      } else {
        visual = '<div class="dd-veh-card-icon"><i class="fa fa-car"></i></div>';
      }

      // Sub line: year make model
      var sub = [d.year, d.make, d.model].filter(Boolean).join(' ');
      if (d.type) sub = esc(d.type) + (sub ? ' \u2022 ' : '') + esc(sub);
      if (d.color) sub += (sub ? ' \u2022 ' : '') + esc(d.color);

      // Badges
      var badges = '';
      if (toBool(d.isStolen)) {
        badges += '<span class="dd-veh-badge dd-veh-badge-red">Stolen</span>';
      }
      if (toBool(d.isExempt)) {
        badges += '<span class="dd-veh-badge dd-veh-badge-blue">Exempt</span>';
      }
      if (!toBool(d.validRegistration)) {
        badges += '<span class="dd-veh-badge dd-veh-badge-red">Invalid Registration</span>';
      }
      if (!toBool(d.validInsurance)) {
        badges += '<span class="dd-veh-badge dd-veh-badge-red">Invalid Insurance</span>';
      }

      var card =
        '<div class="dd-veh-card" data-veh-id="' + esc(id) + '" style="animation-delay:' + (i * 0.04) + 's">' +
          '<div class="dd-veh-card-top">' +
            visual +
            '<div class="dd-veh-card-info">' +
              '<p class="dd-veh-card-plate">' + esc(d.plate || 'No Plate') + '</p>' +
              '<p class="dd-veh-card-sub">' + (sub || '&mdash;') + '</p>' +
            '</div>' +
          '</div>' +
          (badges ? '<div class="dd-veh-card-meta">' + badges + '</div>' : '') +
        '</div>';

      $grid.append(card);
    });

    // Click handler for cards
    $grid.find('.dd-veh-card').off('click.ddVehCard').on('click.ddVehCard', function () {
      var id = $(this).data('veh-id');
      if (id) openDetailModal(String(id));
    });

    updatePagination();
  }

  function updatePagination() {
    var tp = totalPages();
    var $pag = $('#dd-veh-pagination');
    if (tp <= 1 && vehicles.length <= PAGE_SIZE) {
      $pag.hide();
      return;
    }
    $pag.show();
    $('#dd-veh-prev').prop('disabled', currentPage <= 0);
    $('#dd-veh-next').prop('disabled', currentPage >= tp - 1);
    $('#dd-veh-page-info').text('Page ' + (currentPage + 1) + ' of ' + tp);
  }

  // ── Detail Modal ───────────────────────────────────────────────────

  function ensureDetailModal() {
    if (detailModalReady) return;
    detailModalReady = true;

    var html =
      '<div class="dd-civ-new-overlay" id="dd-veh-detail-overlay">' +
        '<div class="dd-civ-new-panel">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title"><i class="fa fa-car" style="margin-right:0.4rem;color:var(--dd-blue);"></i>Vehicle Details</span>' +
            '<button class="dd-civ-close" id="dd-veh-detail-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<input type="hidden" id="dd-veh-detail-id">' +
            '<input type="hidden" id="dd-veh-d-image-url">' +
            '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.75rem;">' +
              '<div class="dd-civ-photo-upload" id="dd-veh-d-photo-wrap" style="flex-shrink:0;">' +
                '<div style="width:64px;height:48px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(59,130,246,0.12);border:1.5px solid var(--dd-glass-border);">' +
                  '<i class="fa fa-car" style="font-size:1.25rem;color:var(--dd-blue);" id="dd-veh-d-photo-icon"></i>' +
                  '<img id="dd-veh-d-photo-img" src="" alt="" style="display:none;width:100%;height:100%;object-fit:cover;">' +
                '</div>' +
                '<div class="dd-civ-photo-overlay"><i class="fa fa-camera"></i></div>' +
                '<input type="file" accept="image/*" id="dd-veh-d-photo-input" style="display:none;" />' +
              '</div>' +
              '<div style="font-size:0.75rem;color:var(--dd-text-muted);">Vehicle Photo</div>' +
            '</div>' +
            '<div class="dd-civ-form-grid">' +
              formGroup('dd-veh-d-plate', 'Plate') +
              formGroup('dd-veh-d-plateState', 'Plate State') +
              '<div class="dd-civ-field" style="grid-column:1/-1;">' +
                '<label for="dd-veh-d-vin">VIN</label>' +
                '<div style="display:flex;gap:0.5rem;">' +
                  '<input type="text" id="dd-veh-d-vin" maxlength="17" style="flex:1;">' +
                  '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-veh-d-vin-gen" type="button" title="Auto-generate VIN"><i class="fa fa-random"></i></button>' +
                '</div>' +
              '</div>' +
              formGroup('dd-veh-d-type', 'Type') +
              formGroup('dd-veh-d-make', 'Make') +
              formGroup('dd-veh-d-model', 'Model') +
              formGroup('dd-veh-d-year', 'Year') +
              formGroup('dd-veh-d-color', 'Color') +
              '<div class="dd-civ-checkbox-row">' +
                toggleField('dd-veh-d-validReg', 'Valid Registration') +
                toggleField('dd-veh-d-validIns', 'Valid Insurance') +
                toggleField('dd-veh-d-stolen', 'Is Stolen') +
                toggleField('dd-veh-d-exempt', 'Is Exempt') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-veh-detail-delete"><i class="fa fa-trash" style="margin-right:0.3rem;"></i>Delete</button>' +
            '<span style="flex:1;"></span>' +
            '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-veh-detail-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-veh-detail-save"><i class="fa fa-save" style="margin-right:0.3rem;"></i>Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    // Close handlers
    $('#dd-veh-detail-close, #dd-veh-detail-cancel').on('click', closeDetailModal);
    $('#dd-veh-detail-overlay').on('click', function (e) {
      if (e.target === this) closeDetailModal();
    });

    // VIN generator in edit modal
    $('#dd-veh-d-vin-gen').on('click', function () {
      $('#dd-veh-d-vin').val(generateVin());
    });

    // Photo upload in edit modal
    $('#dd-veh-d-photo-input').on('click', function (e) { e.stopPropagation(); });
    $('#dd-veh-d-photo-wrap').on('click', function () {
      $('#dd-veh-d-photo-input').trigger('click');
    });
    $('#dd-veh-d-photo-input').on('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!window.uploadToCloudinary) {
        window.ddToast('Photo upload not configured', 'error');
        return;
      }
      var $img = $('#dd-veh-d-photo-img');
      var $icon = $('#dd-veh-d-photo-icon');
      $icon.attr('class', 'fa fa-spinner fa-spin').css({'font-size':'1.25rem','color':'var(--dd-text-muted)'});
      window.uploadToCloudinary(file, 'vehicles', null)
        .then(function (url) {
          $img.attr('src', url).show();
          $icon.hide();
          $('#dd-veh-d-image-url').val(url);
          window.ddToast('Photo uploaded', 'success');
        })
        .catch(function () {
          $icon.attr('class', 'fa fa-car').css({'font-size':'1.25rem','color':'var(--dd-blue)'}).show();
          window.ddToast('Photo upload failed', 'error');
        });
    });

    // Save handler
    $('#dd-veh-detail-save').on('click', saveVehicle);

    // Delete handler
    $('#dd-veh-detail-delete').on('click', deleteVehicle);
  }

  function openDetailModal(vehId) {
    ensureDetailModal();

    // Find the vehicle in the local list
    var veh = null;
    for (var i = 0; i < vehicles.length; i++) {
      if ((vehicles[i]._id || vehicles[i].id) === vehId) {
        veh = vehicles[i];
        break;
      }
    }
    if (!veh) return;

    var d = veh.vehicle || veh;
    $('#dd-veh-detail-id').val(vehId);
    $('#dd-veh-d-plate').val(d.plate || '');
    $('#dd-veh-d-plateState').val(d.licensePlateState || '');
    $('#dd-veh-d-vin').val(d.vin || '');
    $('#dd-veh-d-type').val(d.type || '');
    $('#dd-veh-d-make').val(d.make || '');
    $('#dd-veh-d-model').val(d.model || '');
    $('#dd-veh-d-year').val(d.year || '');
    $('#dd-veh-d-color').val(d.color || '');
    $('#dd-veh-d-image-url').val(d.image || '');
    // Photo preview
    if (d.image) {
      $('#dd-veh-d-photo-img').attr('src', d.image).show();
      $('#dd-veh-d-photo-icon').hide();
    } else {
      $('#dd-veh-d-photo-img').hide();
      $('#dd-veh-d-photo-icon').attr('class', 'fa fa-car dd-veh-photo-icon').show();
    }
    $('#dd-veh-d-validReg').prop('checked', toBool(d.validRegistration));
    $('#dd-veh-d-validIns').prop('checked', toBool(d.validInsurance));
    $('#dd-veh-d-stolen').prop('checked', toBool(d.isStolen));
    $('#dd-veh-d-exempt').prop('checked', toBool(d.isExempt));

    $('#dd-veh-detail-overlay').addClass('dd-civ-visible');
  }

  function closeDetailModal() {
    $('#dd-veh-detail-overlay').removeClass('dd-civ-visible');
  }

  function saveVehicle() {
    var config = cfg();
    var vehId = $('#dd-veh-detail-id').val();
    if (!vehId) return;

    var payload = {
      plate: $.trim($('#dd-veh-d-plate').val()).toUpperCase(),
      licensePlateState: $.trim($('#dd-veh-d-plateState').val()),
      vin: $.trim($('#dd-veh-d-vin').val()).toUpperCase(),
      type: $.trim($('#dd-veh-d-type').val()),
      make: $.trim($('#dd-veh-d-make').val()),
      model: $.trim($('#dd-veh-d-model').val()),
      year: $.trim($('#dd-veh-d-year').val()),
      color: $.trim($('#dd-veh-d-color').val()),
      image: $.trim($('#dd-veh-d-image-url').val()),
      validRegistration: boolToApi($('#dd-veh-d-validReg').is(':checked')),
      validInsurance: boolToApi($('#dd-veh-d-validIns').is(':checked')),
      isStolen: boolToApi($('#dd-veh-d-stolen').is(':checked')),
      isExempt: boolToApi($('#dd-veh-d-exempt').is(':checked')),
      userID: config.userId,
      activeCommunityID: config.communityId
    };

    var $btn = $('#dd-veh-detail-save');
    $btn.prop('disabled', true).text('Saving...');

    $.ajax({
      url: config.API_URL + '/api/v1/vehicle/' + encodeURIComponent(vehId),
      method: 'PUT',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        window.ddToast('Vehicle updated', 'success');
        closeDetailModal();
        loadVehicles();
      },
      error: function () {
        window.ddToast('Failed to update vehicle', 'error');
      },
      complete: function () {
        $btn.prop('disabled', false).html('<i class="fa fa-save" style="margin-right:0.3rem"></i>Save');
      }
    });
  }

  function deleteVehicle() {
    var config = cfg();
    var vehId = $('#dd-veh-detail-id').val();
    if (!vehId) return;

    window.ddModal({
      type: 'danger',
      icon: 'fa-trash',
      title: 'Delete Vehicle',
      message: 'Are you sure you want to delete this vehicle?',
      detail: 'This action cannot be undone.',
      confirmText: 'Delete',
      onConfirm: function () {
        $.ajax({
          url: config.API_URL + '/api/v1/vehicle/' + encodeURIComponent(vehId),
          method: 'DELETE',
          headers: {},
          success: function () {
            window.ddToast('Vehicle deleted', 'success');
            closeDetailModal();
            loadVehicles();
            if (window.ddLimits) window.ddLimits.check('vehicle');
          },
          error: function () {
            window.ddToast('Failed to delete vehicle', 'error');
          }
        });
      }
    });
  }

  // ── New Vehicle Modal ──────────────────────────────────────────────

  function ensureNewModal() {
    if (newModalReady) return;
    newModalReady = true;

    var html =
      '<div class="dd-civ-new-overlay" id="dd-veh-new-overlay">' +
        '<div class="dd-civ-new-panel">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title"><i class="fa fa-car" style="margin-right:0.4rem;color:var(--dd-blue);"></i>New Vehicle</span>' +
            '<button class="dd-civ-close" id="dd-veh-new-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<input type="hidden" id="dd-veh-n-image-url">' +
            '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.75rem;">' +
              '<div class="dd-civ-photo-upload" id="dd-veh-n-photo-wrap" style="flex-shrink:0;">' +
                '<div style="width:64px;height:48px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(59,130,246,0.12);border:1.5px solid var(--dd-glass-border);">' +
                  '<i class="fa fa-car" style="font-size:1.25rem;color:var(--dd-blue);" id="dd-veh-n-photo-icon"></i>' +
                  '<img id="dd-veh-n-photo-img" src="" alt="" style="display:none;width:100%;height:100%;object-fit:cover;">' +
                '</div>' +
                '<div class="dd-civ-photo-overlay"><i class="fa fa-camera"></i></div>' +
                '<input type="file" accept="image/*" id="dd-veh-n-photo-input" style="display:none;" />' +
              '</div>' +
              '<div style="font-size:0.75rem;color:var(--dd-text-muted);">Vehicle Photo</div>' +
            '</div>' +
            '<div class="dd-civ-form-grid">' +
              formGroup('dd-veh-n-plate', 'Plate') +
              formGroup('dd-veh-n-plateState', 'Plate State') +
              '<div class="dd-civ-field" style="grid-column:1/-1;">' +
                '<label for="dd-veh-n-vin">VIN</label>' +
                '<div style="display:flex;gap:0.5rem;">' +
                  '<input type="text" id="dd-veh-n-vin" maxlength="17" style="flex:1;">' +
                  '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-veh-n-vin-gen" type="button" title="Auto-generate VIN"><i class="fa fa-random"></i></button>' +
                '</div>' +
              '</div>' +
              formGroup('dd-veh-n-type', 'Type') +
              formGroup('dd-veh-n-make', 'Make') +
              formGroup('dd-veh-n-model', 'Model') +
              formGroup('dd-veh-n-year', 'Year') +
              formGroup('dd-veh-n-color', 'Color') +
              '<div class="dd-civ-checkbox-row">' +
                toggleField('dd-veh-n-validReg', 'Valid Registration', true) +
                toggleField('dd-veh-n-validIns', 'Valid Insurance', true) +
                toggleField('dd-veh-n-stolen', 'Is Stolen') +
                toggleField('dd-veh-n-exempt', 'Is Exempt') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-veh-new-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-veh-new-submit"><i class="fa fa-plus" style="margin-right:0.3rem;"></i>Create</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    // Close handlers
    $('#dd-veh-new-close, #dd-veh-new-cancel').on('click', closeNewModal);
    $('#dd-veh-new-overlay').on('click', function (e) {
      if (e.target === this) closeNewModal();
    });

    // VIN generator
    $('#dd-veh-n-vin-gen').on('click', function () {
      $('#dd-veh-n-vin').val(generateVin());
    });

    // Photo upload in new modal
    $('#dd-veh-n-photo-input').on('click', function (e) { e.stopPropagation(); });
    $('#dd-veh-n-photo-wrap').on('click', function () {
      $('#dd-veh-n-photo-input').trigger('click');
    });
    $('#dd-veh-n-photo-input').on('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!window.uploadToCloudinary) {
        window.ddToast('Photo upload not configured', 'error');
        return;
      }
      var $img = $('#dd-veh-n-photo-img');
      var $icon = $('#dd-veh-n-photo-icon');
      $icon.attr('class', 'fa fa-spinner fa-spin').css({'font-size':'1.25rem','color':'var(--dd-text-muted)'});
      window.uploadToCloudinary(file, 'vehicles', null)
        .then(function (url) {
          $img.attr('src', url).show();
          $icon.hide();
          $('#dd-veh-n-image-url').val(url);
          window.ddToast('Photo uploaded', 'success');
        })
        .catch(function () {
          $icon.attr('class', 'fa fa-car').css({'font-size':'1.25rem','color':'var(--dd-blue)'}).show();
          window.ddToast('Photo upload failed', 'error');
        });
    });

    // Submit handler
    $('#dd-veh-new-submit').on('click', createVehicle);
  }

  function openNewModal() {
    ensureNewModal();

    // Reset form
    $('#dd-veh-new-overlay').find('.dd-civ-field input[type="text"]').val('');
    $('#dd-veh-n-image-url').val('');
    $('#dd-veh-n-photo-img').hide();
    $('#dd-veh-n-photo-icon').attr('class', 'fa fa-car').css('font-size', '1.25rem').show();
    $('#dd-veh-n-validReg').prop('checked', true);
    $('#dd-veh-n-validIns').prop('checked', true);
    $('#dd-veh-n-stolen').prop('checked', false);
    $('#dd-veh-n-exempt').prop('checked', false);

    $('#dd-veh-new-overlay').addClass('dd-civ-visible');
  }

  function closeNewModal() {
    $('#dd-veh-new-overlay').removeClass('dd-civ-visible');
  }

  function createVehicle() {
    var config = cfg();

    var plate = $.trim($('#dd-veh-n-plate').val()).toUpperCase();
    if (!plate) {
      window.ddToast('Plate number is required', 'error');
      return;
    }

    var payload = {
      plate: plate,
      licensePlateState: $.trim($('#dd-veh-n-plateState').val()),
      vin: $.trim($('#dd-veh-n-vin').val()).toUpperCase(),
      type: $.trim($('#dd-veh-n-type').val()),
      make: $.trim($('#dd-veh-n-make').val()),
      model: $.trim($('#dd-veh-n-model').val()),
      year: $.trim($('#dd-veh-n-year').val()),
      color: $.trim($('#dd-veh-n-color').val()),
      image: $.trim($('#dd-veh-n-image-url').val()),
      validRegistration: boolToApi($('#dd-veh-n-validReg').is(':checked')),
      validInsurance: boolToApi($('#dd-veh-n-validIns').is(':checked')),
      isStolen: boolToApi($('#dd-veh-n-stolen').is(':checked')),
      isExempt: boolToApi($('#dd-veh-n-exempt').is(':checked')),
      registeredOwner: '',
      registeredOwnerID: '',
      userID: config.userId,
      activeCommunityID: config.communityId
    };

    var $btn = $('#dd-veh-new-submit');
    $btn.prop('disabled', true).text('Creating...');

    $.ajax({
      url: config.API_URL + '/api/v1/vehicle',
      method: 'POST',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        window.ddToast('Vehicle created', 'success');
        closeNewModal();
        currentPage = 0;
        loadVehicles();
        if (window.ddLimits) window.ddLimits.check('vehicle');
      },
      error: function () {
        window.ddToast('Failed to create vehicle', 'error');
      },
      complete: function () {
        $btn.prop('disabled', false).html('<i class="fa fa-plus" style="margin-right:0.3rem"></i>Create');
      }
    });
  }

  // ── Form Helper Builders ───────────────────────────────────────────

  function formGroup(id, label) {
    return (
      '<div class="dd-civ-field">' +
        '<label for="' + id + '">' + esc(label) + '</label>' +
        '<input type="text" id="' + id + '">' +
      '</div>'
    );
  }

  function formGroupFull(id, label) {
    return (
      '<div class="dd-civ-field" style="grid-column:1/-1;">' +
        '<label for="' + id + '">' + esc(label) + '</label>' +
        '<input type="text" id="' + id + '">' +
      '</div>'
    );
  }

  function toggleField(id, label, checkedByDefault) {
    return (
      '<label class="dd-civ-checkbox">' +
        '<input type="checkbox" id="' + id + '"' + (checkedByDefault ? ' checked' : '') + '>' +
        '<span>' + esc(label) + '</span>' +
      '</label>'
    );
  }

  // ── Register on window ─────────────────────────────────────────────

  window.ddVehRender = ddVehRender;
  window.ddVehInit = ddVehInit;

})();
