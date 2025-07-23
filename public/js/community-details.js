// community-details.js
// Handles Create Event button permissions and modal logic for community details page

// Usage: Call setupCreateEventButton(userId, roles) after DOM is ready

function userCanManageEvents(userId, roles) {
  if (!userId || !Array.isArray(roles)) return false;
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    if (Array.isArray(role.members) && role.members.includes(userId)) {
      if (Array.isArray(role.permissions)) {
        for (let j = 0; j < role.permissions.length; j++) {
          const perm = role.permissions[j];
          if (
            (perm.name === "administrator" && perm.enabled === true) ||
            (perm.name === "manage community events" && perm.enabled === true)
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function setupCreateEventButton(userId, roles) {
  const btn = document.getElementById('createEventBtn');
  const noPermBtn = document.getElementById('noEventPermissionBtn');
  if (userCanManageEvents(userId, roles)) {
    if (btn) btn.style.display = '';
    if (noPermBtn) noPermBtn.style.display = 'none';
  } else {
    if (btn) btn.style.display = 'none';
    if (noPermBtn) noPermBtn.style.display = '';
  }
}

window.openCreateEventModal = function() {
  // TODO: Implement create event modal
  alert('Create Event modal will be implemented next');
};
window.openNoEventPermissionModal = function() {
  document.getElementById('noEventPermissionModal').style.display = 'flex';
};

window.openRequestDepartmentAccessModal = function(deptId, deptName) {
  var modal = document.getElementById('requestDepartmentAccessModal');
  var title = document.getElementById('requestDepartmentAccessModalTitle');
  if (title) title.textContent = 'Request Access to ' + deptName;
  if (modal) modal.style.display = 'flex';
};

window.openEditDepartmentModal = function(deptId) {
  var modal = document.getElementById('editDepartmentModal');
  var title = document.getElementById('editDepartmentModalTitle');
  if (title) title.textContent = 'Edit Department'; // Optionally append deptId or fetch dept name
  if (modal) modal.style.display = 'flex';
};

document.addEventListener('DOMContentLoaded', function() {
  var closeBtn = document.getElementById('requestDepartmentAccessModalClose');
  var cancelBtn = document.getElementById('requestDepartmentAccessModalCancel');
  var modal = document.getElementById('requestDepartmentAccessModal');
  if (closeBtn) closeBtn.onclick = function() { if (modal) modal.style.display = 'none'; };
  if (cancelBtn) cancelBtn.onclick = function() { if (modal) modal.style.display = 'none'; };
});

document.addEventListener('DOMContentLoaded', function() {
  var closeBtn = document.getElementById('editDepartmentModalClose');
  var cancelBtn = document.getElementById('editDepartmentModalCancel');
  var modal = document.getElementById('editDepartmentModal');
  if (closeBtn) closeBtn.onclick = function() { if (modal) modal.style.display = 'none'; };
  if (cancelBtn) cancelBtn.onclick = function() { if (modal) modal.style.display = 'none'; };
});

// --- Department Pagination (AJAX) ---
document.addEventListener('DOMContentLoaded', function() {
  const deptSection = document.querySelector('.card h2.text-xl.font-semibold')?.closest('.card');
  if (!deptSection) return;
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.pathname.split('/').pop();
  function updateDepartments(page) {
    const reqUrl = `/community/${hash}?deptPage=${page}`;
    fetch(reqUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(res => res.text())
      .then(html => {
        // Parse the returned HTML and extract the departments card
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newCard = temp.querySelector('.card h2.text-xl.font-semibold')?.closest('.card');
        if (newCard && deptSection.parentNode) {
          deptSection.parentNode.replaceChild(newCard, deptSection);
          attachPaginationHandlers();
        }
      });
  }
  function attachPaginationHandlers() {
    const prevBtn = deptSection.querySelector('form[action] button[type="submit"], form button[type="submit"]:first-of-type');
    const nextBtn = deptSection.querySelector('form[action] ~ form button[type="submit"], form + form button[type="submit"]');
    const prevForm = deptSection.querySelector('form');
    const nextForm = deptSection.querySelectorAll('form')[1];
    if (prevForm) {
      prevForm.onsubmit = function(e) {
        e.preventDefault();
        const page = parseInt(prevForm.querySelector('input[name="deptPage"]').value, 10);
        if (page >= 1) updateDepartments(page);
      };
    }
    if (nextForm) {
      nextForm.onsubmit = function(e) {
        e.preventDefault();
        const page = parseInt(nextForm.querySelector('input[name="deptPage"]').value, 10);
        updateDepartments(page);
      };
    }
  }
  attachPaginationHandlers();
});

console.log('DEBUG departmentsData length:', window.departmentsData ? window.departmentsData.length : 'undefined');
if (window.departmentsData && window.departmentsData.length > 0) {
  console.log('DEBUG departmentsData sample:', window.departmentsData[0]);
  console.log('DEBUG departmentsData IDs:', window.departmentsData.map(d => d._id));
}
console.log('DEBUG allDepartments:', window.allDepartments ? window.allDepartments.length : 'undefined');
console.log('DEBUG currentUserId:', window.currentUserId);
console.log('DEBUG canManageDepartmentsFlag:', window.canManageDepartmentsFlag);

// --- Department Client-side Pagination ---
function renderDepartmentsPage(page) {
  console.log('DEBUG renderDepartmentsPage called, page:', page);
  var departments = window.allDepartments || [];
  console.log('DEBUG departments to render:', departments.length, departments);
  var userId = window.currentUserId;
  var canManageDepartments = window.canManageDepartments;
  var perPage = 6;
  var totalPages = Math.max(1, Math.ceil(departments.length / perPage));
  page = Math.max(1, Math.min(page, totalPages));
  window.currentDepartmentsPage = page;
  var start = (page - 1) * perPage;
  var end = start + perPage;
  var pageDepartments = departments.slice(start, end);
  var grid = document.getElementById('departments-grid');
  var controls = document.getElementById('departments-pagination-controls');
  if (!grid || !controls) return;
  grid.innerHTML = '';
  pageDepartments.forEach(function(dept) {
    var templateName = dept.template && dept.template.name ? dept.template.name.replace(/'/g, "\\'") : '';
    var isPublic = dept.approvalRequired === false;
    var isMember = Array.isArray(dept.members) && dept.members.some(function(m) { return m.userID === userId && m.status === 'approved'; });
    var canAccess = canManageDepartments || isPublic || isMember;
    var safeTemplateName = templateName.replace(/'/g, "\\'");
    var safeDeptName = dept.name ? dept.name.replace(/'/g, "\\'") : '';
    var card = document.createElement('div');
    card.className = 'relative ' + (canAccess ? '' : 'opacity-70 cursor-not-allowed');
    if (canAccess) {
      card.onclick = function() { navigateToDepartment(dept._id, safeTemplateName); };
    }
    // Pencil icon
    if (canManageDepartments) {
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'absolute top-2 right-2 z-20 bg-gray-700 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow focus:outline-none';
      editBtn.title = 'Edit Department';
      editBtn.innerHTML = '<i class="fa fa-pencil-alt"></i>';
      editBtn.onclick = function(e) { e.stopPropagation(); openEditDepartmentModal(dept._id); };
      card.appendChild(editBtn);
    }
    var inner = document.createElement('div');
    inner.className = 'block bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-4 border border-gray-700 hover:border-blue-500 ' + (canAccess ? 'cursor-pointer' : '') + ' min-h-64';
    inner.innerHTML = `
      <img src="${dept.image || '/static/images/default-logo.png'}" alt="${dept.name}" class="w-full h-32 object-cover rounded mb-2" />
      <div class="font-bold text-lg text-white mb-1">${dept.name}</div>
      <div class="text-gray-400 text-sm mb-1">${dept.description || ''}</div>
      <div class="text-xs text-gray-500">${dept.template && dept.template.name ? dept.template.name : ''}</div>
    `;
    card.appendChild(inner);
    if (!canAccess) {
      var overlay = document.createElement('div');
      overlay.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 rounded-lg z-10';
      overlay.innerHTML = `
        <span class="text-white text-xs px-2 py-1 rounded mb-2 bg-gray-700 bg-opacity-80">Private</span>
        <button type="button" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold shadow">Request Access</button>
      `;
      overlay.querySelector('button').onclick = function(e) { e.stopPropagation(); openRequestDepartmentAccessModal(dept._id, safeDeptName); };
      card.appendChild(overlay);
    }
    grid.appendChild(card);
  });
  // Pagination controls
  controls.innerHTML = '';
  var prevBtn = document.createElement('button');
  prevBtn.className = 'px-4 py-2 rounded bg-gray-700 text-white font-semibold';
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = page <= 1;
  prevBtn.onclick = function() { renderDepartmentsPage(page - 1); };
  controls.appendChild(prevBtn);
  var pageInfo = document.createElement('span');
  pageInfo.className = 'text-gray-300';
  pageInfo.textContent = `Page ${page} of ${totalPages}`;
  controls.appendChild(pageInfo);
  var nextBtn = document.createElement('button');
  nextBtn.className = 'px-4 py-2 rounded bg-gray-700 text-white font-semibold';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = page >= totalPages;
  nextBtn.onclick = function() { renderDepartmentsPage(page + 1); };
  controls.appendChild(nextBtn);
}

document.addEventListener('DOMContentLoaded', function() {
  // ... existing modal close logic ...
  // Setup department pagination globals
  window.allDepartments = window.departmentsData || [];
  window.currentUserId = (window.dbUser && window.dbUser._id) || (window.dbUser && window.dbUser.user && window.dbUser.user._id) || '';
  window.canManageDepartments = window.canManageDepartmentsFlag || false;
  renderDepartmentsPage(1);
});

// Ensure navigateToDepartment is defined globally for card onclick
window.navigateToDepartment = function(departmentId, templateName) {
  const deptName = templateName ? templateName.toLowerCase() : '';
  let dashboardUrl = '';
  if (deptName.includes('civilian')) {
    dashboardUrl = `/civ-dashboard?dept=${encodeURIComponent(templateName)}&d=${departmentId}`;
  } else if (deptName.includes('police')) {
    dashboardUrl = `/police-dashboard?dept=${encodeURIComponent(templateName)}&d=${departmentId}`;
  } else if (deptName.includes('fire') || deptName.includes('ems')) {
    dashboardUrl = `/ems-dashboard?dept=${encodeURIComponent(templateName)}&d=${departmentId}`;
  } else if (deptName.includes('dispatch')) {
    dashboardUrl = `/dispatch-dashboard?dept=${encodeURIComponent(templateName)}&d=${departmentId}`;
  }
  if (dashboardUrl) {
    window.location.href = dashboardUrl;
  }
}; 