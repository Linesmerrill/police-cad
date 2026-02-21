// court-session.js — Client-side logic for the Live Court Session page

(function() {
  'use strict';

  // --- Globals from EJS ---
  var userId = (dbUser && dbUser._id) || (dbUser && dbUser.user && dbUser.user._id) || '';
  var userName = '';
  if (dbUser && dbUser.user) {
    userName = ((dbUser.user.firstName || '') + ' ' + (dbUser.user.lastName || '')).trim();
    userName = userName || dbUser.user.email || 'Unknown';
  }

  // --- Session state ---
  var sessionId = '';
  var currentSession = null;
  var currentRole = 'spectator'; // judge, defendant, spectator
  var activeCaseData = null;
  var chatMessages = [];
  var lastChatTimestamp = '';
  var resolutions = {}; // { itemIndex: 'dismissed' | 'upheld' }
  var sessionPollTimer = null;
  var chatPollTimer = null;

  // --- Init ---
  $(document).ready(function() {
    sessionId = getQueryParam('s');
    if (!sessionId) {
      showError('No session ID provided. Please return to the dashboard.');
      return;
    }

    loadSession();
    joinSession();
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
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
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
      if (!confirm('Are you sure you want to end this court session?')) return;
      endSession();
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

    // Submit resolution
    $(document).on('click', '#submitResolutionBtn', function() {
      submitResolution();
    });

    // Next case
    $(document).on('click', '#nextCaseBtn', function() {
      activateNextDocketEntry();
    });

    // Activate specific docket entry (judge only)
    $(document).on('click', '.jd-docket-activate-btn', function() {
      var caseId = $(this).data('case-id');
      activateDocketEntry(caseId);
    });
  }

  // --- Data Loading ---

  function loadSession() {
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId,
      method: 'GET',
      success: function(resp) {
        currentSession = resp.courtSession || resp.data || resp;
        determineRole();
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
        chatMessages = resp.messages || resp.data || resp || [];
        if (chatMessages.length > 0) {
          lastChatTimestamp = chatMessages[chatMessages.length - 1].timestamp || chatMessages[chatMessages.length - 1].createdAt || '';
        }
        renderChat(chatMessages);
      }
    });
  }

  function pollSession() {
    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId,
      method: 'GET',
      success: function(resp) {
        var newSession = resp.courtSession || resp.data || resp;
        var statusChanged = !currentSession || currentSession.status !== newSession.status;
        var activeCaseChanged = !currentSession ||
          getActiveDocketCaseId(currentSession) !== getActiveDocketCaseId(newSession);
        var participantsChanged = !currentSession ||
          (currentSession.participants || []).length !== (newSession.participants || []).length;

        currentSession = newSession;
        determineRole();

        if (statusChanged) {
          renderSessionHeader(currentSession);
          renderDocket(currentSession);
        }
        if (activeCaseChanged) {
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
    var url = API_URL + '/api/v2/court-sessions/' + sessionId + '/chat';
    if (lastChatTimestamp) {
      url += '?after=' + encodeURIComponent(lastChatTimestamp);
    }

    $.ajax({
      url: url,
      method: 'GET',
      success: function(resp) {
        var newMessages = resp.messages || resp.data || resp || [];
        if (newMessages.length > 0) {
          // If we used the "after" param, append; otherwise replace
          if (lastChatTimestamp) {
            chatMessages = chatMessages.concat(newMessages);
          } else {
            chatMessages = newMessages;
          }
          lastChatTimestamp = newMessages[newMessages.length - 1].timestamp || newMessages[newMessages.length - 1].createdAt || '';
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
      } else {
        $('#noActiveCaseHint').text('Waiting for the judge to call the next case.');
      }
      return;
    }

    $('#noActiveCasePanel').hide();
    $('#activeCasePanel').show();
    $('#activeCaseBody').html('<div class="jd-loading"><div class="jd-spinner"></div></div>');

    var caseId = activeDocketEntry.courtCaseID || activeDocketEntry.caseID || '';
    if (!caseId) {
      $('#activeCaseBody').html('<div class="jd-empty"><i class="fa fa-exclamation-triangle"></i>No case ID found for this docket entry.</div>');
      return;
    }

    $.ajax({
      url: API_URL + '/api/v2/court-cases/' + caseId,
      method: 'GET',
      success: function(resp) {
        activeCaseData = resp.courtCase || resp.data || resp;
        resolutions = {}; // Reset resolutions for new case
        var html = renderCaseDetails(activeCaseData, caseId);
        $('#activeCaseBody').html(html);
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

    var html = '';

    // Civilian name
    html += '<div class="jd-active-case-civ">' + escHtml(civName) + '</div>';

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
        html += '<div class="jd-contested-item-info">';
        html += '<span class="jd-badge ' + typeClass + '">' + escHtml(item.itemType || 'item') + '</span>';
        html += '<span class="jd-contested-item-summary">' + escHtml(item.summary || 'No description') + '</span>';
        html += '</div>';

        // Resolution toggles (judge only)
        if (currentRole === 'judge') {
          html += renderResolutionToggles(i);
        }

        html += '</div>';
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

  function toggleResolution(itemIndex, verdict) {
    if (resolutions[itemIndex] === verdict) {
      delete resolutions[itemIndex]; // Toggle off
    } else {
      resolutions[itemIndex] = verdict;
    }

    // Update toggle button states in DOM
    var $container = $('.jd-contested-item[data-item-index="' + itemIndex + '"]');
    var $dismiss = $container.find('.jd-toggle-dismiss');
    var $uphold = $container.find('.jd-toggle-uphold');

    $dismiss.removeClass('dismiss-active');
    $uphold.removeClass('uphold-active');

    if (resolutions[itemIndex] === 'dismissed') $dismiss.addClass('dismiss-active');
    if (resolutions[itemIndex] === 'upheld') $uphold.addClass('uphold-active');
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
      var civName = entry.civilianName || 'Case #' + (idx + 1);
      var isActive = status === 'active';
      var isCompleted = status === 'completed';
      var entryClass = isActive ? ' docket-active' : (isCompleted ? ' docket-completed' : '');

      var row = '<div class="jd-docket-entry' + entryClass + '" data-case-id="' + (entry.courtCaseID || entry.caseID || '') + '">';
      row += '<div class="jd-docket-order">' + (entry.order || (idx + 1)) + '</div>';
      row += '<div class="jd-docket-entry-info">';
      row += '<div class="jd-docket-entry-name">' + escHtml(civName);
      row += ' <span class="jd-badge jd-badge-' + status + '">' + status + '</span>';
      row += '</div>';
      row += '</div>';

      // Activate button for judge (only for pending entries when session is in_progress)
      if (currentRole === 'judge' && status === 'pending' && session.status === 'in_progress') {
        row += '<button class="jd-btn jd-btn-gold jd-btn-sm jd-docket-activate-btn" data-case-id="' + (entry.courtCaseID || entry.caseID || '') + '"><i class="fa fa-play"></i> Activate</button>';
      }

      // Completed icon
      if (isCompleted) {
        row += '<i class="fa fa-check-circle" style="color:var(--status-completed-text);"></i>';
      }

      row += '</div>';
      return row;
    }).join('');

    $list.html(html);
  }

  // --- Render: Participants ---

  function renderParticipants(session) {
    if (!session) return;

    var participants = session.participants || [];
    var $list = $('#participantsList');
    var $count = $('#participantCount');

    $count.html('<i class="fa fa-user"></i> ' + participants.length);

    if (participants.length === 0) {
      $list.html('<div style="color:var(--text-muted);font-size:0.85rem;padding:0.25rem 0;">No participants yet.</div>');
      return;
    }

    // Sort: judge first, then defendants, then spectators
    var rolePriority = { judge: 0, defendant: 1, spectator: 2 };
    var sorted = participants.slice().sort(function(a, b) {
      return (rolePriority[a.role] || 2) - (rolePriority[b.role] || 2);
    });

    var html = sorted.map(function(p) {
      var initials = getInitials(p.userName || 'U');
      var roleClass = 'role-' + (p.role || 'spectator');
      var roleBadgeClass = 'jd-role-' + (p.role || 'spectator');

      return '<div class="jd-participant ' + roleClass + '">' +
        '<div class="jd-participant-avatar">' + initials + '</div>' +
        '<span class="jd-participant-name">' + escHtml(p.userName || 'Unknown') + '</span>' +
        '<span class="jd-role-badge ' + roleBadgeClass + '">' + escHtml(p.role || 'spectator') + '</span>' +
        '</div>';
    }).join('');

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
          '<div class="jd-chat-msg-text">' + escHtml(m.message || m.text || '') + '</div>' +
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

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/start',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ judgeID: userId }),
      success: function(resp) {
        currentSession = resp.courtSession || resp.data || resp;
        determineRole();
        renderAll();
      },
      error: function(xhr) {
        alert('Failed to start session: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'));
      },
      complete: function() {
        $('#startSessionBtn').prop('disabled', false).html('<i class="fa fa-play"></i> Start Session');
      }
    });
  }

  function endSession() {
    $('#endSessionBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Ending...');

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/end',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ judgeID: userId }),
      success: function(resp) {
        currentSession = resp.courtSession || resp.data || resp;
        determineRole();
        renderAll();

        // Stop polling
        if (sessionPollTimer) clearInterval(sessionPollTimer);
        if (chatPollTimer) clearInterval(chatPollTimer);
      },
      error: function(xhr) {
        alert('Failed to end session: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'));
      },
      complete: function() {
        $('#endSessionBtn').prop('disabled', false).html('<i class="fa fa-stop"></i> End Session');
      }
    });
  }

  function activateDocketEntry(caseId) {
    if (!caseId) return;

    $.ajax({
      url: API_URL + '/api/v2/court-sessions/' + sessionId + '/docket/' + caseId + '/activate',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ judgeID: userId }),
      success: function(resp) {
        currentSession = resp.courtSession || resp.data || resp;
        determineRole();
        renderActiveCasePanel(currentSession);
        renderDocket(currentSession);
      },
      error: function(xhr) {
        alert('Failed to activate case: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'));
      }
    });
  }

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
      alert('No more pending cases in the docket.');
      return;
    }

    var caseId = nextEntry.courtCaseID || nextEntry.caseID || '';
    if (caseId) {
      activateDocketEntry(caseId);
    }
  }

  function submitResolution() {
    if (!activeCaseData) { alert('No active case to resolve.'); return; }

    var items = activeCaseData.contestedItems || [];
    if (items.length === 0) { alert('No contested items to resolve.'); return; }

    // Build resolutions array
    var resolutionsArr = [];
    var allResolved = true;
    for (var i = 0; i < items.length; i++) {
      if (!resolutions[i]) {
        allResolved = false;
        break;
      }
      resolutionsArr.push({
        itemIndex: i,
        itemType: items[i].itemType || '',
        itemID: items[i].itemID || items[i]._id || '',
        summary: items[i].summary || '',
        verdict: resolutions[i]
      });
    }

    if (!allResolved) {
      alert('Please select Dismiss or Uphold for every contested item before submitting.');
      return;
    }

    var caseId = $('#submitResolutionBtn').data('case-id');
    if (!caseId) { alert('Cannot determine case ID.'); return; }

    $('#submitResolutionBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Submitting...');

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
        // Advance to next docket entry
        activeCaseData = null;
        resolutions = {};
        activateNextDocketEntry();

        // Refresh session to get updated docket statuses
        setTimeout(function() { loadSession(); }, 500);
      },
      error: function(xhr) {
        alert('Failed to submit resolution: ' + ((xhr.responseJSON && xhr.responseJSON.message) || 'Unknown error'));
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
        lastChatTimestamp = newMsg.timestamp || newMsg.createdAt || lastChatTimestamp;
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
        '<a href="/judicial-dashboard" class="jd-btn jd-btn-ghost"><i class="fa fa-arrow-left"></i> Return to Dashboard</a>' +
      '</div>'
    );
  }

})();
