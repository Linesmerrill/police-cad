// static/js/departments.js
function fetchAndRenderDepartments() {
  const communityId = dbUser.user.lastAccessedCommunity.communityID;
  const currentUserId = dbUser._id;
  $.ajax({
    url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/community/${communityId}/departments`,
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

        // Check if current user is a member of this department
        const isMember = Array.isArray(dept.members) && dept.members.some(
          (member) => (member.userID || member._id) === currentUserId
        );

        let icon = "fa-building";
        let action = "#";
        let redirect = "";
        const useForm = ["police", "fire", "ems", "dispatch"].includes(
          template.toLowerCase()
        );
        const isDisabled = !isMember;

        // Map icons and routes
        switch (template.toLowerCase()) {
          case "civilian":
            icon = "fa-user";
            action = "/civ-dashboard";
            // Add department name as query parameter for civilian departments
            if (action !== "#") {
              const encodedDeptId = encodeDepartmentId(departmentId);
              action += `?dept=${encodeURIComponent(name)}&d=${encodedDeptId}`;
            }
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
            action = "/select-department";
            redirect = "/ems-dashboard";
            break;
          case "ems":
            icon = "fa-medkit";
            action = "/select-department";
            redirect = "/ems-dashboard";
            break;
        }

        const disabledAttr = isDisabled
          ? 'class="disabled-department" title="You are not a member of this department"'
          : "";

        html += `
          <li>
            ${
              useForm
                ? `
              <form action="${action}" method="POST" style="display: inline;">
                <input type="hidden" name="departmentId" value="${departmentId}">
                <input type="hidden" name="redirect" value="${redirect}">
                <a href="#" ${disabledAttr} ${isDisabled ? "" : 'onclick="this.parentNode.submit()"'}>
                  <span class="fa ${icon} ml-3 mr-3"></span> ${name} (${template})
                </a>
              </form>
            `
                : `
              <a href="${action}" ${disabledAttr}>
                <span class="fa ${icon} ml-3 mr-3"></span> ${name} (${template})
              </a>
            `
            }
          </li>
        `;
      });

      // Append Communities link
      // html += `
      //   <li>
      //     <a href="/community-dashboard">
      //       <span class="fa fa-users ml-3 mr-3"></span> Communities
      //     </a>
      //   </li>
      // `;

      $("#toggleDepartment").html(html);
      // Enable tooltips for disabled departments
      $("[title]").tooltip();
    },
    error: function (xhr) {
      console.error("Error fetching departments:", xhr.responseText);
      // Fallback: show only Communities link
      $("#toggleDepartment").html(`
        <li>
          <a href="/community-dashboard">
            <span class="fa fa-users ml-3 mr-3"></span> Communities
          </a>
        </li>
      `);
      alert(
        "Failed to load departments: " +
          (xhr.responseJSON?.message || "Unknown error")
      );
    },
  });
}

// Encode department ID for URL parameters
function encodeDepartmentId(departmentId) {
  // Simple reversible encoding: convert to base64 and replace some characters
  const base64 = btoa(departmentId);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
