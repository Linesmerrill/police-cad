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
    const isUnseen = !notification.seen ? "background: rgba(102,126,234,0.1); border-left: 3px solid #667eea;" : "";
    let actionButtons = "";
    if (
      ["friend_request", "join_request"].includes(notification.type) &&
      !notification.status
    ) {
      actionButtons = `
          <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
            <button style="background: #48bb78; color: #fff; border: none; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;" onclick="handleNotificationAction('${
              notification.notificationId
            }', 'approved')" 
              ${
                notificationLoading[notification.notificationId]
                  ? "disabled"
                  : ""
              }>
              ${
                notificationLoading[notification.notificationId]
                  ? "Processing..."
                  : "Approve"
              }
            </button>
            <button style="background: #f56565; color: #fff; border: none; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;" onclick="handleNotificationAction('${
              notification.notificationId
            }', 'declined')" 
              ${
                notificationLoading[notification.notificationId]
                  ? "disabled"
                  : ""
              }>
              ${
                notificationLoading[notification.notificationId]
                  ? "Processing..."
                  : "Deny"
              }
            </button>
          </div>
        `;
    } else if (notification.status) {
      actionButtons = `<p style="color: #a0aec0; margin: 0; font-size: 0.9rem;">${
        notification.status === "approved" ? "Accepted" : "Declined"
      } request</p>`;
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
        <div class="notification-item" style="padding: 1.2rem; border-bottom: 1px solid #35385a; ${isUnseen}; transition: all 0.2s;">
          <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div style="flex-shrink: 0;">
              <img src="${
                notification.senderProfilePic ||
                "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(notification.senderUsername || "Unknown") +
                  "&background=808080&color=fff&size=256"
              }" 
                alt="${
                  notification.senderUsername || "Unknown"
                }" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #35385a;">
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
                <div style="flex: 1; min-width: 0;">
                  <p style="margin: 0 0 0.5rem 0; color: #f7fafc; font-size: 1rem; line-height: 1.4;">${message}</p>
                  <small style="color: #a0aec0; font-size: 0.9rem;">${notification.timeAgo}</small>
                </div>
                ${actionButtons}
              </div>
            </div>
            <div style="flex-shrink: 0;">
              <button style="background: none; border: none; color: #a0aec0; font-size: 1.2rem; cursor: pointer; padding: 0.5rem; border-radius: 4px; transition: all 0.2s;" onclick="openNotificationMenu('${
                notification.notificationId
              }')" onmouseover="this.style.color='#f7fafc'" onmouseout="this.style.color='#a0aec0'">
                <i class="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
        </div>
      `);
  });
}

function updateNotificationCount(unseenCount) {
  const $count = $("#notification-count");
  $count.text(unseenCount > 0 ? unseenCount : "");
  $count.toggleClass("show", unseenCount > 0);
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

function openNotificationMenu(notificationId) {
  selectedNotificationId = notificationId;
  const notification = allNotifications.find(
    (n) => n.notificationId === notificationId
  );
  if (!notification) return;

  // Update modal content based on seen status
  const $modalBody = $("#notificationMenuModal .heroui-modal-content div:last-child");
  $modalBody.empty();
  if (!notification.seen) {
    $modalBody.append(`
        <button onclick="markNotificationAsRead()" style="background:#35385a; color:#fff; border:none; border-radius:8px; padding:0.75rem 1rem; font-weight:500; cursor:pointer; transition:all 0.2s; text-align:left; width:100%; margin-bottom:0.75rem;">
          <i class="fa fa-check" style="margin-right:0.5rem; color:#48bb78;"></i>
          Mark as Read
        </button>
        <button onclick="deleteNotification()" style="background:#f56565; color:#fff; border:none; border-radius:8px; padding:0.75rem 1rem; font-weight:500; cursor:pointer; transition:all 0.2s; text-align:left; width:100%;">
          <i class="fa fa-trash" style="margin-right:0.5rem;"></i>
          Delete
        </button>
      `);
  } else {
    $modalBody.append(`
        <button onclick="deleteNotification()" style="background:#f56565; color:#fff; border:none; border-radius:8px; padding:0.75rem 1rem; font-weight:500; cursor:pointer; transition:all 0.2s; text-align:left; width:100%;">
          <i class="fa fa-trash" style="margin-right:0.5rem;"></i>
          Delete
        </button>
      `);
  }

  openNotificationMenuModal();
}

function markNotificationAsRead() {
  const userId = dbUser._id;
  if (!selectedNotificationId) return;

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
      closeNotificationMenuModal();
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

  allNotifications = allNotifications.filter(
    (n) => n.notificationId !== selectedNotificationId
  );
  renderNotifications();

  $.ajax({
    url: `${API_URL}/api/v1/user/${userId}/notifications/${selectedNotificationId}`,
    method: "DELETE",
    success: function () {
      fetchNotifications(0); // Refresh unseenCount
      closeNotificationMenuModal();
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

function closeNotificationMenuModal() {
  $("#notificationMenuModal").modal("hide");
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

  // Fetch notifications on page load
  fetchNotifications(0);
});
