// Shared Notepad Module
// This module contains all notepad functionality to be used by both police and dispatch dashboards

// Configuration - will be set by the dashboard
let API_BASE_URL = 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1';

// Function to set API URL from dashboard
function setApiUrl(apiUrl) {
  API_BASE_URL = apiUrl + '/api/v1';
}

// Global variables
let userNotepadNotes = [];

// Helper function to check if ID is a valid MongoDB ObjectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Load user notes
function loadUserNotes() {
  // Notes are already part of the user object
  if (dbUser && dbUser.user && dbUser.user.notes) {
    userNotepadNotes = dbUser.user.notes;
  } else {
    userNotepadNotes = [];
  }
  renderNotes();
}

// Render notes in the container
function renderNotes() {
  const container = $('#notes-container');
  const noNotesMessage = $('#no-notes-message');
  
  if (userNotepadNotes.length === 0) {
    container.empty();
    noNotesMessage.show();
    return;
  }
  
  noNotesMessage.hide();
  
  // Sort notes by updatedAt (newest first)
  const sortedNotes = [...userNotepadNotes].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  
  container.empty();
  sortedNotes.forEach(note => {
    // Handle potential undefined content
    const content = note.content || '';
    const previewText = content.length > 50 ? `${content.substring(0, 50)}...` : content;
    
    // Smart date formatting
    const noteDate = new Date(note.updatedAt || note.createdAt || Date.now());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const noteDateOnly = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());
    
    let displayDate;
    if (noteDateOnly.getTime() === today.getTime()) {
      // Today - show time
      displayDate = noteDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (noteDateOnly.getTime() === yesterday.getTime()) {
      // Yesterday
      displayDate = 'Yesterday';
    } else {
      // Other dates - show date
      displayDate = noteDate.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit'
      });
    }
    
    const noteHtml = `
      <div class="note-item" data-note-id="${note._id}" onclick="selectNote('${note._id}')" style="padding: 15px; border-bottom: 1px solid #404040; cursor: pointer; transition: background-color 0.2s;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; min-width: 0;">
            <h6 style="margin: 0 0 5px 0; color: #ffffff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${note.title || 'Untitled'}</h6>
            <p style="margin: 0 0 8px 0; color: #ccc; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${previewText}</p>
            <small style="color: #888; font-size: 11px;">${displayDate}</small>
          </div>
          <div style="margin-left: 8px; min-width: 30px;">
            <button class="btn btn-sm btn-link text-danger" onclick="event.stopPropagation(); deleteNote('${note._id}')" style="padding: 3px 6px; color: #dc3545; font-size: 12px;">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    container.append(noteHtml);
  });
}

// Show add note form
function showAddNoteForm() {
  $('#note-id').val('');
  $('#note-title').val('');
  $('#note-content').val('');
  $('#note-form-container').show();
  $('#no-note-selected').hide();
  clearNoteSelection();
  
  // Hide delete button since we're creating a new note
  $('#delete-note-btn').hide();
  
  // On mobile, automatically switch to content tab
  if (window.innerWidth <= 768) {
    showMobileTab('content');
  }
}

// Hide note form
function hideNoteForm() {
  $('#note-form-container').hide();
  $('#no-note-selected').show();
  $('#note-form')[0].reset();
  clearNoteSelection();
}

// Select note for viewing/editing
function selectNote(noteId) {
  const note = userNotepadNotes.find(n => n._id === noteId);
  if (!note) return;
  
  // Update visual selection
  $('.note-item').removeClass('selected');
  $(`.note-item[data-note-id="${noteId}"]`).addClass('selected');
  
  // Show note content
  $('#note-id').val(note._id);
  $('#note-title').val(note.title || '');
  $('#note-content').val(note.content || '');
  $('#note-form-container').show();
  $('#no-note-selected').hide();
  
  // Show delete button since we're viewing an existing note
  $('#delete-note-btn').show();
  
  // On mobile, automatically switch to content tab
  if (window.innerWidth <= 768) {
    showMobileTab('content');
  }
}

// Mobile tab switching function
function showMobileTab(tab) {
  if (tab === 'notes') {
    $('.mobile-notes-panel').removeClass('hide');
    $('.mobile-content-panel').removeClass('show');
    $('#mobile-notes-tab').css('background-color', '#007bff').css('color', 'white');
    $('#mobile-content-tab').css('background-color', '#2d2d2d').css('color', '#ccc');
  } else if (tab === 'content') {
    $('.mobile-notes-panel').addClass('hide');
    $('.mobile-content-panel').addClass('show');
    $('#mobile-content-tab').css('background-color', '#007bff').css('color', 'white');
    $('#mobile-notes-tab').css('background-color', '#2d2d2d').css('color', '#ccc');
  }
}

// Clear note selection
function clearNoteSelection() {
  $('.note-item').removeClass('selected');
}

// Edit note (legacy function for compatibility)
function editNote(noteId) {
  selectNote(noteId);
}

// Delete note
function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this note?')) {
    return;
  }
  
  const userId = dbUser._id;
  
  if (isValidObjectId(noteId)) {
    // Make API call for valid ObjectIds
    $.ajax({
      url: `${API_BASE_URL}/users/${userId}/notes/${noteId}`,
      method: 'DELETE',
      success: function(response) {
        // Remove the note from the user object
        if (dbUser.user.notes) {
          dbUser.user.notes = dbUser.user.notes.filter(n => n._id !== noteId);
        }
        // Update our local array to match
        userNotepadNotes = [...(dbUser.user.notes || [])];
        renderNotes();
      },
      error: function(xhr) {
        console.error('Error deleting note:', xhr.responseText);
        // Only fall back to local update if API fails
        userNotepadNotes = userNotepadNotes.filter(n => n._id !== noteId);
        renderNotes();
        alert('Note deleted locally (API call failed)');
      }
    });
  } else {
    // Handle local notes (timestamp-based IDs) - delete locally only
    userNotepadNotes = userNotepadNotes.filter(n => n._id !== noteId);
    renderNotes();
  }
}

// Delete current note from the form
function deleteCurrentNote() {
  const noteId = $('#note-id').val();
  if (noteId) {
    deleteNote(noteId);
    // After deletion, hide the form and show the no-note-selected message
    hideNoteForm();
    // On mobile, switch to notes tab to show the updated list
    if (window.innerWidth <= 768) {
      setTimeout(() => showMobileTab('notes'), 100);
    }
  }
}

// Save note (create or update)
function saveNote(noteData) {
  const userId = dbUser._id;
  const noteId = $('#note-id').val();
  
  if (noteId && isValidObjectId(noteId)) {
    // Update existing note - preserve createdAt, only update updatedAt
    const existingNote = userNotepadNotes.find(n => n._id === noteId);
    const updateData = {
      title: noteData.title,
      content: noteData.content,
      createdAt: existingNote ? existingNote.createdAt : noteData.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    $.ajax({
      url: `${API_BASE_URL}/users/${userId}/notes/${noteId}`,
      method: 'PUT',
      data: JSON.stringify(updateData),
      contentType: 'application/json',
      success: function(response) {
        // For 204 responses, update the note in the user object
        if (dbUser.user.notes) {
          const userIndex = dbUser.user.notes.findIndex(n => n._id === noteId);
          if (userIndex !== -1) {
            dbUser.user.notes[userIndex] = { ...dbUser.user.notes[userIndex], ...updateData };
          }
        }
        // Update our local array to match
        userNotepadNotes = [...(dbUser.user.notes || [])];
        renderNotes();
        hideNoteForm();
        // Select the newly updated note
        setTimeout(() => selectNote(noteId), 100);
        // On mobile, switch back to notes tab after saving
        if (window.innerWidth <= 768) {
          setTimeout(() => showMobileTab('notes'), 150);
        }
      },
      error: function(xhr) {
        console.error('Error updating note:', xhr.responseText);
        // Only fall back to local update if API fails
        const index = userNotepadNotes.findIndex(n => n._id === noteId);
        if (index !== -1) {
          userNotepadNotes[index] = { ...updateData, _id: noteId };
        }
        renderNotes();
        hideNoteForm();
        // Select the newly updated note
        setTimeout(() => selectNote(noteId), 100);
        // On mobile, switch back to notes tab after saving
        if (window.innerWidth <= 768) {
          setTimeout(() => showMobileTab('notes'), 150);
        }
        alert('Note updated locally (API call failed)');
      }
    });
  } else if (noteId && !isValidObjectId(noteId)) {
    // Handle local notes (timestamp-based IDs) - update locally only
    const index = userNotepadNotes.findIndex(n => n._id === noteId);
    if (index !== -1) {
      const updateData = {
        title: noteData.title,
        content: noteData.content,
        createdAt: userNotepadNotes[index].createdAt,
        updatedAt: new Date().toISOString()
      };
      userNotepadNotes[index] = { ...updateData, _id: noteId };
    }
    renderNotes();
    hideNoteForm();
    // Select the newly updated note
    setTimeout(() => selectNote(noteId), 100);
    // On mobile, switch back to notes tab after saving
    if (window.innerWidth <= 768) {
      setTimeout(() => showMobileTab('notes'), 150);
    }
  } else {
    // Create new note - only send title and content, let backend generate ID
    const createData = {
      title: noteData.title,
      content: noteData.content
    };
    
    $.ajax({
      url: `${API_BASE_URL}/users/${userId}/notes`,
      method: 'POST',
      data: JSON.stringify(createData),
      contentType: 'application/json',
      success: function(response) {
        // Add the newly created note to the user object
        if (response && response.note) {
          if (dbUser.user && !dbUser.user.notes) {
            dbUser.user.notes = [];
          }
          if (dbUser.user.notes) {
            dbUser.user.notes.unshift(response.note);
          }
          // Update our local array to match
          userNotepadNotes = [...(dbUser.user.notes || [])];
        }
        renderNotes();
        hideNoteForm();
        // Select the newly created note
        if (response && response.note && response.note._id) {
          setTimeout(() => selectNote(response.note._id), 100);
        }
        // On mobile, switch back to notes tab after saving
        if (window.innerWidth <= 768) {
          setTimeout(() => showMobileTab('notes'), 150);
        }
      },
      error: function(xhr) {
        console.error('Error creating note:', xhr.responseText);
        alert('Failed to create note: ' + (xhr.responseJSON?.Response?.Message || 'Unknown error'));
      }
    });
  }
}

// Save note from form
function saveNoteFromForm() {
  const title = $('#note-title').val().trim();
  const content = $('#note-content').val().trim();
  
  if (!title || !content) {
    alert('Please fill in both title and content.');
    return;
  }
  
  const currentTime = new Date().toISOString();
  const noteData = {
    title: title,
    content: content,
    createdAt: currentTime,
    updatedAt: currentTime
  };
  
  saveNote(noteData);
}

// Initialize notepad functionality
function initNotepad() {
  // Handle note form submission
  $('#note-form').on('submit', function(e) {
    e.preventDefault();
    saveNoteFromForm();
  });
  
  // Load notes when notepad modal is shown
  $('#notepadModal').on('show.bs.modal', function() {
    loadUserNotes();
    
    // On mobile, show notes tab by default
    if (window.innerWidth <= 768) {
      showMobileTab('notes');
    }
  });
  
  // Add CSS for selected note items
  $('<style>')
    .prop('type', 'text/css')
    .html(`
      .note-item:hover {
        background-color: #3d3d3d !important;
      }
      .note-item.selected {
        background-color: #007bff !important;
      }
      .note-item.selected h6,
      .note-item.selected p,
      .note-item.selected small {
        color: #ffffff !important;
      }
    `)
    .appendTo('head');
}

// Export functions to global scope
window.showAddNoteForm = showAddNoteForm;
window.hideNoteForm = hideNoteForm;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.deleteCurrentNote = deleteCurrentNote;
window.showMobileTab = showMobileTab;
window.selectNote = selectNote;
window.clearNoteSelection = clearNoteSelection;
window.saveNoteFromForm = saveNoteFromForm;
window.initNotepad = initNotepad;
window.setApiUrl = setApiUrl; 