// Submits the social sign-in bounce form (views/social-bounce.ejs).
//
// A separate file rather than an inline script so the page needs no inline
// script allowance: a Content-Security-Policy of script-src 'self' is enough.
// The form also carries a real submit button, so this failing or being blocked
// costs one click rather than the sign-in.
(function () {
  "use strict";
  var form = document.getElementById("rp-bounce-form");
  if (!form || typeof form.submit !== "function") return;

  // Guard against a double submit: the button is still there for no-JS, and a
  // fast click plus this would otherwise post twice. The state is single use,
  // so the second post would fail and show an error over a sign-in that worked.
  var sent = false;
  var send = function () {
    if (sent) return;
    sent = true;
    form.submit();
  };
  form.addEventListener("submit", function () { sent = true; });
  send();
})();
