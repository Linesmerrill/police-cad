let notificationPage = 0;
const notificationsPerPage = 100;
let allNotifications = [];
let selectedNotificationId = null;
// const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

function fetchNotifications(page, append = false) {
  const userId = dbUser._id;
  $("#notification-loading").show();
  $(
    "#notification-list, #no-notifications, #notification-load-more, #notification-error"
  ).hide();

  $.ajax({
    url: `${API_URL}/api/v2/users/${userId}/notifications?limit=${notificationsPerPage}&page=${page}`,
    method: "GET",
    success: function (data) {
      if (!data.notifications || !Array.isArray(data.notifications)) {
        $("#no-notifications").show();
        $("#notification-loading").hide();
        return;
      }

      notificationPage = page;
      const newNotifications = data.notifications;
      allNotifications = append
        ? [...allNotifications, ...newNotifications]
        : newNotifications;

      // Deduplicate notifications
      const uniqueNotifications = [];
      const seenIds = new Set();
      allNotifications.forEach((n) => {
        if (n.notificationId && !seenIds.has(n.notificationId)) {
          seenIds.add(n.notificationId);
          uniqueNotifications.push(n);
        }
      });
      allNotifications = uniqueNotifications.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      renderNotifications();
      updateNotificationCount(data.unseenCount || 0);
      $("#notification-list").show();
      $("#notification-loading").hide();
      $("#notification-load-more").toggle(
        page * notificationsPerPage < data.total
      );
      if (allNotifications.length === 0) {
        $("#no-notifications").show();
      }
    },
    error: function (xhr) {
      console.error("Error fetching notifications:", xhr.responseText);
      $("#notification-error").show();
      $("#notification-error-message").text(
        xhr.responseJSON?.message || "Failed to load notifications."
      );
      $("#notification-loading").hide();
    },
  });
}

function loadMoreNotifications() {
  if ($("#notification-loading").is(":visible")) return; // Prevent multiple fetches
  fetchNotifications(notificationPage + 1, true);
}

function renderNotifications() {
  const $list = $("#notification-list");
  $list.empty();

  allNotifications.forEach((notification) => {
    const isUnseen = !notification.seen;
    const unseenStyle = isUnseen ? "background: rgba(59, 130, 246, 0.06);" : "";
    const unseenDot = isUnseen ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; flex-shrink: 0;"></div>' : '';

    let actionButtons = "";
    if (
      ["friend_request", "join_request"].includes(notification.type) &&
      !notification.status
    ) {
      const isLoading = notificationLoading[notification.notificationId];
      actionButtons = `
          <div style="display: flex; gap: 0.5rem; margin-top: 0.65rem;">
            <button style="
              background: rgba(34, 197, 94, 0.12);
              color: #4ade80;
              border: 1px solid rgba(34, 197, 94, 0.2);
              border-radius: 8px;
              padding: 0.45rem 1rem;
              font-size: 0.8rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.15s;
            " onclick="handleNotificationAction('${notification.notificationId}', 'approved')"
              ${isLoading ? "disabled" : ""}
              onmouseover="if(!this.disabled){this.style.background='rgba(34,197,94,0.22)'}"
              onmouseout="this.style.background='rgba(34,197,94,0.12)'"
            >${isLoading ? "Processing..." : "Approve"}</button>
            <button style="
              background: rgba(239, 68, 68, 0.1);
              color: #f87171;
              border: 1px solid rgba(239, 68, 68, 0.2);
              border-radius: 8px;
              padding: 0.45rem 1rem;
              font-size: 0.8rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.15s;
            " onclick="handleNotificationAction('${notification.notificationId}', 'declined')"
              ${isLoading ? "disabled" : ""}
              onmouseover="if(!this.disabled){this.style.background='rgba(239,68,68,0.2)'}"
              onmouseout="this.style.background='rgba(239,68,68,0.1)'"
            >${isLoading ? "Processing..." : "Deny"}</button>
          </div>
        `;
    } else if (notification.status) {
      const statusColor = notification.status === "approved" ? "#4ade80" : "#f87171";
      const statusBg = notification.status === "approved" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)";
      actionButtons = `<span style="display: inline-block; margin-top: 0.5rem; color: ${statusColor}; background: ${statusBg}; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 500;">${
        notification.status === "approved" ? "Accepted" : "Declined"
      }</span>`;
    }

    let message = "";
    if (notification.type === "friend_request") {
      message = `${notification.senderUsername} ${notification.message}`;
    } else if (notification.type === "join_request" && !notification.data3) {
      message = `${notification.senderUsername} ${notification.message} ${notification.data2}`;
    } else if (notification.type === "join_request" && notification.data3) {
      message = `${notification.senderUsername} ${notification.message} ${notification.data2}'s department ${notification.data4}`;
    } else if (notification.type === "notification") {
      message = `${notification.message} ${notification.data2}`;
    }

    $list.append(`
        <div class="notification-item" style="padding: 0.85rem 1.25rem; ${unseenStyle} transition: background 0.15s;">
          <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <div style="flex-shrink: 0; margin-top: 2px;">
              <img src="${
                notification.senderProfilePic ||
                "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(notification.senderUsername || "Unknown") +
                  "&background=1e293b&color=94a3b8&size=256"
              }"
                alt="${notification.senderUsername || "Unknown"}"
                style="width: 40px; height: 40px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); object-fit: cover;">
            </div>
            <div style="flex: 1; min-width: 0;">
              <p style="margin: 0; color: #e2e8f0; font-size: 0.875rem; line-height: 1.45; word-wrap: break-word;">${message}</p>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.35rem;">
                <span style="color: #64748b; font-size: 0.75rem;">${notification.timeAgo}</span>
                ${unseenDot}
              </div>
              ${actionButtons}
            </div>
            <div style="flex-shrink: 0;">
              <button style="
                width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.04); border: none; color: #64748b; font-size: 0.85rem;
                cursor: pointer; border-radius: 8px; transition: all 0.15s;
              " onclick="openNotificationMenu('${notification.notificationId}', event)"
                onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#e2e8f0'"
                onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.color='#64748b'">
                <i class="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
        </div>
      `);
  });
}

function updateNotificationCount(unseenCount) {
  // Update both the modal badge and sidebar badge
  const $modalBadge = $("#notificationBadge");
  const $sidebarBadge = $("#notification-count");

  const displayCount = unseenCount > 99 ? "99+" : unseenCount.toString();

  // Update modal badge
  if ($modalBadge.length) {
    $modalBadge.text(unseenCount > 0 ? displayCount : "0");
    $modalBadge.toggleClass("show", unseenCount > 0);
  }

  // Update sidebar badge
  if ($sidebarBadge.length) {
    if (unseenCount > 0) {
      $sidebarBadge.text(displayCount);
      $sidebarBadge.addClass("show");
    } else {
      $sidebarBadge.text("");
      $sidebarBadge.removeClass("show");
    }
  }
}

function fetchNotificationCount() {
  const userId = dbUser._id;
  $.ajax({
    url: `${API_URL}/api/v2/users/${userId}/notifications?limit=1&page=0`,
    method: "GET",
    success: function (data) {
      updateNotificationCount(data.unseenCount || 0);
    },
    error: function (xhr) {
      console.error("Error fetching notification count:", xhr.responseText);
    },
  });
}

let notificationLoading = {};
function handleNotificationAction(notificationId, action) {
  const userId = dbUser._id;
  const notification = allNotifications.find(
    (n) => n.notificationId === notificationId
  );
  if (!notification) return;

  notificationLoading[notificationId] = true;
  renderNotifications();

  // Remove notification immediately
  allNotifications = allNotifications.filter(
    (n) => n.notificationId !== notificationId
  );

  const requests = [];
  if (notification.type === "friend_request") {
    requests.push(
      $.ajax({
        url: `${API_URL}/api/v1/user/${userId}/add-friend`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ friend_id: notification.sentFromID }),
      })
    );
  } else if (notification.type === "join_request" && !notification.data3) {
    requests.push(
      $.ajax({
        url: `${API_URL}/api/v1/user/${notification.sentFromID}/communities?migration=false`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify({
          communityId: notification.data1,
          status: action,
        }),
      })
    );
  } else if (notification.type === "join_request" && notification.data3) {
    requests.push(
      $.ajax({
        url: `${API_URL}/api/v1/community/${notification.data1}/departments/${notification.data3}/join-requests`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify({
          userId: notification.sentFromID,
          status: action,
        }),
      })
    );
  }

  if (requests.length > 0) {
    const message =
      action === "approved"
        ? `✅ Your request to join ${notification.data2}${
            notification.data4 ? "'s department " + notification.data4 : ""
          } has been ${action}.`
        : `❌ Your request to join ${notification.data2}${
            notification.data4 ? "'s department " + notification.data4 : ""
          } has been ${action}.`;
    requests.push(
      $.ajax({
        url: `${API_URL}/api/v1/users/notifications`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          sentFromID: dbUser._id,
          sentToID: notification.sentFromID,
          type: "notification",
          message,
        }),
      })
    );
  }

  requests.push(
    $.ajax({
      url: `${API_URL}/api/v1/user/${userId}/notifications/${notificationId}`,
      method: "DELETE",
    })
  );

  Promise.all(requests)
    .then(() => {
      delete notificationLoading[notificationId];
      renderNotifications();
      fetchNotifications(0); // Refresh to update unseenCount
    })
    .catch((err) => {
      console.error("Error handling notification action:", err);
      let errorMsg = err.responseJSON?.message || "Failed to process request.";
      let alertClass = "alert-danger";

      if (notification.type === "friend_request" && err.status === 409) {
        errorMsg = "That user is already your friend.";
        alertClass = "alert-warning";
      } else if (err.responseJSON?.message?.includes("Member already exists")) {
        errorMsg = "That member already exists.";
        alertClass = "alert-warning";
      }

      // Ensure alert exists
      let $error = $("#notification-error");
      if ($error.length === 0) {
        $("#notificationModal .modal-body").prepend(`
            <div id="notification-error" class="alert alert-dismissible" role="alert" style="display: none;">
              <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>
              <strong>Error!</strong> <span id="notification-error-message"></span>
            </div>
          `);
        $error = $("#notification-error");
      }

      // Reset and show alert
      $error
        .removeClass("alert-danger alert-warning")
        .addClass(alertClass)
        .css("display", "block")
        .show();
      $("#notification-error-message").text(errorMsg);
      allNotifications.push(notification); // Re-add on error
      delete notificationLoading[notificationId];
      renderNotifications();
    });
}

function openNotificationMenu(notificationId, event) {
  // Prevent event bubbling
  if (event) {
    event.stopPropagation();
  }

  selectedNotificationId = notificationId;
  const notification = allNotifications.find(
    (n) => n.notificationId === notificationId
  );
  if (!notification) return;

  const menu = document.getElementById('notificationContextMenu');
  if (!menu) return;

  // Show/hide "Mark as Read" button based on seen status
  const markReadBtn = document.getElementById('notificationMarkReadBtn');
  if (markReadBtn) {
    markReadBtn.style.display = notification.seen ? 'none' : 'flex';
  }

  // Position the menu near the click
  const button = event ? event.currentTarget : null;
  if (button) {
    const rect = button.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = notification.seen ? 44 : 88; // Approximate height

    // Position to the left of the button, aligned to top
    let left = rect.left - menuWidth - 8;
    let top = rect.top;

    // If menu would go off left edge, position to the right instead
    if (left < 8) {
      left = rect.right + 8;
    }

    // If menu would go off bottom, adjust up
    if (top + menuHeight > window.innerHeight - 8) {
      top = window.innerHeight - menuHeight - 8;
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  menu.style.display = 'block';

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeNotificationMenuOnClickOutside);
  }, 0);
}

function closeNotificationMenuOnClickOutside(event) {
  const menu = document.getElementById('notificationContextMenu');
  if (menu && !menu.contains(event.target)) {
    closeNotificationContextMenu();
  }
}

function closeNotificationContextMenu() {
  const menu = document.getElementById('notificationContextMenu');
  if (menu) {
    menu.style.display = 'none';
  }
  document.removeEventListener('click', closeNotificationMenuOnClickOutside);
}

function markNotificationAsRead() {
  const userId = dbUser._id;
  if (!selectedNotificationId) return;

  // Close menu immediately for better UX
  closeNotificationContextMenu();

  $.ajax({
    url: `${API_URL}/api/v1/user/${userId}/notifications/${selectedNotificationId}/read`,
    method: "PUT",
    contentType: "application/json",
    data: JSON.stringify({ seen: true }),
    success: function () {
      allNotifications = allNotifications.map((n) =>
        n.notificationId === selectedNotificationId ? { ...n, seen: true } : n
      );
      renderNotifications();
      fetchNotifications(0); // Refresh unseenCount
    },
    error: function (xhr) {
      console.error("Error marking notification as read:", xhr.responseText);
      $("#notification-error").show();
      $("#notification-error-message").text(
        xhr.responseJSON?.message || "Failed to mark as read."
      );
    },
  });
}

function deleteNotification() {
  const userId = dbUser._id;
  if (!selectedNotificationId) return;

  // Close menu immediately for better UX
  closeNotificationContextMenu();

  allNotifications = allNotifications.filter(
    (n) => n.notificationId !== selectedNotificationId
  );
  renderNotifications();

  $.ajax({
    url: `${API_URL}/api/v1/user/${userId}/notifications/${selectedNotificationId}`,
    method: "DELETE",
    success: function () {
      fetchNotifications(0); // Refresh unseenCount
    },
    error: function (xhr) {
      console.error("Error deleting notification:", xhr.responseText);
      $("#notification-error").show();
      $("#notification-error-message").text(
        xhr.responseJSON?.message || "Failed to delete notification."
      );
    },
  });
}

function showToastNotification(notification) {
  const toastId = `toast-${notification._id}`;
  let message;
  let iconClass;

  if (notification.type === "friend_request") {
    message = "You got a friend request!";
    iconClass = "fas fa-user-plus";
  } else {
    message = `New notification: ${notification.message}`;
    iconClass = "fas fa-bell";
  }

  $("#toast-container").append(`
      <div id="${toastId}" class="custom-toast">
        <div class="custom-toast-header">
          <i class="${iconClass}" style="margin-right: 10px; color: #e2e8f0;"></i>
          <strong class="mr-auto">Notification</strong>
          <small>Just now</small>
          <button type="button" class="close" onclick="$('#${toastId}').remove()" aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div class="custom-toast-body">
          ${message}
        </div>
      </div>
    `);

  // Show toast with animation
  $(`#${toastId}`).fadeIn(300);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    $(`#${toastId}`).fadeOut(300, () => {
      $(`#${toastId}`).remove();
    });
  }, 5000);

  // Add to allNotifications and refresh
  allNotifications.unshift({
    ...notification,
    notificationId: notification._id,
    senderProfilePic: notification.senderProfilePic || "",
    senderUsername: notification.senderUsername || "Unknown",
    timeAgo: "Just now",
  });
  renderNotifications();
  fetchNotifications(0); // Update unseenCount
}

// WebSocket setup for live notifications
$(document).ready(function () {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  function connectWebSocket() {
    socket = new WebSocket(
      `ws${API_URL.startsWith("https") ? "s" : ""}://${API_URL.replace(
        /^https?:\/\//,
        ""
      )}/ws/notifications?userId=${dbUser._id}`
    );

    socket.onopen = function () {
      reconnectAttempts = 0; // Reset on successful connection
      // Start ping to keep connection alive
      startPing();
    };

    socket.onmessage = function (event) {
      const data = JSON.parse(event.data);
      if (data.event === "new_notification") {
        showToastNotification(data.data);
      }
    };

    socket.onclose = function (event) {
      stopPing();
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts); // Exponential backoff

        reconnectAttempts++;
        setTimeout(connectWebSocket, delay);
      } else {
        console.error("Max WebSocket reconnect attempts reached");
      }
    };

    socket.onerror = function (error) {
      console.error("WebSocket error:", error);
    };
  }

  let pingInterval;
  function startPing() {
    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Ping every 30 seconds
  }

  function stopPing() {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }

  connectWebSocket();

  // Fetch notification count on page load
  fetchNotificationCount();
});
