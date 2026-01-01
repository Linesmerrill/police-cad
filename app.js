var dotenv = require("dotenv");
// Load environment variables file into process FIRST
dotenv.config();

var express = require("express");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var MongoStore = require("connect-mongo")(session);
var mongoose = require("mongoose");
var passport = require("passport");
var flash = require("connect-flash");
var path = require("path");
var http = require("http").createServer(express);
var realFs = require("fs");
var gracefulFs = require("graceful-fs");
const rateLimit = require("express-rate-limit");

var newBaseURL = process.env.NEW_BASE_URL || "http://localhost:8080";
var redirectStatus = parseInt(process.env.REDIRECT_STATUS || 302);
var oldBaseURL = process.env.OLD_BASE_URL;

const app = express();

// graceful-fs: in order to delay on EMFILE errors from any fs-using dependencies
gracefulFs.gracefulify(realFs);

// Connect to MongoDB database.
mongoose.connect(process.env.DB_URI || "mongodb://localhost/knoldus");
mongoose.set("useFindAndModify", false);

// Setup passport.
require("./config/passport")(passport);

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // limit each IP to 100 requests per windowMs
});

//  apply to all requests
app.use(limiter);

// Use cookie parser.
app.use(cookieParser());

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(
  express.json({
    uploadDir: "/images",
  })
);

// Set the view engine to ejs.
app.set("view engine", "ejs");

// Load and set build version for all templates
try {
  const versionData = require("./version.json");
  app.locals.buildVersion = versionData.version;
  app.locals.buildDate = versionData.buildDate;
} catch (error) {
  console.warn("Warning: Could not load version.json. Using default version.");
  app.locals.buildVersion = "0.0.0-00:00:00";
  app.locals.buildDate = new Date().toISOString();
}

// Setup session storage.
app.use(
  session({
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    secret: "knoldus",
    resave: false,
    saveUninitialized: true,
    //expires: 1000 * 60 * 60 * 24 * 30, // 1 Month (30 days) see: https://www.npmjs.com/package/connect-mongodb-session
    cookie: {
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 1 Month (30 days) see: https://www.npmjs.com/package/connect-mongodb-session
      httpOnly: true,
      sameSite: 'lax', // Allow cookies to be sent with cross-site requests from same site
      secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production (HTTPS)
    },
  })
);

// Initialize passport.
app.use(passport.initialize());
app.use(passport.session());

// Use the flash.
app.use(flash());

// Static serving of public files.
app.use("/static", express.static(path.join(__dirname, "public")));

app.use(function forceLiveDomain(req, res, next) {
  var host = req.get("Host");
  if (host === oldBaseURL) {
    return res.redirect(redirectStatus, newBaseURL + req.originalUrl);
  }
  return next();
});

// Export app setup function to be used by server.js
module.exports = function setupApp(nextApp, handle) {
  // Get the port we'll listen to.
  var port = process.env.PORT || 8080;

  // Handle Next.js internal routes FIRST (before Express routes)
  // This ensures webpack chunks and Next.js assets are served correctly
  if (nextApp && handle) {
    app.get('/_next/*', (req, res) => {
      return handle(req, res);
    });
  }

  // Setup routes - Express routes will be checked first
  require("./app/routes")(app, passport, null, nextApp, handle);

  /**
   * HTTP server for the express application.
   */
  const server = app.listen(port, function () {
    console.log("Server started.", server.address());
  });

  server.on("clientError", (err, socket) => {
    console.error(err);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  return server;
};
