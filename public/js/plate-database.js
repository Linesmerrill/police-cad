function vehicleSearchPoliceForm() {
  var socket = io();
  var pageVeh = 0;
  var plate = $("#plateNumber").val();
  $("#plateNumberStored").val(plate);
  var myReq = {
    body: {
      communityID: $("#active-community-id").val(),
      plate: plate,
      page: pageVeh,
    },
  };
  $("#search-results-vehicles-thumbnail").empty();
  socket.emit("vehicle_search_police", myReq);

  //socket that receives a response after searching for plate
  socket.on("vehicle_search_police_result", (res) => {
    if (res === undefined || res === null) {
      $("#issue-loading-search-vehicles-alert").show();
    } else {
      if (res.length < 1) {
        // if we have 0 results back
        $("#search-results-vehicles-loading").hide();
        $("#no-search-vehicles-message").show();
        $("#next-search-veh-page-btn").addClass("isDisabled");
        $("#next-search-veh-page-btn").attr("onclick", "").unbind("click");
        $("#prev-search-veh-page-btn").addClass("isDisabled");
        $("#prev-search-veh-page-btn").attr("onclick", "").unbind("click");
      } else {
        // load content on page
        $("#no-search-vehicles-message").hide();
        $("#search-results-vehicles-thumbnail").empty();
        for (i = 0; i < res.length; i++) {
          $("#issue-loading-search-vehicles-alert").hide();
          $("#search-results-vehicles-thumbnail").append(
            `<div id="search-results-vehicles-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
                  <ion-icon class="font-size-4-vmax md hydrated" name="car-sport-outline" role="img" aria-label="car sport outline"></ion-icon>
                  <div class="caption">
                    <h4 id="search-results-vehicles-thumbnail-plate-${res[i]._id}" class="color-white license-plate">#${res[i].vehicle.plate})</h4>
                    <h5 id="search-results-vehicles-thumbnail-color-model-${res[i]._id}" class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
                    <h5 id="search-results-vehicles-thumbnail-owner-${res[i]._id}" class="color-white capitalize">${res[i].vehicle.registeredOwner}</h5>
                  </div>
                </div> 
              </div>`
          );
        }
        $("#search-results-vehicles-loading").hide();
        $("#prev-search-veh-page-btn").addClass("isDisabled");
        $("#prev-search-veh-page-btn").attr("onclick", "").unbind("click");
        if (res.length < 8) {
          // if we have reached the end of the data, then gray out the 'next' button
          $("#next-search-veh-page-btn").addClass("isDisabled");
          $("#next-search-veh-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#next-search-veh-page-btn").removeClass("isDisabled");
          $("#next-search-veh-page-btn")
            .attr("onclick", "getNextSearchVehPage()")
            .bind("click");
        }
        if (pageVeh == 0) {
          $("#prev-search-veh-page-btn").addClass("isDisabled");
          $("#prev-search-veh-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#prev-search-veh-page-btn").removeClass("isDisabled");
          $("#prev-search-veh-page-btn")
            .attr("onclick", "getPrevSearchVehPage()")
            .bind("click");
        }
      }
    }
  });
  // $("#plate-search-police-form")[0].reset();
}

function populateVehicleDetails(res) {
  $("#vehicle-owner").val(`${res.civilian.firstName} ${res.civilian.lastName}`);
  pageVeh = 0;
  getVehicles();
}

function loadVehSocketData(vehID) {
  var socket = io();
  var myReq = {
    vehID: vehID,
  };
  socket.emit("lookup_veh_by_id", myReq);
  socket.on("load_veh_by_id_result", (res) => {
    //load vehicle data into UI
    populateVehSocketDetails(res);
  });
}

function populateVehSocketDetails(res) {
  $("#vehicleID").val(res._id);
  $("#plateVeh").val(res.vehicle.plate.toUpperCase());

  // since only cars after 6/26/2020 will have this info, we need to check for empty values
  if (res.vehicle.vin == "" || res.vehicle.vin == undefined) {
    $("#vinVeh").val("");
    $("#no-existing-vin").show();
  } else {
    $("#vinVeh").val(res.vehicle.vin.toUpperCase());
    $("#no-existing-vin").hide();
  }
  $("#modelVeh").val(res.vehicle.model);
  $("#colorView").val(res.vehicle.color);
  $("#validRegView").val(res.vehicle.validRegistration);
  if (res.vehicle.validRegistration == "2") {
    //if the vehicle is not registered, show the is invalid alert
    $("#invalidRegistrationAlert").show();
  } else {
    $("#invalidRegistrationAlert").hide();
  }
  $("#validInsView").val(res.vehicle.validInsurance);
  if (res.vehicle.validInsurance == "2") {
    //if the vehicle is not insured, show the is invalid alert
    $("#invalidInsuranceAlert").show();
  } else {
    $("#invalidInsuranceAlert").hide();
  }
  $("#roVeh").val(res.vehicle.registeredOwner);
  $("#stolenView").val(res.vehicle.isStolen);
  if (res.vehicle.isStolen == "2") {
    //if the vehicle is stolen, hide the mark stolen button
    //and show the is stolen alert
    $("#markStolenBtn").hide();
    $("#isStolenAlert").show();
  } else {
    $("#markStolenBtn").show();
    $("#isStolenAlert").hide();
  }
}

function updateToIsStolen() {
  $("#stolenView").val("2");
}

function getVehicles() {
  var socket = io();
  var myCivObj = {
    civID: $("#civilianIDView").text(),
    page: 0,
  };
  $("#vehicles-thumbnail").empty();
  socket.emit("fetch_veh_cards", myCivObj);
  socket.on("load_veh_cards_result", (res) => {
    if (res === undefined || res === null) {
      $("#issue-loading-vehicles-alert").show();
    } else {
      if (res.length < 1) {
        // if we have 0 results back
        $("#vehicles-loading").hide();
        $("#no-vehicles-message").show();
        $("#next-veh-page-btn").addClass("isDisabled");
        $("#next-veh-page-btn").attr("onclick", "").unbind("click");
        $("#prev-veh-page-btn").addClass("isDisabled");
        $("#prev-veh-page-btn").attr("onclick", "").unbind("click");
      } else {
        $("#no-vehicles-message").hide();
        $("#vehicles-thumbnail").empty();
        for (i = 0; i < res.length; i++) {
          $("#issue-loading-vehicles-alert").hide();
          $("#vehicles-thumbnail").append(
            `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
          <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
            <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
            <div class="caption">
              <h4 class="color-white license-plate">#${res[i].vehicle.plate})</h4>
              <h5 class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
            </div>
          </div>
        </div>`
          );
        }
        $("#vehicles-loading").hide();
        $("#prev-veh-page-btn").addClass("isDisabled");
        $("#prev-veh-page-btn").attr("onclick", "").unbind("click");
        if (res.length < 8) {
          $("#next-veh-page-btn").addClass("isDisabled");
          $("#next-veh-page-btn").attr("onclick", "").unbind("click");
        } else {
          $("#next-veh-page-btn").removeClass("isDisabled");
          $("#next-veh-page-btn")
            .attr("onclick", "getNextVehPage()")
            .bind("click");
        }
      }
    }
  });
}

function getNextVehPage() {
  pageVeh = pageVeh + 1;
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageVeh,
  };
  socket.emit("fetch_veh_cards", myObj);
  socket.on("load_veh_cards_result", (res) => {
    // load content on page
    $("#vehicles-thumbnail").empty();
    if (res == null || res == undefined) {
    } else {
      for (i = 0; i < res.length; i++) {
        $("#vehicles-thumbnail").append(
          `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
        <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
          <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
          <div class="caption">
            <h4 class="color-white license-plate">#${res[i].vehicle.plate})</h4>
            <h5 class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
          </div>
        </div>
      </div>`
        );
      }
      if (res.length < 8) {
        // if we have reached the end of the data, then gray out the 'next' button
        $("#next-veh-page-btn").addClass("isDisabled");
        // page = page - 1
        $("#next-veh-page-btn").attr("onclick", "").unbind("click");
      } else {
        $("#next-veh-page-btn")
          .attr("onclick", "getNextVehPage()")
          .bind("click");
      }
      $("#prev-veh-page-btn").removeClass("isDisabled");
      $("#prev-veh-page-btn").attr("onclick", "getPrevVehPage()").bind("click");
    }
  });
}

function getPrevVehPage() {
  pageVeh = pageVeh - 1;
  if (pageVeh < 1) {
    pageVeh = 0;
    $("#prev-veh-page-btn").addClass("isDisabled");
    $("#prev-veh-page-btn").attr("onclick", "").unbind("click");
  }
  var socket = io();
  var myObj = {
    civID: $("#civilianIDView").text(),
    page: pageVeh,
  };
  socket.emit("fetch_veh_cards", myObj);
  socket.on("load_veh_cards_result", (res) => {
    // load content on page
    $("#vehicles-thumbnail").empty();
    if (res == null || res == undefined) {
    } else {
      for (i = 0; i < res.length; i++) {
        $("#vehicles-thumbnail").append(
          `<div class="col-xs-6 col-sm-3 col-md-2 text-align-center veh-thumbnails flex-li-wrapper">
        <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
          <ion-icon class="font-size-4-vmax" name="car-sport-outline"></ion-icon>
          <div class="caption">
            <h4 class="color-white license-plate">#${res[i].vehicle.plate})</h4>
            <h5 class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
          </div>
        </div>
      </div>`
        );
      }
      $("#next-veh-page-btn").removeClass("isDisabled");
      $("#next-veh-page-btn").attr("onclick", "getNextVehPage()").bind("click");
    }
  });
}

function getNextSearchVehPage() {
  pageVeh = pageVeh + 1;
  var socket = io();
  var myObj = {
    body: {
      communityID: $("#active-community-id").val(),
      plate: $("#plateNumberStored").val(),
      page: pageVeh,
    },
  };
  socket.emit("vehicle_search_police", myObj);

  //socket that receives the results of the search
  socket.on("vehicle_search_police_result", (res) => {
    // load content on page
    $("#search-results-vehicles-thumbnail").empty();
    if (res == null || res == undefined) {
    } else {
      for (i = 0; i < res.length; i++) {
        $("#search-results-vehicles-thumbnail").append(
          `<div id="search-results-vehicles-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                  <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
                    <ion-icon class="font-size-4-vmax md hydrated" name="car-sport-outline" role="img" aria-label="car sport outline"></ion-icon>
                    <div class="caption">
                      <h4 id="search-results-vehicles-thumbnail-plate-${res[i]._id}" class="color-white license-plate">#${res[i].vehicle.plate})</h4>
                      <h5 id="search-results-vehicles-thumbnail-color-model-${res[i]._id}" class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
                      <h5 id="search-results-vehicles-thumbnail-owner-${res[i]._id}" class="color-white capitalize">${res[i].vehicle.registeredOwner}</h5>
                    </div>
                  </div> 
                </div>`
        );
      }
      if (res.length < 8) {
        // if we have reached the end of the data, then gray out the 'next' button
        $("#next-search-veh-page-btn").addClass("isDisabled");
        $("#next-search-veh-page-btn").attr("onclick", "").unbind("click");
      } else {
        $("#next-search-veh-page-btn")
          .attr("onclick", "getNextSearchVehPage()")
          .bind("click");
      }
      $("#prev-search-veh-page-btn").removeClass("isDisabled");
      $("#prev-search-veh-page-btn")
        .attr("onclick", "getPrevSearchVehPage()")
        .bind("click");
    }
  });
}

function getPrevSearchVehPage() {
  pageVeh = pageVeh - 1;
  if (pageVeh < 1) {
    pageVeh = 0;
    $("#prev-search-veh-page-btn").addClass("isDisabled");
    $("#prev-search-veh-page-btn").attr("onclick", "").unbind("click");
  }
  var socket = io();
  var myObj = {
    body: {
      communityID: $("#active-community-id").val(),
      plate: $("#plateNumberStored").val(),
      page: pageVeh,
    },
  };
  socket.emit("vehicle_search_police", myObj);

  //socket that receives the results of the search
  socket.on("vehicle_search_police_result", (res) => {
    // load content on page
    $("#search-results-vehicles-thumbnail").empty();
    if (res == null || res == undefined) {
    } else {
      for (i = 0; i < res.length; i++) {
        $("#search-results-vehicles-thumbnail").append(
          `<div id="search-results-vehicles-thumbnail-${res[i]._id}" class="col-xs-6 col-sm-3 col-md-2 text-align-center civ-thumbnails flex-li-wrapper">
                  <div class="thumbnail thumbnail-box flex-wrapper" style="align-items:center" data-toggle="modal" data-target="#viewVeh" onclick="loadVehSocketData('${res[i]._id}')">
                    <ion-icon class="font-size-4-vmax md hydrated" name="car-sport-outline" role="img" aria-label="car sport outline"></ion-icon>
                    <div class="caption">
                      <h4 id="search-results-vehicles-thumbnail-plate-${res[i]._id}" class="color-white license-plate">#${res[i].vehicle.plate})</h4>
                      <h5 id="search-results-vehicles-thumbnail-color-model-${res[i]._id}" class="color-white">${res[i].vehicle.color} ${res[i].vehicle.model}</h5>
                      <h5 id="search-results-vehicles-thumbnail-owner-${res[i]._id}" class="color-white capitalize">${res[i].vehicle.registeredOwner}</h5>
                    </div>
                  </div> 
                </div>`
        );
      }
      $("#next-search-veh-page-btn").removeClass("isDisabled");
      $("#next-search-veh-page-btn")
        .attr("onclick", "getNextSearchVehPage()")
        .bind("click");
    }
  });
}
