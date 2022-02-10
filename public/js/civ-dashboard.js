// add in a delete function as it is not supported as of jQuery {whatever-version-we-have}
$.delete = function (url, data, callback, type) {
  if ($.isFunction(data)) {
    type = type || callback,
      callback = data,
      data = {}
  }

  return $.ajax({
    url: url,
    type: 'DELETE',
    success: callback,
    data: data,
    contentType: type
  });
}

function loadDriversLicense(myVar, index) {
  // debug log:
  // console.log('civilian: ', myVar[index].civilian)

  //setup pre-reqs on license
  $('.donor-block').removeClass('show').addClass('hide');
  $('.veteran-block').removeClass('show').addClass('hide');
  $('.delete-license-btn').removeClass('show').addClass('hide');
  $('.create-license-btn').removeClass('show').addClass('hide');
  $('#licenseStatusViewLic').text('Valid').removeClass('color-red').addClass('color-black')

  var firstName = myVar[index].civilian.firstName
  var lastName = myVar[index].civilian.lastName
  var birthday = myVar[index].civilian.birthday
  var createdDate = new Date(myVar[index].civilian.createdAt)
  var expDay = createdDate.getDate()
  var expMonth = (createdDate.getMonth()) + 1
  var expYear = (createdDate.getFullYear()) + 10

  // since gender, height, weight, eyecolor, haircolor, donor and veteran is optional,
  // we will do a check to see if its undefined or empty and if so just set it to an
  // empty string (or false for booleans), otherwise set it to the value from the db.
  var gender = (myVar[index].civilian.gender == undefined || myVar[index].civilian.gender == '') ? '' : myVar[index].civilian.gender.charAt(0); //we only want the first character ('M', 'F', 'N')
  // height needs to be converted to ft in or cm depending on the heightClassification
  if (myVar[index].civilian.height == undefined || myVar[index].civilian.height == '' || myVar[index].civilian.height == 'NaN') {
    height = ''
  } else {
    switch (myVar[index].civilian.heightClassification) {
      case 'imperial':
        var feet = Math.floor(myVar[index].civilian.height / 12); // just dividing by 12 to get the feet
        var inches = ("0" + myVar[index].civilian.height % 12).slice(-2); // mod by 12 to get remainder, but also pad with a '0' if less than '10'
        height = `${feet}'-${inches}"` // ex: 5'-07"
        break;
      case 'metric':
        height = `${myVar[index].civilian.height} cm`
        break;
      default:
        height = myVar[index].civilian.height
    }
  }
  // weight just needs the appropriate label based on the weightClassification (lb or kg)
  if (myVar[index].civilian.weight == undefined || myVar[index].civilian.weight == '') {
    weight = ''
  } else {
    switch (myVar[index].civilian.weightClassification) {
      case 'imperial':
        weight = `${myVar[index].civilian.weight} lb`
        break;
      case 'metric':
        weight = `${myVar[index].civilian.weight} kg`
        break;
      default:
        weight = myVar[index].civilian.weight
    }
  }
  var eyeColor = (myVar[index].civilian.eyeColor == undefined || myVar[index].civilian.eyeColor == '') ? '' : myVar[index].civilian.eyeColor.substring(0, 3); //only grab first 3 characters of string
  var hairColor = (myVar[index].civilian.hairColor == undefined || myVar[index].civilian.hairColor == '') ? '' : myVar[index].civilian.hairColor.substring(0, 3); //only grab first 3 characters of string
  var donor = (myVar[index].civilian.organDonor == undefined || myVar[index].civilian.organDonor == '') ? false : myVar[index].civilian.organDonor;
  var veteran = (myVar[index].civilian.veteran == undefined || myVar[index].civilian.veteran == '') ? false : myVar[index].civilian.veteran;

  $('#civilianID').val(myVar[index]._id)
  $('#civilianIDViewLic').text('DL: ' + myVar[index]._id)
  $('#firstNameLic').text(firstName)
  $('#lastNameLic').text(lastName)
  $('#sexLic').text(gender);
  $('#heightLic').text(height);
  $('#weightLic').text(weight);
  $('#eyeLic').text(eyeColor);
  $('#hairLic').text(hairColor);
  if (donor === true) {
    $('.donor-block').removeClass('hide').addClass('show');
  }
  if (veteran === true) {
    $('.veteran-block').removeClass('hide').addClass('show');
  }
  switch (myVar[index].civilian.licenseStatus) {
    case '1': //valid license
      $('#drivers-license').removeClass('hide').addClass('show');
      $('#licenseStatusViewLic').text('Valid').removeClass('color-red').addClass('color-black')
      $('.delete-license-btn').removeClass('hide').addClass('show');
      $('.create-license-btn').removeClass('show').addClass('hide');
      break; //javascript standard to put this here
    case '2': //revoked license
      $('#drivers-license').removeClass('hide').addClass('show');
      $('#licenseStatusViewLic').text('Revoked').removeClass('color-black').addClass('color-red')
      $('.delete-license-btn').removeClass('hide').addClass('show');
      $('.create-license-btn').removeClass('show').addClass('hide');
      break; //javascript standard to put this here
    default: // '3' or no license
      $('#drivers-license').removeClass('show').addClass('hide');
      $('.create-license-btn').removeClass('hide').addClass('show');
      $('#licenseStatusViewLic').text('None').removeClass('color-black').addClass('color-red')
  }
  var licenseDOB = birthday.split('-')
  if (licenseDOB.length == 3) {
    $('#birthdayViewLic').text(licenseDOB[1] + '/' + licenseDOB[2] + '/' + licenseDOB[0])
  } else {
    $('#birthdayViewLic').text(birthday)
  }
  $('#warrantsView').val(myVar[index].civilian.warrants)
  $('#firearmLicenseView').val(myVar[index].civilian.firearmLicense)
  $('#addressViewLic').text(myVar[index].civilian.address)
  $('#license-expiration').text(expMonth.toString().padStart(2, '0') + '/' + expDay.toString().padStart(2, '0') + '/' + expYear) //Janky AF
  $('#license-issued').text(createdDate.toLocaleDateString('en-US', {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }))
}

function loadTicketsAndWarnings(index) {
  $("#warningTable tbody").empty()
  $("#citationTable tbody").empty()
  var parameters = {
    civID: index
  };
  $.get('/tickets', parameters, function (data) {
    data.forEach(function (e) {
      if (e.ticket.isWarning) {
        var newRowContent = "<tr><td>" + e.ticket.date + "</td><td>" + e.ticket.violation + "</td></tr>"
        $("#warningTable tbody").append(newRowContent)
      } else {
        var newRowContent = "<tr><td>" + e.ticket.date + "</td><td>" + e.ticket.violation + "</td><td>" + "$" + e.ticket.amount + "</td></tr>"
        $("#citationTable tbody").append(newRowContent)
      }
    });
  });
}

function loadArrests(index) {
  $("#arrestTable tbody").empty()
  var parameters = {
    civID: index
  };
  $.get('/arrests', parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent = "<tr><td>" + e.arrestReport.date + "</td><td>" + e.arrestReport.charges + "</td><td>" + e.arrestReport.summary + "</td></tr>"
      $("#arrestTable tbody").append(newRowContent)
    });
  });
}

function loadReports(index) {
  $("#reportsTable tbody").empty()
  var parameters = {
    civID: index
  };
  $.get('/medical-reports', parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent = `<tr id="` + e._id + `"><td>` + e.report.date + `</td><td style='text-transform: capitalize;'>` + e.report.hospitalized + `</td><td style='text-transform: capitalize;'>` + e.report.details + `</td><td class="text-align-center"><a class='clickable' onclick="deleteReport('` + e._id + `', '` + e.report.civilianID + `')"><i class="glyphicon glyphicon-remove-circle color-alert-red"></i></a></td></tr>`
      $("#reportsTable tbody").append(newRowContent)
    });
  });
}

function loadMedications(index) {
  $('#medication-civilian-id').val(index)
  $("#medicationsTable tbody").empty()
  var parameters = {
    civID: index
  };
  $.get('/medications', parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent = "<tr id=\"" + e._id + "\"><td>" + e.medication.startDate + "</td><td style='text-transform: capitalize;'>" + e.medication.name + "</td><td>" + e.medication.dosage + "</td><td>" + e.medication.frequency + "</td><td class=\"text-align-center\"><a class='clickable' onclick=\"deleteMedication('" + e._id + "')\"><i class=\"glyphicon glyphicon-remove-circle color-alert-red\"></i></a></td></tr>"
      $("#medicationsTable tbody").append(newRowContent)
    });
  });
}

function loadConditions(index) {
  $('#condition-civilian-id').val(index)
  $("#conditionsTable tbody").empty()
  var parameters = {
    civID: index
  };
  $.get('/conditions', parameters, function (data) {
    data.forEach(function (e) {
      var newRowContent = "<tr id=\"" + e._id + "\"><td>" + e.condition.dateOccurred + "</td><td style='text-transform: capitalize;'>" + e.condition.name + "</td><td>" + e.condition.details + "</td><td class=\"text-align-center\"><a class='clickable' onclick=\"deleteCondition('" + e._id + "')\"><i class=\"glyphicon glyphicon-remove-circle color-alert-red\"></i></a></td></tr>"
      $("#conditionsTable tbody").append(newRowContent)
    });
  });
}

function deleteReport(id, civilianID) {
  var parameters = {
    reportID: id
  };
  $.delete('/reports/' + id, parameters, function (data) {
    $(`table#reportsTable tr#` + id).remove()
  })
}

function deleteMedication(id) {
  var parameters = {
    medicationID: id
  };
  $.delete('/medications/' + id, parameters, function (data) {
    $('table#medicationsTable tr#' + id).remove()
  })
}

function deleteCondition(id) {
  var parameters = {
    conditionID: id
  };
  $.delete('/conditions/' + id, parameters, function (data) {
    $('table#conditionsTable tr#' + id).remove()
  })
}

function createNewCiv() {
  $('#civ-first-name').popover('hide')
  $('#civ-last-name').popover('hide')
}

function clearHelpText() {
  $('#firstName').popover('hide')
  $('#lastName').popover('hide')
}



function generateSerialNumber(length, inputID) {
  var result = '';
  var characters = 'ABCDEFGHJKMNPQRSTUVWXYZ0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  $('#' + inputID).val(result);
}

function showList() {
  $('.dataTables_filter').hide();
  $('#personas-table-div').show()
  $('#personas-thumbnail').hide()
  $('#app-icon-personas').addClass('inactive-icon').removeClass('active-icon')
  $('#list-icon-personas').addClass('active-icon').removeClass('inactive-icon')
  document.cookie = "persona_icon=list"
}

function showApps() {
  $('.dataTables_filter').hide();
  $('#personas-table-div').hide()
  $('#personas-thumbnail').show()
  $('#app-icon-personas').addClass('active-icon').removeClass('inactive-icon')
  $('#list-icon-personas').addClass('inactive-icon').removeClass('active-icon')
  document.cookie = "persona_icon=app"
}

function showVehicleList() {
  $('.dataTables_filter').hide();
  $('#vehicles-table-div').show()
  $('#vehicles-thumbnail').hide()
  $('#app-icon-vehicles').addClass('inactive-icon').removeClass('active-icon')
  $('#list-icon-vehicles').addClass('active-icon').removeClass('inactive-icon')
  document.cookie = "vehicle_icon=list"
}

function showVehicleApps() {
  $('.dataTables_filter').hide();
  $('#vehicles-table-div').hide()
  $('#vehicles-thumbnail').show()
  $('#app-icon-vehicles').addClass('active-icon').removeClass('inactive-icon')
  $('#list-icon-vehicles').addClass('inactive-icon').removeClass('active-icon')
  document.cookie = "vehicle_icon=app"
}

function showFirearmsList() {
  $('.dataTables_filter').hide();
  $('#firearms-table-div').show()
  $('#firearms-thumbnail').hide()
  $('#app-icon-firearms').addClass('inactive-icon').removeClass('active-icon')
  $('#list-icon-firearms').addClass('active-icon').removeClass('inactive-icon')
  document.cookie = "firearm_icon=list"
}

function showFirearmsApps() {
  $('.dataTables_filter').hide();
  $('#firearms-table-div').hide()
  $('#firearms-thumbnail').show()
  $('#app-icon-firearms').addClass('active-icon').removeClass('inactive-icon')
  $('#list-icon-firearms').addClass('inactive-icon').removeClass('active-icon')
  document.cookie = "firearm_icon=app"
}

function hideLicenseNotice() {
  document.cookie = "license_notice=hidden"
  $('#license-notice').hide();
}

function toggleInput(showClass, hideClass) {
  $(`.${showClass}`).removeClass('hide').addClass('show')
  $(`.${hideClass}`).removeClass('show').addClass('hide')
}

function markAsRead() {
  document.cookie = "notification-symbol=v2.32.0";
  $('#notification-symbol').removeClass('notif');
  $('#notification-count').text('');
}

function hideModal(modalID) {
  $('#' + modalID).modal('hide')
}

function loadCivSocketData(civID) {
  var socket = io();
  var myReq = {
    civID: civID
  }
  socket.emit('lookup_civ_by_id', myReq)
  socket.on('load_civ_by_id_result', (res) => {
    //load civ data into UI
    populateCivSocketDetails(res)
  })
}

function loadVehSocketData(vehID) {

  var socket = io();
  var myReq = {
    vehID: vehID
  }
  socket.emit('lookup_veh_by_id', myReq)
  socket.on('load_veh_by_id_result', (res) => {
    //load vehicle data into UI
    populateVehSocketDetails(res)
  })
}

function loadFirearmSocketData(firearmID) {
  var socket = io();
  var myReq = {
    firearmID: firearmID
  }
  socket.emit('lookup_firearm_by_id', myReq)
  socket.on('load_firearm_by_id_result', (res) => {
    //load firearm data into UI
    populateFirearmSocketDetails(res)
  })
}

function populateFirearmSocketDetails(res) {
  $('#firearmID').val(res._id)
  $('#serial-number-details').val(res.firearm.serialNumber)
  $('#weapon-type-details').val(res.firearm.weaponType)
  //Because from the backend we already split the person_id from the person name and dob, we now
  //need to rejoin those values back together for #registeredOwner-details
  if (res.firearm.registeredOwner == 'N/A') {
    $('#registeredOwner-details').val(`${res.firearm.registeredOwner}`)
  } else {
    $('#registeredOwner-details').val(`${res.firearm.registeredOwnerID}+${res.firearm.registeredOwner}`)
  }
  $('#is-stolen-details').val(res.firearm.isStolen)
}

function populateCivSocketDetails(res) {
  loadDriversLicenseSocket(res);
  var firstName = res.civilian.firstName
  var lastName = res.civilian.lastName
  var birthday = res.civilian.birthday
  var createdDate = new Date(res.civilian.createdAt)
  var expDay = createdDate.getDate()
  var expMonth = (createdDate.getMonth()) + 1
  var expYear = (createdDate.getFullYear()) + 10
  // debug log:
  // console.log("load civ data: ", res.civilian)

  // pre-reqs to clear form between civilian clicks
  $('#height-imperial-view').prop("checked", false)
  $('#height-metric-view').prop("checked", false)
  $('#foot-view').val('')
  $('#inches-view').val('')
  $('#centimeters-view').val('')
  $('#imperial-weight-view').prop("checked", false)
  $('#pounds-view').val('')
  $('#metric-weight-view').prop("checked", false)
  $('#eye-color-view').val('')
  $('#hair-color-view').val('')
  $('#deceasedView').text(res.civilian.deceased);


  // civilian details:
  $('#civilianID').val(res._id)
  $('#civilianIDView').text(res._id)
  $('#firstName').text(firstName)
  $('#lastNameView').text(lastName)
  $('#birthdayView').text(birthday)
  $('#warrantsView').val(res.civilian.warrants)
  $('#firearmLicenseView').val(res.civilian.firearmLicense)
  $('#addressView').val(res.civilian.address)
  $('#occupationView').val(res.civilian.occupation)

  // advanced civilian details:
  $('#gender-view').val(res.civilian.gender)
  $('#height-imperial-view').prop("checked", res.civilian.heightClassification == 'imperial')
  $('#height-metric-view').prop("checked", res.civilian.heightClassification == 'metric')
  // because we accept 'imperial' and 'metric' as height classifications
  // we need to figure out which we need to display for the height input boxes
  if (res.civilian.heightClassification === 'imperial') {
    //if we have imperial height, we need to convert inches into feet,inches
    let foot = parseInt(parseInt(res.civilian.height) / 12)
    let inches = parseFloat(res.civilian.height) % 12
    $('#foot-view').val(foot)
    $('#inches-view').val(inches)
  } else if (res.civilian.heightClassification === 'metric') {
    $('#centimeters-view').val(res.civilian.height)
    $('.height-imperial').removeClass('show').addClass('hide');
    $('.height-metric').removeClass('hide').addClass('show');
  } else {
    $('.height-imperial').removeClass('show').addClass('hide'); //if none are selected, then just hide the input fields
  }
  if (res.civilian.weightClassification === 'imperial') {
    $('#imperial-weight-view').prop("checked", true)
    $('#pounds-view').val(res.civilian.weight)
    $('#kilos-view').val(''); //clear out kilos value stored in page
    $('.weight-imperial').removeClass('hide').addClass('show');
    $('.weight-metric').removeClass('show').addClass('hide');
  } else if (res.civilian.weightClassification === 'metric') {
    $('#metric-weight-view').prop("checked", true)
    $('#pounds-view').val(''); //clear out lbs value stored in page
    $('#kilos-view').val(res.civilian.weight)
    $('.weight-metric').removeClass('hide').addClass('show');
    $('.weight-imperial').removeClass('show').addClass('hide');
  } else {
    $('.weight-imperial').removeClass('show').addClass('hide'); //if none are selected, then just hide the input fields
    $('.weight-metric').removeClass('show').addClass('hide');
  }

  $('#eye-color-view').val(res.civilian.eyeColor)
  $('#hair-color-view').val(res.civilian.hairColor)

  //to clear out the form from previous caching, we will just set it to false if it cannot be found in myVar
  if (res.civilian.organDonor == undefined || res.civilian.organDonor == null) {
    $('#organ-donor-view').prop("checked", false)
  } else {
    $('#organ-donor-view').prop("checked", res.civilian.organDonor)
  }
  //to clear out the form from previous caching, we will just set it to false if it cannot be found in myVar
  if (res.civilian.veteran == undefined || res.civilian.veteran == null) {
    $('#veteran-view').prop("checked", false)
  } else {
    $('#veteran-view').prop("checked", res.civilian.veteran)
  }

  // data to be set for condition form
  $('#condition-civ-first-name').val(firstName)
  $('#condition-civ-last-name').val(lastName)
  $('#condition-civ-date-of-birth').val(birthday)

  // data to be set for medication form
  $('#medication-civ-first-name').val(firstName)
  $('#medication-civ-last-name').val(lastName)
  $('#medication-civ-date-of-birth').val(birthday)

  // data to be sent to db for civ deletion
  $('#firstName').val(firstName)
  $('#lastName').val(lastName)
  $('#delBirthday').val(birthday)
}

/* loadDriversLicenseSocket will execute whenever a socket civilian is clicked on.
After a page reload, this data will be stored in memory so this method
will not be called at that point in time. Ideally to save on memory inside the app
we should probably swap to use sockets all the time. */
function loadDriversLicenseSocket(res) {
  // debug log:
  // console.log('civilian: ', res.civilian)

  //setup pre-reqs on license
  $('.donor-block').removeClass('show').addClass('hide');
  $('.veteran-block').removeClass('show').addClass('hide');
  $('.delete-license-btn').removeClass('show').addClass('hide');
  $('.create-license-btn').removeClass('show').addClass('hide');
  $('#licenseStatusViewLic').text('Valid').removeClass('color-red').addClass('color-black')

  var firstName = res.civilian.firstName
  var lastName = res.civilian.lastName
  var birthday = res.civilian.birthday
  var createdDate = new Date(res.civilian.createdAt)
  var expDay = createdDate.getDate()
  var expMonth = (createdDate.getMonth()) + 1
  var expYear = (createdDate.getFullYear()) + 10

  // since gender, height, weight, eyecolor, haircolor, donor and veteran is optional,
  // we will do a check to see if its undefined or empty and if so just set it to an
  // empty string (or false for booleans), otherwise set it to the value from the db.
  var gender = (res.civilian.gender == undefined || res.civilian.gender == '') ? '' : res.civilian.gender.charAt(0); //we only want the first character ('M', 'F', 'N')
  // height needs to be converted to ft in or cm depending on the heightClassification
  if (res.civilian.height == undefined || res.civilian.height == '' || res.civilian.height == 'NaN') {
    height = ''
  } else {
    switch (res.civilian.heightClassification) {
      case 'imperial':
        var feet = Math.floor(res.civilian.height / 12); // just dividing by 12 to get the feet
        var inches = ("0" + res.civilian.height % 12).slice(-2); // mod by 12 to get remainder, but also pad with a '0' if less than '10'
        height = `${feet}'-${inches}"` // ex: 5'-07"
        break;
      case 'metric':
        height = `${res.civilian.height} cm`
        break;
      default:
        height = res.civilian.height
    }
  }
  // weight just needs the appropriate label based on the weightClassification (lb or kg)
  if (res.civilian.weight == undefined || res.civilian.weight == '') {
    weight = ''
  } else {
    switch (res.civilian.weightClassification) {
      case 'imperial':
        weight = `${res.civilian.weight} lb`
        break;
      case 'metric':
        weight = `${res.civilian.weight} kg`
        break;
      default:
        weight = res.civilian.weight
    }
  }
  var eyeColor = (res.civilian.eyeColor == undefined || res.civilian.eyeColor == '') ? '' : res.civilian.eyeColor.substring(0, 3); //only grab first 3 characters of string
  var hairColor = (res.civilian.hairColor == undefined || res.civilian.hairColor == '') ? '' : res.civilian.hairColor.substring(0, 3); //only grab first 3 characters of string
  var donor = (res.civilian.organDonor == undefined || res.civilian.organDonor == '') ? false : res.civilian.organDonor;
  var veteran = (res.civilian.veteran == undefined || res.civilian.veteran == '') ? false : res.civilian.veteran;

  $('#civilianID').val(res._id)
  $('#civilianIDViewLic').text('DL: ' + res._id)
  $('#firstNameLic').text(firstName)
  $('#lastNameLic').text(lastName)
  $('#sexLic').text(gender);
  $('#heightLic').text(height);
  $('#weightLic').text(weight);
  $('#eyeLic').text(eyeColor);
  $('#hairLic').text(hairColor);
  if (donor === true) {
    $('.donor-block').removeClass('hide').addClass('show');
  }
  if (veteran === true) {
    $('.veteran-block').removeClass('hide').addClass('show');
  }
  switch (res.civilian.licenseStatus) {
    case '1': //valid license
      $('#drivers-license').removeClass('hide').addClass('show');
      $('#licenseStatusViewLic').text('Valid').removeClass('color-red').addClass('color-black')
      $('.delete-license-btn').removeClass('hide').addClass('show');
      $('.create-license-btn').removeClass('show').addClass('hide');
      break; //javascript standard to put this here
    case '2': //revoked license
      $('#drivers-license').removeClass('hide').addClass('show');
      $('#licenseStatusViewLic').text('Revoked').removeClass('color-black').addClass('color-red')
      $('.delete-license-btn').removeClass('hide').addClass('show');
      $('.create-license-btn').removeClass('show').addClass('hide');
      break; //javascript standard to put this here
    default: // '3' or no license
      $('#drivers-license').removeClass('show').addClass('hide');
      $('.create-license-btn').removeClass('hide').addClass('show');
      $('#licenseStatusViewLic').text('None').removeClass('color-black').addClass('color-red')
  }
  var licenseDOB = birthday.split('-')
  if (licenseDOB.length == 3) {
    $('#birthdayViewLic').text(licenseDOB[1] + '/' + licenseDOB[2] + '/' + licenseDOB[0])
  } else {
    $('#birthdayViewLic').text(birthday)
  }
  $('#warrantsView').val(res.civilian.warrants)
  $('#firearmLicenseView').val(res.civilian.firearmLicense)
  $('#addressViewLic').text(res.civilian.address)
  $('#license-expiration').text(expMonth.toString().padStart(2, '0') + '/' + expDay.toString().padStart(2, '0') + '/' + expYear) //Janky AF
  $('#license-issued').text(createdDate.toLocaleDateString('en-US', {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }))
}

function populateVehSocketDetails(res) {
  $('#vehicleID').val(res._id)
  $('#plateVeh').val(res.vehicle.plate.toUpperCase())

  // since only cars after 6/26/2020 will have this info, we need to check for empty values
  if (res.vehicle.vin == "" || res.vehicle.vin == undefined) {
    $('#vinVeh').val("")
    $('#no-existing-vin').show()
  } else {
    $('#vinVeh').val(res.vehicle.vin.toUpperCase())
    $('#no-existing-vin').hide()
  }

  $('#modelVeh').val(res.vehicle.model)
  $('#colorView').val(res.vehicle.color)
  $('#validRegView').val(res.vehicle.validRegistration)
  $('#validInsView').val(res.vehicle.validInsurance)
  $('#roVeh').val(res.vehicle.registeredOwner)
  $('#stolenView').val(res.vehicle.isStolen)
}

/* function to send socket when new civ is created. This is to move away
  from reloading the page on civ creation */
$('#create-civ-form').submit(function (e) {
  e.preventDefault(); //prevents page from reloading
  var socket = io();
  var myReq = {
    body: {
      civFirstName: $('#civ-first-name').val(),
      civLastName: $('#civ-last-name').val(),
      licenseStatus: '1', //1: valid, modified 05/24/2021 to be hardcoded to valid on civ creation
      ticketCount: $('#ticket-count').val(),
      birthday: $('#birthday').val(),
      warrants: $('#warrants').val(),
      address: $('#address').val(),
      occupation: $('#occupation').val(),
      firearmLicense: $('#firearmLicense').val(),
      gender: $('#gender').val(),
      imperial: $('#imperial').is(':checked'), //heightClassification
      metric: $('#metric').is(':checked'), //heightClassification
      heightFoot: $('#foot').val(),
      heightInches: $('#inches').val(),
      heightCentimeters: $('#centimeters').val(),
      weightImperial: $('#imperial-weight').is(':checked'), //weightClassification
      weightMetric: $('#metric-weight').is(':checked'), //weightClassification
      kilos: $('#kilos').val(),
      pounds: $('#pounds').val(),
      eyeColor: $('#eyeColor').val(),
      hairColor: $('#hairColor').val(),
      organDonor: $('#organDonor').is(':checked'),
      veteran: $('#veteran').is(':checked'),
      activeCommunityID: $('#new-civ-activeCommunityID-new-civ').val(),
      userID: $('#newCivUserID').val(),
    }
  }
  socket.emit('create_new_civ', myReq)

  //socket that receives a response after creating a new civilian
  socket.on('created_new_civ', (res) => {
    //populate civilian cards on the dashboard
    $('#personas-thumbnail').append(
      `<div id="personas-thumbnail-${res._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                <div class="thumbnail thumbnail-box flex-wrapper" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
                  <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
                  <div class="caption capitalize">
                    <h4 id="personas-thumbnail-name-${res._id}" class="color-white capitalize">${res.civilian.firstName} ${res.civilian.lastName}</h4>
                    <h5 id="personas-thumbnail-dob-${res._id}" class="color-white">${res.civilian.birthday}</h5>
                  </div>
                </div>
              </div>`
    )

    //populate the civilian person table
    var containsEmptyRow = $('#personas-table tr>td').hasClass('dataTables_empty');
    if (containsEmptyRow) {
      $('#personas-table tbody>tr:first').fadeOut(1, function () {
        $(this).remove();
      })
    }
    $('#personas-table tr:last').after(
      `<tr data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
            <td>${res.civilian.firstName} ${res.civilian.lastName}</td>
            <td>${res.civilian.birthday}</td>
          </tr>`).fadeTo(1, function () {
      $(this).add();
    })

    //append to list for updating a vehicle
    $('#roVeh').append(`<option value="${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
    //append to list for creating a vehicle
    $('#registeredOwner-new-veh').append(`<option value="${res._id}+${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
    //append to list for updating a firearm
    $('#registeredOwner-details').append(`<option value="${res._id}+${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
    //append to list for creating a firearm
    $('#registeredOwner-new-firearm').append(`<option value="${res._id}+${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
  })
  //reset the form after form submit
  $('#create-civ-form').trigger("reset");
  hideModal('newCivModal')
  return true;
})

$('#create-auto-civ-form').submit(function (e) {
  e.preventDefault(); //prevents page from reloading
  var socket = io();
  inputGender = $('#genderAuto').val();
  inputFirearmLicense = $('#firearmLicenseAuto').val();
  reqBody = autoCivCreator(inputGender, inputFirearmLicense)
  var myReq = {
    body: reqBody
  }
  // console.log(`[DEBUG]: myReq: ${myReq}`, myReq)
  socket.emit('create_new_civ', myReq)

  //socket that receives a response after creating a new civilian
  socket.on('created_new_civ', (res) => {
    //populate civilian cards on the dashboard
    $('#personas-thumbnail').append(
      `<div id="personas-thumbnail-${res._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                <div class="thumbnail thumbnail-box flex-wrapper" data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
                  <ion-icon class="font-size-4-vmax" name="person-outline"></ion-icon>
                  <div class="caption capitalize">
                    <h4 id="personas-thumbnail-name-${res._id}" class="color-white capitalize">${res.civilian.firstName} ${res.civilian.lastName}</h4>
                    <h5 id="personas-thumbnail-dob-${res._id}" class="color-white">${res.civilian.birthday}</h5>
                  </div>
                </div>
              </div>`
    )

    //populate the civilian person table
    var containsEmptyRow = $('#personas-table tr>td').hasClass('dataTables_empty');
    if (containsEmptyRow) {
      $('#personas-table tbody>tr:first').fadeOut(1, function () {
        $(this).remove();
      })
    }
    $('#personas-table tr:last').after(
      `<tr data-toggle="modal" data-target="#viewCiv" onclick="loadCivSocketData('${res._id}');loadTicketsAndWarnings('${res._id}');loadArrests('${res._id}');loadReports('${res._id}');loadMedications('${res._id}');loadConditions('${res._id}')">
            <td>${res.civilian.firstName} ${res.civilian.lastName}</td>
            <td>${res.civilian.birthday}</td>
          </tr>`).fadeTo(1, function () {
      $(this).add();
    })

    //append to list for updating a vehicle
    $('#roVeh').append(`<option value="${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
    //append to list for creating a vehicle
    $('#registeredOwner-new-veh').append(`<option value="${res._id}+${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
    //append to list for updating a firearm
    $('#registeredOwner-details').append(`<option value="${res._id}+${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
    //append to list for creating a firearm
    $('#registeredOwner-new-firearm').append(`<option value="${res._id}+${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}">${res.civilian.firstName} ${res.civilian.lastName} | DOB: ${res.civilian.birthday}</option>`)
  })
  //reset the form after form submit
  $('#create-auto-civ-form').trigger("reset");
  hideModal('newAutoCivModal')
  return true;
})

function autoCivCreator(gender, firearmLicenseMarker) {
  //faker: https://fakerjsdocs.netlify.app/api
  if (gender != undefined && gender != null) {
    switch (gender.toLowerCase()) {
      case "male":
        civFirstName = faker.name.firstName(0)
        civLastName = faker.name.lastName(0)
        break;
      case "female":
        civFirstName = faker.name.firstName(1)
        civLastName = faker.name.lastName(1)
        break;
      default:
        civFirstName = faker.name.firstName()
        civLastName = faker.name.lastName()
    }
  }
  // imperial vs metric
  var heightCentimeters = ""
  var heightFoot = ""
  var weightMetric = false
  var imperial = false
  var weightImperial = false
  var metric = false
  var heightInches = ""
  var pounds = ""
  if (faker.datatype.boolean()) {
    imperial = true;
    weightImperial = true;
    heightInches = faker.datatype.number({
      min: 0,
      max: 12
    }) //inches
    heightFoot = faker.datatype.number({
      min: 4,
      max: 7
    }) //feet
    pounds = faker.datatype.number({
      min: 75,
      max: 700
    }) //lbs
  } else { //metric
    imperial = false;
    metric = true;
    weightMetric = true;
    heightCentimeters = faker.datatype.number({
      min: 92,
      max: 205
    }) //cm
    kilos = faker.datatype.number({
      min: 45,
      max: 400
    }) //kgs
  }
  const now = moment();
  body = {
    civFirstName: civFirstName,
    civLastName: civLastName,
    licenseStatus: '1', //1: valid, modified 05/24/2021 to be hardcoded to valid on civ creation
    birthday: moment(faker.date.past(50, now.subtract(18, "years"))).format('YYYY-MM-DD'),
    warrants: null,
    address: faker.datatype.boolean() ? `${faker.address.streetAddress(true)}, LS ${faker.address.zipCode("#####")}` : "",
    occupation: faker.datatype.boolean() ? faker.name.jobType() : "",
    firearmLicense: firearmLicenseMarker,
    activeCommunityID: $('#new-civ-activeCommunityID-new-civ').val(),
    gender: gender,
    heightFoot: heightFoot,
    heightInches: heightInches,
    heightCentimeters: heightCentimeters,
    weightImperial: weightImperial,
    imperial: imperial,
    metric: metric,
    pounds: pounds,
    kilos: kilos,
    weightMetric: weightMetric,
    eyeColor: faker.datatype.boolean() ? faker.commerce.color() : "",
    hairColor: faker.datatype.boolean() ? faker.commerce.color() : "",
    organDonor: faker.datatype.boolean(),
    veteran: faker.datatype.boolean(),
    userID: $('#newCivUserID').val(),
  }
  return body
}

/* call911Form */
$('#call911Form').submit(function (e) {
  e.preventDefault(); //prevents page from reloading
  callCreatedAt = new Date();
  callCreatedDate = new Date(callCreatedAt);
  var socket = io();
  var myReq = {
    body: {
      userID: $('#create911Call').val(),
      username: $('#911CallUsername').val(),
      activeCommunityID: $('#911CallCommunityID').val(),
      name: $('#911CallName').val(),
      location: $('#911CallLocation').val(),
      peopleDescription: $('#911CallPeopleDescription').val(),
      callDescription: $('#911CallDescription').val(),
      createdAt: callCreatedAt,
      createdAtReadable: callCreatedDate.toLocaleString()
    }
  }
  socket.emit('create_911_call', myReq)

  //socket that receives a response after creating a new 911 call
  socket.on('created_911_call', (res) => {
    $('#911CallCreatedAlert').removeClass('hide').addClass('show').delay(5000).slideUp(500, function () {
      $(this).removeClass('show').addClass('hide');
    });
  })
  //reset the form after form submit
  $('#call911Form').trigger("reset");
  hideModal('call911Modal')
  return true;
})

/* function to send socket when new vehicle is created. This is to move away
from reloading the page on vehicle creation */
$('#create-vehicle-form').submit(function (e) {
  e.preventDefault(); //prevents page from reloading

  var socket = io();
  var myReq = {
    body: {
      plate: $('#plate').val(),
      vin: $('#vin').val(),
      model: $('#model').val(),
      color: $('#color').val(),
      validRegistration: $('#valid-registration').val(),
      validInsurance: $('#valid-insurance').val(),
      registeredOwner: $('#registeredOwner-new-veh').val(),
      isStolen: $('#is-stolen-new').val(),
      activeCommunityID: $('#new-veh-activeCommunityID-new-veh').val(),
      userID: $('#create-vehicle-user-id').val(),
    }
  }
  socket.emit('create_new_veh', myReq)

  //socket that receives a response after creating a new vehicle
  socket.on('created_new_veh', (res) => {
    //populate vehicle cards on the dashboard
    //note: at the end of the vehicle plate we add a ')' to correctly display the plate on the page
    $('#vehicles-thumbnail').append(
      `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
        <div class="thumbnail thumbnail-box flex-wrapper" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res._id}')">
          <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
          <div class="caption">
            <h4 class="color-white license-plate">#${res.vehicle.plate})</h4>
            <h5 class="color-white">${res.vehicle.color} ${res.vehicle.model}</h5>
          </div>
        </div>
      </div>`
    )

    //populate the vehicle table
    var containsEmptyRow = $('#vehicle-table tr>td').hasClass('dataTables_empty');
    if (containsEmptyRow) {
      $('#vehicle-table tbody>tr:first').fadeOut(1, function () {
        $(this).remove();
      })
    }
    $('#vehicle-table tr:last').after(
      `<tr class="gray-hover" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res._id}')">
      <td>${res.vehicle.plate}</td>
      <td>${res.vehicle.model}</td>
      <td>${res.vehicle.color}</td>
    </tr>`).fadeTo(1, function () {
      $(this).add();
    })
  })
  //reset the form after form submit
  $('#create-vehicle-form').trigger("reset");
  hideModal('newVehicleModal')
  return true;
})

/* function to send socket when new firearm is created.
This is to move away from reloading the page on firearm creation */
$('#create-firearm-form').submit(function (e) {
  e.preventDefault(); //prevents page from reloading

  var socket = io();
  var myReq = {
    body: {
      serialNumber: $('#serial-number').val(),
      weaponType: $('#weapon-type').val(),
      registeredOwner: $('#registeredOwner-new-firearm').val(),
      isStolen: $('#is-stolen-update').val(),
      activeCommunityID: $('#new-veh-activeCommunityID-new-firearm').val(),
      userID: $('#new-firearm-userID').val(),
    }
  }
  socket.emit('create_new_firearm', myReq)

  //socket that receives a response after creating a new firearm
  socket.on('created_new_firearm', (res) => {
    //populate firearm cards on the dashboard
    $('#firearms-thumbnail').append(
      `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center firearm-thumbnails flex-li-wrapper">
      <div class="thumbnail thumbnail-box flex-wrapper" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res._id}')">
        <span class="iconify font-size-4-vmax" data-icon="mdi:pistol" data-inline="false"></span>
        <div class="caption text-capitalize">
          <h4 class="color-white" style="font-family: dealerplatecalifornia;">${res.firearm.serialNumber}</h4>
          <h5 class="color-white">${res.firearm.weaponType}</h5>
          <p class="color-white" style="font-size: 12px;">${res.firearm.registeredOwner}</p>
        </div>
      </div>
    </div>`
    )

    //populate the firearm table
    var containsEmptyRow = $('#firearm-table tr>td').hasClass('dataTables_empty');
    if (containsEmptyRow) {
      $('#firearm-table tbody>tr:first').fadeOut(1, function () {
        $(this).remove();
      })
    }
    $('#firearm-table tr:last').after(
      `<tr class="gray-hover" data-toggle="modal" data-target="#viewFirearm" onclick="loadFirearmSocketData('${res._id}')">
      <td>${res.firearm.serialNumber}</td>
      <td style="text-transform: capitalize;"> ${res.firearm.weaponType}</td>
      <td> ${res.firearm.registeredOwner}</td>
    </tr>`).fadeTo(1, function () {
      $(this).add();
    })
  })
  //reset the form after form submit
  $('#create-firearm-form').trigger("reset");
  hideModal('newFirearmModal')
  return true;
})

function updateUserBtnValue(value) {
  $('#userBtnValue').val(value)
}

/* function to send socket when a civilian is updated/deleted.
This is to move away from reloading the page on civilian updates/deletions */
$("#update-delete-civ-form button").click(function (e) {
  e.preventDefault(); //prevents page from reloading
  var submitter_btn = $('#userBtnValue').val();
  if (submitter_btn == "") { // if user hits the 'x' to close the window, just return
    return
  }
  var socket = io();
  var myReq = {
    body: {
      civID: $('#civilianIDView').text(),
      civFirstName: $('#firstName').val(),
      civLastName: $('#lastName').val(),
      licenseStatus: '1', //1: valid, modified 05/24/2021 to be hardcoded to valid on civ creation
      birthday: $('#delBirthday').val(),
      address: $('#addressView').val(),
      occupation: $('#occupationView').val(),
      firearmLicense: $('#firearmLicenseView').val(),
      gender: $('#gender-view').val(),
      imperial: $('#height-imperial-view').is(':checked'), //heightClassification
      metric: $('#height-metric-view').is(':checked'), //heightClassification
      heightFoot: $('#foot-view').val(),
      heightInches: $('#inches-view').val(),
      heightCentimeters: $('#centimeters-view').val(),
      weightImperial: $('#imperial-weight-view').is(':checked'), //weightClassification
      weightMetric: $('#metric-weight-view').is(':checked'), //weightClassification
      kilos: $('#kilos-view').val(),
      pounds: $('#pounds-view').val(),
      eyeColor: $('#eye-color-view').val(),
      hairColor: $('#hair-color-view').val(),
      organDonor: $('#organ-donor-view').is(':checked'),
      veteran: $('#veteran-view').is(':checked'),
      activeCommunityID: $('#new-civ-activeCommunityID-new-civ').val(),
      userID: $('#userID').val(),
    }
  }
  if (submitter_btn === 'delete') {
    socket.emit('delete_civilian', myReq)
  } else if (submitter_btn === 'update') {
    socket.emit('update_civilian', myReq)
  } else if (submitter_btn === 'deleteLicense') {
    myReq.body.licenseStatus = '3'
    socket.emit('update_civilian', myReq)
  } else if (submitter_btn === 'createLicense') {
    myReq.body.licenseStatus = '1'
    socket.emit('update_civilian', myReq)
  } else {
    return console.error(`[LPS Error] no matching action found, got: ${submitter_btn}, wanted: ['update', 'delete']`)
  }

  //socket that receives a response after updating a civilian
  socket.on('updated_civilian', (res) => {
    //populate the civ card that has been updated
    $(`#personas-thumbnail-name-${res._id}`).text(`${res.civilian.firstName} ${res.civilian.lastName}`)
    $(`#personas-thumbnail-dob-${res._id}`).text(res.civilian.birthday)
    //populate the civ table
    $(`#personas-table-name-${res._id}`).text(`${res.civilian.firstName} ${res.civilian.lastName}`)
    $(`#personas-table-dob-${res._id}`).text(res.civilian.birthday)
  })
  //socket that receives a response after deleting a civilian
  socket.on('deleted_civilian', (res) => {
    $(`#personas-thumbnail-${res.body.civID}`).remove();
  })

  //reset the form after form submit
  $('#update-delete-civ-form').trigger("reset");
  hideModal('viewCiv')
  return true;
})
