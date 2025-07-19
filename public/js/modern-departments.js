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
      
      if (departments.length === 0) {
        renderModernDepartmentsEmpty();
        return;
      }
      
      let html = "";
      let civilianDepartmentName = null;

      departments.forEach((dept) => {
        const template = dept?.template?.name;
        const name = dept?.name;
        const departmentId = dept?._id;

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
      console.error("❌ Error fetching departments:", xhr.responseText);
      console.error("Status:", xhr.status);
      console.error("StatusText:", xhr.statusText);
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