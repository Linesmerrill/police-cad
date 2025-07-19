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

function hideModal(modalID) {
  $("#" + modalID).modal("hide");
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

function hideArrestReportPopover() {
  if ($("#civIDArrest").val().length < 1) {
    $("#civIDArrest").popover("show");
    $("#arrest-form").attr("onsubmit", "return false;");
  } else {
    $("#civIDArrest").popover("hide");
    $("#arrest-form").attr("onsubmit", "return true;");
  }
}

function hideCivPopover() {
  $("#civ-first-name").popover("hide");
  $("#civ-last-name").popover("hide");
}

function hideWarrantClearPopover() {
  $("#confirmWarrantModal").hide();
}

function OpenClearWarrant(firstName, lastName, id, dob) {
  $("#warrant-clear-civ-first-name").val(firstName);
  $("#warrant-clear-civ-last-name").val(lastName);
  $("#civIDWarrantClear").val(id);
  $("#warrant-clear-civ-dob").val(dob);
  $("#searchWarrantClearDiv").hide();
}

function clearBolo(boloID) {
  $("#bolo-ID").val(boloID);
  $("#bolo-clear-date").val(new Date());
}

function fillAccountDetails() {
  $("#accountEmail").val(dbUser.user.email);
  $("#accountUsername").val(dbUser.user.username);
  $("#accountCallSign").val(dbUser.user.callSign);
}

function cancelUsername() {
  $("#accountUsername").val(dbUser.user.username);
  $("#updateUsernameBtns").hide();
}

function cancelCallSign() {
  $("#accountCallSign").val(dbUser.user.callSign);
  $("#updateCallSignBtns").hide();
}

// function populateBoloDetails(id) {
//   var socket = io();
//   socket.emit("load_police_bolos", dbUser);
//   socket.on("load_police_bolos_result", (res) => {
//     for (const i in res) {
//       if (res[i]._id != id) {
//         continue;
//       } else if (res[i]._id == id) {
//         $("#boloTypeDetail").val(res[i].bolo.boloType);
//         $("#locationDetail").val(res[i].bolo.location);
//         $("#descriptionDetail").val(res[i].bolo.description);
//         $("#boloIDDetail").val(res[i]._id);
//         $("#createdByDetail").text(res[i].bolo.reportingOfficerUsername);
//         var createdDate = new Date(res[i].bolo.createdAt);
//         $("#createdAtDetail").text(createdDate.toLocaleString());
//         if (res[i].bolo.updatedAt == null || res[i].bolo.updatedAt == "") {
//           $("#updatedAtDetail").text("N/A");
//         } else {
//           var updatedDate = new Date(res[i].bolo.updatedAt);
//           $("#updatedAtDetail").text(updatedDate.toLocaleString());
//         }
//       } else {
//         //IDK we have issues
//       }
//     }
//   });
// }

function populateCallDetails(callID) {
  var socket = io();
  socket.emit("get_call_by_id", callID);
  socket.on("load_call_by_id_result", (res) => {
    var createdDate = new Date(res.call.createdAt);
    if (
      res.call.updatedAt === "" ||
      res.call.updatedAt === undefined ||
      res.call.updatedAt === "undefined"
    ) {
      $("#updatedAtCallDetail").empty().text("N/A");
    } else {
      var updatedDate = new Date(res.call.updatedAt);
      $("#updatedAtCallDetail").empty().text(updatedDate.toLocaleString());
    }
    $("#createdAtCallDetail").empty().text(createdDate.toLocaleString());
    $("#descriptionCallDetail").empty().text(res.call.shortDescription);
    $("#callNotesDetail").empty().text(res.call.callNotes);
    let selectedClassifiers = "";
    if (res.call.classifier != undefined && res.call.classifier != null) {
      for (let i = 0; i < res.call.classifier.length; i++) {
        switch (res.call.classifier[i].toLowerCase()) {
          case "police":
            selectedClassifiers += `<span class="badge badge-primary">${res.call.classifier[i]}</span>  `;
            break;
          case "0":
            selectedClassifiers += `<span class="badge badge-primary">Police</span>  `;
            break;
          case "fire":
            selectedClassifiers += `<span class="badge badge-danger">${res.call.classifier[i]}</span>  `;
            break;
          case "1":
            selectedClassifiers += `<span class="badge badge-danger">Fire</span>  `;
            break;
          case "ems":
            selectedClassifiers += `<span class="badge badge-success">${res.call.classifier[i]}</span>  `;
            break;
          case "2":
            selectedClassifiers += `<span class="badge badge-success">EMS</span>  `;
            break;
          default:
            selectedClassifiers += `<span class="badge badge-secondary">${res.call.classifier[i]}</span>  `;
            break;
        }
      }
    } else {
      selectedClassifiers += `<span class="badge badge-warn">N/A</span>  `;
    }
    $("#classifier").empty().html(selectedClassifiers);
    if (
      res.call.assignedFireEms != undefined &&
      res.call.assignedFireEms != null
    ) {
      if (res.call.assignedFireEms.length === 1) {
        $("#engines")
          .empty()
          .html(
            `<span class="badge badge-danger">Dispatched (${res.call.assignedFireEms.length}) Resource</span>`
          );
      } else {
        $("#engines")
          .empty()
          .html(
            `<span class="badge badge-danger">Dispatched (${res.call.assignedFireEms.length}) Resources</span>`
          );
      }
    } else {
      $("#engines").empty().html(`<span class="badge badge-warn">N/A</span>  `);
    }
  });
}

function populatePanicDetails(id) {
  $("#panic-id").val(id);
}

function updateStatus(status) {
  var socket = io();
  var onDuty = null;
  var updateDuty = false;
  if (status == "10-41") {
    onDuty = true;
    updateDuty = true;
    status = "Online";
  } else if (status == "10-42") {
    onDuty = false;
    updateDuty = true;
    status = "Offline";
  }
  myReq = {
    userID: dbUser._id,
    status: status,
    setBy: "Self",
    onDuty: onDuty,
    updateDuty: updateDuty,
  };

  socket.emit("update_status", myReq);
}

var panicButtonEnabled = true;

function panicButtonPressed() {
  if (panicButtonEnabled) {
    var socket = io();
    myReq = {
      userID: dbUser._id,
      userUsername: dbUser.user.username,
      activeCommunity: dbUser.user.activeCommunity,
    };
    if ($("#panic-button-check-sound").prop("checked")) {
      var audioElement = document.createElement("audio");
      audioElement.setAttribute(
        "src",
        "/static/audio/Police_panic_button_sound_adj.mp3"
      );
      audioElement.volume = dbUser.user.alertVolumeLevel / 100 || 0.1;
      // audioElement.play();
    }

    socket.emit("panic_button_update", myReq);
    panicButtonEnabled = false;
  }
}

// $("#updateBolo").one("click", function () {
//   var val = $(this).attr("value");
//   var socket = io();
//   $("#update-bolo-form").submit(function (e) {
//     e.preventDefault(); //prevents page from reloading

//     if (val == "update") {
//       var myReq = {
//         action: "update",
//         boloID: $("#boloIDDetail").val(),
//         boloType: $("#boloTypeDetail").val(),
//         location: $("#locationDetail").val(),
//         description: $("#descriptionDetail").val(),
//       };
//       socket.emit("update_bolo_info", myReq);
//     }
//     return true;
//   });
// });

$("#createBolo").one("click", function () {
  var socket = io();
  $("#create-bolo-form").submit(function (e) {
    e.preventDefault(); //prevents page from reloading
    var myCreateReq = {
      boloType: $("#type option:selected").text(),
      location: $("#location").val(),
      communityID: dbUser.user.activeCommunity,
      description: $("#description").val(),
      reportingOfficerUsername: dbUser.user.username,
      reportingOfficerID: dbUser._id,
    };
    socket.emit("create_bolo", myCreateReq);
    return true;
  });
  $("#boloModal").modal("hide");
});

// $("#deleteBolo").one("click", function () {
//   var val = $(this).attr("value");
//   var socket = io();
//   $("#delete-bolo-form").submit(function (e) {
//     e.preventDefault(); //prevents page from reloading

//     if (val == "delete") {
//       var myReq = {
//         action: "delete",
//         boloID: $("#boloIDDetail").val(),
//         boloType: $("#boloTypeDetail").val(),
//         location: $("#locationDetail").val(),
//         description: $("#descriptionDetail").val(),
//       };
//       socket.emit("delete_bolo_info", myReq);
//     }

//     return true;
//   });
//   $("#boloDetailModal").modal("hide");
// });

$("#clearPanic").one("click", function () {
  var socket = io();
  $("#clear-panic-form").submit(function (e) {
    e.preventDefault(); //prevents page from reloading
    var myReq = {
      userID: $("#panic-id").val(),
      communityID: dbUser.user.activeCommunity,
    };
    socket.emit("clear_panic", myReq);
    panicButtonEnabled = true;

    var myUpdateReq = {
      userID: $("#panic-id").val(),
      status: "10-8",
      setBy: "System",
      onDuty: null,
      updateDuty: false,
    };
    socket.emit("update_status", myUpdateReq);
    return true;
  });
  $("#panicDetailModal").modal("hide");
});

function hideModal(modalID) {
  $("#" + modalID).modal("hide");
}

//Clears bolo form on button press because we are using sockets
function clearBoloForm() {
  document.getElementById("create-bolo-form").reset();
}

// Notepad functionality - using shared module
// The shared notepad module is loaded separately and provides all notepad functionality

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
      url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/users/${userId}/notes/${noteId}`,
      method: 'DELETE',
      success: function(response) {
        // Remove the note from the user object
        if (dbUser.user.notes) {
          dbUser.user.notes = dbUser.user.notes.filter(n => n._id !== noteId);
        }
        // Update our local array to match
        userNotepadNotes = [...dbUser.user.notes];
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

// Helper function to check if ID is a valid MongoDB ObjectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
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
      url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/users/${userId}/notes/${noteId}`,
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
        userNotepadNotes = [...dbUser.user.notes];
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
      url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/users/${userId}/notes`,
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
          userNotepadNotes = [...dbUser.user.notes];
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

// Initialize notepad functionality from shared module
$(document).ready(function() {
  // Initialize the shared notepad module
  if (typeof initNotepad === 'function') {
    initNotepad();
  }
});

function clearTextarea() {
  $("#notepad-textarea").val("");
}

$("#ticketModal").on("hidden.bs.modal", function () {
  $("#civID").popover("hide");
});

$("#warningModal").on("hidden.bs.modal", function () {
  $("#civIDWarning").popover("hide");
});

$("#arrestModal").on("hidden.bs.modal", function () {
  $("#civIDArrest").popover("hide");
});

$("#createWarrantModal").on("hidden.bs.modal", function () {
  $("#civIDWarrant").popover("hide");
});

$("#clearWarrantModal").on("hidden.bs.modal", function () {
  $("#civIDWarning").popover("hide");
});

// removes all the names from caching on the website when the modal is closed
// $('#nameDatabaseModal').on('hidden.bs.modal', function (e) {
//   let civDetails=document.getElementById('civDetails')
//   civDetails.style.display='none'
// })

$("#plateDatabaseModal").on("hidden.bs.modal", function () {
  $(this).find("form").trigger("reset");
  $("#plateDetails").removeAttr("style").hide();
  $("#stolenMessage").removeAttr("style").hide();
});

function togglePanicBtnSound() {
  var socket = io();
  socket.emit("update_panic_btn_sound", dbUser);
  socket.on("load_panic_btn_result", (res) => {
    $("#panic-button-check-sound").prop("checked", !res.user.panicButtonSound);
    $("#successfully-updated-alert")
      .removeClass("hide")
      .addClass("show")
      .delay(2000)
      .fadeOut(1000, function () {
        $(this).addClass("hide").removeClass("show");
      });
  });
}

function adjustAlertVolumeSlider() {
  var socket = io();
  var volumeAmount = $("#alert-volume-slider").val();
  var myObj = {
    dbUser: dbUser,
    volume: volumeAmount,
  };
  socket.emit("update_alert_volume_slider", myObj);
  socket.on("load_alert_volume_result", (res) => {
    $("#successfully-updated-alert")
      .removeClass("hide")
      .addClass("show")
      .delay(2000)
      .fadeOut(1000, function () {
        $(this).addClass("hide").removeClass("show");
      });
  });
}

function loadCitations(civID) {
  $(`#ticket-body-${civID}`).empty(); //clears the table before loading results
  var data = {
    civID: civID,
  };
  var socket = io();
  socket.emit("search_citation", data);
  socket.on("load_citation_result", (res) => {
    res.forEach((citation) => {
      $(`#ticket-body-${civID}`)
        .append(
          `<tr id="${citation._id}">
          <td>
            ${citation.ticket.date}
          </td>
          <td>
            ${citation.ticket.violation}
          </td>
          <td>
            $${citation.ticket.amount}
          </td>
          <td class="text-align-center">
            <a class='clickable' onclick="deleteCitation('${citation._id}', '${civID}')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a>
          </td>
      </tr>`
        )
        .fadeTo(1, function () {
          $(this).add();
        });
    });
  });
}

function loadWarnings(civID) {
  $(`#warning-body-${civID}`).empty();
  var data = {
    civID: civID,
  };
  var socket = io();
  socket.emit("search_warnings", data);
  socket.on("load_warnings_result", (res) => {
    res.forEach((citation) => {
      $(`#warning-body-${civID}`)
        .append(
          `<tr id="${citation._id}">
          <td>
            ${citation.ticket.date}
          </td>
          <td>
            ${citation.ticket.violation}
          </td>
          <td class="text-align-center">
            <a class='clickable' onclick="deleteWarning('${citation._id}', '${civID}')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a>
          </td>
      </tr>`
        )
        .fadeTo(1, function () {
          $(this).add();
        });
    });
  });
}

function openNameDatabase(registeredOwner, activeCommunityID) {
  var activeCommID = "";
  if (activeCommunityID != null && activeCommunityID != undefined) {
    activeCommID = activeCommunityID;
  }
  if (registeredOwner == null || registeredOwner == undefined) {
    if (activeCommID.length == 0) {
      return (document.location.href = `name-search?firstName=&lastName=&dateOfBirth=&activeCommunityID=${activeCommID}`);
    }
    return (document.location.href = `name-search?firstName=&lastName=&activeCommunityID=${activeCommID}`);
  }
  let nameAndDOB = registeredOwner.split(" | ");
  if (nameAndDOB != null && nameAndDOB != undefined) {
    if (nameAndDOB.length !== 2) {
      if (activeCommID.length == 0) {
        return (document.location.href = `name-search?firstName=&lastName=&dateOfBirth=&activeCommunityID=${activeCommID}`);
      }
      return (document.location.href = `name-search?firstName=&lastName=&activeCommunityID=${activeCommID}`);
    }
  }
  let firstNameLastName = nameAndDOB[0].split(" ");
  if (firstNameLastName != null && firstNameLastName != undefined) {
    if (firstNameLastName.length !== 2) {
      if (activeCommID.length == 0) {
        return (document.location.href = `name-search?firstName=&lastName=&dateOfBirth=&activeCommunityID=${activeCommID}`);
      }
      return (document.location.href = `name-search?firstName=&lastName=&activeCommunityID=${activeCommID}`);
    }
  }
  //check to see if we are in a community, if we are not,
  //then we need to use the DOB to do the name search
  if (activeCommID.length == 0) {
    let dob = nameAndDOB[1].split(" ");
    if (dob != null && dob != undefined) {
      if (dob.length !== 2) {
        return (document.location.href = `name-search?firstName=${firstNameLastName[0].trim()}&lastName=${firstNameLastName[1].trim()}&dateOfBirth=&activeCommunityID=${activeCommID}`);
      }
      return (document.location.href = `name-search?firstName=${firstNameLastName[0].trim()}&lastName=${firstNameLastName[1].trim()}&dateOfBirth=${
        dob[1]
      }&activeCommunityID=${activeCommID}`);
    }
  }
  return (document.location.href = `name-search?firstName=${firstNameLastName[0].trim()}&lastName=${firstNameLastName[1].trim()}&activeCommunityID=${activeCommID}`);
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

// Notepad functions are now provided by the shared notepad.js module
