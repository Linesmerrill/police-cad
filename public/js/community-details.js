// community-details.js
// Handles Create Event button permissions and modal logic for community details page

// Usage: Call setupCreateEventButton(userId, roles) after DOM is ready

function userCanManageEvents(userId, roles) {
  if (!userId || !Array.isArray(roles)) return false;
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    if (Array.isArray(role.members) && role.members.includes(userId)) {
      if (Array.isArray(role.permissions)) {
        for (let j = 0; j < role.permissions.length; j++) {
          const perm = role.permissions[j];
          if (
            (perm.name === "administrator" && perm.enabled === true) ||
            (perm.name === "manage community events" && perm.enabled === true)
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function setupCreateEventButton(userId, roles) {
  const btn = document.getElementById('createEventBtn');
  const noPermBtn = document.getElementById('noEventPermissionBtn');
  if (userCanManageEvents(userId, roles)) {
    if (btn) btn.style.display = '';
    if (noPermBtn) noPermBtn.style.display = 'none';
  } else {
    if (btn) btn.style.display = 'none';
    if (noPermBtn) noPermBtn.style.display = '';
  }
}

window.openCreateEventModal = function() {
  // TODO: Implement create event modal
  alert('Create Event modal will be implemented next');
};
window.openNoEventPermissionModal = function() {
  document.getElementById('noEventPermissionModal').style.display = 'flex';
};

// --- Department Pagination (AJAX) ---
document.addEventListener('DOMContentLoaded', function() {
  const deptSection = document.querySelector('.card h2.text-xl.font-semibold')?.closest('.card');
  if (!deptSection) return;
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.pathname.split('/').pop();
  function updateDepartments(page) {
    const reqUrl = `/community/${hash}?deptPage=${page}`;
    fetch(reqUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(res => res.text())
      .then(html => {
        // Parse the returned HTML and extract the departments card
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newCard = temp.querySelector('.card h2.text-xl.font-semibold')?.closest('.card');
        if (newCard && deptSection.parentNode) {
          deptSection.parentNode.replaceChild(newCard, deptSection);
          attachPaginationHandlers();
        }
      });
  }
  function attachPaginationHandlers() {
    const prevBtn = deptSection.querySelector('form[action] button[type="submit"], form button[type="submit"]:first-of-type');
    const nextBtn = deptSection.querySelector('form[action] ~ form button[type="submit"], form + form button[type="submit"]');
    const prevForm = deptSection.querySelector('form');
    const nextForm = deptSection.querySelectorAll('form')[1];
    if (prevForm) {
      prevForm.onsubmit = function(e) {
        e.preventDefault();
        const page = parseInt(prevForm.querySelector('input[name="deptPage"]').value, 10);
        if (page >= 1) updateDepartments(page);
      };
    }
    if (nextForm) {
      nextForm.onsubmit = function(e) {
        e.preventDefault();
        const page = parseInt(nextForm.querySelector('input[name="deptPage"]').value, 10);
        updateDepartments(page);
      };
    }
  }
  attachPaginationHandlers();
});

// Handles the Request to Join logic for the community details page

(function() {
  // Get relevant DOM elements
  const requestJoinModal = document.getElementById('requestJoinModal');
  const requestJoinModalClose = document.getElementById('requestJoinModalClose');
  const requestJoinModalCancel = document.getElementById('requestJoinModalCancel');
  const requestJoinModalConfirm = document.getElementById('requestJoinModalConfirm');
  const requestJoinError = document.getElementById('requestJoinError');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  let joinRequestLoading = false;

  // Get user and community IDs from EJS globals
  console.log('window.dbUser at JS load:', window.dbUser);
  const userId = window.dbUser && window.dbUser._id ? window.dbUser._id : null;
  console.log('userId used for join request:', userId);
  const communityId = window?.communityId || (typeof COMMUNITY_ID !== 'undefined' ? COMMUNITY_ID : null) || (window.community && window.community._id) || null;
  const API_URL = window.API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1';

  // Helper: Show toast
  function showToast(message, duration = 2500) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }

  // Open/close modal logic
  if (requestJoinModalClose) requestJoinModalClose.onclick = closeModal;
  if (requestJoinModalCancel) requestJoinModalCancel.onclick = closeModal;
  function closeModal() {
    if (requestJoinModal) requestJoinModal.style.display = 'none';
    if (requestJoinError) {
      requestJoinError.style.display = 'none';
      requestJoinError.textContent = '';
    }
  }

  // Confirm join request
  if (requestJoinModalConfirm) {
    requestJoinModalConfirm.onclick = handleJoinRequest;
  }

  // Expose openRequestJoinModal globally
  window.openRequestJoinModal = function() {
    if (requestJoinModal) requestJoinModal.style.display = 'flex';
  };

  // Main join request logic
  async function handleJoinRequest() {
    if (joinRequestLoading) return;
    joinRequestLoading = true;
    if (requestJoinModalConfirm) {
      requestJoinModalConfirm.disabled = true;
      requestJoinModalConfirm.textContent = 'Requesting...';
    }
    if (requestJoinError) {
      requestJoinError.style.display = 'none';
      requestJoinError.textContent = '';
    }
    try {
      // Optimistically update UI: hide modal, show pending message
      closeModal();
      showToast('Request sent! Your request to join is pending approval.', 2500);
      // Send join request to backend
      const res = await fetch(`${API_URL}/user/${userId}/pending-community-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: communityId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send join request.');
      }
      // Disable the button and show 'Pending'
      const joinBtn = document.getElementById('requestJoinBtn');
      if (joinBtn) {
        joinBtn.disabled = true;
        joinBtn.textContent = 'Pending';
        joinBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        joinBtn.classList.add('bg-gray-500', 'cursor-not-allowed');
      }
      // Send notifications to admins/managers
      await sendJoinRequestNotification(communityId, window.dbUser);
      // Optionally: update UI to show pending state (reload or update DOM)
      // setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      if (requestJoinError) {
        requestJoinError.textContent = err.message || 'Failed to send join request.';
        requestJoinError.style.display = 'block';
      }
      showToast('Error: ' + (err.message || 'Failed to send join request.'), 3000);
    } finally {
      joinRequestLoading = false;
      if (requestJoinModalConfirm) {
        requestJoinModalConfirm.disabled = false;
        requestJoinModalConfirm.textContent = 'Request to Join';
      }
    }
  }
})();

// Send join request notification to admins/managers
async function sendJoinRequestNotification(communityId, user) {
  try {
    // Fetch community details to get roles and permissions
    const res = await fetch(`${API_URL}/community/${communityId}`);
    if (!res.ok) throw new Error('Failed to fetch community details');
    const community = await res.json();

    // Get user IDs of roles with "manage members" or "administrator" permissions
    const userIds = (community.community.roles || [])
      .filter((role) =>
        (role.permissions || []).some(
          (permission) =>
            (permission.name === "manage members" ||
              permission.name === "administrator") &&
            permission.enabled
        )
      )
      .flatMap((role) => role.members);

    // Send notification to each user
    for (const recipientId of userIds) {
      await fetch(`${API_URL}/users/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentFromID: user._id,
          sentToID: recipientId,
          type: "join_request",
          data1: communityId,
          data2: community.community.name,
          message: `has requested to join`,
        }),
      });
    }
  } catch (error) {
    console.error("Error sending join request notification:", error);
  }
} 