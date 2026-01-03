// local authentication
// For more details go to https://github.com/jaredhanson/passport-local
const DiscordStrategy = require("passport-discord").Strategy;
const LocalStrategy = require("passport-local").Strategy;
var User = require("../app/models/user");

module.exports = function (passport) {
  // Maintaining persistent login sessions
  // serialized  authenticated user to the session
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  // deserialized when subsequent requests are made
  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

  passport.use(
    "login",
    new LocalStrategy(
      {
        usernameField: "email",
        passReqToCallback: true,
      },
      function (req, email, password, done) {
        process.nextTick(function () {
          // Authenticate against API only - no local database checks
          var apiUrl = process.env.POLICE_CAD_API_URL || "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";
          var axios = require("axios");
          
          // Normalize email to lowercase
          var normalizedEmail = email.toLowerCase();
          
          // Build Basic auth header
          var basicAuthBase64 = Buffer.from(normalizedEmail + ':' + password).toString('base64');
          
          // Authenticate with API
          axios.post(`${apiUrl}/api/v1/auth/token`, {}, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + basicAuthBase64
            },
            timeout: 15000, // Increased to 15 seconds to handle slow backend responses
            validateStatus: function (status) {
              return status < 600; // Don't throw on any status code
            }
          }).then(function(apiResponse) {
            if (apiResponse.status === 200 || apiResponse.status === 201) {
              // Check if account is deactivated in API response
              var responseData = apiResponse.data || {};
              if (responseData.isDeactivated === true || responseData.deactivated === true) {
                return done(
                  null,
                  false,
                  req.flash("error", "account_deactivated")
                );
              }
              
              // API authentication successful - now get/create user in local DB for session
              User.findOne(
                {
                  "user.email": normalizedEmail,
                },
                function (err, user) {
                  if (err) {
                    return done(err);
                  }
                  
                  // If user doesn't exist locally, create a minimal user record for session management
                  if (!user) {
                    var newUser = new User();
                    newUser.user.email = normalizedEmail;
                    newUser.user.username = normalizedEmail.split('@')[0];
                    newUser.user.createdAt = new Date();
                    newUser.save(function (err) {
                      if (err) {
                        return done(err);
                      }
                      return done(null, newUser);
                    });
                  } else {
                    // Check if account is deactivated
                    if (user.user.isDeactivated === true) {
                      return done(
                        null,
                        false,
                        req.flash("error", "account_deactivated")
                      );
                    }
                    return done(null, user);
                  }
                }
              );
            } else {
              // Check if API response indicates deactivated account
              var responseData = apiResponse.data || {};
              if (responseData.isDeactivated === true || responseData.deactivated === true || 
                  (responseData.message && (responseData.message.toLowerCase().includes('deactivated') || 
                   responseData.message.toLowerCase().includes('inactive')))) {
                return done(
                  null,
                  false,
                  req.flash("error", "account_deactivated")
                );
              }
              
              return done(
                null,
                false,
                req.flash("error", "email address or password")
              );
            }
          }).catch(function(apiError) {
            // Handle timeout errors specifically
            if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
              console.error('[Passport Login] Backend API timeout:', apiError.message);
              return done(
                null,
                false,
                req.flash("error", "Authentication service is temporarily unavailable. Please try again in a moment.")
              );
            }
            
            // Handle network errors
            if (apiError.code === 'ECONNREFUSED' || apiError.code === 'ENOTFOUND' || apiError.code === 'ETIMEDOUT') {
              console.error('[Passport Login] Backend API connection error:', apiError.code, apiError.message);
              return done(
                null,
                false,
                req.flash("error", "Unable to connect to authentication service. Please try again later.")
              );
            }
            
            // Other API errors - log for debugging but don't expose details to user
            if (apiError.response) {
              console.error('[Passport Login] Backend API error:', apiError.response.status, apiError.response.data);
            } else {
              console.error('[Passport Login] Backend API error:', apiError.message);
            }
            
            // API authentication failed - generic error message
            return done(
              null,
              false,
              req.flash("error", "email address or password")
            );
          });
        });
      }
    )
  );

  passport.use(
    "signup",
    new LocalStrategy(
      {
        usernameField: "email",
        passReqToCallback: true,
      },
      function (req, email, password, done) {
        process.nextTick(function () {
          if (!req.user) {
            //basically if you are logged in or not, this checks for when you are not logged in
            User.findOne(
              {
                "user.email": email.toLowerCase(),
              },
              function (err, user) {
                if (err) {
                  return done(err);
                }
                if (user) {
                  return done(
                    null,
                    false,
                    req.flash(
                      "signuperror",
                      "that email address already exists"
                    )
                  );
                } else {
                  var newUser = new User();
                  newUser.user.username = req.body.username;
                  newUser.user.callSign = req.body.callSign;
                  newUser.user.email = email.toLowerCase();
                  newUser.user.password = newUser.generateHash(password);
                  newUser.user.name = "";
                  newUser.user.address = "";
                  newUser.user.discordConnected = false;
                  newUser.user.resetPasswordToken = "";
                  newUser.user.resetPasswordExpires = "";
                  newUser.user.createdAt = new Date();
                  newUser.save(function (err) {
                    if (err) throw err;
                    return done(null, newUser);
                  });
                }
              }
            );
          } else {
            var user = req.user;
            user.user.username = req.body.username;
            user.user.callSign = req.body.callSign;
            user.user.email = email.toLowerCase();
            user.user.password = user.generateHash(password);
            user.user.name = "";
            user.user.address = "";
            user.resetPasswordToken = "";
            user.resetPasswordExpires = "";
            user.save(function (err) {
              if (err) throw err;
              return done(null, user);
            });
          }
        });
      }
    )
  );

  // Only initialize Discord strategy if environment variables are set
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.CLIENT_REDIRECT) {
    passport.use(
      new DiscordStrategy(
        {
          passReqToCallback: true,
          clientID: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          callbackURL: process.env.CLIENT_REDIRECT,
          scope: ["identify"],
        },
        (req, accessToken, refreshToken, profile, done) => {
          let user = req.user;
          user.user.discordConnected = true;
          user.user.discord = {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
          };
          user.save(function (err) {
            if (err) throw err;
            return done(null, user);
          });
        }
      )
    );
  } else {
    console.log("Discord OAuth not configured - skipping Discord strategy initialization");
  }
};
