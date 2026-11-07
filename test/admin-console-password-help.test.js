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
    slice(source, "      // formatPasswordHelpDate renders a stored timestamp", "      // loadDeliveryStatus asks our own server") +
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
       setDeliveryStatus,
       DELIVERY_LABELS,
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
        passwordChangedAt: undefined,
        lastResetEmailAt: undefined,
        lastResetEmailBy: undefined,
      });
    });
  });

  describe("setDeliveryStatus", function () {
    it("writes the label and the reason with .text(), never .html()", function () {
      const { setDeliveryStatus, writes } = loadPasswordHelp();
      setDeliveryStatus("507f1f77bcf86cd799439021", {
        label: "Blocked",
        reason: '550 5.7.1 blocked <img src=x onerror="alert(1)">',
      });

      for (const field of ["delivery-status-", "delivery-reason-"]) {
        const calls = writesFor(writes, field);
        assert.strictEqual(calls.length, 1, `${field} should be written once`);
        assert.strictEqual(
          calls[0].method,
          "text",
          `${field} must be written with .text() — the reason is an SMTP ` +
            "rejection string from someone else's server"
        );
      }
    });

    it("hands the raw reason to .text(), so the browser shows it literally", function () {
      const { setDeliveryStatus, writes } = loadPasswordHelp();
      const injected = '<img src=x onerror="alert(1)">';
      setDeliveryStatus("abc", { label: "Bounced", reason: injected });
      const call = writesFor(writes, "delivery-reason-")[0];
      assert.strictEqual(call.method, "text");
      assert.strictEqual(call.value, injected);
    });

    it("renders only the five known labels", function () {
      const { setDeliveryStatus, DELIVERY_LABELS, writes } = loadPasswordHelp();
      assert.deepStrictEqual(DELIVERY_LABELS, [
        "Delivered",
        "Blocked",
        "Bounced",
        "Delayed",
        "Unknown",
      ]);
      setDeliveryStatus("abc", { label: '<b>Delivered</b>', reason: "x" });
      assert.strictEqual(writesFor(writes, "delivery-status-")[0].value, "Unknown");
      assert.strictEqual(writesFor(writes, "delivery-reason-")[0].value, "");
    });

    it("shows Unknown with no reason for anything missing or malformed", function () {
      for (const status of [null, undefined, {}, { label: "Exploded" }, { label: "delivered" }]) {
        const { setDeliveryStatus, writes } = loadPasswordHelp();
        setDeliveryStatus("abc", status);
        assert.strictEqual(
          writesFor(writes, "delivery-status-")[0].value,
          "Unknown",
          `status ${JSON.stringify(status)}`
        );
        assert.strictEqual(writesFor(writes, "delivery-reason-")[0].value, "");
      }
    });

    it("drops a non-string reason rather than stringifying it", function () {
      const { setDeliveryStatus, writes } = loadPasswordHelp();
      setDeliveryStatus("abc", { label: "Bounced", reason: { $ne: null } });
      assert.strictEqual(writesFor(writes, "delivery-reason-")[0].value, "");
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
            /formatLastResetEmail|formatPasswordChangedAt|delivery-status-|delivery-reason-/.test(
              line
            ) && /\.html\(/.test(line)
        );
      assert.deepStrictEqual(
        offenders.map((o) => `${o.n}: ${o.line.trim()}`),
        [],
        "a password-help value reached an .html() sink"
      );
    });

    it("asks for delivery status from the modal only, not once per search result", function () {
      // displayUserResultsPage renders a page of cards and fetches per row.
      // A delivery lookup there would mean a SendGrid round trip per result.
      const source = fs.readFileSync(CONSOLE_VIEW, "utf8");
      const cards = slice(
        source,
        "      function displayUserResultsPage(",
        "      // Pending User pagination functions"
      );
      assert.ok(
        !/loadDeliveryStatus|delivery-status-|delivery-reason-/.test(cards),
        "the search results must not request delivery status per row"
      );

      const modal = slice(
        source,
        "      function displayUserDetails(user) {",
        "      function deactivateUserAccount"
      );
      assert.ok(
        /loadDeliveryStatus\(passwordHelpUserId\)/.test(modal),
        "the detail modal should request delivery status once"
      );
    });

    it("no longer carries the old Password Reset Status card", function () {
      // It read user.resetPasswordExpires, which is cleared the moment a reset
      // is used, so it reported "Never requested" for members who had just
      // reset successfully. Checked against a real account: the reset email
      // went out at 21:08 and the password changed at 21:11, by which point
      // resetPasswordExpires was gone and the card would have said the member
      // had never asked. "Last reset email" says it correctly and keeps saying
      // it, so the card was a wrong duplicate.
      // Comments are allowed to name the thing that was removed and why, so
      // the guard looks at code and markup only.
      const code = fs
        .readFileSync(CONSOLE_VIEW, "utf8")
        .split("\n")
        .filter((line) => !/^\s*\/\//.test(line))
        .join("\n");
      assert.ok(!/function formatPasswordResetStatus/.test(code),
        "the helper should be gone");
      assert.ok(!/Password Reset Status</.test(code),
        "the card's label should be gone from the markup");
      assert.ok(!/reset-status-\$\{/.test(code),
        "nothing should still write to the card's per-user class");
      assert.ok(!/Never requested/.test(code),
        "the card's empty state should be gone");
    });

    it("keeps the two rows that replaced it", function () {
      const source = fs.readFileSync(CONSOLE_VIEW, "utf8");
      assert.ok(source.includes("Last password change"));
      assert.ok(source.includes("Last reset email"));
      assert.ok(source.includes("password-changed-${user.id}"));
      assert.ok(source.includes("last-reset-email-${user.id}"));
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
      assert.ok(
        source.includes('<div class="info-value delivery-status-${passwordHelpUserId}"></div>'),
        "the modal's delivery-status row should be an empty placeholder"
      );
    });
  });
});
