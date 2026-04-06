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

  // ——— ID Card Utility Functions ———

  function generateLicenseNumber(name, birthday, weight) {
    const seed = `${name}${birthday}${weight}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `${Math.abs(hash).toString().substring(0, 7).toUpperCase()}`;
  }

  function generateBarcodeHtml(licenseNumber) {
    function seededRandom(seed) {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }
    const seed = parseInt(licenseNumber.padStart(8, '0'), 36);
    const numBars = 40;
    let bars = [];
    let totalWidth = 0;
    for (let i = 0; i < numBars; i++) {
      const bw = 1 + Math.floor(seededRandom(seed + i) * 3);
      const isBar = (Math.floor(seededRandom(seed * (i + 3)) * 7) % 2) === 0;
      bars.push({ width: bw, isBar: isBar });
      totalWidth += bw + 0.5;
    }
    const scale = 100 / totalWidth;
    let html = '';
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      html += '<div style="display:inline-block;width:' + (bar.width * scale) + 'px;height:14px;background-color:' + (bar.isBar ? '#222' : 'transparent') + ';margin-right:' + (0.5 * scale) + 'px;border-radius:0.5px;"></div>';
    }
    return html;
  }

  function formatHeight(height, heightClassification) {
    if (!height || height <= 0) return 'N/A';
    if (heightClassification === 'Imperial') {
      return Math.floor(height / 12) + "' " + (height % 12) + '"';
    }
    return height + ' cm';
  }

  // Cache for civilian data
  let civilianCache = {
    civilianId: null,
    vehicles: {}, // Object to store vehicles by page: { 0: [...], 1: [...], etc }
    firearms: {}, // Object to store firearms by page: { 0: [...], 1: [...], etc }
    licenses: {}, // Object to store licenses by page: { 0: [...], 1: [...], etc }
    vehicleTotal: 0,
    firearmTotal: 0,
    licenseTotal: 0
  };

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
    
    // Clear cache if this is a new civilian (not from back button)
    if (type === "Civilian" && (!isFromLink || civilianCache.civilianId !== item._id)) {
      civilianCache = {
        civilianId: null,
        vehicles: {},
        firearms: {},
        licenses: {},
        vehicleTotal: 0,
        firearmTotal: 0,
        licenseTotal: 0
      };
    }

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
    $("#licenseCardContainer").hide();
    $("#detailsImageContainer").hide();
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
              url: `${API_URL}/api/v1/arrest-report/arrestee/${itemId}?limit=3&page=0`,
              method: "GET",
              success: function (data) {
                arrestReports = data.data || [];
                totalArrestReports = data.totalCount || 0;
                currentArrestPage = 0;
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

    // Image / ID Card
    const placeholderName =
      currentType === "Civilian"
        ? data.name || `${data.firstName || ""} ${data.lastName || ""}`
        : currentType === "Vehicle"
        ? `${data.make || ""} ${data.model || ""}`
        : currentType === "Firearm"
        ? `${data.name || ""}`
        : data.type || "License";
    const imageUrl =
      data.image ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        placeholderName
      )}&background=808080&color=fff&size=256`;

    if (currentType === "Civilian") {
      $("#detailsImageContainer").hide();
      $("#licenseCardContainer").show();
      // Populate ID card fields
      $("#licenseCardPhoto").attr("src", imageUrl);
      const civName = data.name || `${data.firstName || ""} ${data.lastName || ""}`;
      const licNum = generateLicenseNumber(civName, data.birthday || "", data.weight || "");
      $("#licenseCardNumber").text(licNum.padStart(8, '0'));
      $("#licenseCardName").text(civName.toUpperCase());
      const expDate = new Date(new Date().setFullYear(new Date().getFullYear() + 8))
        .toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
      $("#licenseCardExpiration").text("expiration date: " + expDate);
      $("#licenseCardDob").text(data.birthday || "N/A");
      $("#licenseCardHeight").text(formatHeight(data.height, data.heightClassification));
      $("#licenseCardGender").text(data.gender || "N/A");
      $("#licenseCardAddress").text(data.address || "N/A");
      $("#licenseCardBarcode").html(generateBarcodeHtml(licNum));
    } else {
      $("#licenseCardContainer").hide();
      $("#detailsImageContainer").show();
      $("#detailsImage").attr("src", imageUrl);
    }

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
        <div class="mb-2"><span class="text-gray">Warrants:</span> <span id="warrant-status-display"><i class="fa fa-spinner fa-spin fa-sm"></i></span></div>
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
        <div class="mb-2"><span class="text-gray">Registration:</span> ${
          (data.validRegistration === 'true' || data.validRegistration === '1') ? '<span class="badge-stolen" style="background-color: #10b981; color: white;">Valid</span>' : '<span class="badge-stolen" style="background-color: #ef4444; color: white;">Invalid</span>'
        }</div>
        <div class="mb-2"><span class="text-gray">Insurance:</span> ${
          (data.validInsurance === 'true' || data.validInsurance === '1') ? '<span class="badge-stolen" style="background-color: #10b981; color: white;">Valid</span>' : '<span class="badge-stolen" style="background-color: #ef4444; color: white;">Invalid</span>'
        }</div>
        <div class="mb-2"><span class="text-gray">Stolen:</span> ${
          (data.isStolen === 'true' || data.isStolen === '2') ? '<span class="badge-stolen">Yes</span>' : '<span class="badge-stolen" style="background-color: #10b981; color: white;">No</span>'
        }</div>
        <div class="mb-2"><span class="text-gray">Exempt:</span> ${
          (data.isExempt === 'true') ? '<span class="badge-stolen" style="background-color: #3b82f6; color: white;">Yes</span>' : '<span class="badge-stolen" style="background-color: #6b7280; color: white;">No</span>'
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
          (data.isStolen === 'true' || data.isStolen === '2') ? '<span class="badge-stolen">Yes</span>' : "No"
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

    // Fetch real warrant status for civilians
    if (currentType === "Civilian" && currentItem?._id) {
      loadWarrantStatus(currentItem._id);
    }

    // Show/hide tabs based on type - only show for Civilian
    if (currentType === "Civilian") {
      $("#mainTabs").show();
      // Show criminal history tab by default
      $('.records-tab-btn').removeClass('active');
      $('#tabCriminalHistory').addClass('active');
      $('.records-tab-content').hide();
      $('#tabContentCriminal').show();
    } else {
      // Hide tabs for Vehicle, Firearm, and License
      $("#mainTabs").hide();
      // Clear tab content and hide it
      $('#vehiclesList').empty();
      $('#firearmsList').empty();
      $('#licensesList').empty(); // <-- Fix: clear licensesList for non-civilian
      $('.records-tab-content').hide();
    }



    // --- Records Sub-Tabs Logic ---
    // Fix race condition: Check if tabs exist and have proper state, default to Criminal tab if uncertain
    const $criminalTab = $("#tabCriminalHistory");
    const $medicalTab = $("#tabMedicalHistory");
    
    // If neither tab is active, default to Criminal tab
    if (!$criminalTab.hasClass("active") && !$medicalTab.hasClass("active")) {
      $criminalTab.addClass("active");
      $medicalTab.removeClass("active");
    }
    
    const isCriminalTabActive = $criminalTab.hasClass("active");
    const isMedicalTabActive = $medicalTab.hasClass("active");

    // Criminal History & Arrest Reports (only if Criminal tab is active)
    if (isCriminalTabActive && currentType === "Civilian") {
      // Arrest Reports
      const arrestPageSize = 3;
      const arrestTotalPages = Math.ceil(totalArrestReports / arrestPageSize);
      const arrestDisplayPage = currentArrestPage + 1;

      let arrestReportsHtml = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h5 class="text-white m-0">Arrest Reports (${totalArrestReports})</h5>
      ${totalArrestReports > arrestPageSize ? `<small class="text-gray">Page ${arrestDisplayPage} of ${arrestTotalPages}</small>` : ""}
    </div>
    ${
      arrestReports.length > 0
        ? arrestReports
            .map(
              (report, index) => `
          <div class="details-item arrest-report-item" data-report-index="${index}" style="cursor: pointer;">
            <div class="d-flex justify-content-between align-items-center">
              <span>Case #${report.arrestReport.reportNumber || "N/A"}</span>
              <div class="d-flex align-items-center">
                <span class="mr-2">${report.arrestReport.arrestDate || "N/A"}</span>
                <i class="fa fa-chevron-right text-gray"></i>
              </div>
            </div>
            <p class="text-gray mb-0">Charges: ${
              report.arrestReport.charges || "N/A"
            }</p>
            <p class="text-gray mb-0">Officer: ${
              report.arrestReport.officer?.name || "N/A"
            }</p>
          </div>
        `
            )
            .join("")
        : '<p class="text-gray">No arrest reports found.</p>'
    }
    ${
      totalArrestReports > arrestPageSize
        ? `
          <div class="d-flex justify-content-between mt-2">
            <button class="btn btn-primary" onclick="fetchArrestReports(${currentArrestPage - 1})" ${currentArrestPage === 0 ? "disabled" : ""}>Previous</button>
            <button class="btn btn-primary" onclick="fetchArrestReports(${currentArrestPage + 1})" ${arrestDisplayPage >= arrestTotalPages ? "disabled" : ""}>Next</button>
          </div>
        `
        : ""
    }
  `;
      $("#arrestReports").html(arrestReportsHtml);

      // Attach click handlers to arrest report items
      $(".arrest-report-item").on("click", function() {
        const reportIndex = $(this).data("report-index");
        showArrestReportDetail(arrestReports[reportIndex]);
      });

      // Criminal History
      let criminalHistoryHtml = "";
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
            <button class="btn btn-primary" onclick="changeCriminalPage(${currentCriminalPage - 1})" ${currentCriminalPage === 1 ? "disabled" : ""}>Previous</button>
            <button class="btn btn-primary" onclick="changeCriminalPage(${currentCriminalPage + 1})" ${currentCriminalPage * 3 >= totalCriminalHistory ? "disabled" : ""}>Next</button>
          </div>
        `
        : ""
    }
  `;
      $("#criminalHistory").html(criminalHistoryHtml);
    } else {
      // If not active, clear content
      $("#arrestReports").html("");
      $("#criminalHistory").html("");
    }

    // Medical History (only if Medical tab is active)
    if (isMedicalTabActive && currentType === "Civilian") {
      // Placeholder for now
      $("#medicalHistory").html('<p class="text-gray">Medical history records will appear here.</p>');
    } else {
      $("#medicalHistory").html("");
    }

    // Action Buttons
    let actionsHtml = "";
    if (currentType === "Vehicle" || currentType === "Firearm") {
      actionsHtml += `
        <button class="btn btn-warning btn-block mb-2 action-button" data-action="Report Stolen" data-stolen="${data.isStolen || 'false'}">
          ${(data.isStolen === 'true' || data.isStolen === '2') ? "Mark as Not Stolen" : "Report Stolen"}
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
      const hasActiveWarrants = currentItem.civilian?.warrants?.length > 0;
      actionsHtml += `
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Update On Probation">Update On Probation</button>
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Update On Parole">Update On Parole</button>
        <button class="btn btn-primary btn-block mb-2 action-button" data-action="Request Warrant">Request Warrant</button>
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
      let expDate;
      if (expirationDate.includes('-')) {
        // Format: YYYY-MM-DD
        expDate = new Date(expirationDate + 'T23:59:59'); // End of day
      } else if (expirationDate.includes('/')) {
        // Format: MM/DD/YYYY
        const [month, day, year] = expirationDate.split('/').map(Number);
        expDate = new Date(year, month - 1, day, 23, 59, 59);
      } else {
        return false;
      }
      return expDate.getTime() < Date.now();
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
    const isCurrentlyStolen = isStolen === true || isStolen === 'true' || isStolen === '2';
    const newStolenStatus = isCurrentlyStolen ? "false" : "true"; // Use string "true"/"false" system
    const actionText = isCurrentlyStolen ? "mark as not stolen" : "report as stolen";
    const successText = isCurrentlyStolen ? "marked as not stolen" : "reported as stolen";
    
    if (!confirm(`Are you sure you want to ${actionText}?`)) return;
    
    const updateUrl =
      currentType === "Vehicle"
        ? `${API_URL}/api/v1/vehicle/${itemId}`
        : `${API_URL}/api/v1/firearm/${itemId}`;
    $.ajax({
      url: updateUrl,
      method: "PUT",
      data: JSON.stringify({ isStolen: newStolenStatus }),
      contentType: "application/json",
      success: function () {
        alert(`Successfully ${successText}.`);
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
      ["Update On Probation", "Update On Parole"].includes(action)
    ) {
      updateCivilianStatus(action);
    } else if (action === "Request Warrant") {
      openWarrantRequestModal();
    } else if (action === "Issue Citation") {
      $("#ticketModal").modal("show");
      $("#ticket-civ-name").text(currentItem.civilian?.name || "");
      $("#ticket-civ-action-type").text("Citation");
      $("#ticket-civ-date").text(new Date().toLocaleDateString());
      $("#civID").val(currentItem._id);
      $("#ticket-select").val([]);
      $("#ticket-other").val("");
      $("#amount").val("");

      // Fetch penal codes for ticket violations
      const communityId = dbUser.user.lastAccessedCommunity.communityID;
      const knownCurrencies = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$' };
      function getCurrencySymbol(code) { return knownCurrencies[code] || code || '$'; }

      // Parse fine value — handles both int (500) and legacy string ("$500") formats
      function parseFine(val) {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          var n = parseInt(val.replace(/[^0-9]/g, ''), 10);
          return isNaN(n) ? 0 : n;
        }
        return 0;
      }

      $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}/penal-codes`,
        method: "GET",
        success: function (data) {
          const categories = (data && data.categories) || [];
          const currency = (data && data.currency) || 'USD';
          if (data && data.currencies) {
            data.currencies.forEach(function(c) { knownCurrencies[c.code] = c.symbol; });
          }
          const sym = getCurrencySymbol(currency);
          const $select = $("#ticket-select");
          $select.find('optgroup:not([label="Crime not listed"])').remove();
          if (categories.length === 0) {
            $select.prepend(
              '<optgroup label="No violations available"><option disabled>No violations found</option></optgroup>'
            );
          } else {
            categories.forEach((category) => {
              const $optgroup = $(
                `<optgroup label="${category.name || "Unknown"}"></optgroup>`
              );
              (category.violations || []).forEach((v) => {
                const fineAmount = parseFine(v.fine);
                const fineLabel = fineAmount ? ` (${sym}${fineAmount.toLocaleString()})` : '';
                $optgroup.append(
                  `<option value="${v.name}" data-amount="${fineAmount}">${v.name}${fineLabel}</option>`
                );
              });
              $select.prepend($optgroup);
            });
          }
          // Initialize Select2
          $select.select2({
            placeholder: "Select violations...",
            allowClear: true,
            width: "100%",
            dropdownParent: $("#ticketModal"),
          });
          // Update total amount on violation selection
          $select.on("change", function () {
            const selectedViolations = $(this).val() || [];
            const total = selectedViolations
              .filter((v) => v !== "Other")
              .reduce((sum, v) => {
                const amount =
                  parseInt(
                    $(`#ticket-select option[value="${v}"]`).data("amount")
                  ) || 0;
                return sum + amount;
              }, 0);
            $("#amount").val(total);
          });
        },
        error: function (xhr) {
          console.error("Error fetching penal codes:", xhr.responseText);
          alert(
            "Failed to load violations: " +
              (xhr.responseJSON?.message || "Unknown error")
          );
          const $select = $("#ticket-select");
          $select.find('optgroup:not([label="Crime not listed"])').remove();
          $select.prepend(
            '<optgroup label="Error"><option disabled>Failed to load violations</option></optgroup>'
          );
          $select.select2({
            placeholder: "Select violations...",
            allowClear: true,
            width: "100%",
            dropdownParent: $("#ticketModal"),
          });
          $select.on("change", function () {
            const selectedViolations = $(this).val() || [];
            const total = selectedViolations
              .filter((v) => v !== "Other")
              .reduce((sum, v) => {
                const amount =
                  parseInt(
                    $(`#ticket-select option[value="${v}"]`).data("amount")
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
      if ($('#arrest-civ-charges').hasClass('select2-hidden-accessible')) {
        $('#arrest-civ-charges').val(null).trigger('change');
      }
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
    // Client-side validation with visual feedback
    var requiredFields = [
      { id: "#arrest-report-date", label: "Date of Arrest" },
      { id: "#arrest-report-time", label: "Arrest Time" },
      { id: "#arrest-location", label: "Arrest Location" },
      { id: "#arrest-report-incident-date", label: "Date of Incident" },
      { id: "#arrest-report-incident-time", label: "Incident Time" },
      { id: "#incident-location", label: "Incident Location" },
      { id: "#arrest-civ-first-name", label: "Arrestee Name" },
      { id: "#arrest-civ-dob", label: "Date of Birth" },
      { id: "#arrest-civ-address", label: "Address" },
      { id: "#arrest-civ-height", label: "Height" },
      { id: "#arrest-civ-weight", label: "Weight" },
      { id: "#arrest-civ-eyes", label: "Eye Color" },
      { id: "#arrest-civ-hair", label: "Hair Color" },
      { id: "#detail", label: "Narrative of Events" },
      { id: "#actions-taken", label: "Witnesses" },
    ];

    // Clear previous validation styles
    $("#arrestModal .form-control").css("border-color", "");
    $("#arrestModal .arrest-validation-error").remove();

    var missingFields = [];
    requiredFields.forEach(function (field) {
      if (!$(field.id).val() || $(field.id).val().trim() === "") {
        $(field.id).css("border-color", "#e74c3c");
        missingFields.push(field.label);
      }
    });

    // Validate charges (multi-select)
    var charges = ($("#arrest-civ-charges").val() || []).filter(function(c) { return c !== 'Other'; });
    if (charges.length === 0) {
      $("#arrest-civ-charges").closest(".form-group").find(".select2-container, select").css("border-color", "#e74c3c");
      missingFields.push("Charges");
    }

    // Validate force used dropdown
    if (!$("#forceUsed").val()) {
      $("#forceUsed").css("border-color", "#e74c3c");
      missingFields.push("Force Used");
    }

    // Validate civilian ID (set from search)
    if (!$("#civIDArrest").val()) {
      missingFields.push("Civilian (search and select a civilian first)");
    }

    if (missingFields.length > 0) {
      var errorHtml = '<div class="alert alert-danger arrest-validation-error" style="margin-top:10px;">' +
        '<strong>Please fill in the following required fields:</strong><ul style="margin-bottom:0;padding-left:20px;">' +
        missingFields.map(function(f) { return '<li>' + f + '</li>'; }).join('') +
        '</ul></div>';
      $("#arrestModal #submitArrestReport").before(errorHtml);
      // Scroll to first invalid field
      var firstInvalid = $("#arrestModal .form-control[style*='border-color']").first();
      if (firstInvalid.length) {
        firstInvalid[0].scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    var activeDeptId = (typeof departmentId !== 'undefined') ? departmentId : null;
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
        charges: charges.join(", "),
        narrative: $("#detail").val(),
        witnesses: $("#actions-taken").val(),
        forceUsed: $("#forceUsed").val() === "Yes",
        attachedForms: [],
        officerID: dbUser._id || "",
        activeCommunityID: dbUser.user?.lastAccessedCommunity?.communityID || "",
        departmentId: activeDeptId,
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
        if (typeof loadMyRankProgress === 'function') loadMyRankProgress();
      },
      error: function (xhr) {
        console.error("Error creating arrest report:", xhr.responseText);
        var errorMsg = xhr.responseJSON?.response?.message ||
          xhr.responseJSON?.message ||
          "Unknown error";
        var errorHtml = '<div class="alert alert-danger arrest-validation-error" style="margin-top:10px;">' +
          '<strong>Failed to create arrest report:</strong> ' + $('<span>').text(errorMsg).html() +
          '</div>';
        $("#arrestModal .arrest-validation-error").remove();
        $("#arrestModal #submitArrestReport").before(errorHtml);
      },
    });
  }

  function submitWarningReport() {
    const civilianId = $("#civIDWarning").val();
    const currentDate = new Date().toISOString().split("T")[0];
    var activeDeptIdW = (typeof departmentId !== 'undefined') ? departmentId : null;
    const newEntry = {
      officerID: dbUser._id || "Unknown",
      type: "Warning",
      fines: [],
      notes: $("#warning-civ-additional-notes").val() || null,
      date: currentDate,
      departmentId: activeDeptIdW,
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
        if (typeof loadMyRankProgress === 'function') loadMyRankProgress();
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

    var activeDeptIdC = (typeof departmentId !== 'undefined') ? departmentId : null;
    const newEntry = {
      officerID: dbUser._id || "Unknown",
      type: "Citation",
      fines: fines.length > 0 ? fines : [],
      notes: otherFine || selectedFines.join(", ") || null,
      date: currentDate,
      departmentId: activeDeptIdC,
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
        if (typeof loadMyRankProgress === 'function') loadMyRankProgress();
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
      // Clear cache when clicking on owner link (different civilian)
      civilianCache = {
        civilianId: null,
        vehicles: {},
        firearms: {},
        vehicleTotal: 0,
        firearmTotal: 0
      };
      
      const item = { _id: id };
      showDetailsModal(item, type, true);
    }
  });

  // Add click handler for action buttons
  $(document).on("click", ".action-button", function () {
    const action = $(this).data("action");
    openActionModal.call(this, action);
  });

  // ── Warrant Status Display ──
  function loadWarrantStatus(civilianId) {
    $.ajax({
      url: `${API_URL}/api/v1/warrants/user/${civilianId}?limit=50`,
      method: 'GET',
      success: function(warrants) {
        const list = Array.isArray(warrants) ? warrants : [];
        const active = list.filter(w => {
          const s = (w.warrant?.status || '').toLowerCase();
          return s === 'approved' || s === 'pending';
        });

        if (active.length === 0) {
          $('#warrant-status-display').html('None');
          return;
        }

        const pending = active.filter(w => w.warrant?.status === 'pending').length;
        const approved = active.filter(w => w.warrant?.status === 'approved').length;
        // Use last name for search (API does prefix match on first or last name)
        const civName = currentItem?.civilian?.name || '';
        const parts = civName.trim().split(/\s+/);
        const searchName = parts.length > 1 ? parts[parts.length - 1] : civName;
        const safeName = searchName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        let badges = [];
        if (approved > 0) {
          badges.push(`<a href="#" class="text-danger" style="font-weight:600;text-decoration:none;cursor:pointer;" onclick="event.preventDefault();if(typeof wmOpenSearch==='function')wmOpenSearch({name:'${safeName}',status:'approved'})"><i class="fa fa-exclamation-triangle mr-1"></i>${approved} Active</a>`);
        }
        if (pending > 0) {
          badges.push(`<a href="#" class="text-warning" style="font-weight:600;text-decoration:none;cursor:pointer;" onclick="event.preventDefault();if(typeof wmOpenSearch==='function')wmOpenSearch({name:'${safeName}',status:'pending'})"><i class="fa fa-clock mr-1"></i>${pending} Pending</a>`);
        }
        let html = badges.join(' &nbsp;');
        // If both active and pending, add a "view all" link
        if (approved > 0 && pending > 0) {
          html += ` &nbsp;<a href="#" style="font-weight:400;text-decoration:none;cursor:pointer;color:#8899a6;font-size:0.85em;" onclick="event.preventDefault();if(typeof wmOpenSearch==='function')wmOpenSearch({name:'${safeName}'})"><i class="fa fa-external-link-alt mr-1"></i>View All</a>`;
        }
        $('#warrant-status-display').html(html);
      },
      error: function() {
        // Fall back to legacy warrants field
        const legacyWarrants = currentItem?.civilian?.warrants || [];
        if (legacyWarrants.length > 0) {
          $('#warrant-status-display').html('<span class="text-danger">Active Warrant</span>');
        } else {
          $('#warrant-status-display').html('None');
        }
      }
    });
  }

  // ── Warrant Request Modal ──
  function ensureWarrantModal() {
    if ($('#warrantRequestModal').length > 0) return;
    $('body').append(`
      <div class="modal fade" id="warrantRequestModal" tabindex="-1" role="dialog" aria-hidden="true" style="z-index: 9000;">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-body">
              <form id="warrant-request-form" class="form-horizontal">
                <fieldset>
                  <button class="btn btn-primary btn-md float-right" type="button" data-dismiss="modal" aria-hidden="true">X</button>
                  <h4>Request Warrant</h4>
                  <hr style="width: 88%; max-width: 100rem;">

                  <div class="form-group required">
                    <label class="col-md-4 control-label">Warrant Type</label>
                    <div class="col-md-6">
                      <select id="wr-type" class="form-control" required>
                        <option value="arrest">Arrest Warrant</option>
                        <option value="search">Search Warrant</option>
                        <option value="bench">Bench Warrant</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="col-md-4 control-label">Accused</label>
                    <div class="col-md-6">
                      <input id="wr-accused-name" type="text" class="form-control input-md" readonly style="background: #2a2a3e; border-color: #444;">
                    </div>
                  </div>

                  <div class="form-group required">
                    <label class="col-md-4 control-label">Charges</label>
                    <div class="col-md-6">
                      <select id="wr-charges" class="form-control" multiple>
                        <optgroup label="Crime not listed">
                          <option value="Other">Other</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div class="form-group required">
                    <label class="col-md-4 control-label">Probable Cause</label>
                    <div class="col-md-6">
                      <textarea id="wr-probable-cause" class="form-control" rows="4"
                        placeholder="Describe the probable cause for this warrant request..." required></textarea>
                    </div>
                  </div>

                  <div id="wr-search-location-group" class="form-group" style="display:none;">
                    <label class="col-md-4 control-label">Search Location</label>
                    <div class="col-md-6">
                      <input id="wr-search-location" type="text" class="form-control input-md"
                        placeholder="Address or location to search">
                    </div>
                  </div>

                  <div class="form-group">
                    <div class="col-md-6 col-md-offset-4">
                      <button id="wr-submit-btn" type="submit" class="btn btn-primary">
                        <i class="fa fa-gavel mr-1"></i> Submit Warrant Request
                      </button>
                    </div>
                  </div>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </div>
    `);

    // Toggle search location field based on warrant type
    $(document).on('change', '#wr-type', function() {
      $('#wr-search-location-group').toggle($(this).val() === 'search');
    });

    // Handle form submission
    $(document).on('submit', '#warrant-request-form', function(e) {
      e.preventDefault();
      submitWarrantRequest();
    });
  }

  function openWarrantRequestModal() {
    if (!currentItem || currentType !== 'Civilian') return;

    ensureWarrantModal();

    const civ = currentItem.civilian || {};
    const accusedName = civ.name || ((civ.firstName || '') + ' ' + (civ.lastName || '')).trim() || 'Unknown';

    // Reset form
    $('#wr-type').val('arrest');
    $('#wr-probable-cause').val('');
    $('#wr-search-location').val('');
    $('#wr-search-location-group').hide();
    $('#wr-accused-name').val(accusedName);
    $('#wr-submit-btn').prop('disabled', false).html('<i class="fa fa-gavel mr-1"></i> Submit Warrant Request');

    // Load penal code violations into charges select
    const communityId = dbUser.user.lastAccessedCommunity.communityID;
    const $select = $('#wr-charges');

    // Destroy existing Select2 instance if any
    if ($select.hasClass('select2-hidden-accessible')) {
      $select.select2('destroy');
    }
    $select.find('optgroup:not([label="Crime not listed"])').remove();

    $.ajax({
      url: `${API_URL}/api/v1/community/${communityId}/penal-codes`,
      method: 'GET',
      success: function(data) {
        const categories = (data && data.categories) || [];
        if (categories.length === 0) {
          $select.prepend('<optgroup label="No charges available"><option disabled>No charges configured</option></optgroup>');
        } else {
          categories.forEach(function(category) {
            const $optgroup = $('<optgroup label="' + (category.name || 'Unknown') + '"></optgroup>');
            (category.violations || []).forEach(function(v) {
              $optgroup.append('<option value="' + v.name + '">' + v.name + '</option>');
            });
            $select.prepend($optgroup);
          });
        }
        $select.select2({
          placeholder: 'Search charges...',
          allowClear: true,
          width: '100%',
          dropdownParent: $('#warrantRequestModal')
        });
      },
      error: function() {
        $select.prepend('<optgroup label="Error"><option disabled>Failed to load charges</option></optgroup>');
        $select.select2({
          placeholder: 'Search charges...',
          allowClear: true,
          width: '100%',
          dropdownParent: $('#warrantRequestModal')
        });
      }
    });

    $('#warrantRequestModal').modal('show');
  }

  function submitWarrantRequest() {
    if (!currentItem) return;

    const civ = currentItem.civilian || {};
    const communityId = dbUser.user?.lastAccessedCommunity?.communityID || '';
    const charges = ($('#wr-charges').val() || []).filter(c => c !== 'Other');

    if (charges.length === 0) {
      alert('Please select at least one charge.');
      return;
    }

    const probableCause = $('#wr-probable-cause').val().trim();
    if (!probableCause) {
      alert('Please provide probable cause.');
      return;
    }

    // Parse name — civilian may have `name` (full) or `firstName`/`lastName` separately
    const fullName = civ.name || '';
    const nameParts = fullName.split(' ');
    const firstName = civ.firstName || nameParts[0] || '';
    const lastName = civ.lastName || nameParts.slice(1).join(' ') || '';

    const warrantData = {
      warrantType: $('#wr-type').val(),
      accusedID: currentItem._id,
      accusedFirstName: firstName,
      accusedLastName: lastName,
      charges: charges,
      probableCause: probableCause,
      searchLocation: $('#wr-search-location').val() || '',
      requestingOfficerID: dbUser._id || '',
      requestingOfficerName: (dbUser.user?.username || '') + (dbUser.user?.callSign ? ' (' + dbUser.user.callSign + ')' : ''),
      activeCommunityID: communityId
    };

    $('#wr-submit-btn').prop('disabled', true).html('<i class="fa fa-spinner fa-spin mr-1"></i> Submitting...');

    $.ajax({
      url: `${API_URL}/api/v1/warrant`,
      method: 'POST',
      data: JSON.stringify(warrantData),
      contentType: 'application/json',
      success: function(response) {
        $('#warrantRequestModal').modal('hide');
        const status = response.warrant?.status || response.status || '';
        if (status === 'pending') {
          alert('Warrant request submitted. It is awaiting judicial review.');
        } else if (status === 'approved') {
          alert('Warrant has been approved.');
        } else {
          alert('Warrant request submitted successfully.');
        }
        fetchDetails();
      },
      error: function(xhr) {
        console.error('Error creating warrant:', xhr.responseText);
        alert('Failed to submit warrant request: ' + (xhr.responseJSON?.message || 'Unknown error'));
        $('#wr-submit-btn').prop('disabled', false).html('<i class="fa fa-gavel mr-1"></i> Submit Warrant Request');
      }
    });
  }

  // View warrant details
  window.viewWarrantDetails = function() {
    if (currentType === "Civilian" && currentItem.civilian?.warrants?.length > 0) {
      // Show warrant details in a modal or alert for now
      const warrants = currentItem.civilian.warrants;
      let warrantDetails = "Warrant Details:\n\n";
      
      warrants.forEach((warrant, index) => {
        warrantDetails += `Warrant ${index + 1}:\n`;
        warrantDetails += `Status: ${warrant.status || 'Active'}\n`;
        warrantDetails += `Date: ${warrant.date ? new Date(warrant.date).toLocaleDateString() : 'N/A'}\n`;
        warrantDetails += `Type: ${warrant.type || 'N/A'}\n`;
        warrantDetails += `Reasons: ${warrant.reasons || 'N/A'}\n`;
        warrantDetails += `Reporting Officer: ${warrant.reportingOfficer || 'N/A'}\n\n`;
      });
      
      warrantDetails += "For additional warrant details, contact:\n";
      warrantDetails += "Judge John Smith\n";
      warrantDetails += "Superior Court\n";
      warrantDetails += "Phone: (555) 123-4567\n";
      warrantDetails += "Email: judge.smith@courts.gov";
      
      alert(warrantDetails);
    }
  };

  // --- Main Tab Switching ---
  $(document).on('click', '#tabCriminalHistory', function() {
    // Only allow tab switching for civilians
    if (currentType !== 'Civilian') return;
    
    $('.records-tab-btn').removeClass('active');
    $('#tabCriminalHistory').addClass('active');
    // Update inline styles for underline
    $('.records-tab-btn').css('border-bottom', '3px solid transparent').css('color', '#a0aec0');
    $('#tabCriminalHistory').css('border-bottom', '3px solid #667eea').css('color', '#fff');
    $('.records-tab-content').hide();
    $('#tabContentCriminal').show();
  });
  
  $(document).on('click', '#tabVehicles', function() {
    // Only allow tab switching for civilians
    if (currentType !== 'Civilian') return;
    
    $('.records-tab-btn').removeClass('active');
    $('#tabVehicles').addClass('active');
    // Update inline styles for underline
    $('.records-tab-btn').css('border-bottom', '3px solid transparent').css('color', '#a0aec0');
    $('#tabVehicles').css('border-bottom', '3px solid #667eea').css('color', '#fff');
    $('.records-tab-content').hide();
    $('#tabContentVehicles').show();
    loadVehicles();
  });
  
  $(document).on('click', '#tabFirearms', function() {
    // Only allow tab switching for civilians
    if (currentType !== 'Civilian') return;
    
    $('.records-tab-btn').removeClass('active');
    $('#tabFirearms').addClass('active');
    // Update inline styles for underline
    $('.records-tab-btn').css('border-bottom', '3px solid transparent').css('color', '#a0aec0');
    $('#tabFirearms').css('border-bottom', '3px solid #667eea').css('color', '#fff');
    $('.records-tab-content').hide();
    $('#tabContentFirearms').show();
    loadFirearms();
  });
  
  $(document).on('click', '#tabLicenses', function() {
    // Only allow tab switching for civilians
    if (currentType !== 'Civilian') return;
    
    $('.records-tab-btn').removeClass('active');
    $('#tabLicenses').addClass('active');
    // Update inline styles for underline
    $('.records-tab-btn').css('border-bottom', '3px solid transparent').css('color', '#a0aec0');
    $('#tabLicenses').css('border-bottom', '3px solid #667eea').css('color', '#fff');
    $('.records-tab-content').hide();
    $('#tabContentLicenses').show();
    loadLicenses();
  });
  
  // Ensure default state on modal open
  $('#detailsModal').on('show.bs.modal', function() {
    $('.records-tab-btn').removeClass('active');
    $('#tabCriminalHistory').addClass('active');
    // Set initial styles for underline
    $('.records-tab-btn').css('border-bottom', '3px solid transparent').css('color', '#a0aec0');
    $('#tabCriminalHistory').css('border-bottom', '3px solid #667eea').css('color', '#fff');
    $('.records-tab-content').hide();
    $('#tabContentCriminal').show();
  });

  // Vehicle pagination variables
  let vehiclePage = 1;
  let vehicleTotal = 0;
  let vehicleLimit = 3;

  // Function to load vehicles
  function loadVehicles(page = 1) {
    const civilianId = currentItem?._id;
    if (!civilianId) return;
    
    // Check if we have cached data for this civilian and page
    const cacheKey = page - 1; // Convert to 0-based index for cache
    if (civilianCache.civilianId === civilianId && civilianCache.vehicles[cacheKey]) {
      displayVehicles(civilianCache.vehicles[cacheKey], civilianCache.vehicleTotal, page);
      return;
    }
    
    vehiclePage = page;
    const url = `${API_URL}/api/v1/vehicles/registered-owner/${civilianId}?limit=3&page=${page - 1}`;

    $('#vehiclesList').html(`
      <div class="text-center">
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking vehicle registration...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking vehicle history...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking warrants and tickets...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking stolen vehicle database...</span>
        </div>
      </div>
    `);
    
    // Simulate progressive loading
    let currentStep = 0;
    const loadingSteps = [
      'Checking vehicle registration...',
      'Checking vehicle history...',
      'Checking warrants and tickets...',
      'Checking stolen vehicle database...'
    ];
    
    const updateLoadingStep = () => {
      if (currentStep < loadingSteps.length) {
        const stepHtml = loadingSteps.map((step, index) => {
          const icon = index < currentStep ? 'fa-check text-success' : index === currentStep ? 'fa-spinner fa-spin text-primary' : 'fa-circle text-muted';
          return `<div class="loading-step mb-2">
            <i class="fa ${icon}"></i>
            <span class="ml-2">${step}</span>
          </div>`;
        }).join('');
        
        $('#vehiclesList').html(`<div class="text-center">${stepHtml}</div>`);
        currentStep++;
        
        if (currentStep <= loadingSteps.length) {
          setTimeout(updateLoadingStep, 300);
        }
      }
    };
    
    updateLoadingStep();
    
    $.ajax({
      url: url,
      method: 'GET',
      success: function(response) {
        const vehicles = response.vehicles || [];
        vehicleTotal = response.total || 0;
        
        // Cache the results by page
        civilianCache.civilianId = civilianId;
        civilianCache.vehicles[cacheKey] = vehicles;
        civilianCache.vehicleTotal = vehicleTotal;
        
        // Wait for loading animation to complete (1.2 seconds) then show results
        setTimeout(() => {
          displayVehicles(vehicles, vehicleTotal, page);
        }, 1200); // Wait 1.2 seconds for loading animation to complete
      },
      error: function(xhr, status, error) {
        console.error('Error loading vehicles:', xhr, status, error);
        $('#vehiclesList').html('<p class="text-gray">Error loading vehicles.</p>');
      }
    });
  }

  // Function to display vehicles (used for both cached and fresh data)
  function displayVehicles(vehicles, total, page) {
    if (vehicles && vehicles.length > 0) {
      let vehiclesHtml = '';
      vehicles.forEach((item, index) => {
        const vehicle = item.vehicle;
        vehiclesHtml += `
          <div class="details-item" onclick="searchVehicle('${vehicle.plate}')" style="cursor: pointer;">
            <div class="d-flex justify-content-between">
              <span>${vehicle.plate || 'N/A'}</span>
              <span>${vehicle.color || ''} ${vehicle.model || ''}</span>
            </div>
            <p class="text-gray mb-0">Type: ${vehicle.type || 'N/A'}</p>
            <p class="text-gray mb-0">Make: ${vehicle.make || 'N/A'}</p>
            <p class="text-gray mb-0">Year: ${vehicle.year || 'N/A'}</p>
            <p class="text-gray mb-0">VIN: ${vehicle.vin || 'N/A'}</p>
            ${(vehicle.isStolen === 'true' || vehicle.isStolen === '2') ? '<span class="badge badge-stolen">STOLEN</span>' : ''}
            ${(vehicle.validRegistration === 'false' || vehicle.validRegistration === '2') ? '<span class="badge badge-stolen" style="background-color: #ef4444; color: white;">INVALID REG</span>' : ''}
            ${(vehicle.validInsurance === 'false' || vehicle.validInsurance === '2') ? '<span class="badge badge-stolen" style="background-color: #ef4444; color: white;">INVALID INS</span>' : ''}
          </div>
        `;
      });
      
      // Add pagination controls
      const totalPages = Math.ceil(total / vehicleLimit);
      const paginationHtml = `
        <div class="d-flex justify-content-between align-items-center mt-3">
          <button class="btn btn-secondary btn-sm" onclick="loadVehicles(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
            <i class="fa fa-chevron-left"></i> Previous
          </button>
          <span class="text-gray">Page ${page} of ${totalPages} (${total} total)</span>
          <button class="btn btn-secondary btn-sm" onclick="loadVehicles(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
            Next <i class="fa fa-chevron-right"></i>
          </button>
        </div>
      `;
      
      $('#vehiclesList').html(vehiclesHtml + paginationHtml);
    } else {
      $('#vehiclesList').html('<p class="text-gray">No vehicles found.</p>');
    }
  }

  // Function to search for a vehicle
  function searchVehicle(plate) {
    // Close the details modal
    $('#detailsModal').modal('hide');
    // Open the search database modal and search for the vehicle
    showSearchDatabaseModal('Vehicle');
    // Set the plate number in the search field
    setTimeout(() => {
      $('#searchQuery').val(plate);
      // Trigger the search
      vehicleSearchPoliceForm();
    }, 500);
  }

  // Firearm pagination variables
  let firearmPage = 1;
  let firearmTotal = 0;
  let firearmLimit = 3;

  // License pagination variables
  let licensePage = 1;
  let licenseTotal = 0;
  let licenseLimit = 10;

  // Function to load firearms
  function loadFirearms(page = 1) {
    const civilianId = currentItem?._id;
    if (!civilianId) return;
    
    // Check if we have cached data for this civilian and page
    const cacheKey = page - 1; // Convert to 0-based index for cache
    if (civilianCache.civilianId === civilianId && civilianCache.firearms[cacheKey]) {
      displayFirearms(civilianCache.firearms[cacheKey], civilianCache.firearmTotal, page);
      return;
    }
    
    firearmPage = page;
    const url = `${API_URL}/api/v1/firearms/registered-owner/${civilianId}?limit=3&page=${page - 1}`;
    $('#firearmsList').html(`
      <div class="text-center">
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking firearm registration...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking serial number database...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking firearm history...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking stolen firearm database...</span>
        </div>
      </div>
    `);
    
    // Simulate progressive loading
    let currentStep = 0;
    const loadingSteps = [
      'Checking firearm registration...',
      'Checking serial number database...',
      'Checking firearm history...',
      'Checking stolen firearm database...'
    ];
    
    const updateLoadingStep = () => {
      if (currentStep < loadingSteps.length) {
                  const stepHtml = loadingSteps.map((step, index) => {
            const icon = index < currentStep ? 'fa-check text-success' : index === currentStep ? 'fa-spinner fa-spin text-primary' : 'fa-circle text-muted';
            return `<div class="loading-step mb-2">
              <i class="fa ${icon}"></i>
              <span class="ml-2">${step}</span>
            </div>`;
          }).join('');
        
        $('#firearmsList').html(`<div class="text-center">${stepHtml}</div>`);
        currentStep++;
        
        if (currentStep <= loadingSteps.length) {
          setTimeout(updateLoadingStep, 300);
        }
      }
    };
    
    updateLoadingStep();
    
    $.ajax({
      url: url,
      method: 'GET',
      success: function(response) {
        const firearms = response.firearms || [];
        firearmTotal = response.total || 0;
        
        // Cache the results by page
        civilianCache.civilianId = civilianId;
        civilianCache.firearms[cacheKey] = firearms;
        civilianCache.firearmTotal = firearmTotal;
        
        // Wait for loading animation to complete (1.2 seconds) then show results
        setTimeout(() => {
          displayFirearms(firearms, firearmTotal, page);
        }, 1200); // Wait 1.2 seconds for loading animation to complete
      },
      error: function() {
        $('#firearmsList').html('<p class="text-gray">Error loading firearms.</p>');
      }
    });
  }

  // Function to display firearms (used for both cached and fresh data)
  function displayFirearms(firearms, total, page) {
    if (firearms && firearms.length > 0) {
      let firearmsHtml = '';
      firearms.forEach(item => {
        const firearm = item.firearm;
        firearmsHtml += `
          <div class="details-item" onclick="searchFirearm('${firearm.serialNumber}')" style="cursor: pointer;">
            <div class="d-flex justify-content-between">
              <span>${firearm.serialNumber || 'N/A'}</span>
              <span>${firearm.weaponType || firearm.name || 'N/A'}</span>
            </div>
            <p class="text-gray mb-0">Caliber: ${firearm.caliber || 'N/A'}</p>
            ${(firearm.isStolen === 'true' || firearm.isStolen === '2') ? '<span class="badge badge-stolen">STOLEN</span>' : ''}
          </div>
        `;
      });
      
      // Add pagination controls
      const totalPages = Math.ceil(total / firearmLimit);
      const paginationHtml = `
        <div class="d-flex justify-content-between align-items-center mt-3">
          <button class="btn btn-secondary btn-sm" onclick="loadFirearms(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
            <i class="fa fa-chevron-left"></i> Previous
          </button>
          <span class="text-gray">Page ${page} of ${totalPages} (${total} total)</span>
          <button class="btn btn-secondary btn-sm" onclick="loadFirearms(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
            Next <i class="fa fa-chevron-right"></i>
          </button>
        </div>
      `;
      
      $('#firearmsList').html(firearmsHtml + paginationHtml);
    } else {
      $('#firearmsList').html('<p class="text-gray">No firearms found.</p>');
    }
  }

  // Function to search for a firearm
  function searchFirearm(serialNumber) {
    // Close the details modal
    $('#detailsModal').modal('hide');
    // Open the search database modal and search for the firearm
    showSearchDatabaseModal('Firearm');
    // Set the serial number in the search field
    setTimeout(() => {
      $('#searchQuery').val(serialNumber);
      // Trigger the search
      firearmSearchPoliceForm();
    }, 500);
  }

  // Function to load licenses
  function loadLicenses(page = 1, forceRefresh = false) {
    const civilianId = currentItem?._id;
    if (!civilianId) return;
    
    // Check if we have cached data for this civilian and page (unless forcing refresh)
    const cacheKey = page - 1; // Convert to 0-based index for cache
    if (!forceRefresh && civilianCache.civilianId === civilianId && civilianCache.licenses[cacheKey]) {
      displayLicenses(civilianCache.licenses[cacheKey], civilianCache.licenseTotal, page);
      return;
    }
    
    licensePage = page;
    // Use licenseLimit for API call
    const url = `${API_URL}/api/v1/licenses/civilian/${civilianId}?limit=${licenseLimit}&page=${page}`;

    $('#licensesList').html(`
      <div class="text-center">
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking license database...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Verifying license status...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking expiration dates...</span>
        </div>
        <div class="loading-step mb-2">
          <i class="fa fa-spinner fa-spin text-primary"></i>
          <span class="ml-2">Checking license history...</span>
        </div>
      </div>
    `);
    
    // Simulate progressive loading
    let currentStep = 0;
    const loadingSteps = [
      'Checking license database...',
      'Verifying license status...',
      'Checking expiration dates...',
      'Checking license history...'
    ];
    
    const updateLoadingStep = () => {
      if (currentStep < loadingSteps.length) {
        const stepHtml = loadingSteps.map((step, index) => {
          const icon = index < currentStep ? 'fa-check text-success' : index === currentStep ? 'fa-spinner fa-spin text-primary' : 'fa-circle text-muted';
          return `<div class="loading-step mb-2">
            <i class="fa ${icon}"></i>
            <span class="ml-2">${step}</span>
          </div>`;
        }).join('');
        
        $('#licensesList').html(`<div class="text-center">${stepHtml}</div>`);
        currentStep++;
        
        if (currentStep <= loadingSteps.length) {
          setTimeout(updateLoadingStep, 300);
        }
      }
    };
    
    updateLoadingStep();
    
    $.ajax({
      url: url,
      method: 'GET',
      success: function(response) {
        const licenses = response.data || [];
        licenseTotal = response.totalCount || 0;
        
        // Cache the results by page
        civilianCache.civilianId = civilianId;
        civilianCache.licenses[cacheKey] = licenses;
        civilianCache.licenseTotal = licenseTotal;
        
        // Wait for loading animation to complete (1.2 seconds) then show results
        setTimeout(() => {
          displayLicenses(licenses, licenseTotal, page);
        }, 1200); // Wait 1.2 seconds for loading animation to complete
      },
      error: function(xhr, status, error) {
        console.error('Error loading licenses:', xhr, status, error);
        $('#licensesList').html('<p class="text-gray">Error loading licenses.</p>');
      }
    });
  }

  // Function to display licenses (used for both cached and fresh data)
  function displayLicenses(licenses, total, page) {
    if (licenses && licenses.length > 0) {
      let licensesHtml = '';
      licenses.forEach(item => {
        const license = item.license;
        // Use robust isExpired function
        const isExpiredStatus = isExpired(license.expirationDate);
        let statusClass = 'text-success';
        let statusText = license.status || 'Valid';
        if (license.status && (license.status.toLowerCase() === 'suspended' || license.status.toLowerCase() === 'revoked')) {
          statusClass = 'text-danger';
        }
        // Expired pill if needed
        let expiredPill = '';
        if (isExpiredStatus) {
          expiredPill = `<span class="badge badge-expired ml-2" style="display:inline-block;margin-top:0.25rem;">Expired</span>`;
        }
        
        // Determine which action buttons to show based on current status
        let actionButtons = '';
        const currentStatus = license.status ? license.status.toLowerCase() : 'valid';
        
        if (currentStatus === 'suspended') {
          actionButtons = `
            <button class="btn btn-warning btn-sm mr-1" onclick="handleLicenseAction('${item._id}', 'revoke')" title="Revoke License">
              <i class="fa fa-ban"></i> Revoke
            </button>
            <button class="btn btn-success btn-sm" onclick="handleLicenseAction('${item._id}', 'reset')" title="Reinstate to Valid">
              <i class="fa fa-check"></i> Reinstate
            </button>
          `;
        } else if (currentStatus === 'revoked') {
          actionButtons = `
            <button class="btn btn-warning btn-sm mr-1" onclick="handleLicenseAction('${item._id}', 'suspend')" title="Suspend License">
              <i class="fa fa-pause"></i> Suspend
            </button>
            <button class="btn btn-success btn-sm" onclick="handleLicenseAction('${item._id}', 'reset')" title="Reinstate to Valid">
              <i class="fa fa-check"></i> Reinstate
            </button>
          `;
        } else {
          // Valid/Approved status
          actionButtons = `
            <button class="btn btn-warning btn-sm mr-1" onclick="handleLicenseAction('${item._id}', 'suspend')" title="Suspend License">
              <i class="fa fa-pause"></i> Suspend
            </button>
            <button class="btn btn-danger btn-sm" onclick="handleLicenseAction('${item._id}', 'revoke')" title="Revoke License">
              <i class="fa fa-ban"></i> Revoke
            </button>
          `;
        }
        
        licensesHtml += `
          <div class="details-item license-item" data-license-id="${item._id}" onclick="selectLicense('${item._id}')" style="cursor: pointer;">
            <div class="d-flex justify-content-between align-items-start">
              <span>${license.type || 'N/A'}</span>
              <div class="text-right">
                <span class="${statusClass}">${statusText}</span>
                ${expiredPill ? '<br/>' + expiredPill : ''}
              </div>
            </div>
            <p class="text-gray mb-0">Expires: ${license.expirationDate || 'N/A'}</p>
            <p class="text-gray mb-0">Notes: ${license.notes || 'N/A'}</p>
            <p class="text-gray mb-0">Created: ${new Date(license.createdAt).toLocaleDateString()}</p>
            <div class="license-actions mt-2" onclick="event.stopPropagation();">
              ${actionButtons}
            </div>
          </div>
        `;
      });
      
      // Add pagination controls
      const totalPages = Math.ceil(total / licenseLimit);
      const paginationHtml = `
        <div class="d-flex justify-content-between align-items-center mt-3">
          <button class="btn btn-secondary btn-sm" onclick="loadLicenses(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
            <i class="fa fa-chevron-left"></i> Previous
          </button>
          <span class="text-gray">Page ${page} of ${totalPages} (${total} total)</span>
          <button class="btn btn-secondary btn-sm" onclick="loadLicenses(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
            Next <i class="fa fa-chevron-right"></i>
          </button>
        </div>
      `;
      
      $('#licensesList').html(licensesHtml + paginationHtml);
    } else {
      $('#licensesList').html('<p class="text-gray">No licenses found.</p>');
    }
  }



  /**
   * License Management Functions
   * 
   * These functions provide interactive license management capabilities:
   * - selectLicense(licenseId): Highlights a selected license and shows a notification
   * - handleLicenseAction(licenseId, action): Performs license status updates
   * 
   * Available actions:
   * - 'suspend': Changes status to 'Suspended'
   * - 'revoke': Changes status to 'Revoked' 
   * - 'reset': Changes status to 'Approved'
   * 
   * Usage:
   * 1. Click on any license item to select it
   * 2. Use the action buttons (Suspend, Revoke, Reset) to change status
   * 3. Confirm the action when prompted
   * 4. The license list will automatically refresh after successful updates
   */
  
  // License selection and action functions
  function selectLicense(licenseId) {
    // Remove highlight from all license items
    $('.license-item').removeClass('selected-license');
    // Add highlight to selected license
    $(`.license-item[data-license-id="${licenseId}"]`).addClass('selected-license');
    
    // Show a brief tooltip or notification that the license is selected
    const licenseItem = $(`.license-item[data-license-id="${licenseId}"]`);
    const licenseType = licenseItem.find('span').first().text();
    const currentStatus = licenseItem.find('.text-success, .text-danger').text();
    
    // Create a temporary notification
    const notification = $(`
      <div class="alert alert-info alert-dismissible" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
        <button type="button" class="close" data-dismiss="alert">&times;</button>
        <strong>License Selected:</strong> ${licenseType}<br>
        <strong>Current Status:</strong> ${currentStatus}<br>
        <small>Use the action buttons below to modify the license status.</small>
      </div>
    `);
    
    $('body').append(notification);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      notification.fadeOut(() => notification.remove());
    }, 3000);
  }

  function handleLicenseAction(licenseId, action) {
    let newStatus = '';
    let confirmMessage = '';
    
    switch (action) {
      case 'suspend':
        newStatus = 'Suspended';
        confirmMessage = 'Are you sure you want to suspend this license?';
        break;
      case 'revoke':
        newStatus = 'Revoked';
        confirmMessage = 'Are you sure you want to revoke this license?';
        break;
      case 'reset':
        newStatus = 'Valid';
        confirmMessage = 'Are you sure you want to reinstate this license to valid status?';
        break;
      default:
        console.error('Invalid license action:', action);
        return;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Show loading state
    const licenseItem = $(`.license-item[data-license-id="${licenseId}"]`);
    const originalContent = licenseItem.find('.license-actions').html();
    licenseItem.find('.license-actions').html('<i class="fa fa-spinner fa-spin"></i> Updating...');
    
    // Disable all action buttons during update
    licenseItem.find('.license-actions .btn').prop('disabled', true);
    
    // Use the external API for license updates
    $.ajax({
      url: `${API_URL}/api/v1/license/${licenseId}`,
      method: 'PUT',
      data: JSON.stringify({ status: newStatus }),
      contentType: 'application/json',
      success: function(response) {
        // Show success message
        licenseItem.find('.license-actions').html('<i class="fa fa-check text-success"></i> Updated successfully');
        
        // Clear the cache to force a fresh reload
        civilianCache.licenses = {};
        civilianCache.licenseTotal = 0;
        
        // Refresh the license list after a short delay
        setTimeout(() => {
          loadLicenses(1, true); // Force refresh first page
        }, 2000); // Increased delay to ensure API has time to process
      },
      error: function(xhr) {
        console.error('Error updating license:', xhr.responseText);
        // Restore original content and show error
        licenseItem.find('.license-actions').html(originalContent);
        licenseItem.find('.license-actions .btn').prop('disabled', false);
        
        let errorMessage = 'Failed to update license';
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage += ': ' + xhr.responseJSON.message;
        } else if (xhr.status === 404) {
          errorMessage += ': License not found';
        } else if (xhr.status === 403) {
          errorMessage += ': Permission denied';
        } else if (xhr.status >= 500) {
          errorMessage += ': Server error';
        }
        
        alert(errorMessage);
      }
    });
  }

  // Show arrest report detail modal
  function showArrestReportDetail(report) {
    if (!report || !report.arrestReport) {
      console.error("Invalid arrest report data");
      return;
    }

    const ar = report.arrestReport;

    // Format date and time helper
    const formatDateTime = (date, time) => {
      if (!date) return "N/A";
      return time ? `${date} at ${time}` : date;
    };

    // Update modal title
    $("#arrestReportDetailTitle").text(`Report #${ar.reportNumber || "N/A"}`);

    // Arrest Details
    $("#arrestDateTime").text(formatDateTime(ar.arrestDate, ar.arrestTime));
    $("#arrestLocation").text(ar.arrestLocation || "N/A");

    // Incident Details
    $("#incidentDateTime").text(formatDateTime(ar.incidentDate, ar.incidentTime));
    $("#incidentLocation").text(ar.incidentLocation || "N/A");

    // Arrestee Information
    const arrestee = ar.arrestee || {};
    $("#arresteeName").text(arrestee.name || "N/A");
    $("#arresteeDob").text(arrestee.dob || "N/A");
    $("#arresteeAddress").text(arrestee.address || "N/A");
    $("#arresteeHeight").text(arrestee.height || "N/A");
    $("#arresteeWeight").text(arrestee.weight || "N/A");
    $("#arresteeEyeColor").text(arrestee.eyeColor || "N/A");
    $("#arresteeHairColor").text(arrestee.hairColor || "N/A");
    $("#arresteePhone").text(arrestee.phone || "N/A");

    // Officer Information
    const officer = ar.officer || {};
    $("#officerName").text(officer.name || "N/A");
    $("#officerBadge").text(officer.badgeNumber || "N/A");

    // Charges
    let chargesHtml = "";
    if (ar.chargesList && ar.chargesList.length > 0) {
      chargesHtml = ar.chargesList.map(charge => `
        <div class="charge-item">
          <div class="charge-name">${charge.name || "Unknown"}</div>
          ${charge.category ? `<div class="charge-category">Category: ${charge.category}</div>` : ""}
          ${charge.amount > 0 ? `<div class="charge-fine">Fine: $${charge.amount}</div>` : ""}
        </div>
      `).join("");
    } else if (ar.charges) {
      chargesHtml = `<div class="charge-item"><div class="charge-name">${ar.charges}</div></div>`;
    } else {
      chargesHtml = '<p class="text-gray">No charges listed.</p>';
    }
    $("#chargesContainer").html(chargesHtml);

    // Narrative
    $("#arrestNarrative").text(ar.narrative || "N/A");

    // Witnesses
    if (ar.witnesses) {
      $("#witnessesSection").show();
      $("#arrestWitnesses").text(ar.witnesses);
    } else {
      $("#witnessesSection").hide();
    }

    // Force Used
    const forceUsed = ar.forceUsed;
    if (forceUsed) {
      $("#forceUsedBadge").html('<span class="force-badge-yes">Yes</span>');
    } else {
      $("#forceUsedBadge").html('<span class="force-badge-no">No</span>');
    }

    // Show the modal
    $("#arrestReportDetailModal").modal("show");
  }

  // Close arrest report detail modal
  function closeArrestReportDetail() {
    $("#arrestReportDetailModal").modal("hide");
  }

  // ——— Download ID Card as PNG ———
  $("#downloadIdBtn").on("click", function () {
    var cardElement = document.getElementById("licenseCard");
    if (!cardElement) return;
    html2canvas(cardElement, {
      backgroundColor: "#e6f0e6",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
    }).then(function (canvas) {
      var link = document.createElement("a");
      var civName = currentItem?.civilian?.name ||
        ((currentItem?.civilian?.firstName || "") + "_" + (currentItem?.civilian?.lastName || ""));
      link.download = civName.replace(/\s+/g, "_") + "_ID.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }).catch(function (err) {
      console.error("Error generating ID card image:", err);
      alert("Failed to download ID card. Please try again.");
    });
  });

  // Expose showDetailsModal and goBack globally
  window.showDetailsModal = showDetailsModal;
  window.fetchArrestReports = fetchArrestReports;
  window.changeCriminalPage = changeCriminalPage;
  window.goBack = goBack;
  window.searchVehicle = searchVehicle;
  window.searchFirearm = searchFirearm;
  window.displayVehicles = displayVehicles;
  window.displayFirearms = displayFirearms;
  window.displayLicenses = displayLicenses;
  window.loadVehicles = loadVehicles;
  window.loadFirearms = loadFirearms;
  window.loadLicenses = loadLicenses;
  window.selectLicense = selectLicense;
  window.handleLicenseAction = handleLicenseAction;
  window.showArrestReportDetail = showArrestReportDetail;
  window.closeArrestReportDetail = closeArrestReportDetail;
});
