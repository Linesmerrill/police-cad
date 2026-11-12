var assert = require("assert");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/*
 * PenalCodeInfo runs in a browser, so the module is loaded against a stub
 * document just rich enough for its style injection and listener registration.
 */
function loadHelper() {
  var listeners = [];
  var styles = [];
  var stubWindow = {};
  var stubDocument = {
    getElementById: function () { return null; },
    addEventListener: function (type, fn, capture) { listeners.push({ type: type, capture: !!capture, fn: fn }); },
    createElement: function () {
      var node = { children: [], _html: "" };
      node.appendChild = function (c) { node.children.push(c); };
      Object.defineProperty(node, "innerHTML", {
        set: function (v) { node._html = v; },
        get: function () { return node._html; },
      });
      Object.defineProperty(node, "firstChild", { get: function () { return { html: node._html }; } });
      Object.defineProperty(node, "textContent", {
        set: function (v) { styles.push(v); },
        get: function () { return ""; },
      });
      return node;
    },
    head: { appendChild: function () {} },
    createTextNode: function (t) { return { text: t }; },
  };

  var src = read("public/js/penal-code-info.js");
  var factory = new Function("window", "document", "module", src);
  var mod = { exports: {} };
  factory(stubWindow, stubDocument, mod);
  return { api: stubWindow.PenalCodeInfo, listeners: listeners, styles: styles, window: stubWindow };
}

describe("penal-code-info", function () {
  var loaded;
  beforeEach(function () { loaded = loadHelper(); });

  describe("modal title", function () {
    // Today's data (police-cad-api PenalCodeViolation) has name/jailTime/fine/
    // explanation and NO code field, so the title is the name alone. The code
    // slot is kept so a future code field needs no change here.
    it("is the name alone when there is no code", function () {
      assert.strictEqual(loaded.api.modalTitle({ name: "Reckless Driving" }), "Reckless Driving");
    });

    it("is '<code> <name>' when a code is present", function () {
      assert.strictEqual(
        loaded.api.modalTitle({ code: "PC 23103", name: "Reckless Driving" }),
        "PC 23103 Reckless Driving"
      );
    });

    it("does not leave a stray space for a missing half", function () {
      assert.strictEqual(loaded.api.modalTitle({ code: "PC 1", name: "" }), "PC 1");
      assert.strictEqual(loaded.api.modalTitle({}), "");
      assert.strictEqual(loaded.api.modalTitle({ name: "  Speeding  " }), "Speeding");
    });
  });

  describe("modal body", function () {
    it("says 'No description.' when the code has none", function () {
      var expected = '<span class="pci-empty">No description.</span>';
      assert.strictEqual(loaded.api.modalBody({ name: "X" }), expected);
      assert.strictEqual(loaded.api.modalBody({ name: "X", description: "" }), expected);
      assert.strictEqual(loaded.api.modalBody({ name: "X", description: "   " }), expected);
    });

    // ddModal injects `message` as raw HTML, so this is the escaping boundary.
    it("escapes the description rather than rendering it", function () {
      var body = loaded.api.modalBody({ description: '<img src=x onerror="alert(1)"> & "quoted"' });
      assert.ok(body.indexOf("<img") === -1, "the tag survived: " + body);
      assert.ok(body.indexOf("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;") !== -1, body);
      assert.ok(body.indexOf("&amp;") !== -1, body);
    });

    // Long descriptions were getting cut off, which is the whole point of the
    // feature: the body scrolls and keeps the author's line breaks.
    it("keeps line breaks and scrolls instead of truncating", function () {
      var body = loaded.api.modalBody({ description: "First line\nSecond line" });
      assert.ok(body.indexOf("First line\nSecond line") !== -1, body);
      assert.ok(body.indexOf('class="pci-desc"') !== -1, body);
      // injectStyles only runs when a control or the modal is built.
      loaded.api.controlHtml({ name: "x" });
      var css = loaded.styles.join("");
      assert.ok(css.indexOf("white-space:pre-wrap") !== -1, "pre-wrap missing from .pci-desc");
      assert.ok(css.indexOf("overflow-y:auto") !== -1, "the body does not scroll");
      assert.ok(css.indexOf("max-height") !== -1, "no max-height, so nothing can scroll");
    });

    it("does not truncate a long description", function () {
      var long = new Array(400).join("word ");
      var body = loaded.api.modalBody({ description: long });
      assert.ok(body.indexOf(long.trim()) !== -1, "the description was shortened");
      assert.ok(body.indexOf("…") === -1, "an ellipsis was added");
    });
  });

  describe("the info control", function () {
    it("is labelled 'View description'", function () {
      var html = loaded.api.controlHtml({ name: "Speeding", description: "Too fast." });
      assert.ok(html.indexOf('aria-label="View description"') !== -1, html);
    });

    it("is a type=button, so it cannot submit the form it sits in", function () {
      var html = loaded.api.controlHtml({ name: "Speeding" });
      assert.ok(html.indexOf('type="button"') !== -1, html);
    });

    it("escapes the description it carries, quotes and all", function () {
      var html = loaded.api.controlHtml({
        name: 'Assault "aggravated"',
        description: '</button><script>x()</script>',
      });
      assert.ok(html.indexOf("<script") === -1, "a script tag escaped the attribute: " + html);
      assert.ok(html.indexOf("</button><script>") === -1, html);
      // Exactly one closing tag: the control's own.
      assert.strictEqual(html.split("</button>").length - 1, 1, html);
    });

    it("round-trips the code back out of the attributes it wrote", function () {
      var code = { name: 'Assault "aggravated"', description: "Line one\nLine <two> & more" };
      var html = loaded.api.controlHtml(code);
      // Mirror a browser's attribute parse: unescape the five entities.
      function attr(name) {
        var m = html.match(new RegExp(name + '="([^"]*)"'));
        return m[1]
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&");
      }
      assert.strictEqual(attr("data-pci-name"), code.name);
      assert.strictEqual(attr("data-pci-desc"), code.description);
    });
  });

  describe("selecting a charge still works", function () {
    /*
     * The regression this guards: Select2 selects an option on mouseup,
     * delegated from its results container, and the command dashboard's rows
     * bind click on the row itself. Both are ancestors of the control, so the
     * suppression has to happen in the capture phase at the document.
     */
    it("suppresses mousedown, mouseup and click in the capture phase", function () {
      var captured = {};
      loaded.listeners.forEach(function (l) {
        if (l.capture) captured[l.type] = true;
      });
      ["mousedown", "mouseup", "click"].forEach(function (type) {
        assert.ok(captured[type], type + " is not captured, so the charge would be selected too");
      });
    });

    it("leaves events alone when the control is not the target", function () {
      var stopped = false;
      var evt = {
        target: { closest: function () { return null; } },
        stopPropagation: function () { stopped = true; },
        preventDefault: function () { stopped = true; },
      };
      loaded.listeners.forEach(function (l) { l.fn(evt); });
      assert.strictEqual(stopped, false, "a click elsewhere on the row was swallowed");
    });

    it("stops the event when the control is the target", function () {
      var click = loaded.listeners.filter(function (l) { return l.type === "click"; })[0];
      var stopped = 0;
      var control = {
        getAttribute: function (n) {
          return { "data-pci-code": "", "data-pci-name": "Speeding", "data-pci-desc": "Too fast." }[n];
        },
      };
      click.fn({
        target: { closest: function () { return control; } },
        stopPropagation: function () { stopped++; },
        preventDefault: function () { stopped++; },
      });
      assert.strictEqual(stopped, 2, "the click reached the row underneath");
    });
  });

  describe("Select2 option building", function () {
    function fakeJquery() {
      return function () {
        var node = { attrs: {}, text_: "" };
        node.attr = function (k, v) { node.attrs[k] = v; return node; };
        node.text = function (v) { node.text_ = v; return node; };
        return node;
      };
    }

    it("sets the name as a property, not as markup", function () {
      var $opt = loaded.api.option(fakeJquery(), { name: 'Assault "x"', explanation: "Hit someone." });
      assert.strictEqual($opt.attrs.value, 'Assault "x"');
      assert.strictEqual($opt.text_, 'Assault "x"');
      assert.strictEqual($opt.attrs["data-explain"], "Hit someone.");
    });

    it("omits data-explain when the code has no description", function () {
      var $opt = loaded.api.option(fakeJquery(), { name: "Speeding" });
      assert.ok(!("data-explain" in $opt.attrs), "an empty data-explain would render a dead control");
    });
  });

  describe("the modal itself", function () {
    it("has a single Close button and no Confirm", function () {
      var opts = null;
      loaded.window.ddModal = function (o) { opts = o; };
      assert.strictEqual(loaded.api.open({ name: "Speeding", description: "Too fast." }), true);
      assert.deepStrictEqual(opts.buttons.map(function (b) { return b.label; }), ["Close"]);
      assert.strictEqual(opts.title, "Speeding");
      assert.ok(opts.message.indexOf("Too fast.") !== -1);
    });

    it("does nothing rather than throwing when the page has no ddModal", function () {
      assert.strictEqual(loaded.api.open({ name: "Speeding" }), false);
    });
  });
});

/*
 * Guards. Each surface that shows a penal code has to go through the helper —
 * these fail if someone rebuilds one of these rows and drops the control.
 */
describe("penal-code-info is wired into every picker and list", function () {
  var SURFACES = [
    ["public/js/police-dashboard.js", "the arrest charges picker (police dashboard)"],
    ["public/js/details-modal.js", "the citation and warrant-request pickers"],
    ["public/js/cd-action-forms.js", "the command dashboard's citation/arrest/warrant forms"],
    ["views/police-dashboard.ejs", "the police dashboard's penal code reference table"],
    ["views/dispatch-dashboard.ejs", "the dispatch dashboard's reference table and pickers"],
    ["views/ems-dashboard.ejs", "the EMS dashboard's reference table"],
  ];

  SURFACES.forEach(function (pair) {
    it(pair[1] + " uses PenalCodeInfo", function () {
      assert.ok(read(pair[0]).indexOf("PenalCodeInfo") !== -1,
        pair[0] + " no longer references PenalCodeInfo");
    });
  });

  it("every charges picker that builds options carries the description", function () {
    // A bare `<option value="' + v.name` drops `explanation` on the floor,
    // which is how the text went missing in the first place.
    var files = ["public/js/police-dashboard.js", "public/js/details-modal.js"];
    files.forEach(function (rel) {
      var src = read(rel);
      assert.ok(
        !/append\(\s*['"`]<option value=/.test(src),
        rel + " still builds a charge <option> as a raw string, losing the description"
      );
    });
  });

  it("every Select2 charges picker renders rows through select2Result", function () {
    var files = [
      "public/js/police-dashboard.js",
      "public/js/details-modal.js",
      "views/police-dashboard.ejs",
      "views/dispatch-dashboard.ejs",
    ];
    files.forEach(function (rel) {
      var src = read(rel);
      var options = (src.match(/PenalCodeInfo\.option\(/g) || []).length;
      var results = (src.match(/PenalCodeInfo\.select2Result\(/g) || []).length;
      assert.ok(options > 0, rel + " builds no charge options through the helper");
      assert.strictEqual(results, options,
        rel + " has " + options + " pickers but " + results + " templateResult hooks");
    });
  });

  it("the pages that show the control also load it and a ddModal", function () {
    var PAGES = ["views/police-dashboard.ejs", "views/dispatch-dashboard.ejs", "views/ems-dashboard.ejs"];
    PAGES.forEach(function (rel) {
      var src = read(rel);
      assert.ok(src.indexOf("/static/js/penal-code-info.js") !== -1, rel + " does not load penal-code-info.js");
      assert.ok(src.indexOf("partials/dd-modal") !== -1, rel + " has no ddModal, so the modal could not open");
    });
    // The command dashboard defines its own ddModal inline.
    var cd = read("views/command-dashboard.ejs");
    assert.ok(cd.indexOf("/static/js/penal-code-info.js") !== -1);
    assert.ok(cd.indexOf("window.ddModal = ddModal") !== -1);
  });
});
