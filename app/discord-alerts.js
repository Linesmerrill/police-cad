// Fire-and-forget Discord webhook alerts for server-side errors.
//
// Reads DISCORD_WEBSITE_ERROR_WEBHOOK_URL from the environment. If unset
// (e.g. local dev, preview apps), every call is a silent no-op so the
// module costs nothing.
//
// Includes a 60-second dedup window per error-signature so a hot bug
// can't flood the channel (a broken page hit 200x in a minute should
// generate one alert, not 200).
//
// Filters out 4xx errors: those are expected client mistakes, not bugs
// we want to be paged on. Anything 500+ and anything without a status
// gets through.

const axios = require("axios");

const WEBHOOK_URL = process.env.DISCORD_WEBSITE_ERROR_WEBHOOK_URL || "";
const DEDUP_WINDOW_MS = 60 * 1000;
const recentSignatures = new Map();

function shouldSkip(err) {
  if (!err) return true;
  if (err.status && err.status >= 400 && err.status < 500) return true;
  return false;
}

function errorSignature(err, req) {
  const msg = (err && err.message) || String(err);
  let stackLine = "";
  if (err && err.stack) {
    const lines = err.stack.split("\n");
    stackLine = lines[1] ? lines[1].trim() : "";
  }
  const path = req && req.path ? req.path.split("?")[0] : "";
  return msg + "|" + stackLine + "|" + path;
}

function pruneDedup(now) {
  for (const [sig, ts] of recentSignatures) {
    if (now - ts > DEDUP_WINDOW_MS) recentSignatures.delete(sig);
  }
}

function truncate(s, n) {
  if (!s) return "";
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function resolveUserIdent(req) {
  try {
    if (!req || !req.user) return "";
    const inner = (req.user._doc && req.user._doc.user) || req.user.user || {};
    return inner.email || inner.username || "";
  } catch (e) {
    return "";
  }
}

function sendErrorAlert(err, req) {
  if (!WEBHOOK_URL) return;
  if (!process.env.DYNO) return;
  if (shouldSkip(err)) return;

  const now = Date.now();
  pruneDedup(now);
  const sig = errorSignature(err, req);
  if (recentSignatures.has(sig)) return;
  recentSignatures.set(sig, now);

  const env = process.env.NODE_ENV || "unknown";
  const dyno = process.env.DYNO || "local";
  const appName = process.env.HEROKU_APP_NAME || "police-cad";

  const userIdent = resolveUserIdent(req);
  const stack = (err && err.stack) || String(err);

  const fields = [];
  if (req && req.method) fields.push({ name: "Method", value: req.method, inline: true });
  if (req && req.path) fields.push({ name: "Path", value: truncate(req.path, 200), inline: true });
  if (userIdent) fields.push({ name: "User", value: truncate(userIdent, 200), inline: true });

  const embed = {
    title: "⚠️ Express error · " + truncate((err && err.message) || "unknown", 120),
    description: "```\n" + truncate(stack, 1800) + "\n```",
    color: 0xef4444,
    timestamp: new Date(now).toISOString(),
    footer: { text: appName + " · " + env + " · " + dyno },
    fields: fields,
  };

  axios
    .post(WEBHOOK_URL, { embeds: [embed] }, { timeout: 5000 })
    .catch(function (whErr) {
      // Don't recurse into the error middleware; just log.
      console.error(
        "[LPS] [level=error] discord webhook failed:",
        whErr && whErr.message ? whErr.message : whErr
      );
    });
}

module.exports = { sendErrorAlert };
