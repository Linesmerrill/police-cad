/* Reveal the "Admin Dashboard" link inside the legacy EJS profile dropdown
 * (#accountDropdown -> #accountDropdownAdminLink) when /api/user/current
 * reports the signed-in user is an admin. The endpoint already resolves
 * isAdmin server-side via the admin_users collection, so this script just
 * mirrors what the Next.js Navbar does for the rest of the site.
 *
 * Idempotent: safe to load on multiple pages or even include twice.
 */
(function () {
  if (window.__lpcAccountDropdownAdminInit) return;
  window.__lpcAccountDropdownAdminInit = true;

  function reveal() {
    var link = document.getElementById('accountDropdownAdminLink');
    if (!link) return;
    // Match the existing flex layout of the sibling rows
    link.style.display = 'flex';
  }

  function init() {
    var link = document.getElementById('accountDropdownAdminLink');
    if (!link) return; // Page doesn't have the dropdown — nothing to do.

    fetch('/api/user/current', { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.user && data.user.isAdmin) reveal();
      })
      .catch(function () { /* silent — link stays hidden */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
