/**
 * Impounding a vehicle — window.VehicleImpound.
 *
 * Impound is the same authority as "mark stolen": a vehicle carries an
 * isImpounded flag, written through the same PUT /api/v1/vehicle/{id} as every
 * other flag, and shown wherever the Stolen badge is shown. Whoever can flag a
 * vehicle stolen on a surface can impound and release it there; a civilian
 * sees the badge on their own vehicle and gets no control to clear it.
 *
 * The user-facing strings live here rather than at a dozen call sites so the
 * wording cannot drift between the plate lookup, the vehicle search, the
 * command dashboard and the civilian's own records.
 *
 * Read the flag through window.VehicleFlags.impounded — never a hand-rolled
 * truth test. See public/js/vehicle-flags.js for why.
 *
 * Keep in sync with police-cad-app/utils/vehicleImpound.js.
 */
(function (window) {
  'use strict';

  var COPY = {
    badge: 'Impounded',
    impound: 'Impound',
    release: 'Release',
    impounded: 'Vehicle impounded.',
    released: 'Vehicle released.',
    failed: 'Failed to update',
  };

  /*
   * Toasts: the dashboards expose two different helpers and no page has both.
   * Same fallback chain as public/js/record-deletion.js.
   */
  function notify(message, type) {
    if (typeof window.ddToast === 'function') {
      window.ddToast(message, type);
      return true;
    }
    if (typeof window.showToast === 'function') {
      window.showToast(message, type === 'success' ? 'success' : 'error');
      return true;
    }
    return false;
  }

  /**
   * Writes the flag, then announces it.
   *
   * @param {string} apiUrl   API base, e.g. window.API_URL
   * @param {string} vehicleId
   * @param {boolean} impound true to impound, false to release
   * @param {function} [done] called with no arguments once the write succeeds
   */
  function set(apiUrl, vehicleId, impound, done) {
    var value = window.VehicleFlags.toApi(impound);
    return window.jQuery.ajax({
      url: apiUrl + '/api/v1/vehicle/' + vehicleId,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ isImpounded: value }),
      success: function () {
        notify(impound ? COPY.impounded : COPY.released, 'success');
        if (done) done();
      },
      error: function () {
        notify(COPY.failed, 'error');
      },
    });
  }

  /** The action's label for a vehicle in its current state. */
  function actionLabel(vehicle) {
    return window.VehicleFlags.impounded(vehicle) ? COPY.release : COPY.impound;
  }

  var VehicleImpound = {
    COPY: COPY,
    set: set,
    notify: notify,
    actionLabel: actionLabel,
  };

  window.VehicleImpound = VehicleImpound;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VehicleImpound;
  }
})(typeof window !== 'undefined' ? window : globalThis);
