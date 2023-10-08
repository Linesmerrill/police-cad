function nameSearchPoliceForm() {
  var socket = io();
  var page = 0;
  var firstName = $("#civ-first-name").val();
  var lastName = $("#civ-last-name").val();
  $("#civFirstNameStored").val(firstName);
  $("#civLastNameStored").val(lastName);
  var myReq = {
    body: {
      communityID: $("#active-community-id").val(),
      civFirstName: firstName,
      civLastName: lastName,
      birthday: $("#birthday").val(), //TODO if we are going to use this
      page: page,
    },
  };
  $("#search-results-personas-thumbnail").empty();
  socket.emit("name_search_police", myReq);

  //socket that receives a response after searching for name
  socket.on("name_search_police_result", (res) => {
    if (res === undefined || res === null) {
      $("#issue-loading-civilians-alert").show();
    } else {
      if (res.length < 1) {
        // if we have 0 results back
        $("#search-results-civilians-loading").hide();
        $("#no-civilians-message").show();
        $("#next-civ-page-btn").addClass("isDisabled");
        $("#next-civ-page-btn").attr("onclick", "").unbind("click");
        $("#prev-civ-page-btn").addClass("isDisabled");
        $("#prev-civ-page-btn").attr("onclick", "").unbind("click");
      } else {
        // load content on page
        $("#no-civilians-message").hide();
        $("#search-results-personas-thumbnail").empty();
        for (i = 0; i < res.length; i++) {
          $("#search-results-personas-thumbnail").append(
            `<div id="search-results-personas-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res[i]._id}');loadTicketsAndWarnings('${res[i]._id}');loadArrests('${res[i]._id}');loadReports('${res[i]._id}');loadMedications('${res[i]._id}');loadConditions('${res[i]._id}')">
                  <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
                  <div class="caption capitalize">
                    <h4 id="search-results-personas-thumbnail-name-${res[i]._id}" class="color-white capitalize">${res[i].civilian.firstName} ${res[i].civilian.lastName}</h4>
                    <h5 id="search-results-personas-thumbnail-dob-${res[i]._id}" class="color-white">${res[i].civilian.birthday}</h5>
                  </div>
                </div> 
              </div>`
          );
        }
        $("#search-results-civilians-loading").hide();
        $("#prev-civ-page-btn").addClass("isDisabled");
        $("#prev-civ-page-btn").attr("onclick", "").unbind("click");
        if (res.length < 8) {
          // if we have reached the end of the data, then gray out the 'next' button
          $("#next-civ-page-btn").addClass("isDisabled");
          $("#next-civ-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#next-civ-page-btn").removeClass("isDisabled");
          $("#next-civ-page-btn")
            .attr("onclick", "getNextCivPage()")
            .bind("click");
        }
        if (page == 0) {
          $("#prev-civ-page-btn").addClass("isDisabled");
          $("#prev-civ-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#prev-civ-page-btn").removeClass("isDisabled");
          $("#prev-civ-page-btn")
            .attr("onclick", "getPrevCivPage()")
            .bind("click");
        }
      }
    }
  });
  $("#name-search-police-form")[0].reset();
}

//add the click event listener to the button so it can be clicked more than once
var lookupNameButton = document.getElementById("lookupButton");
lookupNameButton.addEventListener("click", lookupName);

function lookupName() {
  lookupName = $("#roVeh").val();
  firstLast = lookupName.split(" ");
  if (firstLast.length > 1) {
    var firstName = firstLast[0];
    var lastName = firstLast[1];
    $("#civ-first-name").val(firstName);
    $("#civ-last-name").val(lastName);
  } else {
    $("#civ-first-name").val(lookupName);
    $("#civ-last-name").val("");
  }

  // $("#birthday").val(),
  nameSearchPoliceForm();
}

function getPrevCivPage() {
  page = page - 1;
  if (page < 1) {
    page = 0;
    $("#prev-civ-page-btn").addClass("isDisabled");
    $("#prev-civ-page-btn").attr("onclick", "").unbind("click");
  }
  var socket = io();
  var myReq = {
    body: {
      communityID: $("#active-community-id").val(),
      civFirstName: $("#civFirstNameStored").val(),
      civLastName: $("#civLastNameStored").val(),
      birthday: $("#birthday").val(),
      page: page,
    },
  };

  socket.emit("name_search_police", myReq);
  socket.on("name_search_police_result", (res) => {
    // load content on page
    $("#search-results-personas-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#search-results-personas-thumbnail").append(
        `<div id="search-results-personas-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res[i]._id}');loadTicketsAndWarnings('${res[i]._id}');loadArrests('${res[i]._id}');loadReports('${res[i]._id}');loadMedications('${res[i]._id}');loadConditions('${res[i]._id}')">
                  <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
                  <div class="caption capitalize">
                    <h4 id="search-results-personas-thumbnail-name-${res[i]._id}" class="color-white capitalize">${res[i].civilian.firstName} ${res[i].civilian.lastName}</h4>
                    <h5 id="search-results-personas-thumbnail-dob-${res[i]._id}" class="color-white">${res[i].civilian.birthday}</h5>
                  </div>
                </div> 
              </div>`
      );
    }
    $("#next-civ-page-btn").removeClass("isDisabled");
    $("#next-civ-page-btn").attr("onclick", "getNextCivPage()").bind("click");
  });
}

function getNextCivPage() {
  page = page + 1;
  var socket = io();
  var myReq = {
    body: {
      communityID: $("#active-community-id").val(),
      civFirstName: $("#civFirstNameStored").val(),
      civLastName: $("#civLastNameStored").val(),
      birthday: $("#birthday").val(),
      page: page,
    },
  };

  socket.emit("name_search_police", myReq);
  socket.on("name_search_police_result", (res) => {
    // load content on page
    $("#search-results-personas-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#search-results-personas-thumbnail").append(
        `<div id="search-results-personas-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res[i]._id}');loadTicketsAndWarnings('${res[i]._id}');loadArrests('${res[i]._id}');loadReports('${res[i]._id}');loadMedications('${res[i]._id}');loadConditions('${res[i]._id}')">
                  <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
                  <div class="caption capitalize">
                    <h4 id="search-results-personas-thumbnail-name-${res[i]._id}" class="color-white capitalize">${res[i].civilian.firstName} ${res[i].civilian.lastName}</h4>
                    <h5 id="search-results-personas-thumbnail-dob-${res[i]._id}" class="color-white">${res[i].civilian.birthday}</h5>
                  </div>
                </div> 
              </div>`
      );
    }
    if (res.length < 8) {
      // if we have reached the end of the data, then gray out the 'next' button
      $("#next-civ-page-btn").addClass("isDisabled");
      // page = page - 1
      $("#next-civ-page-btn").attr("onclick", "").unbind("click");
    } else {
      $("#next-civ-page-btn").attr("onclick", "getNextCivPage()").bind("click");
    }
    $("#prev-civ-page-btn").removeClass("isDisabled");
    $("#prev-civ-page-btn").attr("onclick", "getPrevCivPage()").bind("click");
  });
}

function loadDriversLicense(myVar, index) {
  //setup pre-reqs on license
  $("#drivers-license").clear();
  $(".donor-block").removeClass("show").addClass("hide");
  $(".veteran-block").removeClass("show").addClass("hide");
  $(".delete-license-btn").removeClass("show").addClass("hide");
  $(".create-license-btn").removeClass("show").addClass("hide");
  $("#licenseStatusViewLic")
    .text("Valid")
    .removeClass("color-red")
    .addClass("color-black");

  var firstName = myVar[index].civilian.firstName;
  var lastName = myVar[index].civilian.lastName;
  var birthday = myVar[index].civilian.birthday;
  var createdDate = new Date(myVar[index].civilian.createdAt);
  var expDay = createdDate.getDate();
  var expMonth = createdDate.getMonth() + 1;
  var expYear = createdDate.getFullYear() + 10;

  // since gender, height, weight, eyecolor, haircolor, donor and veteran is optional,
  // we will do a check to see if its undefined or empty and if so just set it to an
  // empty string (or false for booleans), otherwise set it to the value from the db.
  var gender =
    myVar[index].civilian.gender == undefined ||
    myVar[index].civilian.gender == ""
      ? ""
      : myVar[index].civilian.gender.charAt(0); //we only want the first character ('M', 'F', 'N')

  height = myVar[index].civilian.height;
  weight = myVar[index].civilian.weight;
  var eyeColor =
    myVar[index].civilian.eyeColor == undefined ||
    myVar[index].civilian.eyeColor == ""
      ? ""
      : myVar[index].civilian.eyeColor.substring(0, 3); //only grab first 3 characters of string
  var hairColor =
    myVar[index].civilian.hairColor == undefined ||
    myVar[index].civilian.hairColor == ""
      ? ""
      : myVar[index].civilian.hairColor.substring(0, 3); //only grab first 3 characters of string
  var donor =
    myVar[index].civilian.organDonor == undefined ||
    myVar[index].civilian.organDonor == ""
      ? false
      : myVar[index].civilian.organDonor;
  var veteran =
    myVar[index].civilian.veteran == undefined ||
    myVar[index].civilian.veteran == ""
      ? false
      : myVar[index].civilian.veteran;

  $("#civilianID").val(myVar[index]._id);
  $("#civilianIDViewLic").text("DL: " + myVar[index]._id);
  $("#firstNameLic").text(firstName);
  $("#lastNameLic").text(lastName);
  $("#sexLic").text(gender);
  $("#heightLic").text(height);
  $("#weightLic").text(weight);
  $("#eyeLic").text(eyeColor);
  $("#hairLic").text(hairColor);
  if (donor === true) {
    $(".donor-block").removeClass("hide").addClass("show");
  }
  if (veteran === true) {
    $(".veteran-block").removeClass("hide").addClass("show");
  }
  switch (myVar[index].civilian.licenseStatus) {
    case "1": //valid license
      $("#drivers-license").removeClass("hide").addClass("show");
      $("#licenseStatusViewLic")
        .text("Valid")
        .removeClass("color-red")
        .addClass("color-black");
      $(".delete-license-btn").removeClass("hide").addClass("show");
      $(".create-license-btn").removeClass("show").addClass("hide");
      break; //javascript standard to put this here
    case "2": //suspended license
      $("#drivers-license").removeClass("hide").addClass("show");
      $("#licenseStatusViewLic")
        .text("Suspended")
        .removeClass("color-black")
        .addClass("color-red");
      $(".delete-license-btn").removeClass("hide").addClass("show");
      $(".create-license-btn").removeClass("show").addClass("hide");
      break; //javascript standard to put this here
    default: // '3' or no license
      $("#drivers-license").removeClass("show").addClass("hide");
      $(".create-license-btn").removeClass("hide").addClass("show");
      $("#licenseStatusViewLic")
        .text("None")
        .removeClass("color-black")
        .addClass("color-red");
  }
  var licenseDOB = birthday.split("-");
  if (licenseDOB.length == 3) {
    $("#birthdayViewLic").text(
      licenseDOB[1] + "/" + licenseDOB[2] + "/" + licenseDOB[0]
    );
  } else {
    $("#birthdayViewLic").text(birthday);
  }
  $("#warrantsView").val(myVar[index].civilian.warrants);
  // set firearm license id status
  var firearmStatus = "";
  switch (myVar[index].civilian.firearmLicense.trim()) {
    case "1":
      firearmStatus = "None";
      break;
    case "2":
      firearmStatus = "Valid";
      break;
    case "3":
      firearmStatus = "Suspended";
      break;
    default:
      firearmStatus = "N/A";
      break;
  }
  $("#firearm-id-status").text(firearmStatus);
  $("#firearm-id-name").text(`${firstName} ${lastName}`);
  $("#addressViewLic").text(myVar[index].civilian.address);
  $("#license-expiration").text(
    expMonth.toString().padStart(2, "0") +
      "/" +
      expDay.toString().padStart(2, "0") +
      "/" +
      expYear
  ); //Janky AF
  $("#license-issued").text(
    createdDate.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  );
}

function loadTicketsAndWarnings(index) {
  $("#warningTable tbody").empty();
  $("#citationTable tbody").empty();
  var parameters = {
    civID: index,
  };
  $.get("/tickets", parameters, function (data) {
    data.forEach(function (e) {
      if (e.ticket.isWarning) {
        var newRowContent = `<tr id="${e._id}">
          <td>${e.ticket.date}</td>
          <td>${e.ticket.violation}</td>
          <td class="text-align-center"><a class='clickable' onclick="deleteWarning('${e._id}', '${e.ticket.civID}')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td>
          </tr>`;
        $("#warningTable tbody").append(newRowContent);
      } else {
        var newRowContent = `<tr id="${e._id}">
            <td>${e.ticket.date}</td>
            <td>${e.ticket.violation}</td>
            <td>${e.ticket.amount}</td>
            <td class="text-align-center"><a class='clickable' onclick="deleteCitation('${e._id}', '${e.ticket.civID}')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td>
            </tr>`;
        $("#citationTable tbody").append(newRowContent);
      }
    });
  });
}

function loadArrests(index) {
  $("#arrestTable tbody").empty();
  var parameters = {
    civID: index,
  };
  $.get("/arrests", parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent = `<tr id="${e._id}">
          <td>${e.arrestReport.date}</td>
          <td>${e.arrestReport.charges}</td>
          <td>${e.arrestReport.summary}</td>
          <td class="text-align-center"><a class='clickable' onclick="deleteArrest('${e._id}', '${e.arrestReport.accusedID}')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td>
          </tr>`;
      $("#arrestTable tbody").append(newRowContent);
    });
  });
}

function deleteCitation(citationID, civilianID) {
  var parameters = { citationID: citationID };
  $.delete("/citation/" + citationID, parameters, function (data) {
    $(`table#citationTable tr#${citationID}`).remove();
  });
}

function deleteWarning(warningID, civilianID) {
  var parameters = { citationID: warningID };
  $.delete("/warning/" + warningID, parameters, function (data) {
    $(`table#warningTable tr#${warningID}`).remove();
  });
}

function deleteArrest(arrestID, civilianID) {
  var parameters = { arrestID: arrestID };
  $.delete("/arrestReport/" + arrestID, parameters, function (data) {
    $(`table#arrestTable tr#${arrestID}`).remove();
  });
}

function loadReports(index) {
  $("#reportsTable tbody").empty();
  var parameters = {
    civID: index,
  };
  $.get("/medical-reports", parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent = `<tr id="${e._id}">
          <td>${e.report.date}</td>
          <td style='text-transform: capitalize;'>${e.report.hospitalized}</td>
          <td style='text-transform: capitalize;'>${e.report.details}</td>
          </tr>`;
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
      var newRowContent = `<tr id="${e._id}">
          <td>${e.medication.startDate}</td>
          <td style='text-transform: capitalize;'>${e.medication.name}</td>
          <td>${e.medication.dosage}</td>
          <td>${e.medication.frequency}</td>
          </tr>`;
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
      var newRowContent = `<tr id="${e._id}">
          <td>${e.condition.dateOccurred}</td>
          <td style='text-transform: capitalize;'>${e.condition.name}</td>
          <td>${e.condition.details}</td>
          </tr>`;
      $("#conditionsTable tbody").append(newRowContent);
    });
  });
}

function loadCivSocketData(civID) {
  var socket = io();
  var myReq = {
    civID: civID,
  };
  socket.emit("lookup_civ_by_id", myReq);
  socket.on("load_civ_by_id_result", (res) => {
    //load civ data into UI
    populateCivSocketDetails(res);
    populateWarrantDetails(res);
    populateVehicleDetails(res);
    populateFirearmDetails(res);
    populateLicenseDetails(res);

    //load data into create modals (issue citation, issue warning, arrest and create warrant)
    populateCreateWarrantDetails(res);
    populateIssueCitationDetails(res);
    populateIssueWarningDetails(res);
    populateArrestDetails(res);
  });
}

function populateCreateWarrantDetails(res) {
  $("#warrant-civ-first-name").val(`${res.civilian.firstName}`);
  $("#warrant-civ-last-name").val(`${res.civilian.lastName}`);
  $("#warrant-civ-dob").val(`${res.civilian.birthday}`);
  $("#civIDWarrant").val(`${res._id}`);
}

function populateFirearmDetails(res) {
  $("#firearm-owner").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
  $("#roFirearm").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
  $("#firearmOwnerID").val(`${res._id}`);
  pageGun = 0;
  getFirearms();
}

function populateLicenseDetails(res) {
  $("#license-owner").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
  pageLicense = 0;
  getLicenses();
}

function populateWarrantDetails(res) {
  $("#warrant-owner").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
  pageWarrant = 0;
  getWarrants();
}

function loadFirearmSocketData(firearmID) {
  var socket = io();
  var myReq = {
    firearmID: firearmID,
  };
  socket.emit("lookup_firearm_by_id", myReq);
  socket.on("load_firearm_by_id_result", (res) => {
    //load firearm data into UI
    populateFirearmSocketDetails(res);
  });
}

function loadWarrantSocketData(warrantID) {
  var socket = io();
  var myReq = {
    warrantID: warrantID,
  };
  socket.emit("lookup_warrant_by_id", myReq);
  socket.on("load_warrant_by_id_result", (res) => {
    //load vehicle data into UI
    populateWarrantSocketDetails(res);
  });
}

function populateFirearmSocketDetails(res) {
  $("#firearmID").val(res._id);
  $("#serial-number-details").val(res.firearm.serialNumber);
  $("#weapon-type-details").val(res.firearm.weaponType);
  //Because from the backend we already split the person_id from the person name and dob, we now
  //need to rejoin those values back together for #registeredOwner-details
  if (res.firearm.registeredOwner == "N/A") {
    $("#registeredOwner-details").val(`${res.firearm.registeredOwner}`);
  } else {
    $("#registeredOwner-details").val(
      `${res.firearm.registeredOwnerID}+${res.firearm.registeredOwner}`
    );
  }
  $("#is-stolen-details").val(res.firearm.isStolen);
}

function loadLicenseSocketData(licenseID) {
  var socket = io();
  var myReq = {
    licenseID: licenseID,
  };
  socket.emit("lookup_license_by_id", myReq);
  socket.on("load_license_by_id_result", (res) => {
    //load license data into UI
    populateLicenseSocketDetails(res);
  });
}

function populateLicenseSocketDetails(res) {
  $("#licenseID").val(res._id);
  $("#licenseOwnerID").val(res.license.ownerID);
  $("#license-type-details").val(res.license.licenseType);
  $("#license-status-details").val(res.license.status);
  $("#expirationDate-details").val(res.license.expirationDate);
  $("#additionalNotes-details").val(res.license.additionalNotes);
  if (res.license.status === "suspended") {
    $("#suspendLicenseBtn").hide();
    $("#reinstateLicenseBtn").show();
    $("#isSuspendedAlert").show();
  } else {
    $("#suspendLicenseBtn").show();
    $("#reinstateLicenseBtn").hide();
    $("#isSuspendedAlert").hide();
  }
}

function updateToSuspended() {
  $("#license-status-details").val("suspended");
}

function updateToReinstated() {
  $("#license-status-details").val("valid");
}

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

function populateCivSocketDetails(res) {
  loadDriversLicenseSocket(res);
  var firstName = res.civilian.firstName;
  var lastName = res.civilian.lastName;
  var birthday = res.civilian.birthday;
  var createdDate = new Date(res.civilian.createdAt);
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
  $("#firstName").text(firstName);
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
      firearmStatus = "Suspended";
      break;
    default:
      firearmStatus = "N/A";
      break;
  }
  $("#firearm-id-status").text(firearmStatus);
  $("#firearm-id-name").text(`${firstName} ${lastName}`);
  $("#addressView").val(res.civilian.address);
  $("#occupationView").val(res.civilian.occupation);
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

  // data to be set for condition form
  $("#condition-civ-first-name").val(firstName);
  $("#condition-civ-last-name").val(lastName);
  $("#condition-civ-date-of-birth").val(birthday);

  // data to be set for medication form
  $("#medication-civ-first-name").val(firstName);
  $("#medication-civ-last-name").val(lastName);
  $("#medication-civ-date-of-birth").val(birthday);

  // data to be sent to db for civ deletion
  $("#firstName").val(firstName);
  $("#lastName").val(lastName);
  $("#delBirthday").val(birthday);
}

/* loadDriversLicenseSocket will execute whenever a socket civilian is clicked on.
 * It will load the civilian's drivers license information into the UI.
 * If the civilian does not have a license, it will display a message saying so.
 * If the civilian has a license, it will display the license information.
 * If the civilian has a suspended license, it will display the license information
 * and display a message saying the license is suspended.
 */
function loadDriversLicenseSocket(res) {
  //setup pre-reqs on license
  $(".donor-block").removeClass("show").addClass("hide");
  $(".veteran-block").removeClass("show").addClass("hide");
  $(".delete-license-btn").removeClass("show").addClass("hide");
  $(".create-license-btn").removeClass("show").addClass("hide");
  $("#licenseStatusViewLic")
    .text("Valid")
    .removeClass("color-red")
    .addClass("color-black");

  var firstName = res.civilian.firstName;
  var lastName = res.civilian.lastName;
  var birthday = res.civilian.birthday;
  var createdDate = new Date(res.civilian.createdAt);
  var expDay = createdDate.getDate();
  var expMonth = createdDate.getMonth() + 1;
  var expYear = createdDate.getFullYear() + 10;

  // since gender, height, weight, eyecolor, haircolor, donor and veteran is optional,
  // we will do a check to see if its undefined or empty and if so just set it to an
  // empty string (or false for booleans), otherwise set it to the value from the db.
  var gender =
    res.civilian.gender == undefined || res.civilian.gender == ""
      ? ""
      : res.civilian.gender.charAt(0); //we only want the first character ('M', 'F', 'N')
  height = res.civilian.height;
  weight = res.civilian.weight;
  var eyeColor =
    res.civilian.eyeColor == undefined || res.civilian.eyeColor == ""
      ? ""
      : res.civilian.eyeColor.substring(0, 3); //only grab first 3 characters of string
  var hairColor =
    res.civilian.hairColor == undefined || res.civilian.hairColor == ""
      ? ""
      : res.civilian.hairColor.substring(0, 3); //only grab first 3 characters of string
  var donor =
    res.civilian.organDonor == undefined || res.civilian.organDonor == ""
      ? false
      : res.civilian.organDonor;
  var veteran =
    res.civilian.veteran == undefined || res.civilian.veteran == ""
      ? false
      : res.civilian.veteran;

  $("#civilianID").val(res._id);
  $("#civilianIDViewLic").text("DL: " + res._id);
  $("#firstNameLic").text(firstName);
  $("#lastNameLic").text(lastName);
  $("#sexLic").text(gender);
  $("#heightLic").text(height);
  $("#weightLic").text(weight);
  $("#eyeLic").text(eyeColor);
  $("#hairLic").text(hairColor);
  if (donor === true) {
    $(".donor-block").removeClass("hide").addClass("show");
  }
  if (veteran === true) {
    $(".veteran-block").removeClass("hide").addClass("show");
  }
  switch (res.civilian.licenseStatus) {
    case "1": //valid license
      $("#drivers-license").removeClass("hide").addClass("show");
      $("#licenseStatusViewLic")
        .text("Valid")
        .removeClass("color-red")
        .addClass("color-black");
      $(".delete-license-btn").removeClass("hide").addClass("show");
      $(".create-license-btn").removeClass("show").addClass("hide");
      break; //javascript standard to put this here
    case "2": //suspend license
      $("#drivers-license").removeClass("hide").addClass("show");
      $("#licenseStatusViewLic")
        .text("Suspended")
        .removeClass("color-black")
        .addClass("color-red");
      $(".delete-license-btn").removeClass("hide").addClass("show");
      $(".create-license-btn").removeClass("show").addClass("hide");
      break; //javascript standard to put this here
    default: // '3' or no license
      $("#drivers-license").removeClass("show").addClass("hide");
      $(".create-license-btn").removeClass("hide").addClass("show");
      $("#licenseStatusViewLic")
        .text("None")
        .removeClass("color-black")
        .addClass("color-red");
  }
  var licenseDOB = birthday.split("-");
  if (licenseDOB.length == 3) {
    $("#birthdayViewLic").text(
      licenseDOB[1] + "/" + licenseDOB[2] + "/" + licenseDOB[0]
    );
  } else {
    $("#birthdayViewLic").text(birthday);
  }
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
      firearmStatus = "Suspended";
      break;
    default:
      firearmStatus = "N/A";
      break;
  }
  $("#firearm-id-status").text(firearmStatus);
  $("#firearm-id-name").text(`${firstName} ${lastName}`);
  $("#addressViewLic").text(res.civilian.address);
  $("#license-expiration").text(
    expMonth.toString().padStart(2, "0") +
      "/" +
      expDay.toString().padStart(2, "0") +
      "/" +
      expYear
  ); //Janky AF

  $("#license-issued").text(
    createdDate.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  );
}

function populateWarrantSocketDetails(res) {
  $("#view-warrant-civ-first-name").val(res.warrant.accusedFirstName);
  $("#view-warrant-civ-last-name").val(res.warrant.accusedLastName);
  $("#view-warrant-civ-dob").val($("#delBirthday").val());
  $("#view-civIDWarrant").val(res.warrant.accusedID);
  $("#view-warrant-select").val(res.warrant.reasons);
  $("#warrant-ID").val(res._id);
}

function OpenCitation() {
  $("#ticket-civ-first-name").val($("#firstName").val());
  $("#ticket-civ-last-name").val($("#lastName").val());
  // $("#civID").val(res._id);
  $("#ticket-civ-dob").val($("#delBirthday").val());
  $("#searchTicketDiv").hide(); //TODO
}

function hideVehicleMessage() {
  $("#no-vehicles-message").hide();
}

function hideFirearmMessage() {
  $("#no-firearms-message").hide();
}

function getFirearms() {
  var socket = io();
  $("#no-firearms-message").hide();
  var myCivObj = {
    civID: $("#civilianIDView").text(),
    page: 0,
  };
  $("#firearms-thumbnail").empty();
  socket.emit("fetch_gun_cards", myCivObj);
  socket.on("load_gun_cards_result", (res) => {
    if (res === undefined || res === null) {
      $("#issue-loading-firearms-alert").show();
    } else {
      $("#issue-loading-firearms-alert").hide();
      if (res.length < 1) {
        // if we have 0 results back
        $("#firearms-loading").hide();
        $("#no-firearms-message").show();
        $("#next-gun-page-btn").addClass("isDisabled");
        $("#next-gun-page-btn").attr("onclick", "").unbind("click");
        $("#prev-gun-page-btn").addClass("isDisabled");
        $("#prev-gun-page-btn").attr("onclick", "").unbind("click");
      } else {
        $("#no-firearms-message").hide();
        $("#firearms-thumbnail").empty();
        for (i = 0; i < res.length; i++) {
          $("#firearms-thumbnail").append(
            `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
        <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res[i]._id}')">
          <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
          <div class="caption text-capitalize">
            <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res[i].firearm.serialNumber}</h4>
            <h5 class="color-white">${res[i].firearm.weaponType}</h5>
            <p class="color-white" style="font-size: 12px;">${res[i].firearm.registeredOwner}</p>
          </div>
        </div>
      </div>`
          );
        }
        $("#firearms-loading").hide();
        $("#prev-gun-page-btn").addClass("isDisabled");
        $("#prev-gun-page-btn").attr("onclick", "").unbind("click");
        if (res.length < 8) {
          $("#next-gun-page-btn").addClass("isDisabled");
          $("#next-gun-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#next-gun-page-btn").removeClass("isDisabled");
          $("#next-gun-page-btn")
            .attr("onclick", "getNextGunPage()")
            .bind("click");
        }
      }
    }
  });
}

function getNextGunPage() {
  pageGun = pageGun + 1;
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageGun,
  };
  socket.emit("fetch_gun_cards", myObj);
  socket.on("load_gun_cards_result", (res) => {
    // load content on page
    $("#firearms-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#firearms-thumbnail").append(
        `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
      <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res[i]._id}')">
        <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
        <div class="caption text-capitalize">
          <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res[i].firearm.serialNumber}</h4>
          <h5 class="color-white">${res[i].firearm.weaponType}</h5>
          <p class="color-white" style="font-size: 12px;">${res[i].firearm.registeredOwner}</p>
        </div>
      </div>
    </div>`
      );
    }
    if (res.length < 8) {
      // if we have reached the end of the data, then gray out the 'next' button
      $("#next-gun-page-btn").addClass("isDisabled");
      // page = page - 1
      $("#next-gun-page-btn").attr("onclick", "").unbind("click");
    } else {
      $("#next-gun-page-btn").removeClass("isDisabled");
      $("#next-gun-page-btn").attr("onclick", "getNextGunPage()").bind("click");
    }
    $("#prev-gun-page-btn").removeClass("isDisabled");
    $("#prev-gun-page-btn").attr("onclick", "getPrevGunPage()").bind("click");
  });
}

function getPrevGunPage() {
  pageGun = pageGun - 1;
  if (pageGun < 1) {
    pageGun = 0;
    $("#prev-gun-page-btn").addClass("isDisabled");
    $("#prev-gun-page-btn").attr("onclick", "").unbind("click");
  }
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageGun,
  };
  socket.emit("fetch_gun_cards", myObj);
  socket.on("load_gun_cards_result", (res) => {
    // load content on page
    $("#firearms-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#firearms-thumbnail").append(
        `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
      <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res[i]._id}')">
        <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
        <div class="caption text-capitalize">
          <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res[i].firearm.serialNumber}</h4>
          <h5 class="color-white">${res[i].firearm.weaponType}</h5>
          <p class="color-white" style="font-size: 12px;">${res[i].firearm.registeredOwner}</p>
        </div>
      </div>
    </div>`
      );
    }
    $("#next-gun-page-btn").removeClass("isDisabled");
    $("#next-gun-page-btn").attr("onclick", "getNextGunPage()").bind("click");
  });
}

function getLicenses() {
  var socket = io();
  $("#no-licenses-message").hide();
  var myCivObj = {
    civID: $("#civilianIDView").text(),
    page: 0,
  };
  $("#licenses-thumbnail").empty();
  socket.emit("fetch_license_cards", myCivObj);
  socket.on("load_license_cards_result", (res) => {
    if (res === undefined || res === null) {
      $("#issue-loading-license-alert").show();
    } else {
      $("#issue-loading-license-alert").hide();
      if (res.length < 1) {
        // if we have 0 results back
        $("#license-loading").hide();
        $("#no-licenses-message").show();
        $("#next-license-page-btn").addClass("isDisabled");
        $("#next-license-page-btn").attr("onclick", "").unbind("click");
        $("#prev-license-page-btn").addClass("isDisabled");
        $("#prev-license-page-btn").attr("onclick", "").unbind("click");
      } else {
        $("#no-licenses-message").hide();
        $("#licenses-thumbnail").empty();
        for (i = 0; i < res.length; i++) {
          $("#licenses-thumbnail").append(
            `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center licenses-thumbnails flex-li-wrapper">
        <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res[i]._id}')">
          <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
          <div class="caption text-capitalize">
            <h4 class="color-white">${res[i].license.licenseType}</h4>
            <h5 class="color-white">Status: ${res[i].license.status}</h5>
            <p class="color-white" style="font-size: 12px;">${res[i].license.ownerName}</p>
          </div>
        </div>
      </div>`
          );
        }
        $("#license-loading").hide();
        $("#prev-license-page-btn").addClass("isDisabled");
        $("#prev-license-page-btn").attr("onclick", "").unbind("click");
        if (res.length < 8) {
          $("#next-license-page-btn").addClass("isDisabled");
          $("#next-license-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#next-license-page-btn").removeClass("isDisabled");
          $("#next-license-page-btn")
            .attr("onclick", "getNextLicensePage()")
            .bind("click");
        }
      }
    }
  });
}

function getNextLicensePage() {
  pageLicense = pageLicense + 1;
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageLicense,
  };
  socket.emit("fetch_license_cards", myObj);
  socket.on("load_license_cards_result", (res) => {
    // load content on page
    $("#licenses-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#licenses-thumbnail").append(
        `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center licenses-thumbnails flex-li-wrapper">
    <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res[i]._id}')">
      <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
      <div class="caption text-capitalize">
        <h4 class="color-white">${res[i].license.licenseType}</h4>
        <h5 class="color-white">Status: ${res[i].license.status}</h5>
        <p class="color-white" style="font-size: 12px;">${res[i].license.ownerName}</p>
      </div>
    </div>
  </div>`
      );
    }
    if (res.length < 8) {
      // if we have reached the end of the data, then gray out the 'next' button
      $("#next-license-page-btn").addClass("isDisabled");
      // page = page - 1
      $("#next-license-page-btn").attr("onclick", "").unbind("click");
    } else {
      $("#next-license-page-btn").removeClass("isDisabled");
      $("#next-license-page-btn")
        .attr("onclick", "getNextLicensePage()")
        .bind("click");
    }
    $("#prev-license-page-btn").removeClass("isDisabled");
    $("#prev-license-page-btn")
      .attr("onclick", "getPrevLicensePage()")
      .bind("click");
  });
}

function getPrevLicensePage() {
  pageLicense = pageLicense - 1;
  if (pageLicense < 1) {
    pageLicense = 0;
    $("#prev-license-page-btn").addClass("isDisabled");
    $("#prev-license-page-btn").attr("onclick", "").unbind("click");
  }
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageLicense,
  };
  socket.emit("fetch_license_cards", myObj);
  socket.on("load_license_cards_result", (res) => {
    // load content on page
    $("#licenses-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#licenses-thumbnail").append(
        `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center licenses-thumbnails flex-li-wrapper">
    <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewLicense" onclick="loadLicenseSocketData('${res[i]._id}')">
      <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
      <div class="caption text-capitalize">
        <h4 class="color-white">${res[i].license.licenseType}</h4>
        <h5 class="color-white">Status: ${res[i].license.status}</h5>
        <p class="color-white" style="font-size: 12px;">${res[i].license.ownerName}</p>
      </div>
    </div>
  </div>`
      );
    }
    $("#next-license-page-btn").removeClass("isDisabled");
    $("#next-license-page-btn")
      .attr("onclick", "getNextLicensePage()")
      .bind("click");
  });
}

function getWarrants() {
  var socket = io();
  $("#no-warrants-message").hide();
  var myCivObj = {
    civID: $("#civilianIDView").text(),
    page: 0,
  };
  $("#warrants-thumbnail").empty();
  socket.emit("fetch_warrant_cards", myCivObj);
  socket.on("load_warrant_cards_result", (res) => {
    if (res === undefined || res === null) {
      $("#issue-loading-warrants-alert").show();
    } else {
      $("#issue-loading-warrants-alert").hide();
      if (res.length < 1) {
        // if we have 0 results back
        $("#warrants-loading").hide();
        $("#no-warrants-message").show();
        $("#next-warrants-page-btn").addClass("isDisabled");
        $("#next-warrants-page-btn").attr("onclick", "").unbind("click");
        $("#prev-warrants-page-btn").addClass("isDisabled");
        $("#prev-warrants-page-btn").attr("onclick", "").unbind("click");
      } else {
        $("#no-warrants-message").hide();
        $("#warrants-thumbnail").empty();
        for (i = 0; i < res.length; i++) {
          $("#warrants-thumbnail").append(
            `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center warrants-thumbnails flex-li-wrapper">
        <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewWarrant" onclick="loadWarrantSocketData('${res[i]._id}')">
          <span class="iconify font-size-4-vmax" style="color:indianred" data-icon="mdi:alert-octagon" data-inline="false"></span>
          <div class="caption text-capitalize">
            <h4 class="color-white">${res[i].warrant.reasons}</h4>
            <p class="color-white" style="font-size: 12px;">${res[i].warrant.accusedFirstName} ${res[i].warrant.accusedLastName}</p>
          </div>
        </div>
      </div>`
          );
        }
        $("#warrants-loading").hide();
        $("#prev-warrants-page-btn").addClass("isDisabled");
        $("#prev-warrants-page-btn").attr("onclick", "").unbind("click");
        if (res.length < 8) {
          $("#next-warrants-page-btn").addClass("isDisabled");
          $("#next-warrants-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#next-warrants-page-btn").removeClass("isDisabled");
          $("#next-warrants-page-btn")
            .attr("onclick", "getNextWarrantPage()")
            .bind("click");
        }
      }
    }
  });
}

function getNextWarrantPage() {
  pageWarrant = pageWarrant + 1;
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageWarrant,
  };
  socket.emit("fetch_warrant_cards", myObj);
  socket.on("load_warrant_cards_result", (res) => {
    // load content on page
    $("#warrants-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#warrants-thumbnail").append(
        `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center warrants-thumbnails flex-li-wrapper">
    <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewWarrant" onclick="loadWarrantSocketData('${res[i]._id}')">
      <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
      <div class="caption text-capitalize">
        <h4 class="color-white">${res[i].warrants.warrantsType}</h4>
        <h5 class="color-white">Status: ${res[i].warrants.status}</h5>
        <p class="color-white" style="font-size: 12px;">${res[i].warrants.ownerName}</p>
      </div>
    </div>
  </div>`
      );
    }
    if (res.length < 8) {
      // if we have reached the end of the data, then gray out the 'next' button
      $("#next-warrants-page-btn").addClass("isDisabled");
      // page = page - 1
      $("#next-warrants-page-btn").attr("onclick", "").unbind("click");
    } else {
      $("#next-warrants-page-btn").removeClass("isDisabled");
      $("#next-warrants-page-btn")
        .attr("onclick", "getNextWarrantPage()")
        .bind("click");
    }
    $("#prev-warrants-page-btn").removeClass("isDisabled");
    $("#prev-warrants-page-btn")
      .attr("onclick", "getPrevWarrantPage()")
      .bind("click");
  });
}

function getPrevWarrantPage() {
  pageWarrant = pageWarrant - 1;
  if (pageWarrant < 1) {
    pageWarrant = 0;
    $("#prev-warrants-page-btn").addClass("isDisabled");
    $("#prev-warrants-page-btn").attr("onclick", "").unbind("click");
  }
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageWarrant,
  };
  socket.emit("fetch_warrant_cards", myObj);
  socket.on("load_warrant_cards_result", (res) => {
    // load content on page
    $("#warrants-thumbnail").empty();
    for (i = 0; i < res.length; i++) {
      $("#warrants-thumbnail").append(
        `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center warrants-thumbnails flex-li-wrapper">
    <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewWarrant" onclick="loadWarrantSocketData('${res[i]._id}')">
      <span class="iconify font-size-4-vmax" data-icon="mdi:application" data-inline="false"></span>
      <div class="caption text-capitalize">
        <h4 class="color-white">${res[i].warrants.warrantsType}</h4>
        <h5 class="color-white">Status: ${res[i].warrants.status}</h5>
        <p class="color-white" style="font-size: 12px;">${res[i].warrants.ownerName}</p>
      </div>
    </div>
  </div>`
      );
    }
    $("#next-warrants-page-btn").removeClass("isDisabled");
    $("#next-warrants-page-btn")
      .attr("onclick", "getNextWarrantPage()")
      .bind("click");
  });
}

function populateIssueCitationDetails(res) {
  console.log("populateIssueCitationDetails", res);
  setDateAndTime("#date", "#time");
  $("#ticket-civ-first-name").val(res.civilian.firstName);
  $("#ticket-civ-last-name").val(res.civilian.lastName);
  $("#ticket-civ-dob").val(res.civilian.birthday);
  $("#civID").val(res._id);
}

function populateIssueWarningDetails(res) {
  setDateAndTime("#warning-date", "#warning-time");
  $("#warning-civ-first-name").val(res.civilian.firstName);
  $("#warning-civ-last-name").val(res.civilian.lastName);
  $("#warning-civ-dob").val(res.civilian.birthday);
  $("#civIDWarning").val(res._id);
}

function populateArrestDetails(res) {
  $("#arrest-report-case-no").val(Math.round(Math.random() * 10000000000));
  setDateAndTime("#arrest-report-date", "#arrest-report-time");
  $("#arrest-civ-first-name").val(res.civilian.firstName);
  $("#arrest-civ-last-name").val(res.civilian.lastName);
  $("#arrest-civ-dob").val(res.civilian.birthday);
  $("#civIDArrest").val(res._id);
}

function setDateAndTime(dateElement, timeElement) {
  $(dateElement)[0].valueAsDate = new Date();
  $(timeElement)[0].value = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showList() {
  $(".dataTables_filter").hide();
  $("#personas-table-div").show();
  $("#search-results-personas-thumbnail").hide();
  $("#app-icon-personas").addClass("inactive-icon").removeClass("active-icon");
  $("#list-icon-personas").addClass("active-icon").removeClass("inactive-icon");
  document.cookie = "persona_icon=list";
}

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
