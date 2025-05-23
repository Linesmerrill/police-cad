$(document).ready(function () {
  const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
  let currentBoloPage = 0;
  const boloLimit = 10;
  let currentCallPage = 1;
  const callLimit = 10;
  let isEditMode = false;
  let callData = null;
  let departmentsData = [];
  let membersData = [];
  let currentDraw = 0;
  let officerListTable = null;
  let currentUnitPage = 1;
  const unitLimit = 10;
  let lastDataHash = "";
  let tenCodesCache = [];
  let memberDataCache = {};
  let isProcessingEditNoteModal = false; // Prevent recursive modal opens
  let isProcessingCallDetails = false; // Guard against multiple calls
  let isCallModalSelect2Initialized = false; // Track Select2 state

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
                onclick="populateCallDetails('${callId}')">
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
    populateOfficerListTable();
  }

  function populateCallDetails(callId) {
    if (isProcessingCallDetails) {
      return;
    }
    isProcessingCallDetails = true;
    $("#callIDDetail").val(callId);
    $.ajax({
      url: `${API_URL}/api/v1/call/${callId}`,
      method: "GET",
      success: function (response) {
        callData = response;
        $("#createdAtCallDetail").text(
          new Date(callData.call.createdAt).toLocaleString()
        );
        $("#statusCallDetail")
          .text(callData.call.status ? "Open" : "Closed")
          .removeClass("badge-primary badge-danger")
          .addClass(callData.call.status ? "badge-primary" : "badge-danger");
        $("#titleCallDetail")
          .val(callData.call.title || "")
          .prop("disabled", true);
        $("#detailsCallDetail")
          .val(callData.call.details || "")
          .prop("disabled", true);

        // Departments
        const departmentIds = [...new Set(callData.call.departments || [])];
        $("#departmentsCallDetail").empty();
        $.ajax({
          url: `${API_URL}/api/v1/community/${dbUser.user.lastAccessedCommunity.communityID}/departments`,
          method: "GET",
          success: function (deptResponse) {
            departmentsData = deptResponse.departments.filter(
              (d) => d.template?.name !== "Civilian"
            );
            departmentIds.forEach((deptId) => {
              const dept = departmentsData.find((d) => d._id === deptId);
              if (dept) {
                $("#departmentsCallDetail").append(
                  `<span class="badge badge-secondary mr-2 mb-2">${dept.name}</span>`
                );
              }
            });

            // Populate departments dropdown
            $("#departmentsSelect")
              .empty()
              .append(
                departmentsData.map(
                  (dept) => `
                <option value="${dept._id}" ${
                    departmentIds.includes(dept._id) ? "selected" : ""
                  }>${dept.name}</option>
              `
                )
              );
          },
          error: function (xhr) {
            console.error("Error fetching departments:", xhr.responseText);
          },
        });

        // Assigned To
        const memberIds = [...new Set(callData.call.assignedTo || [])];
        $("#assignedToCallDetail").empty();
        $.ajax({
          url: `${API_URL}/api/v1/community/${dbUser.user.lastAccessedCommunity.communityID}/members?limit=100`,
          method: "GET",
          success: function (memberResponse) {
            membersData = memberResponse.members;
            memberIds.forEach((memberId) => {
              const member = membersData.find((m) => m._id === memberId);
              if (member) {
                $("#assignedToCallDetail").append(`
                  <span class="badge badge-secondary mr-2 mb-2 d-flex align-items-center">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
                      member.user.username
                    )}&background=808080&color=fff&size=24" class="rounded-circle mr-1" style="width: 20px; height: 20px;">
                    ${member.user.username}
                  </span>
                `);
              }
            });

            // Populate members dropdown
            $("#membersSelect")
              .empty()
              .append(
                membersData.map(
                  (member) => `
                <option value="${member._id}" ${
                    memberIds.includes(member._id) ? "selected" : ""
                  }>${member.user.username}</option>
              `
                )
              );
          },
          error: function (xhr) {
            console.error("Error fetching members:", xhr.responseText);
          },
        });

        // Notes
        $("#notesCallDetail").empty();
        (callData.call.callNotes || []).reverse().forEach((note) => {
          const isOwnNote = note.createdBy === dbUser.user.username;
          $("#notesCallDetail").append(`
            <div class="card bg-dark text-white mb-2 p-3">
              <div class="d-flex justify-content-between">
                <p class="mb-0">${note.note}</p>
                ${
                  isOwnNote
                    ? `
                  <div>
                   
                    <button class="btn btn-md btn-outline-danger" onclick="deleteNote('${note._id}')"><i class="fa fa-trash"></i></button>
                  </div>
                `
                    : ""
                }
              </div>
              <small class="text-muted">${note.createdBy} • ${new Date(
            note.createdAt
          ).toLocaleString()}</small>
            </div>
          `);
        });

        // Show/hide Close/Reopen buttons
        $("#closeCallBtn").toggle(callData.call.status);
        $("#reopenCallBtn").toggle(!callData.call.status);
        $("#callDetailModal").modal("show");
        $(".modal-backdrop").show();
        isProcessingCallDetails = false;
      },
      error: function (xhr) {
        console.error("Error fetching call details:", xhr.responseText);
        alert(
          "Failed to load call details: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
        isProcessingCallDetails = false;
      },
    });
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
    $("#titleCallDetail, #detailsCallDetail").prop("disabled", !isEditMode);
    $("#editCallBtn").toggle(!isEditMode);
    $("#saveCallBtn, #cancelEditBtn").toggle(isEditMode);
    $("#departmentsSelect, #membersSelect").toggle(isEditMode);
    $("#departmentsCallDetail, #assignedToCallDetail").toggle(!isEditMode);
    $("#addNoteBtn, #deleteCallBtn, #closeCallBtn, #reopenCallBtn").toggle(
      !isEditMode
    );
    $("#addNoteSection").hide();
    if (isEditMode) {
      // Initialize Select2
      $("#departmentsSelect")
        .select2({
          placeholder: "Select departments",
          width: "100%",
          dropdownParent: $("#callDetailModal"),
        })
        .on("change", function () {
          callData.call.departments = $(this).val() || [];
        });
      $("#membersSelect")
        .select2({
          placeholder: "Select members",
          width: "100%",
          dropdownParent: $("#callDetailModal"),
        })
        .on("change", function () {
          callData.call.assignedTo = $(this).val() || [];
        });
    } else {
      // Destroy Select2
      $("#departmentsSelect, #membersSelect").select2("destroy");
      $("#titleCallDetail").val(callData.call.title || "");
      $("#detailsCallDetail").val(callData.call.details || "");
      populateCallDetails($("#callIDDetail").val());
    }
  }

  function openDepartmentModal() {
    $("#departmentList").empty();
    const selectedIds = callData.call.departments || [];
    departmentsData.forEach((dept) => {
      $("#departmentList").append(`
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="dept-${
            dept._id
          }" value="${dept._id}" ${
        selectedIds.includes(dept._id) ? "checked" : ""
      }>
          <label class="form-check-label" for="dept-${dept._id}">${
        dept.name
      }</label>
        </div>
      `);
    });
    $("#departmentSearch")
      .val("")
      .on("input", function () {
        const query = $(this).val().toLowerCase();
        $("#departmentList .form-check").each(function () {
          $(this).toggle($(this).text().toLowerCase().includes(query));
        });
      });
    $("#departmentModal")
      .modal("show")
      .one("hidden.bs.modal", function () {
        const selected = [];
        $("#departmentList input:checked").each(function () {
          const deptId = $(this).val();
          const dept = departmentsData.find((d) => d._id === deptId);
          if (dept) selected.push({ id: dept._id, name: dept.name });
        });
        callData.call.departments = selected.map((d) => d.id);
        $("#departmentsCallDetail").empty();
        selected.forEach((dept) => {
          $("#departmentsCallDetail").append(
            `<span class="badge badge-secondary mr-2 mb-2">${dept.name}</span>`
          );
        });
      });
  }

  function openMemberModal() {
    $("#memberList").empty();
    const selectedIds = callData.call.assignedTo || [];
    membersData.forEach((member) => {
      $("#memberList").append(`
        <div class="form-check d-flex align-items-center">
          <input type="checkbox" class="form-check-input" id="member-${
            member._id
          }" value="${member._id}" ${
        selectedIds.includes(member._id) ? "checked" : ""
      }>
          <label class="form-check-label" for="member-${member._id}">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
              member.user.username
            )}&background=808080&color=fff&size=24" class="rounded-circle mr-2" style="width: 20px; height: 20px;">
            ${member.user.username}
          </label>
        </div>
      `);
    });
    $("#memberSearch")
      .val("")
      .on("input", function () {
        const query = $(this).val().toLowerCase();
        $("#memberList .form-check").each(function () {
          $(this).toggle($(this).text().toLowerCase().includes(query));
        });
      });
    $("#memberModal")
      .modal("show")
      .one("hidden.bs.modal", function () {
        const selectedIds = [];
        $("#memberList input:checked").each(function () {
          selectedIds.push($(this).val());
        });
        callData.call.assignedTo = selectedIds;
        $("#assignedToCallDetail").empty();
        selectedIds.forEach((memberId) => {
          const member = membersData.find((m) => m._id === memberId);
          if (member) {
            $("#assignedToCallDetail").append(`
            <span class="badge badge-secondary mr-2 mb-2 d-flex align-items-center">
              <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
                member.user.username
              )}&background=808080&color=fff&size=24" class="rounded-circle mr-1" style="width: 20px; height: 20px;">
              ${member.user.username}
            </span>
          `);
          }
        });
      });
  }

  function saveChanges() {
    $("#departmentsCallDetail").empty();
    $("#assignedToCallDetail").empty();

    const updatedCall = {
      title: $("#titleCallDetail").val().trim(),
      details: $("#detailsCallDetail").val().trim(),
      departments: [...new Set(callData.call.departments)],
      assignedTo: [...new Set(callData.call.assignedTo)],
    };
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}`,
      method: "PUT",
      data: JSON.stringify(updatedCall),
      contentType: "application/json",
      success: function () {
        alert("Call updated successfully.");
        toggleEditMode();
        populateCallDetails($("#callIDDetail").val());
      },
      error: function (xhr) {
        console.error("Error updating call:", xhr.responseText);
        alert(
          "Failed to update call: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function deleteCall() {
    if (
      !confirm(
        "Are you sure you want to delete this call? This action cannot be undone."
      )
    )
      return;
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}`,
      method: "DELETE",
      success: function () {
        $(`#${$("#callIDDetail").val()}-row`).fadeOut(1, function () {
          $(this).remove();
        });
        loadAssignedCalls(); // Refresh call list

        // $(".close").click();
        $("[data-dismiss=modal]").trigger({ type: "click" });
        // $("#callDetailModal").modal("hide");
        // hideModal("callDetailModal");
        // $("body").removeClass("modal-open");
        // $(".modal-backdrop").remove();
        alert("Call deleted successfully.");
      },
      error: function (xhr) {
        console.error("Error deleting call:", xhr.responseText);
        alert(
          "Failed to delete call: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function markAsCompleted() {
    if (!confirm("Are you sure you want to mark this call as completed?"))
      return;
    const noteData = {
      note: `${dbUser.user.username} marked the call as completed.`,
      createdBy: "system",
      createdAt: new Date().toISOString(),
    };
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}`,
      method: "PUT",
      data: JSON.stringify({ status: false }),
      contentType: "application/json",
      success: function () {
        $.ajax({
          url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}/note`,
          method: "POST",
          data: JSON.stringify(noteData),
          contentType: "application/json",
          success: function () {
            alert("Call marked as completed.");
            hideModal("callDetailModal");
            $("#callDetailModal").modal("hide");
          },
          error: function (xhr) {
            console.error("Error adding note:", xhr.responseText);
            alert("Failed to add completion note.");
          },
        });
      },
      error: function (xhr) {
        console.error("Error marking call as completed:", xhr.responseText);
        alert(
          "Failed to mark call as completed: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function reopenCall() {
    if (!confirm("Are you sure you want to reopen this call?")) return;
    const noteData = {
      note: `${dbUser.user.username} reopened the call.`,
      createdBy: "system",
      createdAt: new Date().toISOString(),
    };
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}`,
      method: "PUT",
      data: JSON.stringify({ status: true }),
      contentType: "application/json",
      success: function () {
        $.ajax({
          url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}/note`,
          method: "POST",
          data: JSON.stringify(noteData),
          contentType: "application/json",
          success: function () {
            alert("Call reopened successfully.");
            populateCallDetails($("#callIDDetail").val());
          },
          error: function (xhr) {
            console.error("Error adding note:", xhr.responseText);
            alert("Failed to add reopen note.");
          },
        });
      },
      error: function (xhr) {
        console.error("Error reopening call:", xhr.responseText);
        alert(
          "Failed to reopen call: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function toggleAddNote() {
    $("#addNoteSection").toggle();
    $("#newNoteInput").val("");
  }

  function addNote() {
    const noteText = $("#newNoteInput").val().trim();
    if (!noteText) {
      alert("Please enter a note.");
      return;
    }
    const noteData = {
      note: noteText,
      createdBy: dbUser.user.username,
      createdAt: new Date().toISOString(),
    };
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}/note`,
      method: "POST",
      data: JSON.stringify(noteData),
      contentType: "application/json",
      success: function () {
        alert("Note added successfully.");
        toggleAddNote();
        populateCallDetails($("#callIDDetail").val());
      },
      error: function (xhr) {
        console.error("Error adding note:", xhr.responseText);
        alert(
          "Failed to add note: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function openEditNoteModal(noteId, noteText) {
    if (isProcessingEditNoteModal) {
      return;
    }
    isProcessingEditNoteModal = true;

    // Set note data
    $("#editNoteId").val(noteId);
    $("#editNoteInput")
      .val(noteText)
      .prop("disabled", false)
      .prop("readonly", false)
      .removeAttr("disabled readonly");

    // Clear all event handlers to prevent loops
    $("#editNoteInput").off();

    // Open modal with minimal configuration
    $("#editNoteModal").modal({
      backdrop: true,
      keyboard: true,
    });

    // Log textarea clicks to debug loop
    $("#editNoteInput").on("click input", function (e) {});

    // Allow modal to open without immediate focus
    setTimeout(() => {
      isProcessingEditNoteModal = false;
    }, 100);
  }

  // Handle modal show to prevent backdrop issues
  $("#editNoteModal").on("show.bs.modal", function () {
    $(".modal-backdrop").not(":last").remove();
    $("body").addClass("modal-open");
    $("#editNoteModal").css("z-index", 1100);
    $(".modal-backdrop").last().css("z-index", 1090);
  });

  // Clean up on close
  $("#editNoteModal").on("hidden.bs.modal", function () {
    $("#editNoteInput").val("").off();
    $(".modal-backdrop").remove();
    $("body").removeClass("modal-open");
    isProcessingEditNoteModal = false;
  });

  // Debug modal events to trace recursion
  $("#editNoteModal").on(
    "show.bs.modal shown.bs.modal hide.bs.modal hidden.bs.modal",
    function (e) {}
  );

  function saveEditedNote() {
    const noteId = $("#editNoteId").val();
    const noteText = $("#editNoteInput").val().trim();
    if (!noteText) {
      alert("Note cannot be empty.");
      return;
    }
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}/note/${noteId}`,
      method: "PUT",
      data: JSON.stringify({ note: noteText, updatedBy: dbUser.user.username }),
      contentType: "application/json",
      success: function () {
        alert("Note updated successfully.");
        $("#editNoteModal").modal("hide");
        populateCallDetails($("#callIDDetail").val());
      },
      error: function (xhr) {
        console.error("Error updating note:", xhr.responseText);
        alert(
          "Failed to update note: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function deleteNote(noteId) {
    if (
      !confirm(
        "Are you sure you want to delete this note? This action cannot be undone."
      )
    )
      return;
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}/note/${noteId}`,
      method: "DELETE",
      success: function () {
        alert("Note deleted successfully.");
        populateCallDetails($("#callIDDetail").val());
      },
      error: function (xhr) {
        console.error("Error deleting note:", xhr.responseText);
        alert(
          "Failed to delete note: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  // Initialize departments and members data on modal show
  $("#callModal")
    .off("show.bs.modal")
    .on("show.bs.modal", function () {
      // Clear inputs
      $("#callTitle, #callDetails, #callNote").val("");

      // Only destroy Select2 if initialized
      if (isCallModalSelect2Initialized) {
        try {
          $("#callDepartments, #callMembers").select2("destroy");
        } catch (e) {
          console.error("Error destroying Select2:", e);
        }
      }
      $("#callDepartments, #callMembers").empty();
      isCallModalSelect2Initialized = false;

      // Fetch departments
      $.ajax({
        url: `${API_URL}/api/v1/community/${dbUser.user.lastAccessedCommunity.communityID}/departments`,
        method: "GET",
        success: function (deptResponse) {
          departmentsData =
            deptResponse.departments.filter(
              (d) => d.template?.name !== "Civilian"
            ) || [];
          $("#callDepartments")
            .empty()
            .append(
              departmentsData.length > 0
                ? departmentsData.map(
                    (dept) =>
                      `<option value="${dept._id}">${dept.name}</option>`
                  )
                : '<option value="" disabled>No departments available</option>'
            )
            .select2({
              placeholder: "Select departments",
              width: "100%",
              dropdownParent: $("#callModal"),
            })
            .on("change", function () {});
          isCallModalSelect2Initialized = true;
        },
        error: function (xhr) {
          console.error("Error fetching departments:", xhr.responseText);
          $("#callDepartments")
            .empty()
            .append(
              '<option value="" disabled>Error loading departments</option>'
            )
            .select2({
              placeholder: "Select departments",
              width: "100%",
              dropdownParent: $("#callModal"),
            });
          isCallModalSelect2Initialized = true;
        },
      });

      // Fetch members
      $.ajax({
        url: `${API_URL}/api/v1/community/${dbUser.user.lastAccessedCommunity.communityID}/members?limit=100`,
        method: "GET",
        success: function (memberResponse) {
          membersData = memberResponse.members || [];
          $("#callMembers")
            .empty()
            .append(
              membersData.length > 0
                ? membersData.map(
                    (member) =>
                      `<option value="${member._id}">${member.user.username}</option>`
                  )
                : '<option value="" disabled>No members available</option>'
            )
            .select2({
              placeholder: "Select members",
              width: "100%",
              dropdownParent: $("#callModal"),
            })
            .on("change", function () {});
          isCallModalSelect2Initialized = true;
        },
        error: function (xhr) {
          console.error("Error fetching members:", xhr.responseText);
          $("#callMembers")
            .empty()
            .append('<option value="" disabled>Error loading members</option>')
            .select2({
              placeholder: "Select members",
              width: "100%",
              dropdownParent: $("#callModal"),
            });
          isCallModalSelect2Initialized = true;
        },
      });
    });

  // Clean up on modal close
  $("#callModal")
    .off("hidden.bs.modal")
    .on("hidden.bs.modal", function () {
      $("#callTitle, #callDetails, #callNote").val("");
      if (isCallModalSelect2Initialized) {
        try {
          $("#callDepartments, #callMembers").select2("destroy");
        } catch (e) {
          console.error("Error destroying Select2 on close:", e);
        }
      }
      $("#callDepartments, #callMembers").empty();
      isCallModalSelect2Initialized = false;
    });

  function createCall() {
    const title = $("#callTitle").val().trim();
    const details = $("#callDetails").val().trim();
    const departments = $("#callDepartments").val() || [];
    const assignedTo = $("#callMembers").val() || [];
    const noteText = $("#callNote").val().trim();
    const communityId = $("#communityId").val();
    const createdById = $("#createdById").val();
    const createdByUsername = $("#createdByUsername").val();

    if (!title) {
      alert("Title is required.");
      return;
    }

    const newCall = {
      title,
      details,
      departments: [...new Set(departments)],
      assignedTo: [...new Set(assignedTo)],
      callNotes: noteText
        ? [
            {
              note: noteText,
              createdBy: dbUser.user.username,
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      status: true,
      communityId,
      createdByID: createdById,
      createdByUsername,
    };

    $.ajax({
      url: `${API_URL}/api/v1/calls`,
      method: "POST",
      data: JSON.stringify(newCall),
      contentType: "application/json",
      success: function () {
        alert("Call created successfully.");

        // hideModal("callModal");
        // $(".close").click();
        $("[data-dismiss=modal]").trigger({ type: "click" });
        // $("#callModal").modal("hide");
        // $("#callModal").hide();
        // $(".modal-backdrop").remove();
        loadAssignedCalls();
      },
      error: function (xhr) {
        console.error("Error creating call:", xhr.responseText);
        alert(
          "Failed to create call: " +
            (xhr.responseJSON?.message || "Unknown error")
        );
      },
    });
  }

  function populateOfficerListTable() {
    const communityId = dbUser.user.lastAccessedCommunity.communityID;

    // Pre-fetch tenCodes and memberData
    // IMPORTANT: If this AJAX call fails or takes too long, it can prevent DataTable from initializing.
    // Consider making this truly async and initializing DataTable in its 'success' callback,
    // or ensuring these caches are populated before this function is called.
    if (!tenCodesCache.length) {
      $.ajax({
        url: `${API_URL}/api/v1/community/${communityId}`,
        type: "GET",
        async: false, // This is a synchronous call, which can block the UI.
        // For a production app, you typically want to avoid `async: false`.
        success: function (commData) {
          tenCodesCache = commData.community.tenCodes || [];
          memberDataCache = commData.community.members || {};
          $("#community-name").text(commData?.community?.name);
        },
        error: function (xhr) {
          console.error(
            "Error pre-fetching community details:",
            xhr.responseText
          );
          // Potentially display an error to the user or stop function execution
          return; // Stop if crucial data isn't loaded
        },
      });
    }

    if (!$.fn.DataTable.isDataTable("#officerListTable")) {
      officerListTable = $("#officerListTable").DataTable({
        serverSide: true, // DataTables will make AJAX requests for data
        paging: true,
        pageLength: unitLimit, // Make sure unitLimit is defined and correct (e.g., 10, 25, 50)
        searching: false, // Set to true if you implement server-side searching based on user input
        ordering: false, // Set to true if you implement server-side sorting
        bLengthChange: false, // Disables the "Show X entries" dropdown
        info: false, // Disables the "Showing X to Y of Z entries" message
        processing: false, // Shows the "Processing..." message
        ajax: {
          url: `${API_URL}/api/v1/community/${communityId}/members`,
          type: "GET",
          // 'data' function is used to modify the parameters DataTables sends to your API
          data: function (d) {
            // DataTables automatically sends 'start', 'length', and 'draw'
            // We capture 'draw' to send it back in our 'dataSrc' function.
            currentDraw = d.draw;

            // Map DataTables' parameters to your API's parameters
            d.page = Math.floor(d.start / d.length) + 1; // Calculate 1-based page number
            d.limit = d.length; // Your API's limit per page (same as DataTables' length)

            // You can remove or log d.draw if you want, but DataTables handles sending it.
            // delete d.draw; // If your backend truly doesn't want it, but usually it's ignored if not used.
          },
          // 'dataSrc' function is used to massage the raw JSON response from your API
          // into the format DataTables expects (an object with draw, recordsTotal, recordsFiltered, data)
          dataSrc: function (json) {
            // *** DEBUGGER HERE ***
            // Execution will pause here after your API returns a response.
            // Inspect the 'json' object in the browser console.
            // debugger;

            // Ensure 'totalUsers' and 'members' are present in your API's JSON response
            const totalUsers = json.totalUsers || 0;

            if (totalUsers === 0 && json.members && json.members.length > 0) {
              console.warn(
                "totalUsers is 0, but 'members' array has data. This might cause pagination issues."
              );
            } else if (
              totalUsers > 0 &&
              (!json.members || json.members.length === 0)
            ) {
              console.warn(
                "totalUsers is > 0, but 'members' array is empty. This might indicate an issue with your API's pagination logic for the current page."
              );
            }

            // Construct the object that DataTables expects from your API's response
            const dataTableResponse = {
              // Use the captured 'currentDraw' since your API doesn't return it directly.
              // This is CRUCIAL for DataTables to clear the "Processing..." message.
              draw: currentDraw,
              recordsTotal: totalUsers,
              recordsFiltered: totalUsers, // Assuming no server-side filtering for now, so total = filtered
              data: json.members || [], // Your array of member objects for the current page
            };

            // *** CRITICAL CHECK ***
            // DataTables' dataSrc function MUST return the array of data rows directly.
            if (!Array.isArray(dataTableResponse.data)) {
              console.error(
                "ERROR: dataSrc is NOT returning an array! DataTables will fail to render rows. Check 'json.members'."
              );
              return []; // Return empty array to prevent further errors
            }

            // Return the array of data rows to DataTables
            return dataTableResponse.data;
          },
          // 'error' function handles AJAX failures
          error: function (xhr, error, thrown) {
            console.error(
              "Error fetching members:",
              xhr.responseText,
              error,
              thrown
            );
            officerListTable.clear().draw(); // Clear existing data if there was an error
            $("#officerListTable tbody").html(
              '<tr><td colspan="3" class="text-center">Error loading units. Please try again.</td></tr>'
            );
            // DataTables typically handles clearing the processing message on error,
            // but if it sticks, this could indicate a network issue or malformed error response.
          },
        },
        columns: [
          {
            data: "user.username",
            title: "Username",
            // 'render' function formats the data for display
            render: (data) => data || "", // Ensure data is not null/undefined
          },
          {
            data: null, // Use null because we're creating the content from multiple fields
            title: "Call Sign",
            // 'render' function for computed values
            render: (data) => {
              // *** DEBUGGER HERE ***
              // This debugger will hit for each row being rendered.
              // Inspect 'data' to ensure it has 'user.callSign'.
              // debugger; // Uncomment only if you suspect issues with specific rows
              return data.user && data.user.callSign
                ? `Unit ${data.user.callSign}`
                : "No Unit #";
            },
          },
          {
            data: null, // Use null because we're creating custom HTML (select dropdown)
            title: "Status",
            // 'createdCell' is used for direct DOM manipulation within the cell, like adding a dropdown
            createdCell: function (cell, cellData, rowData) {
              // *** DEBUGGER HERE ***
              // This debugger will hit for each cell in this column being created.
              // Inspect 'rowData' to ensure it has '_id' and 'user.callSign' etc.
              // debugger; // Uncomment only if you suspect issues with cell creation

              // Ensure rowData and its properties are accessible
              if (!rowData || !rowData._id) {
                console.error(
                  "rowData or rowData._id is missing for cell creation.",
                  rowData
                );
                $(cell).empty().text("N/A"); // Provide fallback
                return;
              }

              const $select = $(
                `<select class="status-select" data-user-id="${rowData._id}"></select>`
              );
              $(cell).empty().append($select); // Clear cell content and append the select

              // Access memberDataCache and tenCodesCache safely
              const memberData = memberDataCache[rowData._id] || {};
              const currentTenCode = tenCodesCache.find(
                (code) => code._id === memberData.tenCodeID
              );

              // Build options for the select dropdown
              const selectOptions =
                tenCodesCache.length > 0
                  ? tenCodesCache
                      .map(
                        (code) =>
                          `<option value="${code._id}" ${
                            code._id === memberData.tenCodeID ? "selected" : ""
                          }>${code.code}</option>`
                      )
                      .join("")
                  : "";

              $select.append(`
                            <option value="Unknown" ${
                              !currentTenCode ? "selected" : ""
                            }>Unknown</option>
                            ${selectOptions}
                        `);

              // Attach event listener for change (using .off().on() to prevent multiple bindings)
              $select.off("change").on("change", function () {
                const userId = $(this).data("user-id");
                const tenCodeID = $(this).val();
                const departmentId =
                  document.getElementById("boloDepartmentID")?.value || null; // Ensure this element exists
                $.ajax({
                  url: `${API_URL}/api/v1/community/${communityId}/members/${userId}/tenCode`,
                  method: "PUT",
                  data: JSON.stringify({
                    departmentId: departmentId,
                    tenCodeID: tenCodeID === "Unknown" ? null : tenCodeID,
                  }),
                  contentType: "application/json",
                  success: function () {
                    // Update cache after successful update
                    if (memberDataCache[userId]) {
                      memberDataCache[userId].tenCodeID =
                        tenCodeID === "Unknown" ? null : tenCodeID;
                    }
                  },
                  error: function (xhr) {
                    console.error(
                      "Error updating unit status:",
                      xhr.responseText
                    );
                    alert(
                      "Failed to update unit status: " +
                        (xhr.responseJSON?.message || "Unknown error")
                    );
                  },
                });
              });
            },
          },
        ],
        // 'drawCallback' is useful for actions that need to run after each table draw (initial load, page change, sort, etc.)
        drawCallback: function () {
          // You might put code here to re-initialize tooltips, re-apply styling, etc.
          // It indicates that the table rendering process is finished.
        },
      });
    } else {
      // If the table already exists, just reload its data using ajax.reload()
      officerListTable?.ajax.reload(null, false); // Reloads data without resetting pagination
    }
  }

  // Update changeUnitPage
  function changeUnitPage(page) {
    if (page < 1) return;
    officerListTable.page(page - 1).draw("page");
  }

  // Initialize dashboard data
  pollDashboardData();
  setInterval(pollDashboardData, 30000); // Poll every 30 seconds

  window.showBoloModal = showBoloModal;
  window.handleCreateBolo = handleCreateBolo;
  window.clearBoloForm = clearBoloForm;
  window.pollDashboardData = pollDashboardData;
  window.changeBoloPage = changeBoloPage;
  window.handleUpdateBolo = handleUpdateBolo;
  window.handleDeleteBolo = handleDeleteBolo;
  window.populateBoloDetails = populateBoloDetails;
  window.changeCallPage = changeCallPage;
  window.populateCallDetails = populateCallDetails;
  window.toggleEditMode = toggleEditMode;
  window.openDepartmentModal = openDepartmentModal;
  window.openMemberModal = openMemberModal;
  window.saveChanges = saveChanges;
  window.deleteCall = deleteCall;
  window.markAsCompleted = markAsCompleted;
  window.reopenCall = reopenCall;
  window.toggleAddNote = toggleAddNote;
  window.addNote = addNote;
  window.openEditNoteModal = openEditNoteModal;
  window.saveEditedNote = saveEditedNote;
  window.deleteNote = deleteNote;
  window.createCall = createCall;
  window.changeUnitPage = changeUnitPage;
});
