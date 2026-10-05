// The website's session with the Go API, for the owner's Finance and
// two-factor routes (see app/routes.js).
//
// The API's admin access token lasts 24 hours, but the website session lasts
// 30 days. At login the API also hands out a 30-day refresh token, kept only
// in the server-side session. A call that comes back 401 renews the access
// token once and retries, so Finance doesn't send the owner back to the login
// page after a day away. Two-factor code errors are 401s too, but mean the
// code was wrong, so they never trigger a renewal.

function authHeaders(session) {
  const jwt = session && session.apiAdminJwt;
  if (!jwt) return null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` };
}

function createAdminApiClient(axios, apiUrl) {
  async function refresh(req) {
    const token = req.session && req.session.apiAdminRefresh;
    if (!token) return false;
    try {
      const r = await axios.post(`${apiUrl()}/api/v1/admin/token/refresh`, { refreshToken: token }, {
        timeout: 10000,
        validateStatus: function (status) { return status < 600; },
      });
      if (r.status === 200 && r.data && r.data.token) {
        req.session.apiAdminJwt = r.data.token;
        if (r.data.refreshToken) req.session.apiAdminRefresh = r.data.refreshToken;
        return true;
      }
    } catch (err) {
      console.log("Admin API session refresh failed:", err.message);
    }
    delete req.session.apiAdminRefresh;
    return false;
  }

  async function request(req, config) {
    const send = function () {
      return axios(Object.assign({}, config, { headers: authHeaders(req.session) }));
    };
    try {
      return await send();
    } catch (err) {
      const status = err.response && err.response.status;
      const data = err.response && err.response.data;
      const isCodeError = !!(data && typeof data.code === "string" && data.code.indexOf("MFA_") === 0);
      if (status !== 401 || isCodeError || !(await refresh(req))) throw err;
      return await send();
    }
  }

  return { request: request, refresh: refresh };
}

module.exports = { createAdminApiClient: createAdminApiClient, authHeaders: authHeaders };
