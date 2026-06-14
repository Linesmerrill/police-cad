var assert = require("assert");

describe("api-key-interceptor", function () {
  var savedApiUrl = process.env.POLICE_CAD_API_URL;
  var savedKey = process.env.POLICE_CAD_API_KEY;
  var isApiRequest;

  before(function () {
    process.env.POLICE_CAD_API_URL = "http://localhost:8081";
    isApiRequest = require("../app/api-key-interceptor").isApiRequest;
  });

  after(function () {
    process.env.POLICE_CAD_API_URL = savedApiUrl;
    process.env.POLICE_CAD_API_KEY = savedKey;
  });

  describe("isApiRequest", function () {
    it("matches the configured API base URL", function () {
      assert.equal(isApiRequest("http://localhost:8081/api/v1/community/abc"), true);
    });

    it("matches the hardcoded prod API host", function () {
      assert.equal(
        isApiRequest("https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/user/1"),
        true
      );
    });

    it("matches a bare /api/v1 path", function () {
      assert.equal(isApiRequest("/api/v2/community/abc/members"), true);
    });

    it("does NOT match external hosts (e.g. Discord webhooks)", function () {
      assert.equal(isApiRequest("https://discord.com/api/webhooks/123/abc"), false);
    });

    it("returns false for empty/undefined url", function () {
      assert.equal(isApiRequest(""), false);
      assert.equal(isApiRequest(undefined), false);
    });
  });

  describe("interceptor", function () {
    it("attaches X-API-Key only to API requests when key is set", function () {
      process.env.POLICE_CAD_API_KEY = "test-secret";
      var axios = require("axios");

      var apiReq = { url: "http://localhost:8081/api/v1/community/abc", headers: {} };
      var extReq = { url: "https://discord.com/api/webhooks/1/x", headers: {} };

      // Run every registered request interceptor fulfillment over the configs.
      axios.interceptors.request.forEach(function (h) {
        if (h && typeof h.fulfilled === "function") {
          apiReq.headers = (h.fulfilled(apiReq) || apiReq).headers;
          extReq.headers = (h.fulfilled(extReq) || extReq).headers;
        }
      });

      assert.equal(apiReq.headers["X-API-Key"], "test-secret");
      assert.equal(extReq.headers["X-API-Key"], undefined);
    });
  });
});
