/**
 * Calendar dates that carry no time of day: a date of birth, an issue date,
 * an expiry.
 *
 * The API stores these as plain strings, usually "1998-03-15" but sometimes a
 * full ISO instant such as "1998-03-15T00:00:00Z". Either one handed to
 * `new Date(...)` is read as UTC midnight, so a local formatter renders it as
 * the 14th for every viewer behind UTC. That is the long-standing "my members'
 * birthdays are off by one" report.
 *
 * Nobody's birthday moves when they change timezone, so these never become an
 * instant at all here. The string is read as year, month and day, and rendered
 * from those three numbers.
 *
 * window.dateOnly.format('1998-03-15T00:00:00Z')  -> 'Mar 15, 1998'
 * window.dateOnly.age('1998-03-15')               -> '28'
 * window.dateOnly.toInputValue('03/15/1998')      -> '1998-03-15'
 */
(function (global) {
  var MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  var MONTHS_LONG = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function daysInMonth(year, month) {
    return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Reads the calendar date out of a stored value. Handles the two shapes the
   * API actually returns — "YYYY-MM-DD" (optionally with a time part that is
   * ignored) and "MM/DD/YYYY", which arrest reports use. Returns null for
   * anything else, including the empty string and the 1970 epoch placeholder
   * that older records carry instead of a real date.
   */
  function parse(raw) {
    if (!raw) return null;
    if (typeof raw === 'object' && typeof raw.toISOString === 'function') {
      // A real Date, from code that already built one. Read it back in UTC,
      // which is the calendar day it was constructed from.
      if (isNaN(raw.getTime())) return null;
      return check({
        year: raw.getUTCFullYear(),
        month: raw.getUTCMonth() + 1,
        day: raw.getUTCDate()
      });
    }

    var text = String(raw).trim();
    var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    if (iso) {
      return check({ year: +iso[1], month: +iso[2], day: +iso[3] });
    }
    var slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (slashed) {
      return check({ year: +slashed[3], month: +slashed[1], day: +slashed[2] });
    }
    return null;
  }

  function check(parts) {
    if (parts.year <= 1970) return null;
    if (parts.month < 1 || parts.month > 12) return null;
    if (parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) return null;
    return parts;
  }

  /**
   * 'Mar 15, 1998'. Pass { month: 'long' } for 'March 15, 1998'.
   * Unparseable values come back as the fallback, 'N/A' unless given.
   */
  function format(raw, options) {
    var parts = parse(raw);
    if (!parts) return (options && 'fallback' in options) ? options.fallback : 'N/A';
    var names = (options && options.month === 'long') ? MONTHS_LONG : MONTHS_SHORT;
    return names[parts.month - 1] + ' ' + parts.day + ', ' + parts.year;
  }

  /**
   * Whole years between the date and today, counted on the calendar rather than
   * in elapsed milliseconds, so a birthday turns over on the day it reads.
   * Returns '' when there is no usable date.
   */
  function age(raw) {
    var parts = parse(raw);
    if (!parts) return '';
    var now = new Date();
    var years = now.getFullYear() - parts.year;
    var month = (now.getMonth() + 1) - parts.month;
    if (month < 0 || (month === 0 && now.getDate() < parts.day)) years--;
    return years > 0 ? String(years) : '';
  }

  /** 'YYYY-MM-DD', the value an <input type="date"> expects. */
  function toInputValue(raw) {
    var parts = parse(raw);
    if (!parts) return '';
    return parts.year + '-' + pad(parts.month) + '-' + pad(parts.day);
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  var dateOnly = { parse: parse, format: format, age: age, toInputValue: toInputValue };
  global.dateOnly = dateOnly;

  // Also usable from the unit harness.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = dateOnly;
  }
})(typeof window !== 'undefined' ? window : globalThis);
