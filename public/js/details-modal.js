$(document).ready(function () {
  const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
  let currentItem = null;
  let currentType = null;
  let owner = null;
  let licenses = [];
  let vehicles = [];
  let firearms = [];
  let isOpeningModal = false;
  let loadingStatuses = [];
  let modalHistory = []; // Navigation stack
  let arrestReports = [];
  let totalArrestReports = 0;
  let currentArrestPage = 0;
  let criminalHistory = [];
  let totalCriminalHistory = 0;
  let currentCriminalPage = 1;

  // Show modal and fetch data
  function showDetailsModal(item, type, isFromLink = false) {
    if (isOpeningModal) {
      return;
    }
    isOpeningModal = true;

    // Clear history if not from link
    if (!isFromLink) {
      modalHistory = [];
    }
    modalHistory.push({ item, type });

    // Hide other modals and clean up
    $(".modal").not("#detailsModal").modal("hide").removeData("bs.modal");
    $("body").removeClass("modal-open");
    $(".modal-backdrop").fadeOut(200, function () {
      $(this).remove();
    });

    currentItem = item;
    currentType = type;
    $("#detailsTitle").text(`${type} Details`);
    $("#detailsLoading").show();
    $("#detailsContent").hide();

    // Initialize loading statuses
    loadingStatuses = [
      {
        id: "details",
        label: `Looking up ${type.toLowerCase()} details`,
        status: "pending",
      },
    ];
    if (
      currentType === "Vehicle" ||
      currentType === "Firearm" ||
      currentType === "License"
    ) {
      loadingStatuses.push({
        id: "owner",
        label: "Looking up registered owner",
        status: "pending",
      });
    }
    if (currentType === "Civilian") {
      loadingStatuses.push(
        { id: "licenses", label: "Looking up licenses", status: "pending" },
        {
          id: "vehicles",
          label: "Looking up registered vehicles",
          status: "pending",
        },
        {
          id: "firearms",
          label: "Looking up registered firearms",
          status: "pending",
        },
        {
          id: "arrestReports",
          label: "Looking up arrest reports",
          status: "pending",
        },
        {
          id: "criminalHistory",
          label: "Looking up criminal history",
          status: "pending",
        }
      );
    }
    updateLoadingStatuses();

    // Show modal after cleanup
    setTimeout(() => {
      $("body").removeClass("modal-open");
      $(".modal-backdrop").remove();
      $("#detailsModal").modal({ backdrop: "static", keyboard: true });
      fetchDetails();
      isOpeningModal = false;
    }, 300); // Increased delay for stability
  }

  // Go back to previous item in history
  function goBack() {
    if (modalHistory.length > 1) {
      modalHistory.pop();
      const previous = modalHistory[modalHistory.length - 1];
      showDetailsModal(previous.item, previous.type, true);
    } else {
      $("#detailsModal").modal("hide");
    }
  }

  // Handle modal close
  $("#detailsModal").on("hide.bs.modal", function () {
    isOpeningModal = false;
    $(this).removeData("bs.modal"); // Clear modal data
    $("body").removeClass("modal-open"); // Remove modal-open class
    $(".modal-backdrop").fadeOut(200, function () {
      $(this).remove();
    }); // Smoothly remove backdrop
    modalHistory = [];
    $("#detailsLoading").show();
    $("#detailsContent").hide();
    loadingStatuses = [];
    currentItem = null;
    currentType = null;
    owner = null;
    licenses = [];
    vehicles = [];
    firearms = [];
    // Ensure no modal state lingers
    setTimeout(() => {
      if ($(".modal:visible").length === 0) {
        $("body").removeClass("modal-open");
        $(".modal-backdrop").remove();
      }
    }, 300);
  });

  // Update loading statuses in DOM
  function updateLoadingStatuses() {
    const $statuses = $("#loadingStatuses");
    $statuses.empty();
    loadingStatuses.forEach((status) => {
      const iconHtml =
        status.status === "pending"
          ? '<span class="spinner-border spinner-border-sm"></span>'
          : status.status === "success"
          ? '<i class="fa fa-check"></i>'
          : '<i class="fa fa-times"></i>';
      $statuses.append(`
        <div class="loading-item">
          ${iconHtml}
          <span>${status.label}</span>
        </div>
      `);
    });
  }

  // Fetch item details and linked data
  function fetchDetails() {
    const itemId = currentItem._id;
    let detailsUrl = "";
    if (currentType === "Civilian") {
      detailsUrl = `${API_URL}/api/v1/civilian/${itemId}`;
    } else if (currentType === "Vehicle") {
      detailsUrl = `${API_URL}/api/v1/vehicle/${itemId}`;
    } else if (currentType === "Firearm") {
      detailsUrl = `${API_URL}/api/v1/firearm/${itemId}`;
    } else if (currentType === "License") {
      detailsUrl = `${API_URL}/api/v1/license/${itemId}`;
    }

    $.ajax({
      url: detailsUrl,
      method: "GET",
      headers: { "Content-Type": "application/json" },
      success: function (response) {
        currentItem = response;
        owner = null;
        licenses = [];
        vehicles = [];
        firearms = [];
        arrestReports = [];
        totalCriminalHistory = criminalHistory.filter(
          (entry) => entry.type === "Citation" || entry.type === "Warning"
        ).length;
        currentCriminalPage = 1;
        criminalHistory = currentItem.civilian?.criminalHistory || [];
        loadingStatuses.find((s) => s.id === "details").status = "success";
        updateLoadingStatuses();

        // Fetch owner for Vehicle/Firearm/License
        const linkedCivID =
          currentType === "Vehicle"
            ? currentItem.vehicle?.linkedCivilianID
            : currentType === "Firearm"
            ? currentItem.firearm?.linkedCivilianID
            : currentType === "License"
            ? currentItem.license?.civilianID
            : null;
        const requests = [];
        if (linkedCivID) {
          requests.push(
            $.ajax({
              url: `${API_URL}/api/v1/civilian/${linkedCivID}`,
              method: "GET",
              success: function (ownerData) {
                owner = ownerData;
                loadingStatuses.find((s) => s.id === "owner").status =
                  "success";
                updateLoadingStatuses();
              },
              error: function (xhr) {
                console.error("Error fetching owner:", xhr.responseText);
                owner = null;
                loadingStatuses.find((s) => s.id === "owner").status = "error";
                updateLoadingStatuses();
              },
            })
          );
        } else if (
          currentType === "Vehicle" ||
          currentType === "Firearm" ||
          currentType === "License"
        ) {
          loadingStatuses.find((s) => s.id === "owner").status = "success";
          updateLoadingStatuses();
        }

        // Fetch linked items for Civilian
        if (currentType === "Civilian") {
          loadingStatuses.find((s) => s.id === "criminalHistory").status =
            "success";
          requests.push(
            $.ajax({
              url: `${API_URL}/api/v1/licenses/civilian/${itemId}?limit=3&page=1`,
              method: "GET",
              success: function (data) {
                licenses = data.data || [];
                loadingStatuses.find((s) => s.id === "licenses").status =
                  "success";
                updateLoadingStatuses();
              },
              error: function (xhr) {
                console.error("Error fetching licenses:", xhr.responseText);
                licenses = [];
                loadingStatuses.find((s) => s.id === "licenses").status =
                  "error";
                updateLoadingStatuses();
              },
            }),
            $.ajax({
              url: `${API_URL}/api/v1/vehicles/registered-owner/${itemId}?limit=3&page=0`,
              method: "GET",
              success: function (data) {
                vehicles = data.vehicles || [];
                loadingStatuses.find((s) => s.id === "vehicles").status =
                  "success";
                updateLoadingStatuses();
              },
              error: function (xhr) {
                console.error("Error fetching vehicles:", xhr.responseText);
                vehicles = [];
                loadingStatuses.find((s) => s.id === "vehicles").status =
                  "error";
                updateLoadingStatuses();
              },
            }),
            $.ajax({
              url: `${API_URL}/api/v1/firearms/registered-owner/${itemId}?limit=3&page=0`,
              method: "GET",
              success: function (data) {
                firearms = data.firearms || [];
                loadingStatuses.find((s) => s.id === "firearms").status =
                  "success";
                updateLoadingStatuses();
              },
              error: function (xhr) {
                console.error("Error fetching firearms:", xhr.responseText);
                firearms = [];
                loadingStatuses.find((s) => s.id === "firearms").status =
                  "error";
                updateLoadingStatuses();
              },
            }),
            $.ajax({
              url: `${API_URL}/api/v1/arrest-report/arrestee/${itemId}?limit=3&page=0`,
              method: "GET",
              success: function (data) {
                arrestReports = data.data || [];
                totalArrestReports = data.totalCount || 0;
                currentArrestPage = 1;
                loadingStatuses.find((s) => s.id === "arrestReports").status =
                  "success";
                updateLoadingStatuses();
              },
              error: function (xhr) {
                console.error(
                  "Error fetching arrest reports:",
                  xhr.responseText
                );
                arrestReports = [];
                totalArrestReports = 0;
                loadingStatuses.find((s) => s.id === "arrestReports").status =
                  "error";
                updateLoadingStatuses();
              },
            })
          );
        }

        $.when
          .apply($, requests)
          .done(function () {
            renderDetails();
            $("#detailsLoading").hide();
            $("#detailsContent").show();
          })
          .fail(function () {
            console.error("One or more detail requests failed");
            renderDetails();
            $("#detailsLoading").hide();
            $("#detailsContent").show();
          });
      },
      error: function (xhr) {
        console.error("Error fetching details:", xhr.responseText);
        loadingStatuses.find((s) => s.id === "details").status = "error";
        updateLoadingStatuses();
        alert(
          "Failed to load details: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
        hideModal("detailsModal");
        isOpeningModal = false;
      },
    });
  }

  function fetchArrestReports(page) {
    if (page < 0) return;
    const itemId = currentItem._id;
    loadingStatuses.find((s) => s.id === "arrestReports").status = "pending";
    updateLoadingStatuses();

    $.ajax({
      url: `${API_URL}/api/v1/arrest-report/arrestee/${itemId}?limit=3&page=${page}`,
      method: "GET",
      success: function (data) {
        arrestReports = data.data || [];
        totalArrestReports = data.totalCount || 0;
        currentArrestPage = page;
        loadingStatuses.find((s) => s.id === "arrestReports").status =
          "success";
        updateLoadingStatuses();
        renderDetails();
      },
      error: function (xhr) {
        console.error("Error fetching arrest reports:", xhr.responseText);
        arrestReports = [];
        totalArrestReports = 0;
        loadingStatuses.find((s) => s.id === "arrestReports").status = "error";
        updateLoadingStatuses();
        renderDetails();
      },
    });
  }

  // Update loading statuses in DOM
  function updateLoadingStatuses() {
    const $statuses = $("#loadingStatuses");
    $statuses.empty();
    loadingStatuses.forEach((status) => {
      const iconHtml =
        status.status === "pending"
          ? '<span class="spinner-border spinner-border-sm"></span>'
          : status.status === "success"
          ? '<i class="fa fa-check"></i>'
          : '<i class="fa fa-times"></i>';
      $statuses.append(`
        <div class="loading-item">
          ${iconHtml}
          <span>${status.label}</span>
        </div>
      `);
    });
  }

  // Render details
  function renderDetails() {
    const data =
      currentType === "Civilian"
        ? currentItem.civilian
        : currentType === "Vehicle"
        ? currentItem.vehicle
        : currentType === "Firearm"
        ? currentItem.firearm
        : currentItem.license;

    // Image
    const placeholderName =
      currentType === "Civilian"
        ? data.name || `${data.firstName || ""} ${data.lastName || ""}`
        : currentType === "Vehicle"
        ? `${data.make || ""} ${data.model || ""}`
        : currentType === "Firearm"
        ? `${data.name || ""}`
        : data.type || "License";
    $("#detailsImage").attr(
      "src",
      data.image ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          placeholderName
        )}&background=808080&color=fff&size=256`
    );

    // Details
    let detailsHtml = "";
    if (currentType === "Civilian") {
      detailsHtml = `
        <div class="mb-2"><span class="text-gray">Name:</span> ${
          data.name || `${data.firstName || ""} ${data.lastName || ""}`
        }</div>
        <div class="mb-2"><span class="text-gray">Date of Birth:</span> ${
          data.birthday || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Address:</span> ${
          data.address || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Warrants:</span> ${
          data.warrants?.length > 0
            ? '<span class="text-danger">Active Warrant</span>'
            : "None"
        }</div>
        <div class="mb-2"><span class="text-gray">Parole:</span> ${
          data.onParole ? '<span class="text-warning">On Parole</span>' : "None"
        }</div>
        <div class="mb-2"><span class="text-gray">Probation:</span> ${
          data.onProbation
            ? '<span class="text-warning">On Probation</span>'
            : "None"
        }</div>
      `;
    } else if (currentType === "Vehicle") {
      detailsHtml = `
        <div class="mb-2"><span class="text-gray">VIN:</span> ${
          data.vin?.toUpperCase() || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">License Plate:</span> ${
          data.plate || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">License Plate State:</span> ${
          data.licensePlateState || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Type:</span> ${
          data.type || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Make:</span> ${
          data.make || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Model:</span> ${
          data.model || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Year:</span> ${
          data.year || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Stolen:</span> ${
          data.isStolen ? '<span class="badge-stolen">Yes</span>' : "No"
        }</div>
        <div class="mb-2"><span class="text-gray">Registered Owner:</span> ${
          owner
            ? `<a href="#" class="owner-link" data-id="${
                data.linkedCivilianID
              }" data-type="Civilian">${owner.civilian.name || "Unknown"}</a>`
            : "No Owner"
        }</div>
      `;
    } else if (currentType === "Firearm") {
      detailsHtml = `
        <div class="mb-2"><span class="text-gray">Serial Number:</span> ${
          data.serialNumber || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Name:</span> ${
          data.name || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Caliber:</span> ${
          data.caliber || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Stolen:</span> ${
          data.isStolen ? '<span class="badge-stolen">Yes</span>' : "No"
        }</div>
        <div class="mb-2"><span class="text-gray">Registered Owner:</span> ${
          owner
            ? `<a href="#" class="owner-link" data-id="${
                data.linkedCivilianID
              }" data-type="Civilian">${owner.civilian.name || "Unknown"}</a>`
            : "No Owner"
        }</div>
      `;
    } else if (currentType === "License") {
      detailsHtml = `
        <div class="mb-2"><span class="text-gray">Type:</span> ${
          data.type || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Status:</span> ${
          data.status || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Expiration Date:</span> ${
          data.expirationDate || "N/A"
        }</div>
        <div class="mb-2"><span class="text-gray">Notes:</span> ${
          data.notes || "N/A"
        }</div>
      `;
    }
    $("#detailsInfo").html(detailsHtml);

    // Arrest Reports (Civilian Only)
    let arrestReportsHtml = "";
    if (currentType === "Civilian") {
      arrestReportsHtml = `
    <h5 class="text-white mb-2">Arrest Reports (${arrestReports.length})</h5>
    ${
      arrestReports.length > 0
        ? arrestReports
            .map(
              (report) => `
          <div class="details-item">
            <div class="d-flex justify-content-between">
              <span>Case #${report.arrestReport.reportNumber || "N/A"}</span>
              <span>${report.arrestReport.arrestDate || "N/A"}</span>
            </div>
            <p class="text-gray mb-0">Charges: ${
              report.arrestReport.charges || "N/A"
            }</p>
            <p class="text-gray mb-0">Location: ${
              report.arrestReport.arrestLocation || "N/A"
            }</p>
          </div>
        `
            )
            .join("")
        : '<p class="text-gray">No arrest reports found.</p>'
    }
    ${
      totalArrestReports > 3
        ? `
          <div class="d-flex justify-content-between mt-2">
            <button class="btn btn-primary" onclick="fetchArrestReports(${
              currentArrestPage - 1
            })" ${currentArrestPage === 1 ? "disabled" : ""}>Previous</button>
            <button class="btn btn-primary" onclick="fetchArrestReports(${
              currentArrestPage + 1
            })" ${
            currentArrestPage * 3 >= totalArrestReports ? "disabled" : ""
          }>Next</button>
          </div>
        `
        : ""
    }
  `;
    }
    $("#arrestReports").html(arrestReportsHtml);

    // Linked Items (Civilian Only)
    let linkedHtml = "";
    if (currentType === "Civilian") {
      linkedHtml += `
        <h5 class="text-white mb-2">Licenses (${licenses.length})</h5>
        ${
          licenses.length > 0
            ? licenses
                .map(
                  (license) => `
          <div class="details-item" data-id="${
            license._id
          }" data-type="License" data-item='${JSON.stringify({
                    _id: license._id,
                    license: license.license,
                  })}'>
            <div class="d-flex justify-content-between">
              <span>${license.license.type || "License"}</span>
              <span>
                ${
                  license.license.status === "Revoked"
                    ? '<span class="badge-status badge-revoked">Revoked</span>'
                    : ""
                }
                ${
                  license.license.expirationDate &&
                  isExpired(license.license.expirationDate)
                    ? '<span class="badge-status badge-expired">Expired</span>'
                    : ""
                }
              </span>
            </div>
            <p class="text-gray mb-0">Status: ${
              license.license.status || "N/A"
            } | Exp: ${license.license.expirationDate || "N/A"}</p>
            <p class="text-gray mb-0">${license.license.notes || ""}</p>
          </div>
        `
                )
                .join("")
            : '<p class="text-gray">No licenses found.</p>'
        }
        ${
          licenses.length > 3
            ? `
          <button class="btn btn-primary btn-block mt-2" onclick="alert('View All Licenses not implemented')">View All Licenses</button>
        `
            : ""
        }

        <h5 class="text-white mb-2 mt-4">Registered Vehicles</h5>
        ${
          vehicles.length > 0
            ? vehicles
                .map(
                  (vehicle) => `
          <div class="details-item" data-id="${
            vehicle._id
          }" data-type="Vehicle" data-item='${JSON.stringify({
                    _id: vehicle._id,
                    vehicle: vehicle.vehicle,
                  })}'>
            <div class="d-flex justify-content-between">
              <span>${vehicle.vehicle.make || ""} ${
                    vehicle.vehicle.model || ""
                  } ${
                    vehicle.vehicle.year ? "(" + vehicle.vehicle.year + ")" : ""
                  }</span>
              ${
                vehicle.vehicle.isStolen
                  ? '<span class="badge-status badge-stolen">Stolen</span>'
                  : ""
              }
            </div>
            <p class="text-gray mb-0">VIN: ${
              vehicle.vehicle.vin || "N/A"
            } | Plate: ${vehicle.vehicle.plate || "N/A"}</p>
          </div>
        `
                )
                .join("")
            : '<p class="text-gray">No registered vehicles.</p>'
        }
        ${
          vehicles.length > 3
            ? `
          <button class="btn btn-primary btn-block mt-2" onclick="alert('View All Vehicles not implemented')">View All Vehicles</button>
        `
            : ""
        }

        <h5 class="text-white mb-2 mt-4">Registered Firearms</h5>
        ${
          firearms.length > 0
            ? firearms
                .map(
                  (firearm) => `
          <div class="details-item" data-id="${
            firearm._id
          }" data-type="Firearm" data-item='${JSON.stringify({
                    _id: firearm._id,
                    firearm: firearm.firearm,
                  })}'>
            <div class="d-flex justify-content-between">
              <span>${firearm.firearm.name || ""} ${
                    firearm.firearm.caliber || ""
                  }</span>
              ${
                firearm.firearm.isStolen
                  ? '<span class="badge-status badge-stolen">Stolen</span>'
                  : ""
              }
            </div>
            <p class="text-gray mb-0">Serial: ${
              firearm.firearm.serialNumber || "N/A"
            }</p>
          </div>
        `
                )
                .join("")
            : '<p class="text-gray">No registered firearms.</p>'
        }
        ${
          firearms.length > 3
            ? `
          <button class="btn btn-primary btn-block mt-2" onclick="alert('View All Firearms not implemented')">View All Firearms</button>
        `
            : ""
        }
      `;
    }
    $("#linkedItems").html(linkedHtml);

    // Criminal History
    // Criminal History (Civilian Only)
    let criminalHistoryHtml = "";
    if (currentType === "Civilian") {
      const historyEntries = (currentItem.civilian.criminalHistory || [])
        .filter(
          (entry) => entry.type === "Citation" || entry.type === "Warning"
        )
        .slice((currentCriminalPage - 1) * 3, currentCriminalPage * 3);
      totalCriminalHistory = (
        currentItem.civilian.criminalHistory || []
      ).filter(
        (entry) => entry.type === "Citation" || entry.type === "Warning"
      ).length;
      criminalHistoryHtml = `
    <h5 class="text-white mb-2">Criminal History (${totalCriminalHistory})</h5>
    ${
      historyEntries.length > 0
        ? historyEntries
            .map(
              (entry) => `
          <div class="details-item">
            <div class="d-flex justify-content-between">
              <span>Type: ${entry.type || "N/A"}</span>
              <span>Date: ${
                entry.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString()
                  : "N/A"
              }</span>
            </div>
            <p class="text-gray mb-0">Notes: ${entry.notes || "N/A"}</p>
            ${
              entry.type === "Citation" && entry.fines
                ? `<p class="text-gray mb-0">Fines: ${entry.fines
                    .map((f) => `${f.fineType}: $${f.fineAmount}`)
                    .join(", ")}</p>`
                : ""
            }
          </div>
        `
            )
            .join("")
        : '<p class="text-gray">No citations or warnings found.</p>'
    }
    ${
      totalCriminalHistory > 3
        ? `
          <div class="d-flex justify-content-between mt-2">
            <button class="btn btn-primary" onclick="changeCriminalPage(${
              currentCriminalPage - 1
            })" ${currentCriminalPage === 1 ? "disabled" : ""}>Previous</button>
            <button class="btn btn-primary" onclick="changeCriminalPage(${
              currentCriminalPage + 1
            })" ${
            currentCriminalPage * 3 >= totalCriminalHistory ? "disabled" : ""
          }>Next</button>
          </div>
        `
        : ""
    }
  `;
    }
    $("#criminalHistory").html(criminalHistoryHtml);

    // Action Buttons
    let actionsHtml = "";
    if (currentType === "Vehicle" || currentType === "Firearm") {
      actionsHtml += `
        <button class="btn btn-warning btn-block mb-2 action-button" data-action="Report Stolen" data-stolen="${
          data.isStolen
        }">
          ${data.isStolen ? "Mark as Not Stolen" : "Report Stolen"}
        </button>
      `;
    } else if (currentType === "License") {
      actionsHtml += `
        <button class="btn ${
          data.status === "Revoked" ? "btn-success" : "btn-danger"
        } btn-block mb-2 action-button" data-action="Update License" data-license-id="${
        currentItem._id
      }" data-status="${data.status}">
          ${data.status === "Revoked" ? "Reinstate License" : "Revoke License"}
        </button>
      `;
    } else if (currentType === "Civilian") {
      actionsHtml += `
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Update On Probation">Update On Probation</button>
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Update On Parole">Update On Parole</button>
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Update Warrant">Update Warrant</button>
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Issue Citation">Issue Citation</button>
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Issue Warning">Issue Warning</button>
        <button class="btn btn-danger btn-block mb-2 action-button" data-action="Arrest">Arrest</button>
      `;
    }
    $("#actionButtons").html(actionsHtml);
  }

  // Check if license is expired
  function isExpired(expirationDate) {
    if (!expirationDate) return false;
    try {
      const [month, day, year] = expirationDate.split("/").map(Number);
      const expDate = new Date(year, month - 1, day);
      return expDate.getTime() <= Date.now();
    } catch (error) {
      console.warn("Invalid expiration date format:", expirationDate);
      return false;
    }
  }

  function changeCriminalPage(page) {
    if (page < 1) return;
    currentCriminalPage = page;
    renderDetails();
  }

  // Handle report stolen
  function handleReportStolen(itemId, isStolen) {
    if (
      !confirm(
        `Are you sure you want to ${
          isStolen ? "mark as not stolen" : "report as stolen"
        }?`
      )
    )
      return;
    const updateUrl =
      currentType === "Vehicle"
        ? `${API_URL}/api/v1/vehicle/${itemId}`
        : `${API_URL}/api/v1/firearm/${itemId}`;
    $.ajax({
      url: updateUrl,
      method: "PUT",
      data: JSON.stringify({ isStolen: isStolen ? false : true }),
      contentType: "application/json",
      success: function () {
        alert(
          `Successfully ${
            isStolen ? "marked as not stolen" : "reported as stolen"
          }.`
        );
        fetchDetails();
      },
      error: function (xhr) {
        console.error("Error updating stolen status:", xhr.responseText);
        alert(
          "Failed to update stolen status: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  // Handle update license
  function handleUpdateLicense(licenseId, currentStatus) {
    const newStatus = currentStatus === "Revoked" ? "Approved" : "Revoked";
    if (
      !confirm(
        `Are you sure you want to ${newStatus.toLowerCase()} this license?`
      )
    )
      return;
    $.ajax({
      url: `${API_URL}/api/v1/license/${licenseId}`,
      method: "PUT",
      data: JSON.stringify({ status: newStatus }),
      contentType: "application/json",
      success: function () {
        alert(`License successfully ${newStatus.toLowerCase()}.`);
        fetchDetails();
      },
      error: function (xhr) {
        console.error("Error updating license:", xhr.responseText);
        alert(
          "Failed to update license: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  // Update civilian status
  function updateCivilianStatus(action) {
    let updateData = {};
    let confirmMessage = "";
    const civilianId = currentItem._id;

    if (action === "Update On Probation") {
      const newStatus = !currentItem.civilian.onProbation;
      updateData = { onProbation: newStatus };
      confirmMessage = `Are you sure you want to set this civilian's status to ${
        newStatus ? "On probation" : "No longer on probation"
      }?`;
    } else if (action === "Update On Parole") {
      const newStatus = !currentItem.civilian.onParole;
      updateData = { onParole: newStatus };
      confirmMessage = `Are you sure you want to set this civilian's status to ${
        newStatus ? "On parole" : "No longer on parole"
      }?`;
    } else if (action === "Update Warrant") {
      hasWarrants = currentItem.civilian.warrants?.length > 0;
      if (hasWarrants) {
        confirmMessage = "Are you sure you want to clear the active warrant?";
        updateData = { warrants: [] };
      } else {
        confirmMessage = "Are you sure you want to issue a warrant?";
        updateData = {
          warrants: [
            {
              status: "Granted",
              date: new Date().toISOString(),
            },
          ],
        };
      }
    }

    if (!confirm(confirmMessage)) return;

    $.ajax({
      url: `${API_URL}/api/v1/civilian/${civilianId}`,
      method: "PUT",
      data: JSON.stringify(updateData),
      contentType: "application/json",
      success: function (response) {
        alert("Status updated successfully.");
        // currentItem = response;
        fetchDetails();
      },
      error: function (xhr) {
        console.error("Error updating civilian status:", xhr.responseText);
        alert(
          "Failed to update status: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  // Open existing action modals
  function openActionModal(action) {
    if (
      ["Update On Probation", "Update On Parole", "Update Warrant"].includes(
        action
      )
    ) {
      updateCivilianStatus(action);
    } else if (action === "Issue Citation") {
      $("#ticketModal").modal("show");
      $("#ticket-civ-name").text(currentItem.civilian?.name || "");
      $("#ticket-civ-action-type").text("Citation");
      $("#ticket-civ-date").text(new Date().toLocaleDateString());
      $("#civID").val(currentItem._id);
      $("#ticket-select").val([]);
      $("#ticket-other").val("");
      $("#amount").val("");

      // Fetch community fines
      const communityId = dbUser.user.lastAccessedCommunity.communityID;
      $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        method: "GET",
        success: function (data) {
          const communityFines = data?.community?.fines?.categories || [];
          const $select = $("#ticket-select");
          $select.find('optgroup:not([label="Crime not listed"])').remove();
          if (communityFines.length === 0) {
            $select.prepend(
              '<optgroup label="No fines available"><option disabled>No fines found</option></optgroup>'
            );
          } else {
            communityFines.forEach((category) => {
              const $optgroup = $(
                `<optgroup label="${category.name || "Unknown"}"></optgroup>`
              );
              (category.fines || []).forEach((fine) => {
                $optgroup.append(
                  `<option value="${fine.name}" data-amount="${fine.amount}">${fine.name} ($${fine.amount})</option>`
                );
              });
              $select.prepend($optgroup);
            });
          }
          // Initialize Select2
          $select.select2({
            placeholder: "Select fines...",
            allowClear: true,
            width: "100%",
            dropdownParent: $("#ticketModal"),
          });
          // Update total amount on fine selection
          $select.on("change", function () {
            const selectedFines = $(this).val() || [];
            const total = selectedFines
              .filter((fine) => fine !== "Other")
              .reduce((sum, fine) => {
                const amount =
                  parseInt(
                    $(`#ticket-select option[value="${fine}"]`).data("amount")
                  ) || 0;
                return sum + amount;
              }, 0);
            $("#amount").val(total);
          });
        },
        error: function (xhr) {
          console.error("Error fetching community fines:", xhr.responseText);
          alert(
            "Failed to load fines: " +
              (xhr.responseJSON?.message || "Unknown error")
          );
          const $select = $("#ticket-select");
          $select.find('optgroup:not([label="Crime not listed"])').remove();
          $select.prepend(
            '<optgroup label="Error"><option disabled>Failed to load fines</option></optgroup>'
          );
          $select.select2({
            placeholder: "Select fines...",
            allowClear: true,
            width: "100%",
            dropdownParent: $("#ticketModal"),
          });
          $select.on("change", function () {
            const selectedFines = $(this).val() || [];
            const total = selectedFines
              .filter((fine) => fine !== "Other")
              .reduce((sum, fine) => {
                const amount =
                  parseInt(
                    $(`#ticket-select option[value="${fine}"]`).data("amount")
                  ) || 0;
                return sum + amount;
              }, 0);
            $("#amount").val(total);
          });
        },
      });
    } else if (action === "Issue Warning") {
      $("#warningModal").modal("show");
      $("#warning-civ-first-name").text(currentItem.civilian?.name || "");
      $("#warning-civ-action-type").text("Warning");
      $("#warning-civ-date").text(new Date().toLocaleDateString());
      $("#civIDWarning").val(currentItem._id);
    } else if (action === "Arrest") {
      $("#arrestModal").modal("show");
      $("#arrest-report-case-no").val(
        Math.floor(Math.random() * (9999999 - 100000)) + 100000
      );
      let today = new Date();
      let day = String(today.getDate()).padStart(2, "0");
      let month = String(today.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
      let year = today.getFullYear();
      let formattedDate = `${year}-${month}-${day}`;
      let hours = today.getHours().toString().padStart(2, "0");
      let minutes = today.getMinutes().toString().padStart(2, "0");
      let currentTime = hours + ":" + minutes;
      $("#arrest-report-date").val(formattedDate);
      $("#arrest-report-time").val(currentTime);
      $("#arrest-report-incident-date").val(formattedDate);
      $("#arrest-report-incident-time").val(currentTime);
      $("#arrest-civ-first-name").val(currentItem.civilian?.name || "");
      $("#arrest-civ-dob").val(currentItem.civilian?.birthday || "");
      $("#arrest-civ-address").val(currentItem.civilian?.address || "");
      $("#arrest-civ-height").val(currentItem.civilian?.height || "");
      $("#arrest-civ-weight").val(currentItem.civilian?.weight || "");
      $("#arrest-civ-eyes").val(currentItem.civilian?.eyeColor || "");
      $("#arrest-civ-hair").val(currentItem.civilian?.hairColor || "");
      //   $("#arrest-civ-weight").val(currentItem.civilian?.weight || "");

      $("#arrest-location").val("");
      $("#incident-location").val("");
      $("#arrest-civ-charges").val("");
      $("#forceUsed").val("");
      $("#detail").val("");
      $("#actions-taken").val("");
      $("#civIDArrest").val(currentItem._id);
    } else if (action === "Update License") {
      const licenseId = $(this).data("license-id");
      const currentStatus = $(this).data("status");
      handleUpdateLicense(licenseId, currentStatus);
    } else if (action === "Report Stolen") {
      const itemId = currentItem._id;
      const isStolen = $(this).data("stolen");
      handleReportStolen(itemId, isStolen);
    }
  }

  // Handle arrest report submission
  function submitArrestReport() {
    const formData = {
      arrestReport: {
        reportNumber: $("#arrest-report-case-no").val(),
        arrestDate: $("#arrest-report-date").val(),
        arrestTime: $("#arrest-report-time").val(),
        arrestLocation: $("#arrest-location").val(),
        incidentDate: $("#arrest-report-incident-date").val(),
        incidentTime: $("#arrest-report-incident-time").val(),
        incidentLocation: $("#incident-location").val(),
        arrestee: {
          id: $("#civIDArrest").val(),
          name: $("#arrest-civ-first-name").val(),
          dob: $("#arrest-civ-dob").val(),
          address: $("#arrest-civ-address").val(),
          height: $("#arrest-civ-height").val(),
          weight: $("#arrest-civ-weight").val(),
          eyeColor: $("#arrest-civ-eyes").val(),
          hairColor: $("#arrest-civ-hair").val(),
          phone: $("#arrest-civ-phone").val(),
        },
        officer: {
          name: $("#reporting-officer").val(),
          badgeNumber: dbUser.user.callSign || "Unknown",
        },
        charges: $("#arrest-civ-charges").val(),
        narrative: $("#detail").val(),
        witnesses: $("#actions-taken").val(),
        forceUsed: $("#forceUsed").val() === "Yes",
        attachedForms: [], // Placeholder; extend if forms are added
      },
    };

    $.ajax({
      url: `${API_URL}/api/v1/arrest-report`,
      method: "POST",
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function () {
        alert("Arrest report created successfully.");
        $("#arrestModal").modal("hide");
        fetchDetails();
      },
      error: function (xhr) {
        console.error("Error creating arrest report:", xhr.responseText);
        alert(
          "Failed to create arrest report: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function submitWarningReport() {
    const civilianId = $("#civIDWarning").val();
    const currentDate = new Date().toISOString().split("T")[0];
    const newEntry = {
      officerID: dbUser._id || "Unknown",
      type: "Warning",
      fines: [],
      notes: $("#warning-civ-additional-notes").val() || null,
      date: currentDate,
    };

    $.ajax({
      url: `${API_URL}/api/v1/civilian/${civilianId}/criminal-history`,
      method: "POST",
      data: JSON.stringify(newEntry),
      contentType: "application/json",
      success: function () {
        alert("Warning issued successfully.");
        $("#warningModal").modal("hide");
        fetchDetails();
      },
      error: function (xhr) {
        console.error("Error issuing warning:", xhr.responseText);
        alert(
          "Failed to issue warning: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function submitCitationReport() {
    const civilianId = $("#civID").val();
    const currentDate = new Date().toISOString().split("T")[0];
    const selectedFines = $("#ticket-select").val() || [];
    const otherFine = $("#ticket-other").val();
    const fines = selectedFines
      .filter((fine) => fine !== "Other")
      .map((fine) => {
        const $option = $(`#ticket-select option[value="${fine}"]`);
        const amount = parseInt($option.data("amount")) || 0;
        return {
          fineType: fine,
          fineAmount: amount,
          category: $option.closest("optgroup").attr("label") || "Other",
        };
      });
    if (selectedFines.includes("Other") && otherFine) {
      const otherAmount = parseInt($("#amount").val()) || 0;
      fines.push({
        fineType: otherFine,
        fineAmount: otherAmount,
        category: "Other",
      });
    }

    const newEntry = {
      officerID: dbUser._id || "Unknown",
      type: "Citation",
      fines: fines.length > 0 ? fines : [],
      notes: otherFine || selectedFines.join(", ") || null,
      date: currentDate,
    };

    $.ajax({
      url: `${API_URL}/api/v1/civilian/${civilianId}/criminal-history`,
      method: "POST",
      data: JSON.stringify(newEntry),
      contentType: "application/json",
      success: function () {
        alert("Citation issued successfully.");
        $("#ticketModal").modal("hide");
        fetchDetails();
      },
      error: function (xhr) {
        console.error("Error issuing citation:", xhr.responseText);
        alert(
          "Failed to issue citation: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  // Add submit handler for warning form
  $("#warning-form").on("submit", function (e) {
    e.preventDefault();
    submitWarningReport();
  });

  // Add submit handler for arrest form
  $("#arrest-form").on("submit", function (e) {
    e.preventDefault();
    submitArrestReport();
  });

  // Add submit handler for ticket form
  $("#ticket-form").on("submit", function (e) {
    e.preventDefault();
    submitCitationReport();
  });

  // Add click handler for details items
  $(document).on("click", ".details-item", function () {
    const id = $(this).data("id");
    const type = $(this).data("type");
    const item = $(this).data("item");
    if (id && type && item) {
      showDetailsModal(item, type, true);
    }
  });

  // Add click handler for owner links
  $(document).on("click", ".owner-link", function (e) {
    e.preventDefault();
    const id = $(this).data("id");
    const type = $(this).data("type");
    if (id && type) {
      const item = { _id: id };
      showDetailsModal(item, type, true);
    }
  });

  // Add click handler for action buttons
  $(document).on("click", ".action-button", function () {
    const action = $(this).data("action");
    openActionModal.call(this, action);
  });

  // Expose showDetailsModal and goBack globally
  window.showDetailsModal = showDetailsModal;
  window.fetchArrestReports = fetchArrestReports;
  window.changeCriminalPage = changeCriminalPage;
  window.goBack = goBack;
});
