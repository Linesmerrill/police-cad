// static/js/departments.js

// Encode community ID for URL (base64 with URL-safe characters)
function encodeCommunityIdForUrl(communityId) {
  const base64 = btoa(communityId);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Show modal when user clicks lock/clock icon on a department they don't have access to
function showDepartmentAccessModal(departmentName, communityId, isPending) {
  const encodedId = encodeCommunityIdForUrl(communityId);
  const communityUrl = `/community/${encodedId}#departments-section`;

  // Create modal if it doesn't exist
  if ($('#departmentAccessModal').length === 0) {
    $('body').append(`
      <div class="modal fade" id="departmentAccessModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content" style="background-color: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);">
            <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h5 class="modal-title text-white"><i id="deptAccessIcon" class="fa fa-lock mr-2"></i><span id="deptAccessTitle">Access Restricted</span></h5>
              <button type="button" class="close text-white" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body text-center py-4">
              <div class="mb-3">
                <i id="deptAccessBodyIcon" class="fa fa-lock fa-3x text-warning"></i>
              </div>
              <p class="text-white mb-2" id="deptAccessMessage">You don't have access to the <strong id="deptAccessName"></strong> department.</p>
              <p class="text-muted" id="deptAccessSubtext">You can request to join from the community details page.</p>
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

  // Update modal content based on pending status
  $('#deptAccessName').text(departmentName);
  $('#deptAccessLink').attr('href', communityUrl);

  if (isPending) {
    $('#deptAccessIcon').removeClass('fa-lock').addClass('fa-clock');
    $('#deptAccessBodyIcon').removeClass('fa-lock text-warning').addClass('fa-clock text-info');
    $('#deptAccessTitle').text('Request Pending');
    $('#deptAccessMessage').html(`Your request to join the <strong>${departmentName}</strong> department is pending approval.`);
    $('#deptAccessSubtext').text('An administrator will review your request soon.');
  } else {
    $('#deptAccessIcon').removeClass('fa-clock').addClass('fa-lock');
    $('#deptAccessBodyIcon').removeClass('fa-clock text-info').addClass('fa-lock text-warning');
    $('#deptAccessTitle').text('Access Restricted');
    $('#deptAccessMessage').html(`You don't have access to the <strong>${departmentName}</strong> department.`);
    $('#deptAccessSubtext').text('You can request to join from the community details page.');
  }

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

        // Check if current user is an approved member of this department
        const members = Array.isArray(dept.members) ? dept.members : [];
        const userMembership = members.find(
          (member) => (member.userID || member._id) === currentUserId
        );
        const isApprovedMember = userMembership && userMembership.status === 'approved';
        const isPendingMember = userMembership && userMembership.status === 'pending';

        // User can access if: department is public OR user is approved member
        const isPublicDepartment = dept.approvalRequired === false;
        const canAccess = isPublicDepartment || isApprovedMember;

        let icon = "fa-building";
        let action = "#";
        let redirect = "";
        const useForm = ["police", "fire", "ems", "dispatch"].includes(
          template.toLowerCase()
        );
        const isDisabled = !canAccess;

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

        // Badge color based on template type
        let badgeColor = '#6b7280'; // default gray
        switch (template.toLowerCase()) {
          case 'police': badgeColor = '#3b82f6'; break; // blue
          case 'dispatch': badgeColor = '#8b5cf6'; break; // purple
          case 'fire': badgeColor = '#f97316'; break; // orange
          case 'ems': badgeColor = '#22c55e'; break; // green
          case 'civilian': badgeColor = '#6b7280'; break; // gray
        }

        // Icon and color for lock/pending status
        const statusIcon = isPendingMember ? 'fa-clock' : 'fa-lock';
        const statusColor = isPendingMember ? '#3b82f6' : '#fbbf24'; // blue for pending, yellow for locked
        const statusTitle = isPendingMember ? 'Request pending' : 'Click for more info';

        html += `
          <li>
            ${
              isDisabled
                ? `
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <span class="fa ${icon} ml-3 mr-3" style="flex-shrink: 0; opacity: 0.5; font-size: 1.2em;"></span>
                <div style="flex: 1; min-width: 0; opacity: 0.5; cursor: not-allowed;">
                  <div style="display: flex; align-items: center;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${name}</span>
                  </div>
                  <span style="display: inline-block; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; background: ${badgeColor}; color: white; margin-top: 2px;">${template}</span>
                </div>
                <span class="fa ${statusIcon} mr-3" style="cursor: pointer; color: ${statusColor}; flex-shrink: 0; padding: 4px 8px; opacity: 1;"
                  onclick="showDepartmentAccessModal('${name.replace(/'/g, "\\'")}', '${communityId}', ${isPendingMember})"
                  title="${statusTitle}"></span>
              </div>
            `
                : useForm
                ? `
              <form action="${action}" method="POST" style="display: inline; width: 100%;">
                <input type="hidden" name="departmentId" value="${departmentId}">
                <input type="hidden" name="redirect" value="${redirect}">
                <a href="#" onclick="this.parentNode.submit()" style="display: flex; align-items: center; padding: 8px 0;">
                  <span class="fa ${icon} ml-3 mr-3" style="flex-shrink: 0; font-size: 1.2em;"></span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</div>
                    <span style="display: inline-block; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; background: ${badgeColor}; color: white; margin-top: 2px;">${template}</span>
                  </div>
                </a>
              </form>
            `
                : `
              <a href="${action}" style="display: flex; align-items: center; padding: 8px 0;">
                <span class="fa ${icon} ml-3 mr-3" style="flex-shrink: 0; font-size: 1.2em;"></span>
                <div style="flex: 1; min-width: 0;">
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</div>
                  <span style="display: inline-block; font-size: 0.7em; padding: 2px 6px; border-radius: 3px; background: ${badgeColor}; color: white; margin-top: 2px;">${template}</span>
                </div>
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
