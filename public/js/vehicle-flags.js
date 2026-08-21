/**
 * Shared vehicle flag normalizers — window.VehicleFlags.
 *
 * Vehicle booleans are stored in two encodings. Newer records use the strings
 * "true"/"false". Older records use a 1-based *select index* left over from the
 * original form — which means the numeric encoding is NOT a boolean, and its
 * polarity depends on the order the options appeared in that form:
 *
 *   Valid Registration?  <option>Yes</option><option>No</option>   -> "1" = valid
 *   Valid Insurance?     <option>Yes</option><option>No</option>   -> "1" = valid
 *   Marked Stolen?       <option value="false">No</option>
 *                        <option value="true">Yes</option>         -> "2" = stolen
 *
 * So "1" means yes for registration/insurance and no for stolen. Every page
 * used to carry its own toBool() and apply it to all four fields, which is
 * exactly how the stolen flag ended up inverted — read each flag through its
 * own named helper instead.
 *
 * As of Aug 2026 roughly 92% of the 2.25M vehicles still carry the numeric
 * encoding, so these helpers are the common path, not a legacy edge case.
 *
 * Keep in sync with police-cad-app/utils/vehicleFlags.js.
 */
(function (window) {
  'use strict';

  /** "1"/1/true/"true" -> true. The polarity where option 1 means yes. */
  function yesIsOne(val) {
    return val === true || val === 1 || val === '1' || val === 'true';
  }

  /**
   * Whether this record's flags were written by the department dashboard
   * rather than the original form.
   *
   * The department dashboard (shipped Feb 2026) is the only writer that ever
   * produced a numeric isExempt, and it always saves all four flags together —
   * so a numeric isExempt marks the whole record as its work. That matters
   * because it used the opposite polarity for isStolen: it wrote "1" for
   * stolen where the original form wrote "2".
   *
   * ~3.1k records out of 2.25M. Once those are migrated this branch can go.
   */
  function isDeptDashboardRecord(veh) {
    return !!veh && (veh.isExempt === '1' || veh.isExempt === '2');
  }

  var VehicleFlags = {
    /** @param {object} veh inner vehicle object @returns {boolean} */
    registrationValid: function (veh) {
      return yesIsOne(veh && veh.validRegistration);
    },

    /** @param {object} veh inner vehicle object @returns {boolean} */
    insuranceValid: function (veh) {
      return yesIsOne(veh && veh.validInsurance);
    },

    /**
     * Needs the whole vehicle, not just the flag: resolving the numeric
     * encoding depends on which writer produced the record.
     *
     * @param {object} veh inner vehicle object @returns {boolean}
     */
    stolen: function (veh) {
      var val = veh && veh.isStolen;
      if (val === true || val === 'true') return true;
      if (val === false || val === 'false') return false;
      return isDeptDashboardRecord(veh) ? val === '1' : val === '2';
    },

    /**
     * isExempt has no legacy form behind it — the only writer of its numeric
     * values is the department dashboard, which wrote "1" for exempt.
     *
     * @param {object} veh inner vehicle object @returns {boolean}
     */
    exempt: function (veh) {
      return yesIsOne(veh && veh.isExempt);
    },

    /**
     * The encoding to write back. Everything written from here on is
     * "true"/"false"; the numeric encoding is read-only legacy.
     *
     * @param {boolean} val @returns {"true"|"false"}
     */
    toApi: function (val) {
      return val ? 'true' : 'false';
    },
  };

  window.VehicleFlags = VehicleFlags;

  // Also usable from the Playwright/unit harness.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VehicleFlags;
  }
})(typeof window !== 'undefined' ? window : globalThis);
