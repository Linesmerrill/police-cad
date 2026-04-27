// dd-components.js — Shared component render/init/helper functions
// Extracted from department-dashboard.ejs. Used by both department-dashboard and command-dashboard.
// Expects window.ddConfig, window.esc, window.ddToast, window.ddModal, window.ddCloseModal to be defined.
//
// Variables pulled from ddConfig:
var _cfg = window.ddConfig || {};
var API_URL = _cfg.API_URL || '';
var communityId = _cfg.communityId || '';
var userId = _cfg.userId || '';
var dbUser = _cfg.dbUser || {};
var userName = _cfg.userName || '';

// Shared mutable state for components
var pendingWarrants = [];
var tenCodes = [];
var penalCodesData = [];
var penalCodesCurrency = 'USD';
var expandedWarrantId = null;
var currentTemplateName = _cfg.currentTemplateName || 'police';
// enabledComponents is managed by the dashboard IIFE, not here.
// Functions that need it should use window.ddConfig._enabledComponents.

// All Warrants state
var allWarrantsPage = 0;
var allWarrantsStatusFilter = '';
var allWarrantsTypeFilter = '';
var allWarrantsSearchQuery = '';
var allWarrantsData = [];
var allWarrantsTotalCount = 0;
var allWarrantsTotalPages = 1;

// Notepad state
var ddNotes = [];
var ddSelectedNoteId = null;

// Court cases state
var ccIsJudicial = false;

// Renders a small monospace pill with the case number (CC-YYYY-NNNNNN). Returns '' when blank.
function ccCaseNumberPill(caseNumber, opts) {
  if (!caseNumber) return '';
  var trail = (opts && opts.trailingSpace) ? ' ' : '';
  var marginRight = (opts && opts.marginRight) ? 'margin-right:' + opts.marginRight + ';' : '';
  return '<span style="display:inline-flex;align-items:center;font-family:JetBrains Mono,ui-monospace,monospace;font-size:0.72rem;font-weight:600;color:var(--dd-accent);background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.2);padding:0.1rem 0.4rem;border-radius:4px;' + marginRight + '">' + esc(caseNumber) + '</span>' + trail;
}

// Penal codes state
var pcCurrencyList = [];
var pcDefaultCurrencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];
var pcKnownCurrencies = {};

// pcGetCurrencySymbol and pcBuildKnownCurrencies defined later in the extracted code

// Alias helpers from global scope
var esc = window.esc || function(s) { return s || ''; };
var ddToast = window.ddToast || function() {};
var ddModal = window.ddModal || function() {};
var ddCloseModal = window.ddCloseModal || function() {};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  var d = new Date(dateStr);
  if (isNaN(d) || d.getFullYear() <= 1970) return 'N/A';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function hideComponent(key) {
  $('#dd-component-' + key).remove();
  $('.dd-nav-item[data-panel="' + key + '"]').remove();
  var ec = window.ddConfig._enabledComponents || {};
  delete ec[key];
  var $grid = $('#dd-panel-overview .dd-grid');
  var $halfCards = $grid.children('.dd-card').not('.dd-grid-full');
  if ($halfCards.length === 1) $halfCards.addClass('dd-grid-full');
}

// Expose key functions globally for component registry references
window.renderWarrantsPanel = renderWarrantsPanel;
window.loadPendingWarrants = loadPendingWarrants;
window.renderAllWarrantsPanel = renderAllWarrantsPanel;
window.loadAllWarrants = loadAllWarrants;
window.renderCodesPanel = renderCodesPanel;
window.loadTenCodes = loadTenCodes;
window.renderNotepadPanel = renderNotepadPanel;
window.initNotepad = initNotepad;
window.renderPenalCodesPanel = renderPenalCodesPanel;
window.loadPenalCodes = loadPenalCodes;
window.renderCourtCasesPanel = renderCourtCasesPanel;
window.loadCourtCases = loadCourtCases;
// ddFilterCodes, ddToggleWarrant, ddReviewWarrant, ddDeleteWarrant,
// ddSelectNote, ddNewNote, ddSaveNote, ddDeleteNote are assigned to
// window.* later in this file where they are defined.

function renderWarrantsPanel(key) {
  return '<div class="dd-card-header">' +
      '<div class="dd-card-header-left">' +
        '<div class="dd-card-icon" style="background:rgba(139,92,246,0.15);color:var(--dd-accent);"><i class="fa fa-gavel"></i></div>' +
        '<div><h3 class="dd-card-title">Pending Warrants</h3><p class="dd-card-subtitle">Awaiting judicial review</p></div>' +
      '</div>' +
      '<span class="dd-nav-badge dd-warrant-header-count" style="display:none;">0</span>' +
    '</div>' +
    '<div class="dd-card-body">' +
      '<div id="dd-warrants-loading" class="dd-spinner"></div>' +
      '<div id="dd-warrants-empty" class="dd-empty" style="display:none;">' +
        '<div class="dd-empty-icon-wrap"><i class="fa fa-check"></i></div>' +
        '<p class="dd-empty-title">All clear</p>' +
        '<p class="dd-empty-sub">No pending warrants to review</p>' +
      '</div>' +
      '<div id="dd-warrants-list" class="dd-warrant-list"></div>' +
    '</div>';
}

function loadPendingWarrants() {
  if (!communityId) return;
  // Show loading in all instances (overview + focused)
  $('.dd-warrant-list').empty();
  $('[id$="-warrants-loading"]').show();
  $('[id$="-warrants-empty"]').hide();

  $.ajax({
    url: API_URL + '/api/v1/warrants/pending/community/' + communityId + '?limit=50&page=0',
    method: 'GET',
    success: function(result) {
      pendingWarrants = result.data || [];
      renderWarrantsList();
      updateWarrantCount();
    },
    error: function() {
      $('[id$="-warrants-loading"]').hide();
      $('[id$="-warrants-empty"]').show().find('.dd-empty-title').text('Unable to load warrants');
    }
  });
}

function renderWarrantsList() {
  $('[id$="-warrants-loading"]').hide();
  var $lists = $('.dd-warrant-list');
  $lists.empty();

  if (pendingWarrants.length === 0) {
    $('[id$="-warrants-empty"]').show();
    return;
  }
  $('[id$="-warrants-empty"]').hide();

  pendingWarrants.forEach(function(w, i) {
    var d = w.warrant || {};
    var typeClass = d.warrantType || 'arrest';
    var charges = (d.charges || []).join(', ') || 'No charges listed';
    var date = formatDate(d.createdAt);
    var isExpanded = expandedWarrantId === w._id;

    var html = '<div class="dd-warrant-item' + (isExpanded ? ' expanded' : '') + '" data-id="' + w._id + '" style="animation-delay:' + (i * 0.04) + 's">' +
      '<div class="dd-warrant-summary" onclick="ddToggleWarrant(\'' + w._id + '\')">' +
        '<div class="dd-warrant-type-indicator ' + typeClass + '"></div>' +
        '<div class="dd-warrant-info">' +
          '<p class="dd-warrant-name">' + esc(d.accusedFirstName || '') + ' ' + esc(d.accusedLastName || '') + '</p>' +
          '<div class="dd-warrant-meta">' +
            '<span class="dd-badge dd-badge-' + typeClass + '">' + esc(typeClass) + '</span>' +
          '</div>' +
          '<p class="dd-warrant-charges">' + esc(charges) + '</p>' +
          '<div class="dd-warrant-footer-meta">' +
            '<span><i class="fa fa-user"></i>' + esc(d.requestingOfficerName || 'Unknown') + '</span>' +
            '<span><i class="fa fa-calendar"></i>' + date + '</span>' +
          '</div>' +
        '</div>' +
        '<i class="fa fa-chevron-down dd-warrant-expand-icon"></i>' +
      '</div>' +
      '<div class="dd-warrant-detail">' +
        '<div class="dd-warrant-detail-inner">' +
          '<div class="dd-detail-section">' +
            '<div class="dd-detail-label">Probable Cause</div>' +
            '<p class="dd-detail-value">' + esc(d.probableCause || 'No probable cause provided.') + '</p>' +
          '</div>' +
          (Array.isArray(d.charges) && d.charges.length > 0 ?
            '<div class="dd-detail-section">' +
              '<div class="dd-detail-label">Charges</div>' +
              '<ul class="dd-detail-charges-list">' + d.charges.map(function(c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
            '</div>' : '') +
          (d.warrantType === 'search' && d.searchLocation ?
            '<div class="dd-detail-section">' +
              '<div class="dd-detail-label">Search Location</div>' +
              '<p class="dd-detail-value">' + esc(d.searchLocation) + '</p>' +
            '</div>' : '') +
          '<div class="dd-detail-section">' +
            '<div class="dd-detail-label">Requesting Officer</div>' +
            '<p class="dd-detail-value">' + esc(d.requestingOfficerName || 'Unknown') + '</p>' +
          '</div>' +
          '<div class="dd-judge-form">' +
            '<div class="dd-detail-label" style="margin-bottom:0.5rem;">Judge Notes</div>' +
            '<textarea class="dd-judge-textarea" id="dd-notes-' + w._id + '" placeholder="Enter your notes (optional)..."></textarea>' +
            '<div class="dd-judge-actions">' +
              '<button class="dd-btn dd-btn-approve" onclick="ddReviewWarrant(\'' + w._id + '\', true)">' +
                '<i class="fa fa-check-circle"></i> Approve' +
              '</button>' +
              '<button class="dd-btn dd-btn-deny" onclick="ddReviewWarrant(\'' + w._id + '\', false)">' +
                '<i class="fa fa-times-circle"></i> Deny' +
              '</button>' +
              '<button class="dd-btn dd-btn-deny" onclick="ddDeleteWarrant(\'' + w._id + '\',\'' + esc((d.accusedFirstName || '') + ' ' + (d.accusedLastName || '')).trim() + '\')" style="margin-left:auto;">' +
                '<i class="fa fa-trash"></i> Delete' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    $lists.append(html);
  });
}

function updateWarrantCount() {
  var count = pendingWarrants.length;
  var $badges = $('#dd-warrant-count, .dd-warrant-header-count');
  if (count > 0) {
    $badges.text(count).show();
  } else {
    $badges.hide();
  }
  // Update stats
  $('#dd-stat-pending').text(count);
  loadWarrantStats();
}

function loadWarrantStats() {
  if (!communityId) return;
  var base = API_URL + '/api/v2/warrants/community/' + communityId + '?limit=1&page=0';
  // Fetch total, approved, and denied counts in parallel
  $.ajax({
    url: base,
    method: 'GET',
    success: function(result) {
      $('#dd-stat-total').text(result.totalCount || 0);
    },
    error: function() { $('#dd-stat-total').text('—'); }
  });
  $.ajax({
    url: base + '&status=approved',
    method: 'GET',
    success: function(result) {
      $('#dd-stat-approved').text(result.totalCount || 0);
    },
    error: function() { $('#dd-stat-approved').text('—'); }
  });
  $.ajax({
    url: base + '&status=denied',
    method: 'GET',
    success: function(result) {
      $('#dd-stat-denied').text(result.totalCount || 0);
    },
    error: function() { $('#dd-stat-denied').text('—'); }
  });
}

function loadRecordsStats() {
  if (!userId) return;
  // Lightweight v2 calls (limit=1) just to get totalCount
  if ($('#dd-stat-civs').length) {
    $.ajax({
      url: API_URL + '/api/v2/civilians/user/' + userId + '?limit=1&page=0&active_community_id=' + communityId,
      method: 'GET',
      success: function(res) { $('#dd-stat-civs').text(res.totalCount || 0); },
      error: function() { $('#dd-stat-civs').text('—'); }
    });
  }
  if ($('#dd-stat-vehs').length) {
    $.ajax({
      url: API_URL + '/api/v2/vehicles/user/' + userId + '?limit=1&page=0&active_community_id=' + communityId,
      method: 'GET',
      success: function(res) { $('#dd-stat-vehs').text(res.totalCount || 0); },
      error: function() { $('#dd-stat-vehs').text('—'); }
    });
  }
  if ($('#dd-stat-firearms').length) {
    $.ajax({
      url: API_URL + '/api/v2/firearms/user/' + userId + '?limit=1&page=0&active_community_id=' + communityId,
      method: 'GET',
      success: function(res) { $('#dd-stat-firearms').text(res.totalCount || 0); },
      error: function() { $('#dd-stat-firearms').text('—'); }
    });
  }
}

window.ddToggleWarrant = function(id) {
  expandedWarrantId = (expandedWarrantId === id) ? null : id;
  $('.dd-warrant-item').each(function() {
    if ($(this).data('id') === id) {
      $(this).toggleClass('expanded');
    } else {
      $(this).removeClass('expanded');
    }
  });
};

window.ddDeleteWarrant = function(warrantId, accusedName) {
  ddModal({
    type: 'danger',
    icon: 'fa-trash',
    title: 'Delete Warrant',
    message: 'Permanently delete the warrant for <strong>' + esc(accusedName || 'this individual') + '</strong>? This cannot be undone.',
    confirmText: 'Delete',
    onConfirm: function() {
      $.ajax({
        url: API_URL + '/api/v1/warrant/' + warrantId,
        method: 'DELETE',
        success: function() {
          ddToast('Warrant deleted successfully', 'success');
          expandedWarrantId = null;
          expandedAllWarrantId = null;
          loadPendingWarrants();
          loadAllWarrants();
        },
        error: function() {
          ddToast('Failed to delete warrant', 'error');
        }
      });
    }
  });
};

window.ddReviewWarrant = function(warrantId, approved) {
  var notes = $('#dd-notes-' + warrantId).val() || '';
  var $btns = $('.dd-warrant-item[data-id="' + warrantId + '"] .dd-btn');
  $btns.prop('disabled', true);

  $.ajax({
    url: API_URL + '/api/v1/warrant/' + warrantId + '/review',
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify({
      approved: approved,
      judgeNotes: notes,
      judgeID: userId,
      judgeName: userName
    }),
    success: function() {
      ddToast('Warrant ' + (approved ? 'approved' : 'denied') + ' successfully', 'success');
      expandedWarrantId = null;
      loadPendingWarrants();
    },
    error: function() {
      ddToast('Failed to review warrant', 'error');
      $btns.prop('disabled', false);
    }
  });
};

// ══════════════════════════════════════════
//  ALL WARRANTS COMPONENT
// ══════════════════════════════════════════
var allWarrantsData = [];
var allWarrantsPage = 0;
var allWarrantsTotalPages = 0;
var allWarrantsTotalCount = 0;
var allWarrantsStatusFilter = '';
var allWarrantsTypeFilter = '';
var allWarrantsSearchQuery = '';
var awSearchTimer = null;
var expandedAllWarrantId = null;

var statusColors = {
  pending: 'pending', approved: 'approved', denied: 'denied',
  executed: 'executed', expired: 'expired', withdrawn: 'withdrawn'
};

function renderAllWarrantsPanel(key) {
  return '<div class="dd-card-header">' +
      '<div class="dd-card-header-left">' +
        '<div class="dd-card-icon" style="background:rgba(59,130,246,0.15);color:var(--dd-blue);"><i class="fa fa-folder-open"></i></div>' +
        '<div><h3 class="dd-card-title">All Warrants</h3><p class="dd-card-subtitle">Browse and filter all warrants</p></div>' +
      '</div>' +
    '</div>' +
    '<div class="dd-card-body">' +
      '<div class="dd-aw-search-wrap">' +
        '<i class="fa fa-search"></i>' +
        '<input type="text" class="dd-aw-search" placeholder="Search by name..." oninput="ddSetAwSearch(this.value)">' +
      '</div>' +
      '<div class="dd-filter-bar" id="dd-aw-filters">' +
        '<label>Status:</label>' +
        '<button class="dd-filter-btn active" data-group="status" onclick="ddSetAwStatusFilter(this, \'\')" data-filter="">All</button>' +
        '<button class="dd-filter-btn" data-group="status" onclick="ddSetAwStatusFilter(this, \'pending\')" data-filter="pending">Pending</button>' +
        '<button class="dd-filter-btn" data-group="status" onclick="ddSetAwStatusFilter(this, \'approved\')" data-filter="approved">Approved</button>' +
        '<button class="dd-filter-btn" data-group="status" onclick="ddSetAwStatusFilter(this, \'denied\')" data-filter="denied">Denied</button>' +
        '<button class="dd-filter-btn" data-group="status" onclick="ddSetAwStatusFilter(this, \'executed\')" data-filter="executed">Executed</button>' +
        '<button class="dd-filter-btn" data-group="status" onclick="ddSetAwStatusFilter(this, \'expired\')" data-filter="expired">Expired</button>' +
        '<button class="dd-filter-btn" data-group="status" onclick="ddSetAwStatusFilter(this, \'withdrawn\')" data-filter="withdrawn">Withdrawn</button>' +
        '<div class="dd-filter-sep"></div>' +
        '<label>Type:</label>' +
        '<button class="dd-filter-btn active" data-group="type" onclick="ddSetAwTypeFilter(this, \'\')" data-filter="">All</button>' +
        '<button class="dd-filter-btn" data-group="type" onclick="ddSetAwTypeFilter(this, \'arrest\')" data-filter="arrest">Arrest</button>' +
        '<button class="dd-filter-btn" data-group="type" onclick="ddSetAwTypeFilter(this, \'search\')" data-filter="search">Search</button>' +
        '<button class="dd-filter-btn" data-group="type" onclick="ddSetAwTypeFilter(this, \'bench\')" data-filter="bench">Bench</button>' +
      '</div>' +
      '<div class="dd-aw-loading dd-spinner"></div>' +
      '<div class="dd-aw-empty dd-empty" style="display:none;">' +
        '<div class="dd-empty-icon-wrap"><i class="fa fa-folder-open"></i></div>' +
        '<p class="dd-empty-title">No warrants found</p>' +
        '<p class="dd-empty-sub">Try adjusting your filters</p>' +
      '</div>' +
      '<div class="dd-aw-list dd-warrant-list"></div>' +
      '<div class="dd-aw-pagination dd-pagination" style="display:none;">' +
        '<button class="dd-page-btn dd-aw-prev" onclick="ddAwPage(-1)"><i class="fa fa-chevron-left"></i> Prev</button>' +
        '<span class="dd-page-info dd-aw-page-info">Page 1 of 1</span>' +
        '<button class="dd-page-btn dd-aw-next" onclick="ddAwPage(1)">Next <i class="fa fa-chevron-right"></i></button>' +
      '</div>' +
    '</div>';
}

function loadAllWarrants() {
  if (!communityId) {
    console.warn('[AllWarrants] No communityId, skipping load');
    return;
  }
  $('.dd-aw-loading').show();
  $('.dd-aw-empty').hide();
  $('.dd-aw-list').empty();

  var url = API_URL + '/api/v2/warrants/community/' + communityId + '?limit=20&page=' + allWarrantsPage;
  if (allWarrantsStatusFilter) url += '&status=' + allWarrantsStatusFilter;
  if (allWarrantsTypeFilter) url += '&warrantType=' + allWarrantsTypeFilter;
  if (allWarrantsSearchQuery) url += '&name=' + encodeURIComponent(allWarrantsSearchQuery);

  $.ajax({
    url: url,
    method: 'GET',
    cache: false,
    success: function(result) {
      try {
        allWarrantsData = result.data || [];
        allWarrantsTotalCount = result.totalCount || 0;
        allWarrantsTotalPages = result.totalPages || Math.ceil(allWarrantsTotalCount / 20) || 1;
        renderAllWarrantsList();
        updateAwPagination();
      } catch (e) {
        console.error('[AllWarrants] Render error:', e);
        $('.dd-aw-loading').hide();
        $('.dd-aw-empty').show().find('.dd-empty-title').text('Error rendering warrants');
        $('.dd-aw-empty').find('.dd-empty-sub').text(e.message || 'Unknown error');
      }
    },
    error: function(xhr, status, err) {
      console.error('[AllWarrants] AJAX error:', status, err, xhr.responseText);
      $('.dd-aw-loading').hide();
      $('.dd-aw-empty').show().find('.dd-empty-title').text('Unable to load warrants');
      $('.dd-aw-empty').find('.dd-empty-sub').text(err || status || 'Network error');
    }
  });
}

function renderAllWarrantsList() {
  $('.dd-aw-loading').hide();
  var $lists = $('.dd-aw-list');
  $lists.empty();

  if (allWarrantsData.length === 0) {
    $('.dd-aw-empty').show();
    return;
  }
  $('.dd-aw-empty').hide();

  allWarrantsData.forEach(function(w, i) {
    var d = w.warrant || {};
    var typeClass = d.warrantType || 'arrest';
    var status = d.status || 'pending';
    var charges = Array.isArray(d.charges) ? d.charges.join(', ') : (d.charges || 'No charges listed');
    var date = formatDate(d.createdAt);
    var isExpanded = expandedAllWarrantId === w._id;

    var html = '<div class="dd-warrant-item' + (isExpanded ? ' expanded' : '') + '" data-id="' + w._id + '" style="animation-delay:' + (i * 0.04) + 's">' +
      '<div class="dd-warrant-summary" onclick="ddToggleAllWarrant(\'' + w._id + '\')">' +
        '<div class="dd-warrant-type-indicator ' + typeClass + '"></div>' +
        '<div class="dd-warrant-info">' +
          '<p class="dd-warrant-name">' + esc(d.accusedFirstName || '') + ' ' + esc(d.accusedLastName || '') + '</p>' +
          '<div class="dd-warrant-meta">' +
            '<span class="dd-badge dd-badge-' + typeClass + '">' + esc(typeClass) + '</span>' +
            '<span class="dd-badge dd-badge-' + (statusColors[status] || 'pending') + '">' + esc(status) + '</span>' +
          '</div>' +
          '<p class="dd-warrant-charges">' + esc(charges) + '</p>' +
          '<div class="dd-warrant-footer-meta">' +
            '<span><i class="fa fa-user"></i>' + esc(d.requestingOfficerName || 'Unknown') + '</span>' +
            '<span><i class="fa fa-calendar"></i>' + date + '</span>' +
          '</div>' +
        '</div>' +
        '<i class="fa fa-chevron-down dd-warrant-expand-icon"></i>' +
      '</div>' +
      '<div class="dd-warrant-detail">' +
        '<div class="dd-warrant-detail-inner">' +
          '<div class="dd-detail-section">' +
            '<div class="dd-detail-label">Probable Cause</div>' +
            '<p class="dd-detail-value">' + esc(d.probableCause || 'No probable cause provided.') + '</p>' +
          '</div>' +
          (Array.isArray(d.charges) && d.charges.length > 0 ?
            '<div class="dd-detail-section">' +
              '<div class="dd-detail-label">Charges</div>' +
              '<ul class="dd-detail-charges-list">' + d.charges.map(function(c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
            '</div>' : '') +
          (d.warrantType === 'search' && d.searchLocation ?
            '<div class="dd-detail-section">' +
              '<div class="dd-detail-label">Search Location</div>' +
              '<p class="dd-detail-value">' + esc(d.searchLocation) + '</p>' +
            '</div>' : '') +
          '<div class="dd-detail-section">' +
            '<div class="dd-detail-label">Requesting Officer</div>' +
            '<p class="dd-detail-value">' + esc(d.requestingOfficerName || 'Unknown') + '</p>' +
          '</div>' +
          (d.judgeName ?
            '<div class="dd-detail-section">' +
              '<div class="dd-detail-label">Judge</div>' +
              '<p class="dd-detail-value">' + esc(d.judgeName) + (d.reviewedAt ? ' — ' + formatDate(d.reviewedAt) : '') + '</p>' +
              (d.judgeNotes ? '<p class="dd-detail-value" style="margin-top:0.25rem;font-style:italic;color:var(--dd-text-muted);">' + esc(d.judgeNotes) + '</p>' : '') +
            '</div>' : '') +
          (d.status === 'executed' && d.executingOfficerName ?
            '<div class="dd-detail-section">' +
              '<div class="dd-detail-label">Executed By</div>' +
              '<p class="dd-detail-value">' + esc(d.executingOfficerName) + (d.executedAt ? ' — ' + formatDate(d.executedAt) : '') + '</p>' +
            '</div>' : '') +
          '<div class="dd-judge-actions" style="margin-top:0.75rem;">' +
            '<button class="dd-btn dd-btn-deny" onclick="ddDeleteWarrant(\'' + w._id + '\',\'' + esc((d.accusedFirstName || '') + ' ' + (d.accusedLastName || '')).trim() + '\')">' +
              '<i class="fa fa-trash"></i> Delete Warrant' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    $lists.append(html);
  });
}

function updateAwPagination() {
  var $pag = $('.dd-aw-pagination');
  if (allWarrantsTotalPages <= 1) {
    $pag.hide();
    return;
  }
  $pag.show();
  $('.dd-aw-page-info').text('Page ' + (allWarrantsPage + 1) + ' of ' + allWarrantsTotalPages);
  $('.dd-aw-prev').prop('disabled', allWarrantsPage <= 0);
  $('.dd-aw-next').prop('disabled', allWarrantsPage >= allWarrantsTotalPages - 1);
}

window.ddAwPage = function(dir) {
  allWarrantsPage = Math.max(0, Math.min(allWarrantsTotalPages - 1, allWarrantsPage + dir));
  loadAllWarrants();
};

window.ddSetAwStatusFilter = function(btn, status) {
  allWarrantsStatusFilter = status;
  allWarrantsPage = 0;
  expandedAllWarrantId = null;
  $(btn).closest('.dd-filter-bar').find('.dd-filter-btn[data-group="status"]').removeClass('active');
  $(btn).addClass('active');
  loadAllWarrants();
};

window.ddSetAwTypeFilter = function(btn, type) {
  allWarrantsTypeFilter = type;
  allWarrantsPage = 0;
  expandedAllWarrantId = null;
  $(btn).closest('.dd-filter-bar').find('.dd-filter-btn[data-group="type"]').removeClass('active');
  $(btn).addClass('active');
  loadAllWarrants();
};

window.ddSetAwSearch = function(query) {
  clearTimeout(awSearchTimer);
  awSearchTimer = setTimeout(function() {
    allWarrantsSearchQuery = query.trim();
    allWarrantsPage = 0;
    expandedAllWarrantId = null;
    loadAllWarrants();
  }, 300);
};

window.ddToggleAllWarrant = function(id) {
  expandedAllWarrantId = (expandedAllWarrantId === id) ? null : id;
  $('.dd-aw-list .dd-warrant-item').each(function() {
    if ($(this).data('id') === id) {
      $(this).toggleClass('expanded');
    } else {
      $(this).removeClass('expanded');
    }
  });
};

// ══════════════════════════════════════════
//  NOTEPAD COMPONENT (User Profile Notes)
// ══════════════════════════════════════════
var ddNotes = [];
var ddSelectedNoteId = null;
var ddNotepadSaveTimer = null;

function renderNotepadPanel() {
  return '<div class="dd-card-header">' +
      '<div class="dd-card-header-left">' +
        '<div class="dd-card-icon" style="background:rgba(245,158,11,0.15);color:var(--dd-amber);"><i class="fa fa-sticky-note"></i></div>' +
        '<div><h3 class="dd-card-title">Notepad</h3><p class="dd-card-subtitle">Synced to your profile</p></div>' +
      '</div>' +
    '</div>' +
    '<div class="dd-card-body" style="padding:0;">' +
      '<div class="dd-notepad-layout">' +
        /* Sidebar: notes list */
        '<div class="dd-notepad-sidebar">' +
          '<div class="dd-notepad-sidebar-header">' +
            '<button class="dd-notepad-new-btn" onclick="ddNewNote()"><i class="fa fa-plus"></i> New Note</button>' +
          '</div>' +
          '<div class="dd-notepad-list"></div>' +
        '</div>' +
        /* Editor */
        '<div class="dd-notepad-editor">' +
          '<div class="dd-notepad-editor-empty dd-notepad-placeholder">' +
            '<i class="fa fa-sticky-note"></i>' +
            '<p>Select a note or create a new one</p>' +
          '</div>' +
          '<div class="dd-notepad-form" style="display:none;flex-direction:column;flex:1;">' +
            '<input type="text" class="dd-notepad-title-input" placeholder="Note title" maxlength="100">' +
            '<textarea class="dd-notepad-content-input" placeholder="Start writing..."></textarea>' +
            '<div class="dd-notepad-editor-footer">' +
              '<div class="dd-notepad-status-text">' +
                '<div class="dd-notepad-status-dot"></div>' +
                '<span class="dd-notepad-status-label">Ready</span>' +
              '</div>' +
              '<button class="dd-notepad-save-btn" onclick="ddSaveNote()">Save</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function initNotepad() {
  // Load notes from user profile data (embedded in page)
  ddNotes = (dbUser && dbUser.user && dbUser.user.notes) ? dbUser.user.notes.slice() : [];
  ddSelectedNoteId = null;
  ddRenderNoteList();
  ddShowPlaceholder();

  // Sync editor inputs across both instances (overview + focused)
  $(document).off('input.notepad-sync').on('input.notepad-sync', '.dd-notepad-title-input', function() {
    var val = $(this).val();
    $('.dd-notepad-title-input').not(this).val(val);
  });
  $(document).off('input.notepad-content-sync').on('input.notepad-content-sync', '.dd-notepad-content-input', function() {
    var val = $(this).val();
    $('.dd-notepad-content-input').not(this).val(val);
  });
}

function ddRenderNoteList() {
  var $lists = $('.dd-notepad-list');
  $lists.empty();

  if (ddNotes.length === 0) {
    $lists.html(
      '<div class="dd-notepad-empty">' +
        '<i class="fa fa-file-alt"></i>' +
        '<p>No notes yet.<br>Click <strong>New Note</strong> to get started.</p>' +
      '</div>'
    );
    return;
  }

  // Sort newest first
  var sorted = ddNotes.slice().sort(function(a, b) {
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  sorted.forEach(function(note) {
    var content = note.content || '';
    var preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
    var isActive = note._id === ddSelectedNoteId;
    var displayDate = ddFormatNoteDate(note.updatedAt || note.createdAt);

    var html = '<div class="dd-note-item' + (isActive ? ' active' : '') + '" data-note-id="' + note._id + '" onclick="ddSelectNote(\'' + note._id + '\')">' +
      '<button class="dd-note-item-delete" onclick="event.stopPropagation(); ddDeleteNote(\'' + note._id + '\')" title="Delete note"><i class="fa fa-trash"></i></button>' +
      '<div class="dd-note-item-title">' + esc(note.title || 'Untitled') + '</div>' +
      '<div class="dd-note-item-preview">' + esc(preview) + '</div>' +
      '<div class="dd-note-item-date">' + displayDate + '</div>' +
    '</div>';
    $lists.append(html);
  });
}

function ddFormatNoteDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  if (isNaN(d)) return '';
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  var noteDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (noteDay.getTime() === today.getTime()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (noteDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

function ddShowPlaceholder() {
  $('.dd-notepad-form').hide();
  $('.dd-notepad-placeholder').show();
}

function ddShowEditor() {
  $('.dd-notepad-placeholder').hide();
  $('.dd-notepad-form').css('display', 'flex');
}

function ddSelectNote(noteId) {
  var note = ddNotes.find(function(n) { return n._id === noteId; });
  if (!note) return;
  ddSelectedNoteId = noteId;
  $('.dd-notepad-title-input').val(note.title || '');
  $('.dd-notepad-content-input').val(note.content || '');
  ddSetNoteStatus('ready', 'Ready');
  ddShowEditor();
  ddRenderNoteList();
}
window.ddSelectNote = ddSelectNote;

function ddNewNote() {
  ddSelectedNoteId = null;
  $('.dd-notepad-title-input').val('');
  $('.dd-notepad-content-input').val('');
  ddSetNoteStatus('ready', 'New note');
  ddShowEditor();
  ddRenderNoteList();
  // Focus the title in the visible panel
  setTimeout(function() { $('.dd-notepad-title-input:visible').first().focus(); }, 50);
}
window.ddNewNote = ddNewNote;

function ddSaveNote() {
  // Read from whichever instance is visible
  var $visibleTitle = $('.dd-notepad-title-input:visible').first();
  var $visibleContent = $('.dd-notepad-content-input:visible').first();
  var title = $visibleTitle.val().trim();
  var content = $visibleContent.val().trim();

  if (!title && !content) {
    ddSetNoteStatus('error', 'Title or content required');
    return;
  }
  if (!title) title = 'Untitled';

  var $btns = $('.dd-notepad-save-btn');
  $btns.prop('disabled', true).text('Saving...');
  ddSetNoteStatus('saving', 'Saving...');

  if (ddSelectedNoteId) {
    // Update existing note
    var existingNote = ddNotes.find(function(n) { return n._id === ddSelectedNoteId; });
    var updateData = {
      title: title,
      content: content,
      createdAt: existingNote ? existingNote.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    $.ajax({
      url: API_URL + '/api/v1/users/' + userId + '/notes/' + ddSelectedNoteId,
      method: 'PUT',
      data: JSON.stringify(updateData),
      contentType: 'application/json',
      success: function() {
        var idx = ddNotes.findIndex(function(n) { return n._id === ddSelectedNoteId; });
        if (idx !== -1) {
          ddNotes[idx] = Object.assign({}, ddNotes[idx], updateData);
        }
        if (dbUser.user && dbUser.user.notes) {
          var uIdx = dbUser.user.notes.findIndex(function(n) { return n._id === ddSelectedNoteId; });
          if (uIdx !== -1) {
            dbUser.user.notes[uIdx] = Object.assign({}, dbUser.user.notes[uIdx], updateData);
          }
        }
        ddRenderNoteList();
        ddSetNoteStatus('saved', 'Saved');
        $btns.prop('disabled', false).text('Save');
      },
      error: function(xhr) {
        console.error('Error updating note:', xhr.responseText);
        ddSetNoteStatus('error', 'Save failed');
        $btns.prop('disabled', false).text('Save');
        ddToast('Failed to save note', 'error');
      }
    });
  } else {
    // Create new note
    $.ajax({
      url: API_URL + '/api/v1/users/' + userId + '/notes',
      method: 'POST',
      data: JSON.stringify({ title: title, content: content }),
      contentType: 'application/json',
      success: function(response) {
        if (response && response.note) {
          ddNotes.push(response.note);
          if (dbUser.user) {
            if (!dbUser.user.notes) dbUser.user.notes = [];
            dbUser.user.notes.push(response.note);
          }
          ddSelectedNoteId = response.note._id;
        }
        ddRenderNoteList();
        ddSetNoteStatus('saved', 'Saved');
        $btns.prop('disabled', false).text('Save');
      },
      error: function(xhr) {
        console.error('Error creating note:', xhr.responseText);
        ddSetNoteStatus('error', 'Save failed');
        $btns.prop('disabled', false).text('Save');
        ddToast('Failed to create note', 'error');
      }
    });
  }
}
window.ddSaveNote = ddSaveNote;

function ddDeleteNote(noteId) {
  var note = ddNotes.find(function(n) { return n._id === noteId; });
  var noteTitle = (note && note.title) ? note.title : 'Untitled';

  ddModal({
    type: 'danger',
    icon: 'fa-trash',
    title: 'Delete Note',
    message: 'Delete <strong>' + esc(noteTitle) + '</strong>?',
    detail: 'This action cannot be undone.',
    confirmText: 'Delete',
    confirmIcon: 'fa-trash',
    cancelText: 'Keep',
    onConfirm: function() {
      $.ajax({
        url: API_URL + '/api/v1/users/' + userId + '/notes/' + noteId,
        method: 'DELETE',
        success: function() {
          ddNotes = ddNotes.filter(function(n) { return n._id !== noteId; });
          if (dbUser.user && dbUser.user.notes) {
            dbUser.user.notes = dbUser.user.notes.filter(function(n) { return n._id !== noteId; });
          }
          if (ddSelectedNoteId === noteId) {
            ddSelectedNoteId = null;
            ddShowPlaceholder();
          }
          ddRenderNoteList();
          ddToast('Note deleted', 'success');
        },
        error: function(xhr) {
          console.error('Error deleting note:', xhr.responseText);
          ddToast('Failed to delete note', 'error');
        }
      });
    }
  });
}
window.ddDeleteNote = ddDeleteNote;

function ddSetNoteStatus(state, text) {
  var $dots = $('.dd-notepad-status-dot');
  var $labels = $('.dd-notepad-status-label');
  $dots.removeClass('saving saved error');
  if (state !== 'ready') $dots.addClass(state);
  $labels.text(text);
}

// ══════════════════════════════════════════
//  10-CODES COMPONENT
// ══════════════════════════════════════════
function renderCodesPanel() {
  return '<div class="dd-card-header">' +
      '<div class="dd-card-header-left">' +
        '<div class="dd-card-icon" style="background:rgba(59,130,246,0.15);color:var(--dd-blue);"><i class="fa fa-list-ol"></i></div>' +
        '<div><h3 class="dd-card-title">10-Codes</h3><p class="dd-card-subtitle">Quick reference</p></div>' +
      '</div>' +
    '</div>' +
    '<div class="dd-card-body">' +
      '<div class="dd-codes-search-wrap">' +
        '<i class="fa fa-search"></i>' +
        '<input type="text" class="dd-codes-search" placeholder="Search codes..." oninput="ddFilterCodes(this.value)">' +
      '</div>' +
      '<div id="dd-codes-loading" class="dd-spinner" style="padding:1rem;"></div>' +
      '<div id="dd-codes-list" class="dd-codes-list"></div>' +
      '<div id="dd-codes-empty" class="dd-empty" style="display:none; padding:1.5rem;">' +
        '<i class="fa fa-info-circle" style="font-size:1.25rem;"></i>' +
        '<p class="dd-empty-title">No 10-codes configured</p>' +
        '<p class="dd-empty-sub">Community admin can add codes in settings</p>' +
      '</div>' +
    '</div>';
}

function loadTenCodes() {
  if (!communityId) return;
  $('#dd-codes-loading').show();
  $('#dd-codes-list').empty();

  // Ten-codes are stored on the community object.
  // If community data is already loaded (via checkWarrantApprovalMode), use it.
  var communityData = (window.ddConfig || {}).communityData;
  if (communityData && communityData.tenCodes) {
    tenCodes = communityData.tenCodes || [];
    if (tenCodes.length === 0) {
      hideComponent('10CodesInterface');
      return;
    }
    renderTenCodes(tenCodes);
    return;
  }

  // Otherwise fetch community data to get ten-codes
  $.ajax({
    url: API_URL + '/api/v1/community/' + communityId,
    method: 'GET',
    success: function(res) {
      var community = res.community || res;
      tenCodes = community.tenCodes || [];
      if (tenCodes.length === 0) {
        hideComponent('10CodesInterface');
        return;
      }
      renderTenCodes(tenCodes);
    },
    error: function() {
      hideComponent('10CodesInterface');
    }
  });
}

function renderTenCodes(codes) {
  $('#dd-codes-loading').hide();
  var $lists = $('#dd-codes-list');
  $lists.empty();

  if (!codes || codes.length === 0) {
    $('#dd-codes-empty').show();
    return;
  }
  $('#dd-codes-empty').hide();

  codes.forEach(function(code) {
    $lists.append(
      '<div class="dd-code-row">' +
        '<span class="dd-code-num">' + esc(code.code || '') + '</span>' +
        '<span class="dd-code-desc">' + esc(code.description || '') + '</span>' +
      '</div>'
    );
  });
}

window.ddFilterCodes = function(query) {
  var q = query.toLowerCase();
  var filtered = tenCodes.filter(function(c) {
    return (c.code || '').toLowerCase().indexOf(q) !== -1 ||
           (c.description || '').toLowerCase().indexOf(q) !== -1;
  });
  renderTenCodes(filtered);
};

// ══════════════════════════════════════════
//  PENAL CODES COMPONENT
// ══════════════════════════════════════════

var pcDefaultCurrencies = [
  { code: 'USD', symbol: '$', builtin: true },
  { code: 'EUR', symbol: '\u20AC', builtin: true },
  { code: 'GBP', symbol: '\u00A3', builtin: true },
  { code: 'CAD', symbol: 'C$', builtin: true },
  { code: 'AUD', symbol: 'A$', builtin: true }
];
var pcCurrencyList = pcDefaultCurrencies.slice();
var pcKnownCurrencies = {};

function pcBuildKnownCurrencies() {
  pcKnownCurrencies = {};
  pcCurrencyList.forEach(function(c) { pcKnownCurrencies[c.code] = c.symbol; });
}
// Build immediately so initial render has symbols
pcBuildKnownCurrencies();

function pcGetCurrencySymbol(code) {
  return pcKnownCurrencies[code] || code || '$';
}

function pcParseFine(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') { var n = parseInt(val.replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 0 : n; }
  return 0;
}

function pcFormatFine(amount) {
  var n = pcParseFine(amount);
  if (!n) return '\u2014';
  return esc(pcGetCurrencySymbol(penalCodesCurrency)) + n.toLocaleString();
}

// ── Court Cases Component (Embedded Judicial Dashboard) ──
var ccIsJudicial = false; // set after fetchDepartmentData
var ccCachedQueue = [];
var ccCachedScheduled = [];
var ccCachedActiveSessions = [];
var ccCachedHistorySessions = [];
var ccHistoryCaseCache = {}; // caseId -> fetched court case data
var ccExpandedHistoryId = null;
var ccPrevQueueCount = -1; // -1 = initial load (no toast)

function ccIsValidDate(d) {
  if (!d) return false;
  var dt = new Date(d);
  return !isNaN(dt.getTime()) && dt.getFullYear() > 2000;
}

function ccGetInitials(name) {
  var parts = (name || '').split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return '?';
}

function renderCourtCasesPanel() {
  return '<div class="dd-card-header">' +
      '<div class="dd-card-header-left">' +
        '<div class="dd-card-icon" style="background:rgba(139,92,246,0.15);color:var(--dd-accent);"><i class="fa fa-briefcase"></i></div>' +
        '<div><h3 class="dd-card-title">Court Cases</h3><p class="dd-card-subtitle dd-cc-subtitle">View court cases & sessions</p></div>' +
      '</div>' +
      '<div class="dd-card-header-right" style="display:flex;gap:0.5rem;align-items:center;">' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="ddCcOpenCaseSearch()" title="Case Search"><i class="fa fa-magnifying-glass"></i> Search</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-primary dd-cc-create-session-btn" onclick="ccOpenCreateSession()" style="display:none;"><i class="fa fa-plus"></i> Create Session</button>' +
      '</div>' +
    '</div>' +
    '<div class="dd-card-body">' +
      // Live session banner
      '<div class="dd-cc-live-banner" id="ddLiveSessionsBanner"></div>' +
      // Metrics row
      '<div class="dd-cc-metrics">' +
        '<div class="dd-cc-metric"><div class="dd-cc-metric-value gold dd-cc-metric-pending">-</div><div class="dd-cc-metric-label">Pending</div></div>' +
        '<div class="dd-cc-metric"><div class="dd-cc-metric-value blue dd-cc-metric-scheduled">-</div><div class="dd-cc-metric-label">Scheduled</div></div>' +
        '<div class="dd-cc-metric"><div class="dd-cc-metric-value red dd-cc-metric-active">-</div><div class="dd-cc-metric-label">Active</div></div>' +
        '<div class="dd-cc-metric"><div class="dd-cc-metric-value green dd-cc-metric-completed">-</div><div class="dd-cc-metric-label">Completed</div></div>' +
      '</div>' +
      // Tab bar
      '<div class="dd-cc-tabs">' +
        '<button class="dd-cc-tab active" data-cctab="queue"><i class="fa fa-inbox"></i> Queue <span class="dd-cc-tab-count dd-cc-count-queue">0</span></button>' +
        '<button class="dd-cc-tab" data-cctab="scheduled"><i class="fa fa-calendar-check"></i> Scheduled <span class="dd-cc-tab-count dd-cc-count-scheduled">0</span></button>' +
        '<button class="dd-cc-tab" data-cctab="active"><i class="fa fa-circle-play"></i> Sessions <span class="dd-cc-tab-count dd-cc-count-active">0</span></button>' +
        '<button class="dd-cc-tab" data-cctab="history"><i class="fa fa-clock-rotate-left"></i> History</button>' +
      '</div>' +
      // Tab content
      '<div class="dd-cc-tab-content active" data-cctab-content="queue">' +
        '<div class="dd-cc-loading dd-spinner" style="margin:2rem auto;"></div>' +
        '<div class="dd-cc-case-list dd-cc-list-queue" style="display:none;"></div>' +
      '</div>' +
      '<div class="dd-cc-tab-content" data-cctab-content="scheduled">' +
        '<div class="dd-cc-loading dd-spinner" style="margin:2rem auto;"></div>' +
        '<div class="dd-cc-case-list dd-cc-list-scheduled" style="display:none;"></div>' +
      '</div>' +
      '<div class="dd-cc-tab-content" data-cctab-content="active">' +
        '<div class="dd-cc-loading dd-spinner" style="margin:2rem auto;"></div>' +
        '<div class="dd-cc-case-list dd-cc-list-active" style="display:none;"></div>' +
      '</div>' +
      '<div class="dd-cc-tab-content" data-cctab-content="history">' +
        '<div class="dd-cc-loading dd-spinner" style="margin:2rem auto;"></div>' +
        '<div class="dd-cc-case-list dd-cc-list-history" style="display:none;"></div>' +
      '</div>' +
    '</div>';
}

function loadCourtCases() {
  if (!communityId) return;
  ccIsJudicial = (currentTemplateName === 'judicial');
  // Show/hide judicial-only controls
  if (ccIsJudicial) {
    $('.dd-cc-create-session-btn').show();
    $('.dd-cc-subtitle').text('Manage court cases & sessions');
  }
  // Bind tab switching
  $('.dd-cc-tabs .dd-cc-tab').off('click').on('click', function() {
    var tab = $(this).data('cctab');
    $(this).closest('.dd-cc-tabs').find('.dd-cc-tab').removeClass('active');
    $(this).addClass('active');
    $(this).closest('.dd-card-body').find('.dd-cc-tab-content').removeClass('active');
    $(this).closest('.dd-card-body').find('[data-cctab-content="' + tab + '"]').addClass('active');
  });
  ccLoadQueue();
  ccLoadScheduled();
  ccLoadActiveSessions();
  ccLoadHistory();

  function ddCcRefreshIfIdle() {
    if (!communityId) return;
    var hasExpandedSession = $('.dd-cc-session-card.expanded').length > 0;
    var hasExpandedWarrant = $('.dd-warrant-item.expanded').length > 0;
    ccLoadQueue();
    ccLoadScheduled();
    ccLoadActiveSessions();
    if (!hasExpandedSession) ccLoadHistory();
    if (!hasExpandedWarrant && typeof loadWarrantStats === 'function') loadWarrantStats();
  }

  // Refresh data when user returns to this tab/page (e.g. after leaving a court session)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) ddCcRefreshIfIdle();
  });

  // Refresh when navigating back (bfcache restore)
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) ddCcRefreshIfIdle();
  });

  // Catch returns that bypass bfcache (e.g. active timers prevent caching)
  var ddLastFocusRefresh = 0;
  window.addEventListener('focus', function() {
    var now = Date.now();
    if (now - ddLastFocusRefresh < 3000) return;
    ddLastFocusRefresh = now;
    ddCcRefreshIfIdle();
  });

  // Poll every 30 seconds to keep all stats current
  setInterval(function() {
    if (!document.hidden) ddCcRefreshIfIdle();
  }, 30000);
}

// ── Data loading ──

function ccUpdatePendingBadge() {
  var count = ccCachedQueue.length;
  $('.dd-cc-metric-pending').text(count);
  $('.dd-cc-count-queue').text(count);
  $('#dd-ov-cc-pending').text(count);
  var $badge = $('#dd-cc-pending-count');
  if (count > 0) {
    $badge.text(count).show();
  } else {
    $badge.hide();
  }

  // Toast when new cases arrive (skip initial load)
  if (ccPrevQueueCount >= 0 && count > ccPrevQueueCount) {
    var diff = count - ccPrevQueueCount;
    ddToast(diff + ' new court case' + (diff > 1 ? 's' : '') + ' submitted', 'info');
  }
  ccPrevQueueCount = count;
}

function ccLoadQueue() {
  if (!communityId) return;
  $.ajax({
    url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=submitted&limit=50',
    method: 'GET',
    success: function(resp) {
      var submitted = resp.data || [];
      $.ajax({
        url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=in_review&limit=50',
        method: 'GET',
        success: function(resp2) {
          ccCachedQueue = submitted.concat(resp2.data || []);
          ccRenderQueue();
          ccUpdatePendingBadge();
        },
        error: function() {
          ccCachedQueue = submitted;
          ccRenderQueue();
          ccUpdatePendingBadge();
        }
      });
    },
    error: function() {
      ccShowEmpty('.dd-cc-list-queue', 'Failed to load cases.');
    }
  });
}

function ccLoadScheduled() {
  if (!communityId) return;
  $.ajax({
    url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=scheduled&limit=50',
    method: 'GET',
    success: function(resp) {
      ccCachedScheduled = resp.data || [];
      ccRenderScheduled();
      $('.dd-cc-metric-scheduled').text(ccCachedScheduled.length);
      $('.dd-cc-count-scheduled').text(ccCachedScheduled.length);
      $('#dd-ov-cc-scheduled').text(ccCachedScheduled.length);
    },
    error: function() { ccShowEmpty('.dd-cc-list-scheduled', 'Failed to load scheduled cases.'); }
  });
}

function ccLoadActiveSessions() {
  if (!communityId) return;
  // Fetch both scheduled and in_progress sessions
  $.ajax({
    url: API_URL + '/api/v2/court-sessions/community/' + communityId + '?status=in_progress&limit=50',
    method: 'GET',
    success: function(respActive) {
      var activeSessions = respActive.data || [];
      ddRenderLiveBanner(activeSessions);
      $.ajax({
        url: API_URL + '/api/v2/court-sessions/community/' + communityId + '?status=scheduled&limit=50',
        method: 'GET',
        success: function(respSched) {
          var scheduledSessions = respSched.data || [];
          ccCachedActiveSessions = activeSessions.concat(scheduledSessions);
          ccRenderActiveSessions();
          $('.dd-cc-metric-active').text(activeSessions.length);
          $('.dd-cc-count-active').text(ccCachedActiveSessions.length);
          $('#dd-ov-cc-active').text(activeSessions.length);
        },
        error: function() {
          ccCachedActiveSessions = activeSessions;
          ccRenderActiveSessions();
          $('.dd-cc-metric-active').text(activeSessions.length);
          $('.dd-cc-count-active').text(ccCachedActiveSessions.length);
          $('#dd-ov-cc-active').text(activeSessions.length);
        }
      });
    },
    error: function() { ccShowEmpty('.dd-cc-list-active', 'Failed to load sessions.'); }
  });
}

function ccLoadHistory() {
  if (!communityId) return;
  $.ajax({
    url: API_URL + '/api/v2/court-sessions/community/' + communityId + '?status=completed,cancelled&limit=50',
    method: 'GET',
    success: function(resp) {
      ccCachedHistorySessions = resp.data || [];
      ccRenderHistory();
      $('.dd-cc-metric-completed').text(ccCachedHistorySessions.length);
      $('#dd-ov-cc-completed').text(ccCachedHistorySessions.length);
    },
    error: function() { ccShowEmpty('.dd-cc-list-history', 'Failed to load history.'); }
  });
}

function ccShowEmpty(listSel, msg) {
  $(listSel).closest('.dd-cc-tab-content').find('.dd-cc-loading').hide();
  $(listSel).show().html('<div class="dd-cc-empty"><i class="fa fa-inbox"></i>' + esc(msg) + '</div>');
}

// ── Rendering ──

function ccRenderQueue() {
  var $containers = $('.dd-cc-list-queue');
  $containers.closest('.dd-cc-tab-content').find('.dd-cc-loading').hide();
  $containers.show();

  if (ccCachedQueue.length === 0) {
    $containers.html('<div class="dd-cc-empty"><i class="fa fa-inbox"></i>No pending cases in the queue.</div>');
    return;
  }

  var html = ccCachedQueue.map(function(c) {
    var d = c.courtCase || c.details || c;
    var initials = ccGetInitials(d.civilianName || 'Unknown');
    var itemCount = (d.contestedItems || []).length;
    var dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '';
    var statusClass = 'dd-cc-badge-' + (d.status || 'submitted');
    var statusLabel = (d.status || 'submitted').replace('_', ' ');
    var caseId = c._id || '';

    var actions = '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="event.stopPropagation();ccViewCase(\'' + caseId + '\')"><i class="fa fa-eye"></i> View</button>';
    if (ccIsJudicial && d.status === 'submitted') {
      actions = '<button class="dd-btn dd-btn-sm dd-btn-primary" onclick="event.stopPropagation();ccAssignCase(\'' + caseId + '\')"><i class="fa fa-user-check"></i> Assign</button>' + actions;
    }

    return '<div class="dd-cc-case-card" style="cursor:pointer;" onclick="ccViewCase(\'' + caseId + '\')">' +
      '<div class="dd-cc-avatar">' + initials + '</div>' +
      '<div class="dd-cc-case-info">' +
        '<div class="dd-cc-case-name">' +
          ccCaseNumberPill(d.caseNumber, { marginRight: '0.4rem' }) +
          esc(d.civilianName || 'Unknown Civilian') +
        '</div>' +
        '<div class="dd-cc-case-meta">' +
          '<span class="dd-cc-badge ' + statusClass + '">' + statusLabel + '</span>' +
          '<span class="dd-cc-case-meta-item"><i class="fa fa-file-lines"></i> ' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
          '<span class="dd-cc-case-meta-item"><i class="fa fa-clock"></i> ' + dateStr + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="dd-cc-case-actions">' + actions + '</div>' +
    '</div>';
  }).join('');

  $containers.html(html);
}

function ccRenderScheduled() {
  var $containers = $('.dd-cc-list-scheduled');
  $containers.closest('.dd-cc-tab-content').find('.dd-cc-loading').hide();
  $containers.show();

  if (ccCachedScheduled.length === 0) {
    $containers.html('<div class="dd-cc-empty"><i class="fa fa-calendar-check"></i>No scheduled cases.</div>');
    return;
  }

  var html = ccCachedScheduled.map(function(c) {
    var d = c.courtCase || c.details || c;
    var initials = ccGetInitials(d.civilianName || 'Unknown');
    var itemCount = (d.contestedItems || []).length;
    var schedDate = ccIsValidDate(d.scheduledDate) ? new Date(d.scheduledDate).toLocaleString() : 'Not scheduled';
    var caseId = c._id || '';

    return '<div class="dd-cc-case-card" style="cursor:pointer;" onclick="ccViewCase(\'' + caseId + '\')">' +
      '<div class="dd-cc-avatar">' + initials + '</div>' +
      '<div class="dd-cc-case-info">' +
        '<div class="dd-cc-case-name">' +
          ccCaseNumberPill(d.caseNumber, { marginRight: '0.4rem' }) +
          esc(d.civilianName || 'Unknown Civilian') +
        '</div>' +
        '<div class="dd-cc-case-meta">' +
          '<span class="dd-cc-badge dd-cc-badge-scheduled">scheduled</span>' +
          '<span class="dd-cc-case-meta-item"><i class="fa fa-calendar"></i> ' + schedDate + '</span>' +
          '<span class="dd-cc-case-meta-item"><i class="fa fa-file-lines"></i> ' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="dd-cc-case-actions">' +
        (d.courtSessionID ? '' : '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="event.stopPropagation();ccReturnToQueue(\'' + caseId + '\',\'' + esc(d.civilianName || 'this case') + '\')"><i class="fa fa-arrow-rotate-left"></i> Unschedule</button>') +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" style="color:#fbbf24;border-color:rgba(251,191,36,0.3);" onclick="event.stopPropagation();ccRescheduleCase(\'' + caseId + '\',\'' + esc(d.scheduledDate || '') + '\')"><i class="fa fa-clock-rotate-left"></i> Reschedule</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="event.stopPropagation();ccViewCase(\'' + caseId + '\')"><i class="fa fa-eye"></i> View</button>' +
      '</div>' +
    '</div>';
  }).join('');

  $containers.html(html);
}

function ddRenderLiveBanner(liveSessions) {
  var $banner = $('#ddLiveSessionsBanner');
  var $liveBadge = $('#dd-cc-live-count');
  var count = (liveSessions && liveSessions.length) || 0;

  // Update sidebar badge
  if ($liveBadge.length) {
    if (count > 0) {
      $liveBadge.text(count).show();
    } else {
      $liveBadge.hide();
    }
  }

  if (!$banner.length) return;
  if (count === 0) {
    $banner.removeClass('visible');
    return;
  }

  var rows = liveSessions.map(function(s) {
    var d = s.courtSession || s.details || s;
    var docketCount = (d.docket || []).length;
    var sessionId = s._id || '';
    var startedAt = d.startedAt ? new Date(d.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return '<div class="dd-cc-live-session-row">' +
      '<div class="dd-cc-live-session-info">' +
        '<div class="dd-cc-live-session-title">' + esc(d.title || 'Court Session') + '</div>' +
        '<div class="dd-cc-live-session-meta">' +
          '<span><i class="fa fa-gavel"></i>Judge ' + esc(d.judgeName || 'Unknown') + '</span>' +
          '<span><i class="fa fa-file-lines"></i>' + docketCount + ' case' + (docketCount !== 1 ? 's' : '') + '</span>' +
          (startedAt ? '<span><i class="fa fa-clock"></i>' + startedAt + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<a href="/court-session?s=' + sessionId + '" class="dd-cc-live-join-btn"><i class="fa fa-door-open"></i> Join</a>' +
    '</div>';
  }).join('');

  $banner.html(
    '<div class="dd-cc-live-banner-header">' +
      '<div class="dd-cc-live-dot"></div>' +
      'Court in Session' +
    '</div>' +
    rows
  ).addClass('visible');
}

function ccRenderActiveSessions() {
  var $containers = $('.dd-cc-list-active');
  $containers.closest('.dd-cc-tab-content').find('.dd-cc-loading').hide();
  $containers.show();

  if (ccCachedActiveSessions.length === 0) {
    $containers.html('<div class="dd-cc-empty"><i class="fa fa-circle-play"></i>No court sessions.</div>');
    return;
  }

  var html = ccCachedActiveSessions.map(function(s) {
    var d = s.courtSession || s.details || s;
    var docketCount = (d.docket || []).length;
    var participantCount = (d.participants || []).length;
    var sessionId = s._id || '';
    var isLive = d.status === 'in_progress';
    var isScheduled = d.status === 'scheduled';

    var timeLabel = '';
    if (isLive && d.startedAt) {
      timeLabel = '<span><i class="fa fa-clock"></i> Started ' + new Date(d.startedAt).toLocaleTimeString() + '</span>';
    } else if (isScheduled && d.scheduledStart) {
      timeLabel = '<span><i class="fa fa-calendar"></i> ' + new Date(d.scheduledStart).toLocaleString() + '</span>';
    }

    var actionBtns = isLive
      ? '<a href="/court-session?s=' + sessionId + '" class="dd-btn dd-btn-sm dd-btn-primary"><i class="fa fa-door-open"></i> Join</a>'
      : '<a href="/court-session?s=' + sessionId + '" class="dd-btn dd-btn-sm dd-btn-outline"><i class="fa fa-door-open"></i> Open</a>';

    // Judges can edit/delete scheduled sessions
    if (ccIsJudicial && isScheduled) {
      actionBtns = '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="event.stopPropagation();ccEditSession(\'' + sessionId + '\')"><i class="fa fa-pen"></i> Edit</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" style="color:#ef4444;border-color:#ef4444;" onclick="event.stopPropagation();ccDeleteSession(\'' + sessionId + '\')"><i class="fa fa-trash"></i></button>' +
        actionBtns;
    }

    var titlePrefix = isLive ? '<span class="dd-cc-live-dot"></span>' : '';
    var statusBadge = isScheduled ? ' <span class="dd-cc-badge dd-cc-badge-scheduled" style="margin-left:0.5rem;">scheduled</span>' : '';

    return '<div class="dd-cc-session-card' + (isLive ? ' live' : '') + '">' +
      '<div class="dd-cc-session-header">' +
        '<div>' +
          '<div class="dd-cc-session-title">' + titlePrefix + esc(d.title || 'Court Session') + statusBadge + '</div>' +
          '<div class="dd-cc-session-subtitle">Judge ' + esc(d.judgeName || 'Unknown') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:0.5rem;align-items:center;">' + actionBtns + '</div>' +
      '</div>' +
      '<div class="dd-cc-session-meta">' +
        '<span><i class="fa fa-file-lines"></i> ' + docketCount + ' case' + (docketCount !== 1 ? 's' : '') + '</span>' +
        '<span><i class="fa fa-users"></i> ' + participantCount + ' participant' + (participantCount !== 1 ? 's' : '') + '</span>' +
        timeLabel +
      '</div>' +
    '</div>';
  }).join('');

  $containers.html(html);
}

function ccRenderHistory() {
  var $containers = $('.dd-cc-list-history');
  $containers.closest('.dd-cc-tab-content').find('.dd-cc-loading').hide();
  $containers.show();

  if (ccCachedHistorySessions.length === 0) {
    $containers.html('<div class="dd-cc-empty"><i class="fa fa-clock-rotate-left"></i>No session history yet.</div>');
    return;
  }

  var html = ccCachedHistorySessions.map(function(s) {
    var d = s.courtSession || s.details || s;
    var sid = s._id || '';
    var docketCount = (d.docket || []).length;
    var endedAt = d.endedAt ? new Date(d.endedAt).toLocaleString() : '';
    var startedAt = d.startedAt ? new Date(d.startedAt).toLocaleString() : '';

    // Build participants html from session data (no extra fetch needed)
    var participantsHtml = '';
    var parts = d.participants || [];
    if (parts.length > 0) {
      participantsHtml = '<div style="margin-top:0.75rem;">' +
        '<div class="dd-cc-detail-label">Participants</div>' +
        '<div class="dd-cc-participant-chips">' +
        parts.map(function(p) {
          var roleClass = p.role === 'judge' ? 'role-judge' : p.role === 'defendant' ? 'role-defendant' : '';
          return '<span class="dd-cc-participant-chip ' + roleClass + '">' +
            esc(p.userName || 'Unknown') +
            '<span class="chip-role">' + esc(p.role || '') + '</span>' +
          '</span>';
        }).join('') +
        '</div></div>';
    }

    // Build docket skeleton (verdicts loaded on expand)
    var docketHtml = '';
    var docket = d.docket || [];
    if (docket.length > 0) {
      docketHtml = '<div class="dd-cc-detail-label">Docket</div>' +
        '<div class="dd-cc-docket-entries" data-session-id="' + sid + '">' +
        docket.map(function(entry) {
          var cid = entry.courtCaseID || entry.caseID || '';
          var civName = (entry.civilianName || '').trim() || 'Unknown';
          return '<div class="dd-cc-docket-entry" data-case-id="' + cid + '">' +
            '<div class="dd-cc-docket-civ-name">' +
              ccCaseNumberPill(entry.caseNumber, { marginRight: '0.4rem' }) +
              '<i class="fa fa-user"></i><span class="dd-cc-docket-civ-text">' + esc(civName) + '</span>' +
            '</div>' +
            '<div class="dd-cc-docket-resolutions">' +
              '<span style="font-size:0.78rem;color:var(--dd-text-dim);">Expand to load verdicts...</span>' +
            '</div>' +
          '</div>';
        }).join('') +
        '</div>';
    }

    return '<div class="dd-cc-session-card expandable" data-session-id="' + sid + '" onclick="ccToggleHistorySession(\'' + sid + '\')">' +
      '<div class="dd-cc-session-header">' +
        '<div style="flex:1;">' +
          '<div class="dd-cc-session-title">' + esc(d.title || 'Court Session') + '</div>' +
          '<div class="dd-cc-session-subtitle">Judge ' + esc(d.judgeName || 'Unknown') + '</div>' +
        '</div>' +
        '<span class="dd-cc-badge dd-cc-badge-' + (d.status || 'completed') + '">' + (d.status || 'completed') + '</span>' +
        '<i class="fa fa-chevron-down dd-cc-session-expand-icon"></i>' +
      '</div>' +
      '<div class="dd-cc-session-meta">' +
        '<span><i class="fa fa-file-lines"></i> ' + docketCount + ' case' + (docketCount !== 1 ? 's' : '') + '</span>' +
        (startedAt ? '<span><i class="fa fa-play"></i> ' + startedAt + '</span>' : '') +
        (endedAt ? '<span><i class="fa fa-stop"></i> ' + endedAt + '</span>' : '') +
      '</div>' +
      '<div class="dd-cc-session-detail">' +
        '<div class="dd-cc-session-detail-inner">' +
          docketHtml +
          participantsHtml +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  $containers.html(html);
}

// ── History expand/collapse ──

window.ccToggleHistorySession = function(sessionId) {
  var $card = $('.dd-cc-session-card[data-session-id="' + sessionId + '"]');
  var isExpanding = !$card.hasClass('expanded');

  // Accordion: collapse all others
  $('.dd-cc-session-card.expanded').not($card).removeClass('expanded');
  $card.toggleClass('expanded');

  if (!isExpanding) return; // collapsing — nothing else to do

  // Fetch case details for each docket entry (if not cached)
  var $entries = $card.find('.dd-cc-docket-entry');
  $entries.each(function() {
    var $entry = $(this);
    var caseId = $entry.data('case-id');
    if (!caseId) return;

    var $resArea = $entry.find('.dd-cc-docket-resolutions');

    // Already loaded
    if (ccHistoryCaseCache[caseId]) {
      ccRenderDocketResolutions($resArea, ccHistoryCaseCache[caseId]);
      return;
    }

    // Show loading
    $resArea.html('<span style="font-size:0.78rem;color:var(--dd-text-dim);"><i class="fa fa-spinner fa-spin"></i> Loading...</span>');

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + caseId,
      method: 'GET',
      success: function(c) {
        var cd = c.courtCase || c.details || c;
        ccHistoryCaseCache[caseId] = cd;
        ccRenderDocketResolutions($resArea, cd);
        // Backfill case number pill if entry didn't carry it (legacy docket rows)
        var $civWrap = $entry.find('.dd-cc-docket-civ-name');
        if ($civWrap.length && cd.caseNumber && !$civWrap.find('span[style*="JetBrains Mono"]').length) {
          $civWrap.prepend(ccCaseNumberPill(cd.caseNumber, { marginRight: '0.4rem' }));
        }
        // Backfill civilian name
        var $nameEl = $entry.find('.dd-cc-docket-civ-text');
        if ($nameEl.length && (!$nameEl.text().trim() || $nameEl.text() === 'Unknown')) {
          var name = (cd.civilianName || '').trim();
          if (name) {
            $nameEl.text(name);
          } else if (cd.civilianID) {
            $.ajax({
              url: API_URL + '/api/v1/civilian/' + cd.civilianID,
              method: 'GET',
              success: function(civ) {
                var civD = civ.civilian || civ;
                var fullName = (civD.name || '').trim() || ((civD.firstName || '') + ' ' + (civD.lastName || '')).trim();
                if (fullName) $nameEl.text(fullName);
              }
            });
          }
        }
      },
      error: function() {
        $resArea.html('<span style="font-size:0.78rem;color:#f87171;">Failed to load case details</span>');
      }
    });
  });
};

function ccRenderDocketResolutions($container, caseData) {
  var resolutions = caseData.resolutions || [];
  var contestedItems = caseData.contestedItems || [];

  if (resolutions.length === 0 && contestedItems.length === 0) {
    $container.html('<span style="font-size:0.78rem;color:var(--dd-text-dim);">No contested items</span>');
    return;
  }

  // Build a map of resolutions by itemID for quick lookup
  var resMap = {};
  for (var i = 0; i < resolutions.length; i++) {
    resMap[resolutions[i].itemID] = resolutions[i];
  }

  var html = contestedItems.map(function(item) {
    var res = resMap[item.itemID];
    var verdictHtml = res
      ? '<span class="dd-cc-verdict ' + (res.verdict || '') + '">' + esc(res.verdict || '') + '</span>'
      : '<span style="font-size:0.72rem;color:var(--dd-text-dim);">pending</span>';
    var typeClass = (item.itemType || '').toLowerCase();

    return '<div class="dd-cc-resolution-row">' +
      '<span class="dd-cc-resolution-type ' + typeClass + '">' + esc(item.itemType || '') + '</span>' +
      '<span class="dd-cc-resolution-summary">' + esc(item.summary || 'No description') + '</span>' +
      verdictHtml +
    '</div>';
  }).join('');

  // If there are resolutions with judgeNotes, show them
  var notesHtml = '';
  for (var j = 0; j < resolutions.length; j++) {
    if (resolutions[j].judgeNotes) {
      notesHtml += '<div style="font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.35rem;font-style:italic;">' +
        '<i class="fa fa-quote-left" style="font-size:0.6rem;margin-right:0.3rem;color:var(--dd-text-dim);"></i>' +
        esc(resolutions[j].judgeNotes) +
      '</div>';
    }
  }

  $container.html(html + notesHtml);
}

// ── Enrich contested items with record details ──

function ccEnrichContestedItems(civilianId, contestedItems) {
  if (!civilianId || !contestedItems.length) return;

  // Fetch civilian to get criminal history entries
  $.ajax({
    url: API_URL + '/api/v1/civilian/' + civilianId,
    method: 'GET',
    success: function(civ) {
      var civData = civ.civilian || civ;
      var crimHistory = civData.criminalHistory || [];

      // Build lookup by _id
      var historyMap = {};
      for (var i = 0; i < crimHistory.length; i++) {
        historyMap[crimHistory[i]._id] = crimHistory[i];
      }

      // Enrich each contested item
      contestedItems.forEach(function(item) {
        var $el = $('.dd-cc-contested-item[data-item-id="' + item.itemID + '"]');
        var $details = $el.find('.dd-cc-item-details');

        if (item.itemType === 'citation' || item.itemType === 'warning') {
          var entry = historyMap[item.itemID];
          if (entry) {
            var fines = entry.fines || [];
            var detailHtml = '';
            if (fines.length > 0) {
              detailHtml += fines.map(function(f) {
                return '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0;font-size:0.8rem;">' +
                  '<span style="color:var(--dd-text);">' + esc(f.fineType || '') + ' <span style="color:var(--dd-text-dim);">(' + esc(f.category || '') + ')</span></span>' +
                  '<span style="color:var(--dd-amber);font-weight:600;">$' + esc(String(f.fineAmount || 0)) + '</span>' +
                '</div>';
              }).join('');
            }
            if (entry.notes) {
              detailHtml += '<div style="font-size:0.78rem;color:var(--dd-text-muted);margin-top:0.3rem;font-style:italic;">' +
                '<i class="fa fa-quote-left" style="font-size:0.6rem;margin-right:0.25rem;color:var(--dd-text-dim);"></i>' +
                esc(entry.notes) + '</div>';
            }
            if (detailHtml) {
              $details.html(detailHtml).show();
            }
          }
        } else if (item.itemType === 'arrest') {
          // Fetch arrest report directly
          $.ajax({
            url: API_URL + '/api/v1/arrest-report/' + item.itemID,
            method: 'GET',
            success: function(ar) {
              var report = ar.arrestReport || ar;
              var detailHtml = '';
              if (report.charges) {
                detailHtml += '<div style="font-size:0.8rem;padding:0.25rem 0;">' +
                  '<span style="color:var(--dd-text-dim);">Charges:</span> ' +
                  '<span style="color:var(--dd-text);">' + esc(report.charges) + '</span></div>';
              }
              if (report.arrestLocation) {
                detailHtml += '<div style="font-size:0.8rem;padding:0.25rem 0;">' +
                  '<span style="color:var(--dd-text-dim);">Location:</span> ' +
                  '<span style="color:var(--dd-text);">' + esc(report.arrestLocation) + '</span></div>';
              }
              if (report.narrative) {
                detailHtml += '<div style="font-size:0.78rem;color:var(--dd-text-muted);margin-top:0.3rem;font-style:italic;">' +
                  '<i class="fa fa-quote-left" style="font-size:0.6rem;margin-right:0.25rem;color:var(--dd-text-dim);"></i>' +
                  esc(report.narrative) + '</div>';
              }
              if (detailHtml) {
                $details.html(detailHtml).show();
              }
            }
          });
        }
      });
    }
  });
}

// ── Actions ──

window.ccViewCase = function(caseId) {
  // Remove any existing modal
  $('#dd-cc-case-detail-modal').remove();

  var modalHtml = '<div class="dd-cc-modal-overlay" id="dd-cc-case-detail-modal">' +
    '<div class="dd-cc-modal" style="max-width:620px;">' +
      '<div class="dd-cc-modal-head">' +
        '<div class="dd-cc-modal-title"><i class="fa fa-file-lines" style="color:var(--dd-accent);margin-right:0.4rem;"></i> Case Details</div>' +
        '<button class="dd-cc-modal-close" onclick="$(\'#dd-cc-case-detail-modal\').removeClass(\'open\')">&times;</button>' +
      '</div>' +
      '<div class="dd-cc-modal-body"><div class="dd-spinner" style="margin:2rem auto;"></div></div>' +
      '<div class="dd-cc-modal-footer" id="dd-cc-case-detail-footer"></div>' +
    '</div>' +
  '</div>';
  $('body').append(modalHtml);
  setTimeout(function() { $('#dd-cc-case-detail-modal').addClass('open'); }, 10);

  // Close on backdrop click
  $('#dd-cc-case-detail-modal').on('click', function(e) {
    if (e.target === this) $(this).removeClass('open');
  });

  $.ajax({
    url: API_URL + '/api/v2/court-cases/' + caseId,
    method: 'GET',
    success: function(c) {
      var d = c.courtCase || c.details || c;
      var statusClass = 'dd-cc-badge-' + (d.status || 'submitted');
      var statusLabel = (d.status || 'submitted').replace('_', ' ');

      var itemsHtml = '<div id="dd-cc-contested-items-area">' +
        (d.contestedItems || []).map(function(item) {
          var typeClass = item.itemType === 'arrest' ? 'dd-cc-badge-in_progress' : item.itemType === 'citation' ? 'dd-cc-badge-in_review' : 'dd-cc-badge-submitted';
          return '<div class="dd-cc-contested-item" data-item-id="' + esc(item.itemID) + '" data-item-type="' + esc(item.itemType) + '" style="background:var(--dd-surface);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.65rem 0.75rem;margin-bottom:0.4rem;">' +
            '<div style="display:flex;align-items:center;gap:0.6rem;">' +
              '<span class="dd-cc-badge ' + typeClass + '">' + esc(item.itemType) + '</span>' +
              '<span style="font-size:0.85rem;color:var(--dd-text);">' + esc(item.summary || 'No description') + '</span>' +
            '</div>' +
            '<div class="dd-cc-item-details" style="margin-top:0.4rem;display:none;"></div>' +
          '</div>';
        }).join('') +
      '</div>';

      var historyHtml = (d.history || []).map(function(h) {
        var judgeActions = ['assigned', 'scheduled', 'started', 'completed'];
        var displayName = h.userName || '';
        if (displayName && judgeActions.indexOf(h.action) !== -1) {
          displayName = 'Judge ' + displayName;
        }
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.4rem 0;border-bottom:1px solid var(--dd-glass-border);">' +
          '<span style="font-size:0.72rem;color:var(--dd-text-dim);min-width:110px;">' + (h.timestamp ? new Date(h.timestamp).toLocaleString() : '') + '</span>' +
          '<span class="dd-cc-badge dd-cc-badge-' + h.action + '" style="font-size:0.65rem;">' + (h.action || '').replace('_', ' ') + '</span>' +
          '<span style="font-size:0.78rem;color:var(--dd-text-muted);">' + esc(displayName) + (h.notes ? ' — ' + esc(h.notes) : '') + '</span>' +
        '</div>';
      }).join('');

      var resolutionsHtml = '';
      if (d.resolutions && d.resolutions.length > 0) {
        resolutionsHtml = '<div style="margin-top:1rem;"><div class="dd-cc-form-label">Resolutions</div>' +
          d.resolutions.map(function(r) {
            var verdictColor = r.verdict === 'dismissed' ? 'color:#6ee7b7;' : 'color:#fca5a5;';
            return '<div style="background:var(--dd-surface);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.5rem 0.75rem;margin-bottom:0.4rem;display:flex;justify-content:space-between;align-items:center;">' +
              '<span style="font-size:0.85rem;color:var(--dd-text);">' + esc(r.itemType) + '</span>' +
              '<span style="font-size:0.78rem;font-weight:600;' + verdictColor + 'text-transform:uppercase;">' + esc(r.verdict) + '</span>' +
            '</div>';
          }).join('') +
        '</div>';
      }

      var detailHtml = '' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">' +
          '<div>' +
            (d.caseNumber ? '<div style="margin-bottom:0.4rem;">' + ccCaseNumberPill(d.caseNumber) + '</div>' : '') +
            '<div style="font-weight:700;font-size:1.05rem;color:#fff;">' + esc(d.civilianName || 'Unknown') + '</div>' +
            '<div style="font-size:0.8rem;color:var(--dd-text-muted);margin-top:0.15rem;">Submitted ' + (d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '') + '</div>' +
          '</div>' +
          '<span class="dd-cc-badge ' + statusClass + '">' + statusLabel + '</span>' +
        '</div>' +
        (d.statement ? '<div style="margin-bottom:1rem;"><div class="dd-cc-form-label">Civilian Statement</div><div style="background:var(--dd-surface);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.75rem;font-size:0.85rem;color:var(--dd-text);font-style:italic;">' + esc(d.statement) + '</div></div>' : '') +
        '<div style="margin-bottom:1rem;"><div class="dd-cc-form-label">Contested Items (' + (d.contestedItems || []).length + ')</div>' + itemsHtml + '</div>' +
        (d.judgeName ? '<div style="margin-bottom:1rem;font-size:0.82rem;color:var(--dd-text-muted);"><i class="fa fa-gavel" style="color:var(--dd-accent);margin-right:0.3rem;"></i> Assigned to <strong style="color:#fff;">Judge ' + esc(d.judgeName) + '</strong></div>' : '') +
        (d.status === 'scheduled' && ccIsValidDate(d.scheduledDate) ? '<div style="margin-bottom:1rem;font-size:0.82rem;color:var(--dd-text-muted);"><i class="fa fa-calendar" style="color:#4ade80;margin-right:0.3rem;"></i> Scheduled for <strong style="color:#fff;">' + new Date(d.scheduledDate).toLocaleString() + '</strong></div>' : (d.status !== 'scheduled' && d.status !== 'completed' && d.status !== 'in_progress' ? '<div style="margin-bottom:1rem;font-size:0.82rem;color:var(--dd-text-dim);"><i class="fa fa-calendar" style="margin-right:0.3rem;"></i> Not yet scheduled</div>' : '')) +
        resolutionsHtml +
        (historyHtml ? '<div style="margin-top:1rem;"><div class="dd-cc-form-label">History</div>' + historyHtml + '</div>' : '');

      $('#dd-cc-case-detail-modal .dd-cc-modal-body').html(detailHtml);

      // Enrich contested items with actual record details
      ccEnrichContestedItems(d.civilianID, d.contestedItems || []);

      // Footer actions (judicial only)
      var footerHtml = '';
      if (ccIsJudicial && d.status === 'in_review') {
        footerHtml = '<button class="dd-btn dd-btn-sm dd-btn-primary" onclick="ccScheduleCase(\'' + (c._id || '') + '\')"><i class="fa fa-calendar"></i> Schedule</button>';
      } else if (ccIsJudicial && d.status === 'scheduled') {
        footerHtml = (d.courtSessionID ? '' : '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="ccReturnToQueue(\'' + (c._id || '') + '\',\'' + esc(d.civilianName || 'this case') + '\')"><i class="fa fa-arrow-rotate-left"></i> Unschedule</button>') +
          '<button class="dd-btn dd-btn-sm dd-btn-primary" onclick="ccRescheduleCase(\'' + (c._id || '') + '\',\'' + esc(d.scheduledDate || '') + '\')"><i class="fa fa-clock-rotate-left"></i> Reschedule</button>';
      }
      // Delete button: judges (any case in their community) OR the case owner (their own case).
      var isOwner = !!(userId && d.userID && d.userID === userId);
      if (ccIsJudicial || isOwner) {
        footerHtml += '<button class="dd-btn dd-btn-sm dd-btn-deny" style="margin-left:auto;" onclick="ccDeleteCase(\'' + (c._id || '') + '\',\'' + esc(d.civilianName || '') + '\')"><i class="fa fa-trash"></i> Delete Case</button>';
      }
      $('#dd-cc-case-detail-footer').html(footerHtml);
    },
    error: function() {
      $('#dd-cc-case-detail-modal .dd-cc-modal-body').html('<div class="dd-cc-empty"><i class="fa fa-exclamation-triangle"></i>Failed to load case details.</div>');
    }
  });
};

window.ccAssignCase = function(caseId) {
  $.ajax({
    url: API_URL + '/api/v2/court-cases/' + caseId + '/assign',
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify({ judgeID: userId, judgeName: userName }),
    success: function() {
      ccLoadQueue();
    },
    error: function(xhr) {
      ccAlert('Assign Failed', (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.', 'danger');
    }
  });
};

window.ccScheduleCase = function(caseId) {
  $('#dd-cc-case-detail-modal').removeClass('open');
  $('#dd-cc-schedule-modal').remove();

  var modalHtml = '<div class="dd-cc-modal-overlay" id="dd-cc-schedule-modal">' +
    '<div class="dd-cc-modal" style="max-width:440px;">' +
      '<div class="dd-cc-modal-head">' +
        '<div class="dd-cc-modal-title"><i class="fa fa-calendar" style="color:var(--dd-accent);margin-right:0.4rem;"></i> Schedule Court Date</div>' +
        '<button class="dd-cc-modal-close" onclick="$(\'#dd-cc-schedule-modal\').removeClass(\'open\')">&times;</button>' +
      '</div>' +
      '<div class="dd-cc-modal-body">' +
        '<input type="hidden" id="dd-cc-schedule-case-id" value="' + caseId + '">' +
        '<div class="dd-cc-form-group">' +
          '<label class="dd-cc-form-label">Court Date & Time</label>' +
          '<input type="datetime-local" class="dd-cc-form-input" id="dd-cc-schedule-date">' +
        '</div>' +
      '</div>' +
      '<div class="dd-cc-modal-footer">' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="$(\'#dd-cc-schedule-modal\').removeClass(\'open\')">Cancel</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-primary" id="dd-cc-submit-schedule"><i class="fa fa-check"></i> Schedule</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  $('body').append(modalHtml);
  setTimeout(function() { $('#dd-cc-schedule-modal').addClass('open'); }, 10);

  $('#dd-cc-schedule-modal').on('click', function(e) {
    if (e.target === this) $(this).removeClass('open');
  });

  $('#dd-cc-submit-schedule').on('click', function() {
    var schedCaseId = $('#dd-cc-schedule-case-id').val();
    var dateVal = $('#dd-cc-schedule-date').val();
    if (!dateVal) { ccAlert('Missing Field', 'Please select a date and time.', 'warning'); return; }

    var $btn = $(this);
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Scheduling...');

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + schedCaseId + '/schedule',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        scheduledDate: new Date(dateVal).toISOString(),
        judgeID: userId,
        judgeName: userName
      }),
      success: function() {
        $('#dd-cc-schedule-modal').removeClass('open');
        ccLoadQueue();
        ccLoadScheduled();
      },
      error: function(xhr) {
        ccAlert('Schedule Failed', (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.', 'danger');
      },
      complete: function() {
        $btn.prop('disabled', false).html('<i class="fa fa-check"></i> Schedule');
      }
    });
  });
};

window.ccRescheduleCase = function(caseId, currentDate) {
  $('#dd-cc-case-detail-modal').removeClass('open');
  $('#dd-cc-reschedule-modal').remove();

  // Format existing date for datetime-local input
  var prefill = '';
  if (currentDate && ccIsValidDate(currentDate)) {
    var d = new Date(currentDate);
    prefill = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + 'T' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }

  var modalHtml = '<div class="dd-cc-modal-overlay" id="dd-cc-reschedule-modal">' +
    '<div class="dd-cc-modal" style="max-width:440px;">' +
      '<div class="dd-cc-modal-head">' +
        '<div class="dd-cc-modal-title"><i class="fa fa-clock-rotate-left" style="color:var(--dd-accent);margin-right:0.4rem;"></i> Reschedule Court Date</div>' +
        '<button class="dd-cc-modal-close" onclick="$(\'#dd-cc-reschedule-modal\').removeClass(\'open\')">&times;</button>' +
      '</div>' +
      '<div class="dd-cc-modal-body">' +
        '<input type="hidden" id="dd-cc-reschedule-case-id" value="' + caseId + '">' +
        '<div class="dd-cc-form-group">' +
          '<label class="dd-cc-form-label">New Court Date & Time</label>' +
          '<input type="datetime-local" class="dd-cc-form-input" id="dd-cc-reschedule-date" value="' + prefill + '">' +
        '</div>' +
      '</div>' +
      '<div class="dd-cc-modal-footer">' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="$(\'#dd-cc-reschedule-modal\').removeClass(\'open\')">Cancel</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-primary" id="dd-cc-submit-reschedule"><i class="fa fa-check"></i> Reschedule</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  $('body').append(modalHtml);
  setTimeout(function() { $('#dd-cc-reschedule-modal').addClass('open'); }, 10);

  $('#dd-cc-reschedule-modal').on('click', function(e) {
    if (e.target === this) $(this).removeClass('open');
  });

  $('#dd-cc-submit-reschedule').on('click', function() {
    var reschedCaseId = $('#dd-cc-reschedule-case-id').val();
    var dateVal = $('#dd-cc-reschedule-date').val();
    if (!dateVal) { ccAlert('Missing Field', 'Please select a date and time.', 'warning'); return; }

    var $btn = $(this);
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Rescheduling...');

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + reschedCaseId + '/schedule',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        scheduledDate: new Date(dateVal).toISOString(),
        judgeID: userId,
        judgeName: userName
      }),
      success: function() {
        $('#dd-cc-reschedule-modal').removeClass('open');
        ccLoadScheduled();
        ddToast('Court date updated', 'success');
      },
      error: function(xhr) {
        ccAlert('Reschedule Failed', (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.', 'danger');
      },
      complete: function() {
        $btn.prop('disabled', false).html('<i class="fa fa-check"></i> Reschedule');
      }
    });
  });
};

window.ccReturnToQueue = function(caseId, civilianName) {
  ccShowConfirm({
    icon: 'fa-arrow-rotate-left',
    iconClass: 'warning',
    title: 'Return to Queue',
    message: 'Return ' + civilianName + '\'s case to the review queue? The scheduled date will be cleared.',
    confirmLabel: 'Return to Queue',
    confirmIcon: 'fa-arrow-rotate-left',
    confirmClass: 'dd-btn-primary',
    onConfirm: function() {
      $.ajax({
        url: API_URL + '/api/v2/court-cases/' + caseId + '/status',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
          status: 'in_review',
          userID: userId,
          userName: userName,
          notes: 'Returned to queue by judge'
        }),
        success: function() {
          $('#dd-cc-case-detail-modal').removeClass('open');
          ccLoadQueue();
          ccLoadScheduled();
          ddToast('Case returned to queue', 'success');
        },
        error: function(xhr) {
          ccAlert('Failed', (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.', 'danger');
        }
      });
    }
  });
};

// ── Case Search modal (embedded court-cases panel) ──
window.ddCcOpenCaseSearch = function() {
  $('#dd-cc-search-modal').remove();

  var modalHtml = '<div class="dd-cc-modal-overlay" id="dd-cc-search-modal">' +
    '<div class="dd-cc-modal" style="max-width:640px;width:100%;">' +
      '<div class="dd-cc-modal-head">' +
        '<div class="dd-cc-modal-title"><i class="fa fa-magnifying-glass" style="color:var(--dd-accent);margin-right:0.4rem;"></i> Case Search</div>' +
        '<button class="dd-cc-modal-close" onclick="$(\'#dd-cc-search-modal\').removeClass(\'open\')">&times;</button>' +
      '</div>' +
      '<div class="dd-cc-modal-body" style="padding:1rem 1.25rem;">' +
        '<div style="position:relative;margin-bottom:0.875rem;">' +
          '<i class="fa fa-magnifying-glass" style="position:absolute;left:0.85rem;top:50%;transform:translateY(-50%);color:var(--dd-text-dim);font-size:0.85rem;pointer-events:none;"></i>' +
          '<input id="dd-cc-search-input" type="text" autocomplete="off" placeholder="Search by case number (CC-YYYY-NNNNNN) or civilian name…"' +
            ' style="width:100%;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;color:#fff;font-family:inherit;font-size:0.9rem;padding:0.7rem 0.9rem 0.7rem 2.4rem;outline:none;">' +
        '</div>' +
        '<div id="dd-cc-search-results" style="max-height:55vh;overflow-y:auto;display:flex;flex-direction:column;gap:0.5rem;">' +
          '<div style="padding:1.5rem;text-align:center;color:var(--dd-text-dim);font-size:0.85rem;"><i class="fa fa-magnifying-glass" style="display:block;font-size:1.5rem;margin-bottom:0.5rem;opacity:0.4;"></i>Type to search court cases.</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
  $('body').append(modalHtml);

  setTimeout(function() {
    $('#dd-cc-search-modal').addClass('open');
    $('#dd-cc-search-input').trigger('focus');
  }, 10);

  $('#dd-cc-search-modal').on('click', function(e) {
    if (e.target === this) $(this).removeClass('open');
  });
  var escHandler = function(e) {
    if (e.key === 'Escape' && $('#dd-cc-search-modal').hasClass('open')) {
      $('#dd-cc-search-modal').removeClass('open');
      $(document).off('keydown.ddCcSearch');
    }
  };
  $(document).off('keydown.ddCcSearch').on('keydown.ddCcSearch', escHandler);

  var timer = null;
  $('#dd-cc-search-input').on('input', function() {
    var q = $(this).val();
    clearTimeout(timer);
    timer = setTimeout(function() { ddCcRunSearch(q); }, 250);
  });
};

function ddCcRunSearch(rawQuery) {
  var query = (rawQuery || '').trim();
  var $results = $('#dd-cc-search-results');
  if (!query) {
    $results.html('<div style="padding:1.5rem;text-align:center;color:var(--dd-text-dim);font-size:0.85rem;"><i class="fa fa-magnifying-glass" style="display:block;font-size:1.5rem;margin-bottom:0.5rem;opacity:0.4;"></i>Type to search court cases.</div>');
    return;
  }
  if (!communityId || !userId) {
    $results.html('<div style="padding:1rem;text-align:center;color:var(--dd-red);font-size:0.85rem;">Missing community or user context.</div>');
    return;
  }
  $results.html('<div class="dd-spinner" style="margin:2rem auto;"></div>');

  var payload = { query: query, communityId: communityId, userId: userId, page: 0, limit: 25 };

  $.ajax({
    url: API_URL + '/api/v2/court-cases/search',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload),
    success: function(resp) { ddCcRenderSearchResults(resp.data || []); },
    error: function(xhr) {
      if (xhr.status === 403) {
        $results.html('<div style="padding:1rem;text-align:center;color:var(--dd-text-muted);font-size:0.85rem;"><i class="fa fa-ban" style="margin-right:0.4rem;"></i>You don\'t have access to search cases in this community.</div>');
      } else {
        $results.html('<div style="padding:1rem;text-align:center;color:var(--dd-red);font-size:0.85rem;">Search failed.</div>');
      }
    }
  });
}

function ddCcRenderSearchResults(results) {
  var $results = $('#dd-cc-search-results');
  if (!results.length) {
    $results.html('<div style="padding:1.5rem;text-align:center;color:var(--dd-text-dim);font-size:0.85rem;">No cases match.</div>');
    return;
  }
  var html = results.map(function(c) {
    var d = c.courtCase || c.details || c;
    var caseId = c._id || '';
    var caseNumber = d.caseNumber || '';
    var civilianName = d.civilianName || 'Unknown Civilian';
    var status = (d.status || 'submitted').replace('_', ' ');
    var dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '';
    var itemCount = (d.contestedItems || []).length;
    return '<div onclick="ddCcViewCaseFromSearch(\'' + caseId + '\')"' +
           ' style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0.875rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;cursor:pointer;transition:border-color 0.15s,background 0.15s;"' +
           ' onmouseover="this.style.borderColor=\'rgba(139,92,246,0.3)\';this.style.background=\'var(--dd-glass-hover,var(--dd-glass))\';"' +
           ' onmouseout="this.style.borderColor=\'var(--dd-glass-border)\';this.style.background=\'var(--dd-glass)\';">' +
             '<div style="flex:1;min-width:0;">' +
               '<div style="font-weight:600;font-size:0.875rem;margin-bottom:0.2rem;color:#fff;">' +
                 (caseNumber ? '<span style="font-family:JetBrains Mono,ui-monospace,monospace;font-size:0.72rem;font-weight:600;color:var(--dd-accent);background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.2);padding:0.1rem 0.4rem;border-radius:4px;margin-right:0.4rem;">' + window.esc(caseNumber) + '</span>' : '') +
                 window.esc(civilianName) +
               '</div>' +
               '<div style="font-size:0.75rem;color:var(--dd-text-muted);display:flex;gap:0.6rem;flex-wrap:wrap;">' +
                 '<span><i class="fa fa-circle-info" style="margin-right:0.2rem;"></i>' + window.esc(status) + '</span>' +
                 '<span><i class="fa fa-file-lines" style="margin-right:0.2rem;"></i>' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
                 (dateStr ? '<span><i class="fa fa-clock" style="margin-right:0.2rem;"></i>' + window.esc(dateStr) + '</span>' : '') +
               '</div>' +
             '</div>' +
             '<i class="fa fa-arrow-right" style="color:var(--dd-text-dim);font-size:0.75rem;"></i>' +
           '</div>';
  }).join('');
  $results.html(html);
}

window.ddCcViewCaseFromSearch = function(caseId) {
  $('#dd-cc-search-modal').removeClass('open');
  if (typeof window.ccViewCase === 'function') {
    window.ccViewCase(caseId);
  } else if (typeof ccViewCase === 'function') {
    ccViewCase(caseId);
  } else {
    window.location.href = '/court-cases?c=' + encodeURIComponent(communityId) + '&caseId=' + encodeURIComponent(caseId);
  }
};

window.ccOpenCreateSession = function() {
  if (!ccIsJudicial) return;
  $('#dd-cc-create-session-modal').remove();

  var modalHtml = '<div class="dd-cc-modal-overlay" id="dd-cc-create-session-modal">' +
    '<div class="dd-cc-modal">' +
      '<div class="dd-cc-modal-head">' +
        '<div class="dd-cc-modal-title"><i class="fa fa-gavel" style="color:var(--dd-accent);margin-right:0.4rem;"></i> Create Court Session</div>' +
        '<button class="dd-cc-modal-close" onclick="$(\'#dd-cc-create-session-modal\').removeClass(\'open\')">&times;</button>' +
      '</div>' +
      '<div class="dd-cc-modal-body">' +
        '<div class="dd-cc-form-group">' +
          '<label class="dd-cc-form-label">Session Title</label>' +
          '<input type="text" class="dd-cc-form-input" id="dd-cc-session-title" placeholder="e.g., Morning Docket - Traffic Cases">' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
          '<div class="dd-cc-form-group">' +
            '<label class="dd-cc-form-label">Scheduled Start</label>' +
            '<input type="datetime-local" class="dd-cc-form-input" id="dd-cc-session-start">' +
          '</div>' +
          '<div class="dd-cc-form-group">' +
            '<label class="dd-cc-form-label">Scheduled End <span style="color:var(--dd-text-dim);font-weight:400;">(optional)</span></label>' +
            '<input type="datetime-local" class="dd-cc-form-input" id="dd-cc-session-end">' +
          '</div>' +
        '</div>' +
        '<div class="dd-cc-form-group">' +
          '<label class="dd-cc-form-label">Select Cases for Docket</label>' +
          '<div class="dd-cc-docket-list" id="dd-cc-docket-list">' +
            '<div class="dd-spinner" style="margin:1rem auto;"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-cc-modal-footer">' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="$(\'#dd-cc-create-session-modal\').removeClass(\'open\')">Cancel</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-primary" id="dd-cc-submit-session"><i class="fa fa-plus"></i> Create Session</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  $('body').append(modalHtml);
  setTimeout(function() { $('#dd-cc-create-session-modal').addClass('open'); }, 10);

  $('#dd-cc-create-session-modal').on('click', function(e) {
    if (e.target === this) $(this).removeClass('open');
  });

  // Load docket cases (scheduled cases not already in a session)
  $.ajax({
    url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=scheduled&unassigned=true&limit=50',
    method: 'GET',
    success: function(resp) {
      var cases = resp.data || [];
      var $list = $('#dd-cc-docket-list');
      if (cases.length === 0) {
        $list.html(
          '<div style="color:var(--dd-text-dim);font-size:0.85rem;padding:0.5rem 0.5rem 0.25rem;">No scheduled cases available that are not already assigned to a court session.</div>' +
          '<ol style="color:var(--dd-text-muted);font-size:0.78rem;margin:0.25rem 0 0 1.5rem;padding:0;line-height:1.7;">' +
            '<li>Go to the <strong style="color:var(--dd-text-secondary);">Case Queue</strong> tab and click <strong style="color:var(--dd-text-secondary);">Assign</strong> on each case.</li>' +
            '<li>Click <strong style="color:var(--dd-text-secondary);">View</strong> to open the case details.</li>' +
            '<li>Press <strong style="color:var(--dd-text-secondary);">Schedule</strong> and pick a court date for the case.</li>' +
            '<li>Come back here and click <strong style="color:var(--dd-text-secondary);">Create Session</strong> — all scheduled cases not already in a session will appear as checkboxes.</li>' +
          '</ol>'
        );
        return;
      }
      var html = cases.map(function(c) {
        var d = c.courtCase || c.details || c;
        var caseId = c._id || '';
        var itemCount = (d.contestedItems || []).length;
        return '<label class="dd-cc-docket-item">' +
          '<input type="checkbox" class="dd-cc-docket-checkbox" value="' + caseId + '">' +
          '<div>' +
            '<div class="dd-cc-docket-item-name">' +
              ccCaseNumberPill(d.caseNumber, { marginRight: '0.4rem' }) +
              esc(d.civilianName || 'Unknown') +
            '</div>' +
            '<div class="dd-cc-docket-item-detail">' + itemCount + ' contested item' + (itemCount !== 1 ? 's' : '') + ' &middot; ' + (ccIsValidDate(d.scheduledDate) ? new Date(d.scheduledDate).toLocaleDateString() : 'No date') + '</div>' +
          '</div>' +
        '</label>';
      }).join('');
      $list.html(html);
    },
    error: function() {
      $('#dd-cc-docket-list').html('<div style="color:var(--dd-text-dim);font-size:0.8rem;padding:0.5rem;">Failed to load cases.</div>');
    }
  });

  // Submit handler
  $('#dd-cc-submit-session').on('click', function() {
    var title = $('#dd-cc-session-title').val().trim();
    var startVal = $('#dd-cc-session-start').val();
    var endVal = $('#dd-cc-session-end').val();

    if (!title) { ccAlert('Missing Field', 'Please enter a session title.', 'warning'); return; }
    if (!startVal) { ccAlert('Missing Field', 'Please set a start time.', 'warning'); return; }

    var selectedCases = [];
    $('.dd-cc-docket-checkbox:checked').each(function(i) {
      selectedCases.push({ courtCaseID: $(this).val(), order: i + 1, status: 'pending' });
    });

    if (selectedCases.length === 0) { ccAlert('No Cases Selected', 'Please select at least one case for the docket.', 'warning'); return; }

    var payload = {
      communityID: communityId,
      departmentID: departmentId || '',
      judgeID: userId,
      judgeName: userName,
      title: title,
      docket: selectedCases,
      scheduledStart: new Date(startVal).toISOString(),
      scheduledEnd: endVal ? new Date(endVal).toISOString() : ''
    };

    var $btn = $(this);
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');

    $.ajax({
      url: API_URL + '/api/v2/court-sessions',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function() {
        $('#dd-cc-create-session-modal').removeClass('open');
        ccLoadQueue();
        ccLoadScheduled();
        ccLoadActiveSessions();
      },
      error: function(xhr) {
        ccAlert('Create Failed', (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.', 'danger');
      },
      complete: function() {
        $btn.prop('disabled', false).html('<i class="fa fa-plus"></i> Create Session');
      }
    });
  });
};

window.ccEditSession = function(sessionId) {
  if (!ccIsJudicial) return;
  // Find the session from cache
  var session = ccCachedActiveSessions.find(function(s) { return s._id === sessionId; });
  if (!session) { ccAlert('Not Found', 'Session not found in cache. Try refreshing.', 'warning'); return; }
  var d = session.courtSession || session.details || session;

  $('#dd-cc-edit-session-modal').remove();

  // Format datetime-local values
  var startVal = d.scheduledStart ? new Date(d.scheduledStart).toISOString().slice(0, 16) : '';
  var endVal = d.scheduledEnd ? new Date(d.scheduledEnd).toISOString().slice(0, 16) : '';

  var modalHtml = '<div class="dd-cc-modal-overlay" id="dd-cc-edit-session-modal">' +
    '<div class="dd-cc-modal">' +
      '<div class="dd-cc-modal-head">' +
        '<div class="dd-cc-modal-title"><i class="fa fa-pen" style="color:var(--dd-accent);margin-right:0.4rem;"></i> Edit Court Session</div>' +
        '<button class="dd-cc-modal-close" onclick="$(\'#dd-cc-edit-session-modal\').removeClass(\'open\')">&times;</button>' +
      '</div>' +
      '<div class="dd-cc-modal-body">' +
        '<div class="dd-cc-form-group">' +
          '<label class="dd-cc-form-label">Session Title</label>' +
          '<input type="text" class="dd-cc-form-input" id="dd-cc-edit-title" value="' + esc(d.title || '') + '">' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
          '<div class="dd-cc-form-group">' +
            '<label class="dd-cc-form-label">Scheduled Start</label>' +
            '<input type="datetime-local" class="dd-cc-form-input" id="dd-cc-edit-start" value="' + startVal + '">' +
          '</div>' +
          '<div class="dd-cc-form-group">' +
            '<label class="dd-cc-form-label">Scheduled End <span style="color:var(--dd-text-dim);font-weight:400;">(optional)</span></label>' +
            '<input type="datetime-local" class="dd-cc-form-input" id="dd-cc-edit-end" value="' + endVal + '">' +
          '</div>' +
        '</div>' +
        '<div class="dd-cc-form-group">' +
          '<label class="dd-cc-form-label">Docket Cases</label>' +
          '<div class="dd-cc-docket-list" id="dd-cc-edit-docket-list">' +
            '<div class="dd-spinner" style="margin:1rem auto;"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-cc-modal-footer">' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="$(\'#dd-cc-edit-session-modal\').removeClass(\'open\')">Cancel</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-primary" id="dd-cc-save-session"><i class="fa fa-save"></i> Save Changes</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  $('body').append(modalHtml);
  setTimeout(function() { $('#dd-cc-edit-session-modal').addClass('open'); }, 10);

  $('#dd-cc-edit-session-modal').on('click', function(e) {
    if (e.target === this) $(this).removeClass('open');
  });

  // Existing docket case IDs for pre-checking
  var existingCaseIDs = (d.docket || []).map(function(e) { return e.courtCaseID; });

  // Load scheduled cases for docket editing (unassigned + cases already in this session)
  $.ajax({
    url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=scheduled&unassigned=true&limit=50',
    method: 'GET',
    success: function(resp) {
      var cases = resp.data || [];
      // Merge in existing docket cases that won't appear in the unassigned query
      var fetchedIDs = cases.map(function(c) { return c._id; });
      (d.docket || []).forEach(function(entry) {
        if (fetchedIDs.indexOf(entry.courtCaseID) === -1) {
          cases.push({ _id: entry.courtCaseID, courtCase: { civilianName: entry.civilianName, caseNumber: entry.caseNumber } });
        }
      });
      var $list = $('#dd-cc-edit-docket-list');
      if (cases.length === 0) {
        $list.html('<div style="color:var(--dd-text-dim);font-size:0.8rem;padding:0.5rem;">No additional scheduled cases available. Schedule more cases from the Case Queue tab first.</div>');
        return;
      }
      var html = cases.map(function(c) {
        var cd = c.courtCase || c.details || c;
        var caseId = c._id || '';
        var itemCount = (cd.contestedItems || []).length;
        var checked = existingCaseIDs.indexOf(caseId) !== -1 ? ' checked' : '';
        return '<label class="dd-cc-docket-item">' +
          '<input type="checkbox" class="dd-cc-edit-docket-checkbox" value="' + caseId + '"' + checked + '>' +
          '<div>' +
            '<div class="dd-cc-docket-item-name">' +
              ccCaseNumberPill(cd.caseNumber, { marginRight: '0.4rem' }) +
              esc(cd.civilianName || 'Unknown') +
            '</div>' +
            '<div class="dd-cc-docket-item-detail">' + itemCount + ' contested item' + (itemCount !== 1 ? 's' : '') + '</div>' +
          '</div>' +
        '</label>';
      }).join('');
      $list.html(html);
    },
    error: function() {
      $('#dd-cc-edit-docket-list').html('<div style="color:var(--dd-text-dim);font-size:0.8rem;padding:0.5rem;">Failed to load cases.</div>');
    }
  });

  // Save handler
  $('#dd-cc-save-session').on('click', function() {
    var title = $('#dd-cc-edit-title').val().trim();
    var startVal = $('#dd-cc-edit-start').val();
    var endVal = $('#dd-cc-edit-end').val();

    if (!title) { ccAlert('Missing Field', 'Please enter a session title.', 'warning'); return; }

    var selectedCases = [];
    $('.dd-cc-edit-docket-checkbox:checked').each(function(i) {
      selectedCases.push({ courtCaseID: $(this).val(), order: i + 1, status: 'pending' });
    });

    var payload = {
      title: title,
      docket: selectedCases,
      scheduledStart: startVal ? new Date(startVal).toISOString() : '',
      scheduledEnd: endVal ? new Date(endVal).toISOString() : ''
    };

    var $btn = $(this);
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Saving...');

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function() {
        $('#dd-cc-edit-session-modal').removeClass('open');
        ccLoadActiveSessions();
        ccLoadScheduled();
      },
      error: function(xhr) {
        ccAlert('Update Failed', (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.', 'danger');
      },
      complete: function() {
        $btn.prop('disabled', false).html('<i class="fa fa-save"></i> Save Changes');
      }
    });
  });
};

// Reusable custom confirm modal — replaces native confirm()
// opts: { icon, iconClass, title, message, confirmLabel, confirmClass, onConfirm }
function ccShowConfirm(opts) {
  $('#dd-cc-confirm-modal').remove();
  var iconClass = opts.iconClass || 'danger';
  var confirmClass = opts.confirmClass || 'dd-btn-danger';
  var modalHtml = '<div class="dd-cc-modal-overlay" id="dd-cc-confirm-modal">' +
    '<div class="dd-cc-modal" style="max-width:400px;">' +
      '<div class="dd-cc-modal-body" style="padding:2rem 1.5rem 1rem;">' +
        '<div class="dd-cc-confirm-icon ' + iconClass + '"><i class="fa ' + esc(opts.icon || 'fa-triangle-exclamation') + '"></i></div>' +
        '<div class="dd-cc-confirm-title">' + esc(opts.title || 'Are you sure?') + '</div>' +
        '<div class="dd-cc-confirm-text">' + esc(opts.message || '') + '</div>' +
      '</div>' +
      '<div class="dd-cc-modal-footer" style="justify-content:center;">' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" id="dd-cc-confirm-cancel">Cancel</button>' +
        '<button class="dd-btn dd-btn-sm ' + confirmClass + '" id="dd-cc-confirm-ok"><i class="fa ' + esc(opts.confirmIcon || opts.icon || 'fa-check') + '"></i> ' + esc(opts.confirmLabel || 'Confirm') + '</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  $('body').append(modalHtml);
  setTimeout(function() { $('#dd-cc-confirm-modal').addClass('open'); }, 10);

  function closeConfirm() {
    $('#dd-cc-confirm-modal').removeClass('open');
    setTimeout(function() { $('#dd-cc-confirm-modal').remove(); }, 300);
  }

  $('#dd-cc-confirm-cancel').on('click', closeConfirm);
  $('#dd-cc-confirm-modal').on('click', function(e) {
    if (e.target === this) closeConfirm();
  });
  $('#dd-cc-confirm-ok').on('click', function() {
    closeConfirm();
    if (opts.onConfirm) opts.onConfirm();
  });
}

// Alert modal — single-button variant (replaces native alert())
function ccAlert(title, message, iconClass) {
  ccShowConfirm({
    icon: iconClass === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation',
    iconClass: iconClass || 'warning',
    title: title,
    message: message,
    confirmLabel: 'OK',
    confirmIcon: 'fa-check',
    confirmClass: 'dd-btn-outline',
    onConfirm: function() {}
  });
  // Hide the cancel button for alert-style modals
  setTimeout(function() { $('#dd-cc-confirm-cancel').hide(); }, 15);
}

window.ccDeleteCase = function(caseId, civilianName) {
  // Backend enforces auth (owner or judicial). Frontend just renders the confirm dialog.
  ccShowConfirm({
    icon: 'fa-trash',
    iconClass: 'danger',
    title: 'Delete Court Case',
    message: 'Permanently delete the court case for ' + esc(civilianName || 'this individual') + '? If the case is not completed, contested charges will be reverted. This cannot be undone.',
    confirmLabel: 'Delete Case',
    confirmIcon: 'fa-trash',
    confirmClass: 'dd-btn-danger',
    onConfirm: function() {
      $.ajax({
        url: API_URL + '/api/v2/court-cases/' + caseId + '?userId=' + encodeURIComponent(userId || ''),
        method: 'DELETE',
        success: function() {
          $('#dd-cc-case-detail-modal').removeClass('open');
          ddToast('Court case deleted successfully', 'success');
          ccLoadQueue();
          ccLoadScheduled();
        },
        error: function(xhr) {
          ccAlert('Delete Failed', (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.', 'danger');
        }
      });
    }
  });
};

window.ccDeleteSession = function(sessionId) {
  if (!ccIsJudicial) return;
  ccShowConfirm({
    icon: 'fa-trash',
    iconClass: 'danger',
    title: 'Delete Court Session',
    message: 'This will permanently remove the session and unlink all cases from it. This cannot be undone.',
    confirmLabel: 'Delete Session',
    confirmIcon: 'fa-trash',
    confirmClass: 'dd-btn-danger',
    onConfirm: function() {
      $.ajax({
        url: API_URL + '/api/v2/court-sessions/' + sessionId,
        method: 'DELETE',
        success: function() {
          ccLoadActiveSessions();
          ccLoadScheduled();
          ccLoadQueue();
        },
        error: function(xhr) {
          ccShowConfirm({
            icon: 'fa-circle-exclamation',
            iconClass: 'danger',
            title: 'Delete Failed',
            message: (xhr.responseJSON && xhr.responseJSON.message) || 'An unknown error occurred.',
            confirmLabel: 'OK',
            confirmIcon: 'fa-check',
            confirmClass: 'dd-btn dd-btn-sm dd-btn-outline',
            onConfirm: function() {}
          });
        }
      });
    }
  });
};

function renderPenalCodesPanel() {
  return '<div class="dd-card-header">' +
      '<div class="dd-card-header-left">' +
        '<div class="dd-card-icon" style="background:rgba(251,191,36,0.15);color:var(--dd-amber);"><i class="fa fa-scale-balanced"></i></div>' +
        '<div><h3 class="dd-card-title">Penal Codes</h3><p class="dd-card-subtitle">Manage violations &amp; penalties</p></div>' +
      '</div>' +
      '<div class="dd-card-header-right">' +
        '<button class="dd-pc-currency-btn" onclick="pcShowCurrencyModal()" title="Change currency">' +
          '<span class="dd-pc-currency-sym">' + esc(pcGetCurrencySymbol(penalCodesCurrency)) + '</span>' +
          '<span>' + esc(penalCodesCurrency) + '</span>' +
          '<i class="fa fa-chevron-down"></i>' +
        '</button>' +
        '<button class="dd-btn dd-btn-sm dd-btn-outline" onclick="pcResetToDefaults()" title="Reset to Defaults"><i class="fa fa-arrows-rotate"></i> Reset</button> ' +
        '<button class="dd-btn dd-btn-sm dd-btn-primary" onclick="pcShowAddCategory()"><i class="fa fa-plus"></i> Category</button>' +
      '</div>' +
    '</div>' +
    '<div class="dd-card-body">' +
      '<div class="dd-pc-search-wrap">' +
        '<i class="fa fa-search"></i>' +
        '<input type="text" class="dd-pc-search-input dd-pc-search" placeholder="Search violations..." oninput="pcFilterViolations(this.value)">' +
      '</div>' +
      '<div class="dd-pc-loading dd-spinner"></div>' +
      '<div class="dd-pc-empty dd-empty" style="display:none;">' +
        '<div class="dd-empty-icon-wrap"><i class="fa fa-scale-balanced"></i></div>' +
        '<p class="dd-empty-title">No penal codes found</p>' +
        '<p class="dd-empty-sub">Add categories and violations to get started</p>' +
      '</div>' +
      '<div class="dd-pc-categories"></div>' +
    '</div>';
}

function loadPenalCodes() {
  if (!communityId) { console.warn('[PenalCodes] No communityId'); return; }
  $('.dd-pc-loading').show();
  $('.dd-pc-empty').hide();
  $('.dd-pc-categories').empty();

  $.ajax({
    url: API_URL + '/api/v1/community/' + communityId + '/penal-codes',
    method: 'GET',
    success: function(data) {
      penalCodesData = (data && data.categories) || [];
      penalCodesCurrency = (data && data.currency) || 'USD';
      // Load currencies from API, fall back to defaults
      pcCurrencyList = (data && data.currencies && data.currencies.length > 0)
        ? data.currencies
        : pcDefaultCurrencies.slice();
      pcBuildKnownCurrencies();
      // Update header button to reflect loaded currency
      $('#dd-panel-penalCodes .dd-pc-currency-btn .dd-pc-currency-sym').text(pcGetCurrencySymbol(penalCodesCurrency));
      $('#dd-panel-penalCodes .dd-pc-currency-btn span:eq(1)').text(penalCodesCurrency);
      renderPenalCodesCategories(penalCodesData);
    },
    error: function(xhr, status, err) {
      console.error('[PenalCodes] Error:', status, err, xhr.status, xhr.responseText);
      $('.dd-pc-loading').hide();
      $('.dd-pc-empty').show().find('.dd-empty-title').text('Unable to load penal codes');
      $('.dd-pc-empty').find('.dd-empty-sub').text(err || status || 'Check console for details');
    }
  });
}

// Category color config for visual variety
var pcCategoryColors = {
  'traffic violations':   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: 'fa-car' },
  'petty misdemeanors':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'fa-scale-balanced' },
  'misdemeanors':         { color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: 'fa-gavel' },
  'felonies':             { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: 'fa-handcuffs' },
  'other':                { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: 'fa-circle-exclamation' }
};

function pcGetCategoryStyle(catName) {
  var key = (catName || '').toLowerCase().trim();
  return pcCategoryColors[key] || { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: 'fa-folder' };
}

function renderPenalCodesCategories(categories) {
  $('.dd-pc-loading').hide();
  var $container = $('.dd-pc-categories');
  $container.empty();

  if (!categories || categories.length === 0) {
    $('.dd-pc-empty').show();
    return;
  }
  $('.dd-pc-empty').hide();

  categories.forEach(function(cat, catIdx) {
    var style = pcGetCategoryStyle(cat.name);
    var violations = cat.violations || [];
    var violationRows = '';

    violations.forEach(function(v, vIdx) {
      var rowId = 'pc-row-' + catIdx + '-' + vIdx;
      violationRows += '<tr class="dd-pc-v-row" id="' + rowId + '-row" onclick="pcToggleExplanation(\'' + rowId + '\')">' +
        '<td class="dd-pc-v-name"><span>' + esc(v.name || '') + '</span> <i class="fa fa-chevron-down dd-pc-v-chevron"></i></td>' +
        '<td class="dd-pc-v-jail">' + esc(v.jailTime || 'N/A') + '</td>' +
        '<td class="dd-pc-v-fine">' + pcFormatFine(v.fine) + '</td>' +
        '<td class="dd-pc-v-explanation" title="' + esc(v.explanation || '') + '">' + esc(v.explanation || '\u2014') + '</td>' +
        '<td class="dd-pc-v-actions">' +
          '<button class="dd-pc-icon-btn" onclick="event.stopPropagation();pcEditViolation(' + catIdx + ',' + vIdx + ')" title="Edit"><i class="fa fa-pen"></i></button>' +
          '<button class="dd-pc-icon-btn danger" onclick="event.stopPropagation();pcDeleteViolation(' + catIdx + ',' + vIdx + ')" title="Delete"><i class="fa fa-trash"></i></button>' +
        '</td>' +
      '</tr>' +
      '<tr class="dd-pc-v-explain-row" id="' + rowId + '">' +
        '<td colspan="5" class="dd-pc-v-explain-cell">' +
          '<div class="dd-pc-v-explain-content">' + esc(v.explanation || 'No explanation provided.') + '</div>' +
        '</td>' +
      '</tr>';
    });

    var catHtml = '<div class="dd-pc-category" style="--pc-cat-color:' + style.color + ';--pc-cat-bg:' + style.bg + ';">' +
      '<div class="dd-pc-cat-header" onclick="pcToggleCategory(' + catIdx + ')">' +
        '<div class="dd-pc-cat-left">' +
          '<i class="fa fa-chevron-down dd-pc-chevron dd-pc-chevron-' + catIdx + '"></i>' +
          '<div class="dd-pc-cat-icon"><i class="fa ' + style.icon + '"></i></div>' +
          '<span class="dd-pc-cat-name">' + esc(cat.name || 'Category') + '</span>' +
          '<span class="dd-pc-cat-count">' + violations.length + '</span>' +
        '</div>' +
        '<div class="dd-pc-cat-actions" onclick="event.stopPropagation();">' +
          '<button class="dd-pc-add-btn" onclick="pcShowAddViolation(' + catIdx + ')"><i class="fa fa-plus"></i> Violation</button>' +
          '<button class="dd-pc-icon-btn" onclick="pcEditCategory(' + catIdx + ')" title="Edit Category"><i class="fa fa-pen"></i></button>' +
          '<button class="dd-pc-icon-btn danger" onclick="pcDeleteCategory(' + catIdx + ')" title="Delete Category"><i class="fa fa-trash"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="dd-pc-cat-body dd-pc-cat-body-' + catIdx + '">' +
        (violationRows ?
          '<div class="dd-pc-mobile-hint"><i class="fa fa-hand-pointer" style="margin-right:0.25rem;"></i> Tap a violation to see details</div>' +
          '<table class="dd-pc-table">' +
            '<thead><tr>' +
              '<th>Violation</th>' +
              '<th>Jail Time</th>' +
              '<th>Fine</th>' +
              '<th>Explanation</th>' +
              '<th></th>' +
            '</tr></thead>' +
            '<tbody>' + violationRows + '</tbody>' +
          '</table>'
        : '<div class="dd-pc-empty-cat">No violations in this category</div>') +
      '</div>' +
    '</div>';

    $container.append(catHtml);
  });

  // Auto-expand first category
  if (categories.length > 0) pcToggleCategory(0);
}

window.pcToggleExplanation = function(rowId) {
  var $row = $('#' + rowId);
  var $tr = $('#' + rowId + '-row');
  if ($row.length) {
    $row.toggleClass('open');
    $tr.toggleClass('expanded');
  }
};

window.pcToggleCategory = function(catIdx) {
  var $body = $('.dd-pc-cat-body-' + catIdx);
  var $chevron = $('.dd-pc-chevron-' + catIdx);
  if ($body.hasClass('open')) {
    $body.slideUp(200, function() { $body.removeClass('open'); });
  } else {
    $body.addClass('open').hide().slideDown(200);
  }
  $chevron.toggleClass('expanded');
};

window.pcFilterViolations = function(query) {
  var q = query.toLowerCase();
  if (!q) {
    renderPenalCodesCategories(penalCodesData);
    return;
  }
  var filtered = penalCodesData.map(function(cat) {
    var matchedViolations = (cat.violations || []).filter(function(v) {
      return (v.name || '').toLowerCase().indexOf(q) !== -1 ||
             (v.jailTime || '').toLowerCase().indexOf(q) !== -1 ||
             String(v.fine || '').indexOf(q) !== -1 ||
             (v.explanation || '').toLowerCase().indexOf(q) !== -1;
    });
    if (matchedViolations.length > 0) {
      return Object.assign({}, cat, { violations: matchedViolations });
    }
    return null;
  }).filter(Boolean);
  renderPenalCodesCategories(filtered);
};

function pcSaveAll(callback) {
  $.ajax({
    url: API_URL + '/api/v1/community/' + communityId + '/penal-codes',
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify({ categories: penalCodesData, currency: penalCodesCurrency, currencies: pcCurrencyList }),
    success: function() {
      if (callback) callback();
    },
    error: function() {
      alert('Failed to save penal codes.');
    }
  });
}

// If current currency isn't in the list, add it as custom
function pcEnsureCurrentCurrency() {
  if (!penalCodesCurrency) return;
  var found = pcCurrencyList.some(function(c) { return c.code === penalCodesCurrency; });
  if (!found) {
    pcCurrencyList.push({ code: penalCodesCurrency, symbol: penalCodesCurrency, builtin: false });
  }
}

window.pcShowCurrencyModal = function() {
  pcEnsureCurrentCurrency();
  var $overlay = $('<div class="dd-pc-modal-overlay">');
  var $modal = $(
    '<div class="dd-pc-modal wide">' +
      '<h3>Currency</h3>' +
      '<div class="dd-pc-currency-list" id="pc-currency-list"></div>' +
      '<label>Add Custom Currency</label>' +
      '<div class="dd-pc-currency-add-row">' +
        '<input type="text" id="pc-currency-new-symbol" placeholder="Symbol (e.g. R$, kr)" style="flex:0.6;">' +
        '<input type="text" id="pc-currency-new-code" placeholder="Code (e.g. BRL)" style="flex:0.4;">' +
        '<button class="dd-pc-currency-add-btn" id="pc-currency-add-btn"><i class="fa fa-plus"></i></button>' +
      '</div>' +
      '<div class="dd-pc-modal-footer">' +
        '<button class="dd-pc-modal-btn cancel" id="pc-currency-close">Close</button>' +
      '</div>' +
    '</div>'
  );
  $overlay.append($modal);
  $('body').append($overlay);

  function renderCurrencyList() {
    var html = '';
    pcCurrencyList.forEach(function(c, idx) {
      var isActive = c.code === penalCodesCurrency;
      html += '<div class="dd-pc-currency-item' + (isActive ? ' active' : '') + '" data-idx="' + idx + '">' +
        '<div class="dd-pc-currency-item-sym">' + esc(c.symbol) + '</div>' +
        '<div class="dd-pc-currency-item-label">' + esc(c.code) + (isActive ? ' <span style="color:var(--dd-amber);font-size:0.6875rem;font-weight:500;">\u2022 Active</span>' : '') + '</div>' +
        '<div class="dd-pc-currency-item-actions">' +
          (!isActive ? '<button onclick="event.stopPropagation();pcSelectCurrency(' + idx + ')" title="Use this currency"><i class="fa fa-check"></i></button>' : '') +
          (!c.builtin ? '<button onclick="event.stopPropagation();pcEditCurrencyItem(' + idx + ')" title="Edit"><i class="fa fa-pen"></i></button>' : '') +
          (!c.builtin && !isActive ? '<button class="delete" onclick="event.stopPropagation();pcDeleteCurrencyItem(' + idx + ')" title="Delete"><i class="fa fa-trash"></i></button>' : '') +
        '</div>' +
      '</div>';
    });
    $('#pc-currency-list').html(html);

    // Click row to select
    $('#pc-currency-list .dd-pc-currency-item').on('click', function() {
      var idx = parseInt($(this).data('idx'));
      pcSelectCurrency(idx);
    });
  }

  window.pcSelectCurrency = function(idx) {
    var c = pcCurrencyList[idx];
    if (!c) return;
    penalCodesCurrency = c.code;
    pcBuildKnownCurrencies();
    // Update UI immediately
    renderCurrencyList();
    $('#dd-panel-penalCodes .dd-pc-currency-btn .dd-pc-currency-sym').text(pcGetCurrencySymbol(penalCodesCurrency));
    $('#dd-panel-penalCodes .dd-pc-currency-btn span:eq(1)').text(penalCodesCurrency);
    renderPenalCodesCategories(penalCodesData);
    // Persist to backend
    pcSaveAll();
  };

  window.pcEditCurrencyItem = function(idx) {
    var c = pcCurrencyList[idx];
    if (!c || c.builtin) return;

    // Replace the row with inline edit inputs
    var $row = $('#pc-currency-list .dd-pc-currency-item[data-idx="' + idx + '"]');
    $row.off('click');
    $row.removeClass('dd-pc-currency-item').addClass('dd-pc-currency-item').css({ cursor: 'default' });
    $row.html(
      '<input type="text" class="dd-pc-edit-input dd-pc-edit-sym" value="' + esc(c.symbol) + '" placeholder="Symbol" style="width:50px;text-align:center;">' +
      '<input type="text" class="dd-pc-edit-input dd-pc-edit-code" value="' + esc(c.code) + '" placeholder="Code" style="flex:1;">' +
      '<div class="dd-pc-currency-item-actions" style="opacity:1;">' +
        '<button class="dd-pc-edit-save" title="Save"><i class="fa fa-check"></i></button>' +
        '<button class="dd-pc-edit-cancel" title="Cancel"><i class="fa fa-xmark"></i></button>' +
      '</div>'
    );

    var $symInput = $row.find('.dd-pc-edit-sym');
    var $codeInput = $row.find('.dd-pc-edit-code');
    $symInput.focus().select();

    function saveEdit() {
      var newSym = $symInput.val().trim();
      var newCode = $codeInput.val().trim().toUpperCase();
      if (!newSym || !newCode) { renderCurrencyList(); return; }
      // Check for code conflict (ignore self)
      var conflict = pcCurrencyList.some(function(other, i) { return i !== idx && other.code === newCode; });
      if (conflict) { $codeInput.css('border-color', 'var(--dd-red)').focus(); return; }
      var oldCode = c.code;
      c.symbol = newSym;
      c.code = newCode;
      if (oldCode === penalCodesCurrency) penalCodesCurrency = newCode;
      pcBuildKnownCurrencies();
      // Update UI immediately
      renderCurrencyList();
      $('#dd-panel-penalCodes .dd-pc-currency-btn .dd-pc-currency-sym').text(pcGetCurrencySymbol(penalCodesCurrency));
      $('#dd-panel-penalCodes .dd-pc-currency-btn span:eq(1)').text(penalCodesCurrency);
      renderPenalCodesCategories(penalCodesData);
      pcSaveAll();
    }

    $row.find('.dd-pc-edit-save').on('click', function(e) { e.stopPropagation(); saveEdit(); });
    $row.find('.dd-pc-edit-cancel').on('click', function(e) { e.stopPropagation(); renderCurrencyList(); });
    $row.find('input').on('keydown', function(e) {
      if (e.key === 'Enter') saveEdit();
      if (e.key === 'Escape') renderCurrencyList();
    });
  };

  window.pcDeleteCurrencyItem = function(idx) {
    var c = pcCurrencyList[idx];
    if (!c || c.builtin || c.code === penalCodesCurrency) return;
    pcCurrencyList.splice(idx, 1);
    pcBuildKnownCurrencies();
    renderCurrencyList();
    pcSaveAll();
  };

  // Add new currency
  $modal.find('#pc-currency-add-btn').on('click', function() {
    var sym = $('#pc-currency-new-symbol').val().trim();
    var code = $('#pc-currency-new-code').val().trim().toUpperCase();
    if (!sym || !code) return;
    // Check duplicate
    var exists = pcCurrencyList.some(function(c) { return c.code === code; });
    if (exists) { alert('Currency code "' + code + '" already exists.'); return; }
    pcCurrencyList.push({ code: code, symbol: sym, builtin: false });
    pcBuildKnownCurrencies();
    $('#pc-currency-new-symbol').val('');
    $('#pc-currency-new-code').val('');
    renderCurrencyList();
    pcSaveAll();
  });

  // Enter key in inputs triggers add
  $modal.find('#pc-currency-new-symbol, #pc-currency-new-code').on('keydown', function(e) {
    if (e.key === 'Enter') { $modal.find('#pc-currency-add-btn').click(); }
  });

  // Close
  $modal.find('#pc-currency-close').on('click', function() { $overlay.remove(); });
  $overlay.on('click', function(e) { if (e.target === $overlay[0]) $overlay.remove(); });

  renderCurrencyList();
};

window.pcResetToDefaults = function() {
  ddModal({
    type: 'warning', icon: 'fa-rotate-left', title: 'Reset Penal Codes',
    message: 'Reset all penal codes to defaults? This will overwrite any customizations.',
    confirmText: 'Reset', onConfirm: function() {
  $.ajax({
    url: API_URL + '/api/v1/community/' + communityId + '/penal-codes/reset',
    method: 'POST',
    success: function(data) {
      penalCodesData = (data && data.categories) || [];
      penalCodesCurrency = (data && data.currency) || 'USD';
      pcCurrencyList = (data && data.currencies && data.currencies.length > 0)
        ? data.currencies
        : pcDefaultCurrencies.slice();
      pcBuildKnownCurrencies();
      // Update the currency button in the header
      $('#dd-panel-penalCodes .dd-pc-currency-btn .dd-pc-currency-sym').text(pcGetCurrencySymbol(penalCodesCurrency));
      $('#dd-panel-penalCodes .dd-pc-currency-btn span:eq(1)').text(penalCodesCurrency);
      renderPenalCodesCategories(penalCodesData);
      $('.dd-pc-search').val('');
    },
    error: function() {
      alert('Failed to reset penal codes.');
    }
  });
}});
};

// ── Penal Codes: Category CRUD ──

window.pcShowAddCategory = function() {
  pcShowModal('Add Category', { name: '', subtitle: '' }, function(vals) {
    penalCodesData.push({
      id: 'cat_' + Date.now(),
      name: vals.name,
      subtitle: vals.subtitle,
      icon: '',
      color: '',
      columns: ['Violation', 'Jail Time', 'Fine', 'Explanation'],
      violations: []
    });
    pcSaveAll(function() {
      renderPenalCodesCategories(penalCodesData);
      $('.dd-pc-search').val('');
    });
  });
};

window.pcEditCategory = function(catIdx) {
  var cat = penalCodesData[catIdx];
  if (!cat) return;
  pcShowModal('Edit Category', { name: cat.name, subtitle: cat.subtitle || '' }, function(vals) {
    penalCodesData[catIdx].name = vals.name;
    penalCodesData[catIdx].subtitle = vals.subtitle;
    pcSaveAll(function() {
      renderPenalCodesCategories(penalCodesData);
    });
  });
};

window.pcDeleteCategory = function(catIdx) {
  var cat = penalCodesData[catIdx];
  if (!cat) return;
  ddModal({
    type: 'danger', icon: 'fa-trash', title: 'Delete Category',
    message: 'Delete "' + esc(cat.name) + '" and all its violations?',
    confirmText: 'Delete', onConfirm: function() {
      penalCodesData.splice(catIdx, 1);
      pcSaveAll(function() {
        renderPenalCodesCategories(penalCodesData);
      });
    }
  });
};

// ── Penal Codes: Violation CRUD ──

window.pcShowAddViolation = function(catIdx) {
  pcShowViolationModal('Add Violation', { name: '', jailTime: '', fine: '', explanation: '' }, function(vals) {
    if (!penalCodesData[catIdx].violations) penalCodesData[catIdx].violations = [];
    penalCodesData[catIdx].violations.push(vals);
    pcSaveAll(function() {
      renderPenalCodesCategories(penalCodesData);
    });
  });
};

window.pcEditViolation = function(catIdx, vIdx) {
  var v = penalCodesData[catIdx] && penalCodesData[catIdx].violations[vIdx];
  if (!v) return;
  pcShowViolationModal('Edit Violation', v, function(vals) {
    penalCodesData[catIdx].violations[vIdx] = vals;
    pcSaveAll(function() {
      renderPenalCodesCategories(penalCodesData);
    });
  });
};

window.pcDeleteViolation = function(catIdx, vIdx) {
  var v = penalCodesData[catIdx] && penalCodesData[catIdx].violations[vIdx];
  if (!v) return;
  ddModal({
    type: 'danger', icon: 'fa-trash', title: 'Delete Violation',
    message: 'Delete "' + esc(v.name) + '"?',
    confirmText: 'Delete', onConfirm: function() {
      penalCodesData[catIdx].violations.splice(vIdx, 1);
      pcSaveAll(function() {
        renderPenalCodesCategories(penalCodesData);
      });
    }
  });
};

// ── Penal Codes: Modals ──

function pcShowModal(title, values, onSave) {
  var $overlay = $('<div class="dd-pc-modal-overlay">');
  var $modal = $(
    '<div class="dd-pc-modal">' +
      '<h3>' + esc(title) + '</h3>' +
      '<label>Name *</label>' +
      '<input type="text" id="pc-modal-name" value="' + esc(values.name) + '">' +
      '<label>Subtitle</label>' +
      '<input type="text" id="pc-modal-subtitle" value="' + esc(values.subtitle || '') + '">' +
      '<div class="dd-pc-modal-footer">' +
        '<button class="dd-pc-modal-btn cancel" id="pc-modal-cancel">Cancel</button>' +
        '<button class="dd-pc-modal-btn save" id="pc-modal-save">Save</button>' +
      '</div>' +
    '</div>'
  );
  $overlay.append($modal);
  $('body').append($overlay);
  $overlay.find('#pc-modal-name').focus();
  $overlay.find('#pc-modal-cancel').on('click', function() { $overlay.remove(); });
  $overlay.on('click', function(e) { if (e.target === $overlay[0]) $overlay.remove(); });
  $overlay.find('#pc-modal-save').on('click', function() {
    var name = $overlay.find('#pc-modal-name').val().trim();
    if (!name) { $overlay.find('#pc-modal-name').css('border-color', 'var(--dd-red)'); return; }
    $overlay.remove();
    onSave({ name: name, subtitle: $overlay.find('#pc-modal-subtitle').val().trim() });
  });
}

function pcShowViolationModal(title, values, onSave) {
  var $overlay = $('<div class="dd-pc-modal-overlay">');
  var $modal = $(
    '<div class="dd-pc-modal wide">' +
      '<h3>' + esc(title) + '</h3>' +
      '<label>Violation Name *</label>' +
      '<input type="text" id="pcv-name" value="' + esc(values.name) + '">' +
      '<label>Jail Time *</label>' +
      '<input type="text" id="pcv-jailtime" value="' + esc(values.jailTime) + '" placeholder="e.g. 30 seconds, 5 minutes">' +
      '<label>Fine (' + esc(pcGetCurrencySymbol(penalCodesCurrency)) + ')</label>' +
      '<input type="number" id="pcv-fine" min="0" step="1" value="' + esc(String(values.fine || 0)) + '" placeholder="e.g. 500">' +
      '<label>Explanation</label>' +
      '<textarea id="pcv-explanation" rows="2">' + esc(values.explanation || '') + '</textarea>' +
      '<div class="dd-pc-modal-footer">' +
        '<button class="dd-pc-modal-btn cancel" id="pcv-cancel">Cancel</button>' +
        '<button class="dd-pc-modal-btn save" id="pcv-save">Save</button>' +
      '</div>' +
    '</div>'
  );
  $overlay.append($modal);
  $('body').append($overlay);
  $overlay.find('#pcv-name').focus();
  $overlay.find('#pcv-cancel').on('click', function() { $overlay.remove(); });
  $overlay.on('click', function(e) { if (e.target === $overlay[0]) $overlay.remove(); });
  $overlay.find('#pcv-save').on('click', function() {
    var name = $overlay.find('#pcv-name').val().trim();
    var jailTime = $overlay.find('#pcv-jailtime').val().trim();
    if (!name) { $overlay.find('#pcv-name').css('border-color', 'var(--dd-red)'); return; }
    if (!jailTime) { $overlay.find('#pcv-jailtime').css('border-color', 'var(--dd-red)'); return; }
    $overlay.remove();
    onSave({
      name: name,
      jailTime: jailTime,
      fine: parseInt($overlay.find('#pcv-fine').val(), 10) || 0,
      explanation: $overlay.find('#pcv-explanation').val().trim()
    });
  });
}

// Chevron rotation is handled by .dd-pc-chevron.expanded in the stylesheet

// ══════════════════════════════════════════
//  SIDEBAR DEPARTMENTS LIST
