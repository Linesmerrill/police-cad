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

// All notepad functionality is now provided by the shared notepad.js module

// Core dashboard functions and event handlers
function togglePanicBtnSound() {
  var socket = io();
  var myReq = {
    userID: dbUser._id,
    panicButtonSound: $("#panic-button-check-sound").prop("checked"),
  };
  socket.emit("update_panic_button_sound", myReq);
}

function adjustAlertVolumeSlider() {
  var socket = io();
  var myReq = {
    userID: dbUser._id,
    alertVolumeLevel: $("#alert-volume-slider").val(),
  };
  socket.emit("update_alert_volume", myReq);
}

function loadCitations() {
  var socket = io();
  var myReq = {
    userID: dbUser._id,
    communityID: dbUser.user.activeCommunity,
  };
  socket.emit("load_citations", myReq);
}

function loadWarnings() {
  var socket = io();
  var myReq = {
    userID: dbUser._id,
    communityID: dbUser.user.activeCommunity,
  };
  socket.emit("load_warnings", myReq);
}

function openNameDatabase() {
  $("#nameDatabaseModal").modal("show");
}

// Modal event handlers
$("#ticketModal").on("show.bs.modal", function () {
  hideTicketCivPopover();
});

$("#warningModal").on("show.bs.modal", function () {
  hideWarningCivPopover();
});

$("#arrestModal").on("show.bs.modal", function () {
  hideArrestReportPopover();
});

$("#createWarrantModal").on("show.bs.modal", function () {
  hideCivPopover();
});

$("#clearWarrantModal").on("show.bs.modal", function () {
  hideWarrantClearPopover();
});

$("#plateDatabaseModal").on("show.bs.modal", function () {
  // Reset form when modal opens
  document.getElementById("plate-search-form").reset();
});

// Initialize notepad functionality from shared module
$(document).ready(function() {
  // Initialize the shared notepad module
  if (typeof initNotepad === 'function') {
    initNotepad();
  }
});
