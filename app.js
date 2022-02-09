var dotenv = require('dotenv');
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var path = require('path');
var http = require('http').createServer(express);
var realFs = require('fs')
var gracefulFs = require('graceful-fs');
const rateLimit = require("express-rate-limit");

var newBaseURL = process.env.NEW_BASE_URL || 'http://localhost:8080';
var redirectStatus = parseInt(process.env.REDIRECT_STATUS || 302);
var oldBaseURL = process.env.OLD_BASE_URL
// Load environment variables file into process.
dotenv.config();

const app = express();

// graceful-fs: in order to delay on EMFILE errors from any fs-using dependencies
gracefulFs.gracefulify(realFs)

// Connect to MongoDB database.
mongoose.connect(process.env.DB_URI || 'mongodb://localhost/knoldus' );
mongoose.set('useFindAndModify', false);

// Setup passport.
require('./config/passport')(passport);

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

const limiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	max: 500 // limit each IP to 100 requests per windowMs
  });
   
  //  apply to all requests
  app.use(limiter);

// Use cookie parser.
app.use(cookieParser());

app.use(express.urlencoded({
	extended: false,
}));

app.use(express.json({
	uploadDir: '/images'
}));

// Set the view engine to ejs.
app.set('view engine', 'ejs');

// Setup session storage.
app.use(session({
	store: new MongoStore({mongooseConnection: mongoose.connection}),
	secret: 'knoldus',
	resave: false,
	saveUninitialized: true,
	cookie: {
		path: '/',
		maxAge: 1000 * 60 * 60 * 24 // 1 day
	}
}));

// Initialize passport.
app.use(passport.initialize());
app.use(passport.session());

// Use the flash.
app.use(flash());

// Static serving of public files.
app.use('/static', express.static(path.join(__dirname, 'public')))

app.use(function forceLiveDomain(req, res, next) {
	var host = req.get('Host')
	if (host === oldBaseURL) {
		return res.redirect(redirectStatus, newBaseURL + req.originalUrl)
	}
	return next();
})

// Get the port we'll listen to.
var port = process.env.PORT || 8080;

/**
 * HTTP server for the express application.
 */
const server = app.listen(port, function () {
	console.log('Server started.', server.address());
});

// Setup routes.
require('./app/routes')(app, passport, server);