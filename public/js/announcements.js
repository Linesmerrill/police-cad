// ===========================================
// ANNOUNCEMENT SYSTEM
// ===========================================

(function() {
  'use strict';

  // Add CSS for announcement cards, reactions, and emoji picker
  const style = document.createElement('style');
  style.textContent = `
    /* Glass Card Styling for Announcements */
    .announcement-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 1rem;
      padding: 1rem;
      transition: all 0.3s ease;
      position: relative;
    }

    .announcement-card:hover {
      border-color: rgba(244, 114, 182, 0.4);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .announcement-card.unread {
      border-left: 3px solid #3b82f6;
    }

    /* Priority badge colors */
    .priority-urgent { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .priority-high { background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }
    .priority-medium { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); }
    .priority-low { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }

    /* Type badge colors */
    .type-main { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .type-session { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .type-training { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }

    .reaction-button:hover .reaction-tooltip {
      opacity: 1 !important;
    }

    .reaction-button {
      position: relative;
    }

    .reaction-tooltip {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .emoji-picker {
      position: absolute;
      background: #1e2028;
      border: 1px solid #35385a;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      min-width: 320px;
      max-width: 360px;
    }

    .emoji-picker-search {
      width: 100%;
      padding: 12px 16px;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 16px;
      margin-bottom: 12px;
    }

    .emoji-picker-search:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 6px;
      margin-bottom: 12px;
      padding: 0 16px 0 4px;
    }

    .emoji-option {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 20px;
    }

    .emoji-option:hover {
      background: #4a5568;
      transform: scale(1.1);
    }

    .emoji-category {
      margin-bottom: 12px;
    }

    .emoji-category-title {
      color: #a0aec0;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .announcement-content {
      overflow: hidden;
      white-space: pre-wrap;
      max-height: 3.6em;
      line-height: 1.2em;
      position: relative;
      transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      word-break: break-word;
    }

    .announcement-content.is-clamped {
      -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
      mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
    }

    .announcement-content.expanded {
      max-height: 300px;
      overflow-y: auto;
      -webkit-mask-image: none;
      mask-image: none;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .announcement-content.expanded::-webkit-scrollbar {
      width: 4px;
    }
    .announcement-content.expanded::-webkit-scrollbar-track {
      background: transparent;
    }
    .announcement-content.expanded::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
    }
    .announcement-content.expanded::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.2);
    }

    .comment-content-preview {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .comment-content-preview.expanded {
      -webkit-line-clamp: unset;
      line-clamp: unset;
    }

    .show-more-btn {
      color: #f472b6;
      font-size: 0.75rem;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      margin-top: 0.25rem;
    }

    .show-more-btn:hover {
      color: #f9a8d4;
      text-decoration: underline;
    }

    .comments-collapsed {
      display: none;
    }

    .announcement-action-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 0.375rem 0.5rem;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
    }

    .announcement-action-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  `;
  document.head.appendChild(style);

  // Get API URL from environment or fallback
  const API_URL = window.API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

  // Global variables for pagination and state management
  let currentAnnouncementPage = 1;
  const announcementsPerPage = 4;
  let totalAnnouncements = 0;
  let totalPages = 0;
  let currentFilterType = 'all';
  let markedAsReadIds = new Set(); // Track IDs we've already sent to API this session
  const announcementDataMap = new Map(); // Store announcement data for edit/delete modals

  // Check if announcement is unread (based on isRead flag from backend)
  function isAnnouncementUnread(announcement) {
    if (!announcement) return true;
    return !announcement.isRead;
  }

  // Mark announcement as seen via backend API
  async function markAnnouncementAsSeen(announcementId) {
    // Prevent duplicate API calls in the same session
    if (markedAsReadIds.has(announcementId)) return;
    markedAsReadIds.add(announcementId);

    // Update the UI immediately (optimistic update)
    const card = document.querySelector(`[data-announcement-id="${announcementId}"]`);
    if (card && card.classList.contains('unread')) {
      card.classList.remove('unread');
      // Remove the NEW badge if it exists
      const newBadge = card.querySelector('span[style*="background: rgba(59, 130, 246"]');
      if (newBadge && newBadge.textContent.trim() === 'NEW') {
        newBadge.remove();
      }

      // Increment interaction count in UI
      const interactionCountEl = card.querySelector('.text-slate-500.text-xs');
      if (interactionCountEl) {
        const currentCount = parseInt(interactionCountEl.textContent.trim()) || 0;
        interactionCountEl.innerHTML = `<i class="fas fa-chart-simple"></i>${currentCount + 1}`;
      }

      // Update unread count in header
      updateUnreadCount();
    }

    // Call API to mark as read (fire and forget)
    try {
      if (window.dbUser && window.dbUser._id) {
        await fetch(`${API_URL}/api/v1/announcement/${announcementId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: window.dbUser._id })
        });
      }
    } catch (err) {
      console.error('Error marking announcement as read:', err);
    }
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
    // Count unread cards directly from the DOM (cards with .unread class)
    const unreadCount = document.querySelectorAll('.announcement-card.unread').length;
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
  // TODO: Integrate with backend API to persist seen status in user profile
  // Currently using localStorage for client-side tracking only
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

  // Format announcement content with basic markup (call AFTER escapeHtml)
  // Supports: **bold**, __underline__ / _underline_, and auto-linked URLs via linkifyjs
  function formatAnnouncementContent(escapedText) {
    // Bold: **text** (supports spaces and multiline)
    let formatted = escapedText.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    // Underline: __text__ or _text_ (double takes priority, then single)
    formatted = formatted.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
    formatted = formatted.replace(/(?<!\w)_([\s\S]+?)_(?!\w)/g, '<u>$1</u>');
    // Auto-linkify URLs using linkifyjs (handles edge cases like dots, parens, etc.)
    if (typeof linkifyHtml === 'function') {
      formatted = linkifyHtml(formatted, {
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'anm-link',
        defaultProtocol: 'https'
      });
    }
    return formatted;
  }

  // Generate a consistent color based on username (deterministic hash)
  function getUsernameColor(username) {
    if (!username) return '#6366f1'; // default indigo

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Predefined colors that look good on dark backgrounds
    const colors = [
      '#f472b6', // pink
      '#a78bfa', // purple
      '#60a5fa', // blue
      '#34d399', // emerald
      '#fbbf24', // amber
      '#fb923c', // orange
      '#f87171', // red
      '#2dd4bf', // teal
      '#a3e635', // lime
      '#e879f9', // fuchsia
      '#38bdf8', // sky
      '#4ade80', // green
    ];

    return colors[Math.abs(hash) % colors.length];
  }

  // Generate avatar HTML (profile picture or colored initial)
  function getAvatarHtml(user, size = 32) {
    const username = user?.username || 'Unknown';
    const profilePicture = user?.profilePicture;
    const initial = username.charAt(0).toUpperCase();
    const color = getUsernameColor(username);

    if (profilePicture && !profilePicture.includes('ui-avatars')) {
      return `<img src="${profilePicture}" alt="${escapeHtml(username)}" class="rounded-full object-cover" style="width: ${size}px; height: ${size}px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="rounded-full flex items-center justify-center text-white font-semibold" style="width: ${size}px; height: ${size}px; background: ${color}; display: none; font-size: ${size * 0.4}px;">${initial}</div>`;
    }

    return `<div class="rounded-full flex items-center justify-center text-white font-semibold" style="width: ${size}px; height: ${size}px; background: ${color}; font-size: ${size * 0.4}px;">${initial}</div>`;
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
      comments: (announcement.comments && Array.isArray(announcement.comments)) ? announcement.comments : [],
      isRead: announcement.isRead || false
    };

    // Store announcement data for edit/delete modals (avoids inline JS string issues)
    announcementDataMap.set(safeAnnouncement._id, {
      title: safeAnnouncement.title,
      content: safeAnnouncement.content,
      type: safeAnnouncement.type,
      priority: safeAnnouncement.priority
    });

    const isUnread = isAnnouncementUnread(safeAnnouncement);
    const unreadClass = isUnread ? 'border-l-4 border-blue-500' : '';
    
    // Use safe arrays from the safeAnnouncement object
    const reactions = safeAnnouncement.reactions;
    const comments = safeAnnouncement.comments;
    
    // Group reactions by emoji for better display
    const reactionGroups = {};
    const currentUserReactions = new Set();
    
    reactions.forEach(reaction => {
      if (!reactionGroups[reaction.emoji]) {
        reactionGroups[reaction.emoji] = [];
      }
      reactionGroups[reaction.emoji].push(reaction.user.username);
      
      // Track current user's reactions
      if (reaction.user._id === window.dbUser._id) {
        currentUserReactions.add(reaction.emoji);
      }
    });

    // Create reaction buttons with hover tooltips
    const reactionsHtml = Object.entries(reactionGroups).map(([emoji, usernames]) => {
      const count = usernames.length;
      const tooltipText = `${emoji} reacted by ${usernames.join(', ')}`;
      const isCurrentUserReacted = currentUserReactions.has(emoji);
      const activeStyle = isCurrentUserReacted ? 'background: rgba(244, 114, 182, 0.2); border-color: rgba(244, 114, 182, 0.4); color: #f472b6;' : '';

      return `
        <button onclick="toggleReaction('${safeAnnouncement._id}', '${emoji}')"
                class="reaction-button relative inline-flex items-center gap-1 announcement-action-btn"
                style="${activeStyle}"
                title="${tooltipText}">
          <span style="font-size: 0.875rem;">${emoji}</span>
          <span class="text-xs font-medium">${count}</span>
          <div class="reaction-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-10">
            ${tooltipText}
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      `;
    }).join('');

    // Generate comment HTML helper
    const generateCommentHtml = (comment, announcementId, showTruncated = false) => {
      const isCurrentUserComment = comment.user._id === window.dbUser._id;
      const contentClass = showTruncated ? 'comment-content-preview' : '';
      const userColor = getUsernameColor(comment.user.username);
      return `
        <div style="background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
          <div class="flex items-start gap-2">
            <div class="flex-shrink-0" style="margin-top: 2px;">
              ${getAvatarHtml(comment.user, 24)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span style="font-weight: 500; font-size: 0.75rem; color: ${userColor};">${escapeHtml(comment.user.username)}</span>
                <div class="flex items-center gap-2">
                  <span style="font-size: 0.625rem; color: #64748b;">${formatDate(comment.timestamp)}</span>
                  ${isCurrentUserComment ? `
                    <button onclick="markAnnouncementAsSeen('${announcementId}'); openEditCommentModal('${announcementId}', '${comment._id}', '${escapeHtml(comment.content)}')"
                            style="color: #60a5fa; font-size: 0.625rem; background: none; border: none; cursor: pointer; padding: 0;">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="markAnnouncementAsSeen('${announcementId}'); openDeleteCommentModal('${announcementId}', '${comment._id}', '${escapeHtml(comment.content)}')"
                            style="color: #f87171; font-size: 0.625rem; background: none; border: none; cursor: pointer; padding: 0;">
                      <i class="fas fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
              <p style="font-size: 0.75rem; color: #94a3b8;" class="${contentClass}">${escapeHtml(comment.content)}</p>
              ${comment.edited ? '<span style="font-size: 0.625rem; color: #64748b;">(edited)</span>' : ''}
            </div>
          </div>
        </div>
      `;
    };

    // First comment preview (always visible if comments exist)
    const firstCommentPreview = comments.length > 0
      ? generateCommentHtml(comments[0], safeAnnouncement._id, true)
      : '';

    // All comments (hidden by default)
    const allCommentsHtml = comments.map(comment =>
      generateCommentHtml(comment, safeAnnouncement._id, false)
    ).join('');

         return `
       <div class="announcement-card ${isUnread ? 'unread' : ''}" data-announcement-id="${safeAnnouncement._id}" data-type="${safeAnnouncement.type}" onclick="markAnnouncementAsSeen('${safeAnnouncement._id}')" style="cursor: pointer;">
         <!-- Header Row: Badges + Actions -->
         <div class="flex items-center justify-between mb-2">
           <div class="flex items-center gap-2 flex-wrap">
             ${safeAnnouncement.isPinned ? '<span style="font-size: 0.625rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); font-weight: 600;"><i class="fas fa-thumbtack mr-1"></i>Pinned</span>' : ''}
             <span class="type-${safeAnnouncement.type}" style="font-size: 0.625rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; text-transform: uppercase;">${safeAnnouncement.type}</span>
             <span class="priority-${safeAnnouncement.priority}" style="font-size: 0.625rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; text-transform: uppercase;">${safeAnnouncement.priority}</span>
             ${isUnread ? '<span style="font-size: 0.625rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); font-weight: 600;">NEW</span>' : ''}
           </div>
           <div class="flex items-center gap-1">
             <span class="text-slate-500 text-xs flex items-center gap-1" title="Interactions">
               <i class="fas fa-chart-simple"></i>${safeAnnouncement.viewCount}
             </span>
             ${(safeAnnouncement.creator._id === window.dbUser._id || window.canManageAnnouncements) ? `
               <button onclick="markAnnouncementAsSeen('${safeAnnouncement._id}'); openEditAnnouncementModal('${safeAnnouncement._id}')"
                       class="announcement-action-btn" title="Edit">
                 <i class="fas fa-pencil text-xs"></i>
               </button>
               <button onclick="markAnnouncementAsSeen('${safeAnnouncement._id}'); openDeleteAnnouncementModal('${safeAnnouncement._id}')"
                       class="announcement-action-btn" style="color: #f87171;" title="Delete">
                 <i class="fas fa-trash text-xs"></i>
               </button>
             ` : ''}
           </div>
         </div>

         <!-- Title & Author -->
         <div class="flex items-start gap-3 mb-2">
           <div class="flex-shrink-0">
             ${getAvatarHtml(safeAnnouncement.creator, 32)}
           </div>
           <div class="flex-1 min-w-0">
             <h3 class="font-bold text-white text-sm leading-tight">${escapeHtml(safeAnnouncement.title)}</h3>
             <p class="text-xs" style="color: ${getUsernameColor(safeAnnouncement.creator.username)};">${escapeHtml(safeAnnouncement.creator.username)} • ${formatDate(safeAnnouncement.createdAt)}</p>
           </div>
         </div>

         <!-- Content -->
         <div class="mb-3">
           <p id="content-${safeAnnouncement._id}" class="announcement-content text-slate-300 text-xs leading-relaxed">${formatAnnouncementContent(escapeHtml(safeAnnouncement.content))}</p>
           <button onclick="toggleAnnouncementContent('${safeAnnouncement._id}')" id="content-toggle-${safeAnnouncement._id}" class="show-more-btn" style="display: none;">Show more</button>
         </div>

         <!-- Reactions & Actions Row -->
         <div class="flex items-center gap-2 flex-wrap">
           ${reactionsHtml}
           <button onclick="event.stopPropagation(); openEmojiPicker('${safeAnnouncement._id}', event)" class="emoji-picker-trigger announcement-action-btn flex items-center justify-center" style="min-width: 28px; height: 28px;" title="Add reaction">
             <i class="fas fa-smile text-xs"></i>
           </button>
           <button onclick="toggleComments('${safeAnnouncement._id}')" class="announcement-action-btn flex items-center justify-center gap-1" style="min-width: 28px; height: 28px; padding-left: 0.5rem; padding-right: 0.5rem;" title="Comments">
             <i class="fas fa-comment text-xs"></i>
             <span class="text-xs">${comments.length}</span>
           </button>
         </div>

         ${comments.length > 0 ? `
         <!-- Comments Preview -->
         <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem; margin-top: 0.5rem;">
           <div id="comment-preview-${safeAnnouncement._id}">
             ${firstCommentPreview}
             ${comments.length > 1 ? `
               <button onclick="toggleAllComments('${safeAnnouncement._id}')" class="show-more-btn">
                 Show all ${comments.length} comments
               </button>
             ` : ''}
           </div>
           <div id="comments-all-${safeAnnouncement._id}" class="comments-collapsed">
             <div class="space-y-2 mb-2">
               ${allCommentsHtml}
             </div>
             <button onclick="toggleAllComments('${safeAnnouncement._id}')" class="show-more-btn">
               Show less
             </button>
           </div>
         </div>
         ` : ''}

         <!-- Add Comment Input (hidden by default) -->
         <div id="comments-${safeAnnouncement._id}" class="comments-section hidden" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem; margin-top: 0.5rem;">
           <div class="flex gap-2">
             <input type="text" id="comment-input-${safeAnnouncement._id}" placeholder="Add a comment..."
                    style="flex: 1; padding: 0.375rem 0.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #e2e8f0; font-size: 0.75rem;"
                    class="focus:outline-none focus:border-pink-400">
             <button onclick="markAnnouncementAsSeen('${safeAnnouncement._id}'); addComment('${safeAnnouncement._id}')"
                     style="padding: 0.375rem 0.75rem; background: linear-gradient(135deg, #f472b6 0%, #db2777 100%); color: white; border-radius: 6px; font-size: 0.75rem; font-weight: 500; border: none; cursor: pointer;">
               Post
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

    // Tab color configurations
    const tabColors = {
      all: { bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.5)', color: '#f472b6' },
      main: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.5)', color: '#60a5fa' },
      session: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.5)', color: '#c084fc' },
      training: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.5)', color: '#4ade80' }
    };

    // Update tab styles
    const tabs = ['all', 'main', 'session', 'training'];
    tabs.forEach(tabType => {
      const tab = document.getElementById(`tab-${tabType}`);
      if (tab) {
        if (tabType === type) {
          const colors = tabColors[tabType];
          tab.style.background = colors.bg;
          tab.style.borderColor = colors.border;
          tab.style.color = colors.color;
        } else {
          tab.style.background = 'transparent';
          tab.style.borderColor = 'rgba(59, 130, 246, 0.3)';
          tab.style.color = '#94a3b8';
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

      // Add userId to get read status
      if (window.dbUser && window.dbUser._id) {
        params.append('userId', window.dbUser._id);
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

      // Check content truncation for each announcement after DOM is rendered
      setTimeout(() => {
        announcements.forEach(announcement => {
          if (announcement && announcement._id) {
            checkContentTruncation(announcement._id);
          }
        });
      }, 0);

      // Update tab counts from pagination data if available
      if (pagination.counts) {
        updateTabCounts(pagination.counts);
      } else {
        // Fetch counts separately if not in response
        fetchAnnouncementCounts();
      }

      // Update the announcements count in the metrics card
      const announcementsCountElement = document.getElementById('announcements-count');
      if (announcementsCountElement) {
        announcementsCountElement.textContent = totalAnnouncements || announcements.length;
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

  // Update tab counts display
  function updateTabCounts(counts) {
    const allCount = (counts.main || 0) + (counts.session || 0) + (counts.training || 0);

    const tabAllCount = document.getElementById('tab-all-count');
    const tabMainCount = document.getElementById('tab-main-count');
    const tabSessionCount = document.getElementById('tab-session-count');
    const tabTrainingCount = document.getElementById('tab-training-count');

    if (tabAllCount) tabAllCount.textContent = `(${allCount})`;
    if (tabMainCount) tabMainCount.textContent = `(${counts.main || 0})`;
    if (tabSessionCount) tabSessionCount.textContent = `(${counts.session || 0})`;
    if (tabTrainingCount) tabTrainingCount.textContent = `(${counts.training || 0})`;
  }

  // Fetch announcement counts by type
  async function fetchAnnouncementCounts() {
    try {
      if (!window.communityId || !window.API_URL) return;

      // Build params with userId for read status
      const params = new URLSearchParams({ limit: 1000 });
      if (window.dbUser && window.dbUser._id) {
        params.append('userId', window.dbUser._id);
      }

      // Fetch all announcements to count by type (lightweight request)
      const response = await fetch(`${API_URL}/api/v1/community/${window.communityId}/announcements?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      const announcements = data.announcements || data.data?.announcements || [];
      if (!Array.isArray(announcements)) return;

      // Count by type
      const counts = { main: 0, session: 0, training: 0 };
      announcements.forEach(a => {
        if (a.type && counts.hasOwnProperty(a.type)) {
          counts[a.type]++;
        }
      });

      updateTabCounts(counts);
    } catch (error) {
      console.error('Error fetching announcement counts:', error);
    }
  }

  // Update pagination controls (matches events pagination style)
  function updatePagination() {
    const paginationContainer = document.getElementById('announcements-pagination');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      paginationContainer.style.display = 'none';
      return;
    }

    paginationContainer.style.display = 'flex';

    const prevDisabled = currentAnnouncementPage <= 1;
    const nextDisabled = currentAnnouncementPage >= totalPages;

    paginationContainer.innerHTML = `
      <button onclick="goToPage(${currentAnnouncementPage - 1})" class="btn-secondary text-sm" ${prevDisabled ? 'disabled' : ''} style="${prevDisabled ? 'opacity:0.5;cursor:not-allowed;' : ''}">
        <i class="fa fa-chevron-left mr-1"></i>Prev
      </button>
      <span class="text-slate-400 text-sm">Page ${currentAnnouncementPage} of ${totalPages}</span>
      <button onclick="goToPage(${currentAnnouncementPage + 1})" class="btn-secondary text-sm" ${nextDisabled ? 'disabled' : ''} style="${nextDisabled ? 'opacity:0.5;cursor:not-allowed;' : ''}">
        Next<i class="fa fa-chevron-right ml-1"></i>
      </button>
    `;
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
        throw new Error(data.message || 'Failed to toggle reaction');
      }

      // Update the specific announcement card instead of reloading all
      await updateAnnouncementCard(announcementId);
      
      // Show success message
      showSuccess('Reaction updated');

    } catch (error) {
      console.error('Error toggling reaction:', error);
      showError(error.message);
    }
  }

  // Toggle comments visibility (input section)
  function toggleComments(announcementId) {
    const commentsSection = document.getElementById(`comments-${announcementId}`);
    if (commentsSection) {
      commentsSection.classList.toggle('hidden');
      markAnnouncementAsSeen(announcementId);
    }
  }

  // Toggle announcement content expansion
  function toggleAnnouncementContent(announcementId) {
    const contentEl = document.getElementById(`content-${announcementId}`);
    const toggleBtn = document.getElementById(`content-toggle-${announcementId}`);
    if (contentEl && toggleBtn) {
      const isExpanded = contentEl.classList.toggle('expanded');
      contentEl.classList.toggle('is-clamped', !isExpanded);
      toggleBtn.textContent = isExpanded ? 'Show less' : 'Show more';
    }
  }

  // Toggle all comments visibility
  function toggleAllComments(announcementId) {
    const previewEl = document.getElementById(`comment-preview-${announcementId}`);
    const allEl = document.getElementById(`comments-all-${announcementId}`);
    if (previewEl && allEl) {
      previewEl.classList.toggle('comments-collapsed');
      allEl.classList.toggle('comments-collapsed');
      markAnnouncementAsSeen(announcementId);
    }
  }

  // Check if content is truncated and show toggle button
  function checkContentTruncation(announcementId) {
    const contentEl = document.getElementById(`content-${announcementId}`);
    const toggleBtn = document.getElementById(`content-toggle-${announcementId}`);
    if (contentEl && toggleBtn) {
      // Check if content is actually truncated
      if (contentEl.scrollHeight > contentEl.clientHeight) {
        toggleBtn.style.display = 'inline';
        contentEl.classList.add('is-clamped');
      }
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
    // Truncate long comments for the preview
    const maxLength = 100;
    const truncatedContent = commentContent.length > maxLength
      ? commentContent.substring(0, maxLength) + '...'
      : commentContent;

    // Set the form values
    document.getElementById('delete-comment-announcement-id').value = announcementId;
    document.getElementById('delete-comment-id').value = commentId;
    document.getElementById('delete-comment-content').textContent = truncatedContent;
    
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

      // Close the modal first
      closeDeleteAnnouncementModal();

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
      modal.classList.add('is-open');
      document.getElementById('announcement-title').value = '';
      document.getElementById('announcement-content').value = '';
      document.getElementById('announcement-type').value = 'main';
      document.getElementById('announcement-priority').value = 'medium';
      const err = document.getElementById('createAnnouncementError');
      if (err) err.style.display = 'none';
    } else {
      console.error('Modal element not found');
    }
  }

  // Close create announcement modal
  function closeCreateAnnouncementModal() {
    const modal = document.getElementById('createAnnouncementModal');
    if (modal) {
      modal.classList.remove('is-open');
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
  function openEditAnnouncementModal(announcementId) {
    const data = announcementDataMap.get(announcementId);
    if (!data) {
      console.error('Announcement data not found for ID:', announcementId);
      return;
    }

    // Set the form values
    document.getElementById('edit-announcement-id').value = announcementId;
    document.getElementById('edit-announcement-title').value = data.title;
    document.getElementById('edit-announcement-content').value = data.content;
    document.getElementById('edit-announcement-type').value = data.type;
    document.getElementById('edit-announcement-priority').value = data.priority;

    // Show the modal
    const modal = document.getElementById('editAnnouncementModal');
    if (modal) {
      modal.classList.add('is-open');
      const err = document.getElementById('editAnnouncementError');
      if (err) err.style.display = 'none';
    }
  }

  // Close edit announcement modal
  function closeEditAnnouncementModal() {
    const modal = document.getElementById('editAnnouncementModal');
    if (modal) {
      modal.classList.remove('is-open');
    }
  }

  // Open delete announcement modal
  function openDeleteAnnouncementModal(announcementId) {
    const data = announcementDataMap.get(announcementId);
    if (!data) {
      console.error('Announcement data not found for ID:', announcementId);
      return;
    }

    // Set the announcement details
    document.getElementById('delete-announcement-id').value = announcementId;
    document.getElementById('delete-announcement-title').textContent = data.title;

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
      
      const titleEl = document.getElementById('announcement-title');
      const contentEl = document.getElementById('announcement-content');
      const typeEl = document.getElementById('announcement-type');
      const priorityEl = document.getElementById('announcement-priority');

      const title = titleEl ? titleEl.value.trim() : '';
      const content = contentEl ? contentEl.value.trim() : '';
      const type = typeEl ? typeEl.value : '';
      const priority = priorityEl ? priorityEl.value : 'medium';

      // Clear previous error highlights
      [titleEl, typeEl, contentEl].forEach(el => {
        if (el) el.style.cssText = 'border: 1px solid transparent;';
      });

      // Validate and highlight empty required fields
      let hasErrors = false;
      const errorFields = [];

      if (!title) {
        if (titleEl) titleEl.style.cssText = 'border: 2px solid #f87171 !important; box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.25) !important;';
        errorFields.push('Title');
        hasErrors = true;
      }
      if (!type) {
        if (typeEl) typeEl.style.cssText = 'border: 2px solid #f87171 !important; box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.25) !important;';
        errorFields.push('Type');
        hasErrors = true;
      }
      if (!content) {
        if (contentEl) contentEl.style.cssText = 'border: 2px solid #f87171 !important; box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.25) !important;';
        errorFields.push('Content');
        hasErrors = true;
      }

      if (hasErrors) {
        showError('Please fill in the required fields: ' + errorFields.join(', '));
        // Remove highlights after 4 seconds
        setTimeout(() => {
          [titleEl, typeEl, contentEl].forEach(el => {
            if (el) el.style.cssText = 'border: 1px solid transparent;';
          });
        }, 4000);
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
    loadAnnouncements();
    
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

  // Emoji picker functions
  let currentEmojiPicker = null;
  let currentAnnouncementId = null;

  function openEmojiPicker(announcementId, event) {
    event.preventDefault();
    event.stopPropagation();

    // Close any existing picker
    closeEmojiPicker();
    
    // Mark announcement as seen when user interacts with it
    markAnnouncementAsSeen(announcementId);
    
    currentAnnouncementId = announcementId;
    
    // Common emojis for reactions with names and search terms
    const commonEmojis = [
      { emoji: '👍', name: 'thumbs up', searchTerms: ['thumbs up', 'thumb', 'up', 'like', 'good', 'yes'] },
      { emoji: '👎', name: 'thumbs down', searchTerms: ['thumbs down', 'thumb', 'down', 'dislike', 'bad', 'no'] },
      { emoji: '❤️', name: 'heart', searchTerms: ['heart', 'love', 'red heart', 'hearts'] },
      { emoji: '😀', name: 'smile', searchTerms: ['smile', 'happy', 'grin', 'joy', 'face'] },
      { emoji: '😢', name: 'cry', searchTerms: ['cry', 'crying', 'tear', 'sad', 'weep'] },
      { emoji: '😡', name: 'angry', searchTerms: ['angry', 'mad', 'rage', 'furious', 'pissed'] },
      { emoji: '🎉', name: 'party', searchTerms: ['party', 'celebrate', 'celebration', 'tada', 'confetti'] },
      { emoji: '🔥', name: 'fire', searchTerms: ['fire', 'flame', 'hot', 'lit', 'burn'] },
      { emoji: '💯', name: 'hundred', searchTerms: ['hundred', '100', 'perfect', 'score', 'points'] },
      { emoji: '👏', name: 'clap', searchTerms: ['clap', 'applause', 'hands', 'praise'] },
      { emoji: '🙏', name: 'pray', searchTerms: ['pray', 'prayer', 'please', 'beg', 'wish'] },
      { emoji: '🤔', name: 'think', searchTerms: ['think', 'thinking', 'hmm', 'ponder', 'question'] },
      { emoji: '😱', name: 'scream', searchTerms: ['scream', 'shock', 'surprised', 'gasp', 'wow'] },
      { emoji: '😍', name: 'love', searchTerms: ['love', 'heart eyes', 'adore', 'crush', 'smitten'] },
      { emoji: '🤣', name: 'laugh', searchTerms: ['laugh', 'laughing', 'funny', 'hilarious', 'rofl'] },
      { emoji: '😭', name: 'sob', searchTerms: ['sob', 'crying', 'tears', 'weep', 'sad', 'cry'] },
      { emoji: '😤', name: 'triumph', searchTerms: ['triumph', 'pride', 'smug', 'confident', 'win'] },
      { emoji: '🤯', name: 'mind blown', searchTerms: ['mind blown', 'explode', 'brain', 'mind', 'blown', 'shocked'] },
      { emoji: '⭐', name: 'star', searchTerms: ['star', 'stars', 'favorite', 'best', 'gold'] },
      { emoji: '✨', name: 'sparkles', searchTerms: ['sparkles', 'sparkle', 'magic', 'shiny', 'glitter'] }
    ];
    
    const emojiPickerHtml = `
      <div class="emoji-picker" id="emojiPicker">
        <input type="text" class="emoji-picker-search" placeholder="Search emojis..." onkeyup="filterEmojis(this.value)">
        <div class="emoji-category">
          <div class="emoji-category-title">Frequently Used</div>
          <div class="emoji-grid" id="emojiGrid">
            ${commonEmojis.map(emojiData => `
              <div class="emoji-option" onclick="selectEmoji('${emojiData.emoji}')" title="${emojiData.name}" data-emoji-name="${emojiData.name}" data-search-terms="${emojiData.searchTerms.join(' ')}">
                ${emojiData.emoji}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    // Create and append the picker
    const pickerElement = document.createElement('div');
    pickerElement.innerHTML = emojiPickerHtml;
    
    document.body.appendChild(pickerElement.firstElementChild);
    
    currentEmojiPicker = document.getElementById('emojiPicker');
    
    // Position the picker near the trigger button
    const triggerButton = event.target.closest('.emoji-picker-trigger');
    if (triggerButton) {
      const rect = triggerButton.getBoundingClientRect();
      // Position relative to viewport, accounting for scroll
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      let left = rect.left + scrollX;
      let top = rect.bottom + scrollY + 5;
      
      // Ensure picker doesn't go off-screen
      if (left + 280 > viewportWidth + scrollX) {
        left = viewportWidth + scrollX - 290;
      }
      if (top + 200 > viewportHeight + scrollY) {
        top = rect.top + scrollY - 205; // Position above the button
      }
      
      currentEmojiPicker.style.left = `${left}px`;
      currentEmojiPicker.style.top = `${top}px`;
    } else {
      // Fallback positioning
      currentEmojiPicker.style.left = '50%';
      currentEmojiPicker.style.top = '50%';
      currentEmojiPicker.style.transform = 'translate(-50%, -50%)';
    }
    
    // Add click outside listener
    setTimeout(() => {
      document.addEventListener('click', closeEmojiPickerOnClickOutside);
    }, 100);
  }

  function closeEmojiPicker() {
    if (currentEmojiPicker) {
      currentEmojiPicker.remove();
      currentEmojiPicker = null;
      currentAnnouncementId = null;
      document.removeEventListener('click', closeEmojiPickerOnClickOutside);
    }
  }

  function closeEmojiPickerOnClickOutside(event) {
    if (currentEmojiPicker && !currentEmojiPicker.contains(event.target) && !event.target.closest('.emoji-picker-trigger')) {
      closeEmojiPicker();
    }
  }

  function selectEmoji(emoji) {
    if (currentAnnouncementId) {
      toggleReaction(currentAnnouncementId, emoji);
      closeEmojiPicker();
    }
  }

  function filterEmojis(searchTerm) {
    const emojiOptions = document.querySelectorAll('.emoji-option');
    const searchLower = searchTerm.toLowerCase();
    
    emojiOptions.forEach(option => {
      const searchTerms = option.getAttribute('data-search-terms');
      const shouldShow = searchTerms && searchTerms.toLowerCase().includes(searchLower) || searchTerm === '';
      option.style.display = shouldShow ? 'flex' : 'none';
    });
  }

  // Expose functions globally
  window.filterAnnouncements = filterAnnouncements;
  window.goToPage = goToPage;
  window.toggleReaction = toggleReaction;
  window.toggleComments = toggleComments;
  window.toggleAnnouncementContent = toggleAnnouncementContent;
  window.toggleAllComments = toggleAllComments;
  window.checkContentTruncation = checkContentTruncation;
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
  window.openEmojiPicker = openEmojiPicker;
  window.closeEmojiPicker = closeEmojiPicker;
  window.selectEmoji = selectEmoji;
  window.filterEmojis = filterEmojis;
  window.markAnnouncementAsSeen = markAnnouncementAsSeen;
  window.filterAnnouncements = filterAnnouncements;
  


  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnouncements);
  } else {
    initAnnouncements();
  }

})(); 