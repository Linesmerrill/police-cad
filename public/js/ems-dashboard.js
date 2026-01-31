// EMS Dashboard JavaScript
// Global variables
var dbUser;
var dbVehicles;
var socket;

// Status Codes Global Variables
var statusCodesCache = [];
var statusCodeMap = {};
var filteredStatusCodes = [];
var currentTenCodeID = null;
var currentPage = 1;
var codesPerPage = 20;

// Hide modal utility function (global scope)
function hideModal(modalId) {
  const $modal = $(`#${modalId}`);
  
  // Check if modal is actually visible before hiding
  if (!$modal.hasClass('show') && $modal.css('display') !== 'block') {
    return;
  }
  
  // First, hide the modal
  $modal.modal("hide");
  
  // Wait a bit for Bootstrap to process, then do aggressive cleanup
  setTimeout(() => {
    // Ensure body classes are cleaned up
    $("body").removeClass("modal-open");
    
    // Remove all backdrops (there might be multiple)
    $(".modal-backdrop").remove();
    
    // Reset modal state
    $modal.removeClass("show").css("display", "none");
    
    // Clear any modal-related data attributes
    $modal.removeData("bs.modal");
    
    // Ensure no lingering modal-open classes and reset body styles
    $("body").css({
      "padding-right": "",
      "overflow": ""
    });
    
    // Force remove any remaining backdrops
    setTimeout(() => {
      $(".modal-backdrop").remove();
      $("body").removeClass("modal-open");
    }, 100);
    
  }, 150);
}

// Track Signal 100 user for clearing
var signal100UserId = null;

// Function to initialize socket after global variables are set
function initializeSocket() {
  // Initialize socket connection
  socket = io();
  window.dashboardSocket = socket; // Expose globally for other scripts

  const communityId = dbUser.user?.lastAccessedCommunity?.communityID;

  // Function to join room and send initial requests
  function onSocketConnected() {
    // Join community room for targeted broadcasts
    if (communityId) {
      socket.emit('join_community_room', { communityId: communityId });
    }

    // Load initial panic statuses
    var panicReq = {
      userID: dbUser._id,
      userUsername: dbUser.user?.username,
      activeCommunity: communityId,
    };
    socket.emit('load_panic_statuses', panicReq);
  }

  // Connect handler - wait for connection before joining room
  if (socket.connected) {
    onSocketConnected();
  } else {
    socket.on('connect', onSocketConnected);
  }

  // Poll for panic status updates every 15s to catch cross-platform panics
  setInterval(function() {
    if (socket.connected) {
      socket.emit('load_panic_statuses', {
        userID: dbUser._id,
        userUsername: dbUser.user?.username,
        activeCommunity: communityId,
      });
    }
  }, 15000);

  // Listen for room join confirmation
  socket.on('joined_room', function(data) {
    // Room joined successfully
  });
  socket.on('room_error', function(data) {
    console.error('Room error:', data);
  });

  // Socket event listeners (legacy)
  socket.on('updated_ems_status', res => {
    location.reload();
  });

  socket.on('deleted_ems_vehicle', req => {
    location.reload();
  });

  socket.on('created_call', res => {
    if (res.call.communityID === dbUser.user.activeCommunity) {
      let containsVeh = false;
      if (dbVehicles != null && dbVehicles != undefined) {
        for (let i=0; i < dbVehicles.length; i++) {
          if (res.call.assignedFireEms.includes(dbVehicles[i]._id)) {
            containsVeh = true;
            break;
          }
        }
      }
      if (containsVeh) {
        $('#assigned-call-container').append(
            `<a id="${res._id}" data-toggle="modal" href="#callDetailModal" onclick="populateCallDetails('${res._id}')">
              <div class="alert alert-success alert-dismissible show" role="alert">
                Opened: <span id="${res._id}-createdAt" style="text-transform:capitalize">
                  <time>${res.call.createdAtReadable}</time> |  Description: <span id="${res._id}-description">${res.call.shortDescription}</span></span>
            </div>
            </a>`
          ).fadeTo(1, function () {
            $(this).add();
          })
        showRealTimeToast('call', 'New call assigned!', 'info');
      }
    }
  });

  socket.on('cleared_call', res => {
    if (res.communityID==dbUser.user.activeCommunity) {
      $('#'+res.callID+'-row').remove().fadeOut(5, function () {
        $(this).remove();
      })
      showRealTimeToast('call', 'Call cleared', 'success');
    }
  });

  // ==========================================
  // REAL-TIME SOCKET LISTENERS (new)
  // ==========================================

  // Listen for member status updates (when dispatch changes our status)
  socket.on('member_status_updated', function(data) {
    // Check if this update is for our community
    if (data.communityId && data.communityId !== communityId) return;

    // Check if this update is for the current user (e.g., dispatch changed our status)
    if (data.userID === dbUser._id) {
      // Update our own status display
      const statusDisplay = data.status || 'Unknown';
      const setBy = data.setBy || 'Unknown';
      const tenCodeID = data.statusCode || null;

      // Update the new status panel UI
      $('#currentStatusCode').text(statusDisplay);

      // Update currentTenCodeID and highlights if we have the tenCodeID
      if (tenCodeID) {
        currentTenCodeID = tenCodeID;
        updateStatusCardHighlights(tenCodeID);
      }

      // Show notification that someone else (dispatch) changed our status
      if (setBy && setBy !== dbUser.user.username) {
        showRealTimeToast('status', `${setBy} set your status to: ${statusDisplay}`, 'info');
      }
    }
  });

  // ==========================================
  // PANIC ALERT LISTENERS
  // ==========================================

  // Load initial panic statuses
  socket.on('load_panic_status_update', function(map, signal100Resp, holdTrafficResp, origReq) {
    if (origReq && origReq.activeCommunity && dbUser.user?.lastAccessedCommunity?.communityID !== origReq.activeCommunity) return;

    // Update signal 100 banner
    if (signal100Resp) {
      $('#signal-100-banner').removeClass('hide').addClass('show');
    } else {
      $('#signal-100-banner').removeClass('show').addClass('hide');
    }

    // Render panic alerts
    $('#panic-placeholder-socket').empty();
    if (map) {
      for (var m in map) {
        $('#panic-placeholder-socket').append(
          '<a id="' + map[m].userId + '-panic-row" data-toggle="modal" href="#panicDetailModal" onclick="populatePanicDetails(\'' + map[m].userId + '\')">' +
          '<div class="alert alert-danger alert-dismissible show" role="alert">' +
          '<strong>Panic! </strong> Triggered by: <span id="' + map[m].userId + '-panic-username">' + map[m].username + '</span>' +
          '<button type="button" class="close" aria-label="Close">' +
          '<span aria-hidden="true">&times;</span>' +
          '</button>' +
          '</div>' +
          '</a>'
        );
      }
    }
  });

  // New panic triggered
  socket.on('panic_button_updated', function(map, origReq) {
    if (origReq && origReq.activeCommunity && dbUser.user?.lastAccessedCommunity?.communityID !== origReq.activeCommunity) return;

    // Play panic alert sound if enabled
    if (dbUser.user?.panicButtonSound) {
      var audioElement = document.createElement('audio');
      audioElement.setAttribute('src', '/static/audio/Police_panic_button_sound_adj.mp3');
      audioElement.volume = dbUser.user?.alertVolumeLevel / 100 || 0.1;
      audioElement.play().catch(function(e) { console.log('Audio play failed:', e); });
    }

    // Render panic alerts
    $('#panic-placeholder-socket').empty();
    if (map) {
      for (var m in map) {
        $('#panic-placeholder-socket').append(
          '<a id="' + map[m].userId + '-panic-row" data-toggle="modal" href="#panicDetailModal" onclick="populatePanicDetails(\'' + map[m].userId + '\')">' +
          '<div class="alert alert-danger alert-dismissible show" role="alert">' +
          '<strong>Panic! </strong> Triggered by: <span id="' + map[m].userId + '-panic-username">' + map[m].username + '</span>' +
          '<button type="button" class="close" aria-label="Close">' +
          '<span aria-hidden="true">&times;</span>' +
          '</button>' +
          '</div>' +
          '</a>'
        );
      }
    }

    showRealTimeToast('emergency', 'PANIC ALERT triggered!', 'error');
  });

  // Panic cleared
  socket.on('cleared_panic', function(res) {
    $('#' + res.userID + '-panic-row').remove();
  });

  // Populate panic details in modal
  function populatePanicDetails(id) {
    $('#panic-id').val(id);
  }

  // Clear panic handler
  $('#clearPanic').on('click', function() {
    var panicUserId = $('#panic-id').val();
    if (panicUserId) {
      var myReq = {
        userID: panicUserId,
        communityID: communityId,
        clearedBy: dbUser._id,
      };
      socket.emit('clear_panic', myReq);
      $('#panicDetailModal').modal('hide');
    }
  });

  // ==========================================
  // SIGNAL 100 LISTENERS
  // ==========================================

  // Listen for Signal 100 activation
  socket.on('signal_100_button_updated', function(data) {
    if (data.activeCommunity && data.activeCommunity !== communityId) return;

    // Play alert sound if enabled
    if (dbUser.panicButtonSound) {
      var audioElement = document.createElement('audio');
      audioElement.setAttribute('src', '/static/audio/Dispatch_signal_100_beep_adj.mp3');
      audioElement.volume = dbUser.user?.alertVolumeLevel / 100 || 0.5;
      audioElement.play().catch(e => console.log('Audio play failed:', e));
    }

    // Update the banner with details
    updateSignal100Banner(data);

    // Show toast notification
    const activatedBy = data.activatedByCallSign || data.activatedByUsername || 'Unknown';
    showRealTimeToast('emergency', `Signal 100 Activated by ${activatedBy}!`, 'error');
  });

  // Listen for Signal 100 cleared
  socket.on('clear_signal_100_updated', function(data) {
    const cid = typeof data === 'string' ? data : data.activeCommunity;
    if (cid && cid !== communityId) return;

    $('#signal-100-banner').removeClass('show').addClass('hide');
    $('#signal-100-details').text('');

    const clearedBy = (typeof data === 'object' && data.clearedByCallSign)
      ? data.clearedByCallSign + ' (' + data.clearedByUsername + ')'
      : (typeof data === 'object' && data.clearedByUsername) ? data.clearedByUsername : '';
    const msg = clearedBy ? 'Signal 100 cleared by ' + clearedBy : 'Signal 100 Cleared';
    showRealTimeToast('status', msg, 'success');
  });

  // Listen for new BOLOs
  socket.on('created_bolo', function(data) {
    // Check community match
    const boloCommunityId = data.bolo?.activeCommunityID;
    if (boloCommunityId && boloCommunityId !== communityId) return;

    // Refresh BOLOs list if function exists
    if (typeof loadActiveBOLOs === 'function') {
      loadActiveBOLOs();
    }

    // Show prominent alert
    showRealTimeToast('bolo', 'New BOLO Alert!', 'warning', data.bolo?.boloType || 'Unknown type');
  });

  // Listen for deleted BOLOs
  socket.on('deleted_bolo', function(data) {
    if (data.communityId && data.communityId !== communityId) return;
    if (typeof loadActiveBOLOs === 'function') {
      loadActiveBOLOs();
    }
    showRealTimeToast('bolo', 'BOLO Cleared', 'success');
  });

  // Load personas on page load
  var personaReq = {
    userID: dbUser._id,
    activeCommunityID: dbUser.user.activeCommunity
  }
  // Old socket.io code removed - using new API-based approach instead

}

// Update Signal 100 Banner
function updateSignal100Banner(data) {
  // Store the user ID for when we clear the Signal 100
  signal100UserId = data.aboutUserId || data.userID || null;

  // Determine who activated the signal
  let activatedByDisplay;
  if (data.activatedBy === 'Dispatch') {
    // Dispatcher activated it - show dispatcher's username
    activatedByDisplay = data.activatedByUsername || 'Dispatch';
  } else {
    // Officer activated it themselves
    activatedByDisplay = data.activatedByCallSign || data.activatedByUsername || data.activatedBy || 'Unknown';
  }

  // Get the officer the signal is about (may be different from who activated)
  const aboutUser = data.aboutCallSign || data.aboutUsername || null;

  // Build the message
  let message;
  if (data.activatedBy === 'Dispatch' && aboutUser) {
    // Dispatch activated it for a specific officer
    message = `Activated by ${activatedByDisplay} for ${aboutUser}`;
  } else if (aboutUser && aboutUser !== activatedByDisplay) {
    // Someone activated it for another officer
    message = `Activated by ${activatedByDisplay} for ${aboutUser}`;
  } else {
    // Self-activated or unknown
    message = `Activated by ${activatedByDisplay}`;
  }

  // Show banner
  $('#signal-100-banner').addClass('show').removeClass('hide');
  $('#signal-100-details').text(message);
}

// Toast notification system for real-time updates
function showRealTimeToast(type, message, severity, details) {
  // Create toast container if it doesn't exist
  let container = document.getElementById('realtime-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'realtime-toast-container';
    container.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(container);
  }

  // Create toast using DOM APIs (XSS-safe)
  const toast = document.createElement('div');
  const icons = {
    status: 'fa-broadcast-tower',
    bolo: 'fa-exclamation-triangle',
    call: 'fa-phone',
    emergency: 'fa-exclamation-circle'
  };
  const colors = {
    info: 'rgba(59, 130, 246, 0.95)',
    warning: 'rgba(245, 158, 11, 0.95)',
    success: 'rgba(16, 185, 129, 0.95)',
    error: 'rgba(239, 68, 68, 0.95)'
  };

  toast.style.cssText = `
    background: ${colors[severity] || colors.info};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideInRight 0.3s ease;
    min-width: 250px;
    max-width: 350px;
  `;

  // Build content using DOM APIs (safe from XSS)
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';

  const iconEl = document.createElement('i');
  iconEl.className = 'fa ' + (icons[type] || 'fa-info-circle');
  iconEl.style.fontSize = '18px';

  const titleDiv = document.createElement('div');
  titleDiv.textContent = message || '';

  wrapper.appendChild(iconEl);
  wrapper.appendChild(titleDiv);
  toast.appendChild(wrapper);

  if (details) {
    const detailsDiv = document.createElement('div');
    detailsDiv.style.cssText = 'font-size: 0.85em; opacity: 0.9; margin-top: 4px; margin-left: 30px;';
    detailsDiv.textContent = details;
    toast.appendChild(detailsDiv);
  }

  container.appendChild(toast);

  // Remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

$(function () {
  // Global variables should be available now

  // Initialize socket for real-time updates
  if (typeof initializeSocket === 'function') {
    initializeSocket();
  }

  // DataTables removed - using custom table functionality with pagination

  // Load EMS personas and vehicles on page load
  if (typeof loadEmsPersonas === 'function') {
    loadEmsPersonas();
  }
  
  if (typeof loadEmsVehicles === 'function') {
    loadEmsVehicles();
  }
  
  // Load assigned calls on page load
  if (typeof loadAssignedCalls === 'function') {
    loadAssignedCalls();
  }
  
  // Event handlers for delete confirmation modals
  $('#confirmDeletePersonaBtn').on('click', function() {
    confirmDeleteEmsPersona();
  });
  
  $('#confirmDeleteVehicleBtn').on('click', function() {
    confirmDeleteEmsVehicle();
  });
  
  // Add keyboard event listener for medical search
  $('#medical-search-name').on('keydown', function(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      searchMedicalByName();
    }
  });
  
  // Add keyboard event listener for call notes
  $('#newCallNote').on('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCallNote();
    }
  });
  
  // Add modal hidden event handler for medical search modal
  $('#searchMedicalRecords').off('hidden.bs.modal').on('hidden.bs.modal', function() {
    // Don't aggressively clean up backdrop - let Bootstrap handle it
  });

  // Global function to force cleanup of any lingering modal backdrops
  window.forceModalCleanup = function() {
    $(".modal-backdrop").remove();
    $("body").removeClass("modal-open");
    $("body").css({
      "padding-right": "",
      "overflow": ""
    });
    // Also hide any visible modals
    $(".modal.show").removeClass("show").css("display", "none");
  };

  // Clean up any existing modal backdrops on page load
  $(document).ready(function() {
    window.forceModalCleanup();
    
  // Simple modal functions like modern dashboard
  window.openNewVehicleModal = function() {
    $('#newVehicleModal').modal('show');
  };

  window.closeNewVehicleModal = function() {
    $('#newVehicleModal').modal('hide');
  };

  window.openNewPersonaModal = function() {
    $('#newCivModal').modal('show');
  };

  window.closeNewPersonaModal = function() {
    $('#newCivModal').modal('hide');
  };

  // Status Codes Modal Functions
  window.openStatusCodesModal = function() {
    loadStatusCodes();
    $('#statusCodesModal').modal('show');
  };

  window.closeStatusCodesModal = function() {
    $('#statusCodesModal').modal('hide');
  };
  });

  // Form validation and popover handling
  $("#first-name").keydown(function (event) {
    if (event.keyCode==32) {
      event.preventDefault();
      $('#first-name').popover('show')
    } else {
      $('#first-name').popover('hide')
    }
  });
  
  $("#last-name").keydown(function (event) {
    if (event.keyCode==32) {
      event.preventDefault();
      $('#last-name').popover('show')
    } else {
      $('#last-name').popover('hide')
    }
  });

  $("#civ-first-name").keydown(function (event) {
    if (event.keyCode==32) {
      event.preventDefault();
      $('#civ-first-name').popover('show')
    } else {
      $('#civ-first-name').popover('hide')
    }
  });

  $("#civ-last-name").keydown(function (event) {
    if (event.keyCode==32) {
      event.preventDefault();
      $('#civ-last-name').popover('show')
    } else {
      $('#civ-last-name').popover('hide')
    }
  });

  // Load gravatar image
  var MD5 = function(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}
  let hash = MD5(dbUser.user.email.trim().toLowerCase())
  $('.profile-picture').css("background-image", `url(https://www.gravatar.com/avatar/${hash}?s=200)`)
});

// Utility functions
function generateSerialNumber(length, inputID) {
  var result = "";
  var characters = "ABCDEFGHJKMNPQRSTUVWXYZ0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  $("#" + inputID).val(result);
}

function toggleInput(showClass, hideClass) {
  $(`.${showClass}`).removeClass("hide").addClass("show");
  $(`.${hideClass}`).removeClass("show").addClass("hide");
}


function searchPlate() {
  let x = document.getElementById("plateDetails");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
  }

  if (dbVehicles === null || dbVehicles == undefined) {
    return;
  }
  if (dbVehicles.length === 0) {
    $("#plateDetails").removeAttr("style").hide();
    $("#vehicleNotFound").show();
    return;
  }
}

function searchFirearm() {
  let x = document.getElementById("firearmDetails");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
  }

  if (dbFirearms === null || dbFirearms == undefined) {
    return;
  }
  if (dbFirearms.length === 0) {
    $("#firearmDetails").removeAttr("style").hide();
    $("#firearmNotFound").show();
    return;
  }
}

function searchNames() {
  let x = document.getElementById("civDetails");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
  }
  if (dbCivilians === null || dbCivilians == undefined) {
    hideCivPopover();
    return;
  } else if (dbCivilians.length === 0) {
    let civDetails = document.getElementById("civDetails");
    civDetails.style.display = "none";
    let civNotFoundMsg = document.getElementById("civilianNotFound");
    civNotFoundMsg.style.display = "block";
    hideCivPopover();
    return;
  }
  hideCivPopover();
}

function openSearch() {
  $("#searchTicketDiv").show();
}

function generateCaseNo(elementName) {
  $(elementName).val(Math.round(Math.random() * 10000000000));
}

function hideTicketCivPopover() {
  if ($("#civID").val().length < 1) {
    $("#civID").popover("show");
    $("#ticket-form").attr("onsubmit", "return false;");
  } else {
    $("#civID").popover("hide");
    $("#ticket-form").attr("onsubmit", "return true;");
  }
}

function hideWarningCivPopover() {
  if ($("#civIDWarning").val().length < 1) {
    $("#civIDWarning").popover("show");
    $("#warning-form").attr("onsubmit", "return false;");
  } else {
    $("#civIDWarning").popover("hide");
    $("#warning-form").attr("onsubmit", "return true;");
  }
}

// EMS-specific functions
// populateCallDetails function - Temporarily Hidden for Rework
/*
function populateCallDetails(callID) {
  var socket = io();
  socket.emit('get_call_by_id', callID)
  socket.on('load_call_by_id_result', (res) => {
    var createdDate = new Date(res.call.createdAt)
    if (res.call.updatedAt == "" || res.call.updatedAt === undefined || res.call.updatedAt === 'undefined') {
      $('#updatedAtCallDetail').empty().text("N/A")
    } else {
      var updatedDate = new Date(res.call.updatedAt)
      $('#updatedAtCallDetail').empty().text(updatedDate.toLocaleString())
    }
    $('#createdAtCallDetail').empty().text(createdDate.toLocaleString())
    $('#descriptionCallDetail').empty().text(res.call.shortDescription)
    $('#callNotesDetail').empty().text(res.call.callNotes)
    let selectedClassifiers = ""
    if (res.call.classifier != undefined && res.call.classifier != null) {
      for (let i = 0; i < res.call.classifier.length; i++) {
        switch (res.call.classifier[i].toLowerCase()) {
          case "police":
            selectedClassifiers += `<span class="badge badge-primary">${res.call.classifier[i]}</span>  `    
            break;
          case "0":
            selectedClassifiers += `<span class="badge badge-primary">Police</span>  `    
            break;
          case "fire":
            selectedClassifiers += `<span class="badge badge-danger">${res.call.classifier[i]}</span>  `
            break;
          case "1":
            selectedClassifiers += `<span class="badge badge-danger">Fire</span>  `
            break;
          case "ems":
            selectedClassifiers += `<span class="badge badge-success">${res.call.classifier[i]}</span>  `
            break;
          case "2":
            selectedClassifiers += `<span class="badge badge-success">EMS</span>  `
            break;
          default:
            selectedClassifiers += `<span class="badge badge-secondary">${res.call.classifier[i]}</span>  `
            break;
        }
      }
    }
    $('#classifier').empty().html(selectedClassifiers)
    let assignedFireEms = ""
    if (res.call.assignedFireEms != undefined && res.call.assignedFireEms != null) {
      for (let i = 0; i < res.call.assignedFireEms.length; i++) {
        if (dbVehicles != null && dbVehicles != undefined) {
          for (let j = 0; j < dbVehicles.length; j++) {
            for (let j = 0; j < dbVehicles.length; j++) {
              if (dbVehicles[j]._id == res.call.assignedFireEms[i]) {
                assignedFireEms = assignedFireEms + `<li>Engine - ${dbVehicles[i].emsVehicle.engineNumber} (${dbVehicles[i].emsVehicle.model})</li>`
              }
            }
          }
        }
      }
    }
    $('#engines').empty().html(`<ul>${assignedFireEms}</ul>`)
  })
}
*/

function loadEmsData(personaID) {
  var socket = io();
  myReq = {
    personaID: personaID
  }
  socket.emit('get_persona_data', myReq);
  socket.on('load_persona_data', (res) => {
    if (res === null || res === undefined) {
      $('#persona-details-loading').hide();
      $('#issue-loading-persona-details-alert').show();
      return
    } else {
      $('#firstNameView').text(res.ems.firstName)
      $('#lastNameView').text(res.ems.lastName)
      $('#departmentView').text(res.ems.department)
      $('#assignmentAreaView').text(res.ems.assignmentArea)
      $('#stationView').text(res.ems.station)
      $('#callSignView').text(res.ems.callSign)
      $('#removeEms').val(personaID)
      $('#issue-loading-persona-details-alert').hide();
      $('#persona-details-loading').hide();
      $('#persona-details-div').show();
    }
  });
}

function deleteEmsVeh() {
  var socket = io()
  myReq = {
    vehicleID: $('#vehicle-id').val()
  }
  socket.emit('delete_ems_vehicle', myReq)
}

function updateStatus(status) {
  var socket = io();
  var onDuty = null
  var updateDuty = false
  if (status == '10-41') {
    onDuty = true
    updateDuty = true
    status = "Online"
  } else if (status == '10-42') {
    onDuty = false
    updateDuty = true
    status = "Offline"
  }
  myReq = {
    vehicleID: $('#vehicle-id').val(),
    status: status,
    setBy: 'Self',
    onDuty: onDuty,
    updateDuty: updateDuty
  }
  socket.emit('update_ems_status', myReq)
}

function loadVehData(index) {
  var color = dbVehicles[index].emsVehicle.color
  var plate = dbVehicles[index].emsVehicle.plate.toUpperCase()
  var model = dbVehicles[index].emsVehicle.model
  var engineNumber = dbVehicles[index].emsVehicle.engineNumber
  var registeredOwner = dbVehicles[index].emsVehicle.registeredOwner
  var status = dbVehicles[index].emsVehicle.dispatchStatus
  var statusSetBy = dbVehicles[index].emsVehicle.dispatchStatusSetBy
  // If emsVehicle was created before fire_ems_update
  // This converts the undefined values to blank spaces for UI
  if (statusSetBy == undefined) statusSetBy = "";
  if (status == undefined) status = "";
  $('#vehicle-id').val(dbVehicles[index]._id)
  $('#plateView').text(plate)
  $('#modelView').text(model)
  $('#engineNumView').text(engineNumber)
  $('#colorView').text(color)
  $('#roView').text(registeredOwner)
  $('#modelVeh').val(model)
  $('#engineNumVeh').val(engineNumber)
  $('#roVeh').val(registeredOwner)
  $('#plateVeh').val(plate)
  $('#statusDispatch').text(status)
  $('#statusDispatchSetBy').text(statusSetBy)
}

function createNewEms() {
  $('#first-name').popover('hide')
  $('#last-name').popover('hide')
}



function fillAccountDetails() {
  $('#accountEmail').val(dbUser.user.email)
  $('#accountUsername').val(dbUser.user.username)
  $('#accountCallSign').val(dbUser.user.callSign)
}

function cancelUsername() {
  $('#accountUsername').val(dbUser.user.username)
  $('#updateUsernameBtns').hide();
}

function cancelCallSign() {
  $('#accountCallSign').val(dbUser.user.callSign)
  $('#updateCallSignBtns').hide();
}

function setDateAndTime(dateElement, timeElement) {
  $(dateElement)[0].valueAsDate = new Date();
  $(timeElement)[0].value = new Date().toLocaleTimeString('en-GB', {
    hour: "2-digit",
    minute: "2-digit"
  })
}

function CreateReport(firstName, lastName, civilianID, dateOfBirth, deceased) {
  $('#new-report-civilianID').val(civilianID);
  $('#new-report-firstName').val(firstName);
  $('#new-report-lastName').val(lastName);
  $('#new-report-dateOfBirth').val(dateOfBirth);
  $('#new-report-reportingEmsID').val(dbUser._id);
  $('#deceased').val(deceased);
}

function searchMedicalNames() {
  if (!document.getElementById('civ-first-name').validity.valid) {
    $('#firstNameRequired').show()
    return
  } else {
    $('#firstNameRequired').hide()
  }
  if (!document.getElementById('civ-last-name').validity.valid) {
    $('#lastNameRequired').show()
    return
  } else {
    $('#lastNameRequired').hide()
  }
  if (document.getElementById('civ-dob') != null) {
    if (!document.getElementById('civ-dob').validity.valid) {
      $('#dateOfBirthRequired').show()
      return
    } else {
      $('#dateOfBirthRequired').hide()
    }
  }
  var activeCommunityID
  $("#accordion").empty()
  if (dbUser.user.activeCommunity != "" && dbUser.user.activeCommunity != null) {
    activeCommunityID = dbUser.user.activeCommunity
  }
  var parameters = {
    firstName: $('#civ-first-name').val(),
    lastName: $('#civ-last-name').val(),
    dateOfBirth: $('#civ-dob').val(),
    activeCommunityID: activeCommunityID
  };
  $.get('/medical-database', parameters, function (data) {
    var i = 0
    if (data.civilians != null && data.civilians != undefined) {
      if (data.civilians.length < 1) {
        $('#personNotFound').show()
        return
      }
      $('#personNotFound').hide()
      data.civilians.forEach(function (e) {
        var collapsed
        if (i == 0) {
          collapsed = "in"
        } else {
          collapsed = ""
        }
        let deceasedState
        e.civilian.deceased ? deceasedState = 'Yes <i class="fa fa-skull-crossbones color-alert-red"></i>' : deceasedState = 'No <i class="fa fa-user color-green"></i>'
        var newRowContent
        newRowContent = `
            <!-- List of Civilians -->
            <div class="panel panel-default background-transparent">
                <div class="panel-heading" data-toggle="collapse" data-id="`+i+`" data-parent="#accordion" href="#collapse`+i+`">
                  <h4 class="panel-title">
                    <a class="blue-hover capitalize">
                        `+e.civilian.firstName+` `+e.civilian.lastName+` | `+e._id+`</a>
                  </h4>
                </div>
                  <div id="collapse`+i+`" class="panel-collapse collapse `+collapsed+`">
                  <div class="panel-body">
                      <div class="text-align-center">
                        <button data-toggle="modal" href="#createReportModal" class="btn btn-primary btn-md margin-bottom-05" onclick="CreateReport('`+e.civilian.firstName+`', '`+e.civilian.lastName+`', '`+e._id+`', '`+e.civilian.birthday+`', 'false');setDateAndTime('#new-report-reportDate', '#new-report-reportTime');">Create Report</button>
                        <button data-toggle="modal" href="#createReportModal" class="btn btn-primary btn-md margin-bottom-05" onclick="CreateReport('`+e.civilian.firstName+`', '`+e.civilian.lastName+`', '`+e._id+`', '`+e.civilian.birthday+`', 'true');setDateAndTime('#new-report-reportDate', '#new-report-reportTime')">Pronounce Dead</button>
                      </div>
                      <hr/>
                      Driver's ID #: ${e._id}<br/>
                      Date of Birth: ${e.civilian.birthday}<br/>
                      Address: ${e.civilian.address}<br/>
                      Occupation: ${e.civilian.occupation}<br/>
                      Deceased: ${deceasedState}<br/>
                      <hr style="width: 88%;max-width: 100rem;">
                      <h4>Medical History</h4>
                      <ul class="nav nav-pills mb-3 margin-bottom-1" id="pills-tab" role="tablist">
                        <li class="nav-item active">
                          <a class="nav-link active" id="pills-reports-tab-`+e._id+`" data-toggle="pill" href="#pills-reports-`+e._id+`" role="tab" aria-controls="pills-reports-`+e._id+`" aria-selected="true">Reports</a>
                        </li>
                        <li class="nav-item">
                          <a class="nav-link" id="pills-medications-tab-`+e._id+`" data-toggle="pill" href="#pills-medications-`+e._id+`" role="tab" aria-controls="pills-medications-`+e._id+`" aria-selected="false">Medications</a>
                        </li>
                        <li class="nav-item">
                          <a class="nav-link" id="pills-conditions-tab-`+e._id+`" data-toggle="pill" href="#pills-conditions-`+e._id+`" role="tab" aria-controls="pills-conditions-`+e._id+`" aria-selected="false">Pre-Existing Conditions</a>
                        </li>
                      </ul>
                      <div class="tab-content" id="pills-tabContent">
                        <div class="tab-pane fade active in" id="pills-reports-`+e._id+`" role="tabpanel" aria-labelledby="pills-reports-tab-`+e._id+`">
                          <table id="reports-table-`+e._id+`" class="table" border="1" frame="box">
                            <thead>
                              <tr style="background-color: #2d2d2d;"><td>Date<br><i><small>YYYY-M-D</small></i></td><td>Hospitalized<br><i><small>Y/N</small></i></td><td>Summary</td><td>Delete</td></tr>
                            </thead>
                            <tbody>
                              <!-- List of Reports -->
                            </tbody>
                        </table>
                        </div>
                        <div class="tab-pane fade" id="pills-medications-`+e._id+`" role="tabpanel" aria-labelledby="pills-medications-tab-`+e._id+`">
                          <table id="medications-table-`+e._id+`" class="table" border="1" frame="box">
                            <thead>
                              <tr style="background-color: #2d2d2d;"><td>Start Date<br><i><small>YYYY-M-D</small></i></td><td>Name</td><td>Dosage</td><td>Frequency</td><td>Delete</td></tr>
                            </thead>
                            <tbody>
                              <!-- List of Medications -->
                            </tbody>
                        </table>
                        </div>
                        <div class="tab-pane fade" id="pills-conditions-`+e._id+`" role="tabpanel" aria-labelledby="pills-conditions-tab-`+e._id+`">
                          <table id="conditions-table-`+e._id+`" class="table" border="1" frame="box">
                            <thead>
                              <tr style="background-color: #2d2d2d;"><td>Date Occurred<br><i><small>YYYY-M-D</small></i></td><td>Name</td><td>Details</td><td>Delete</td></tr>
                            </thead>
                            <tbody>
                              <!-- List of Pre-Existing Conditions -->
                            </tbody>
                        </table>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            `
        $("#accordion").append(newRowContent)
        i++
      });
      //loop through all reports, medications and conditions for this civ
      data.civilians.forEach(function (e) {
        data.reports.forEach(function (r) {
          if (e._id == r.report.civilianID) {
            var newReportContent
            newReportContent = `
            <tr id="`+r._id+`"><td>`+r.report.date+`</td><td style='text-transform: capitalize;'>`+r.report.hospitalized+`</td><td style='text-transform: capitalize;'>`+r.report.details+`</td><td class="text-align-center"><a class='clickable' onclick="deleteReport('`+r._id+`', '`+r.report.civilianID+`')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td></tr>
            `
            $("#reports-table-"+r.report.civilianID+" tbody").append(newReportContent)
          }
        });
        if (data.medications != null && data.medications != undefined) {
          data.medications.forEach(function (m) {
            if (e._id == m.medication.civilianID) {
              var newReportContent
              newReportContent = `
              <tr id="`+m._id+`"><td>`+m.medication.startDate+`</td><td style='text-transform: capitalize;'>`+m.medication.name+`</td><td>`+m.medication.dosage+`</td><td style='text-transform: capitalize;'>`+m.medication.frequency+`</td><td class="text-align-center"><a class='clickable' onclick="deleteMedication('`+m._id+`', '`+m.medication.civilianID+`')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td></tr>
              `
              $("#medications-table-"+m.medication.civilianID+" tbody").append(newReportContent)
            }
          });
        }

        if (data.conditions != null && data.conditions != undefined) {
          data.conditions.forEach(function (c) {
            if (e._id == c.condition.civilianID) {
              var newReportContent
              newReportContent = `
              <tr id="`+c._id+`"><td>`+c.condition.dateOccurred+`</td><td style='text-transform: capitalize;'>`+c.condition.name+`</td><td style='text-transform: capitalize;'>`+c.condition.details+`</td><td class="text-align-center"><a class='clickable' onclick="deleteCondition('`+c._id+`', '`+c.condition.civilianID+`')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td></tr>
              `
              $("#conditions-table-"+c.condition.civilianID+" tbody").append(newReportContent)
            }
          });
        }
      });
    }
  });
}

// Dynamic Content Switching Functions
function showSearchView() {
  // Hide all views
  $('.view-content').hide();
  
  // Show search view
  $('#searchView').show();
  
  // Restore previous search state if available
  restoreSearchState();
  
  // Hide error messages but preserve search results
  $('#nameRequired').hide();
  $('#personNotFound').hide();
  
  // Ensure only medical reports tab is visible initially
  $('#reports-content').addClass('active').show();
  $('#medications-content').removeClass('active').hide();
  
  // Set medical reports tab as active
  $('#reports-tab').parent().addClass('active');
  $('#medications-tab').parent().removeClass('active');
}

// Clear medical report form
function clearMedicalReportForm() {
  $('#new-report-date').val('');
  $('#new-report-details').val('');
  $('#new-report-hospitalized').val('no');
  $('#new-report-name').val('');
  $('#new-report-dateOfBirth').val('');
  $('#new-report-reportingEmsID').val('');
  $('#new-report-userID').val('');
  $('#new-report-activeCommunityID').val('');
  
  // Clear any error messages
  hideModalError();
}

// Clear medication form
function clearMedicationForm() {
  $('#med-startDate').val('');
  $('#med-medicationName').val('');
  $('#med-dosage').val('');
  $('#med-frequency').val('');
  $('#med-civilianID').val('');
  $('#med-name-hidden').val('');
  $('#med-activeCommunityID').val('');
  $('#med-userID').val('');
  $('#med-firstName').val('');
  $('#med-lastName').val('');
  $('#med-dateOfBirth').val('');
  
  // Clear any error messages
  hideModalError();
}

function showCreateReportView() {
  // Store current search state before switching views
  window.previousSearchState = {
    searchTerm: $('#medical-search-name').val(),
    searchResultsVisible: $('#medicalSearchResults').is(':visible'),
    medicalDetailsVisible: $('#medicalDetails').is(':visible'),
    selectedCivilian: window.selectedCivilian
  };
  
  // Clear editing state
  window.editingReportId = null;
  
  // Hide all views
  $('.view-content').hide();
  
  // Show create report view
  $('#createReportView').show();
  
  // Clear the form first to ensure clean state
  clearMedicalReportForm();
  
  // Reset form to create mode
  $('#modalTitle').text('Create Medical Report');
  $('#createReportForm button[type="submit"]').html('<i class="fa fa-plus"></i> Create Report');
  
  // Populate patient information
  if (window.selectedCivilian) {
    $('#display-patient-name').text(window.selectedCivilian.name || 'N/A');
    $('#display-patient-dob').text(window.selectedCivilian.dateOfBirth || 'N/A');
    $('#display-patient-license').text(window.selectedCivilian.license || 'N/A');
    
    // Set hidden form fields
    $('#new-report-civilianID').val(window.selectedCivilian._id);
    $('#new-report-name').val(window.selectedCivilian.name);
    $('#new-report-dateOfBirth').val(window.selectedCivilian.dateOfBirth);
    $('#new-report-license').val(window.selectedCivilian.license);
    
    // Set EMS ID
    const emsId = dbUser.user.username || dbUser.user.callsign || `ID${dbUser._id.toString().slice(-4)}`;
    $('#new-report-reportingEmsID').val(emsId);
    
    // Set other required fields
    $('#new-report-userID').val(dbUser._id);
    $('#new-report-activeCommunityID').val(dbUser.user.lastAccessedCommunity?.communityID || '');
    
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    $('#new-report-date').val(today);
  }
}

function showAddMedicationView() {
  // Check if we have a selected civilian
  if (!window.selectedCivilian) {
    showToast('Please select a civilian first.', 'danger');
    return;
  }
  
  // Store current search state before switching views
  window.previousSearchState = {
    searchTerm: $('#medical-search-name').val(),
    searchResultsVisible: $('#medicalSearchResults').is(':visible'),
    medicalDetailsVisible: $('#medicalDetails').is(':visible'),
    selectedCivilian: window.selectedCivilian
  };
  
  // Clear editing state
  window.editingMedicationId = null;
  
  // Hide all views
  $('.view-content').hide();
  
  // Show add medication view
  $('#addMedicationView').show();
  
  // Update modal title
  $('#modalTitle').text('Add Medication');
  
  // Reset form to create mode
  $('#addMedicationForm button[type="submit"]').html('<i class="fa fa-plus"></i> Add Medication');
  
  // Populate patient information
  if (window.selectedCivilian) {
    $('#med-name').text(window.selectedCivilian.name || 'N/A');
    $('#medicationStartDate').text(new Date().toLocaleDateString());
    
    // Set hidden form fields
    $('#med-civilianID').val(window.selectedCivilian._id);
    $('#med-name-hidden').val(window.selectedCivilian.name);
    
    // Set current date as default start date
    const today = new Date().toISOString().split('T')[0];
    $('#med-startDate').val(today);
    
    // Set other required fields
    $('#med-activeCommunityID').val(dbUser.user.lastAccessedCommunity?.communityID || '');
    $('#med-userID').val(dbUser._id);
    $('#med-firstName').val(window.selectedCivilian.name?.split(' ')[0] || '');
    $('#med-lastName').val(window.selectedCivilian.name?.split(' ').slice(1).join(' ') || '');
    $('#med-dateOfBirth').val(window.selectedCivilian.dateOfBirth || '');
  }
  
  // Change the form action to create
  $('#addMedicationForm').off('submit').on('submit', function(e) {
    e.preventDefault();
    addMedication();
  });
}

// New medical database search function
function searchMedicalByName() {
  const searchName = $('#medical-search-name').val().trim();
  
  if (!searchName) {
    $('#nameRequired').show();
    return;
  }
  
  // Add to recent searches
  addRecentSearch(searchName);

  // Show loading state
  $('#civiliansList').html('<div class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p>Searching...</p></div>');
  $('#medicalSearchResults').show();
  
  // Build API URL with query parameters
  const apiUrl = `${POLICE_CAD_API_URL}/api/v1/civilians/search`;
  const activeCommunityId = dbUser.user.lastAccessedCommunity?.communityID || '';
  
  const params = {
    name: searchName,
    active_community_id: activeCommunityId,
    limit: 5,
    page: 0
  };
  
  // Store search parameters for pagination
  window.currentSearchParams = {
    name: searchName,
    active_community_id: activeCommunityId,
    limit: 5,
    page: 0
  };
  
  // Make the API call directly using fetch
  fetch(`${apiUrl}?${new URLSearchParams(params)}`)
    .then(response => {
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but got: ${contentType}`);
      }
      
      return response.json();
    })
    .then(data => {
      // Handle different API response structures
      let civilians = data;
      let totalRecords = data.length;
      
      // If the API returns an object with data and pagination
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        civilians = data.civilians || data.data || [];
        totalRecords = data.totalRecords || data.total || data.length || civilians.length;
      }
      
      if (civilians && civilians.length > 0) {
        // Update the total records count for pagination
        window.currentSearchParams.totalRecords = totalRecords;
        displayCiviliansList(civilians, window.currentSearchParams);
        $('#medicalSearchResults').show(); // Show the search results
      } else {
        $('#civiliansList').html('<div class="alert alert-info">No civilians found matching that name.</div>');
        $('#medicalSearchResults').show(); // Show the search results even for no results
      }
    })
    .catch(error => {
      console.error('❌ API call failed:', error);
      $('#civiliansList').html(`
        <div class="alert alert-danger">
          <strong>Error searching for civilians:</strong><br>
          ${error.message}<br>
          <small>API URL: ${apiUrl}</small>
        </div>
      `);
      $('#medicalSearchResults').show(); // Show error results
    });
}

// Display the list of civilians found
function displayCiviliansList(civilians, params) {
  
  let civiliansHtml = '';
  
  civilians.forEach((item, index) => {
    
    // The civilian ID is at the top level of the item
    const civilianId = item._id;
    const civilian = item.civilian;
    
    // Check if we have a valid ID
    if (!civilianId) {
      console.error(`❌ Item ${index} has no _id:`, item);
      return; // Skip this item
    }
    
    const name = civilian.name || `${civilian.firstName || ''} ${civilian.lastName || ''}`.trim();
    const birthday = civilian.birthday || 'Unknown';
    const deceased = civilian.deceased || false;
    
    civiliansHtml += `
      <div class="civilian-accordion-item" data-civilian-id="${civilianId}">
        <div class="list-group-item list-group-item-action civilian-header" 
             onclick="toggleCivilianAccordion('${civilianId}', '${name}', '${birthday}', ${deceased})">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">${name}</h6>
              <small>
                DOB: ${birthday} | Gender: ${civilian.gender || 'Unknown'} | Race: ${civilian.race || 'Unknown'}<br>
                Address: ${civilian.address || 'Unknown'}<br>
                Hair: ${civilian.hairColor || 'Unknown'} | Eyes: ${civilian.eyeColor || 'Unknown'} | Weight: ${civilian.weight || 'Unknown'} ${civilian.weightClassification || ''} | Height: ${formatHeight(civilian.height, civilian.heightClassification) || 'Unknown'}
              </small>
              ${deceased ? '<div class="margin-top-1"><span class="badge badge-danger"><i class="fa fa-skull-crossbones"></i> Deceased</span></div>' : ''}
            </div>
            <div class="d-flex align-items-center">
              <i class="fa fa-chevron-down accordion-icon" id="icon-${civilianId}"></i>
            </div>
          </div>
        </div>
        
        <!-- Accordion Content (Hidden by default) -->
        <div class="civilian-accordion-content" id="content-${civilianId}" style="display: none;">
          <div class="accordion-body">
            <!-- Medical Information will be loaded here -->
            <div class="text-center">
              <div class="lds-facebook"><div></div><div></div><div></div></div>
              <p>Loading medical information...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  // Add pagination if we have search parameters and more than 5 results
  if (params && params.totalRecords > params.limit) {
    civiliansHtml += displaySearchPagination(params);
  }
  
  $('#civiliansList').html(civiliansHtml);
  
}

// Display search pagination
function displaySearchPagination(params) {
  const { page, limit, totalRecords } = params;
  const totalPages = Math.ceil(totalRecords / limit);
  
  if (totalPages <= 1) return '';
  
  let paginationHtml = `
    <div class="text-center margin-top-2">
      <nav aria-label="Search results pagination">
        <ul class="pagination">
  `;
  
  // Previous button
  if (page > 0) {
    paginationHtml += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="loadSearchPage(${page - 1})">
          <i class="fa fa-chevron-left"></i> Previous
        </a>
      </li>
    `;
  }
  
  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    if (i === page) {
      paginationHtml += `
        <li class="page-item active">
          <span class="page-link">${i + 1}</span>
        </li>
      `;
    } else {
      paginationHtml += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="loadSearchPage(${i})">${i + 1}</a>
        </li>
      `;
    }
  }
  
  // Next button
  if (page < totalPages - 1) {
    paginationHtml += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="loadSearchPage(${page + 1})">
          Next <i class="fa fa-chevron-right"></i>
        </a>
      </li>
    `;
  }
  
  paginationHtml += `
        </ul>
      </nav>
      <small class="text-muted">Showing ${page * limit + 1}-${Math.min((page + 1) * limit, totalRecords)} of ${totalRecords} results</small>
    </div>
  `;
  
  return paginationHtml;
}

// Load a specific search page
function loadSearchPage(page) {
  if (!window.currentSearchParams) {
    console.error('No search parameters found');
    return;
  }
  
  // Update the page number
  window.currentSearchParams.page = page;
  
  // Show loading state
  $('#civiliansList').html('<div class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p>Loading...</p></div>');
  
  // Build API URL with updated parameters
  const apiUrl = `${POLICE_CAD_API_URL}/api/v1/civilians/search`;
  const params = window.currentSearchParams;
  
  // Make the API call for the specific page
  fetch(`${apiUrl}?${new URLSearchParams(params)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but got: ${contentType}`);
      }
      
      return response.json();
    })
    .then(data => {
      // Handle different API response structures
      let civilians = data;
      let totalRecords = data.length;
      
      // If the API returns an object with data and pagination
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        civilians = data.civilians || data.data || [];
        totalRecords = data.totalRecords || data.total || data.length || civilians.length;
      }
      
      if (civilians && civilians.length > 0) {
        // Update the total records count for pagination
        window.currentSearchParams.totalRecords = totalRecords;
        displayCiviliansList(civilians, window.currentSearchParams);
      } else {
        $('#civiliansList').html('<div class="alert alert-info">No more results found.</div>');
      }
    })
    .catch(error => {
      console.error('❌ Failed to load search page:', error);
      $('#civiliansList').html(`
        <div class="alert alert-danger">
          <strong>Error loading results:</strong><br>
          ${error.message}
        </div>
      `);
    });
}

// Select a civilian and display their information
function selectCivilian(civilianId, name, birthday, deceased) {
  
  // Store the selected civilian globally
  window.selectedCivilian = {
    _id: civilianId,
    name: name,
    dateOfBirth: birthday,
    deceased: deceased
  };
  
  // Update the selected civilian info display
  $('#selectedPersonName').text(`Medical Information - ${name}`);
  $('#selectedCivilianInfo').html(`
    <div class="alert alert-success">
      <strong>Selected:</strong> ${name} (DOB: ${birthday})
      ${deceased ? '<div class="margin-top-1"><span class="badge badge-danger"><i class="fa fa-skull-crossbones"></i> Deceased</span></div>' : ''}
    </div>
  `).show();
  
  // Show the medical details section
  $('#medicalDetails').show();
  
  // Load medical reports for this civilian
  loadMedicalReports(civilianId);
  
  // Load medications for this civilian
  loadMedications(civilianId);
  
  // Update the deceased button to show current status
  updateDeceasedButton(deceased);
}

// Load medical reports for a civilian
function loadMedicalReports(civilianId, page = 0) {
  // Show loading state in the medical reports tab
  $('#medicalReportsContent').html(`
    <div class="text-center">
      <div class="lds-facebook"><div></div><div></div><div></div></div>
      <p>Loading medical reports...</p>
    </div>
  `);
  
  // Build API URL with query parameters
  const apiUrl = `${POLICE_CAD_API_URL}/api/v1/medical-reports`;
  const activeCommunityId = dbUser.user.lastAccessedCommunity?.communityID || '';
  
  const params = {
    civilian_id: civilianId,
    active_community_id: activeCommunityId,
    limit: 10,
    page: page
  };
  

  
  // Make the API call to load medical reports
  fetch(`${apiUrl}?${new URLSearchParams(params)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}` // Add JWT token
    }
  })
  .then(response => {

    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  })
  .then(data => {
    
    
    if (data && data.medicalReports && data.medicalReports.length > 0) {
      // Display the reports in a table
      displayMedicalReports(data.medicalReports, data.pagination);
    } else {
      // Show no reports message
      displayNoMedicalReports();
    }
  })
  .catch(error => {
    console.error('❌ Failed to load medical reports:', error);
    displayMedicalReportsError(error.message);
  });
}

// Display medical reports in the table
function displayMedicalReports(reports, pagination) {
  let reportsHtml = `
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Date</th>
            <th>Details</th>
            <th>Hospitalized</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  reports.forEach((report, index) => {
    // Use the correct field name from the API: reportDate
    let reportDate = 'Unknown';
    
    if (report.reportDate) {
      try {
        reportDate = new Date(report.reportDate).toLocaleDateString();
      } catch (e) {
        console.error('Error parsing reportDate:', report.reportDate, e);
        reportDate = report.reportDate || 'Unknown';
      }
    }
    
    // Use the correct field names from the API
    const hospitalized = report.hospitalized === 'yes' ? 'Yes' : 'No';
    
    reportsHtml += `
      <tr>
        <td>${reportDate}</td>
        <td>${report.details || 'No details'}</td>
        <td><span class="badge ${report.hospitalized === 'yes' ? 'badge-warning' : 'badge-success'}">${hospitalized}</span></td>
        <td>
          <button class="btn btn-sm btn-info" onclick="viewMedicalReport('${report._id}')">
            <i class="fa fa-eye"></i> View
          </button>
          <button class="btn btn-sm btn-warning" onclick="editMedicalReport('${report._id}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMedicalReport('${report._id}')">
            <i class="fa fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  });
  
  reportsHtml += `
        </tbody>
      </table>
    </div>
  `;
  
  // Add pagination if available
  if (pagination && pagination.totalRecords > pagination.limit) {
    reportsHtml += displayMedicalReportsPagination(pagination, window.selectedCivilian._id);
  }
  
  // Update the medical reports content
  $('#medicalReportsContent').html(reportsHtml);
  
  // Ensure Bootstrap 3 tab is properly active and visible
  $('#reports-content').removeClass('fade').addClass('active').show();
  $('#medicalReportsContent').show();
  
  // Force the tab content to be visible
  $('#reports-content').css({
    'display': 'block !important',
    'visibility': 'visible !important',
    'opacity': '1 !important'
  });
}

// Display medical reports pagination
function displayMedicalReportsPagination(pagination, civilianId) {
  const { currentPage, totalPages, totalRecords, limit } = pagination;
  
  if (totalPages <= 1) return '';
  
  let paginationHtml = `
    <div class="text-center margin-top-2">
      <nav aria-label="Medical reports pagination">
        <ul class="pagination">
  `;
  
  // Previous button
  if (currentPage > 0) {
    paginationHtml += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="loadMedicalReportsPage(${currentPage - 1}, '${civilianId}')">
          <i class="fa fa-chevron-left"></i> Previous
        </a>
      </li>
    `;
  }
  
  // Page numbers
  for (let i = Math.max(0, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
    const isActive = i === currentPage;
    paginationHtml += `
      <li class="page-item ${isActive ? 'active' : ''}">
        <a class="page-link" href="#" onclick="loadMedicalReportsPage(${i}, '${civilianId}')">
          ${i + 1}
        </a>
      </li>
    `;
  }
  
  // Next button
  if (currentPage < totalPages - 1) {
    paginationHtml += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="loadMedicalReportsPage(${currentPage + 1}, '${civilianId}')">
          Next <i class="fa fa-chevron-right"></i>
        </a>
      </li>
    `;
  }
  
  paginationHtml += `
        </ul>
      </nav>
      <p class="text-muted">
        Showing ${currentPage * limit + 1} to ${Math.min((currentPage + 1) * limit, totalRecords)} of ${totalRecords} reports
      </p>
    </div>
  `;
  
  return paginationHtml;
}

// Load a specific page of medical reports
function loadMedicalReportsPage(page, civilianId) {
  // Update the current page and reload reports
  loadMedicalReports(civilianId, page);
}

// Display no medical reports message
function displayNoMedicalReports() {
  $('#medicalReportsContent').html(`
    <div class="text-center text-muted">
      <i class="fa fa-file-medical fa-3x"></i>
      <p>No medical reports found for this person.</p>
      <p><small>Click "Create Medical Report" to add the first report.</small></p>
    </div>
  `);
}

// Display medical reports error message
function displayMedicalReportsError(errorMessage) {
  console.error('❌ Medical reports error:', errorMessage);
  
  $('#medicalReportsContent').html(`
    <div class="alert alert-danger">
      <strong>Error loading medical reports:</strong><br>
      ${errorMessage}
    </div>
  `);
}

// Load medications for a civilian
function loadMedications(civilianId) {
  // Show loading state in the medications tab
  $('#medicationsContent').html(`
    <div class="text-center text-muted">
      <i class="fa fa-spinner fa-spin fa-3x"></i>
      <p>Loading medications...</p>
    </div>
  `);
  
  // For now, show no medications message
  // TODO: Implement actual API call to load medications
  setTimeout(() => {
    $('#medicationsContent').html(`
      <div class="text-center text-muted">
        <i class="fa fa-pills fa-3x"></i>
        <p>No medications found for this person.</p>
        <p>Click "Add Medication" to add the first medication.</p>
      </div>
    `);
  }, 1000);
}

// Toast notification functions
function showToast(message, type = 'success') {
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true" style="min-width: 300px;">
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close-toast" onclick="removeToast('${toastId}')" aria-label="Close">
          ×
        </button>
      </div>
    </div>
  `;
  
  $('#toast-container').append(toastHtml);
  
  // Show the toast with CSS animation
  $(`#${toastId}`).fadeIn(300);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    removeToast(toastId);
  }, 5000);
}

// Remove toast function
function removeToast(toastId) {
  $(`#${toastId}`).fadeOut(300, function() {
    $(this).remove();
  });
}

// Create medical report function
function createMedicalReport() {
  // Collect form data
  const formData = {
    report: {
      date: $('#new-report-date').val(),              // API expects 'date' field
      details: $('#new-report-details').val(),
      civilianID: $('#new-report-civilianID').val(),
      reportingEmsID: $('#new-report-reportingEmsID').val(),
      hospitalized: $('#new-report-hospitalized').val() === 'yes',  // Convert "yes"/"no" to true/false
      activeCommunityID: $('#new-report-activeCommunityID').val(),
      userID: $('#new-report-userID').val(),
      name: $('#new-report-name').val(),
      dateOfBirth: $('#new-report-dateOfBirth').val()
    }
  };
  
  // Validate required fields
  if (!formData.report.civilianID || !formData.report.name || !formData.report.date || !formData.report.details) {
    showModalError('Please fill in all required fields.');
    return;
  }
  

  
  // Make API call to create medical report
  fetch(`${POLICE_CAD_API_URL}/api/v1/medical-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}` // Add JWT token
    },
    body: JSON.stringify(formData)
  })
  .then(response => {
    
    
    if (!response.ok) {
      return response.json().then(errorData => {
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    
    
    // Show success toast
    showToast('Medical report created successfully!', 'success');
    
    // Clear the form fields after successful creation
    clearMedicalReportForm();
    
    // Switch back to search view and restore previous state
    showSearchView();
    
    // Ensure medical reports tab is active and visible
    $('#reports-tab').parent().addClass('active');
    $('#medications-tab').parent().removeClass('active');
    $('#reports-content').addClass('active').show();
    $('#medications-content').removeClass('active').hide();
    
    // Reload medical reports for the selected civilian with a small delay to ensure view is ready
    if (window.selectedCivilian) {
      setTimeout(() => {
        loadMedicalReports(window.selectedCivilian._id);
        
        // Also refresh the accordion content to show the new report
        const civilianId = window.selectedCivilian._id;
        const name = window.selectedCivilian.name;
        const birthday = window.selectedCivilian.dateOfBirth;
        const deceased = window.selectedCivilian.deceased;
        
        // Reload medical information in the accordion
        loadCivilianMedicalInfo(civilianId, name, birthday, deceased);
      }, 100);
    }
  })
  .catch(error => {
    console.error('❌ Failed to create medical report:', error);
    showModalError(`Failed to create medical report: ${error.message}`);
  });
}

// Add medication function
function addMedication() {
  // Check if we're editing or creating
  if (window.editingMedicationId) {
    updateMedication(window.editingMedicationId);
    return;
  }
  
  // Collect form data
  const formData = {
    medication: {
      startDate: $('#med-startDate').val(),
      name: $('#med-medicationName').val(),
      dosage: $('#med-dosage').val(),
      frequency: $('#med-frequency').val(),
      civilianID: $('#med-civilianID').val(),
      activeCommunityID: $('#med-activeCommunityID').val(),
      userID: $('#med-userID').val(),
      firstName: $('#med-firstName').val(),
      lastName: $('#med-lastName').val(),
      dateOfBirth: $('#med-dateOfBirth').val()
    }
  };
  
  // Validate required fields
  if (!formData.medication.civilianID || !formData.medication.name || !formData.medication.dosage || !formData.medication.frequency) {
    showModalError('Please fill in all required fields.');
    return;
  }
  

  
  // Make API call to create medication
  fetch(`${POLICE_CAD_API_URL}/api/v1/medications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(formData)
  })
  .then(response => {
    
    
    if (!response.ok) {
      return response.json().then(errorData => {
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    
    
    // Show success toast
    showToast('Medication added successfully!', 'success');
    
    // Clear the form
    clearMedicationForm();
    
    // Switch back to search view and restore previous state
    showSearchView();
    
    // Reload the accordion content for the selected civilian
    if (window.selectedCivilian) {
      const civilianId = window.selectedCivilian._id;
      const name = window.selectedCivilian.name;
      const birthday = window.selectedCivilian.dateOfBirth;
      const deceased = window.selectedCivilian.deceased;
      
      // Reload medical information in the accordion
      loadCivilianMedicalInfo(civilianId, name, birthday, deceased);
    }
  })
  .catch(error => {
    console.error('❌ Failed to create medication:', error);
    showModalError(`Failed to create medication: ${error.message}`);
  });
}

// Show modal error function
function showModalError(message) {
  $('#create-report-errors').html(message).show();
}

// Hide modal error function
function hideModalError() {
  $('#create-report-errors').hide();
}

// Restore search state function
function restoreSearchState() {
  if (window.previousSearchState) {
    // Restore search term
    $('#medical-search-name').val(window.previousSearchState.searchTerm);
    
    // Restore search results visibility
    if (window.previousSearchState.searchResultsVisible) {
      $('#medicalSearchResults').show();
    }
    
    // Restore medical details visibility
    if (window.previousSearchState.medicalDetailsVisible) {
      $('#medicalDetails').show();
    }
    
    // Restore selected civilian
    if (window.previousSearchState.selectedCivilian) {
      window.selectedCivilian = window.previousSearchState.selectedCivilian;
    }
  }
}

// Placeholder functions for medical report actions
function viewMedicalReport(reportId) {

  
  // Show loading state
  $('#medicalReportsContent').html(`
    <div class="text-center">
      <div class="lds-facebook"><div></div><div></div><div></div></div>
      <p>Loading medical report details...</p>
    </div>
  `);
  
  // Make API call to get medical report by ID
  fetch(`${POLICE_CAD_API_URL}/api/v1/medical-reports/${reportId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    
    
    // Display the medical report details
    const report = data.report;
    const reportDate = report.date ? new Date(report.date).toLocaleDateString() : 'Unknown';
    
    const detailsHtml = `
      <div class="panel panel-info">
        <div class="panel-heading">
          <h4 class="panel-title">Medical Report Details</h4>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-6">
              <p><strong>Date:</strong> ${reportDate}</p>
              <p><strong>Details:</strong> ${report.details || 'No details'}</p>
              <p><strong>Hospitalized:</strong> 
                <span class="badge ${report.hospitalized === 'yes' ? 'badge-warning' : 'badge-success'}">
                  ${report.hospitalized === 'yes' ? 'Yes' : 'No'}
                </span>
              </p>
            </div>
            <div class="col-md-6">
              <p><strong>Patient:</strong> ${report.name || 'Unknown'}</p>
              <p><strong>Date of Birth:</strong> ${report.dateOfBirth || 'Unknown'}</p>
              <p><strong>Reporting EMS ID:</strong> ${report.reportingEmsID || 'Unknown'}</p>
              <p><strong>Created:</strong> ${report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Unknown'}</p>
            </div>
          </div>
          <div class="text-center margin-top-2">
            <button class="btn btn-warning" onclick="editMedicalReport('${reportId}')">
              <i class="fa fa-edit"></i> Edit Report
            </button>
            <button class="btn btn-danger margin-left-1" onclick="deleteMedicalReport('${reportId}')">
              <i class="fa fa-trash"></i> Delete Report
            </button>
            <button class="btn btn-secondary margin-left-1" onclick="loadMedicalReports('${window.selectedCivilian._id}')">
              <i class="fa fa-arrow-left"></i> Back to List
            </button>
          </div>
        </div>
      </div>
    `;
    
    $('#medicalReportsContent').html(detailsHtml);
  })
  .catch(error => {
    console.error('❌ Failed to load medical report details:', error);
    $('#medicalReportsContent').html(`
      <div class="alert alert-danger">
        <strong>Error loading medical report:</strong><br>
        ${error.message}
      </div>
      <div class="text-center margin-top-2">
        <button class="btn btn-secondary" onclick="loadMedicalReports('${window.selectedCivilian._id}')">
          <i class="fa fa-arrow-left"></i> Back to List
        </button>
      </div>
    `);
  });
}

// Placeholder functions for medication actions
function viewMedication(medicationId) {

  
  // Find the civilian ID from the current context
  const civilianId = window.selectedCivilian?._id;
  if (!civilianId) {
    showToast('No civilian selected', 'danger');
    return;
  }
  
  // Show loading state in the medications content area
  $(`#medicationsContent-${civilianId}`).html(`
    <div class="text-center">
      <div class="lds-facebook"><div></div><div></div><div></div></div>
      <p>Loading medication details...</p>
    </div>
  `);
  
  // Make API call to get medication by ID
  fetch(`${POLICE_CAD_API_URL}/api/v1/medications/${medicationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    
    
    // Display the medication details
    const medication = data.medication;
    const startDate = medication.startDate ? new Date(medication.startDate).toLocaleDateString() : 'Unknown';
    
    const detailsHtml = `
      <div class="panel panel-info">
        <div class="panel-heading">
          <h4 class="panel-title">Medication Details</h4>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-6">
              <p><strong>Start Date:</strong> ${startDate}</p>
              <p><strong>Name:</strong> ${medication.name || 'No name'}</p>
              <p><strong>Dosage:</strong> ${medication.dosage || 'No dosage'}</p>
              <p><strong>Frequency:</strong> ${medication.frequency || 'No frequency'}</p>
            </div>
            <div class="col-md-6">
              <p><strong>Patient:</strong> ${medication.firstName} ${medication.lastName}</p>
              <p><strong>Date of Birth:</strong> ${medication.dateOfBirth || 'Unknown'}</p>
              <p><strong>Created:</strong> ${medication.createdAt ? new Date(medication.createdAt).toLocaleString() : 'Unknown'}</p>
              <p><strong>Last Updated:</strong> ${medication.updatedAt ? new Date(medication.updatedAt).toLocaleString() : 'Unknown'}</p>
            </div>
          </div>
          <div class="text-center margin-top-2">
            <button class="btn btn-warning" onclick="editMedication('${medicationId}')">
              <i class="fa fa-edit"></i> Edit Medication
            </button>
            <button class="btn btn-danger margin-left-1" onclick="deleteMedication('${medicationId}')">
              <i class="fa fa-trash"></i> Delete Medication
            </button>
            <button class="btn btn-secondary margin-left-1" onclick="loadMedicationsForAccordion('${civilianId}').then(medications => displayMedicationsTable(medications, '${civilianId}'))">
              <i class="fa fa-arrow-left"></i> Back to List
            </button>
          </div>
        </div>
      </div>
    `;
    
    $(`#medicationsContent-${civilianId}`).html(detailsHtml);
  })
  .catch(error => {
    console.error('❌ Failed to load medication details:', error);
    $(`#medicationsContent-${civilianId}`).html(`
      <div class="alert alert-danger">
        <strong>Error loading medication:</strong><br>
        ${error.message}
      </div>
      <div class="text-center margin-top-2">
        <button class="btn btn-secondary" onclick="loadMedicationsForAccordion('${civilianId}').then(medications => displayMedicationsTable(medications, '${civilianId}'))">
          <i class="fa fa-arrow-left"></i> Back to List
        </button>
      </div>
    `);
  });
}

function editMedication(medicationId) {

  
  // Find the civilian ID from the current context
  const civilianId = window.selectedCivilian?._id;
  if (!civilianId) {
    showToast('No civilian selected', 'danger');
    return;
  }
  
  // First, get the current medication data
  fetch(`${POLICE_CAD_API_URL}/api/v1/medications/${medicationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    
    
    const medication = data.medication;
    
    // Store the medication data temporarily
    window.editingMedicationData = medication;
    
    // Switch to add medication view (which will now be used for editing)
    showAddMedicationView();
    
    // Now populate the form fields AFTER the view is shown and form is cleared
    setTimeout(() => {
      // Populate the edit form fields
      $('#med-startDate').val(medication.startDate || '');
      $('#med-medicationName').val(medication.name || '');
      $('#med-dosage').val(medication.dosage || '');
      $('#med-frequency').val(medication.frequency || '');
      
      // Store the medication ID for the update
      window.editingMedicationId = medicationId;
      
      // Update the title and button text
      $('#modalTitle').text('Edit Medication');
      $('#addMedicationForm button[type="submit"]').html('<i class="fa fa-save"></i> Update Medication');
      

      
      // Change the form action to update instead of create
      $('#addMedicationForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        updateMedication(medicationId);
      });
    }, 100); // Small delay to ensure the view is fully rendered
  })
  .catch(error => {
    console.error('❌ Failed to load medication for editing:', error);
    showToast('Failed to load medication for editing', 'danger');
  });
}

// Update medication function
function updateMedication(medicationId) {

  
  // Collect form data
  const formData = {
    medication: {
      startDate: $('#med-startDate').val(),
      name: $('#med-medicationName').val(),
      dosage: $('#med-dosage').val(),
      frequency: $('#med-frequency').val(),
      civilianID: $('#med-civilianID').val(),
      activeCommunityID: $('#med-activeCommunityID').val(),
      userID: $('#med-userID').val(),
      firstName: $('#med-firstName').val(),
      lastName: $('#med-lastName').val(),
      dateOfBirth: $('#med-dateOfBirth').val()
    }
  };
  
  // Validate required fields
  if (!formData.medication.civilianID || !formData.medication.name || !formData.medication.dosage || !formData.medication.frequency) {
    showModalError('Please fill in all required fields.');
    return;
  }
  

  
  // Make API call to update medication
  fetch(`${POLICE_CAD_API_URL}/api/v1/medications/${medicationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(formData)
  })
  .then(response => {
    
    if (!response.ok) {
      return response.json().then(errorData => {
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    
    
    // Show success toast
    showToast('Medication updated successfully!', 'success');
    
    // Reset the form and view
    clearMedicationForm();
    window.editingMedicationId = null;
    
    // Switch back to search view
    showSearchView();
    
    // Reload the accordion content for the selected civilian
    if (window.selectedCivilian) {
      const civilianId = window.selectedCivilian._id;
      const name = window.selectedCivilian.name;
      const birthday = window.selectedCivilian.dateOfBirth;
      const deceased = window.selectedCivilian.deceased;
      
      // Reload medical information in the accordion
      loadCivilianMedicalInfo(civilianId, name, birthday, deceased);
    }
  })
  .catch(error => {
    console.error('❌ Failed to update medication:', error);
    showModalError(`Failed to update medication: ${error.message}`);
  });
}

function deleteMedication(medicationId) {

  
  // Find the civilian ID from the current context
  const civilianId = window.selectedCivilian?._id;
  if (!civilianId) {
    showToast('No civilian selected', 'danger');
    return;
  }
  
  // Store the medication ID for deletion
  window.pendingDeleteMedicationId = medicationId;
  
  // Show the custom delete confirmation modal
  $('#deleteMedicationConfirmModal').modal('show');
}

function editMedicalReport(reportId) {

  
  // First, get the current medical report data
  fetch(`${POLICE_CAD_API_URL}/api/v1/medical-reports/${reportId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {

    
    const report = data.report;
    
    // Store the report data temporarily
    window.editingReportData = report;
    
    // Switch to create report view (which will clear the form)
    showCreateReportView();
    
    // Now populate the form fields AFTER the view is shown and form is cleared
    setTimeout(() => {

      
      // Populate the edit form fields
      $('#new-report-date').val(report.date || '');
      $('#new-report-details').val(report.details || '');
      
      // Handle hospitalized field (convert boolean to string for dropdown)
      if (report.hospitalized === true || report.hospitalized === 'yes') {
        $('#new-report-hospitalized').val('yes');
      } else {
        $('#new-report-hospitalized').val('no');
      }
      

      
      // Store the report ID for the update
      window.editingReportId = reportId;
      
      // Update the title and button text
      $('#modalTitle').text('Edit Medical Report');
      $('#createReportForm button[type="submit"]').html('<i class="fa fa-save"></i> Update Report');
      

      
      // Change the form action to update instead of create
      $('#createReportForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        updateMedicalReport(reportId);
      });
    }, 100); // Small delay to ensure the view is fully rendered
  })
  .catch(error => {
    console.error('❌ Failed to load medical report for editing:', error);
    showToast('Failed to load medical report for editing', 'danger');
  });
}

function updateMedicalReport(reportId) {
  
  
  // Collect form data
  const formData = {
    report: {
      date: $('#new-report-date').val(),
      details: $('#new-report-details').val(),
      civilianID: $('#new-report-civilianID').val(),
      reportingEmsID: $('#new-report-reportingEmsID').val(),
      hospitalized: $('#new-report-hospitalized').val() === 'yes',
      activeCommunityID: $('#new-report-activeCommunityID').val(),
      userID: $('#new-report-userID').val(),
      name: $('#new-report-name').val(),
      dateOfBirth: $('#new-report-dateOfBirth').val()
    }
  };
  
  // Validate required fields
  if (!formData.report.civilianID || !formData.report.name || !formData.report.date || !formData.report.details) {
    showModalError('Please fill in all required fields.');
    return;
  }
  

  
  // Make API call to update medical report
  fetch(`${POLICE_CAD_API_URL}/api/v1/medical-reports/${reportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(formData)
  })
  .then(response => {
    
    if (!response.ok) {
      return response.json().then(errorData => {
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    
    
    // Show success toast
    showToast('Medical report updated successfully!', 'success');
    
    // Reset the form and view
    clearMedicalReportForm();
    window.editingReportId = null;
    
    // Switch back to search view
    showSearchView();
    
    // Ensure medical reports tab is active and visible
    $('#reports-tab').parent().addClass('active');
    $('#medications-tab').parent().removeClass('active');
    $('#reports-content').addClass('active').show();
    $('#medications-content').removeClass('active').hide();
    
    // Reload medical reports for the selected civilian with a small delay to ensure view is ready
    if (window.selectedCivilian) {
      setTimeout(() => {
        loadMedicalReports(window.selectedCivilian._id);
      }, 100);
    }
  })
  .catch(error => {
    console.error('❌ Failed to update medical report:', error);
    showModalError(`Failed to update medical report: ${error.message}`);
  });
}

function deleteMedicalReport(reportId) {
  // Store the report ID for the confirmation
  window.pendingDeleteReportId = reportId;
  
  // Show the custom confirmation modal
  $('#deleteConfirmModal').modal('show');
}

// Confirm delete medical report
function confirmDeleteMedicalReport() {
  const reportId = window.pendingDeleteReportId;
  
  if (!reportId) {
    showToast('No medical report selected for deletion', 'danger');
    return;
  }
  
  // Hide the confirmation modal
  $('#deleteConfirmModal').modal('hide');
  
  // Clear the pending delete ID
  window.pendingDeleteReportId = null;
  
  // Show loading state in the medical reports content area
  if (window.selectedCivilian) {
    const civilianId = window.selectedCivilian._id;
    $(`#reportsContent-${civilianId}`).html(`
      <div class="text-center">
        <div class="lds-facebook"><div></div><div></div><div></div></div>
        <p>Deleting medical report...</p>
      </div>
    `);
  }
  
  // Make the DELETE request
  fetch(`${POLICE_CAD_API_URL}/api/v1/medical-reports/${reportId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    showToast('Medical report deleted successfully', 'success');
    
    // Reload the medical reports list
    if (window.selectedCivilian) {
      loadMedicalReports(window.selectedCivilian._id);
      
      // Also refresh the accordion content to show the updated reports
      const civilianId = window.selectedCivilian._id;
      const name = window.selectedCivilian.name;
      const birthday = window.selectedCivilian.dateOfBirth;
      const deceased = window.selectedCivilian.deceased;
      
      // Reload medical information in the accordion
      loadCivilianMedicalInfo(civilianId, name, birthday, deceased);
    }
  })
  .catch(error => {
    console.error('❌ Failed to delete medical report:', error);
    showToast('Failed to delete medical report', 'danger');
    
    // Reload the medical reports list to show current state
    if (window.selectedCivilian) {
      loadMedicalReports(window.selectedCivilian._id);
    }
  });
}



// Recent searches functionality
const RECENT_SEARCHES_KEY = 'ems_recent_searches';
const MAX_RECENT_SEARCHES = 10;

// Add recent search to storage
function addRecentSearch(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') return;
  
  let recentSearches = getRecentSearches();
  
  // Remove if already exists (to move to top)
  recentSearches = recentSearches.filter(search => search.term !== searchTerm.trim());
  
  // Add new search to beginning
  recentSearches.unshift({
    term: searchTerm.trim(),
    timestamp: Date.now(),
    date: new Date().toLocaleDateString()
  });
  
  // Keep only the most recent searches
  if (recentSearches.length > MAX_RECENT_SEARCHES) {
    recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
  }
  
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
}

// Get recent searches from storage
function getRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading recent searches:', e);
    return [];
  }
}

// Remove individual recent search
function removeRecentSearch(searchTerm) {
  let recentSearches = getRecentSearches();
  recentSearches = recentSearches.filter(search => search.term !== searchTerm);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  
  // Refresh the dropdown
  showRecentSearchesDropdown();
}

// Clear all recent searches
function clearAllRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
  hideRecentSearchesDropdown();
}

// Show recent searches dropdown
function showRecentSearchesDropdown() {
  const recentSearches = getRecentSearches();
  
  if (recentSearches.length === 0) {
    hideRecentSearchesDropdown();
    return;
  }
  
  let dropdownHtml = `
    <div id="recentSearchesDropdown" class="recent-searches-dropdown">
      <div class="recent-searches-header">
        <span>Recent Searches</span>
        <button type="button" class="btn btn-sm btn-link text-danger" onclick="clearAllRecentSearches()">
          <i class="fa fa-trash"></i> Clear All
        </button>
      </div>
      <div class="recent-searches-list">
  `;
  
  recentSearches.forEach(search => {
    dropdownHtml += `
      <div class="recent-search-item">
        <span class="recent-search-term" onclick="selectRecentSearch('${search.term}')">${search.term}</span>
        <small class="recent-search-date">${search.date}</small>
        <button type="button" class="btn btn-sm btn-link text-danger" onclick="removeRecentSearch('${search.term}')">
          <i class="fa fa-times"></i>
        </button>
      </div>
    `;
  });
  
  dropdownHtml += `
      </div>
    </div>
  `;
  
  // Remove existing dropdown if any
  $('#recentSearchesDropdown').remove();
  
  // Add new dropdown after search field
  $('#medical-search-name').after(dropdownHtml);
  
  // Show dropdown
  $('#recentSearchesDropdown').fadeIn(200);
}

// Hide recent searches dropdown
function hideRecentSearchesDropdown() {
  $('#recentSearchesDropdown').fadeOut(200, function() {
    $(this).remove();
  });
}

// Select a recent search
function selectRecentSearch(searchTerm) {
  $('#medical-search-name').val(searchTerm);
  hideRecentSearchesDropdown();
  searchMedicalByName();
}

// Toggle recent searches dropdown
function toggleRecentSearchesDropdown() {
  if ($('#recentSearchesDropdown').length > 0) {
    hideRecentSearchesDropdown();
  } else {
    showRecentSearchesDropdown();
  }
}

// Event handlers for the new modal approach
$(document).ready(function() {
  // Initialize the modal to show search view by default
  $('#medicalDatabaseModal').on('show.bs.modal', function() {
    showSearchView();
  });

  // Handle tab switching to ensure content visibility
  $('#medicalDatabaseModal .nav-tabs a').on('click', function(e) {
    e.preventDefault();
    var target = $(this).attr('href');
    
    // Remove active class from all tabs and panes
    $('#medicalDatabaseModal .nav-tabs li').removeClass('active');
    $('#medicalDatabaseModal .tab-pane').removeClass('active').hide();
    
    // Add active class to clicked tab and target pane
    $(this).parent().addClass('active');
    $(target).addClass('active').show();
  });

  // Handle create report form submission
  $('#createReportForm').off('submit').on('submit', function(e) {
    e.preventDefault();
    
    // Check if we're editing or creating
    if (window.editingReportId) {
      updateMedicalReport(window.editingReportId);
    } else {
      createMedicalReport();
    }
  });
  
  // Handle add medication form submission
  $('#addMedicationForm').off('submit').on('submit', function(e) {
    e.preventDefault();
    addMedication();
  });
  
  // Handle search on Enter key
  $('#medical-search-name').off('keydown').on('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchMedicalByName();
    }
  });
  
  // Show recent searches on search field focus
  $('#medical-search-name').off('focus').on('focus', function() {
    showRecentSearchesDropdown();
  });
  
  // Hide recent searches when clicking outside
  $(document).off('click.recentSearches').on('click.recentSearches', function(e) {
    if (!$(e.target).closest('#recentSearchesDropdown, #medical-search-name').length) {
      hideRecentSearchesDropdown();
    }
  });
  
  // Handle delete confirmation
  $('#confirmDeleteBtn').on('click', function() {
    const reportId = window.pendingDeleteReportId;
    if (!reportId) {
      console.error('❌ No report ID found for deletion');
      return;
    }
    
    // Hide the confirmation modal
    $('#deleteConfirmModal').modal('hide');
    
    // Clear the pending delete ID
    window.pendingDeleteReportId = null;
    
    // Show loading state in the main modal
    $('#medicalReportsContent').html('<div class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p>Deleting medical report...</p></div>');
    
    // Make the DELETE request
    fetch(`${POLICE_CAD_API_URL}/api/v1/medical-reports/${reportId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dbUser.token || ''}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      showToast('Medical report deleted successfully', 'success');
      
      // Reload the medical reports list
      if (window.selectedCivilian) {
        loadMedicalReports(window.selectedCivilian._id);
      }
    })
    .catch(error => {
      console.error('❌ Failed to delete medical report:', error);
      showToast('Failed to delete medical report', 'danger');
      
      // Reload the medical reports list to show current state
      if (window.selectedCivilian) {
        loadMedicalReports(window.selectedCivilian._id);
      }
    });
  });
  
  // Clear search field when modal is closed
  $('#medicalDatabaseModal').off('hidden.bs.modal').on('hidden.bs.modal', function() {
    // Clear the search field when modal is closed
    $('#medical-search-name').val('');
    
    // Hide any open dropdowns
    hideRecentSearchesDropdown();
    
    // Reset the search state
    window.previousSearchState = null;
    window.selectedCivilian = null;
  });
  
  // Handle medications delete confirmation
  $('#confirmDeleteMedicationBtn').on('click', function() {
    const medicationId = window.pendingDeleteMedicationId;
    if (!medicationId) {
      console.error('❌ No medication ID found for deletion');
      return;
    }
    
    // Hide the confirmation modal
    $('#deleteMedicationConfirmModal').modal('hide');
    
    // Clear the pending delete ID
    window.pendingDeleteMedicationId = null;
    
    // Find the civilian ID from the current context
    const civilianId = window.selectedCivilian?._id;
    if (!civilianId) {
      showToast('No civilian selected', 'danger');
      return;
    }
    
    // Show loading state in the medications content area
    $(`#medicationsContent-${civilianId}`).html(`
      <div class="text-center">
        <div class="lds-facebook"><div></div><div></div><div></div></div>
        <p>Deleting medication...</p>
      </div>
    `);
    
    // Make the DELETE request
    fetch(`${POLICE_CAD_API_URL}/api/v1/medications/${medicationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dbUser.token || ''}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {

      showToast('Medication deleted successfully', 'success');
      
      // Reload the medications list
      loadMedicationsForAccordion(civilianId).then(medications => {
        $(`#medicationsContent-${civilianId}`).html(
          medications && medications.length > 0 
            ? displayMedicationsTable(medications, civilianId) 
            : '<div class="text-center text-muted"><p>No medications found</p></div>'
        );
      });
    })
    .catch(error => {
      console.error('❌ Failed to delete medication:', error);
      showToast('Failed to delete medication', 'danger');
      
      // Reload the medications list to show current state
      loadMedicationsForAccordion(civilianId).then(medications => {
        $(`#medicationsContent-${civilianId}`).html(
          medications && medications.length > 0 
            ? displayMedicationsTable(medications, civilianId) 
            : '<div class="text-center text-muted"><p>No medications found</p></div>'
        );
      });
    });
  });
  
  // Handle declare alive confirmation
  $('#confirmDeclareAliveBtn').on('click', function() {
    // Hide the confirmation modal
    $('#declareAliveConfirmModal').modal('hide');
    
    // Execute the deceased status change
    executeDeceasedStatusChange();
  });
  
  // Handle pronounce dead confirmation
  $('#confirmPronounceDeadBtn').on('click', function() {
    // Hide the confirmation modal
    $('#pronounceDeadConfirmModal').modal('hide');
    
    // Execute the deceased status change
    executeDeceasedStatusChange();
  });
  
  // Clear search field when modal is closed
});

// Toggle deceased status function
function toggleDeceasedStatus() {
  if (!window.selectedCivilian) {
    showToast('Please select a civilian first.', 'danger');
    return;
  }
  
  const civilianId = window.selectedCivilian._id;
  const civilianName = window.selectedCivilian.name || 'this person';
  const currentStatus = window.selectedCivilian.deceased || false;
  const newStatus = !currentStatus;
  
  // Store the pending status change
  window.pendingDeceasedStatusChange = {
    civilianId: civilianId,
    civilianName: civilianName,
    newStatus: newStatus
  };
  
  // Show appropriate confirmation modal
  if (newStatus) {
    // Show pronounce dead confirmation modal
    $('#pronounceDeadConfirmModal').modal('show');
  } else {
    // Show declare alive confirmation modal
    $('#declareAliveConfirmModal').modal('show');
  }
}

// Execute the deceased status change after confirmation
function executeDeceasedStatusChange() {
  const pendingChange = window.pendingDeceasedStatusChange;
  if (!pendingChange) {
    console.error('❌ No pending deceased status change found');
    return;
  }
  
  const { civilianId, civilianName, newStatus } = pendingChange;
  const actionText = newStatus ? 'pronounce as deceased' : 'declare as alive';
  
  // Hide the confirmation modal first
  if (newStatus) {
    $('#pronounceDeadConfirmModal').modal('hide');
  } else {
    $('#declareAliveConfirmModal').modal('hide');
  }
  
  // Show loading state on the button
  const button = $('#deceasedToggleBtn');
  const originalText = button.html();
  button.html('<i class="fa fa-spinner fa-spin"></i> Updating...').prop('disabled', true);
  
  // Prepare the update data - only send the deceased field
  const updateData = {
    deceased: newStatus
  };
  
  // Make API call to update civilian deceased status
  fetch(`${POLICE_CAD_API_URL}/api/v1/civilian/${civilianId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(updateData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {

    
    // Update the local state
    window.selectedCivilian.deceased = newStatus;
    
    // Update the button text and styling
    updateDeceasedButton(newStatus);
    
    // Show success toast
    const statusText = newStatus ? 'deceased' : 'alive';
    showToast(`${civilianName} has been marked as ${statusText}`, 'success');
    
    // Clear the pending change
    window.pendingDeceasedStatusChange = null;
  })
  .catch(error => {
    console.error('❌ Failed to update civilian deceased status:', error);
    
    // Revert the button to its original state
    button.html(originalText).prop('disabled', false);
    
    // Show error toast
    showToast(`Failed to update ${civilianName}'s status`, 'danger');
    
    // Clear the pending change
    window.pendingDeceasedStatusChange = null;
  })
  .finally(() => {
    // Ensure button is always re-enabled, even if there's an unexpected error
    button.prop('disabled', false);
  });
}

// Update deceased button text and styling based on current status
function updateDeceasedButton(isDeceased) {
  const btn = $('#deceasedToggleBtn');
  const btnText = $('#deceasedBtnText');
  
  // Re-enable the button and remove loading state
  btn.prop('disabled', false);
  btn.html(`
    <i class="fa ${isDeceased ? 'fa-heartbeat' : 'fa-skull-crossbones'}"></i>
    <span id="deceasedBtnText">${isDeceased ? 'Declare Alive' : 'Pronounce Dead'}</span>
  `);
  
  if (isDeceased) {
    btn.removeClass('btn-warning').addClass('btn-success');
    btn.find('i').removeClass('fa-skull-crossbones').addClass('fa-heartbeat');
  } else {
    btn.removeClass('btn-success').addClass('btn-warning');
    btn.find('i').removeClass('fa-heartbeat').addClass('fa-skull-crossbones');
  }
  
  // Update the deceased status badge in the selected civilian info
  if (window.selectedCivilian) {
    const selectedCivilianInfo = $('#selectedCivilianInfo');
    const name = window.selectedCivilian.name;
    const birthday = window.selectedCivilian.dateOfBirth;
    
    if (isDeceased) {
      selectedCivilianInfo.html(`
        <div class="alert alert-success">
          <strong>Selected:</strong> ${name} (DOB: ${birthday})
          <div class="margin-top-1"><span class="badge badge-danger"><i class="fa fa-skull-crossbones"></i> Deceased</span></div>
        </div>
      `);
    } else {
      selectedCivilianInfo.html(`
        <div class="alert alert-success">
          <strong>Selected:</strong> ${name} (DOB: ${birthday})
        </div>
      `);
    }
  }
  
  // Update the deceased badge in the search results
  updateSearchResultsDeceasedBadge(window.selectedCivilian?._id, isDeceased);
}

// Update deceased badge in search results
function updateSearchResultsDeceasedBadge(civilianId, isDeceased) {
  if (!civilianId) return;
  
  // Find the civilian accordion item
  const accordionItem = $(`.civilian-accordion-item[data-civilian-id="${civilianId}"]`);
  if (accordionItem.length === 0) return;
  
  // Find the civilian header where the badge should be displayed
  const civilianHeader = accordionItem.find('.civilian-header');
  if (civilianHeader.length === 0) return;
  
  // Find or create the deceased badge container
  let badgeContainer = civilianHeader.find('.margin-top-1');
  
  if (isDeceased) {
    if (badgeContainer.length === 0) {
      // Create the badge container if it doesn't exist
      civilianHeader.find('.d-flex.justify-content-between > div:first-child').append(`
        <div class="margin-top-1">
          <span class="badge badge-danger deceased-badge">
            <i class="fa fa-skull-crossbones"></i> Deceased
          </span>
        </div>
      `);
    } else {
      // Update existing badge container
      badgeContainer.html(`
        <span class="badge badge-danger deceased-badge">
          <i class="fa fa-skull-crossbones"></i> Deceased
        </span>
      `);
    }
  } else {
    // Remove deceased badge if it exists
    badgeContainer.remove();
  }
}

// Height conversion function
function formatHeight(height, classification) {
  if (!height || height === 'Unknown') return 'Unknown';
  
  if (classification === 'Imperial') {
    // Convert inches to feet and inches
    const totalInches = parseInt(height);
    if (isNaN(totalInches)) return height;
    
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    
    if (feet === 0) {
      return `${inches}"`;
    } else if (inches === 0) {
      return `${feet}'`;
    } else {
      return `${feet}' ${inches}"`;
    }
  } else {
    // For metric, just show as cm
    return `${height} cm`;
  }
}

// Toggle civilian accordion
function toggleCivilianAccordion(civilianId, name, birthday, deceased) {
  // Close all other accordion items first
  $('.civilian-accordion-content').not(`#content-${civilianId}`).slideUp(300);
  $('.accordion-icon').not(`#icon-${civilianId}`).removeClass('fa-chevron-up').addClass('fa-chevron-down');
  
  const contentDiv = $(`#content-${civilianId}`);
  const iconDiv = $(`#icon-${civilianId}`);
  
  if (contentDiv.is(':visible')) {
    // Close this accordion
    contentDiv.slideUp(300);
    iconDiv.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    
    // Clear the selected civilian
    window.selectedCivilian = null;
  } else {
    // Open this accordion
    contentDiv.slideDown(300);
    iconDiv.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    
    // Store the selected civilian globally
    window.selectedCivilian = {
      _id: civilianId,
      name: name,
      dateOfBirth: birthday,
      deceased: deceased
    };
    
    // Load medical information for this civilian
    loadCivilianMedicalInfo(civilianId, name, birthday, deceased);
  }
}

// Load medical information for a civilian in the accordion
function loadCivilianMedicalInfo(civilianId, name, birthday, deceased) {
  const contentDiv = $(`#content-${civilianId}`);
  
  // Show loading state
  contentDiv.html(`
    <div class="accordion-body">
      <div class="text-center">
        <div class="lds-facebook"><div></div><div></div><div></div></div>
        <p>Loading medical information...</p>
      </div>
    </div>
  `);
  
  // Load medical reports and medications
  Promise.all([
    loadMedicalReportsForAccordion(civilianId),
    loadMedicationsForAccordion(civilianId)
  ]).then(([reports, medications]) => {
    // Display the medical information
    displayMedicalInfoInAccordion(civilianId, reports, medications);
    
    // Update the deceased button to show current status
    updateDeceasedButton(deceased);
  });
}

// Load medical reports for accordion display
function loadMedicalReportsForAccordion(civilianId) {
  return new Promise((resolve) => {
    const apiUrl = `${POLICE_CAD_API_URL}/api/v1/medical-reports`;
    const activeCommunityId = dbUser.user.lastAccessedCommunity?.communityID || '';
    
    const params = {
      civilian_id: civilianId,
      active_community_id: activeCommunityId,
      limit: 10,
      page: 0
    };
    
    fetch(`${apiUrl}?${new URLSearchParams(params)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dbUser.token || ''}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Handle different API response structures
      let reports = data;
      let totalRecords = data.length;
      
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        reports = data.medicalReports || data.data || [];
        totalRecords = data.totalRecords || data.total || data.length || reports.length;
      }
      
      // Store the reports data for pagination
      window.currentMedicalReportsParams = {
        civilian_id: civilianId,
        active_community_id: activeCommunityId,
        limit: 10,
        page: 0,
        totalRecords: totalRecords
      };
      
      resolve(reports);
    })
    .catch(error => {
      console.error('❌ Failed to load medical reports for accordion:', error);
      resolve([]);
    });
  });
}

// Load medications for accordion display
function loadMedicationsForAccordion(civilianId) {
  return new Promise((resolve) => {
    const apiUrl = `${POLICE_CAD_API_URL}/api/v1/medications`;
    const activeCommunityId = dbUser.user.lastAccessedCommunity?.communityID || '';
    
    const params = {
      civilian_id: civilianId,
      active_community_id: activeCommunityId,
      limit: 10,
      page: 0
    };
    
    fetch(`${apiUrl}?${new URLSearchParams(params)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dbUser.token || ''}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Handle different API response structures
      let medications = data.medications || [];
      let totalRecords = data.pagination?.totalRecords || medications.length;
      
      // Store the medications data for pagination
      window.currentMedicationsParams = {
        civilian_id: civilianId,
        active_community_id: activeCommunityId,
        limit: 10,
        page: 0,
        totalRecords: totalRecords
      };
      
      resolve(medications);
    })
    .catch(error => {
      console.error('❌ Failed to load medications for accordion:', error);
      resolve([]);
    });
  });
}

// Display medical information in accordion
function displayMedicalInfoInAccordion(civilianId, reports, medications) {
  const contentDiv = $(`#content-${civilianId}`);
  
  let medicalHtml = `
    <div class="accordion-body">
      <div class="row">
        <div class="col-md-12">
          <h5 class="text-center margin-bottom-2">Medical Information</h5>
          
          <!-- Action Buttons -->
          <div class="text-center margin-bottom-2">
            <button class="btn btn-primary btn-md margin-right-1" onclick="showCreateReportView()">
              <i class="fa fa-plus"></i> Create Medical Report
            </button>
            <button class="btn btn-success btn-md margin-right-1" onclick="showAddMedicationView()">
              <i class="fa fa-pills"></i> Add Medication
            </button>
            <button class="btn btn-warning btn-md margin-right-1" id="deceasedToggleBtn" onclick="toggleDeceasedStatus()">
              <i class="fa fa-skull-crossbones"></i> <span id="deceasedBtnText">Pronounce Dead</span>
            </button>
          </div>
          
          <!-- Medical Information Tabs -->
          <ul class="nav nav-tabs" id="medicalTabs-${civilianId}" role="tablist">
            <li class="nav-item active">
              <a class="nav-link active" id="reports-tab-${civilianId}" data-toggle="tab" href="#reports-content-${civilianId}" role="tab">
                <i class="fa fa-file-medical"></i> Medical Reports
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="medications-tab-${civilianId}" data-toggle="tab" href="#medications-content-${civilianId}" role="tab">
                <i class="fa fa-pills"></i> Medications
              </a>
            </li>
          </ul>
          
          <div class="tab-content margin-top-2" id="medicalTabContent-${civilianId}">
            <!-- Medical Reports Tab -->
            <div class="tab-pane active" id="reports-content-${civilianId}" role="tabpanel">
              <div id="medicalReportsContent-${civilianId}">
                ${reports && reports.length > 0 ? displayMedicalReportsTable(reports, civilianId) : '<div class="text-center text-muted"><p>No medical reports found</p></div>'}
              </div>
            </div>
            
            <!-- Medications Tab -->
            <div class="tab-pane" id="medications-content-${civilianId}" role="tabpanel">
              <div id="medicationsContent-${civilianId}">
                ${medications && medications.length > 0 ? displayMedicationsTable(medications, civilianId) : '<div class="text-center text-muted"><p>No medications found</p></div>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  contentDiv.html(medicalHtml);
}

// Display medical reports table for accordion
function displayMedicalReportsTable(reports, civilianId) {
  let tableHtml = `
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Date</th>
            <th>Details</th>
            <th>Hospitalized</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  reports.forEach((report) => {
    let reportDate = 'Unknown';
    
    if (report.reportDate) {
      try {
        reportDate = new Date(report.reportDate).toLocaleDateString();
      } catch (e) {
        reportDate = report.reportDate || 'Unknown';
      }
    }
    
    // Use the correct field names from the API
    const hospitalized = report.hospitalized === 'yes' ? 'Yes' : 'No';
    
    tableHtml += `
      <tr>
        <td>${reportDate}</td>
        <td>${report.details || 'No details'}</td>
        <td><span class="badge ${report.hospitalized === 'yes' ? 'badge-warning' : 'badge-success'}">${hospitalized}</span></td>
        <td>
          <button class="btn btn-sm btn-info" onclick="viewMedicalReport('${report._id}')">
            <i class="fa fa-eye"></i> View
          </button>
          <button class="btn btn-sm btn-warning" onclick="editMedicalReport('${report._id}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMedicalReport('${report._id}')">
            <i class="fa fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  });
  
  tableHtml += `
        </tbody>
      </table>
    </div>
  `;
  
  return tableHtml;
}

// Display medications table for accordion
function displayMedicationsTable(medications, civilianId) {
  let tableHtml = `
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Start Date</th>
            <th>Name</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  medications.forEach((medication) => {
    let startDate = 'Unknown';
    
    if (medication.startDate) {
      try {
        startDate = new Date(medication.startDate).toLocaleDateString();
      } catch (e) {
        startDate = medication.startDate || 'Unknown';
      }
    }
    
    tableHtml += `
      <tr>
        <td>${startDate}</td>
        <td>${medication.name || 'No name'}</td>
        <td>${medication.dosage || 'No dosage'}</td>
        <td>${medication.frequency || 'No frequency'}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="viewMedication('${medication._id}')">
            <i class="fa fa-eye"></i> View
          </button>
          <button class="btn btn-sm btn-warning" onclick="editMedication('${medication._id}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMedication('${medication._id}')">
            <i class="fa fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  });
  
  tableHtml += `
        </tbody>
      </table>
    </div>
  `;
  
  return tableHtml;
}

// Select a civilian and display their information

// EMS Personas Management Functions

// Load EMS personas with pagination
function loadEmsPersonas(page = 0, limit = 20) {
  const activeCommunityID = dbUser.user.lastAccessedCommunity?.communityID;
  const userID = dbUser._id;
  
  if (!activeCommunityID || !userID) {
    console.error('❌ Missing required parameters for loading EMS personas');
    $('#persona-body').html('<tr><td colspan="5" class="text-center text-danger">Error: Missing community or user information</td></tr>');
    return;
  }
  
  // Show loading state
  $('#persona-body').html('<tr><td colspan="5" class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p>Loading personnel...</p></td></tr>');
  
  const params = new URLSearchParams({
    active_community_id: activeCommunityID,
    user_id: userID,
    limit: limit.toString(),
    page: page.toString()
  });
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-personas?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    displayEmsPersonas(data.personas, data.pagination);
  })
  .catch(error => {
    console.error('❌ Failed to load EMS personas:', error);
    $('#persona-body').html('<tr><td colspan="5" class="text-center text-danger">Failed to load personnel. Please try again.</td></tr>');
  });
}

// Display EMS personas in the table
function displayEmsPersonas(personas, pagination) {
  if (!personas || personas.length === 0) {
    $('#persona-body').html('<tr><td colspan="5" class="text-center">No personnel found</td></tr>');
    return;
  }
  
  let personasHtml = '';
  
  personas.forEach((persona) => {
    const createdAt = persona.createdAt ? new Date(persona.createdAt).toLocaleDateString() : 'Unknown';
    

    
          personasHtml += `
        <tr style="cursor: pointer;" onclick="viewEmsPersona('${persona._id}')" title="Click to view details" data-persona-id="${persona._id}">
          <td>${persona.firstName || ''} ${persona.lastName || ''}</td>
          <td>${persona.department || ''}</td>
          <td>${persona.assignmentArea || ''}</td>
          <td>${persona.station || 'N/A'}</td>
          <td>${persona.callSign || 'N/A'}</td>
        </tr>
      `;
  });
  
  $('#persona-body').html(personasHtml);
  
  // Display pagination if there are multiple pages
  if (pagination && pagination.totalPages > 1) {
    displayEmsPersonasPagination(pagination);
  }
}

// Display pagination for EMS personas
function displayEmsPersonasPagination(pagination) {
  const { currentPage, totalPages } = pagination;
  
  let paginationHtml = '<ul class="pagination justify-content-center">';
  
  // Previous button
  if (currentPage > 0) {
    paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="loadEmsPersonas(${currentPage - 1})">Previous</a></li>`;
  }
  
  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    const activeClass = i === currentPage ? 'active' : '';
    paginationHtml += `<li class="page-item ${activeClass}"><a class="page-link" href="#" onclick="loadEmsPersonas(${i})">${i + 1}</a></li>`;
  }
  
  // Next button
  if (currentPage < totalPages - 1) {
    paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="loadEmsPersonas(${currentPage + 1})">Next</a></li>`;
  }
  
  paginationHtml += '</ul>';
  
  // Add pagination below the table
  if ($('#persona-pagination').length === 0) {
    $('#persona-table').after(`<div id="persona-pagination">${paginationHtml}</div>`);
  } else {
    $('#persona-pagination').html(paginationHtml);
  }
}

// Create new EMS persona
function createNewEms() {
  const firstName = $('#first-name').val().trim();
  const lastName = $('#last-name').val().trim();
  const department = $('#department').val();
  const assignmentArea = $('#assignment-area').val().trim();
  const station = $('#station').val().trim();
  const callSign = $('#call-sign').val().trim();
  const activeCommunityID = dbUser.user.lastAccessedCommunity?.communityID;
  const userID = dbUser._id;
  
  // Validation
  if (!firstName || !lastName || !department || !assignmentArea) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }
  
  if (assignmentArea.length > 50) {
    showToast('Assignment area must be 50 characters or less', 'warning');
    return;
  }
  
  if (station && station.length > 5) {
    showToast('Station must be 5 characters or less', 'warning');
    return;
  }
  
  if (callSign && callSign.length > 10) {
    showToast('Call sign must be 10 characters or less', 'warning');
    return;
  }
  
  // Show loading state
  $('#newEmsBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');
  
  const personaData = {
    persona: {
      firstName,
      lastName,
      department,
      assignmentArea,
      station: station || undefined,
      callSign: callSign || undefined,
      activeCommunityID,
      userID
    }
  };
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-personas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(personaData)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(error => {
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    showToast('Personnel created successfully', 'success');
    
    // Clear the form
    clearEmsPersonaForm();
    
    // Hide the modal using proper cleanup
    hideModal('newCivModal');
    
    // Reload the personas list
    loadEmsPersonas();
  })
  .catch(error => {
    console.error('Failed to create EMS persona:', error);
    showToast(`Failed to create personnel: ${error.message}`, 'danger');
  })
  .finally(() => {
    // Reset button state
    $('#newEmsBtn').prop('disabled', false).html('Create Personnel');
  });
}

// Clear EMS persona form
function clearEmsPersonaForm() {
  $('#first-name').val('');
  $('#last-name').val('');
  $('#department').val('EMS');
  $('#assignment-area').val('');
  $('#station').val('');
  $('#call-sign').val('');
}

// View EMS persona details
function viewEmsPersona(personaId) {
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-personas/${personaId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const persona = data.persona;
    const createdAt = persona.createdAt ? new Date(persona.createdAt).toLocaleDateString() : 'Unknown';
    const updatedAt = persona.updatedAt ? new Date(persona.updatedAt).toLocaleDateString() : 'Unknown';
    
    const modalContent = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>First Name:</strong> ${persona.firstName || 'N/A'}</p>
          <p><strong>Last Name:</strong> ${persona.lastName || 'N/A'}</p>
          <p><strong>Department:</strong> ${persona.department || 'N/A'}</p>
          <p><strong>Assignment Area:</strong> ${persona.assignmentArea || 'N/A'}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Station:</strong> ${persona.station || 'N/A'}</p>
          <p><strong>Call Sign:</strong> ${persona.callSign || 'N/A'}</p>
          <p><strong>Created:</strong> ${createdAt}</p>
          <p><strong>Last Updated:</strong> ${updatedAt}</p>
        </div>
      </div>
      <div class="row mt-3">
        <div class="col-12 text-center">
          <button class="btn btn-warning me-2" onclick="editEmsPersona('${personaId}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-danger" onclick="deleteEmsPersona('${personaId}')">
            <i class="fa fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
    
    $('#viewPersonaModal .modal-body').html(modalContent);
    $('#viewPersonaModal').modal('show');
  })
  .catch(error => {
    console.error('Failed to view EMS persona:', error);
    showToast('Failed to load personnel details', 'danger');
  });
}

// Edit EMS persona
function editEmsPersona(personaId) {
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-personas/${personaId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const persona = data.persona;
    
    // Populate the edit form
    $('#edit-persona-id').val(personaId);
    $('#edit-persona-firstName').val(persona.firstName || '');
    $('#edit-persona-lastName').val(persona.lastName || '');
    $('#edit-persona-department').val(persona.department || 'EMS');
    $('#edit-persona-assignmentArea').val(persona.assignmentArea || '');
    $('#edit-persona-station').val(persona.station || '');
    $('#edit-persona-callSign').val(persona.callSign || '');
    
    // Show the edit modal
    $('#editPersonaModal').modal('show');
  })
  .catch(error => {
    console.error('Failed to edit EMS persona:', error);
    showToast('Failed to load personnel for editing', 'danger');
  });
}

// Update EMS persona
function updateEmsPersona() {
  const personaId = $('#edit-persona-id').val();
  const firstName = $('#edit-persona-firstName').val().trim();
  const lastName = $('#edit-persona-lastName').val().trim();
  const department = $('#edit-persona-department').val();
  const assignmentArea = $('#edit-persona-assignmentArea').val().trim();
  const station = $('#edit-persona-station').val().trim();
  const callSign = $('#edit-persona-callSign').val().trim();
  const activeCommunityID = dbUser.user.lastAccessedCommunity?.communityID;
  const userID = dbUser._id;
  
  // Validation
  if (!firstName || !lastName || !department || !assignmentArea) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }
  
  if (assignmentArea.length > 50) {
    showToast('Assignment area must be 50 characters or less', 'warning');
    return;
  }
  
  if (station && station.length > 5) {
    showToast('Station must be 5 characters or less', 'warning');
    return;
  }
  
  if (callSign && callSign.length > 10) {
    showToast('Call sign must be 10 characters or less', 'warning');
    return;
  }
  
  // Show loading state
  $('#updatePersonaBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Updating...');
  
  const personaData = {
    persona: {
      firstName,
      lastName,
      department,
      assignmentArea,
      station: station || undefined,
      callSign: callSign || undefined,
      activeCommunityID,
      userID
    }
  };
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-personas/${personaId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(personaData)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(error => {
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    showToast('Personnel updated successfully', 'success');
    
    // Hide both modals
    $('#editPersonaModal').modal('hide');
    $('#viewPersonaModal').modal('hide');
    
    // Reload the personas list
    loadEmsPersonas();
  })
  .catch(error => {
    console.error('❌ Failed to update EMS persona:', error);
    showToast(`Failed to update personnel: ${error.message}`, 'danger');
  })
  .finally(() => {
    // Reset button state
    $('#updatePersonaBtn').prop('disabled', false).html('Update Personnel');
  });
}

// Delete EMS persona
function deleteEmsPersona(personaId) {
  // Store the persona ID for deletion
  $('#deletePersonaConfirmModal').data('personaId', personaId);
  
  // Show the confirmation modal
  $('#deletePersonaConfirmModal').modal('show');
}

// Confirm delete EMS persona
function confirmDeleteEmsPersona() {
  const personaId = $('#deletePersonaConfirmModal').data('personaId');
  
  if (!personaId) {
    showToast('No personnel selected for deletion', 'danger');
    return;
  }
  
  // Hide the confirmation modal
  $('#deletePersonaConfirmModal').modal('hide');
  
  // Clear the persona ID from the modal
  $('#deletePersonaConfirmModal').removeData('personaId');
  
  // Show loading state in the table
  $(`#persona-body tr[data-persona-id="${personaId}"]`).html('<td colspan="5" class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p>Deleting...</p></td>');
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-personas/${personaId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    showToast('Personnel deleted successfully', 'success');
    
    // Close the view modal if it's open
    $('#viewPersonaModal').modal('hide');
    
    // Reload the personas list
    loadEmsPersonas();
  })
  .catch(error => {
    console.error('❌ Failed to delete EMS persona:', error);
    showToast('Failed to delete personnel', 'danger');
    
    // Reload the personas list to show current state
    loadEmsPersonas();
  });
}

// EMS Vehicles Management Functions

// Load EMS vehicles with pagination
function loadEmsVehicles(page = 0, limit = 20) {
  const activeCommunityID = dbUser.user.lastAccessedCommunity?.communityID;
  const userID = dbUser._id;
  
  if (!activeCommunityID || !userID) {
    console.error('❌ Missing required parameters for loading EMS vehicles');
    $('#vehicle-body').html('<tr><td colspan="4" class="text-center text-danger">Error: Missing community or user information</td></tr>');
    return;
  }
  
  // Show loading state
  $('#vehicle-body').html('<tr><td colspan="4" class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p>Loading vehicles...</p></td></tr>');
  
  const params = new URLSearchParams({
    active_community_id: activeCommunityID,
    user_id: userID,
    limit: limit.toString(),
    page: page.toString()
  });
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-vehicles?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    displayEmsVehicles(data.vehicles, data.pagination);
  })
  .catch(error => {
    console.error('❌ Failed to load EMS vehicles:', error);
    $('#vehicle-body').html('<tr><td colspan="4" class="text-center text-danger">Failed to load vehicles. Please try again.</td></tr>');
  });
}

// Display EMS vehicles in the table
function displayEmsVehicles(vehicles, pagination) {
  if (!vehicles || vehicles.length === 0) {
    $('#vehicle-body').html('<tr><td colspan="4" class="text-center">No vehicles found</td></tr>');
    return;
  }
  
  let vehiclesHtml = '';
  
  vehicles.forEach((vehicle) => {
    // Use the correct data structure - vehicle data is directly on the vehicle object
    const plate = vehicle.plate || '';
    const model = vehicle.model || '';
    const engineNumber = vehicle.engineNumber || '';
    const color = vehicle.color || '';
    
    vehiclesHtml += `
      <tr data-vehicle-id="${vehicle._id}" style="cursor: pointer;" onclick="viewEmsVehicle('${vehicle._id}')" title="Click to view details">
        <td>${plate}</td>
        <td>${model}</td>
        <td>${engineNumber}</td>
        <td>${color || 'N/A'}</td>
      </tr>
    `;
  });
  
  $('#vehicle-body').html(vehiclesHtml);
  
  // Display pagination if there are multiple pages
  if (pagination && pagination.totalPages > 1) {
    displayEmsVehiclesPagination(pagination);
  }
}

// Display pagination for EMS vehicles
function displayEmsVehiclesPagination(pagination) {
  const { currentPage, totalPages } = pagination;
  
  let paginationHtml = '<ul class="pagination justify-content-center">';
  
  // Previous button
  if (currentPage > 0) {
    paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="loadEmsVehicles(${currentPage - 1})">Previous</a></li>`;
  }
  
  // Page numbers
  for (let i = 0; i < totalPages; i++) {
    const activeClass = i === currentPage ? 'active' : '';
    paginationHtml += `<li class="page-item ${activeClass}"><a class="page-link" href="#" onclick="loadEmsVehicles(${i})">${i + 1}</a></li>`;
  }
  
  // Next button
  if (currentPage < totalPages - 1) {
    paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="loadEmsVehicles(${currentPage + 1})">Next</a></li>`;
  }
  
  paginationHtml += '</ul>';
  
  // Add pagination below the table
  if ($('#vehicle-pagination').length === 0) {
    $('#vehicle-table').after(`<div id="vehicle-pagination">${paginationHtml}</div>`);
  } else {
    $('#vehicle-pagination').html(paginationHtml);
  }
}

// Create new EMS vehicle
function createNewEmsVehicle() {
  const plate = $('#plate').val().trim();
  const model = $('#model').val();
  const engineNumber = $('#engineNumber').val().trim();
  const color = $('#color').val().trim();
  const registeredOwner = $('#registeredOwner').val().trim();
  const activeCommunityID = dbUser.user.lastAccessedCommunity?.communityID;
  const userID = dbUser._id;
  
  // Validation
  if (!plate || !model || !engineNumber) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }
  
  if (plate.length > 8) {
    showToast('Plate number must be 8 characters or less', 'warning');
    return;
  }
  
  if (engineNumber.length > 10) {
    showToast('Engine number must be 10 characters or less', 'warning');
    return;
  }
  
  // Show loading state
  $('#newVehicleBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');
  
  const vehicleData = {
    vehicle: {
      plate,
      model,
      engineNumber,
      color: color || undefined,
      registeredOwner: registeredOwner || 'N/A',
      activeCommunityID,
      userID
    }
  };
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(vehicleData)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(error => {
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    showToast('Vehicle created successfully', 'success');
    
    // Clear the form
    clearEmsVehicleForm();
    
    // Hide the modal
    $('#newVehicleModal').modal('hide');
    
    // Reload the vehicles list
    loadEmsVehicles();
  })
  .catch(error => {
    console.error('Failed to create EMS vehicle:', error);
    showToast(`Failed to create vehicle: ${error.message}`, 'danger');
  })
  .finally(() => {
    // Reset button state
    $('#newVehicleBtn').prop('disabled', false).html('Create Vehicle');
  });
}

// Clear EMS vehicle form
function clearEmsVehicleForm() {
  $('#plate').val('');
  $('#model').val('Ambulance');
  $('#engineNumber').val('');
  $('#color').val('');
  $('#registeredOwner').val('');
}

// View EMS vehicle details
function viewEmsVehicle(vehicleId) {
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-vehicles/${vehicleId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const vehicle = data.vehicle;
    const createdAt = vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : 'Unknown';
    const updatedAt = vehicle.updatedAt ? new Date(vehicle.updatedAt).toLocaleDateString() : 'Unknown';
    
    const modalContent = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Plate Number:</strong> ${vehicle.plate || 'N/A'}</p>
          <p><strong>Model:</strong> ${vehicle.model || 'N/A'}</p>
          <p><strong>Engine Number:</strong> ${vehicle.engineNumber || 'N/A'}</p>
          <p><strong>Color:</strong> ${vehicle.color || 'N/A'}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Registered Owner:</strong> ${vehicle.registeredOwner || 'N/A'}</p>
          <p><strong>Created:</strong> ${createdAt}</p>
          <p><strong>Last Updated:</strong> ${updatedAt}</p>
        </div>
      </div>
      <div class="row mt-3">
        <div class="col-12 text-center">
          <button class="btn btn-warning me-2" onclick="editEmsVehicle('${vehicleId}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-danger" onclick="deleteEmsVehicle('${vehicleId}')">
            <i class="fa fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
    
    $('#viewVehicleModal .modal-body').html(modalContent);
    $('#viewVehicleModal').modal('show');
  })
  .catch(error => {
    console.error('Failed to view EMS vehicle:', error);
    showToast('Failed to load vehicle details', 'danger');
  });
}

// Edit EMS vehicle
function editEmsVehicle(vehicleId) {
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-vehicles/${vehicleId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const vehicle = data.vehicle;
    
    // Populate the edit form
    $('#edit-vehicle-id').val(vehicleId);
    $('#edit-vehicle-plate').val(vehicle.plate || '');
    $('#edit-vehicle-model').val(vehicle.model || 'Ambulance');
    $('#edit-vehicle-engineNumber').val(vehicle.engineNumber || '');
    $('#edit-vehicle-color').val(vehicle.color || '');
    
    // Show the edit modal
    $('#editVehicleModal').modal('show');
  })
  .catch(error => {
    console.error('Failed to edit EMS vehicle:', error);
    showToast('Failed to load vehicle for editing', 'danger');
  });
}

// Update EMS vehicle
function updateEmsVehicle() {
  const vehicleId = $('#edit-vehicle-id').val();
  const plate = $('#edit-vehicle-plate').val().trim();
  const model = $('#edit-vehicle-model').val();
  const engineNumber = $('#edit-vehicle-engineNumber').val().trim();
  const color = $('#edit-vehicle-color').val().trim();
  const activeCommunityID = dbUser.user.lastAccessedCommunity?.communityID;
  const userID = dbUser._id;
  
  // Validation
  if (!plate || !model || !engineNumber) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }
  
  if (plate.length > 8) {
    showToast('Plate number must be 8 characters or less', 'warning');
    return;
  }
  
  if (engineNumber.length > 10) {
    showToast('Engine number must be 10 characters or less', 'warning');
    return;
  }
  
  // Show loading state
  $('#updateVehicleBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Updating...');
  
  const vehicleData = {
    vehicle: {
      plate,
      model,
      engineNumber,
      color: color || undefined,
      activeCommunityID,
      userID
    }
  };
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-vehicles/${vehicleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(vehicleData)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(error => {
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    showToast('Vehicle updated successfully', 'success');
    
    // Hide both modals
    $('#editVehicleModal').modal('hide');
    $('#viewVehicleModal').modal('hide');
    
    // Reload the vehicles list
    loadEmsVehicles();
  })
  .catch(error => {
    console.error('❌ Failed to update EMS vehicle:', error);
    showToast(`Failed to update vehicle: ${error.message}`, 'danger');
  })
  .finally(() => {
    // Reset button state
    $('#updateVehicleBtn').prop('disabled', false).html('Update Vehicle');
  });
}

// Delete EMS vehicle
function deleteEmsVehicle(vehicleId) {
  // Store the vehicle ID for deletion
  $('#deleteVehicleConfirmModal').data('vehicleId', vehicleId);
  
  // Show the confirmation modal
  $('#deleteVehicleConfirmModal').modal('show');
}

// Confirm delete EMS vehicle
function confirmDeleteEmsVehicle() {
  const vehicleId = $('#deleteVehicleConfirmModal').data('vehicleId');
  
  if (!vehicleId) {
    showToast('No vehicle selected for deletion', 'danger');
    return;
  }
  
  // Hide the confirmation modal
  $('#deleteVehicleConfirmModal').modal('hide');
  
  // Clear the vehicle ID from the modal
  $('#deleteVehicleConfirmModal').removeData('vehicleId');
  
  // Show loading state in the table
  $(`#vehicle-body tr[data-vehicle-id="${vehicleId}"]`).html('<td colspan="4" class="text-center"><div class="lds-facebook"><div></div><div></div><div></div></div><p>Deleting...</p></td>');
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-vehicles/${vehicleId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    showToast('Vehicle deleted successfully', 'success');
    
    // Close the view modal if it's open
    $('#viewVehicleModal').modal('hide');
    
    // Reload the vehicles list
    loadEmsVehicles();
  })
  .catch(error => {
    console.error('❌ Failed to delete EMS vehicle:', error);
    showToast('Failed to delete vehicle', 'danger');
    
    // Reload the vehicles list to show current state
    loadEmsVehicles();
  });
}

// Create new EMS vehicle (updated for new modal)
function createEmsVehicle() {
  const plate = $('#new-vehicle-plate').val().trim();
  
  // Exit early if form is empty (prevents auto-calls when modal opens)
  if (!plate) {
    return;
  }
  const model = $('#new-vehicle-model').val();
  const engineNumber = $('#new-vehicle-engineNumber').val().trim();
  const color = $('#new-vehicle-color').val().trim();
  const activeCommunityID = dbUser.user.lastAccessedCommunity?.communityID;
  const userID = dbUser._id;
  
  // Validation
  if (!plate || !model || !engineNumber) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }
  
  if (plate.length > 8) {
    showToast('Plate number must be 8 characters or less', 'warning');
    return;
  }
  
  if (engineNumber.length > 10) {
    showToast('Engine number must be 10 characters or less', 'warning');
    return;
  }
  
  // Show loading state
  $('#createVehicleBtn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');
  
  const vehicleData = {
    vehicle: {
      plate,
      model,
      engineNumber,
      color: color || undefined,
      activeCommunityID,
      userID
    }
  };
  
  fetch(`${POLICE_CAD_API_URL}/api/v1/ems-vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    body: JSON.stringify(vehicleData)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(error => {
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    showToast('Vehicle created successfully', 'success');
    
    // Clear the form
    clearNewVehicleForm();
    
    // Hide the modal
    $('#newVehicleModal').modal('hide');
    
    // Reload the vehicles list
    loadEmsVehicles();
  })
  .catch(error => {
    console.error('Failed to create EMS vehicle:', error);
    showToast(`Failed to create vehicle: ${error.message}`, 'danger');
  })
  .finally(() => {
    // Reset button state
    $('#createVehicleBtn').prop('disabled', false).html('Create Vehicle');
  });
}

// Clear new vehicle form
function clearNewVehicleForm() {
  $('#new-vehicle-plate').val('');
  $('#new-vehicle-model').val('');
  $('#new-vehicle-engineNumber').val('');
  $('#new-vehicle-color').val('');
}

// 10-Codes Management Functions

// Global variables for 10-codes
let tenCodesCache = [];
let tenCodeMap = {};

// Load 10-codes when the modal is shown
function loadTenCodes() {
  const communityId = dbUser.user?.lastAccessedCommunity?.communityID;
  if (!communityId) {
    $('#noTenCodesModal').text('Please join a community to view 10-codes.').show();
    $('#tenCodesContent').hide();
    return;
  }

  // Show loading state
  $('#noTenCodesModal').hide();
  $('#tenCodesContent').show();
  $('#tenCodesLeft').html('<div class="text-center" style="color: #f7fafc;"><div class="lds-facebook"><div></div><div></div><div></div></div><p style="margin-top: 10px;">Loading 10-codes...</p></div>');
  $('#tenCodesMiddle').html('');
  $('#tenCodesRight').html('');

  fetch(`${POLICE_CAD_API_URL}/api/v1/community/${communityId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    tenCodesCache = data?.community?.tenCodes || [];
    
    // Build tenCodeMap
    tenCodeMap = {};
    tenCodesCache.forEach(tc => {
      tenCodeMap[tc._id] = tc.code;
    });

    if (tenCodesCache.length === 0) {
      $('#noTenCodesModal').text('No 10-codes available for this community.').show();
      $('#tenCodesContent').hide();
    } else {
      $('#noTenCodesModal').hide();
      $('#tenCodesContent').show();
      displayTenCodes(tenCodesCache);
    }
  })
  .catch(error => {
    console.error('❌ Error loading 10-codes:', error);
    $('#noTenCodesModal').text('Failed to load 10-codes: ' + error.message).show();
    $('#tenCodesContent').hide();
  });
}

// Display 10-codes in three columns
function displayTenCodes(codes) {
  const codesPerColumn = Math.ceil(codes.length / 3);
  
  let leftHtml = '';
  let middleHtml = '';
  let rightHtml = '';

  codes.forEach((code, index) => {
    const codeHtml = `
      <div class="ten-code-item" style="margin-bottom: 15px; padding: 12px; border: 1px solid #35385a; border-radius: 8px; background: #2a2d3e; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <strong style="color: #f7fafc; font-size: 1.1em;">${code.code}</strong><br>
        <span style="color: #a0aec0; font-size: 0.9em; line-height: 1.4;">${code.description}</span>
      </div>
    `;

    if (index < codesPerColumn) {
      leftHtml += codeHtml;
    } else if (index < codesPerColumn * 2) {
      middleHtml += codeHtml;
    } else {
      rightHtml += codeHtml;
    }
  });

  $('#tenCodesLeft').html(leftHtml);
  $('#tenCodesMiddle').html(middleHtml);
  $('#tenCodesRight').html(rightHtml);
}

  // Initialize 10-codes when the modal is shown
  $(document).ready(function() {
    $('#10codesModal').on('shown.bs.modal', function() {
      loadTenCodes();
    });
    
    // Initialize notepad functionality from shared module
    if (typeof initNotepad === 'function') {
      initNotepad();
    }
    
      // Load departments on page load
  if (typeof fetchAndRenderDepartments === 'function') {
    fetchAndRenderDepartments();
  }
  
  // Set up EMS navigation links with proper encoding
  setupEmsNavigation();
  
  // Set up notification modal functionality
  setupNotificationModal();
});

// Toggle caret rotation for departments sidebar
function toggleCaret() {
  const caret = document.querySelector('#toggleDepartment').previousElementSibling.querySelector('.fa-caret-right');
  if (caret) {
    caret.classList.toggle('expanded');
  }
}

// Encode department ID for URL parameters (same as modern dashboard)
function encodeDepartmentId(departmentId) {
  // Simple reversible encoding: convert to base64 and replace some characters
  const base64 = btoa(departmentId);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Set up EMS navigation links with proper encoding
function setupEmsNavigation() {
  // Handle top navigation bar EMS link
  const emsNavLink = document.getElementById('ems-nav-link');
  if (emsNavLink) {
    emsNavLink.addEventListener('click', function(e) {
      e.preventDefault();
      const communityId = this.getAttribute('data-community-id');
      if (communityId) {
        const encodedId = encodeDepartmentId(communityId);
        const url = `/ems-dashboard?dept=EMS&d=${encodedId}`;
        window.location.href = url;
      } else {
        window.location.href = '/ems-dashboard';
      }
    });
  }
  
  // Handle main header EMS link
  const emsHeaderLink = document.getElementById('ems-header-link');
  if (emsHeaderLink) {
    emsHeaderLink.addEventListener('click', function(e) {
      e.preventDefault();
      const communityId = this.getAttribute('data-community-id');
      if (communityId) {
        const encodedId = encodeDepartmentId(communityId);
        const url = `/ems-dashboard?dept=EMS&d=${encodedId}`;
        window.location.href = url;
      } else {
        window.location.href = '/ems-dashboard';
      }
    });
  }
}

// Notification modal functions
function showNotificationModal() {
  const modal = document.getElementById('notificationModal');
  modal.style.display = 'flex';
}

function hideNotificationModal() {
  const modal = document.getElementById('notificationModal');
  modal.style.display = 'none';
  
  // Remove any lingering modal backdrops
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());
  
  // Remove modal-open class from body
  document.body.classList.remove('modal-open');
}

// Set up notification modal event listeners
function setupNotificationModal() {
  // Close button functionality
  const closeBtn = document.getElementById('notificationModalClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideNotificationModal);
  }
  
  // Cancel button functionality
  const cancelBtn = document.getElementById('notificationModalCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideNotificationModal);
  }
  
  // Close modal when clicking outside
  const modal = document.getElementById('notificationModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        hideNotificationModal();
      }
    });
  }
}

// AJAX function to load assigned calls
function loadAssignedCalls() {
  const communityId = dbUser.user?.lastAccessedCommunity?.communityID;
  if (!communityId) return;
  
  // Get the current department ID from the URL query parameters or global variable
  const urlParams = new URLSearchParams(window.location.search);
  const encodedDeptId = urlParams.get('d');
  let currentDepartmentId = null;

  if (encodedDeptId) {
    try {
      // Decode the department ID using browser-compatible atob
      let base64 = encodedDeptId
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      // Add padding back
      while (base64.length % 4) {
        base64 += '=';
      }

      // Use atob for browser compatibility instead of Buffer
      const decoded = atob(base64);
      currentDepartmentId = decoded;
    } catch (e) {
      console.error('Failed to decode department ID:', e);
      currentDepartmentId = null;
    }
  }

  // Fallback to global departmentId if URL param not available
  if (!currentDepartmentId && typeof departmentId !== 'undefined' && departmentId) {
    currentDepartmentId = departmentId;
  }
  
  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/calls/community/${communityId}?status=true`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    success: function(data) {
      const $container = $('#assigned-call-container');
      $container.find('a').remove();
      $container.find('span').remove();
      // Get department name for display
      const urlParams = new URLSearchParams(window.location.search);
      const departmentName = urlParams.get('dept') || 'Current Department';
      
      $container.append(`
        <span>
          <h4>
            ${departmentName} Open Calls 
            <i class="fa fa-info-circle" 
               data-toggle="tooltip" 
               data-placement="top" 
               title="These are only the calls assigned to your current department. Other calls in the community are not shown here." 
               style="color: #17a2b8; cursor: help; margin-left: 8px;"></i>
          </h4>
          <h5>Click for details</h5>
        </span>
      `);
      
      // Initialize tooltips
      $('[data-toggle="tooltip"]').tooltip();
      
      if (data && data.length > 0) {
        // Filter calls to only show those assigned to the current department
        const filteredCalls = data.filter(call => {
          if (!currentDepartmentId) {
            return false;
          }
          const callDepartments = call?.call?.departments || [];
          return callDepartments.includes(currentDepartmentId);
        });
        
        if (filteredCalls.length > 0) {
          filteredCalls.forEach(call => {
            const is911Call = (call?.call?.title?.startsWith('911:') || call?.call?.details?.startsWith('911:'));
            const alertClass = is911Call ? 'alert-danger' : 'alert-success';
            $container.append(
              `<a id="${call._id}" href="javascript:void(0)" onclick="event.stopPropagation(); populateCallDetails('${call._id}');">
                <div class="alert ${alertClass} alert-dismissible show" role="alert">
                  Opened: <span id="${call._id}-createdAt" style="text-transform:capitalize">
                    <time>${call?.call?.createdAt || 'N/A'}</time> | Description: <span id="${call._id}-description">${call?.call?.title || 'N/A'} | ${call?.call?.details || 'N/A'}</span>
                  </span>
                </div>
              </a>`
            );
          });
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const departmentName = urlParams.get('dept') || 'your department';
          $container.append(`<p class="text-center" style="font-style: italic; font-size: 14px">No open calls assigned to ${departmentName} at this time.</p>`);
        }
      } else {
        $container.append('<p class="text-center" style="font-style: italic; font-size: 14px">No open calls at this time.</p>');
      }
    },
    error: function(xhr) {
      console.error('Error loading assigned calls:', xhr.responseText);
      const $container = $('#assigned-call-container');
      $container.find('a').remove();
      $container.find('span').remove();
      $container.append('<p class="text-center" style="font-style: italic; font-size: 14px">⚠️ Issue loading calls, try refreshing the page...</p>');
    }
  });
}

// Populate call details in modal
function populateCallDetails(callId) {
  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/call/${callId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    success: function(call) {
      $('#callIdDetail').val(call._id);
      $('#createdAtCallDetail').text(call?.call?.createdAt ? new Date(call.call.createdAt).toLocaleString() : 'N/A');
      $('#updatedAtCallDetail').text(call?.call?.updatedAt ? new Date(call.call.updatedAt).toLocaleString() : 'N/A');
      $('#callTitleDetail').val(call?.call?.title || '');
      $('#callDetailsDetail').val(call?.call?.details || '');

      // Format call notes
      const callNotes = call?.call?.callNotes || [];
      $('#callNotesDetail').empty();
      if (callNotes.length > 0) {
        callNotes.forEach(note => {
          const isUserNote = note.createdBy === dbUser.user?.username;
          const noteActions = isUserNote ? 
            `<div class="note-actions" style="margin-top: 8px;">
              <button class="btn btn-xs btn-info" onclick="handleEditCallNote('${note._id}', '${note.note?.replace(/'/g, "\\'")}')">
                <i class="fa fa-edit"></i> Edit
              </button>
              <button class="btn btn-xs btn-danger" onclick="handleDeleteCallNote('${note._id}')" style="margin-left: 5px;">
                <i class="fa fa-trash"></i> Delete
              </button>
            </div>` : '';
          
          $('#callNotesDetail').append(
            `<div class="note-item" style="border-bottom: 1px solid #ddd; padding: 10px 0; margin-bottom: 10px;">
              <p><strong>Note:</strong> ${note.note || 'N/A'}</p>
              <p><small><strong>Created By:</strong> ${note.createdBy || 'Unknown'} | 
              <strong>Created At:</strong> ${note.createdAt ? new Date(note.createdAt).toLocaleString() : 'N/A'}</small></p>
              ${noteActions}
            </div>`
          );
        });
      } else {
        $('#callNotesDetail').text('No notes available');
      }

      // Fetch departments
      const communityId = dbUser.user?.lastAccessedCommunity?.communityID;
      $.ajax({
        url: `${POLICE_CAD_API_URL}/api/v1/community/${communityId}/departments`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${dbUser.token || ''}`
        }
      }).done(function(data) {
        const departments = data.departments || [];
        const departmentIds = call?.call?.departments || [];
        const departmentNames = departmentIds
          .map(id => {
            const dept = departments.find(d => d._id === id);
            return dept ? dept.name : null;
          })
          .filter(name => name);
        $('#callDepartmentsDetail').empty();
        if (departmentNames.length > 0) {
          departmentNames.forEach(name => {
            $('#callDepartmentsDetail').append(
              `<span class="badge badge-primary">${name}</span>`
            );
          });
        } else {
          $('#callDepartmentsDetail').text('None');
        }
      }).fail(function(xhr) {
        console.error('Error fetching departments:', xhr.responseText);
        $('#callDepartmentsDetail').text('Error loading departments');
      });

      // Fetch assigned users
      const userIds = call?.call?.assignedTo || [];
      if (userIds.length > 0) {
        const userRequests = userIds.map(userId =>
          $.ajax({
            url: `${POLICE_CAD_API_URL}/api/v1/user/${userId}`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${dbUser.token || ''}`
            }
          })
        );
        $.when.apply($, userRequests).then(function() {
          const responses = userRequests.length === 1 ? [arguments] : Array.from(arguments);
          const users = responses.map((response, index) => ({
            userId: userIds[index],
            username: response[0]?.user?.username || 'Unknown'
          }));
          $('#callAssignedToDetail').empty();
          const validUsers = users.filter(user => user.username !== 'Unknown');
          if (validUsers.length > 0) {
            validUsers.forEach(user => {
              $('#callAssignedToDetail').append(
                `<span class="badge badge-primary">${user.username}</span>`
              );
            });
          } else {
            $('#callAssignedToDetail').text('None');
          }
          $('#callDetailModal').modal('show');
        }, function(xhr) {
          console.error('Error fetching users:', xhr.responseText);
          $('#callAssignedToDetail').text('Error loading users');
          $('#callDetailModal').modal('show');
        });
      } else {
        $('#callAssignedToDetail').text('None');
        $('#callDetailModal').modal('show');
      }
    },
    error: function(xhr) {
      console.error('Error fetching call details:', xhr.responseText);
      alert('Failed to load call details: ' + (xhr.responseJSON?.message || 'Unknown error'));
    }
  });
}

// Handle call update
function handleUpdateCall() {
  const callId = $('#callIdDetail').val();
  const title = $('#callTitleDetail').val();
  const details = $('#callDetailsDetail').val();
  
  if (!title || !details) {
    alert('Please fill in all required fields');
    return;
  }
  
  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/call/${callId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    data: JSON.stringify({
      title: title,
      details: details
    }),
    success: function(data) {
      $('#callDetailModal').modal('hide');
      showToast('Call updated successfully', 'success');
      loadAssignedCalls(); // Refresh call list
    },
    error: function(xhr) {
      console.error('Error updating call:', xhr.responseText);
      alert('Failed to update call: ' + (xhr.responseJSON?.message || 'Unknown error'));
    }
  });
}

// Handle call deletion
function handleDeleteCall() {
  const callId = $('#callIdDetail').val();
  
  if (confirm('Are you sure you want to delete this call? This action cannot be undone.')) {
    $.ajax({
      url: `${POLICE_CAD_API_URL}/api/v1/call/${callId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${dbUser.token || ''}`
      },
      success: function(data) {
        $('#callDetailModal').modal('hide');
        showToast('Call deleted successfully', 'success');
        loadAssignedCalls(); // Refresh call list
      },
      error: function(xhr) {
        console.error('Error deleting call:', xhr.responseText);
        alert('Failed to delete call: ' + (xhr.responseJSON?.message || 'Unknown error'));
      }
    });
  }
}

// Toggle the add note section
function toggleAddNoteSection() {
  const addNoteSection = $('#addNoteSection');
  const addNoteButtonSection = $('#addNoteButtonSection');
  const addNoteIcon = $('#addNoteIcon');
  
  if (addNoteSection.is(':visible')) {
    addNoteSection.hide();
    addNoteButtonSection.hide();
    addNoteIcon.removeClass('fa-minus').addClass('fa-plus');
  } else {
    addNoteSection.show();
    addNoteButtonSection.show();
    addNoteIcon.removeClass('fa-plus').addClass('fa-minus');
    $('#newCallNote').focus();
  }
}

// Handle adding a new call note
function handleAddCallNote() {
  const callId = $('#callIdDetail').val();
  const noteText = $('#newCallNote').val().trim();
  
  if (!noteText) {
    showToast('Please enter a note before submitting', 'warning');
    return;
  }
  
  // Show loading state
  const addNoteBtn = $('#addCallNote');
  const originalText = addNoteBtn.text();
  addNoteBtn.prop('disabled', true).text('Adding...');
  
  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/call/${callId}/note`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    data: JSON.stringify({
      note: noteText,
      createdBy: dbUser.user?.username || 'Unknown'
    }),
    success: function(data) {
      // Clear the note input
      $('#newCallNote').val('');
      
      // Show success message
      showToast('Note added successfully', 'success');
      
      // Hide the add note section
      toggleAddNoteSection();
      
      // Refresh the call details to show the new note
      populateCallDetails(callId);
      
      // Reset button state
      addNoteBtn.prop('disabled', false).text(originalText);
    },
    error: function(xhr) {
      console.error('Error adding call note:', xhr.responseText);
      showToast('Failed to add note: ' + (xhr.responseJSON?.message || 'Unknown error'), 'danger');
      
      // Reset button state
      addNoteBtn.prop('disabled', false).text(originalText);
    }
  });
}

// Handle editing a call note
function handleEditCallNote(noteId, currentText) {
  const newText = prompt('Edit your note:', currentText);
  
  if (newText === null || newText.trim() === '') {
    return; // User cancelled or entered empty text
  }
  
  const callId = $('#callIdDetail').val();
  
  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/call/${callId}/note/${noteId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    data: JSON.stringify({
      note: newText.trim()
    }),
    success: function(data) {
      showToast('Note updated successfully', 'success');
      populateCallDetails(callId); // Refresh to show updated note
    },
    error: function(xhr) {
      console.error('Error updating call note:', xhr.responseText);
      showToast('Failed to update note: ' + (xhr.responseJSON?.message || 'Unknown error'), 'danger');
    }
  });
}

// Handle deleting a call note
function handleDeleteCallNote(noteId) {
  if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
    return;
  }
  
  const callId = $('#callIdDetail').val();
  
  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/call/${callId}/note/${noteId}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    success: function(data) {
      showToast('Note deleted successfully', 'success');
      populateCallDetails(callId); // Refresh to show updated notes
    },
    error: function(xhr) {
      console.error('Error deleting call note:', xhr.responseText);
      showToast('Failed to delete note: ' + (xhr.responseJSON?.message || 'Unknown error'), 'danger');                                                          
    }
  });
}

// ===== STATUS CODES FUNCTIONALITY (Matching Police Dashboard) =====

// Load status codes from API
function loadStatusCodes() {
  const communityId = dbUser.user?.lastAccessedCommunity?.communityID;
  if (!communityId) {
    $('#noTenCodes').text('Please join a community to view status codes.').show();
    $('#quickStatusGrid').hide();
    return;
  }

  if (statusCodesCache.length > 0) {
    displayTenCodes(statusCodesCache);
    return;
  }

  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/community/${communityId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    success: function(data) {
      statusCodesCache = data?.community?.tenCodes || [];

      // Build statusCodeMap
      statusCodeMap = {};
      statusCodesCache.forEach(tc => {
        statusCodeMap[tc._id] = tc.code;
      });

      filteredStatusCodes = statusCodesCache;

      if (statusCodesCache.length === 0) {
        $('#noTenCodes').show();
        $('#quickStatusGrid').hide();
        $('#viewAllCodesBtn').hide();
      } else {
        $('#noTenCodes').hide();
        $('#quickStatusGrid').show();
        $('#viewAllCodesBtn').show();
        displayTenCodes(statusCodesCache);
      }

      // Load current status after statusCodesCache is populated
      loadCurrentStatus();
    },
    error: function(xhr) {
      console.error('Error loading status codes:', xhr.responseText);
      $('#noTenCodes').text('Failed to load status codes: ' + (xhr.responseJSON?.message || 'Unknown error')).show();
      $('#quickStatusGrid').hide();
    }
  });
}

// Toggle show all codes section
function toggleAllCodes() {
  const section = $('#allCodesSection');
  const btn = $('#viewAllCodesBtn');
  if (section.is(':visible')) {
    section.slideUp(200);
    btn.removeClass('expanded');
    btn.find('span').text('View All Codes');
  } else {
    section.slideDown(200);
    btn.addClass('expanded');
    btn.find('span').text('Hide All Codes');
    displayAllCodes(filteredStatusCodes);
  }
}

// Get category for a status code based on common EMS patterns
function getCodeCategory(code, description) {
  const descLower = description.toLowerCase();
  const codeLower = code.toLowerCase();

  // Emergency codes (for red styling)
  if (descLower.includes('emergency') || descLower.includes('code 3') ||
      descLower.includes('critical') || descLower.includes('trauma') ||
      descLower.includes('cardiac arrest') || descLower.includes('signal 100') ||
      codeLower.includes('signal 100') || code === '10-33' || code === '10-99') {
    return 'emergency';
  }
  // Offline/End of shift
  if (descLower.includes('off duty') || descLower.includes('end of') ||
      descLower.includes('out of service') || descLower.includes('off shift') ||
      code === '10-42' || code === '10-7') {
    return 'offline';
  }
  // Busy - EMS specific
  if (descLower.includes('busy') || descLower.includes('on scene') ||
      descLower.includes('transporting') || descLower.includes('en route') ||
      descLower.includes('at hospital') || descLower.includes('patient') ||
      code === '10-6' || code === '10-17' || code === '10-19') {
    return 'busy';
  }
  // Available
  if (descLower.includes('available') || descLower.includes('in service') ||
      descLower.includes('clear') || descLower.includes('standing by') ||
      code === '10-8' || code === '10-41') {
    return 'available';
  }
  return '';
}

// Display quick status grid with most common EMS codes
function displayQuickStatusCodes(codes) {
  const quickGrid = $('#quickStatusGrid');
  quickGrid.empty();

  // Define preferred EMS quick codes in order of priority
  const preferredCodes = [
    'signal 100', // Emergency (if available)
    '10-99',      // Officer Needs Assistance (Panic)
    '10-8',       // In Service / Available
    '10-7',       // Out of Service
    '10-6',       // Busy
    '10-17',      // En Route
    '10-19',      // Returning to Station
    '10-23',      // Arrived on Scene
    '10-97',      // Arrived at Scene
  ];

  // Find matching codes from the available codes
  const quickCodes = [];
  preferredCodes.forEach(preferred => {
    const found = codes.find(c => c.code.toLowerCase() === preferred.toLowerCase());
    if (found && !quickCodes.includes(found)) {
      quickCodes.push(found);
    }
  });

  // Also look for EMS-specific descriptions if we don't have 8 codes yet
  const emsKeywords = ['available', 'in service', 'out of service', 'en route',
                       'on scene', 'transporting', 'at hospital', 'clear'];
  if (quickCodes.length < 8) {
    codes.forEach(code => {
      if (quickCodes.length >= 8) return;
      const descLower = code.description.toLowerCase();
      const hasEmsKeyword = emsKeywords.some(kw => descLower.includes(kw));
      if (hasEmsKeyword && !quickCodes.find(qc => qc._id === code._id)) {
        quickCodes.push(code);
      }
    });
  }

  // If we still don't have 8, fill with remaining codes
  if (quickCodes.length < 8) {
    codes.forEach(code => {
      if (quickCodes.length >= 8) return;
      if (!quickCodes.find(qc => qc._id === code._id)) {
        quickCodes.push(code);
      }
    });
  }

  quickCodes.forEach(code => {
    const category = getCodeCategory(code.code, code.description);
    const isActive = currentTenCodeID === code._id ? 'active' : '';
    const isPanic = code.code.toLowerCase() === '10-99';
    const panicBadge = isPanic ? `<span class="panic-badge"><svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v5h-2z"/></svg>PANIC</span>` : '';
    quickGrid.append(
      `<div class="status-card ${category} ${isActive}"
           data-ten-code-id="${code._id}"
           onclick="selectTenCode('${code._id}')"
           title="${code.description}">
        ${panicBadge}
        <div class="status-card-code">${code.code}</div>
        <div class="status-card-desc">${code.description}</div>
      </div>`
    );
  });
}

// Display all codes in the expanded section
function displayAllCodes(codes) {
  const allGrid = $('#allCodesGrid');
  allGrid.empty();

  codes.forEach(code => {
    const category = getCodeCategory(code.code, code.description);
    const isActive = currentTenCodeID === code._id ? 'active' : '';
    allGrid.append(
      `<div class="code-list-item ${category} ${isActive}"
           data-ten-code-id="${code._id}"
           onclick="selectTenCode('${code._id}')"
           title="${code.description}">
        <span class="code-list-code">${code.code}</span>
        <span class="code-list-desc">${code.description}</span>
      </div>`
    );
  });
}

// Function to display 10-codes with the new UI
function displayTenCodes(codes) {
  // Display quick status grid
  displayQuickStatusCodes(codes);

  // If all codes section is visible, update it too
  if ($('#allCodesSection').is(':visible')) {
    displayAllCodes(codes);
  }

  // Also update the old modal grid for backward compatibility
  displayStatusCodes(codes);
}

// Display status codes in modal grid (for backward compatibility)
function displayStatusCodes(codes) {
  const codesToDisplay = filteredStatusCodes.length > 0 ? filteredStatusCodes : codes;

  $('#statusCodesGrid').empty();

  codesToDisplay.forEach(code => {
    const codeHtml = `
      <div class="heroui-code-card" onclick="selectStatusCode('${code._id}')">
        <div class="heroui-code-number">${code.code}</div>
        <div class="heroui-code-description">${code.description}</div>
      </div>
    `;
    $('#statusCodesGrid').append(codeHtml);
  });
}

// Handle status code selection from quick grid
function selectTenCode(tenCodeID) {
  if (!tenCodeID) {
    console.error('Invalid tenCodeID:', tenCodeID);
    showToast('Invalid status code selected.', 'danger');
    return;
  }

  // Verify status code in cache
  const tenCode = statusCodesCache.find(tc => tc._id === tenCodeID);
  if (!tenCode) {
    console.error('Status code not found in cache:', tenCodeID);
    showToast('Selected status code not found.', 'danger');
    return;
  }

  // Immediately update UI for responsive feel
  currentTenCodeID = tenCodeID;
  $('#currentStatusCode').text(tenCode.code);
  updateStatusCardHighlights(tenCodeID);

  updateStatus(tenCodeID);
}

// Handle status code selection from modal
function selectStatusCode(statusCodeID) {
  if (!statusCodeID) {
    console.error('Invalid statusCodeID:', statusCodeID);
    showToast('Invalid status code selected.', 'danger');
    return;
  }

  // Verify status code in cache
  const statusCode = statusCodesCache.find(sc => sc._id === statusCodeID);
  if (!statusCode) {
    console.error('Status code not found in cache:', statusCodeID);
    showToast('Selected status code not found.', 'danger');
    return;
  }

  // Update UI
  currentTenCodeID = statusCodeID;
  $('#currentStatusCode').text(statusCode.code);
  updateStatusCardHighlights(statusCodeID);

  updateStatus(statusCodeID);
  $('#statusCodesModal').modal('hide');
}

// Update status card highlights based on current status
function updateStatusCardHighlights(activeCodeId) {
  // Remove active class from all cards
  $('.status-card, .code-list-item').removeClass('active');
  // Add active class to current status
  if (activeCodeId) {
    $(`.status-card[data-ten-code-id="${activeCodeId}"]`).addClass('active');
    $(`.code-list-item[data-ten-code-id="${activeCodeId}"]`).addClass('active');
  }

  // Update emergency state on the current status badge
  updateEmergencyBadgeState(activeCodeId);
}

// Update the current status badge to show emergency pulsing if needed
function updateEmergencyBadgeState(activeCodeId) {
  const $badge = $('#currentStatusBadge');

  if (activeCodeId) {
    // Find the ten code data
    const tenCode = statusCodesCache.find(tc => tc._id === activeCodeId);
    if (tenCode) {
      const category = getCodeCategory(tenCode.code, tenCode.description);
      if (category === 'emergency') {
        $badge.addClass('emergency');
        return;
      }
    }
  }

  // Remove emergency class if not an emergency status
  $badge.removeClass('emergency');
}

// Update user status
function updateStatus(statusCode) {
  const userId = dbUser._id;
  const communityId = dbUser.user?.lastAccessedCommunity?.communityID;
  const activeDeptId = typeof departmentId !== 'undefined' ? departmentId : null;
  const activeDeptName = typeof departmentName !== 'undefined' ? (departmentName || 'Fire/EMS') : 'Fire/EMS';
  const data = {
    departmentID: dbUser.user?.lastAccessedCommunity?.departmentID,
    tenCodeID: statusCode,
    activeDepartmentId: activeDeptId,
    activeDepartmentName: activeDeptName
  };

  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/community/${communityId}/members/${userId}/tenCode`,
    method: 'PUT',
    data: JSON.stringify(data),
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    success: function(res) {
      const status = statusCodeMap[statusCode] || 'Unknown';
      showToast(`Status updated to: ${status}`, 'success');

      // Emit socket event to notify other clients (dispatch, other users)
      if (window.dashboardSocket && window.dashboardSocket.connected) {
        window.dashboardSocket.emit('update_status', {
          userID: userId,
          status: status,
          statusCode: statusCode,
          setBy: dbUser.user.username,
          communityId: communityId,
          updateDuty: false,
          activeDepartmentId: activeDeptId,
          activeDepartmentName: activeDeptName
        });
      }
    },
    error: function(xhr) {
      console.error('Error updating status:', xhr.responseText);
      showToast('Failed to update status: ' + (xhr.responseJSON?.message || 'Unknown error'), 'danger');
    }
  });
}

// Load current status
function loadCurrentStatus() {
  const userId = dbUser._id;
  const communityId = dbUser.user?.lastAccessedCommunity?.communityID;

  $.ajax({
    url: `${POLICE_CAD_API_URL}/api/v1/community/${communityId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${dbUser.token || ''}`
    },
    success: function(data) {
      const tenCodeID = data?.community?.members[userId]?.tenCodeID;
      if (tenCodeID && statusCodeMap[tenCodeID]) {
        currentTenCodeID = tenCodeID;
        $('#currentStatusCode').text(statusCodeMap[tenCodeID]);
        updateStatusCardHighlights(tenCodeID);
      } else {
        currentTenCodeID = null;
        $('#currentStatusCode').text('--');
        updateStatusCardHighlights(null);
      }
    },
    error: function(xhr) {
      console.error('Error loading current status:', xhr.responseText);
      $('#currentStatusCode').text('--');
    }
  });
}

// Filter 10-codes based on search
function filterTenCodes(searchTerm) {
  searchTerm = searchTerm.toLowerCase();
  filteredStatusCodes = statusCodesCache.filter(code =>
    code.code.toLowerCase().includes(searchTerm) ||
    code.description.toLowerCase().includes(searchTerm)
  );
  currentPage = 1;
  // Update both quick grid and all codes section
  displayTenCodes(filteredStatusCodes);
  if ($('#allCodesSection').is(':visible')) {
    displayAllCodes(filteredStatusCodes);
  }
}

// Initialize status codes functionality
$(document).ready(function() {
  // Load status codes and current status on page load
  if (dbUser && dbUser.user?.lastAccessedCommunity) {
    // Load status codes first, then current status
    loadStatusCodes();
  }

  // Search functionality for the expanded section
  $('#tenCodeSearch').on('input', function() {
    const searchTerm = $(this).val();
    filterTenCodes(searchTerm);
  });

  // Search functionality for the modal (backward compatibility)
  $('#statusCodeSearch').on('input', function() {
    const searchTerm = $(this).val().toLowerCase();

    if (searchTerm === '') {
      filteredStatusCodes = statusCodesCache;
    } else {
      filteredStatusCodes = statusCodesCache.filter(code =>
        code.code.toLowerCase().includes(searchTerm) ||
        code.description.toLowerCase().includes(searchTerm)
      );
    }

    displayStatusCodes(filteredStatusCodes);
  });
});