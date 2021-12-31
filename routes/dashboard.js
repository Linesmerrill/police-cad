var express = require('express');
var router = express.Router();

var User = require('../app/models/user');
var Civilian = require('../app/models/civilian');
var Vehicle = require('../app/models/vehicle');
var Firearm = require('../app/models/firearm');
var Community = require('../app/models/community');
var Ems = require('../app/models/ems');
var EmsVehicle = require('../app/models/emsVehicle');
var Bolo = require('../app/models/bolos');
var Call = require('../app/models/calls');

/* GET dashboard page */
router.get('/', function (req, res) {
    res.redirect('/');
});

router.get('/civ', function (req, res) {
    console.debug('yeah is this working?')
    console.debug('req.user', req.user)
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    req.user = {user: activeCommunity = "1234"}
    if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
      Civilian.find({
        'civilian.userID': req.user._id,
        '$or': [{ // some are stored as empty strings and others as null so we need to check for both
          'civilian.activeCommunityID': ''
        }, {
          'civilian.activeCommunityID': null
        }]
      }, function (err, dbPersonas) {
        if (err) return console.error(err);
        Vehicle.find({
          'vehicle.userID': req.user._id,
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'vehicle.activeCommunityID': ''
          }, {
            'vehicle.activeCommunityID': null
          }]
        }, function (err, dbVehicles) {
          if (err) return console.error(err);
          Firearm.find({
            'firearm.userID': req.user._id,
            '$or': [{ // some are stored as empty strings and others as null so we need to check for both
              'firearm.activeCommunityID': ''
            }, {
              'firearm.activeCommunityID': null
            }]
          }, function (err, dbFirearms) {
            if (err) return console.error(err);
            Community.find({
              '$or': [{
                'community.ownerID': req.user._id
              }, {
                '_id': req.user.user.activeCommunity
              }]
            }, function (err, dbCommunities) {
              if (err) return console.error(err);
              res.locals.user = req.user;
              res.locals.personas = dbPersonas;
              res.locals.vehicles = dbVehicles;
              res.locals.firearms = dbFirearms;
              res.locals.communities = dbCommunities;
              res.locals.context = context;
              res.locals.referer = encodeURIComponent('/dashboard/civ');
              res.locals.redirect = encodeURIComponent(process.env.CLIENT_REDIRECT);
              return res.render('civ-dashboard');
            });
          });
        });
      });
    } else {
      Civilian.find({
        'civilian.userID': req.user._id,
        'civilian.activeCommunityID': req.user.user.activeCommunity
      }, function (err, dbPersonas) {
        if (err) return console.error(err);
        Vehicle.find({
          'vehicle.userID': req.user._id,
          'vehicle.activeCommunityID': req.user.user.activeCommunity
        }, function (err, dbVehicles) {
          if (err) return console.error(err);

          Firearm.find({
            'firearm.userID': req.user._id,
            'firearm.activeCommunityID': req.user.user.activeCommunity
          }, function (err, dbFirearms) {
            if (err) return console.error(err);
            Community.find({
              '$or': [{
                'community.ownerID': req.user._id
              }, {
                '_id': req.user.user.activeCommunity
              }]
            }, function (err, dbCommunities) {
              if (err) return console.error(err);
              return res.render('civ-dashboard', {
                user: req.user,
                personas: dbPersonas,
                vehicles: dbVehicles,
                firearms: dbFirearms,
                communities: dbCommunities,
                context: context,
                referer: encodeURIComponent('/dashboard/civ'),
                redirect: encodeURIComponent(redirect)
              });
            });
          });
        });
      });
    }
  });

  router.get('/dashboard', authEms, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
      Ems.find({
        'ems.userID': req.user._id
      }, function (err, dbPersonas) {
        if (err) return console.error(err);
        EmsVehicle.find({
          'emsVehicle.userID': req.user._id,
        }, function (err, dbVehicles) {
          if (err) return console.error(err);
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            if (err) return console.error(err);
            return res.render('ems-dashboard', {
              user: req.user,
              personas: dbPersonas,
              vehicles: dbVehicles,
              communities: dbCommunities,
              context: context,
              referer: encodeURIComponent('/dashboard/ems'),
              redirect: encodeURIComponent(redirect)
            });
          });
        });
      })
    } else {
      Ems.find({
        'ems.userID': req.user._id,
        'ems.activeCommunityID': req.user.user.activeCommunity
      }, function (err, dbPersonas) {
        if (err) return console.error(err);
        EmsVehicle.find({
          'emsVehicle.userID': req.user._id,
          'emsVehicle.activeCommunityID': req.user.user.activeCommunity
        }, function (err, dbVehicles) {
          if (err) return console.error(err);
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            if (err) return console.error(err);
            return res.render('ems-dashboard', {
              user: req.user,
              personas: dbPersonas,
              vehicles: dbVehicles,
              communities: dbCommunities,
              context: context,
              referer: encodeURIComponent('/dashboard/ems'),
              redirect: encodeURIComponent(redirect)
            });
          });
        });
      })
    }
  });

  router.get('/community', authCommunity, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {

      Community.find({
        '$or': [{
          'community.ownerID': req.user._id
        }, {
          '_id': req.user.user.activeCommunity
        }]
      }, function (err, dbCommunities) {
        if (err) return console.error(err);
        return res.render('community-dashboard', {
          user: req.user,
          personas: null,
          vehicles: null,
          communities: dbCommunities,
          context: context,
          referer: encodeURIComponent('/dashboard/community'),
          redirect: encodeURIComponent(redirect)
        });
      });
    } else {
      Community.find({
        '$or': [{
          'community.ownerID': req.user._id
        }, {
          '_id': req.user.user.activeCommunity
        }]
      }, function (err, dbCommunities) {
        if (err) return console.error(err);
        return res.render('community-dashboard', {
          user: req.user,
          personas: null,
          vehicles: null,
          communities: dbCommunities,
          context: context,
          referer: encodeURIComponent('/dashboard/community'),
          redirect: encodeURIComponent(redirect)
        });
      });
    }
  });

  router.get('/police', authPolice, function (req, res) {
    // console.debug("req: ", req.user)
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    Community.find({
      '$or': [{
        'community.ownerID': req.user._id
      }, {
        '_id': req.user.user.activeCommunity
      }]
    }, function (err, dbCommunities) {
      if (err) return console.error(err);
      Bolo.find({
        'bolo.communityID': req.user.user.activeCommunity
      }, function (err, dbBolos) {
        if (err) return console.error(err);
        Call.find({
          'call.communityID': req.user.user.activeCommunity,
        }, function (err, dbCalls) {
          if (err) return console.error(err);
          return res.render('police-dashboard', {
            user: req.user,
            vehicles: null,
            civilians: null,
            firearms: null,
            tickets: null,
            arrestReports: null,
            warrants: null,
            communities: dbCommunities,
            bolos: dbBolos,
            calls: dbCalls,
            context: context,
            referer: encodeURIComponent('/dashboard/police'),
            redirect: encodeURIComponent(redirect)
          });
        });
      });
    });
  });

  router.get('/dispatch', authDispatch, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    Community.find({
      '$or': [{
        'community.ownerID': req.user._id
      }, {
        '_id': req.user.user.activeCommunity
      }]
    }, function (err, dbCommunities) {
      if (err) return console.error(err);
      Bolo.find({
        'bolo.communityID': req.user.user.activeCommunity
      }, function (err, dbBolos) {
        if (err) return console.error(err);
        if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
          return res.render('dispatch-dashboard', {
            user: req.user,
            vehicles: null,
            civilians: null,
            firearms: null,
            tickets: null,
            arrestReports: null,
            warrants: null,
            communities: dbCommunities,
            bolos: dbBolos,
            commUsers: null,
            calls: null,
            context: context,
            referer: encodeURIComponent('/dashboard/dispatch'),
            redirect: encodeURIComponent(redirect)
          });
        } else {
          User.find({
            'user.activeCommunity': req.user.user.activeCommunity
          }, function (err, dbCommUsers) {
            if (err) return console.error(err);
            Call.find({
              'call.communityID': req.user.user.activeCommunity
            }, function (err, dbCalls) {
              if (err) return console.error(err);
              return res.render('dispatch-dashboard', {
                user: req.user,
                vehicles: null,
                civilians: null,
                firearms: null,
                tickets: null,
                arrestReports: null,
                warrants: null,
                communities: dbCommunities,
                bolos: dbBolos,
                commUsers: dbCommUsers,
                calls: dbCalls,
                context: context,
                referer: encodeURIComponent('/dashboard/dispatch'),
                redirect: encodeURIComponent(redirect)
              });
            });
          });
        }
      });
    });
  });

  function authCivilian(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.render('login-civ', {
        message: req.flash('error')
    });
}

function authPolice(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.render('login-police', {
        message: req.flash('error')
    });
}

function authEms(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.render('login-ems', {
        message: req.flash('error')
    });
}

function authCommunity(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.render('login-community', {
        message: req.flash('error')
    });
}

function authDispatch(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.render('login-dispatch', {
        message: req.flash('error')
    });
}

module.exports = router;