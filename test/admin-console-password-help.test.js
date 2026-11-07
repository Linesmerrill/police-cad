const assert = require("assert");
const fs = require("fs");
const path = require("path");

/**
 * The password-help fields in the admin console, run against a value that
 * contains HTML.
 *
 * These fields show a date and a staff name. The staff name is free text an
 * admin typed into their own account and the dates come back from the API, so
 * none of it is markup — but the console's detail view is one enormous
 * template string handed to .html(), and dropping a value into it is the
 * easiest mistake in the file to make. So the test does not check that the
 * values are *escaped*; it checks they never reach an HTML sink at all.
 *
 * The functions live inside views/admin-console.ejs, so they are lifted out of
 * the source and run here against a jQuery stub that records which method each
 * selector was written with.
 */
const CONSOLE_VIEW = path.join(__dirname, "..", "views", "admin-console.ejs");

const XSS = '<img src=x onerror="alert(1)">';

function slice(source, startMark, endMark) {
  const a = source.indexOf(startMark);
  assert.notStrictEqual(a, -1, `missing marker: ${startMark}`);
  const b = source.indexOf(endMark, a + startMark.length);
  assert.notStrictEqual(b, -1, `missing end marker: ${endMark}`);
  return source.slice(a, b);
}

/**
 * Lift the formatters and setPasswordHelpFields out of the view and give them
 * a $ that records writes instead of touching a DOM.
 */
function loadPasswordHelp() {
  const source = fs.readFileSync(CONSOLE_VIEW, "utf8");
  const code =
    slice(source, "      function formatPasswordResetStatus(", "      function displayUserResultsPage(") +
    slice(source, "      // formatPasswordHelpDate renders a stored timestamp", "      // loadUserPasswordHelp fetches the facts") +
    slice(source, "      // passwordHelpDetails flattens the two shapes", "      // Community Actions");

  // writes[selector] = [{ method, value }, ...]
  const writes = {};
  function record(selector, method, value) {
    (writes[selector] = writes[selector] || []).push({ method, value });
  }
  const $ = (selector) => ({
    text: (value) => record(selector, "text", value),
    html: (value) => record(selector, "html", value),
  });

  const api = new Function(
    "$",
    `${code}
     return {
       formatPasswordHelpDate,
       formatPasswordChangedAt,
       formatLastResetEmail,
       setPasswordHelpFields,
       passwordHelpDetails,
     };`
  )($);
  return { ...api, writes };
}

function writesFor(writes, prefix) {
  const key = Object.keys(writes).find((k) => k.includes(prefix));
  assert.ok(key, `nothing was written to a ${prefix} selector`);
  return writes[key];
}

describe("admin console password help", function () {
  describe("formatLastResetEmail", function () {
    it("produces plain text, not markup", function () {
      const { formatLastResetEmail } = loadPasswordHelp();
      const out = formatLastResetEmail("2026-11-01T14:05:00Z", "Dana Reed");
      assert.ok(out.includes("by Dana Reed"));
      assert.ok(!/[<>&]/.test(out), `expected no markup or entities, got ${out}`);
    });

    it("passes a staff name containing HTML through untouched", function () {
      // Untouched is correct *because* the only sink is .text(). If someone
      // later routes this through .html(), the sink tests below fail.
      const { formatLastResetEmail } = loadPasswordHelp();
      const out = formatLastResetEmail("2026-11-01T14:05:00Z", XSS);
      assert.ok(out.endsWith(`by ${XSS}`), out);
    });

    it("attributes a self-service reset to the member", function () {
      const { formatLastResetEmail } = loadPasswordHelp();
      assert.ok(formatLastResetEmail("2026-11-01T14:05:00Z", "").endsWith("by Member"));
      assert.ok(formatLastResetEmail("2026-11-01T14:05:00Z", null).endsWith("by Member"));
    });

    it("says Never recorded with no timestamp", function () {
      const { formatLastResetEmail } = loadPasswordHelp();
      assert.strictEqual(formatLastResetEmail(null, "Dana Reed"), "Never recorded");
      assert.strictEqual(formatLastResetEmail(undefined, undefined), "Never recorded");
      assert.strictEqual(formatLastResetEmail("not a date", "Dana Reed"), "Never recorded");
    });
  });

  describe("formatPasswordChangedAt", function () {
    it("says Never recorded when empty, which is every existing account", function () {
      const { formatPasswordChangedAt } = loadPasswordHelp();
      assert.strictEqual(formatPasswordChangedAt(null), "Never recorded");
      assert.strictEqual(formatPasswordChangedAt(undefined), "Never recorded");
      assert.strictEqual(formatPasswordChangedAt(""), "Never recorded");
    });

    it("renders a timestamp, including the extended-JSON shape", function () {
      const { formatPasswordChangedAt } = loadPasswordHelp();
      assert.ok(formatPasswordChangedAt("2026-03-02T09:30:00Z").includes("2026"));
      assert.ok(formatPasswordChangedAt({ $date: "2026-03-02T09:30:00Z" }).includes("2026"));
    });

    it("never returns markup, whatever it is handed", function () {
      const { formatPasswordChangedAt } = loadPasswordHelp();
      assert.strictEqual(formatPasswordChangedAt(XSS), "Never recorded");
      assert.strictEqual(formatPasswordChangedAt({ $date: XSS }), "Never recorded");
    });
  });

  describe("setPasswordHelpFields", function () {
    it("writes both new values with .text(), never .html()", function () {
      const { setPasswordHelpFields, writes } = loadPasswordHelp();
      setPasswordHelpFields("507f1f77bcf86cd799439021", {
        passwordChangedAt: "2026-03-02T09:30:00Z",
        lastResetEmailAt: "2026-11-01T14:05:00Z",
        lastResetEmailBy: XSS,
      });

      for (const field of ["password-changed-", "last-reset-email-"]) {
        const calls = writesFor(writes, field);
        assert.strictEqual(calls.length, 1, `${field} should be written once`);
        assert.strictEqual(
          calls[0].method,
          "text",
          `${field} must be written with .text() — .html() would parse a staff name as markup`
        );
      }
    });

    it("hands the raw staff name to .text(), so the browser shows it literally", function () {
      const { setPasswordHelpFields, writes } = loadPasswordHelp();
      setPasswordHelpFields("abc", {
        lastResetEmailAt: "2026-11-01T14:05:00Z",
        lastResetEmailBy: XSS,
      });
      const call = writesFor(writes, "last-reset-email-")[0];
      assert.strictEqual(call.method, "text");
      assert.ok(call.value.endsWith(`by ${XSS}`), call.value);
    });

    it("tolerates missing details without writing markup", function () {
      const { setPasswordHelpFields, writes } = loadPasswordHelp();
      setPasswordHelpFields("abc", undefined);
      assert.strictEqual(writesFor(writes, "password-changed-")[0].value, "Never recorded");
      assert.strictEqual(writesFor(writes, "last-reset-email-")[0].value, "Never recorded");
    });
  });

  describe("passwordHelpDetails", function () {
    it("reads the nested and the flat shape the admin API can return", function () {
      const { passwordHelpDetails } = loadPasswordHelp();
      assert.strictEqual(
        passwordHelpDetails({ user: { lastResetEmailBy: "Dana Reed" } }).lastResetEmailBy,
        "Dana Reed"
      );
      assert.strictEqual(
        passwordHelpDetails({ lastResetEmailBy: "Dana Reed" }).lastResetEmailBy,
        "Dana Reed"
      );
    });

    it("survives a missing user", function () {
      const { passwordHelpDetails } = loadPasswordHelp();
      assert.deepStrictEqual(passwordHelpDetails(undefined), {
        resetPasswordExpires: undefined,
        passwordChangedAt: undefined,
        lastResetEmailAt: undefined,
        lastResetEmailBy: undefined,
      });
    });
  });

  describe("the view itself", function () {
    it("keeps the new values out of every .html() sink", function () {
      // The source-level backstop: whatever the functions do, neither value
      // may appear inside an .html() call or in a template string that one
      // parses. Both detail surfaces render empty placeholders instead.
      const source = fs.readFileSync(CONSOLE_VIEW, "utf8");
      const offenders = source
        .split("\n")
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(
          ({ line }) =>
            /formatLastResetEmail|formatPasswordChangedAt/.test(line) && /\.html\(/.test(line)
        );
      assert.deepStrictEqual(
        offenders.map((o) => `${o.n}: ${o.line.trim()}`),
        [],
        "a password-help value reached an .html() sink"
      );
    });

    it("renders the detail-modal rows as empty placeholders", function () {
      const source = fs.readFileSync(CONSOLE_VIEW, "utf8");
      assert.ok(
        source.includes('<div class="info-value password-changed-${passwordHelpUserId}"></div>'),
        "the modal's last-password-change row should be an empty placeholder"
      );
      assert.ok(
        source.includes('<div class="info-value last-reset-email-${passwordHelpUserId}"></div>'),
        "the modal's last-reset-email row should be an empty placeholder"
      );
    });
  });
});
