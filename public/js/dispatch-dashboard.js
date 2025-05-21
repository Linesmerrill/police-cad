$(document).ready(function () {
  fetchAndRenderDepartments(); // Fetch and render departments on page load

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

  // OLD STUFF
  $("#arrestModal").on("hidden.bs.modal", function () {
    $("#civIDArrest").popover("hide");
  });

  window.showBoloModal = showBoloModal;
  window.handleCreateBolo = handleCreateBolo;
  window.clearBoloForm = clearBoloForm;
});
