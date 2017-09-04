var User = require('../app/models/user');
var Civilian = require('../app/models/civilian');
var Vehicle = require('../app/models/vehicle');
var Friend = require('../app/models/friend');
async = require("async");
var path = require('path'),
 fs = require('fs');
module.exports = function(app, passport, server) {
 app.get('/', function(request, response) {
  response.render('index.html');
 });
 app.get('/user', auth, function(request, response) {
  response.render('user.html', {
   user: request.user
  });
 });


 app.get('/image.png', function(req, res) {
  res.sendfile(path.resolve('./uploads/image_' + req.user._id));
 });


 app.get('/edit', auth, function(request, response) {
  response.render('edit.html', {
   user: request.user
  });
 });

 // app.get('/about', auth, function(request, response) {
 //  Civilian.find({
 //   'civilian.username': request.user.user.username
 //  }, function(err, dbPersonas) {
 //   Vehicle.find({
 //    'vehicle.username': request.user.user.username
 //   }, function(err, dbVehicles) {
 //
 //
 //    response.render('about.html', {
 //     user: request.user,
 //     personas: dbPersonas,
 //     vehicles: dbVehicles
 //    });
 //   });
 //  })
 // });

 app.get('/civ-dashboard', auth, function(request, response) {
  Civilian.find({
   'civilian.username': request.user.user.username
  }, function(err, dbPersonas) {
   Vehicle.find({
    'vehicle.username': request.user.user.username
   }, function(err, dbVehicles) {


    response.render('civ-dashboard.html', {
     user: request.user,
     personas: dbPersonas,
     vehicles: dbVehicles
    });
   });
  })
 });

 app.get('/police-dashboard', auth, function(request, response) {
  response.render('police-dashboard.html', {
   user: request.user,
  });
 });

 app.get('/logout', function(request, response) {
  request.logout();
  response.redirect('/');
 });

 app.get('/login', function(req, res) {
  res.redirect('/');
 })

 app.get('/login-civ', function(request, response) {
  response.render('login-civ.html', {
   message: request.flash('error')
  });
 });

 app.post('/login-civ', passport.authenticate('login', {
  successRedirect: '/civ-dashboard',
  failureRedirect: '/login-civ',
  failureFlash: true
 }));

 app.get('/login-police', function(request, response) {
  response.render('login-police.html', {
   message: request.flash('error')
  });
 });

 app.post('/login-police', passport.authenticate('login', {
  successRedirect: '/police-dashboard',
  failureRedirect: '/login-police',
  failureFlash: true
 }));

 app.get('/signup-police', function(request, response) {
  response.render('signup-police.html', {
   message: request.flash('signuperror')
  });
 });

 app.get('/signup-civ', function(request, response) {
  response.render('signup-civ.html', {
   message: request.flash('signuperror')
  });
 });


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

 app.get('/edit', function(request, response) {
  response.render('edit.html', {
   message: request.flash('updateerror')
  });
 });


 app.post('/edit', function(req, res) {
  var tempPath = req.files.file.path,
   targetPath = path.resolve('./uploads/' + req.files.file.originalFilename);
  if (path.extname(req.files.file.name).toLowerCase() === '.png') {
   fs.rename(tempPath, './uploads/image_' + req.user._id, function(err) {
    if (err) throw err;
    console.log("Upload completed!");
   });
  }
  User.findOne({
   'user.email': req.body.email
  }, function(err, user) {
   if (err) {
    return done(err);
   }
   if (user)
    user.updateUser(req, res)

  });
 });

 app.post('/create-civ', function(req, res) {

  User.findOne({
   'user.username': req.body.submitNewCiv
  }, function(err, user) {

   var myCiv = new Civilian()
   myCiv.updateCiv(req, res)
   myCiv.save(function(err, fluffy) {
    if (err) return console.error(err);
   });

  })
 });

 app.post('/create-vehicle', function(req, res) {

  User.findOne({
   'user.username': req.body.submitNewVeh
  }, function(err, user) {

   var myVeh = new Vehicle()
   myVeh.updateVeh(req, res)
   myVeh.save(function(err, fluffy) {
    if (err) return console.error(err);
   });

  })
 });

 app.get('/profile', auth, function(request, response) {
  var query = Friend.find({
   'friend.mainfriendid': request.user._id
  }, {
   'friend.anotherfriendid': 1
  });
  query.exec(function(err, friends) {

   if (!err) {
    var frdDetails = []

    async.each(friends,
     function(friend, callback) {
      if (friend.friend.anotherfriendid == '') {
       console.log('No Friend')
      } else {
       User.findById(friend.friend.anotherfriendid, function(err, user) {
        frdDetails.push(user.user.name + ', ' + user.user.address);
        callback();
       });
      }
     },
     function(err) {
      response.render('profile.html', {
       user: request.user,
       friends: frdDetails
      });
     }
    );
   } else {
    res.send(JSON.stringify(err), {
     'Content-Type': 'application/json'
    }, 404);
   }
  });

 });

 app.get('/search_member', function(req, res) {
  var regex = new RegExp(req.query["term"], 'i');

  var query = User.find({
   $and: [{
    'user.name': regex
   }, {
    _id: {
     $ne: req.user._id
    }
   }]
  }).limit(20);

  // Execute query in a callback and return users list
  query.exec(function(err, users) {
   if (!err) {
    // Method to construct the json result set

    res.send(users, {
     'Content-Type': 'application/json'
    }, 200);
   } else {
    res.send(JSON.stringify(err), {
     'Content-Type': 'application/json'
    }, 404);
   }
  });
 });

 app.post('/friend', function(request, response) {
  Friend.findOne({
   $and: [{
    'friend.mainfriendid': request.param('mainfriendid')
   }, {
    'friend.anotherfriendid': request.param('anotherfriendid')
   }]
  }, function(err, friend) {
   if (err) {
    return done(err);
   }
   if (friend) {
    response.redirect('/profile');

   } else {
    if (request.param('anotherfriendid') != '') {
     var newFriend = new Friend();
     newFriend.friend.mainfriendid = request.param('mainfriendid');
     newFriend.friend.anotherfriendid = request.param('anotherfriendid');
     newFriend.save();
    }
    response.redirect('/profile');
   }
  });
 });



 // GET /auth/facebook
 // Use passport.authenticate() as route middleware to authenticate the
 // request. The first step in Facebook authentication will involve
 // redirecting the user to facebook.com. After authorization, Facebook will
 // redirect the user back to this application at /auth/facebook/callback
 app.get('/auth/facebook',
  passport.authenticate('facebook', {
   scope: 'email'
  }));

 // GET /auth/facebook/callback
 // Use passport.authenticate() as route middleware to authenticate the
 // request. If authentication fails, the user will be redirected back to the
 // login page. Otherwise, the primary route function function will be called,
 // which, in this example, will redirect the user to the home page.
 app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
   successRedirect: '/facebook',
   failureRedirect: '/login'
  }));





 // GET /auth/twitter
 // Use passport.authenticate() as route middleware to authenticate the
 // request. The first step in Twitter authentication will involve redirecting
 // the user to twitter.com. After authorization, the Twitter will redirect
 // the user back to this application at /auth/twitter/callback
 app.get('/auth/twitter',
  passport.authenticate('twitter'));

 // GET /auth/twitter/callback
 // Use passport.authenticate() as route middleware to authenticate the
 // request. If authentication fails, the user will be redirected back to the
 // login page. Otherwise, the primary route function function will be called,
 // which, in this example, will redirect the user to the home page.
 app.get('/auth/twitter/callback',
  passport.authenticate('twitter', {
   successRedirect: '/twitter',
   failureRedirect: '/login'
  }));


 // GET /auth/google
 // Use passport.authenticate() as route middleware to authenticate the
 // request. The first step in Google authentication will involve
 // redirecting the user to google.com. After authorization, Google
 // will redirect the user back to this application at /auth/google/callback
 app.get('/auth/google',
  passport.authenticate('google', {
   scope: ['profile', 'email']
  }));

 // GET /auth/google/callback
 // Use passport.authenticate() as route middleware to authenticate the
 // request. If authentication fails, the user will be redirected back to the
 // login page. Otherwise, the primary route function function will be called,
 // which, in this example, will redirect the user to the home page.
 app.get('/auth/google/callback',
  passport.authenticate('google', {
   successRedirect: '/google',
   failureRedirect: '/login'
  }));


 var io = require('socket.io').listen(server);

 var usernames = {};

 io.sockets.on('connection', function(socket) {

  socket.on('adduser', function(username) {
   socket.username = username;
   usernames[username] = username;
   io.sockets.emit('updateusers', usernames);
  });

  socket.on('disconnect', function() {
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
