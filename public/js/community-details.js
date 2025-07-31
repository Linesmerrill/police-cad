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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send join request.');
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