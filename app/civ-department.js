// Finding a player's civilian department when the link did not say which.
//
// Several links point at a bare /civ-dashboard: "Create a civilian" on the
// community page, and the civilian dashboard's own title. With no department
// in the URL the route used to send the player back to the community page,
// which is where most of them had just clicked from.

// A department counts as civilian the same way the community page decides
// where its cards go (navigateToDepartment in views/community-details.ejs).
function isCivilianDepartment(dept) {
  return !!dept &&
    typeof dept.templateName === "string" &&
    dept.templateName.toLowerCase().indexOf("civilian") !== -1 &&
    dept.accessStatus === "approved" &&
    typeof dept._id === "string" &&
    /^[a-fA-F0-9]{24}$/.test(dept._id);
}

// findCivilianDepartment pages through a community's departments until it finds
// a civilian one the player can open. fetchPage(page) resolves to one page of
// the v2 departments response. Returns null when there is none, so the caller
// can fall back to the community page.
async function findCivilianDepartment(fetchPage, limit) {
  for (var page = 1; ; page++) {
    var body = await fetchPage(page);
    var depts = (body && Array.isArray(body.data)) ? body.data : [];
    for (var i = 0; i < depts.length; i++) {
      if (isCivilianDepartment(depts[i])) return depts[i];
    }
    // A short page is the last one, and so is the page that reaches the total.
    if (depts.length < limit) return null;
    if (body && typeof body.totalCount === "number" && page * limit >= body.totalCount) return null;
  }
}

// civDashboardPath is the URL the community page would build for a civilian
// department, so the dashboard's own access check runs as usual.
function civDashboardPath(dept, communityId, encodeId) {
  return "/civ-dashboard?dept=" + encodeURIComponent(dept.name || "") +
    "&d=" + encodeId(dept._id) +
    "&c=" + encodeId(String(communityId));
}

module.exports = { findCivilianDepartment, civDashboardPath, isCivilianDepartment };
