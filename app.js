var express = require('express');
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session')
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var path = require('path'),
	fs = require('fs');
var http = require('http')
var server = http.createServer(app)


var configDB = require('./config/database.js');

mongoose.connect(configDB.url);

require('./config/passport')(passport);



app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(session({
	secret: 'knoldus',
	resave: false,
	saveUninitialized: true
}));
app.use(bodyParser({
	uploadDir: '/images'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());



require('./app/routes.js')(app, passport, server);

server.listen(port);
console.log('Listening  to  port ' + port);