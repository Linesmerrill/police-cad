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

  describe('the "Reset a User\'s Password" wiki article', function () {
    // Standing rule: an admin change updates the admin docs in the same PR.
    // These assertions are what "up to date" means for this article, so a
    // future change to the reset flow that forgets the Wiki fails here.
    let article;

    before(function () {
      const source = fs.readFileSync(CONSOLE_VIEW, "utf8");
      const start = source.indexOf('<div class="aw-subsection" id="reset-password">');
      assert.notStrictEqual(start, -1, "the reset-password article is missing");
      const end = source.indexOf("<!-- Reactivate Account -->", start);
      assert.notStrictEqual(end, -1, "could not find the end of the article");
      article = source.slice(start, end);
    });

    it("documents the three password-help fields", function () {
      for (const field of ["Last password change", "Last reset email", "Delivery status"]) {
        assert.ok(article.includes(field), `the article should document "${field}"`);
      }
    });

    it("documents all five delivery labels", function () {
      for (const label of ["Delivered", "Blocked", "Bounced", "Delayed", "Unknown"]) {
        assert.ok(article.includes(label), `the article should document "${label}"`);
      }
    });

    it("shows both toasts staff will actually see", function () {
      assert.ok(article.includes("Reset email sent."), "the success toast is missing");
      assert.ok(
        article.includes("Couldn't send the reset email."),
        "the error toast is missing"
      );
    });

    it("uses the renamed button, not the old one", function () {
      assert.ok(article.includes("Send reset email"));
      assert.ok(
        !/>\s*Reset Password\s*</.test(article),
        "the article should not still name a 'Reset Password' button"
      );
    });

    it("renders the toast samples inline, not fixed to the viewport", function () {
      // showToast() positions the real ones; a sample must sit in the page.
      const toasts = article.slice(article.indexOf("Sample: Toasts"));
      assert.ok(!/position\s*:\s*fixed/.test(toasts), "a sample toast is position:fixed");
      // Same colors and icons as showToast(), so the sample is recognizable.
      assert.ok(toasts.includes("#d4edda") && toasts.includes("#155724"));
      assert.ok(toasts.includes("#f8d7da") && toasts.includes("#721c24"));
      assert.ok(toasts.includes("fa-check-circle") && toasts.includes("fa-exclamation-circle"));
    });

    it("contains no em dash", function () {
      assert.ok(!/\u2014/.test(article), "the article contains a literal em dash");
      assert.ok(!article.includes("&mdash;"), "the article contains an &mdash; entity");
    });

    it("reuses the existing wiki components", function () {
      for (const cls of [
        "aw-subsection-title",
        "aw-text",
        "aw-steps",
        "aw-step-number",
        "aw-tip-icon",
        "aw-sample-box",
        "aw-sample-label",
        "aw-detail-row",
        "aw-detail-label",
        "aw-detail-value",
      ]) {
        assert.ok(article.includes(cls), `the article should use ${cls}`);
      }
    });

    it("is reachable from the nav, and findable by what it now covers", function () {
      // filterAdminWiki matches link.textContent, which includes display:none
      // text, so hidden terms make the article findable without renaming it.
      const source = fs.readFileSync(CONSOLE_VIEW, "utf8");
      const link = source.match(
        /<a class="aw-nav-link" href="#reset-password">([\s\S]*?)<\/a>/
      );
      assert.ok(link, "the reset-password nav link is missing");

      const textContent = link[1].replace(/<[^>]*>/g, "");
      assert.ok(
        textContent.startsWith("Reset Password"),
        `the link should still read "Reset Password", got "${textContent}"`
      );
      for (const term of ["reset email", "delivery status", "last password change"]) {
        assert.ok(
          textContent.toLowerCase().includes(term),
          `searching the wiki for "${term}" should find this article`
        );
      }
      assert.ok(
        /<span style="display:none;">/.test(link[1]),
        "the extra search terms should be hidden, not shown in the nav"
      );
    });
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
