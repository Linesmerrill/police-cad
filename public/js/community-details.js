// community-details.js
// Handles Create Event button permissions and modal logic for community details page

// Check if already initialized to prevent duplicate declarations
if (typeof window.lazyLoadingInitialized === 'undefined') {
  window.lazyLoadingInitialized = true;

  // Loading Spinner Component
  function LoadingSpinner(size = "md", text = "Loading...") {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-8 h-8", 
      lg: "w-12 h-12",
      xl: "w-16 h-16"
    };
    
    return `
      <div class="flex flex-col items-center justify-center p-8">
        <div class="${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"></div>
        <p class="text-gray-400 mt-4 text-lg">${text}</p>
      </div>
    `;
  }

  // Loading Skeleton for Community Overview
  function CommunityOverviewSkeleton() {
    return `
      <div class="card text-center mb-8 animate-pulse">
        <div class="w-5/6 max-w-96 h-96 mx-auto rounded-t-lg bg-gray-700 mb-6"></div>
        <div class="h-12 bg-gray-700 rounded mb-4 mx-auto w-96"></div>
        <div class="flex flex-wrap justify-center gap-3 mb-4">
          <div class="h-8 bg-gray-700 rounded-full w-24"></div>
          <div class="h-8 bg-gray-700 rounded-full w-32"></div>
          <div class="h-8 bg-gray-700 rounded-full w-20"></div>
        </div>
        <div class="h-6 bg-gray-700 rounded mb-4 mx-auto w-3/4"></div>
        <div class="h-6 bg-gray-700 rounded mb-4 mx-auto w-2/3"></div>
        <div class="h-6 bg-gray-700 rounded mb-4 mx-auto w-1/2"></div>
        <div class="h-8 bg-gray-700 rounded mb-4 mx-auto w-48"></div>
      </div>
    `;
  }

  // Loading Skeleton for Stats Section
  function StatsSkeleton() {
    return `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        ${Array.from({ length: 3 }).map(() => `
          <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg animate-pulse">
            <div class="flex items-center space-x-4">
              <div class="bg-gray-700 p-3 rounded-lg w-12 h-12"></div>
              <div>
                <div class="h-8 bg-gray-700 rounded w-20 mb-2"></div>
                <div class="h-4 bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Loading Skeleton for Departments Section
  function DepartmentsSkeleton() {
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <div class="h-8 bg-gray-700 rounded w-48"></div>
          <div class="h-12 bg-gray-700 rounded w-48"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          ${Array.from({ length: 4 }).map(() => `
            <div class="relative block bg-gray-800 rounded-lg shadow p-6 border border-gray-700 animate-pulse">
              <div class="w-full h-40 bg-gray-700 rounded mb-4"></div>
              <div class="h-8 bg-gray-700 rounded mb-3 w-3/4"></div>
              <div class="h-4 bg-gray-700 rounded mb-3 w-full"></div>
              <div class="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Loading Skeleton for Events Section
  function EventsSkeleton() {
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <div class="h-8 bg-gray-700 rounded w-32"></div>
          <div class="h-12 bg-gray-700 rounded w-48"></div>
        </div>
        <ul class="text-left mx-auto max-w-4xl">
          ${Array.from({ length: 2 }).map(() => `
            <li class="mb-6 p-6 rounded bg-gray-800 border border-gray-700 flex flex-col sm:flex-row items-start gap-6 animate-pulse">
              <div class="w-40 h-32 bg-gray-700 rounded mb-4 sm:mb-0"></div>
              <div class="flex-1">
                <div class="h-8 bg-gray-700 rounded mb-3 w-3/4"></div>
                <div class="h-4 bg-gray-700 rounded mb-3 w-1/2"></div>
                <div class="h-4 bg-gray-700 rounded mb-3 w-full"></div>
                <div class="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Lazy Loading Manager
  class LazyLoadingManager {
    constructor() {
      this.loadingStates = {
        overview: false,
        stats: false,
        departments: false,
        events: false
      };
      this.originalContent = {};
      this.init();
    }

    init() {
      // Store original content and check what needs loading
      this.storeOriginalContent();
      
      // Only show loading for sections that are actually loading asynchronously
      this.checkForAsyncContent();
    }

    storeOriginalContent() {
      // Store original content for sections that might be replaced
      const sections = [
        { id: 'community-overview', key: 'overview' },
        { selector: '.grid.grid-cols-1.md\\:grid-cols-3.gap-6.mb-8', key: 'stats' },
        { id: 'departments-section', key: 'departments' },
        { id: 'events-section', key: 'events' }
      ];

      sections.forEach(section => {
        const element = section.id ? 
          document.getElementById(section.id) : 
          document.querySelector(section.selector);
        
        if (element) {
          this.originalContent[section.key] = element.innerHTML;
        }
      });
    }

    checkForAsyncContent() {
      // Check if departments section is empty or loading
      const departmentsSection = document.getElementById('departments-section');
      if (departmentsSection) {
        const cardContent = departmentsSection.querySelector('.card');
        if (cardContent && (!cardContent.innerHTML.trim() || cardContent.innerHTML.includes('Loading'))) {
          this.loadingStates.departments = true;
          this.showDepartmentsSkeleton();
          setTimeout(() => this.loadDepartments(), 600);
        }
      }

      // Check if events section is empty or loading
      const eventsSection = document.getElementById('events-section');
      if (eventsSection) {
        const cardContent = eventsSection.querySelector('.card');
        if (cardContent && (!cardContent.innerHTML.trim() || cardContent.innerHTML.includes('Loading'))) {
          this.loadingStates.events = true;
          this.showEventsSkeleton();
          setTimeout(() => this.loadEvents(), 900);
        }
      }

      // For overview and stats, just add a subtle loading effect without replacing content
      setTimeout(() => this.addLoadingEffect('overview'), 100);
      setTimeout(() => this.addLoadingEffect('stats'), 300);
    }

    showDepartmentsSkeleton() {
      const departmentsSection = document.getElementById('departments-section');
      if (departmentsSection) {
        const cardContent = departmentsSection.querySelector('.card');
        if (cardContent) {
          cardContent.innerHTML = DepartmentsSkeleton();
        }
      }
    }

    showEventsSkeleton() {
      const eventsSection = document.getElementById('events-section');
      if (eventsSection) {
        const cardContent = eventsSection.querySelector('.card');
        if (cardContent) {
          cardContent.innerHTML = EventsSkeleton();
        }
      }
    }

    addLoadingEffect(section) {
      // Add a subtle loading effect without replacing content
      const element = this.getSectionElement(section);
      if (element) {
        element.style.opacity = '0.7';
        element.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
          element.style.opacity = '1';
        }, 200);
      }
    }

    getSectionElement(section) {
      switch(section) {
        case 'overview':
          return document.getElementById('community-overview');
        case 'stats':
          return document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3.gap-6.mb-8');
        case 'departments':
          return document.getElementById('departments-section');
        case 'events':
          return document.getElementById('events-section');
        default:
          return null;
      }
    }

    async loadDepartments() {
      try {
        // Simulate loading time for departments
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Restore original content or show empty state
        const departmentsSection = document.getElementById('departments-section');
        if (departmentsSection) {
          const cardContent = departmentsSection.querySelector('.card');
          if (cardContent) {
            if (this.originalContent.departments && this.originalContent.departments.trim()) {
              cardContent.innerHTML = this.originalContent.departments;
            } else {
              cardContent.innerHTML = `
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-3xl font-semibold">Departments</h2>
                </div>
                <p class="text-gray-400 text-lg">No departments listed.</p>
              `;
            }
          }
        }
        
        this.loadingStates.departments = false;
      } catch (error) {
        console.error('Error loading departments:', error);
        this.loadingStates.departments = false;
      }
    }

    async loadEvents() {
      try {
        // Simulate loading time for events
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Restore original content or show empty state
        const eventsSection = document.getElementById('events-section');
        if (eventsSection) {
          const cardContent = eventsSection.querySelector('.card');
          if (cardContent) {
            if (this.originalContent.events && this.originalContent.events.trim()) {
              cardContent.innerHTML = this.originalContent.events;
            } else {
              cardContent.innerHTML = `
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-3xl font-semibold">Events</h2>
                </div>
                <p class="text-gray-400 text-lg">No events listed.</p>
              `;
            }
          }
        }
        
        this.loadingStates.events = false;
      } catch (error) {
        console.error('Error loading events:', error);
        this.loadingStates.events = false;
      }
    }

    getCommunityIdFromUrl() {
      const pathParts = window.location.pathname.split('/');
      return pathParts[pathParts.length - 1];
    }

    // Check if all sections are loaded
    isAllLoaded() {
      return Object.values(this.loadingStates).every(state => !state);
    }
  }

  // Initialize lazy loading when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize lazy loading manager
    window.lazyLoadingManager = new LazyLoadingManager();
  });
}

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
// openNoEventPermissionModal is defined in the EJS file

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

// Global variables for join request functionality
let joinRequestLoading = false;

(function() {
  // Get relevant DOM elements
  const requestJoinModal = document.getElementById('requestJoinModal');
  const requestJoinModalClose = document.getElementById('requestJoinModalClose');
  const requestJoinModalCancel = document.getElementById('requestJoinModalCancel');
  const requestJoinModalConfirm = document.getElementById('requestJoinModalConfirm');
  const requestJoinError = document.getElementById('requestJoinError');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');

  // Get user and community IDs from EJS globals
  const userId = window.dbUser && window.dbUser._id ? window.dbUser._id : null;
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

  // Helper: Update all Request to Join buttons to pending state
  function updateAllJoinButtons() {
    // Update the main button (with ID)
    const mainJoinBtn = document.getElementById('requestJoinBtn');
    if (mainJoinBtn) {
      mainJoinBtn.disabled = true;
      mainJoinBtn.textContent = 'Pending';
      mainJoinBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      mainJoinBtn.classList.add('bg-gray-500', 'cursor-not-allowed');
    }

    // Update the secondary button in departments section
    // Look for button with "Request to Join Here" text that's not the main button
    const allButtons = document.querySelectorAll('button');
    const secondaryJoinBtn = Array.from(allButtons).find(btn => 
      btn.textContent.trim() === 'Request to Join Here' && 
      btn.id !== 'requestJoinBtn'
    );
    
    if (secondaryJoinBtn) {
      secondaryJoinBtn.disabled = true;
      secondaryJoinBtn.textContent = 'Pending';
      secondaryJoinBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      secondaryJoinBtn.classList.add('bg-gray-500', 'cursor-not-allowed');
      // Remove the onclick handler
      secondaryJoinBtn.removeAttribute('onclick');
    }
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
      
      // Update all join buttons to pending state immediately
      updateAllJoinButtons();
      
      // Send join request to backend
      const res = await fetch(`${API_URL}/api/v1/user/${userId}/pending-community-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: communityId })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send join request.');
      }
      
      // Handle the new response format
      if (data.status === 'joined') {
        showToast('Successfully joined community!', 2500);
        // Redirect to communities page
        setTimeout(() => {
          window.location.href = '/communities?success=true';
        }, 1000);
        return;
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
      
      // Revert button states on error
      const mainJoinBtn = document.getElementById('requestJoinBtn');
      if (mainJoinBtn) {
        mainJoinBtn.disabled = false;
        mainJoinBtn.textContent = 'Request to Join';
        mainJoinBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
        mainJoinBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
      }
      
      // Look for button with "Request to Join Here" text that's not the main button
      const allButtons = document.querySelectorAll('button');
      const secondaryJoinBtn = Array.from(allButtons).find(btn => 
        btn.textContent.trim() === 'Request to Join Here' && 
        btn.id !== 'requestJoinBtn'
      );
      
      if (secondaryJoinBtn) {
        secondaryJoinBtn.disabled = false;
        secondaryJoinBtn.textContent = 'Request to Join Here';
        secondaryJoinBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
        secondaryJoinBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        secondaryJoinBtn.setAttribute('onclick', 'openRequestJoinModal()');
      }
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

// Department Join Request Functions
async function sendUserPendingDepartmentRequest(communityId, departmentId, userId) {
  try {
    const response = await fetch(`${API_URL}/api/v1/user/${userId}/pending-department-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ communityId, departmentId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to send pending department request. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending pending department request:", error);
    throw error;
  }
}

async function sendJoinDepartmentRequestNotification(communityId, departmentId, user) {
  try {
    // Fetch community details to get roles and permissions
    const communityRes = await fetch(`${API_URL}/api/v1/community/${communityId}`);
    if (!communityRes.ok) throw new Error('Failed to fetch community details');
    const community = await communityRes.json();

    // Fetch department details
    const departmentRes = await fetch(`${API_URL}/api/v1/community/${communityId}/departments/${departmentId}`);
    if (!departmentRes.ok) throw new Error('Failed to fetch department details');
    const department = await departmentRes.json();

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
      await fetch(`${API_URL}/api/v1/users/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentFromID: user._id,
          sentToID: recipientId,
          type: "join_request",
          data1: communityId,
          data2: community?.community?.name,
          data3: departmentId,
          data4: department?.department?.name,
          message: `has requested to join`,
        }),
      });
    }
  } catch (error) {
    console.error("Error sending join request notification:", error);
    throw error;
  }
}

// Department Join Request Handler
async function handleDepartmentJoinRequest(communityId, departmentId) {
  // Store the department info for the modal
  window.currentDepartmentRequest = { communityId, departmentId };
  
  // Show the department join request modal
  const modal = document.getElementById('departmentJoinRequestModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Handle department join request confirmation
async function confirmDepartmentJoinRequest() {
  if (joinRequestLoading) return;
  
  const { communityId, departmentId } = window.currentDepartmentRequest || {};
  if (!communityId || !departmentId) {
    showToast('Error: Invalid department request data', 3000);
    return;
  }
  
  joinRequestLoading = true;
  
  // Update modal button state
  const confirmBtn = document.getElementById('departmentJoinRequestModalConfirm');
  const errorDiv = document.getElementById('departmentJoinRequestError');
  
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Requesting...';
  }
  
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }
  
  try {
    await sendUserPendingDepartmentRequest(communityId, departmentId, userId);
    await sendJoinDepartmentRequestNotification(communityId, departmentId, window.dbUser);
    
    // Close modal and show success
    closeDepartmentJoinRequestModal();
    showToast('Department join request sent!', 2500);
    
    // Update UI to show pending state
    updateDepartmentJoinButton(departmentId, 'Pending');
  } catch (error) {
    console.error("Error sending department join request:", error);
    
    if (errorDiv) {
      errorDiv.textContent = error.message || 'Failed to send department join request.';
      errorDiv.style.display = 'block';
    }
    
    showToast('Error: ' + (error.message || 'Failed to send department join request.'), 3000);
  } finally {
    joinRequestLoading = false;
    
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Request to Join';
    }
  }
}

// Close department join request modal
function closeDepartmentJoinRequestModal() {
  const modal = document.getElementById('departmentJoinRequestModal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Clear stored department request data
  window.currentDepartmentRequest = null;
  
  // Reset error display
  const errorDiv = document.getElementById('departmentJoinRequestError');
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }
}

// Helper function to update department join button state
function updateDepartmentJoinButton(departmentId, status) {
  const joinButton = document.querySelector(`[data-department-id="${departmentId}"].department-join-btn`);
  
  if (joinButton) {
    if (status === 'Pending') {
      joinButton.disabled = true;
      joinButton.textContent = '✓ Requested';
      joinButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
      joinButton.classList.add('bg-green-600', 'cursor-not-allowed');
      joinButton.removeAttribute('onclick');
      
      // Remove any existing status text first
      const existingStatusText = joinButton.parentNode.parentNode.querySelector('.request-status-text');
      if (existingStatusText) {
        existingStatusText.remove();
      }
      
      // Add a small tooltip or status text
      const statusText = document.createElement('div');
      statusText.className = 'request-status-text text-xs text-green-400 text-center absolute bottom-0 left-4 right-4 z-30';
      statusText.textContent = 'Request sent to administrators';
      
      // Insert the status text as a sibling to the button container (at the card level)
      joinButton.parentNode.parentNode.appendChild(statusText);
    } else if (status === 'Loading') {
      joinButton.disabled = true;
      joinButton.textContent = 'Checking...';
      joinButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
      joinButton.classList.add('bg-gray-500', 'cursor-not-allowed');
      joinButton.removeAttribute('onclick');
    } else if (status === 'Ready') {
      joinButton.disabled = false;
      joinButton.textContent = 'Request Access';
      joinButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
      joinButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
      joinButton.setAttribute('onclick', `event.stopPropagation(); handleDepartmentJoinRequest('${window.communityId}', '${departmentId}')`);
      
      // Remove any existing status text
      const existingStatusText = joinButton.parentNode.parentNode.querySelector('.request-status-text');
      if (existingStatusText) {
        existingStatusText.remove();
      }
    }
  }
}

  // Check user's department status on page load
  async function checkUserDepartmentStatus() {
    if (!window.userId || !window.communityId) {
      return;
    }
    
    try {
      // First, set all department join buttons to loading state
      const allJoinButtons = document.querySelectorAll('.department-join-btn');
      allJoinButtons.forEach(button => {
        const departmentId = button.getAttribute('data-department-id');
        if (departmentId) {
          updateDepartmentJoinButton(departmentId, 'Loading');
        }
      });
      
      // Fetch community details to check department member status
      const response = await fetch(`${API_URL}/api/v1/community/${window.communityId}`);
      if (!response.ok) {
        // Set all buttons back to ready state if fetch fails
        allJoinButtons.forEach(button => {
          const departmentId = button.getAttribute('data-department-id');
          if (departmentId) {
            updateDepartmentJoinButton(departmentId, 'Ready');
          }
        });
        return;
      }
      
      const community = await response.json();
      const departments = community.community?.departments || [];
      
      // Check each department for pending requests
      departments.forEach(department => {
        const members = department.members || [];
        const userMember = members.find(member => member.userID === window.userId);
        
        if (userMember && userMember.status === 'pending') {
          updateDepartmentJoinButton(department._id, 'Pending');
        } else {
          // User hasn't requested this department yet, set to ready
          updateDepartmentJoinButton(department._id, 'Ready');
        }
      });
      
    } catch (error) {
      // Set all buttons back to ready state if there's an error
      const allJoinButtons = document.querySelectorAll('.department-join-btn');
      allJoinButtons.forEach(button => {
        const departmentId = button.getAttribute('data-department-id');
        if (departmentId) {
          updateDepartmentJoinButton(departmentId, 'Ready');
        }
      });
    }
  }
  
  // Expose department join request function globally
  window.handleDepartmentJoinRequest = handleDepartmentJoinRequest;
  window.confirmDepartmentJoinRequest = confirmDepartmentJoinRequest;
  window.closeDepartmentJoinRequestModal = closeDepartmentJoinRequestModal;
  
  // Add event listeners for department join request modal
  document.addEventListener('DOMContentLoaded', function() {
    const modalClose = document.getElementById('departmentJoinRequestModalClose');
    const modalCancel = document.getElementById('departmentJoinRequestModalCancel');
    const modalConfirm = document.getElementById('departmentJoinRequestModalConfirm');
    
    if (modalClose) modalClose.onclick = closeDepartmentJoinRequestModal;
    if (modalCancel) modalCancel.onclick = closeDepartmentJoinRequestModal;
    if (modalConfirm) modalConfirm.onclick = confirmDepartmentJoinRequest;
    
    // Check user's department status on page load
    checkUserDepartmentStatus();
  });
  
  // Modal functions
  window.closePrivateDepartmentModal = function() {
    const modal = document.getElementById('privateDepartmentModal');
    if (modal) modal.style.display = 'none';
  };
  
  window.closeMemberOnlyModal = function() {
    const modal = document.getElementById('memberOnlyModal');
    if (modal) modal.style.display = 'none';
  };
  
  window.showComingSoon = function() {
    alert('This feature is coming soon!');
  };

  // ===== INVITE CODES MANAGEMENT =====
  
  // Global variables for invite codes
  let inviteCodesList = [];
  const API_URL = window.API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
  
  // Open invite codes modal
  window.openInviteCodesModal = function() {
    const modal = document.getElementById('inviteCodesModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
      
      // Auto-generate and fill invite code (like mobile app)
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      document.getElementById('inviteCodeInput').value = code;
      
      loadInviteCodes();
    }
  };
  
  // Close invite codes modal
  window.closeInviteCodesModal = function() {
    const modal = document.getElementById('inviteCodesModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };
  
  // Show no permission modal
  window.showNoInviteCodesPermissionModal = function() {
    const modal = document.getElementById('noInviteCodesPermissionModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }
  };
  
  // Close no permission modal
  window.closeNoInviteCodesPermissionModal = function() {
    const modal = document.getElementById('noInviteCodesPermissionModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };

  // Show invite code success modal
  window.showInviteCodeSuccessModal = function(code, link) {
    const modal = document.getElementById('inviteCodeSuccessModal');
    if (modal) {
      // Update the code and link in the modal
      document.getElementById('successCode').textContent = code;
      document.getElementById('successLink').textContent = link;
      
      // Show the modal
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }
  };

  // Close invite code success modal
  window.closeInviteCodeSuccessModal = function() {
    const modal = document.getElementById('inviteCodeSuccessModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    
    // Always generate a new code when closing the success modal
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('inviteCodeInput').value = newCode;
  };

  // Copy success code to clipboard
  window.copySuccessCode = function() {
    const code = document.getElementById('successCode').textContent;
    const button = event.target.closest('button');
    
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        showCopyFeedback(button);
      }).catch(err => {
        console.error('Clipboard API failed:', err);
        fallbackCopyToClipboard(code, button);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      fallbackCopyToClipboard(code, button);
    }
  };

  // Copy success link to clipboard
  window.copySuccessLink = function() {
    const link = document.getElementById('successLink').textContent;
    const button = event.target.closest('button');
    
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(() => {
        showCopyFeedback(button);
      }).catch(err => {
        console.error('Clipboard API failed:', err);
        fallbackCopyToClipboard(link, button);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      fallbackCopyToClipboard(link, button);
    }
  };

  // Show copy feedback animation
  function showCopyFeedback(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa fa-check"></i>';
    button.style.background = '#48bb78';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = '#4a5568';
    }, 1000);
  }

  // Fallback copy method for older browsers
  function fallbackCopyToClipboard(text, button) {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Try to copy using execCommand
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        showCopyFeedback(button);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      // Show a custom toast instead of browser alert
      showCustomToast('Unable to copy automatically. Please select and copy manually.', 'warning');
    }
  }

  // Custom toast notification function
  function showCustomToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 300px;
      font-size: 0.875rem;
      font-weight: 500;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  // Create another invite code
  window.createAnotherCode = function() {
    // Close success modal
    closeInviteCodeSuccessModal();
    
    // Reset form to defaults
    document.getElementById('expireAfterSelect').value = '7d';
    document.getElementById('maxUsesSelect').value = '0';
    
    // Note: closeInviteCodeSuccessModal() already generates a new code
  };
  
  // Generate random invite code (matches mobile app logic)
  window.generateInviteCode = function() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('inviteCodeInput').value = code;
    return code;
  };
  
  // Create invite code (matches mobile app logic)
  window.createInviteCode = async function() {
    let code = document.getElementById('inviteCodeInput').value.trim();
    const expireAfter = document.getElementById('expireAfterSelect').value;
    const maxUsesValue = document.getElementById('maxUsesSelect').value;
    
    // Generate code if empty (matches mobile app behavior)
    if (!code) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      document.getElementById('inviteCodeInput').value = code;
    }
    
    // Calculate expiration date (matches mobile app logic)
    let expiresAt = null;
    if (expireAfter !== 'never') {
      const now = new Date();
      const timeMap = {
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };
      
      if (timeMap[expireAfter]) {
        expiresAt = new Date(now.getTime() + timeMap[expireAfter]).toISOString();
      }
    }
    
    // Handle max uses (API expects 0 for "No limit")
    const maxUses = maxUsesValue === '0' ? 0 : parseInt(maxUsesValue);
    
    // Get community ID from EJS globals (same as other functions in this file)
    const communityId = window?.communityId || (typeof COMMUNITY_ID !== 'undefined' ? COMMUNITY_ID : null) || (window.community && window.community._id) || null;
    const userId = window.dbUser?._id;
    
    if (!communityId || !userId) {
      alert('Error: Missing community or user information');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/v1/community/${communityId}/add-invite-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.dbUser?.token || ''}`
        },
        body: JSON.stringify({
          code: code,
          maxUses: maxUses,
          expiresAt: expiresAt,
          createdBy: userId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invite code');
      }
      
      const data = await response.json();
      
      // Generate TinyURL link (matches mobile app)
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/join/${code}`;
      
      // Show success with custom modal
      const link = `https://tinyurl.com/linescad/${code}`;
      showInviteCodeSuccessModal(code, link);
      
      // Reload invite codes list
      loadInviteCodes();
      
    } catch (error) {
      console.error('Error creating invite code:', error);
      alert('Error creating invite code: ' + error.message);
    }
  };
  
  // Load existing invite codes with pagination
  async function loadInviteCodes(page = 1, limit = 10) {
    const loadingDiv = document.getElementById('inviteCodesLoading');
    const emptyDiv = document.getElementById('inviteCodesEmpty');
    const listDiv = document.getElementById('inviteCodesList');
    
    // Show loading state
    loadingDiv.style.display = 'block';
    emptyDiv.style.display = 'none';
    listDiv.style.display = 'none';
    
    try {
      const response = await fetch(`${API_URL}/api/v2/community/${communityId}/invite-codes?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${window.dbUser?.token || ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        displayInviteCodes(data.inviteCodes, data.pagination);
      } else {
        throw new Error('Failed to load invite codes');
      }
    } catch (error) {
      console.error('Error loading invite codes:', error);
      loadingDiv.style.display = 'none';
      emptyDiv.style.display = 'block';
      listDiv.style.display = 'none';
    }
  }

  // Display invite codes with pagination
  function displayInviteCodes(inviteCodes, pagination) {
    const loadingDiv = document.getElementById('inviteCodesLoading');
    const emptyDiv = document.getElementById('inviteCodesEmpty');
    const listDiv = document.getElementById('inviteCodesList');
    
    if (inviteCodes.length === 0) {
      loadingDiv.style.display = 'none';
      emptyDiv.style.display = 'block';
      listDiv.style.display = 'none';
      return;
    }
    
    // Create invite codes list
    let html = '<div style="space-y:0.75rem;">';
    
    inviteCodes.forEach(inviteCode => {
      const expiresAt = inviteCode.expiresAt ? new Date(inviteCode.expiresAt) : null;
      const isExpired = expiresAt && expiresAt < new Date();
      const isUnlimited = inviteCode.maxUses === 0;
      const remainingUses = isUnlimited ? '∞' : inviteCode.remainingUses || 0;
      
      html += `
        <div style="background:#2d3748; border:1px solid #4a5568; border-radius:12px; padding:1.25rem; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem; gap:1rem;">
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem; flex-wrap:wrap;">
                <code style="background:#1e2028; color:#68d391; padding:0.5rem 0.75rem; border-radius:6px; font-family:monospace; font-size:1rem; font-weight:600; border:1px solid #4a5568;">${inviteCode.code}</code>
                ${isExpired ? '<span style="background:#e53e3e; color:#fff; padding:0.25rem 0.75rem; border-radius:6px; font-size:0.875rem; font-weight:500;">EXPIRED</span>' : ''}
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.95rem; color:#a0aec0; line-height:1.5;">
                <div>
                  <span style="color:#e0e7ff; font-weight:500; display:block; margin-bottom:0.25rem;">Uses:</span> 
                  <span style="font-size:1rem;">${remainingUses}${isUnlimited ? '' : ` / ${inviteCode.maxUses}`}</span>
                </div>
                <div>
                  <span style="color:#e0e7ff; font-weight:500; display:block; margin-bottom:0.25rem;">Expires:</span> 
                  <span style="font-size:1rem;">${expiresAt ? expiresAt.toLocaleString() : 'Never'}</span>
                </div>
                <div>
                  <span style="color:#e0e7ff; font-weight:500; display:block; margin-bottom:0.25rem;">Created:</span> 
                  <span style="font-size:1rem;">${new Date(inviteCode.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span style="color:#e0e7ff; font-weight:500; display:block; margin-bottom:0.25rem;">By:</span> 
                  <span style="font-size:1rem;">${inviteCode.createdByUser?.username || 'Unknown'}</span>
                </div>
              </div>
            </div>
            <div style="display:flex; gap:0.75rem; margin-left:1rem; flex-shrink:0;">
              <button onclick="copyInviteLink('${inviteCode.code}')" style="background:#4a5568; color:#fff; border:none; border-radius:8px; padding:0.75rem; cursor:pointer; font-size:1rem; min-width:44px; min-height:44px; display:flex; align-items:center; justify-content:center;" title="Copy Link">
                <i class="fa fa-copy"></i>
              </button>
              <button onclick="deleteInviteCode('${inviteCode._id}', '${inviteCode.code}')" style="background:#e53e3e; color:#fff; border:none; border-radius:8px; padding:0.75rem; cursor:pointer; font-size:1rem; min-width:44px; min-height:44px; display:flex; align-items:center; justify-content:center;" title="Delete Code">
                <i class="fa fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    // Add pagination if needed
    if (pagination.totalPages > 1) {
      html += createPaginationControls(pagination);
    }
    
    listDiv.innerHTML = html;
    loadingDiv.style.display = 'none';
    emptyDiv.style.display = 'none';
    listDiv.style.display = 'block';
  }

  // Create pagination controls
  function createPaginationControls(pagination) {
    let html = '<div style="display:flex; justify-content:center; align-items:center; gap:0.75rem; margin-top:1.5rem; padding-top:1rem; border-top:1px solid #4a5568; flex-wrap:wrap;">';
    
    // Previous button
    if (pagination.hasPrevPage) {
      html += `<button onclick="loadInviteCodes(${pagination.currentPage - 1})" style="background:#4a5568; color:#fff; border:none; border-radius:8px; padding:0.75rem 1rem; cursor:pointer; font-size:1rem; min-height:44px; display:flex; align-items:center; gap:0.5rem;">
        <i class="fa fa-chevron-left"></i> Previous
      </button>`;
    } else {
      html += `<button disabled style="background:#2d3748; color:#6b7280; border:none; border-radius:8px; padding:0.75rem 1rem; cursor:not-allowed; font-size:1rem; min-height:44px; display:flex; align-items:center; gap:0.5rem;">
        <i class="fa fa-chevron-left"></i> Previous
      </button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      if (i === pagination.currentPage) {
        html += `<button style="background:#667eea; color:#fff; border:none; border-radius:8px; padding:0.75rem 1rem; font-size:1rem; font-weight:600; min-width:44px; min-height:44px; display:flex; align-items:center; justify-content:center;">${i}</button>`;
      } else {
        html += `<button onclick="loadInviteCodes(${i})" style="background:#4a5568; color:#fff; border:none; border-radius:8px; padding:0.75rem 1rem; cursor:pointer; font-size:1rem; min-width:44px; min-height:44px; display:flex; align-items:center; justify-content:center;">${i}</button>`;
      }
    }
    
    // Next button
    if (pagination.hasNextPage) {
      html += `<button onclick="loadInviteCodes(${pagination.currentPage + 1})" style="background:#4a5568; color:#fff; border:none; border-radius:8px; padding:0.75rem 1rem; cursor:pointer; font-size:1rem; min-height:44px; display:flex; align-items:center; gap:0.5rem;">
        Next <i class="fa fa-chevron-right"></i>
      </button>`;
    } else {
      html += `<button disabled style="background:#2d3748; color:#6b7280; border:none; border-radius:8px; padding:0.75rem 1rem; cursor:not-allowed; font-size:1rem; min-height:44px; display:flex; align-items:center; gap:0.5rem;">
        Next <i class="fa fa-chevron-right"></i>
      </button>`;
    }
    
    html += '</div>';
    return html;
  }
  
  // Copy invite link to clipboard (matches mobile app TinyURL pattern)
  window.copyInviteLink = function(code) {
    // Use the same TinyURL pattern as mobile app
    const link = `https://tinyurl.com/linescad/${code}`;
    const button = event.target.closest('button');
    
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(() => {
        showCopyFeedback(button);
      }).catch(err => {
        console.error('Clipboard API failed:', err);
        fallbackCopyToClipboard(link, button);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      fallbackCopyToClipboard(link, button);
    }
  };
  
  // Global variables for delete confirmation
  let pendingDeleteId = null;
  let pendingDeleteCode = null;

  // Show delete confirmation modal
  window.deleteInviteCode = function(inviteCodeId, code) {
    pendingDeleteId = inviteCodeId;
    pendingDeleteCode = code;
    
    // Update modal content
    document.getElementById('deleteCodeName').textContent = code;
    
    // Show modal
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }
  };

  // Close delete confirmation modal
  window.closeDeleteConfirmModal = function() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    // Clear pending delete data
    pendingDeleteId = null;
    pendingDeleteCode = null;
  };

  // Confirm delete invite code
  window.confirmDeleteInviteCode = async function() {
    if (!pendingDeleteId || !pendingDeleteCode) {
      console.error('No pending delete data');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/v1/invite-code/${pendingDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${window.dbUser?.token || ''}`
        }
      });
      
      if (response.ok) {
        showCustomToast(`Invite code "${pendingDeleteCode}" deleted successfully`, 'info');
        // Close modal
        closeDeleteConfirmModal();
        // Reload the invite codes list
        loadInviteCodes();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete invite code');
      }
    } catch (error) {
      console.error('Error deleting invite code:', error);
      showCustomToast(`Failed to delete invite code: ${error.message}`, 'error');
    }
  }; 