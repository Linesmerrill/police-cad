var assert = require("assert");
var fs = require("fs");
var path = require("path");
var ejs = require("ejs");

var VIEWS = path.join(__dirname, "..", "views");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce(function (acc, e) {
    var full = path.join(dir, e.name);
    if (e.isDirectory()) return acc.concat(walk(full));
    return e.name.endsWith(".ejs") ? acc.concat([full]) : acc;
  }, []);
}

/*
 * Every view has to compile. This is cheap (no data, no server, no browser) and
 * it guards the one thing that silently breaks the whole legacy site: a
 * template the installed EJS cannot parse renders a 500 before any route logic
 * runs.
 *
 * It exists because of PR #974, an automated CVE bump from EJS 2 to 3. EJS 3
 * removed the legacy `<% include foo %>` form, which 45 views were still using
 * — every dashboard, every login and signup page. Nothing in the unit suite
 * would have caught it. Run this against a candidate EJS version and you get
 * the answer in a second.
 */
describe("ejs views", function () {
  var files = walk(VIEWS);

  it("finds the view templates", function () {
    assert.ok(files.length > 50, "expected to find the view templates, got " + files.length);
  });

  it("compiles every view under the installed EJS", function () {
    var broken = [];
    files.forEach(function (file) {
      try {
        ejs.compile(fs.readFileSync(file, "utf8"), { filename: file });
      } catch (err) {
        broken.push(path.relative(VIEWS, file) + ": " + String(err.message).split("\n")[0]);
      }
    });
    assert.deepEqual(broken, [], "views failed to compile:\n  " + broken.join("\n  "));
  });

  /*
   * The legacy form works on EJS 2 and throws on EJS 3, so it compiles clean
   * today and would take the site down on upgrade. Ban it outright rather than
   * waiting for the next bump to rediscover it.
   */
  it("uses no legacy `<% include foo %>` syntax, which EJS 3 removed", function () {
    var legacy = /<%-?\s*include\s+[^%(]/;
    var offenders = files.filter(function (file) {
      return legacy.test(fs.readFileSync(file, "utf8"));
    }).map(function (file) {
      return path.relative(VIEWS, file);
    });
    assert.deepEqual(
      offenders,
      [],
      "use <%- include('name') %> instead:\n  " + offenders.join("\n  ")
    );
  });

  /*
   * Every include() path resolves relative to the file that CONTAINS it.
   *
   * This one is easy to get wrong and compiles clean: while a partial was
   * inlined by the legacy form it inherited the parent's directory, so a path
   * written from the parent's perspective worked. Compiled separately it does
   * not. community-details-modals.ejs had exactly this — include('partials/
   * manage-ranks') from inside views/partials/, which only ever resolved
   * because it was being inlined into a file in views/.
   */
  it("resolves every include() path relative to its own file", function () {
    var unresolved = [];
    files.forEach(function (file) {
      var src = fs.readFileSync(file, "utf8");
      var re = /include\(\s*['"]([^'"]+)['"]/g;
      var m;
      while ((m = re.exec(src))) {
        var spec = m[1];
        var target = path.resolve(
          path.dirname(file),
          spec.endsWith(".ejs") ? spec : spec + ".ejs"
        );
        if (!fs.existsSync(target)) {
          unresolved.push(path.relative(VIEWS, file) + " -> include('" + spec + "')");
        }
      }
    });
    assert.deepEqual(unresolved, [], "include paths that do not resolve:\n  " + unresolved.join("\n  "));
  });
});

/*
 * What these tests do NOT cover, learned the hard way:
 *
 * A template can compile and still throw at render time. The legacy
 * `<% include %>` form inlined the partial, so it could read variables from
 * the parent's scriptlets; include() compiles it separately and passes only
 * locals, so those become ReferenceErrors. community-details.ejs hit this —
 * its modals partial reads userId and two permission flags declared at the top
 * of the parent, and they now have to be passed explicitly.
 *
 * Nothing above catches that class. The E2E suite does, by actually rendering
 * the pages, and that is how it was found. If you touch includes, do not treat
 * a green unit run as sufficient.
 */
