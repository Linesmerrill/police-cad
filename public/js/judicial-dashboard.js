// judicial-dashboard.js — Client-side logic for the Judicial Dashboard

(function() {
  'use strict';

  var communityId = (dbUser && dbUser.user && dbUser.user.lastAccessedCommunity && dbUser.user.lastAccessedCommunity.communityID) || '';
  var userId = (dbUser && dbUser._id) || (dbUser && dbUser.user && dbUser.user._id) || '';
  var userName = '';
  if (dbUser && dbUser.user) {
    userName = (dbUser.user.firstName || '') + ' ' + (dbUser.user.lastName || '');
    userName = userName.trim() || dbUser.user.email || 'Judge';
  }

  var cachedQueueCases = [];
  var cachedScheduledCases = [];
  var cachedActiveSessions = [];
  var cachedHistorySessions = [];

  // --- Init ---
  $(document).ready(function() {
    loadCommunityName();
    loadAllData();
    bindEvents();
  });

  function loadCommunityName() {
    if (!communityId) return;
    $.ajax({
      url: API_URL + '/api/v1/community/' + communityId,
      method: 'GET',
      success: function(data) {
        var name = (data && data.community && data.community.name) || 'Unknown Community';
        $('#jd-community-name').text(name);
      }
    });
  }

  function loadAllData() {
    loadQueueCases();
    loadScheduledCases();
    loadActiveSessions();
    loadHistorySessions();
  }

  // --- Data Loading ---

  function loadQueueCases() {
    if (!communityId) return showEmpty('#queueList', '#queueLoading', 'No community selected.');
    $.ajax({
      url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=submitted&limit=50' + (DEPARTMENT_ID ? '&departmentId=' + DEPARTMENT_ID : ''),
      method: 'GET',
      success: function(resp) {
        var submitted = resp.data || [];
        // Also fetch in_review cases
        $.ajax({
          url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=in_review&limit=50' + (DEPARTMENT_ID ? '&departmentId=' + DEPARTMENT_ID : ''),
          method: 'GET',
          success: function(resp2) {
            cachedQueueCases = submitted.concat(resp2.data || []);
            renderQueueCases();
            updateMetric('#metricPending', cachedQueueCases.length);
            $('#tabCountQueue').text(cachedQueueCases.length);
          },
          error: function() {
            cachedQueueCases = submitted;
            renderQueueCases();
            updateMetric('#metricPending', cachedQueueCases.length);
            $('#tabCountQueue').text(cachedQueueCases.length);
          }
        });
      },
      error: function() { showEmpty('#queueList', '#queueLoading', 'Failed to load cases.'); }
    });
  }

  function loadScheduledCases() {
    if (!communityId) return showEmpty('#scheduledList', '#scheduledLoading', 'No community selected.');
    $.ajax({
      url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=scheduled&limit=50' + (DEPARTMENT_ID ? '&departmentId=' + DEPARTMENT_ID : ''),
      method: 'GET',
      success: function(resp) {
        cachedScheduledCases = resp.data || [];
        renderScheduledCases();
        updateMetric('#metricScheduled', cachedScheduledCases.length);
        $('#tabCountScheduled').text(cachedScheduledCases.length);
      },
      error: function() { showEmpty('#scheduledList', '#scheduledLoading', 'Failed to load scheduled cases.'); }
    });
  }

  function loadActiveSessions() {
    if (!communityId) return showEmpty('#activeList', '#activeLoading', 'No community selected.');
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/community/' + communityId + '?status=in_progress&limit=50' + (DEPARTMENT_ID ? '&departmentId=' + DEPARTMENT_ID : ''),
      method: 'GET',
      success: function(resp) {
        cachedActiveSessions = resp.data || [];
        renderActiveSessions();
        updateMetric('#metricActive', cachedActiveSessions.length);
        $('#tabCountActive').text(cachedActiveSessions.length);
      },
      error: function() { showEmpty('#activeList', '#activeLoading', 'Failed to load sessions.'); }
    });
  }

  function loadHistorySessions() {
    if (!communityId) return showEmpty('#historyList', '#historyLoading', 'No community selected.');
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/community/' + communityId + '?status=completed&limit=50' + (DEPARTMENT_ID ? '&departmentId=' + DEPARTMENT_ID : ''),
      method: 'GET',
      success: function(resp) {
        cachedHistorySessions = resp.data || [];
        renderHistorySessions();
        updateMetric('#metricCompleted', cachedHistorySessions.length);
      },
      error: function() { showEmpty('#historyList', '#historyLoading', 'Failed to load history.'); }
    });
  }

  // --- Rendering ---

  function renderQueueCases() {
    var $list = $('#queueList');
    $('#queueLoading').hide();
    $list.show();

    if (cachedQueueCases.length === 0) {
      $list.html('<div class="jd-empty"><i class="fa fa-inbox"></i>No pending cases in the queue.</div>');
      return;
    }

    var html = cachedQueueCases.map(function(c) {
      var d = c.courtCase || c.details || c;
      var initials = getInitials(d.civilianName || 'Unknown');
      var itemCount = (d.contestedItems || []).length;
      var dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '';
      var statusClass = 'jd-badge-' + (d.status || 'submitted');
      var statusLabel = (d.status || 'submitted').replace('_', ' ');
      var caseId = c._id || '';

      return '<div class="jd-case-card" data-case-id="' + caseId + '">' +
        '<div class="jd-case-avatar">' + initials + '</div>' +
        '<div class="jd-case-info">' +
          '<div class="jd-case-name">' + escHtml(d.civilianName || 'Unknown Civilian') + '</div>' +
          '<div class="jd-case-meta">' +
            '<span class="jd-badge ' + statusClass + '">' + statusLabel + '</span>' +
            '<span class="jd-case-meta-item"><i class="fa fa-file-lines"></i> ' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
            '<span class="jd-case-meta-item"><i class="fa fa-clock"></i> ' + dateStr + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="jd-case-actions">' +
          (d.status === 'submitted' ? '<button class="jd-btn jd-btn-gold jd-btn-sm assign-case-btn" data-case-id="' + caseId + '"><i class="fa fa-user-check"></i> Assign</button>' : '') +
          '<button class="jd-btn jd-btn-ghost jd-btn-sm view-case-btn" data-case-id="' + caseId + '"><i class="fa fa-eye"></i> View</button>' +
        '</div>' +
      '</div>';
    }).join('');

    $list.html(html);
  }

  function renderScheduledCases() {
    var $list = $('#scheduledList');
    $('#scheduledLoading').hide();
    $list.show();

    if (cachedScheduledCases.length === 0) {
      $list.html('<div class="jd-empty"><i class="fa fa-calendar-check"></i>No scheduled cases.</div>');
      return;
    }

    var html = cachedScheduledCases.map(function(c) {
      var d = c.courtCase || c.details || c;
      var initials = getInitials(d.civilianName || 'Unknown');
      var itemCount = (d.contestedItems || []).length;
      var schedDate = d.scheduledDate ? new Date(d.scheduledDate).toLocaleString() : 'TBD';
      var caseId = c._id || '';

      return '<div class="jd-case-card" data-case-id="' + caseId + '">' +
        '<div class="jd-case-avatar">' + initials + '</div>' +
        '<div class="jd-case-info">' +
          '<div class="jd-case-name">' + escHtml(d.civilianName || 'Unknown Civilian') + '</div>' +
          '<div class="jd-case-meta">' +
            '<span class="jd-badge jd-badge-scheduled">scheduled</span>' +
            '<span class="jd-case-meta-item"><i class="fa fa-calendar"></i> ' + schedDate + '</span>' +
            '<span class="jd-case-meta-item"><i class="fa fa-file-lines"></i> ' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="jd-case-actions">' +
          '<button class="jd-btn jd-btn-ghost jd-btn-sm view-case-btn" data-case-id="' + caseId + '"><i class="fa fa-eye"></i> View</button>' +
        '</div>' +
      '</div>';
    }).join('');

    $list.html(html);
  }

  function renderActiveSessions() {
    var $list = $('#activeList');
    $('#activeLoading').hide();
    $list.show();

    if (cachedActiveSessions.length === 0) {
      $list.html('<div class="jd-empty"><i class="fa fa-circle-play"></i>No active court sessions.</div>');
      return;
    }

    var html = cachedActiveSessions.map(function(s) {
      var d = s.courtSession || s.details || s;
      var docketCount = (d.docket || []).length;
      var participantCount = (d.participants || []).length;
      var startedAt = d.startedAt ? new Date(d.startedAt).toLocaleTimeString() : '';
      var sessionId = s._id || '';

      return '<div class="jd-session-card live">' +
        '<div class="jd-session-header">' +
          '<div>' +
            '<div class="jd-session-title"><span class="jd-live-dot"></span>' + escHtml(d.title || 'Court Session') + '</div>' +
            '<div class="jd-session-subtitle">Judge ' + escHtml(d.judgeName || 'Unknown') + '</div>' +
          '</div>' +
          '<a href="/court-session?s=' + sessionId + '" class="jd-btn jd-btn-primary jd-btn-sm"><i class="fa fa-door-open"></i> Join</a>' +
        '</div>' +
        '<div class="jd-session-meta">' +
          '<span><i class="fa fa-file-lines"></i> ' + docketCount + ' case' + (docketCount !== 1 ? 's' : '') + '</span>' +
          '<span><i class="fa fa-users"></i> ' + participantCount + ' participant' + (participantCount !== 1 ? 's' : '') + '</span>' +
          (startedAt ? '<span><i class="fa fa-clock"></i> Started ' + startedAt + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    $list.html(html);
  }

  function renderHistorySessions() {
    var $list = $('#historyList');
    $('#historyLoading').hide();
    $list.show();

    if (cachedHistorySessions.length === 0) {
      $list.html('<div class="jd-empty"><i class="fa fa-clock-rotate-left"></i>No session history yet.</div>');
      return;
    }

    var html = cachedHistorySessions.map(function(s) {
      var d = s.courtSession || s.details || s;
      var docketCount = (d.docket || []).length;
      var endedAt = d.endedAt ? new Date(d.endedAt).toLocaleString() : '';
      var startedAt = d.startedAt ? new Date(d.startedAt).toLocaleString() : '';

      return '<div class="jd-session-card">' +
        '<div class="jd-session-header">' +
          '<div>' +
            '<div class="jd-session-title">' + escHtml(d.title || 'Court Session') + '</div>' +
            '<div class="jd-session-subtitle">Judge ' + escHtml(d.judgeName || 'Unknown') + '</div>' +
          '</div>' +
          '<span class="jd-badge jd-badge-completed">completed</span>' +
        '</div>' +
        '<div class="jd-session-meta">' +
          '<span><i class="fa fa-file-lines"></i> ' + docketCount + ' case' + (docketCount !== 1 ? 's' : '') + '</span>' +
          (startedAt ? '<span><i class="fa fa-play"></i> ' + startedAt + '</span>' : '') +
          (endedAt ? '<span><i class="fa fa-stop"></i> ' + endedAt + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    $list.html(html);
  }

  // --- Events ---

  function bindEvents() {
    // Tab switching
    $(document).on('click', '.jd-tab', function() {
      var tab = $(this).data('tab');
      $('.jd-tab').removeClass('active');
      $(this).addClass('active');
      $('.jd-tab-content').removeClass('active');
      $('#tab-' + tab).addClass('active');
    });

    // Create session modal
    $('#createSessionBtn').on('click', function() {
      openCreateSessionModal();
    });
    $('#closeSessionModal, #cancelSessionBtn').on('click', function() {
      $('#createSessionModal').removeClass('open');
    });
    $('#createSessionModal').on('click', function(e) {
      if (e.target === this) $(this).removeClass('open');
    });

    // Submit session
    $('#submitSessionBtn').on('click', submitCreateSession);

    // Assign case
    $(document).on('click', '.assign-case-btn', function() {
      var caseId = $(this).data('case-id');
      assignCase(caseId);
    });

    // View case
    $(document).on('click', '.view-case-btn', function() {
      var caseId = $(this).data('case-id');
      viewCase(caseId);
    });

    // Schedule case
    $(document).on('click', '.schedule-case-btn', function() {
      var caseId = $(this).data('case-id');
      $('#scheduleCaseId').val(caseId);
      $('#scheduleCaseDate').val('');
      $('#scheduleCaseModal').addClass('open');
    });
    $('#submitScheduleBtn').on('click', submitScheduleCase);
    $('#scheduleCaseModal').on('click', function(e) {
      if (e.target === this) $(this).removeClass('open');
    });

    // Case detail modal close
    $('#caseDetailModal').on('click', function(e) {
      if (e.target === this) $(this).removeClass('open');
    });
  }

  // --- Actions ---

  function assignCase(caseId) {
    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + caseId + '/assign',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ judgeID: userId, judgeName: userName }),
      success: function() {
        loadQueueCases();
      },
      error: function(xhr) {
        alert('Failed to assign case: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'));
      }
    });
  }

  function viewCase(caseId) {
    $('#caseDetailBody').html('<div class="jd-loading"><div class="jd-spinner"></div></div>');
    $('#caseDetailFooter').html('');
    $('#caseDetailModal').addClass('open');

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + caseId,
      method: 'GET',
      success: function(c) {
        var d = c.courtCase || c.details || c;
        var statusClass = 'jd-badge-' + (d.status || 'submitted');
        var statusLabel = (d.status || 'submitted').replace('_', ' ');

        var itemsHtml = (d.contestedItems || []).map(function(item) {
          return '<div style="display:flex;align-items:center;gap:0.6rem;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:0.5rem 0.75rem;margin-bottom:0.4rem;">' +
            '<span class="jd-badge jd-badge-' + (item.itemType === 'arrest' ? 'in_progress' : item.itemType === 'citation' ? 'in_review' : 'submitted') + '">' + escHtml(item.itemType) + '</span>' +
            '<span style="font-size:0.88rem;color:var(--text-primary);">' + escHtml(item.summary || 'No description') + '</span>' +
          '</div>';
        }).join('');

        var historyHtml = (d.history || []).map(function(h) {
          return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.4rem 0;border-bottom:1px solid var(--border-subtle);">' +
            '<span style="font-size:0.78rem;color:var(--text-muted);min-width:120px;">' + (h.timestamp ? new Date(h.timestamp).toLocaleString() : '') + '</span>' +
            '<span class="jd-badge jd-badge-' + h.action + '" style="font-size:0.7rem;">' + (h.action || '').replace('_', ' ') + '</span>' +
            '<span style="font-size:0.82rem;color:var(--text-secondary);">' + escHtml(h.userName || '') + (h.notes ? ' — ' + escHtml(h.notes) : '') + '</span>' +
          '</div>';
        }).join('');

        var resolutionsHtml = '';
        if (d.resolutions && d.resolutions.length > 0) {
          resolutionsHtml = '<div style="margin-top:1rem;"><div class="jd-form-label">Resolutions</div>' +
            d.resolutions.map(function(r) {
              var verdictColor = r.verdict === 'dismissed' ? 'color:#6ee7b7;' : 'color:#fca5a5;';
              return '<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:0.5rem 0.75rem;margin-bottom:0.4rem;display:flex;justify-content:space-between;align-items:center;">' +
                '<span style="font-size:0.88rem;color:var(--text-primary);">' + escHtml(r.itemType) + '</span>' +
                '<span style="font-size:0.82rem;font-weight:600;' + verdictColor + 'text-transform:uppercase;">' + escHtml(r.verdict) + '</span>' +
              '</div>';
            }).join('') +
          '</div>';
        }

        var html = '' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">' +
            '<div>' +
              '<div style="font-family:var(--font-display);font-size:1.15rem;">' + escHtml(d.civilianName || 'Unknown') + '</div>' +
              '<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.15rem;">Submitted ' + (d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '') + '</div>' +
            '</div>' +
            '<span class="jd-badge ' + statusClass + '">' + statusLabel + '</span>' +
          '</div>' +
          (d.statement ? '<div style="margin-bottom:1rem;"><div class="jd-form-label">Civilian Statement</div><div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.9rem;color:var(--text-primary);font-style:italic;">' + escHtml(d.statement) + '</div></div>' : '') +
          '<div style="margin-bottom:1rem;"><div class="jd-form-label">Contested Items (' + (d.contestedItems || []).length + ')</div>' + itemsHtml + '</div>' +
          (d.judgeName ? '<div style="margin-bottom:1rem;font-size:0.88rem;color:var(--text-secondary);"><i class="fa fa-gavel" style="color:var(--accent-gold);margin-right:0.3rem;"></i> Assigned to <strong style="color:var(--text-primary);">' + escHtml(d.judgeName) + '</strong></div>' : '') +
          (d.scheduledDate ? '<div style="margin-bottom:1rem;font-size:0.88rem;color:var(--text-secondary);"><i class="fa fa-calendar" style="color:var(--status-scheduled-text);margin-right:0.3rem;"></i> Scheduled for <strong style="color:var(--text-primary);">' + new Date(d.scheduledDate).toLocaleString() + '</strong></div>' : '') +
          resolutionsHtml +
          (historyHtml ? '<div style="margin-top:1rem;"><div class="jd-form-label">History</div>' + historyHtml + '</div>' : '');

        $('#caseDetailBody').html(html);

        // Footer actions based on status
        var footerHtml = '';
        if (d.status === 'in_review') {
          footerHtml = '<button class="jd-btn jd-btn-gold schedule-case-btn" data-case-id="' + (c._id || '') + '"><i class="fa fa-calendar"></i> Schedule</button>';
        }
        $('#caseDetailFooter').html(footerHtml);
      },
      error: function() {
        $('#caseDetailBody').html('<div class="jd-empty"><i class="fa fa-exclamation-triangle"></i>Failed to load case details.</div>');
      }
    });
  }

  function submitScheduleCase() {
    var caseId = $('#scheduleCaseId').val();
    var dateVal = $('#scheduleCaseDate').val();
    if (!dateVal) { alert('Please select a date and time.'); return; }

    var scheduledDate = new Date(dateVal).toISOString();

    $('#submitScheduleBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Scheduling...');

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + caseId + '/schedule',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        scheduledDate: scheduledDate,
        judgeID: userId,
        judgeName: userName
      }),
      success: function() {
        $('#scheduleCaseModal').removeClass('open');
        $('#caseDetailModal').removeClass('open');
        loadAllData();
      },
      error: function(xhr) {
        alert('Failed to schedule: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'));
      },
      complete: function() {
        $('#submitScheduleBtn').prop('disabled', false).html('<i class="fa fa-check"></i> Schedule');
      }
    });
  }

  // --- Create Session ---

  function openCreateSessionModal() {
    $('#sessionTitle').val('');
    $('#sessionStart').val('');
    $('#sessionEnd').val('');
    loadDocketCases();
    $('#createSessionModal').addClass('open');
  }

  function loadDocketCases() {
    var $list = $('#docketCaseList');
    $list.html('<div class="jd-loading" style="padding:1rem;"><div class="jd-spinner"></div></div>');

    $.ajax({
      url: API_URL + '/api/v2/court-cases/community/' + communityId + '?status=scheduled&limit=50' + (DEPARTMENT_ID ? '&departmentId=' + DEPARTMENT_ID : ''),
      method: 'GET',
      success: function(resp) {
        var cases = resp.data || [];
        if (cases.length === 0) {
          $list.html('<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">No scheduled cases available. Schedule cases first.</div>');
          return;
        }
        var html = cases.map(function(c) {
          var d = c.courtCase || c.details || c;
          var caseId = c._id || '';
          var itemCount = (d.contestedItems || []).length;
          return '<label class="jd-docket-item">' +
            '<input type="checkbox" class="docket-case-checkbox" value="' + caseId + '">' +
            '<div class="jd-docket-item-info">' +
              '<div class="jd-docket-item-name">' + escHtml(d.civilianName || 'Unknown') + '</div>' +
              '<div class="jd-docket-item-detail">' + itemCount + ' contested item' + (itemCount !== 1 ? 's' : '') + ' &middot; ' + (d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString() : 'No date') + '</div>' +
            '</div>' +
          '</label>';
        }).join('');
        $list.html(html);
      },
      error: function() {
        $list.html('<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">Failed to load cases.</div>');
      }
    });
  }

  function submitCreateSession() {
    var title = $('#sessionTitle').val().trim();
    var startVal = $('#sessionStart').val();
    var endVal = $('#sessionEnd').val();

    if (!title) { alert('Please enter a session title.'); return; }
    if (!startVal) { alert('Please set a start time.'); return; }

    var selectedCases = [];
    $('.docket-case-checkbox:checked').each(function(i) {
      selectedCases.push({ courtCaseID: $(this).val(), order: i + 1, status: 'pending' });
    });

    if (selectedCases.length === 0) { alert('Please select at least one case for the docket.'); return; }

    var payload = {
      communityID: communityId,
      departmentID: DEPARTMENT_ID || '',
      judgeID: userId,
      judgeName: userName,
      title: title,
      docket: selectedCases,
      scheduledStart: new Date(startVal).toISOString(),
      scheduledEnd: endVal ? new Date(endVal).toISOString() : '',
    };

    $('#submitSessionBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');

    $.ajax({
      url: API_URL + '/api/v2/court-sessions',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function() {
        $('#createSessionModal').removeClass('open');
        loadAllData();
      },
      error: function(xhr) {
        alert('Failed to create session: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'));
      },
      complete: function() {
        $('#submitSessionBtn').prop('disabled', false).html('<i class="fa fa-plus"></i> Create Session');
      }
    });
  }

  // --- Helpers ---

  function showEmpty(listSel, loadingSel, msg) {
    $(loadingSel).hide();
    $(listSel).show().html('<div class="jd-empty"><i class="fa fa-inbox"></i>' + escHtml(msg) + '</div>');
  }

  function updateMetric(sel, val) {
    $(sel).text(val);
  }

  function getInitials(name) {
    var parts = (name || '').split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  }

  function escHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

})();
