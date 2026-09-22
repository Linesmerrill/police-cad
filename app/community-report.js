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

  const details = typeof body.details === "string" ? body.details.trim() : "";
  if (details.length > MAX_REPORT_DETAILS) {
    return { error: "Keep the details to " + MAX_REPORT_DETAILS + " characters or fewer.", status: 400 };
  }

  return {
    report: {
      itemId: id,
      itemType: "community",
      reportType: "COMMUNITY_REPORT",
      reportedIssue: reason,
      additionalDetails: details,
      reportedById: reporter,
    },
  };
}

module.exports = { REPORT_REASONS, MAX_REPORT_DETAILS, isReportReason, sessionUserId, buildCommunityReport };
