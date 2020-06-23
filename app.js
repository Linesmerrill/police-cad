var dotenv = require('dotenv');
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var path = require('path');
var http = require('http').createServer(express);
var RateLimit = require("express-rate-limit");
var MongoLimitStore = require('rate-limit-mongo');
var realFs = require('fs')
var gracefulFs = require('graceful-fs')

var newBaseURL = process.env.NEW_BASE_URL || 'http://localhost:8080';
var redirectStatus = parseInt(process.env.REDIRECT_STATUS || 302);
var oldBaseURL = process.env.OLD_BASE_URL
// Load enviroment variables file into process.
dotenv.config();

/**
 * Express application.t
 */
const app = express();

// graceful-fs: in order to delay on EMFILE errors from any fs-using dependencies
gracefulFs.gracefulify(realFs)

// Connect to MongoDB database.
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/knoldus' );
mongoose.set('useFindAndModify', false);

// Setup passport.
require('./config/passport')(passport);

// Use cookie parser.
app.use(cookieParser());

var limiter = new RateLimit({
	store: new MongoLimitStore({
	  uri: process.env.MONGODB_URI || 'mongodb://localhost/knoldus',
	}),
	max: process.env.RATE_LIMIT_NUMBER || 100, // limit each IP to n requests per windowMs (default 100)
	windowMs: 15 * 60 * 1000 // 15 minutes
  });
// apply to all requests
app.use(limiter);

app.use(bodyParser.urlencoded({
	extended: false,
}));

app.use(bodyParser({
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