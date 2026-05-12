// court-session.js — Client-side logic for the Live Court Session page

(function() {
  'use strict';

  // --- Globals from EJS ---
  var userId = (dbUser && dbUser._id) || (dbUser && dbUser.user && dbUser.user._id) || '';
  var userName = '';
  if (dbUser && dbUser.user) {
    userName = dbUser.user.username || ((dbUser.user.firstName || '') + ' ' + (dbUser.user.lastName || '')).trim() || dbUser.user.email || 'Unknown';
  }

  // --- Session state ---
  var sessionId = '';
  var currentSession = null;
  var currentRole = 'spectator'; // judge, defendant, spectator
  var activeCaseData = null;
  var chatMessages = [];
  var resolutions = {}; // { itemIndex: 'dismissed' | 'upheld' | 'partial' (derived) }
  // Per-charge rulings for citations/warnings with multiple fines:
  // { itemIndex: { fineIndex: 'dismissed' | 'upheld', ... } }
  var chargeResolutions = {};
  // Track how many charges each item carries so we can validate the
  // resolution is complete on submit. Populated by renderItemDetails.
  var itemChargeCounts = {};
  var sessionPollTimer = null;
  var chatPollTimer = null;
  var pollPaused = false; // pause polling during resolution to prevent race conditions
  var resolvedCaseIds = {}; // track cases resolved this session to prevent stale re-renders
  var docketCaseCache = {}; // caseId -> fetched court case details
  var expandedDocketId = null;

  // --- Init ---
  $(document).ready(function() {
    sessionId = getQueryParam('s');
    if (!sessionId) {
      showError('No session ID provided. Please return to the dashboard.');
      return;
    }

    loadSession(); // joinSession() is called inside loadSession success after role is determined
    loadChatHistory();
    bindEvents();

    // Start polling
    sessionPollTimer = setInterval(pollSession, 5000);
    chatPollTimer = setInterval(pollChat, 3000);
  });

  // --- Cleanup on unload ---
  $(window).on('beforeunload', function() {
    if (sessionId && userId) {
      var url = API_URL + '/api/v2/court-sessions/' + sessionId + '/leave/' + userId;
      // Use fetch with keepalive for DELETE (sendBeacon only supports POST)
      if (window.fetch) {
        fetch(url, { method: 'DELETE', keepalive: true });
      } else {
        $.ajax({ url: url, method: 'DELETE', async: false });
      }
    }
    if (sessionPollTimer) clearInterval(sessionPollTimer);
    if (chatPollTimer) clearInterval(chatPollTimer);
  });

  // --- Event Bindings ---
  function bindEvents() {
    // Start session
    $('#startSessionBtn').on('click', startSession);

    // End session
    $('#endSessionBtn').on('click', function() {
      jdConfirm({
        icon: 'fa-stop',
        iconClass: 'icon-danger',
        title: 'End Court Session',
        message: 'Are you sure you want to end this court session? This action cannot be undone.',
        confirmLabel: 'End Session',
        onConfirm: function() { endSession(); }
      });
    });

    // Send chat
    $('#chatSendBtn').on('click', function() {
      var msg = $('#chatInput').val().trim();
      if (msg) sendChatMessage(msg);
    });
    $('#chatInput').on('keydown', function(e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        var msg = $(this).val().trim();
        if (msg) sendChatMessage(msg);
      }
    });

    // Resolution toggle buttons (delegated)
    $(document).on('click', '.jd-toggle-dismiss', function() {
      var idx = $(this).data('item-index');
      toggleResolution(idx, 'dismissed');
    });
    $(document).on('click', '.jd-toggle-uphold', function() {
      var idx = $(this).data('item-index');
      toggleResolution(idx, 'upheld');
    });

    // Per-charge dismiss / uphold toggles
    $(document).on('click', '.jd-fine-toggle', function() {
      var idx = $(this).data('item-index');
      var fineIdx = $(this).data('fine-index');
      var verdict = $(this).data('verdict');
      if (idx == null || fineIdx == null || !verdict) return;
      toggleChargeResolution(parseInt(idx, 10), parseInt(fineIdx, 10), verdict);
    });

    // Submit resolution
    $(document).on('click', '#submitResolutionBtn', function() {
      submitResolution();
    });

    // Next case
    $(document).on('click', '#nextCaseBtn', function() {
      activateNextDocketEntry();
    });

    // activateDocketEntry is called directly from inline onclick
  }

  // --- Data Loading ---

  function loadSession() {
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId,
      method: 'GET',
      success: function(resp) {
        currentSession = resp.courtSession || resp.data || resp;
        determineRole();
        joinSession(); // Join after role is determined
        renderAll();
        $('#mainLoading').hide();
        $('#sessionLayout').show();
      },
      error: function(xhr) {
        var msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Failed to load session.';
        showError(msg);
      }
    });
  }

  function joinSession() {
    if (!userId) return;

    // Optimistically add self to participants list before the API call
    if (currentSession) {
      var participants = currentSession.participants || [];
      var alreadyJoined = false;
      for (var i = 0; i < participants.length; i++) {
        if (participants[i].userID === userId) { alreadyJoined = true; break; }
      }
      if (!alreadyJoined) {
        participants.push({
          userID: userId,
          userName: userName,
          role: currentRole,
          joinedAt: new Date().toISOString()
        });
        currentSession.participants = participants;
        renderParticipants(currentSession);
      }
    }

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/join',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        userID: userId,
        userName: userName,
        role: currentRole
      }),
      error: function() {
        // Silently fail — user can still view
      }
    });
  }

  function loadChatHistory() {
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/chat',
      method: 'GET',
      success: function(resp) {
        chatMessages = resp.data || resp.messages || [];
        renderChat(chatMessages);
      }
    });
  }

  function pollSession() {
    if (pollPaused) return;
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId,
      method: 'GET',
      success: function(resp) {
        var newSession = resp.courtSession || resp.data || resp;

        // Patch stale docket entries: if we resolved a case locally but the
        // server hasn't caught up yet, force those entries to "completed" so
        // downstream comparisons and renders never see them as "active".
        var docket = newSession.docket || [];
        for (var i = 0; i < docket.length; i++) {
          var dCaseId = docket[i].courtCaseID || docket[i].caseID || '';
          if (dCaseId && resolvedCaseIds[dCaseId]) {
            docket[i].status = 'completed';
          }
        }

        var statusChanged = !currentSession || currentSession.status !== newSession.status;
        var activeCaseChanged = !currentSession ||
          getActiveDocketCaseId(currentSession) !== getActiveDocketCaseId(newSession);
        var participantsChanged = !currentSession ||
          (currentSession.participants || []).length !== (newSession.participants || []).length;

        currentSession = newSession;
        determineRole();

        if (statusChanged) {
          renderSessionHeader(currentSession);
          renderActiveCasePanel(currentSession);
          renderDocket(currentSession);
        }
        if (activeCaseChanged && !statusChanged) {
          renderActiveCasePanel(currentSession);
          renderDocket(currentSession);
        }
        if (participantsChanged) {
          renderParticipants(currentSession);
        }
      }
    });
  }

  function pollChat() {
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/chat?limit=200',
      method: 'GET',
      success: function(resp) {
        var messages = resp.data || resp.messages || [];
        // Only re-render if message count changed
        if (messages.length !== chatMessages.length) {
          chatMessages = messages;
          renderChat(chatMessages);
        }
      }
    });
  }

  // --- Role Determination ---

  function determineRole() {
    if (!currentSession) { currentRole = 'spectator'; return; }

    // Judge check
    if (currentSession.judgeID === userId) {
      currentRole = 'judge';
      return;
    }

    // Defendant check: user's civilian is in the docket
    var docket = currentSession.docket || [];
    for (var i = 0; i < docket.length; i++) {
      if (docket[i].civilianID === userId || docket[i].userID === userId) {
        currentRole = 'defendant';
        return;
      }
    }

    currentRole = 'spectator';
  }

  // --- Render All ---

  function renderAll() {
    renderSessionHeader(currentSession);
    renderActiveCasePanel(currentSession);
    renderDocket(currentSession);
    renderParticipants(currentSession);
  }

  // --- Render: Session Header ---

  function renderSessionHeader(session) {
    if (!session) return;

    $('#sessionTitle').text(session.title || 'Court Session');
    var judgeName = session.judgeName || 'Unknown Judge';
    $('#sessionSubtitle').html('Presided by Judge ' + escHtml(judgeName));
    $('#sessionJudge').html('<i class="fa fa-gavel"></i> Judge ' + escHtml(judgeName));

    // Retarget the standalone-utility strip's static back href to the
    // session's court-cases page when no referrer was captured. The
    // smart-back JS in the EJS already prefers the captured referrer
    // when one exists, so this only applies on cold loads / refreshes.
    if (session.communityID) {
      var encoded = btoa(session.communityID).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      $('.lpc-utility-back').attr('href', '/court-cases?c=' + encoded);
    }

    // Status badge
    var status = session.status || 'scheduled';
    var $badge = $('#sessionStatusBadge');
    $badge.removeClass().addClass('jd-badge jd-badge-' + status);
    var statusLabel = status.replace(/_/g, ' ');
    if (status === 'in_progress') {
      $badge.html('<span class="jd-live-dot"></span> In Session');
    } else {
      $badge.text(statusLabel);
    }

    // Control buttons
    var isJudge = currentRole === 'judge';
    if (isJudge && status === 'scheduled') {
      $('#startSessionBtn').show();
      $('#endSessionBtn').hide();
    } else if (isJudge && status === 'in_progress') {
      $('#startSessionBtn').hide();
      $('#endSessionBtn').show();
    } else {
      $('#startSessionBtn').hide();
      $('#endSessionBtn').hide();
    }

    // Disable chat when session is completed or cancelled
    if (status === 'completed' || status === 'cancelled') {
      $('#chatInput').prop('disabled', true).attr('placeholder', 'Session has ended.');
      $('#chatSendBtn').prop('disabled', true).css('opacity', '0.4');
    } else {
      $('#chatInput').prop('disabled', false).attr('placeholder', 'Type a message...');
      $('#chatSendBtn').prop('disabled', false).css('opacity', '');
    }
  }

  // --- Render: Active Case Panel ---

  function renderActiveCasePanel(session) {
    if (!session) return;

    var activeDocketEntry = getActiveDocketEntry(session);
    if (!activeDocketEntry || session.status !== 'in_progress') {
      $('#activeCasePanel').hide();
      $('#noActiveCasePanel').show();
      if (currentRole === 'judge' && session.status === 'in_progress') {
        $('#noActiveCaseHint').html('Click <strong>Activate</strong> next to a docket entry to begin.');
      } else if (session.status === 'scheduled') {
        $('#noActiveCaseHint').text('The session has not started yet.');
      } else if (session.status === 'completed') {
        $('#noActiveCaseHint').text('This session has concluded.');
      } else if (session.status === 'cancelled') {
        $('#noActiveCaseHint').text('This session was cancelled.');
      } else {
        $('#noActiveCaseHint').text('Waiting for the judge to call the next case.');
      }
      return;
    }

    var caseId = activeDocketEntry.courtCaseID || activeDocketEntry.caseID || '';

    // Skip if we already resolved this case (prevents stale docket data from re-showing it)
    if (caseId && resolvedCaseIds[caseId]) {
      activeDocketEntry.status = 'completed';
      activeCaseData = null;
      $('#activeCasePanel').hide();
      $('#noActiveCasePanel').show();
      if (currentRole === 'judge') {
        $('#noActiveCaseHint').html('Case already resolved. Click <strong>Activate</strong> on the next docket entry.');
      } else {
        $('#noActiveCaseHint').text('Waiting for the judge to call the next case.');
      }
      renderDocket(session);
      return;
    }

    $('#noActiveCasePanel').hide();
    $('#activeCasePanel').show();
    $('#activeCaseBody').html('<div class="jd-loading"><div class="jd-spinner"></div></div>');

    if (!caseId) {
      $('#activeCaseBody').html('<div class="jd-empty"><i class="fa fa-exclamation-triangle"></i>No case ID found for this docket entry.</div>');
      return;
    }

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + caseId,
      method: 'GET',
      success: function(resp) {
        activeCaseData = resp.courtCase || resp.data || resp;

        // If the case has already been resolved, treat it as completed
        if (activeCaseData.status === 'completed') {
          // Fix stale docket entry: mark it as completed locally
          if (session && session.docket) {
            for (var d = 0; d < session.docket.length; d++) {
              if ((session.docket[d].courtCaseID || session.docket[d].caseID) === caseId) {
                session.docket[d].status = 'completed';
              }
            }
          }
          activeCaseData = null;
          $('#activeCasePanel').hide();
          $('#noActiveCasePanel').show();
          if (currentRole === 'judge') {
            $('#noActiveCaseHint').html('Case already resolved. Click <strong>Activate</strong> on the next docket entry.');
          } else {
            $('#noActiveCaseHint').text('Waiting for the judge to call the next case.');
          }
          renderDocket(session);
          return;
        }

        // Fallback: if the court case has no civilianName, use the docket entry's denormalized name
        if (!activeCaseData.civilianName && activeDocketEntry && activeDocketEntry.civilianName) {
          activeCaseData.civilianName = activeDocketEntry.civilianName;
        }
        resolutions = {}; // Reset resolutions for new case
        chargeResolutions = {};
        itemChargeCounts = {};
        var html = renderCaseDetails(activeCaseData, caseId);
        $('#activeCaseBody').html(html);
        enrichContestedItems(activeCaseData);
      },
      error: function() {
        $('#activeCaseBody').html('<div class="jd-empty"><i class="fa fa-exclamation-triangle"></i>Failed to load case details.</div>');
      }
    });
  }

  function renderCaseDetails(courtCase, caseId) {
    var d = courtCase;
    var civName = d.civilianName || 'Unknown Civilian';
    var statement = d.statement || '';
    var items = d.contestedItems || [];
    var status = d.status || '';

    var html = '';

    // Case number pill (if present)
    if (d.caseNumber) {
      html += '<div style="margin-bottom:0.5rem;"><span style="display:inline-flex;align-items:center;font-family:JetBrains Mono,ui-monospace,monospace;font-size:0.72rem;font-weight:600;color:#a78bfa;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);padding:0.1rem 0.4rem;border-radius:4px;">' + escHtml(d.caseNumber) + '</span></div>';
    }

    // Defendant info
    html += '<div style="margin-bottom:0.5rem;"><span style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Defendant</span></div>';
    html += '<div class="jd-active-case-civ"><i class="fa fa-user" style="color:var(--accent-gold);margin-right:0.4rem;font-size:0.9em;"></i>' + escHtml(civName) + '</div>';

    // Statement
    if (statement) {
      html += '<div style="margin-bottom:0.5rem;"><span style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Civilian Statement</span></div>';
      html += '<div class="jd-statement-box">&ldquo;' + escHtml(statement) + '&rdquo;</div>';
    }

    // Contested items
    if (items.length > 0) {
      html += '<div style="margin-bottom:0.5rem;"><span style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Contested Items (' + items.length + ')</span></div>';
      html += '<div class="jd-contested-items-list">';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var typeClass = getItemTypeClass(item.itemType);
        html += '<div class="jd-contested-item" data-item-index="' + i + '">';
        html += '<div class="jd-contested-item-row">';
        html += '<div class="jd-contested-item-info">';
        html += '<span class="jd-badge ' + typeClass + '">' + escHtml(item.itemType || 'item') + '</span>';
        html += '<span class="jd-contested-item-summary">' + escHtml(item.summary || 'No description') + '</span>';
        html += '</div>';

        // Resolution toggles (judge only)
        if (currentRole === 'judge') {
          html += renderResolutionToggles(i);
        }

        html += '</div>'; // close jd-contested-item-row

        // Details slot — populated asynchronously by enrichContestedItems
        html += '<div class="jd-contested-item-details" id="itemDetails-' + i + '">';
        html += '<div class="jd-item-detail-loading"><i class="fa fa-spinner fa-spin"></i> Loading details&hellip;</div>';
        html += '</div>';

        html += '</div>'; // close jd-contested-item
      }
      html += '</div>';
    }

    // Actions (judge only)
    if (currentRole === 'judge') {
      html += '<div class="jd-active-case-actions">';
      html += '<button class="jd-btn jd-btn-ghost" id="nextCaseBtn"><i class="fa fa-forward-step"></i> Skip / Next Case</button>';
      html += '<button class="jd-btn jd-btn-success" id="submitResolutionBtn" data-case-id="' + (caseId || '') + '"><i class="fa fa-check"></i> Submit Resolution</button>';
      html += '</div>';
    }

    return html;
  }

  function renderResolutionToggles(itemIndex) {
    var current = resolutions[itemIndex] || '';
    var dismissClass = current === 'dismissed' ? ' dismiss-active' : '';
    var upholdClass = current === 'upheld' ? ' uphold-active' : '';

    return '<div class="jd-resolution-toggles">' +
      '<button class="jd-toggle-btn jd-toggle-dismiss' + dismissClass + '" data-item-index="' + itemIndex + '">Dismiss</button>' +
      '<button class="jd-toggle-btn jd-toggle-uphold' + upholdClass + '" data-item-index="' + itemIndex + '">Uphold</button>' +
      '</div>';
  }

  // --- Enrich contested items with source record details ---

  function enrichContestedItems(courtCase) {
    var items = courtCase.contestedItems || [];
    if (items.length === 0) return;

    var civilianId = courtCase.civilianID || '';
    var hasCitationOrWarning = false;
    var arrestIds = [];

    for (var i = 0; i < items.length; i++) {
      var t = (items[i].itemType || '').toLowerCase();
      if (t === 'citation' || t === 'warning') {
        hasCitationOrWarning = true;
      } else if (t === 'arrest') {
        arrestIds.push({ index: i, id: items[i].itemID });
      }
    }

    // Fetch civilian record for citations/warnings
    if (hasCitationOrWarning && !civilianId) {
      // No civilian ID — can't fetch details
      for (var i = 0; i < items.length; i++) {
        var t = (items[i].itemType || '').toLowerCase();
        if (t === 'citation' || t === 'warning') {
          renderItemDetails(i, t, null);
        }
      }
    } else if (hasCitationOrWarning && civilianId) {
      $.ajax({
        url: API_URL + '/api/v1/civilian/' + civilianId,
        method: 'GET',
        success: function(resp) {
          var civData = resp.civilian || resp;
          var history = civData.criminalHistory || [];
          // Build lookup by ID
          var historyMap = {};
          for (var h = 0; h < history.length; h++) {
            historyMap[history[h]._id] = history[h];
          }
          // Populate each citation/warning item
          for (var i = 0; i < items.length; i++) {
            var t = (items[i].itemType || '').toLowerCase();
            if (t === 'citation' || t === 'warning') {
              var record = historyMap[items[i].itemID];
              renderItemDetails(i, t, record || null);
            }
          }
        },
        error: function() {
          for (var i = 0; i < items.length; i++) {
            var t = (items[i].itemType || '').toLowerCase();
            if (t === 'citation' || t === 'warning') {
              renderItemDetails(i, t, null);
            }
          }
        }
      });
    }

    // Fetch each arrest report
    for (var a = 0; a < arrestIds.length; a++) {
      (function(idx, id) {
        $.ajax({
          url: API_URL + '/api/v1/arrest-report/' + id,
          method: 'GET',
          success: function(resp) {
            var report = resp.arrestReport || resp;
            renderItemDetails(idx, 'arrest', report);
          },
          error: function() {
            renderItemDetails(idx, 'arrest', null);
          }
        });
      })(arrestIds[a].index, arrestIds[a].id);
    }
  }

  function renderItemDetails(itemIndex, itemType, record) {
    // Stash the index for nested helpers (per-charge toggle rendering relies
    // on it being set during the renderItemDetails call below).
    window.__jdCurrentItemIndex = itemIndex;
    var $slot = $('#itemDetails-' + itemIndex);
    if (!$slot.length) return;

    if (!record) {
      $slot.html('<div class="jd-item-detail-loading">Details unavailable</div>');
      return;
    }

    var html = '';

    if (itemType === 'citation' || itemType === 'warning') {
      // CriminalHistory record
      var fines = record.fines || [];
      var notes = record.notes || '';
      var date = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '';

      html += '<div class="jd-item-detail-grid">';
      if (date) {
        html += '<div class="jd-item-detail-row"><span class="jd-item-detail-label">Date Issued</span><span class="jd-item-detail-value">' + escHtml(date) + '</span></div>';
      }
      if (record.type) {
        html += '<div class="jd-item-detail-row"><span class="jd-item-detail-label">Type</span><span class="jd-item-detail-value">' + escHtml(record.type) + '</span></div>';
      }
      html += '</div>';

      // Fines — per-charge Dismiss / Uphold for judges.
      if (fines.length > 0) {
        // Remember how many charges this item has so submitResolution can
        // validate every one was ruled on, and so the top-level shortcut
        // knows how many to fan out to.
        var itemIndexForCharges = (typeof window.__jdCurrentItemIndex === 'number') ? window.__jdCurrentItemIndex : null;
        if (itemIndexForCharges != null) {
          itemChargeCounts[itemIndexForCharges] = fines.length;
        }

        html += '<div class="jd-item-fines">';
        html += '<div class="jd-item-detail-label" style="margin-bottom:0.2rem;">Charges / Fines</div>';
        for (var f = 0; f < fines.length; f++) {
          var fine = fines[f];
          var catClass = (fine.category || '').toLowerCase();
          var ruling = (itemIndexForCharges != null && chargeResolutions[itemIndexForCharges]) ? chargeResolutions[itemIndexForCharges][f] : '';
          var strikeCls = ruling === 'dismissed' ? ' jd-fine-status-strike' : '';
          html += '<div class="jd-item-fine-row">';
          html += '<span class="jd-item-detail-value jd-item-fine-label' + strikeCls + '">' + escHtml(fine.fineType || 'Unknown Charge') + '</span>';
          if (fine.fineAmount) {
            html += ' <span class="jd-item-fine-amount">$' + fine.fineAmount + '</span>';
          }
          if (fine.category) {
            html += ' <span class="jd-item-fine-category ' + escHtml(catClass) + '">' + escHtml(fine.category) + '</span>';
          }
          if (currentRole === 'judge' && itemIndexForCharges != null) {
            var dCls = ruling === 'dismissed' ? ' dismiss-active' : '';
            var uCls = ruling === 'upheld' ? ' uphold-active' : '';
            html +=
              '<span class="jd-fine-toggles">' +
                '<button class="jd-fine-toggle' + dCls + '" data-item-index="' + itemIndexForCharges + '" data-fine-index="' + f + '" data-verdict="dismissed">Dismiss</button>' +
                '<button class="jd-fine-toggle' + uCls + '" data-item-index="' + itemIndexForCharges + '" data-fine-index="' + f + '" data-verdict="upheld">Uphold</button>' +
              '</span>';
          }
          html += '</div>';
        }
        if (currentRole === 'judge') {
          html += '<div class="jd-charges-hint"><i class="fa fa-circle-info"></i> Resolve each charge individually, or use the Dismiss / Uphold buttons above to apply to all.</div>';
        }
        html += '</div>';
      }

      // Notes
      if (notes) {
        html += '<div style="margin-top:0.35rem;"><span class="jd-item-detail-label">Officer Notes</span>';
        html += '<div class="jd-item-narrative">' + escHtml(notes) + '</div></div>';
      }

    } else if (itemType === 'arrest') {
      // ArrestReport record
      var d = record;
      html += '<div class="jd-item-detail-grid">';
      if (d.arrestDate) {
        html += '<div class="jd-item-detail-row"><span class="jd-item-detail-label">Arrest Date</span><span class="jd-item-detail-value">' + escHtml(d.arrestDate) + (d.arrestTime ? ' at ' + escHtml(d.arrestTime) : '') + '</span></div>';
      }
      if (d.arrestLocation) {
        html += '<div class="jd-item-detail-row"><span class="jd-item-detail-label">Location</span><span class="jd-item-detail-value">' + escHtml(d.arrestLocation) + '</span></div>';
      }
      if (d.officer && d.officer.name) {
        html += '<div class="jd-item-detail-row"><span class="jd-item-detail-label">Arresting Officer</span><span class="jd-item-detail-value">' + escHtml(d.officer.name) + (d.officer.badgeNumber ? ' #' + escHtml(d.officer.badgeNumber) : '') + '</span></div>';
      }
      if (d.reportNumber) {
        html += '<div class="jd-item-detail-row"><span class="jd-item-detail-label">Report #</span><span class="jd-item-detail-value">' + escHtml(d.reportNumber) + '</span></div>';
      }
      html += '</div>';

      // Charges
      if (d.charges) {
        html += '<div style="margin-top:0.35rem;"><span class="jd-item-detail-label">Charges</span>';
        html += '<div class="jd-item-detail-value" style="margin-top:0.1rem;">' + escHtml(d.charges) + '</div></div>';
      }

      // Narrative
      if (d.narrative) {
        html += '<div style="margin-top:0.35rem;"><span class="jd-item-detail-label">Narrative</span>';
        html += '<div class="jd-item-narrative">' + escHtml(d.narrative) + '</div></div>';
      }
    }

    $slot.html(html || '<div class="jd-item-detail-loading">No additional details</div>');
  }

  function toggleResolution(itemIndex, verdict) {
    var chargeCount = itemChargeCounts[itemIndex] || 0;
    if (chargeCount > 0) {
      // Item has per-charge rulings — top-level Dismiss/Uphold becomes a
      // "apply to all charges" shortcut. Toggling again clears.
      var current = resolutions[itemIndex];
      if (current === verdict && allChargesMatch(itemIndex, verdict)) {
        clearChargeResolutions(itemIndex);
      } else {
        setAllChargeResolutions(itemIndex, verdict);
      }
    } else {
      // Single-verdict path (arrests, charge-less warnings).
      if (resolutions[itemIndex] === verdict) {
        delete resolutions[itemIndex];
      } else {
        resolutions[itemIndex] = verdict;
      }
      refreshTopToggleClasses(itemIndex);
    }
  }

  function toggleChargeResolution(itemIndex, fineIndex, verdict) {
    chargeResolutions[itemIndex] = chargeResolutions[itemIndex] || {};
    if (chargeResolutions[itemIndex][fineIndex] === verdict) {
      delete chargeResolutions[itemIndex][fineIndex]; // toggle off
    } else {
      chargeResolutions[itemIndex][fineIndex] = verdict;
    }
    refreshChargeToggleClasses(itemIndex, fineIndex);
    recomputeTopVerdict(itemIndex);
    refreshTopToggleClasses(itemIndex);
  }

  function allChargesMatch(itemIndex, verdict) {
    var n = itemChargeCounts[itemIndex] || 0;
    if (n === 0) return false;
    var bucket = chargeResolutions[itemIndex] || {};
    for (var i = 0; i < n; i++) {
      if (bucket[i] !== verdict) return false;
    }
    return true;
  }

  function setAllChargeResolutions(itemIndex, verdict) {
    var n = itemChargeCounts[itemIndex] || 0;
    chargeResolutions[itemIndex] = {};
    for (var i = 0; i < n; i++) chargeResolutions[itemIndex][i] = verdict;
    for (var j = 0; j < n; j++) refreshChargeToggleClasses(itemIndex, j);
    recomputeTopVerdict(itemIndex);
    refreshTopToggleClasses(itemIndex);
  }

  function clearChargeResolutions(itemIndex) {
    var n = itemChargeCounts[itemIndex] || 0;
    chargeResolutions[itemIndex] = {};
    for (var i = 0; i < n; i++) refreshChargeToggleClasses(itemIndex, i);
    delete resolutions[itemIndex];
    refreshTopToggleClasses(itemIndex);
  }

  function recomputeTopVerdict(itemIndex) {
    var n = itemChargeCounts[itemIndex] || 0;
    var bucket = chargeResolutions[itemIndex] || {};
    var upheld = 0, dismissed = 0, set = 0;
    for (var i = 0; i < n; i++) {
      var v = bucket[i];
      if (v === 'upheld') { upheld++; set++; }
      else if (v === 'dismissed') { dismissed++; set++; }
    }
    if (set < n) { delete resolutions[itemIndex]; return; }
    if (upheld === n) resolutions[itemIndex] = 'upheld';
    else if (dismissed === n) resolutions[itemIndex] = 'dismissed';
    else resolutions[itemIndex] = 'partial';
  }

  function refreshChargeToggleClasses(itemIndex, fineIndex) {
    var bucket = chargeResolutions[itemIndex] || {};
    var current = bucket[fineIndex];
    var $row = $('.jd-fine-toggle[data-item-index="' + itemIndex + '"][data-fine-index="' + fineIndex + '"]');
    $row.removeClass('dismiss-active uphold-active');
    if (current) {
      $row.filter('[data-verdict="' + current + '"]').addClass(current === 'dismissed' ? 'dismiss-active' : 'uphold-active');
    }
    // Strike-through the fine label when dismissed.
    var $fineRow = $('.jd-fine-toggle[data-item-index="' + itemIndex + '"][data-fine-index="' + fineIndex + '"]').first().closest('.jd-item-fine-row');
    $fineRow.find('.jd-item-fine-label').toggleClass('jd-fine-status-strike', current === 'dismissed');
  }

  function refreshTopToggleClasses(itemIndex) {
    var $container = $('.jd-contested-item[data-item-index="' + itemIndex + '"]');
    var $dismiss = $container.find('.jd-toggle-dismiss');
    var $uphold = $container.find('.jd-toggle-uphold');
    $dismiss.removeClass('dismiss-active');
    $uphold.removeClass('uphold-active');
    var v = resolutions[itemIndex];
    if (v === 'dismissed') $dismiss.addClass('dismiss-active');
    else if (v === 'upheld') $uphold.addClass('uphold-active');
    // 'partial' leaves both inactive — judge can see the per-charge state below.
  }

  // --- Render: Docket ---

  function renderDocket(session) {
    if (!session) return;

    var docket = session.docket || [];
    var $list = $('#docketList');
    var $count = $('#docketCount');

    $count.html('<i class="fa fa-file-lines"></i> ' + docket.length + ' case' + (docket.length !== 1 ? 's' : ''));

    if (docket.length === 0) {
      $list.html('<div class="jd-empty"><i class="fa fa-inbox"></i>No cases in the docket.</div>');
      return;
    }

    var html = docket.map(function(entry, idx) {
      var status = entry.status || 'pending';
      var caseId = entry.courtCaseID || entry.caseID || '';
      var isActive = status === 'active';
      var isCompleted = status === 'completed';
      var isUnresolved = status === 'unresolved';
      var isExpanded = (expandedDocketId === caseId);
      var entryClass = isActive ? ' docket-active' : (isCompleted ? ' docket-completed' : (isUnresolved ? ' docket-completed' : ''));
      if (isExpanded) entryClass += ' docket-expanded';

      // Cached case data for subtitle
      var cached = docketCaseCache[caseId];
      var civName = (entry.civilianName && String(entry.civilianName).trim()) || (cached && cached.civilianName && String(cached.civilianName).trim()) || 'Unknown Civilian';
      var caseNumber = (entry.caseNumber && String(entry.caseNumber).trim()) || (cached && cached.caseNumber && String(cached.caseNumber).trim()) || '';
      var itemCount = cached ? (cached.contestedItems || []).length : 0;
      var subText = cached
        ? itemCount + ' contested item' + (itemCount !== 1 ? 's' : '')
        : '';

      // Look up username from participants
      var entryUserId = entry.userID || (cached && cached.userID) || '';
      var ownerName = '';
      if (entryUserId && session.participants) {
        for (var p = 0; p < session.participants.length; p++) {
          if (session.participants[p].userID === entryUserId) {
            ownerName = session.participants[p].userName || '';
            break;
          }
        }
      }

      var row = '<div class="jd-docket-entry' + entryClass + '" data-case-id="' + caseId + '">';

      // Clickable summary row
      row += '<div class="jd-docket-summary" onclick="toggleDocketEntry(\'' + caseId + '\')">';
      row += '<div class="jd-docket-order">' + (entry.order || (idx + 1)) + '</div>';
      row += '<div class="jd-docket-entry-info">';
      row += '<div class="jd-docket-entry-name">';
      if (caseNumber) {
        row += '<span style="display:inline-flex;align-items:center;font-family:JetBrains Mono,ui-monospace,monospace;font-size:0.68rem;font-weight:600;color:#a78bfa;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);padding:0.05rem 0.35rem;border-radius:4px;margin-right:0.4rem;">' + escHtml(caseNumber) + '</span>';
      }
      row += '<i class="fa fa-user" style="font-size:0.7rem;color:var(--text-tertiary);margin-right:0.3rem;"></i><span class="jd-docket-civ-name">' + escHtml(civName) + '</span>';
      if (ownerName) {
        row += ' <span class="jd-docket-owner-badge"><i class="fa fa-id-badge" style="margin-right:0.2rem;"></i>' + escHtml(ownerName) + '</span>';
      }
      row += ' <span class="jd-badge jd-badge-' + status + '">' + status + '</span>';
      row += '</div>';
      if (subText) {
        row += '<div class="jd-docket-entry-sub"><i class="fa fa-file-lines"></i>' + subText + '</div>';
      }
      row += '</div>';

      // Activate button for judge (only for pending entries when session is in_progress)
      if (currentRole === 'judge' && status === 'pending' && session.status === 'in_progress') {
        row += '<button class="jd-btn jd-btn-gold jd-btn-sm jd-docket-activate-btn" onclick="event.stopPropagation(); activateDocketEntry(\'' + caseId + '\');"><i class="fa fa-play"></i> Activate</button>';
      }

      // Status icon
      if (isCompleted) {
        row += '<i class="fa fa-check-circle" style="color:var(--status-completed-text);"></i>';
      } else if (isUnresolved) {
        row += '<i class="fa fa-rotate-left" style="color:#f59e9e;" title="Returned to scheduled"></i>';
      }

      row += '<i class="fa fa-chevron-down jd-docket-chevron"></i>';
      row += '</div>'; // end summary

      // Expandable detail panel
      row += '<div class="jd-docket-detail">';
      row += '<div class="jd-docket-detail-inner" id="docket-detail-' + caseId + '">';
      if (cached) {
        row += renderDocketDetailContent(cached);
      } else {
        row += '<div style="text-align:center;padding:0.5rem;color:var(--text-tertiary);font-size:0.8rem;"><i class="fa fa-spinner fa-spin"></i> Loading...</div>';
      }
      row += '</div>';
      row += '</div>';

      row += '</div>';
      return row;
    }).join('');

    $list.html(html);

    // Proactively fetch court case details for all docket entries
    docket.forEach(function(entry) {
      var caseId = entry.courtCaseID || entry.caseID || '';
      if (!caseId || docketCaseCache[caseId]) return;
      $.ajax({
        url: API_URL + '/api/v2/court-cases/' + caseId,
        method: 'GET',
        success: function(resp) {
          var d = resp.courtCase || resp.data || resp;
          docketCaseCache[caseId] = d;
          var $entry = $list.find('[data-case-id="' + caseId + '"]');
          if ($entry.length) {
            // Update the detail panel so "Loading..." is replaced
            $('#docket-detail-' + caseId).html(renderDocketDetailContent(d));
            // Update subtitle with contested item count
            var itemCount = (d.contestedItems || []).length;
            var subText = itemCount + ' contested item' + (itemCount !== 1 ? 's' : '');
            var $sub = $entry.find('.jd-docket-entry-sub');
            if ($sub.length) {
              $sub.html('<i class="fa fa-file-lines"></i>' + subText);
            } else {
              $entry.find('.jd-docket-entry-info').append('<div class="jd-docket-entry-sub"><i class="fa fa-file-lines"></i>' + subText + '</div>');
            }
            // Backfill case number pill if entry didn't carry it
            var $nameWrap = $entry.find('.jd-docket-entry-name');
            if ($nameWrap.length && d.caseNumber && !$nameWrap.find('span[style*="JetBrains Mono"]').length) {
              $nameWrap.prepend('<span style="display:inline-flex;align-items:center;font-family:JetBrains Mono,ui-monospace,monospace;font-size:0.68rem;font-weight:600;color:#a78bfa;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);padding:0.05rem 0.35rem;border-radius:4px;margin-right:0.4rem;">' + escHtml(d.caseNumber) + '</span>');
            }
            // Backfill civilian name
            backfillDocketCivName($entry, d);
            // Backfill owner username badge if not already shown
            if (!$entry.find('.jd-docket-owner-badge').length && d.userID && session.participants) {
              for (var p = 0; p < session.participants.length; p++) {
                if (session.participants[p].userID === d.userID) {
                  var ownerName = session.participants[p].userName || '';
                  if (ownerName) {
                    $entry.find('.jd-docket-civ-name').after(' <span class="jd-docket-owner-badge"><i class="fa fa-id-badge" style="margin-right:0.2rem;"></i>' + escHtml(ownerName) + '</span>');
                  }
                  break;
                }
              }
            }
          }
        }
      });
    });
  }

  function renderDocketDetailContent(caseData) {
    var items = caseData.contestedItems || [];
    var resolutions = caseData.resolutions || [];
    var html = '';

    // Build a lookup of resolutions by itemID
    var resolutionMap = {};
    resolutions.forEach(function(r) {
      if (r.itemID) resolutionMap[r.itemID] = r;
    });

    // Contested items with inline verdict badges
    if (items.length > 0) {
      html += '<div class="jd-docket-detail-label">Contested Items</div>';
      html += items.map(function(item) {
        var typeClass = (item.itemType || '').toLowerCase();
        var row = '<div class="jd-docket-item-row">' +
          '<span class="jd-docket-item-type ' + typeClass + '">' + escHtml(item.itemType || '') + '</span>' +
          '<span class="jd-docket-item-summary">' + escHtml(item.summary || 'No description') + '</span>';

        // Show verdict badge inline if resolved
        var res = resolutionMap[item.itemID];
        if (res && res.verdict) {
          var isDismissed = res.verdict === 'dismissed';
          var badgeClass = isDismissed ? 'jd-verdict-dismissed' : 'jd-verdict-upheld';
          row += '<span class="jd-verdict-badge ' + badgeClass + '">' + escHtml(res.verdict) + '</span>';
        }

        row += '</div>';

        // Show judge notes if any
        if (res && res.judgeNotes) {
          row += '<div class="jd-docket-judge-notes"><i class="fa fa-gavel" style="font-size:0.65rem;margin-right:0.3rem;"></i>' + escHtml(res.judgeNotes) + '</div>';
        }

        return row;
      }).join('');
    }

    // Statement
    if (caseData.statement) {
      html += '<div class="jd-docket-detail-label">Civilian Statement</div>';
      html += '<div class="jd-docket-statement">' + escHtml(caseData.statement) + '</div>';
    }

    return html || '<div style="color:var(--text-tertiary);font-size:0.8rem;padding:0.3rem 0;">No details available.</div>';
  }

  window.toggleDocketEntry = function(caseId) {
    if (!caseId) return;
    var wasExpanded = (expandedDocketId === caseId);
    expandedDocketId = wasExpanded ? null : caseId;

    // Toggle classes
    $('.jd-docket-entry').each(function() {
      var id = $(this).data('case-id');
      if (id === caseId) {
        $(this).toggleClass('docket-expanded');
      } else {
        $(this).removeClass('docket-expanded');
      }
    });

    // If expanding and not cached, fetch case details
    if (!wasExpanded && !docketCaseCache[caseId]) {
      $.ajax({
        url: API_URL + '/api/v2/court-cases/' + caseId,
        method: 'GET',
        success: function(c) {
          var d = c.courtCase || c.details || c;
          docketCaseCache[caseId] = d;
          $('#docket-detail-' + caseId).html(renderDocketDetailContent(d));
          var $entry = $('.jd-docket-entry[data-case-id="' + caseId + '"]');

          // Update subtitle with contested item count
          var itemCount = (d.contestedItems || []).length;
          var $sub = $entry.find('.jd-docket-entry-sub');
          var subText = itemCount + ' contested item' + (itemCount !== 1 ? 's' : '');
          if ($sub.length) {
            $sub.html('<i class="fa fa-file-lines"></i>' + subText);
          } else {
            $entry.find('.jd-docket-entry-info').append('<div class="jd-docket-entry-sub"><i class="fa fa-file-lines"></i>' + subText + '</div>');
          }

          // Backfill civilian name
          backfillDocketCivName($entry, d);
        },
        error: function() {
          $('#docket-detail-' + caseId).html('<div style="color:#f87171;font-size:0.8rem;padding:0.3rem 0;">Failed to load case details.</div>');
        }
      });
    }
  };

  // --- Render: Participants ---

  function setDocketEntryName($entry, name) {
    $entry.find('.jd-docket-civ-name').text(name);
  }

  function backfillDocketCivName($entry, caseData) {
    var name = (caseData.civilianName || '').trim();
    if (name) {
      setDocketEntryName($entry, name);
      return;
    }
    // civilianName empty — fetch the civilian record to get their name
    var civId = caseData.civilianID;
    if (!civId) return;
    $.ajax({
      url: API_URL + '/api/v1/civilian/' + civId,
      method: 'GET',
      success: function(civ) {
        var cd = civ.civilian || civ;
        var fullName = (cd.name || '').trim() || ((cd.firstName || '') + ' ' + (cd.lastName || '')).trim();
        if (fullName) {
          caseData.civilianName = fullName;
          setDocketEntryName($entry, fullName);
        }
      }
    });
  }

  function renderParticipants(session) {
    if (!session) return;

    var participants = session.participants || [];
    var $list = $('#participantsList');
    var $count = $('#participantCount');

    $count.html('<i class="fa fa-user"></i> ' + participants.length);

    if (participants.length === 0) {
      $list.html('<div class="jd-participants-empty">No participants yet.</div>');
      return;
    }

    // Split into court proceedings (judge + defendant) and spectators
    var proceedings = [];
    var spectators = [];
    for (var i = 0; i < participants.length; i++) {
      var role = participants[i].role || 'spectator';
      if (role === 'judge' || role === 'defendant') {
        proceedings.push(participants[i]);
      } else {
        spectators.push(participants[i]);
      }
    }

    // Sort proceedings: judge first, then defendants
    proceedings.sort(function(a, b) {
      return (a.role === 'judge' ? 0 : 1) - (b.role === 'judge' ? 0 : 1);
    });

    function renderParticipantRow(p) {
      var initials = getInitials(p.userName || 'U');
      var roleClass = 'role-' + (p.role || 'spectator');
      var roleBadgeClass = 'jd-role-' + (p.role || 'spectator');
      return '<div class="jd-participant ' + roleClass + '">' +
        '<div class="jd-participant-avatar">' + initials + '</div>' +
        '<span class="jd-participant-name">' + escHtml(p.userName || 'Unknown') + '</span>' +
        '<span class="jd-role-badge ' + roleBadgeClass + '">' + escHtml(p.role || 'spectator') + '</span>' +
        '</div>';
    }

    var html = '';

    // Court Proceedings section
    html += '<div class="jd-participants-section-label"><i class="fa fa-gavel"></i> Court Proceedings</div>';
    html += '<div class="jd-participants-list">';
    if (proceedings.length > 0) {
      html += proceedings.map(renderParticipantRow).join('');
    } else {
      html += '<div class="jd-participants-empty">No court members present.</div>';
    }
    html += '</div>';

    // Spectators section
    html += '<div class="jd-participants-section-label" style="margin-top:0.5rem;"><i class="fa fa-eye"></i> Spectators</div>';
    html += '<div class="jd-participants-list">';
    if (spectators.length > 0) {
      html += spectators.map(renderParticipantRow).join('');
    } else {
      html += '<div class="jd-participants-empty">No spectators.</div>';
    }
    html += '</div>';

    $list.html(html);
  }

  // --- Render: Chat ---

  function renderChat(messages) {
    var $container = $('#chatMessages');

    if (!messages || messages.length === 0) {
      $container.html('<div class="jd-chat-system">No messages yet. Be the first to say something.</div>');
      return;
    }

    var html = messages.map(function(m) {
      // System messages
      if (m.type === 'system') {
        return '<div class="jd-chat-system">' + escHtml(m.message || m.text || '') + '</div>';
      }

      var role = m.role || 'spectator';
      var msgClass = 'msg-' + role;
      var roleBadgeClass = 'jd-role-' + role;
      var initials = getInitials(m.userName || 'U');
      var time = m.timestamp || m.createdAt || '';
      var timeStr = time ? formatChatTime(time) : '';

      return '<div class="jd-chat-msg ' + msgClass + '">' +
        '<div class="jd-chat-msg-avatar">' + initials + '</div>' +
        '<div class="jd-chat-msg-content">' +
          '<div class="jd-chat-msg-header">' +
            '<span class="jd-chat-msg-name">' + escHtml(m.userName || 'Unknown') + '</span>' +
            '<span class="jd-role-badge ' + roleBadgeClass + '">' + escHtml(role) + '</span>' +
            '<span class="jd-chat-msg-time">' + timeStr + '</span>' +
          '</div>' +
          '<div class="jd-chat-msg-text">' + linkifyText(m.message || m.text || '') + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    $container.html(html);

    // Auto-scroll to bottom
    $container.scrollTop($container[0].scrollHeight);
  }

  // --- Actions ---

  function startSession() {
    $('#startSessionBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Starting...');
    // Show loading state on main panels immediately
    $('#docketList').html('<div class="jd-loading"><div class="jd-spinner"></div></div>');
    $('#noActiveCasePanel').hide();
    $('#activeCasePanel').show();
    $('#activeCaseBody').html('<div class="jd-loading"><div class="jd-spinner"></div></div>');

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/start',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ judgeID: userId }),
      success: function() {
        // Re-fetch full session since start only returns a message
        loadSession();
      },
      error: function(xhr) {
        jdAlert('Session Error', 'Failed to start session: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'), 'fa-circle-xmark');
      },
      complete: function() {
        $('#startSessionBtn').prop('disabled', false).html('<i class="fa fa-play"></i> Start Session');
      }
    });
  }

  function endSession() {
    // Check for unresolved docket entries before ending
    var docket = (currentSession && currentSession.docket) || [];
    var unresolvedCount = 0;
    for (var i = 0; i < docket.length; i++) {
      if (docket[i].status === 'pending' || docket[i].status === 'active') {
        unresolvedCount++;
      }
    }

    if (unresolvedCount > 0) {
      jdConfirm({
        icon: 'fa-triangle-exclamation',
        iconClass: 'icon-danger',
        title: 'Unresolved Cases',
        message: 'There ' + (unresolvedCount === 1 ? 'is <strong>1</strong> unresolved case' : 'are <strong>' + unresolvedCount + '</strong> unresolved cases') +
          ' remaining in the docket. Cancelling the session will reset ' + (unresolvedCount === 1 ? 'it' : 'them') +
          ' back to <strong>scheduled</strong> status so ' + (unresolvedCount === 1 ? 'it' : 'they') +
          ' can be added to a future session.<br><br>Are you sure you want to cancel the session?',
        confirmLabel: 'Cancel Session',
        confirmClass: 'jd-btn jd-btn-danger',
        onConfirm: function() { doEndSession(); }
      });
    } else {
      doEndSession();
    }
  }

  function doEndSession() {
    $('#endSessionBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Ending...');

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/end',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ judgeID: userId }),
      success: function() {
        // Stop polling
        if (sessionPollTimer) clearInterval(sessionPollTimer);
        if (chatPollTimer) clearInterval(chatPollTimer);
        // Re-fetch full session since end only returns a message
        loadSession();
      },
      error: function(xhr) {
        jdAlert('Session Error', 'Failed to end session: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'), 'fa-circle-xmark');
      },
      complete: function() {
        $('#endSessionBtn').prop('disabled', false).html('<i class="fa fa-stop"></i> End Session');
      }
    });
  }

  window.activateDocketEntry = function(caseId, skip) {
    if (!caseId) return;

    // Show loading state immediately
    $('#noActiveCasePanel').hide();
    $('#activeCasePanel').show();
    $('#activeCaseBody').html('<div class="jd-loading"><div class="jd-spinner"></div></div>');

    var activateUrl = API_URL + '/api/v2/court-sessions/' + sessionId + '/docket/' + caseId + '/activate';
    if (skip) activateUrl += '?skip=true';

    $.ajax({
      url: activateUrl,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ judgeID: userId }),
      success: function() {
        // Re-fetch full session since activate only returns a message
        $.ajax({
          url: API_URL + '/api/v2/court-sessions/' + sessionId,
          method: 'GET',
          success: function(resp) {
            currentSession = resp.courtSession || resp.data || resp;
            determineRole();
            renderActiveCasePanel(currentSession);
            renderDocket(currentSession);
          },
          error: function() {
            jdAlert('Session Error', 'Failed to refresh session data.', 'fa-circle-xmark');
          }
        });
      },
      error: function(xhr) {
        jdAlert('Docket Error', 'Failed to activate case: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'), 'fa-circle-xmark');
      }
    });
  };

  function activateNextDocketEntry() {
    if (!currentSession) return;

    var docket = currentSession.docket || [];
    var nextEntry = null;

    // Find the first pending entry
    for (var i = 0; i < docket.length; i++) {
      if (docket[i].status === 'pending') {
        nextEntry = docket[i];
        break;
      }
    }

    if (!nextEntry) {
      jdAlert('Docket Complete', 'No more pending cases in the docket.', 'fa-check-circle');
      return;
    }

    var caseId = nextEntry.courtCaseID || nextEntry.caseID || '';
    if (caseId) {
      // Skip: current active case goes back to pending
      activateDocketEntry(caseId, true);
    }
  }

  function submitResolution() {
    if (!activeCaseData) { jdAlert('Resolution Error', 'No active case to resolve.', 'fa-circle-xmark'); return; }

    var items = activeCaseData.contestedItems || [];
    if (items.length === 0) { jdAlert('Resolution Error', 'No contested items to resolve.', 'fa-circle-xmark'); return; }

    // Build resolutions array. For items that have charges, every charge
    // must be resolved individually; otherwise the top-level verdict alone
    // is required.
    var resolutionsArr = [];
    var incompleteIdx = -1;
    for (var i = 0; i < items.length; i++) {
      var chargeCount = itemChargeCounts[i] || 0;
      var entry = {
        itemIndex: i,
        itemType: items[i].itemType || '',
        itemID: items[i].itemID || items[i]._id || '',
        summary: items[i].summary || '',
      };
      if (chargeCount > 0) {
        var bucket = chargeResolutions[i] || {};
        var charges = [];
        for (var k = 0; k < chargeCount; k++) {
          if (bucket[k] !== 'dismissed' && bucket[k] !== 'upheld') {
            incompleteIdx = i;
            break;
          }
          charges.push({ fineIndex: k, verdict: bucket[k] });
        }
        if (incompleteIdx === i) break;
        entry.chargeResolutions = charges;
        entry.verdict = resolutions[i] || '';
      } else {
        if (!resolutions[i]) { incompleteIdx = i; break; }
        entry.verdict = resolutions[i];
      }
      resolutionsArr.push(entry);
    }

    if (incompleteIdx !== -1) {
      jdAlert('Incomplete Resolution', 'Please rule on every charge in every contested item before submitting.', 'fa-triangle-exclamation');
      return;
    }

    var caseId = $('#submitResolutionBtn').data('case-id');
    if (!caseId) { jdAlert('Resolution Error', 'Cannot determine case ID.', 'fa-circle-xmark'); return; }

    $('#submitResolutionBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Submitting...');
    pollPaused = true; // Pause polling to prevent race condition

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + caseId + '/resolve',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        resolutions: resolutionsArr,
        judgeID: userId,
        judgeName: userName
      }),
      success: function() {
        activeCaseData = null;
        resolutions = {};
        chargeResolutions = {};
        itemChargeCounts = {};
        resolvedCaseIds[caseId] = true;

        // Mark the current docket entry as completed locally
        if (currentSession && currentSession.docket) {
          for (var d = 0; d < currentSession.docket.length; d++) {
            if (currentSession.docket[d].status === 'active') {
              currentSession.docket[d].status = 'completed';
            }
          }
        }

        // Find next pending case in the docket
        var docket = (currentSession && currentSession.docket) || [];
        var nextEntry = null;
        for (var d = 0; d < docket.length; d++) {
          if (docket[d].status === 'pending') {
            nextEntry = docket[d];
            break;
          }
        }

        if (nextEntry) {
          // Activate the next case (server-side also marks previous as completed)
          var nextCaseId = nextEntry.courtCaseID || nextEntry.caseID || '';
          if (nextCaseId) {
            pollPaused = false;
            activateDocketEntry(nextCaseId);
          }
        } else {
          // No more pending — show completion and refresh
          jdShowModal({
            icon: 'fa-check-circle',
            iconClass: 'icon-info',
            title: 'Docket Complete',
            message: 'All cases in the docket have been resolved.',
            confirmLabel: 'OK',
            showCancel: false,
            onConfirm: function() {}
          });
          // Refresh to show updated docket state, then resume polling
          setTimeout(function() {
            loadSession();
            pollPaused = false;
          }, 1000);
        }
      },
      error: function(xhr) {
        pollPaused = false;
        jdAlert('Resolution Error', 'Failed to submit resolution: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'), 'fa-circle-xmark');
      },
      complete: function() {
        $('#submitResolutionBtn').prop('disabled', false).html('<i class="fa fa-check"></i> Submit Resolution');
      }
    });
  }

  function sendChatMessage(message) {
    var $input = $('#chatInput');
    var $btn = $('#chatSendBtn');
    $input.val('');
    $btn.prop('disabled', true);

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/chat',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        message: message,
        userName: userName,
        userID: userId,
        role: currentRole
      }),
      success: function(resp) {
        // Add message optimistically
        var newMsg = resp.chatMessage || resp.data || {
          message: message,
          userName: userName,
          userID: userId,
          role: currentRole,
          timestamp: new Date().toISOString()
        };
        chatMessages.push(newMsg);
        renderChat(chatMessages);
      },
      error: function() {
        // Show message failed — re-populate input
        $input.val(message);
      },
      complete: function() {
        $btn.prop('disabled', false);
        $input.focus();
      }
    });
  }

  // --- Helpers ---

  function getActiveDocketEntry(session) {
    var docket = session.docket || [];
    for (var i = 0; i < docket.length; i++) {
      if (docket[i].status === 'active') return docket[i];
    }
    return null;
  }

  function getActiveDocketCaseId(session) {
    var entry = getActiveDocketEntry(session);
    return entry ? (entry.courtCaseID || entry.caseID || '') : '';
  }

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
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

  function linkifyText(str) {
    var escaped = escHtml(str);
    return escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="jd-chat-link">$1</a>');
  }

  function getItemTypeClass(type) {
    var t = (type || '').toLowerCase();
    if (t === 'arrest') return 'jd-badge jd-type-arrest';
    if (t === 'citation') return 'jd-badge jd-type-citation';
    if (t === 'charge') return 'jd-badge jd-type-charge';
    return 'jd-badge jd-type-default';
  }

  function formatChatTime(timestamp) {
    try {
      var d = new Date(timestamp);
      var hours = d.getHours();
      var mins = d.getMinutes();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return hours + ':' + (mins < 10 ? '0' : '') + mins + ' ' + ampm;
    } catch (e) {
      return '';
    }
  }

  function showError(msg) {
    $('#mainLoading').html(
      '<div class="jd-empty">' +
        '<i class="fa fa-exclamation-triangle"></i>' +
        escHtml(msg) + '<br><br>' +
        '<a href="javascript:history.back()" class="jd-btn jd-btn-ghost"><i class="fa fa-arrow-left"></i> Return to Dashboard</a>' +
      '</div>'
    );
  }

})();
