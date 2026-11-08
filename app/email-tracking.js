/**
 * SendGrid tracking settings for account emails.
 *
 * SendGrid click tracking rewrites every link in an outgoing email to
 * http://url<n>.linespolice-cad.com/ls/click?..., the link-branding host. That
 * host answers on http and gives no response on https, so a tracked link opens
 * a browser "this site doesn't support a secure connection" warning, and the
 * reset or verification token in the link travels through a third-party
 * redirect on its way back to us.
 *
 * Every email that carries a token or an account link therefore goes out
 * untracked. nodemailer-sendgrid passes message keys it does not recognise
 * straight through to the SendGrid v3 API, and @sendgrid/mail renames
 * trackingSettings to the tracking_settings body field, so setting this on the
 * message is the whole fix. test/email-tracking.test.js asserts the payload
 * that actually reaches the API.
 */

/**
 * Click and open tracking, both off.
 *
 * A fresh object on every call, so one send can never affect another.
 */
function noTrackingSettings() {
  return {
    clickTracking: { enable: false, enableText: false },
    openTracking: { enable: false },
  };
}

module.exports = { noTrackingSettings };
