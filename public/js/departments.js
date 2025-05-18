// static/js/departments.js
function fetchAndRenderDepartments() {
  const communityId = dbUser.user.lastAccessedCommunity.communityID;
  $.ajax({
    url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/community/${communityId}/departments`,
    method: "GET",
    headers: {},
    success: function (data) {
      const departments = data.departments || [];
      let html = "";

      // Debug departments data
      console.log("Departments:", JSON.stringify(departments));

      departments.forEach((dept) => {
        console.log("Fetch departments", dept);
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
        const isDisabled = ["dispatch", "fire", "ems"].includes(
          template.toLowerCase()
        );

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
            action = "#"; // Disabled, no action
            redirect = "";
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

        html += `
          <li>
            ${
              useForm
                ? `
              <form action="${action}" method="POST" style="display: inline;">
                <input type="hidden" name="departmentId" value="${departmentId}">
                <input type="hidden" name="redirect" value="${redirect}">
                <a href="#" ${
                  isDisabled
                    ? 'class="disabled-department" title="This department is not yet available"'
                    : ""
                } ${isDisabled ? "" : 'onclick="this.parentNode.submit()"'}>
                  <span class="fa ${icon} ml-3 mr-3"></span> ${name} (${template})
                </a>
              </form>
            `
                : `
              <a href="${action}" ${
                    isDisabled
                      ? 'class="disabled-department" title="This department is not yet available"'
                      : ""
                  }>
                <span class="fa ${icon} ml-3 mr-3"></span> ${name} (${template})
              </a>
            `
            }
          </li>
        `;
      });

      // Append Communities link
      html += `
        <li>
          <a href="/community-dashboard">
            <span class="fa fa-users ml-3 mr-3"></span> Communities
          </a>
        </li>
      `;

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
