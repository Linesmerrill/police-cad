$(document).ready(function () {
  const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
  let currentBoloPage = 0;
  const boloLimit = 10;
  let currentCallPage = 1;
  const callLimit = 10;

  fetchAndRenderDepartments(); // Fetch and render departments on page load

  // Hide modal utility
  function hideModal(modalId) {
    const $modal = $(`#${modalId}`);
    $modal.modal("hide");
    // Ensure body classes are cleaned up
    $("body").removeClass("modal-open");
    // Remove all backdrops
    $(".modal-backdrop").remove();
    // Reset modal state
    $modal.removeClass("show").css("display", "none");
    // Clear any modal-related data attributes
    $modal.removeData("bs.modal");
    // Ensure no lingering modal-open classes
    $("body").css("padding-right", "");
  }

  // Show BOLO modal
  function showBoloModal() {
    clearBoloForm();
    $("#boloModal").modal("show");
  }

  // Create BOLO via AJAX
  function createBolo(
    title,
    location,
    description,
    scope,
    communityID,
    departmentID,
    reportedByID
  ) {
    if (
      !title ||
      !location ||
      !description ||
      !scope ||
      !communityID ||
      !departmentID ||
      !reportedByID
    ) {
      console.error("Invalid BOLO data:", {
        title,
        location,
        description,
        scope,
        communityID,
        departmentID,
        reportedByID,
      });
      alert("Please fill all required fields.");
      return;
    }
    const payload = {
      bolo: {
        title,
        location,
        description,
        communityID,
        departmentID,
        scope,
        reportedByID,
        status: true,
      },
    };
    console.log("payload", payload);
    $.ajax({
      url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/bolo`,
      method: "POST",
      data: JSON.stringify(payload),
      contentType: "application/json",
      success: function (res) {
        loadActiveBOLOs(); // Refresh BOLO list
        hideModal("boloModal");
        alert("BOLO created successfully.");
      },
      error: function (xhr) {
        console.error("Error creating BOLO:", xhr.responseText);
        alert(
          "Failed to create BOLO: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
        hideModal("boloModal");
      },
    });
  }

  // Handle create BOLO form submission
  function handleCreateBolo() {
    const communityId = dbUser.user.lastAccessedCommunity.communityID;
    if (!communityId) {
      alert(
        "Failed to load community, please try refreshing the page and try again."
      );
      hideModal("boloModal");
      return;
    }
    const title = document.getElementById("boloTitle").value.trim();
    const location = document.getElementById("boloLocation").value.trim();
    const description = document.getElementById("boloDescription").value.trim();
    const scope = document.querySelector('input[name="scope"]:checked').value;
    const communityID = document.getElementById("boloCommunityID").value;
    const departmentID = document.getElementById("boloDepartmentID").value;
    const reportedByID = document.getElementById("boloReportedByID").value;
    if (!title || !location || !description || !scope) {
      alert("Please fill all required fields.");
      return;
    }
    createBolo(
      title,
      location,
      description,
      scope,
      communityId,
      departmentId,
      dbUser._id
    );
  }

  // Clear BOLO form
  function clearBoloForm() {
    document.getElementById("boloTitle").value = "";
    document.getElementById("boloLocation").value = "";
    document.getElementById("boloDescription").value = "";
    document.getElementById("scopeCommunity").checked = true;
    document.getElementById("scopeDepartment").checked = false;
  }

  function changeBoloPage(page) {
    if (page < 1) return;
    currentBoloPage = page;
    loadActiveBOLOs();
  }

  // Update BOLO details via AJAX
  function updateBolo(boloId, boloTitle, location, description) {
    if (!boloId || !boloTitle || !location || !description) {
      console.error("Invalid BOLO data:", {
        boloId,
        boloTitle,
        location,
        description,
      });
      alert("Please fill all required fields.");
      return;
    }
    $.ajax({
      url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/bolo/${boloId}`,
      method: "PUT",
      data: JSON.stringify({ title: boloTitle, location, description }),
      contentType: "application/json",
      success: function (res) {
        $(`#${boloId}-type`).text(boloTitle);
        $(`#${boloId}-location`).text(location);
        $(`#${boloId}-description`).text(description);
        loadActiveBOLOs(); // Refresh BOLO list
        hideModal("boloDetailModal");
        $("#boloDetailModal").modal("hide");
        alert("BOLO updated successfully.");
      },
      error: function (xhr) {
        console.error("Error updating BOLO:", xhr.responseText);
        alert(
          "Failed to update BOLO: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
        $("#boloDetailModal").modal("hide");
        hideModal("boloDetailModal"); // Ensure modal closes on error
      },
    });
  }

  // Handle update BOLO form submission
  function handleUpdateBolo() {
    const boloId = document.getElementById("boloIDDetail").value;
    const boloTitle = document.getElementById("boloTitleDetail").value.trim();
    const location = document.getElementById("locationDetail").value.trim();
    const description = document
      .getElementById("descriptionDetail")
      .value.trim();
    if (!boloId || !boloTitle || !location || !description) {
      alert("Please fill all required fields.");
      return;
    }
    updateBolo(boloId, boloTitle, location, description);
  }

  // Handle delete BOLO form submission
  function handleDeleteBolo() {
    const boloId = document.getElementById("boloIDDetail").value;
    if (!boloId) {
      console.error("Invalid BOLO ID:", boloId);
      alert("Invalid BOLO ID.");
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to delete this BOLO? This action cannot be undone."
      )
    ) {
      return;
    }
    deleteBolo(boloId);
  }

  // Delete BOLO via AJAX
  function deleteBolo(boloId) {
    if (!boloId) {
      console.error("Invalid BOLO ID:", boloId);
      alert("Invalid BOLO ID.");
      return;
    }
    $.ajax({
      url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/bolo/${boloId}`,
      method: "DELETE",
      success: function () {
        $(`#${boloId}-row`).fadeOut(1, function () {
          $(this).remove();
        });
        loadActiveBOLOs(); // Refresh BOLO list
        hideModal("boloDetailModal");
        $("#boloDetailModal").modal("hide");
        alert("BOLO deleted successfully.");
      },
      error: function (xhr) {
        console.error("Error deleting BOLO:", xhr.responseText);
        alert(
          "Failed to delete BOLO: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
        hideModal("boloDetailModal");
        $("#boloDetailModal").modal("hide");
      },
    });
  }

  // Populate BOLO details in modal
  function populateBoloDetails(boloId) {
    $.ajax({
      url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/bolo/${boloId}`,
      method: "GET",
      success: function (bolo) {
        $("#boloIDDetail").val(bolo._id);
        $("#boloTitleDetail").val(bolo?.bolo?.title);
        $("#locationDetail").val(bolo?.bolo?.location);
        $("#descriptionDetail").val(bolo?.bolo?.description);
        // $('#dateCreatedDetail').text(bolo.createdBy || 'Unknown');
        $("#dateCreatedDetail").text(
          bolo?.bolo?.createdAt?.toLocaleString() || "N/A"
        );
        $("#lastUpdatedDetail").text(
          bolo?.bolo?.updatedAt?.toLocaleString() || "N/A"
        );
        $("#statusDetail").text(bolo?.bolo?.status ? "Active" : "Inactive");
        $("#boloDetailModal").modal("show");
      },
      error: function (xhr) {
        console.error("Error fetching BOLO details:", xhr.responseText);
        alert(
          "Failed to load BOLO details: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  // AJAX function to load assigned calls
  function loadAssignedCalls() {
    const communityId = dbUser.user.lastAccessedCommunity.communityID;
    const userId = dbUser._id;
    if (!communityId) {
      console.warn("No community ID found, skipping call load.");
      return;
    }

    $.ajax({
      url: `${API_URL}/api/v1/calls/community/${communityId}?status=true&limit=${callLimit}&page=${currentCallPage}`,
      method: "GET",
      success: function (response) {
        const $tbody = $("#callTable tbody");
        $tbody.empty(); // Clear existing rows
        const calls = response.data || response; // Fallback if response is array
        const totalCount = response.totalCount || calls.length; // Fallback if totalCount missing

        if (calls.length === 0) {
          $tbody.append(
            '<tr><td colspan="3" class="text-center">No calls found.</td></tr>'
          );
        } else {
          calls.forEach((call) => {
            const callId = call._id;
            const createdAt = call.call?.createdAt
              ? new Date(call.call.createdAt).toLocaleString()
              : "N/A";
            const description =
              `${call.call?.title || ""}${
                call.call?.details ? " | " + call.call.details : ""
              }` || "N/A";
            const policeUnits =
              call.call?.assignedOfficers?.length > 0
                ? call.call.assignedOfficers
                    .map(
                      (o) =>
                        `${o.name || "Unknown"} (${o.badgeNumber || "N/A"})`
                    )
                    .join(", ")
                : "None";
            const fireEmsUnits =
              call.call?.assignedFireEms?.length > 0
                ? call.call.assignedFireEms
                    .map((u) => u.unitName || "Unknown")
                    .join(", ")
                : "None";
            const unitsAssigned =
              `
              ${
                policeUnits !== "None"
                  ? `<span class="badge badge-secondary">${policeUnits} (Police)</span>`
                  : ""
              }
              ${
                fireEmsUnits !== "None"
                  ? `<span class="badge badge-secondary">${fireEmsUnits}</span>`
                  : ""
              }
            ` || "None";

            $tbody.append(`
              <tr class="gray-hover" data-toggle="modal" data-id="${callId}" data-target="#callDetailModal"
                onclick="populateCallDetails('${callId}');populateOfficerList('');populateFireEmsList('');populateClassifierList('')">
                <td>${createdAt}</td>
                <td style="text-transform: capitalize;">${description}</td>
                <td>${unitsAssigned}</td>
              </tr>
            `);
          });
        }

        // Add pagination controls
        const $pagination = $("#callTable").next(".call-pagination");
        if ($pagination.length === 0) {
          $("#callTable").after(
            '<div class="call-pagination d-flex justify-content-between mt-2"></div>'
          );
        }
        const $paginationContainer = $(".call-pagination");
        $paginationContainer.empty();
        if (totalCount > callLimit) {
          $paginationContainer.append(`
            <button class="btn btn-primary" onclick="changeCallPage(${
              currentCallPage - 1
            })" ${currentCallPage === 1 ? "disabled" : ""}>Previous</button>
            <button class="btn btn-primary" onclick="changeCallPage(${
              currentCallPage + 1
            })" ${
            currentCallPage * callLimit >= totalCount ? "disabled" : ""
          }>Next</button>
          `);
        }
        console.log("Calls loaded:", {
          page: currentCallPage,
          count: calls.length,
          total: totalCount,
        });
      },
      error: function (xhr) {
        console.error("Error loading calls:", xhr.responseText);
        $("#callTable tbody")
          .empty()
          .append(
            '<tr><td colspan="3" class="text-center">Error loading calls.</td></tr>'
          );
      },
    });
  }

  function changeCallPage(page) {
    if (page < 1) return;
    currentCallPage = page;
    loadAssignedCalls();
  }

  // Polling function to refresh dynamic data
  function pollDashboardData() {
    // loadPanicStatuses(); // Coming soon
    loadActiveBOLOs();
    loadAssignedCalls();
  }

  // Initialize dashboard data
  pollDashboardData();
  setInterval(pollDashboardData, 30000); // Poll every 30 seconds

  // OLD STUFF
  $("#arrestModal").on("hidden.bs.modal", function () {
    $("#civIDArrest").popover("hide");
  });

  window.showBoloModal = showBoloModal;
  window.handleCreateBolo = handleCreateBolo;
  window.clearBoloForm = clearBoloForm;
  window.pollDashboardData = pollDashboardData;
  window.changeBoloPage = changeBoloPage;
  window.handleUpdateBolo = handleUpdateBolo;
  window.handleDeleteBolo = handleDeleteBolo;
  window.populateBoloDetails = populateBoloDetails;
  window.changeCallPage = changeCallPage;
});
