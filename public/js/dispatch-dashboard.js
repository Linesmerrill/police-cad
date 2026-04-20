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
  let currentCallFilter = "open"; // Filter: "all", "open", or "closed"
  let currentCallDepartmentFilter = "all"; // Department filter for calls
  let callDepartmentsCache = []; // Cache departments for call filtering
  const callMembersCache = new Map(); // Session-lifetime lookup: memberId -> user object
  let callCachesReady = false; // Track if caches are loaded

  fetchAndRenderDepartments(); // Fetch and render departments on page load
  initializeCallCaches(); // Load departments before displaying calls

  // Resolve the given member IDs via POST /api/v1/users, populating callMembersCache.
  // Only fetches IDs not already cached; returns a Promise that resolves when done.
  function resolveCallMembers(memberIds) {
    const missing = [...new Set(memberIds)].filter(
      (id) => id && !callMembersCache.has(id)
    );
    if (missing.length === 0) return Promise.resolve();
    return $.ajax({
      url: `${API_URL}/api/v1/users`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ userIds: missing }),
    })
      .then(function (users) {
        (users || []).forEach(function (u) {
          if (u && u._id) callMembersCache.set(u._id, u);
        });
      })
      .catch(function (err) {
        console.error("Error resolving call members:", err);
      });
  }

  // Initialize caches before loading calls. Only departments are preloaded now;
  // member names are resolved lazily per visible call via POST /api/v1/users.
  // This replaces the old /members?limit=500 fetch which could return the entire
  // community roster into memory.
  function initializeCallCaches() {
    const communityId = dbUser.user.lastAccessedCommunity.communityID;
    if (!communityId) return;

    $.ajax({
      url: `${API_URL}/api/v1/community/${communityId}/departments`,
      method: "GET",
    })
      .then(function (data) {
        const departments = (data.departments || []).filter(
          (d) => d.template?.name !== "Civilian"
        );
        callDepartmentsCache = departments;

        const $select = $("#callDepartmentFilter");
        $select.empty();
        $select.append('<option value="all">All Departments</option>');
        departments.forEach((dept) => {
          $select.append(
            `<option value="${dept._id}">${dept.name}</option>`
          );
        });
      })
      .always(function () {
        callCachesReady = true;
      });
  }

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

  // Cleanup all modals - ensures no stray backdrops
  function cleanupAllModals() {
    // Remove any stray backdrops
    $(".modal-backdrop").remove();
    // Reset body state if no modals are open
    if ($(".modal.show").length === 0) {
      $("body").removeClass("modal-open").css("padding-right", "");
    }
  }

  // Show confirmation modals (for nested modal support)
  function showMarkCompletedModal() {
    $("#markCompletedModal").modal("show");
  }

  function showReopenCallModal() {
    $("#reopenCallModal").modal("show");
  }

  function showDeleteCallModal() {
    $("#deleteCallModal").modal("show");
  }

  // Toast notification functions - using vanilla JS for reliability
  function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('dispatch-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dispatch-toast-container';
      container.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 99999;';
      document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const bgColor = type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#dc3545';
    const textColor = type === 'warning' ? '#000' : '#fff';

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.style.cssText = `min-width: 300px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); background-color: ${bgColor}; color: ${textColor}; display: flex; align-items: center; opacity: 0; transition: opacity 0.3s ease;`;
    toast.innerHTML = `
      <div style="padding: 12px 16px; flex-grow: 1;">${message}</div>
      <button onclick="removeToast('${toastId}')" style="background:none;border:none;color:${textColor};font-size:18px;padding:8px 12px;cursor:pointer;">×</button>
    `;

    container.appendChild(toast);

    // Fade in
    setTimeout(() => { toast.style.opacity = '1'; }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => removeToast(toastId), 5000);
  }

  function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
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

  // Set call filter and reload
  function setCallFilter(filter) {
    currentCallFilter = filter;
    currentCallPage = 1; // Reset pagination when filter changes

    // Update button styles
    $("#filterAllCalls, #filterOpenCalls, #filterClosedCalls")
      .removeClass("btn-primary")
      .addClass("btn-secondary");
    if (filter === "all") {
      $("#filterAllCalls").removeClass("btn-secondary").addClass("btn-primary");
      $("#callsHeading").text("All Calls:");
    } else if (filter === "open") {
      $("#filterOpenCalls").removeClass("btn-secondary").addClass("btn-primary");
      $("#callsHeading").text("Active Calls:");
    } else if (filter === "closed") {
      $("#filterClosedCalls").removeClass("btn-secondary").addClass("btn-primary");
      $("#callsHeading").text("Closed Calls:");
    }

    loadAssignedCalls();
  }

  // Fetch departments for call filter dropdown
  // Set department filter for calls
  function setCallDepartmentFilter(departmentId) {
    currentCallDepartmentFilter = departmentId;
    currentCallPage = 1; // Reset pagination when filter changes
    loadAssignedCalls();
  }
  window.setCallDepartmentFilter = setCallDepartmentFilter; // Expose globally

  // AJAX function to load assigned calls
  function loadAssignedCalls() {
    const communityId = dbUser.user.lastAccessedCommunity.communityID;
    const userId = dbUser._id;
    if (!communityId) {
      console.warn("No community ID found, skipping call load.");
      return;
    }

    // Build query parameters based on filters
    let queryParams = `?limit=${callLimit}&page=${currentCallPage}`;
    if (currentCallFilter === "open") queryParams += "&status=true";
    else if (currentCallFilter === "closed") queryParams += "&status=false";
    // "all" = no status param, returns all calls
    if (currentCallDepartmentFilter && currentCallDepartmentFilter !== "all") {
      queryParams += `&departmentId=${currentCallDepartmentFilter}`;
    }

    $.ajax({
      url: `${API_URL}/api/v2/calls/community/${communityId}${queryParams}`,
      method: "GET",
      success: function (response) {
        const calls = response.data || response; // Fallback if response is array
        const totalCount = response.totalCount || calls.length; // Fallback if totalCount missing

        // Batch-resolve all assignedTo member IDs across visible calls before rendering
        // so the row-level callMembersCache.get(id) lookups below hit.
        const allMemberIds = calls.flatMap(
          (c) => c.call?.assignedTo || []
        );

        resolveCallMembers(allMemberIds).then(function () {
          const $tbody = $("#callTable tbody");
          $tbody.empty(); // Clear existing rows

          if (calls.length === 0) {
            $tbody.append(
              '<tr><td colspan="5" class="text-center">No calls found.</td></tr>'
            );
          } else {
            calls.forEach((call) => {
            const callId = call._id;
            const createdAt = call.call?.createdAt
              ? new Date(call.call.createdAt).toLocaleString()
              : "N/A";
            const isOpen = call.call?.status === true;
            const statusBadge = isOpen
              ? '<span class="badge badge-success">Open</span>'
              : '<span class="badge badge-secondary">Closed</span>';

            // Get department names from the call
            const departmentIds = call.call?.departments || [];
            const departmentNames = departmentIds
              .map((deptId) => {
                const dept = callDepartmentsCache.find((d) => d._id === deptId);
                return dept ? dept.name : null;
              })
              .filter((name) => name !== null);
            const departmentDisplay =
              departmentNames.length > 0
                ? departmentNames
                    .map(
                      (name) =>
                        `<span class="badge badge-info">${name}</span>`
                    )
                    .join(" ")
                : '<span class="text-muted">-</span>';

            const description =
              `${call.call?.title || ""}${
                call.call?.details ? " | " + call.call.details : ""
              }` || "N/A";

            // Get assigned units from assignedTo (array of member IDs).
            // Names come from callMembersCache (Map), populated via resolveCallMembers above.
            const assignedToIds = call.call?.assignedTo || [];
            const assignedNames = assignedToIds
              .map((memberId) => {
                const member = callMembersCache.get(memberId);
                return member?.user?.username || null;
              })
              .filter((name) => name !== null);
            const unitsAssigned =
              assignedNames.length > 0
                ? assignedNames
                    .map(
                      (name) =>
                        `<span class="badge badge-secondary">${name}</span>`
                    )
                    .join(" ")
                : '<span class="text-muted">-</span>';

            $tbody.append(`
              <tr class="gray-hover" data-id="${callId}" style="cursor: pointer;"
                onclick="populateCallDetails('${callId}')">
                <td>${createdAt}</td>
                <td>${statusBadge}</td>
                <td>${departmentDisplay}</td>
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
          const totalPages = Math.ceil(totalCount / callLimit);
          if (totalCount > callLimit) {
            $paginationContainer.append(`
              <button class="btn btn-primary" onclick="changeCallPage(${
                currentCallPage - 1
              })" ${currentCallPage === 1 ? "disabled" : ""}>Previous</button>
              <span class="mx-3 align-self-center">Page ${currentCallPage} of ${totalPages}</span>
              <button class="btn btn-primary" onclick="changeCallPage(${
                currentCallPage + 1
              })" ${
              currentCallPage >= totalPages ? "disabled" : ""
            }>Next</button>
            `);
          }
        });
      },
      error: function (xhr) {
        console.error("Error loading calls:", xhr.responseText);
        $("#callTable tbody")
          .empty()
          .append(
            '<tr><td colspan="5" class="text-center">Error loading calls.</td></tr>'
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
    // Use new loadUnitsOnDuty if available (defined in EJS), otherwise fall back to old function
    if (typeof window.loadUnitsOnDuty === 'function') {
      window.loadUnitsOnDuty();
    }
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
                   
                    <button class="btn btn-md btn-outline-danger" onclick="deleteCallNote('${note._id}')"><i class="fa fa-trash"></i></button>
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

        // Show/hide button groups based on call status
        const isOpen = callData.call.status;
        $("#openCallButtons").toggle(isOpen);
        $("#closedCallButtons").toggle(!isOpen);

        // Reset edit mode state for closed calls
        if (!isOpen && isEditMode) {
          isEditMode = false;
          $("#titleCallDetail, #detailsCallDetail").prop("disabled", true);
          $("#editCallBtn").show();
          $("#saveCallBtn, #cancelEditBtn").hide();
          $("#departmentsSelect, #membersSelect").hide();
          $("#departmentsCallDetail, #assignedToCallDetail").show();
        }

        // Clean up any stray backdrops before showing modal
        $(".modal-backdrop").remove();
        $("body").removeClass("modal-open");
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
    // Show/hide action buttons based on edit mode
    $("#addNoteBtn, #closeCallBtn, #deleteCallBtnOpen").toggle(!isEditMode);
    $("#addNoteSection").hide();
    if (isEditMode) {
      // Initialize Select2
      $("#departmentsSelect")
        .select2({
          placeholder: "Select...",
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
        showToast("Call updated successfully.", "success");
        toggleEditMode();
        populateCallDetails($("#callIDDetail").val());
      },
      error: function (xhr) {
        console.error("Error updating call:", xhr.responseText);
        showToast("Failed to update call: " + (xhr.responseJSON?.message || "Unknown error"), "danger");
      },
    });
  }

  function confirmDeleteCall() {
    // Hide both modals properly
    $("#deleteCallModal").modal("hide");
    $("#callDetailModal").modal("hide");

    const callId = $("#callIDDetail").val();
    $.ajax({
      url: `${API_URL}/api/v1/call/${callId}`,
      method: "DELETE",
      success: function () {
        $(`#${callId}-row`).fadeOut(1, function () {
          $(this).remove();
        });
        loadAssignedCalls();
        showToast("Call deleted successfully.", "success");
      },
      error: function (xhr) {
        console.error("Error deleting call:", xhr.responseText);
        showToast("Failed to delete call: " + (xhr.responseJSON?.message || "Unknown error"), "error");
      },
    });
  }

  function confirmMarkAsCompleted() {
    // Hide both modals properly
    $("#markCompletedModal").modal("hide");
    $("#callDetailModal").modal("hide");

    const callId = $("#callIDDetail").val();
    const noteData = {
      note: `${dbUser.user.username} marked the call as completed.`,
      createdBy: "system",
      createdAt: new Date().toISOString(),
    };
    $.ajax({
      url: `${API_URL}/api/v1/call/${callId}`,
      method: "PUT",
      data: JSON.stringify({ status: false }),
      contentType: "application/json",
      success: function () {
        $.ajax({
          url: `${API_URL}/api/v1/call/${callId}/note`,
          method: "POST",
          data: JSON.stringify(noteData),
          contentType: "application/json",
          success: function () {
            loadAssignedCalls();
            showToast("Call marked as completed.", "success");
          },
          error: function (xhr) {
            console.error("Error adding note:", xhr.responseText);
            showToast("Failed to add completion note.", "warning");
          },
        });
      },
      error: function (xhr) {
        console.error("Error marking call as completed:", xhr.responseText);
        showToast("Failed to mark call as completed: " + (xhr.responseJSON?.message || "Unknown error"), "error");
      },
    });
  }

  function confirmReopenCall() {
    // Hide both modals properly
    $("#reopenCallModal").modal("hide");
    $("#callDetailModal").modal("hide");

    const callId = $("#callIDDetail").val();
    const noteData = {
      note: `${dbUser.user.username} reopened the call.`,
      createdBy: "system",
      createdAt: new Date().toISOString(),
    };
    $.ajax({
      url: `${API_URL}/api/v1/call/${callId}`,
      method: "PUT",
      data: JSON.stringify({ status: true }),
      contentType: "application/json",
      success: function () {
        $.ajax({
          url: `${API_URL}/api/v1/call/${callId}/note`,
          method: "POST",
          data: JSON.stringify(noteData),
          contentType: "application/json",
          success: function () {
            loadAssignedCalls();
            showToast("Call reopened successfully.", "success");
          },
          error: function (xhr) {
            console.error("Error adding note:", xhr.responseText);
            showToast("Failed to add reopen note.", "warning");
          },
        });
      },
      error: function (xhr) {
        console.error("Error reopening call:", xhr.responseText);
        showToast("Failed to reopen call: " + (xhr.responseJSON?.message || "Unknown error"), "error");
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

  function deleteCallNote(noteId) {
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

  // Initialize departments and members Select2 once on page load
  function initializeCallModalSelects() {
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
            placeholder: "Select...",
            width: "100%",
            dropdownParent: $("#callModal"),
            allowClear: true,
          });
      },
      error: function (xhr) {
        console.error("Error fetching departments:", xhr.responseText);
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
            placeholder: "Select...",
            width: "100%",
            dropdownParent: $("#callModal"),
            allowClear: true,
          });
      },
      error: function (xhr) {
        console.error("Error fetching members:", xhr.responseText);
      },
    });
  }

  // Initialize Select2 once on page load
  initializeCallModalSelects();

  // Function to safely open the create call modal
  function openCreateCallModal() {
    // Clear any stuck state
    $("#callModal").removeClass("show").css("display", "");
    $(".modal-backdrop").remove();
    $("body").removeClass("modal-open").css("padding-right", "");

    // Clear form
    $("#callTitle, #callDetails, #callNote").val("");
    $("#callDepartments, #callMembers").val(null).trigger("change");

    // Now show modal fresh
    $("#callModal").modal("show");
  }
  window.openCreateCallModal = openCreateCallModal;

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
      showToast("Title is required.", "warning");
      return false;
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
      success: function (response) {
        // Close modal by clicking the dismiss button (same as user clicking X)
        $("#callModal [data-dismiss='modal']").first().click();

        // Force cleanup extra backdrops after animation
        setTimeout(function() {
          var visibleModals = $(".modal.show").length || $(".modal:visible").length;
          var backdrops = $(".modal-backdrop").length;

          if (visibleModals === 0) {
            // No modals open - remove all backdrops
            $(".modal-backdrop").remove();
            $("body").removeClass("modal-open").css("padding-right", "");
          } else if (backdrops > visibleModals) {
            // More backdrops than modals - remove extras
            $(".modal-backdrop").slice(visibleModals).remove();
          }
        }, 400);

        // Show success toast
        showToast("Call created successfully.", "success");

        // Reload the calls table
        loadAssignedCalls();
      },
      error: function (xhr) {
        console.error("Error creating call:", xhr.responseText);
        showToast(
          "Failed to create call: " +
            (xhr.responseJSON?.message || "Unknown error"),
          "error"
        );
      },
    });

    return false;
  }

  // Legacy function - now handled by loadUnitsOnDuty in EJS
  // This stub prevents errors if called from elsewhere
  function populateOfficerListTable() {
    if (typeof window.loadUnitsOnDuty === 'function') {
      window.loadUnitsOnDuty();
    }
  }

  // Legacy function - pagination now handled in EJS
  function changeUnitPage(page) {
    // No longer used - pagination handled in EJS
  }

  // User notepad functionality is now provided by the shared notepad.js module

  // Helper function to check if ID is a valid MongoDB ObjectId
  function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // User notepad functions are now provided by the shared notepad.js module

  // Initialize dashboard data
  pollDashboardData();
  setInterval(pollDashboardData, 30000); // Poll every 30 seconds

  // Initialize notepad functionality from shared module
  if (typeof initNotepad === 'function') {
    initNotepad();
  }

  window.showBoloModal = showBoloModal;
  window.handleCreateBolo = handleCreateBolo;
  window.clearBoloForm = clearBoloForm;
  window.pollDashboardData = pollDashboardData;
  window.changeBoloPage = changeBoloPage;
  window.handleUpdateBolo = handleUpdateBolo;
  window.handleDeleteBolo = handleDeleteBolo;
  window.populateBoloDetails = populateBoloDetails;
  window.changeCallPage = changeCallPage;
  window.setCallFilter = setCallFilter;
  window.populateCallDetails = populateCallDetails;
  window.toggleEditMode = toggleEditMode;
  window.openDepartmentModal = openDepartmentModal;
  window.openMemberModal = openMemberModal;
  window.saveChanges = saveChanges;
  window.confirmDeleteCall = confirmDeleteCall;
  window.confirmMarkAsCompleted = confirmMarkAsCompleted;
  window.confirmReopenCall = confirmReopenCall;
  window.showMarkCompletedModal = showMarkCompletedModal;
  window.showReopenCallModal = showReopenCallModal;
  window.showDeleteCallModal = showDeleteCallModal;
  window.showToast = showToast;
  window.removeToast = removeToast;
  window.toggleAddNote = toggleAddNote;
  window.addNote = addNote;
  window.openEditNoteModal = openEditNoteModal;
  window.saveEditedNote = saveEditedNote;
  window.deleteCallNote = deleteCallNote;
  window.createCall = createCall;
  window.changeUnitPage = changeUnitPage;
  // Notepad functions are now provided by the shared notepad.js module
});
