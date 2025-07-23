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