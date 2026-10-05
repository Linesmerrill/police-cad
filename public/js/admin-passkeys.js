// WebAuthn helpers for the admin console's passkeys (sign-in on /admin/mfa
// and setup in Finance). The API sends options with binary fields as
// base64url strings and expects the credential back the same way; this
// converts in both directions around navigator.credentials. Kept local
// rather than loaded from a CDN because it runs on the admin sign-in page.
(function () {
  if (window.lpcPasskeys) return;

  function fromB64u(s) {
    var b64 = String(s).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }

  function toB64u(buf) {
    var bytes = new Uint8Array(buf);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function descriptors(list) {
    return (list || []).map(function (c) {
      var d = { type: c.type || "public-key", id: fromB64u(c.id) };
      if (c.transports) d.transports = c.transports;
      return d;
    });
  }

  function creationOptions(o) {
    var opts = Object.assign({}, o);
    opts.challenge = fromB64u(o.challenge);
    opts.user = Object.assign({}, o.user, { id: fromB64u(o.user.id) });
    if (o.excludeCredentials) opts.excludeCredentials = descriptors(o.excludeCredentials);
    return opts;
  }

  function requestOptions(o) {
    var opts = Object.assign({}, o);
    opts.challenge = fromB64u(o.challenge);
    if (o.allowCredentials) opts.allowCredentials = descriptors(o.allowCredentials);
    return opts;
  }

  function credentialJSON(cred) {
    var r = cred.response;
    var out = {
      id: cred.id,
      rawId: toB64u(cred.rawId),
      type: cred.type,
      response: { clientDataJSON: toB64u(r.clientDataJSON) },
      clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
    };
    if (cred.authenticatorAttachment) out.authenticatorAttachment = cred.authenticatorAttachment;
    if (r.attestationObject) {
      out.response.attestationObject = toB64u(r.attestationObject);
      if (r.getTransports) out.response.transports = r.getTransports();
    }
    if (r.authenticatorData) {
      out.response.authenticatorData = toB64u(r.authenticatorData);
      out.response.signature = toB64u(r.signature);
      if (r.userHandle) out.response.userHandle = toB64u(r.userHandle);
    }
    return out;
  }

  // A friendly message for the errors people actually hit.
  function describeError(err) {
    if (!err) return "Passkey didn't work. Try again.";
    if (err.name === "NotAllowedError") return "The passkey prompt was closed or timed out. Try again.";
    if (err.name === "InvalidStateError") return "This device already has a passkey for this account.";
    if (err.name === "SecurityError") return "Passkeys only work on the linespolice-cad.com site.";
    return err.message || "Passkey didn't work. Try again.";
  }

  window.lpcPasskeys = {
    supported: !!(window.PublicKeyCredential && navigator.credentials),
    create: function (options) {
      return navigator.credentials.create({ publicKey: creationOptions(options) }).then(credentialJSON);
    },
    get: function (options) {
      return navigator.credentials.get({ publicKey: requestOptions(options) }).then(credentialJSON);
    },
    describeError: describeError,
  };
})();
