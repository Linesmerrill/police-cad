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
  let isProcessingEditNoteModal = false; // Prevent recursive modal opens
  let isProcessingCallDetails = false; // Guard against multiple calls

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

  function populateCallDetails(callId) {
    if (isProcessingCallDetails) {
      console.log("populateCallDetails blocked, already processing.");
      return;
    }
    isProcessingCallDetails = true;
    $("#callIDDetail").val(callId);
    $.ajax({
      url: `${API_URL}/api/v1/call/${callId}`,
      method: "GET",
      success: function (response) {
        console.log("Call details:", response);
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
        console.log("Department IDs:", departmentIds);
        $("#departmentsCallDetail").empty();
        $.ajax({
          url: `${API_URL}/api/v1/community/${dbUser.user.lastAccessedCommunity.communityID}/departments`,
          method: "GET",
          success: function (deptResponse) {
            console.log("Departments response:", deptResponse);
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
            console.log(
              "Department badges appended:",
              $("#departmentsCallDetail .badge").length
            );

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
        console.log("Member IDs:", memberIds);
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
            console.log(
              "Member badges appended:",
              $("#assignedToCallDetail .badge").length
            );

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
          console.log("Departments updated:", callData.call.departments);
        });
      $("#membersSelect")
        .select2({
          placeholder: "Select members",
          width: "100%",
          dropdownParent: $("#callDetailModal"),
        })
        .on("change", function () {
          callData.call.assignedTo = $(this).val() || [];
          console.log("Members updated:", callData.call.assignedTo);
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
    console.log("Cleared departments and assignedTo before saving.");

    const updatedCall = {
      title: $("#titleCallDetail").val().trim(),
      details: $("#detailsCallDetail").val().trim(),
      departments: [...new Set(callData.call.departments)],
      assignedTo: [...new Set(callData.call.assignedTo)],
    };
    console.log("Saving call with data:", updatedCall);
    $.ajax({
      url: `${API_URL}/api/v1/call/${$("#callIDDetail").val()}`,
      method: "PUT",
      data: JSON.stringify(updatedCall),
      contentType: "application/json",
      success: function () {
        alert("Call updated successfully.");
        toggleEditMode();
        console.log("Saving call, calling populateCallDetails.");
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
        alert("Call deleted successfully.");
        $("#callDetailModal").modal("hide");
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
      console.log("Edit note modal blocked, processing in progress.");
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
    $("#editNoteInput").on("click input", function (e) {
      console.log("Edit note textarea event:", e.type, "value:", $(this).val());
    });

    // Allow modal to open without immediate focus
    setTimeout(() => {
      isProcessingEditNoteModal = false;
      console.log("Edit note modal opened, noteId:", noteId, "text:", noteText);
    }, 100);
  }

  // Handle modal show to prevent backdrop issues
  $("#editNoteModal").on("show.bs.modal", function () {
    console.log("Edit note modal opening.");
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
    console.log("Edit note modal closed.");
  });

  // Debug modal events to trace recursion
  $("#editNoteModal").on(
    "show.bs.modal shown.bs.modal hide.bs.modal hidden.bs.modal",
    function (e) {
      console.log(
        "Edit note modal event:",
        e.type,
        "active modals:",
        $(".modal:visible").length
      );
    }
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
});
