"use strict";

var createError = require('http-errors');

var express = require('express');

var path = require('path');

var cookieParser = require('cookie-parser');

var logger = require('morgan'); //routes


var indexRouter = require('./routes/index');

var compression = require('compression');

var helmet = require('helmet'); //legacy imports


var dotenv = require('dotenv');

var bodyParser = require('body-parser');

var session = require('express-session');

var MongoStore = require('connect-mongo')(session);

var mongoose = require('mongoose');

var passport = require('passport');

var flash = require('connect-flash');

var http = require('http').createServer(express);

var realFs = require('fs');

var gracefulFs = require('graceful-fs');

var rateLimit = require("express-rate-limit");

var newBaseURL = process.env.NEW_BASE_URL || 'http://localhost:8080';
var redirectStatus = parseInt(process.env.REDIRECT_STATUS || 302);
var oldBaseURL = process.env.OLD_BASE_URL; // Load environment variables file into process.

dotenv.config();
var app = express(); // Set up mongoose connection

var mongoose = require('mongoose');

var dev_db_url = 'mongodb://localhost/knoldus';
var mongoDB = process.env.DB_URI || dev_db_url;
mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:')); // view engine setup

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(helmet());
app.use(compression()); // Compress all routes

app.use(express["static"](path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use(function (req, res, next) {
  next(createError(404));
}); // error handler

app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {}; //render the error page

  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;
/*

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
*/

/**
 * HTTP server for the express application.
 */

/*
const server = app.listen(port, function () {
	console.log('Server started.', server.address());
});

// Setup routes.
require('./app/routes')(app, passport, server);
*/