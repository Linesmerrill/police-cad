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

function markAsRead() {
  document.cookie = "notification-symbol=v3.1.0";
  $("#notification-symbol").removeClass("notif");
  $("#notification-count").text("");
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

function populateBoloDetails(id) {
  var socket = io();
  socket.emit("load_police_bolos", dbUser);
  socket.on("load_police_bolos_result", (res) => {
    for (const i in res) {
      if (res[i]._id != id) {
        continue;
      } else if (res[i]._id == id) {
        $("#boloTypeDetail").val(res[i].bolo.boloType);
        $("#locationDetail").val(res[i].bolo.location);
        $("#descriptionDetail").val(res[i].bolo.description);
        $("#boloIDDetail").val(res[i]._id);
        $("#createdByDetail").text(res[i].bolo.reportingOfficerUsername);
        var createdDate = new Date(res[i].bolo.createdAt);
        $("#createdAtDetail").text(createdDate.toLocaleString());
        if (res[i].bolo.updatedAt == null || res[i].bolo.updatedAt == "") {
          $("#updatedAtDetail").text("N/A");
        } else {
          var updatedDate = new Date(res[i].bolo.updatedAt);
          $("#updatedAtDetail").text(updatedDate.toLocaleString());
        }
      } else {
        //IDK we have issues
      }
    }
  });
}

function populateCallDetails(callID) {
  var socket = io();
  socket.emit("get_call_by_id", callID);
  socket.on("load_call_by_id_result", (res) => {
    //debug log
    // console.log(res)
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

$("#updateBolo").one("click", function () {
  var val = $(this).attr("value");
  var socket = io();
  $("#update-bolo-form").submit(function (e) {
    e.preventDefault(); //prevents page from reloading

    if (val == "update") {
      var myReq = {
        action: "update",
        boloID: $("#boloIDDetail").val(),
        boloType: $("#boloTypeDetail").val(),
        location: $("#locationDetail").val(),
        description: $("#descriptionDetail").val(),
      };
      socket.emit("update_bolo_info", myReq);
    }
    return true;
  });
});

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

$("#deleteBolo").one("click", function () {
  var val = $(this).attr("value");
  var socket = io();
  $("#delete-bolo-form").submit(function (e) {
    e.preventDefault(); //prevents page from reloading

    if (val == "delete") {
      var myReq = {
        action: "delete",
        boloID: $("#boloIDDetail").val(),
        boloType: $("#boloTypeDetail").val(),
        location: $("#locationDetail").val(),
        description: $("#descriptionDetail").val(),
      };
      socket.emit("delete_bolo_info", myReq);
    }

    return true;
  });
  $("#boloDetailModal").modal("hide");
});

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

function markAsRead() {
  document.cookie = "notification-symbol=v3.1.0";
  $("#notification-symbol").removeClass("notif");
  $("#notification-count").text("");
}
