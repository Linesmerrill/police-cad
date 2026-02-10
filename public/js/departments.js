// static/js/departments.js

// Show modal when user clicks lock icon on a department they don't have access to
function showDepartmentAccessModal(departmentName, communityId) {
  const communityUrl = `/community/${communityId}`;

  // Create modal if it doesn't exist
  if ($('#departmentAccessModal').length === 0) {
    $('body').append(`
      <div class="modal fade" id="departmentAccessModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content" style="background-color: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);">
            <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h5 class="modal-title text-white"><i class="fa fa-lock mr-2"></i>Access Restricted</h5>
              <button type="button" class="close text-white" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body text-center py-4">
              <div class="mb-3">
                <i class="fa fa-lock fa-3x text-warning"></i>
              </div>
              <p class="text-white mb-2">You don't have access to the <strong id="deptAccessName"></strong> department.</p>
              <p class="text-muted">You can request to join from the community details page.</p>
            </div>
            <div class="modal-footer" style="border-top: 1px solid rgba(255,255,255,0.1);">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
              <a id="deptAccessLink" href="#" class="btn btn-primary"><i class="fa fa-external-link-alt mr-2"></i>Go to Community</a>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  // Update modal content
  $('#deptAccessName').text(departmentName);
  $('#deptAccessLink').attr('href', communityUrl);

  // Show modal
  $('#departmentAccessModal').modal('show');
}

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

        html += `
          <li>
            ${
              isDisabled
                ? `
              <div style="display: flex; align-items: center; padding: 10px 0;">
                <span style="display: flex; align-items: center; flex: 1; min-width: 0; opacity: 0.5; cursor: not-allowed;">
                  <span class="fa ${icon} ml-3 mr-3" style="flex-shrink: 0;"></span>
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name} (${template})</span>
                </span>
                <span class="fa fa-lock mr-3" style="cursor: pointer; color: #fbbf24; flex-shrink: 0; padding: 4px 8px;"
                  onclick="showDepartmentAccessModal('${name.replace(/'/g, "\\'")}', '${communityId}')"
                  title="Click for more info"></span>
              </div>
            `
                : useForm
                ? `
              <form action="${action}" method="POST" style="display: inline;">
                <input type="hidden" name="departmentId" value="${departmentId}">
                <input type="hidden" name="redirect" value="${redirect}">
                <a href="#" onclick="this.parentNode.submit()">
                  <span class="fa ${icon} ml-3 mr-3"></span> ${name} (${template})
                </a>
              </form>
            `
                : `
              <a href="${action}">
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
