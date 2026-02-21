// modern-departments.js
// HeroUI Pro styled departments functionality for the new dashboard

// Encode community ID for URL (base64 with URL-safe characters)
function encodeCommunityIdForUrl(communityId) {
  const base64 = btoa(communityId);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fetchAndRenderModernDepartments() {
  const communityId = dbUser?.user?.lastAccessedCommunity?.communityID || dbUser?.user?.activeCommunity;
  const userId = dbUser?._id;

  if (!communityId) {
    console.warn('No active community found for departments');
    renderModernDepartmentsFallback();
    return;
  }

  // Use v2 endpoint with userId to get accessStatus per department
  const apiUrl = userId
    ? `${API_URL}/api/v2/community/${communityId}/departments?userId=${userId}&page=1&limit=50`
    : `${API_URL}/api/v1/community/${communityId}/departments`;

  $.ajax({
    url: apiUrl,
    method: "GET",
    headers: {},
    success: function (data) {
      // v2 returns { data: [...] }, v1 returns { departments: [...] }
      const departments = data.data || data.departments || [];

      if (departments.length === 0) {
        renderModernDepartmentsEmpty();
        return;
      }

      let html = "";
      let civilianDepartmentName = null;

      departments.forEach((dept) => {
        // v2 returns templateName as string, v1 returns template.name as object
        const template = dept?.templateName || dept?.template?.name;
        const name = dept?.name;
        const departmentId = dept?._id;
        const accessStatus = dept?.accessStatus || 'approved';
        const canAccess = accessStatus === 'approved';
        const isPending = accessStatus === 'pending';

        // Skip if departmentId or template is invalid
        if (!departmentId || departmentId === "undefined" || !template) {
          return;
        }

        // Store civilian department name for header update
        if (template.toLowerCase() === "civilian") {
          civilianDepartmentName = name;
        }

        let icon = "fa-building";
        let action = "#";

        // Build query params for department (include community ID for proper context)
        const encodedDeptId = encodeDepartmentId(departmentId);
        const encodedCommunityId = encodeCommunityIdForUrl(communityId);
        const deptQueryParams = `?dept=${encodeURIComponent(name)}&d=${encodedDeptId}&c=${encodedCommunityId}`;

        // Map icons and routes
        switch (template.toLowerCase()) {
          case "civilian":
            icon = "fa-user";
            action = `/civ-dashboard${deptQueryParams}`;
            break;
          case "police":
            icon = "fa-shield";
            action = `/police-dashboard${deptQueryParams}`;
            break;
          case "dispatch":
            icon = "fa-headset";
            action = `/dispatch-dashboard${deptQueryParams}`;
            break;
          case "fire":
            icon = "fa-fire-extinguisher";
            action = `/ems-dashboard${deptQueryParams}`;
            break;
          case "ems":
            icon = "fa-medkit";
            action = `/ems-dashboard${deptQueryParams}`;
            break;
          case "judicial":
            icon = "fa-gavel";
            action = `/department-dashboard${deptQueryParams}`;
            break;
        }

        if (canAccess) {
          html += `
            <div class="nav-item">
              <a href="${escapeHtml(action)}" class="nav-link">
                <i class="fa ${escapeHtml(icon)} nav-icon"></i>
                <span class="nav-text" style="display:flex; flex-direction:column; line-height:1.3;">
                  <span>${escapeHtml(name)}</span>
                  <span style="font-size:0.75rem; opacity:0.5;">${escapeHtml(template)}</span>
                </span>
              </a>
            </div>
          `;
        } else {
          // Locked or pending — show lock icon, clickable to open access modal
          html += `
            <div class="nav-item">
              <a href="#" class="nav-link" style="opacity:0.55;" onclick="event.preventDefault(); showDeptAccessModal('${escapeHtml(name)}', '${isPending ? 'pending' : 'locked'}');">
                <i class="fa fa-lock nav-icon" style="color:#64748b;"></i>
                <span class="nav-text" style="display:flex; flex-direction:column; line-height:1.3;">
                  <span>${escapeHtml(name)}</span>
                  <span style="font-size:0.75rem; opacity:0.5;">${escapeHtml(template)}</span>
                </span>
              </a>
            </div>
          `;
        }
      });

      // Update the departments submenu
      $("#departmentsSubmenu").html(html);

      // Enable tooltips for locked departments
      $("[title]").tooltip();

      // Update dashboard title if we're on the civilian dashboard
      if (window.location.pathname === '/civ-dashboard') {
        // Check if there's a specific department in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlDeptName = urlParams.get('dept');
        const encodedDeptId = urlParams.get('d');

        if (urlDeptName) {
          // Use the department name from URL (for specific department selection)
          updateDashboardTitle(decodeURIComponent(urlDeptName));

          // Store the decoded department ID for potential future use
          if (encodedDeptId) {
            const decodedDeptId = decodeDepartmentId(encodedDeptId);
            if (decodedDeptId) {
              window.currentDepartmentId = decodedDeptId;
            }
          }
        } else if (civilianDepartmentName) {
          // Only update if the title is still the default "Civilian Dashboard"
          const currentTitle = document.getElementById('main-dashboard-title');
          if (currentTitle && currentTitle.textContent === 'Civilian Dashboard') {
            updateDashboardTitle(civilianDepartmentName);
          }
        }
      }
    },
    error: function (xhr) {
      console.error("Error fetching departments:", xhr.responseText);
      renderModernDepartmentsFallback();
    },
  });
}

function renderModernDepartmentsEmpty() {
  const emptyHtml = `
    <div class="nav-item">
      <div class="nav-link" style="opacity: 0.7; cursor: default;">
        <i class="fa fa-info-circle nav-icon"></i>
        <span class="nav-text">No departments found</span>
      </div>
    </div>
    <div class="nav-item">
      <a href="/community-dashboard" class="nav-link" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
        <i class="fa fa-plus nav-icon"></i>
        <span class="nav-text">Create Department</span>
      </a>
    </div>
  `;
  $("#departmentsSubmenu").html(emptyHtml);
}

function renderModernDepartmentsFallback() {
  const fallbackHtml = `
    <div class="nav-item">
      <div class="nav-link" style="opacity: 0.7; cursor: default;">
        <i class="fa fa-exclamation-triangle nav-icon"></i>
        <span class="nav-text">Unable to load departments</span>
      </div>
    </div>
    <div class="nav-item">
      <a href="/community-dashboard" class="nav-link" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
        <i class="fa fa-cog nav-icon"></i>
        <span class="nav-text">Manage Communities</span>
      </a>
    </div>
  `;
  $("#departmentsSubmenu").html(fallbackHtml);
} 

function encodeDepartmentId(departmentId) {
  // Simple reversible encoding: convert to base64 and replace some characters
  const base64 = btoa(departmentId);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function decodeDepartmentId(encodedId) {
  // Reverse the encoding: restore base64 padding and decode
  let base64 = encodedId
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding back
  while (base64.length % 4) {
    base64 += '=';
  }
  
  try {
    return atob(base64);
  } catch (e) {
    console.error('Failed to decode department ID:', e);
    return null;
  }
}

function updateDashboardTitle(departmentName) {
  
  // Update mobile header title
  const mobileTitle = document.getElementById('dashboard-title');
  if (mobileTitle) {
    mobileTitle.textContent = departmentName;
  }
  
  // Update main header title
  const mainTitle = document.getElementById('main-dashboard-title');
  if (mainTitle) {
    mainTitle.textContent = departmentName;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Department access modal
function showDeptAccessModal(deptName, status) {
  var modal = document.getElementById('deptAccessModal');
  if (!modal) {
    // Create modal on first use
    var communityId = dbUser?.user?.lastAccessedCommunity?.communityID || dbUser?.user?.activeCommunity;
    var communityLink = communityId ? '/community/' + encodeCommunityIdForUrl(communityId) : '/community-dashboard';
    var div = document.createElement('div');
    div.innerHTML = `
      <div id="deptAccessModal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); align-items:center; justify-content:center;">
        <div style="background:#1e2028; border-radius:16px; padding:2rem; max-width:400px; width:90%; position:relative; border:1px solid #35385a;">
          <button onclick="closeDeptAccessModal()" aria-label="Close" style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:#fff; font-size:1.3rem; cursor:pointer; opacity:0.7;"><i class="fa fa-times"></i></button>
          <div style="text-align:center; margin-bottom:1.5rem;">
            <i class="fa fa-lock" style="font-size:2.5rem; color:#64748b; margin-bottom:0.75rem;"></i>
            <h3 id="deptAccessModalTitle" style="color:#fff; margin:0; font-size:1.2rem; font-weight:600;"></h3>
          </div>
          <p id="deptAccessModalMsg" style="color:#a0aec0; font-size:0.9rem; line-height:1.6; text-align:center; margin:0 0 1.5rem 0;"></p>
          <div style="display:flex; gap:0.75rem; justify-content:center;">
            <button onclick="closeDeptAccessModal()" style="background:#374151; color:#fff; border:none; padding:0.6rem 1.2rem; border-radius:8px; font-weight:500; cursor:pointer;">Close</button>
            <a href="${communityLink}" style="background:#3b82f6; color:#fff; border:none; padding:0.6rem 1.2rem; border-radius:8px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-block;">Go to Community</a>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modal = document.getElementById('deptAccessModal');
  }

  var title = document.getElementById('deptAccessModalTitle');
  var msg = document.getElementById('deptAccessModalMsg');

  if (status === 'pending') {
    title.textContent = deptName;
    msg.textContent = 'Your request to join this department is pending approval. You can check the status on the community page.';
  } else {
    title.textContent = deptName;
    msg.textContent = 'You don\'t have access to this department. Visit the community page to request to join.';
  }
  modal.style.display = 'flex';
}

function closeDeptAccessModal() {
  var modal = document.getElementById('deptAccessModal');
  if (modal) modal.style.display = 'none';
}

// Initialize departments when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for other scripts to load
  setTimeout(function() {
    if (typeof fetchAndRenderModernDepartments === 'function') {
      fetchAndRenderModernDepartments();
    } else {
      console.error('fetchAndRenderModernDepartments function not found!');
    }
  }, 500);
});