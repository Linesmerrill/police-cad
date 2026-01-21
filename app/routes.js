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
var ObjectId = require("mongodb").ObjectID;
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

// Utility functions for base64-url encoding/decoding (used for department and now community IDs)
function encodeId(id) {
  return Buffer.from(id, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeId(encoded) {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
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

  app.get(
    "/auth/discord",
    auth,
    passport.authenticate("discord", {
      failureRedirect: "/",
    }),
    (req, res) => {
      return res.redirect(req.query.state);
    }
  );

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
      if (community && community._id && userId) {
        // Use v2 paginated API - fetch only first page
        const deptsApiUrl = `${policeCadApiUrl}/api/v2/community/${community._id}/departments?userId=${userId}&page=1&limit=${deptPerPage}`;
        const deptsResponse = await axios.get(deptsApiUrl, config);
        departments = deptsResponse.data.data || [];
        departmentsTotalCount = deptsResponse.data.totalCount || departments.length;
        departmentTemplateTypes = deptsResponse.data.templateTypes || [];
      }
      res.render("community-details", {
        user: req.user,
        community,
        departments,
        departmentsTotalCount,
        departmentTemplateTypes,
        query: req.query,
        referer: encodeURIComponent(`/community/${hash}`),
        redirect: encodeURIComponent(redirect),
      });
    } catch (error) {
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

      // Update lastLoginAt in backend API if API token is configured
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

      // Create admin session
      req.session.adminToken = "local-admin-" + Date.now();
      req.session.admin = { 
        email: adminUser.email,
        name: adminUser.name || adminUser.email.split('@')[0],
        id: adminUser._id,
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



  app.get("/penal-code", function (req, res) {
    res.render("penal-code");
  });

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

    app.get("/civ-dashboard", authCheck, async function (req, res) {
    try {
      // const { userId, communityId } = req.decodedData;
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
      
      // If no department context is provided, redirect to community or communities
      if (!departmentId && !departmentName) {
        const communityId = (req.user && req.user.user && (req.user.user.lastAccessedCommunity && req.user.user.lastAccessedCommunity.communityID)) || (req.user && req.user.user && req.user.user.activeCommunity);
        if (communityId) {
          return res.redirect(`/community/${encodeId(communityId)}?notice=selectDepartment#departments-section`);
        }
        return res.redirect('/communities');
      }
      
      // If a specific department is requested, verify user access
      if (departmentId && departmentName) {
        const communityId = req.user.user.lastAccessedCommunity?.communityID || req.user.user.activeCommunity;
        
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
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId);
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
      
      res.render("civ-dashboard", {
        user: req.user,
        // userId,
        // communityId,
        context: context,
        referer: encodeURIComponent("/civ-dashboard"),
        redirect: encodeURIComponent(redirect),
        departmentName: departmentName,
        departmentId: departmentId,
      });
    } catch (error) {
      console.error('🚨 Error in civ-dashboard route:', error);
      return res.status(500).render("error", {
        message: "An error occurred while loading the dashboard. Please try again.",
        redirect: "/communities",
      });
    }
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
      
      // If no department context is provided, redirect to community or communities
      if (!(departmentId || req.session.departmentId) && !departmentName) {
        const communityId = (req.user && req.user.user && (req.user.user.lastAccessedCommunity && req.user.user.lastAccessedCommunity.communityID)) || (req.user && req.user.user && req.user.user.activeCommunity);
        if (communityId) {
          return res.redirect(`/community/${encodeId(communityId)}?notice=selectDepartment#departments-section`);
        }
        return res.redirect('/communities');
      }
      
      // If a specific department is requested, verify user access
      if (departmentId && departmentName) {
        const communityId = req.user.user.lastAccessedCommunity?.communityID || req.user.user.activeCommunity;
        
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
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId);
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
      
      // Fetch EMS vehicles and calls
      let dbEmsVehicles = null;
      let dbCalls = null;
      
      try {
        const vehiclesResponse = await axios.get(
          `${policeCadApiUrl}/api/v1/emsVehicles/user/${req.session.passport.user}?active_community_id=${req.user.user.activeCommunity}`,
          config
        );
        dbEmsVehicles = vehiclesResponse.data;
      } catch (err) {
        console.error('Error fetching EMS vehicles:', err);
      }
      
      try {
        const callsResponse = await axios.get(
          `${policeCadApiUrl}/api/v1/calls/community/${req.user.user.activeCommunity}?status=true`,
          config
        );
        dbCalls = callsResponse.data;
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

  app.get("/police-dashboard", authCheck, async function (req, res) {
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
      
      // If no department context is provided, redirect to community or communities
      if (!(departmentId || req.session.departmentId) && !departmentName) {
        const communityId = (req.user && req.user.user && (req.user.user.lastAccessedCommunity && req.user.user.lastAccessedCommunity.communityID)) || (req.user && req.user.user && req.user.user.activeCommunity);
        if (communityId) {
          return res.redirect(`/community/${encodeId(communityId)}?notice=selectDepartment#departments-section`);
        }
        return res.redirect('/communities');
      }
      
      // If a specific department is requested, verify user access
      if (departmentId && departmentName) {
        const communityId = req.user.user.lastAccessedCommunity?.communityID || req.user.user.activeCommunity;
        
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
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId);
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
      
      res.render("police-dashboard", {
        user: req.user,
        referer: encodeURIComponent("/police-dashboard"),
        redirect: encodeURIComponent(redirect),
        context: null,
        departmentId: departmentId || req.session.departmentId || null,
        departmentName: departmentName,
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

  app.get("/dispatch-dashboard", authCheck, async function (req, res) {
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
      
      // If a specific department is requested, verify user access
      if (departmentId && departmentName) {
        const communityId = req.user.user.lastAccessedCommunity?.communityID || req.user.user.activeCommunity;
        
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
            const userHasAccess = userDepartments.some(dept => dept._id === departmentId);
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
      
      res.render("dispatch-dashboard", {
        user: req.user,
        referer: encodeURIComponent("/dispatch-dashboard"),
        redirect: encodeURIComponent(redirect),
        context: null,
        departmentId: departmentId || req.session.departmentId || null,
        departmentName: departmentName,
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
      res.render("login-civ", {
        message: "",
      });
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
  app.get("/api/user/current", function (req, res) {
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
          createdAt: user.createdAt
        }
      });
    }
    return res.json({ user: null });
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

  // Be sure to place all GET requests above this catchall
  // Exclude Next.js internal routes
  app.get("*", function (req, res) {
    // Let Next.js handle its own routes
    if (req.path.startsWith('/_next/') || req.path.startsWith('/api/') || req.path === '/profile' || req.path === '/discord-bot' || req.path === '/about-us' || req.path === '/contact-us' || req.path === '/privacy-policy' || req.path === '/terms-and-conditions' || req.path === '/login' || req.path === '/forgot-password' || req.path === '/signup' || req.path === '/invite-code' || req.path === '/faq' || (req.path.startsWith('/signup/') && !req.path.match(/^\/signup\/verify\/[^/]+$/)) || req.path.startsWith('/reset/')) {
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
      const redirect = req.session.redirect || "/communities";
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

  app.post("/create-warrant", auth, function (req, res) {
    var myWarrant = new Warrant();
    myWarrant.createWarrant(req, res);
    myWarrant.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post("/clear-warrant", auth, function (req, res) {
    // console.debug("/clear-warrant req: ", req.body);
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(
      req.body.warrantID,
      "cannot lookup invalid length warrantID, route: /clear-warrant"
    );
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect("/" + req.body.route);
    }
    Warrant.findByIdAndUpdate(
      {
        _id: ObjectId(req.body.warrantID),
      },
      {
        $set: {
          "warrant.updatedAt": new Date(),
          "warrant.clearingOfficerID": req.body.clearingOfficerID,
          "warrant.status": false,
        },
      },
      function (err) {
        if (err) return console.error(err);
        return res.redirect("/" + req.body.route);
      }
    );
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
    } else if (req.body.action === "changeEmail") {
      var isValid = isValidObjectIdLength(
        req.body.userID,
        "cannot lookup invalid length userID, route: /manageAccount"
      );
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("back");
      }

      if (!exists(req.body.newEmail) || !exists(req.body.currentPassword)) {
        console.log('changeEmail: Missing required fields', {
          hasNewEmail: exists(req.body.newEmail),
          hasCurrentPassword: exists(req.body.currentPassword),
          body: Object.keys(req.body)
        });
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect("back");
      }

      var newEmail = req.body.newEmail.trim().toLowerCase();
      var currentPassword = req.body.currentPassword;
      
      console.log('changeEmail: Processing request', {
        userID: req.body.userID,
        newEmail: newEmail,
        hasPassword: !!currentPassword
      });

      // Find user and verify password
      User.findOne(
        {
          _id: ObjectId(req.body.userID),
        },
        function (err, user) {
          if (err) {
            console.error('changeEmail: Error finding user', err);
            req.app.locals.specialContext = "error";
            return res.redirect("back");
          }
          if (!user) {
            console.log('changeEmail: User not found', { userID: req.body.userID });
            req.app.locals.specialContext = "error";
            return res.redirect("back");
          }

          console.log('changeEmail: User found, verifying password');

          // Verify current password
          var bcrypt = require("bcrypt-nodejs");
          var passwordMatch = bcrypt.compareSync(currentPassword, user.user.password);
          console.log('changeEmail: Password verification', { 
            passwordMatch: passwordMatch,
            hasStoredPassword: !!user.user.password
          });
          
          if (!passwordMatch) {
            console.log('changeEmail: Password verification failed');
            req.app.locals.specialContext = "invalidPassword";
            return res.redirect("back");
          }

          console.log('changeEmail: Password verified, checking if email is in use');

          // Check if email is already in use
          User.findOne(
            {
              "user.email": newEmail,
              _id: { $ne: ObjectId(req.body.userID) }
            },
            function (err, existingUser) {
              if (err) {
                console.error('changeEmail: Error checking existing email', err);
                req.app.locals.specialContext = "error";
                return res.redirect("back");
              }
              if (existingUser) {
                console.log('changeEmail: Email already in use', { 
                  existingUserID: existingUser._id 
                });
                req.app.locals.specialContext = "emailInUse";
                return res.redirect("back");
              }

              console.log('changeEmail: Email available, updating database');

              // Update email
              User.findOneAndUpdate(
                {
                  _id: ObjectId(req.body.userID),
                },
                {
                  $set: {
                    "user.email": newEmail,
                    "user.updatedAt": new Date(),
                  },
                },
                { new: true }, // Return updated document
                function (err, updatedUser) {
                  if (err) {
                    console.error('changeEmail: Database error', err);
                    req.app.locals.specialContext = "error";
                    return res.redirect("back");
                  }
                  if (!updatedUser) {
                    console.log('changeEmail: User not found for update', { userID: req.body.userID });
                    req.app.locals.specialContext = "error";
                    return res.redirect("back");
                  }
                  console.log('changeEmail: Email updated successfully', {
                    userID: req.body.userID,
                    oldEmail: user.user.email,
                    newEmail: newEmail,
                    updatedEmail: updatedUser.user?.email
                  });
                  req.app.locals.specialContext = "emailChanged";
                  return res.redirect("back");
                }
              );
            }
          );
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
        Community.findByIdAndDelete(
          {
            _id: ObjectId(req.body.communityID),
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

  var io = require("socket.io")(server);

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
      } else if (!exists(req.status) || req.status == "") {
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

    socket.on("load_panic_statuses", (req) => {
      // console.debug('load panic status req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          req.activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: load_panic_statuses"
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
                // console.debug("resp", resp)
                // console.debug("resp.community", resp.community)
                return socket.broadcast.emit(
                  "load_panic_status_update",
                  resp.community.activePanics,
                  resp.community.activeSignal100,
                  resp.community.activeHoldTraffic,
                  req
                );
              }
            }
          }
        );
      }
    });

    socket.on("panic_button_update", (req) => {
      // console.debug('panic button update req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var values = {
          userId: req.userID,
          username: req.userUsername,
          activeCommunityID: req.activeCommunity,
        };
        var isValid = isValidObjectIdLength(
          req.activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: panic_button_update"
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
                if (
                  resp.community.activePanics == undefined ||
                  resp.community.activePanics == null
                ) {
                  var mapInsert = new Map();
                  mapInsert.set(req.userID, values);
                  var isValid = isValidObjectIdLength(
                    req.activeCommunity,
                    "cannot lookup invalid length activeCommunity, socket: panic_button_update"
                  );
                  if (!isValid) {
                    return;
                  }
                  Community.findByIdAndUpdate(
                    {
                      _id: ObjectId(req.activeCommunity),
                    },
                    {
                      $set: {
                        "community.activePanics": mapInsert,
                      },
                    },
                    function (err) {
                      if (err) return console.error(err);
                      return socket.broadcast.emit(
                        "panic_button_updated",
                        mapInsert,
                        req
                      );
                    }
                  );
                } else {
                  if (
                    resp.community.activePanics.get(req.userID) == undefined
                  ) {
                    resp.community.activePanics.set(req.userID, values);
                    var isValid = isValidObjectIdLength(
                      req.activeCommunity,
                      "cannot lookup invalid length activeCommunity, socket: panic_button_update"
                    );
                    if (!isValid) {
                      return;
                    }
                    Community.findByIdAndUpdate(
                      {
                        _id: ObjectId(req.activeCommunity),
                      },
                      {
                        $set: {
                          "community.activePanics": resp.community.activePanics,
                        },
                      },
                      function (err) {
                        if (err) return console.error(err);
                        return socket.broadcast.emit(
                          "panic_button_updated",
                          resp.community.activePanics,
                          req
                        );
                      }
                    );
                  } else {
                    return socket.broadcast.emit(
                      "panic_button_updated",
                      resp.community.activePanics,
                      req
                    );
                  }
                }
              }
            }
          }
        );
      }
    });

    socket.on("clear_panic", (req) => {
      // console.debug("clear req", req)
      if (req.communityID != null && req.communityID != undefined) {
        var isValid = isValidObjectIdLength(
          req.communityID,
          "cannot lookup invalid length communityID, socket: clear_panic"
        );
        if (!isValid) {
          return;
        }
        Community.findById(
          {
            _id: ObjectId(req.communityID),
          },
          function (err, resp) {
            if (err) return console.error(err);
            if (resp != null) {
              if (resp.community != null) {
                if (resp.community.activePanics != null) {
                  resp.community.activePanics.delete(req.userID);
                  var isValid = isValidObjectIdLength(
                    req.communityID,
                    "cannot lookup invalid length communityID, socket: clear_panic"
                  );
                  if (!isValid) {
                    return;
                  }
                  Community.findByIdAndUpdate(
                    {
                      _id: ObjectId(req.communityID),
                    },
                    {
                      $set: {
                        "community.activePanics": resp.community.activePanics,
                      },
                    },
                    function (err) {
                      if (err) return console.error(err);
                      return socket.broadcast.emit("cleared_panic", req);
                    }
                  );
                }
              }
            }
          }
        );
      }
    });

    socket.on("signal_100_button_update", (req) => {
      // console.debug('signal 100 button update req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          req.activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: signal_100_button_update"
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
                      "community.activeSignal100": true,
                    },
                  },
                  function (err) {
                    if (err) return console.error(err);
                    return broadcastToCommunity(
                      "signal_100_button_updated",
                      req,
                      req.activeCommunity
                    );
                  }
                );
              }
            }
          }
        );
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

    socket.on("clear_signal_100", (activeCommunity) => {
      // console.debug('signal 100 clear button update req: ', activeCommunity)
      if (activeCommunity != null && activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(
          activeCommunity,
          "cannot lookup invalid length activeCommunity, socket: clear_signal_100"
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
                      "community.activeSignal100": false,
                    },
                  },
                  function (err) {
                    if (err) return console.error(err);
                    return broadcastToCommunity(
                      "clear_signal_100_updated",
                      activeCommunity,
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
        .populate('comments.user', 'username profilePicture');

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
