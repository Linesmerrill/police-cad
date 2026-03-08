/**
 * Department Dashboard — Notifications Component
 *
 * Registers window.ddOpenNotifications and window.ddUpdateNotifBadge for the
 * department dashboard. Provides a slide-in notification panel with real-time
 * WebSocket updates, context menus, and approve/deny action handling.
 */
(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  var cfg = function () { return window.ddConfig || {}; };
  var esc = function (s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
  var toast = function (m, t) { if (window.ddToast) window.ddToast(m, t); };
  var isObjectId = function (s) { return /^[a-fA-F0-9]{24}$/.test(s); };

  var PAGE_SIZE = 100;
  var notifPage = 0;
  var notifTotal = 0;
  var allNotifications = [];
  var notificationLoading = {};
  var selectedNotificationId = null;
  var panelOpen = false;
  var wsSocket = null;
  var wsReconnectAttempts = 0;
  var wsMaxReconnect = 5;
  var wsBaseDelay = 1000;
  var wsPingInterval = null;
  var stylesInjected = false;

  /* ───────────────────────────────────────────
     Style Injection
     ─────────────────────────────────────────── */

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('dd-notif-styles')) { stylesInjected = true; return; }

    var css = [
      '#dd-notif-backdrop {',
      '  position: fixed; inset: 0;',
      '  background: rgba(0,0,0,0.4);',
      '  z-index: 9999;',
      '  opacity: 0;',
      '  transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1);',
      '  pointer-events: none;',
      '}',
      '#dd-notif-backdrop.dd-notif-open {',
      '  opacity: 1;',
      '  pointer-events: auto;',
      '}',

      '#dd-notif-panel {',
      '  position: fixed; top: 0; right: 0;',
      '  width: 420px; height: 100vh;',
      '  z-index: 10000;',
      '  background: rgba(12,13,18,0.97);',
      '  border-left: 1px solid rgba(255,255,255,0.06);',
      '  transform: translateX(100%);',
      '  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);',
      '  display: flex; flex-direction: column;',
      '  font-family: "Outfit", sans-serif;',
      '}',
      '#dd-notif-panel.dd-notif-open {',
      '  transform: translateX(0);',
      '}',

      '#dd-notif-header {',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  padding: 20px 24px;',
      '  border-bottom: 1px solid rgba(255,255,255,0.06);',
      '  flex-shrink: 0;',
      '}',
      '#dd-notif-header-title {',
      '  display: flex; align-items: center; gap: 10px;',
      '  font-size: 18px; font-weight: 600;',
      '  color: var(--dd-text, #e2e8f0);',
      '}',
      '#dd-notif-header-badge {',
      '  display: none; align-items: center; justify-content: center;',
      '  min-width: 22px; height: 22px;',
      '  padding: 0 6px;',
      '  background: var(--dd-accent, #8b5cf6);',
      '  color: #fff; font-size: 12px; font-weight: 600;',
      '  border-radius: 11px;',
      '}',
      '#dd-notif-header-badge.dd-notif-badge-show {',
      '  display: inline-flex;',
      '}',

      '#dd-notif-close-btn {',
      '  width: 36px; height: 36px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  background: rgba(255,255,255,0.04);',
      '  border: 1px solid rgba(255,255,255,0.06);',
      '  border-radius: 10px;',
      '  color: var(--dd-text-muted, #64748b);',
      '  font-size: 16px; cursor: pointer;',
      '  transition: all 0.15s;',
      '}',
      '#dd-notif-close-btn:hover {',
      '  background: rgba(255,255,255,0.08);',
      '  color: var(--dd-text, #e2e8f0);',
      '}',

      '#dd-notif-body {',
      '  flex: 1; overflow-y: auto;',
      '  overscroll-behavior: contain;',
      '}',
      '#dd-notif-body::-webkit-scrollbar { width: 6px; }',
      '#dd-notif-body::-webkit-scrollbar-track { background: transparent; }',
      '#dd-notif-body::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.08); border-radius: 3px;',
      '}',

      '.dd-notif-item {',
      '  padding: 14px 24px;',
      '  border-bottom: 1px solid rgba(255,255,255,0.04);',
      '  transition: background 0.15s;',
      '}',
      '.dd-notif-item:hover {',
      '  background: rgba(255,255,255,0.02);',
      '}',
      '.dd-notif-item-unseen {',
      '  background: rgba(59,130,246,0.04);',
      '}',
      '.dd-notif-item-unseen:hover {',
      '  background: rgba(59,130,246,0.07);',
      '}',
      '.dd-notif-row {',
      '  display: flex; align-items: flex-start; gap: 12px;',
      '}',
      '.dd-notif-avatar {',
      '  width: 44px; height: 44px; border-radius: 12px;',
      '  border: 1px solid rgba(255,255,255,0.08);',
      '  object-fit: cover; flex-shrink: 0; margin-top: 2px;',
      '}',
      '.dd-notif-content { flex: 1; min-width: 0; }',
      '.dd-notif-message {',
      '  margin: 0; color: var(--dd-text, #e2e8f0);',
      '  font-size: 14px; line-height: 1.45;',
      '  word-wrap: break-word;',
      '}',
      '.dd-notif-meta {',
      '  display: flex; align-items: center; gap: 8px; margin-top: 6px;',
      '}',
      '.dd-notif-time {',
      '  color: var(--dd-text-muted, #64748b); font-size: 12px;',
      '}',
      '.dd-notif-dot {',
      '  width: 8px; height: 8px; border-radius: 50%;',
      '  background: var(--dd-blue, #3b82f6); flex-shrink: 0;',
      '}',

      '.dd-notif-actions {',
      '  display: flex; gap: 8px; margin-top: 10px;',
      '}',
      '.dd-notif-btn-approve {',
      '  background: rgba(34,197,94,0.12); color: #4ade80;',
      '  border: 1px solid rgba(34,197,94,0.2);',
      '  border-radius: 8px; padding: 7px 16px;',
      '  font-size: 13px; font-weight: 500; font-family: "Outfit", sans-serif;',
      '  cursor: pointer; transition: all 0.15s;',
      '}',
      '.dd-notif-btn-approve:hover:not(:disabled) {',
      '  background: rgba(34,197,94,0.22);',
      '}',
      '.dd-notif-btn-deny {',
      '  background: rgba(239,68,68,0.1); color: #f87171;',
      '  border: 1px solid rgba(239,68,68,0.2);',
      '  border-radius: 8px; padding: 7px 16px;',
      '  font-size: 13px; font-weight: 500; font-family: "Outfit", sans-serif;',
      '  cursor: pointer; transition: all 0.15s;',
      '}',
      '.dd-notif-btn-deny:hover:not(:disabled) {',
      '  background: rgba(239,68,68,0.2);',
      '}',
      '.dd-notif-status-badge {',
      '  display: inline-block; margin-top: 8px;',
      '  font-size: 12px; padding: 3px 10px;',
      '  border-radius: 6px; font-weight: 500;',
      '}',

      '.dd-notif-menu-btn {',
      '  width: 32px; height: 32px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  background: rgba(255,255,255,0.04);',
      '  border: none; color: var(--dd-text-muted, #64748b);',
      '  font-size: 14px; cursor: pointer;',
      '  border-radius: 8px; transition: all 0.15s;',
      '  flex-shrink: 0;',
      '}',
      '.dd-notif-menu-btn:hover {',
      '  background: rgba(255,255,255,0.1);',
      '  color: var(--dd-text, #e2e8f0);',
      '}',

      '#dd-notif-ctx-menu {',
      '  display: none; position: fixed;',
      '  z-index: 10002;',
      '  background: rgba(20,22,30,0.98);',
      '  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);',
      '  border: 1px solid rgba(255,255,255,0.08);',
      '  border-radius: var(--dd-radius, 12px);',
      '  padding: 4px;',
      '  min-width: 160px;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.4);',
      '}',
      '.dd-notif-ctx-item {',
      '  display: flex; align-items: center; gap: 10px;',
      '  width: 100%; padding: 10px 14px;',
      '  background: none; border: none;',
      '  color: var(--dd-text, #e2e8f0);',
      '  font-size: 13px; font-family: "Outfit", sans-serif;',
      '  cursor: pointer; border-radius: 8px;',
      '  transition: background 0.12s;',
      '}',
      '.dd-notif-ctx-item:hover {',
      '  background: rgba(255,255,255,0.06);',
      '}',
      '.dd-notif-ctx-item-danger { color: var(--dd-red, #ef4444); }',
      '.dd-notif-ctx-item-danger:hover { background: rgba(239,68,68,0.1); }',

      '#dd-notif-loading, #dd-notif-empty, #dd-notif-error {',
      '  padding: 48px 24px; text-align: center;',
      '  color: var(--dd-text-muted, #64748b); font-size: 14px;',
      '}',
      '#dd-notif-loading i, #dd-notif-empty i {',
      '  font-size: 28px; margin-bottom: 12px; display: block;',
      '}',
      '#dd-notif-error { color: var(--dd-red, #ef4444); }',

      '#dd-notif-load-more {',
      '  display: none; padding: 16px 24px; text-align: center;',
      '}',
      '#dd-notif-load-more-btn {',
      '  display: inline-flex; align-items: center; gap: 8px;',
      '  padding: 10px 24px;',
      '  background: rgba(255,255,255,0.04);',
      '  border: 1px solid rgba(255,255,255,0.06);',
      '  border-radius: 10px;',
      '  color: var(--dd-text, #e2e8f0);',
      '  font-size: 13px; font-weight: 500; font-family: "Outfit", sans-serif;',
      '  cursor: pointer; transition: all 0.15s;',
      '}',
      '#dd-notif-load-more-btn:hover {',
      '  background: rgba(255,255,255,0.08);',
      '}',

      '#dd-notif-toast-container {',
      '  position: fixed; top: 1rem; right: 1rem;',
      '  z-index: 10001;',
      '  display: flex; flex-direction: column; gap: 8px;',
      '  pointer-events: none;',
      '}',
      '.dd-notif-toast {',
      '  pointer-events: auto;',
      '  display: none;',
      '  background: rgba(20,22,30,0.95);',
      '  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);',
      '  border: 1px solid rgba(255,255,255,0.08);',
      '  border-radius: var(--dd-radius, 12px);',
      '  padding: 14px 18px;',
      '  max-width: 360px;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.4);',
      '  font-family: "Outfit", sans-serif;',
      '}',
      '.dd-notif-toast-header {',
      '  display: flex; align-items: center; gap: 8px;',
      '  margin-bottom: 6px;',
      '}',
      '.dd-notif-toast-header strong {',
      '  flex: 1; color: var(--dd-text, #e2e8f0); font-size: 13px;',
      '}',
      '.dd-notif-toast-header small {',
      '  color: var(--dd-text-muted, #64748b); font-size: 11px;',
      '}',
      '.dd-notif-toast-header .dd-notif-toast-close {',
      '  background: none; border: none;',
      '  color: var(--dd-text-muted, #64748b);',
      '  font-size: 16px; cursor: pointer; padding: 0;',
      '  line-height: 1;',
      '}',
      '.dd-notif-toast-body {',
      '  color: var(--dd-text, #e2e8f0); font-size: 13px; line-height: 1.4;',
      '}',

      '@media (max-width: 768px) {',
      '  #dd-notif-panel { width: 100%; }',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.id = 'dd-notif-styles';
    style.textContent = css;
    document.head.appendChild(style);
    stylesInjected = true;
  }

  /* ───────────────────────────────────────────
     DOM Scaffolding
     ─────────────────────────────────────────── */

  var domReady = false;

  function ensureDOM() {
    if (domReady) return;

    injectStyles();

    // Backdrop
    if (!document.getElementById('dd-notif-backdrop')) {
      $('body').append('<div id="dd-notif-backdrop"></div>');
    }

    // Panel
    if (!document.getElementById('dd-notif-panel')) {
      $('body').append([
        '<div id="dd-notif-panel">',
        '  <div id="dd-notif-header">',
        '    <div id="dd-notif-header-title">',
        '      <span>Notifications</span>',
        '      <span id="dd-notif-header-badge"></span>',
        '    </div>',
        '    <button id="dd-notif-close-btn" title="Close">',
        '      <i class="fas fa-times"></i>',
        '    </button>',
        '  </div>',
        '  <div id="dd-notif-body">',
        '    <div id="dd-notif-loading" style="display:none;">',
        '      <i class="fas fa-spinner fa-spin"></i>',
        '      <span>Loading notifications...</span>',
        '    </div>',
        '    <div id="dd-notif-empty" style="display:none;">',
        '      <i class="far fa-bell-slash"></i>',
        '      <span>No notifications yet</span>',
        '    </div>',
        '    <div id="dd-notif-error" style="display:none;"></div>',
        '    <div id="dd-notif-list"></div>',
        '    <div id="dd-notif-load-more">',
        '      <button id="dd-notif-load-more-btn">',
        '        <i class="fas fa-chevron-down"></i> Load More',
        '      </button>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n'));
    }

    // Context menu
    if (!document.getElementById('dd-notif-ctx-menu')) {
      $('body').append([
        '<div id="dd-notif-ctx-menu">',
        '  <button class="dd-notif-ctx-item" id="dd-notif-ctx-read">',
        '    <i class="fas fa-check" style="width:16px;text-align:center;"></i>',
        '    <span>Mark as Read</span>',
        '  </button>',
        '  <button class="dd-notif-ctx-item dd-notif-ctx-item-danger" id="dd-notif-ctx-delete">',
        '    <i class="fas fa-trash-alt" style="width:16px;text-align:center;"></i>',
        '    <span>Delete</span>',
        '  </button>',
        '</div>'
      ].join('\n'));
    }

    // Toast container
    if (!document.getElementById('dd-notif-toast-container')) {
      $('body').append('<div id="dd-notif-toast-container"></div>');
    }

    // Bind events
    $('#dd-notif-backdrop').off('click.ddnotif').on('click.ddnotif', closePanel);
    $('#dd-notif-close-btn').off('click.ddnotif').on('click.ddnotif', closePanel);
    $('#dd-notif-load-more-btn').off('click.ddnotif').on('click.ddnotif', loadMore);
    $('#dd-notif-ctx-read').off('click.ddnotif').on('click.ddnotif', markAsRead);
    $('#dd-notif-ctx-delete').off('click.ddnotif').on('click.ddnotif', deleteNotification);

    // Close context menu on outside click
    $(document).off('click.ddnotifctx').on('click.ddnotifctx', function (e) {
      var $menu = $('#dd-notif-ctx-menu');
      if ($menu.is(':visible') && !$(e.target).closest('#dd-notif-ctx-menu').length &&
          !$(e.target).closest('.dd-notif-menu-btn').length) {
        $menu.hide();
      }
    });

    // Close panel on Escape key
    $(document).off('keydown.ddnotif').on('keydown.ddnotif', function (e) {
      if (e.key === 'Escape' && panelOpen) {
        // If context menu is open, close it first
        var $menu = $('#dd-notif-ctx-menu');
        if ($menu.is(':visible')) {
          $menu.hide();
        } else {
          closePanel();
        }
      }
    });

    domReady = true;
  }

  /* ───────────────────────────────────────────
     Panel Open / Close
     ─────────────────────────────────────────── */

  function openPanel() {
    ensureDOM();
    panelOpen = true;
    notifPage = 0;
    allNotifications = [];
    $('#dd-notif-list').empty();
    $('#dd-notif-backdrop').addClass('dd-notif-open');
    $('#dd-notif-panel').addClass('dd-notif-open');
    document.body.style.overflow = 'hidden';
    fetchNotifications(0, false);
  }

  function closePanel() {
    panelOpen = false;
    $('#dd-notif-backdrop').removeClass('dd-notif-open');
    $('#dd-notif-panel').removeClass('dd-notif-open');
    $('#dd-notif-ctx-menu').hide();
    document.body.style.overflow = '';
  }

  /* ───────────────────────────────────────────
     Fetch Notifications
     ─────────────────────────────────────────── */

  function fetchNotifications(page, append) {
    var c = cfg();
    if (!c.userId || !c.API_URL) return;

    $('#dd-notif-loading').show();
    $('#dd-notif-list, #dd-notif-empty, #dd-notif-load-more, #dd-notif-error').hide();

    $.ajax({
      url: c.API_URL + '/api/v2/users/' + c.userId + '/notifications?limit=' + PAGE_SIZE + '&page=' + page,
      method: 'GET',
      success: function (data) {
        if (!data.notifications || !Array.isArray(data.notifications)) {
          $('#dd-notif-empty').show();
          $('#dd-notif-loading').hide();
          return;
        }

        notifPage = page;
        notifTotal = data.total || 0;
        var incoming = data.notifications;

        if (append) {
          allNotifications = allNotifications.concat(incoming);
        } else {
          allNotifications = incoming;
        }

        // Deduplicate by notificationId
        var seen = {};
        var unique = [];
        for (var i = 0; i < allNotifications.length; i++) {
          var n = allNotifications[i];
          if (n.notificationId && !seen[n.notificationId]) {
            seen[n.notificationId] = true;
            unique.push(n);
          }
        }
        allNotifications = unique.sort(function (a, b) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        renderNotifications();
        updateBadge(data.unseenCount || 0);

        $('#dd-notif-list').show();
        $('#dd-notif-loading').hide();

        if (allNotifications.length === 0) {
          $('#dd-notif-empty').show();
        }

        // Show load-more if there are more pages
        if (page * PAGE_SIZE < notifTotal) {
          $('#dd-notif-load-more').show();
        } else {
          $('#dd-notif-load-more').hide();
        }
      },
      error: function (xhr) {
        console.error('DD Notifications: fetch error', xhr.responseText);
        $('#dd-notif-loading').hide();
        $('#dd-notif-error')
          .text(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Failed to load notifications.')
          .show();
      }
    });
  }

  function loadMore() {
    if ($('#dd-notif-loading').is(':visible')) return;
    fetchNotifications(notifPage + 1, true);
  }

  /* ───────────────────────────────────────────
     Render Notifications
     ─────────────────────────────────────────── */

  function buildMessage(n) {
    if (n.type === 'friend_request') {
      return esc(n.senderUsername) + ' ' + esc(n.message);
    }
    if (n.type === 'join_request' && !n.data3) {
      return esc(n.senderUsername) + ' ' + esc(n.message) + ' ' + esc(n.data2);
    }
    if (n.type === 'join_request' && n.data3) {
      return esc(n.senderUsername) + ' ' + esc(n.message) + ' ' + esc(n.data2) + '\'s department ' + esc(n.data4);
    }
    if (n.type === 'notification') {
      return esc(n.message) + ' ' + esc(n.data2);
    }
    return esc(n.message || '');
  }

  function avatarUrl(n) {
    if (n.senderProfilePic) return n.senderProfilePic;
    var name = encodeURIComponent(n.senderUsername || 'Unknown');
    return 'https://ui-avatars.com/api/?name=' + name + '&background=1e293b&color=94a3b8&size=256';
  }

  function renderNotifications() {
    var $list = $('#dd-notif-list');
    $list.empty();

    for (var i = 0; i < allNotifications.length; i++) {
      var n = allNotifications[i];
      var isUnseen = !n.seen;
      var itemClass = 'dd-notif-item' + (isUnseen ? ' dd-notif-item-unseen' : '');
      var nid = esc(n.notificationId);

      // Action buttons or status badge
      var actionHtml = '';
      if ((['friend_request', 'join_request'].indexOf(n.type) !== -1) && !n.status) {
        var isLoading = notificationLoading[n.notificationId];
        var label = isLoading ? 'Processing...' : '';
        actionHtml = [
          '<div class="dd-notif-actions">',
          '  <button class="dd-notif-btn-approve" data-nid="' + nid + '" data-action="approved"' + (isLoading ? ' disabled' : '') + '>',
                (isLoading ? 'Processing...' : 'Approve'),
          '  </button>',
          '  <button class="dd-notif-btn-deny" data-nid="' + nid + '" data-action="declined"' + (isLoading ? ' disabled' : '') + '>',
                (isLoading ? 'Processing...' : 'Deny'),
          '  </button>',
          '</div>'
        ].join('');
      } else if (n.status) {
        var isApproved = n.status === 'approved';
        var badgeColor = isApproved ? '#4ade80' : '#f87171';
        var badgeBg = isApproved ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
        var badgeText = isApproved ? 'Accepted' : 'Declined';
        actionHtml = '<span class="dd-notif-status-badge" style="color:' + badgeColor + ';background:' + badgeBg + ';">' + badgeText + '</span>';
      }

      var html = [
        '<div class="' + itemClass + '" data-nid="' + nid + '">',
        '  <div class="dd-notif-row">',
        '    <img class="dd-notif-avatar" src="' + esc(avatarUrl(n)) + '" alt="' + esc(n.senderUsername || 'Unknown') + '">',
        '    <div class="dd-notif-content">',
        '      <p class="dd-notif-message">' + buildMessage(n) + '</p>',
        '      <div class="dd-notif-meta">',
        '        <span class="dd-notif-time">' + esc(n.timeAgo || '') + '</span>',
               (isUnseen ? '<div class="dd-notif-dot"></div>' : ''),
        '      </div>',
               actionHtml,
        '    </div>',
        '    <button class="dd-notif-menu-btn" data-nid="' + nid + '" title="More options">',
        '      <i class="fas fa-ellipsis-v"></i>',
        '    </button>',
        '  </div>',
        '</div>'
      ].join('');

      $list.append(html);
    }

    // Bind action button clicks
    $list.find('.dd-notif-btn-approve, .dd-notif-btn-deny').off('click.ddnotif').on('click.ddnotif', function () {
      var nid = $(this).attr('data-nid');
      var action = $(this).attr('data-action');
      handleAction(nid, action);
    });

    // Bind three-dot menu clicks
    $list.find('.dd-notif-menu-btn').off('click.ddnotif').on('click.ddnotif', function (e) {
      e.stopPropagation();
      openContextMenu($(this).attr('data-nid'), e);
    });
  }

  /* ───────────────────────────────────────────
     Context Menu
     ─────────────────────────────────────────── */

  function openContextMenu(nid, e) {
    selectedNotificationId = nid;
    var n = findNotification(nid);
    if (!n) return;

    var $menu = $('#dd-notif-ctx-menu');
    var $readBtn = $('#dd-notif-ctx-read');

    // Show/hide "Mark as Read" based on seen status
    if (n.seen) {
      $readBtn.hide();
    } else {
      $readBtn.show();
    }

    // Position near the button
    var btn = e.currentTarget;
    if (btn) {
      var rect = btn.getBoundingClientRect();
      var menuWidth = 160;
      var menuHeight = n.seen ? 44 : 88;

      var left = rect.left - menuWidth - 8;
      var top = rect.top;

      if (left < 8) {
        left = rect.right + 8;
      }
      if (top + menuHeight > window.innerHeight - 8) {
        top = window.innerHeight - menuHeight - 8;
      }

      $menu.css({ left: left + 'px', top: top + 'px' });
    }

    $menu.show();
  }

  /* ───────────────────────────────────────────
     Mark as Read
     ─────────────────────────────────────────── */

  function markAsRead() {
    var c = cfg();
    if (!selectedNotificationId || !c.userId || !c.API_URL) return;

    var nid = selectedNotificationId;
    $('#dd-notif-ctx-menu').hide();

    $.ajax({
      url: c.API_URL + '/api/v1/user/' + c.userId + '/notifications/' + nid + '/read',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ seen: true }),
      success: function () {
        // Update locally
        for (var i = 0; i < allNotifications.length; i++) {
          if (allNotifications[i].notificationId === nid) {
            allNotifications[i].seen = true;
            break;
          }
        }
        renderNotifications();
        fetchNotifications(0, false);
      },
      error: function (xhr) {
        console.error('DD Notifications: mark read error', xhr.responseText);
        toast(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Failed to mark as read.', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Delete Notification
     ─────────────────────────────────────────── */

  function deleteNotification() {
    var c = cfg();
    if (!selectedNotificationId || !c.userId || !c.API_URL) return;

    var nid = selectedNotificationId;
    $('#dd-notif-ctx-menu').hide();

    // Optimistic removal
    allNotifications = allNotifications.filter(function (n) {
      return n.notificationId !== nid;
    });
    renderNotifications();

    if (allNotifications.length === 0) {
      $('#dd-notif-empty').show();
    }

    $.ajax({
      url: c.API_URL + '/api/v1/user/' + c.userId + '/notifications/' + nid,
      method: 'DELETE',
      success: function () {
        fetchNotifications(0, false);
      },
      error: function (xhr) {
        console.error('DD Notifications: delete error', xhr.responseText);
        toast(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Failed to delete notification.', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Approve / Deny Actions
     ─────────────────────────────────────────── */

  function findNotification(nid) {
    for (var i = 0; i < allNotifications.length; i++) {
      if (allNotifications[i].notificationId === nid) return allNotifications[i];
    }
    return null;
  }

  function handleAction(nid, action) {
    var c = cfg();
    if (!c.userId || !c.API_URL) return;

    var n = findNotification(nid);
    if (!n) return;

    notificationLoading[nid] = true;
    renderNotifications();

    // Optimistic removal
    allNotifications = allNotifications.filter(function (item) {
      return item.notificationId !== nid;
    });

    var requests = [];

    if (n.type === 'friend_request') {
      requests.push($.ajax({
        url: c.API_URL + '/api/v1/user/' + c.userId + '/add-friend',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ friend_id: n.sentFromID })
      }));
    } else if (n.type === 'join_request' && !n.data3) {
      if (!isObjectId(n.sentFromID) || !isObjectId(n.data1)) {
        toast('Invalid notification data', 'error');
        renderNotifications();
        return;
      }
      requests.push($.ajax({
        url: c.API_URL + '/api/v1/user/' + n.sentFromID + '/communities?migration=false',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ communityId: n.data1, status: action })
      }));
    } else if (n.type === 'join_request' && n.data3) {
      if (!isObjectId(n.data1) || !isObjectId(n.data3) || !isObjectId(n.sentFromID)) {
        toast('Invalid notification data', 'error');
        renderNotifications();
        return;
      }
      requests.push($.ajax({
        url: c.API_URL + '/api/v1/community/' + n.data1 + '/departments/' + n.data3 + '/join-requests',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ userId: n.sentFromID, status: action })
      }));
    }

    // Send notification to the sender about the action result
    if (requests.length > 0) {
      var deptSuffix = n.data4 ? '\'s department ' + n.data4 : '';
      var emoji = action === 'approved' ? '\u2705' : '\u274C';
      var message = emoji + ' Your request to join ' + (n.data2 || '') + deptSuffix + ' has been ' + action + '.';

      requests.push($.ajax({
        url: c.API_URL + '/api/v1/users/notifications',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          sentFromID: c.userId,
          sentToID: n.sentFromID,
          type: 'notification',
          message: message
        })
      }));
    }

    // Delete the notification
    requests.push($.ajax({
      url: c.API_URL + '/api/v1/user/' + c.userId + '/notifications/' + nid,
      method: 'DELETE'
    }));

    Promise.all(requests)
      .then(function () {
        delete notificationLoading[nid];
        renderNotifications();
        fetchNotifications(0, false);
      })
      .catch(function (err) {
        console.error('DD Notifications: action error', err);

        var errorMsg = (err.responseJSON && err.responseJSON.message) ? err.responseJSON.message : 'Failed to process request.';

        if (n.type === 'friend_request' && err.status === 409) {
          errorMsg = 'That user is already your friend.';
        } else if (err.responseJSON && err.responseJSON.message && err.responseJSON.message.indexOf('Member already exists') !== -1) {
          errorMsg = 'That member already exists.';
        }

        toast(errorMsg, 'error');

        // Re-add notification on error
        allNotifications.push(n);
        allNotifications.sort(function (a, b) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        delete notificationLoading[nid];
        renderNotifications();
      });
  }

  /* ───────────────────────────────────────────
     Badge Updates
     ─────────────────────────────────────────── */

  function updateBadge(count) {
    var display = count > 99 ? '99+' : String(count);

    // Update the header badge inside the panel
    var $headerBadge = $('#dd-notif-header-badge');
    if ($headerBadge.length) {
      $headerBadge.text(count > 0 ? display : '');
      $headerBadge.toggleClass('dd-notif-badge-show', count > 0);
    }

    // Update the external badge element
    var $extBadge = $('#dd-notif-count');
    if ($extBadge.length) {
      if (count > 0) {
        $extBadge.text(display).show();
      } else {
        $extBadge.text('').hide();
      }
    }
  }

  function fetchBadgeCount() {
    var c = cfg();
    if (!c.userId || !c.API_URL) return;

    $.ajax({
      url: c.API_URL + '/api/v2/users/' + c.userId + '/notifications?limit=1&page=0',
      method: 'GET',
      success: function (data) {
        updateBadge(data.unseenCount || 0);
      },
      error: function (xhr) {
        console.error('DD Notifications: badge count error', xhr.responseText);
      }
    });
  }

  /* ───────────────────────────────────────────
     Toast for Incoming Notifications
     ─────────────────────────────────────────── */

  function showToast(notification) {
    ensureDOM();

    var rawId = String(notification._id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '');
    var toastId = 'dd-notif-toast-' + rawId;
    var iconClass;
    var message;

    if (notification.type === 'friend_request') {
      message = 'You got a friend request!';
      iconClass = 'fas fa-user-plus';
    } else {
      message = 'New notification: ' + esc(notification.message || '');
      iconClass = 'fas fa-bell';
    }

    var html = [
      '<div id="' + toastId + '" class="dd-notif-toast">',
      '  <div class="dd-notif-toast-header">',
      '    <i class="' + iconClass + '" style="color:var(--dd-text,#e2e8f0);"></i>',
      '    <strong>Notification</strong>',
      '    <small>Just now</small>',
      '    <button class="dd-notif-toast-close" data-toast="' + toastId + '">&times;</button>',
      '  </div>',
      '  <div class="dd-notif-toast-body">' + message + '</div>',
      '</div>'
    ].join('');

    $('#dd-notif-toast-container').append(html);

    var $toast = $('#' + toastId);
    $toast.find('.dd-notif-toast-close').on('click', function () {
      $('#' + $(this).attr('data-toast')).remove();
    });

    $toast.fadeIn(300);

    setTimeout(function () {
      $toast.fadeOut(300, function () { $toast.remove(); });
    }, 5000);

    // Add to local list
    allNotifications.unshift({
      notificationId: notification._id,
      type: notification.type,
      message: notification.message,
      senderProfilePic: notification.senderProfilePic || '',
      senderUsername: notification.senderUsername || 'Unknown',
      sentFromID: notification.sentFromID,
      data1: notification.data1,
      data2: notification.data2,
      data3: notification.data3,
      data4: notification.data4,
      seen: false,
      createdAt: notification.createdAt || new Date().toISOString(),
      timeAgo: 'Just now'
    });

    if (panelOpen) {
      renderNotifications();
    }

    // Refresh badge count
    fetchBadgeCount();
  }

  /* ───────────────────────────────────────────
     WebSocket — Live Notifications
     ─────────────────────────────────────────── */

  function connectWebSocket() {
    var c = cfg();
    if (!c.userId || !c.API_URL) return;

    var protocol = c.API_URL.indexOf('https') === 0 ? 'wss' : 'ws';
    var host = c.API_URL.replace(/^https?:\/\//, '');
    var wsUrl = protocol + '://' + host + '/ws/notifications?userId=' + c.userId;

    try {
      wsSocket = new WebSocket(wsUrl);
    } catch (e) {
      console.error('DD Notifications: WebSocket connection failed', e);
      return;
    }

    wsSocket.onopen = function () {
      wsReconnectAttempts = 0;
      startPing();
    };

    wsSocket.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        if (data.event === 'new_notification') {
          showToast(data.data);
        }
      } catch (e) {
        console.error('DD Notifications: WS message parse error', e);
      }
    };

    wsSocket.onclose = function () {
      stopPing();
      if (wsReconnectAttempts < wsMaxReconnect) {
        var delay = wsBaseDelay * Math.pow(2, wsReconnectAttempts);
        wsReconnectAttempts++;
        setTimeout(connectWebSocket, delay);
      } else {
        console.error('DD Notifications: max WebSocket reconnect attempts reached');
      }
    };

    wsSocket.onerror = function (error) {
      console.error('DD Notifications: WebSocket error', error);
    };
  }

  function startPing() {
    stopPing();
    wsPingInterval = setInterval(function () {
      if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
        wsSocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  function stopPing() {
    if (wsPingInterval) {
      clearInterval(wsPingInterval);
      wsPingInterval = null;
    }
  }

  /* ───────────────────────────────────────────
     Initialization
     ─────────────────────────────────────────── */

  $(document).ready(function () {
    // Fetch initial badge count
    fetchBadgeCount();

    // Connect WebSocket for live notifications
    connectWebSocket();
  });

  /* ───────────────────────────────────────────
     Public API
     ─────────────────────────────────────────── */

  window.ddOpenNotifications = openPanel;

  window.ddUpdateNotifBadge = function (count) {
    updateBadge(typeof count === 'number' ? count : 0);
  };

})();
