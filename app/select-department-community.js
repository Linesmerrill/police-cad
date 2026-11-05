/*
 * Which community a POST /select-department belongs to.
 *
 * The redirect carries the community the user is actually on (?c=), which is
 * not always lastAccessedCommunity: that field is only written when a
 * community page is visited, so a dashboard reached by a link, a bookmark or
 * in a second tab can be on a different community. Validating the chosen
 * department against the wrong community rejected a department the user had
 * every right to enter, and sent them to /communities with "invalid
 * department".
 *
 * Only a community the user is an approved member of is taken from the
 * redirect, which keeps this exactly as tight as reading
 * lastAccessedCommunity, itself only written for approved members. Anything
 * else returns null so the caller falls back to today's behaviour.
 */

// base64url, matching encodeId/decodeId in app/routes.js.
function decodeId(encoded) {
  var base64 = String(encoded).replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// The ?c= of a redirect path, or null when it has none or cannot be parsed.
function encodedCommunityFromRedirect(redirect) {
  if (!redirect || typeof redirect !== 'string') return null;
  try {
    return new URL(redirect, 'http://placeholder.invalid').searchParams.get('c');
  } catch (e) {
    return null;
  }
}

function isApprovedMember(user, communityId) {
  var memberships = user && user.communities;
  if (!Array.isArray(memberships)) return false;
  return memberships.some(function (c) {
    return c && String(c.communityId) === communityId && c.status === 'approved';
  });
}

function selectDepartmentCommunity(req, redirect) {
  var encoded = encodedCommunityFromRedirect(redirect);
  if (!encoded) return null;

  var decoded;
  try {
    decoded = decodeId(encoded);
  } catch (e) {
    return null;
  }
  if (!isValidObjectId(decoded)) return null;

  var user = (req && req.user && req.user._doc && req.user._doc.user) ||
    (req && req.user && req.user.user) || null;
  return isApprovedMember(user, decoded) ? decoded : null;
}

module.exports = {
  selectDepartmentCommunity: selectDepartmentCommunity,
  encodedCommunityFromRedirect: encodedCommunityFromRedirect,
};
