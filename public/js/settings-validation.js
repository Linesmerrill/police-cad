/**
 * Validation for the numeric economy and court settings.
 *
 * The ranges are kept identical to the API bounds (police-cad-api:
 * communityEconomyPatchBounds, departmentPatchBounds, and the court processing
 * validator) and to the mobile app's utils/settingsValidation.js. Change all
 * three together.
 *
 * The API is the real enforcement. This exists so an owner sees what is wrong on
 * the field itself, instead of a generic "Save failed". It never substitutes a
 * value: the settings page used to turn a typed 0 into 3, and a typed 5-second
 * AFK grace into 60, without a word.
 */
(function (window) {
  var RULES = {
    // Community
    defaultStartingBalance:   { kind: 'money', min: 0,   max: 1000000000,  label: 'Default starting balance' },
    defaultDueDays:           { kind: 'int',   min: 1,   max: 365,   unit: 'days',    label: 'Default due days' },
    contestExtensionDays:     { kind: 'int',   min: 1,   max: 365,   unit: 'days',    label: 'Contest extension' },
    maxTransferCents:         { kind: 'money', min: 100, max: 10000000000, allowZero: true, label: 'Maximum single transfer' },
    // Courts
    respondDays:              { kind: 'int',   min: 1,   max: 365,   unit: 'days',    label: 'Response window' },
    // Department
    basePayPerHour:           { kind: 'money', min: 0,   max: 1000000000,  label: 'Base pay' },
    maxSessionMinutes:        { kind: 'int',   min: 1,   max: 10080, unit: 'minutes', label: 'Max session' },
    afkPromptIntervalSeconds: { kind: 'int',   min: 30,  max: 86400, unit: 'seconds', label: 'AFK prompt interval' },
    afkGraceSeconds:          { kind: 'int',   min: 10,  max: 86400, unit: 'seconds', label: 'AFK grace' },
  };

  function groupDigits(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function dollars(cents) {
    var whole = Math.floor(cents / 100);
    var rem = cents % 100;
    return '$' + groupDigits(whole) + (rem ? '.' + (rem < 10 ? '0' : '') + rem : '');
  }

  function rangeText(rule) {
    if (rule.kind === 'int') {
      return ' from ' + groupDigits(rule.min) + ' to ' + groupDigits(rule.max) + (rule.unit ? ' ' + rule.unit : '');
    }
    var text = ' from ' + dollars(rule.min) + ' to ' + dollars(rule.max);
    return rule.allowZero ? text + ', or 0 to use the default' : text;
  }

  /**
   * Validate one field.
   *
   * @param {string} ruleKey a key of RULES
   * @param {string} raw what the owner typed
   * @returns {{ok:true, value:number} | {ok:false, message:string}}
   *          ints come back as-is, money comes back in cents
   */
  function validate(ruleKey, raw) {
    var rule = RULES[ruleKey];
    if (!rule) return { ok: false, message: 'Unknown field.' };

    var s = raw === null || raw === undefined ? '' : String(raw).trim();
    if (s === '') return { ok: false, message: 'Enter a value' + rangeText(rule) + '.' };

    if (rule.kind === 'int') {
      if (!/^-?\d+$/.test(s)) {
        return { ok: false, message: 'Enter a whole number' + rangeText(rule) + '.' };
      }
      var n = parseInt(s, 10);
      if (n < rule.min || n > rule.max) {
        return { ok: false, message: 'Enter a whole number' + rangeText(rule) + '.' };
      }
      return { ok: true, value: n };
    }

    // Money: dollars in, cents out.
    var m = s.replace(/[$,\s]/g, '');
    if (!/^-?\d+(\.\d{1,2})?$/.test(m)) {
      return { ok: false, message: 'Enter an amount' + rangeText(rule) + ', with at most two decimal places.' };
    }
    var cents = Math.round(parseFloat(m) * 100);
    if (rule.allowZero && cents === 0) return { ok: true, value: 0 };
    if (!isFinite(cents) || cents < rule.min || cents > rule.max) {
      return { ok: false, message: 'Enter an amount' + rangeText(rule) + '.' };
    }
    return { ok: true, value: cents };
  }

  var SettingsValidation = { RULES: RULES, validate: validate };
  window.SettingsValidation = SettingsValidation;

  // Also usable from the unit harness.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsValidation;
  }
})(typeof window !== 'undefined' ? window : globalThis);
