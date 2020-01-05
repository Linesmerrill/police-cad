var dotenv = require('dotenv');
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var path = require('path');

// Load enviroment variables file into process.
dotenv.config();

/**
 * Express application.t
 */
const app = express();

// Connect to MongoDB database.
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/knoldus' );
mongoose.set('useFindAndModify', false);

// Setup passport.
require('./config/passport')(passport);

// Use cookie parser.
app.use(cookieParser());

app.use(bodyParser.urlencoded({
	extended: false,
}));

app.use(bodyParser({
	uploadDir: '/images'
}));

// Setup views and their engine.
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

// Setup session storage.
app.use(session({
	secret: 'knoldus',
	resave: false,
	saveUninitialized: true
}));

// Initialize passport.
app.use(passport.initialize());
app.use(passport.session());

// Use the flash.
app.use(flash());

// Static serving of public files.
app.use(express.static(path.join(__dirname, 'public')));

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