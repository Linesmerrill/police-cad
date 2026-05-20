/*
 * Global 410 pending_deletion interceptor for the website.
 *
 * When the owner soft-deletes a community while members are mid-session, the
 * API starts returning 410 with { error: "pending_deletion", communityName,
 * scheduledDeletionAt } on every community-scoped request. This file monkey-
 * patches window.fetch so any page that polls the API automatically detects
 * that state, shows the user a single explanation modal (or alert as a
 * fallback), and routes them back to /communities so the next screen they
 * see is a sane state instead of a half-broken page making request after
 * request to a dead community.
 *
 * Pair with window.suppressPendingDeletion(communityId) — call it from the
 * owner's own delete handler right after the DELETE returns. That mutes the
 * eviction modal for that ID so the owner doesn't see a second "Community
 * deleted" prompt right after their "Scheduled" confirmation.
 *
 * Idempotent — re-including this file (e.g. via multiple partials) is a
 * no-op because we guard on window.__pendingDeletionGateInstalled.
 */
(function () {
  if (window.__pendingDeletionGateInstalled) return;
  window.__pendingDeletionGateInstalled = true;

  var COMMUNITY_ID_FROM_URL = /\/community\/([0-9a-fA-F]{24})/;
  var SUPPRESS_TTL_MS = 60 * 1000;
  var REDIRECT_PATH = "/communities";

  // Dedupe per-community for the lifetime of the page session — pollers
  // will keep firing 410s until the redirect lands, and we don't want to
  // re-pop the same modal every time a new TTL window expires.
  var seen = new Set();
  var suppressed = new Map(); // owner-initiated deletes, mute alert + redirect

  window.suppressPendingDeletion = function (communityId, ttlMs) {
    if (!communityId) return;
    var ttl = typeof ttlMs === "number" ? ttlMs : SUPPRESS_TTL_MS;
    suppressed.set(communityId, Date.now() + ttl);
  };

  function isSuppressed(communityId) {
    if (!communityId) return false;
    var exp = suppressed.get(communityId);
    if (!exp) return false;
    if (Date.now() > exp) {
      suppressed.delete(communityId);
      return false;
    }
    return true;
  }

  function formatDate(iso) {
    if (!iso) return null;
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return null;
    }
  }

  function communityIdFromUrl(url) {
    var s = typeof url === "string" ? url : url && url.url ? url.url : "";
    var m = COMMUNITY_ID_FROM_URL.exec(s || "");
    return m ? m[1] : null;
  }

  function handlePendingDeletion(body, url) {
    var cid = communityIdFromUrl(url);
    var dedupeKey = cid || body.communityName || "unknown";
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    if (isSuppressed(cid)) return;

    var name = body.communityName
      ? '"' + body.communityName + '"'
      : "This community";
    var when = formatDate(body.scheduledDeletionAt);
    var message = when
      ? name +
        " has been deleted. It will be permanently removed on " +
        when +
        ". Contact support before then if this was a mistake."
      : name + " has been deleted. Contact support if this was a mistake.";

    var goHome = function () {
      try {
        window.location.assign(REDIRECT_PATH);
      } catch (e) {
        window.location.href = REDIRECT_PATH;
      }
    };

    if (typeof window.ddModal === "function") {
      window.ddModal({
        type: "danger",
        icon: "fa-exclamation-triangle",
        title: "Community deleted",
        message: message,
        confirmText: "OK",
        cancelText: "OK", // some ddModal variants render only confirm
        buttons: [
          {
            label: "OK",
            class: "ddm-btn-danger",
            onClick: goHome,
          },
        ],
        onConfirm: goHome,
        onCancel: goHome,
      });
    } else if (typeof window.alert === "function") {
      // Last-resort fallback for pages without ddModal — still better than
      // silently leaving them on a dead screen.
      window.alert("Community deleted\n\n" + message);
      goHome();
    } else {
      goHome();
    }
  }

  var origFetch = window.fetch;
  if (typeof origFetch !== "function") return;

  window.fetch = function (input, init) {
    var p = origFetch.apply(this, arguments);
    return p.then(function (response) {
      if (response && response.status === 410) {
        // Clone so the caller can still consume the body normally.
        try {
          response
            .clone()
            .json()
            .then(function (body) {
              if (body && body.error === "pending_deletion") {
                handlePendingDeletion(body, input);
              }
            })
            .catch(function () {
              /* not JSON — ignore */
            });
        } catch (e) {
          /* clone failed — ignore */
        }
      }
      return response;
    });
  };
})();
