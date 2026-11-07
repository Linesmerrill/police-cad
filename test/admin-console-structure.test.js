const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

/**
 * Structural guard for views/admin-console.ejs.
 *
 * The file is 15,000 lines with one enormous inline <script>, so it gets edited
 * by scripted search-and-replace. A splice with its boundaries the wrong way
 * round silently duplicated about 1,100 lines of it during this change: the EJS
 * still compiled, the JS still parsed (duplicate function declarations are
 * legal), and the console still worked, because the later copy of each function
 * just shadowed the earlier one. Nothing in the suite noticed.
 *
 * These tests notice.
 */
const CONSOLE_VIEW = path.join(__dirname, "..", "views", "admin-console.ejs");

// escapeHtml genuinely appears twice and predates this guard. Anything else
// appearing twice means a block got duplicated — or that two different pieces
// of the console are quietly fighting over one name, which is the same bug the
// duplication caused.
const KNOWN_DUPLICATES = new Set(["escapeHtml"]);

function topLevelFunctionNames(source) {
  // The console declares its functions at exactly six spaces of indentation.
  // Matching on that is what keeps nested helpers out of the count.
  return [...source.matchAll(/^ {6}function ([A-Za-z0-9_$]+)\s*\(/gm)].map((m) => m[1]);
}

describe("admin-console.ejs structure", function () {
  let source;

  before(function () {
    source = fs.readFileSync(CONSOLE_VIEW, "utf8");
  });

  it("declares each top-level function exactly once", function () {
    const counts = new Map();
    for (const name of topLevelFunctionNames(source)) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    const duplicated = [...counts.entries()]
      .filter(([name, n]) => n > 1 && !KNOWN_DUPLICATES.has(name))
      .map(([name, n]) => `${name} (${n}x)`);

    assert.deepStrictEqual(
      duplicated,
      [],
      "duplicated function declarations — a later copy shadows the earlier one, " +
        "so the console runs whichever came last: " +
        duplicated.join(", ")
    );
  });

  it("still compiles as a template", function () {
    assert.doesNotThrow(function () {
      ejs.compile(source, { filename: CONSOLE_VIEW });
    });
  });

  it("offers no way for staff to set or see a member's password", function () {
    // Part of the same change: staff can only send a reset link the member
    // uses. If a temp-password or set-password control comes back, this fails.
    assert.ok(
      !/tempPassword/.test(source),
      "the console must not handle a member's temporary password"
    );
    assert.ok(
      !/reset-user-password|emergency-reset-password|diagnose-user-password/.test(source),
      "the console must not call the removed plaintext-password routes"
    );
  });

  it("sends reset emails through our own admin-gated route", function () {
    // Not the API directly (it needs the gateway secret) and not the website's
    // /forgot-password (which 302s to a 200 whether the mail sent or not).
    assert.ok(
      source.includes("/admin/api/users/${encodeURIComponent(userId)}/reset-password"),
      "the reset send should post to the admin-gated proxy route"
    );
    const resetFn = source.slice(
      source.indexOf("function initiateUserPasswordReset"),
      source.indexOf("function formatPasswordHelpDate")
    );
    assert.ok(
      !resetFn.includes("/forgot-password"),
      "the reset send must not go back through /forgot-password"
    );
  });
});
