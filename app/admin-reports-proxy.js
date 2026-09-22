// Helpers for the admin console's reports proxy (see the /admin/api/reports
// routes in app/routes.js).
//
// Reports are named accusations against real accounts, including allegations
// about children, so the console reaches them only through our own server. The
// point of that is lost if the page can decide who it is acting as, so the
// acting admin is always read from the session and anything the page posts in
// its place is ignored.

// The actions the page may ask for, mapped to the API path. Whitelisted rather
// than interpolated, so a crafted action segment cannot reach another endpoint.
const REPORT_ACTIONS = Object.freeze({
  preview: "uphold/preview",
  uphold: "uphold",
  dismiss: "dismiss",
  escalate: "escalate",
});

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// reportActionPath returns the API path for an action, or null. It checks own
// properties only: a plain lookup on an object literal would resolve
// "constructor" or "__proto__" to something truthy from the prototype chain.
function reportActionPath(action) {
  const key = String(action || "");
  return Object.prototype.hasOwnProperty.call(REPORT_ACTIONS, key) ? REPORT_ACTIONS[key] : null;
}

function isObjectId(value) {
  return OBJECT_ID.test(String(value || ""));
}

// adminDisplayName is what a decision is attributed to on screen: the first and
// last name on the admin account. Deliberately not session.admin.name, which
// falls back to the part of the email before the @ when no name is set, and
// never the email itself: every admin who opens a report sees this, and a staff
// member's personal address does not belong there. With no name on the account
// the API shows "Staff".
function adminDisplayName(admin) {
  const first = typeof admin.firstName === "string" ? admin.firstName.trim() : "";
  const last = typeof admin.lastName === "string" ? admin.lastName.trim() : "";
  const full = (first + " " + last).trim();
  return full.includes("@") ? "" : full;
}

// adminActor is the identity the API records against an action, taken from the
// admin session and nothing else.
function adminActor(req) {
  const admin = (req && req.session && req.session.admin) || {};
  let roles = [];
  if (Array.isArray(admin.roles)) {
    roles = admin.roles.filter((r) => typeof r === "string");
  } else if (typeof admin.role === "string" && admin.role) {
    roles = [admin.role];
  }
  return {
    id: typeof admin.id === "string" ? admin.id : "",
    name: adminDisplayName(admin),
    roles: roles,
  };
}

// buildActionBody is what gets forwarded for an uphold, preview, dismiss or
// escalate. Only the free-text fields and the send-email toggle are taken from
// the page; currentUser always comes from the session.
function buildActionBody(req) {
  const body = (req && req.body) || {};
  const out = {
    currentUser: adminActor(req),
    reason: typeof body.reason === "string" ? body.reason : "",
    note: typeof body.note === "string" ? body.note : "",
  };
  if (typeof body.sendEmail === "boolean") {
    out.sendEmail = body.sendEmail;
  }
  return out;
}

module.exports = { REPORT_ACTIONS, reportActionPath, isObjectId, adminActor, adminDisplayName, buildActionBody };
