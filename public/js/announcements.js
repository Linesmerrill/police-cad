// ===========================================
// ANNOUNCEMENT SYSTEM
// ===========================================

(function() {
  'use strict';

  // Get API URL from environment or fallback
  const API_URL = window.API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

  // Global variables for pagination and state management
  let currentAnnouncementPage = 1;
  const announcementsPerPage = 10;
  let totalAnnouncements = 0;
  let totalPages = 0;
  let currentFilterType = 'all';
  let seenAnnouncements = new Set();

  // Load seen announcements from localStorage
  function loadSeenAnnouncements() {
    try {
      const stored = localStorage.getItem(`seen-announcements-${window.communityId}`);
      if (stored && stored.trim() !== '') {
        // Additional validation to ensure it's valid JSON
        if (stored.trim().startsWith('[') && stored.trim().endsWith(']')) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            seenAnnouncements = new Set(parsed);
            return;
          }
        }
        // If we get here, the data is corrupted
        console.warn('Corrupted localStorage data detected, clearing...');
        localStorage.removeItem(`seen-announcements-${window.communityId}`);
        seenAnnouncements = new Set();
      }
    } catch (error) {
      console.error('Error loading seen announcements:', error);
      localStorage.removeItem(`seen-announcements-${window.communityId}`);
      seenAnnouncements = new Set();
    }
  }

  // Save seen announcements to localStorage
  function saveSeenAnnouncements() {
    try {
      localStorage.setItem(`seen-announcements-${window.communityId}`, JSON.stringify(Array.from(seenAnnouncements)));
    } catch (error) {
      console.error('Error saving seen announcements:', error);
    }
  }

  // Mark announcement as seen
  function markAnnouncementAsSeen(announcementId) {
    seenAnnouncements.add(announcementId);
    saveSeenAnnouncements();
    updateUnreadCount();
  }

  // Check if announcement is unread
  function isAnnouncementUnread(announcementId) {
    return !seenAnnouncements.has(announcementId);
  }

  // Update a specific announcement card with fresh data from the API
  async function updateAnnouncementCard(announcementId) {
    try {

      
      const response = await fetch(`${API_URL}/api/v1/announcement/${announcementId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.announcement) {
        throw new Error('Failed to fetch updated announcement data');
      }

      // Find the existing card and replace it with the updated one
      const existingCard = document.querySelector(`[data-announcement-id="${announcementId}"]`);
      if (existingCard) {
        const newCardHtml = createAnnouncementCard(data.announcement);
        existingCard.outerHTML = newCardHtml;

      } else {
        console.warn('⚠️ Could not find announcement card to update');
      }
    } catch (error) {
      console.error('Error updating announcement card:', error);
      // Fallback to full reload if individual update fails
      loadAnnouncements();
    }
  }

  // Update unread count and badges
  function updateUnreadCount() {
    const unreadCount = document.querySelectorAll('.announcement-card').length - seenAnnouncements.size;
    const unreadBadge = document.getElementById('unread-count');
    const unreadNumber = document.getElementById('unread-number');
    const navBadge = document.getElementById('nav-announcements-badge');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');

    if (unreadCount > 0) {
      if (unreadBadge) {
        unreadBadge.classList.remove('hidden');
        if (unreadNumber) unreadNumber.textContent = unreadCount;
      }
      if (navBadge) {
        navBadge.classList.remove('hidden');
        navBadge.textContent = unreadCount;
      }
      if (markAllReadBtn) markAllReadBtn.classList.remove('hidden');
    } else {
      if (unreadBadge) unreadBadge.classList.add('hidden');
      if (navBadge) navBadge.classList.add('hidden');
      if (markAllReadBtn) markAllReadBtn.classList.add('hidden');
    }
  }

  // Mark all announcements as read
  function markAllAsRead() {
    document.querySelectorAll('.announcement-card').forEach(card => {
      const announcementId = card.dataset.announcementId;
      if (announcementId) {
        markAnnouncementAsSeen(announcementId);
      }
    });
    
    // Update visual indicators
    document.querySelectorAll('.announcement-card').forEach(card => {
      card.classList.remove('border-l-4', 'border-blue-500');
      const newBadge = card.querySelector('.new-badge');
      if (newBadge) newBadge.remove();
    });
    
    updateUnreadCount();
  }

  // Show error message
  function showError(message, duration = 5000) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 300);
    }, duration);
  }

  // Show success message
  function showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 300);
    }, duration);
  }

  // Format date for display
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Create announcement card
  function createAnnouncementCard(announcement) {
    
    // Defensive programming: ensure announcement object exists and has required properties
    if (!announcement || typeof announcement !== 'object') {
      console.error('Invalid announcement object:', announcement);
      return '';
    }

    // Ensure required properties exist with fallbacks
    const safeAnnouncement = {
      _id: announcement._id || 'unknown',
      title: announcement.title || 'Untitled',
      content: announcement.content || 'No content',
      type: announcement.type || 'main',
      priority: announcement.priority || 'medium',
      isActive: announcement.isActive !== undefined ? announcement.isActive : true,
      isPinned: announcement.isPinned || false,
      viewCount: announcement.viewCount || 0,
      createdAt: announcement.createdAt || new Date().toISOString(),
      updatedAt: announcement.updatedAt || new Date().toISOString(),
      creator: announcement.creator || { username: 'Unknown User' },
      reactions: (announcement.reactions && Array.isArray(announcement.reactions)) ? announcement.reactions : [],
      comments: (announcement.comments && Array.isArray(announcement.comments)) ? announcement.comments : []
    };

    const isUnread = isAnnouncementUnread(safeAnnouncement._id);
    const unreadClass = isUnread ? 'border-l-4 border-blue-500' : '';
    
    // Use safe arrays from the safeAnnouncement object
    const reactions = safeAnnouncement.reactions;
    const comments = safeAnnouncement.comments;
    
    const reactionsHtml = reactions.length > 0 
      ? reactions.map(reaction => `
          <span class="inline-flex items-center bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 mb-2">
            <span class="mr-1">${reaction.emoji}</span>
            <span>${reaction.user.username}</span>
          </span>
        `).join('')
      : '';

    const commentsHtml = comments.length > 0 
      ? comments.map(comment => {
          const isCurrentUserComment = comment.user._id === window.dbUser._id;
          return `
            <div class="bg-gray-700 p-3 rounded-lg mb-2">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-lg text-gray-200">${escapeHtml(comment.user.username)}</span>
                <div class="flex items-center space-x-2">
                  <span class="text-base text-gray-400">${formatDate(comment.timestamp)}</span>
                                   ${isCurrentUserComment ? `
                   <button onclick="openEditCommentModal('${safeAnnouncement._id}', '${comment._id}', '${escapeHtml(comment.content)}')"
                           class="text-blue-400 hover:text-blue-300 text-base transition-colors">
                     <i class="fas fa-edit"></i>
                   </button>
                   <button onclick="openDeleteCommentModal('${safeAnnouncement._id}', '${comment._id}', '${escapeHtml(comment.content)}')"
                           class="text-red-400 hover:text-red-300 text-base transition-colors">
                     <i class="fas fa-trash"></i>
                   </button>
                 ` : ''}
                </div>
              </div>
              <p class="text-lg text-gray-300">${escapeHtml(comment.content)}</p>
              ${comment.edited ? '<span class="text-base text-gray-500">(edited)</span>' : ''}
            </div>
          `;
        }).join('')
      : '';

         return `
       <div class="announcement-card bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 mb-4 ${unreadClass}" data-announcement-id="${safeAnnouncement._id}">
         ${isUnread ? '<div class="new-badge absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">NEW</div>' : ''}
         
         <div class="flex items-start justify-between mb-4">
           <div class="flex items-center space-x-3">
             <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
               ${safeAnnouncement.creator.username.charAt(0).toUpperCase()}
             </div>
             <div>
               <h3 class="font-semibold text-2xl text-white">${escapeHtml(safeAnnouncement.title)}</h3>
               <p class="text-lg text-gray-300">by ${escapeHtml(safeAnnouncement.creator.username)} • ${formatDate(safeAnnouncement.createdAt)}</p>
             </div>
           </div>
           <div class="flex items-center space-x-2">
             <span class="px-2 py-1 text-xs font-medium rounded-full ${
               safeAnnouncement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
               safeAnnouncement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
               safeAnnouncement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
               'bg-green-100 text-green-800'
             }">${safeAnnouncement.priority.toUpperCase()}</span>
             <span class="px-2 py-1 text-xs font-medium rounded-full ${
               safeAnnouncement.type === 'main' ? 'bg-blue-100 text-blue-800' :
               safeAnnouncement.type === 'session' ? 'bg-purple-100 text-purple-800' :
               'bg-green-100 text-green-800'
             }">${safeAnnouncement.type.toUpperCase()}</span>
             ${safeAnnouncement.isPinned ? '<span class="text-yellow-500"><i class="fas fa-thumbtack"></i></span>' : ''}
             ${(safeAnnouncement.creator._id === window.dbUser._id || window.canManageAnnouncements) ? `
               <button onclick="openEditAnnouncementModal('${safeAnnouncement._id}', '${escapeHtml(safeAnnouncement.title)}', '${escapeHtml(safeAnnouncement.content)}', '${safeAnnouncement.type}', '${safeAnnouncement.priority}')" 
                       class="text-blue-400 hover:text-blue-300 transition-colors ml-2" 
                       title="Edit announcement">
                 <i class="fas fa-edit"></i>
               </button>
               <button onclick="openDeleteAnnouncementModal('${safeAnnouncement._id}', '${escapeHtml(safeAnnouncement.title)}')" 
                       class="text-red-400 hover:text-red-300 transition-colors ml-2" 
                       title="Delete announcement">
                 <i class="fas fa-trash"></i>
               </button>
             ` : ''}
           </div>
         </div>

         <div class="prose max-w-none mb-4">
           <p class="text-gray-200 text-lg leading-relaxed">${escapeHtml(safeAnnouncement.content)}</p>
         </div>

         <div class="flex items-center justify-between mb-4">
           <div class="flex items-center space-x-4">
             <button onclick="toggleReaction('${safeAnnouncement._id}', '👍')" class="flex items-center space-x-1 text-gray-400 hover:text-blue-400 transition-colors">
               <span class="text-2xl">👍</span>
               <span class="text-lg">${reactions.filter(r => r.emoji === '👍').length}</span>
             </button>
             <button onclick="toggleReaction('${safeAnnouncement._id}', '👎')" class="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors">
               <span class="text-2xl">👎</span>
               <span class="text-lg">${reactions.filter(r => r.emoji === '👎').length}</span>
             </button>
             <button onclick="toggleComments('${safeAnnouncement._id}')" class="flex items-center space-x-1 text-gray-400 hover:text-green-400 transition-colors">
               <i class="fas fa-comment text-xl"></i>
               <span class="text-lg">${comments.length}</span>
             </button>
           </div>
           <div class="flex items-center space-x-2 text-lg text-gray-400">
             <i class="fas fa-eye"></i>
             <span>${safeAnnouncement.viewCount}</span>
           </div>
         </div>

        ${reactionsHtml ? `
          <div class="mb-4 p-3 bg-gray-700 rounded-lg">
            <h4 class="text-lg font-medium text-gray-200 mb-2">Reactions</h4>
            <div class="flex flex-wrap">
              ${reactionsHtml}
            </div>
          </div>
        ` : ''}

                          <div id="comments-${safeAnnouncement._id}" class="comments-section ${comments.length > 0 ? '' : 'hidden'}">
           <div class="mb-4">
             <h4 class="text-lg font-medium text-gray-200 mb-2">Comments</h4>
             <div class="space-y-2">
               ${commentsHtml}
             </div>
           </div>
           <div class="flex space-x-2">
             <input type="text" id="comment-input-${safeAnnouncement._id}" placeholder="Add a comment..." 
                    class="flex-1 px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
             <button onclick="addComment('${safeAnnouncement._id}')" 
                     class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg">
               Comment
             </button>
           </div>
         </div>
       </div>
     `;
  }

  // Filter announcements by type
  function filterAnnouncements(type) {
    currentAnnouncementPage = 1;
    currentFilterType = type;
    
    // Update tab styles
    const tabs = ['all', 'main', 'session', 'training'];
    tabs.forEach(tabType => {
      const tab = document.getElementById(`tab-${tabType}`);
      if (tab) {
        if (tabType === type) {
          tab.className = 'px-4 py-2 rounded-lg font-semibold transition-colors bg-blue-600 text-white';
        } else {
          tab.className = 'px-4 py-2 rounded-lg font-semibold transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600';
        }
      }
    });
    
    loadAnnouncements();
  }

  // Load announcements from API
  async function loadAnnouncements() {
    try {
      const container = document.getElementById('announcements-container');
      if (!container) return;

      container.innerHTML = '<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>';

      // Check if required variables are available
      if (!window.communityId) {
        throw new Error('Community ID not found');
      }
      if (!window.API_URL) {
        throw new Error('API URL not found');
      }

      const params = new URLSearchParams({
        page: currentAnnouncementPage,
        limit: announcementsPerPage
      });
      
      // Add filter parameter if not 'all'
      if (currentFilterType && currentFilterType !== 'all') {
        params.append('type', currentFilterType);
      }

      

      const response = await fetch(`${API_URL}/api/v1/community/${window.communityId}/announcements?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });


      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

             const data = await response.json();
       
       // Debug: Log the actual response structure
 
       
       if (!data.success) {
         throw new Error(data.message || 'Failed to load announcements');
       }

       // More flexible validation - check for different possible structures
       let announcements = data.announcements || data.data?.announcements || [];
       let pagination = data.pagination || data.data?.pagination || {};
       
       // Handle null announcements from backend
       if (announcements === null) {
 
         announcements = [];
       }
       
       // Ensure announcements is an array
       if (!Array.isArray(announcements)) {
         console.error('Invalid announcements data structure:', data);
         console.error('Announcements should be an array, got:', typeof announcements);
         throw new Error('Invalid data structure received from server');
       }

       totalAnnouncements = pagination.totalAnnouncements || pagination.total || 0;
       totalPages = pagination.totalPages || pagination.pages || 1;

       if (announcements.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12">
            <i class="fas fa-bullhorn text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-200 mb-2">No announcements found</h3>
            <p class="text-gray-400">There are no announcements to display.</p>
          </div>
        `;
        
        // Update the announcements count in the metrics card
        const announcementsCountElement = document.getElementById('announcements-count');
        if (announcementsCountElement) {
          announcementsCountElement.textContent = '0';
        }
        
        return;
      }

      container.innerHTML = announcements.map(createAnnouncementCard).join('');
      updatePagination();
      updateUnreadCount();

      // Update the announcements count in the metrics card
      const announcementsCountElement = document.getElementById('announcements-count');
      if (announcementsCountElement) {
        announcementsCountElement.textContent = announcements.length;
      }

    } catch (error) {
      console.error('Error loading announcements:', error);
      const container = document.getElementById('announcements-container');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-12">
            <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-200 mb-2">Error loading announcements</h3>
            <p class="text-gray-400">${error.message}</p>
            <button onclick="loadAnnouncements()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Try Again
            </button>
          </div>
        `;
      }
    }
  }

  // Go to specific page
  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentAnnouncementPage = page;
    loadAnnouncements();
  }

  // Update pagination controls
  function updatePagination() {
    const paginationContainer = document.getElementById('announcements-pagination');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHtml = `
      <div class="flex items-center justify-center space-x-2">
        <button onclick="goToPage(${currentAnnouncementPage - 1})" 
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 ${currentAnnouncementPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                ${currentAnnouncementPage <= 1 ? 'disabled' : ''}>
          Previous
        </button>
    `;

    const startPage = Math.max(1, currentAnnouncementPage - 2);
    const endPage = Math.min(totalPages, currentAnnouncementPage + 2);

    if (startPage > 1) {
      paginationHtml += `<button onclick="goToPage(1)" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">1</button>`;
      if (startPage > 2) {
        paginationHtml += `<span class="px-3 py-2 text-sm text-gray-500">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <button onclick="goToPage(${i})" 
                class="px-3 py-2 text-sm font-medium ${i === currentAnnouncementPage ? 'text-blue-600 bg-blue-50 border-blue-500' : 'text-gray-500 bg-white border-gray-300'} border rounded-lg hover:bg-gray-50">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<span class="px-3 py-2 text-sm text-gray-500">...</span>`;
      }
      paginationHtml += `<button onclick="goToPage(${totalPages})" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">${totalPages}</button>`;
    }

    paginationHtml += `
        <button onclick="goToPage(${currentAnnouncementPage + 1})" 
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 ${currentAnnouncementPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}"
                ${currentAnnouncementPage >= totalPages ? 'disabled' : ''}>
          Next
        </button>
      </div>
    `;

    paginationContainer.innerHTML = paginationHtml;
  }

  // Toggle reaction
  async function toggleReaction(announcementId, emoji) {

    try {
      // Check if required global variables are available
      if (!window.communityId) {
        throw new Error('Community ID not found');
      }
      if (!window.dbUser || !window.dbUser._id) {
        throw new Error('User data not found');
      }
      
      markAnnouncementAsSeen(announcementId);
      
      const response = await fetch(`${API_URL}/api/v1/announcement/${announcementId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: window.dbUser._id,
          emoji: emoji
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to add reaction');
      }

      // Update the specific announcement card instead of reloading all
      await updateAnnouncementCard(announcementId);
      showSuccess('Reaction added successfully');

    } catch (error) {
      console.error('Error toggling reaction:', error);
      showError(error.message);
    }
  }

  // Toggle comments visibility
  function toggleComments(announcementId) {
    const commentsSection = document.getElementById(`comments-${announcementId}`);
    if (commentsSection) {
      commentsSection.classList.toggle('hidden');
      markAnnouncementAsSeen(announcementId);
    }
  }

  // Add comment
  async function addComment(announcementId) {

    try {
      // Check if required global variables are available
      if (!window.communityId) {
        throw new Error('Community ID not found');
      }
      if (!window.dbUser || !window.dbUser._id) {
        throw new Error('User data not found');
      }
      
      const input = document.getElementById(`comment-input-${announcementId}`);
      const content = input.value.trim();
      
      if (!content) {
        showError('Please enter a comment');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/announcement/${announcementId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: window.dbUser._id,
          content: content
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to add comment');
      }

      input.value = '';
      
      // Update the specific announcement card instead of reloading all
      await updateAnnouncementCard(announcementId);
      showSuccess('Comment added successfully');

    } catch (error) {
      console.error('Error adding comment:', error);
      showError(error.message);
    }
  }

  // Open edit comment modal
  function openEditCommentModal(announcementId, commentId, currentContent) {

    
    // Set the form values
    document.getElementById('edit-comment-announcement-id').value = announcementId;
    document.getElementById('edit-comment-id').value = commentId;
    document.getElementById('edit-comment-content').value = currentContent;
    
    // Show the modal
    const modal = document.getElementById('editCommentModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // Close edit comment modal
  function closeEditCommentModal() {
    const modal = document.getElementById('editCommentModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Submit edited comment
  async function submitEditComment() {

    try {
      const announcementId = document.getElementById('edit-comment-announcement-id').value;
      const commentId = document.getElementById('edit-comment-id').value;
      const content = document.getElementById('edit-comment-content').value.trim();
      


      if (!content) {
        showError('Please enter a comment');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/announcement/${announcementId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: window.dbUser._id,
          content: content
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update comment');
      }

      closeEditCommentModal();
      await updateAnnouncementCard(announcementId);
      showSuccess('Comment updated successfully');

    } catch (error) {
      console.error('Error updating comment:', error);
      showError(error.message);
    }
  }

  // Edit comment (legacy function - now opens modal)
  async function editComment(announcementId, commentId, currentContent) {
    openEditCommentModal(announcementId, commentId, currentContent);
  }

  // Open delete comment modal
  function openDeleteCommentModal(announcementId, commentId, commentContent) {

    
    // Set the form values
    document.getElementById('delete-comment-announcement-id').value = announcementId;
    document.getElementById('delete-comment-id').value = commentId;
    document.getElementById('delete-comment-content').textContent = commentContent;
    
    // Show the modal
    const modal = document.getElementById('deleteCommentModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // Close delete comment modal
  function closeDeleteCommentModal() {
    const modal = document.getElementById('deleteCommentModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Delete comment (called from modal)
  async function deleteComment(announcementId, commentId) {
    try {
      // Get the IDs from the modal if not provided
      if (!announcementId) {
        announcementId = document.getElementById('delete-comment-announcement-id').value;
      }
      if (!commentId) {
        commentId = document.getElementById('delete-comment-id').value;
      }

      const response = await fetch(`${API_URL}/api/v1/announcement/${announcementId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: window.dbUser._id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete comment');
      }

      closeDeleteCommentModal();
      await updateAnnouncementCard(announcementId);
      showSuccess('Comment deleted successfully');

    } catch (error) {
      console.error('Error deleting comment:', error);
      showError(error.message);
    }
  }

  // Delete announcement (called from modal)
  async function deleteAnnouncement(announcementId) {
    try {
      // Get the announcement ID from the modal
      if (!announcementId) {
        announcementId = document.getElementById('delete-announcement-id').value;
      }

      const response = await fetch(`${API_URL}/api/v1/announcement/${announcementId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: window.dbUser._id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete announcement');
      }

      // Remove the card from the DOM since it's deleted
      const card = document.querySelector(`[data-announcement-id="${announcementId}"]`);
      if (card) {
        card.remove();
      }
      showSuccess('Announcement deleted successfully');

    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError(error.message);
    }
  }

  // Open create announcement modal
  function openCreateAnnouncementModal() {
    const modal = document.getElementById('createAnnouncementModal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('announcement-title').value = '';
      document.getElementById('announcement-content').value = '';
      document.getElementById('announcement-type').value = 'main';
      document.getElementById('announcement-priority').value = 'medium';
      
    } else {
      console.error('Modal element not found');
    }
  }

  // Close create announcement modal
  function closeCreateAnnouncementModal() {
    const modal = document.getElementById('createAnnouncementModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Open no permission modal
  function openNoAnnouncementPermissionModal() {
    const modal = document.getElementById('noAnnouncementPermissionModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // Close no permission modal
  function closeNoAnnouncementPermissionModal() {
    const modal = document.getElementById('noAnnouncementPermissionModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Open edit announcement modal
  function openEditAnnouncementModal(announcementId, title, content, type, priority) {

    
    // Set the form values
    document.getElementById('edit-announcement-id').value = announcementId;
    document.getElementById('edit-announcement-title').value = title;
    document.getElementById('edit-announcement-content').value = content;
    document.getElementById('edit-announcement-type').value = type;
    document.getElementById('edit-announcement-priority').value = priority;
    
    // Show the modal
    const modal = document.getElementById('editAnnouncementModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // Close edit announcement modal
  function closeEditAnnouncementModal() {
    const modal = document.getElementById('editAnnouncementModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Open delete announcement modal
  function openDeleteAnnouncementModal(announcementId, title) {

    
    // Set the announcement details
    document.getElementById('delete-announcement-id').value = announcementId;
    document.getElementById('delete-announcement-title').textContent = title;
    
    // Show the modal
    const modal = document.getElementById('deleteAnnouncementModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // Close delete announcement modal
  function closeDeleteAnnouncementModal() {
    const modal = document.getElementById('deleteAnnouncementModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Submit edited announcement
  async function submitEditAnnouncement() {

    try {
      const announcementId = document.getElementById('edit-announcement-id').value;
      const title = document.getElementById('edit-announcement-title').value.trim();
      const content = document.getElementById('edit-announcement-content').value.trim();
      const type = document.getElementById('edit-announcement-type').value;
      const priority = document.getElementById('edit-announcement-priority').value;
      


      if (!title || !content) {
        showError('Please fill in all required fields');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/announcement/${announcementId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: window.dbUser._id,
          title: title,
          content: content,
          type: type,
          priority: priority
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update announcement');
      }

      closeEditAnnouncementModal();
      await updateAnnouncementCard(announcementId);
      showSuccess('Announcement updated successfully');

    } catch (error) {
      console.error('Error updating announcement:', error);
      showError(error.message);
    }
  }

  // Submit announcement
  async function submitAnnouncement() {

    try {
      // Check if required global variables are available
      if (!window.communityId) {
        throw new Error('Community ID not found');
      }
      if (!window.dbUser || !window.dbUser._id) {
        throw new Error('User data not found');
      }
      
      const title = document.getElementById('announcement-title').value.trim();
      const content = document.getElementById('announcement-content').value.trim();
      const type = document.getElementById('announcement-type').value;
      const priority = document.getElementById('announcement-priority').value;
      


      if (!title || !content) {
        showError('Please fill in all required fields');
        return;
      }


      const requestBody = {
        userId: window.dbUser._id,
        type: type,
        title: title,
        content: content,
        priority: priority,
        isPinned: false
      };

      
      const response = await fetch(`${API_URL}/api/v1/community/${window.communityId}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🎯 API Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create announcement');
      }

      closeCreateAnnouncementModal();
      loadAnnouncements();
      showSuccess('Announcement created successfully');

    } catch (error) {
      console.error('Error creating announcement:', error);
      showError(error.message);
    }
  }

  // Initialize announcements
  function initAnnouncements() {
    loadSeenAnnouncements();
    loadAnnouncements();
    
    // Clear seen announcements for testing (remove this in production)
    localStorage.removeItem(`seen-announcements-${window.communityId}`);
    
    // Add event listeners for modal close buttons and form submission
    document.addEventListener('DOMContentLoaded', function() {
      // Create announcement modal close button
      const createModalCloseBtn = document.getElementById('createAnnouncementModalClose');
      if (createModalCloseBtn) {
        createModalCloseBtn.addEventListener('click', closeCreateAnnouncementModal);

      } else {
        console.error('❌ Create modal close button not found');
      }
      
      // Create announcement modal cancel button
      const createModalCancelBtn = document.getElementById('createAnnouncementModalCancel');
      if (createModalCancelBtn) {
        createModalCancelBtn.addEventListener('click', closeCreateAnnouncementModal);

      } else {
        console.error('❌ Create modal cancel button not found');
      }
      
      // No permission modal close button
      const noPermissionModalCloseBtn = document.getElementById('noAnnouncementPermissionModalCancel');
      if (noPermissionModalCloseBtn) {
        noPermissionModalCloseBtn.addEventListener('click', closeNoAnnouncementPermissionModal);
      }
      
      // No permission modal X button
      const noPermissionModalXBtn = document.querySelector('#noAnnouncementPermissionModal button[aria-label="Close"]');
      if (noPermissionModalXBtn) {
        noPermissionModalXBtn.addEventListener('click', closeNoAnnouncementPermissionModal);
      }
      
      // Edit announcement modal close button
      const editModalCloseBtn = document.querySelector('#editAnnouncementModal button[aria-label="Close"]');
      if (editModalCloseBtn) {
        editModalCloseBtn.addEventListener('click', closeEditAnnouncementModal);
      }
      
      // Edit announcement modal cancel button
      const editModalCancelBtn = document.querySelector('#editAnnouncementModal button[onclick="closeEditAnnouncementModal()"]');
      if (editModalCancelBtn) {
        editModalCancelBtn.addEventListener('click', closeEditAnnouncementModal);
      }
      
      // Delete announcement modal close button
      const deleteModalCloseBtn = document.querySelector('#deleteAnnouncementModal button[aria-label="Close"]');
      if (deleteModalCloseBtn) {
        deleteModalCloseBtn.addEventListener('click', closeDeleteAnnouncementModal);
      }
      
      // Delete announcement modal cancel button
      const deleteModalCancelBtn = document.querySelector('#deleteAnnouncementModal button[onclick="closeDeleteAnnouncementModal()"]');
      if (deleteModalCancelBtn) {
        deleteModalCancelBtn.addEventListener('click', closeDeleteAnnouncementModal);
      }
      
      // Edit comment modal close button
      const editCommentModalCloseBtn = document.querySelector('#editCommentModal button[aria-label="Close"]');
      if (editCommentModalCloseBtn) {
        editCommentModalCloseBtn.addEventListener('click', closeEditCommentModal);
      }
      
      // Edit comment modal cancel button
      const editCommentModalCancelBtn = document.querySelector('#editCommentModal button[onclick="closeEditCommentModal()"]');
      if (editCommentModalCancelBtn) {
        editCommentModalCancelBtn.addEventListener('click', closeEditCommentModal);
      }
      
      // Delete comment modal close button
      const deleteCommentModalCloseBtn = document.querySelector('#deleteCommentModal button[aria-label="Close"]');
      if (deleteCommentModalCloseBtn) {
        deleteCommentModalCloseBtn.addEventListener('click', closeDeleteCommentModal);
      }
      
      // Delete comment modal cancel button
      const deleteCommentModalCancelBtn = document.querySelector('#deleteCommentModal button[onclick="closeDeleteCommentModal()"]');
      if (deleteCommentModalCancelBtn) {
        deleteCommentModalCancelBtn.addEventListener('click', closeDeleteCommentModal);
      }
      
        // Create announcement form submission
  const createAnnouncementForm = document.getElementById('createAnnouncementForm');
  if (createAnnouncementForm) {
    createAnnouncementForm.addEventListener('submit', function(event) {
      event.preventDefault();
      submitAnnouncement();
    });
    
  } else {
    console.error('❌ Create announcement form not found');
  }
    });
  }

  // Expose functions globally
  window.filterAnnouncements = filterAnnouncements;
  window.goToPage = goToPage;
  window.toggleReaction = toggleReaction;
  window.toggleComments = toggleComments;
  window.addComment = addComment;
  window.editComment = editComment;
  window.deleteComment = deleteComment;
  window.deleteAnnouncement = deleteAnnouncement;
  window.openCreateAnnouncementModal = openCreateAnnouncementModal;
  window.closeCreateAnnouncementModal = closeCreateAnnouncementModal;
  window.openNoAnnouncementPermissionModal = openNoAnnouncementPermissionModal;
  window.closeNoAnnouncementPermissionModal = closeNoAnnouncementPermissionModal;
  window.openEditAnnouncementModal = openEditAnnouncementModal;
  window.closeEditAnnouncementModal = closeEditAnnouncementModal;
  window.openDeleteAnnouncementModal = openDeleteAnnouncementModal;
  window.closeDeleteAnnouncementModal = closeDeleteAnnouncementModal;
  window.submitEditAnnouncement = submitEditAnnouncement;
  window.openEditCommentModal = openEditCommentModal;
  window.closeEditCommentModal = closeEditCommentModal;
  window.openDeleteCommentModal = openDeleteCommentModal;
  window.closeDeleteCommentModal = closeDeleteCommentModal;
  window.submitEditComment = submitEditComment;
  window.submitAnnouncement = submitAnnouncement;
  window.markAllAsRead = markAllAsRead;
  window.loadAnnouncements = loadAnnouncements;
  


  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnouncements);
  } else {
    initAnnouncements();
  }

  // Clear corrupted localStorage data on script load
  try {
    const stored = localStorage.getItem(`seen-announcements-${window.communityId}`);
    if (stored && (!stored.trim().startsWith('[') || !stored.trim().endsWith(']'))) {
      console.warn('Clearing corrupted localStorage data on script load');
      localStorage.removeItem(`seen-announcements-${window.communityId}`);
    }
  } catch (error) {
    console.warn('Error checking localStorage on script load:', error);
  }

})(); 