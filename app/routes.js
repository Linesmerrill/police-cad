var User = require("../app/models/user");
var Civilian = require("../app/models/civilian");
var Vehicle = require("../app/models/vehicle");
var Firearm = require("../app/models/firearm");
var License = require("../app/models/license");
var EmsVehicle = require("../app/models/emsVehicle");
var Ticket = require("../app/models/ticket");
var Ems = require("../app/models/ems");
var ArrestReport = require("../app/models/arrestReport");
var Warrant = require("../app/models/warrants");
var Community = require("../app/models/community");
var Bolo = require("../app/models/bolos");
var Call = require("../app/models/calls");
var Medication = require("../app/models/medication");
var Condition = require("../app/models/medicalCondition");
var MedicalReport = require("../app/models/medicalReport");
var Announcement = require("../app/models/announcement");
var _ObjectIdClass = require("mongodb").ObjectId;
var ObjectId = function(id) { return new _ObjectIdClass(id); };
var nodemailer = require("nodemailer");
var nodemailerSendgrid = require("nodemailer-sendgrid");
var async = require("async");
var crypto = require("crypto");
var path = require("path");
var fs = require("fs");
var handlebars = require("handlebars");
var sanitize = require("mongo-sanitize");
let randomstring = require("randomstring");
var axios = require("axios");
var discordAlerts = require("./discord-alerts");

var policeCadApiUrl = process.env.POLICE_CAD_API_URL;
var policeCadApiToken = process.env.POLICE_CAD_API_TOKEN;

// Config for axios requests, can be reused and only declared once
var config = {
  headers: {
    Authorization: policeCadApiToken,
  },
};
var { promisify } = require("util");
var readFile = promisify(fs.readFile);

const redirect = process.env.CLIENT_REDIRECT;

// Validate that a string is a valid MongoDB ObjectId (24 hex characters)
function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// Sanitize a redirect URL to prevent open redirects — only allow relative paths.
// Rejects absolute URLs, protocol-relative (`//host`) and backslash-prefixed
// (`/\host`, which browsers normalize to `//host`) targets.
function sanitizeRedirect(url, fallback) {
  if (
    typeof url !== "string" ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.startsWith("/\\")
  ) {
    return fallback;
  }
  return url;
}

// Utility functions for base64-url encoding/decoding (used for department and now community IDs)
function encodeId(id) {
  return Buffer.from(id, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeId(encoded) {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

// If an axios error from the API is the standard 410 pending_deletion shape,
// render the friendly route-block page and return true. Callers should
// short-circuit their catch block when this returns true, e.g.:
//   if (renderPendingDeletionIfApplicable(req, res, error)) return;
// Centralizes the check so every community-scoped server-rendered route
// handles the soft-delete state the same way as the /community/:hash route.
function renderPendingDeletionIfApplicable(req, res, error) {
  const resp = error && error.response;
  if (!resp || resp.status !== 410) return false;
  const data = resp.data || {};
  if (data.error !== "pending_deletion") return false;
  res.status(410).render("community-pending-deletion", {
    user: req.user,
    communityName: data.communityName || "This community",
    scheduledDeletionAt: data.scheduledDeletionAt || null,
    communityHash: (req.params && req.params.hash) || "",
  });
  return true;
}

module.exports = function (app, passport, server, nextApp, handle) {
  // Root route - use Next.js if available, otherwise fall back to EJS
  app.get("/", function (req, res) {
    if (nextApp && handle) {
      // Use Next.js for the landing page
      return handle(req, res);
    }
    // Fallback to EJS if Next.js is not available
    res.render("index", {
      message: req.flash("info"),
    });
  });

  app.get("/auth/discord", auth, function (req, res, next) {
    // This route both initiates the Discord OAuth flow and receives the
    // callback (CLIENT_REDIRECT points back here). When Discord returns an
    // invalid/expired/already-used `code` — e.g. the user refreshed the
    // callback URL, hit back, or the code was reused — passport-oauth2
    // raises a TokenError. With the plain middleware form that error
    // bypasses `failureRedirect` and bubbles up as an unhandled 500. Use a
    // custom callback so we can treat it as a benign auth failure instead.
    passport.authenticate("discord", function (err, user, info) {
      if (err) {
        console.warn(
          "[LPS] [level=warn] Discord OAuth failed:",
          err && err.message ? err.message : err
        );
        // A TokenError ("Invalid code") means Discord's single-use, ~10min
        // sign-in code expired or was already used. Nothing for the user to
        // troubleshoot — they just need to start a fresh connect. Show a
        // descriptive page whose primary action re-initiates the flow.
        const retryState = sanitizeRedirect(req.query.state, "/profile");
        return res.status(400).render("error", {
          user: req.user,
          message:
            "We couldn't finish connecting your Discord account — the " +
            "sign-in link expired or was already used. Reconnecting will " +
            "start a fresh one.",
          retryHref: "/auth/discord?state=" + encodeURIComponent(retryState),
          retryLabel: "Reconnect Discord",
          redirect: sanitizeRedirect(req.query.state, null),
        });
      }
      if (!user) {
        // No error but no user — the member declined authorization on
        // Discord's consent screen. That's a deliberate choice, so just
        // send them back without an alarming error page.
        return res.redirect(sanitizeRedirect(req.query.state, "/"));
      }
      req.logIn(user, function (loginErr) {
        if (loginErr) {
          console.error(
            "[LPS] [level=error] Discord OAuth login failed:",
            loginErr
          );
          return res.redirect("/");
        }
        return res.redirect(sanitizeRedirect(req.query.state, "/"));
      });
    })(req, res, next);
  });

  // Discord Bot page is now handled by Next.js at app/discord-bot/page.tsx
  // app.get("/discord-bot", function (req, res) {
  //   res.redirect(
  //     "https://discord.com/api/oauth2/authorize?client_id=1005557484271976569&permissions=8&scope=bot%20applications.commands"
  //   );
  // });

  app.get("/release-log", function (req, res) {
    res.render("release-log");
  });

  app.get("/about", function (req, res) {
    res.render("about");
  });

  // Redirect /join/:code to /invite-code?code=:code (Next.js page)
  app.get("/join/:code", function (req, res) {
    const code = req.params.code;
    res.redirect(`/invite-code?code=${encodeURIComponent(code)}`);
  });

  // About Us page is now handled by Next.js at app/about-us/page.tsx
  // app.get("/about-us", function (req, res) {
  //   res.render("about-us");
  // });

  app.get("/community/:hash", async function (req, res) {
    try {
      const hash = req.params.hash;
      const communityId = decodeId(hash);
      
      // Validate that the decoded communityId is a valid MongoDB ObjectId
      if (!/^[a-fA-F0-9]{24}$/.test(communityId)) {
        return res.status(404).render("error", {
          message: "Community not found or an error occurred.",
          redirect: "/communities",
        });
      }
      // Fetch community details from API
      const apiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}`;
      const response = await axios.get(apiUrl, config);
      const community = response.data || {};

      // Fetch first page of departments (6 per page, more loaded via client-side pagination)
      const userId = req.user && req.user._doc ? req.user._doc._id : (req.user && req.user._id ? req.user._id : null);
      let departments = [];
      let departmentsTotalCount = 0;
      let departmentTemplateTypes = [];
      const deptPerPage = 6;
      // Determine if user is a member of the community
      let isMemberApproved = false;
      if (req.user && req.user._doc && req.user._doc.user && Array.isArray(req.user._doc.user.communities) && community && community._id) {
        req.user._doc.user.communities.forEach(function(c) {
          if (String(c.communityId) === String(community._id) && c.status === 'approved') {
            isMemberApproved = true;
          }
        });
      }
      // Update lastAccessedCommunity when the user is an approved member
      if (isMemberApproved && userId && community && community._id) {
        User.findOneAndUpdate(
          { _id: ObjectId(userId) },
          {
            $set: {
              "user.lastAccessedCommunity": {
                communityID: String(community._id),
                createdAt: new Date(),
              },
            },
          },
          function (err) {
            if (err) console.error("[LPS] [level=error] Failed to update lastAccessedCommunity on community access:", err);
          }
        );
      }
      if (community && community._id && userId) {
        // Use v2 paginated API - fetch only first page
        const deptsApiUrl = `${policeCadApiUrl}/api/v2/community/${community._id}/departments?userId=${userId}&page=1&limit=${deptPerPage}`;
        const deptsResponse = await axios.get(deptsApiUrl, config);
        departments = deptsResponse.data.data || [];
        departmentsTotalCount = deptsResponse.data.totalCount || departments.length;
        departmentTemplateTypes = deptsResponse.data.templateTypes || [];
      }
      // Resolve booster username from user ID if community has an active boost
      let boosterUsername = null;
      const boosterId = community && community.community && community.community.subscriptionCreatedBy;
      const hasActiveBoost = community && community.community && community.community.subscription && community.community.subscription.active;
      if (boosterId && hasActiveBoost) {
        try {
          const boosterResponse = await axios.get(`${policeCadApiUrl}/api/v1/user/${boosterId}`, config);
          boosterUsername = boosterResponse.data && boosterResponse.data.user && boosterResponse.data.user.username;
        } catch (e) {
          // Silently fail - booster badge just won't show
        }
      }
      res.render("community-details", {
        user: req.user,
        community,
        departments,
        departmentsTotalCount,
        departmentTemplateTypes,
        boosterUsername,
        query: req.query,
        referer: encodeURIComponent(`/community/${hash}`),
        redirect: encodeURIComponent(redirect),
      });
    } catch (error) {
      if (renderPendingDeletionIfApplicable(req, res, error)) return;
      // Surface which upstream call failed — axios attaches the request URL
      // and the response status, so log both instead of just the message.
      const failedUrl = error.config && error.config.url;
      const status = error.response && error.response.status;
      console.error(
        "[LPS] [level=error] /community/:hash error:",
        error.message,
        failedUrl ? `(${status || "no status"} from ${failedUrl})` : ""
      );
      return res.status(404).render("error", {
        message: "Community not found or an error occurred.",
        redirect: "/communities",
      });
    }
  });

  // Community Map page - community-specific map with upload/remove (matches mobile app)
  app.get("/community/:hash/map", authCheck, async function (req, res) {
    try {
      const hash = req.params.hash;
      const communityId = decodeId(hash);

      if (!/^[a-fA-F0-9]{24}$/.test(communityId)) {
        return res.status(404).render("error", {
          message: "Community not found or an error occurred.",
          redirect: "/communities",
        });
      }

      const apiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}`;
      const response = await axios.get(apiUrl, config);
      const community = response.data || {};

      const userId = req.user && req.user._doc ? req.user._doc._id : (req.user && req.user._id ? req.user._id : null);

      // Check if user is an approved member
      let isMemberApproved = false;
      if (req.user && req.user._doc && req.user._doc.user && Array.isArray(req.user._doc.user.communities) && community && community._id) {
        req.user._doc.user.communities.forEach(function(c) {
          if (String(c.communityId) === String(community._id) && c.status === 'approved') {
            isMemberApproved = true;
          }
        });
      }

      if (!isMemberApproved) {
        return res.redirect(`/community/${hash}`);
      }

      res.render("community-map", {
        user: req.user,
        community,
        communityId,
        encodedCommunityId: hash,
      });
    } catch (error) {
      if (renderPendingDeletionIfApplicable(req, res, error)) return;
      console.error("[community-map] Error loading map page:", error.message);
      return res.status(404).render("error", {
        message: "Community not found or an error occurred.",
        redirect: "/communities",
      });
    }
  });

  // FAQ page is now handled by Next.js at app/faq/page.tsx
  // app.get("/faq", function (req, res) {
  //   res.render("faq");
  // });

  // Old /login route moved to /login-select (kept for backward compatibility but not actively used)
  app.get("/login-select", function (req, res) {
    const redirect = req.query.redirect || "/communities";
    res.render("login", { redirect: encodeURIComponent(redirect) });
  });

  // Old signup page moved to signup-list
  app.get("/signup-list", function (req, res) {
    res.render("signup");
  });

  // New signup page handled by Next.js
  app.get("/signup", function (req, res) {
    if (req.isAuthenticated()) {
      return res.redirect("/communities");
    }
    return handle(req, res);
  });

  app.get("/not-authorized", function (req, res) {
    res.render("not-authorized");
  });

  app.get("/map-interactive", function (req, res) {
    res.render("map-interactive");
  });

  app.get("/map", function (req, res) {
    res.render("map-popular");
  });

  app.get("/health", function (req, res) {
    res.render("health");
  });

  app.get("/rules", function (req, res) {
    res.render("rules");
  });

  // Terms and Conditions page is now handled by Next.js at app/terms-and-conditions/page.tsx
  // app.get("/terms-and-conditions", function (req, res) {
  //   res.render("terms-and-conditions");
  // });

  // Privacy Policy page is now handled by Next.js at app/privacy-policy/page.tsx
  // app.get("/privacy-policy", function (req, res) {
  //   res.render("privacy-policy");
  // });

  // Contact Us page is now handled by Next.js at app/contact-us/page.tsx
  // app.get("/contact-us", function (req, res) {
  //   res.render("contact-us");
  // });

  // Admin login page (GET) and login handler (POST)
  app.get("/admin", function (req, res) {
    // If already authenticated as admin, go straight to console
    if (req.session && req.session.adminToken) {
      return res.redirect("/admin/console");
    }
    const error = req.query.error || req.flash("adminError");
    const success = req.query.success || null;
    // Only pass error if it's a non-empty string
    const errorToPass = (error && error.length > 0) ? error : null;
    res.render("admin-login", { error: errorToPass, success });
  });

  app.post("/admin", async function (req, res) {
    try {
      const email = (req.body && req.body.email) || "";
      const password = (req.body && req.body.password) || "";
      if (!email || !password) {
        return res.redirect("/admin?error=" + encodeURIComponent("Email and password required"));
      }

      // Check if we have a local admin user with the flat structure
      // Since the User model has a nested structure but your DB has flat structure,
      // we'll query the collection directly
      const mongoose = require("mongoose");
      const adminUser = await mongoose.connection.db.collection("admin_users").findOne({ email: email });
      
      if (!adminUser) {
        return res.redirect("/admin?error=" + encodeURIComponent("Invalid credentials"));
      }

      // Check if user has admin role - check both role and roles fields
      const hasAdminRole = adminUser.role === "owner" || 
                          adminUser.role === "admin" || 
                          (adminUser.roles && adminUser.roles.includes("admin")) ||
                          (adminUser.roles && adminUser.roles.includes("owner"));

      if (!hasAdminRole) {
        return res.redirect("/admin?error=" + encodeURIComponent("Access denied. Admin privileges required."));
      }

      // Verify password using bcrypt
      const bcrypt = require("bcrypt-nodejs");
      if (!bcrypt.compareSync(password, adminUser.password)) {
        return res.redirect("/admin?error=" + encodeURIComponent("Invalid credentials"));
      }

      // Update lastLoginAt directly in MongoDB
      try {
        await mongoose.connection.db.collection("admin_users").updateOne(
          { _id: adminUser._id },
          { $set: { lastLoginAt: new Date() } }
        );
      } catch (err) {
        console.log("Failed to update lastLoginAt in MongoDB:", err.message);
      }

      // Also update lastLoginAt in backend API if API token is configured
      const apiToken = process.env.POLICE_CAD_API_TOKEN;
      const apiUrl = process.env.POLICE_CAD_API_URL || "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
      
      if (apiToken) {
        // Try to find admin in backend API and update lastLoginAt
        const axios = require("axios");
        
        // Get roles from adminUser for the currentUser object
        const adminRoles = adminUser.roles || (adminUser.role ? [adminUser.role] : ['admin']);
        
        axios.post(`${apiUrl}/api/v1/admin/search/admins`, 
          { 
            query: email,
            currentUser: {
              email: email,
              roles: adminRoles
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiToken}`
            },
            timeout: 5000,
            validateStatus: function (status) {
              return status < 600; // Don't throw on any status code
            }
          }
        ).then(function(searchResponse) {
          if (searchResponse.status === 200 && searchResponse.data.admins && searchResponse.data.admins.length > 0) {
            const adminId = searchResponse.data.admins[0].id || searchResponse.data.admins[0]._id;
            
            // Update lastLoginAt via API
            axios.patch(`${apiUrl}/api/v1/admin/admins/${adminId}`, 
              { lastLoginAt: new Date().toISOString() },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiToken}`
                },
                timeout: 5000,
                validateStatus: function (status) {
                  return status < 600;
                }
              }
            ).catch(function(err) {
              // Silently fail - lastLoginAt update is not critical
            });
          }
        }).catch(function(err) {
          // Silently fail - lastLoginAt update is not critical for login flow
        });
      }

      // Check if profile is complete (has firstName and lastName)
      const profileComplete = adminUser.firstName && adminUser.lastName;

      // Create admin session with profile fields
      req.session.adminToken = "local-admin-" + Date.now();
      req.session.admin = {
        email: adminUser.email,
        name: adminUser.firstName && adminUser.lastName
          ? `${adminUser.firstName} ${adminUser.lastName}`
          : (adminUser.name || adminUser.email.split('@')[0]),
        firstName: adminUser.firstName || '',
        lastName: adminUser.lastName || '',
        profilePicture: adminUser.profilePicture || '',
        id: adminUser._id.toString(), // Ensure ID is a string for API calls
        role: adminUser.role,
        roles: adminUser.roles
      };

      // Store login time for session duration calculation
      req.session.loginTime = new Date();

      // Log login activity to backend API (reuse apiToken and apiUrl from above)
      if (apiToken) {
        // Get roles from adminUser for the currentUser object
        const adminRoles = adminUser.roles || (adminUser.role ? [adminUser.role] : ['admin']);

        // First find admin ID in backend API
        axios.post(`${apiUrl}/api/v1/admin/search/admins`,
          {
            query: email,
            currentUser: {
              email: email,
              roles: adminRoles
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiToken}`
            },
            timeout: 5000,
            validateStatus: function (status) {
              return status < 600;
            }
          }
        ).then(function(searchResponse) {
          if (searchResponse.status === 200 && searchResponse.data.admins && searchResponse.data.admins.length > 0) {
            const adminId = searchResponse.data.admins[0].id || searchResponse.data.admins[0]._id;

            // Log login activity
            axios.post(`${apiUrl}/api/v1/admin/activity/log`,
              {
                adminId: adminId,
                type: 'login',
                title: 'Admin logged in',
                details: 'Admin user logged into the system',
                timestamp: new Date().toISOString(),
                currentUser: {
                  email: email,
                  roles: adminRoles
                }
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiToken}`
                },
                timeout: 5000,
                validateStatus: function (status) {
                  return status < 600;
                }
              }
            ).catch(function(err) {
              // Silently fail - activity logging is not critical
            });
          }
        }).catch(function(err) {
          // Silently fail - activity logging is not critical
        });
      }

      // Redirect based on profile completeness
      if (!profileComplete) {
        return res.redirect("/admin/profile?setup=true");
      }
      return res.redirect("/admin/console");
    } catch (err) {
      const message = "Authentication failed. Please try again.";
      return res.redirect("/admin?error=" + encodeURIComponent(message));
    }
  });

  function requireAdminSession(req, res, next) {
    if (!req.session || !req.session.adminToken) {
      return res.redirect("/admin");
    }
    return next();
  }

  // Placeholder Admin Console (guarded)
  // Admin-only smoke test for the Discord error webhook. Sends a synthetic
  // alert through the same code path the global error handler uses, so a
  // staff member can confirm the channel is wired up without having to
  // actually break a page. Bypasses dedup by stamping a unique signature
  // every time it's called.
  app.get("/admin/test-discord-alert", requireAdminSession, function (req, res) {
    if (!process.env.DISCORD_WEBSITE_ERROR_WEBHOOK_URL) {
      return res.status(200).json({
        ok: false,
        message: "DISCORD_WEBSITE_ERROR_WEBHOOK_URL is not set. Configure it in Heroku config vars and try again.",
      });
    }
    var fakeErr = new Error(
      "Test alert from /admin/test-discord-alert at " + new Date().toISOString()
    );
    fakeErr.stack =
      "Error: synthetic test alert (no real error occurred)\n" +
      "    at /admin/test-discord-alert (manual trigger)\n" +
      "    triggered by " + (req.session && req.session.admin && req.session.admin.email ? req.session.admin.email : "admin");
    try {
      discordAlerts.sendErrorAlert(fakeErr, req);
      return res.status(200).json({
        ok: true,
        message: "Synthetic alert dispatched. Check the Discord channel — it should arrive within a few seconds. If nothing shows up, double-check the webhook URL and channel permissions.",
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        message: "Failed to dispatch alert: " + (e && e.message ? e.message : String(e)),
      });
    }
  });

  app.get("/admin/console", requireAdminSession, function (req, res) {
    const success = req.query.success || null;
    const error = req.query.error || null;

    res.render("admin-console", {
      admin: req.session.admin,
      POLICE_CAD_API_URL: process.env.POLICE_CAD_API_URL,
      POLICE_CAD_API_TOKEN: process.env.POLICE_CAD_API_TOKEN,
      success: success,
      error: error
    });
  });

  // Beta opt-out feedback admin actions. Proxied through Express so the
  // mutation requires an admin session — the underlying API endpoints
  // are unauthenticated to match the existing list/create pattern, and
  // we don't want admin-only writes exposed to the public network.
  app.patch("/admin/beta-feedback/:id", requireAdminSession, async function (req, res) {
    const apiUrl = process.env.POLICE_CAD_API_URL;
    const id = String(req.params.id || "");
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return res.status(400).json({ success: false, error: "invalid id" });
    }
    const resolvedBy = (req.session.admin && (req.session.admin.email || req.session.admin.id)) || "";
    try {
      const response = await axios.patch(
        `${apiUrl}/api/v1/admin/beta-feedback/${id}`,
        { resolved: req.body && req.body.resolved === true, resolvedBy: resolvedBy },
        { headers: { "Content-Type": "application/json" }, timeout: 8000 }
      );
      return res.json(response.data || { success: true });
    } catch (err) {
      const status = (err.response && err.response.status) || 500;
      return res.status(status).json({ success: false, error: (err.response && err.response.data) || err.message });
    }
  });

  app.delete("/admin/beta-feedback/:id", requireAdminSession, async function (req, res) {
    const apiUrl = process.env.POLICE_CAD_API_URL;
    const id = String(req.params.id || "");
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return res.status(400).json({ success: false, error: "invalid id" });
    }
    const undo = req.query.undo === "true" ? "?undo=true" : "";
    try {
      const response = await axios.delete(
        `${apiUrl}/api/v1/admin/beta-feedback/${id}${undo}`,
        { timeout: 8000 }
      );
      return res.json(response.data || { success: true });
    } catch (err) {
      const status = (err.response && err.response.status) || 500;
      return res.status(status).json({ success: false, error: (err.response && err.response.data) || err.message });
    }
  });

  // Admin Profile page
  app.get("/admin/profile", requireAdminSession, async function (req, res) {
    const setup = req.query.setup === 'true';
    let adminData = req.session.admin;

    // Fetch full admin data from API to get profile fields
    const apiToken = process.env.POLICE_CAD_API_TOKEN;
    const apiUrl = process.env.POLICE_CAD_API_URL;

    if (apiToken && adminData && adminData.id) {
      try {
        const axios = require("axios");
        const response = await axios.get(`${apiUrl}/api/v1/admin/admins/${adminData.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          timeout: 5000
        });
        if (response.data.success && response.data.admin) {
          // Merge API data with session data
          adminData = { ...adminData, ...response.data.admin };
        }
      } catch (err) {
        console.log("Failed to fetch admin profile from API, using session data");
      }
    }

    res.render("admin-profile", {
      admin: adminData,
      setup: setup,
      POLICE_CAD_API_URL: process.env.POLICE_CAD_API_URL,
      POLICE_CAD_API_TOKEN: process.env.POLICE_CAD_API_TOKEN,
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET
    });
  });

  // Update session after profile save (called from frontend)
  app.post("/admin/profile/update-session", requireAdminSession, function (req, res) {
    const { firstName, lastName, email, profilePicture } = req.body;

    // Update session with new profile data
    if (req.session.admin) {
      if (firstName) req.session.admin.firstName = firstName;
      if (lastName) req.session.admin.lastName = lastName;
      if (email) req.session.admin.email = email;
      if (profilePicture) req.session.admin.profilePicture = profilePicture;

      // Update the name field for display
      if (firstName && lastName) {
        req.session.admin.name = `${firstName} ${lastName}`;
      }
    }

    res.json({ success: true });
  });

  app.post("/admin/logout", function (req, res) {
    // Calculate session duration before clearing session
    let sessionDuration = null;
    if (req.session && req.session.loginTime) {
      const loginTime = new Date(req.session.loginTime);
      const logoutTime = new Date();
      const durationMs = logoutTime - loginTime;
      
      // Format duration: "Xh Ym" or "Ym" or "Xs"
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        sessionDuration = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        sessionDuration = `${minutes}m`;
      } else {
        sessionDuration = `${seconds}s`;
      }
    }
    
    const adminEmail = req.session && req.session.admin ? req.session.admin.email : null;
    const adminRoles = req.session && req.session.admin ? (req.session.admin.roles || [req.session.admin.role]) : [];
    
    // Log logout activity to backend API before clearing session
    const apiToken = process.env.POLICE_CAD_API_TOKEN;
    const apiUrl = process.env.POLICE_CAD_API_URL || "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
    
    if (apiToken && adminEmail) {
      const axios = require("axios");
      
      // Find admin ID in backend API
      axios.post(`${apiUrl}/api/v1/admin/search/admins`, 
        { 
          query: adminEmail,
          currentUser: {
            email: adminEmail,
            roles: adminRoles
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          timeout: 5000,
          validateStatus: function (status) {
            return status < 600;
          }
        }
      ).then(function(searchResponse) {
        if (searchResponse.status === 200 && searchResponse.data.admins && searchResponse.data.admins.length > 0) {
          const adminId = searchResponse.data.admins[0].id || searchResponse.data.admins[0]._id;
          
          // Log logout activity with session duration
          axios.post(`${apiUrl}/api/v1/admin/activity/log`, 
            {
              adminId: adminId,
              type: 'logout',
              title: 'Admin logged out',
              details: 'Admin user logged out of the system',
              timestamp: new Date().toISOString(),
              sessionDuration: sessionDuration || '0m',
              currentUser: {
                email: adminEmail,
                roles: adminRoles
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
              },
              timeout: 5000,
              validateStatus: function (status) {
                return status < 600;
              }
            }
          ).catch(function(err) {
            // Silently fail - activity logging is not critical
          });
        }
      }).catch(function(err) {
        // Silently fail - activity logging is not critical
      });
    }
    
    // Clear session after logging
    if (req.session) {
      delete req.session.adminToken;
      delete req.session.admin;
      delete req.session.loginTime;
    }
    return res.redirect("/admin");
  });

  // Admin endpoint to reset a user's password (for emergency password resets)
  app.post("/admin/reset-user-password", requireAdminSession, function (req, res) {
    var email = req.body.email;
    var tempPassword = req.body.tempPassword || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    if (!email) {
      return res.json({ success: false, error: "Email is required" });
    }

    User.findOne({ "user.email": email.toLowerCase() }, function (err, user) {
      if (err) {
        return res.json({ success: false, error: "Error finding user: " + err.message });
      }

      if (!user) {
        return res.json({ success: false, error: "User not found with email: " + email });
      }

      // Generate hash for the new password
      var hashedPassword = user.generateHash(tempPassword);

      // Update the user's password
      user.user.password = hashedPassword;
      user.user.updatedAt = new Date();

      // Must call markModified for nested fields or Mongoose won't save them
      user.markModified('user.password');
      user.markModified('user.updatedAt');

      user.save(async function (err) {
        if (err) {
          return res.json({ success: false, error: "Error saving user: " + err.message });
        }

        // Sync password to the API database (send plain password for Go bcrypt compatibility)
        var apiSynced = false;
        try {
          const apiUrl = process.env.POLICE_CAD_API_URL || "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
          const apiToken = process.env.POLICE_CAD_API_TOKEN;

          if (apiToken) {
            await axios.post(`${apiUrl}/api/v1/user/sync-password`, {
              email: email.toLowerCase(),
              password: tempPassword  // Send plain password - API will hash with Go bcrypt
            }, {
              headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
              }
            });
            apiSynced = true;
          }
        } catch (syncError) {
          console.error('[ADMIN RESET] Failed to sync to API:', syncError.response?.data || syncError.message);
        }

        // Verify the password was saved correctly
        User.findOne({ "user.email": email.toLowerCase() }, function (err, verifyUser) {
          var passwordMatches = false;
          if (!err && verifyUser) {
            passwordMatches = verifyUser.verifyPassword(tempPassword);
          }

          return res.json({
            success: true,
            email: email,
            tempPassword: tempPassword,
            passwordVerified: passwordMatches,
            apiSynced: apiSynced,
            message: "Password reset successful!" + (passwordMatches ? " Password verification passed." : " WARNING: Password verification failed!") + (apiSynced ? " API synced." : " WARNING: API sync failed!")
          });
        });
      });
    });
  });

  // Diagnostic endpoint to check user password status
  app.get("/diagnose-user-password", function (req, res) {
    var email = req.query.email || "morrisjason94@gmail.com";
    
    User.findOne({ "user.email": email.toLowerCase() }, function (err, user) {
      if (err) {
        return res.json({ success: false, error: "Error finding user: " + err.message });
      }
      
      if (!user) {
        return res.json({ success: false, error: "User not found with email: " + email });
      }
      
      var bcrypt = require("bcrypt-nodejs");
      var testPasswords = ["asdf", "test123", "password"];
      var testResults = {};
      
      testPasswords.forEach(function(pwd) {
        if (user.user.password) {
          testResults[pwd] = bcrypt.compareSync(pwd, user.user.password);
        } else {
          testResults[pwd] = "NO_PASSWORD_STORED";
        }
      });
      
      return res.json({
        success: true,
        email: user.user.email,
        username: user.user.username,
        hasPassword: !!user.user.password,
        passwordLength: user.user.password ? user.user.password.length : 0,
        passwordPreview: user.user.password ? user.user.password.substring(0, 50) + "..." : null,
        testResults: testResults,
        verifyPasswordMethod: {
          "asdf": user.verifyPassword("asdf"),
          "test123": user.verifyPassword("test123")
        }
      });
    });
  });

  // Emergency password reset endpoint (no auth required, uses secret token)
  app.post("/emergency-reset-password", function (req, res) {
    var secretToken = req.body.secretToken || req.query.secretToken;
    var email = req.body.email || "morrisjason94@gmail.com";
    
    // Simple secret token check (you can change this)
    if (secretToken !== "emergency-reset-2024") {
      return res.json({ success: false, error: "Invalid secret token" });
    }
    
    // Generate a random temporary password
    var tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    User.findOne({ "user.email": email.toLowerCase() }, function (err, user) {
      if (err) {
        return res.json({ success: false, error: "Error finding user: " + err.message });
      }
      
      if (!user) {
        return res.json({ success: false, error: "User not found with email: " + email });
      }
      
      console.log("Resetting password for:", email);
      console.log("Current password hash:", user.user.password ? user.user.password.substring(0, 30) + "..." : "NULL");
      
      // Generate hash for the new password
      var hashedPassword = user.generateHash(tempPassword);
      console.log("New password hash:", hashedPassword.substring(0, 30) + "...");
      
      // Update the user's password
      user.user.password = hashedPassword;
      user.user.updatedAt = new Date();

      // Must call markModified for nested fields or Mongoose won't save them
      user.markModified('user.password');
      user.markModified('user.updatedAt');

      user.save(async function (err) {
        if (err) {
          return res.json({ success: false, error: "Error saving user: " + err.message });
        }

        // Sync password to the API database (send plain password for Go bcrypt compatibility)
        var apiSynced = false;
        try {
          const apiUrl = process.env.POLICE_CAD_API_URL || "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
          const apiToken = process.env.POLICE_CAD_API_TOKEN;

          if (apiToken) {
            await axios.post(`${apiUrl}/api/v1/user/sync-password`, {
              email: email.toLowerCase(),
              password: tempPassword  // Send plain password - API will hash with Go bcrypt
            }, {
              headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
              }
            });
            apiSynced = true;
            console.log("[EMERGENCY RESET] Password synced to API");
          }
        } catch (syncError) {
          console.error('[EMERGENCY RESET] Failed to sync to API:', syncError.response?.data || syncError.message);
        }

        // Verify the password was saved correctly
        User.findOne({ "user.email": email.toLowerCase() }, function (err, verifyUser) {
          var passwordMatches = false;
          var storedHash = null;
          if (!err && verifyUser) {
            storedHash = verifyUser.user.password;
            passwordMatches = verifyUser.verifyPassword(tempPassword);
            console.log("Password verification:", passwordMatches);
          }

          return res.json({
            success: true,
            email: email,
            tempPassword: tempPassword,
            passwordVerified: passwordMatches,
            apiSynced: apiSynced,
            storedHashPreview: storedHash ? storedHash.substring(0, 30) + "..." : null,
            message: (passwordMatches ? "Password reset successful and verified!" : "Password reset but verification failed!") + (apiSynced ? " API synced." : " WARNING: API sync failed!")
          });
        });
      });
    });
  });

  // Add GET route for logout to handle direct navigation
  app.get("/admin/logout", function (req, res) {
    // Calculate session duration before clearing session
    let sessionDuration = null;
    if (req.session && req.session.loginTime) {
      const loginTime = new Date(req.session.loginTime);
      const logoutTime = new Date();
      const durationMs = logoutTime - loginTime;
      
      // Format duration: "Xh Ym" or "Ym" or "Xs"
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        sessionDuration = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        sessionDuration = `${minutes}m`;
      } else {
        sessionDuration = `${seconds}s`;
      }
    }
    
    const adminEmail = req.session && req.session.admin ? req.session.admin.email : null;
    const adminRoles = req.session && req.session.admin ? (req.session.admin.roles || [req.session.admin.role]) : [];
    
    // Log logout activity to backend API before clearing session
    const apiToken = process.env.POLICE_CAD_API_TOKEN;
    const apiUrl = process.env.POLICE_CAD_API_URL || "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
    
    if (apiToken && adminEmail) {
      const axios = require("axios");
      
      // Find admin ID in backend API
      axios.post(`${apiUrl}/api/v1/admin/search/admins`, 
        { 
          query: adminEmail,
          currentUser: {
            email: adminEmail,
            roles: adminRoles
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          timeout: 5000,
          validateStatus: function (status) {
            return status < 600;
          }
        }
      ).then(function(searchResponse) {
        if (searchResponse.status === 200 && searchResponse.data.admins && searchResponse.data.admins.length > 0) {
          const adminId = searchResponse.data.admins[0].id || searchResponse.data.admins[0]._id;
          
          // Log logout activity with session duration
          axios.post(`${apiUrl}/api/v1/admin/activity/log`, 
            {
              adminId: adminId,
              type: 'logout',
              title: 'Admin logged out',
              details: 'Admin user logged out of the system',
              timestamp: new Date().toISOString(),
              sessionDuration: sessionDuration || '0m',
              currentUser: {
                email: adminEmail,
                roles: adminRoles
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
              },
              timeout: 5000,
              validateStatus: function (status) {
                return status < 600;
              }
            }
          ).catch(function(err) {
            // Silently fail - activity logging is not critical
          });
        }
      }).catch(function(err) {
        // Silently fail - activity logging is not critical
      });
    }
    
    // Clear session after logging
    if (req.session) {
      delete req.session.adminToken;
      delete req.session.admin;
      delete req.session.loginTime;
    }
    return res.redirect("/admin");
  });

  // Admin forgot/reset password pages
  app.get("/admin/forgot-password", function(req, res) {
    const error = req.query.error || null;
    const success = req.query.success || null;
    res.render("admin-forgot", { error, success });
  });

  // Admin forgot password - calls Go backend API
  app.post("/admin/forgot-password", async function(req, res) {
    try {
      const email = (req.body && req.body.email) || "";
      if (!email) {
        return res.redirect("/admin/forgot-password?error=" + encodeURIComponent("Email required"));
      }
      
      // Call Go backend API to send reset email
      const axios = require("axios");
      try {
        await axios.post(`${process.env.POLICE_CAD_API_URL}/api/v1/admin/forgot-password`, {
          email: email
        });
        
        // Don't reveal if email exists or not for security
        return res.redirect("/admin/forgot-password?success=" + encodeURIComponent("If that admin email exists, a reset link has been sent."));
      } catch (apiError) {
        // Don't reveal if email exists or not for security
        return res.redirect("/admin/forgot-password?success=" + encodeURIComponent("If that admin email exists, a reset link has been sent."));
      }
    } catch (err) {
      const message = "Unable to send reset link. Please try again.";
      return res.redirect("/admin/forgot-password?error=" + encodeURIComponent(message));
    }
  });

  app.get("/admin/reset-password", function(req, res) {
    const token = req.query.token || "";
    const error = req.query.error || null;
    const success = req.query.success || null;
    res.render("admin-reset", { token, error, success });
  });

  // Admin password reset - calls Go backend API
  app.post("/admin/reset-password", async function(req, res) {
    try {
      const token = (req.body && req.body.token) || "";
      const password = (req.body && req.body.password) || "";
      const confirm = (req.body && req.body.confirm) || "";
      
      if (!token) {
        return res.redirect("/admin/reset-password?error=" + encodeURIComponent("Missing token"));
      }
      if (!password || password !== confirm) {
        return res.redirect("/admin/reset-password?token=" + encodeURIComponent(token) + "&error=" + encodeURIComponent("Passwords do not match"));
      }

      // Call Go backend API to reset password
      const axios = require("axios");
      try {
        const response = await axios.post(`${process.env.POLICE_CAD_API_URL}/api/v1/admin/reset-password`, {
          token: token,
          password: password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.POLICE_CAD_API_TOKEN}`
          }
        });
        
        return res.redirect("/admin/console?success=" + encodeURIComponent("Password updated successfully!"));
      } catch (apiError) {
        return res.redirect("/admin/reset-password?error=" + encodeURIComponent("Failed to reset password. Please try again."));
      }
    } catch (err) {
      const message = "Unable to reset password. Please try again.";
      return res.redirect("/admin/reset-password?error=" + encodeURIComponent(message));
    }
  });



  // now handled by Next.js
  // app.get("/penal-code", function (req, res) {
  //   res.render("penal-code");
  // });

  app.get("/ads.txt", (req, res) => {
    res.set("Content-Type", "text");
    let message = "google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0";
    return res.send(
      new Buffer.alloc(
        message.length,
        "google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0"
      )
    );
  });

  app.get("/app-ads.txt", (req, res) => {
    res.set("Content-Type", "text");
    let message = "google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0";
    return res.send(
      new Buffer.alloc(
        message.length,
        "google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0"
      )
    );
  });

  // Login page is now handled by Next.js at app/login/page.tsx
  
  // Redirect /login-civ to /login for backward compatibility
  app.get("/login-civ", function (req, res) {
    // Preserve query parameters (like redirect)
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return res.redirect("/login" + queryString);
  });


  app.get("/login-police", authCheck, function (req, res) {
    return res.redirect("/police-dashboard");
  });

  app.get("/login-ems", authCheck, function (req, res) {
    return res.redirect("/ems-dashboard");
  });

  app.get("/login-community", authCheck, function (req, res) {
    return res.redirect("/communities");
  });

  app.get("/login-dispatch", authCheck, function (req, res) {
    return res.redirect("/dispatch-dashboard");
  });

  // Redirect /signup-civ to /signup for backward compatibility
  app.get("/signup-civ", function (req, res) {
    if (req.isAuthenticated()) {
      return res.redirect("/communities");
    }
    // Preserve query parameters if any
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return res.redirect("/signup" + queryString);
  });

  app.get("/signup-police", authCheck, function (req, res) {
    return res.redirect("/police-dashboard");
  });

  app.get("/signup-ems", authCheck, function (req, res) {
    return res.redirect("/ems-dashboard");
  });

  app.get("/signup-community", authCheck, function (req, res) {
    return res.redirect("/communities");
  });

  app.get("/signup-dispatch", authCheck, function (req, res) {
    return res.redirect("/dispatch-dashboard");
  });

  app.get("/sockjs-node", function (req, res) {
    return res.redirect("/");
  });

  app.get("/logout", function (req, res) {
    req.logout();
    return res.redirect("/");
  });

  /* /communities loads the Community view. Contains the current
   *   community that was clicked on to be edited.
   *   This is the default landing page when a user clicks on one of the listed 'Communities'.
   *   Users can 'copy' the community code or 'edit' the community name.
   *   Also community admins can 'kick' members from their community.
   */
  app.get("/communities", function (req, res) {
    req.app.locals.specialContext = null;
    return res.render("communities", {
      members: null,
      communities: null,
      userID: null,
      user: req.user,
      referer: encodeURIComponent("/communities"),
      redirect: encodeURIComponent(redirect),
    });
  });

  app.get("/owned-communities", auth, function (req, res) {
    axios
      .get(
        `${policeCadApiUrl}/api/v1/communities/${req.session.passport.user}`,
        config
      )
      .then(function (response) {
        if (!exists(response.data)) {
          res.status(400);
          res.redirect("back");
        } else {
          res.render("communities-owned", {
            communities: response.data,
            userID: req.session.passport.user,
            user: req.user,
            referer: encodeURIComponent("/owned-communities"),
            redirect: encodeURIComponent(redirect),
          });
        }
      })
      .catch((err) => {
        res.status(400);
        res.redirect("back");
      });
  });

  // Forgot Password page is now handled by Next.js at app/forgot-password/page.tsx
  // app.get("/forgot-password", function (req, res) {
  //   return res.render("forgot-password", {
  //     user: req.user,
  //     message: req.flash("emailSend"),
  //   });
  // });

  // API endpoint to validate reset token (for Next.js)
  app.get("/api/reset-token/validate", function (req, res) {
    const token = req.session.resetToken;
    const currentTime = Date.now();
    
    if (!token) {
      return res.json({ valid: false, message: "No reset token found in session." });
    }
    
    User.findOne(
      {
        "user.resetPasswordToken": token,
        "user.resetPasswordExpires": {
          $gt: currentTime,
        },
      },
      function (err, user) {
        if (err) {
          console.error('Error validating reset token:', err);
          return res.json({ valid: false, message: "Error validating token." });
        }
        if (!user) {
          return res.json({ valid: false, message: "Password reset token is invalid or has expired." });
        }
        return res.json({ valid: true });
      }
    );
  });

  app.get("/reset/:token", function (req, res) {
    if (req.params.token && req.params.token != "encryptedToken") {
      // Store token in session and redirect to encryptedToken route
      const urlToken = req.params.token;
      req.session.resetToken = urlToken;
      
      // Save session before redirecting, but don't block if it's slow
      const saveTimeout = setTimeout(() => {
        if (!res.headersSent) {
          return res.redirect(`/reset/${encodeURIComponent(urlToken)}`);
        }
      }, 2000); // 2 second timeout for session save
      
      req.session.save(function (err) {
        clearTimeout(saveTimeout);
        if (err) {
          req.flash(
            "emailSend",
            "An error occurred. Please try again."
          );
          if (!res.headersSent) {
            return res.redirect("/forgot-password");
          }
          return;
        }
        if (!res.headersSent) {
          return res.redirect("/reset/encryptedToken");
        }
      });
    } else {
      // Token is in session (encryptedToken route), validate and let Next.js handle
      if (!req.session.resetToken) {
        req.flash(
          "emailSend",
          "Password reset token is invalid or has expired."
        );
        return res.redirect("/forgot-password");
      }
      
      const sessionToken = req.session.resetToken;
      const currentTime = Date.now();
      
      User.findOne(
        {
          "user.resetPasswordToken": sessionToken,
          "user.resetPasswordExpires": {
            $gt: currentTime,
          },
        },
        function (err, user) {
          if (err) return console.error(err);
          if (!user) {
            req.flash(
              "emailSend",
              "Password reset token is invalid or has expired."
            );
            return res.redirect("/forgot-password");
          }
          // Token is valid, let Next.js handle the page
          // Check for flash messages and add to query if present
          const flashMessage = req.flash("resetSend");
          const message = flashMessage && flashMessage.length > 0 ? flashMessage[0] : null;
          if (message && !req.query.message) {
            // Add message to query string only if not already present
            const separator = req.url.includes('?') ? '&' : '?';
            req.url = req.url + separator + 'message=' + encodeURIComponent(message);
          }
          // Let Next.js handle it - don't redirect, just pass through
          return handle(req, res);
        }
      );
    }
  });

  // Middleware to decode base64 query param
  const decodeDataParam = (req, res, next) => {
    const { data } = req.query;
    if (!data) {
      return res.redirect("/"); // Redirect if no data
    }
    try {
      const decoded = JSON.parse(Buffer.from(data, "base64").toString());
      req.decodedData = decoded; // Store decoded userId and communityId
      next();
    } catch (error) {
      console.error("Error decoding data param:", error);
      res.status(400).send("Invalid data parameter");
    }
  };

    // Civilian dashboard with beta opt-in: check user preference, redirect to
    // new unified dashboard if opted in, otherwise render classic civ-dashboard.
    app.get("/civ-dashboard", authCheck, async function (req, res) {
      try {
        // Check if user opted into the beta civilian dashboard
        try {
          const prefsRes = await axios.get(
            `${policeCadApiUrl}/api/v1/user-preferences/${req.user._id}`, config
          );
          if (prefsRes.data && prefsRes.data.betaCivDashboard === true) {
            const queryString = req.originalUrl.split('?')[1] || '';
            return res.redirect(`/department-dashboard${queryString ? '?' + queryString : ''}`);
          }
        } catch (prefErr) {
          // If preferences fetch fails, fall through to classic dashboard
        }

        var context = req.app.locals.specialContext;
        req.app.locals.specialContext = null;

        const departmentName = req.query.dept || null;
        const encodedDeptId = req.query.d || null;

        let departmentId = null;
        if (encodedDeptId) {
          try {
            let base64 = encodedDeptId
              .replace(/-/g, '+')
              .replace(/_/g, '/');
            while (base64.length % 4) {
              base64 += '=';
            }
            departmentId = Buffer.from(base64, 'base64').toString('utf8');
            if (!/^[a-fA-F0-9]{24}$/.test(departmentId)) {
              departmentId = null;
            }
          } catch (e) {
            console.error('Failed to decode department ID:', e);
            departmentId = null;
          }
        }

        if (!departmentId && !departmentName) {
          const communityId = (req.user && req.user.user && (req.user.user.lastAccessedCommunity && req.user.user.lastAccessedCommunity.communityID)) || (req.user && req.user.user && req.user.user.activeCommunity);
          if (communityId) {
            return res.redirect(`/community/${encodeId(communityId)}?notice=selectDepartment#departments-section`);
          }
          return res.redirect('/communities');
        }

        let departmentComponents = {};

        if (departmentId && departmentName) {
          const communityId = req.user.user.lastAccessedCommunity?.communityID || req.user.user.activeCommunity;

          if (!communityId || !/^[a-fA-F0-9]{24}$/.test(communityId)) {
            return res.status(403).render("error", {
              message: "No active community found. Please select a community first.",
              redirect: "/communities",
            });
          }

          let isAdmin = false;
          try {
            const rolesApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/roles`;
            const rolesResponse = await axios.get(rolesApiUrl, config);
            const roles = rolesResponse.data || [];
            roles.forEach(role => {
              if (Array.isArray(role.members) && role.members.includes(String(req.user._id))) {
                if (Array.isArray(role.permissions)) {
                  role.permissions.forEach(perm => {
                    if (perm.name === 'administrator' && perm.enabled === true) {
                      isAdmin = true;
                    }
                  });
                }
              }
            });
          } catch (err) {
            console.error('Error fetching community roles:', err.message);
          }

          if (!isAdmin) {
            const apiUrl = `${policeCadApiUrl}/api/v2/community/${communityId}/departments?userId=${req.user._id}&page=1&limit=100`;
            try {
              const userDepartmentsResponse = await axios.get(apiUrl, config);
              const userDepartments = userDepartmentsResponse.data.data || [];
              const userHasAccess = userDepartments.some(dept => dept._id === departmentId && dept.accessStatus === 'approved');
              if (!userHasAccess) {
                return res.status(403).render("error", {
                  message: "You don't have access to this department. Please contact the department administrator.",
                  redirect: "/departments",
                });
              }
            } catch (apiError) {
              console.error('API Error:', apiError.message);
            }
          }

          try {
            const deptApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/departments/${departmentId}`;
            const deptResponse = await axios.get(deptApiUrl, config);
            const dept = deptResponse.data && deptResponse.data.department;
            if (dept && dept.template && Array.isArray(dept.template.components)) {
              dept.template.components.forEach(c => {
                departmentComponents[c.name] = c.enabled;
              });
            }
          } catch (deptErr) {
            console.error('Error fetching department components:', deptErr.message);
          }
        }

        res.render("civ-dashboard", {
          user: req.user,
          context: context,
          referer: encodeURIComponent("/civ-dashboard"),
          redirect: encodeURIComponent(redirect),
          departmentName: departmentName,
          departmentId: departmentId,
          departmentComponents: departmentComponents,
          apiUrl: policeCadApiUrl,
        });
      } catch (error) {
        console.error('Error in civ-dashboard route:', error);
        return res.status(500).render("error", {
          message: "An error occurred while loading the dashboard. Please try again.",
          redirect: "/communities",
        });
      }
    });

  app.get("/court-session", authCheck, async function (req, res) {
    try {
      var context = req.app.locals.specialContext;
      req.app.locals.specialContext = null;

      res.render("court-session", {
        user: req.user,
        context: context,
        referer: encodeURIComponent("/court-session"),
        redirect: encodeURIComponent(redirect),
        apiUrl: policeCadApiUrl,
      });
    } catch (error) {
      console.error('Error in court-session route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading the court session. Please try again.",
        redirect: "/communities",
      });
    }
  });

  // Redirect old judicial-dashboard to communities (functionality moved into department dashboard)
  app.get("/judicial-dashboard", authCheck, function (req, res) {
    res.redirect("/communities");
  });

  // Standalone court cases page (read-only view for all users)
  app.get("/court-cases", authCheck, async function (req, res) {
    try {
      const encodedCommunityId = req.query.c || null;
      let urlCommunityId = null;
      const communityIdPattern = /^[a-fA-F0-9]{24}$/;
      if (encodedCommunityId) {
        try {
          const decoded = decodeId(encodedCommunityId);
          if (communityIdPattern.test(decoded)) {
            urlCommunityId = decoded;
          }
        } catch (e) {
          console.error('Failed to decode community ID from court-cases URL:', e);
        }
      }

      const communityId = urlCommunityId
                       || req.user?.user?.lastAccessedCommunity?.communityID
                       || req.user?.user?.activeCommunity;
      if (!communityId) {
        return res.redirect('/communities');
      }

      let communityName = null;
      try {
        const communityResponse = await axios.get(
          `${policeCadApiUrl}/api/v1/community/${communityId}`,
          config
        );
        communityName = communityResponse.data?.community?.name || null;
      } catch (err) {
        console.error('Error fetching community name for court-cases:', err.message);
      }

      res.render("court-cases", {
        user: req.user,
        communityId: communityId,
        communityName: communityName,
        apiUrl: policeCadApiUrl,
      });
    } catch (error) {
      console.error('Error in court-cases route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading court cases. Please try again.",
        redirect: "/communities",
      });
    }
  });

  // ----- Economy: Wallet + Inbox (Phase 1) -----
  async function resolveEconomyContext(req) {
    const objectIdPattern = /^[a-fA-F0-9]{24}$/;

    // 1. Resolve an explicit civilian target from the URL (?c=<encoded>) so
    //    deep-links and the on-page civilian-switcher keep working.
    let civilianId = null;
    if (req.query.c) {
      try {
        const decoded = decodeId(req.query.c);
        if (objectIdPattern.test(decoded)) civilianId = decoded;
      } catch (e) {}
    }
    if (!civilianId && req.query.civId && objectIdPattern.test(req.query.civId)) {
      civilianId = req.query.civId;
    }

    // 2. Resolve the active community: prefer the explicit ?community=<encoded>
    //    param sent by dashboards, then fall back to session state. This is
    //    the source of truth for which community's wallet/inbox we render,
    //    and it scopes the civilian fallback below so we don't accidentally
    //    pick a civilian from another community the user belongs to.
    let communityId = "";
    if (req.query.community) {
      try {
        const decoded = decodeId(req.query.community);
        if (objectIdPattern.test(decoded)) communityId = decoded;
      } catch (e) {}
    }
    if (!communityId) {
      communityId = req.user?.user?.lastAccessedCommunity?.communityID
                 || req.user?.user?.activeCommunity
                 || "";
    }

    const userId = (req.user && req.user._id) ? String(req.user._id) : null;
    let civilian = null;
    if (civilianId) {
      try { civilian = await Civilian.findById(ObjectId(civilianId)).lean(); } catch (e) {}
    }

    // Fetch the user's persisted "active civilian" for this community (the
    // shared pick written by the wallet's Set-as-active button and the
    // bot's /set-active-civilian). We use it for two things:
    //   - identifying the active civ in the UI even when the user is
    //     viewing a different one via ?c=<encoded>
    //   - falling back to it when no civilian is pinned in the URL
    // The civilian may have been deleted since the row was written, so we
    // re-verify it exists before trusting it.
    let activeCivilianId = "";
    if (userId && communityId) {
      try {
        const acResp = await axios.get(
          `${policeCadApiUrl}/api/v2/user/active-civilian?userId=${encodeURIComponent(userId)}&communityId=${encodeURIComponent(communityId)}`,
          config,
        );
        const candidate = acResp?.data?.civilianId || "";
        if (candidate && objectIdPattern.test(candidate)) {
          // Verify the civilian still exists and still belongs to this
          // user + community. If it doesn't, treat the pick as gone and
          // fall through to the most-recently-updated fallback.
          try {
            const verify = await Civilian.findOne({
              _id: ObjectId(candidate),
              "civilian.userID": userId,
              "civilian.activeCommunityID": communityId,
            }).lean();
            if (verify) activeCivilianId = candidate;
          } catch (e) {}
        }
      } catch (e) {
        // 4xx/5xx/null body — no persisted active civ; that's fine.
      }
    }

    if (!civilian && activeCivilianId) {
      try { civilian = await Civilian.findById(ObjectId(activeCivilianId)).lean(); } catch (e) {}
    }
    if (!civilian && userId) {
      try {
        const query = { "civilian.userID": userId };
        // Scope to the active community when known so we don't surface a
        // civilian from a different community the user happens to have
        // touched more recently.
        if (communityId) query["civilian.activeCommunityID"] = communityId;
        civilian = await Civilian.findOne(query).sort({ "civilian.updatedAt": -1 }).lean();
      } catch (e) {}
    }
    const resolvedCivId = civilian ? String(civilian._id) : "";
    // Older civ docs store the full name in `name` rather than firstName/lastName,
    // so fall back to that before returning an empty string.
    const civName = civilian
      ? ([civilian.civilian?.firstName, civilian.civilian?.lastName].filter(Boolean).join(" ")
         || civilian.civilian?.name || "")
      : "";
    // If the URL pinned an explicit civilian but no community was provided,
    // honor the civilian's own community so the page header matches.
    if (!communityId && civilian?.civilian?.activeCommunityID) {
      communityId = civilian.civilian.activeCommunityID;
    }
    let communityName = null;
    // Per-community currency: the wallet/inbox/jobs widgets all use this
    // to render amounts. Sourced from community.penalCodes (the active
    // currency surface; community.fines is deprecated).
    let currencyCode = "USD";
    let currencySymbol = "$";
    // Defaults to true when no community is in context — without a community
    // we can't say economy is off, and falling through to the normal empty
    // states is safer than wrongly showing the "disabled" banner.
    let economyEnabled = true;
    if (communityId) {
      try {
        const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}`, config);
        communityName = r.data?.community?.name || null;
        const cur = resolveCommunityCurrency(r.data);
        currencyCode = cur.code;
        currencySymbol = cur.symbol;
        economyEnabled = resolveCommunityEconomyEnabled(r.data);
      } catch (e) {}
    }
    return {
      civilianId: resolvedCivId,
      civilianName: civName,
      encodedCivId: resolvedCivId ? encodeId(resolvedCivId) : "",
      communityId,
      encodedCommunityId: communityId ? encodeId(communityId) : "",
      communityName,
      userId: userId || "",
      // Lets the wallet show a "Set as active" affordance when the viewer
      // is browsing a different civilian than their persisted active pick.
      activeCivilianId,
      isActiveCivilian: !!(resolvedCivId && activeCivilianId && resolvedCivId === activeCivilianId),
      currencyCode,
      currencySymbol,
      economyEnabled,
    };
  }

  // Mirror of the builtin map in public/js/details-modal.js — kept in sync
  // so server-rendered defaults match what the existing ticket flow shows
  // when a community hasn't extended `penalCodes.currencies` with a custom
  // entry.
  function builtinCurrencySymbol(code) {
    const builtin = { USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$" };
    return builtin[code] || code || "$";
  }

  // Resolve the community's active currency from a /api/v1/community/<id>
  // response. Used by the economy-aware dashboards (wallet, inbox, dept,
  // command) so all amounts render with the community-configured symbol.
  // Sourced from community.penalCodes — community.fines is deprecated.
  function resolveCommunityCurrency(communityResponseData) {
    const pc = communityResponseData?.community?.penalCodes;
    const code = (pc && pc.currency) ? String(pc.currency) : "USD";
    let symbol = builtinCurrencySymbol(code);
    if (Array.isArray(pc?.currencies)) {
      const match = pc.currencies.find(opt => opt && opt.code === code);
      if (match && match.symbol) symbol = String(match.symbol);
    }
    return { code, symbol };
  }

  // True when at least one department in the community has economy enabled.
  // The economy is a per-department toggle (basePay, payouts, etc.), but for
  // surface-level gating — should the Wallet/Inbox nav items render? should
  // the wallet/inbox pages show a "disabled" banner? — we treat the community
  // as economy-on if any department has it on. Mirrors the wallet.ejs filter
  // (`depts.filter(d => d.economyEnabled)`).
  function resolveCommunityEconomyEnabled(communityResponseData) {
    const depts = communityResponseData?.community?.departments;
    if (!Array.isArray(depts) || !depts.length) return false;
    return depts.some(d => d && d.economyEnabled === true);
  }

  app.get("/wallet", authCheck, async function (req, res) {
    try {
      const ctx = await resolveEconomyContext(req);
      // We deliberately render the wallet shell even when no civilian
      // exists in the active community — the page shows a "create a
      // civilian here" empty state in that case. Redirecting away (the
      // old behavior) silently bounced the user to /civ-dashboard →
      // /department-dashboard (beta pref) and dropped the community
      // context entirely.
      res.render("wallet", {
        user: req.user,
        apiUrl: policeCadApiUrl,
        ...ctx,
      });
    } catch (error) {
      console.error("Error in /wallet route:", error);
      return res.status(500).render("error", {
        message: "An error occurred while loading your wallet. Please try again.",
        redirect: "/civ-dashboard",
      });
    }
  });

  app.get("/economy-settings", authCheck, async function (req, res) {
    try {
      const userId = (req.user && req.user._id) ? String(req.user._id) : "";
      const communityId = req.user?.user?.lastAccessedCommunity?.communityID
                       || req.user?.user?.activeCommunity;
      if (!communityId) return res.redirect("/communities");
      let communityName = null;
      try {
        const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}`, config);
        communityName = r.data?.community?.name || null;
      } catch (e) {}
      res.render("economy-settings", {
        user: req.user,
        apiUrl: policeCadApiUrl,
        communityId,
        encodedCommunityId: encodeId(communityId),
        communityName,
        userId,
      });
    } catch (error) {
      console.error("Error in /economy-settings route:", error);
      return res.status(500).render("error", {
        message: "An error occurred while loading economy settings. Please try again.",
        redirect: "/communities",
      });
    }
  });

  app.get("/inbox", authCheck, async function (req, res) {
    try {
      const ctx = await resolveEconomyContext(req);
      // Render the shell even with no civilian; the page shows a clear
      // empty state in that case (and avoids the legacy user-level
      // fallback fetch, which leaks items from other communities).
      res.render("inbox", {
        user: req.user,
        apiUrl: policeCadApiUrl,
        ...ctx,
      });
    } catch (error) {
      console.error("Error in /inbox route:", error);
      return res.status(500).render("error", {
        message: "An error occurred while loading your inbox. Please try again.",
        redirect: "/civ-dashboard",
      });
    }
  });

  // ----- Configurable Forms / Reports -----
  // Resolve the current community from the optional ?c= encoded id, falling
  // back to the user's lastAccessedCommunity. Returns nulls when none.
  function resolveCommunityFromReq(req) {
    const encoded = req.query.c || null;
    let communityId = null;
    if (encoded) {
      try {
        const decoded = decodeId(encoded);
        if (isValidObjectId(decoded)) communityId = decoded;
      } catch (e) {
        console.error('Failed to decode community ID:', e);
      }
    }
    if (!communityId) {
      communityId = req.user?.user?.lastAccessedCommunity?.communityID
                 || req.user?.user?.activeCommunity
                 || null;
    }
    const communityIdEncoded = communityId ? encodeId(communityId) : null;
    return { communityId, communityIdEncoded };
  }

  function buildCurrentUserContext(req) {
    if (!req.user) return null;
    return {
      id: req.user._id ? String(req.user._id) : null,
      username: req.user.user?.username || null,
    };
  }

  // Returns true when the user is the community owner OR has the
  // 'administrator' permission via community roles. Mirrors the gating
  // used elsewhere in routes.js. Failures are non-fatal: a network blip
  // returns false (no UI shown) rather than 500-ing the page.
  async function userCanManageCommunity(req, communityId) {
    if (!req.user || !communityId) return false;
    const userId = req.user._id ? String(req.user._id) : null;
    if (!userId) return false;
    try {
      const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}`, config);
      const community = r.data?.community;
      if (community?.ownerID && String(community.ownerID) === userId) return true;
    } catch (e) {
      console.error('userCanManageCommunity: community lookup failed:', e.message);
    }
    try {
      const rolesResp = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}/roles`, config);
      const roles = rolesResp.data || [];
      for (const role of roles) {
        if (!Array.isArray(role.members) || !role.members.includes(userId)) continue;
        if (!Array.isArray(role.permissions)) continue;
        for (const perm of role.permissions) {
          if (perm?.name === 'administrator' && perm.enabled === true) return true;
        }
      }
    } catch (e) {
      console.error('userCanManageCommunity: roles lookup failed:', e.message);
    }
    return false;
  }

  // Reports list page
  app.get("/reports", authCheck, async function (req, res) {
    const { communityId, communityIdEncoded } = resolveCommunityFromReq(req);
    if (!communityId) return res.redirect('/communities');

    let communityName = null;
    try {
      const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}`, config);
      communityName = r.data?.community?.name || null;
    } catch (err) {
      console.error('Error fetching community for /reports:', err.message);
    }

    const canManageForms = await userCanManageCommunity(req, communityId);

    res.render("reports-list", {
      user: req.user,
      apiUrl: policeCadApiUrl,
      communityId,
      communityIdEncoded,
      communityName,
      canManageForms,
      currentUser: buildCurrentUserContext(req),
    });
  });

  // Returns the list of departments the user can file a report against.
  // Admins (canManage === true) get the full community list; everyone
  // else gets the depts they're a member of. Always returns an array;
  // never throws — caller falls back to empty so the picker renders an
  // "All depts unavailable" message instead of breaking the whole page.
  async function listAccessibleDepartments(req, communityId, canManage) {
    const userId = req.user?._id ? String(req.user._id) : '';
    try {
      if (canManage) {
        const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}/departments`, config);
        const arr = r.data?.departments || r.data?.data || r.data || [];
        return arr.map((d) => ({ id: String(d._id || d.id || ''), name: d?.department?.name || d.name || '(unnamed)' }))
          .filter((d) => !!d.id);
      }
      if (!userId) return [];
      const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}/user/${userId}/departments`, config);
      const arr = r.data?.departments || [];
      return arr
        .filter((d) => (d.accessStatus || '').toLowerCase() === 'approved' || d.accessStatus === undefined)
        .map((d) => ({ id: String(d._id || d.id || ''), name: d?.department?.name || d.name || '(unnamed)' }))
        .filter((d) => !!d.id);
    } catch (e) {
      console.error('listAccessibleDepartments failed:', e.message);
      return [];
    }
  }

  // New report page (no submission yet)
  app.get("/reports/new", authCheck, async function (req, res) {
    const { communityId, communityIdEncoded } = resolveCommunityFromReq(req);
    if (!communityId) return res.redirect('/communities');
    const slug = (req.query.slug || 'incident-report').replace(/[^a-z0-9-_]/gi, '');
    const departmentId = req.user?.user?.lastAccessedCommunity?.activeDepartmentID || '';

    const canManageForms = await userCanManageCommunity(req, communityId);
    const accessibleDepartments = await listAccessibleDepartments(req, communityId, canManageForms);

    res.render("report-edit", {
      user: req.user,
      apiUrl: policeCadApiUrl,
      communityId,
      communityIdEncoded,
      departmentId,
      accessibleDepartments,
      slug,
      submissionId: '',
      readOnly: false,
      currentUser: buildCurrentUserContext(req),
      canManageForms,
    });
  });

  // View / edit existing report
  app.get("/reports/:id", authCheck, async function (req, res) {
    const submissionId = req.params.id;
    if (!isValidObjectId(submissionId)) return res.redirect('/reports');

    const { communityId, communityIdEncoded } = resolveCommunityFromReq(req);
    if (!communityId) return res.redirect('/communities');

    const departmentId = req.user?.user?.lastAccessedCommunity?.activeDepartmentID || '';
    const readOnly = req.query.view === '1';

    const canManageForms = await userCanManageCommunity(req, communityId);
    const accessibleDepartments = await listAccessibleDepartments(req, communityId, canManageForms);

    res.render("report-edit", {
      user: req.user,
      apiUrl: policeCadApiUrl,
      communityId,
      communityIdEncoded,
      departmentId,
      accessibleDepartments,
      slug: 'incident-report', // overridden client-side once submission loads
      submissionId,
      readOnly,
      currentUser: buildCurrentUserContext(req),
      canManageForms,
    });
  });

  // Print / PDF view
  app.get("/reports/:id/print", authCheck, async function (req, res) {
    const submissionId = req.params.id;
    if (!isValidObjectId(submissionId)) return res.redirect('/reports');

    const { communityId, communityIdEncoded } = resolveCommunityFromReq(req);
    if (!communityId) return res.redirect('/communities');

    // Look up community letterhead. Logo precedence: community image →
    // LPC fallback (handled client-side). Department info is still
    // pulled when available so the printed agency line can fall back
    // to a department name when the community has none.
    let departmentName = null;
    let departmentImage = null;
    let communityName = null;
    let communityImage = null;
    const deptId = req.user?.user?.lastAccessedCommunity?.activeDepartmentID || '';
    try {
      const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}`, config);
      const community = r.data?.community;
      const details = community?.communityDetails || community?.community || community || {};
      communityName = details.name || details.communityName || null;
      communityImage = details.imageLink || details.image || null;
      if (deptId) {
        const departments = details.departments || community?.departments || [];
        const match = departments.find(d => String(d._id) === deptId || String(d.id) === deptId);
        if (match) {
          departmentName = match.name || match.departmentName || null;
          departmentImage = match.image || match.imageLink || null;
        }
      }
    } catch (err) {
      console.error('Error fetching community/department for print view:', err.message);
    }

    res.render("report-print", {
      user: req.user,
      apiUrl: policeCadApiUrl,
      communityId,
      communityIdEncoded,
      submissionId,
      departmentId: deptId,
      departmentName,
      departmentImage,
      communityName,
      communityImage,
    });
  });
  // Community-scoped forms builder (admin)
  app.get("/community/:hash/forms", authCheck, async function (req, res) {
    let communityId = null;
    try {
      const decoded = decodeId(req.params.hash);
      if (isValidObjectId(decoded)) communityId = decoded;
    } catch (e) {
      console.error('Failed to decode community id for /forms:', e);
    }
    if (!communityId) return res.redirect('/communities');
    const communityIdEncoded = req.params.hash;

    const canManageForms = await userCanManageCommunity(req, communityId);

    let communityName = null;
    try {
      const r = await axios.get(`${policeCadApiUrl}/api/v1/community/${communityId}`, config);
      communityName = r.data?.community?.name || null;
    } catch (err) {
      if (renderPendingDeletionIfApplicable(req, res, err)) return;
      console.error('Error fetching community for /forms:', err.message);
    }

    // Blocked users still get the page rendered (read-only) with a
    // permission overlay — feels less broken than an error page, and
    // keeps the URL shareable so an admin can land on the same view.
    res.render("community-forms", {
      user: req.user,
      apiUrl: policeCadApiUrl,
      communityId,
      communityIdEncoded,
      communityName,
      currentUser: buildCurrentUserContext(req),
      blocked: !canManageForms,
    });
  });
  // ----- end Configurable Forms / Reports -----

  // Help & Tutorial page
  app.get("/help", authCheck, function (req, res) {
    res.render("help-tutorial", {
      user: req.user,
    });
  });

  app.get("/ems-dashboard", authCheck, async function (req, res) {
    try {
      var context = req.app.locals.specialContext;
      req.app.locals.specialContext = null;
      
      // Get department info from query parameters
      const departmentName = req.query.dept || null;
      const encodedDeptId = req.query.d || null;
      
      // Decode the department ID if present
      let departmentId = null;
      if (encodedDeptId) {
        try {
          // Reverse the encoding: restore base64 padding and decode
          let base64 = encodedDeptId
            .replace(/-/g, '+')
            .replace(/_/g, '/');

          // Add padding back
          while (base64.length % 4) {
            base64 += '=';
          }

          departmentId = Buffer.from(base64, 'base64').toString('utf8');
        } catch (e) {
          console.error('Failed to decode department ID:', e);
          departmentId = null;
        }
      }

      // Decode the community ID from URL param if present
      const encodedCommunityId = req.query.c || null;
      let urlCommunityId = null;
      // MongoDB ObjectId pattern for validation (prevents SSRF)
      const communityIdPattern = /^[a-fA-F0-9]{24}$/;
      if (encodedCommunityId) {
        try {
          let base64 = encodedCommunityId
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decoded = Buffer.from(base64, 'base64').toString('utf8');
          // Validate decoded community ID to prevent SSRF
          if (communityIdPattern.test(decoded)) {
            urlCommunityId = decoded;
          } else {
            console.warn('Rejected invalid community ID from URL:', decoded);
          }
        } catch (e) {
          console.error('Failed to decode community ID from URL:', e);
        }
      }

      // Use community ID from URL if provided and valid, otherwise fall back to user's context
      const communityId = urlCommunityId || req.user.user?.lastAccessedCommunity?.communityID || req.user.user?.activeCommunity;

      // If no department context is provided, redirect to community or communities
      if (!(departmentId || req.session.departmentId) && !departmentName) {
        if (communityId) {
          return res.redirect(`/community/${encodeId(communityId)}?notice=selectDepartment#departments-section`);
        }
        return res.redirect('/communities');
      }

      // If a specific department is requested, verify user access
      if (departmentId && departmentName) {
        if (!communityId) {
          return res.status(403).render("error", {
            message: "No active community found. Please select a community first.",
            redirect: "/communities",
          });
        }

        // --- ADMIN CHECK USING COMMUNITY ROLES API ---
        let isAdmin = false;
        try {
          const rolesApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/roles`;
          const rolesResponse = await axios.get(rolesApiUrl, config);
          const roles = rolesResponse.data || [];
          roles.forEach(role => {
            if (Array.isArray(role.members) && role.members.includes(String(req.user._id))) {
              if (Array.isArray(role.permissions)) {
                role.permissions.forEach(perm => {
                  if (perm.name === 'administrator' && perm.enabled === true) {
                    isAdmin = true;
                  }
                });
              }
            }
          });
        } catch (err) {
          console.error('Error fetching community roles:', err.message);
        }
        // --- END ADMIN CHECK ---

        if (!isAdmin) {
          // Check if user has access to this department by fetching user's departments
          const apiUrl = `${policeCadApiUrl}/api/v2/community/${communityId}/departments?userId=${req.user._id}&page=1&limit=100`;
          try {
            const userDepartmentsResponse = await axios.get(apiUrl, config);
            const userDepartments = userDepartmentsResponse.data.data || [];
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId && dept.accessStatus === 'approved');
            if (!userHasAccess) {
              return res.status(403).render("error", {
                message: "You don't have access to this department. Please contact the department administrator.",
                redirect: "/departments",
              });
            }
          } catch (apiError) {
            console.error('API Error:', apiError.message);
            // Allow access if API is not available - this is a fallback
          }
        }
      }

      // Fetch EMS vehicles, calls, and community info
      let dbEmsVehicles = null;
      let dbCalls = null;
      let communityName = null;

      // Fetch community name using the resolved community ID
      if (communityId) {
        try {
          const communityResponse = await axios.get(
            `${policeCadApiUrl}/api/v1/community/${communityId}`,
            config
          );
          communityName = communityResponse.data?.community?.name || null;
        } catch (err) {
          console.error('Error fetching community:', err.message);
        }
      }

      try {
        const vehiclesResponse = await axios.get(
          `${policeCadApiUrl}/api/v1/ems-vehicles?user_id=${req.session.passport.user}&active_community_id=${req.user.user.activeCommunity}`,
          config
        );
        dbEmsVehicles = vehiclesResponse.data.vehicles || vehiclesResponse.data;
      } catch (err) {
        console.error('Error fetching EMS vehicles:', err);
      }

      try {
        const callsResponse = await axios.get(
          `${policeCadApiUrl}/api/v2/calls/community/${req.user.user.activeCommunity}?status=true&limit=10&page=1`,
          config
        );
        // v2 API returns { data: [...], totalCount, page, limit }
        dbCalls = callsResponse.data.data || callsResponse.data;
      } catch (err) {
        console.error('Error fetching calls:', err);
      }

      res.render("ems-dashboard", {
        user: req.user,
        vehicles: exists(dbEmsVehicles) ? dbEmsVehicles : null,
        calls: exists(dbCalls) ? dbCalls : null,
        context: context,
        referer: encodeURIComponent("/ems-dashboard"),
        redirect: encodeURIComponent(redirect),
        departmentId: departmentId || req.session.departmentId || null,
        departmentName: departmentName,
        communityName: communityName,
        apiUrl: policeCadApiUrl,
      });
    } catch (error) {
      console.error('🚨 Error in ems-dashboard route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading the dashboard. Please try again.",
        redirect: "/communities",
      });
    }
  });

  // Profile route is now handled by Next.js at app/profile/page.tsx
  // app.get("/profile", authCheck, function (req, res) {
  //   return res.render("profile", {
  //     user: req.user,
  //     referer: encodeURIComponent("/profile"),
  //     redirect: encodeURIComponent(redirect),
  //   });
  // });

  app.get("/community-dashboard", authCheck, function (req, res) {
    return res.render("community-dashboard", {
      user: req.user,
      personas: null,
      vehicles: null,
      communities: [],
      context: null,
      referer: encodeURIComponent("/community-dashboard"),
      redirect: encodeURIComponent(redirect),
    });
  });

  app.get("/departments", authCheck, function (req, res) {
    return res.render("departments", {
      user: req.user,
      personas: null,
      vehicles: null,
      communities: [],
      context: null,
      referer: encodeURIComponent("/departments"),
      redirect: encodeURIComponent(redirect),
    });
  });

  app.get("/most-wanted", authCheck, async function (req, res) {
    try {
      // Decode the community ID from URL param if present
      const encodedCommunityId = req.query.c || null;
      let urlCommunityId = null;
      const communityIdPattern = /^[a-fA-F0-9]{24}$/;
      if (encodedCommunityId) {
        try {
          const decoded = decodeId(encodedCommunityId);
          if (communityIdPattern.test(decoded)) {
            urlCommunityId = decoded;
          } else {
            console.warn('Rejected invalid community ID from most-wanted URL:', decoded);
          }
        } catch (e) {
          console.error('Failed to decode community ID from most-wanted URL:', e);
        }
      }

      const communityId = urlCommunityId
                       || req.user?.user?.lastAccessedCommunity?.communityID
                       || req.user?.user?.activeCommunity;
      if (!communityId) {
        return res.redirect('/communities');
      }

      // Fetch community data for settings
      let community = null;
      try {
        const communityResponse = await axios.get(
          `${policeCadApiUrl}/api/v1/community/${communityId}`, config
        );
        community = communityResponse.data;
      } catch (err) {
        console.error('Error fetching community for most-wanted:', err.message);
      }

      // Check if user is owner
      const isOwner = community?.community?.ownerID === String(req.user._id);

      // Check if user is admin via community roles
      let isAdmin = false;
      let roles = [];
      try {
        const rolesApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/roles`;
        const rolesResponse = await axios.get(rolesApiUrl, config);
        roles = rolesResponse.data || [];
        roles.forEach(role => {
          if (Array.isArray(role.members) && role.members.includes(String(req.user._id))) {
            if (Array.isArray(role.permissions)) {
              role.permissions.forEach(perm => {
                if (perm.name === 'administrator' && perm.enabled === true) {
                  isAdmin = true;
                }
              });
            }
          }
        });
      } catch (err) {
        console.error('Error fetching community roles for most-wanted:', err.message);
      }

      // Check if user is in any non-civilian department
      let isDepartmentMember = false;
      try {
        const deptApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/user/${req.user._id}/departments`;
        const deptResponse = await axios.get(deptApiUrl, config);
        const departments = deptResponse.data?.departments || [];
        // Only count non-civilian departments — civilians can view but not edit
        isDepartmentMember = departments.some(dept => {
          const templateName = (dept.template?.name || '').toLowerCase();
          return templateName !== 'civilian';
        });
      } catch (err) {
        console.error('Error fetching user departments for most-wanted:', err.message);
      }

      // Check "manage most wanted" permission — defaults to granted if permission doesn't exist on role
      if (isDepartmentMember) {
        const userId = String(req.user._id);
        const userRoles = roles.filter(r =>
          Array.isArray(r.members) && r.members.includes(userId)
        );

        if (userRoles.length > 0) {
          const canManage = userRoles.some(role => {
            const perms = role.permissions || [];
            const mwPerm = perms.find(p => p.name === 'manage most wanted');
            // Permission not on this role yet → default granted
            if (!mwPerm) return true;
            // Permission exists and is enabled → granted
            if (mwPerm.enabled) return true;
            // Admin override
            return perms.some(p => p.name === 'administrator' && p.enabled);
          });
          isDepartmentMember = canManage;
        }
      }

      return res.render("most-wanted", {
        user: req.user,
        community: community,
        communityName: community?.community?.name || '',
        isAdmin: isAdmin || isOwner,
        isDepartmentMember: isDepartmentMember,
        communityId: communityId,
      });
    } catch (err) {
      console.error('Error loading most-wanted page:', err);
      return res.redirect('/communities');
    }
  });

  app.get("/police-dashboard", authCheck, async function (req, res) {
    try {
      // Check if user opted into the beta command dashboard
      try {
        const prefsRes = await axios.get(
          `${policeCadApiUrl}/api/v1/user-preferences/${req.user._id}`, config
        );
        if (prefsRes.data && prefsRes.data.betaCommandDashboard === true) {
          const queryString = req.originalUrl.split('?')[1] || '';
          return res.redirect(`/command-dashboard${queryString ? '?' + queryString : ''}`);
        }
      } catch (prefErr) {
        // If preferences fetch fails, fall through to classic dashboard
      }

      var context = req.app.locals.specialContext;
      req.app.locals.specialContext = null;
      
      // Get department info from query parameters
      const departmentName = req.query.dept || null;
      const encodedDeptId = req.query.d || null;
      
      // Decode the department ID if present
      let departmentId = null;
      if (encodedDeptId) {
        try {
          // Reverse the encoding: restore base64 padding and decode
          let base64 = encodedDeptId
            .replace(/-/g, '+')
            .replace(/_/g, '/');

          // Add padding back
          while (base64.length % 4) {
            base64 += '=';
          }

          departmentId = Buffer.from(base64, 'base64').toString('utf8');
        } catch (e) {
          console.error('Failed to decode department ID:', e);
          departmentId = null;
        }
      }

      // Decode the community ID from URL param if present
      const encodedCommunityId = req.query.c || null;
      let urlCommunityId = null;
      // MongoDB ObjectId pattern for validation (prevents SSRF)
      const communityIdPattern = /^[a-fA-F0-9]{24}$/;
      if (encodedCommunityId) {
        try {
          let base64 = encodedCommunityId
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decoded = Buffer.from(base64, 'base64').toString('utf8');
          // Validate decoded community ID to prevent SSRF
          if (communityIdPattern.test(decoded)) {
            urlCommunityId = decoded;
          } else {
            console.warn('Rejected invalid community ID from URL:', decoded);
          }
        } catch (e) {
          console.error('Failed to decode community ID from URL:', e);
        }
      }

      // Use community ID from URL if provided and valid, otherwise fall back to user's context
      const communityId = urlCommunityId || req.user.user?.lastAccessedCommunity?.communityID || req.user.user?.activeCommunity;

      // If no department context is provided, redirect to community or communities
      if (!(departmentId || req.session.departmentId) && !departmentName) {
        if (communityId) {
          return res.redirect(`/community/${encodeId(communityId)}?notice=selectDepartment#departments-section`);
        }
        return res.redirect('/communities');
      }

      // If a specific department is requested, verify user access
      if (departmentId && departmentName) {
        if (!communityId) {
          return res.status(403).render("error", {
            message: "No active community found. Please select a community first.",
            redirect: "/communities",
          });
        }

        // --- ADMIN CHECK USING COMMUNITY ROLES API ---
        let isAdmin = false;
        try {
          const rolesApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/roles`;
          const rolesResponse = await axios.get(rolesApiUrl, config);
          const roles = rolesResponse.data || [];
          roles.forEach(role => {
            if (Array.isArray(role.members) && role.members.includes(String(req.user._id))) {
              if (Array.isArray(role.permissions)) {
                role.permissions.forEach(perm => {
                  if (perm.name === 'administrator' && perm.enabled === true) {
                    isAdmin = true;
                  }
                });
              }
            }
          });
        } catch (err) {
          console.error('Error fetching community roles:', err.message);
        }
        // --- END ADMIN CHECK ---

        if (!isAdmin) {
          // Check if user has access to this department by fetching user's departments
          const apiUrl = `${policeCadApiUrl}/api/v2/community/${communityId}/departments?userId=${req.user._id}&page=1&limit=100`;
          try {
            const userDepartmentsResponse = await axios.get(apiUrl, config);
            const userDepartments = userDepartmentsResponse.data.data || [];
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId && dept.accessStatus === 'approved');
            if (!userHasAccess) {
              return res.status(403).render("error", {
                message: "You don't have access to this department. Please contact the department administrator.",
                redirect: "/departments",
              });
            }
          } catch (apiError) {
            console.error('API Error:', apiError.message);
            // Allow access if API is not available - this is a fallback
          }
        }
      }

      // Fetch community name using the resolved community ID
      let communityName = null;
      if (communityId) {
        try {
          const communityResponse = await axios.get(
            `${policeCadApiUrl}/api/v1/community/${communityId}`,
            config
          );
          communityName = communityResponse.data?.community?.name || null;
        } catch (err) {
          console.error('Error fetching community:', err.message);
        }
      }

      res.render("police-dashboard", {
        user: req.user,
        referer: encodeURIComponent("/police-dashboard"),
        redirect: encodeURIComponent(redirect),
        context: null,
        departmentId: departmentId || req.session.departmentId || null,
        departmentName: departmentName,
        communityName: communityName,
        apiUrl: policeCadApiUrl,
      });
    } catch (error) {
      console.error('🚨 Error in police-dashboard route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading the dashboard. Please try again.",
        redirect: "/communities",
      });
    }
  });

  // Command dashboard - new tactical-themed police dashboard (beta opt-in)
  app.get("/command-dashboard", authCheck, async function (req, res) {
    try {
      var context = req.app.locals.specialContext;
      req.app.locals.specialContext = null;

      const departmentName = req.query.dept || null;
      const encodedDeptId = req.query.d || null;

      // ObjectId pattern for validation (prevents SSRF when interpolated into API URLs)
      const objectIdPattern = /^[a-fA-F0-9]{24}$/;

      let departmentId = null;
      if (encodedDeptId) {
        try {
          let base64 = encodedDeptId
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decodedDept = Buffer.from(base64, 'base64').toString('utf8');
          if (objectIdPattern.test(decodedDept)) {
            departmentId = decodedDept;
          } else {
            console.warn('Rejected invalid department ID from URL:', decodedDept);
          }
        } catch (e) {
          console.error('Failed to decode department ID:', e);
          departmentId = null;
        }
      }

      const encodedCommunityId = req.query.c || null;
      let urlCommunityId = null;
      const communityIdPattern = objectIdPattern;
      if (encodedCommunityId) {
        try {
          let base64 = encodedCommunityId
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decoded = Buffer.from(base64, 'base64').toString('utf8');
          if (communityIdPattern.test(decoded)) {
            urlCommunityId = decoded;
          } else {
            console.warn('Rejected invalid community ID from URL:', decoded);
          }
        } catch (e) {
          console.error('Failed to decode community ID from URL:', e);
        }
      }

      const communityId = urlCommunityId || req.user.user?.lastAccessedCommunity?.communityID || req.user.user?.activeCommunity;

      if (departmentId && departmentName) {
        if (!communityId) {
          return res.status(403).render("error", {
            message: "No active community found. Please select a community first.",
            redirect: "/communities",
          });
        }

        let isAdmin = false;
        try {
          const rolesApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/roles`;
          const rolesResponse = await axios.get(rolesApiUrl, config);
          const roles = rolesResponse.data || [];
          roles.forEach(role => {
            if (Array.isArray(role.members) && role.members.includes(String(req.user._id))) {
              if (Array.isArray(role.permissions)) {
                role.permissions.forEach(perm => {
                  if (perm.name === 'administrator' && perm.enabled === true) {
                    isAdmin = true;
                  }
                });
              }
            }
          });
        } catch (err) {
          console.error('Error fetching community roles:', err.message);
        }

        if (!isAdmin) {
          const apiUrl = `${policeCadApiUrl}/api/v2/community/${communityId}/departments?userId=${req.user._id}&page=1&limit=100`;
          try {
            const userDepartmentsResponse = await axios.get(apiUrl, config);
            const userDepartments = userDepartmentsResponse.data.data || [];
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId && dept.accessStatus === 'approved');
            if (!userHasAccess) {
              return res.status(403).render("error", {
                message: "You don't have access to this department. Please contact the department administrator.",
                redirect: "/departments",
              });
            }
          } catch (apiError) {
            console.error('API Error:', apiError.message);
          }
        }
      }

      let communityName = null;
      let currencyCode = "USD";
      let currencySymbol = "$";
      // Defaults to true when we can't resolve the community — see
      // resolveEconomyContext for the same reasoning.
      let economyEnabled = true;
      if (communityId) {
        try {
          const communityResponse = await axios.get(
            `${policeCadApiUrl}/api/v1/community/${communityId}`,
            config
          );
          communityName = communityResponse.data?.community?.name || null;
          const cur = resolveCommunityCurrency(communityResponse.data);
          currencyCode = cur.code;
          currencySymbol = cur.symbol;
          economyEnabled = resolveCommunityEconomyEnabled(communityResponse.data);
        } catch (err) {
          console.error('Error fetching community:', err.message);
        }
      }

      // Beta gate — the new dashboard is opt-in. If the target dept's
      // template is dispatch we require `betaCommandDispatch`; for every
      // other template we require `betaCommandDashboard`. Not opted in
      // means we bounce back to the appropriate classic dashboard so the
      // experience stays tightly scoped to users who've asked to try it.
      try {
        let targetTemplate = null;
        if (communityId && departmentId) {
          try {
            const deptResp = await axios.get(
              `${policeCadApiUrl}/api/v1/community/${encodeURIComponent(communityId)}/departments/${encodeURIComponent(departmentId)}`,
              config
            );
            // Newer depts use `templateRef`, older ones embed the template.
            // Read both so neither shape is missed.
            const d = deptResp.data?.department || deptResp.data || {};
            targetTemplate = String(
              d.template?.name
              || d.templateRef?.name
              || ''
            ).toLowerCase() || null;
          } catch (deptErr) {
            console.warn('[command-dashboard gate] dept fetch failed:', deptErr.message);
          }
        }
        const prefsRes = await axios.get(
          `${policeCadApiUrl}/api/v1/user-preferences/${req.user._id}`, config
        );
        const prefs = prefsRes.data || {};
        const queryString = req.originalUrl.split('?')[1] || '';
        // Truthy comparison so non-strict-boolean representations still pass.
        const dispatchOn = !!prefs.betaCommandDispatch;
        const policeOn = !!prefs.betaCommandDashboard;
        // Single-flag grace: if the user has opted into EITHER beta they
        // can access the new dashboard across templates. Keeps users from
        // getting stuck on a template they haven't specifically opted into
        // (e.g. a dispatch-opted user visiting a police dept URL).
        if (dispatchOn || policeOn) {
          // Allowed — fall through to render.
        } else if (targetTemplate === 'dispatch') {
          return res.redirect(`/dispatch-dashboard${queryString ? '?' + queryString : ''}`);
        } else if (targetTemplate) {
          return res.redirect(`/police-dashboard${queryString ? '?' + queryString : ''}`);
        }
        // If we couldn't resolve a template AND no beta flag is set, fail
        // open — the client-side layout still guards against unsupported
        // flows and the user can navigate to a classic dashboard.
      } catch (gateErr) {
        console.warn('[command-dashboard gate] unexpected error:', gateErr.message);
      }

      // Whether the current user can manage this community's forms —
      // drives the lock-icon affordance on the Forms nav link.
      const canManageForms = communityId ? await userCanManageCommunity(req, communityId) : false;

      // Wallet/Inbox are per-civilian. The sidebar checks this flag and
      // shows a "create a civilian first" modal instead of navigating when
      // the user has no civilian in the active community.
      let hasCivilianInCommunity = false;
      if (communityId && req.user?._id) {
        try {
          const civCount = await Civilian.countDocuments({
            "civilian.userID": String(req.user._id),
            "civilian.activeCommunityID": communityId,
          });
          hasCivilianInCommunity = civCount > 0;
        } catch (err) {
          console.error('Error counting civilians for command dashboard:', err.message);
        }
      }

      res.render("command-dashboard", {
        user: req.user,
        referer: encodeURIComponent("/command-dashboard"),
        redirect: encodeURIComponent("/command-dashboard"),
        context: null,
        departmentId: departmentId || req.session.departmentId || null,
        departmentName: departmentName,
        communityId: communityId || null,
        encodedCommunityId: communityId ? encodeId(communityId) : null,
        communityName: communityName,
        hasCivilianInCommunity,
        currencyCode,
        currencySymbol,
        economyEnabled,
        apiUrl: policeCadApiUrl,
        canManageForms,
      });
    } catch (error) {
      console.error('Error in command-dashboard route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading the dashboard. Please try again.",
        redirect: "/communities",
      });
    }
  });

  app.get("/dispatch-dashboard", authCheck, async function (req, res) {
    try {
      // Dispatch has its own beta flag (betaCommandDispatch) — tracked
      // separately from the police command dashboard (betaCommandDashboard)
      // so admin adoption metrics can distinguish the two audiences.
      try {
        const prefsRes = await axios.get(
          `${policeCadApiUrl}/api/v1/user-preferences/${req.user._id}`, config
        );
        if (prefsRes.data && prefsRes.data.betaCommandDispatch === true) {
          const queryString = req.originalUrl.split('?')[1] || '';
          return res.redirect(`/command-dashboard${queryString ? '?' + queryString : ''}`);
        }
      } catch (prefErr) {
        // If preferences fetch fails, fall through to classic dashboard
      }

      var context = req.app.locals.specialContext;
      req.app.locals.specialContext = null;
      
      // Get department info from query parameters
      const departmentName = req.query.dept || null;
      const encodedDeptId = req.query.d || null;
      
      // Decode the department ID if present
      let departmentId = null;
      if (encodedDeptId) {
        try {
          // Reverse the encoding: restore base64 padding and decode
          let base64 = encodedDeptId
            .replace(/-/g, '+')
            .replace(/_/g, '/');

          // Add padding back
          while (base64.length % 4) {
            base64 += '=';
          }

          departmentId = Buffer.from(base64, 'base64').toString('utf8');
        } catch (e) {
          console.error('Failed to decode department ID:', e);
          departmentId = null;
        }
      }

      // Decode the community ID from URL param if present
      const encodedCommunityId = req.query.c || null;
      let urlCommunityId = null;
      // MongoDB ObjectId pattern for validation (prevents SSRF)
      const communityIdPattern = /^[a-fA-F0-9]{24}$/;
      if (encodedCommunityId) {
        try {
          let base64 = encodedCommunityId
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decoded = Buffer.from(base64, 'base64').toString('utf8');
          // Validate decoded community ID to prevent SSRF
          if (communityIdPattern.test(decoded)) {
            urlCommunityId = decoded;
          } else {
            console.warn('Rejected invalid community ID from URL:', decoded);
          }
        } catch (e) {
          console.error('Failed to decode community ID from URL:', e);
        }
      }

      // Use community ID from URL if provided and valid, otherwise fall back to user's context
      const communityId = urlCommunityId || req.user.user?.lastAccessedCommunity?.communityID || req.user.user?.activeCommunity;

      // If a specific department is requested, verify user access
      if (departmentId && departmentName) {
        if (!communityId) {
          return res.status(403).render("error", {
            message: "No active community found. Please select a community first.",
            redirect: "/communities",
          });
        }

        // --- ADMIN CHECK USING COMMUNITY ROLES API ---
        let isAdmin = false;
        try {
          const rolesApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/roles`;
          const rolesResponse = await axios.get(rolesApiUrl, config);
          const roles = rolesResponse.data || [];
          roles.forEach(role => {
            if (Array.isArray(role.members) && role.members.includes(String(req.user._id))) {
              if (Array.isArray(role.permissions)) {
                role.permissions.forEach(perm => {
                  if (perm.name === 'administrator' && perm.enabled === true) {
                    isAdmin = true;
                  }
                });
              }
            }
          });
        } catch (err) {
          console.error('Error fetching community roles:', err.message);
        }
        // --- END ADMIN CHECK ---

        if (!isAdmin) {
          // Check if user has access to this department by fetching user's departments
          const apiUrl = `${policeCadApiUrl}/api/v2/community/${communityId}/departments?userId=${req.user._id}&page=1&limit=100`;
          try {
            const userDepartmentsResponse = await axios.get(apiUrl, config);
            const userDepartments = userDepartmentsResponse.data.data || [];
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId && dept.accessStatus === 'approved');
            if (!userHasAccess) {
              return res.status(403).render("error", {
                message: "You don't have access to this department. Please contact the department administrator.",
                redirect: "/departments",
              });
            }
          } catch (apiError) {
            console.error('API Error:', apiError.message);
            // Allow access if API is not available - this is a fallback
          }
        }
      }

      // Fetch community name using the resolved community ID
      let communityName = null;
      if (communityId) {
        try {
          const communityResponse = await axios.get(
            `${policeCadApiUrl}/api/v1/community/${communityId}`,
            config
          );
          communityName = communityResponse.data?.community?.name || null;
        } catch (err) {
          console.error('Error fetching community:', err.message);
        }
      }

      res.render("dispatch-dashboard", {
        user: req.user,
        referer: encodeURIComponent("/dispatch-dashboard"),
        redirect: encodeURIComponent(redirect),
        context: null,
        departmentId: departmentId || req.session.departmentId || null,
        departmentName: departmentName,
        communityName: communityName,
        apiUrl: policeCadApiUrl,
      });
    } catch (error) {
      console.error('🚨 Error in dispatch-dashboard route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading the dashboard. Please try again.",
        redirect: "/communities",
      });
    }
  });

  // Generic configurable department dashboard (used for Judicial and future templates)
  app.get("/department-dashboard", authCheck, async function (req, res) {
    try {
      var context = req.app.locals.specialContext;
      req.app.locals.specialContext = null;

      const departmentName = req.query.dept || null;
      const encodedDeptId = req.query.d || null;

      let departmentId = null;
      if (encodedDeptId) {
        try {
          let base64 = encodedDeptId
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          departmentId = Buffer.from(base64, 'base64').toString('utf8');
        } catch (e) {
          console.error('Failed to decode department ID:', e);
          departmentId = null;
        }
      }

      const encodedCommunityId = req.query.c || null;
      let urlCommunityId = null;
      const communityIdPattern = /^[a-fA-F0-9]{24}$/;
      if (encodedCommunityId) {
        try {
          let base64 = encodedCommunityId
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const decoded = Buffer.from(base64, 'base64').toString('utf8');
          if (communityIdPattern.test(decoded)) {
            urlCommunityId = decoded;
          } else {
            console.warn('Rejected invalid community ID from URL:', decoded);
          }
        } catch (e) {
          console.error('Failed to decode community ID from URL:', e);
        }
      }

      const communityId = urlCommunityId || req.user.user?.lastAccessedCommunity?.communityID || req.user.user?.activeCommunity;

      if (departmentId && departmentName) {
        if (!communityId) {
          return res.status(403).render("error", {
            message: "No active community found. Please select a community first.",
            redirect: "/communities",
          });
        }

        let isAdmin = false;
        try {
          const rolesApiUrl = `${policeCadApiUrl}/api/v1/community/${communityId}/roles`;
          const rolesResponse = await axios.get(rolesApiUrl, config);
          const roles = rolesResponse.data || [];
          roles.forEach(role => {
            if (Array.isArray(role.members) && role.members.includes(String(req.user._id))) {
              if (Array.isArray(role.permissions)) {
                role.permissions.forEach(perm => {
                  if (perm.name === 'administrator' && perm.enabled === true) {
                    isAdmin = true;
                  }
                });
              }
            }
          });
        } catch (err) {
          console.error('Error fetching community roles:', err.message);
        }

        if (!isAdmin) {
          const apiUrl = `${policeCadApiUrl}/api/v2/community/${communityId}/departments?userId=${req.user._id}&page=1&limit=100`;
          try {
            const userDepartmentsResponse = await axios.get(apiUrl, config);
            const userDepartments = userDepartmentsResponse.data.data || [];
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId && dept.accessStatus === 'approved');
            if (!userHasAccess) {
              return res.status(403).render("error", {
                message: "You don't have access to this department. Please contact the department administrator.",
                redirect: "/departments",
              });
            }
          } catch (apiError) {
            console.error('API Error:', apiError.message);
          }
        }
      }

      let communityName = null;
      let currencyCode = "USD";
      let currencySymbol = "$";
      // Defaults to true when we can't resolve the community — see
      // resolveEconomyContext for the same reasoning.
      let economyEnabled = true;
      if (communityId) {
        try {
          const communityResponse = await axios.get(
            `${policeCadApiUrl}/api/v1/community/${communityId}`,
            config
          );
          communityName = communityResponse.data?.community?.name || null;
          const cur = resolveCommunityCurrency(communityResponse.data);
          currencyCode = cur.code;
          currencySymbol = cur.symbol;
          economyEnabled = resolveCommunityEconomyEnabled(communityResponse.data);
        } catch (err) {
          console.error('Error fetching community:', err.message);
        }
      }

      // Wallet/Inbox are per-civilian. The sidebar checks this flag and
      // shows a "create a civilian first" modal instead of navigating when
      // the user has no civilian in the active community.
      let hasCivilianInCommunity = false;
      if (communityId && req.user?._id) {
        try {
          const civCount = await Civilian.countDocuments({
            "civilian.userID": String(req.user._id),
            "civilian.activeCommunityID": communityId,
          });
          hasCivilianInCommunity = civCount > 0;
        } catch (err) {
          console.error('Error counting civilians for dept dashboard:', err.message);
        }
      }

      res.render("department-dashboard", {
        user: req.user,
        referer: encodeURIComponent("/department-dashboard"),
        redirect: encodeURIComponent("/department-dashboard"),
        context: null,
        departmentId: departmentId || req.session.departmentId || null,
        departmentName: departmentName,
        communityId: communityId || null,
        encodedCommunityId: communityId ? encodeId(communityId) : null,
        communityName: communityName,
        hasCivilianInCommunity,
        currencyCode,
        currencySymbol,
        economyEnabled,
        apiUrl: policeCadApiUrl,
      });
    } catch (error) {
      console.error('Error in department-dashboard route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading the dashboard. Please try again.",
        redirect: "/communities",
      });
    }
  });

  app.get("/invite/:code", authCheck, async function (req, res) {
    try {
      const { code } = req.params;
      const apiUrl = `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/community/invite/${code}`;
      const response = await axios.get(apiUrl, { timeout: 5000 });
      const inviteData = response.data;
      if (
        !inviteData ||
        inviteData.remainingUses === 0 ||
        (inviteData.expiresAt && new Date(inviteData.expiresAt) < new Date())
      ) {
        return res.status(400).render("error", {
          message: "Invalid or expired invite code.",
          redirect: req.originalUrl,
        });
      }
      return res.render("invite", {
        user: req.user,
        inviteCode: code,
        communityName: inviteData.communityName,
        redirect: req.originalUrl,
      });
    } catch (error) {
      console.error("Error validating invite code:", error);
      if (error.response?.status === 404) {
        return res.status(404).render("error", {
          message: "Invite code not found.",
          redirect: req.originalUrl,
        });
      }
      return res.status(500).render("error", {
        message: "An error occurred while processing the invite.",
      });
    }
  });

  app.post("/community/join", authCheck, async function (req, res) {
    try {
      const { inviteCode } = req.body;
      
      const apiUrl = `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/community/join`;
      const response = await axios.post(
        apiUrl,
        {
          inviteCode,
          userId: req.user._id,
        },
        { timeout: 5000 }
      );
      // Handle successful response from the API
      if (response.data.status === "joined") {
        // Get the community ID from the response
        const communityId = response.data.communityId || response.data.community?._id;
        
        // Check if this is a JSON request
        if (req.headers['content-type'] === 'application/json') {
          return res.json({
            success: true,
            communityId: communityId ? encodeId(communityId) : null,
            message: "Successfully joined community"
          });
        } else {
          // Handle regular form submission
          if (communityId) {
            return res.redirect(`/community/${encodeId(communityId)}`);
          } else {
            return res.redirect("/communities?success=true");
          }
        }
      } else {
        // API didn't return expected status - this shouldn't happen with the current backend
        console.error("Unexpected API response:", response.data);
        
        if (req.headers['content-type'] === 'application/json') {
          return res.status(500).json({
            success: false,
            message: "Unexpected response from server. Please try again."
          });
        } else {
          return res.status(500).render("error", {
            message: "Unexpected response from server. Please try again.",
            redirect: `/invite/${req.body.inviteCode}`,
          });
        }
      }
    } catch (error) {
      // Enhanced error logging for debugging
      console.error("Error joining community:", {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        userId: req.user?._id,
        inviteCode: req.body?.inviteCode
      });
      
      // Determine specific error message based on the error type
      let errorMessage = "Failed to join community. Please try again.";
      let statusCode = 500;
      
      if (error.response) {
        // API responded with error status
        statusCode = error.response.status;
        const apiError = error.response.data;
        
        switch (statusCode) {
          case 400:
            errorMessage = apiError.message || "Invalid invite code. Please check the link and try again.";
            break;
          case 401:
            errorMessage = "Your session has expired. Please log in again.";
            break;
          case 403:
            errorMessage = apiError.message || "You are banned from this community.";
            break;
          case 404:
            errorMessage = "Community not found or invite code is invalid.";
            break;
          case 409:
            errorMessage = apiError.message || "You are already a member of this community.";
            break;
          case 422:
            errorMessage = apiError.message || "Invalid request. Please check your information and try again.";
            break;
          case 429:
            errorMessage = "Too many requests. Please wait a moment and try again.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage = apiError.message || "Failed to join community. Please try again.";
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please check your connection and try again.";
        statusCode = 408;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = "Unable to connect to server. Please check your internet connection and try again.";
        statusCode = 503;
      } else if (error.message) {
        errorMessage = `Connection error: ${error.message}`;
      }
      
      if (req.headers['content-type'] === 'application/json') {
        return res.status(statusCode).json({
          success: false,
          message: errorMessage,
          errorCode: error.code || null,
          statusCode: statusCode
        });
      } else {
        return res.status(statusCode).render("error", {
          message: errorMessage,
          redirect: `/invite/${req.body.inviteCode}`,
        });
      }
    }
  });

  function authCheck(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      req.session.redirect = req.originalUrl; // Store the original URL in session
      res.redirect("/login");
    }
  }

  // app.js
  app.post("/select-department", authCheck, (req, res) => {
    const { departmentId, redirect } = req.body;
    const communityId = req.user?.user?.lastAccessedCommunity?.communityID;

    if (!departmentId || departmentId === "undefined") {
      req.app.locals.specialContext = "errorNoDepartment";
      return res.redirect(redirect || "/communities");
    }
    if (!communityId) {
      req.app.locals.specialContext = "errorNoCommunity";
      return res.redirect(redirect || "/communities");
    }

    // Validate department belongs to community
    require("request")(
      {
        url: `https://police-cad-app-api-bc6d659b60b3.herokuapp.com/api/v1/community/${communityId}/departments`,
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
      (error, response, body) => {
        if (error || response.statusCode !== 200) {
          console.error("Error validating department:", error || body);
          req.app.locals.specialContext = "errorInvalidDepartment";
          return res.redirect(redirect || "/communities");
        }

        try {
          const data = JSON.parse(body);
          const department = data.departments.find(
            (d) => d._id === departmentId
          );
          if (!department) {
            req.app.locals.specialContext = "errorInvalidDepartment";
            return res.redirect(redirect || "/communities");
          }

          req.session.departmentId = departmentId;
          res.redirect(redirect);
        } catch (err) {
          console.error("Error parsing departments:", err);
          req.app.locals.specialContext = "errorInvalidDepartment";
          return res.redirect(redirect || "/communities");
        }
      }
    );
  });

  app.get("/firearm-search", auth, function (req, res) {
    // console.debug(req.query)
    if (req.query.route == "dispatch-dashboard") {
      if (req.query.serialNumber == undefined) {
        res.status(400);
        return res.redirect("/dispatch-dashboard");
      }
      if (
        req.query.activeCommunityID == "" ||
        req.query.activeCommunityID == null
      ) {
        Firearm.find(
          {
            "firearm.serialNumber": req.query.serialNumber.trim().toUpperCase(),
            $or: [
              {
                // some are stored as empty strings and others as null so we need to check for both
                "firearm.activeCommunityID": "",
              },
              {
                "firearm.activeCommunityID": null,
              },
            ],
          },
          function (err, dbFirearms) {
            if (err) return console.error(err);
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: req.user.user.activeCommunity,
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        if (
                          req.user.user.activeCommunity == "" ||
                          req.user.user.activeCommunity == null
                        ) {
                          return res.render("dispatch-dashboard", {
                            user: req.user,
                            vehicles: null,
                            civilians: null,
                            firearms: dbFirearms,
                            tickets: null,
                            arrestReports: null,
                            warrants: null,
                            dbEmsEngines: null,
                            communities: dbCommunities,
                            commUsers: null,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null,
                            referer: encodeURIComponent("/dispatch-dashboard"),
                            redirect: encodeURIComponent(redirect),
                          });
                        } else {
                          User.find(
                            {
                              "user.activeCommunity":
                                req.user.user.activeCommunity,
                            },
                            function (err, dbCommUsers) {
                              if (err) return console.error(err);
                              EmsVehicle.find(
                                {
                                  "emsVehicle.activeCommunityID":
                                    req.user.user.activeCommunity,
                                },
                                function (err, dbEmsEngines) {
                                  if (err) return console.error(err);
                                  return res.render("dispatch-dashboard", {
                                    user: req.user,
                                    vehicles: null,
                                    firearms: dbFirearms,
                                    civilians: null,
                                    tickets: null,
                                    arrestReports: null,
                                    warrants: null,
                                    dbEmsEngines: dbEmsEngines,
                                    communities: dbCommunities,
                                    commUsers: dbCommUsers,
                                    bolos: dbBolos,
                                    calls: dbCalls,
                                    context: null,
                                    referer: encodeURIComponent(
                                      "/dispatch-dashboard"
                                    ),
                                    redirect: encodeURIComponent(redirect),
                                  });
                                }
                              );
                            }
                          );
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        Firearm.find(
          {
            "firearm.serialNumber": req.query.serialNumber.trim().toUpperCase(),
            "firearm.activeCommunityID": req.query.activeCommunityID,
          },
          function (err, dbFirearms) {
            if (err) return console.error(err);
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: req.user.user.activeCommunity,
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        if (
                          req.user.user.activeCommunity == "" ||
                          req.user.user.activeCommunity == null
                        ) {
                          return res.render("dispatch-dashboard", {
                            user: req.user,
                            vehicles: null,
                            firearms: dbFirearms,
                            civilians: null,
                            tickets: null,
                            arrestReports: null,
                            warrants: null,
                            dbEmsEngines: null,
                            communities: dbCommunities,
                            commUsers: null,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null,
                            referer: encodeURIComponent("/dispatch-dashboard"),
                            redirect: encodeURIComponent(redirect),
                          });
                        } else {
                          User.find(
                            {
                              "user.activeCommunity":
                                req.user.user.activeCommunity,
                            },
                            function (err, dbCommUsers) {
                              if (err) return console.error(err);
                              EmsVehicle.find(
                                {
                                  "emsVehicle.activeCommunityID":
                                    req.user.user.activeCommunity,
                                },
                                function (err, dbEmsEngines) {
                                  if (err) return console.error(err);
                                  return res.render("dispatch-dashboard", {
                                    user: req.user,
                                    vehicles: null,
                                    firearms: dbFirearms,
                                    civilians: null,
                                    tickets: null,
                                    arrestReports: null,
                                    warrants: null,
                                    dbEmsEngines: dbEmsEngines,
                                    communities: dbCommunities,
                                    commUsers: dbCommUsers,
                                    bolos: dbBolos,
                                    calls: dbCalls,
                                    context: null,
                                    referer: encodeURIComponent(
                                      "/dispatch-dashboard"
                                    ),
                                    redirect: encodeURIComponent(redirect),
                                  });
                                }
                              );
                            }
                          );
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    } else {
      if (req.query.serialNumber == undefined) {
        res.status(400);
        return res.redirect("/police-dashboard");
      }
      if (
        req.query.activeCommunityID == "" ||
        req.query.activeCommunityID == null
      ) {
        Firearm.find(
          {
            "firearm.serialNumber": req.query.serialNumber.trim().toUpperCase(),
            $or: [
              {
                // some are stored as empty strings and others as null so we need to check for both
                "firearm.activeCommunityID": "",
              },
              {
                "firearm.activeCommunityID": null,
              },
            ],
          },
          function (err, dbFirearms) {
            if (err) return console.error(err);
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: ObjectId(req.user.user.activeCommunity),
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        return res.render("police-dashboard", {
                          user: req.user,
                          civilians: null,
                          vehicles: null,
                          firearms: dbFirearms,
                          tickets: null,
                          arrestReports: null,
                          warrants: null,
                          communities: dbCommunities,
                          bolos: dbBolos,
                          calls: dbCalls,
                          context: null,
                          referer: encodeURIComponent("/police-dashboard"),
                          redirect: encodeURIComponent(redirect),
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        Firearm.find(
          {
            "firearm.serialNumber": req.query.serialNumber.trim().toUpperCase(),
            "firearm.activeCommunityID": req.query.activeCommunityID,
          },
          function (err, dbFirearms) {
            if (err) return console.error(err);
            var isValid = isValidObjectIdLength(
              req.user.user.activeCommunity,
              "cannot lookup invalid length activeCommunityID, route: /plate-search"
            );
            if (!isValid) {
              req.app.locals.specialContext = "invalidRequest";
              return res.redirect("/police-dashboard");
            }
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: ObjectId(req.user.user.activeCommunity),
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        return res.render("police-dashboard", {
                          user: req.user,
                          civilians: null,
                          vehicles: null,
                          firearms: dbFirearms,
                          tickets: null,
                          arrestReports: null,
                          warrants: null,
                          communities: dbCommunities,
                          bolos: dbBolos,
                          calls: dbCalls,
                          context: null,
                          referer: encodeURIComponent("/police-dashboard"),
                          redirect: encodeURIComponent(redirect),
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    }
  });

  app.get("/tickets", auth, function (req, res) {
    Ticket.find(
      {
        "ticket.civID": req.query.civID,
      },
      function (err, dbTickets) {
        if (err) return console.error(err);
        res.send(dbTickets);
      }
    );
  });

  app.get("/arrests", auth, function (req, res) {
    // console.debug("/arrests", req.body);
    ArrestReport.find(
      {
        "arrestReport.accusedID": req.query.civID,
      },
      function (err, dbArrests) {
        if (err) return console.error(err);
        res.send(dbArrests);
      }
    );
  });

  app.get("/medical-reports", auth, function (req, res) {
    MedicalReport.find(
      {
        "report.civilianID": req.query.civID,
      },
      function (err, dbReports) {
        if (err) return console.error(err);
        res.send(dbReports);
      }
    );
  });

  app.get("/medications", auth, function (req, res) {
    Medication.find(
      {
        "medication.civilianID": req.query.civID,
      },
      function (err, dbMedications) {
        if (err) return console.error(err);
        res.send(dbMedications);
      }
    );
  });

  app.get("/conditions", auth, function (req, res) {
    Condition.find(
      {
        "condition.civilianID": req.query.civID,
      },
      function (err, dbConditions) {
        if (err) return console.error(err);
        res.send(dbConditions);
      }
    );
  });

  app.get("/medical-database", auth, function (req, res) {
    // console.debug("medical database server: ", req.query)

    //b/c people like to just search empty values, we do a little sanitation and checking here
    var fName;
    var medFName; //names are stored differently in the civilian and medical databases so we have to store 2 different values here
    var lName;
    var medLName; //names are stored differently in the civilian and medical databases so we have to store 2 different values here
    if (exists(req.query.firstName)) {
      fName = sanitize(req.query.firstName.trim().capitalize());
      medFName = sanitize(req.query.firstName.trim().toLowerCase());
    } else {
      console.error("cannot lookup medical database without firstName");
      res.status(400);
      return res.redirect("back");
    }
    if (exists(req.query.lastName)) {
      lName = sanitize(req.query.lastName.trim().capitalize());
      medLName = sanitize(req.query.lastName.trim().toLowerCase());
    } else {
      console.error("cannot lookup medical database without lastName");
      res.status(400);
      return res.redirect("back");
    }

    if (
      req.query.activeCommunityID == "" ||
      req.query.activeCommunityID == null
    ) {
      if (!exists(req.query.dateOfBirth)) {
        console.error("cannot lookup medical database without dateOfBirth");
        res.status(400);
        return res.redirect("back");
      }
      // We have legacy data with first/last names
      // that do not have a consistent format. Some show up as "First Last" and all permutations of this
      // to "first last". If there is a cleaner way to do this plz fix.
      Civilian.find(
        {
          $or: [
            {
              "civilian.firstName": fName, //capitalized first-name
              "civilian.lastName": lName, //capitalized last-name
              "civilian.birthday": req.query.dateOfBirth,
              $or: [
                {
                  // some are stored as empty strings and others as null so we need to check for both
                  "civilian.activeCommunityID": "",
                },
                {
                  "civilian.activeCommunityID": null,
                },
              ],
            },
            {
              "civilian.firstName": fName, //capitalized first-name
              "civilian.lastName": medLName, //lowercase last-name
              "civilian.birthday": req.query.dateOfBirth,
              $or: [
                {
                  // some are stored as empty strings and others as null so we need to check for both
                  "civilian.activeCommunityID": "",
                },
                {
                  "civilian.activeCommunityID": null,
                },
              ],
            },
            {
              "civilian.firstName": medFName, //lowercase first-name
              "civilian.lastName": lName, //capitalized last-name
              "civilian.birthday": req.query.dateOfBirth,
              $or: [
                {
                  // some are stored as empty strings and others as null so we need to check for both
                  "civilian.activeCommunityID": "",
                },
                {
                  "civilian.activeCommunityID": null,
                },
              ],
            },
            {
              "civilian.firstName": medFName, //lowercase first-name
              "civilian.lastName": medLName, //lowercase last-name
              "civilian.birthday": req.query.dateOfBirth,
              $or: [
                {
                  // some are stored as empty strings and others as null so we need to check for both
                  "civilian.activeCommunityID": "",
                },
                {
                  "civilian.activeCommunityID": null,
                },
              ],
            },
          ],
        },
        function (err, dbCivilians) {
          if (err) return console.error(err);

          Medication.find(
            {
              "medication.firstName": medFName,
              "medication.lastName": medLName,
              "medication.dateOfBirth": req.query.dateOfBirth.trim(), // if we get here, it means it exists so prob safe to trim()
              $or: [
                {
                  // some are stored as empty strings and others as null so we need to check for both
                  "civilian.activeCommunityID": "",
                },
                {
                  "civilian.activeCommunityID": null,
                },
              ],
            },
            function (err, dbMedications) {
              if (err) return console.error(err);
              Condition.find(
                {
                  "condition.firstName": medFName,
                  "condition.lastName": medLName,
                  "condition.dateOfBirth": req.query.dateOfBirth.trim(),
                  $or: [
                    {
                      // some are stored as empty strings and others as null so we need to check for both
                      "civilian.activeCommunityID": "",
                    },
                    {
                      "civilian.activeCommunityID": null,
                    },
                  ],
                },
                function (err, dbConditions) {
                  if (err) return console.error(err);
                  MedicalReport.find(
                    {
                      "report.firstName": medFName,
                      "report.lastName": medLName,
                      "report.dateOfBirth": req.query.dateOfBirth.trim(),
                      $or: [
                        {
                          // some are stored as empty strings and others as null so we need to check for both
                          "civilian.activeCommunityID": "",
                        },
                        {
                          "civilian.activeCommunityID": null,
                        },
                      ],
                    },
                    function (err, dbReports) {
                      if (err) return console.error(err);
                      data = {
                        civilians: dbCivilians,
                        medications: dbMedications,
                        conditions: dbConditions,
                        reports: dbReports,
                      };
                      res.send(data);
                    }
                  );
                }
              );
            }
          );
        }
      );
    } else {
      // We have legacy data with first/last names
      // that do not have a consistent format. Some show up as "First Last" and all permutations of this
      // to "first last". If there is a cleaner way to do this plz fix.
      Civilian.find(
        {
          $or: [
            {
              "civilian.firstName": fName, //capitalized first-name
              "civilian.lastName": lName, //capitalized last-name
              "civilian.activeCommunityID": req.query.activeCommunityID,
            },
            {
              "civilian.firstName": fName, //capitalized first-name
              "civilian.lastName": medLName, //lowercase last-name
              "civilian.activeCommunityID": req.query.activeCommunityID,
            },
            {
              "civilian.firstName": medFName, //lowercase first-name
              "civilian.lastName": lName, //capitalized last-name
              "civilian.activeCommunityID": req.query.activeCommunityID,
            },
            {
              "civilian.firstName": medFName, //lowercase first-name
              "civilian.lastName": medLName, //lowercase last-name
              "civilian.activeCommunityID": req.query.activeCommunityID,
            },
          ],
        },
        function (err, dbCivilians) {
          if (err) return console.error(err);
          Medication.find(
            {
              "medication.firstName": medFName,
              "medication.lastName": medLName,
              "medication.activeCommunityID": req.query.activeCommunityID,
            },
            function (err, dbMedications) {
              if (err) return console.error(err);
              Condition.find(
                {
                  "condition.firstName": medFName,
                  "condition.lastName": medLName,
                  "condition.activeCommunityID": req.query.activeCommunityID,
                },
                function (err, dbConditions) {
                  if (err) return console.error(err);
                  MedicalReport.find(
                    {
                      "report.firstName": medFName,
                      "report.lastName": medLName,
                      "report.activeCommunityID": req.query.activeCommunityID,
                    },
                    function (err, dbReports) {
                      if (err) return console.error(err);
                      data = {
                        civilians: dbCivilians,
                        medications: dbMedications,
                        conditions: dbConditions,
                        reports: dbReports,
                      };
                      res.send(data);
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  });

  app.delete("/reports/:id", auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (
      !isValidObjectIdLength(
        req.params.id,
        "cannot lookup invalid length condition id, route: /reports/:id"
      )
    ) {
      return;
    }
    MedicalReport.findByIdAndDelete(
      {
        _id: ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status);
      }
    );
  });

  app.delete("/medications/:id", auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (
      !isValidObjectIdLength(
        req.params.id,
        "cannot lookup invalid length condition id, route: /medications/:id"
      )
    ) {
      return;
    }
    Medication.findByIdAndDelete(
      {
        _id: ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status);
      }
    );
  });

  app.delete("/conditions/:id", auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (
      !isValidObjectIdLength(
        req.params.id,
        "cannot lookup invalid length condition id, route: /conditions/:id"
      )
    ) {
      return;
    }
    Condition.findByIdAndDelete(
      {
        _id: ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status);
      }
    );
  });

  app.delete("/citation/:id", auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (
      !isValidObjectIdLength(
        req.params.id,
        "cannot lookup invalid length condition id, route: /citation/:id"
      )
    ) {
      return;
    }
    Ticket.findByIdAndDelete(
      {
        _id: ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status);
      }
    );
  });

  app.delete("/warning/:id", auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (
      !isValidObjectIdLength(
        req.params.id,
        "cannot lookup invalid length condition id, route: /warning/:id"
      )
    ) {
      return;
    }
    Ticket.findByIdAndDelete(
      {
        _id: ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status);
      }
    );
  });

  app.delete("/arrestReport/:id", auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (
      !isValidObjectIdLength(
        req.params.id,
        "cannot lookup invalid length condition id, route: /arrestReport/:id"
      )
    ) {
      return;
    }
    ArrestReport.findByIdAndDelete(
      {
        _id: ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status);
      }
    );
  });

  // Set session redirect for login flow
  app.post("/set-redirect", function (req, res) {
    const { redirect } = req.body;
    if (redirect) {
      req.session.redirect = redirect;
    }
    res.json({ success: true });
  });

  // API route to get current user - MUST be before catch-all
  app.get("/api/user/current", async function (req, res) {
    if (req.isAuthenticated() && req.user) {
      // Extract user data safely
      const userData = req.user._doc || req.user;
      const user = userData.user || userData;

      // Extract ObjectId from top-level _id (document _id, not user._id)
      // Handle both MongoDB extended JSON format { $oid: "..." } and Mongoose ObjectId
      let userIdString = '';
      const documentId = req.user._id || userData._id;

      if (documentId) {
        if (typeof documentId === 'object') {
          // Handle MongoDB extended JSON format { $oid: "..." }
          if (documentId.$oid) {
            userIdString = documentId.$oid;
          } else if (documentId.toString) {
            // Handle Mongoose ObjectId
            userIdString = documentId.toString();
          } else {
            userIdString = String(documentId);
          }
        } else {
          userIdString = String(documentId);
        }
      }

      // Resolve admin status. A Linked LPC Account is the only account that
      // inherits its admin's elevated privileges; an admin's own email no
      // longer confers admin on a different LPC account once linked elsewhere.
      // Order: (1) admin.linkedUserId === user._id, (2) email match where the
      // admin has no linkedUserId set (legacy / unlinked admins).
      let isAdmin = false;
      try {
        const mongoose = require("mongoose");
        const adminCol = mongoose.connection.db.collection("admin_users");

        if (userIdString) {
          try {
            const linkedAdmin = await adminCol.findOne({
              linkedUserId: new mongoose.Types.ObjectId(userIdString),
            });
            if (linkedAdmin) isAdmin = true;
          } catch (e) {
            // Invalid ObjectID — skip and fall through to email match.
          }
        }

        if (!isAdmin && user.email) {
          const unlinkedAdmin = await adminCol.findOne({
            email: { $regex: new RegExp('^' + user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
            $or: [{ linkedUserId: { $exists: false } }, { linkedUserId: null }],
          });
          if (unlinkedAdmin) isAdmin = true;
        }
      } catch (e) {
        // Silently fail — non-critical
      }

      return res.json({
        user: {
          id: userIdString,
          username: user.username,
          email: user.email,
          name: user.name,
          callSign: user.callSign || '',
          discordConnected: user.discordConnected || false,
          panicButtonSound: user.panicButtonSound || false,
          alertVolumeLevel: user.alertVolumeLevel || 10,
          createdAt: user.createdAt,
          profilePicture: user.profilePicture || '',
          subscription: user.subscription || null,
          isAdmin: isAdmin
        }
      });
    }
    return res.json({ user: null });
  });

  // API route to deactivate user account
  app.delete("/api/v1/user/:userId/deactivate", apiAuthCheck, async function (req, res) {
    try {
      const mongoose = require("mongoose");
      const { ObjectId } = mongoose.Types;

      const requestedUserId = req.params.userId;
      const userData = req.user._doc || req.user;
      const documentId = req.user._id || userData._id;
      let currentUserId = '';
      if (documentId) {
        currentUserId = typeof documentId === 'object'
          ? (documentId.$oid || documentId.toString())
          : String(documentId);
      }

      // Ensure user can only deactivate their own account
      if (requestedUserId !== currentUserId) {
        return res.status(403).json({ message: "You can only deactivate your own account" });
      }

      const now = new Date();
      const restoreUntil = new Date(now);
      restoreUntil.setDate(restoreUntil.getDate() + 30);

      await mongoose.connection.db.collection("users").updateOne(
        { _id: new ObjectId(requestedUserId) },
        {
          $set: {
            "user.isDeactivated": true,
            "user.deactivatedAt": now,
            "user.restoreUntil": restoreUntil,
          }
        }
      );

      return res.json({ message: "User account deactivated successfully" });
    } catch (err) {
      console.error("[Deactivate] Error:", err);
      return res.status(500).json({ message: "Failed to deactivate account" });
    }
  });

  // Verified email/password change — proxies to the Go API's v2 verified-flow endpoints,
  // which own the verification-code state (pendingVerifications). All four routes require
  // the caller's session to match the URL user_id, so a hijacked api token alone can't
  // drive a change against another account. The legacy v1 PUT /user/{id}/email continues
  // to work for any clients still on the password-only flow during migration.
  function ensureSelfAccountId(req, res) {
    const requestedUserId = req.params.user_id;
    if (!isValidObjectId(requestedUserId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return null;
    }
    const userData = req.user._doc || req.user;
    const documentId = req.user._id || userData._id;
    const currentUserId = documentId
      ? (typeof documentId === 'object' ? (documentId.$oid || documentId.toString()) : String(documentId))
      : '';
    if (requestedUserId !== currentUserId) {
      res.status(403).json({ error: "You can only manage your own account" });
      return null;
    }
    return requestedUserId;
  }

  async function proxyAccountChange(req, res, method, path, label) {
    try {
      const userId = ensureSelfAccountId(req, res);
      if (!userId) return;
      const response = await axios({
        method,
        url: `${policeCadApiUrl}/api/v2/user/${userId}${path}`,
        data: req.body,
        headers: { ...config.headers, 'Content-Type': 'application/json' },
      });
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`[${label}] Error:`, error.message);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return res.status(500).json({ error: `Failed to ${label}` });
    }
  }

  app.post("/api/v2/user/:user_id/email/request-change", apiAuthCheck, function (req, res) {
    return proxyAccountChange(req, res, 'post', '/email/request-change', 'request email change');
  });
  app.put("/api/v2/user/:user_id/email", apiAuthCheck, function (req, res) {
    return proxyAccountChange(req, res, 'put', '/email', 'confirm email change');
  });
  app.post("/api/v2/user/:user_id/password/request-change", apiAuthCheck, function (req, res) {
    return proxyAccountChange(req, res, 'post', '/password/request-change', 'request password change');
  });
  app.put("/api/v2/user/:user_id/password", apiAuthCheck, function (req, res) {
    return proxyAccountChange(req, res, 'put', '/password', 'confirm password change');
  });

  // API route to verify password
  app.post("/api/verify-password", auth, function (req, res) {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const password = req.body.password;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const userData = req.user._doc || req.user;
    const user = userData.user || userData;

    if (!user || !user.password) {
      return res.status(400).json({ error: 'User not found or no password set' });
    }

    var bcrypt = require("bcrypt-nodejs");
    const passwordMatch = bcrypt.compareSync(password, user.password);

    if (passwordMatch) {
      return res.json({ valid: true });
    } else {
      return res.json({ valid: false });
    }
  });

  // API route to check if email is already in use
  app.post("/api/check-email", auth, function (req, res) {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailLower = email.trim().toLowerCase();
    const currentUserId = req.user._id ? req.user._id.toString() : String(req.user._id);

    // Check if email is already in use by another user
    User.findOne(
      {
        "user.email": emailLower,
        _id: { $ne: ObjectId(currentUserId) }
      },
      function (err, existingUser) {
        if (err) {
          console.error('check-email: Error checking email', err);
          return res.status(500).json({ error: 'Error checking email' });
        }

        if (existingUser) {
          return res.json({ available: false, inUse: true });
        } else {
          return res.json({ available: true, inUse: false });
        }
      }
    );
  });

  // Handle /login with server-side auth check for faster redirect
  app.get("/login", function (req, res) {
    // If already authenticated, redirect immediately (server-side for speed)
    if (req.isAuthenticated()) {
      const redirect = req.query.redirect || req.session.redirect || "/communities";
      if (req.session.redirect) {
        delete req.session.redirect; // Clear after use
      }
      return res.redirect(redirect);
    }
    
    // If there's an error query param already, let Next.js handle it (from explicit redirects)
    const errorParam = req.query.error;
    if (errorParam) {
      return handle(req, res);
    }
    
    // Check for flash messages and pass them as query parameters
    // Passport uses "error" key when failureFlash: true
    const errorFlash = req.flash("error");
    if (errorFlash && errorFlash.length > 0) {
      const errorMessage = errorFlash[0];
      // Convert flash message to query parameter
      // Passport sets "email address or password" for invalid credentials
      let errorValue = 'authentication_failed';
      if (errorMessage === 'account_deactivated') {
        errorValue = 'account_deactivated';
      } else if (errorMessage === 'email address or password' || errorMessage.includes('password') || errorMessage.includes('email')) {
        errorValue = 'authentication_failed';
      }
      return res.redirect(`/login?error=${encodeURIComponent(errorValue)}`);
    }
    
    // Not authenticated, let Next.js handle the login page
    return handle(req, res);
  });

  // Handle /forgot-password - pass flash messages via query params
  app.get("/forgot-password", function (req, res) {
    const flashMessage = req.flash("emailSend");
    const message = flashMessage && flashMessage.length > 0 ? flashMessage[0] : null;
    
    if (message) {
      // Redirect with message as query parameter
      return res.redirect(`/forgot-password?message=${encodeURIComponent(message)}`);
    }
    // No message, let Next.js handle the page
    return handle(req, res);
  });

  // Handle incorrect Discord OAuth path for signup verification - redirect to correct path
  app.get("/auth/discord/signup/verify/:token", function (req, res) {
    return res.redirect(`/signup/verify/${req.params.token}`);
  });

  // Handle /signup/verify page (without token) - let Next.js handle it
  app.get("/signup/verify", function (req, res) {
    return handle(req, res);
  });

  // GET /signup/verify/:token - Verify email and auto-login (MUST be before catchall)
  app.get("/signup/verify/:token", function (req, res) {
    const token = req.params.token;
    const currentTime = Date.now();

    User.findOne(
      {
        "user.emailVerificationToken": token,
        "user.emailVerificationExpires": {
          $gt: currentTime,
        },
      },
      function (err, user) {
        if (err) {
          console.error('Error finding user with verification token:', err);
          req.flash("emailSend", "An error occurred. Please try again.");
          return res.redirect("/signup/verify?error=verification_failed");
        }

        if (!user) {
          // Invalid token - redirect to verify page without email so they can log in
          return res.redirect("/signup/verify?error=invalid_token");
        }

        // Mark email as verified
        user.user.emailVerified = true;
        user.user.emailVerificationToken = undefined;
        user.user.emailVerificationExpires = undefined;

        user.save(function (err) {
          if (err) {
            console.error('Error saving verified user:', err);
            req.flash("emailSend", "An error occurred. Please try again.");
            return res.redirect("/signup/verify?error=verification_failed");
          }

          // Auto-login the user
          req.login(user, function(err) {
            if (err) {
              console.error('Error auto-logging in user after verification:', err);
              req.flash("info", "Email verified successfully! Please log in.");
              return res.redirect("/login");
            }
            // Save session before redirect, but don't block if it's slow
            const saveTimeout = setTimeout(() => {
              if (!res.headersSent) {
                return res.redirect("/communities");
              }
            }, 2000); // 2 second timeout for session save
            
            req.session.save(function(err) {
              clearTimeout(saveTimeout);
              if (!res.headersSent) {
                return res.redirect("/communities");
              }
            });
          });
        });
      }
    );
  });

  // ===========================================
  // CONTENT CREATOR API ROUTES
  // These MUST be defined BEFORE the catch-all below
  // ===========================================

  // JSON-specific auth check for API routes (returns 401 JSON instead of rendering login page)
  function apiAuthCheck(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      console.log('[apiAuthCheck] Authentication failed for', req.method, req.path);
      return res.status(401).json({ error: "Unauthorized", message: "Please log in to continue" });
    }
  }

  // Update community map link (proxy to Go backend)
  app.post("/api/v1/community/:id/map", apiAuthCheck, async function (req, res) {
    try {
      const communityId = req.params.id;
      if (!/^[a-fA-F0-9]{24}$/.test(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const userId = req.user._doc ? req.user._doc._id : req.user._id;
      const response = await axios.patch(
        `${policeCadApiUrl}/api/v1/community/${communityId}?userId=${userId}`,
        { mapLink: req.body.mapLink },
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );

      res.json(response.data);
    } catch (error) {
      console.error("[community-map] Error updating map:", error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to update map" });
      }
    }
  });

  // Get all content creators (public)
  app.get("/api/v1/content-creators", async function (req, res) {
    try {
      const { page = 1, limit = 12, featured, platform, search } = req.query;
      let url = `${policeCadApiUrl}/api/v1/content-creators?page=${page}&limit=${limit}`;
      if (featured) url += `&featured=${featured}`;
      if (platform) url += `&platform=${platform}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const response = await axios.get(url, config);
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching content creators:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch content creators" });
      }
    }
  });

  // Check if slug is available (public) - MUST be before /:slug route
  app.get("/api/v1/content-creators/check-slug", async function (req, res) {
    try {
      const response = await axios.get(`${policeCadApiUrl}/api/v1/content-creators/check-slug`, {
        ...config,
        params: req.query
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error checking slug:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to check slug" });
      }
    }
  });

  // Get content creator by slug (public) - MUST be after /me routes to avoid matching "me" as slug
  app.get("/api/v1/content-creators/:slug", async function (req, res) {
    try {
      const { slug } = req.params;
      // Validate slug to prevent path traversal or malformed paths reaching the upstream API
      const slugPattern = /^[a-zA-Z0-9_-]{1,100}$/;
      if (!slugPattern.test(slug)) {
        console.warn('Invalid content creator slug received:', slug);
        return res.status(400).json({ error: "Invalid content creator identifier" });
      }

      const response = await axios.get(`${policeCadApiUrl}/api/v1/content-creators/${slug}`, config);
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching content creator:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch content creator" });
      }
    }
  });

  // Get current user's application/creator status
  app.get("/api/v1/content-creator-applications/me", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      console.log('[ContentCreator /me] Fetching status for user:', userId);
      console.log('[ContentCreator /me] Calling Go API at:', `${policeCadApiUrl}/api/v1/content-creator-applications/me`);

      const response = await axios.get(`${policeCadApiUrl}/api/v1/content-creator-applications/me`, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString()
        }
      });
      console.log('[ContentCreator /me] Got response:', JSON.stringify(response.data));
      res.json(response.data);
    } catch (error) {
      console.error('[ContentCreator /me] Error fetching creator status:', error.message);
      if (error.response) {
        console.error('[ContentCreator /me] Go API response status:', error.response.status);
        console.error('[ContentCreator /me] Go API response data:', JSON.stringify(error.response.data));
        res.status(error.response.status).json(error.response.data);
      } else {
        console.error('[ContentCreator /me] No response from Go API');
        res.status(500).json({ error: "Failed to fetch creator status" });
      }
    }
  });

  // Submit content creator application
  app.post("/api/v1/content-creator-applications", apiAuthCheck, async function (req, res) {
    try {
      if (!policeCadApiUrl) {
        console.error('[ContentCreator] POLICE_CAD_API_URL is not configured');
        return res.status(500).json({ error: "Server configuration error", message: "API URL not configured" });
      }

      const userId = req.user._id || req.user.id;
      console.log('[ContentCreator] Submitting application for user:', userId);
      console.log('[ContentCreator] Calling Go API at:', `${policeCadApiUrl}/api/v1/content-creator-applications`);

      const response = await axios.post(`${policeCadApiUrl}/api/v1/content-creator-applications`, req.body, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString(),
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('[ContentCreator] Error submitting application:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to submit application", message: "Could not connect to API server" });
      }
    }
  });

  // Withdraw content creator application
  app.delete("/api/v1/content-creator-applications/me", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      console.log('[ContentCreator] Withdrawing application for user:', userId);

      const response = await axios.delete(`${policeCadApiUrl}/api/v1/content-creator-applications/me`, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString()
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('[ContentCreator] Error withdrawing application:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to withdraw application", message: "Could not connect to API server" });
      }
    }
  });

  // Update content creator profile (self)
  app.put("/api/v1/content-creators/me", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const response = await axios.put(`${policeCadApiUrl}/api/v1/content-creators/me`, req.body, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString(),
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error updating creator profile:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to update profile" });
      }
    }
  });

  // Sync follower counts for content creator
  app.post("/api/v1/content-creators/me/sync", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const response = await axios.post(`${policeCadApiUrl}/api/v1/content-creators/me/sync`, req.body, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString(),
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error syncing followers:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ success: false, message: "Failed to sync followers" });
      }
    }
  });

  // Get owned communities for content creator (for community promotion)
  app.get("/api/v1/content-creators/me/owned-communities", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const response = await axios.get(`${policeCadApiUrl}/api/v1/content-creators/me/owned-communities`, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString()
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching owned communities:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ success: false, message: "Failed to fetch owned communities" });
      }
    }
  });

  // Apply community promotion (give free Base Plan to a community)
  app.post("/api/v1/content-creators/me/community-promotion", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const response = await axios.post(`${policeCadApiUrl}/api/v1/content-creators/me/community-promotion`, req.body, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString(),
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error applying community promotion:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ success: false, message: "Failed to apply community promotion" });
      }
    }
  });

  // ============================================
  // Stripe Subscription Routes
  // ============================================

  // Get subscription tiers (public - no auth required)
  app.get("/api/v1/subscription/tiers", async function (req, res) {
    try {
      const response = await axios.get(`${policeCadApiUrl}/api/v1/subscription/tiers`, {
        headers: config.headers
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error fetching tiers:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch subscription tiers" });
      }
    }
  });

  // Get community promotion tiers (public - no auth required)
  app.get("/api/v1/subscription/community-tiers", async function (req, res) {
    try {
      const response = await axios.get(`${policeCadApiUrl}/api/v1/subscription/community-tiers`, {
        headers: config.headers
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error fetching community tiers:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch community tiers" });
      }
    }
  });

  // Check subscription source (requires auth)
  app.post("/api/v1/user/check-subscription-source", apiAuthCheck, async function (req, res) {
    try {
      const response = await axios.post(`${policeCadApiUrl}/api/v1/user/check-subscription-source`, req.body, {
        headers: {
          ...config.headers,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error checking subscription source:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to check subscription source" });
      }
    }
  });

  // Create user checkout session (requires auth)
  app.post("/api/v1/user/create-checkout-session", apiAuthCheck, async function (req, res) {
    try {
      const response = await axios.post(`${policeCadApiUrl}/api/v1/user/create-checkout-session`, req.body, {
        headers: {
          ...config.headers,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error creating checkout session:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to create checkout session" });
      }
    }
  });

  // Verify subscription (requires auth)
  app.post("/api/v1/user/verify-subscription", apiAuthCheck, async function (req, res) {
    try {
      const response = await axios.post(`${policeCadApiUrl}/api/v1/user/verify-subscription`, req.body, {
        headers: {
          ...config.headers,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error verifying subscription:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to verify subscription" });
      }
    }
  });

  // Create portal session (requires auth)
  app.post("/api/v1/user/create-portal-session", apiAuthCheck, async function (req, res) {
    try {
      const response = await axios.post(`${policeCadApiUrl}/api/v1/user/create-portal-session`, req.body, {
        headers: {
          ...config.headers,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error creating portal session:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to create portal session" });
      }
    }
  });

  // Create community checkout session (requires auth)
  app.post("/api/v1/community/create-checkout-session", apiAuthCheck, async function (req, res) {
    try {
      const response = await axios.post(`${policeCadApiUrl}/api/v1/community/create-checkout-session`, req.body, {
        headers: {
          ...config.headers,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error creating community checkout session:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to create community checkout session" });
      }
    }
  });

  // Get user's owned communities (requires auth)
  app.get("/api/v1/communities/:userId", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.params.userId;
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const response = await axios.get(`${policeCadApiUrl}/api/v1/communities/${encodeURIComponent(userId)}`, {
        headers: config.headers
      });
      res.json(response.data);
    } catch (error) {
      console.error('[Subscription] Error fetching user communities:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch communities" });
      }
    }
  });

  // Get user's boost-eligible communities with search support (requires auth)
  app.get("/api/v2/user/:userId/boost-communities", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.params.userId;
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const params = new URLSearchParams();
      if (req.query.search) params.set('search', req.query.search);
      if (req.query.limit) params.set('limit', req.query.limit);
      const qs = params.toString();
      const response = await axios.get(`${policeCadApiUrl}/api/v2/user/${encodeURIComponent(userId)}/boost-communities${qs ? '?' + qs : ''}`, {
        headers: config.headers
      });
      res.json(response.data);
    } catch (error) {
      console.error('[BoostCommunities] Error fetching boost communities:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch boost communities" });
      }
    }
  });

  // Request removal from program
  app.post("/api/v1/content-creators/me/removal-request", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const response = await axios.post(`${policeCadApiUrl}/api/v1/content-creators/me/removal-request`, req.body, {
        headers: {
          ...config.headers,
          'X-User-ID': userId.toString(),
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error requesting removal:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ success: false, message: "Failed to request removal" });
      }
    }
  });

  // Get Cloudinary config for uploads
  app.get("/api/v1/cloudinary-config", function (req, res) {
    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || ''
    });
  });

  // Generate Cloudinary signature for uploads
  app.post("/api/v1/generate-signature", async function (req, res) {
    try {
      const response = await axios.post(`${policeCadApiUrl}/api/v1/generate-signature`, req.body, config);
      res.json(response.data);
    } catch (error) {
      console.error('Error generating signature:', error.message, error.response?.data);
      if (error.response) {
        res.status(error.response.status).json(error.response.data || { error: "Signature generation failed" });
      } else {
        res.status(500).json({ error: "Failed to generate signature" });
      }
    }
  });

  // Update user online status (proxy to Go backend)
  // PUT for normal requests, POST for sendBeacon (which only supports POST)
  async function handleOnlineStatus(req, res) {
    try {
      const response = await axios.put(`${policeCadApiUrl}/api/v1/user/online-status`, req.body, {
        headers: {
          ...config.headers,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (error) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to update online status" });
      }
    }
  }
  app.put("/api/v1/user/online-status", apiAuthCheck, handleOnlineStatus);
  app.post("/api/v1/user/online-status", apiAuthCheck, handleOnlineStatus);

  // ===========================================
  // END CONTENT CREATOR API ROUTES
  // ===========================================

  // ===========================================
  // FEATURE REQUEST API ROUTES
  // These MUST be defined BEFORE the catch-all below
  // ===========================================

  // List feature requests (public - no auth required)
  app.get("/api/v2/feature-requests", async function (req, res) {
    try {
      const { page = 1, limit = 20, sort, status, excludeStatus, q, userId, authorId } = req.query;
      let url = `${policeCadApiUrl}/api/v2/feature-requests?page=${page}&limit=${limit}`;
      if (sort) url += `&sort=${encodeURIComponent(sort)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (excludeStatus) {
        const excludeStatusValues = Array.isArray(excludeStatus) ? excludeStatus : [excludeStatus];
        for (const s of excludeStatusValues) {
          if (s) url += `&excludeStatus=${encodeURIComponent(s)}`;
        }
      }
      if (q) url += `&q=${encodeURIComponent(q)}`;
      if (userId) url += `&userId=${encodeURIComponent(userId)}`;
      if (authorId) url += `&authorId=${encodeURIComponent(authorId)}`;

      const response = await axios.get(url, { headers: config.headers });
      res.json(response.data);
    } catch (error) {
      console.error('[FeatureRequests] Error fetching list:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch feature requests" });
      }
    }
  });

  // Get single feature request (public - no auth required)
  app.get("/api/v1/feature-requests/:id", async function (req, res) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
      const { userId } = req.query;
      let url = `${policeCadApiUrl}/api/v1/feature-requests/${id}`;
      if (userId) url += `?userId=${encodeURIComponent(userId)}`;

      const response = await axios.get(url, { headers: config.headers });
      res.json(response.data);
    } catch (error) {
      console.error('[FeatureRequests] Error fetching feature request:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to fetch feature request" });
      }
    }
  });

  // Create feature request (requires auth)
  app.post("/api/v1/feature-requests", apiAuthCheck, async function (req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const response = await axios.post(
        `${policeCadApiUrl}/api/v1/feature-requests?userId=${userId}`,
        req.body,
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      res.status(201).json(response.data);
      try {
        io.to("feature-requests").emit("feature_request_created", {
          featureRequest: response.data,
        });
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error creating:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to create feature request" });
      }
    }
  });

  // Update feature request (requires auth)
  app.put("/api/v1/feature-requests/:id", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
      const userId = req.user._id || req.user.id;
      const response = await axios.put(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.id}?userId=${userId}`,
        req.body,
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      res.json(response.data);
      try {
        var frId = req.params.id;
        var updatePayload = {
          featureRequestId: frId,
          title: req.body.title,
          description: req.body.description,
        };
        io.to("feature-requests").emit("feature_request_updated", updatePayload);
        io.to("feature-request:" + frId).emit("feature_request_updated", updatePayload);
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error updating:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to update feature request" });
      }
    }
  });

  // Delete feature request (requires auth)
  app.delete("/api/v1/feature-requests/:id", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
      const userId = req.user._id || req.user.id;
      const response = await axios.delete(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.id}?userId=${userId}`,
        { headers: config.headers }
      );
      res.json(response.data);
      try {
        var frId = req.params.id;
        var deletePayload = { featureRequestId: frId };
        io.to("feature-requests").emit("feature_request_deleted", deletePayload);
        io.to("feature-request:" + frId).emit("feature_request_deleted", deletePayload);
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error deleting:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to delete feature request" });
      }
    }
  });

  // Toggle vote on feature request (requires auth)
  app.post("/api/v1/feature-requests/:id/vote", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
      const userId = req.user._id || req.user.id;
      const response = await axios.post(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.id}/vote?userId=${userId}`,
        {},
        { headers: config.headers }
      );
      res.json(response.data);
      try {
        var frId = req.params.id;
        var votePayload = {
          featureRequestId: frId,
          upvoteCount: response.data.upvoteCount,
        };
        io.to("feature-requests").emit("feature_request_voted", votePayload);
        io.to("feature-request:" + frId).emit("feature_request_voted", votePayload);
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error voting:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to vote" });
      }
    }
  });

  // Add comment to feature request (requires auth)
  app.post("/api/v1/feature-requests/:id/comments", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
      const userId = req.user._id || req.user.id;
      const response = await axios.post(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.id}/comments?userId=${userId}`,
        req.body,
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      res.status(201).json(response.data);
      try {
        var frId = req.params.id;
        io.to("feature-requests").emit("feature_request_comment_added_summary", {
          featureRequestId: frId,
        });
        io.to("feature-request:" + frId).emit("feature_request_comment_added", {
          featureRequestId: frId,
          comment: response.data.comment,
        });
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error adding comment:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to add comment" });
      }
    }
  });

  // Update comment on feature request (requires auth)
  app.put("/api/v1/feature-requests/:id/comments/:commentId", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.commentId)) return res.status(400).json({ error: "Invalid ID" });
      const userId = req.user._id || req.user.id;
      const response = await axios.put(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.id}/comments/${req.params.commentId}?userId=${userId}`,
        req.body,
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      res.json(response.data);
      try {
        var frId = req.params.id;
        io.to("feature-request:" + frId).emit("feature_request_comment_edited", {
          featureRequestId: frId,
          commentId: req.params.commentId,
          content: req.body.content,
        });
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error updating comment:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to update comment" });
      }
    }
  });

  // Delete comment from feature request (requires auth)
  app.delete("/api/v1/feature-requests/:id/comments/:commentId", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.commentId)) return res.status(400).json({ error: "Invalid ID" });
      const userId = req.user._id || req.user.id;
      const response = await axios.delete(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.id}/comments/${req.params.commentId}?userId=${userId}`,
        { headers: config.headers }
      );
      res.json(response.data);
      try {
        var frId = req.params.id;
        io.to("feature-requests").emit("feature_request_comment_deleted_summary", {
          featureRequestId: frId,
        });
        io.to("feature-request:" + frId).emit("feature_request_comment_deleted", {
          featureRequestId: frId,
          commentId: req.params.commentId,
        });
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error deleting comment:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to delete comment" });
      }
    }
  });

  // Update feature request status (admin only, requires auth)
  app.put("/api/v1/feature-requests/:id/status", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
      // Pass email so Go API's checkIsAdmin can match against admin_users collection
      const userData = req.user._doc || req.user;
      const user = userData.user || userData;
      const userEmail = user.email;
      const response = await axios.put(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.id}/status?userId=${userEmail}`,
        req.body,
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      res.json(response.data);
      try {
        var frId = req.params.id;
        var statusPayload = {
          featureRequestId: frId,
          status: response.data.status || req.body.status,
        };
        io.to("feature-requests").emit("feature_request_status_changed", statusPayload);
        io.to("feature-request:" + frId).emit("feature_request_status_changed", statusPayload);
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error updating status:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to update status" });
      }
    }
  });

  // Merge feature request (admin only, requires auth)
  app.post("/api/v1/feature-requests/:targetId/merge", apiAuthCheck, async function (req, res) {
    try {
      if (!isValidObjectId(req.params.targetId)) return res.status(400).json({ error: "Invalid ID" });
      const userData = req.user._doc || req.user;
      const user = userData.user || userData;
      const userEmail = user.email;
      const response = await axios.post(
        `${policeCadApiUrl}/api/v1/feature-requests/${req.params.targetId}/merge?userId=${userEmail}`,
        req.body,
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      res.json(response.data);
      try {
        var sourceId = req.body.sourceId;
        var targetId = req.params.targetId;
        // Notify listing: remove source, update target votes
        io.to("feature-requests").emit("feature_request_merged", {
          sourceId: sourceId,
          targetId: targetId,
          targetUpvoteCount: response.data.targetUpvoteCount,
          sourceTitle: response.data.sourceTitle,
          targetTitle: response.data.targetTitle,
        });
        // Notify source detail page: show merged banner
        io.to("feature-request:" + sourceId).emit("feature_request_merged_source", {
          sourceId: sourceId,
          targetId: targetId,
          targetTitle: response.data.targetTitle,
        });
        // Notify target detail page: update mergedFrom + votes
        io.to("feature-request:" + targetId).emit("feature_request_merged_target", {
          sourceId: sourceId,
          targetId: targetId,
          sourceTitle: response.data.sourceTitle,
          targetUpvoteCount: response.data.targetUpvoteCount,
        });
      } catch (e) {
        console.error('[FeatureRequests] Socket broadcast error:', e.message);
      }
    } catch (error) {
      console.error('[FeatureRequests] Error merging:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: "Failed to merge feature request" });
      }
    }
  });

  // ===========================================
  // END FEATURE REQUEST API ROUTES
  // ===========================================

  // Be sure to place all GET requests above this catchall
  // Exclude Next.js internal routes
  app.get("*", function (req, res) {
    // Let Next.js handle its own routes
    if (req.path.startsWith('/_next/') || req.path.startsWith('/api/') || req.path === '/profile' || req.path === '/discord-bot' || req.path === '/about-us' || req.path === '/contact-us' || req.path === '/privacy-policy' || req.path === '/terms-and-conditions' || req.path === '/login' || req.path === '/forgot-password' || req.path === '/signup' || req.path === '/invite-code' || req.path === '/faq' || (req.path.startsWith('/signup/') && !req.path.match(/^\/signup\/verify\/[^/]+$/)) || req.path.startsWith('/reset/') || req.path.startsWith('/content-creators') || req.path.startsWith('/feature-requests') || req.path === '/pricing' || req.path === '/community-pricing' || req.path === '/manage-subscription' || req.path.startsWith('/subscription/') || req.path.startsWith('/community-promotion/') || req.path === '/penal-code') {
      return handle(req, res);
    }
    res.render("page-not-found");
  });

  // POST /login - main login route
  app.post(
    "/login",
    passport.authenticate("login", {
      failureRedirect: "/login",
      failureFlash: true,
      passReqToCallback: true,
    }),
    function (req, res, next) {
      // Set a timeout to prevent hanging (30 seconds)
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          return res.redirect('/login?error=timeout');
        }
      }, 30000);

      // Check if account is deactivated (check local user record first)
      if (req.user && req.user.user && req.user.user.isDeactivated === true) {
        // Account is deactivated - logout and redirect with error
        clearTimeout(timeout);
        const userEmail = req.user.user.email;
        req.logout(function(err) {
          if (!res.headersSent) {
            return res.redirect('/login?error=account_deactivated');
          }
        });
        return;
      }
      
      // Check if user's email is explicitly not verified (emailVerified === false)
      // Old accounts without this field (undefined/null) are treated as verified
      if (req.user && req.user.user && req.user.user.emailVerified === false) {
        // Account exists but is explicitly not verified - redirect to verify page
        clearTimeout(timeout);
        const userEmail = req.user.user.email;
        // Logout the user since they can't access the app until verified
        // Add timeout to logout callback
        const logoutTimeout = setTimeout(() => {
          if (!res.headersSent) {
            return res.redirect(`/signup/verify?email=${encodeURIComponent(userEmail)}`);
          }
        }, 5000); // 5 second timeout for logout

        req.logout(function(err) {
          clearTimeout(logoutTimeout);
          
          if (!res.headersSent) {
            return res.redirect(`/signup/verify?email=${encodeURIComponent(userEmail)}`);
          }
          // Redirect to verify page with email
          if (!res.headersSent) {
            return res.redirect(`/signup/verify?email=${encodeURIComponent(userEmail)}`);
          }
        });
        return;
      }
      
      // Clear timeout since we're proceeding normally
      clearTimeout(timeout);
      
      // User is verified (either emailVerified === true or undefined/null for old accounts) - proceed with normal redirect
      const redirect = sanitizeRedirect(req.body.redirect || req.session.redirect, "/communities");
      if (req.session.redirect) {
        delete req.session.redirect; // Clear the session redirect after use
      }
      
      // Save session before redirect, but don't block if it's slow
      // Set a timeout to prevent hanging on slow MongoDB
      const saveTimeout = setTimeout(() => {
        if (!res.headersSent) {
          // Session save is taking too long, redirect anyway
          return res.redirect(redirect);
        }
      }, 2000); // 2 second timeout for session save
      
      req.session.save(function(err) {
        clearTimeout(saveTimeout);
        if (!res.headersSent) {
          // Redirect to communities (or saved redirect)
          return res.redirect(redirect);
        }
      });
    }
  );

  // POST /api/signup - Create temp account and send verification email
  app.post("/api/signup", function (req, res) {
    if (req.isAuthenticated()) {
      return res.status(400).json({ message: 'You are already logged in.' });
    }

    const { username, email, password } = req.body;

    // Validate inputs
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long.', field: 'username' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.', field: 'email' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.', field: 'password' });
    }

    const searchEmail = email.toLowerCase().trim();
    const searchUsername = username.trim();

    async.waterfall(
      [
        function (done) {
          // Check if email already exists
          User.findOne(
            {
              "user.email": searchEmail
            },
            function (err, existingUser) {
              if (err) {
                return done(err);
              }
              if (existingUser) {
                // Check if account is verified
                // Only send verification email if emailVerified is explicitly false
                // Old accounts (undefined/null) and verified accounts (true) should not receive emails
                const emailVerified = existingUser.user.emailVerified;
                
                // Reject if:
                // 1. emailVerified is explicitly true (verified account)
                // 2. emailVerified is undefined/null (old account, treated as verified)
                if (emailVerified === true || emailVerified === undefined || emailVerified === null) {
                  return res.status(409).json({ message: 'An account with this email already exists. Please log in.', field: 'email' });
                }
                
                // Only proceed if emailVerified === false (explicitly unverified)
                if (emailVerified !== false) {
                  // Safety check - shouldn't reach here, but just in case
                  return res.status(409).json({ message: 'An account with this email already exists. Please log in.', field: 'email' });
                }
                
                // Account exists and is explicitly not verified (emailVerified === false) - resend verification email
                // Generate new verification token
                crypto.randomBytes(20, function (err, buf) {
                  if (err) {
                    return done(err);
                  }
                  var newToken = buf.toString("hex");
                  existingUser.user.emailVerificationToken = newToken;
                  existingUser.user.emailVerificationExpires = Date.now() + 86400000; // 24 hours
                  existingUser.save(function (err) {
                    if (err) {
                      return done(err);
                    }
                    // Send verification email
                    if (!process.env.MAIL_API_KEY) {
                      return res.status(500).json({ message: 'Email service is not configured. Please contact support.' });
                    }
                    var smtpTransport = nodemailer.createTransport(
                      nodemailerSendgrid({
                        apiKey: process.env.MAIL_API_KEY,
                      })
                    );
                    let baseUrl = process.env.BASE_URL;
                    if (!baseUrl && process.env.CLIENT_REDIRECT) {
                      const clientRedirect = process.env.CLIENT_REDIRECT;
                      const url = new URL(clientRedirect);
                      baseUrl = `${url.protocol}//${url.host}`;
                    }
                    if (!baseUrl) {
                      baseUrl = 'https://www.linespolice-cad.com';
                    }
                    const verificationUrl = `${baseUrl}/signup/verify/${newToken}`;
                    fs.readFile("signupVerification.html", "utf8", function (err, htmlData) {
                      if (err) {
                        var mailOptions = {
                          to: existingUser.user.email,
                          from: process.env.FROM_EMAIL,
                          subject: "Verify Your Lines Police CAD Account",
                          html: `<h2>Welcome to Lines Police CAD!</h2><p>Please click the link below to verify your email address:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>This link will expire in 24 hours.</p>`,
                        };
                        smtpTransport.sendMail(mailOptions, function (err) {
                          if (err) {
                            return done(err);
                          }
                          // Response sent - don't call done() to stop waterfall
                          return res.status(200).json({ 
                            message: 'A verification email has been resent. Please check your inbox.',
                            success: true,
                            redirectTo: `/signup/verify?email=${encodeURIComponent(searchEmail)}`
                          });
                        });
                      } else {
                        let template = handlebars.compile(htmlData);
                        let data = {
                          verificationUrl: verificationUrl,
                          username: existingUser.user.username,
                        };
                        let htmlToSend = template(data);
                        var mailOptions = {
                          to: existingUser.user.email,
                          from: process.env.FROM_EMAIL,
                          subject: "Verify Your Lines Police CAD Account",
                          html: htmlToSend,
                        };
                        smtpTransport.sendMail(mailOptions, function (err) {
                          if (err) {
                            return done(err);
                          }
                          // Response sent - don't call done() to stop waterfall
                          return res.status(200).json({ 
                            message: 'A verification email has been resent. Please check your inbox.',
                            success: true,
                            redirectTo: `/signup/verify?email=${encodeURIComponent(searchEmail)}`
                          });
                        });
                      }
                    });
                    // Don't call done() here - response will be sent in email callback
                  });
                });
                // Don't call done() here - we're handling the response in the nested callbacks
                return;
              }
              // No existing user - continue with account creation
              done(null);
            }
          );
        },
        function (done) {
          // Generate verification token
          crypto.randomBytes(20, function (err, buf) {
            if (err) {
              return done(err);
            }
            var token = buf.toString("hex");
            done(null, token);
          });
        },
        function (token, done) {
          // Create temp user account (not verified yet)
          var newUser = new User();
          newUser.user.username = searchUsername;
          newUser.user.email = searchEmail;
          newUser.user.callSign = req.body.callSign ? req.body.callSign.trim() : "";
          newUser.user.password = newUser.generateHash(password);
          newUser.user.name = "";
          newUser.user.address = "";
          newUser.user.discordConnected = false;
          newUser.user.resetPasswordToken = "";
          newUser.user.resetPasswordExpires = "";
          newUser.user.emailVerificationToken = token;
          newUser.user.emailVerificationExpires = Date.now() + 86400000; // 24 hours
          newUser.user.emailVerified = false;
          newUser.user.createdAt = new Date();
          
          newUser.save(function (err, savedUser) {
            if (err) {
              return done(err);
            }
            done(null, token, savedUser);
          });
        },
        function (token, user, done) {
          // Send verification email
          if (!process.env.MAIL_API_KEY) {
            return res.status(500).json({ message: 'Email service is not configured. Please contact support.' });
          }

          var smtpTransport = nodemailer.createTransport(
            nodemailerSendgrid({
              apiKey: process.env.MAIL_API_KEY,
            })
          );

          // Use BASE_URL if set, otherwise extract base from CLIENT_REDIRECT, or use default
          let baseUrl = process.env.BASE_URL;
          if (!baseUrl && process.env.CLIENT_REDIRECT) {
            // Extract base URL from CLIENT_REDIRECT (remove /auth/discord if present)
            const clientRedirect = process.env.CLIENT_REDIRECT;
            const url = new URL(clientRedirect);
            baseUrl = `${url.protocol}//${url.host}`;
          }
          if (!baseUrl) {
            baseUrl = 'https://www.linespolice-cad.com';
          }
          const verificationUrl = `${baseUrl}/signup/verify/${token}`;

          fs.readFile("signupVerification.html", "utf8", function (err, htmlData) {
            if (err) {
              console.error("Failed to read signup verification email template:", err);
              // Fallback to simple text email
              var mailOptions = {
                to: user.user.email,
                from: process.env.FROM_EMAIL,
                subject: "Verify Your Lines Police CAD Account",
                html: `
                  <h2>Welcome to Lines Police CAD!</h2>
                  <p>Please click the link below to verify your email address:</p>
                  <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                  <p>This link will expire in 24 hours.</p>
                `,
              };
              smtpTransport.sendMail(mailOptions, function (err) {
                if (err) {
                  return done(err);
                }
                done(null);
              });
            } else {
              let template = handlebars.compile(htmlData);
              let data = {
                verificationUrl: verificationUrl,
                username: user.user.username,
              };
              let htmlToSend = template(data);
              var mailOptions = {
                to: user.user.email,
                from: process.env.FROM_EMAIL,
                subject: "Verify Your Lines Police CAD Account",
                html: htmlToSend,
              };

              smtpTransport.sendMail(mailOptions, function (err) {
                if (err) {
                  return done(err);
                }
                done(null);
              });
            }
          });
        },
      ],
      function (err) {
        if (err) {
          console.error('Signup error:', err);
          return res.status(500).json({ message: 'An error occurred while creating your account. Please try again.' });
        }
        return res.status(200).json({ 
          message: 'Account created successfully! Please check your email to verify your account.',
          success: true 
        });
      }
    );
  });


  // POST /api/signup/resend - Resend verification email
  app.post("/api/signup/resend", function (req, res) {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const searchEmail = email.toLowerCase().trim();

    // Allow resend even if authenticated (user might be on verify page after login attempt)
    // We'll check emailVerified status to determine if we should send

    async.waterfall(
      [
        function (done) {
          // Try exact match first
          User.findOne(
            { "user.email": searchEmail },
            function (err, user) {
              if (err) {
                return done(err);
              }
              if (!user) {
                // Try case-insensitive search as fallback
                User.findOne(
                  { "user.email": { $regex: new RegExp(`^${searchEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                  function (err2, user2) {
                    if (err2) {
                      // Don't reveal if email exists or not for security
                      return res.status(200).json({ 
                        message: 'If this email is registered, a verification email has been sent.' 
                      });
                    }
                    if (!user2) {
                      // Don't reveal if email exists or not for security
                      return res.status(200).json({ 
                        message: 'If this email is registered, a verification email has been sent.' 
                      });
                    }
                    // Use the found user
                    user = user2;
                    // Continue with the found user
                    checkEmailVerified(user);
                  }
                );
                return;
              }
              checkEmailVerified(user);
            }
          );
          
          function checkEmailVerified(user) {
            // Only send email if emailVerified is explicitly false
            // Old accounts (undefined/null) and verified accounts (true) should not receive emails
            const emailVerified = user.user.emailVerified;
            
            if (emailVerified === true || (emailVerified === undefined || emailVerified === null)) {
              // Account is already verified (or old account without emailVerified field) - don't send email
              return res.status(200).json({ 
                message: 'This email is already verified. Please log in.' 
              });
            }
            
            // Only proceed if emailVerified === false (explicitly unverified)
            if (emailVerified !== false) {
              // Safety check - shouldn't reach here, but just in case
              return res.status(200).json({ 
                message: 'This email is already verified. Please log in.' 
              });
            }
            
            // Account exists and is explicitly not verified (emailVerified === false) - proceed with sending email
            done(null, user);
          }
        },
        function (user, done) {
          // Generate new verification token
          crypto.randomBytes(20, function (err, buf) {
            if (err) {
              console.error('Error generating token:', err);
              return done(err);
            }
            var token = buf.toString("hex");
            const newExpiration = Date.now() + 86400000; // 24 hours
            user.user.emailVerificationToken = token;
            user.user.emailVerificationExpires = newExpiration;
            user.save(function (err) {
              if (err) {
                return done(err);
              }
              done(null, token, user);
            });
          });
        },
        function (token, user, done) {
          // Send verification email
          if (!process.env.MAIL_API_KEY) {
            return res.status(500).json({ message: 'Email service is not configured. Please contact support.' });
          }

          var smtpTransport = nodemailer.createTransport(
            nodemailerSendgrid({
              apiKey: process.env.MAIL_API_KEY,
            })
          );

          // Use BASE_URL if set, otherwise extract base from CLIENT_REDIRECT, or use default
          let baseUrl = process.env.BASE_URL;
          if (!baseUrl && process.env.CLIENT_REDIRECT) {
            // Extract base URL from CLIENT_REDIRECT (remove /auth/discord if present)
            const clientRedirect = process.env.CLIENT_REDIRECT;
            const url = new URL(clientRedirect);
            baseUrl = `${url.protocol}//${url.host}`;
          }
          if (!baseUrl) {
            baseUrl = 'https://www.linespolice-cad.com';
          }
          const verificationUrl = `${baseUrl}/signup/verify/${token}`;

          fs.readFile("signupVerification.html", "utf8", function (err, htmlData) {
            if (err) {
              // Fallback to simple text email
              var mailOptions = {
                to: user.user.email,
                from: process.env.FROM_EMAIL,
                subject: "Verify Your Lines Police CAD Account",
                html: `
                  <h2>Verify Your Email</h2>
                  <p>Please click the link below to verify your email address:</p>
                  <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                  <p>This link will expire in 24 hours.</p>
                `,
              };
              smtpTransport.sendMail(mailOptions, function (err) {
                if (err) {
                  return done(err);
                }
                done(null);
              });
            } else {
              let template = handlebars.compile(htmlData);
              let data = {
                verificationUrl: verificationUrl,
                username: user.user.username,
              };
              let htmlToSend = template(data);
              var mailOptions = {
                to: user.user.email,
                from: process.env.FROM_EMAIL,
                subject: "Verify Your Lines Police CAD Account",
                html: htmlToSend,
              };

              smtpTransport.sendMail(mailOptions, function (err) {
                if (err) {
                  return done(err);
                }
                done(null);
              });
            }
          });
        },
      ],
      function (err) {
        if (err) {
          return res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
        return res.status(200).json({ 
          message: 'Verification email sent! Please check your inbox.',
          success: true 
        });
      }
    );
  });

  // POST /login-civ - redirect to /login for backward compatibility
  app.post(
    "/login-civ",
    passport.authenticate("login", {
      failureRedirect: "/login",
      failureFlash: true,
      passReqToCallback: true,
    }),
    function (req, res, next) {
      const redirect = req.session.redirect || "/communities";
      delete req.session.redirect; // Clear the session redirect after use
      res.redirect(redirect);
    }
  );

  app.post(
    "/login-police",
    passport.authenticate("login", {
      successRedirect: "/police-dashboard",
      failureRedirect: "/login-police",
      failureFlash: true,
    })
  );

  app.post(
    "/login-ems",
    passport.authenticate("login", {
      successRedirect: "/ems-dashboard",
      failureRedirect: "/login-ems",
      failureFlash: true,
    })
  );

  app.post(
    "/login-community",
    passport.authenticate("login", {
      successRedirect: "/communities",
      failureRedirect: "/login-community",
      failureFlash: true,
    })
  );

  app.post(
    "/login-dispatch",
    passport.authenticate("login", {
      successRedirect: "/dispatch-dashboard",
      failureRedirect: "/login-dispatch",
      failureFlash: true,
    })
  );

  app.post(
    "/signup-civ",
    passport.authenticate("signup", {
      successRedirect: "/communities",
      failureRedirect: "/signup-civ",
      failureFlash: true,
    })
  );

  app.post(
    "/signup-police",
    passport.authenticate("signup", {
      successRedirect: "/police-dashboard",
      failureRedirect: "/signup-police",
      failureFlash: true,
    })
  );

  app.post(
    "/signup-ems",
    passport.authenticate("signup", {
      successRedirect: "/ems-dashboard",
      failureRedirect: "/signup-ems",
      failureFlash: true,
    })
  );

  app.post(
    "/signup-community",
    passport.authenticate("signup", {
      successRedirect: "/communities",
      failureRedirect: "/signup-community",
      failureFlash: true,
    })
  );

  app.post(
    "/signup-dispatch",
    passport.authenticate("signup", {
      successRedirect: "/dispatch-dashboard",
      failureRedirect: "/signup-dispatch",
      failureFlash: true,
    })
  );

  app.post("/forgot-password", function (req, res, next) {
    async.waterfall(
      [
        function (done) {
          crypto.randomBytes(20, function (err, buf) {
            if (err) {
              // Error code: FP-1001 - Token generation failed
              req.flash(
                "emailSend",
                "An error occurred while processing your request. Please try again. If the problem persists, contact support with error code: FP-1001"
              );
              return res.redirect("/forgot-password");
            }
            var token = buf.toString("hex");
            done(null, token);
          });
        },
        function (token, done) {
          if (!exists(req.body.email)) {
            req.flash(
              "emailSend",
              "Please enter a valid Email address and try again (error code: FP-1000)"
            );
            return res.redirect("/forgot-password");
          }
          if (req.body.email.trim().length < 1) {
            req.flash(
              "emailSend",
              "Please enter a valid Email address and try again (error code: FP-1000)"
            );
            return res.redirect("/forgot-password");
          }
          
          const searchEmail = req.body.email.toLowerCase();
          
          User.findOne(
            {
              "user.email": searchEmail,
            },
            function (err, users) {
              if (err) {
                // Error code: FP-1002 - Database lookup failed
                req.flash(
                  "emailSend",
                  "An error occurred while processing your request. Please try again. If the problem persists, contact support with error code: FP-1002"
                );
                return res.redirect("/forgot-password");
              }
              
              if (!users) {
                // Don't reveal if email exists or not for security
                req.flash(
                  "emailSend",
                  "If this e-mail exists, then an email has been sent to '" +
                    searchEmail +
                    "' with a link to change the password."
                );
                return res.redirect("/forgot-password");
              }
              
              // Set the reset fields
              const expirationTime = Date.now() + 3600000; // 1 hour from now
              users.user.resetPasswordToken = token;
              users.user.resetPasswordExpires = expirationTime;
              
              // Explicitly mark nested fields as modified for older accounts
              // This ensures Mongoose tracks changes even if fields were empty/null
              users.markModified('user.resetPasswordToken');
              users.markModified('user.resetPasswordExpires');
              
              users.save(function (err, savedUser) {
                if (err) {
                  console.error('Error saving reset token:', err);
                  // Error code: FP-1003 - Failed to save reset token
                  req.flash(
                    "emailSend",
                    "An error occurred while processing your request. Please try again. If the problem persists, contact support with error code: FP-1003"
                  );
                  return res.redirect("/forgot-password");
                }
                
                done(null, token, users);
              });
            }
          );
        },
        function (token, users, done) {
          if (!process.env.MAIL_API_KEY) {
            // Error code: FP-1004 - Email service not configured
            req.flash(
              "emailSend",
              "An error occurred while sending the email. Please contact support with error code: FP-1004"
            );
            return res.redirect("/forgot-password");
          }
          
          var smtpTransport = nodemailer.createTransport(
            nodemailerSendgrid({
              apiKey: process.env.MAIL_API_KEY,
            })
          );
          
          fs.readFile("resetPassword.html", "utf8", function (err, htmlData) {
            if (err) {
              // Error code: FP-1005 - Email template not found
              req.flash(
                "emailSend",
                "An error occurred while preparing the email. Please contact support with error code: FP-1005"
              );
              return res.redirect("/forgot-password");
            }
            
            try {
              let template = handlebars.compile(htmlData);
              const resetLink = process.env.SITE_PROTOCOL +
                  req.headers.host +
                  "/reset/" +
                  token;
              
              let data = {
                resetLink: resetLink,
                sentTo: users.user.email.toLowerCase(),
              };
              let htmlToSend = template(data);
              
              var mailOptions = {
                to: users.user.email.toLowerCase(),
                from: process.env.FROM_EMAIL || "noreply@linespolice-cad.com",
                subject: "Lines Police CAD Reset Password",
                html: htmlToSend,
              };
              
              smtpTransport.sendMail(mailOptions, function (err) {
                if (err) {
                  // Error code: FP-1006 - Email send failed
                  req.flash(
                    "emailSend",
                    "An error occurred while sending the email. Please try again. If the problem persists, contact support with error code: FP-1006"
                  );
                  return res.redirect("/forgot-password");
                }
                
                // Success - don't reveal if email exists or not for security
                req.flash(
                  "emailSend",
                  "If this e-mail exists, then an email has been sent to " +
                    users.user.email.toLowerCase() +
                    " with a link to change the password."
                );
                done(null, "done");
              });
            } catch (templateErr) {
              // Error code: FP-1007 - Email template compilation failed
              req.flash(
                "emailSend",
                "An error occurred while preparing the email. Please contact support with error code: FP-1007"
              );
              return res.redirect("/forgot-password");
            }
          });
        },
      ],
      function (err) {
        if (err) {
          // Error code: FP-1008 - Unexpected error in password reset flow
          req.flash(
            "emailSend",
            "An unexpected error occurred. Please try again. If the problem persists, contact support with error code: FP-1008"
          );
        }
        // Redirect to /forgot-password with message as query parameter
        const flashMessage = req.flash("emailSend");
        const message = flashMessage && flashMessage.length > 0 ? flashMessage[0] : '';
        return res.redirect(`/forgot-password?message=${encodeURIComponent(message)}`);
      }
    );
  });

  app.post("/reset/:token", function (req, res) {
    var token = req.session.resetToken;
    const currentTime = Date.now();

    async.waterfall(
      [
        function (done) {
          if (!token) {
            req.flash(
              "resetSend",
              "Password reset token is invalid or has expired."
            );
            return res.redirect("back");
          }
          
          User.findOne(
            {
              "user.resetPasswordToken": token,
              "user.resetPasswordExpires": {
                $gt: currentTime,
              },
            },
            function (err, users) {
              if (err) {
                console.error('Error finding user in POST /reset:', err);
                return console.error(err);
              }
              
              if (!users) {
                req.flash(
                  "resetSend",
                  "Password reset token is invalid or has expired."
                );
                return res.redirect("back");
              }
              var user = users;
              var newHash = user.generateHash(req.body.password);
              user.user.password = newHash;
              user.user.resetPasswordToken = undefined;
              user.user.resetPasswordExpires = undefined;

              // Must call markModified for nested fields or Mongoose won't save them
              user.markModified('user.password');
              user.markModified('user.resetPasswordToken');
              user.markModified('user.resetPasswordExpires');

              user.save(async function (err) {
                if (err) {
                  return done(err);
                }

                // Sync password to the API database (where login authenticates)
                // Send plain password so API can hash with Go's bcrypt (ensures compatibility)
                try {
                  const apiUrl = process.env.POLICE_CAD_API_URL || "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
                  const apiToken = process.env.POLICE_CAD_API_TOKEN;

                  if (apiToken) {
                    await axios.post(`${apiUrl}/api/v1/user/sync-password`, {
                      email: user.user.email.toLowerCase(),
                      password: req.body.password  // Send plain password - API will hash with Go bcrypt
                    }, {
                      headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                      }
                    });
                  }
                } catch (syncError) {
                  // Log error but don't fail the reset - local DB was updated
                  console.error('Failed to sync password to API:', syncError.response?.data || syncError.message);
                }

                // Clear the reset token from session since it's no longer needed
                if (req.session.resetToken) {
                  delete req.session.resetToken;
                  // Save session to persist the deletion (non-blocking)
                  req.session.save(function(saveErr) {
                    // Ignore errors - token is cleared from memory anyway
                  });
                }

                done(null, user);
              });
            }
          );
        },
        function (users, done) {
          var smtpTransport = nodemailer.createTransport(
            nodemailerSendgrid({
              apiKey: process.env.MAIL_API_KEY,
            })
          );
          fs.readFile(
            "passwordHasBeenReset.html",
            "utf8",
            function (err, htmlData) {
              if (err) {
                console.error("failed to read file: ", err);
                return res.redirect("back");
              }
              let template = handlebars.compile(htmlData);
              let data = {
                sentTo: users.user.email.toLowerCase(),
              };
              let htmlToSend = template(data);
              var mailOptions = {
                to: users.user.email.toLowerCase(),
                from: process.env.FROM_EMAIL,
                subject: "Lines Police CAD Password Has Been Reset",
                html: htmlToSend,
              };

              smtpTransport.sendMail(mailOptions, function (err) {
                req.flash("info", "Success! Your password has been changed.");
                done(err, users);
              });
            }
          );
        },
        function (users, done) {
          // Auto-login the user after successful password reset
          // They've already verified their identity via email
          req.login(users, function (err) {
            if (err) {
              console.error("Error auto-logging in user after password reset:", err);
              // Still redirect even if login fails - they can log in manually
              return done(null);
            }
            done(null);
          });
        },
      ],
      function (err) {
        if (err) {
          // If there was an error, redirect back to reset page
          return res.redirect("/reset/encryptedToken");
        }
        // Successfully reset password and logged in - redirect to communities
        req.flash("info", "Success! Your password has been changed and you've been logged in.");
        return res.redirect("/communities");
      }
    );
  });

  app.post("/create-ems", auth, function (req, res) {
    var myEms = new Ems();
    myEms.create(req, res);
    myEms.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/create-ems-vehicle", auth, function (req, res) {
    var myVeh = new EmsVehicle();
    myVeh.createVeh(req, res);
    myVeh.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/create-ticket", auth, function (req, res) {
    var myTicket = new Ticket();
    myTicket.updateTicket(req, res);
    myTicket.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/create-medication", auth, function (req, res) {
    var myMedication = new Medication();
    myMedication.createMedication(req, res);
    myMedication.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/create-condition", auth, function (req, res) {
    var myCondition = new Condition();
    myCondition.createCondition(req, res);
    myCondition.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/create-medical-report", auth, function (req, res) {
    // console.debug('[DEBUG] (create-medical-report) req.body', req.body)
    var myReport = new MedicalReport();
    myReport.createReport(req, res);
    let deceasedState = false;
    req.body.deceased === "true"
      ? (deceasedState = true)
      : (deceasedState = false);
    Civilian.findByIdAndUpdate(
      {
        _id: req.body.civilianID,
      },
      {
        $set: {
          "civilian.deceased": deceasedState,
        },
      },
      function (err) {
        if (err) return console.error(err);
      }
    );
    myReport.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/create-arrest-report", auth, function (req, res) {
    var myArrestReport = new ArrestReport();
    myArrestReport.updateArrestReport(req, res);
    myArrestReport.save(function (err) {
      if (err) return console.error(err);
    });
  });

  // Sanitize user-provided route values to prevent open redirects.
  // Only allows simple path characters; rejects protocol-relative URLs and schemes.
  function getSafeRedirectPath(route) {
    if (typeof route !== "string") return "/";
    var trimmed = route.trim();
    if (!trimmed || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith("//")) return "/";
    if (!/^[A-Za-z0-9/_-]+$/.test(trimmed)) return "/";
    return trimmed.startsWith("/") ? trimmed : "/" + trimmed;
  }

  app.post("/create-warrant", auth, function (req, res) {
    // Build charges array from the multi-select
    var charges = req.body.charges;
    if (!Array.isArray(charges)) {
      charges = charges ? [charges] : [];
    }

    var warrantData = {
      warrantType: req.body.warrantType || "arrest",
      accusedID: req.body.accusedID,
      accusedFirstName: req.body.accusedFirstName,
      accusedLastName: req.body.accusedLastName,
      charges: charges,
      probableCause: req.body.probableCause,
      searchLocation: req.body.searchLocation || "",
      requestingOfficerID: req.body.requestingOfficerID,
      requestingOfficerName: req.body.requestingOfficerName,
      activeCommunityID: req.body.activeCommunityID || "",
    };

    axios
      .post(`${policeCadApiUrl}/api/v1/warrant`, warrantData, config)
      .then(function (response) {
        req.app.locals.specialContext = null;
        if (response.data && response.data.status === "pending") {
          req.app.locals.specialContext = "warrantPending";
        }
        return res.redirect(getSafeRedirectPath(req.body.route));
      })
      .catch(function (err) {
        console.error("Error creating warrant:", err.message);
        req.app.locals.specialContext = "warrantError";
        return res.redirect(getSafeRedirectPath(req.body.route));
      });
  });

  app.post("/clear-warrant", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.warrantID,
      "cannot lookup invalid length warrantID, route: /clear-warrant"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect(getSafeRedirectPath(req.body.route));
    }
    // Enforce strict ObjectId format (24 hexadecimal characters) to prevent SSRF
    if (!/^[a-fA-F0-9]{24}$/.test(req.body.warrantID)) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect(getSafeRedirectPath(req.body.route));
    }
    // Use the API to update warrant status to withdrawn
    axios
      .put(
        `${policeCadApiUrl}/api/v1/warrant/${req.body.warrantID}`,
        { status: "withdrawn" },
        config
      )
      .then(function () {
        return res.redirect(getSafeRedirectPath(req.body.route));
      })
      .catch(function (err) {
        console.error("Error clearing warrant:", err.message);
        return res.redirect(getSafeRedirectPath(req.body.route));
      });
  });

  app.post("/create-bolo", auth, function (req, res) {
    // console.debug('create bolo req: ', req.body)
    var myBolo = new Bolo();
    myBolo.createBolo(req, res);
    myBolo.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/clear-bolo", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.boloID,
      "cannot lookup invalid length boloID, route: /clear-bolo"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect("/" + req.body.route);
    }
    Bolo.findByIdAndDelete(
      {
        _id: ObjectId(req.body.boloID),
      },
      function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "clearBoloSuccess";
        return res.redirect("/" + req.body.route);
      }
    );
  });

  app.post("/create-call", auth, function (req, res) {
    var myCall = new Call();
    myCall.createCall(req, res);
    myCall.save(function (err, dbCalls) {
      if (err) return console.error(err);
    });
  });

  app.post("/joinCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (!exists(req.body.communityCode)) {
      return res.redirect("back");
    }
    var communityCode = req.body.communityCode.trim();
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      return res.redirect("back");
    }
    Community.findOne(
      {
        "community.code": req.body.communityCode.toUpperCase(),
      },
      function (err, community) {
        if (err) return console.error(err);
        if (community == null) {
          req.app.locals.specialContext = "noCommunityFound";
          return res.redirect("back");
        }
        var isValid = isValidObjectIdLength(
          req.body.userID,
          "cannot lookup invalid length userID, route: /joinCommunity"
        );
        if (!isValid) {
          req.app.locals.specialContext = "invalidRequest";
          return res.redirect("back");
        }
        User.findOneAndUpdate(
          {
            _id: ObjectId(req.body.userID),
          },
          {
            $set: {
              "user.activeCommunity": community._id,
            },
          },
          function (err) {
            if (err) return console.error(err);
            req.app.locals.specialContext = "joinCommunitySuccess";
            return res.redirect("back");
          }
        );
      }
    );
  });

  app.post("/leaveActiveCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.userID,
      "cannot lookup invalid length userID, route: /leaveActiveCommunity"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect("back");
    }
    User.findOneAndUpdate(
      {
        _id: ObjectId(req.body.userID),
      },
      {
        $set: {
          "user.activeCommunity": null,
        },
      },
      function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "leaveCommunitySuccess";
        return res.redirect("back");
      }
    );
  });

  app.post("/joinPoliceCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (!exists(req.body.communityCode)) {
      return res.redirect("back");
    }
    var communityCode = req.body.communityCode.trim();
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      return res.redirect("/" + req.body.route);
    }
    Community.findOne(
      {
        "community.code": req.body.communityCode.toUpperCase(),
      },
      function (err, community) {
        if (err) return console.error(err);
        if (community == null) {
          req.app.locals.specialContext = "noCommunityFound";
          return res.redirect("/" + req.body.route);
        }
        var isValid = isValidObjectIdLength(
          req.body.userID,
          "cannot lookup invalid length userID, route: /joinPoliceCommunity"
        );
        if (!isValid) {
          req.app.locals.specialContext = "invalidRequest";
          return res.redirect(req.body.route);
        }
        User.findOneAndUpdate(
          {
            _id: ObjectId(req.body.userID),
          },
          {
            $set: {
              "user.activeCommunity": community._id,
            },
          },
          function (err) {
            if (err) return console.error(err);
            req.app.locals.specialContext = "joinCommunitySuccess";
            return res.redirect("/" + req.body.route);
          }
        );
      }
    );
  });

  app.post("/leavePoliceActiveCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.userID,
      "cannot lookup invalid length userID, route: /leavePoliceActiveCommunity"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect(req.body.route);
    }
    User.findOneAndUpdate(
      {
        _id: ObjectId(req.body.userID),
      },
      {
        $set: {
          "user.activeCommunity": null,
        },
      },
      function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "leaveCommunitySuccess";
        return res.redirect("/" + req.body.route);
      }
    );
  });

  app.post("/joinEmsCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (!exists(req.body.communityCode)) {
      return res.redirect("back");
    }
    var communityCode = req.body.communityCode.trim();
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      return res.redirect("/ems-dashboard");
    }
    Community.findOne(
      {
        "community.code": req.body.communityCode.toUpperCase(),
      },
      function (err, community) {
        if (err) return console.error(err);
        if (community == null) {
          req.app.locals.specialContext = "noCommunityFound";
          return res.redirect("/ems-dashboard");
        }
        var isValid = isValidObjectIdLength(
          req.body.userID,
          "cannot lookup invalid length userID, route: /leavePoliceActiveCommunity"
        );
        if (!isValid) {
          req.app.locals.specialContext = "invalidRequest";
          return res.redirect("/ems-dashboard");
        }
        User.findOneAndUpdate(
          {
            _id: ObjectId(req.body.userID),
          },
          {
            $set: {
              "user.activeCommunity": community._id,
            },
          },
          function (err) {
            if (err) return console.error(err);
            req.app.locals.specialContext = "joinCommunitySuccess";
            return res.redirect("/ems-dashboard");
          }
        );
      }
    );
  });

  app.post("/leaveEmsActiveCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.userID,
      "cannot lookup invalid length userID, route: /leaveEmsActiveCommunity"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect("/ems-dashboard");
    }
    User.findOneAndUpdate(
      {
        _id: ObjectId(req.body.userID),
      },
      {
        $set: {
          "user.activeCommunity": null,
        },
      },
      function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "leaveCommunitySuccess";
        return res.redirect("/ems-dashboard");
      }
    );
  });

  app.post("/createCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var myCommunity = new Community();
    myCommunity.createCommunity(req, res);
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /createCommunity"
      );
      if (!isValid) {
        return (req.app.locals.specialContext = "invalidRequest");
      }
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.activeCommunity": result._id,
            "user.lastAccessedCommunity": {
              communityID: String(result._id),
              createdAt: new Date(),
            },
          },
        },
        function (err) {
          if (err) return console.error(err);
          return (req.app.locals.specialContext = "createCommunitySuccess");
        }
      );
    });
  });

  app.post("/createPoliceCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var myCommunity = new Community();
    myCommunity.createPoliceCommunity(req, res);
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /createPoliceCommunity"
      );
      if (!isValid) {
        return (req.app.locals.specialContext = "invalidRequest");
      }
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.activeCommunity": result._id,
            "user.lastAccessedCommunity": {
              communityID: String(result._id),
              createdAt: new Date(),
            },
          },
        },
        function (err) {
          if (err) return console.error(err);
          return (req.app.locals.specialContext = "createCommunitySuccess");
        }
      );
    });
  });

  app.post("/createEmsCommunity", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var myCommunity = new Community();
    myCommunity.createEmsCommunity(req, res);
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /createEmsCommunity"
      );
      if (!isValid) {
        return (req.app.locals.specialContext = "invalidRequest");
      }
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.activeCommunity": result._id,
            "user.lastAccessedCommunity": {
              communityID: String(result._id),
              createdAt: new Date(),
            },
          },
        },
        function (err) {
          if (err) return console.error(err);
          return (req.app.locals.specialContext = "createCommunitySuccess");
        }
      );
    });
  });

  app.post("/manageAccount", auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (req.body.action === "disconnectDiscord") {
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.discord.id": null,
            "user.discord.username": null,
            "user.discord.discriminator": null,
            "user.discordConnected": false,
          },
        },
        function (err) {
          if (err) console.error(err);
          return res.redirect("back");
        }
      );
    } else if (req.body.action === "updateUsername") {
      var username;
      if (exists(req.body.accountUsername)) {
        username = req.body.accountUsername.trim();
      }
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /manageAccount"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("back");
      }
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.username": username,
            "user.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) {
            console.error(err);
          }
          return res.redirect("back");
        }
      );
    } else if (req.body.action === "updateCallSign") {
      var callSign;
      if (exists(req.body.accountCallSign)) {
        callSign = req.body.accountCallSign.trim();
      }
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /manageAccount"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("back");
      }
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.callSign": callSign,
            "user.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) {
            console.error(err);
          }
          return res.redirect("back");
        }
      );
    } else if (req.body.action === "updateDiscordToken") {
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /manageAccount"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("back");
      }
      let newToken = randomstring.generate(12);
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.discordLoginToken": newToken,
          },
        },
        function (err) {
          if (err) {
            console.error(err);
          }
          return res.redirect("back");
        }
      );
    } else if (req.body.action === "updateProfilePicture") {
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /manageAccount"
      );
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      var profilePicture = req.body.profilePicture || '';
      User.findOneAndUpdate(
        {
          _id: ObjectId(req.body.userID),
        },
        {
          $set: {
            "user.profilePicture": profilePicture,
            "user.updatedAt": new Date(),
          },
        },
        { new: true },
        function (err, updatedUser) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update profile picture' });
          }
          return res.json({ success: true, profilePicture: updatedUser.user.profilePicture });
        }
      );
    } else {
      return res.redirect("back");
    }
  });

  app.post("/deleteAccount", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var page = req.body.page;
    // grab all civilians and delete arrest, tickets and warrants for each
    Civilian.find(
      {
        "civilian.userID": req.body.userID,
      },
      function (err, cursor) {
        if (err) return console.error(err);
        cursor.forEach((element) => {
          ArrestReport.deleteMany(
            {
              "arrestReport.accusedID": element._id,
            },
            function (err) {
              if (err) return console.error(err);
              Ticket.deleteMany(
                {
                  "ticket.civID": element._id,
                },
                function (err) {
                  if (err) return console.error(err);
                  Warrant.deleteMany(
                    {
                      "warrant.accusedID": element._id,
                    },
                    function (err) {
                      if (err) {
                        console.error(err);
                        return res.redirect("back");
                      }
                    }
                  );
                }
              );
            }
          );
        });
        // delete civilians
        Civilian.deleteMany(
          {
            "civilian.userID": req.body.userID,
          },
          function (err) {
            // delete communities
            Community.deleteMany(
              {
                "community.ownerID": req.body.userID,
              },
              function (err) {
                // delete ems
                Ems.deleteMany(
                  {
                    "ems.userID": req.body.userID,
                  },
                  function (err) {
                    // delete emsVehicles
                    EmsVehicle.deleteMany(
                      {
                        "emsVehicle.userID": req.body.userID,
                      },
                      function (err) {
                        // delete vehicles
                        Vehicle.deleteMany(
                          {
                            "vehicle.userID": req.body.userID,
                          },
                          function (err) {
                            // delete user
                            var isValid = isValidObjectIdLength(
                              req.body.userID,
                              "cannot lookup invalid length userID, route: /deleteAccount"
                            );
                            if (!isValid) {
                              req.app.locals.specialContext = "invalidRequest";
                              return res.redirect("/");
                            }
                            User.findByIdAndDelete(
                              {
                                _id: ObjectId(req.body.userID),
                              },
                              function (err) {
                                if (err) {
                                  console.error(err);
                                  return res.redirect(page);
                                }
                                return res.redirect("/");
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  app.post("/updateOrDeleteBolo", auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (req.body.action === "delete") {
      var boloID;
      if (exists(req.body.boloID)) {
        boloID = req.body.boloID;
      }
      var isValid = isValidObjectIdLength(
        boloID,
        "cannot lookup invalid length boloID, route: /updateOrDeleteBolo"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("/" + req.body.route);
      }
      Bolo.findByIdAndDelete(
        {
          _id: ObjectId(boloID),
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect("/" + req.body.route);
        }
      );
    } else {
      var boloType;
      var location;
      var description;
      var boloID;
      if (exists(req.body.boloType)) {
        boloType = req.body.boloType.trim().toLowerCase();
      }
      if (exists(req.body.location)) {
        location = req.body.location.trim();
      }
      if (exists(req.body.description)) {
        description = req.body.description.trim();
      }
      if (exists(req.body.boloID)) {
        boloID = req.body.boloID;
      } else {
        console.warn(
          "cannot update or delete non-existent boloID: ",
          req.body.boloID
        );
        return res.redirect("/" + req.body.route);
      }
      var isValid = isValidObjectIdLength(
        boloID,
        "cannot lookup invalid length boloID, route: /updateOrDeleteBolo"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("/" + req.body.route);
      }
      Bolo.findOneAndUpdate(
        {
          _id: ObjectId(boloID),
        },
        {
          $set: {
            "bolo.boloType": boloType,
            "bolo.location": location,
            "bolo.description": description,
            "bolo.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect("/" + req.body.route);
        }
      );
    }
  });

  app.post("/updateOrDeleteCall", auth, function (req, res) {
    // console.debug("received a request:", req.body)

    req.app.locals.specialContext = null;
    if (req.body.action === "delete") {
      var callID;
      if (exists(req.body.callID)) {
        callID = req.body.callID;
      }
      var isValid = isValidObjectIdLength(
        callID,
        "cannot lookup invalid length callID, route: /updateOrDeleteCall"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("/" + req.body.route);
      }
      Call.findByIdAndDelete(
        {
          _id: ObjectId(callID),
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect("/" + req.body.route);
        }
      );
    } else if (req.body.action === "update") {
      let classifier;
      var shortDescription;
      var assignedOfficers;
      let assignedFireEms;
      var callNotes;
      var callID;
      if (exists(req.body.classifier)) {
        classifier = req.body.classifier;
      }
      if (exists(req.body.shortDescription)) {
        shortDescription = req.body.shortDescription.trim();
      }
      if (exists(req.body.assignedOfficers)) {
        assignedOfficers = req.body.assignedOfficers;
      }
      if (exists(req.body.assignedFireEms)) {
        assignedFireEms = req.body.assignedFireEms;
      }
      if (exists(req.body.callNotes)) {
        callNotes = req.body.callNotes.trim();
      }

      if (exists(req.body.callID)) {
        callID = req.body.callID;
      } else {
        console.warn(
          "cannot update or delete non-existent callID: ",
          req.body.callID
        );
        return res.redirect("/" + req.body.route);
      }
      var isValid = isValidObjectIdLength(
        callID,
        "cannot lookup invalid length callID, route: /updateOrDeleteCall"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("/" + req.body.route);
      }
      Call.findOneAndUpdate(
        {
          _id: ObjectId(callID),
        },
        {
          $set: {
            "call.classifier": classifier,
            "call.shortDescription": shortDescription,
            "call.assignedOfficers": assignedOfficers,
            "call.assignedFireEms": assignedFireEms,
            "call.callNotes": callNotes,
            "call.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect("/" + req.body.route);
        }
      );
    } else {
      var callID;
      if (exists(req.body.callID)) {
        callID = req.body.callID;
      } else {
        console.warn(
          "cannot update or delete non-existent callID: ",
          req.body.callID
        );
        return res.redirect("/" + req.body.route);
      }
      var isValid = isValidObjectIdLength(
        callID,
        "cannot lookup invalid length callID, route: /updateOrDeleteCall"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("/" + req.body.route);
      }
      Call.findOneAndUpdate(
        {
          _id: ObjectId(callID),
        },
        {
          $set: {
            "call.status": false,
          },
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect("/" + req.body.route);
        }
      );
    }
  });

  app.post("/deleteEms", auth, function (req, res) {
    // console.debug("deleteEms request: ", req.body)
    if (!exists(req.body.removeEms)) {
      console.error("cannot deleteEms with an empty persona ID");
      res.status(400);
      return res.redirect("back");
    }
    if (
      !isValidObjectIdLength(
        req.body.removeEms,
        "cannot lookup invalid length removeEms persona ID, route: /deleteEms"
      )
    ) {
      res.status(400);
      return res.redirect("back");
    }
    Ems.deleteOne(
      {
        _id: ObjectId(req.body.removeEms),
      },
      function (err) {
        if (err) return console.error(err);
        res.redirect("/ems-dashboard");
      }
    );
  });

  app.post("/updateOrDeleteVeh", auth, function (req, res) {
    // console.debug("update or delete vehicle body: ", req.body);
    var backLocation = req.body.backLocation;
    req.app.locals.specialContext = null;
    if (req.body.action === "update") {
      if (!exists(req.body.roVeh)) {
        req.body.roVeh = "N/A";
      }
      var isValid = isValidObjectIdLength(
        req.body.vehicleID,
        "cannot update vehicle with invalid vehicleID, route: /updateOrDeleteVeh"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect(backLocation);
      }
      if (!exists(req.body.vinVeh)) {
        req.body.vinVeh = "";
      }
      Vehicle.findByIdAndUpdate(
        {
          _id: ObjectId(req.body.vehicleID),
        },
        {
          $set: {
            "vehicle.plate": req.body.plateVeh.trim().toUpperCase(),
            "vehicle.vin": req.body.vinVeh.trim().toUpperCase(),
            "vehicle.model":
              req.body.modelVeh.trim().charAt(0).toUpperCase() +
              req.body.modelVeh.trim().slice(1),
            "vehicle.color":
              req.body.colorView.trim().charAt(0).toUpperCase() +
              req.body.colorView.trim().slice(1),
            "vehicle.validRegistration": req.body.validRegView,
            "vehicle.validInsurance": req.body.validInsView,
            "vehicle.registeredOwner": req.body.roVeh.trim(),
            "vehicle.isStolen": req.body.stolenView,
            "vehicle.isExempt": req.body.exemptView,
            "vehicle.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) return console.error(err);
          req.app.locals.specialContext = "updateSuccess";
          return res.redirect(backLocation);
        }
      );
    } else {
      var isValid = isValidObjectIdLength(
        req.body.vehicleID,
        "cannot delete vehicle with invalid vehicleID, route: /updateOrDeleteVeh"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect(backLocation);
      }
      Vehicle.findByIdAndDelete(
        {
          _id: ObjectId(req.body.vehicleID),
        },
        function (err) {
          if (err) return console.error(err);
          req.app.locals.specialContext = "deleteSuccess";
          return res.redirect(backLocation);
        }
      );
    }
  });

  app.post("/updateOrDeleteFirearm", auth, function (req, res) {
    // console.debug("update or delete firearm body: ", req.body);
    req.app.locals.specialContext = null;
    if (req.body.action === "update") {
      if (!exists(req.body.firearmID)) {
        console.warn(
          "cannot update firearm with empty firearmID, route: /updateOrDeleteFirearm"
        );
        return res.redirect("/civ-dashboard");
      }
      if (!exists(req.body.roFirearm)) {
        console.warn(
          "cannot update firearm with empty registered owner, route: /updateOrDeleteFirearm"
        );
        return res.redirect("/civ-dashboard");
      }
      if (!exists(req.body.firearmOwnerID)) {
        console.warn(
          "cannot update firearm with empty firearmOwnerID, route: /updateOrDeleteFirearm"
        );
        return res.redirect("/civ-dashboard");
      }

      var isValid = isValidObjectIdLength(
        req.body.firearmID,
        "cannot lookup invalid length firearmID, route: /updateOrDeleteFirearm"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("/civ-dashboard");
      }
      Firearm.findOneAndUpdate(
        {
          _id: ObjectId(req.body.firearmID),
        },
        {
          $set: {
            "firearm.serialNumber": req.body.serialNumber,
            "firearm.weaponType": req.body.weaponType,
            "firearm.registeredOwner": req.body.roFirearm,
            "firearm.registeredOwnerID": req.body.firearmOwnerID,
            "firearm.isStolen": req.body.isStolen,
            "firearm.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect("/civ-dashboard");
        }
      );
    } else {
      if (!exists(req.body.firearmID)) {
        console.warn(
          "cannot delete firearm with empty firearmID, route: /updateOrDeleteFirearm"
        );
        return res.redirect("/civ-dashboard");
      }
      var isValid = isValidObjectIdLength(
        req.body.firearmID,
        "cannot lookup invalid length firearmID, route: /updateOrDeleteFirearm"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("/civ-dashboard");
      }
      Firearm.deleteOne(
        {
          _id: ObjectId(req.body.firearmID),
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect("/civ-dashboard");
        }
      );
    }
  });

  app.post("/updateOrDeleteLicense", auth, function (req, res) {
    // console.debug("update or delete license body: ", req.body);
    var backLocation = req.body.backLocation;
    req.app.locals.specialContext = null;
    if (req.body.action === "update") {
      if (!exists(req.body.licenseID)) {
        console.warn(
          "cannot update license with empty licenseID, route: /updateOrDeleteLicense"
        );
        return res.redirect(backLocation);
      }
      if (!exists(req.body.licenseOwnerID)) {
        console.warn(
          "cannot update license with empty registered owner, route: /updateOrDeleteLicense"
        );
        return res.redirect(backLocation);
      }
      if (!exists(req.body.licenseType)) {
        console.warn(
          "cannot update license with empty licenseType, route: /updateOrDeleteLicense"
        );
        return res.redirect(backLocation);
      }
      if (!exists(req.body.licenseStatus)) {
        console.warn(
          "cannot update license with empty licenseStatus, route: /updateOrDeleteLicense"
        );
        return res.redirect(backLocation);
      }
      if (!exists(req.body.expirationDate)) {
        console.warn(
          "cannot update license with empty expirationDate, route: /updateOrDeleteLicense"
        );
        return res.redirect(backLocation);
      }

      var isValid = isValidObjectIdLength(
        req.body.licenseID,
        "cannot lookup invalid length licenseID, route: /updateOrDeleteLicense"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect(backLocation);
      }
      License.findOneAndUpdate(
        {
          _id: ObjectId(req.body.licenseID),
        },
        {
          $set: {
            "license.licenseType": req.body.licenseType,
            "license.status": req.body.licenseStatus,
            "license.expirationDate": req.body.expirationDate,
            "license.additionalNotes": req.body.additionalNotes,
            "license.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) return console.error(err);
          req.app.locals.specialContext = "updateSuccess";
          return res.redirect(backLocation);
        }
      );
    } else {
      if (!exists(req.body.licenseID)) {
        console.warn(
          "cannot delete license with empty licenseID, route: /updateOrDeleteLicense"
        );
        return res.redirect(backLocation);
      }
      var isValid = isValidObjectIdLength(
        req.body.licenseID,
        "cannot lookup invalid length licenseID, route: /updateOrDeleteLicense"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect(backLocation);
      }
      License.deleteOne(
        {
          _id: ObjectId(req.body.licenseID),
        },
        function (err) {
          if (err) return console.error(err);
          return res.redirect(backLocation);
        }
      );
    }
  });

  app.post("/updateUserDispatchStatus", auth, function (req, res) {
    // console.debug(req.body)
    req.app.locals.specialContext = null;
    if (!exists(req.body.status) || req.body.status == "") {
      console.error("cannot update an empty status");
      res.status(400);
      return res.redirect("back");
    }
    var isValid = isValidObjectIdLength(
      req.body.userID,
      "cannot delete vehicle with invalid userID, route: /updateUserDispatchStatus"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      res.status(400);
      return res.redirect("back");
    }
    User.findByIdAndUpdate(
      {
        _id: ObjectId(req.body.userID),
      },
      {
        $set: {
          "user.dispatchStatus": req.body.status,
          "user.dispatchStatusSetBy": "dispatch",
        },
      },
      function (err) {
        if (err) return console.error(err);
        return res.redirect("back");
      }
    );
  });

  app.post("/community", auth, function (req, res) {
    // console.debug("community req: ", req.body)
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.memberID,
      "cannot lookup invalid length memberID, route: /community"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect("back");
    }
    User.findByIdAndUpdate(
      {
        _id: ObjectId(req.body.memberID),
      },
      {
        $set: {
          "user.activeCommunity": null,
        },
      },
      function (err) {
        if (err) return console.error(err);
        return res.redirect("back");
      }
    );
  });

  // /delete-community is the legacy form-post path from views/communities-owned.ejs.
  // Aligned with the API soft-delete contract: instead of removing the doc we set
  // pendingDeletionAt / scheduledDeletionAt (+30d) and let the API's daily cron
  // run the cascade once the grace window elapses. Staff can restore via the
  // admin console if the owner asks within the window.
  app.post("/delete-community", auth, function (req, res) {
    req.app.locals.specialContext = null;
    User.updateMany(
      {
        "user.activeCommunity": req.body.communityID,
      },
      {
        $set: {
          "user.activeCommunity": null,
        },
      },
      function (err) {
        if (err) return console.error(err);
        var isValid = isValidObjectIdLength(
          req.body.communityID,
          "cannot lookup invalid length communityID, route: /delete-community"
        );
        if (!isValid) {
          req.app.locals.specialContext = "invalidRequest";
          return res.redirect("back");
        }
        var now = new Date();
        var scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        var actor = req.user && req.user._doc && req.user._doc._id
          ? String(req.user._doc._id)
          : (req.user && req.user._id ? String(req.user._id) : "");
        Community.findByIdAndUpdate(
          { _id: ObjectId(req.body.communityID) },
          {
            $set: {
              "community.pendingDeletionAt": now,
              "community.scheduledDeletionAt": scheduled,
              "community.deletionRequestedBy": actor,
              "community.updatedAt": now,
            },
          },
          function (err) {
            if (err) return console.error(err);
            return res.redirect("back");
          }
        );
      }
    );
  });

  app.post("/updateCommunityName", auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.communityID,
      "cannot lookup invalid length communityID, route: /updateCommunityName"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect("back");
    }
    Community.findByIdAndUpdate(
      {
        _id: ObjectId(req.body.communityID),
      },
      {
        $set: {
          "community.name": req.body.updatedName,
        },
      },
      function (err) {
        if (err) return console.error(err);
        return res.redirect("back");
      }
    );
  });

  app.post("/communities", auth, function (req, res) {
    req.session.communityID = req.body.communityID;
    return res.redirect("communities");
  });

  var io = require("socket.io")(server, {
    transports: ["websocket"],
  });

  // Dedup: when the socket handler already broadcast an alert event for a
  // community, the Go API webhook should NOT re-broadcast the same event.
  // Keys are "signal100:<communityId>" or "panic:<communityId>", auto-expire after 10s.
  const recentAlertBroadcasts = new Set();
  function markAlertBroadcast(type, communityId) {
    const key = `${type}:${communityId}`;
    recentAlertBroadcasts.add(key);
    setTimeout(() => recentAlertBroadcasts.delete(key), 10000);
  }

  // ==========================================
  // INTERNAL WEBHOOK ENDPOINT FOR GO API
  // ==========================================
  // Receives panic/signal100 events from Go API and broadcasts via Socket.IO
  app.post("/internal/panic-broadcast", function (req, res) {
    const apiKey = req.headers["x-internal-api-key"];
    if (!process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { event, communityId, data } = req.body;
    if (!event || !communityId) {
      return res.status(400).json({ error: "Missing event or communityId" });
    }

    const roomName = `community:${communityId}`;

    if (event === "panic_created") {
      // Skip if socket handler already broadcast this event (web-triggered)
      if (recentAlertBroadcasts.has(`panic:${communityId}`)) {
        return res.json({ success: true, event, communityId, deduped: true });
      }
      // Broadcast panic_button_updated to match existing socket event format
      const panicMap = {};
      panicMap[data.userId] = data;
      const panicReq = {
        userID: data.userId,
        userUsername: data.username,
        activeCommunity: communityId,
        callSign: data.callSign || "",
        departmentType: data.departmentType || "police",
      };
      if (data.panicSoundUrl) panicReq.panicSoundUrl = data.panicSoundUrl;
      io.to(roomName).emit("panic_button_updated", panicMap, panicReq);
    } else if (event === "panic_cleared") {
      io.to(roomName).emit("cleared_panic", {
        userID: data.userId,
        alertId: data.alertId,
        communityID: communityId,
        clearedBy: data.clearedBy,
      });
    } else if (event === "signal_100_activated") {
      // Skip if socket handler already broadcast this event (web-triggered)
      if (recentAlertBroadcasts.has(`signal100:${communityId}`)) {
        return res.json({ success: true, event, communityId, deduped: true });
      }
      const signal100Data = {
        activeCommunity: communityId,
        activatedByUserId: data.userId,
        activatedByUsername: data.username,
        activatedByCallSign: data.callSign || "",
        activatedByDepartment: data.departmentType || "",
      };
      if (data.signal100SoundUrl) signal100Data.signal100SoundUrl = data.signal100SoundUrl;
      io.to(roomName).emit("signal_100_button_updated", signal100Data);
    } else if (event === "signal_100_cleared") {
      io.to(roomName).emit("clear_signal_100_updated", {
        activeCommunity: communityId,
        clearedByUserId: data.userId,
        clearedByUsername: data.username,
        clearedByCallSign: data.callSign || "",
      });
    } else if (event === "tone_activated") {
      const toneData = {
        toneType: data.toneType,
        toneName: data.toneName,
        targetDeptIds: data.targetDeptIds,
        triggeredByName: data.triggeredByName,
        triggeredByCallSign: data.triggeredByCallSign,
        communityId: communityId,
        createdAt: data.createdAt,
      };
      if (data.toneSoundUrl) toneData.toneSoundUrl = data.toneSoundUrl;
      io.to(roomName).emit("tone_activated", toneData);
    } else if (event === "dispatch_unit_status_changed") {
      // Dispatch bridge listens for this and patches the roster chip in place.
      io.to(roomName).emit("dispatch:unit_status_changed", {
        communityId: communityId,
        userId: data.userId,
        tenCodeId: data.tenCodeId,
        tenCode: data.tenCode,
        tenCodeDescription: data.tenCodeDescription,
        activeDepartmentId: data.activeDepartmentId,
      });
    } else if (event === "call_created") {
      // Go API fired this after a successful POST /api/v1/calls — the write
      // path any REST client uses (Command Bridge, classic dashboards, mobile
      // app). Re-emit on the same `created_call` channel the frontend already
      // consumes, tagged with actorId so the originating tab can suppress
      // its own echo.
      const callDoc = (data && data.call) || {};
      io.to(roomName).emit("created_call", Object.assign({}, callDoc, {
        actorId: (data && data.actorId) || null,
      }));
    } else if (event === "call_updated") {
      const callDoc = (data && data.call) || {};
      io.to(roomName).emit("updated_call", Object.assign({}, callDoc, {
        actorId: (data && data.actorId) || null,
      }));
    } else if (event === "call_deleted") {
      // Delete only carries the id — consumers just need enough to drop the
      // card from the board.
      io.to(roomName).emit("cleared_call", {
        callId: (data && data.callId) || null,
        communityId: communityId,
        actorId: (data && data.actorId) || null,
      });
    }

    res.json({ success: true, event: event, communityId: communityId });
  });

  // ==========================================
  // INTERNAL WEBHOOK FOR METRICS BROADCASTS
  // ==========================================
  // Receives metrics update events from Go API and broadcasts via Socket.IO
  app.post("/internal/metrics-broadcast", function (req, res) {
    const apiKey = req.headers["x-internal-api-key"];
    if (!process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { event, data } = req.body;
    if (!event) {
      return res.status(400).json({ error: "Missing event" });
    }

    if (event === "beta_metrics_updated") {
      io.to("admin-metrics").emit("beta_metrics_updated", data);
    }

    res.json({ success: true, event: event });
  });

  io.sockets.on("connection", (socket) => {
    // ==========================================
    // SOCKET ROOM MANAGEMENT
    // ==========================================
    // Join a community-specific room for targeted broadcasts
    socket.on("join_community_room", (data) => {
      if (!data || !data.communityId) {
        return socket.emit("room_error", { error: "Missing communityId" });
      }
      const roomName = `community:${data.communityId}`;
      socket.join(roomName);
      socket.communityRoom = roomName;
      socket.communityId = data.communityId;
      socket.emit("joined_room", { room: roomName, communityId: data.communityId });
    });

    // Leave community room (called when switching communities or logging out)
    socket.on("leave_community_room", (data) => {
      if (socket.communityRoom) {
        socket.leave(socket.communityRoom);
        const leftRoom = socket.communityRoom;
        socket.communityRoom = null;
        socket.communityId = null;
        socket.emit("left_room", { room: leftRoom });
      }
    });

    // ==========================================
    // ADMIN METRICS ROOM MANAGEMENT
    // ==========================================
    socket.on("join_admin_metrics", function () {
      socket.join("admin-metrics");
    });
    socket.on("leave_admin_metrics", function () {
      socket.leave("admin-metrics");
    });

    // ==========================================
    // FEATURE REQUEST ROOM MANAGEMENT
    // ==========================================
    socket.on("join_feature_requests", () => {
      socket.join("feature-requests");
    });

    socket.on("leave_feature_requests", () => {
      socket.leave("feature-requests");
    });

    socket.on("join_feature_request", (data) => {
      if (data && data.id) {
        socket.join("feature-request:" + data.id);
      }
    });

    socket.on("leave_feature_request", (data) => {
      if (data && data.id) {
        socket.leave("feature-request:" + data.id);
      }
    });

    // Helper function to broadcast to community room or fall back to global broadcast
    const broadcastToCommunity = (eventName, data, communityId) => {
      const targetCommunityId = communityId || socket.communityId;
      if (targetCommunityId) {
        // Broadcast to ALL clients in community room (including sender)
        const roomName = `community:${targetCommunityId}`;
        io.to(roomName).emit(eventName, data);
      } else {
        // Fallback to global broadcast for backward compatibility
        io.emit(eventName, data);
      }
    };

    // Resolve a community's custom tone sound URL for a given sound type.
    // soundType: 'panic' | 'signal100'
    // Returns the Cloudinary URL string, or null if no custom sound is configured.
    const resolveCustomSoundUrl = async (communityId, soundType) => {
      try {
        const community = await Community.findById(communityId).lean();
        if (!community || !community.community) return null;
        const details = community.community;
        const key = soundType === 'panic' ? details.defaultPanicSound : details.defaultSignal100Sound;
        if (!key) return null;
        const sounds = details.customToneSounds || [];
        const match = sounds.find((s) => s.key === key);
        return match ? match.url : null;
      } catch (err) {
        console.error(`[resolveCustomSoundUrl] Error for ${soundType}:`, err.message);
        return null;
      }
    };

    // For testing bot connection
    socket.on("botping", (data) => {
      // console.debug(data) // Prove socket connection to bot works
      socket.emit("botpong", {
        message: "pong",
      });
    });

    socket.on("bot_join_community", (data) => {
      if (!exists(data.communityCode)) {
        return socket.emit("bot_joined_community", {
          error: "Improper Community Code",
        });
      }
      var communityCode = data.communityCode.trim();
      if (communityCode.length != 7) {
        return socket.emit("bot_joined_community", {
          error: "Improper Community Code",
        });
      }
      Community.findOne(
        {
          "community.code": data.communityCode.toUpperCase(),
        },
        function (err, community) {
          if (err) return console.error(err);
          if (community == null) {
            return socket.emit("bot_joined_community", {
              error: "Community not found",
            });
          }
          var isValid = isValidObjectIdLength(
            data.userID,
            "cannot lookup invalid length userID"
          );
          if (!isValid) {
            return socket.emit("bot_joined_community", {
              error: "Improper UserID",
            });
          }
          User.findOneAndUpdate(
            {
              _id: ObjectId(data.userID),
            },
            {
              $set: {
                "user.activeCommunity": community._id,
              },
            },
            function (err) {
              if (err) return console.error(err);
              return socket.emit("bot_joined_community", {
                message: "success",
                commName: community.community.name,
              });
            }
          );
        }
      );
    });

    socket.on("bot_leave_community", (data) => {
      var isValid = isValidObjectIdLength(
        data.userID,
        "cannot lookup invalid length userID"
      );
      if (!isValid) {
        return socket.emit("bot_left_community", {
          error: "Improper UserID",
        });
      }
      User.findOneAndUpdate(
        {
          _id: ObjectId(data.userID),
        },
        {
          $set: {
            "user.activeCommunity": null,
          },
        },
        function (err) {
          if (err) return console.error(err);
          return socket.emit("bot_left_community", {
            message: "Successfully left community",
          });
        }
      );
    });

    socket.on("bot_name_search", (data) => {
      let firstName = sanitize(data.query.firstName.trim().toLowerCase());
      let lastName = sanitize(data.query.lastName.trim().toLowerCase());
      if (
        data.query.activeCommunityID == "" ||
        data.query.activeCommunityID == null
      ) {
        Civilian.find(
          {
            $text: {
              $search: `"${firstName}" "${lastName}"`,
            },
            "civilian.birthday": data.query.dateOfBirth,
            $or: [
              {
                // some are stored as empty strings and others as null so we need to check for both
                "civilian.activeCommunityID": "",
              },
              {
                "civilian.activeCommunityID": null,
              },
            ],
          },
          function (err, dbCivilians) {
            if (err) return console.error(err);
            Ticket.find(
              {
                "ticket.civFirstName":
                  data.query.firstName.trim().charAt(0).toUpperCase() +
                  data.query.firstName.trim().slice(1),
                "ticket.civLastName":
                  data.query.lastName.trim().charAt(0).toUpperCase() +
                  data.query.lastName.trim().slice(1),
              },
              function (err, dbTickets) {
                if (err) return console.error(err);
                ArrestReport.find(
                  {
                    "arrestReport.accusedFirstName":
                      data.query.firstName.trim().charAt(0).toUpperCase() +
                      data.query.firstName.trim().slice(1),
                    "arrestReport.accusedLastName":
                      data.query.lastName.trim().charAt(0).toUpperCase() +
                      data.query.lastName.trim().slice(1),
                  },
                  function (err, dbArrestReports) {
                    if (err) return console.error(err);
                    Warrant.find(
                      {
                        "warrant.accusedFirstName":
                          data.query.firstName.trim().charAt(0).toUpperCase() +
                          data.query.firstName.trim().slice(1),
                        "warrant.accusedLastName":
                          data.query.lastName.trim().charAt(0).toUpperCase() +
                          data.query.lastName.trim().slice(1),
                        "warrant.status": true,
                      },
                      function (err, dbWarrants) {
                        if (err) return console.error(err);
                        Community.find(
                          {
                            $or: [
                              {
                                "community.ownerID": data.user._id,
                              },
                              {
                                _id: data.user.user.activeCommunity,
                              },
                            ],
                          },
                          function (err, dbCommunities) {
                            if (err) return console.error(err);
                            Bolo.find(
                              {
                                "bolo.communityID":
                                  data.user.user.activeCommunity,
                              },
                              function (err, dbBolos) {
                                if (err) return console.error(err);
                                Call.find(
                                  {
                                    "call.communityID":
                                      data.user.user.activeCommunity,
                                  },
                                  function (err, dbCalls) {
                                    if (err) return console.error(err);
                                    if (
                                      data.user.user.activeCommunity == "" ||
                                      data.user.user.activeCommunity == null
                                    ) {
                                      return socket.emit(
                                        "bot_name_search_results",
                                        {
                                          user: data.user,
                                          vehicles: null,
                                          civilians: dbCivilians,
                                          firearms: null,
                                          tickets: dbTickets,
                                          arrestReports: dbArrestReports,
                                          warrants: dbWarrants,
                                          communities: dbCommunities,
                                          commUsers: null,
                                          bolos: dbBolos,
                                          calls: dbCalls,
                                          context: null,
                                        }
                                      );
                                    } else {
                                      User.find(
                                        {
                                          "user.activeCommunity":
                                            data.user.user.activeCommunity,
                                        },
                                        function (err, dbCommUsers) {
                                          if (err) return console.error(err);
                                          return socket.emit(
                                            "bot_name_search_results",
                                            {
                                              user: data.user,
                                              vehicles: null,
                                              civilians: dbCivilians,
                                              firearms: null,
                                              tickets: dbTickets,
                                              arrestReports: dbArrestReports,
                                              warrants: dbWarrants,
                                              communities: dbCommunities,
                                              commUsers: dbCommUsers,
                                              bolos: dbBolos,
                                              calls: dbCalls,
                                              context: null,
                                            }
                                          );
                                        }
                                      );
                                    }
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        Civilian.find(
          {
            $text: {
              $search: `"${firstName}" "${lastName}"`,
            },
            "civilian.activeCommunityID": data.query.activeCommunityID,
          },
          function (err, dbCivilians) {
            if (err) return console.error(err);
            Ticket.find(
              {
                "ticket.civFirstName":
                  data.query.firstName.trim().charAt(0).toUpperCase() +
                  data.query.firstName.trim().slice(1),
                "ticket.civLastName":
                  data.query.lastName.trim().charAt(0).toUpperCase() +
                  data.query.lastName.trim().slice(1),
              },
              function (err, dbTickets) {
                if (err) return console.error(err);
                ArrestReport.find(
                  {
                    "arrestReport.accusedFirstName":
                      data.query.firstName.trim().charAt(0).toUpperCase() +
                      data.query.firstName.trim().slice(1),
                    "arrestReport.accusedLastName":
                      data.query.lastName.trim().charAt(0).toUpperCase() +
                      data.query.lastName.trim().slice(1),
                  },
                  function (err, dbArrestReports) {
                    if (err) return console.error(err);
                    Warrant.find(
                      {
                        "warrant.accusedFirstName":
                          data.query.firstName.trim().charAt(0).toUpperCase() +
                          data.query.firstName.trim().slice(1),
                        "warrant.accusedLastName":
                          data.query.lastName.trim().charAt(0).toUpperCase() +
                          data.query.lastName.trim().slice(1),
                        "warrant.status": true,
                      },
                      function (err, dbWarrants) {
                        if (err) return console.error(err);
                        Community.find(
                          {
                            $or: [
                              {
                                "community.ownerID": data.user._id,
                              },
                              {
                                _id: data.user.user.activeCommunity,
                              },
                            ],
                          },
                          function (err, dbCommunities) {
                            if (err) return console.error(err);
                            Bolo.find(
                              {
                                "bolo.communityID":
                                  data.user.user.activeCommunity,
                              },
                              function (err, dbBolos) {
                                if (err) return console.error(err);
                                Call.find(
                                  {
                                    "call.communityID":
                                      data.user.user.activeCommunity,
                                  },
                                  function (err, dbCalls) {
                                    if (err) return console.error(err);
                                    if (
                                      data.user.user.activeCommunity == "" ||
                                      data.user.user.activeCommunity == null
                                    ) {
                                      return socket.emit(
                                        "bot_name_search_results",
                                        {
                                          user: data.user,
                                          vehicles: null,
                                          civilians: dbCivilians,
                                          firearms: null,
                                          tickets: dbTickets,
                                          arrestReports: dbArrestReports,
                                          warrants: dbWarrants,
                                          communities: dbCommunities,
                                          bolos: dbBolos,
                                          calls: dbCalls,
                                          context: null,
                                        }
                                      );
                                    } else {
                                      User.find(
                                        {
                                          "user.activeCommunity":
                                            data.user.user.activeCommunity,
                                        },
                                        function (err, dbCommUsers) {
                                          if (err) return console.error(err);
                                          return socket.emit(
                                            "bot_name_search_results",
                                            {
                                              user: data.user,
                                              vehicles: null,
                                              civilians: dbCivilians,
                                              firearms: null,
                                              tickets: dbTickets,
                                              arrestReports: dbArrestReports,
                                              warrants: dbWarrants,
                                              communities: dbCommunities,
                                              commUsers: dbCommUsers,
                                              bolos: dbBolos,
                                              calls: dbCalls,
                                              context: null,
                                            }
                                          );
                                        }
                                      );
                                    }
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    });

    socket.on("bot_plate_search", (req) => {
      if (
        req.query.activeCommunityID == "" ||
        req.query.activeCommunityID == null
      ) {
        Vehicle.find(
          {
            "vehicle.plate": req.query.plateNumber.trim().toUpperCase(),
            $or: [
              {
                // some are stored as empty strings and others as null so we need to check for both
                "vehicle.activeCommunityID": "",
              },
              {
                "vehicle.activeCommunityID": null,
              },
            ],
          },
          function (err, dbVehicles) {
            if (err) return console.error(err);
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: req.user.user.activeCommunity,
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        if (
                          req.user.user.activeCommunity == "" ||
                          req.user.user.activeCommunity == null
                        ) {
                          return socket.emit("bot_plate_search_results", {
                            user: req.user,
                            vehicles: dbVehicles,
                            civilians: null,
                            firearms: null,
                            tickets: null,
                            arrestReports: null,
                            warrants: null,
                            communities: dbCommunities,
                            commUsers: null,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null,
                          });
                        } else {
                          User.find(
                            {
                              "user.activeCommunity":
                                req.user.user.activeCommunity,
                            },
                            function (err, dbCommUsers) {
                              if (err) return console.error(err);
                              return socket.emit("bot_plate_search_results", {
                                user: req.user,
                                vehicles: dbVehicles,
                                civilians: null,
                                firearms: null,
                                tickets: null,
                                arrestReports: null,
                                warrants: null,
                                communities: dbCommunities,
                                commUsers: dbCommUsers,
                                bolos: dbBolos,
                                calls: dbCalls,
                                context: null,
                              });
                            }
                          );
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        Vehicle.find(
          {
            "vehicle.plate": req.query.plateNumber.trim().toUpperCase(),
            "vehicle.activeCommunityID": req.query.activeCommunityID,
          },
          function (err, dbVehicles) {
            if (err) return console.error(err);
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: req.user.user.activeCommunity,
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        if (
                          req.user.user.activeCommunity == "" ||
                          req.user.user.activeCommunity == null
                        ) {
                          return socket.emit("bot_plate_search_results", {
                            user: req.user,
                            vehicles: dbVehicles,
                            civilians: null,
                            firearms: null,
                            tickets: null,
                            arrestReports: null,
                            warrants: null,
                            communities: dbCommunities,
                            commUsers: null,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null,
                          });
                        } else {
                          User.find(
                            {
                              "user.activeCommunity":
                                req.user.user.activeCommunity,
                            },
                            function (err, dbCommUsers) {
                              if (err) return console.error(err);
                              return socket.emit("bot_plate_search_results", {
                                user: req.user,
                                vehicles: dbVehicles,
                                civilians: null,
                                firearms: null,
                                tickets: null,
                                arrestReports: null,
                                warrants: null,
                                communities: dbCommunities,
                                commUsers: dbCommUsers,
                                bolos: dbBolos,
                                calls: dbCalls,
                                context: null,
                              });
                            }
                          );
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    });

    socket.on("bot_firearm_search", (req) => {
      if (
        req.query.activeCommunityID == "" ||
        req.query.activeCommunityID == null
      ) {
        Firearm.find(
          {
            "firearm.serialNumber": req.query.serialNumber.trim().toUpperCase(),
            $or: [
              {
                // some are stored as empty strings and others as null so we need to check for both
                "firearm.activeCommunityID": "",
              },
              {
                "firearm.activeCommunityID": null,
              },
            ],
          },
          function (err, dbFirearms) {
            if (err) return console.error(err);
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: req.user.user.activeCommunity,
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        if (
                          req.user.user.activeCommunity == "" ||
                          req.user.user.activeCommunity == null
                        ) {
                          return socket.emit("bot_firearm_search_results", {
                            user: req.user,
                            vehicles: null,
                            civilians: null,
                            firearms: dbFirearms,
                            tickets: null,
                            arrestReports: null,
                            warrants: null,
                            communities: dbCommunities,
                            commUsers: null,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null,
                          });
                        } else {
                          User.find(
                            {
                              "user.activeCommunity":
                                req.user.user.activeCommunity,
                            },
                            function (err, dbCommUsers) {
                              if (err) return console.error(err);
                              return socket.emit("bot_firearm_search_results", {
                                user: req.user,
                                vehicles: null,
                                firearms: dbFirearms,
                                civilians: null,
                                tickets: null,
                                arrestReports: null,
                                warrants: null,
                                communities: dbCommunities,
                                commUsers: dbCommUsers,
                                bolos: dbBolos,
                                calls: dbCalls,
                                context: null,
                              });
                            }
                          );
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        Firearm.find(
          {
            "firearm.serialNumber": req.query.serialNumber.trim().toUpperCase(),
            "firearm.activeCommunityID": req.query.activeCommunityID,
          },
          function (err, dbFirearms) {
            if (err) return console.error(err);
            Community.find(
              {
                $or: [
                  {
                    "community.ownerID": req.user._id,
                  },
                  {
                    _id: req.user.user.activeCommunity,
                  },
                ],
              },
              function (err, dbCommunities) {
                if (err) return console.error(err);
                Bolo.find(
                  {
                    "bolo.communityID": req.user.user.activeCommunity,
                  },
                  function (err, dbBolos) {
                    if (err) return console.error(err);
                    Call.find(
                      {
                        "call.communityID": req.user.user.activeCommunity,
                      },
                      function (err, dbCalls) {
                        if (err) return console.error(err);
                        if (
                          req.user.user.activeCommunity == "" ||
                          req.user.user.activeCommunity == null
                        ) {
                          return socket.emit("bot_firearm_search_results", {
                            user: req.user,
                            vehicles: null,
                            firearms: dbFirearms,
                            civilians: null,
                            tickets: null,
                            arrestReports: null,
                            warrants: null,
                            communities: dbCommunities,
                            commUsers: null,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null,
                          });
                        } else {
                          User.find(
                            {
                              "user.activeCommunity":
                                req.user.user.activeCommunity,
                            },
                            function (err, dbCommUsers) {
                              if (err) return console.error(err);
                              return socket.emit("bot_firearm_search_results", {
                                user: req.user,
                                vehicles: null,
                                firearms: dbFirearms,
                                civilians: null,
                                tickets: null,
                                arrestReports: null,
                                warrants: null,
                                communities: dbCommunities,
                                commUsers: dbCommUsers,
                                bolos: dbBolos,
                                calls: dbCalls,
                                context: null,
                              });
                            }
                          );
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    });

    socket.on("load_statuses", (user) => {
      if (
        user.user.activeCommunity != null &&
        user.user.activeCommunity != undefined
      ) {
        User.find(
          {
            "user.activeCommunity": user.user.activeCommunity,
          },
          function (err, dbCommUsers) {
            if (err) return console.error(err);
            return socket.emit("load_status_result", dbCommUsers);
          }
        );
      }
    });

    socket.on("load_ems_statuses", (vehicle) => {
      if (
        vehicle.emsVehicle.activeCommunityID != null &&
        vehicle.emsVehicle.activeCommunityID != undefined
      ) {
        EmsVehicle.find(
          {
            "emsVehicle.activeCommunityID":
              vehicle.emsVehicle.activeCommunityID,
          },
          function (err, dbCommEms) {
            if (err) return console.error(err);
            return socket.emit("load_ems_status_result", dbCommEms);
          }
        );
      }
    });

    socket.on("load_dispatch_bolos", (user) => {
      if (
        user.user.activeCommunity != null &&
        user.user.activeCommunity != undefined
      ) {
        Bolo.find(
          {
            "bolo.communityID": user.user.activeCommunity,
          },
          function (err, dbBolos) {
            if (err) return console.error(err);
            return socket.emit("load_dispatch_bolos_result", dbBolos);
          }
        );
      }
    });

    socket.on("load_dispatch_calls", (user) => {
      if (
        user.user.activeCommunity != null &&
        user.user.activeCommunity != undefined
      ) {
        Call.find(
          {
            "call.communityID": user.user.activeCommunity,
          },
          function (err, dbCalls) {
            if (err) return console.error(err);
            return socket.emit("load_dispatch_calls_result", dbCalls);
          }
        );
      }
    });

    socket.on("get_call_by_id", (callID) => {
      // console.debug("get_call_by_id has been called", callID)
      var isValid = isValidObjectIdLength(
        callID,
        "invalid call ID length for socket: get_call_by_id"
      );
      if (!isValid) {
        return;
      }
      Call.findById(
        {
          _id: ObjectId(callID),
        },
        function (err, dbCalls) {
          if (err) return console.error(err);
          return socket.emit("load_call_by_id_result", dbCalls);
        }
      );
    });

    socket.on("load_police_bolos", (user) => {
      if (
        user.user.activeCommunity != null &&
        user.user.activeCommunity != undefined
      ) {
        Bolo.find(
          {
            "bolo.communityID": user.user.activeCommunity,
          },
          function (err, dbBolos) {
            if (err) return console.error(err);
            return socket.emit("load_police_bolos_result", dbBolos);
          }
        );
      }
    });

    socket.on("update_bolo_info", (req) => {
      // console.debug('update req backend: ', req)
      var boloType;
      var location;
      var description;
      var boloID;
      if (exists(req.boloType)) {
        boloType = req.boloType.trim().toLowerCase();
      }
      if (exists(req.location)) {
        location = req.location.trim();
      }
      if (exists(req.description)) {
        description = req.description.trim();
      }
      if (exists(req.boloID)) {
        boloID = req.boloID;
      } else {
        return console.warn(
          "cannot update or delete non-existent boloID: ",
          req.boloID
        );
      }
      var isValid = isValidObjectIdLength(
        boloID,
        "cannot lookup invalid length boloID, socket: update_bolo_info"
      );
      if (!isValid) {
        return;
      }
      Bolo.findOneAndUpdate(
        {
          _id: ObjectId(boloID),
        },
        {
          $set: {
            "bolo.boloType": boloType,
            "bolo.location": location,
            "bolo.description": description,
            "bolo.updatedAt": new Date(),
          },
        },
        function (err) {
          if (err) return console.error(err);
          return socket.broadcast.emit("updated_bolo", req);
        }
      );
    });

    socket.on("delete_bolo_info", (req) => {
      // console.debug('delete req backend: ', req)
      var boloID;
      if (exists(req.boloID)) {
        if (req.boloID.length !== 0) {
          boloID = req.boloID;
        }
      }
      var isValid = isValidObjectIdLength(
        boloID,
        "cannot lookup invalid length boloID, socket: delete_bolo_info"
      );
      if (!isValid) {
        return;
      }
      Bolo.findByIdAndDelete(
        {
          _id: ObjectId(boloID),
        },
        function (err) {
          if (err) return console.error(err);
          // Use room-based broadcast for deleted BOLO
          broadcastToCommunity("deleted_bolo", req, req.communityId);
        }
      );
    });

    socket.on("update_status", (req) => {
      if (!exists(req.userID) || req.userID == "") {
        return console.error("cannot update an empty userID");
      }

      // Department-change-only event (no status update needed)
      if ((!exists(req.status) || req.status == "") && req.activeDepartmentId) {
        var isValid = isValidObjectIdLength(
          req.userID,
          "cannot lookup invalid length userID, socket: update_status (dept change)"
        );
        if (!isValid) return;
        User.findById(ObjectId(req.userID), function (err, user) {
          if (err) return console.error(err);
          const statusUpdateData = {
            userID: req.userID,
            communityId: req.communityId,
            username: user ? user.user.username : null,
            callSign: user ? user.user.callSign : null,
            activeDepartmentId: req.activeDepartmentId,
            activeDepartmentName: req.activeDepartmentName || null,
            timestamp: new Date().toISOString()
          };
          broadcastToCommunity("member_status_updated", statusUpdateData, req.communityId);
        });
        return;
      }

      if (!exists(req.status) || req.status == "") {
        return console.error("cannot update an empty status");
      }
      if (req.updateDuty) {
        var isValid = isValidObjectIdLength(
          req.userID,
          "cannot lookup invalid length userID, socket: update_status"
        );
        if (!isValid) {
          return;
        }
        User.findByIdAndUpdate(
          {
            _id: ObjectId(req.userID),
          },
          {
            $set: {
              "user.dispatchStatus": req.status,
              "user.dispatchStatusSetBy": req.setBy,
              "user.dispatchOnDuty": req.onDuty,
            },
          },
          { new: true },
          function (err, updatedUser) {
            if (err) return console.error(err);
            // Emit to community room if available, otherwise broadcast globally
            broadcastToCommunity("updated_status", req, req.communityId);
            // Also emit detailed member_status_updated event for real-time UI updates
            const statusUpdateData = {
              userID: req.userID,
              status: req.status,
              statusCode: req.statusCode || null,
              setBy: req.setBy,
              onDuty: req.onDuty,
              communityId: req.communityId,
              username: updatedUser ? updatedUser.user.username : null,
              callSign: updatedUser ? updatedUser.user.callSign : null,
              activeDepartmentId: req.activeDepartmentId || null,
              activeDepartmentName: req.activeDepartmentName || null,
              timestamp: new Date().toISOString()
            };
            broadcastToCommunity("member_status_updated", statusUpdateData, req.communityId);
          }
        );
      } else {
        var isValid = isValidObjectIdLength(
          req.userID,
          "cannot lookup invalid length userID, socket: update_status"
        );
        if (!isValid) {
          return;
        }
        User.findByIdAndUpdate(
          {
            _id: ObjectId(req.userID),
          },
          {
            $set: {
              "user.dispatchStatus": req.status,
              "user.dispatchStatusSetBy": req.setBy,
            },
          },
          { new: true },
          function (err, updatedUser) {
            if (err) return console.error(err);
            // Emit to community room if available, otherwise broadcast globally
            broadcastToCommunity("updated_status", req, req.communityId);
            // Also emit detailed member_status_updated event for real-time UI updates
            const statusUpdateData = {
              userID: req.userID,
              status: req.status,
              statusCode: req.statusCode || null,
              setBy: req.setBy,
              communityId: req.communityId,
              username: updatedUser ? updatedUser.user.username : null,
              callSign: updatedUser ? updatedUser.user.callSign : null,
              activeDepartmentId: req.activeDepartmentId || null,
              activeDepartmentName: req.activeDepartmentName || null,
              timestamp: new Date().toISOString()
            };
            broadcastToCommunity("member_status_updated", statusUpdateData, req.communityId);
          }
        );
      }
    });

    socket.on("delete_ems_vehicle", (req) => {
      // console.debug(req.body)
      var isValid = isValidObjectIdLength(
        req.vehicleID,
        "cannot lookup invalid length vehicleID, route: /deleteEmsVeh"
      );
      if (!isValid) {
        return;
      }
      EmsVehicle.findByIdAndDelete(
        {
          _id: ObjectId(req.vehicleID),
        },
        function (err) {
          if (err) return console.error(err);
          return socket.broadcast.emit("deleted_ems_vehicle", req);
        }
      );
    });

    socket.on("update_ems_status", (req) => {
      // console.debug('update ems req: ', req);
      if (!exists(req.status) || req.status == "") {
        return console.error("cannot update an empty status");
      }
      if (req.updateDuty) {
        var isValid = isValidObjectIdLength(
          req.vehicleID,
          "cannot lookup invalid length vehicleID, socket: update_status"
        );
        if (!isValid) {
          return;
        }
        EmsVehicle.findByIdAndUpdate(
          {
            _id: ObjectId(req.vehicleID),
          },
          {
            $set: {
              "emsVehicle.dispatchStatus": req.status,
              "emsVehicle.dispatchStatusSetBy": req.setBy,
              "emsVehicle.dispatchOnDuty": req.onDuty,
            },
          },
          function (err) {
            if (err) return console.error(err);
            return socket.broadcast.emit("updated_ems_status", req);
          }
        );
      } else {
        var isValid = isValidObjectIdLength(
          req.vehicleID,
          "cannot lookup invalid length vehicleID, socket: update_status"
        );
        if (!isValid) {
          return;
        }
        EmsVehicle.findByIdAndUpdate(
          {
            _id: ObjectId(req.vehicleID),
          },
          {
            $set: {
              "emsVehicle.dispatchStatus": req.status,
              "emsVehicle.dispatchStatusSetBy": req.setBy,
            },
          },
          function (err) {
            if (err) return console.error(err);
            return socket.broadcast.emit("updated_ems_status", req);
          }
        );
      }
    });

    socket.on("bot_update_status", (req) => {
      if (req.updateDuty) {
        User.findByIdAndUpdate(
          {
            _id: ObjectId(req.userID),
          },
          {
            $set: {
              "user.dispatchStatus": req.status,
              "user.dispatchStatusSetBy": req.setBy,
              "user.dispatchOnDuty": req.onDuty,
            },
          },
          function (err) {
            if (err) return console.error(err);
            socket.broadcast.emit("updated_status", req);
            return socket.emit("bot_updated_status", req);
          }
        );
      } else {
        User.findByIdAndUpdate(
          {
            _id: ObjectId(req.userID),
          },
          {
            $set: {
              "user.dispatchStatus": req.status,
              "user.dispatchStatusSetBy": req.setBy,
            },
          },
          function (err) {
            if (err) return console.error(err);
            socket.broadcast.emit("updated_status", req);
            return socket.emit("bot_updated_status", req);
          }
        );
      }
    });

    socket.on("load_panic_statuses", async (req) => {
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          req.activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: load_panic_statuses"
        );
        if (!isValid) {
          return;
        }
        if (!isValidObjectIdFormat(req.activeCommunity, "invalid format activeCommunity, socket: load_panic_statuses")) {
          return;
        }
        try {
          // Fetch active panic alerts from the Go API
          const apiUrl = `${policeCadApiUrl}/api/v1/community/${req.activeCommunity}/panic-alerts?status=active`;
          const apiResp = await axios.get(apiUrl, config);
          const alerts = (apiResp.data && apiResp.data.alerts) || [];

          // Convert API array format to object keyed by userId for backward compatibility with frontend
          const activePanicsMap = {};
          for (const alert of alerts) {
            activePanicsMap[alert.userId] = {
              userId: alert.userId,
              username: alert.username,
              activeCommunityID: alert.communityId,
              callSign: alert.callSign,
              departmentType: alert.departmentType,
              alertId: alert.alertId,
            };
          }

          // Fetch Signal 100 data from Go API (includes activation metadata)
          let signal100Data = { active: false };
          let activeHoldTraffic = false;
          try {
            const signal100Resp = await axios.get(
              `${policeCadApiUrl}/api/v1/community/${req.activeCommunity}/signal-100`,
              config
            );
            signal100Data = signal100Resp.data || { active: false };
          } catch (s100Err) {
            console.error("load_panic_statuses: Signal 100 API error:", s100Err.message);
          }

          // Still fetch community for holdTraffic (not yet migrated to API)
          try {
            const communityResp = await axios.get(
              `${policeCadApiUrl}/api/v1/community/${req.activeCommunity}`,
              config
            );
            const community = communityResp.data && communityResp.data.community;
            activeHoldTraffic = community ? community.activeHoldTraffic : false;
          } catch (commErr) {
            console.error("load_panic_statuses: community fetch error:", commErr.message);
          }

          // Emit with all args for backward compat: (map, signal100, holdTraffic, origReq, signal100Data)
          const roomName = `community:${req.activeCommunity}`;
          io.to(roomName).emit(
            "load_panic_status_update",
            activePanicsMap,
            signal100Data.active,
            activeHoldTraffic,
            req,
            signal100Data
          );
        } catch (err) {
          console.error("load_panic_statuses: API error:", err.message);
          // Fallback to direct DB read
          Community.findById(
            { _id: ObjectId(req.activeCommunity) },
            function (dbErr, resp) {
              if (dbErr) return console.error(dbErr);
              if (resp != null && resp.community != null) {
                // Convert Mongoose Map to plain object if needed
                var panics = resp.community.activePanics instanceof Map
                  ? Object.fromEntries(resp.community.activePanics)
                  : (resp.community.activePanics || {});
                return socket.broadcast.emit(
                  "load_panic_status_update",
                  panics,
                  resp.community.activeSignal100,
                  resp.community.activeHoldTraffic,
                  req
                );
              }
            }
          );
        }
      }
    });

    socket.on("panic_button_update", async (req) => {
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          req.activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: panic_button_update"
        );
        if (!isValid) {
          return;
        }
        if (!isValidObjectIdFormat(req.activeCommunity, "invalid format activeCommunity, socket: panic_button_update")) {
          return;
        }
        try {
          // Create panic alert via Go API
          const apiUrl = `${policeCadApiUrl}/api/v1/community/${req.activeCommunity}/panic-alerts`;
          const apiResp = await axios.post(apiUrl, {
            userId: req.userID,
            username: req.userUsername,
            callSign: req.callSign || "",
            departmentType: req.departmentType || "police",
          }, config);

          // Resolve custom panic sound URL (if community has one configured)
          const panicSoundUrl = await resolveCustomSoundUrl(req.activeCommunity, 'panic');

          // Build an object keyed by userId for backward compatibility with existing frontend listeners
          const alertData = {
            userId: req.userID,
            username: req.userUsername,
            activeCommunityID: req.activeCommunity,
            callSign: req.callSign || "",
            departmentType: req.departmentType || "police",
            alertId: apiResp.data && apiResp.data.alertId,
          };
          const activePanicsMap = {};
          activePanicsMap[req.userID] = alertData;

          // Include custom sound URL on both args so all listeners can find it
          // (cd-alerts.js reads first arg, ems-dashboard.js reads second arg)
          if (panicSoundUrl) {
            activePanicsMap.panicSoundUrl = panicSoundUrl;
            req.panicSoundUrl = panicSoundUrl;
          }

          // Mark as broadcast so the Go API webhook doesn't re-broadcast
          markAlertBroadcast('panic', req.activeCommunity);

          // Broadcast to community room
          // Emit both map and req for backward compat with old listeners that expect (map, origReq)
          const roomName = `community:${req.activeCommunity}`;
          io.to(roomName).emit("panic_button_updated", activePanicsMap, req);
          broadcastToCommunity("panic_alert_created", alertData, req.activeCommunity);
        } catch (err) {
          console.error("panic_button_update: API error:", err.message);
          // Fallback to old direct MongoDB approach
          var values = {
            userId: req.userID,
            username: req.userUsername,
            activeCommunityID: req.activeCommunity,
          };
          Community.findById(
            { _id: ObjectId(req.activeCommunity) },
            function (dbErr, resp) {
              if (dbErr) return console.error(dbErr);
              if (resp != null && resp.community != null) {
                // Resolve custom panic sound URL from the community document
                var panicSoundUrl = null;
                var defaultKey = resp.community.defaultPanicSound;
                if (defaultKey && resp.community.customToneSounds) {
                  var sounds = resp.community.customToneSounds;
                  for (var i = 0; i < sounds.length; i++) {
                    if (sounds[i].key === defaultKey) { panicSoundUrl = sounds[i].url; break; }
                  }
                }

                var broadcastMap, broadcastReq = Object.assign({}, req);
                if (panicSoundUrl) broadcastReq.panicSoundUrl = panicSoundUrl;

                if (!resp.community.activePanics) {
                  var mapInsert = {};
                  mapInsert[req.userID] = values;
                  if (panicSoundUrl) mapInsert.panicSoundUrl = panicSoundUrl;
                  Community.findByIdAndUpdate(
                    { _id: ObjectId(req.activeCommunity) },
                    { $set: { "community.activePanics": mapInsert } },
                    function (updateErr) {
                      if (updateErr) return console.error(updateErr);
                      return socket.broadcast.emit("panic_button_updated", mapInsert, broadcastReq);
                    }
                  );
                } else {
                  // Convert to plain object if needed (Mongoose may return a Map)
                  var panics = resp.community.activePanics instanceof Map
                    ? Object.fromEntries(resp.community.activePanics)
                    : (resp.community.activePanics || {});
                  panics[req.userID] = values;
                  if (panicSoundUrl) panics.panicSoundUrl = panicSoundUrl;
                  Community.findByIdAndUpdate(
                    { _id: ObjectId(req.activeCommunity) },
                    { $set: { "community.activePanics": panics } },
                    function (updateErr) {
                      if (updateErr) return console.error(updateErr);
                      return socket.broadcast.emit("panic_button_updated", panics, broadcastReq);
                    }
                  );
                }
              }
            }
          );
        }
      }
    });

    socket.on("clear_panic", async (req) => {
      if (req.communityID != null && req.communityID != undefined) {
        var isValid = isValidObjectIdLength(
          req.communityID,
          "cannot lookup invalid length communityID, socket: clear_panic"
        );
        if (!isValid) {
          return;
        }
        if (!isValidObjectIdFormat(req.communityID, "invalid format communityID, socket: clear_panic")) {
          return;
        }
        if (!isValidObjectIdFormat(req.userID, "invalid format userID, socket: clear_panic")) {
          return;
        }
        try {
          // Clear panic alerts for user via Go API
          const apiUrl = `${policeCadApiUrl}/api/v1/community/${req.communityID}/panic-alerts/user/${req.userID}`;
          await axios.delete(apiUrl, {
            ...config,
            data: { clearedBy: req.clearedBy || req.userID },
          });

          // Broadcast cleared event to community
          broadcastToCommunity("cleared_panic", req, req.communityID);
        } catch (err) {
          console.error("clear_panic: API error:", err.message);
          // Fallback to old direct MongoDB approach
          Community.findById(
            { _id: ObjectId(req.communityID) },
            function (dbErr, resp) {
              if (dbErr) return console.error(dbErr);
              if (resp != null && resp.community != null) {
                if (resp.community.activePanics != null) {
                  resp.community.activePanics.delete(req.userID);
                  Community.findByIdAndUpdate(
                    { _id: ObjectId(req.communityID) },
                    { $set: { "community.activePanics": resp.community.activePanics } },
                    function (updateErr) {
                      if (updateErr) return console.error(updateErr);
                      return socket.broadcast.emit("cleared_panic", req);
                    }
                  );
                }
              }
            }
          );
        }
      }
    });

    socket.on("signal_100_button_update", async (req) => {
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          req.activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: signal_100_button_update"
        );
        if (!isValid) {
          return;
        }
        if (!isValidObjectIdFormat(req.activeCommunity, "invalid format activeCommunity, socket: signal_100_button_update")) {
          return;
        }
        try {
          // Activate Signal 100 via Go API
          const apiUrl = `${policeCadApiUrl}/api/v1/community/${req.activeCommunity}/signal-100`;
          await axios.post(apiUrl, {
            userId: req.userID || req.activatedByUserId || "",
            username: req.activatedByUsername || req.userUsername || "",
            callSign: req.activatedByCallSign || req.userCallSign || "",
            departmentName: req.activatedBy || "",
          }, config);

          // Resolve custom signal 100 sound URL (if community has one configured)
          const signal100SoundUrl = await resolveCustomSoundUrl(req.activeCommunity, 'signal100');
          const broadcastData = Object.assign({}, req);
          if (signal100SoundUrl) broadcastData.signal100SoundUrl = signal100SoundUrl;

          // Mark as broadcast so the Go API webhook doesn't re-broadcast
          markAlertBroadcast('signal100', req.activeCommunity);

          return broadcastToCommunity(
            "signal_100_button_updated",
            broadcastData,
            req.activeCommunity
          );
        } catch (err) {
          console.error("signal_100_button_update: API error:", err.message);
          // Fallback to direct DB update
          Community.findByIdAndUpdate(
            { _id: ObjectId(req.activeCommunity) },
            { $set: { "community.activeSignal100": true } },
            async function (dbErr) {
              if (dbErr) return console.error(dbErr);
              const signal100SoundUrl = await resolveCustomSoundUrl(req.activeCommunity, 'signal100');
              const broadcastData = Object.assign({}, req);
              if (signal100SoundUrl) broadcastData.signal100SoundUrl = signal100SoundUrl;
              return broadcastToCommunity(
                "signal_100_button_updated",
                broadcastData,
                req.activeCommunity
              );
            }
          );
        }
      }
    });

    socket.on("hold_traffic_button_update", (req) => {
      // console.debug('hold traffic button update req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          req.activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: hold_traffic_button_update"
        );
        if (!isValid) {
          return;
        }
        Community.findById(
          {
            _id: ObjectId(req.activeCommunity),
          },
          function (err, resp) {
            if (err) return console.error(err);
            if (resp != null) {
              if (resp.community != null) {
                Community.findByIdAndUpdate(
                  {
                    _id: ObjectId(req.activeCommunity),
                  },
                  {
                    $set: {
                      "community.activeHoldTraffic": true,
                    },
                  },
                  function (err) {
                    if (err) return console.error(err);
                    return socket.broadcast.emit(
                      "hold_traffic_button_updated",
                      req
                    );
                  }
                );
              }
            }
          }
        );
      }
    });

    socket.on("clear_signal_100", async (data) => {
      // Support both old format (string communityId) and new format (object with user info)
      const activeCommunity = typeof data === "string" ? data : data.activeCommunity;
      const clearedByUserId = typeof data === "object" ? (data.clearedByUserId || "") : "";
      const clearedByUsername = typeof data === "object" ? (data.clearedByUsername || "") : "";
      const clearedByCallSign = typeof data === "object" ? (data.clearedByCallSign || "") : "";

      if (activeCommunity != null && activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: clear_signal_100"
        );
        if (!isValid) {
          return;
        }
        if (!isValidObjectIdFormat(activeCommunity, "invalid format activeCommunity, socket: clear_signal_100")) {
          return;
        }
        try {
          // Clear Signal 100 via Go API
          const apiUrl = `${policeCadApiUrl}/api/v1/community/${activeCommunity}/signal-100`;
          const apiResp = await axios.delete(apiUrl, {
            ...config,
            data: {
              clearedByUserId,
              clearedByUsername,
              clearedByCallSign,
            },
          });

          const clearedData = apiResp.data || {};
          return broadcastToCommunity(
            "clear_signal_100_updated",
            {
              activeCommunity,
              clearedByUserId: clearedData.clearedByUserId || clearedByUserId,
              clearedByUsername: clearedData.clearedByUsername || clearedByUsername,
              clearedByCallSign: clearedData.clearedByCallSign || clearedByCallSign,
            },
            activeCommunity
          );
        } catch (err) {
          console.error("clear_signal_100: API error:", err.message);
          // Fallback to direct DB update
          Community.findByIdAndUpdate(
            { _id: ObjectId(activeCommunity) },
            { $set: { "community.activeSignal100": false } },
            function (dbErr) {
              if (dbErr) return console.error(dbErr);
              return broadcastToCommunity(
                "clear_signal_100_updated",
                activeCommunity,
                activeCommunity
              );
            }
          );
        }
      }
    });

    socket.on("clear_hold_traffic", (activeCommunity) => {
      // console.debug('10-3 clear button update req: ', activeCommunity)
      if (activeCommunity != null && activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: clear_hold_traffic"
        );
        if (!isValid) {
          return;
        }
        Community.findById(
          {
            _id: ObjectId(activeCommunity),
          },
          function (err, resp) {
            if (err) return console.error(err);
            if (resp != null) {
              if (resp.community != null) {
                Community.findByIdAndUpdate(
                  {
                    _id: ObjectId(activeCommunity),
                  },
                  {
                    $set: {
                      "community.activeHoldTraffic": false,
                    },
                  },
                  function (err) {
                    if (err) return console.error(err);
                    return socket.broadcast.emit(
                      "clear_hold_traffic_updated",
                      activeCommunity
                    );
                  }
                );
              }
            }
          }
        );
      }
    });

    socket.on("create_bolo", (req) => {
      // console.debug('create bolo socket: ', req)
      var myBolo = new Bolo();
      myBolo.socketCreateBolo(req);
      myBolo.save(function (err, dbBolos) {
        if (err) return console.error(err);
        // Use room-based broadcast for BOLO
        const communityId = dbBolos.bolo ? dbBolos.bolo.activeCommunityID : req.communityId;
        broadcastToCommunity("created_bolo", dbBolos, communityId);
      });
    });

    socket.on("create_call", (req) => {
      var myCall = new Call();
      myCall.socketCreateCall(req);
      myCall.save(function (err, dbCalls) {
        if (err) return console.error(err);
        // Use room-based broadcast for calls
        const communityId = dbCalls.call ? dbCalls.call.communityID : req.communityId;
        broadcastToCommunity("created_call", dbCalls, communityId);
      });
    });

    socket.on("create_911_call", (req) => {
      // console.debug('create new 911 call socket: ', req)
      var myNew911Call = new Call();
      myNew911Call.socketCreate911Call(req);
      myNew911Call.save(function (err, dbCalls) {
        if (err) return console.error(err);
        // Use room-based broadcast for 911 calls
        const communityId = dbCalls.call ? dbCalls.call.communityID : req.communityId;
        broadcastToCommunity("created_call", dbCalls, communityId);
        return socket.emit("created_911_call", dbCalls);
      });
    });

    socket.on("clear_call", (req) => {
      // console.debug('clear call socket: ', req)
      // Use room-based broadcast for cleared calls
      broadcastToCommunity("cleared_call", req, req.communityId);
    });

    // New event for updating a call (for real-time call management)
    socket.on("update_call", (req) => {
      if (!exists(req.callId) || req.callId == "") {
        return console.error("cannot update call without callId");
      }
      var isValid = isValidObjectIdLength(
        req.callId,
        "cannot lookup invalid length callId, socket: update_call"
      );
      if (!isValid) {
        return;
      }
      Call.findByIdAndUpdate(
        { _id: ObjectId(req.callId) },
        { $set: req.updates },
        { new: true },
        function (err, updatedCall) {
          if (err) return console.error(err);
          if (!updatedCall) return;
          const communityId = updatedCall.call ? updatedCall.call.communityID : req.communityId;
          broadcastToCommunity("updated_call", updatedCall, communityId);
        }
      );
    });

    socket.on("update_panic_btn_sound", (user) => {
      // console.debug('update panic button sound status: ', user)
      if (exists(user)) {
        if (exists(user._id)) {
          User.findById(
            {
              _id: ObjectId(user._id),
            },
            function (err, dbUser) {
              if (err) return console.error(err);
              if (!exists(dbUser) || dbUser == null) {
                return console.error(
                  "cannot update_panic_btn_sound with null dbUser: ",
                  dbUser
                );
              }
              if (!exists(dbUser.user) || dbUser.user == null) {
                return console.error(
                  "cannot update_panic_btn_sound with null dbUser.user: ",
                  dbUser
                );
              }
              User.findByIdAndUpdate(
                {
                  _id: ObjectId(user._id),
                },
                {
                  "user.panicButtonSound": !dbUser.user.panicButtonSound,
                },
                function (err, dbUserUpdtd) {
                  if (err) return console.error(err);
                  return socket.emit("load_panic_btn_result", dbUserUpdtd);
                }
              );
            }
          );
        } else {
          return console.error(
            "cannot update_panic_btn_sound with null user._id: ",
            user
          );
        }
      } else {
        return console.error(
          "cannot update_panic_btn_sound with null user: ",
          user
        );
      }
    });

    socket.on("update_alert_volume_slider", (myObj) => {
      // console.debug('update alert volume slider: ', myObj)
      if (exists(myObj)) {
        if (exists(myObj.dbUser)) {
          if (exists(myObj.dbUser._id)) {
            User.findById(
              {
                _id: ObjectId(myObj.dbUser._id),
              },
              function (err, dbUser) {
                if (err) return console.error(err);
                if (!exists(dbUser) || dbUser == null) {
                  return console.error(
                    "cannot update_alert_volume_slider with null dbUser: ",
                    dbUser
                  );
                }
                if (!exists(dbUser.user) || dbUser.user == null) {
                  return console.error(
                    "cannot update_alert_volume_slider with null dbUser.user: ",
                    dbUser
                  );
                }
                User.findByIdAndUpdate(
                  {
                    _id: ObjectId(myObj.dbUser._id),
                  },
                  {
                    "user.alertVolumeLevel": myObj.volume,
                  },
                  function (err, dbUserUpdtd) {
                    if (err) return console.error(err);
                    return socket.emit("load_alert_volume_result", dbUserUpdtd);
                  }
                );
              }
            );
          } else {
            return console.error(
              "cannot update_alert_volume_slider with null user._id: ",
              myObj.dbUser
            );
          }
        } else {
          return console.error(
            "cannot update_alert_volume_slider with null user: ",
            myObj.dbUser
          );
        }
      } else {
        return console.error(
          "cannot update_alert_volume_slider with null user: ",
          myObj.dbUser
        );
      }
    });

    socket.on("update_drivers_license_status", (user) => {
      // console.debug('update revoke drivers license status: ', user)
      if (user != null && user != undefined) {
        if (user._id != null && user._id != undefined) {
          Civilian.findByIdAndUpdate(
            {
              _id: ObjectId(user._id),
            },
            {
              "civilian.licenseStatus": user.status,
            },
            function (err, dbUser) {
              if (err) {
                console.error(err);
                if (
                  user.bot_request != null &&
                  user.bot_request != undefined &&
                  user.bot_request == true
                ) {
                  return socket.emit("bot_updated_drivers_license_status", {
                    success: false,
                  });
                }
              }
              if (
                user.bot_request != null &&
                user.bot_request != undefined &&
                user.bot_request == true
              ) {
                return socket.emit("bot_updated_drivers_license_status", {
                  success: true,
                });
              }
              return socket.emit(
                "load_updated_drivers_license_status_result",
                dbUser
              );
            }
          );
        }
      }
    });

    socket.on("get_reg_arm", (req) => {
      if (req.regOwnerID != null && req.regOwnerID != undefined) {
        if (req.communityID == "" || req.communityID == null) {
          // if they are not in a community, we don't allow them to use this functionality
        } else {
          Firearm.find(
            {
              "firearm.registeredOwnerID": req.regOwnerID,
              "firearm.activeCommunityID": req.communityID,
            },
            function (err, dbFirearms) {
              // console.debug("returned from db, dbFirearms: ", dbFirearms)
              if (err) return console.error(err);
              return socket.emit("load_reg_arm_result", dbFirearms);
            }
          );
        }
      }
    });

    socket.on("get_reg_veh", (req) => {
      // console.debug("inside get_reg_veh socket: ", req)
      if (
        req.regOwner != null &&
        req.regOwner != undefined &&
        req.regOwnerID != null &&
        req.regOwnerID != undefined
      ) {
        if (req.communityID == "" || req.communityID == null) {
          Vehicle.find(
            {
              $or: [
                {
                  // vehicles created after 1/30/2021 will be assigned to an ownerID, older records will have to use owner name and dob
                  "vehicle.registeredOwnerID": req.regOwnerID,
                },
                {
                  "vehicle.registeredOwner": req.regOwner,
                },
              ],
              $or: [
                {
                  // some are stored as empty strings and others as null so we need to check for both
                  "vehicle.activeCommunityID": "",
                },
                {
                  "vehicle.activeCommunityID": null,
                },
              ],
            },
            function (err, dbVehicles) {
              if (err) return console.error(err);
              return socket.emit("load_reg_veh_result", dbVehicles);
            }
          );
        } else {
          Vehicle.find(
            {
              $or: [
                {
                  // vehicles created after 1/30/2021 will be assigned to an ownerID, older records will have to use owner name and dob
                  "vehicle.registeredOwnerID": req.regOwnerID,
                },
                {
                  "vehicle.registeredOwner": req.regOwner,
                },
              ],
              "vehicle.activeCommunityID": req.communityID,
            },
            function (err, dbVehicles) {
              if (err) return console.error(err);
              return socket.emit("load_reg_veh_result", dbVehicles);
            }
          );
        }
      }
    });

    socket.on("get_active_warrants", (req) => {
      // console.debug('get active warrants socket: ', req)
      Warrant.find(
        {
          "warrant.accusedID": req.accusedID,
        },
        function (err, dbWarrants) {
          if (err) return console.error(err);
          return socket.emit("load_active_warrants_result", dbWarrants);
        }
      );
    });

    socket.on("create_new_civ", (req) => {
      // console.debug('create new civ socket: ', req)
      var myNewCiv = new Civilian();
      myNewCiv.socketCreateUpdateCiv(req);
      myNewCiv.save(function (err, dbCivilians) {
        if (err) return console.error(err);
        return socket.emit("created_new_civ", dbCivilians);
      });
    });

    socket.on("update_civilian", (req) => {
      // console.debug("update civilian socket: ", req);
      var isValid = isValidObjectIdLength(
        req.body.civID,
        "cannot update civilian with invalid objectID, socket: update_civilian"
      );
      if (!isValid) {
        return;
      }
      Civilian.findById(
        {
          _id: ObjectId(req.body.civID),
        },
        (err, doc) => {
          if (err) return console.error(err);
          if (!exists(doc))
            return console.error(
              `[LPS Error] cannot update civ when doc cannot be found, civID: ${req.body.civID}`
            );
          var civ = doc;
          if (civ === undefined || civ === null)
            return console.error(
              `[LPS Error] cannot update civ when civ cannot be found, civID: ${req.body.civID}`
            );
          civ.socketCreateUpdateCiv(req);
          civ.save(function (err, dbCivilian) {
            if (err) return console.error(err);
            return socket.emit("updated_civilian", dbCivilian);
          });
        }
      );
    });

    socket.on("delete_civilian", (req) => {
      // console.debug('delete civilian socket: ', req)
      var isValid = isValidObjectIdLength(
        req.body.civID,
        "cannot delete civilian with invalid objectID, socket: delete_civilian"
      );
      if (!isValid) {
        return;
      }
      Civilian.findByIdAndDelete(
        {
          _id: ObjectId(req.body.civID),
        },
        function (err) {
          Ticket.deleteMany(
            {
              "ticket.civID": req.body.civID,
            },
            function (err) {
              if (err) return console.error(err);
              ArrestReport.deleteMany(
                {
                  "arrest.accusedID": req.body.civID,
                },
                function (err) {
                  if (err) return console.error(err);
                  MedicalReport.deleteMany(
                    {
                      "report.civilianID": req.body.civID,
                    },
                    function (err) {
                      if (err) return console.error(err);
                      Medication.deleteMany(
                        {
                          "medication.civilianID": req.body.civID,
                        },
                        function (err) {
                          if (err) return console.error(err);
                          Condition.deleteMany(
                            {
                              "condition.civilianID": req.body.civID,
                            },
                            function (err) {
                              if (err) return console.error(err);
                              return socket.emit("deleted_civilian", req);
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });

    socket.on("lookup_civ_by_id", (req) => {
      // console.debug('lookup civ socket: ', req)
      if (exists(req.civID)) {
        Civilian.findById(
          {
            _id: ObjectId(req.civID),
          },
          function (err, dbCiv) {
            if (err) return console.error(err);
            return socket.emit("load_civ_by_id_result", dbCiv); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("lookup_veh_by_id", (req) => {
      // console.debug('lookup veh socket: ', req)
      if (exists(req.vehID)) {
        Vehicle.findById(
          {
            _id: ObjectId(req.vehID),
          },
          function (err, dbVeh) {
            if (err) return console.error(err);
            return socket.emit("load_veh_by_id_result", dbVeh); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("lookup_firearm_by_id", (req) => {
      // console.debug('lookup firearm socket: ', req)
      if (exists(req.firearmID)) {
        Firearm.findById(
          {
            _id: ObjectId(req.firearmID),
          },
          function (err, dbFirearm) {
            if (err) return console.error(err);
            return socket.emit("load_firearm_by_id_result", dbFirearm); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("lookup_license_by_id", (req) => {
      // console.debug('lookup license socket: ', req)
      if (exists(req.licenseID)) {
        License.findById(
          {
            _id: ObjectId(req.licenseID),
          },
          function (err, dbLicense) {
            if (err) return console.error(err);
            return socket.emit("load_license_by_id_result", dbLicense); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("lookup_warrant_by_id", (req) => {
      // console.debug('lookup license socket: ', req)
      if (exists(req.warrantID)) {
        Warrant.findById(
          {
            _id: ObjectId(req.warrantID),
          },
          function (err, dbWarrant) {
            if (err) return console.error(err);
            return socket.emit("load_warrant_by_id_result", dbWarrant); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("create_new_veh", (req) => {
      // console.debug('create new veh socket: ', req)
      var myNewVeh = new Vehicle();
      myNewVeh.socketCreateVeh(req);
      myNewVeh.save(function (err, dbVehicles) {
        if (err) return console.error(err);
        return socket.emit("created_new_veh", dbVehicles); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
      });
    });

    socket.on("create_new_firearm", (req) => {
      // console.debug('create new firearm socket: ', req)
      var myNewFirearm = new Firearm();
      myNewFirearm.socketCreateFirearm(req);
      myNewFirearm.save(function (err, dbFirearms) {
        if (err) return console.error(err);
        return socket.emit("created_new_firearm", dbFirearms); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
      });
    });

    socket.on("create_new_license", (req) => {
      // console.debug("create new license socket: ", req);
      var myNewLicense = new License();
      myNewLicense.socketCreateLicense(req);
      myNewLicense.save(function (err, dbLicenses) {
        if (err) return console.error(err);
        return socket.emit("created_new_license", dbLicenses); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
      });
    });

    socket.on("search_citation", (req) => {
      // console.debug('search citation socket: ', req)
      if (exists(req.civID)) {
        Ticket.find(
          {
            "ticket.civID": req.civID,
            "ticket.isWarning": false,
          },
          function (err, dbTickets) {
            if (err) return console.error(err);
            return socket.emit("load_citation_result", dbTickets); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("search_warnings", (req) => {
      // console.debug('search warnings socket: ', req)
      if (exists(req.civID)) {
        Ticket.find(
          {
            "ticket.civID": req.civID,
            "ticket.isWarning": true,
          },
          function (err, dbTickets) {
            if (err) return console.error(err);
            return socket.emit("load_warnings_result", dbTickets); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("clientError", (err, socket) => {
      console.warn(err);
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    });

    socket.on("search_arrests", (req) => {
      // console.debug('search arrests socket: ', req)
      if (exists(req.civID)) {
        ArrestReport.find(
          {
            "arrestReport.accusedID": req.civID,
          },
          function (err, dbArrests) {
            if (err) return console.error(err);
            return socket.emit("load_arrests_result", dbArrests); //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
          }
        );
      }
    });

    socket.on("fetch_civ_cards", (req) => {
      // console.debug("get fetch_civ_cards socket: ", req);
      axios
        .get(
          `${policeCadApiUrl}/api/v1/civilians/user/${req.dbUser._id}?active_community_id=${req.dbUser.user.activeCommunity}&limit=8&page=${req.page}`,
          config
        )
        .then(function (dbPersonas) {
          if (!exists(dbPersonas.data)) {
            return socket.emit("load_civ_cards_result", undefined);
          } else {
            return socket.emit("load_civ_cards_result", dbPersonas.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_civ_cards_result", undefined);
        });
    });

    socket.on("fetch_veh_cards", (req) => {
      // console.debug("get fetch_veh_cards socket: ", req);
      axios
        .get(
          `${policeCadApiUrl}/api/v1/vehicles/registered-owner/${req.civID}?limit=8&page=${req.page}`,
          config
        )
        .then(function (dbVehicles) {
          if (!exists(dbVehicles.data)) {
            return socket.emit("load_veh_cards_result", undefined);
          } else {
            return socket.emit("load_veh_cards_result", dbVehicles.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_veh_cards_result", undefined);
        });
    });

    socket.on("fetch_gun_cards", (req) => {
      // console.debug("get fetch_gun_cards socket: ", req);
      axios
        .get(
          `${policeCadApiUrl}/api/v1/firearms/registered-owner/${req.civID}?limit=8&page=${req.page}`,
          config
        )
        .then(function (dbFirearms) {
          if (!exists(dbFirearms.data)) {
            return socket.emit("load_gun_cards_result", undefined);
          } else {
            // console.debug("load_gun_cards_result response: ", dbFirearms.data);
            return socket.emit("load_gun_cards_result", dbFirearms.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_gun_cards_result", undefined);
        });
    });

    socket.on("fetch_license_cards", (req) => {
      // console.debug("get fetch_license_cards socket: ", req);
      axios
        .get(
          `${policeCadApiUrl}/api/v1/licenses/owner/${req.civID}?limit=8&page=${req.page}`,
          config
        )
        .then(function (dbLicenses) {
          if (!exists(dbLicenses.data)) {
            return socket.emit("load_license_cards_result", undefined);
          } else {
            // console.debug("load_license_cards_result response: ", dbLicenses.data);
            return socket.emit("load_license_cards_result", dbLicenses.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_license_cards_result", undefined);
        });
    });

    socket.on("fetch_warrant_cards", (req) => {
      // console.debug("get fetch_warrant_cards socket: ", req);
      axios
        .get(
          `${policeCadApiUrl}/api/v1/warrants/user/${req.civID}?limit=8&page=${req.page}`,
          config
        )
        .then(function (dbLicenses) {
          if (!exists(dbLicenses.data)) {
            return socket.emit("load_warrant_cards_result", undefined);
          } else {
            // console.debug("load_warrant_cards_result response: ", dbLicenses.data);
            return socket.emit("load_warrant_cards_result", dbLicenses.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_warrant_cards_result", undefined);
        });
    });

    socket.on("name_search_police", (req) => {
      // console.debug("get name_search_police socket: ", req);
      axios
        .get(
          `${policeCadApiUrl}/api/v1/civilians/search?active_community_id=${req.body.communityID}&first_name=${req.body.civFirstName}&last_name=${req.body.civLastName}&date_of_birth=${req.body.birthday}&limit=8&page=${req.body.page}`,
          config
        )
        .then(function (dbCivilians) {
          if (!exists(dbCivilians.data)) {
            return socket.emit("name_search_police_result", undefined);
          } else {
            return socket.emit("name_search_police_result", dbCivilians.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_license_cards_result", undefined);
        });
    });

    socket.on("vehicle_search_police", (req) => {
      // console.debug("get vehicle_search_police socket: ", req);
      axios
        .get(
          `${policeCadApiUrl}/api/v1/vehicles/search?active_community_id=${req.body.communityID}&plate=${req.body.plate}&limit=8&page=${req.body.page}`,
          config
        )
        .then(function (dbVehicles) {
          if (!exists(dbVehicles.data)) {
            return socket.emit("vehicle_search_police_result", undefined);
          } else {
            return socket.emit("vehicle_search_police_result", dbVehicles.data);
          }
        })
        .catch((err) => {
          console.error(err);
          // return socket.emit("load_license_cards_result", undefined);
        });
    });

    socket.on("get_personas", (req) => {
      // console.debug("get personas socket: ", req)
      axios
        .get(
          `${policeCadApiUrl}/api/v1/ems/user/${req.userID}?active_community_id=${req.activeCommunityID}`,
          config
        )
        .then(function (dbEms) {
          if (!exists(dbEms.data)) {
            return socket.emit("load_personas", undefined);
          } else {
            return socket.emit("load_personas", dbEms.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_personas", undefined);
        });
    });

    socket.on("get_persona_data", (req) => {
      // console.debug("get personas_data socket: ", req)
      axios
        .get(`${policeCadApiUrl}/api/v1/ems/${req.personaID}`, config)
        .then(function (dbEms) {
          if (!exists(dbEms.data)) {
            return socket.emit("load_persona_data", undefined);
          } else {
            return socket.emit("load_persona_data", dbEms.data);
          }
        })
        .catch((err) => {
          console.error(err);
          return socket.emit("load_persona_data", undefined);
        });
    });
  }); //end of sockets

  // ===========================================
  // ANNOUNCEMENT API ROUTES
  // ===========================================

  // Get all announcements for a community
  app.get("/api/v1/community/:communityId/announcements", authCheck, async function (req, res) {
    try {
      const { communityId } = req.params;
      const { type, page = 1, limit = 10 } = req.query;

      if (!isValidObjectIdLength(communityId, "Invalid community ID")) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const query = { community: communityId, isActive: true };

      if (type && ['main', 'session', 'training'].includes(type)) {
        query.type = type;
      }

      const announcements = await Announcement.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('creator', 'username profilePicture')
        .populate('reactions.user', 'username profilePicture')
        .populate('comments.user', 'username profilePicture')
        .lean();

      const total = await Announcement.countDocuments(query);

      res.json({
        announcements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Get a specific announcement
  app.get("/api/v1/announcement/:announcementId", authCheck, async function (req, res) {
    try {
      const { announcementId } = req.params;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      const announcement = await Announcement.findById(announcementId)
        .populate('creator', 'username profilePicture')
        .populate('reactions.user', 'username profilePicture')
        .populate('comments.user', 'username profilePicture');

      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      // Increment view count
      await announcement.incrementViewCount();

      res.json({ announcement });
    } catch (error) {
      console.error('Error fetching announcement:', error);
      res.status(500).json({ error: "Failed to fetch announcement" });
    }
  });

  // Create a new announcement
  app.post("/api/v1/community/:communityId/announcements", authCheck, async function (req, res) {
    try {
      const { communityId } = req.params;
      const { title, content, type, priority, startTime, endTime } = req.body;
      
      if (!isValidObjectIdLength(communityId, "Invalid community ID")) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      // Validate required fields
      if (!title || !content || !type) {
        return res.status(400).json({ error: "Title, content, and type are required" });
      }

      if (!['main', 'session', 'training'].includes(type)) {
        return res.status(400).json({ error: "Invalid announcement type" });
      }

      if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: "Invalid priority level" });
      }

      // Check if user has permission to create announcements
      // This would typically check community roles/permissions
      // For now, we'll allow any authenticated user who is a member

      const announcement = new Announcement({
        community: communityId,
        creator: req.user._id,
        title: title.trim(),
        content: content.trim(),
        type,
        priority: priority || 'medium',
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null
      });

      await announcement.save();
      await announcement.populate('creator', 'username profilePicture');

      res.status(201).json({ announcement });
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Update an announcement
  app.put("/api/v1/announcement/:announcementId", authCheck, async function (req, res) {
    try {
      const { announcementId } = req.params;
      const { title, content, type, priority, isActive, isPinned, startTime, endTime } = req.body;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      // Check if user is the creator or has admin permissions
      if (announcement.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not authorized to edit this announcement" });
      }

      // Update fields
      if (title !== undefined) announcement.title = title.trim();
      if (content !== undefined) announcement.content = content.trim();
      if (type !== undefined && ['main', 'session', 'training'].includes(type)) {
        announcement.type = type;
      }
      if (priority !== undefined && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
        announcement.priority = priority;
      }
      if (isActive !== undefined) announcement.isActive = isActive;
      if (isPinned !== undefined) announcement.isPinned = isPinned;
      if (startTime !== undefined) announcement.startTime = startTime ? new Date(startTime) : null;
      if (endTime !== undefined) announcement.endTime = endTime ? new Date(endTime) : null;

      await announcement.save();
      await announcement.populate('creator', 'username profilePicture');

      res.json({ announcement });
    } catch (error) {
      console.error('Error updating announcement:', error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // Delete an announcement
  app.delete("/api/v1/announcement/:announcementId", authCheck, async function (req, res) {
    try {
      const { announcementId } = req.params;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      // Check if user is the creator or has admin permissions
      if (announcement.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not authorized to delete this announcement" });
      }

      await announcement.remove();
      res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // Toggle reaction to an announcement
  app.post("/api/v1/announcement/:announcementId/reactions", authCheck, async function (req, res) {
    try {
      const { announcementId } = req.params;
      const { emoji } = req.body;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      if (!emoji) {
        return res.status(400).json({ error: "Emoji is required" });
      }

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      // Check if user already has this reaction
      const existingReaction = announcement.reactions.find(
        r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
      );

      let action;
      if (existingReaction) {
        // Remove the reaction
        await announcement.removeReaction(req.user._id, emoji);
        action = 'removed';
      } else {
        // Add the reaction
        await announcement.addReaction(req.user._id, emoji);
        action = 'added';
      }

      await announcement.populate('reactions.user', 'username profilePicture');

      res.json({ 
        success: true,
        action: action,
        announcement 
      });
    } catch (error) {
      console.error('Error toggling reaction:', error);
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  });

  // Remove reaction from an announcement
  app.delete("/api/v1/announcement/:announcementId/reactions", authCheck, async function (req, res) {
    try {
      const { announcementId } = req.params;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      await announcement.removeReaction(req.user._id);
      await announcement.populate('reactions.user', 'username profilePicture');

      res.json({ announcement });
    } catch (error) {
      console.error('Error removing reaction:', error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // Add comment to an announcement
  app.post("/api/v1/announcement/:announcementId/comments", authCheck, async function (req, res) {
    try {
      const { announcementId } = req.params;
      const { content } = req.body;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      if (content.trim().length > 1000) {
        return res.status(400).json({ error: "Comment too long (max 1000 characters)" });
      }

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      await announcement.addComment(req.user._id, content.trim());
      await announcement.populate('comments.user', 'username profilePicture');

      res.json({ announcement });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Update a comment
  app.put("/api/v1/announcement/:announcementId/comments/:commentId", authCheck, async function (req, res) {
    try {
      const { announcementId, commentId } = req.params;
      const { content } = req.body;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      if (content.trim().length > 1000) {
        return res.status(400).json({ error: "Comment too long (max 1000 characters)" });
      }

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      await announcement.editComment(commentId, req.user._id, content.trim());
      await announcement.populate('comments.user', 'username profilePicture');

      res.json({ announcement });
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete a comment
  app.delete("/api/v1/announcement/:announcementId/comments/:commentId", authCheck, async function (req, res) {
    try {
      const { announcementId, commentId } = req.params;
      
      if (!isValidObjectIdLength(announcementId, "Invalid announcement ID")) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      await announcement.deleteComment(commentId, req.user._id);
      await announcement.populate('comments.user', 'username profilePicture');

      res.json({ announcement });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // ===========================================
  // END ANNOUNCEMENT API ROUTES
  // ===========================================

  // ─── Global error handler ────────────────────────────────────────────────
  // Catches any error thrown from a route handler (sync or via .next(err))
  // and renders the branded error page instead of Express's default HTML
  // stack trace. Must be the LAST middleware registered; the 4-arg signature
  // is what flags it as an error handler in Express.
  //
  // Note: async handlers that throw without .next(err) propagate as
  // unhandled promise rejections at the Node level — they bypass this
  // middleware. Those still need try/catch in the handler itself; this
  // middleware is the safety net for everything Express can see.
  app.use(function (err, req, res, next) {
    console.error(
      "[LPS] [level=error] unhandled route error:",
      err && err.stack ? err.stack : err
    );
    // Fire-and-forget Discord alert. Silently no-ops if the webhook env
    // var isn't set (local dev). Dedup + 4xx filtering handled inside.
    try {
      discordAlerts.sendErrorAlert(err, req);
    } catch (e) {
      console.error("[LPS] [level=error] discord alert threw:", e && e.message ? e.message : e);
    }
    if (res.headersSent) return next(err);
    var status = err && err.status ? err.status : 500;
    var isJsonRequest =
      (req.xhr || (req.get('accept') || '').indexOf('json') !== -1 || (req.path || '').indexOf('/api/') === 0);
    if (isJsonRequest) {
      return res.status(status).json({ error: "internal_error" });
    }
    res.status(status).render("error", {
      user: req.user,
      message: "Looks like we had an issue. Try again, or head back home — we're on it.",
      redirect: req.get('referer') || null,
    });
  });
}; //end of routes

function auth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401);
  return res.render("not-authorized");
}

// function authCheck(req, res, next) {
//   if (req.isAuthenticated()) {
//     // Store redirect in res.locals for the next handler
//     res.locals.redirect = req.query.redirect || "/community-dashboard";
//     return next();
//   } else {
//     const redirect = encodeURIComponent(req.originalUrl);
//     if (req.route.path.includes("signup")) {
//       res.render(req.route.path.substring(1), {
//         message: req.flash("signuperror"),
//       });
//     } else if (req.route.path.includes("login")) {
//       res.render(req.route.path.substring(1), { message: req.flash("error") });
//     } else {
//       res.redirect(`/login-civ?redirect=${redirect}`);
//     }
//   }
// }

function exists(v) {
  if (v !== undefined) {
    return true;
  } else {
    return false;
  }
}

var OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

function isValidObjectIdFormat(value, errorMessage) {
  if (value == null || value === undefined) {
    return false;
  }
  if (!OBJECT_ID_PATTERN.test(String(value))) {
    console.warn(
      `[LPS] [level=warn] [method=isValidObjectIdFormat] errorMessage: ${errorMessage}, value: ${value}`
    );
    return false;
  }
  return true;
}

function isValidObjectIdLength(value, errorMessage) {
  if (value != null && value !== undefined) {
    if (value.length != 24) {
      console.warn(
        `[LPS] [level=warn] [method=isValidObjectIdLength] errorMessage: ${errorMessage}, value: ${value}`
      );
      return false;
    } else {
      return true;
    }
  } else {
    console.warn(
      `[LPS] [level=warn] [method=isValidObjectIdLength] cannot check length of a null value. errorMessage: ${errorMessage}`
    );
    return false;
  }
}

function generateHeight(heightFoot, heightInches) {
  if (exists(heightFoot) && !exists(heightInches)) {
    //if only foot exists, then just convert to inches and store in DB
    return parseInt(heightFoot) * 12;
  }
  if (exists(heightFoot) && exists(heightInches)) {
    //if foot and inches exist, we want to convert to inches to store in DB
    return parseInt(heightFoot) * 12 + parseInt(heightInches);
  }
  if (!exists(heightFoot) && exists(heightInches)) {
    //if foot doesn't exist but inches exists, simple maths
    return parseInt(heightInches);
  }
}

/* Capitalize function
 *  Usage:
 *   Input: "hello there!".capitalize();
 *   Output: "Hello there!"
 */
Object.defineProperty(String.prototype, "capitalize", {
  value: function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
  },
  enumerable: false,
});
