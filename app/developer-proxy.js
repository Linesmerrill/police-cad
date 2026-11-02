// Request shaping for the Developer API pages.
//
// Everything here is pure, so it is unit-tested directly (test/developer-proxy.test.js)
// and app/routes.js stays a thin session check plus an axios forward.
//
// The reason the validation lives on this side at all, when the API validates
// too, is that these routes carry the first-party gateway secret. A body the
// browser composes should not reach the API unexamined just because our server
// forwarded it.

// The scopes a key can hold, and what each one grants. Mirrors
// models.DeveloperScopes in the API; the page renders from the API's own list
// at runtime, and this copy is the fallback when that call fails plus the
// allowlist the create route validates against.
var DEVELOPER_SCOPES = [
  { scope: "community:read", description: "Read the community's profile, departments and ten-codes", group: "Community" },
  { scope: "units:read", description: "See who is on duty", group: "Dispatch" },
  { scope: "units:write", description: "Set a member's status, ten-code and location", group: "Dispatch" },
  { scope: "calls:read", description: "Read calls", group: "Dispatch" },
  { scope: "calls:write", description: "Create, update and close calls", group: "Dispatch" },
  { scope: "bolos:read", description: "Read BOLOs", group: "Dispatch" },
  { scope: "bolos:write", description: "Create BOLOs", group: "Dispatch" },
  { scope: "civilians:read", description: "Look up civilians by name", group: "Records" },
  { scope: "civilians:write", description: "Create and update civilians for linked players", group: "Records" },
  { scope: "vehicles:read", description: "Look up vehicles by plate", group: "Records" },
  { scope: "vehicles:write", description: "Register vehicles for linked players", group: "Records" },
  { scope: "firearms:read", description: "Look up firearms by serial", group: "Records" },
  { scope: "firearms:write", description: "Register firearms for linked players", group: "Records" },
  { scope: "licenses:write", description: "Issue licenses to civilians", group: "Records" },
  { scope: "players:provision", description: "Create and link player accounts from game identifiers", group: "Provisioning" },
  { scope: "communities:provision", description: "Create communities owned by you", group: "Provisioning" },
  { scope: "members:read", description: "Read the community's member roster", group: "Members" },
  { scope: "members:write", description: "Invite, approve, promote and remove members", group: "Members" },
  { scope: "reports:read", description: "Read the report drafts this key created", group: "Reports" },
  { scope: "reports:write", description: "Write report drafts for a person to review and file", group: "Reports" },
  { scope: "warrants:read", description: "Read the community's warrants", group: "Reports" },
  { scope: "warrants:write", description: "Request a warrant for the community's reviewer", group: "Reports" },
];

var VALID_SCOPES = DEVELOPER_SCOPES.reduce(function (acc, s) {
  acc[s.scope] = true;
  return acc;
}, {});

var OBJECT_ID = /^[a-f0-9]{24}$/i;

function isObjectIdLike(value) {
  return typeof value === "string" && OBJECT_ID.test(value);
}

// buildCreateKeyBody validates what the page sends when creating a key.
//
// An unknown scope is an error rather than something to drop silently: dropping
// it would hand back a key that does less than the developer asked for, and
// they would find out from a 403 in production rather than from this form.
function buildCreateKeyBody(input) {
  var src = input || {};

  var name = typeof src.name === "string" ? src.name.trim() : "";
  if (!name) return { error: "Give the key a name so you can tell it apart later." };
  if (name.length > 60) return { error: "Key names are 60 characters or fewer." };

  if (!Array.isArray(src.scopes) || src.scopes.length === 0) {
    return { error: "Pick at least one scope." };
  }
  var scopes = [];
  for (var i = 0; i < src.scopes.length; i++) {
    var scope = src.scopes[i];
    if (typeof scope !== "string" || !VALID_SCOPES[scope]) {
      return { error: "Unknown scope: " + String(scope) };
    }
    if (scopes.indexOf(scope) === -1) scopes.push(scope);
  }

  var body = { name: name, scopes: scopes };

  // A community is optional only for a key that will make its own.
  if (src.communityId !== undefined && src.communityId !== null && src.communityId !== "") {
    if (!isObjectIdLike(src.communityId)) return { error: "That community id is not valid." };
    body.communityId = src.communityId;
  } else if (scopes.indexOf("communities:provision") === -1) {
    return {
      error:
        "Pick a community for this key, or give it the " +
        "“Create communities owned by you” scope.",
    };
  }

  return { body: body };
}

// buildUpdateKeyBody validates an edit to an existing key.
//
// A partial update: a field that was not sent is left alone. That is what lets
// the console save a rename without sending the scope list back, and send
// scopes without being able to blank the name by omitting it. An empty object
// is an error rather than a no-op, so a bug that sends nothing is visible.
function buildUpdateKeyBody(input) {
  var src = input || {};
  var body = {};

  if (src.name !== undefined) {
    if (typeof src.name !== "string" || !src.name.trim()) {
      return { error: "Give the key a name so you can tell it apart later." };
    }
    if (src.name.trim().length > 60) return { error: "Key names are 60 characters or fewer." };
    body.name = src.name.trim();
  }

  if (src.scopes !== undefined) {
    if (!Array.isArray(src.scopes) || src.scopes.length === 0) {
      return { error: "Pick at least one permission." };
    }
    var scopes = [];
    for (var i = 0; i < src.scopes.length; i++) {
      var scope = src.scopes[i];
      if (typeof scope !== "string" || !VALID_SCOPES[scope]) {
        return { error: "Unknown permission: " + String(scope) };
      }
      if (scopes.indexOf(scope) === -1) scopes.push(scope);
    }
    body.scopes = scopes;
  }

  if (Object.keys(body).length === 0) {
    return { error: "Nothing to save." };
  }
  return { body: body };
}

// buildAddCommunityBody validates adding a community to an existing key.
function buildAddCommunityBody(input) {
  var src = input || {};
  if (!isObjectIdLike(src.communityId)) {
    return { error: "Pick a community." };
  }
  return { body: { communityId: src.communityId } };
}

// accountUsageView shapes the account-wide usage response for the charts.
//
// Totals and percentages are computed here, once, rather than in each chart:
// two components deriving the same percentage is how a page ends up showing
// 61% in one place and 62% in another.
function accountUsageView(payload) {
  var src = payload || {};
  var limits = src.limits || {};
  var series = Array.isArray(src.series) ? src.series : [];

  var dailyLimit = numberOr(limits.requestsPerDay, 0);
  var requestsToday = numberOr(src.requestsToday, 0);

  var normalized = series.map(function (d) {
    return {
      day: typeof d.day === "string" ? d.day : "",
      requests: numberOr(d.requests, 0),
      rejected: numberOr(d.rejected, 0),
      rejected401: numberOr(d.rejected401, 0),
      rejected403: numberOr(d.rejected403, 0),
      rejected429: numberOr(d.rejected429, 0),
      accountsMade: numberOr(d.accountsMade, 0),
    };
  });

  var totalRequests = normalized.reduce(function (sum, d) {
    return sum + d.requests;
  }, 0);
  var totalRejected = normalized.reduce(function (sum, d) {
    return sum + d.rejected;
  }, 0);

  return {
    plan: typeof src.plan === "string" ? src.plan : "free",
    days: numberOr(src.days, 30),
    from: typeof src.from === "string" ? src.from : "",
    to: typeof src.to === "string" ? src.to : "",
    series: normalized,
    keys: (Array.isArray(src.keys) ? src.keys : []).map(function (k) {
      return {
        keyId: typeof k.keyId === "string" ? k.keyId : "",
        name: typeof k.name === "string" ? k.name : "",
        status: typeof k.status === "string" ? k.status : "",
        requests: numberOr(k.requests, 0),
        rejected: numberOr(k.rejected, 0),
        lastUsedAt: typeof k.lastUsedAt === "string" ? k.lastUsedAt : null,
      };
    }),
    requestsToday: requestsToday,
    rejectedToday: numberOr(src.rejectedToday, 0),
    requestsThisMonth: numberOr(src.requestsThisMonth, 0),
    totalRequests: totalRequests,
    totalRejected: totalRejected,
    peakDay: numberOr(src.peakDay, 0),
    dailyLimit: dailyLimit,
    minuteLimit: numberOr(limits.requestsPerMinute, 0),
    // Clamped: going over is possible, since the request that trips the limit
    // is counted, and a bar past 100% reads as a bug rather than as a cap.
    dailyPercent: dailyLimit > 0 ? Math.min(100, Math.round((requestsToday / dailyLimit) * 100)) : 0,
    resetsAt: typeof src.dailyLimitResetsAt === "string" ? src.dailyLimitResetsAt : null,
  };
}

// buildEnableBody validates turning a developer account on.
//
// Accepting the Developer Terms is required and not defaulted. A developer can
// create accounts for players who have never seen our Terms, so the person
// taking that on has to have actually ticked the box.
function buildEnableBody(input) {
  var src = input || {};
  if (src.acceptTerms !== true) {
    return { error: "You need to accept the Developer Terms to continue." };
  }
  var body = { acceptTerms: true };
  if (typeof src.appName === "string" && src.appName.trim()) {
    body.appName = src.appName.trim().slice(0, 80);
  }
  if (typeof src.appUrl === "string" && src.appUrl.trim()) {
    var url = src.appUrl.trim();
    // Only http(s), and only a shape that cannot become a javascript: or
    // data: URL when the page renders it as a link.
    if (!/^https?:\/\/[^\s"'<>]+$/.test(url)) {
      return { error: "The project URL needs to start with http:// or https://" };
    }
    body.appUrl = url.slice(0, 200);
  }
  return { body: body };
}

// normalizeClaimCode makes a code typed by a person match the one we issued.
//
// The code is read off a game screen, so it arrives with the case the player
// felt like using, often without the dashes, and sometimes with a trailing
// space from a copy-paste. The API normalizes the same way; doing it here too
// means an obviously-fine code never costs a round trip.
function normalizeClaimCode(input) {
  if (typeof input !== "string") return "";
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

// buildClaimBody validates a claim redemption.
function buildClaimBody(input) {
  var src = input || {};
  var code = normalizeClaimCode(src.code);
  if (!code) return { error: "Enter the code shown in game." };
  if (code.length < 6 || code.length > 20) {
    return { error: "That does not look like a claim code." };
  }
  return { body: { code: code } };
}

// usageDashboardView shapes the usage response for the dashboard.
//
// The page gets numbers it can render directly rather than deriving them in
// template code, which is how percentages and reset times end up inconsistent
// between the places they appear.
function usageDashboardView(payload) {
  var src = payload || {};
  var limits = src.limits || {};
  var days = Array.isArray(src.days) ? src.days : [];
  var errors = src.errorsToday || {};

  var requestsToday = numberOr(src.requestsToday, 0);
  var dailyLimit = numberOr(limits.requestsPerDay, 0);

  return {
    plan: typeof src.plan === "string" ? src.plan : "free",
    requestsToday: requestsToday,
    requestsThisMonth: numberOr(src.requestsThisMonth, 0),
    dailyLimit: dailyLimit,
    minuteLimit: numberOr(limits.requestsPerMinute, 0),
    // Clamped, because being over the limit is possible (the request that
    // trips it is counted) and a bar past 100% looks like a bug.
    dailyPercent: dailyLimit > 0 ? Math.min(100, Math.round((requestsToday / dailyLimit) * 100)) : 0,
    resetsAt: typeof src.dailyLimitResetsAt === "string" ? src.dailyLimitResetsAt : null,
    errorsToday: {
      rateLimited: numberOr(errors.rateLimited, 0),
      unauthorized: numberOr(errors.unauthorized, 0),
      forbidden: numberOr(errors.forbidden, 0),
    },
    hasErrorsToday:
      numberOr(errors.rateLimited, 0) + numberOr(errors.unauthorized, 0) + numberOr(errors.forbidden, 0) > 0,
    series: days.map(function (d) {
      return {
        day: typeof d.day === "string" ? d.day : "",
        requests: numberOr(d.requests, 0),
        rejected: numberOr(d.rejected429, 0) + numberOr(d.rejected401, 0) + numberOr(d.rejected403, 0),
      };
    }),
    accountsCreated: numberOr(src.accountsCreated, 0),
  };
}

function numberOr(value, fallback) {
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

// communityKeysView shapes the community-side list for the EJS page.
//
// Pending first, because a request waiting on somebody is the only row on this
// page that needs an action, and burying it under the active ones is how it
// gets missed.
function communityKeysView(payload) {
  var rows = payload && Array.isArray(payload.keys) ? payload.keys : [];

  var out = rows.map(function (row) {
    var grant = row.grant || {};
    var key = row.key || {};
    return {
      keyId: typeof grant.keyId === "string" ? grant.keyId : "",
      status: typeof grant.status === "string" ? grant.status : "",
      source: grant.source === "created_by_key" ? "Created by this key" : "Approved by an admin",
      requestedAt: grant.requestedAt || null,
      approvedBy: typeof grant.approvedBy === "string" ? grant.approvedBy : "",
      keyName: typeof key.name === "string" ? key.name : "(deleted key)",
      displayPrefix: typeof key.displayPrefix === "string" ? key.displayPrefix : "",
      scopes: Array.isArray(key.scopes) ? key.scopes : [],
      developerName: typeof row.developerName === "string" ? row.developerName : "",
      // A revoked key's grant cannot be re-approved into life, so the page
      // should not offer it.
      canApprove: grant.status === "pending" && key.status === "active",
      canRevoke: grant.status === "active",
      writeScopes: (Array.isArray(key.scopes) ? key.scopes : []).filter(function (s) {
        return s.indexOf(":write") !== -1 || s.indexOf(":provision") !== -1;
      }),
    };
  });

  var rank = { pending: 0, active: 1, revoked: 2 };
  out.sort(function (a, b) {
    var ra = rank[a.status] === undefined ? 3 : rank[a.status];
    var rb = rank[b.status] === undefined ? 3 : rank[b.status];
    if (ra !== rb) return ra - rb;
    return a.keyName.localeCompare(b.keyName);
  });

  return {
    keys: out,
    pendingCount: out.filter(function (k) {
      return k.status === "pending";
    }).length,
    activeCount: out.filter(function (k) {
      return k.status === "active";
    }).length,
  };
}

// apiErrorReason pulls a usable message out of either error envelope.
//
// The Go API answers { response: { message } } while the website's own Express
// routes answer a top-level { message } or { error }, so a single helper here
// stops every call site from guessing. Returns a bare reason, no punctuation
// added, so the caller decides the sentence.
function apiErrorReason(data, fallback) {
  var src = data || {};
  if (src.response && typeof src.response.message === "string" && src.response.message) {
    return src.response.message;
  }
  if (typeof src.message === "string" && src.message) return src.message;
  if (typeof src.error === "string" && src.error) return src.error;
  return fallback || "Something went wrong";
}

module.exports = {
  DEVELOPER_SCOPES: DEVELOPER_SCOPES,
  isObjectIdLike: isObjectIdLike,
  buildCreateKeyBody: buildCreateKeyBody,
  buildUpdateKeyBody: buildUpdateKeyBody,
  buildAddCommunityBody: buildAddCommunityBody,
  accountUsageView: accountUsageView,
  buildEnableBody: buildEnableBody,
  normalizeClaimCode: normalizeClaimCode,
  buildClaimBody: buildClaimBody,
  usageDashboardView: usageDashboardView,
  communityKeysView: communityKeysView,
  apiErrorReason: apiErrorReason,
};
