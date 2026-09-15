/**
 * Penal-code jail time: parsing and formatting.
 *
 * Jail time is stored as free text — the shipped defaults look like
 * "3 minutes 30 seconds", "2 minutes", "45 seconds" — and the editor offered a
 * single text box, so every community has its own spelling of the same thing.
 * Splitting the editor into minutes and seconds needs a tolerant reader for
 * what is already out there and one canonical writer for everything new.
 *
 * Deliberately no bulk migration: parse loosely, write canonically, and the
 * data converges as violations are edited.
 */
(function (window) {
  var JailTime = {
    /**
     * Read free text into {minutes, seconds}. Understands the shipped format
     * ("3 minutes 30 seconds"), abbreviations ("3m 30s", "3 min 30 sec"),
     * clock notation ("3:30"), and a bare number, which is read as minutes
     * because that is what the existing placeholder invited.
     *
     * Anything unparseable gives zeroes rather than throwing — the editor
     * shows empty boxes and the author retypes it.
     *
     * @param {string} text @returns {{minutes: number, seconds: number}}
     */
    parse: function (text) {
      var empty = { minutes: 0, seconds: 0 };
      if (typeof text !== 'string') return empty;
      var s = text.trim().toLowerCase();
      if (!s) return empty;

      // Clock notation: 3:30
      var clock = s.match(/^(\d+)\s*:\s*([0-5]?\d)$/);
      if (clock) {
        return { minutes: parseInt(clock[1], 10), seconds: parseInt(clock[2], 10) };
      }

      var minutes = 0;
      var seconds = 0;
      var found = false;

      // Seconds first: "min" is a prefix of nothing here, but "s" would also
      // match inside "minutes", so seconds are matched on a word boundary that
      // excludes a preceding "minute".
      var minMatch = s.match(/(\d+)\s*(?:minutes?|mins?|m)(?![a-z])/);
      if (minMatch) { minutes = parseInt(minMatch[1], 10); found = true; }

      var secMatch = s.match(/(\d+)\s*(?:seconds?|secs?|s)(?![a-z])/);
      if (secMatch) { seconds = parseInt(secMatch[1], 10); found = true; }

      if (!found) {
        // A bare number means minutes.
        var bare = s.match(/^(\d+)$/);
        if (bare) return JailTime.normalize({ minutes: parseInt(bare[1], 10), seconds: 0 });
        return empty;
      }
      return JailTime.normalize({ minutes: minutes, seconds: seconds });
    },

    /**
     * Carry seconds over 59 into minutes and clamp negatives, so 90 seconds
     * becomes 1 minute 30 seconds rather than being stored as typed.
     *
     * @param {{minutes: number, seconds: number}} v
     */
    normalize: function (v) {
      var m = Math.max(0, Math.floor(Number(v && v.minutes) || 0));
      var sec = Math.max(0, Math.floor(Number(v && v.seconds) || 0));
      m += Math.floor(sec / 60);
      sec = sec % 60;
      return { minutes: m, seconds: sec };
    },

    /**
     * Write the canonical string. Matches the shipped defaults exactly, so a
     * violation edited today is spelled the same as one that has never been
     * touched. Zero gives "" rather than "0 minutes", which would read as a
     * deliberate no-jail sentence.
     *
     * @param {{minutes: number, seconds: number}} v @returns {string}
     */
    format: function (v) {
      var n = JailTime.normalize(v);
      var parts = [];
      if (n.minutes > 0) parts.push(n.minutes + ' minute' + (n.minutes === 1 ? '' : 's'));
      if (n.seconds > 0) parts.push(n.seconds + ' second' + (n.seconds === 1 ? '' : 's'));
      return parts.join(' ');
    },

    /** The most minutes a single violation can carry. */
    MAX_MINUTES: 999,

    /**
     * Validate what an admin typed into the minutes and seconds boxes. Either
     * box may be empty, but not both. Nothing is clamped or carried silently: a
     * negative, a minute count over MAX_MINUTES, or seconds over 59 is reported
     * instead.
     *
     * @returns {{ok:true, minutes:number, seconds:number} |
     *           {ok:false, field:'minutes'|'seconds', message:string}}
     */
    validate: function (minutesRaw, secondsRaw) {
      var raw = { minutes: minutesRaw, seconds: secondsRaw };
      var out = {};
      var names = ['minutes', 'seconds'];
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var v = raw[name] === null || raw[name] === undefined ? '' : String(raw[name]).trim();
        if (v === '') { out[name] = 0; continue; }
        if (!/^\d+$/.test(v)) {
          return { ok: false, field: name, message: 'Enter a whole number of ' + name + '.' };
        }
        out[name] = parseInt(v, 10);
      }
      if (out.minutes > JailTime.MAX_MINUTES) {
        return { ok: false, field: 'minutes', message: 'Enter at most ' + JailTime.MAX_MINUTES + ' minutes.' };
      }
      if (out.seconds > 59) {
        return { ok: false, field: 'seconds', message: 'Enter 0 to 59 seconds.' };
      }
      if (out.minutes === 0 && out.seconds === 0) {
        return { ok: false, field: 'minutes', message: 'Enter a jail time.' };
      }
      return { ok: true, minutes: out.minutes, seconds: out.seconds };
    },

    /** Total seconds, for sorting or sentence maths. */
    toSeconds: function (v) {
      var n = JailTime.normalize(v);
      return n.minutes * 60 + n.seconds;
    },
  };

  window.JailTime = JailTime;

  // Also usable from the Playwright/unit harness.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = JailTime;
  }
})(typeof window !== 'undefined' ? window : globalThis);
