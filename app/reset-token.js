// Password reset tokens: one format, with a door held open for links already
// in inboxes.
//
// The reset token used to be stored raw, so the row in Mongo *was* the link.
// It is now stored as sha256(token) on both sides — here and in the API's
// admin console send (api/handlers/admin_password_help.go) — and only the raw
// token ever travels, in the link.
//
// The awkward part is the switchover. A member who asked for a reset five
// minutes before the deploy has a raw-token link in their inbox and an hour to
// use it, so reads have to accept a stored raw token too. That tolerance has
// to be narrow, because the stored value and the supplied value live in the
// same field: without a shape check, handing back a *stored hash* as the token
// would match the raw branch and open the account. Legacy tokens are
// crypto.randomBytes(20) — 40 hex characters — and a hash is always 64, so the
// raw branch is offered only for the 40-hex shape. A 64-character hash can
// never satisfy it.
//
// The tolerance expires on its own: nothing writes a raw token any more, so an
// hour after the deploy no account has one.

const crypto = require("crypto");

// LEGACY_RAW_TOKEN is the shape /forgot-password used to write and e-mail.
const LEGACY_RAW_TOKEN = /^[a-f0-9]{40}$/i;

// hashResetToken is the stored form of a reset token.
function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// isLegacyRawToken reports whether a supplied token could be one of the raw
// tokens still sitting in an inbox.
function isLegacyRawToken(token) {
  return LEGACY_RAW_TOKEN.test(String(token || ""));
}

// resetTokenFilters returns the `$or` branches that find the account a token
// belongs to: the hash it is stored as now, plus the raw value for a legacy
// token. Returns an empty array for an unusable token, so callers can refuse
// rather than query with `$or: []` (which Mongo rejects).
function resetTokenFilters(token) {
  const supplied = String(token || "");
  if (!supplied) return [];
  const filters = [{ "user.resetPasswordToken": hashResetToken(supplied) }];
  if (isLegacyRawToken(supplied)) {
    filters.push({ "user.resetPasswordToken": supplied });
  }
  return filters;
}

module.exports = {
  LEGACY_RAW_TOKEN,
  hashResetToken,
  isLegacyRawToken,
  resetTokenFilters,
};
