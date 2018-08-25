var User = require('../app/models/user');
var Civilian = require('../app/models/civilian');
var Vehicle = require('../app/models/vehicle');
var Friend = require('../app/models/friend');
var Ticket = require('../app/models/ticket');
async = require("async");
var path = require('path'),
  fs = require('fs');
module.exports = function (app, passport, server) {

  app.get('/', function (request, response) {
    response.render('index.html');
  });

  app.get('/release-log', function (request, response) {
    response.render('release-log.html');
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