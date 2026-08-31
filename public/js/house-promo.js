/* House promos: fill an ad slot that Google didn't.
 *
 * AdSense sets data-ad-status="unfilled" on an <ins> it could not fill, and
 * the dashboards already watch for that so they can collapse the container.
 * This takes the same signal and puts one of our own messages in the space
 * instead, so a slot that was going to be blank carries something.
 *
 * Consequences worth knowing:
 *   - It never displaces a paying ad. If Google filled the slot, this does
 *     nothing at all.
 *   - It inherits the ad's visibility rules for free. The containers are only
 *     rendered for users who see ads in the first place, so a Premium Plus
 *     subscriber has no container here to fill.
 *   - It is intermittent by nature, which is the point. This is a note, not a
 *     campaign.
 *
 * The promo itself is injected server-side into #hp-source as a JSON payload
 * (see views/partials/house-promo.ejs). Nothing here calls the API.
 */
(function (global) {
  "use strict";

  // Google flips data-ad-status once it has decided. Two passes rather than
  // one: the first catches the common case quickly, the second covers a slow
  // network without making everyone wait that long to see anything.
  var PASSES_MS = [2000, 5000];

  function readPromo() {
    var node = document.getElementById("hp-source");
    if (!node) return null;
    try {
      var promo = JSON.parse(node.textContent || "null");
      // The API already drops half-written records, but this runs against
      // whatever the page was rendered with, so check again rather than
      // building a card with a dead button.
      if (!promo || !promo.title || !promo.ctaUrl) return null;
      return promo;
    } catch (err) {
      return null;
    }
  }

  function esc(value) {
    var d = document.createElement("div");
    d.textContent = value == null ? "" : String(value);
    return d.innerHTML;
  }

  // Only http(s) links get rendered. These records are hand-edited in Mongo,
  // and a javascript: URL pasted into ctaUrl would otherwise become a click
  // handler on a logged-in page.
  function safeUrl(value) {
    var raw = String(value == null ? "" : value).trim();
    return /^https?:\/\//i.test(raw) ? raw : "";
  }

  function isUnfilled(ins) {
    if (!ins) return true;
    var status = ins.getAttribute("data-ad-status");
    if (status === "unfilled") return true;
    // No status and no iframe by the time we look means it never loaded --
    // a blocker, a network failure, or a slot Google has nothing for.
    return !status && !ins.querySelector("iframe");
  }

  function buildCard(promo) {
    var url = safeUrl(promo.ctaUrl);
    if (!url) return null;

    var card = document.createElement("div");
    card.className = "hp-card";
    card.innerHTML =
      '<div class="hp-mark" aria-hidden="true">' + esc(promo.mark || "❤️") + "</div>" +
      '<div class="hp-text">' +
        (promo.eyebrow ? '<div class="hp-eyebrow">' + esc(promo.eyebrow) + "</div>" : "") +
        '<p class="hp-title">' + esc(promo.title) + "</p>" +
        (promo.body ? '<p class="hp-body">' + esc(promo.body) + "</p>" : "") +
      "</div>" +
      '<a class="hp-cta" target="_blank" rel="noopener noreferrer external"></a>';

    var cta = card.querySelector(".hp-cta");
    cta.href = url;
    cta.textContent = promo.ctaLabel || "Learn more";
    return card;
  }

  function fillSlots(promo) {
    var filled = 0;

    Array.prototype.forEach.call(
      document.querySelectorAll(".heroui-ad-container"),
      function (container) {
        if (container.getAttribute("data-hp-filled") === "1") return;
        if (!isUnfilled(container.querySelector("ins.adsbygoogle"))) return;

        var card = buildCard(promo);
        if (!card) return;

        // The label said "Advertisement". This is not one, and leaving that
        // there would be the one genuinely dishonest thing about the feature.
        var label = container.querySelector(".heroui-ad-label");
        if (label) label.remove();

        var content = container.querySelector(".heroui-ad-content");
        if (content) {
          content.innerHTML = "";
          content.appendChild(card);
        } else {
          container.innerHTML = "";
          container.appendChild(card);
        }

        // The container hides itself via .ad-unfilled and :empty. It has
        // something in it now, so both have to come off.
        container.classList.remove("ad-unfilled");
        container.setAttribute("data-hp-filled", "1");
        filled += 1;
      }
    );

    return filled;
  }

  function run() {
    var promo = readPromo();
    // No promo running is the steady state. Leave the page exactly as it was,
    // so the container collapses the way it always has.
    if (!promo) return;
    PASSES_MS.forEach(function (delay) {
      global.setTimeout(function () {
        fillSlots(promo);
      }, delay);
    });
  }

  // Exported for tests. The init guard stays off the export so a test can call
  // these directly without the page having auto-run.
  global.housePromo = {
    buildCard: buildCard,
    isUnfilled: isUnfilled,
    safeUrl: safeUrl,
    fillSlots: fillSlots,
  };

  // Also usable from the unit harness, same as public/js/vehicle-flags.js.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.housePromo;
  }

  if (!global.__housePromoInit && typeof document !== "undefined") {
    global.__housePromoInit = true;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
