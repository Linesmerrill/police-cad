// modern-departments.js
// HeroUI Pro styled departments functionality for the new dashboard

function fetchAndRenderModernDepartments() {
  const communityId = dbUser?.user?.lastAccessedCommunity?.communityID || dbUser?.user?.activeCommunity;
  
  if (!communityId) {
    console.warn('No active community found for departments');
    renderModernDepartmentsFallback();
    return;
  }

  $.ajax({
    url: `${API_URL}/api/v1/community/${communityId}/departments`,
    method: "GET",
    headers: {},
    success: function (data) {
      const departments = data.departments || [];
      let html = "";

      departments.forEach((dept) => {
        const template = dept?.template?.name;
        const name = dept?.name;
        const departmentId = dept?._id;

        // Skip if departmentId or template is invalid
        if (!departmentId || departmentId === "undefined" || !template) {
          console.warn(
            `Skipping department due to missing or invalid data - ID: ${departmentId}, Template: ${template}`
          );
          return;
        }

        let icon = "fa-building";
        let action = "#";
        let redirect = "";
        const useForm = ["police", "fire", "ems", "dispatch"].includes(
          template.toLowerCase()
        );
        const isDisabled = ["fire", "ems"].includes(template.toLowerCase());

        // Map icons and routes
        switch (template.toLowerCase()) {
          case "civilian":
            icon = "fa-user";
            action = "/civ-dashboard";
            break;
          case "police":
            icon = "fa-shield";
            action = "/select-department";
            redirect = "/police-dashboard";
            break;
          case "dispatch":
            icon = "fa-headset";
            action = "/select-department";
            redirect = "/dispatch-dashboard";
            break;
          case "fire":
            icon = "fa-fire-extinguisher";
            action = "#"; // Disabled, no action
            redirect = "";
            break;
          case "ems":
            icon = "fa-medkit";
            action = "#"; // Disabled, no action
            redirect = "";
            break;
        }

        // Create HeroUI Pro styled department link
        if (useForm) {
          html += `
            <div class="nav-item">
              <form action="${escapeHtml(action)}" method="POST" style="display: inline; width: 100%;">
                <input type="hidden" name="departmentId" value="${escapeHtml(departmentId)}">
                <input type="hidden" name="redirect" value="${escapeHtml(redirect)}">
                <a href="#" class="nav-link" ${
                  isDisabled
                    ? 'style="opacity: 0.5; cursor: not-allowed;" title="This department is not yet available"'
                    : 'onclick="this.parentNode.submit()"'
                }>
                  <i class="fa ${escapeHtml(icon)} nav-icon"></i>
                  <span class="nav-text">${escapeHtml(name)} (${escapeHtml(template)})</span>
                </a>
              </form>
            </div>
          `;
        } else {
          html += `
            <div class="nav-item">
              <a href="${escapeHtml(action)}" class="nav-link" ${
                isDisabled
                  ? 'style="opacity: 0.5; cursor: not-allowed;" title="This department is not yet available"'
                  : ""
              }>
                <i class="fa ${escapeHtml(icon)} nav-icon"></i>
                <span class="nav-text">${escapeHtml(name)} (${escapeHtml(template)})</span>
              </a>
            </div>
          `;
        }
      });

      // Update the departments submenu
      $("#departmentsSubmenu").html(html);
      
      // Enable tooltips for disabled departments
      $("[title]").tooltip();
    },
    error: function (xhr) {
      console.error("Error fetching departments:", xhr.responseText);
      renderModernDepartmentsFallback();
    },
  });
}

function renderModernDepartmentsFallback() {
  const fallbackHtml = `
    <div class="nav-item">
      <a href="/community-dashboard" class="nav-link">
        <i class="fa fa-users nav-icon"></i>
        <span class="nav-text">Communities</span>
      </a>
    </div>
  `;
  $("#departmentsSubmenu").html(fallbackHtml);
} 

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
} 