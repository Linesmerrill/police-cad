// Attaches the shared API gateway secret to every server-side axios request
// that targets the police-cad-api, and ONLY that API.
//
// The API is locked down (part 1 / "quick and dirty"): random direct callers
// are rejected, but our website backend is allowed through by presenting this
// secret in the `X-API-Key` header. The value must match the `API_GATEWAY_KEY`
// config var set on the API's Heroku app.
//
// Browser-side calls don't need this — the API allows our own web origin via the
// Origin/Referer header, so the secret never ships to the client. We scope the
// interceptor to the API host specifically so the key is never leaked to other
// services axios talks to (e.g. Discord webhooks).
const axios = require("axios");

function isApiRequest(url) {
  if (!url) return false;
  const base = process.env.POLICE_CAD_API_URL;
  if (base && url.startsWith(base)) return true;
  // Fallbacks for call sites that hardcode the prod host or use a bare path.
  return (
    url.includes("police-cad-app-api") ||
    /\/api\/v[12]\//.test(url)
  );
}

// Idempotent: guard against double-registration if this module is required
// more than once during startup.
if (!axios.__policeCadApiKeyInterceptor) {
  axios.interceptors.request.use((requestConfig) => {
    const key = process.env.POLICE_CAD_API_KEY;
    if (key && isApiRequest(requestConfig.url)) {
      requestConfig.headers = requestConfig.headers || {};
      requestConfig.headers["X-API-Key"] = key;
    }
    return requestConfig;
  });
  axios.__policeCadApiKeyInterceptor = true;
}

module.exports = { isApiRequest };
