const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Custom departments are not being built, so the template, its "Coming Soon"
// notices and the "Custom departments" plan perk are gone from every surface.
// These tests fail if any of it comes back, and they check the two web template
// pickers still offer the same departments as each other.

const ROOT = path.join(__dirname, "..");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

/** The template names in a `name: "X"` / `name: 'X'` list, in order. */
function templateNames(source, arrayStart) {
  const start = source.indexOf(arrayStart);
  assert.notStrictEqual(start, -1, `could not find ${arrayStart}`);
  const end = source.slice(start).search(/\n\s*\];/);
  assert.notStrictEqual(end, -1, "could not find the end of the template list");
  const body = source.slice(start, start + end);
  return [...body.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** The permission keys a named template grants, in order. */
function permissionKeys(source, arrayStart, templateName) {
  const start = source.indexOf(arrayStart);
  const body = source.slice(start, start + source.slice(start).search(/\n\s*\];/));
  const at = body.indexOf(`name: "${templateName}"`);
  assert.notStrictEqual(at, -1, `${templateName} is not in the list`);
  // Up to the next template, or the end of the list.
  const nextNames = [...body.slice(at + 1).matchAll(/name:\s*"[^"]+"/g)];
  const until = nextNames.length ? at + 1 + nextNames[0].index : body.length;
  return [...body.slice(at, until).matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]);
}

const DEPARTMENTS = "views/departments.ejs";
const MODALS = "views/partials/community-details-modals.ejs";

describe("custom departments are gone", function () {
  describe("the Departments page template picker", function () {
    const source = read(DEPARTMENTS);

    it("does not offer a Custom template", function () {
      assert.ok(!templateNames(source, "const templates = [").includes("Custom"));
    });

    it("has no Custom-only disabled button left behind", function () {
      assert.ok(
        !/template\.name\s*===\s*'Custom'/.test(source),
        "a Custom-only branch is still deciding whether a template can be selected"
      );
    });

    it("offers the Judicial template the community modal has", function () {
      assert.ok(templateNames(source, "const templates = [").includes("Judicial"));
    });

    it("grants Judicial the same permissions as the community modal", function () {
      assert.deepStrictEqual(
        permissionKeys(source, "const templates = [", "Judicial"),
        permissionKeys(read(MODALS), "let createDeptTemplates = [", "Judicial")
      );
    });
  });

  describe("the community details template picker", function () {
    const source = read(MODALS);

    it("does not offer a Custom template", function () {
      assert.ok(!templateNames(source, "let createDeptTemplates = [").includes("Custom"));
    });

    it("has no Coming Soon button for a template", function () {
      assert.ok(
        !/template\.name\s*===\s*'Custom'/.test(source),
        "a Custom-only branch is still rendering a Coming Soon button"
      );
    });

    it("still renders a Select button for every template", function () {
      assert.ok(/selectCreateDeptTemplate\('\$\{template\.name\}'\)/.test(source));
    });
  });

  it("offers the same departments on both web pickers", function () {
    // The two lists drifted before: the modal had Judicial and the page did not.
    assert.deepStrictEqual(
      templateNames(read(DEPARTMENTS), "const templates = ["),
      templateNames(read(MODALS), "let createDeptTemplates = [")
    );
  });

  it("mentions custom departments nowhere the site serves", function () {
    // Walks the served trees rather than naming files, so a new page that
    // promises custom departments is caught too.
    const banned = /custom departments?|custom templates?|custom components|aside from the default we give you/i;
    const roots = ["views", "app", "components", "public/js", "lib", "constants"];
    const extensions = new Set([".ejs", ".js", ".jsx", ".ts", ".tsx", ".html", ".md"]);
    const hits = [];

    function walk(dir) {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const relative = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
          walk(relative);
          continue;
        }
        if (!extensions.has(path.extname(entry.name))) continue;
        const source = fs.readFileSync(path.join(ROOT, relative), "utf8");
        source.split("\n").forEach(function (line, i) {
          // "custom rank requirements" and custom dispatch tones are unrelated
          // and stay.
          if (banned.test(line)) hits.push(`${relative}:${i + 1}: ${line.trim().slice(0, 140)}`);
        });
      }
    }

    roots.filter((d) => fs.existsSync(path.join(ROOT, d))).forEach(walk);
    assert.deepStrictEqual(hits, []);
  });
});
