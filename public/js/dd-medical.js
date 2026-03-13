/**
 * Department Dashboard — Medical Database Component
 *
 * Registers window.ddMedicalRender and window.ddMedicalInit for the
 * department dashboard component registry. Provides civilian search,
 * medical report CRUD, medication CRUD, and deceased status management.
 */
(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  var cfg = function () { return window.ddConfig || {}; };
  var esc = function (s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
  var toast = function (m, t) { if (window.ddToast) window.ddToast(m, t); };

  function fmtDate(d) {
    if (!d) return 'N/A';
    var dt = new Date(d);
    if (isNaN(dt) || dt.getFullYear() <= 1970) return 'N/A';
    return (dt.getMonth()+1) + '/' + dt.getDate() + '/' + dt.getFullYear();
  }

  function toDateInput(val) {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    var d = new Date(val);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d.toISOString().substring(0, 10);
    return '';
  }

  /* State */
  var selectedCivilian = null; // { _id, name, birthday, deceased }
  var currentView = 'search'; // 'search' | 'detail' | 'newReport' | 'newMed'
  var reportPage = 0;
  var reportLimit = 10;
  var recentSearches = [];
  var RECENT_KEY = 'dd_med_recent';

  function loadRecentSearches() {
    try { recentSearches = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { recentSearches = []; }
  }
  function saveRecentSearch(term) {
    if (!term) return;
    recentSearches = recentSearches.filter(function (s) { return s.toLowerCase() !== term.toLowerCase(); });
    recentSearches.unshift(term);
    if (recentSearches.length > 5) recentSearches = recentSearches.slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches)); } catch (e) {}
  }

  /* ───────────────────────────────────────────
     Styles
     ─────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById('dd-med-styles')) return;

    var css = '' +
      /* Search bar */
      '.dd-med-search-bar{display:flex;gap:0.5rem;margin-bottom:0.75rem;}' +
      '.dd-med-search-input{flex:1;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.5rem 0.75rem;color:var(--dd-text);font-family:inherit;font-size:0.8125rem;outline:none;transition:border-color 0.2s;}' +
      '.dd-med-search-input:focus{border-color:rgba(255,255,255,0.15);}' +
      '.dd-med-search-input::placeholder{color:var(--dd-text-dim);}' +
      '.dd-med-search-btn{padding:0.5rem 1rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.1);color:#fca5a5;font-family:inherit;font-size:0.8125rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.dd-med-search-btn:hover{background:rgba(239,68,68,0.18);}' +

      /* Recent searches */
      '.dd-med-recent{display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.75rem;}' +
      '.dd-med-recent-tag{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:999px;padding:0.25rem 0.625rem;font-size:0.6875rem;color:var(--dd-text-muted);cursor:pointer;transition:all 0.2s;}' +
      '.dd-med-recent-tag:hover{background:rgba(255,255,255,0.06);color:var(--dd-text);}' +

      /* Civilian cards */
      '.dd-med-civ-list{display:flex;flex-direction:column;gap:0.5rem;}' +
      '.dd-med-civ-item{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.875rem 1rem;cursor:pointer;transition:all 0.2s;}' +
      '.dd-med-civ-item:hover{background:rgba(255,255,255,0.06);transform:translateY(-1px);}' +
      '.dd-med-civ-name{font-size:0.875rem;font-weight:600;color:var(--dd-text);}' +
      '.dd-med-civ-meta{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.15rem;}' +
      '.dd-med-deceased-badge{display:inline-block;font-size:0.625rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;background:rgba(239,68,68,0.15);color:var(--dd-red);margin-left:0.5rem;}' +

      /* Detail header */
      '.dd-med-detail-header{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;}' +
      '.dd-med-back-btn{background:none;border:none;color:var(--dd-text-muted);font-size:0.8125rem;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0;}' +
      '.dd-med-back-btn:hover{color:var(--dd-text);}' +
      '.dd-med-civ-banner{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;}' +
      '.dd-med-civ-banner-name{font-size:0.9375rem;font-weight:700;color:var(--dd-text);}' +
      '.dd-med-civ-banner-meta{font-size:0.75rem;color:var(--dd-text-muted);}' +

      /* Tabs */
      '.dd-med-tabs{display:flex;gap:0.25rem;margin-bottom:0.75rem;background:var(--dd-glass);border:1.5px solid var(--dd-glass-border);border-radius:8px;padding:0.2rem;}' +
      '.dd-med-tab{background:transparent;color:var(--dd-text-muted);border:none;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;flex:1;text-align:center;}' +
      '.dd-med-tab.active{background:var(--dd-red);color:#fff;}' +

      /* Action buttons row */
      '.dd-med-actions{display:flex;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;}' +
      '.dd-med-action-btn{padding:0.4rem 0.75rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.1);color:#fca5a5;font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.3rem;}' +
      '.dd-med-action-btn:hover{background:rgba(239,68,68,0.18);}' +
      '.dd-med-action-btn-amber{border-color:rgba(245,158,11,0.25);background:rgba(245,158,11,0.1);color:#fcd34d;}' +
      '.dd-med-action-btn-amber:hover{background:rgba(245,158,11,0.18);}' +

      /* Report cards */
      '.dd-med-report{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.75rem 1rem;margin-bottom:0.5rem;cursor:pointer;transition:all 0.2s;}' +
      '.dd-med-report:hover{background:rgba(255,255,255,0.06);}' +
      '.dd-med-report-date{font-size:0.75rem;color:var(--dd-text-muted);}' +
      '.dd-med-report-details{font-size:0.8125rem;color:var(--dd-text);margin-top:0.15rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.dd-med-hosp-badge{display:inline-block;font-size:0.625rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;margin-top:0.25rem;}' +
      '.dd-med-hosp-yes{background:rgba(245,158,11,0.15);color:var(--dd-amber);}' +
      '.dd-med-hosp-no{background:rgba(34,197,94,0.15);color:var(--dd-green);}' +

      /* Medication cards */
      '.dd-med-med-item{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.75rem 1rem;margin-bottom:0.5rem;cursor:pointer;transition:all 0.2s;}' +
      '.dd-med-med-item:hover{background:rgba(255,255,255,0.06);}' +
      '.dd-med-med-name{font-size:0.8125rem;font-weight:600;color:var(--dd-text);}' +
      '.dd-med-med-meta{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.1rem;}' +

      /* Responsive */
      '@media(max-width:600px){.dd-med-search-bar{flex-direction:column;}.dd-med-actions{flex-direction:column;}}' +
    '';

    var style = document.createElement('style');
    style.id = 'dd-med-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ───────────────────────────────────────────
     Render
     ─────────────────────────────────────────── */

  function ddMedicalRender() {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(239,68,68,0.15);color:var(--dd-red);"><i class="fa fa-heartbeat"></i></div>' +
          '<div><h3 class="dd-card-title">Medical Database</h3><p class="dd-card-subtitle">Search and manage medical records</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body" id="dd-med-body">' +
        '<div class="dd-spinner"></div>' +
      '</div>';
  }

  /* ───────────────────────────────────────────
     Init
     ─────────────────────────────────────────── */

  function ddMedicalInit() {
    injectStyles();
    loadRecentSearches();
    selectedCivilian = null;
    currentView = 'search';
    renderSearchView();
  }

  /* ───────────────────────────────────────────
     Search View
     ─────────────────────────────────────────── */

  function renderSearchView() {
    currentView = 'search';
    var $body = $('#dd-med-body');

    var recentHtml = '';
    if (recentSearches.length) {
      recentHtml = '<div class="dd-med-recent">';
      recentSearches.forEach(function (s) {
        recentHtml += '<span class="dd-med-recent-tag" data-search="' + esc(s) + '"><i class="fa fa-clock" style="opacity:0.4;"></i> ' + esc(s) + '</span>';
      });
      recentHtml += '</div>';
    }

    $body.html(
      '<div class="dd-med-search-bar">' +
        '<input type="text" class="dd-med-search-input" id="dd-med-search" placeholder="Search by civilian name..." autocomplete="off">' +
        '<button class="dd-med-search-btn" id="dd-med-search-go"><i class="fa fa-search"></i> Search</button>' +
      '</div>' +
      recentHtml +
      '<div id="dd-med-results"></div>'
    );

    // Wire events
    $(document).off('click.ddMed', '#dd-med-search-go').on('click.ddMed', '#dd-med-search-go', doSearch);
    $(document).off('keydown.ddMed', '#dd-med-search').on('keydown.ddMed', '#dd-med-search', function (e) { if (e.key === 'Enter') doSearch(); });
    $(document).off('click.ddMed', '.dd-med-recent-tag').on('click.ddMed', '.dd-med-recent-tag', function () {
      var term = $(this).attr('data-search');
      $('#dd-med-search').val(term);
      doSearch();
    });
    $(document).off('click.ddMed', '.dd-med-civ-item').on('click.ddMed', '.dd-med-civ-item', function () {
      var id = $(this).attr('data-civ-id');
      var name = $(this).attr('data-civ-name');
      var birthday = $(this).attr('data-civ-birthday');
      var deceased = $(this).attr('data-civ-deceased') === 'true';
      selectCivilian(id, name, birthday, deceased);
    });
  }

  function doSearch() {
    var term = ($('#dd-med-search').val() || '').trim();
    if (!term) { toast('Please enter a name to search', 'error'); return; }

    saveRecentSearch(term);
    var c = cfg();
    var $results = $('#dd-med-results');
    $results.html('<div class="dd-spinner"></div>');

    $.ajax({
      url: c.API_URL + '/api/v1/civilians/search' +
        '?name=' + encodeURIComponent(term) +
        '&active_community_id=' + encodeURIComponent(c.communityId) +
        '&limit=10&page=0',
      method: 'GET',
      success: function (data) {
        var civs = data.civilians || data.data || data || [];
        if (!Array.isArray(civs)) civs = [];

        if (!civs.length) {
          $results.html('<div class="dd-empty" style="padding:1.5rem;"><i class="fa fa-user-slash" style="font-size:1.5rem;opacity:0.3;margin-bottom:0.5rem;display:block;"></i><p style="color:var(--dd-text-muted);">No civilians found matching "' + esc(term) + '"</p></div>');
          return;
        }

        var html = '<div class="dd-med-civ-list">';
        civs.forEach(function (item) {
          var civ = item.civilian || item || {};
          var civId = item._id || civ._id || '';
          var name = (civ.firstName || '') + ' ' + (civ.lastName || '');
          if (!name.trim()) name = civ.name || 'Unknown';
          var deceased = civ.deceased || false;

          var metaParts = [];
          if (civ.birthday) metaParts.push('DOB: ' + esc(civ.birthday));
          if (civ.gender) metaParts.push(esc(civ.gender));
          if (civ.race) metaParts.push(esc(civ.race));

          html += '<div class="dd-med-civ-item" data-civ-id="' + esc(civId) + '" data-civ-name="' + esc(name.trim()) + '" data-civ-birthday="' + esc(civ.birthday || '') + '" data-civ-deceased="' + deceased + '">' +
            '<div class="dd-med-civ-name">' + esc(name.trim()) +
              (deceased ? '<span class="dd-med-deceased-badge"><i class="fa fa-skull-crossbones"></i> Deceased</span>' : '') +
            '</div>' +
            '<div class="dd-med-civ-meta">' + (metaParts.join(' &middot; ') || 'No details') + '</div>' +
          '</div>';
        });
        html += '</div>';
        $results.html(html);
      },
      error: function () {
        $results.html('<div class="dd-empty" style="padding:1.5rem;"><p style="color:var(--dd-red);">Search failed. Please try again.</p></div>');
      }
    });
  }

  /* ───────────────────────────────────────────
     Detail View (Reports + Medications)
     ─────────────────────────────────────────── */

  function selectCivilian(id, name, birthday, deceased) {
    selectedCivilian = { _id: id, name: name, birthday: birthday, deceased: deceased };
    renderDetailView('reports');
  }

  function renderDetailView(tab) {
    currentView = 'detail';
    var $body = $('#dd-med-body');
    var civ = selectedCivilian;
    if (!civ) { renderSearchView(); return; }

    var deceasedBtn = civ.deceased
      ? '<button class="dd-med-action-btn" id="dd-med-declare-alive"><i class="fa fa-heartbeat"></i> Declare Alive</button>'
      : '<button class="dd-med-action-btn dd-med-action-btn-amber" id="dd-med-pronounce-dead"><i class="fa fa-skull-crossbones"></i> Pronounce Dead</button>';

    $body.html(
      '<div class="dd-med-detail-header">' +
        '<button class="dd-med-back-btn" id="dd-med-back"><i class="fa fa-arrow-left"></i> Back to search</button>' +
      '</div>' +
      '<div class="dd-med-civ-banner">' +
        '<div>' +
          '<div class="dd-med-civ-banner-name">' + esc(civ.name) +
            (civ.deceased ? '<span class="dd-med-deceased-badge"><i class="fa fa-skull-crossbones"></i> Deceased</span>' : '') +
          '</div>' +
          '<div class="dd-med-civ-banner-meta">DOB: ' + esc(civ.birthday || 'Unknown') + '</div>' +
        '</div>' +
        '<div>' + deceasedBtn + '</div>' +
      '</div>' +
      '<div class="dd-med-tabs" id="dd-med-tabs">' +
        '<button class="dd-med-tab' + (tab === 'reports' ? ' active' : '') + '" data-med-tab="reports">Medical Reports</button>' +
        '<button class="dd-med-tab' + (tab === 'medications' ? ' active' : '') + '" data-med-tab="medications">Medications</button>' +
      '</div>' +
      '<div class="dd-med-actions" id="dd-med-tab-actions"></div>' +
      '<div id="dd-med-tab-content"><div class="dd-spinner"></div></div>'
    );

    // Wire events
    $(document).off('click.ddMedDetail', '#dd-med-back').on('click.ddMedDetail', '#dd-med-back', function () { renderSearchView(); });
    $(document).off('click.ddMedDetail', '.dd-med-tab').on('click.ddMedDetail', '.dd-med-tab', function () {
      var t = $(this).attr('data-med-tab');
      $('#dd-med-tabs .dd-med-tab').removeClass('active');
      $(this).addClass('active');
      if (t === 'reports') loadReports();
      else loadMedications();
    });
    $(document).off('click.ddMedDetail', '#dd-med-pronounce-dead').on('click.ddMedDetail', '#dd-med-pronounce-dead', function () { toggleDeceased(true); });
    $(document).off('click.ddMedDetail', '#dd-med-declare-alive').on('click.ddMedDetail', '#dd-med-declare-alive', function () { toggleDeceased(false); });

    if (tab === 'reports') loadReports();
    else loadMedications();
  }

  /* ── Reports ── */

  function loadReports() {
    var c = cfg();
    var civ = selectedCivilian;
    var $actions = $('#dd-med-tab-actions');
    var $content = $('#dd-med-tab-content');

    $actions.html('<button class="dd-med-action-btn" id="dd-med-new-report"><i class="fa fa-plus"></i> Create Report</button>');
    $content.html('<div class="dd-spinner"></div>');

    $(document).off('click.ddMedReport', '#dd-med-new-report').on('click.ddMedReport', '#dd-med-new-report', showNewReportForm);

    $.ajax({
      url: c.API_URL + '/api/v1/medical-reports' +
        '?civilian_id=' + encodeURIComponent(civ._id) +
        '&active_community_id=' + encodeURIComponent(c.communityId) +
        '&limit=' + reportLimit + '&page=' + reportPage,
      method: 'GET',
      success: function (data) {
        var reports = data.medicalReports || data.data || [];

        if (!reports.length) {
          $content.html('<div class="dd-empty" style="padding:1.5rem;"><div class="dd-empty-icon-wrap" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.15);"><i class="fa fa-file-medical" style="color:var(--dd-red);"></i></div><p class="dd-empty-title">No medical reports</p><p class="dd-empty-sub">Create a report to get started</p></div>');
          return;
        }

        var html = '';
        reports.forEach(function (r) {
          var date = fmtDate(r.reportDate || r.date);
          var hosp = r.hospitalized === 'yes' || r.hospitalized === true;
          html += '<div class="dd-med-report" data-report-id="' + esc(r._id) + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<span class="dd-med-report-date">' + esc(date) + '</span>' +
              '<span class="dd-med-hosp-badge ' + (hosp ? 'dd-med-hosp-yes' : 'dd-med-hosp-no') + '">' + (hosp ? 'Hospitalized' : 'Not Hospitalized') + '</span>' +
            '</div>' +
            '<div class="dd-med-report-details">' + esc(r.details || 'No details') + '</div>' +
          '</div>';
        });
        $content.html(html);

        // Wire report click
        $(document).off('click.ddMedReport', '.dd-med-report').on('click.ddMedReport', '.dd-med-report', function () {
          var id = $(this).attr('data-report-id');
          if (id) openReportDetail(id);
        });
      },
      error: function () {
        $content.html('<p style="color:var(--dd-red);padding:1rem;">Failed to load medical reports</p>');
      }
    });
  }

  /* ── Report Detail ── */

  function openReportDetail(reportId) {
    var c = cfg();
    var $content = $('#dd-med-tab-content');
    var $actions = $('#dd-med-tab-actions');
    $content.html('<div class="dd-spinner"></div>');
    $actions.html('<button class="dd-med-back-btn" id="dd-med-report-back"><i class="fa fa-arrow-left"></i> Back to reports</button>');
    $(document).off('click.ddMedRD', '#dd-med-report-back').on('click.ddMedRD', '#dd-med-report-back', loadReports);

    $.ajax({
      url: c.API_URL + '/api/v1/medical-reports/' + encodeURIComponent(reportId),
      method: 'GET',
      success: function (data) {
        var r = data.report || data || {};
        var hosp = r.hospitalized === 'yes' || r.hospitalized === true;

        var html = '<div class="dd-civ-form-grid">' +
          '<div class="dd-civ-field"><label>Date</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(fmtDate(r.reportDate || r.date)) + '</div></div>' +
          '<div class="dd-civ-field"><label>Hospitalized</label><div style="padding:0.5rem 0;"><span class="dd-med-hosp-badge ' + (hosp ? 'dd-med-hosp-yes' : 'dd-med-hosp-no') + '">' + (hosp ? 'Yes' : 'No') + '</span></div></div>' +
          '<div class="dd-civ-field dd-civ-form-full"><label>Details</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;line-height:1.6;">' + esc(r.details || 'N/A') + '</div></div>' +
          '<div class="dd-civ-field"><label>Patient</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(r.name || 'N/A') + '</div></div>' +
          '<div class="dd-civ-field"><label>Reporting EMS</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(r.reportingEmsID || 'N/A') + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap;">' +
          '<button class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-med-edit-report" data-id="' + esc(reportId) + '"><i class="fa fa-edit"></i> Edit</button>' +
          '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-med-del-report" data-id="' + esc(reportId) + '"><i class="fa fa-trash"></i> Delete</button>' +
        '</div>';

        $content.html(html);

        $(document).off('click.ddMedRD', '#dd-med-edit-report').on('click.ddMedRD', '#dd-med-edit-report', function () {
          showEditReportForm($(this).attr('data-id'));
        });
        $(document).off('click.ddMedRD', '#dd-med-del-report').on('click.ddMedRD', '#dd-med-del-report', function () {
          var id = $(this).attr('data-id');
          if (window.ddModal) {
            window.ddModal({ title: 'Delete Report', message: 'Delete this medical report?', confirmLabel: 'Delete', confirmClass: 'dd-civ-btn-danger', onConfirm: function () { deleteReport(id); } });
          } else if (confirm('Delete this report?')) { deleteReport(id); }
        });
      },
      error: function () { $content.html('<p style="color:var(--dd-red);">Failed to load report</p>'); }
    });
  }

  /* ── New/Edit Report Form ── */

  function showNewReportForm() {
    var civ = selectedCivilian;
    var c = cfg();
    var $content = $('#dd-med-tab-content');
    var $actions = $('#dd-med-tab-actions');
    $actions.html('<button class="dd-med-back-btn" id="dd-med-report-back"><i class="fa fa-arrow-left"></i> Back to reports</button>');
    $(document).off('click.ddMedRF', '#dd-med-report-back').on('click.ddMedRF', '#dd-med-report-back', loadReports);

    $content.html(
      '<div class="dd-civ-form-grid">' +
        '<div class="dd-civ-field"><label>Date *</label><input type="date" id="dd-med-rf-date" value="' + toDateInput(new Date()) + '"></div>' +
        '<div class="dd-civ-field"><label>Hospitalized</label><select id="dd-med-rf-hosp"><option value="no">No</option><option value="yes">Yes</option></select></div>' +
        '<div class="dd-civ-field dd-civ-form-full"><label>Details *</label><textarea id="dd-med-rf-details" rows="4" placeholder="Describe the medical situation..." style="resize:vertical;"></textarea></div>' +
      '</div>' +
      '<div style="display:flex;gap:0.5rem;margin-top:1rem;">' +
        '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-med-rf-cancel">Cancel</button>' +
        '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-med-rf-save"><i class="fa fa-plus"></i> Create Report</button>' +
      '</div>'
    );

    $(document).off('click.ddMedRF', '#dd-med-rf-cancel').on('click.ddMedRF', '#dd-med-rf-cancel', loadReports);
    $(document).off('click.ddMedRF', '#dd-med-rf-save').on('click.ddMedRF', '#dd-med-rf-save', function () { saveReport(null); });
  }

  function showEditReportForm(reportId) {
    var c = cfg();
    var $content = $('#dd-med-tab-content');
    var $actions = $('#dd-med-tab-actions');
    $content.html('<div class="dd-spinner"></div>');
    $actions.html('<button class="dd-med-back-btn" id="dd-med-report-back"><i class="fa fa-arrow-left"></i> Back to reports</button>');
    $(document).off('click.ddMedRF', '#dd-med-report-back').on('click.ddMedRF', '#dd-med-report-back', loadReports);

    $.ajax({
      url: c.API_URL + '/api/v1/medical-reports/' + encodeURIComponent(reportId),
      method: 'GET',
      success: function (data) {
        var r = data.report || data || {};
        $content.html(
          '<div class="dd-civ-form-grid">' +
            '<div class="dd-civ-field"><label>Date *</label><input type="date" id="dd-med-rf-date" value="' + toDateInput(r.reportDate || r.date) + '"></div>' +
            '<div class="dd-civ-field"><label>Hospitalized</label><select id="dd-med-rf-hosp"><option value="no"' + (!(r.hospitalized === 'yes' || r.hospitalized === true) ? ' selected' : '') + '>No</option><option value="yes"' + ((r.hospitalized === 'yes' || r.hospitalized === true) ? ' selected' : '') + '>Yes</option></select></div>' +
            '<div class="dd-civ-field dd-civ-form-full"><label>Details *</label><textarea id="dd-med-rf-details" rows="4" style="resize:vertical;">' + esc(r.details || '') + '</textarea></div>' +
          '</div>' +
          '<div style="display:flex;gap:0.5rem;margin-top:1rem;">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-med-rf-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-med-rf-save"><i class="fa fa-save"></i> Update Report</button>' +
          '</div>'
        );

        $(document).off('click.ddMedRF', '#dd-med-rf-cancel').on('click.ddMedRF', '#dd-med-rf-cancel', loadReports);
        $(document).off('click.ddMedRF', '#dd-med-rf-save').on('click.ddMedRF', '#dd-med-rf-save', function () { saveReport(reportId); });
      },
      error: function () { $content.html('<p style="color:var(--dd-red);">Failed to load report</p>'); }
    });
  }

  function saveReport(reportId) {
    var date = $('#dd-med-rf-date').val();
    var details = $('#dd-med-rf-details').val().trim();
    var hospitalized = $('#dd-med-rf-hosp').val() === 'yes';
    var c = cfg();
    var civ = selectedCivilian;

    if (!date || !details) { toast('Please fill in all required fields', 'error'); return; }

    var $btn = $('#dd-med-rf-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Saving...');

    var payload = {
      report: {
        date: date,
        details: details,
        hospitalized: hospitalized,
        civilianID: civ._id,
        activeCommunityID: c.communityId,
        userID: c.userId,
        name: civ.name,
        dateOfBirth: civ.birthday
      }
    };

    var url = reportId
      ? c.API_URL + '/api/v1/medical-reports/' + encodeURIComponent(reportId)
      : c.API_URL + '/api/v1/medical-reports';
    var method = reportId ? 'PUT' : 'POST';

    $.ajax({
      url: url,
      method: method,
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        toast('Medical report ' + (reportId ? 'updated' : 'created') + ' successfully', 'success');
        loadReports();
      },
      error: function (xhr) {
        var msg = 'Failed to save report';
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch (e) {}
        toast(msg, 'error');
        $btn.prop('disabled', false).html(reportId ? '<i class="fa fa-save"></i> Update Report' : '<i class="fa fa-plus"></i> Create Report');
      }
    });
  }

  function deleteReport(reportId) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/medical-reports/' + encodeURIComponent(reportId),
      method: 'DELETE',
      success: function () { toast('Report deleted', 'success'); loadReports(); },
      error: function () { toast('Failed to delete report', 'error'); }
    });
  }

  /* ── Medications ── */

  function loadMedications() {
    var c = cfg();
    var civ = selectedCivilian;
    var $actions = $('#dd-med-tab-actions');
    var $content = $('#dd-med-tab-content');

    $actions.html('<button class="dd-med-action-btn" id="dd-med-new-med"><i class="fa fa-plus"></i> Add Medication</button>');
    $content.html('<div class="dd-spinner"></div>');

    $(document).off('click.ddMedMed', '#dd-med-new-med').on('click.ddMedMed', '#dd-med-new-med', showNewMedForm);

    $.ajax({
      url: c.API_URL + '/api/v1/medications' +
        '?civilian_id=' + encodeURIComponent(civ._id) +
        '&active_community_id=' + encodeURIComponent(c.communityId),
      method: 'GET',
      success: function (data) {
        var meds = data.medications || data.data || [];
        if (!Array.isArray(meds)) meds = [];

        if (!meds.length) {
          $content.html('<div class="dd-empty" style="padding:1.5rem;"><div class="dd-empty-icon-wrap" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.15);"><i class="fa fa-pills" style="color:var(--dd-red);"></i></div><p class="dd-empty-title">No medications</p><p class="dd-empty-sub">Add a medication to get started</p></div>');
          return;
        }

        var html = '';
        meds.forEach(function (m) {
          var med = m.medication || m || {};
          html += '<div class="dd-med-med-item" data-med-id="' + esc(m._id || med._id || '') + '">' +
            '<div class="dd-med-med-name">' + esc(med.name || 'Unknown') + '</div>' +
            '<div class="dd-med-med-meta">' + esc(med.dosage || '') + (med.frequency ? ' &middot; ' + esc(med.frequency) : '') + (med.startDate ? ' &middot; Since ' + fmtDate(med.startDate) : '') + '</div>' +
          '</div>';
        });
        $content.html(html);

        $(document).off('click.ddMedMed', '.dd-med-med-item').on('click.ddMedMed', '.dd-med-med-item', function () {
          var id = $(this).attr('data-med-id');
          if (id) openMedDetail(id);
        });
      },
      error: function () {
        $content.html('<p style="color:var(--dd-red);padding:1rem;">Failed to load medications</p>');
      }
    });
  }

  function openMedDetail(medId) {
    var c = cfg();
    var $content = $('#dd-med-tab-content');
    var $actions = $('#dd-med-tab-actions');
    $content.html('<div class="dd-spinner"></div>');
    $actions.html('<button class="dd-med-back-btn" id="dd-med-med-back"><i class="fa fa-arrow-left"></i> Back to medications</button>');
    $(document).off('click.ddMedMD', '#dd-med-med-back').on('click.ddMedMD', '#dd-med-med-back', loadMedications);

    $.ajax({
      url: c.API_URL + '/api/v1/medications/' + encodeURIComponent(medId),
      method: 'GET',
      success: function (data) {
        var med = data.medication || data || {};
        var html = '<div class="dd-civ-form-grid">' +
          '<div class="dd-civ-field"><label>Medication Name</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(med.name || 'N/A') + '</div></div>' +
          '<div class="dd-civ-field"><label>Dosage</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(med.dosage || 'N/A') + '</div></div>' +
          '<div class="dd-civ-field"><label>Frequency</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(med.frequency || 'N/A') + '</div></div>' +
          '<div class="dd-civ-field"><label>Start Date</label><div style="padding:0.5rem 0;color:var(--dd-text);font-size:0.875rem;">' + esc(fmtDate(med.startDate)) + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap;">' +
          '<button class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-med-edit-med" data-id="' + esc(medId) + '"><i class="fa fa-edit"></i> Edit</button>' +
          '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-med-del-med" data-id="' + esc(medId) + '"><i class="fa fa-trash"></i> Delete</button>' +
        '</div>';
        $content.html(html);

        $(document).off('click.ddMedMD', '#dd-med-edit-med').on('click.ddMedMD', '#dd-med-edit-med', function () {
          showEditMedForm($(this).attr('data-id'));
        });
        $(document).off('click.ddMedMD', '#dd-med-del-med').on('click.ddMedMD', '#dd-med-del-med', function () {
          var id = $(this).attr('data-id');
          if (window.ddModal) {
            window.ddModal({ title: 'Delete Medication', message: 'Delete this medication?', confirmLabel: 'Delete', confirmClass: 'dd-civ-btn-danger', onConfirm: function () { deleteMed(id); } });
          } else if (confirm('Delete this medication?')) { deleteMed(id); }
        });
      },
      error: function () { $content.html('<p style="color:var(--dd-red);">Failed to load medication</p>'); }
    });
  }

  /* ── New/Edit Medication Form ── */

  function showNewMedForm() {
    var $content = $('#dd-med-tab-content');
    var $actions = $('#dd-med-tab-actions');
    $actions.html('<button class="dd-med-back-btn" id="dd-med-med-back"><i class="fa fa-arrow-left"></i> Back to medications</button>');
    $(document).off('click.ddMedMF', '#dd-med-med-back').on('click.ddMedMF', '#dd-med-med-back', loadMedications);

    $content.html(
      '<div class="dd-civ-form-grid">' +
        '<div class="dd-civ-field"><label>Medication Name *</label><input type="text" id="dd-med-mf-name" maxlength="100" placeholder="e.g. Ibuprofen"></div>' +
        '<div class="dd-civ-field"><label>Dosage *</label><input type="text" id="dd-med-mf-dosage" maxlength="50" placeholder="e.g. 200mg"></div>' +
        '<div class="dd-civ-field"><label>Frequency *</label><input type="text" id="dd-med-mf-freq" maxlength="50" placeholder="e.g. Twice daily"></div>' +
        '<div class="dd-civ-field"><label>Start Date</label><input type="date" id="dd-med-mf-start" value="' + toDateInput(new Date()) + '"></div>' +
      '</div>' +
      '<div style="display:flex;gap:0.5rem;margin-top:1rem;">' +
        '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-med-mf-cancel">Cancel</button>' +
        '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-med-mf-save"><i class="fa fa-plus"></i> Add Medication</button>' +
      '</div>'
    );

    $(document).off('click.ddMedMF', '#dd-med-mf-cancel').on('click.ddMedMF', '#dd-med-mf-cancel', loadMedications);
    $(document).off('click.ddMedMF', '#dd-med-mf-save').on('click.ddMedMF', '#dd-med-mf-save', function () { saveMed(null); });
  }

  function showEditMedForm(medId) {
    var c = cfg();
    var $content = $('#dd-med-tab-content');
    $content.html('<div class="dd-spinner"></div>');

    $.ajax({
      url: c.API_URL + '/api/v1/medications/' + encodeURIComponent(medId),
      method: 'GET',
      success: function (data) {
        var med = data.medication || data || {};
        $content.html(
          '<div class="dd-civ-form-grid">' +
            '<div class="dd-civ-field"><label>Medication Name *</label><input type="text" id="dd-med-mf-name" maxlength="100" value="' + esc(med.name || '') + '"></div>' +
            '<div class="dd-civ-field"><label>Dosage *</label><input type="text" id="dd-med-mf-dosage" maxlength="50" value="' + esc(med.dosage || '') + '"></div>' +
            '<div class="dd-civ-field"><label>Frequency *</label><input type="text" id="dd-med-mf-freq" maxlength="50" value="' + esc(med.frequency || '') + '"></div>' +
            '<div class="dd-civ-field"><label>Start Date</label><input type="date" id="dd-med-mf-start" value="' + toDateInput(med.startDate) + '"></div>' +
          '</div>' +
          '<div style="display:flex;gap:0.5rem;margin-top:1rem;">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-med-mf-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-med-mf-save"><i class="fa fa-save"></i> Update Medication</button>' +
          '</div>'
        );

        $(document).off('click.ddMedMF', '#dd-med-mf-cancel').on('click.ddMedMF', '#dd-med-mf-cancel', loadMedications);
        $(document).off('click.ddMedMF', '#dd-med-mf-save').on('click.ddMedMF', '#dd-med-mf-save', function () { saveMed(medId); });
      },
      error: function () { $content.html('<p style="color:var(--dd-red);">Failed to load medication</p>'); }
    });
  }

  function saveMed(medId) {
    var name = $('#dd-med-mf-name').val().trim();
    var dosage = $('#dd-med-mf-dosage').val().trim();
    var frequency = $('#dd-med-mf-freq').val().trim();
    var startDate = $('#dd-med-mf-start').val();
    var c = cfg();
    var civ = selectedCivilian;

    if (!name || !dosage || !frequency) { toast('Please fill in all required fields', 'error'); return; }

    var $btn = $('#dd-med-mf-save');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Saving...');

    var civName = (civ.name || '').split(' ');
    var payload = {
      medication: {
        name: name,
        dosage: dosage,
        frequency: frequency,
        startDate: startDate || undefined,
        civilianID: civ._id,
        activeCommunityID: c.communityId,
        userID: c.userId,
        firstName: civName[0] || '',
        lastName: civName.slice(1).join(' ') || '',
        dateOfBirth: civ.birthday
      }
    };

    var url = medId
      ? c.API_URL + '/api/v1/medications/' + encodeURIComponent(medId)
      : c.API_URL + '/api/v1/medications';
    var method = medId ? 'PUT' : 'POST';

    $.ajax({
      url: url,
      method: method,
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        toast('Medication ' + (medId ? 'updated' : 'added') + ' successfully', 'success');
        loadMedications();
      },
      error: function (xhr) {
        var msg = 'Failed to save medication';
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch (e) {}
        toast(msg, 'error');
        $btn.prop('disabled', false).html(medId ? '<i class="fa fa-save"></i> Update Medication' : '<i class="fa fa-plus"></i> Add Medication');
      }
    });
  }

  function deleteMed(medId) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/medications/' + encodeURIComponent(medId),
      method: 'DELETE',
      success: function () { toast('Medication deleted', 'success'); loadMedications(); },
      error: function () { toast('Failed to delete medication', 'error'); }
    });
  }

  /* ── Deceased Toggle ── */

  function toggleDeceased(setDeceased) {
    var c = cfg();
    var civ = selectedCivilian;

    var confirmMsg = setDeceased
      ? 'Pronounce ' + civ.name + ' as deceased?'
      : 'Declare ' + civ.name + ' as alive?';

    function doToggle() {
      $.ajax({
        url: c.API_URL + '/api/v1/civilians/' + encodeURIComponent(civ._id),
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ civilian: { deceased: setDeceased } }),
        success: function () {
          selectedCivilian.deceased = setDeceased;
          toast(setDeceased ? 'Pronounced deceased' : 'Declared alive', 'success');
          renderDetailView($('#dd-med-tabs .dd-med-tab.active').attr('data-med-tab') || 'reports');
        },
        error: function () { toast('Failed to update status', 'error'); }
      });
    }

    if (window.ddModal) {
      window.ddModal({
        title: setDeceased ? 'Pronounce Dead' : 'Declare Alive',
        message: confirmMsg,
        confirmLabel: setDeceased ? 'Pronounce Dead' : 'Declare Alive',
        confirmClass: setDeceased ? 'dd-civ-btn-danger' : 'dd-civ-btn-primary',
        onConfirm: doToggle
      });
    } else {
      if (confirm(confirmMsg)) doToggle();
    }
  }

  /* ───────────────────────────────────────────
     Exports
     ─────────────────────────────────────────── */

  window.ddMedicalRender = ddMedicalRender;
  window.ddMedicalInit = ddMedicalInit;

})();
