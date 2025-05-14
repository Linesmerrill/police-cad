// add in a delete function as it is not supported as of jQuery {whatever-version-we-have}
$.delete = function (url, data, callback, type) {
  if ($.isFunction(data)) {
    (type = type || callback), (callback = data), (data = {});
  }

  return $.ajax({
    url: url,
    type: "DELETE",
    success: callback,
    data: data,
    contentType: type,
  });
};

// function loadDriversLicense(myVar, index) {
//   //setup pre-reqs on license
//   $("#drivers-license").clear();
//   $(".donor-block").removeClass("show").addClass("hide");
//   $(".veteran-block").removeClass("show").addClass("hide");
//   $(".delete-license-btn").removeClass("show").addClass("hide");
//   $(".create-license-btn").removeClass("show").addClass("hide");
//   $("#licenseStatusViewLic")
//     .text("Valid")
//     .removeClass("color-red")
//     .addClass("color-black");

//   var firstName = myVar[index].civilian.firstName;
//   var lastName = myVar[index].civilian.lastName;
//   var birthday = myVar[index].civilian.birthday;
//   var createdDate = new Date(myVar[index].civilian.createdAt);
//   var expDay = createdDate.getDate();
//   var expMonth = createdDate.getMonth() + 1;
//   var expYear = createdDate.getFullYear() + 10;

//   // since gender, height, weight, eyecolor, haircolor, donor and veteran is optional,
//   // we will do a check to see if its undefined or empty and if so just set it to an
//   // empty string (or false for booleans), otherwise set it to the value from the db.
//   var gender =
//     myVar[index].civilian.gender == undefined ||
//     myVar[index].civilian.gender == ""
//       ? ""
//       : myVar[index].civilian.gender.charAt(0); //we only want the first character ('M', 'F', 'N')

//   height = myVar[index].civilian.height;
//   weight = myVar[index].civilian.weight;
//   var eyeColor =
//     myVar[index].civilian.eyeColor == undefined ||
//     myVar[index].civilian.eyeColor == ""
//       ? ""
//       : myVar[index].civilian.eyeColor.substring(0, 3); //only grab first 3 characters of string
//   var hairColor =
//     myVar[index].civilian.hairColor == undefined ||
//     myVar[index].civilian.hairColor == ""
//       ? ""
//       : myVar[index].civilian.hairColor.substring(0, 3); //only grab first 3 characters of string
//   var donor =
//     myVar[index].civilian.organDonor == undefined ||
//     myVar[index].civilian.organDonor == ""
//       ? false
//       : myVar[index].civilian.organDonor;
//   var veteran =
//     myVar[index].civilian.veteran == undefined ||
//     myVar[index].civilian.veteran == ""
//       ? false
//       : myVar[index].civilian.veteran;

//   $("#civilianID").val(myVar[index]._id);
//   $("#civilianIDViewLic").text("DL: " + myVar[index]._id);
//   $("#firstNameLic").text(firstName);
//   $("#lastNameLic").text(lastName);
//   $("#sexLic").text(gender);
//   $("#heightLic").text(height);
//   $("#weightLic").text(weight);
//   $("#eyeLic").text(eyeColor);
//   $("#hairLic").text(hairColor);
//   if (donor === true) {
//     $(".donor-block").removeClass("hide").addClass("show");
//   }
//   if (veteran === true) {
//     $(".veteran-block").removeClass("hide").addClass("show");
//   }
//   switch (myVar[index].civilian.licenseStatus) {
//     case "1": //valid license
//       $("#drivers-license").removeClass("hide").addClass("show");
//       $("#licenseStatusViewLic")
//         .text("Valid")
//         .removeClass("color-red")
//         .addClass("color-black");
//       $(".delete-license-btn").removeClass("hide").addClass("show");
//       $(".create-license-btn").removeClass("show").addClass("hide");
//       break; //javascript standard to put this here
//     case "2": //revoked license
//       $("#drivers-license").removeClass("hide").addClass("show");
//       $("#licenseStatusViewLic")
//         .text("Revoked")
//         .removeClass("color-black")
//         .addClass("color-red");
//       $(".delete-license-btn").removeClass("hide").addClass("show");
//       $(".create-license-btn").removeClass("show").addClass("hide");
//       break; //javascript standard to put this here
//     default: // '3' or no license
//       $("#drivers-license").removeClass("show").addClass("hide");
//       $(".create-license-btn").removeClass("hide").addClass("show");
//       $("#licenseStatusViewLic")
//         .text("None")
//         .removeClass("color-black")
//         .addClass("color-red");
//   }
//   var licenseDOB = birthday.split("-");
//   if (licenseDOB.length == 3) {
//     $("#birthdayViewLic").text(
//       licenseDOB[1] + "/" + licenseDOB[2] + "/" + licenseDOB[0]
//     );
//   } else {
//     $("#birthdayViewLic").text(birthday);
//   }
//   $("#warrantsView").val(myVar[index].civilian.warrants);
//   // set firearm license id status
//   var firearmStatus = "";
//   switch (myVar[index].civilian.firearmLicense.trim()) {
//     case "1":
//       firearmStatus = "None";
//       break;
//     case "2":
//       firearmStatus = "Valid";
//       break;
//     case "3":
//       firearmStatus = "Revoked";
//       break;
//     default:
//       firearmStatus = "N/A";
//       break;
//   }
//   $("#firearm-id-status").text(firearmStatus);
//   $("#firearm-id-name").text(`${firstName} ${lastName}`);
//   $("#addressViewLic").text(myVar[index].civilian.address);
//   $("#license-expiration").text(
//     expMonth.toString().padStart(2, "0") +
//       "/" +
//       expDay.toString().padStart(2, "0") +
//       "/" +
//       expYear
//   ); //Janky AF
//   $("#license-issued").text(
//     createdDate.toLocaleDateString("en-US", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//     })
//   );
// }

// function loadTicketsAndWarnings(index) {
//   $("#warningTable tbody").empty();
//   $("#citationTable tbody").empty();
//   var parameters = {
//     civID: index,
//   };
//   $.get("/tickets", parameters, function (data) {
//     data.forEach(function (e) {
//       if (e.ticket.isWarning) {
//         var newRowContent =
//           "<tr><td>" +
//           e.ticket.date +
//           "</td><td>" +
//           e.ticket.violation +
//           "</td></tr>";
//         $("#warningTable tbody").append(newRowContent);
//       } else {
//         var newRowContent =
//           "<tr><td>" +
//           e.ticket.date +
//           "</td><td>" +
//           e.ticket.violation +
//           "</td><td>" +
//           "$" +
//           e.ticket.amount +
//           "</td></tr>";
//         $("#citationTable tbody").append(newRowContent);
//       }
//     });
//   });
// }

function loadArrests(index) {
  $("#arrestTable tbody").empty();
  var parameters = {
    civID: index,
  };
  $.get("/arrests", parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent =
        "<tr><td>" +
        e.arrestReport.date +
        "</td><td>" +
        e.arrestReport.charges +
        "</td><td>" +
        e.arrestReport.summary +
        "</td></tr>";
      $("#arrestTable tbody").append(newRowContent);
    });
  });
}

function loadReports(index) {
  $("#reportsTable tbody").empty();
  var parameters = {
    civID: index,
  };
  $.get("/medical-reports", parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent =
        `<tr id="` +
        e._id +
        `"><td>` +
        e.report.date +
        `</td><td style='text-transform: capitalize;'>` +
        e.report.hospitalized +
        `</td><td style='text-transform: capitalize;'>` +
        e.report.details +
        `</td><td class="text-align-center"><a class='clickable' onclick="deleteReport('` +
        e._id +
        `', '` +
        e.report.civilianID +
        `')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td></tr>`;
      $("#reportsTable tbody").append(newRowContent);
    });
  });
}

function loadMedications(index) {
  $("#medication-civilian-id").val(index);
  $("#medicationsTable tbody").empty();
  var parameters = {
    civID: index,
  };
  $.get("/medications", parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent =
        '<tr id="' +
        e._id +
        '"><td>' +
        e.medication.startDate +
        "</td><td style='text-transform: capitalize;'>" +
        e.medication.name +
        "</td><td>" +
        e.medication.dosage +
        "</td><td>" +
        e.medication.frequency +
        "</td><td class=\"text-align-center\"><a class='clickable' onclick=\"deleteMedication('" +
        e._id +
        '\')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td></tr>';
      $("#medicationsTable tbody").append(newRowContent);
    });
  });
}

function loadConditions(index) {
  $("#condition-civilian-id").val(index);
  $("#conditionsTable tbody").empty();
  var parameters = {
    civID: index,
  };
  $.get("/conditions", parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent =
        '<tr id="' +
        e._id +
        '"><td>' +
        e.condition.dateOccurred +
        "</td><td style='text-transform: capitalize;'>" +
        e.condition.name +
        "</td><td>" +
        e.condition.details +
        "</td><td class=\"text-align-center\"><a class='clickable' onclick=\"deleteCondition('" +
        e._id +
        '\')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td></tr>';
      $("#conditionsTable tbody").append(newRowContent);
    });
  });
}

function deleteReport(id, civilianID) {
  var parameters = {
    reportID: id,
  };
  $.delete("/reports/" + id, parameters, function (data) {
    $(`table#reportsTable tr#` + id).remove();
  });
}

function deleteMedication(id) {
  var parameters = {
    medicationID: id,
  };
  $.delete("/medications/" + id, parameters, function (data) {
    $("table#medicationsTable tr#" + id).remove();
  });
}

function deleteCondition(id) {
  var parameters = {
    conditionID: id,
  };
  $.delete("/conditions/" + id, parameters, function (data) {
    $("table#conditionsTable tr#" + id).remove();
  });
}

function createNewCiv() {
  $("#civ-first-name").popover("hide");
  $("#civ-last-name").popover("hide");
}

function clearHelpText() {
  $("#firstName").popover("hide");
  $("#lastName").popover("hide");
}

function generateSerialNumber(length, inputID) {
  var result = "";
  var characters = "ABCDEFGHJKMNPQRSTUVWXYZ0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  $("#" + inputID).val(result);
}

function showList() {
  $(".dataTables_filter").hide();
  $("#personas-table-div").show();
  $("#personas-thumbnail").hide();
  $("#app-icon-personas").addClass("inactive-icon").removeClass("active-icon");
  $("#list-icon-personas").addClass("active-icon").removeClass("inactive-icon");
  document.cookie = "persona_icon=list";
}

// function showVehicleList() {
//   $(".dataTables_filter").hide();
//   $("#vehicles-table-div").show();
//   $("#vehicles-thumbnail").hide();
//   $("#app-icon-vehicles").addClass("inactive-icon").removeClass("active-icon");
//   $("#list-icon-vehicles").addClass("active-icon").removeClass("inactive-icon");
//   document.cookie = "vehicle_icon=list";
// }

function showFirearmsList() {
  $(".dataTables_filter").hide();
  $("#firearms-table-div").show();
  $("#firearms-thumbnail").hide();
  $("#app-icon-firearms").addClass("inactive-icon").removeClass("active-icon");
  $("#list-icon-firearms").addClass("active-icon").removeClass("inactive-icon");
  document.cookie = "firearm_icon=list";
}

function hideLicenseNotice() {
  document.cookie = "license_notice=hidden";
  $("#license-notice").hide();
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

function loadCivSocketData(civID) {
  $("#civilian-details-loading").removeClass("hide").addClass("show");
  $("#civilian-details").removeClass("show").addClass("hide");
  var socket = io();
  var myReq = {
    civID: civID,
  };
  socket.emit("lookup_civ_by_id", myReq);
  socket.on("load_civ_by_id_result", (res) => {
    //load civ data into UI
    populateCivSocketDetails(res);
    // populateVehicleDetails(res);
    // populateFirearmDetails(res);
    // populateLicenseDetails(res);
  });
  getLinkedVehicles(0);
  getLinkedFirearms(0);
  $("#civilian-details-loading").removeClass("show").addClass("hide");
  $("#civilian-details").removeClass("hide").addClass("show");
}

// function populateVehicleDetails(res) {
//   $("#vehicle-owner").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
//   pageVeh = 0;
//   getVehicles();
// }

// function populateFirearmDetails(res) {
//   $("#firearm-owner").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
//   $("#roFirearm").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
//   $("#firearmOwnerID").val(`${res._id}`);
//   pageGun = 0;
//   getFirearms();
// }

// function populateLicenseDetails(res) {
//   $("#license-owner").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
//   pageLicense = 0;
//   getLicenses();
// }

// function loadVehSocketData(vehID) {
//   var socket = io();
//   var myReq = {
//     vehID: vehID,
//   };
//   socket.emit("lookup_veh_by_id", myReq);
//   socket.on("load_veh_by_id_result", (res) => {
//     //load vehicle data into UI
//     populateVehSocketDetails(res);
//   });
// }

// function loadFirearmSocketData(firearmID) {
//   var socket = io();
//   var myReq = {
//     firearmID: firearmID,
//   };
//   socket.emit("lookup_firearm_by_id", myReq);
//   socket.on("load_firearm_by_id_result", (res) => {
//     //load firearm data into UI
//     populateFirearmSocketDetails(res);
//   });
// }

// function populateFirearmSocketDetails(res) {
//   $("#firearmID").val(res._id);
//   $("#serial-number-details").val(res.firearm.serialNumber);
//   $("#weapon-type-details").val(res.firearm.weaponType);
//   //Because from the backend we already split the person_id from the person name and dob, we now
//   //need to rejoin those values back together for #registeredOwner-details
//   if (res.firearm.registeredOwner == "N/A") {
//     $("#registeredOwner-details").val(`${res.firearm.registeredOwner}`);
//   } else {
//     $("#registeredOwner-details").val(
//       `${res.firearm.registeredOwnerID}+${res.firearm.registeredOwner}`
//     );
//   }
//   $("#is-stolen-details").val(res.firearm.isStolen);
// }

// function loadLicenseSocketData(licenseID) {
//   var socket = io();
//   var myReq = {
//     licenseID: licenseID,
//   };
//   socket.emit("lookup_license_by_id", myReq);
//   socket.on("load_license_by_id_result", (res) => {
//     //load license data into UI
//     populateLicenseSocketDetails(res);
//   });
// }

// function populateLicenseSocketDetails(res) {
//   $("#licenseID").val(res._id);
//   $("#licenseOwnerID").val(res.license.ownerID);
//   $("#license-type-details").val(res.license.licenseType);
//   $("#license-status-details").val(res.license.status);
//   $("#expirationDate-details").val(res.license.expirationDate);
//   $("#additionalNotes-details").val(res.license.additionalNotes);
// }

function getAge(date) {
  var today = new Date();
  var yearDiff = today.getFullYear() - date.getFullYear();
  var monthDiff = today.getMonth() - date.getMonth();
  var dayDiff = today.getDate() - date.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    yearDiff--;
  }
  return yearDiff;
}

function convertToYYYYMMDD(dateString) {
  if (!dateString) return ""; // Handle null or empty input

  // Regular expressions for date formats
  const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/; // Matches YYYY-MM-DD
  const ddmmyyyyRegex = /^\d{2}\/\d{2}\/\d{4}$/; // Matches DD/MM/YYYY

  // Already in YYYY-MM-DD format
  if (yyyymmddRegex.test(dateString)) {
    // Validate date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return dateString; // Valid date, return as-is
    }
    console.warn(`Invalid date in YYYY-MM-DD format: ${dateString}`);
    return "";
  }

  // Convert DD/MM/YYYY to YYYY-MM-DD
  if (ddmmyyyyRegex.test(dateString)) {
    const [day, month, year] = dateString.split("/");
    const converted = `${year}-${month}-${day}`;
    // Validate converted date
    const date = new Date(converted);
    if (!isNaN(date.getTime())) {
      return converted; // Valid date, return converted format
    }
    console.warn(`Invalid date in DD/MM/YYYY format: ${dateString}`);
    return "";
  }

  // Unrecognized format
  console.warn(`Unrecognized date format: ${dateString}`);
  return "";
}

function populateCivSocketDetails(res) {
  $("#civilian-details-loading").removeClass("hide").addClass("show");
  $("#civilian-details").removeClass("show").addClass("hide");
  // loadDriversLicenseSocket(res);
  console.log(res);
  var name = res.civilian.name;
  var lastName = res.civilian.lastName;
  const formattedBirthday = convertToYYYYMMDD(res.civilian.birthday);
  var birthday = formattedBirthday;
  var createdDate = new Date(res.civilian.createdAt);
  var onParole = res.civilian.onParole;
  var onProbation = res.civilian.onProbation;
  var expDay = createdDate.getDate();
  var expMonth = createdDate.getMonth() + 1;
  var expYear = createdDate.getFullYear() + 10;

  // pre-reqs to clear form between civilian clicks
  $("#height-imperial-view").prop("checked", false);
  $("#height-metric-view").prop("checked", false);
  $("#foot-view").val("");
  $("#inches-view").val("");
  $("#centimeters-view").val("");
  $("#imperial-weight-view").prop("checked", false);
  $("#pounds-view").val("");
  $("#metric-weight-view").prop("checked", false);
  $("#eye-color-view").val("");
  $("#hair-color-view").val("");
  $("#weightView").val("");
  $("#heightView").val("");
  $("#deceasedView").text(res.civilian.deceased);

  // civilian details:
  $("#civilianID").val(res._id);
  $("#civilianIDView").text(res._id);
  $("#firstName").text(name);
  $("#lastNameView").text(lastName);
  $("#birthdayView").text(birthday);
  $("#warrantsView").val(res.civilian.warrants);
  // set firearm license id status
  var firearmStatus = "";
  switch (res.civilian.firearmLicense.trim()) {
    case "1":
      firearmStatus = "None";
      break;
    case "2":
      firearmStatus = "Valid";
      break;
    case "3":
      firearmStatus = "Revoked";
      break;
    default:
      firearmStatus = "N/A";
      break;
  }
  $("#firearm-id-status").text(firearmStatus);
  $("#firearm-id-name").text(`${firstName} ${lastName}`);
  $("#addressView").val(res.civilian.address);
  $("#occupationView").val(res.civilian.occupation);
  const civilianName =
    res.civilian.name || "--"
      ? encodeURIComponent(res.civilian.name)
      : "Unknown";
  $("#civilianImageView").attr(
    "src",
    `https://ui-avatars.com/api/?name=${civilianName}&background=808080&color=fff&size=256`
  );
  $("#ageView").val(res.civilian.age);
  $("#weightView").val(res.civilian.weight);
  $("#heightView").val(res.civilian.height);
  $("#zipCodeView").val(res.civilian.addressZip);
  $("#middleInitial").val(res.civilian.middleInitial);

  // advanced civilian details:
  $("#gender-view").val(res.civilian.gender);
  $("#eye-color-view").val(res.civilian.eyeColor);
  $("#hair-color-view").val(res.civilian.hairColor);

  //to clear out the form from previous caching, we will just set it to false if it cannot be found in myVar
  if (res.civilian.organDonor == undefined || res.civilian.organDonor == null) {
    $("#organ-donor-view").prop("checked", false);
  } else {
    $("#organ-donor-view").prop("checked", res.civilian.organDonor);
  }
  //to clear out the form from previous caching, we will just set it to false if it cannot be found in myVar
  if (res.civilian.veteran == undefined || res.civilian.veteran == null) {
    $("#veteran-view").prop("checked", false);
  } else {
    $("#veteran-view").prop("checked", res.civilian.veteran);
  }
  if (res.civilian.onParole == undefined || res.civilian.onParole == null) {
    $("#onParole-view").prop("checked", false);
  } else {
    $("#onParole-view").prop("checked", res.civilian.onParole);
  }
  if (
    res.civilian.onProbation == undefined ||
    res.civilian.onProbation == null
  ) {
    $("#onProbation-view").prop("checked", false);
  } else {
    $("#onProbation-view").prop("checked", res.civilian.onProbation);
  }

  // data to be set for condition form
  $("#condition-civ-first-name").val(firstName);
  $("#condition-civ-last-name").val(lastName);
  $("#condition-civ-date-of-birth").val(birthday);

  // data to be set for medication form
  $("#medication-civ-first-name").val(firstName);
  $("#medication-civ-last-name").val(lastName);
  $("#medication-civ-date-of-birth").val(birthday);

  // data to be sent to db for civ deletion
  $("#firstName").val(name);
  $("#lastName").val(lastName);
  $("#delBirthday").val(birthday);

  $("#civilian-details-loading").removeClass("show").addClass("hide");
  $("#civilian-details").removeClass("hide").addClass("show");
}

/* loadDriversLicenseSocket will execute whenever a socket civilian is clicked on.
After a page reload, this data will be stored in memory so this method
will not be called at that point in time. Ideally to save on memory inside the app
we should probably swap to use sockets all the time. */
// function loadDriversLicenseSocket(res) {
//   //setup pre-reqs on license
//   $(".donor-block").removeClass("show").addClass("hide");
//   $(".veteran-block").removeClass("show").addClass("hide");
//   $(".delete-license-btn").removeClass("show").addClass("hide");
//   $(".create-license-btn").removeClass("show").addClass("hide");
//   $("#licenseStatusViewLic")
//     .text("Valid")
//     .removeClass("color-red")
//     .addClass("color-black");

//   var firstName = res.civilian.firstName;
//   var lastName = res.civilian.lastName;
//   var birthday = res.civilian.birthday;
//   var createdDate = new Date(res.civilian.createdAt);
//   var expDay = createdDate.getDate();
//   var expMonth = createdDate.getMonth() + 1;
//   var expYear = createdDate.getFullYear() + 10;

//   // since gender, height, weight, eyecolor, haircolor, donor and veteran is optional,
//   // we will do a check to see if its undefined or empty and if so just set it to an
//   // empty string (or false for booleans), otherwise set it to the value from the db.
//   var gender =
//     res.civilian.gender == undefined || res.civilian.gender == ""
//       ? ""
//       : res.civilian.gender.charAt(0); //we only want the first character ('M', 'F', 'N')
//   height = res.civilian.height;
//   weight = res.civilian.weight;
//   var eyeColor =
//     res.civilian.eyeColor == undefined || res.civilian.eyeColor == ""
//       ? ""
//       : res.civilian.eyeColor.substring(0, 3); //only grab first 3 characters of string
//   var hairColor =
//     res.civilian.hairColor == undefined || res.civilian.hairColor == ""
//       ? ""
//       : res.civilian.hairColor.substring(0, 3); //only grab first 3 characters of string
//   var donor =
//     res.civilian.organDonor == undefined || res.civilian.organDonor == ""
//       ? false
//       : res.civilian.organDonor;
//   var veteran =
//     res.civilian.veteran == undefined || res.civilian.veteran == ""
//       ? false
//       : res.civilian.veteran;

//   $("#civilianID").val(res._id);
//   $("#civilianIDViewLic").text("DL: " + res._id);
//   $("#firstNameLic").text(firstName);
//   $("#lastNameLic").text(lastName);
//   $("#sexLic").text(gender);
//   $("#heightLic").text(height);
//   $("#weightLic").text(weight);
//   $("#eyeLic").text(eyeColor);
//   $("#hairLic").text(hairColor);
//   if (donor === true) {
//     $(".donor-block").removeClass("hide").addClass("show");
//   }
//   if (veteran === true) {
//     $(".veteran-block").removeClass("hide").addClass("show");
//   }
//   switch (res.civilian.licenseStatus) {
//     case "1": //valid license
//       $("#drivers-license").removeClass("hide").addClass("show");
//       $("#licenseStatusViewLic")
//         .text("Valid")
//         .removeClass("color-red")
//         .addClass("color-black");
//       $(".delete-license-btn").removeClass("hide").addClass("show");
//       $(".create-license-btn").removeClass("show").addClass("hide");
//       break; //javascript standard to put this here
//     case "2": //revoked license
//       $("#drivers-license").removeClass("hide").addClass("show");
//       $("#licenseStatusViewLic")
//         .text("Revoked")
//         .removeClass("color-black")
//         .addClass("color-red");
//       $(".delete-license-btn").removeClass("hide").addClass("show");
//       $(".create-license-btn").removeClass("show").addClass("hide");
//       break; //javascript standard to put this here
//     default: // '3' or no license
//       $("#drivers-license").removeClass("show").addClass("hide");
//       $(".create-license-btn").removeClass("hide").addClass("show");
//       $("#licenseStatusViewLic")
//         .text("None")
//         .removeClass("color-black")
//         .addClass("color-red");
//   }
//   var licenseDOB = birthday.split("-");
//   if (licenseDOB.length == 3) {
//     $("#birthdayViewLic").text(
//       licenseDOB[1] + "/" + licenseDOB[2] + "/" + licenseDOB[0]
//     );
//   } else {
//     $("#birthdayViewLic").text(birthday);
//   }
//   $("#warrantsView").val(res.civilian.warrants);
//   // set firearm license id status
//   var firearmStatus = "";
//   switch (res.civilian.firearmLicense.trim()) {
//     case "1":
//       firearmStatus = "None";
//       break;
//     case "2":
//       firearmStatus = "Valid";
//       break;
//     case "3":
//       firearmStatus = "Revoked";
//       break;
//     default:
//       firearmStatus = "N/A";
//       break;
//   }
//   $("#firearm-id-status").text(firearmStatus);
//   $("#firearm-id-name").text(`${firstName} ${lastName}`);
//   $("#addressViewLic").text(res.civilian.address);
//   $("#license-expiration").text(
//     expMonth.toString().padStart(2, "0") +
//       "/" +
//       expDay.toString().padStart(2, "0") +
//       "/" +
//       expYear
//   ); //Janky AF
//   $("#license-issued").text(
//     createdDate.toLocaleDateString("en-US", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//     })
//   );
// }

// function populateVehSocketDetails(res) {
//   $("#vehicleID").val(res._id);
//   $("#plateVeh").val(res.vehicle.plate.toUpperCase());

//   // since only cars after 6/26/2020 will have this info, we need to check for empty values
//   if (res.vehicle.vin == "" || res.vehicle.vin == undefined) {
//     $("#vinVeh").val("");
//     $("#no-existing-vin").show();
//   } else {
//     $("#vinVeh").val(res.vehicle.vin.toUpperCase());
//     $("#no-existing-vin").hide();
//   }

//   $("#modelVeh").val(res.vehicle.model);
//   $("#colorView").val(res.vehicle.color);
//   $("#validRegView").val(res.vehicle.validRegistration);
//   $("#validInsView").val(res.vehicle.validInsurance);
//   $("#roVeh").val(res.vehicle.registeredOwner);
//   $("#stolenView").val(res.vehicle.isStolen);
// }

/* function to send socket when new civ is created. This is to move away
  from reloading the page on civ creation */
// $("#create-civ-form").submit(function (e) {
//   e.preventDefault(); //prevents page from reloading
//   var socket = io();
//   var age = "";
//   if ($("#ageView").val() == "") {
//     age = $("#ageAmount").val();
//   } else {
//     age = $("#ageView").val();
//   }

//   var myReq = {
//     body: {
//       civFirstName: $("#civ-first-name").val(),
//       civLastName: $("#civ-last-name").val(),
//       civMiddleInitial: $("#middleInitial").val(),
//       licenseStatus: "1", //1: valid, modified 05/24/2021 to be hardcoded to valid on civ creation
//       ticketCount: $("#ticket-count").val(),
//       birthday: $("#birthday").val(),
//       warrants: $("#warrants").val(),
//       address: $("#address").val(),
//       addressZip: $("#zipCode").val(),
//       occupation: $("#occupation").val(),
//       firearmLicense: $("#firearmLicense").val(),
//       gender: $("#gender").val(),
//       height: getHeight(),
//       weight: getWeight(),
//       age: age,
//       eyeColor: $("#eyeColor").val(),
//       hairColor: $("#hairColor").val(),
//       organDonor: $("#organDonor").is(":checked"),
//       veteran: $("#veteran").is(":checked"),
//       activeCommunityID: $("#new-civ-activeCommunityID-new-civ").val(),
//       userID: $("#newCivUserID").val(),
//     },
//   };
//   socket.emit("create_new_civ", myReq);

//   //socket that receives a response after creating a new civilian
//   socket.on("created_new_civ", (res) => {
//     //populate civilian cards on the dashboard
//     $("#personas-thumbnail").append(
//       `<div id="personas-thumbnail-${res._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
//                 <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
//                   <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
//                   <div class="caption capitalize">
//                     <h4 id="personas-thumbnail-name-${res._id}" class="color-white capitalize">${res.civilian.firstName} ${res.civilian.lastName}</h4>
//                     <h5 id="personas-thumbnail-dob-${res._id}" class="color-white">${res.civilian.birthday}</h5>
//                   </div>
//                 </div>
//               </div>`
//     );

//     //populate the civilian person table
//     var containsEmptyRow = $("#personas-table tr>td").hasClass(
//       "dataTables_empty"
//     );
//     if (containsEmptyRow) {
//       $("#personas-table tbody>tr:first").fadeOut(1, function () {
//         $(this).remove();
//       });
//     }
//     $("#personas-table tr:last")
//       .after(
//         `<tr data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
//             <td>${res.civilian.firstName} ${res.civilian.lastName}</td>
//             <td>${res.civilian.birthday}</td>
//           </tr>`
//       )
//       .fadeTo(1, function () {
//         $(this).add();
//       });

//     //set owner value for updating a vehicle
//     $("#roVeh").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
//   });
//   //reset the form after form submit
//   $("#create-civ-form").trigger("reset");
//   hideModal("newCivModal");
//   return true;
// });

$("#viewCiv").on("hidden.bs.modal", function () {
  // Clear civilian details
  $("#civilianIDView").text("");
  $("#firstName").val("");
  $("#delBirthday").val("");
  $("#ageView").val("");
  $("#addressView").val("");
  $("#occupationView").val("");
  $("#gender-view").val("Other");
  $("#heightView").val("");
  $("#weightView").val("");
  $("#eye-color-view").val("");
  $("#hair-color-view").val("");
  $("#organ-donor-view").prop("checked", false);
  $("#veteran-view").prop("checked", false);
  $("#onParole-view").prop("checked", false);
  $("#onProbation-view").prop("checked", false);
  $("#civilianImageView").attr("src", "");

  // Clear vehicle tab
  $("#manage-vehicles-thumbnail").empty();
  $("#manage-vehicles-loading").show();
  $("#manage-vehicles-thumbnail").show();
  $("#manage-no-vehicles-message").hide();
  $("#issue-loading-vehicles-alert").hide();
  linkedVehiclePage = 0;
  allLinkedVehicles = [];

  // Clear firearm tab
  $("#manage-firearms-thumbnail").empty();
  $("#manage-firearms-loading").show();
  $("#manage-firearms-thumbnail").show();
  $("#manage-no-firearms-message").hide();
  $("#issue-loading-firearms-alert").hide();
  linkedFirearmPage = 0;
  allLinkedFirearms = [];
  hasMoreFirearms = false;

  // Clear other tabs (DMV, Records) if they have dynamic content
  // Add similar resets for #pills-dmv, #pills-records if needed

  // Reset Bootstrap tab state to "Edit Civilian"
  $(".nav-pills li").removeClass("active");
  $('.nav-pills a[href="#pills-edit-civ"]').parent().addClass("active");
  $(".tab-pane").removeClass("active in");
  $("#pills-edit-civ").addClass("active in");

  // Ensure civilian details are hidden until new data loads
  $("#civilian-details-loading").show();
  $("#civilian-details").hide();
});

function getHeight() {
  if ($("#imperial").is(":checked")) {
    return $("#foot").val() + "'" + $("#inches").val() + '"';
  } else if ($("#metric").is(":checked")) {
    return $("#centimeters").val() + "cm";
  } else {
    return "";
  }
}

function getWeight() {
  if ($("#imperial-weight").is(":checked")) {
    return $("#pounds").val() + "lbs";
  } else if ($("#metric-weight").is(":checked")) {
    return $("#kilos").val() + "kg";
  } else {
    return "";
  }
}

// $("#create-auto-civ-form").submit(function (e) {
//   e.preventDefault(); //prevents page from reloading
//   var socket = io();
//   inputGender = $("#genderAuto").val();
//   inputFirearmLicense = $("#firearmLicenseAuto").val();
//   reqBody = autoCivCreator(inputGender, inputFirearmLicense);
//   var myReq = {
//     body: reqBody,
//   };
//   socket.emit("create_new_civ", myReq);

//   //socket that receives a response after creating a new civilian
//   socket.on("created_new_civ", (res) => {
//     //populate civilian cards on the dashboard
//     $("#personas-thumbnail").append(
//       `<div id="personas-thumbnail-${res._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
//                 <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
//                   <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
//                   <div class="caption capitalize">
//                     <h4 id="personas-thumbnail-name-${res._id}" class="color-white capitalize">${res.civilian.firstName} ${res.civilian.lastName}</h4>
//                     <h5 id="personas-thumbnail-dob-${res._id}" class="color-white">${res.civilian.birthday}</h5>
//                   </div>
//                 </div>
//               </div>`
//     );

//     //populate the civilian person table
//     var containsEmptyRow = $("#personas-table tr>td").hasClass(
//       "dataTables_empty"
//     );
//     if (containsEmptyRow) {
//       $("#personas-table tbody>tr:first").fadeOut(1, function () {
//         $(this).remove();
//       });
//     }
//     $("#personas-table tr:last")
//       .after(
//         `<tr data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
//             <td>${res.civilian.firstName} ${res.civilian.lastName}</td>
//             <td>${res.civilian.birthday}</td>
//           </tr>`
//       )
//       .fadeTo(1, function () {
//         $(this).add();
//       });

//     //set owner for updating a vehicle
//     $("#roVeh").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
//   });
//   //reset the form after form submit
//   $("#create-auto-civ-form").trigger("reset");
//   hideModal("newAutoCivModal");
//   return true;
// });

// function autoCivCreator(gender, firearmLicenseMarker) {
//   //faker: https://fakerjsdocs.netlify.app/api
//   if (gender != undefined && gender != null) {
//     switch (gender.toLowerCase()) {
//       case "male":
//         civFirstName = faker.name.firstName(0);
//         civLastName = faker.name.lastName(0);
//         break;
//       case "female":
//         civFirstName = faker.name.firstName(1);
//         civLastName = faker.name.lastName(1);
//         break;
//       default:
//         civFirstName = faker.name.firstName();
//         civLastName = faker.name.lastName();
//     }
//   }

//   var height = "";
//   var weight = "";
//   if (faker.datatype.boolean()) {
//     weight = `${faker.datatype.number({
//       min: 75,
//       max: 700,
//     })}lbs`;
//     height = `${faker.datatype.number({
//       min: 4,
//       max: 7,
//     })}ft ${faker.datatype.number({
//       min: 0,
//       max: 12,
//     })}in`;
//   }

//   const now = moment();
//   var birthday = moment(faker.date.past(50, now.subtract(18, "years"))).format(
//     "YYYY-MM-DD"
//   );
//   var age = moment().diff(birthday, "years", false);
//   body = {
//     civFirstName: name,
//     // civLastName: civLastName,
//     licenseStatus: "1", //1: valid, modified 05/24/2021 to be hardcoded to valid on civ creation
//     birthday: birthday,
//     age: age,
//     warrants: null,
//     address: faker.datatype.boolean()
//       ? `${faker.address.streetAddress(true)}`
//       : "",
//     addressZip: faker.datatype.boolean()
//       ? `${faker.address.zipCode("#####")}`
//       : "",
//     occupation: faker.datatype.boolean() ? faker.name.jobType() : "",
//     firearmLicense: firearmLicenseMarker,
//     activeCommunityID: $("#new-civ-activeCommunityID-new-civ").val(),
//     gender: gender,
//     height: height,
//     weight: weight,
//     eyeColor: faker.datatype.boolean() ? faker.commerce.color() : "",
//     hairColor: faker.datatype.boolean() ? faker.commerce.color() : "",
//     organDonor: faker.datatype.boolean(),
//     veteran: faker.datatype.boolean(),
//     onParole: faker.datatype.boolean(),
//     onProbation: faker.datatype.boolean(),

//     userID: $("#newCivUserID").val(),
//   };
//   return body;
// }

/* call911Form */
// $("#call911Form").submit(function (e) {
//   e.preventDefault(); //prevents page from reloading
//   callCreatedAt = new Date();
//   callCreatedDate = new Date(callCreatedAt);
//   var socket = io();
//   var myReq = {
//     body: {
//       userID: $("#create911Call").val(),
//       username: $("#911CallUsername").val(),
//       activeCommunityID: $("#911CallCommunityID").val(),
//       name: $("#911CallName").val(),
//       location: $("#911CallLocation").val(),
//       peopleDescription: $("#911CallPeopleDescription").val(),
//       callDescription: $("#911CallDescription").val(),
//       createdAt: callCreatedAt,
//       createdAtReadable: callCreatedDate.toLocaleString(),
//     },
//   };
//   socket.emit("create_911_call", myReq);

//   //socket that receives a response after creating a new 911 call
//   socket.on("created_911_call", (res) => {
//     $("#911CallCreatedAlert")
//       .removeClass("hide")
//       .addClass("show")
//       .delay(5000)
//       .slideUp(500, function () {
//         $(this).removeClass("show").addClass("hide");
//       });
//   });
//   //reset the form after form submit
//   $("#call911Form").trigger("reset");
//   hideModal("call911Modal");
//   return true;
// });

/* function to send socket when new vehicle is created. This is to move away
from reloading the page on vehicle creation */
$("#create-vehicle-form").submit(function (e) {
  e.preventDefault(); //prevents page from reloading

  var socket = io();
  var myReq = {
    body: {
      plate: $("#plate").val(),
      vin: $("#vin").val(),
      model: $("#model").val(),
      color: $("#color").val(),
      validRegistration: $("#valid-registration").val(),
      validInsurance: $("#valid-insurance").val(),
      registeredOwner: $("#vehicle-owner").val(),
      registeredOwnerID: $("#civilianIDView").text(),
      isStolen: $("#is-stolen-new").val(),
      activeCommunityID: $("#new-veh-activeCommunityID-new-veh").val(),
      userID: $("#create-vehicle-user-id").val(),
    },
  };
  socket.emit("create_new_veh", myReq);

  //socket that receives a response after creating a new vehicle
  socket.on("created_new_veh", (res) => {
    //populate vehicle cards on the dashboard
    //note: at the end of the vehicle plate we add a ')' to correctly display the plate on the page
    $("#vehicles-thumbnail").append(
      `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
        <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res._id}')">
          <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
          <div class="caption">
            <h4 class="color-white license-plate">#${res.vehicle.plate})</h4>
            <h5 class="color-white">${res.vehicle.color} ${res.vehicle.model}</h5>
          </div>
        </div>
      </div>`
    );

    //populate the vehicle table
    var containsEmptyRow = $("#vehicle-table tr>td").hasClass(
      "dataTables_empty"
    );
    if (containsEmptyRow) {
      $("#vehicle-table tbody>tr:first").fadeOut(1, function () {
        $(this).remove();
      });
    }
    $("#vehicle-table tr:last")
      .after(
        `<tr class="gray-hover" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res._id}')">
      <td>${res.vehicle.plate}</td>
      <td>${res.vehicle.model}</td>
      <td>${res.vehicle.color}</td>
    </tr>`
      )
      .fadeTo(1, function () {
        $(this).add();
      });
  });
  //reset the form after form submit
  $("#create-vehicle-form").trigger("reset");
  hideModal("newVehicleModal");
  return true;
});

/* function to send socket when new firearm is created.
This is to move away from reloading the page on firearm creation */
$("#create-firearm-form").submit(function (e) {
  e.preventDefault(); //prevents page from reloading

  var socket = io();
  var myReq = {
    body: {
      serialNumber: $("#serial-number").val(),
      weaponType: $("#weapon-type").val(),
      registeredOwner: $("#firearm-owner").val(),
      registeredOwnerID: $("#civilianIDView").text(),
      isStolen: $("#is-stolen-update").val(),
      activeCommunityID: $("#new-veh-activeCommunityID-new-firearm").val(),
      userID: $("#new-firearm-userID").val(),
    },
  };
  socket.emit("create_new_firearm", myReq);

  //socket that receives a response after creating a new firearm
  socket.on("created_new_firearm", (res) => {
    //populate firearm cards on the dashboard
    $("#firearms-thumbnail").append(
      `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
      <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res._id}')">
        <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
        <div class="caption text-capitalize">
          <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res.firearm.serialNumber}</h4>
          <h5 class="color-white">${res.firearm.weaponType}</h5>
          <p class="color-white" style="font-size: 12px;">${res.firearm.registeredOwner}</p>
        </div>
      </div>
    </div>`
    );

    //populate the firearm table
    var containsEmptyRow = $("#firearm-table tr>td").hasClass(
      "dataTables_empty"
    );
    if (containsEmptyRow) {
      $("#firearm-table tbody>tr:first").fadeOut(1, function () {
        $(this).remove();
      });
    }
    $("#firearm-table tr:last")
      .after(
        `<tr class="gray-hover" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res._id}')">
      <td>${res.firearm.serialNumber}</td>
      <td style="text-transform: capitalize;"> ${res.firearm.weaponType}</td>
      <td> ${res.firearm.registeredOwner}</td>
    </tr>`
      )
      .fadeTo(1, function () {
        $(this).add();
      });
  });
  //reset the form after form submit
  $("#create-firearm-form").trigger("reset");
  hideModal("newFirearmModal");
  return true;
});

/* function to send socket when new license is created.
This is to move away from reloading the page on license creation */
$("#create-license-form").submit(function (e) {
  e.preventDefault(); //prevents page from reloading
  var socket = io();
  var myReq = {
    body: {
      licenseType: $("#license-type").val(),
      status: $("#license-status").val(),
      expirationDate: $("#expirationDate").val(),
      additionalNotes: $("#additionalNotes").val(),
      ownerName: $("#license-owner").val(),
      ownerID: $("#civilianIDView").text(),
      activeCommunityID: $("#new-license-activeCommunityID").val(),
      userID: $("#new-license-userID").val(),
    },
  };
  socket.emit("create_new_license", myReq);

  //socket that receives a response after creating a new license
  socket.on("created_new_license", (res) => {
    //populate license cards on the dashboard
    $("#licenses-thumbnail").append(
      `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center licenses-thumbnails flex-li-wrapper">
      <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res._id}')">
        <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
        <div class="caption text-capitalize">
          <h4 class="color-white">${res.license.licenseType}</h4>
          <h5 class="color-white">Status: ${res.license.status}</h5>
          <p class="color-white" style="font-size: 12px;">${res.license.ownerName}</p>
        </div>
      </div>
    </div>`
    );

    //populate the license table
    var containsEmptyRow = $("#license-table tr>td").hasClass(
      "dataTables_empty"
    );
    if (containsEmptyRow) {
      $("#license-table tbody>tr:first").fadeOut(1, function () {
        $(this).remove();
      });
    }
    $("#license-table tr:last")
      .after(
        `<tr class="gray-hover" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res._id}')">
      <td>${res.license.serialNumber}</td>
      <td style="text-transform: capitalize;"> ${res.license.weaponType}</td>
      <td> ${res.license.registeredOwner}</td>
    </tr>`
      )
      .fadeTo(1, function () {
        $(this).add();
      });
  });
  //reset the form after form submit
  $("#create-license-form").trigger("reset");
  hideModal("newLicenseModal");
  return true;
});

function updateUserBtnValue(value) {
  $("#userBtnValue").val(value);
}

/* function to send socket when a civilian is updated/deleted.
This is to move away from reloading the page on civilian updates/deletions */
// $("#update-delete-civ-form button").click(function (e) {
//   e.preventDefault(); //prevents page from reloading
//   var submitter_btn = $("#userBtnValue").val();
//   if (submitter_btn == "") {
//     // if user hits the 'x' to close the window, just return
//     return;
//   }
//   var socket = io();
//   var myReq = {
//     body: {
//       civID: $("#civilianIDView").text(),
//       civFirstName: $("#firstName").val(),
//       civLastName: $("#lastName").val(),
//       civMiddleInitial: $("#middleInitial").val(),
//       licenseStatus: "1", //1: valid, modified 05/24/2021 to be hardcoded to valid on civ creation
//       birthday: $("#delBirthday").val(),
//       address: $("#addressView").val(),
//       addressZip: $("#zipCodeView").val(),
//       age: $("#ageView").val(),
//       occupation: $("#occupationView").val(),
//       firearmLicense: $("#firearm-id-status").text(),
//       gender: $("#gender-view").val(),
//       weight: $("#weightView").val(),
//       height: $("#heightView").val(),
//       eyeColor: $("#eye-color-view").val(),
//       hairColor: $("#hair-color-view").val(),
//       organDonor: $("#organ-donor-view").is(":checked"),
//       veteran: $("#veteran-view").is(":checked"),
//       activeCommunityID: $("#new-civ-activeCommunityID-new-civ").val(),
//       userID: $("#userID").val(),
//     },
//   };
//   if (submitter_btn === "delete") {
//     socket.emit("delete_civilian", myReq);
//   } else if (submitter_btn === "update") {
//     socket.emit("update_civilian", myReq);
//   } else if (submitter_btn === "deleteLicense") {
//     myReq.body.licenseStatus = "3";
//     socket.emit("update_civilian", myReq);
//   } else if (submitter_btn === "createLicense") {
//     myReq.body.licenseStatus = "1";
//     socket.emit("update_civilian", myReq);
//   } else {
//     return console.error(
//       `[LPS Error] no matching action found, got: ${submitter_btn}, wanted: ['update', 'delete']`
//     );
//   }

//   //socket that receives a response after updating a civilian
//   socket.on("updated_civilian", (res) => {
//     //populate the civ card that has been updated
//     $(`#personas-thumbnail-name-${res._id}`).text(
//       `${res.civilian.firstName} ${res.civilian.lastName}`
//     );
//     $(`#personas-thumbnail-dob-${res._id}`).text(res.civilian.birthday);
//     //populate the civ table
//     $(`#personas-table-name-${res._id}`).text(
//       `${res.civilian.firstName} ${res.civilian.lastName}`
//     );
//     $(`#personas-table-dob-${res._id}`).text(res.civilian.birthday);
//   });
//   //socket that receives a response after deleting a civilian
//   socket.on("deleted_civilian", (res) => {
//     $(`#personas-thumbnail-${res.body.civID}`).remove();
//   });

//   //reset the form after form submit
//   $("#update-delete-civ-form").trigger("reset");
//   hideModal("viewCiv");
//   return true;
// });

// function getNextCivPage() {
//   page = page + 1;
//   var socket = io();
//   var myObj = {
//     dbUser: dbUser,
//     page: page,
//   };
//   socket.emit("fetch_civ_cards", myObj);
//   socket.on("load_civ_cards_result", (res) => {
//     // load content on page
//     $("#personas-thumbnail").empty();
//     for (i = 0; i < res.length; i++) {
//       $("#personas-thumbnail").append(
//         `<div id="personas-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
//               <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res[i]._id}');loadTicketsAndWarnings('${res[i]._id}');loadArrests('${res[i]._id}');loadReports('${res[i]._id}');loadMedications('${res[i]._id}');loadConditions('${res[i]._id}')">
//                 <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
//                 <div class="caption capitalize">
//                   <h4 id="personas-thumbnail-name-${res[i]._id}" class="color-white capitalize">${res[i].civilian.firstName} ${res[i].civilian.lastName}</h4>
//                   <h5 id="personas-thumbnail-dob-${res[i]._id}" class="color-white">${res[i].civilian.birthday}</h5>
//                 </div>
//               </div>
//             </div>`
//       );
//     }
//     if (res.length < 8) {
//       // if we have reached the end of the data, then gray out the 'next' button
//       $("#next-civ-page-btn").addClass("isDisabled");
//       // page = page - 1
//       $("#next-civ-page-btn").attr("onclick", "").unbind("click");
//     } else {
//       $("#next-civ-page-btn").attr("onclick", "getNextCivPage()").bind("click");
//     }
//     $("#prev-civ-page-btn").removeClass("isDisabled");
//     $("#prev-civ-page-btn").attr("onclick", "getPrevCivPage()").bind("click");
//   });
// }

// function getPrevCivPage() {
//   page = page - 1;
//   if (page < 1) {
//     page = 0;
//     $("#prev-civ-page-btn").addClass("isDisabled");
//     $("#prev-civ-page-btn").attr("onclick", "").unbind("click");
//   }
//   var socket = io();
//   var myObj = {
//     dbUser: dbUser,
//     page: page,
//   };
//   socket.emit("fetch_civ_cards", myObj);
//   socket.on("load_civ_cards_result", (res) => {
//     // load content on page
//     $("#personas-thumbnail").empty();
//     for (i = 0; i < res.length; i++) {
//       $("#personas-thumbnail").append(
//         `<div id="personas-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
//               <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res[i]._id}');loadTicketsAndWarnings('${res[i]._id}');loadArrests('${res[i]._id}');loadReports('${res[i]._id}');loadMedications('${res[i]._id}');loadConditions('${res[i]._id}')">
//                 <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
//                 <div class="caption capitalize">
//                   <h4 id="personas-thumbnail-name-${res[i]._id}" class="color-white capitalize">${res[i].civilian.firstName} ${res[i].civilian.lastName}</h4>
//                   <h5 id="personas-thumbnail-dob-${res[i]._id}" class="color-white">${res[i].civilian.birthday}</h5>
//                 </div>
//               </div>
//             </div>`
//       );
//     }
//     $("#next-civ-page-btn").removeClass("isDisabled");
//     $("#next-civ-page-btn").attr("onclick", "getNextCivPage()").bind("click");
//   });
// }

// function getVehicles() {
//   var socket = io();
//   var myCivObj = {
//     civID: $("#civilianIDView").text(),
//     page: 0,
//   };
//   $("#vehicles-thumbnail").empty();
//   socket.emit("fetch_veh_cards", myCivObj);
//   socket.on("load_veh_cards_result", (res) => {
//     if (res === undefined || res === null) {
//       $("#issue-loading-vehicles-alert").show();
//     } else {
//       if (res.length < 1) {
//         // if we have 0 results back
//         $("#vehicles-loading").hide();
//         $("#no-vehicles-message").show();
//         $("#next-veh-page-btn").addClass("isDisabled");
//         $("#next-veh-page-btn").attr("onclick", "").unbind("click");
//         $("#prev-veh-page-btn").addClass("isDisabled");
//         $("#prev-veh-page-btn").attr("onclick", "").unbind("click");
//       } else {
//         $("#no-vehicles-message").hide();
//         $("#vehicles-thumbnail").empty();
//         for (i = 0; i < res.length; i++) {
//           $("#issue-loading-vehicles-alert").hide();
//           $("#vehicles-thumbnail").append(
//             `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
//         <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
//           <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
//           <div class="caption">
//             <h4 class="color-white license-plate">#${res[i].vehicle.plate})</h4>
//             <h5 class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
//           </div>
//         </div>
//       </div>`
//           );
//         }
//         $("#vehicles-loading").hide();
//         $("#prev-veh-page-btn").addClass("isDisabled");
//         $("#prev-veh-page-btn").attr("onclick", "").unbind("click");
//         if (res.length < 8) {
//           $("#next-veh-page-btn").addClass("isDisabled");
//           $("#next-veh-page-btn").attr("onclick", "").unbind("click");
//         } else {
//           $("#next-veh-page-btn").removeClass("isDisabled");
//           $("#next-veh-page-btn")
//             .attr("onclick", "getNextVehPage()")
//             .bind("click");
//         }
//       }
//     }
//   });
// }

// function getNextVehPage() {
//   pageVeh = pageVeh + 1;
//   var socket = io();
//   var myObj = {
//     civID: $("#civilianIDView").text(),
//     page: pageVeh,
//   };
//   socket.emit("fetch_veh_cards", myObj);
//   socket.on("load_veh_cards_result", (res) => {
//     // load content on page
//     $("#vehicles-thumbnail").empty();
//     if (res == null || res == undefined) {
//     } else {
//       for (i = 0; i < res.length; i++) {
//         $("#vehicles-thumbnail").append(
//           `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
//       <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
//         <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
//         <div class="caption">
//           <h4 class="color-white license-plate">#${res[i].vehicle.plate})</h4>
//           <h5 class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
//         </div>
//       </div>
//     </div>`
//         );
//       }
//       if (res.length < 8) {
//         // if we have reached the end of the data, then gray out the 'next' button
//         $("#next-veh-page-btn").addClass("isDisabled");
//         // page = page - 1
//         $("#next-veh-page-btn").attr("onclick", "").unbind("click");
//       } else {
//         $("#next-veh-page-btn")
//           .attr("onclick", "getNextVehPage()")
//           .bind("click");
//       }
//       $("#prev-veh-page-btn").removeClass("isDisabled");
//       $("#prev-veh-page-btn").attr("onclick", "getPrevVehPage()").bind("click");
//     }
//   });
// }

// function getPrevVehPage() {
//   pageVeh = pageVeh - 1;
//   if (pageVeh < 1) {
//     pageVeh = 0;
//     $("#prev-veh-page-btn").addClass("isDisabled");
//     $("#prev-veh-page-btn").attr("onclick", "").unbind("click");
//   }
//   var socket = io();
//   var myObj = {
//     civID: $("#civilianIDView").text(),
//     page: pageVeh,
//   };
//   socket.emit("fetch_veh_cards", myObj);
//   socket.on("load_veh_cards_result", (res) => {
//     // load content on page
//     $("#vehicles-thumbnail").empty();
//     if (res == null || res == undefined) {
//     } else {
//       for (i = 0; i < res.length; i++) {
//         $("#vehicles-thumbnail").append(
//           `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
//       <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
//         <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
//         <div class="caption">
//           <h4 class="color-white license-plate">#${res[i].vehicle.plate})</h4>
//           <h5 class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
//         </div>
//       </div>
//     </div>`
//         );
//       }
//       $("#next-veh-page-btn").removeClass("isDisabled");
//       $("#next-veh-page-btn").attr("onclick", "getNextVehPage()").bind("click");
//     }
//   });
// }

// function hideVehicleMessage() {
//   $("#no-vehicles-message").hide();
// }

// function hideFirearmMessage() {
//   $("#no-firearms-message").hide();
// }

// function getFirearms() {
//   var socket = io();
//   $("#no-firearms-message").hide();
//   var myCivObj = {
//     civID: $("#civilianIDView").text(),
//     page: 0,
//   };
//   $("#firearms-thumbnail").empty();
//   socket.emit("fetch_gun_cards", myCivObj);
//   socket.on("load_gun_cards_result", (res) => {
//     if (res === undefined || res === null) {
//       $("#issue-loading-firearms-alert").show();
//     } else {
//       $("#issue-loading-firearms-alert").hide();
//       if (res.length < 1) {
//         // if we have 0 results back
//         $("#firearms-loading").hide();
//         $("#no-firearms-message").show();
//         $("#next-gun-page-btn").addClass("isDisabled");
//         $("#next-gun-page-btn").attr("onclick", "").unbind("click");
//         $("#prev-gun-page-btn").addClass("isDisabled");
//         $("#prev-gun-page-btn").attr("onclick", "").unbind("click");
//       } else {
//         $("#no-firearms-message").hide();
//         $("#firearms-thumbnail").empty();
//         for (i = 0; i < res.length; i++) {
//           $("#firearms-thumbnail").append(
//             `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
//       <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res[i]._id}')">
//         <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
//         <div class="caption text-capitalize">
//           <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res[i].firearm.serialNumber}</h4>
//           <h5 class="color-white">${res[i].firearm.weaponType}</h5>
//           <p class="color-white" style="font-size: 12px;">${res[i].firearm.registeredOwner}</p>
//         </div>
//       </div>
//     </div>`
//           );
//         }
//         $("#firearms-loading").hide();
//         $("#prev-gun-page-btn").addClass("isDisabled");
//         $("#prev-gun-page-btn").attr("onclick", "").unbind("click");
//         if (res.length < 8) {
//           $("#next-gun-page-btn").addClass("isDisabled");
//           $("#next-gun-page-btn").attr("onclick", "").unbind("click");
//         } else {
//           $("#next-gun-page-btn").removeClass("isDisabled");
//           $("#next-gun-page-btn")
//             .attr("onclick", "getNextGunPage()")
//             .bind("click");
//         }
//       }
//     }
//   });
// }

// function getNextGunPage() {
//   pageGun = pageGun + 1;
//   var socket = io();
//   var myObj = {
//     civID: $("#civilianIDView").text(),
//     page: pageGun,
//   };
//   socket.emit("fetch_gun_cards", myObj);
//   socket.on("load_gun_cards_result", (res) => {
//     // load content on page
//     $("#firearms-thumbnail").empty();
//     for (i = 0; i < res.length; i++) {
//       $("#firearms-thumbnail").append(
//         `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
//     <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res[i]._id}')">
//       <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
//       <div class="caption text-capitalize">
//         <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res[i].firearm.serialNumber}</h4>
//         <h5 class="color-white">${res[i].firearm.weaponType}</h5>
//         <p class="color-white" style="font-size: 12px;">${res[i].firearm.registeredOwner}</p>
//       </div>
//     </div>
//   </div>`
//       );
//     }
//     if (res.length < 8) {
//       // if we have reached the end of the data, then gray out the 'next' button
//       $("#next-gun-page-btn").addClass("isDisabled");
//       // page = page - 1
//       $("#next-gun-page-btn").attr("onclick", "").unbind("click");
//     } else {
//       $("#next-gun-page-btn").removeClass("isDisabled");
//       $("#next-gun-page-btn").attr("onclick", "getNextGunPage()").bind("click");
//     }
//     $("#prev-gun-page-btn").removeClass("isDisabled");
//     $("#prev-gun-page-btn").attr("onclick", "getPrevGunPage()").bind("click");
//   });
// }

// function getPrevGunPage() {
//   pageGun = pageGun - 1;
//   if (pageGun < 1) {
//     pageGun = 0;
//     $("#prev-gun-page-btn").addClass("isDisabled");
//     $("#prev-gun-page-btn").attr("onclick", "").unbind("click");
//   }
//   var socket = io();
//   var myObj = {
//     civID: $("#civilianIDView").text(),
//     page: pageGun,
//   };
//   socket.emit("fetch_gun_cards", myObj);
//   socket.on("load_gun_cards_result", (res) => {
//     // load content on page
//     $("#firearms-thumbnail").empty();
//     for (i = 0; i < res.length; i++) {
//       $("#firearms-thumbnail").append(
//         `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
//     <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res[i]._id}')">
//       <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
//       <div class="caption text-capitalize">
//         <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res[i].firearm.serialNumber}</h4>
//         <h5 class="color-white">${res[i].firearm.weaponType}</h5>
//         <p class="color-white" style="font-size: 12px;">${res[i].firearm.registeredOwner}</p>
//       </div>
//     </div>
//   </div>`
//       );
//     }
//     $("#next-gun-page-btn").removeClass("isDisabled");
//     $("#next-gun-page-btn").attr("onclick", "getNextGunPage()").bind("click");
//   });
// }

// function getLicenses() {
//   var socket = io();
//   $("#no-licenses-message").hide();
//   var myCivObj = {
//     civID: $("#civilianIDView").text(),
//     page: 0,
//   };
//   $("#licenses-thumbnail").empty();
//   socket.emit("fetch_license_cards", myCivObj);
//   socket.on("load_license_cards_result", (res) => {
//     if (res === undefined || res === null) {
//       $("#issue-loading-license-alert").show();
//     } else {
//       $("#issue-loading-license-alert").hide();
//       if (res.length < 1) {
//         // if we have 0 results back
//         $("#license-loading").hide();
//         $("#no-licenses-message").show();
//         $("#next-license-page-btn").addClass("isDisabled");
//         $("#next-license-page-btn").attr("onclick", "").unbind("click");
//         $("#prev-license-page-btn").addClass("isDisabled");
//         $("#prev-license-page-btn").attr("onclick", "").unbind("click");
//       } else {
//         $("#no-licenses-message").hide();
//         $("#licenses-thumbnail").empty();
//         for (i = 0; i < res.length; i++) {
//           $("#licenses-thumbnail").append(
//             `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center licenses-thumbnails flex-li-wrapper">
//       <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res[i]._id}')">
//         <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
//         <div class="caption text-capitalize">
//           <h4 class="color-white">${res[i].license.licenseType}</h4>
//           <h5 class="color-white">Status: ${res[i].license.status}</h5>
//           <p class="color-white" style="font-size: 12px;">${res[i].license.ownerName}</p>
//         </div>
//       </div>
//     </div>`
//           );
//         }
//         $("#license-loading").hide();
//         $("#prev-license-page-btn").addClass("isDisabled");
//         $("#prev-license-page-btn").attr("onclick", "").unbind("click");
//         if (res.length < 8) {
//           $("#next-license-page-btn").addClass("isDisabled");
//           $("#next-license-page-btn").attr("onclick", "").unbind("click");
//         } else {
//           $("#next-license-page-btn").removeClass("isDisabled");
//           $("#next-license-page-btn")
//             .attr("onclick", "getNextLicensePage()")
//             .bind("click");
//         }
//       }
//     }
//   });
// }

// function getNextLicensePage() {
//   pageLicense = pageLicense + 1;
//   var socket = io();
//   var myObj = {
//     civID: $("#civilianIDView").text(),
//     page: pageLicense,
//   };
//   socket.emit("fetch_license_cards", myObj);
//   socket.on("load_license_cards_result", (res) => {
//     // load content on page
//     $("#licenses-thumbnail").empty();
//     for (i = 0; i < res.length; i++) {
//       $("#licenses-thumbnail").append(
//         `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center licenses-thumbnails flex-li-wrapper">
//   <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res[i]._id}')">
//     <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
//     <div class="caption text-capitalize">
//       <h4 class="color-white">${res[i].license.licenseType}</h4>
//       <h5 class="color-white">Status: ${res[i].license.status}</h5>
//       <p class="color-white" style="font-size: 12px;">${res[i].license.ownerName}</p>
//     </div>
//   </div>
// </div>`
//       );
//     }
//     if (res.length < 8) {
//       // if we have reached the end of the data, then gray out the 'next' button
//       $("#next-license-page-btn").addClass("isDisabled");
//       // page = page - 1
//       $("#next-license-page-btn").attr("onclick", "").unbind("click");
//     } else {
//       $("#next-license-page-btn").removeClass("isDisabled");
//       $("#next-license-page-btn")
//         .attr("onclick", "getNextLicensePage()")
//         .bind("click");
//     }
//     $("#prev-license-page-btn").removeClass("isDisabled");
//     $("#prev-license-page-btn")
//       .attr("onclick", "getPrevLicensePage()")
//       .bind("click");
//   });
// }

// function getPrevLicensePage() {
//   pageLicense = pageLicense - 1;
//   if (pageLicense < 1) {
//     pageLicense = 0;
//     $("#prev-license-page-btn").addClass("isDisabled");
//     $("#prev-license-page-btn").attr("onclick", "").unbind("click");
//   }
//   var socket = io();
//   var myObj = {
//     civID: $("#civilianIDView").text(),
//     page: pageLicense,
//   };
//   socket.emit("fetch_license_cards", myObj);
//   socket.on("load_license_cards_result", (res) => {
//     // load content on page
//     $("#licenses-thumbnail").empty();
//     for (i = 0; i < res.length; i++) {
//       $("#licenses-thumbnail").append(
//         `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center licenses-thumbnails flex-li-wrapper">
//   <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res[i]._id}')">
//     <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
//     <div class="caption text-capitalize">
//       <h4 class="color-white">${res[i].license.licenseType}</h4>
//       <h5 class="color-white">Status: ${res[i].license.status}</h5>
//       <p class="color-white" style="font-size: 12px;">${res[i].license.ownerName}</p>
//     </div>
//   </div>
// </div>`
//       );
//     }
//     $("#next-license-page-btn").removeClass("isDisabled");
//     $("#next-license-page-btn")
//       .attr("onclick", "getNextLicensePage()")
//       .bind("click");
//   });
// }
