const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");
const nodemailerSendgrid = require("nodemailer-sendgrid");

const { noTrackingSettings } = require("../app/email-tracking");

const ROUTES = path.join(__dirname, "..", "app", "routes.js");

/**
 * Builds a transport exactly as routes.js does, with the SendGrid HTTP client
 * swapped for a recorder. @sendgrid/mail still builds the request body, so what
 * lands in `sent` is the payload that would have gone to
 * POST https://api.sendgrid.com/v3/mail/send.
 */
function recordingTransport() {
  const sent = [];
  sgMail.setClient({
    setApiKey() {},
    setDefaultHeader() {},
    request(req, cb) {
      sent.push(req);
      const response = [{ statusCode: 202, body: "", headers: {} }, {}];
      if (cb) {
        cb(null, response[0], response[1]);
        return undefined;
      }
      return Promise.resolve(response);
    },
  });
  const transport = nodemailer.createTransport(
    nodemailerSendgrid({ apiKey: "SG.test-key-not-a-real-key" })
  );
  return { transport, sent };
}

function send(transport, mailOptions) {
  return new Promise((resolve, reject) => {
    transport.sendMail(mailOptions, (err) => (err ? reject(err) : resolve()));
  });
}

/** The reset email as routes.js /forgot-password builds it. */
function resetMailOptions(extra) {
  return Object.assign(
    {
      to: "member@example.com",
      from: "no-reply@linespolice-cad.com",
      subject: "Lines Police CAD Reset Password",
      html:
        '<p><a href="https://www.linespolice-cad.com/reset/' +
        "a".repeat(64) +
        '">Reset your password</a></p>',
    },
    extra || {}
  );
}

describe("email-tracking", function () {
  describe("noTrackingSettings", function () {
    it("turns click tracking off, in HTML and in plain text", function () {
      const settings = noTrackingSettings();
      assert.strictEqual(settings.clickTracking.enable, false);
      assert.strictEqual(settings.clickTracking.enableText, false);
    });

    it("turns open tracking off", function () {
      assert.strictEqual(noTrackingSettings().openTracking.enable, false);
    });

    it("returns a fresh object each call, so one send cannot affect another", function () {
      const first = noTrackingSettings();
      const second = noTrackingSettings();
      assert.notStrictEqual(first, second);
      assert.notStrictEqual(first.clickTracking, second.clickTracking);
      first.clickTracking.enable = true;
      assert.strictEqual(second.clickTracking.enable, false);
    });
  });

  describe("the payload nodemailer-sendgrid builds", function () {
    it("carries tracking_settings with click and open tracking off", async function () {
      const { transport, sent } = recordingTransport();

      await send(transport, resetMailOptions({ trackingSettings: noTrackingSettings() }));

      assert.strictEqual(sent.length, 1);
      const body = sent[0].body;

      // Shown so a reviewer can read what SendGrid is actually asked to do.
      console.log(
        "        POST /v3/mail/send body:\n" +
          JSON.stringify(body, null, 2)
            .split("\n")
            .map((line) => "        " + line)
            .join("\n")
      );

      assert.deepStrictEqual(body.tracking_settings, {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
      });
    });

    it("leaves the link in the email alone", async function () {
      const { transport, sent } = recordingTransport();
      const mailOptions = resetMailOptions({ trackingSettings: noTrackingSettings() });

      await send(transport, mailOptions);

      const html = sent[0].body.content.find((c) => c.type === "text/html").value;
      assert.ok(
        html.includes("https://www.linespolice-cad.com/reset/"),
        "the reset link must reach the member as we wrote it"
      );
      assert.ok(
        !/url\d+\.linespolice-cad\.com/.test(html),
        "the link-branding host must not appear in the email we send"
      );
    });

    it("sends no tracking_settings at all when the message omits them", async function () {
      // The negative control: without this, the assertion above could pass on a
      // payload that never reached SendGrid's tracking fields.
      const { transport, sent } = recordingTransport();

      await send(transport, resetMailOptions());

      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].body.tracking_settings, undefined);
    });

    it("keeps the settings off when nodemailer reads the HTML from a file", async function () {
      // /forgot-password and /reset/:token both pass html read off disk, which
      // sends mail through nodemailer's resolveAll path. Tracking must survive it.
      const { transport, sent } = recordingTransport();

      await send(
        transport,
        resetMailOptions({
          html: undefined,
          text: "Reset your password: https://www.linespolice-cad.com/reset/abc",
          trackingSettings: noTrackingSettings(),
        })
      );

      assert.deepStrictEqual(sent[0].body.tracking_settings, {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
      });
    });
  });

  describe("routes.js account emails", function () {
    const source = fs.readFileSync(ROUTES, "utf8");

    it("requires the shared settings rather than inlining them", function () {
      assert.ok(
        /require\("\.\/email-tracking"\)/.test(source),
        "routes.js must use app/email-tracking.js"
      );
    });

    it("sets trackingSettings on every message it sends", function () {
      // Every mailOptions literal in routes.js is an account email: account
      // verification, the reset link, and the password-has-been-reset notice.
      // A new one that forgets this fails here rather than in an inbox.
      const literals = source.split("var mailOptions = {").slice(1);
      assert.ok(literals.length >= 8, "expected the account email sites to still be here");

      const missing = [];
      literals.forEach(function (literal, i) {
        const body = literal.split("\n};")[0].split("              };")[0];
        if (!/trackingSettings:\s*noTrackingSettings\(\)/.test(body)) {
          missing.push(i);
        }
      });
      assert.deepStrictEqual(missing, [], "mailOptions literals without trackingSettings");
    });

    it("has a tracking setting for each message it hands to SendGrid", function () {
      const sends = (source.match(/smtpTransport\.sendMail\(/g) || []).length;
      const settings = (source.match(/trackingSettings:\s*noTrackingSettings\(\)/g) || []).length;
      assert.strictEqual(settings, sends);
    });
  });
});
