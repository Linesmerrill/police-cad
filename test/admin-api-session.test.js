var assert = require("assert");
var createAdminApiClient = require("../app/admin-api-session").createAdminApiClient;

// A fake axios: callable for requests, with .post for the refresh call.
function fakeAxios(opts) {
  var calls = [];
  var fn = function (config) {
    calls.push({ type: "request", auth: config.headers && config.headers.Authorization });
    var next = opts.responses.shift();
    if (next.status >= 400) {
      var err = new Error("HTTP " + next.status);
      err.response = { status: next.status, data: next.data || {} };
      return Promise.reject(err);
    }
    return Promise.resolve(next);
  };
  fn.post = function (url, body) {
    calls.push({ type: "refresh", url: url, refreshToken: body.refreshToken });
    return Promise.resolve(opts.refreshResponse);
  };
  fn.calls = calls;
  return fn;
}

function apiUrl() { return "https://api.test"; }

describe("admin-api-session", function () {
  it("renews an expired token from the refresh token and retries once", async function () {
    var axios = fakeAxios({
      responses: [{ status: 401 }, { status: 200, data: { ok: true } }],
      refreshResponse: { status: 200, data: { token: "jwt-2", refreshToken: "refresh-2" } },
    });
    var req = { session: { apiAdminJwt: "jwt-1", apiAdminRefresh: "refresh-1" } };
    var res = await createAdminApiClient(axios, apiUrl).request(req, { method: "get", url: "/x" });

    assert.deepStrictEqual(res.data, { ok: true });
    assert.strictEqual(req.session.apiAdminJwt, "jwt-2");
    assert.strictEqual(req.session.apiAdminRefresh, "refresh-2");
    assert.deepStrictEqual(axios.calls.map(function (c) { return c.type; }), ["request", "refresh", "request"]);
    assert.strictEqual(axios.calls[1].url, "https://api.test/api/v1/admin/token/refresh");
    assert.strictEqual(axios.calls[1].refreshToken, "refresh-1");
    assert.strictEqual(axios.calls[2].auth, "Bearer jwt-2");
  });

  it("gives up and drops the refresh token when renewal is refused", async function () {
    var axios = fakeAxios({
      responses: [{ status: 401 }],
      refreshResponse: { status: 401, data: { code: "REFRESH_INVALID" } },
    });
    var req = { session: { apiAdminJwt: "jwt-1", apiAdminRefresh: "refresh-1" } };
    await assert.rejects(createAdminApiClient(axios, apiUrl).request(req, { method: "get", url: "/x" }),
      function (err) { return err.response.status === 401; });
    assert.strictEqual(req.session.apiAdminRefresh, undefined);
  });

  it("never renews on a wrong two-factor code", async function () {
    var axios = fakeAxios({ responses: [{ status: 401, data: { code: "MFA_INVALID" } }], refreshResponse: null });
    var req = { session: { apiAdminJwt: "jwt-1", apiAdminRefresh: "refresh-1" } };
    await assert.rejects(createAdminApiClient(axios, apiUrl).request(req, { method: "post", url: "/x" }));
    assert.deepStrictEqual(axios.calls.map(function (c) { return c.type; }), ["request"]);
    assert.strictEqual(req.session.apiAdminRefresh, "refresh-1");
  });

  it("passes other errors straight through", async function () {
    var axios = fakeAxios({ responses: [{ status: 403, data: { code: "MFA_REQUIRED" } }], refreshResponse: null });
    var req = { session: { apiAdminJwt: "jwt-1", apiAdminRefresh: "refresh-1" } };
    await assert.rejects(createAdminApiClient(axios, apiUrl).request(req, { method: "get", url: "/x" }),
      function (err) { return err.response.status === 403; });
    assert.strictEqual(axios.calls.length, 1);
  });

  it("without a refresh token (sessions from before this change) it fails as before", async function () {
    var axios = fakeAxios({ responses: [{ status: 401 }], refreshResponse: null });
    var req = { session: { apiAdminJwt: "jwt-1" } };
    await assert.rejects(createAdminApiClient(axios, apiUrl).request(req, { method: "get", url: "/x" }));
    assert.strictEqual(axios.calls.length, 1);
  });
});
