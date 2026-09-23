// Reporting any piece of content, from wherever it is shown.
//
// The community form (app/community-report.js) was the first of these. This is
// the same thing for everything else people write: announcements and their
// comments, events, feature requests and their comments.
//
// Mirrors the API's registry (models/report_targets.go). The server is the
// authority on both the fields and the content itself: the browser sends only
// what is being reported, never what it said.

const { REPORT_REASONS, REPORT_LOCATIONS, OFF_PLATFORM_HELP, MAX_REPORT_DETAILS,
  MIN_REPORT_DETAILS, IMPERSONATION, isReportReason, isReportLocation,
  sessionUserId } = require("./community-report");

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// What can be reported from the website, and which parts of each. Content that
// lives inside another document names the parent, so the server can find it.
const CONTENT_KINDS = Object.freeze({
  community: Object.freeze({
    label: "community", needsParent: false,
    fields: ["name", "description", "promotionalText", "promotionalDescription", "imageLink"],
  }),
  user_profile: Object.freeze({
    label: "profile", needsParent: false,
    fields: ["username", "name", "profilePicture", "backgroundImage"],
  }),
  announcement: Object.freeze({
    label: "announcement", needsParent: false,
    fields: ["title", "content"],
  }),
  announcement_comment: Object.freeze({
    label: "comment", needsParent: true,
    fields: ["content"],
  }),
  community_event: Object.freeze({
    label: "event", needsParent: true,
    fields: ["title", "description", "image"],
  }),
  feature_request: Object.freeze({
    label: "feature request", needsParent: false,
    fields: ["title", "description", "imageUrls"],
  }),
  feature_request_comment: Object.freeze({
    label: "comment", needsParent: true,
    fields: ["content", "imageUrls"],
  }),
});

function contentKind(kind) {
  const key = String(kind || "");
  return Object.prototype.hasOwnProperty.call(CONTENT_KINDS, key) ? CONTENT_KINDS[key] : null;
}

// buildContentReport validates what the page sent and returns the body for
// POST /api/v1/report, or { error, status }.
function buildContentReport(req) {
  const reporter = sessionUserId(req);
  if (!reporter) return { error: "Log in to report this.", status: 401 };

  const body = (req && req.body) || {};
  const kind = contentKind(body.kind);
  if (!kind) return { error: "That cannot be reported.", status: 400 };

  const id = String(body.id || "");
  if (!OBJECT_ID.test(id)) return { error: "That content could not be found.", status: 400 };

  const parentId = String(body.parentId || "");
  if (kind.needsParent && !OBJECT_ID.test(parentId)) {
    return { error: "That content could not be found.", status: 400 };
  }

  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!isReportReason(reason)) return { error: "Choose a reason for the report.", status: 400 };

  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (!isReportLocation(location)) return { error: "Tell us where this happened.", status: 400 };
  if (location !== "in_app") {
    return { error: "We can only take reports about things posted in Lines Police CAD.", status: 400 };
  }

  const details = typeof body.details === "string" ? body.details.trim() : "";
  if (details.length > MAX_REPORT_DETAILS) {
    return { error: "Keep the details to " + MAX_REPORT_DETAILS + " characters or fewer.", status: 400 };
  }
  if (details.length < MIN_REPORT_DETAILS) {
    return { error: "Please describe what you saw, in at least " + MIN_REPORT_DETAILS + " characters.", status: 400 };
  }

  const impersonatedName = typeof body.impersonatedName === "string" ? body.impersonatedName.trim() : "";
  if (reason === IMPERSONATION && !impersonatedName) {
    return { error: "Tell us who they are pretending to be.", status: 400 };
  }

  const rawFields = Array.isArray(body.fields) ? body.fields : [];
  const fields = rawFields.filter((f) => typeof f === "string" && kind.fields.indexOf(f) >= 0);
  if (rawFields.length && fields.length !== rawFields.length) {
    return { error: "That is not part of this " + kind.label + ".", status: 400 };
  }

  const target = { kind: String(body.kind), id: id, fields: fields };
  if (kind.needsParent) target.parentId = parentId;

  return {
    report: {
      // itemId and itemType keep the queue's existing grouping working: a
      // report about a community's announcement still groups under that
      // community.
      itemId: String(body.communityId || "") || id,
      itemType: body.communityId ? "community" : "user",
      reportType: "CONTENT_FLAG",
      reportedIssue: reason,
      additionalDetails: details,
      reportedById: reporter,
      location: location,
      impersonatedName: impersonatedName,
      target: target,
    },
  };
}

module.exports = {
  CONTENT_KINDS,
  contentKind,
  buildContentReport,
  REPORT_REASONS,
  REPORT_LOCATIONS,
  OFF_PLATFORM_HELP,
  MAX_REPORT_DETAILS,
  MIN_REPORT_DETAILS,
};
