/* Launch countdown ticker for the EJS pages.
 *
 * The server renders the target onto the element as data- attributes (see
 * views/partials/gta6-countdown.ejs); this file resolves it, ticks, and
 * retires the strip once the launch is far enough past.
 *
 * The same rules exist in lib/countdown.ts (Next.js landing page) and
 * police-cad-app/utils/countdown.js (mobile). The three runtimes cannot share
 * a module — this one is a plain browser script with no build step. Change
 * one, change all three; the mobile copy carries the unit tests.
 */
(function () {
  "use strict";

  var DEFAULT_POST_LAUNCH_HOURS = 72;
  var DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
  var DISMISS_PREFIX = "gta6_countdown_dismissed_";

  // Resolves the instant a countdown is aiming at.
  //
  // "localMidnight" returns midnight on launchDate in the visitor's own
  // timezone. Deliberate: console storefronts list GTA 6 at local midnight in
  // every market rather than one synchronized worldwide moment, so converting
  // a single UTC instant would read zero long after a New Zealand player could
  // play and long before a Los Angeles player could.
  function resolveTarget(cfg) {
    if (cfg.mode === "instant") {
      if (!cfg.launchesAt) return null;
      var at = new Date(cfg.launchesAt);
      return isNaN(at.getTime()) ? null : at;
    }
    var match = DATE_ONLY.exec(String(cfg.launchDate || ""));
    if (!match) return null;
    // Month is 0-indexed. This constructor reads as local time, which is the
    // point — the same call yields a different instant per timezone.
    var target = new Date(+match[1], +match[2] - 1, +match[3], 0, 0, 0, 0);
    return isNaN(target.getTime()) ? null : target;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatLocal(target) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(target);
    } catch (e) {
      return target.toDateString();
    }
  }

  function localZone(target) {
    try {
      var parts = new Intl.DateTimeFormat(undefined, {
        timeZoneName: "short",
      }).formatToParts(target);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "timeZoneName") return "your time · " + parts[i].value;
      }
    } catch (e) {
      /* fall through */
    }
    return "your local time";
  }

  function init(root) {
    if (root.__gta6Bound) return;
    root.__gta6Bound = true;

    var slug = root.getAttribute("data-slug") || "countdown";
    var storageKey = DISMISS_PREFIX + slug;

    try {
      if (window.localStorage && localStorage.getItem(storageKey) === "true") {
        root.remove();
        return;
      }
    } catch (e) {
      // Storage can throw in private modes. Showing the strip is the safe
      // failure here, not hiding it.
    }

    var cfg = {
      mode: root.getAttribute("data-mode") || "localMidnight",
      launchDate: root.getAttribute("data-launch-date") || "",
      launchesAt: root.getAttribute("data-launches-at") || "",
    };
    var hours = parseInt(root.getAttribute("data-post-launch-hours"), 10);
    var postLaunchMs = (hours > 0 ? hours : DEFAULT_POST_LAUNCH_HOURS) * 3600000;

    var target = resolveTarget(cfg);
    if (!target) {
      // A record that cannot produce a target renders nothing rather than
      // counting down to NaN.
      root.remove();
      return;
    }

    var els = {
      days: root.querySelector("[data-gta6-days]"),
      hours: root.querySelector("[data-gta6-hours]"),
      minutes: root.querySelector("[data-gta6-minutes]"),
      seconds: root.querySelector("[data-gta6-seconds]"),
      secondsUnit: root.querySelector("[data-gta6-seconds-unit]"),
      local: root.querySelector("[data-gta6-local]"),
      zone: root.querySelector("[data-gta6-zone]"),
      sr: root.querySelector("[data-gta6-sr]"),
    };

    if (els.local) els.local.textContent = formatLocal(target);
    if (els.zone) els.zone.textContent = localZone(target);

    var dismiss = root.querySelector("[data-gta6-dismiss]");
    if (dismiss) {
      dismiss.addEventListener("click", function () {
        try {
          if (window.localStorage) localStorage.setItem(storageKey, "true");
        } catch (e) {
          /* dismissing for this pageview only is an acceptable degradation */
        }
        root.remove();
      });
    }

    var timer = null;
    var lastSecond = -1;
    var lastAnnouncedMinute = -1;

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function tick() {
      var delta = target.getTime() - Date.now();

      if (delta <= 0) {
        // Retirement matters: without it a passed countdown becomes a
        // negative timer, or dead UI nobody remembers to take down.
        if (-delta >= postLaunchMs) {
          stop();
          root.remove();
          return;
        }
        if (root.getAttribute("data-phase") !== "launched") {
          root.setAttribute("data-phase", "launched");
          if (els.sr) els.sr.textContent = "Out now.";
        }
        return;
      }

      var total = Math.floor(delta / 1000);
      var d = Math.floor(total / 86400);
      var h = Math.floor((total % 86400) / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;

      if (els.days) els.days.textContent = String(d);
      if (els.hours) els.hours.textContent = pad(h);
      if (els.minutes) els.minutes.textContent = pad(m);
      if (els.seconds) els.seconds.textContent = pad(s);

      // Retrigger the heartbeat on the seconds column only.
      if (s !== lastSecond && els.secondsUnit) {
        els.secondsUnit.classList.remove("gta6-unit--tick");
        void els.secondsUnit.offsetWidth; // force reflow so the animation replays
        els.secondsUnit.classList.add("gta6-unit--tick");
        lastSecond = s;
      }

      // Announce at most once a minute — per-second updates are unusable read
      // aloud.
      if (els.sr && m !== lastAnnouncedMinute) {
        lastAnnouncedMinute = m;
        els.sr.textContent = d + " days, " + h + " hours and " + m + " minutes until launch.";
      }
    }

    tick();
    root.hidden = false;
    root.classList.add("gta6-strip--enter");
    timer = setInterval(tick, 1000);

    // Long-idle tabs drift; resync on return rather than trusting the interval.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) tick();
    });
  }

  function initAll() {
    var nodes = document.querySelectorAll("[data-gta6-countdown]");
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
