var User = require('../app/models/user');
var Civilian = require('../app/models/civilian');
var Vehicle = require('../app/models/vehicle');
var Friend = require('../app/models/friend');
var Ticket = require('../app/models/ticket');
var nodemailer = require('nodemailer');
async = require("async");
var crypto = require('crypto');
var path = require('path'),
  fs = require('fs');
module.exports = function (app, passport, server) {

  app.get('/', function (request, response) {
    response.render('index.html', {
      message: request.flash('info')
    });
  });

  app.get('/release-log', function (request, response) {
    response.render('release-log.html');
  });

  app.get('/about', function (request, response) {
    response.render('about.html');
  });

  app.get('/rules', function (request, response) {
    response.render('rules.html');
  });

  app.get('/login', function (request, response) {
    response.redirect('/');
  });

  app.get('/edit', auth, function (request, response) {
    response.render('edit.html', {
      user: request.user
    });
  });

  app.get('/login-civ', function (request, response) {
    response.render('login-civ.html', {
      message: request.flash('error')
    });
  });

  app.get('/login-police', function (request, response) {
    response.render('login-police.html', {
      message: request.flash('error')
    });
  });

  app.get('/signup-civ', function (request, response) {
    response.render('signup-civ.html', {
      message: request.flash('signuperror')
    });
  });

  app.get('/signup-police', function (request, response) {
    response.render('signup-police.html', {
      message: request.flash('signuperror')
    });
  });

  app.get('/logout', function (request, response) {
    request.logout();
    response.redirect('/');
  });

  app.get('/forgot-password', function (request, response) {
    response.render('forgot-password.html', {
      user: request.user,
      message: request.flash('emailSend')
    });
  });

  app.get('/reset/:token', function(req, res) {
    User.findOne({ 'user.resetPasswordToken': req.params.token, 'user.resetPasswordExpires': { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('emailSend', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot-password');
      }
      res.render('reset.html', {
        user: req.user,
        message: req.flash('resetSend')
      });
    });
  });

  app.get('/civ-dashboard', auth, function (request, response) {
    Civilian.find({
      'civilian.email': request.user.user.email
    }, function (err, dbPersonas) {
      Vehicle.find({
        'vehicle.email': request.user.user.email
      }, function (err, dbVehicles) {
        response.render('civ-dashboard.html', {
          user: request.user,
          personas: dbPersonas,
          vehicles: dbVehicles
        });
      });
    })
  });

  app.get('/police-dashboard', auth, function (request, response) {
    Civilian.find({}, function (err, dbCivilians) {
      Vehicle.find({}, function (err, dbVehicles) {
        Ticket.find({}, function (err, dbTickets) {
          response.render('police-dashboard.html', {
            user: request.user,
            civilians: dbCivilians,
            vehicles: dbVehicles,
            tickets: dbTickets
          });
        });
      });
    });
  });

  app.get('*', function (request, response) {
    response.render('page-not-found.html');
  });


  app.post('/login-civ', passport.authenticate('login', {
    successRedirect: '/civ-dashboard',
    failureRedirect: '/login-civ',
    failureFlash: true
  }));

  app.post('/login-police', passport.authenticate('login', {
    successRedirect: '/police-dashboard',
    failureRedirect: '/login-police',
    failureFlash: true
  }));

  app.post('/signup-civ', passport.authenticate('signup', {
    successRedirect: '/civ-dashboard',
    failureRedirect: '/signup-civ',
    failureFlash: true
  }));

  app.post('/signup-police', passport.authenticate('signup', {
    successRedirect: '/police-dashboard',
    failureRedirect: '/signup-police',
    failureFlash: true
  }));

  app.post('/forgot-password', function (req, res, next) {
    async.waterfall([
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ 'user.email': req.body.email }, function (err, users) {
          if (!users) {
            req.flash('emailSend', 'No account with that email address exists.');
            return res.redirect('/forgot-password');
          }
          users.user.resetPasswordToken = token;
          users.user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          users.save(function (err) {
            done(err, token, users);
          });
        });
      },
      function (token, users, done) {
        var smtpTransport = nodemailer.createTransport({
          service: process.env.MAIL_SERVICE_NAME,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          }
        });
        var mailOptions = {
          to: users.user.email,
          from: process.env.FROM_EMAIL,
          subject: 'Change Password',
          text: 'This email allows you to change your password.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('emailSend', 'An e-mail has been sent to ' + users.user.email + ' with a link to change the password.');
          done(err, 'done');
        });
      }
    ], function (err) {
      if (err) return next(err);
      res.render('forgot-password.html', {message: req.flash('emailSend')});
    });
  });

  app.post('/reset/:token', function(req, res) {
    //this is a super gross way to grab the token.. :yolo:
    var token = req.headers.referer.split("/")[req.headers.referer.split("/").length-1]
    async.waterfall([
      function(done) {
        User.findOne({ 'user.resetPasswordToken': token, 'user.resetPasswordExpires': { $gt: Date.now() } }, function(err, users) {
          if (!users) {
            req.flash('resetSend', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          var user = users;
          user.user.password = user.generateHash(req.body.password);
          user.user.resetPasswordToken = undefined;
          user.user.resetPasswordExpires = undefined;
  
          user.save(function(err) {
            // req.logIn(user, function(err) {
              done(err, user);
            // });
          });
        });
      },
      function(users, done) {
        var smtpTransport = nodemailer.createTransport({
          service: process.env.MAIL_SERVICE_NAME,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          }
        });
        var mailOptions = {
          to: users.user.email,
          from: process.env.FROM_EMAIL,
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + users.user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('info', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/');
    });
  });

  app.post('/edit', function (req, res) {
    var tempPath = req.files.file.path,
      targetPath = path.resolve('./uploads/' + req.files.file.originalFilename);
    if (path.extname(req.files.file.name).toLowerCase() === '.png') {
      fs.rename(tempPath, './uploads/image_' + req.user._id, function (err) {
        if (err) throw err;
        console.log("Upload completed!");
      });
    }
    User.findOne({
      'user.email': req.body.email
    }, function (err, user) {
      if (err) {
        return done(err);
      }
      if (user)
        user.updateUser(req, res)

    });
  });

  app.post('/create-civ', function (req, res) {

    User.findOne({
      'user.email': req.body.submitNewCiv
    }, function (err, user) {

      var myCiv = new Civilian()
      myCiv.updateCiv(req, res)
      myCiv.save(function (err, fluffy) {
        if (err) return console.error(err);
      });

    })
  });

  app.post('/create-vehicle', function (req, res) {

    User.findOne({
      'user.email': req.body.submitNewVeh
    }, function (err, user) {

      var myVeh = new Vehicle()
      myVeh.updateVeh(req, res)
      myVeh.save(function (err, fluffy) {
        if (err) return console.error(err);
      });
    })
  });

  app.post('/create-ticket', function (req, res) {

    var myTicket = new Ticket()
    myTicket.updateTicket(req, res)
    myTicket.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/deleteCiv', function (req, res) {
    var nameArray = req.body.removeCiv.split(' ')
    var civFirstName = nameArray[0]
    var civLastName = nameArray[1]
    Civilian.deleteOne({
      'civilian.firstName': civFirstName,
      'civilian.lastName': civLastName
    }, function (err) {
      if (err) return console.error(err);
      res.redirect('/civ-dashboard');
    })
  })

  app.post('/deleteVeh', function (req, res) {
    var roName = req.body.roVeh
    var modelName = req.body.modelVeh
    var emailName = req.body.emailVeh
    var plateName = req.body.plateVeh
    Vehicle.deleteOne({
      'vehicle.email': emailName,
      'vehicle.model': modelName,
      'vehicle.registeredOwner': roName,
      'vehicle.plate': plateName
    }, function (err) {
      if (err) return console.error(err);
      res.redirect('/civ-dashboard');
    })
  })

  var io = require('socket.io').listen(server);

  var usernames = {};

  io.sockets.on('connection', function (socket) {

    socket.on('adduser', function (username) {
      socket.username = username;
      usernames[username] = username;
      io.sockets.emit('updateusers', usernames);
    });

    socket.on('disconnect', function () {
      delete usernames[socket.username];
      io.sockets.emit('updateusers', usernames);
      socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    });
  });

};

function auth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login')
}