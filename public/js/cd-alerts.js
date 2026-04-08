/**
 * Command Dashboard — Real-Time Emergency Alert Banners
 *
 * Injects sticky Signal 100 and Panic alert banners at the top of `.cd-main`
 * and keeps them synchronised via Socket.IO events and REST polling on load.
 *
 * Dependencies (provided by the host page):
 *   - jQuery ($)
 *   - Socket.IO  (io)
 *   - window.ddConfig  { API_URL, communityId, userId, userName, dbUser }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 *   - window.ddModal() Unified modal helper
 */
;(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  function cfg()    { return window.ddConfig || {}; }
  function esc(s)   { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }
  function apiUrl() { return cfg().API_URL || ''; }

  var communityId, userId, userName;

  /* ───────────────────────────────────────────
     CSS Injection
     ─────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById('cd-alert-styles')) return;

    var css =
      /* ── Shared banner ── */
      '.cd-alert-banner{position:sticky;top:0;z-index:250;width:100%;overflow:hidden;transition:max-height .35s ease,opacity .35s ease;}' +

      /* ── Signal 100 ── */
      '.cd-alert-signal100{' +
        'background:rgba(127,29,29,0.85);' +
        'border-bottom:1px solid rgba(239,68,68,0.3);' +
        'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
        'box-shadow:0 4px 24px rgba(220,38,38,0.15),inset 0 1px 0 rgba(239,68,68,0.2);' +
        'color:#fff;' +
      '}' +
      '.cd-alert-content{display:flex;align-items:center;gap:0.875rem;padding:0.625rem 1.25rem;}' +
      '.cd-alert-icon{position:relative;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.3);}' +
      '.cd-alert-pulse{position:absolute;inset:-4px;border-radius:12px;border:2px solid rgba(239,68,68,0.4);animation:cd-alert-pulse 2s ease-out infinite;pointer-events:none;}' +
      '.cd-alert-text{flex:1;min-width:0;}' +
      '.cd-alert-title{font-weight:700;font-size:0.8125rem;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;color:#fca5a5;}' +
      '.cd-alert-detail{font-size:0.6875rem;color:rgba(255,255,255,0.7);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-alert-clear-btn{flex-shrink:0;padding:0.375rem 1rem;border-radius:var(--cd-radius-sm,8px);border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.15);color:#fca5a5;font-family:inherit;font-size:0.6875rem;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}' +
      '.cd-alert-clear-btn:hover{background:rgba(239,68,68,0.25);border-color:rgba(239,68,68,0.6);color:#fff;}' +

      /* ── Panic banner ── */
      '.cd-alert-panic{' +
        'background:rgba(120,53,15,0.85);' +
        'border-bottom:1px solid rgba(245,158,11,0.3);' +
        'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
        'box-shadow:0 4px 24px rgba(245,158,11,0.1),inset 0 1px 0 rgba(245,158,11,0.15);' +
        'color:#fff;' +
      '}' +
      '#cd-panic-list{max-height:140px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.15) transparent;}' +
      '#cd-panic-list::-webkit-scrollbar{width:3px;}' +
      '#cd-panic-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px;}' +
      '.cd-panic-row{display:flex;align-items:center;justify-content:space-between;padding:0.5rem 1.25rem;transition:opacity .3s;}' +
      '.cd-panic-row+.cd-panic-row{border-top:1px solid rgba(245,158,11,0.15);}' +
      '.cd-panic-row.cd-panic-collapsed{opacity:0.4;}' +
      '.cd-panic-content{display:flex;align-items:center;gap:0.625rem;min-width:0;flex:1;}' +
      '.cd-panic-icon{position:relative;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;flex-shrink:0;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.3);color:#fcd34d;}' +
      '.cd-panic-text{display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;min-width:0;}' +
      '.cd-panic-title{font-weight:700;letter-spacing:0.06em;text-transform:uppercase;flex-shrink:0;color:#fcd34d;font-size:0.6875rem;}' +
      '.cd-panic-name{color:rgba(255,255,255,0.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cd-panic-clear{flex-shrink:0;padding:0.25rem 0.75rem;border-radius:6px;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.1);color:#fcd34d;font-family:inherit;font-size:0.625rem;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}' +
      '.cd-panic-clear:hover{background:rgba(245,158,11,0.2);border-color:rgba(245,158,11,0.5);color:#fff;}' +
      '.cd-panic-minimize{flex-shrink:0;padding:4px 8px;border:none;background:transparent;color:rgba(255,255,255,0.4);font-size:0.75rem;cursor:pointer;transition:color .15s;}' +
      '.cd-panic-minimize:hover{color:#fff;}' +

      /* ── Scroll hint ── */
      '.cd-panic-scroll-hint{text-align:center;font-size:0.5625rem;color:rgba(255,255,255,0.4);padding:0.25rem 0;letter-spacing:0.5px;text-transform:uppercase;}' +

      /* ── Animations ── */
      '@keyframes cd-alert-pulse{0%{opacity:1;transform:scale(1);}100%{opacity:0;transform:scale(1.5);}}' +

      /* ── Mobile ── */
      '@media(max-width:640px){' +
        '.cd-alert-content{padding:0.5rem 0.75rem;gap:0.5rem;}' +
        '.cd-alert-icon{width:28px;height:28px;font-size:0.75rem;}' +
        '.cd-alert-title{font-size:0.6875rem;}' +
        '.cd-alert-detail{font-size:0.625rem;}' +
        '.cd-alert-clear-btn{padding:0.25rem 0.625rem;font-size:0.625rem;}' +
        '.cd-panic-row{padding:0.375rem 0.75rem;}' +
        '.cd-panic-icon{width:24px;height:24px;font-size:0.625rem;}' +
        '.cd-panic-text{font-size:0.6875rem;}' +
      '}';

    var style = document.createElement('style');
    style.id = 'cd-alert-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ───────────────────────────────────────────
     Banner HTML Injection
     ─────────────────────────────────────────── */

  function injectBanners() {
    if (document.getElementById('cd-signal100-banner')) return;

    var html =
      '<!-- Signal 100 Banner (hidden by default) -->' +
      '<div id="cd-signal100-banner" class="cd-alert-banner cd-alert-signal100" style="display:none;">' +
        '<div class="cd-alert-content">' +
          '<div class="cd-alert-icon"><span class="cd-alert-pulse"></span><i class="fa fa-exclamation-triangle"></i></div>' +
          '<div class="cd-alert-text">' +
            '<div class="cd-alert-title">SIGNAL 100</div>' +
            '<div class="cd-alert-detail" id="cd-signal100-detail"></div>' +
          '</div>' +
          '<button class="cd-alert-clear-btn" onclick="cdClearSignal100()">Clear Signal 100</button>' +
        '</div>' +
      '</div>' +
      '<!-- Panic Alerts Container (hidden when empty) -->' +
      '<div id="cd-panic-banner" class="cd-alert-banner cd-alert-panic" style="display:none;">' +
        '<div id="cd-panic-list"></div>' +
      '</div>';

    var $main = $('.cd-main');
    if ($main.length) {
      $main.prepend(html);
    }
  }

  /* ───────────────────────────────────────────
     Signal 100
     ─────────────────────────────────────────── */

  function showSignal100(detail) {
    var $banner = $('#cd-signal100-banner');
    if (!$banner.length) return;
    $('#cd-signal100-detail').text(detail || '');
    $banner.slideDown(250);
  }

  function hideSignal100() {
    $('#cd-signal100-banner').slideUp(250);
  }

  window.cdFetchSignal100 = fetchSignal100;
  function fetchSignal100() {
    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(communityId) + '/signal-100',
      method: 'GET',
      dataType: 'json',
      success: function (res) {
        if (res && res.active) {
          var parts = [];
          if (res.activatedByCallSign) parts.push(res.activatedByCallSign);
          if (res.activatedByUsername) parts.push('(' + res.activatedByUsername + ')');
          if (res.activatedByDepartment) parts.push('— ' + res.activatedByDepartment);
          showSignal100('Activated by ' + (parts.join(' ') || 'Unknown'));
        } else {
          hideSignal100();
        }
      },
      error: function (xhr, status, err) {
        console.error('[cd-alerts] Failed to fetch Signal 100 status:', status, err);
      }
    });
  }

  /* ───────────────────────────────────────────
     Panic Alerts
     ─────────────────────────────────────────── */

  function renderPanicRow(alert) {
    var id = alert.alertId || alert._id || '';
    if (id && typeof id === 'object' && id.$oid) id = id.$oid;
    var name = '';
    if (alert.callSign) name += esc(alert.callSign);
    if (alert.username) name += (name ? ' (' : '') + esc(alert.username) + (name ? ')' : '');
    if (!name) name = 'Unknown';

    var isOwner = String(alert.userId) === String(userId);

    var actionBtn = isOwner
      ? '<button class="cd-panic-clear" onclick="cdClearPanic(\'' + esc(id) + '\')"><i class="fa fa-times"></i> Clear</button>'
      : '<button class="cd-panic-minimize" onclick="cdMinimizePanic(\'' + esc(id) + '\',this)" title="Minimize"><i class="fa fa-chevron-up"></i></button>';

    return '' +
      '<div class="cd-panic-row" id="cd-panic-' + esc(id) + '">' +
        '<div class="cd-panic-content">' +
          '<div class="cd-panic-icon"><span class="cd-alert-pulse"></span><i class="fa fa-bolt"></i></div>' +
          '<div class="cd-panic-text">' +
            '<span class="cd-panic-title">PANIC</span>' +
            '<span class="cd-panic-name">' + name + '</span>' +
          '</div>' +
        '</div>' +
        actionBtn +
      '</div>';
  }

  function renderPanicAlerts(alerts) {
    var $list = $('#cd-panic-list');
    var $banner = $('#cd-panic-banner');
    if (!$list.length) return;

    if (!alerts || !alerts.length) {
      $banner.slideUp(250);
      $list.empty();
      return;
    }

    var html = '';
    for (var i = 0; i < alerts.length; i++) {
      html += renderPanicRow(alerts[i]);
    }

    if (alerts.length > 2) {
      html += '<div class="cd-panic-scroll-hint">scroll for more alerts</div>';
    }

    $list.html(html);
    $banner.slideDown(250);
  }

  window.cdFetchPanicAlerts = fetchPanicAlerts;
  function fetchPanicAlerts() {
    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(communityId) + '/panic-alerts?status=active',
      method: 'GET',
      dataType: 'json',
      success: function (res) {
        var alerts = (res && res.alerts) ? res.alerts : [];
        renderPanicAlerts(alerts);
      },
      error: function (xhr, status, err) {
        console.error('[cd-alerts] Failed to fetch panic alerts:', status, err);
      }
    });
  }

  /* ───────────────────────────────────────────
     Global Action Functions
     ─────────────────────────────────────────── */

  window.cdClearSignal100 = function () {
    if (!window.ddModal) {
      if (!confirm('Clear Signal 100? This will notify all units the emergency is resolved.')) return;
      doClearSignal100();
      return;
    }

    window.ddModal({
      type: 'danger',
      icon: 'fas fa-exclamation-triangle',
      title: 'Clear Signal 100',
      message: 'Clear Signal 100? This will notify all units the emergency is resolved.',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      onConfirm: function () {
        doClearSignal100();
      }
    });
  };

  function doClearSignal100() {
    if (window.AlertSounds) window.AlertSounds.stop();

    // Emit socket event
    if (alertSocket && alertSocket.connected) {
      alertSocket.emit('clear_signal_100', {
        activeCommunity: communityId,
        clearedByUserId: userId,
        clearedByUsername: userName,
        clearedByCallSign: ''
      });
    }

    // Also call API
    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(communityId) + '/signal-100',
      method: 'DELETE',
      contentType: 'application/json',
      data: JSON.stringify({ clearedByUserId: userId, clearedByUsername: userName, clearedByCallSign: '' }),
      success: function () {
        hideSignal100();
        toast('Signal 100 cleared', 'success');
      },
      error: function (xhr, status, err) {
        toast('Failed to clear Signal 100', 'error');
        console.error('[cd-alerts] Clear Signal 100 error:', status, err);
      }
    });
  }

  window.cdClearPanic = function (alertId) {
    if (!alertId) return;
    if (window.AlertSounds) window.AlertSounds.stop();

    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(communityId) + '/panic-alerts/' + encodeURIComponent(alertId),
      method: 'DELETE',
      contentType: 'application/json',
      data: JSON.stringify({ clearedBy: userId }),
      success: function () {
        var $row = $('#cd-panic-' + alertId);
        $row.slideUp(200, function () {
          $row.remove();
          // If no more panic rows, hide banner
          if ($('#cd-panic-list .cd-panic-row').length === 0) {
            $('#cd-panic-banner').slideUp(250);
          }
        });

        // Emit socket event so other clients update
        if (alertSocket && alertSocket.connected) {
          alertSocket.emit('clear_panic', {
            userID: userId,
            communityID: communityId,
            clearedBy: userId
          });
        }

        toast('Panic alert cleared', 'success');
      },
      error: function (xhr, status, err) {
        toast('Failed to clear panic alert', 'error');
        console.error('[cd-alerts] Clear panic error:', status, err);
      }
    });
  };

  window.cdMinimizePanic = function (alertId, btn) {
    var $row = $('#cd-panic-' + alertId);
    $row.toggleClass('cd-panic-collapsed');
    var $icon = $(btn).find('i');
    if ($row.hasClass('cd-panic-collapsed')) {
      $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  };

  /* ───────────────────────────────────────────
     Socket.IO Connection
     ─────────────────────────────────────────── */

  var alertSocket = null;

  function initSocket() {
    if (typeof io !== 'function') {
      console.warn('[cd-alerts] Socket.IO not available — real-time alerts disabled.');
      return;
    }

    alertSocket = io({ transports: ['websocket'] });

    alertSocket.on('connect', function () {
      alertSocket.emit('join_community_room', { communityId: communityId });
    });

    alertSocket.on('connect_error', function (err) {
      console.error('[cd-alerts] Socket connection error:', err.message);
    });

    /* ── Signal 100 activated ── */
    alertSocket.on('signal_100_button_updated', function (data) {
      if (!data || data.activeCommunity !== communityId) return;

      if (window.AlertSounds) {
        if (data.signal100SoundUrl) {
          window.AlertSounds.playUrl(data.signal100SoundUrl);
        } else {
          window.AlertSounds.play('signal100');
        }
      }

      var parts = [];
      if (data.activatedByCallSign) parts.push(data.activatedByCallSign);
      if (data.activatedByUsername) parts.push('(' + data.activatedByUsername + ')');
      showSignal100('Activated by ' + (parts.join(' ') || 'Unknown'));
    });

    /* ── Signal 100 cleared ── */
    alertSocket.on('clear_signal_100_updated', function (data) {
      if (data && data.activeCommunity && data.activeCommunity !== communityId) return;

      hideSignal100();

      var clearedBy = '';
      if (data) {
        if (data.clearedByCallSign) clearedBy = data.clearedByCallSign;
        if (data.clearedByUsername) clearedBy += (clearedBy ? ' (' : '') + data.clearedByUsername + (clearedBy ? ')' : '');
      }
      toast('Signal 100 cleared' + (clearedBy ? ' by ' + clearedBy : ''), 'info');
    });

    /* ── Panic activated ── */
    alertSocket.on('panic_button_updated', function (data) {
      if (data && data.activeCommunity && data.activeCommunity !== communityId) return;
      if (window.AlertSounds) {
        if (data && data.panicSoundUrl) {
          window.AlertSounds.playUrl(data.panicSoundUrl);
        } else {
          window.AlertSounds.play('panic');
        }
      }
      fetchPanicAlerts();
    });

    /* ── Panic cleared ── */
    alertSocket.on('cleared_panic', function () {
      fetchPanicAlerts();
    });

    /* ── Tone alert (LEO/FD/EMS tone-out) ── */
    alertSocket.on('tone_activated', function (data) {
      if (data.communityId && data.communityId !== communityId) return;

      // Check if this department is targeted
      var deptId = cfg().departmentId;
      if (data.targetDeptIds && data.targetDeptIds.length > 0 && deptId && data.targetDeptIds.indexOf(deptId) === -1) return;

      // Play tone sound — custom URL or built-in
      if (window.AlertSounds) {
        if (data.toneSoundUrl) {
          window.AlertSounds.playUrl(data.toneSoundUrl);
        } else {
          var soundKey = data.toneType === 'fd' ? 'toneFd' : data.toneType === 'ems' ? 'toneEms' : 'toneLeo';
          window.AlertSounds.play(soundKey);
        }
      }

      // Show tone banner overlay
      var toneColor = data.toneType === 'fd' ? '#f97316' : data.toneType === 'ems' ? '#22c55e' : '#3b82f6';
      var triggeredBy = data.triggeredByCallSign ? data.triggeredByCallSign + ' (' + data.triggeredByName + ')' : (data.triggeredByName || 'Unknown');
      var banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;padding:1rem 1.5rem;display:flex;align-items:center;gap:0.75rem;animation:cdVsFadeIn 0.2s ease;background:linear-gradient(135deg,' + toneColor + '22,' + toneColor + '11);border-bottom:2px solid ' + toneColor + ';backdrop-filter:blur(12px);';
      banner.innerHTML =
        '<div style="width:36px;height:36px;border-radius:8px;background:' + toneColor + '33;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa fa-volume-high" style="color:' + toneColor + ';font-size:1rem;animation:cd-badge-pulse 1s ease-in-out infinite;"></i></div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.875rem;font-weight:700;color:#fff;letter-spacing:0.02em;">TONE OUT — ' + (window.esc ? window.esc(data.toneName || 'Alert') : (data.toneName || 'Alert')) + '</div>' +
          '<div style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-top:0.125rem;">' + (window.esc ? window.esc(triggeredBy) : triggeredBy) + ' — Stand by for voice dispatch.</div>' +
        '</div>';
      document.body.appendChild(banner);
      setTimeout(function () {
        banner.style.transition = 'opacity 0.3s';
        banner.style.opacity = '0';
        setTimeout(function () { banner.remove(); }, 300);
      }, 8000);
    });
  }

  /* ───────────────────────────────────────────
     Initialisation
     ─────────────────────────────────────────── */

  function init() {
    var c = cfg();
    communityId = c.communityId;
    userId      = c.userId;
    userName    = c.userName || '';

    if (!communityId) {
      console.warn('[cd-alerts] No communityId — alert banners disabled.');
      return;
    }

    injectStyles();
    injectBanners();
    initSocket();

    // Fetch current state on load
    fetchSignal100();
    fetchPanicAlerts();

    // Poll every 30s as a fallback for missed socket events (e.g. brief
    // disconnection, browser tab throttling). Matches dispatch dashboard behavior.
    setInterval(function () {
      fetchSignal100();
      fetchPanicAlerts();
    }, 30000);
  }

  $(document).ready(init);

})();
