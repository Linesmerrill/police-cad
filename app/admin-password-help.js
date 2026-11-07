// Helpers for the admin console's "Send reset email" (see the
// /admin/api/users/:id/reset-password route in app/routes.js).
//
// The API endpoint behind this plants a live reset token on an account and
// sends mail, so it requires the first-party gateway secret and is reachable
// only through this server route, behind requireAdminSession. The point of
// that is lost if the page can decide who it is acting as, so the acting admin
// is read from the session and anything the page posts in its place is
// ignored — the same posture as the reports proxy.
//
// The API resolves the staff member in admin_users from the id or email here
// and derives the display name itself, so it never has to trust a name that
// travelled through a browser.

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function isObjectId(value) {
  return OBJECT_ID.test(String(value || ""));
}

// resetSendBody is what gets forwarded. Nothing from req.body: this endpoint
// takes no page input at all, and the only variable is who is asking.
//
// The id alone, no email. The API looks the staff member up by it and derives
// the display name itself, so sending an address would only put a string from
// a request into a Mongo filter for nothing.
function resetSendBody(req) {
  const admin = (req && req.session && req.session.admin) || {};
  return {
    currentUser: {
      id: typeof admin.id === "string" ? admin.id : "",
    },
  };
}

// canIdentifyActor reports whether the session names a staff member the API can
// look up. session.admin.id is what the admin session is already keyed on —
// adminSessionRevoked cannot re-check without it — so a session missing it is
// one from before that existed, and needs a fresh login rather than a 403.
function canIdentifyActor(req) {
  return isObjectId(resetSendBody(req).currentUser.id);
}

// resetSendPath is the API path for a member's reset send, or null when the id
// is not a member id. Validated rather than interpolated so a crafted segment
// cannot reach another endpoint.
function resetSendPath(userId) {
  const id = String(userId || "");
  return isObjectId(id) ? `/api/v1/admin/users/${id}/reset-password` : null;
}

module.exports = {
  isObjectId,
  resetSendBody,
  canIdentifyActor,
  resetSendPath,
};
