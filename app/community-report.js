// Reporting a community from its page on the website.
//
// The reasons, their descriptions and the flow are a copy of the mobile app's
// report screens (police-cad-app screens/ReportDetailsScreen.js and
// ReportReviewScreen.js), word for word, so a player sees the same choices
// wherever they report from and the admin queue classifies them the same way.
// The API tiers a report by this exact title, so a change here has to be made
// there too.

const REPORT_REASONS = Object.freeze([
  {
    title: "Hate",
    subtext:
      "Slurs, Racist or sexist stereotypes, Dehumanization, Incitement of fear or discrimination, Hateful references, Hateful symbols & logos",
  },
  {
    title: "Abuse & Harassment",
    subtext:
      "Insults, Unwanted Sexual Content & Graphic Objectification, Unwanted NSFW & Graphic Content, Violent Event Denial, Targeted Harassment and Inciting Harassment",
  },
  {
    title: "Violent Speech",
    subtext:
      "Violent Threats, Wish of Harm, Glorification of Violence, Incitement of Violence, Coded Incitement of Violence",
  },
  {
    title: "Child Safety",
    subtext:
      "Child sexual exploitation, grooming, physical child abuse, underage user",
  },
  {
    title: "Privacy",
    subtext:
      "Sharing private information, threatening to share/expose private information, sharing non-consensual intimate images, sharing images of me that I don't want on the platform",
  },
  {
    title: "Illegal & Regulated Behavior",
    subtext:
      "Human exploitation, sexual services, drugs, weapons, endangered species, facilitating illegal activity",
  },
  {
    title: "Spam",
    subtext: "Fake engagement, scams, fake accounts, malicious links",
  },
  {
    title: "Suicide or Self-Harm",
    subtext:
      "Encouraging, promoting, providing instructions or sharing strategies for self-harm.",
  },
  {
    title: "Sensitive or Disturbing Media",
    subtext:
      "Graphic Content, Gratuitous Gore, Adult Nudity & Sexual Behavior, Violent Sexual Conduct, Bestiality & Necrophilia, Media depicting a deceased individual",
  },
  {
    title: "Impersonation",
    subtext:
      "Pretending to be someone else, including non-compliant parody/fan accounts",
  },
  {
    title: "Violent & Hateful Entities",
    subtext: "Violent extremism and terrorism, hate groups & networks",
  },
].map(Object.freeze));

// Matches MaxReportDetailsLength in the API and the mobile app's field.
const MAX_REPORT_DETAILS = 2000;

// Matches MinReportDetailsLength in the API. A category on its own is not
// something staff can act on, and that is most of what has been filed.
const MIN_REPORT_DETAILS = 20;

// Where the reported behaviour happened. We only take reports about content in
// this product: anything else we cannot see, cannot verify, and the platform
// that could act never hears about it.
const REPORT_LOCATIONS = Object.freeze([
  { id: "in_app", label: "Here in Lines Police CAD", subtext: "Something written or posted on this website or in the app" },
  { id: "discord", label: "On Discord", subtext: "A server, DM or voice call" },
  { id: "xbox", label: "On Xbox", subtext: "A party, message or game chat" },
  { id: "playstation", label: "On PlayStation", subtext: "A party, message or game chat" },
  { id: "in_game", label: "In a game", subtext: "GTA, RDR2 or another game we do not run" },
  { id: "elsewhere", label: "Somewhere else", subtext: "Another app or website" },
].map(Object.freeze));

const IN_APP = "in_app";

// Which parts of a community profile a reporter can point at. Mirrors the
// community entry in the API's registry (models/report_targets.go): a report
// has to say what is wrong, not just that something is.
const COMMUNITY_FIELDS = Object.freeze([
  { name: "name", label: "Its name" },
  { name: "description", label: "Its description" },
  { name: "promotionalText", label: "Its promo text" },
  { name: "promotionalDescription", label: "Its promo description" },
  { name: "imageLink", label: "Its logo or banner" },
].map(Object.freeze));

const COMMUNITY_FIELD_NAMES = Object.freeze(COMMUNITY_FIELDS.map((f) => f.name));

function areCommunityFields(fields) {
  return (
    Array.isArray(fields) &&
    fields.length > 0 &&
    fields.every((f) => typeof f === "string" && COMMUNITY_FIELD_NAMES.indexOf(f) >= 0)
  );
}

// Where to send someone whose report is not about this product. The
// CyberTipline takes child-safety reports from anyone, about anywhere.
const OFF_PLATFORM_HELP = Object.freeze({
  discord: Object.freeze({ name: "Discord Trust & Safety", url: "https://dis.gd/report" }),
  xbox: Object.freeze({ name: "Xbox support", url: "https://support.xbox.com" }),
  playstation: Object.freeze({ name: "PlayStation support", url: "https://www.playstation.com/support" }),
});

const CHILD_SAFETY = "Child Safety";
const IMPERSONATION = "Impersonation";

function isReportLocation(id) {
  return REPORT_LOCATIONS.some((l) => l.id === id);
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function isReportReason(title) {
  return REPORT_REASONS.some((r) => r.title === title);
}

// sessionUserId reads the logged-in user's id. The report is filed as this
// person and nobody else: the page cannot say who is reporting.
function sessionUserId(req) {
  const u = req && req.user;
  if (!u) return "";
  const id = (u._doc && u._doc._id) || u._id || "";
  return String(id || "");
}

// buildCommunityReport validates what the page sent and returns the body for
// POST /api/v1/report, or { error } saying what is wrong.
function buildCommunityReport(req, communityId) {
  const reporter = sessionUserId(req);
  if (!reporter) return { error: "Log in to report a community.", status: 401 };

  const id = String(communityId || "");
  if (!OBJECT_ID.test(id)) return { error: "That community could not be found.", status: 400 };

  const body = (req && req.body) || {};
  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!isReportReason(reason)) return { error: "Choose a reason for the report.", status: 400 };

  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (!isReportLocation(location)) return { error: "Tell us where this happened.", status: 400 };
  if (location !== IN_APP) {
    // The page sends people to the right platform instead of submitting, so
    // this is a client that skipped the question.
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
    return { error: "Tell us who this community is pretending to be.", status: 400 };
  }

  // What exactly is wrong. Optional: someone who cannot pin it down still has
  // a real complaint, and the server then snapshots the whole profile.
  const rawFields = Array.isArray(body.fields) ? body.fields : [];
  const fields = rawFields.filter((f) => COMMUNITY_FIELD_NAMES.indexOf(f) >= 0);
  if (rawFields.length && !areCommunityFields(rawFields)) {
    return { error: "That is not part of a community profile.", status: 400 };
  }

  return {
    report: {
      itemId: id,
      itemType: "community",
      reportType: "COMMUNITY_REPORT",
      reportedIssue: reason,
      additionalDetails: details,
      reportedById: reporter,
      location: location,
      impersonatedName: impersonatedName,
      // The server loads the community and copies what these fields say. It
      // never trusts a copy sent from here.
      target: { kind: "community", id: id, fields: fields },
    },
  };
}

module.exports = {
  REPORT_REASONS,
  REPORT_LOCATIONS,
  COMMUNITY_FIELDS,
  areCommunityFields,
  OFF_PLATFORM_HELP,
  MAX_REPORT_DETAILS,
  MIN_REPORT_DETAILS,
  CHILD_SAFETY,
  IMPERSONATION,
  isReportReason,
  isReportLocation,
  sessionUserId,
  buildCommunityReport,
};
