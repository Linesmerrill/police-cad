/**
 * Admin balance adjustment: parsing and formatting.
 *
 * Kept out of the modal's inline script so the part that turns what an admin
 * typed into an amount of money can be unit tested. Money is the one place a
 * lenient parser is dangerous: "1,000" read as 1 or "10.505" rounded the wrong
 * way changes someone's balance, so anything ambiguous is refused, not guessed.
 */
(function (window) {
  var BalanceAdjust = {
    /**
     * Read a dollar amount into whole cents. Accepts "250", "250.5", "250.50",
     * "1,200", "$1,200.00". The sign comes from the add/remove toggle, never
     * from the text, so a typed "-" is rejected rather than silently flipping
     * the direction the admin chose.
     *
     * @param {string|number} text
     * @returns {number|null} positive cents, or null if unparseable or zero
     */
    parseCents: function (text) {
      if (typeof text !== 'string' && typeof text !== 'number') return null;
      var s = String(text).trim().replace(/[$,\s]/g, '');
      if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
      var cents = Math.round(parseFloat(s) * 100);
      if (!isFinite(cents) || cents <= 0) return null;
      return cents;
    },

    /**
     * Signed cents for the API: positive adds money, negative removes it.
     *
     * @param {number} cents positive cents from parseCents
     * @param {'add'|'remove'} direction
     * @returns {number|null}
     */
    signed: function (cents, direction) {
      if (typeof cents !== 'number' || !isFinite(cents) || cents <= 0) return null;
      if (direction === 'remove') return -cents;
      if (direction === 'add') return cents;
      return null;
    },

    /** The most one adjustment can move, matching the API's adjustBalanceMaxCents. */
    MAX_CENTS: 10000000000,

    /**
     * Validate a typed amount, telling "not an amount" apart from "too large" so
     * the message says what is actually wrong. The API enforces the same cap;
     * this stops a mistyped 4000000000 before it is sent.
     *
     * @returns {{ok:true, cents:number} | {ok:false, message:string}}
     */
    validateAmount: function (text) {
      var cents = BalanceAdjust.parseCents(text);
      if (cents === null) {
        return { ok: false, message: 'Enter an amount greater than zero, like 250 or 250.50.' };
      }
      if (cents > BalanceAdjust.MAX_CENTS) {
        return {
          ok: false,
          message: 'The most you can adjust in one go is ' + BalanceAdjust.formatCents(BalanceAdjust.MAX_CENTS) + '.',
        };
      }
      return { ok: true, cents: cents };
    },

    /** Render cents as dollars with thousands separators. */
    formatCents: function (cents) {
      var n = Math.round(Number(cents) || 0);
      var neg = n < 0;
      var abs = Math.abs(n);
      var dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      var rem = String(abs % 100);
      if (rem.length < 2) rem = '0' + rem;
      return (neg ? '-' : '') + '$' + dollars + '.' + rem;
    },
  };

  window.BalanceAdjust = BalanceAdjust;

  // Also usable from the unit harness.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BalanceAdjust;
  }
})(typeof window !== 'undefined' ? window : globalThis);
