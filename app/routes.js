var User = require('../app/models/user');
var Civilian = require('../app/models/civilian');
var Vehicle = require('../app/models/vehicle');
var Firearm = require('../app/models/firearm');
var EmsVehicle = require('../app/models/emsVehicle');
var Ticket = require('../app/models/ticket');
var Ems = require('../app/models/ems');
var ArrestReport = require('../app/models/arrestReport');
var Warrant = require('../app/models/warrants');
var Community = require('../app/models/community');
var Bolo = require('../app/models/bolos');
var Call = require('../app/models/calls');
var Medication = require('../app/models/medication');
var Condition = require('../app/models/medicalCondition');
var MedicalReport = require('../app/models/medicalReport');
var ObjectId = require('mongodb').ObjectID;
var nodemailer = require('nodemailer');
var nodemailerSendgrid = require('nodemailer-sendgrid');
var async = require('async');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var handlebars = require('handlebars');
var sanitize = require('mongo-sanitize');
var {
  promisify
} = require('util');
var readFile = promisify(fs.readFile);

module.exports = function (app, passport, server) {

  app.get('/', function (req, res) {
    res.render('index', {
      message: req.flash('info')
    });
  });

  app.get('/release-log', function (req, res) {
    res.render('release-log');
  });

  app.get('/about', function (req, res) {
    res.render('about');
  });

  app.get('/not-authorized', function (req, res) {
    res.render('not-authorized');
  });

  app.get('/map-interactive', function (req, res) {
    res.render('map-interactive');
  });

  app.get('/map', function (req, res) {
    res.render('map-popular')
  })

  app.get('/health', function (req, res) {
    res.render('health');
  });

  app.get('/rules', function (req, res) {
    res.render('rules');
  });

  app.get('/terms-and-conditions', function (req, res) {
    res.render('terms-and-conditions');
  });

  app.get('/privacy-policy', function (req, res) {
    res.render('privacy-policy');
  });

  app.get('/contact-us', function (req, res) {
    res.render('contact-us');
  });

  app.get('/penal-code', function (req, res) {
    res.render('penal-code');
  });

  app.get('/ads.txt', (req, res) => {
    res.set('Content-Type', 'text');
    let message = 'google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0'
    return res.send(new Buffer.alloc(message.length, 'google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0'))
  })

  app.get('/login', function (req, res) {
    return res.redirect('/');
  });

  app.get('/login-civ', authCivilian, function (req, res) {
    return res.redirect('civ-dashboard');
  });

  app.get('/login-police', authPolice, function (req, res) {
    return res.redirect('/police-dashboard')
  });

  app.get('/login-ems', authEms, function (req, res) {
    return res.redirect('/ems-dashboard')
  });

  app.get('/login-community', authCommunity, function (req, res) {
    return res.redirect('/community-dashboard')
  });

  app.get('/login-dispatch', authDispatch, function (req, res) {
    return res.redirect('/dispatch-dashboard')
  });

  app.get('/signup-civ', function (req, res) {
    return res.render('signup-civ', {
      message: req.flash('signuperror')
    });
  });

  app.get('/signup-police', function (req, res) {
    return res.render('signup-police', {
      message: req.flash('signuperror')
    });
  });

  app.get('/signup-ems', function (req, res) {
    return res.render('signup-ems', {
      message: req.flash('signuperror')
    });
  });

  app.get('/signup-community', function (req, res) {
    return res.render('signup-community', {
      message: req.flash('signuperror')
    });
  });

  app.get('/signup-dispatch', function (req, res) {
    return res.render('signup-dispatch', {
      message: req.flash('signuperror')
    });
  });

  app.get('/logout', function (req, res) {
    req.logout();
    return res.redirect('/');
  });

  app.get('/communities', auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (!exists(req.session.communityID)) {
      console.warn("cannot render empty communityID, route: /communities")
      res.status(400)
      return res.redirect('back')
    }
    var isValid = isValidObjectIdLength(req.session.communityID, "cannot lookup invalid length communityID, route: /communities")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('back')
    }
    Community.findOne({
      '_id': ObjectId(req.session.communityID),
      'community.ownerID': req.session.passport.user
    }, function (err, dbCommunities) {
      if (err) return console.error(err);
      if (!exists(dbCommunities)) {
        console.warn("cannot render empty communityID after searching community, route: /communities")
        res.status(400)
        return res.redirect('back')
      }
      User.find({
        'user.activeCommunity': req.session.communityID
      }, function (err, dbMembers) {
        if (err) return console.error(err);
        if (dbCommunities == null) {
          console.warn("cannot render empty communityID after searching users, route: /communities")
          res.status(400)
          return res.redirect('back')
        }
        return res.render('communities', {
          members: dbMembers,
          communities: dbCommunities,
          userID: req.session.passport.user,
          user: req.user
        });
      })
    })
  })

  app.get('/owned-communities', auth, function (req, res) {
    Community.find({
      'community.ownerID': req.session.passport.user
    }, function (err, dbCommunities) {
      if (err) return console.error(err);
      if (!exists(dbCommunities)) {
        console.warn("cannot render empty dbCommunity, route: /owned-communities")
        res.status(400)
        return res.redirect('back')
      }
      return res.render('communities-owned', {
        communities: dbCommunities,
        userID: req.session.passport.user,
        user: req.user
      });
    })
  })

  app.get('/forgot-password', function (req, res) {
    return res.render('forgot-password', {
      user: req.user,
      message: req.flash('emailSend')
    });
  });

  app.get('/reset/:token', function (req, res) {
    if (req.params.token && req.params.token != 'encryptedToken') {
      req.session.resetToken = req.params.token
      return res.redirect('/reset/encryptedToken')
    } else {
      User.findOne({
        'user.resetPasswordToken': req.session.resetToken,
        'user.resetPasswordExpires': {
          $gt: Date.now()
        }
      }, function (err, user) {
        if (err) return console.error(err);
        if (!user) {
          req.flash('emailSend', 'Password reset token is invalid or has expired.');
          return res.redirect('/forgot-password');
        }
        return res.render('reset', {
          user: req.user,
          message: req.flash('resetSend')
        });
      });
    }
  });

  app.get('/civ-dashboard', authCivilian, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
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
              return res.render('civ-dashboard', {
                user: req.user,
                personas: dbPersonas,
                vehicles: dbVehicles,
                firearms: dbFirearms,
                communities: dbCommunities,
                context: context
              });
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
                context: context
              });
            });
          });
        });
      });
    }
  });

  app.get('/ems-dashboard', authEms, function (req, res) {
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
              context: context
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
              context: context
            });
          });
        });
      })
    }
  });

  app.get('/community-dashboard', authCommunity, function (req, res) {
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
          context: context
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
          context: context
        });
      });
    }
  });

  app.get('/police-dashboard', authPolice, function (req, res) {
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
            context: context
          });
        });
      });
    });
  });

  app.get('/dispatch-dashboard', authDispatch, function (req, res) {
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
            context: context
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
                context: context
              });
            });
          });
        }
      });
    });
  });

  //This is gross and I know it :yolo:
  app.get('/name-search', auth, function (req, res) {
    if (req.query.route == 'dispatch-dashboard') {
      if (req.query.firstName == undefined || req.query.lastName == undefined) {
        res.status(400)
        return res.redirect('/dispatch-dashboard')
      }
      let firstName = sanitize(req.query.firstName.trim().toLowerCase());
      let lastName = sanitize(req.query.lastName.trim().toLowerCase());
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        if (req.query.dateOfBirth == undefined) {
          res.status(400)
          return res.redirect('/dispatch-dashboard')
        }
        Civilian.find({
          '$text': {'$search': `"${firstName}" "${lastName}"`},
          'civilian.birthday': req.query.dateOfBirth,
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'civilian.activeCommunityID': ''
          }, {
            'civilian.activeCommunityID': null
          }]
        }, function (err, dbCivilians) {
          if (err) return console.error(err);
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            if (err) return console.error(err);
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              if (err) return console.error(err);
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                if (err) return console.error(err);
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
                      if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                        return res.render('dispatch-dashboard', {
                          user: req.user,
                          vehicles: null,
                          civilians: dbCivilians,
                          firearms: null,
                          tickets: dbTickets,
                          arrestReports: dbArrestReports,
                          warrants: dbWarrants,
                          communities: dbCommunities,
                          commUsers: null,
                          bolos: dbBolos,
                          calls: dbCalls,
                          context: null
                        });
                      } else {
                        User.find({
                          'user.activeCommunity': req.user.user.activeCommunity
                        }, function (err, dbCommUsers) {
                          if (err) return console.error(err);
                          return res.render('dispatch-dashboard', {
                            user: req.user,
                            vehicles: null,
                            civilians: dbCivilians,
                            firearms: null,
                            tickets: dbTickets,
                            arrestReports: dbArrestReports,
                            warrants: dbWarrants,
                            communities: dbCommunities,
                            commUsers: dbCommUsers,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null
                          });
                        });
                      }
                    });
                  });
                })
              });
            });
          });
        });
      } else {
        Civilian.find({
          '$text': {'$search': `"${firstName}" "${lastName}"`},
          'civilian.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbCivilians) {
          if (err) return console.error(err);
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            if (err) return console.error(err);
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              if (err) return console.error(err);
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                if (err) return console.error(err);
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
                      if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                        return res.render('dispatch-dashboard', {
                          user: req.user,
                          vehicles: null,
                          civilians: dbCivilians,
                          firearms: null,
                          tickets: dbTickets,
                          arrestReports: dbArrestReports,
                          warrants: dbWarrants,
                          communities: dbCommunities,
                          bolos: dbBolos,
                          calls: dbCalls,
                          context: null
                        });
                      } else {
                        User.find({
                          'user.activeCommunity': req.user.user.activeCommunity
                        }, function (err, dbCommUsers) {
                          if (err) return console.error(err);
                          return res.render('dispatch-dashboard', {
                            user: req.user,
                            vehicles: null,
                            civilians: dbCivilians,
                            firearms: null,
                            tickets: dbTickets,
                            arrestReports: dbArrestReports,
                            warrants: dbWarrants,
                            communities: dbCommunities,
                            commUsers: dbCommUsers,
                            bolos: dbBolos,
                            calls: dbCalls,
                            context: null
                          });
                        });
                      }
                    });
                  });
                });
              });
            });
          });
        });
      }
    } else {
      if (req.query.firstName == undefined || req.query.lastName == undefined) {
        res.status(400)
        return res.redirect('/police-dashboard')
      }
      let firstName = sanitize(req.query.firstName.trim().toLowerCase());
      let lastName = sanitize(req.query.lastName.trim().toLowerCase());
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        if (req.query.dateOfBirth == undefined) {
          res.status(400)
          return res.redirect('/police-dashboard')
        }
        Civilian.find({
          '$text': {'$search': `"${firstName}" "${lastName}"`},
          'civilian.birthday': req.query.dateOfBirth,
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'civilian.activeCommunityID': ''
          }, {
            'civilian.activeCommunityID': null
          }]
        }, function (err, dbCivilians) {
          if (err) return console.error(err);
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            if (err) return console.error(err);
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              if (err) return console.error(err);
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                if (err) return console.error(err);
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
                        civilians: dbCivilians,
                        firearms: null,
                        tickets: dbTickets,
                        arrestReports: dbArrestReports,
                        warrants: dbWarrants,
                        communities: dbCommunities,
                        bolos: dbBolos,
                        calls: dbCalls,
                        context: null
                      });
                    });
                  });
                });
              });
            });
          });
        });
      } else {
        Civilian.find({
          '$text': {'$search': `"${firstName}" "${lastName}"`},
          'civilian.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbCivilians) {
          if (err) return console.error(err);
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            if (err) return console.error(err);
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              if (err) return console.error(err);
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                if (err) return console.error(err);
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
                        civilians: dbCivilians,
                        firearms: null,
                        tickets: dbTickets,
                        arrestReports: dbArrestReports,
                        warrants: dbWarrants,
                        communities: dbCommunities,
                        bolos: dbBolos,
                        calls: dbCalls,
                        context: null
                      });
                    });
                  });
                });
              });
            });
          });
        });
      }
    }
  })

  app.get('/plate-search', auth, function (req, res) {
    if (req.query.route == 'dispatch-dashboard') {
      if (req.query.plateNumber == undefined) {
        res.status(400)
        return res.redirect('/dispatch-dashboard')
      }
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'vehicle.activeCommunityID': ''
          }, {
            'vehicle.activeCommunityID': null
          }]
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
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              if (err) return console.error(err);
              Call.find({
                'call.communityID': req.user.user.activeCommunity,
              }, function (err, dbCalls) {
                if (err) return console.error(err);
                if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                  return res.render('dispatch-dashboard', {
                    user: req.user,
                    vehicles: dbVehicles,
                    civilians: null,
                    firearms: null,
                    tickets: null,
                    arrestReports: null,
                    warrants: null,
                    communities: dbCommunities,
                    commUsers: null,
                    bolos: dbBolos,
                    calls: dbCalls,
                    context: null
                  });
                } else {
                  User.find({
                    'user.activeCommunity': req.user.user.activeCommunity
                  }, function (err, dbCommUsers) {
                    if (err) return console.error(err);
                    return res.render('dispatch-dashboard', {
                      user: req.user,
                      vehicles: dbVehicles,
                      civilians: null,
                      firearms: null,
                      tickets: null,
                      arrestReports: null,
                      warrants: null,
                      communities: dbCommunities,
                      commUsers: dbCommUsers,
                      bolos: dbBolos,
                      calls: dbCalls,
                      context: null
                    });
                  });
                }
              });
            });
          });
        })
      } else {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
          'vehicle.activeCommunityID': req.query.activeCommunityID
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
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              if (err) return console.error(err);
              Call.find({
                'call.communityID': req.user.user.activeCommunity,
              }, function (err, dbCalls) {
                if (err) return console.error(err);
                if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                  return res.render('dispatch-dashboard', {
                    user: req.user,
                    vehicles: dbVehicles,
                    civilians: null,
                    firearms: null,
                    tickets: null,
                    arrestReports: null,
                    warrants: null,
                    communities: dbCommunities,
                    commUsers: null,
                    bolos: dbBolos,
                    calls: dbCalls,
                    context: null
                  });
                } else {
                  User.find({
                    'user.activeCommunity': req.user.user.activeCommunity
                  }, function (err, dbCommUsers) {
                    if (err) return console.error(err);
                    return res.render('dispatch-dashboard', {
                      user: req.user,
                      vehicles: dbVehicles,
                      civilians: null,
                      firearms: null,
                      tickets: null,
                      arrestReports: null,
                      warrants: null,
                      communities: dbCommunities,
                      commUsers: dbCommUsers,
                      bolos: dbBolos,
                      calls: dbCalls,
                      context: null
                    });
                  });
                }
              });
            });
          });
        })
      }
    } else {
      if (req.query.plateNumber == undefined) {
        res.status(400)
        return res.redirect('/police-dashboard')
      }
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'vehicle.activeCommunityID': ''
          }, {
            'vehicle.activeCommunityID': null
          }]
        }, function (err, dbVehicles) {
          if (err) return console.error(err);
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': ObjectId(req.user.user.activeCommunity)
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
                  civilians: null,
                  vehicles: dbVehicles,
                  firearms: null,
                  tickets: null,
                  arrestReports: null,
                  warrants: null,
                  communities: dbCommunities,
                  bolos: dbBolos,
                  calls: dbCalls,
                  context: null
                });
              });
            });
          });
        })
      } else {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
          'vehicle.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbVehicles) {
          if (err) return console.error(err);
          var isValid = isValidObjectIdLength(req.user.user.activeCommunity, "cannot lookup invalid length activeCommunityID, route: /plate-search")
          if (!isValid) {
            req.app.locals.specialContext = "invalidRequest";
            return res.redirect('/police-dashboard')
          }
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': ObjectId(req.user.user.activeCommunity)
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
                  civilians: null,
                  vehicles: dbVehicles,
                  firearms: null,
                  tickets: null,
                  arrestReports: null,
                  warrants: null,
                  communities: dbCommunities,
                  bolos: dbBolos,
                  calls: dbCalls,
                  context: null
                });
              });
            });
          });
        })
      }
    }
  });

  app.get('/firearm-search', auth, function (req, res) {
    // console.debug(req.query)
    if (req.query.route == 'dispatch-dashboard') {
      if (req.query.serialNumber == undefined) {
        res.status(400)
        return res.redirect('/dispatch-dashboard')
      }
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Firearm.find({
          'firearm.serialNumber': req.query.serialNumber.trim().toUpperCase(),
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
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              if (err) return console.error(err);
              Call.find({
                'call.communityID': req.user.user.activeCommunity,
              }, function (err, dbCalls) {
                if (err) return console.error(err);
                if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                  return res.render('dispatch-dashboard', {
                    user: req.user,
                    vehicles: null,
                    civilians: null,
                    firearms: dbFirearms,
                    tickets: null,
                    arrestReports: null,
                    warrants: null,
                    communities: dbCommunities,
                    commUsers: null,
                    bolos: dbBolos,
                    calls: dbCalls,
                    context: null
                  });
                } else {
                  User.find({
                    'user.activeCommunity': req.user.user.activeCommunity
                  }, function (err, dbCommUsers) {
                    if (err) return console.error(err);
                    return res.render('dispatch-dashboard', {
                      user: req.user,
                      vehicles: null,
                      firearms: dbFirearms,
                      civilians: null,
                      tickets: null,
                      arrestReports: null,
                      warrants: null,
                      communities: dbCommunities,
                      commUsers: dbCommUsers,
                      bolos: dbBolos,
                      calls: dbCalls,
                      context: null
                    });
                  });
                }
              });
            });
          });
        })
      } else {
        Firearm.find({
          'firearm.serialNumber': req.query.serialNumber.trim().toUpperCase(),
          'firearm.activeCommunityID': req.query.activeCommunityID
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
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              if (err) return console.error(err);
              Call.find({
                'call.communityID': req.user.user.activeCommunity,
              }, function (err, dbCalls) {
                if (err) return console.error(err);
                if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                  return res.render('dispatch-dashboard', {
                    user: req.user,
                    vehicles: null,
                    firearms: dbFirearms,
                    civilians: null,
                    tickets: null,
                    arrestReports: null,
                    warrants: null,
                    communities: dbCommunities,
                    commUsers: null,
                    bolos: dbBolos,
                    calls: dbCalls,
                    context: null
                  });
                } else {
                  User.find({
                    'user.activeCommunity': req.user.user.activeCommunity
                  }, function (err, dbCommUsers) {
                    if (err) return console.error(err);
                    return res.render('dispatch-dashboard', {
                      user: req.user,
                      vehicles: null,
                      firearms: dbFirearms,
                      civilians: null,
                      tickets: null,
                      arrestReports: null,
                      warrants: null,
                      communities: dbCommunities,
                      commUsers: dbCommUsers,
                      bolos: dbBolos,
                      calls: dbCalls,
                      context: null
                    });
                  });
                }
              });
            });
          });
        })
      }
    } else {
      if (req.query.serialNumber == undefined) {
        res.status(400)
        return res.redirect('/police-dashboard')
      }
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Firearm.find({
          'firearm.serialNumber': req.query.serialNumber.trim().toUpperCase(),
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
              '_id': ObjectId(req.user.user.activeCommunity)
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
                  civilians: null,
                  vehicles: null,
                  firearms: dbFirearms,
                  tickets: null,
                  arrestReports: null,
                  warrants: null,
                  communities: dbCommunities,
                  bolos: dbBolos,
                  calls: dbCalls,
                  context: null
                });
              });
            });
          });
        })
      } else {
        Firearm.find({
          'firearm.serialNumber': req.query.serialNumber.trim().toUpperCase(),
          'firearm.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbFirearms) {
          if (err) return console.error(err);
          var isValid = isValidObjectIdLength(req.user.user.activeCommunity, "cannot lookup invalid length activeCommunityID, route: /plate-search")
          if (!isValid) {
            req.app.locals.specialContext = "invalidRequest";
            return res.redirect('/police-dashboard')
          }
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': ObjectId(req.user.user.activeCommunity)
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
                  civilians: null,
                  vehicles: null,
                  firearms: dbFirearms,
                  tickets: null,
                  arrestReports: null,
                  warrants: null,
                  communities: dbCommunities,
                  bolos: dbBolos,
                  calls: dbCalls,
                  context: null
                });
              });
            });
          });
        })
      }
    }
  });

  app.get('/tickets', auth, function (req, res) {
    Ticket.find({
        'ticket.civID': req.query.civID
      },
      function (err, dbTickets) {
        if (err) return console.error(err);
        res.send(dbTickets)
      });
  })

  app.get('/arrests', auth, function (req, res) {
    ArrestReport.find({
        'arrestReport.accusedID': req.query.civID
      },
      function (err, dbArrests) {
        if (err) return console.error(err);
        res.send(dbArrests)
      });
  })

  app.get('/medical-reports', auth, function (req, res) {
    MedicalReport.find({
        'report.civilianID': req.query.civID,
      },
      function (err, dbReports) {
        if (err) return console.error(err);
        res.send(dbReports)
      });
  })

  app.get('/medications', auth, function (req, res) {
    Medication.find({
        'medication.civilianID': req.query.civID,
      },
      function (err, dbMedications) {
        if (err) return console.error(err);
        res.send(dbMedications)
      });
  })

  app.get('/conditions', auth, function (req, res) {
    Condition.find({
        'condition.civilianID': req.query.civID,
      },
      function (err, dbConditions) {
        if (err) return console.error(err);
        res.send(dbConditions)
      });
  })

  app.get('/medical-database', auth, function (req, res) {
    // console.debug("medical database server: ", req.query)

    //b/c people like to just search empty values, we do a little sanitation and checking here
    var fName;
    var medFName; //names are stored differently in the civilian and medical databases so we have to store 2 different values here
    var lName;
    var medLName; //names are stored differently in the civilian and medical databases so we have to store 2 different values here
    if (exists(req.query.firstName)) {
      fName = req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1);
      medFName = req.query.firstName.trim().toLowerCase();
    } else {
      console.error('cannot lookup medical database without firstName');
      res.status(400);
      return res.redirect('back');
    }
    if (exists(req.query.lastName)) {
      lName = req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1);
      medLName = req.query.lastName.trim().toLowerCase();
    } else {
      console.error('cannot lookup medical database without lastName');
      res.status(400);
      return res.redirect('back');
    }

    if (req.query.activeCommunityID == "" || req.query.activeCommunityID == null) {
      if (!exists(req.query.dateOfBirth)) {
        console.error('cannot lookup medical database without dateOfBirth');
        res.status(400);
        return res.redirect('back');
      }
      Civilian.find({
          'civilian.firstName': fName,
          'civilian.lastName': lName,
          'civilian.birthday': req.query.dateOfBirth,
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'civilian.activeCommunityID': ''
          }, {
            'civilian.activeCommunityID': null
          }]
        },
        function (err, dbCivilians) {
          if (err) return console.error(err);

          Medication.find({
              'medication.firstName': medFName,
              'medication.lastName': medLName,
              'medication.dateOfBirth': req.query.dateOfBirth.trim(), // if we get here, it means it exists so prob safe to trim()
              '$or': [{ // some are stored as empty strings and others as null so we need to check for both
                'civilian.activeCommunityID': ''
              }, {
                'civilian.activeCommunityID': null
              }]
            },
            function (err, dbMedications) {
              if (err) return console.error(err);
              Condition.find({
                  'condition.firstName': medFName,
                  'condition.lastName': medLName,
                  'condition.dateOfBirth': req.query.dateOfBirth.trim(),
                  '$or': [{ // some are stored as empty strings and others as null so we need to check for both
                    'civilian.activeCommunityID': ''
                  }, {
                    'civilian.activeCommunityID': null
                  }]
                },
                function (err, dbConditions) {
                  if (err) return console.error(err);
                  MedicalReport.find({
                      'report.firstName': medFName,
                      'report.lastName': medLName,
                      'report.dateOfBirth': req.query.dateOfBirth.trim(),
                      '$or': [{ // some are stored as empty strings and others as null so we need to check for both
                        'civilian.activeCommunityID': ''
                      }, {
                        'civilian.activeCommunityID': null
                      }]
                    },
                    function (err, dbReports) {
                      if (err) return console.error(err);
                      data = {
                        civilians: dbCivilians,
                        medications: dbMedications,
                        conditions: dbConditions,
                        reports: dbReports
                      }
                      res.send(data)
                    });
                });
            });
        })
    } else {
      Civilian.find({
          'civilian.firstName': fName,
          'civilian.lastName': lName,
          'civilian.activeCommunityID': req.query.activeCommunityID,
        },
        function (err, dbCivilians) {
          if (err) return console.error(err);
          Medication.find({
              'medication.firstName': medFName,
              'medication.lastName': medLName,
              'medication.activeCommunityID': req.query.activeCommunityID,
            },
            function (err, dbMedications) {
              if (err) return console.error(err);
              Condition.find({
                  'condition.firstName': medFName,
                  'condition.lastName': medLName,
                  'condition.activeCommunityID': req.query.activeCommunityID,
                },
                function (err, dbConditions) {
                  if (err) return console.error(err);
                  MedicalReport.find({
                      'report.firstName': medFName,
                      'report.lastName': medLName,
                      'report.activeCommunityID': req.query.activeCommunityID,
                    },
                    function (err, dbReports) {
                      if (err) return console.error(err);
                      data = {
                        civilians: dbCivilians,
                        medications: dbMedications,
                        conditions: dbConditions,
                        reports: dbReports
                      }
                      res.send(data)
                    });
                });
            });
        })
    }
  })

  app.delete('/reports/:id', auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (!isValidObjectIdLength(req.params.id, "cannot lookup invalid length condition id, route: /reports/:id")) {
      return
    }
    MedicalReport.findByIdAndDelete({
        '_id': ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status)
      });
  })

  app.delete('/medications/:id', auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (!isValidObjectIdLength(req.params.id, "cannot lookup invalid length condition id, route: /medications/:id")) {
      return
    }
    Medication.findByIdAndDelete({
        '_id': ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status)
      });
  })

  app.delete('/conditions/:id', auth, function (req, res) {
    // console.debug("req params: ", req.params)
    if (!isValidObjectIdLength(req.params.id, "cannot lookup invalid length condition id, route: /conditions/:id")) {
      return
    }
    Condition.findByIdAndDelete({
        '_id': ObjectId(req.params.id),
      },
      function (err, status) {
        if (err) return console.error(err);
        res.send(status)
      });
  })

  // Be sure to place all GET requests above this catchall
  app.get('*', function (req, res) {
    res.render('page-not-found');
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

  app.post('/login-ems', passport.authenticate('login', {
    successRedirect: '/ems-dashboard',
    failureRedirect: '/login-ems',
    failureFlash: true
  }));

  app.post('/login-community', passport.authenticate('login', {
    successRedirect: '/community-dashboard',
    failureRedirect: '/login-community',
    failureFlash: true
  }));

  app.post('/login-dispatch', passport.authenticate('login', {
    successRedirect: '/dispatch-dashboard',
    failureRedirect: '/login-dispatch',
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

  app.post('/signup-ems', passport.authenticate('signup', {
    successRedirect: '/ems-dashboard',
    failureRedirect: '/signup-ems',
    failureFlash: true
  }));

  app.post('/signup-community', passport.authenticate('signup', {
    successRedirect: '/community-dashboard',
    failureRedirect: '/signup-community',
    failureFlash: true
  }));

  app.post('/signup-dispatch', passport.authenticate('signup', {
    successRedirect: '/dispatch-dashboard',
    failureRedirect: '/signup-dispatch',
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
        if (!exists(req.body.email)) {
          req.flash('emailSend', 'Please enter a valid Email address and try again (error code: #1000)')
          return res.redirect('/forgot-password');
        }
        if (req.body.email.trim().length < 1) {
          req.flash('emailSend', 'Please enter a valid Email address and try again')
          return res.redirect('/forgot-password');
        }
        User.findOne({
          'user.email': req.body.email.toLowerCase()
        }, function (err, users) {
          if (err) return console.error(err);
          if (!users) {
            req.flash('emailSend', 'If this e-mail exists, then an email has been sent to \'' + req.body.email.toLowerCase() + '\' with a link to change the password.');
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
        var smtpTransport = nodemailer.createTransport(
          nodemailerSendgrid({
            apiKey: process.env.MAIL_API_KEY
          })
        );
        fs.
        readFile('resetPassword.html', 'utf8', function (err, htmlData) {
          if (err) {
            console.error("failed to read file: ", err)
            return res.redirect('back')
          }
          let template = handlebars.compile(htmlData);
          let data = {
            resetLink: process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token,
            sentTo: users.user.email.toLowerCase()
          }
          let htmlToSend = template(data)
          var mailOptions = {
            to: users.user.email.toLowerCase(),
            from: process.env.FROM_EMAIL,
            subject: 'Lines Police CAD Reset Password',
            html: htmlToSend
          }
          smtpTransport.sendMail(mailOptions, function (err) {
            req.flash('emailSend', 'If this e-mail exists, then an email has been sent to ' + users.user.email.toLowerCase() + ' with a link to change the password.');
            done(err, 'done');
          });
        });
      }
    ], function (err) {
      if (err) return next(err);
      res.render('forgot-password', {
        message: req.flash('emailSend')
      });
    });
  });

  app.post('/reset/:token', function (req, res) {
    var token = req.session.resetToken

    async.waterfall([
      function (done) {
        User.findOne({
          'user.resetPasswordToken': token,
          'user.resetPasswordExpires': {
            $gt: Date.now()
          }
        }, function (err, users) {
          if (err) return console.error(err);
          if (!users) {
            req.flash('resetSend', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          var user = users;
          user.user.password = user.generateHash(req.body.password);
          user.user.resetPasswordToken = undefined;
          user.user.resetPasswordExpires = undefined;

          user.save(function (err) {
            done(err, user);
          });
        });
      },
      function (users, done) {
        var smtpTransport = nodemailer.createTransport(
          nodemailerSendgrid({
            apiKey: process.env.MAIL_API_KEY
          })
        );
        fs.
        readFile('passwordHasBeenReset.html', 'utf8', function (err, htmlData) {
          if (err) {
            console.error("failed to read file: ", err)
            return res.redirect('back')
          }
          let template = handlebars.compile(htmlData);
          let data = {
            sentTo: users.user.email.toLowerCase()
          }
          let htmlToSend = template(data)
          var mailOptions = {
            to: users.user.email.toLowerCase(),
            from: process.env.FROM_EMAIL,
            subject: 'Lines Police CAD Password Has Been Reset',
            html: htmlToSend
          }

          smtpTransport.sendMail(mailOptions, function (err) {
            req.flash('info', 'Success! Your password has been changed.');
            done(err);
          });
        });
      }
    ], function (err) {
      return res.redirect('/');
    });
  });

  app.post('/create-civ', auth, function (req, res) {
    var myCiv = new Civilian()
    myCiv.updateCiv(req, res)
    myCiv.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-ems', auth, function (req, res) {
    var myEms = new Ems()
    myEms.create(req, res)
    myEms.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-vehicle', auth, function (req, res) {
    var myVeh = new Vehicle()
    myVeh.createVeh(req, res)
    myVeh.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-firearm', auth, function (req, res) {
    var myFirearm = new Firearm()
    myFirearm.createFirearm(req, res)
    myFirearm.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-ems-vehicle', auth, function (req, res) {
    var myVeh = new EmsVehicle()
    myVeh.createVeh(req, res)
    myVeh.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-ticket', auth, function (req, res) {
    var myTicket = new Ticket()
    myTicket.updateTicket(req, res)
    myTicket.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-medication', auth, function (req, res) {
    var myMedication = new Medication()
    myMedication.createMedication(req, res)
    myMedication.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-condition', auth, function (req, res) {
    var myCondition = new Condition()
    myCondition.createCondition(req, res)
    myCondition.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-medical-report', auth, function (req, res) {
    var myReport = new MedicalReport()
    myReport.createReport(req, res)
    myReport.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-arrest-report', auth, function (req, res) {
    var myArrestReport = new ArrestReport()
    myArrestReport.updateArrestReport(req, res)
    myArrestReport.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-warrant', auth, function (req, res) {
    var myWarrant = new Warrant()
    myWarrant.createWarrant(req, res)
    myWarrant.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/clear-warrant', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.body.warrantID, "cannot lookup invalid length warrantID, route: /clear-warrant")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('/' + req.body.route)
    }
    Warrant.findByIdAndUpdate({
      '_id': ObjectId(req.body.warrantID)
    }, {
      $set: {
        'warrant.updatedDate': req.body.updatedDate,
        'warrant.updatedTime': req.body.updatedTime,
        'warrant.clearingOfficer': req.body.clearingOfficer,
        'warrant.status': false
      }
    }, function (err) {
      if (err) return console.error(err);
      return res.redirect('/' + req.body.route);
    })
  });

  app.post('/create-bolo', auth, function (req, res) {
    // console.debug('create bolo req: ', req.body)
    var myBolo = new Bolo()
    myBolo.createBolo(req, res)
    myBolo.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/clear-bolo', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.body.boloID, "cannot lookup invalid length boloID, route: /clear-bolo")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('/' + req.body.route)
    }
    Bolo.findByIdAndDelete({
      '_id': ObjectId(req.body.boloID)
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "clearBoloSuccess"
      return res.redirect('/' + req.body.route);
    })
  });

  app.post('/create-call', auth, function (req, res) {
    var myCall = new Call()
    myCall.createCall(req, res)
    myCall.save(function (err, dbCalls) {
      if (err) return console.error(err);
    });
  });

  app.post('/joinCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var communityCode = req.body.communityCode.trim()
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      return res.redirect('back');
    }
    Community.findOne({
      'community.code': req.body.communityCode.toUpperCase()
    }, function (err, community) {
      if (err) return console.error(err);
      if (community == null) {
        req.app.locals.specialContext = "noCommunityFound";
        return res.redirect('back');
      }
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /joinCommunity")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('back');
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': community._id
        }
      }, function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "joinCommunitySuccess";
        return res.redirect('back');
      })
    })
  })

  app.post('/leaveActiveCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /leaveActiveCommunity")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('back')
    }
    User.findOneAndUpdate({
      '_id': ObjectId(req.body.userID),
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "leaveCommunitySuccess";
      return res.redirect('back');
    })
  })

  app.post('/joinPoliceCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var communityCode = req.body.communityCode.trim()
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      return res.redirect('/' + req.body.route)
    }
    Community.findOne({
      'community.code': req.body.communityCode.toUpperCase()
    }, function (err, community) {
      if (err) return console.error(err);
      if (community == null) {
        req.app.locals.specialContext = "noCommunityFound";
        return res.redirect('/' + req.body.route);
      }
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /joinPoliceCommunity")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect(req.body.route)
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': community._id
        }
      }, function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "joinCommunitySuccess";
        return res.redirect('/' + req.body.route);
      })
    })
  })

  app.post('/leavePoliceActiveCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /leavePoliceActiveCommunity")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect(req.body.route)
    }
    User.findOneAndUpdate({
      '_id': ObjectId(req.body.userID),
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "leaveCommunitySuccess";
      return res.redirect('/' + req.body.route);
    })
  })

  app.post('/joinEmsCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var communityCode = req.body.communityCode.trim()
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      return res.redirect('/ems-dashboard');
    }
    Community.findOne({
      'community.code': req.body.communityCode.toUpperCase()
    }, function (err, community) {
      if (err) return console.error(err);
      if (community == null) {
        req.app.locals.specialContext = "noCommunityFound";
        return res.redirect('/ems-dashboard');
      }
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /leavePoliceActiveCommunity")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/ems-dashboard')
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': community._id
        }
      }, function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "joinCommunitySuccess";
        return res.redirect('/ems-dashboard');
      })
    })
  })

  app.post('/leaveEmsActiveCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /leaveEmsActiveCommunity")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect("/ems-dashboard")
    }
    User.findOneAndUpdate({
      '_id': ObjectId(req.body.userID),
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "leaveCommunitySuccess";
      return res.redirect('/ems-dashboard');
    })
  })

  app.post('/createCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var myCommunity = new Community()
    myCommunity.createCommunity(req, res)
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /createCommunity")
      if (!isValid) {
        return req.app.locals.specialContext = "invalidRequest";
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': result._id
        }
      }, function (err) {
        if (err) return console.error(err);
        return req.app.locals.specialContext = "createCommunitySuccess"
      })
    });
  })

  app.post('/createPoliceCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var myCommunity = new Community()
    myCommunity.createPoliceCommunity(req, res)
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /createPoliceCommunity")
      if (!isValid) {
        return req.app.locals.specialContext = "invalidRequest";
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': result._id
        }
      }, function (err) {
        if (err) return console.error(err);
        return req.app.locals.specialContext = "createCommunitySuccess";
      })
    });
  })

  app.post('/createEmsCommunity', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var myCommunity = new Community()
    myCommunity.createEmsCommunity(req, res)
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /createEmsCommunity")
      if (!isValid) {
        return req.app.locals.specialContext = "invalidRequest";
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': result._id
        }
      }, function (err) {
        if (err) return console.error(err);
        return req.app.locals.specialContext = "createCommunitySuccess";
      })
    });
  })

  app.post('/manageAccount', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var page = req.body.page;
    if (req.body.action === 'updateUsername') {
      var username
      if (exists(req.body.accountUsername)) {
        username = req.body.accountUsername.trim()
      }
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /manageAccount")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('back')
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.username': username,
          'user.updatedAt': new Date()
        }
      }, function (err) {
        if (err) {
          console.error(err);
        }
        return res.redirect('back')
      })
    } else if (req.body.action === 'updateCallSign') {
      var callSign
      if (exists(req.body.accountCallSign)) {
        callSign = req.body.accountCallSign.trim()
      }
      var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /manageAccount")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('back')
      }
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.callSign': callSign,
          'user.updatedAt': new Date()
        }
      }, function (err) {
        if (err) {
          console.error(err);
        }
        return res.redirect('back')
      })
    } else {
      return res.redirect('back')
    }
  })

  app.post('/deleteAccount', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var page = req.body.page;
    // grab all civilians and delete arrest, tickets and warrants for each
    Civilian.find({
      'civilian.userID': req.body.userID
    }, function (err, cursor) {
      if (err) return console.error(err);
      cursor.forEach(element => {
        ArrestReport.deleteMany({
          'arrestReport.accusedID': element._id
        }, function (err) {
          if (err) return console.error(err);
          Ticket.deleteMany({
            'ticket.civID': element._id
          }, function (err) {
            if (err) return console.error(err);
            Warrant.deleteMany({
              'warrant.accusedID': element._id
            }, function (err) {
              if (err) {
                console.error(err);
                return res.redirect('back')
              }
            })
          })
        })
      });
      // delete civilians
      Civilian.deleteMany({
        'civilian.userID': req.body.userID
      }, function (err) {
        // delete communities
        Community.deleteMany({
          'community.ownerID': req.body.userID
        }, function (err) {
          // delete ems
          Ems.deleteMany({
            'ems.userID': req.body.userID
          }, function (err) {
            // delete emsVehicles
            EmsVehicle.deleteMany({
              'emsVehicle.userID': req.body.userID
            }, function (err) {
              // delete vehicles
              Vehicle.deleteMany({
                'vehicle.userID': req.body.userID
              }, function (err) {
                // delete user
                var isValid = isValidObjectIdLength(req.body.userID, "cannot lookup invalid length userID, route: /deleteAccount")
                if (!isValid) {
                  req.app.locals.specialContext = "invalidRequest";
                  return res.redirect('/')
                }
                User.findByIdAndDelete({
                  '_id': ObjectId(req.body.userID),
                }, function (err) {
                  if (err) {
                    console.error(err);
                    return res.redirect(page);
                  }
                  return res.redirect('/');
                })
              })
            })
          })
        })
      })
    })
  })

  app.post('/updateOrDeleteBolo', auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (req.body.action === "delete") {
      var boloID
      if (exists(req.body.boloID)) {
        boloID = req.body.boloID
      }
      var isValid = isValidObjectIdLength(boloID, "cannot lookup invalid length boloID, route: /updateOrDeleteBolo")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/' + req.body.route)
      }
      Bolo.findByIdAndDelete({
        '_id': ObjectId(boloID)
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/' + req.body.route);
      })
    } else {
      var boloType
      var location
      var description
      var boloID
      if (exists(req.body.boloType)) {
        boloType = req.body.boloType.trim().toLowerCase()
      }
      if (exists(req.body.location)) {
        location = req.body.location.trim()
      }
      if (exists(req.body.description)) {
        description = req.body.description.trim()
      }
      if (exists(req.body.boloID)) {
        boloID = req.body.boloID
      } else {
        console.warn("cannot update or delete non-existent boloID: ", req.body.boloID);
        return res.redirect('/' + req.body.route);

      }
      var isValid = isValidObjectIdLength(boloID, "cannot lookup invalid length boloID, route: /updateOrDeleteBolo")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/' + req.body.route);
      }
      Bolo.findOneAndUpdate({
        '_id': ObjectId(boloID)
      }, {
        $set: {
          'bolo.boloType': boloType,
          'bolo.location': location,
          'bolo.description': description,
          'bolo.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/' + req.body.route);
      })
    }
  })

  app.post('/updateOrDeleteCall', auth, function (req, res) {
    // console.debug("received a request:", req.body)

    req.app.locals.specialContext = null;
    if (req.body.action === "delete") {
      var callID
      if (exists(req.body.callID)) {
        callID = req.body.callID
      }
      var isValid = isValidObjectIdLength(callID, "cannot lookup invalid length callID, route: /updateOrDeleteCall")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/' + req.body.route)
      }
      Call.findByIdAndDelete({
        '_id': ObjectId(callID)
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/' + req.body.route);
      })
    } else if (req.body.action === "update") {
      var shortDescription
      var assignedOfficers
      var callNotes
      var callID
      if (exists(req.body.shortDescription)) {
        shortDescription = req.body.shortDescription.trim()
      }
      if (exists(req.body.assignedOfficers)) {
        assignedOfficers = req.body.assignedOfficers
      }
      if (exists(req.body.callNotes)) {
        callNotes = req.body.callNotes.trim()
      }

      if (exists(req.body.callID)) {
        callID = req.body.callID
      } else {
        console.warn("cannot update or delete non-existent callID: ", req.body.callID);
        return res.redirect('/' + req.body.route);
      }
      var isValid = isValidObjectIdLength(callID, "cannot lookup invalid length callID, route: /updateOrDeleteCall")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/' + req.body.route);
      }
      Call.findOneAndUpdate({
        '_id': ObjectId(callID)
      }, {
        $set: {
          'call.shortDescription': shortDescription,
          'call.assignedOfficers': assignedOfficers,
          'call.callNotes': callNotes,
          'call.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/' + req.body.route);
      })
    } else {
      var callID
      if (exists(req.body.callID)) {
        callID = req.body.callID
      } else {
        console.warn("cannot update or delete non-existent callID: ", req.body.callID);
        return res.redirect('/' + req.body.route);
      }
      var isValid = isValidObjectIdLength(callID, "cannot lookup invalid length callID, route: /updateOrDeleteCall")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/' + req.body.route);
      }
      Call.findOneAndUpdate({
        '_id': ObjectId(callID)
      }, {
        $set: {
          'call.status': false,
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/' + req.body.route);
      })
    }
  })

  app.post('/updateOrDeleteCiv', auth, function (req, res) {
    // console.debug(req.body)
    req.app.locals.specialContext = null;
    if (req.body.action === "update") {
      var address
      var occupation
      var firearmLicense
      var gender
      var heightClassification
      var height
      var weightClassification
      var weight
      var eyeColor
      var hairColor
      var organDonor
      var veteran
      if (exists(req.body.address)) {
        address = req.body.address.trim()
      }
      if (exists(req.body.occupation)) {
        occupation = req.body.occupation.trim()
      }
      if (exists(req.body.firearmLicense)) {
        firearmLicense = req.body.firearmLicense
      }
      if (exists(req.body.gender)) {
        gender = req.body.gender
      }
      // height classification: imperial or metric, imperial will have 2 inputs and metric will have one
      if (exists(req.body.heightClassification)) {
        heightClassification = req.body.heightClassification;
        // if user has selected 'imperial', then we should calculate USA maths for height
        // else just grab whatever value was passed in for height
        if (req.body.heightClassification === 'imperial') {
          // because the USA is dumb, we gotta do some quick-maths to convert ft and inches to a single number :fml:
          height = generateHeight(req.body.heightFoot, req.body.heightInches)
        } else {
          if (exists(req.body.heightCentimeters)) {
            height = req.body.heightCentimeters;
          }
        }
      }
      // weight classification: imperial or metric, both will have a single input
      if (exists(req.body.weightImperial) && req.body.weightImperial !== '') {
        weight = req.body.weightImperial;
      } else if (exists(req.body.weightMetric) && req.body.weightMetric !== '') {
        weight = req.body.weightMetric;
      }
      if (exists(req.body.eyeColor)) {
        eyeColor = req.body.eyeColor
      }
      if (exists(req.body.hairColor)) {
        hairColor = req.body.hairColor
      }
      if (exists(req.body.heightClassification)) {
        heightClassification = req.body.heightClassification
      }
      if (exists(req.body.weightClassification)) {
        weightClassification = req.body.weightClassification
      }
      if (exists(req.body.organDonor)) {
        organDonor = (req.body.organDonor === 'on') ? true : false;
      }
      if (exists(req.body.veteran)) {
        veteran = (req.body.veteran === 'on') ? true : false;
      }
      var isValid = isValidObjectIdLength(req.body.civilianID, "cannot lookup invalid length civilianID, route: /updateOrDeleteCiv")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      Civilian.findByIdAndUpdate({
        '_id': ObjectId(req.body.civilianID)
      }, {
        $set: {
          //basic civ details
          "civilian.firstName": req.body.firstName.trim().charAt(0).toUpperCase() + req.body.firstName.trim().slice(1),
          "civilian.lastName": req.body.lastName.trim().charAt(0).toUpperCase() + req.body.lastName.trim().slice(1),
          'civilian.birthday': req.body.birthday,
          'civilian.address': address,
          'civilian.occupation': occupation,
          //advanced civ details
          'civilian.gender': gender,
          'civilian.heightClassification': heightClassification,
          'civilian.height': height,
          'civilian.weightClassification': weightClassification,
          'civilian.weight': weight,
          'civilian.eyeColor': eyeColor,
          'civilian.hairColor': hairColor,
          'civilian.organDonor': organDonor,
          'civilian.veteran': veteran,
          //additional civ details
          'civilian.warrants': req.body.warrants,
          'civilian.licenseStatus': (req.body.licenseStatus ? '1' : '3'),
          'civilian.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/civ-dashboard');
      })
    } else if (req.body.action == "createLicense") {
      var isValid = isValidObjectIdLength(req.body.civilianID, "cannot lookup invalid length civilianID, route: /updateOrDeleteCiv")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      Civilian.findByIdAndUpdate({
        '_id': ObjectId(req.body.civilianID)
      }, {
        $set: {
          'civilian.licenseStatus': '1',
          'civilian.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/civ-dashboard');
      })
    } else if (req.body.action == "deleteLicense") {
      var isValid = isValidObjectIdLength(req.body.civilianID, "cannot lookup invalid length civilianID, route: /updateOrDeleteCiv")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      Civilian.findByIdAndUpdate({
        '_id': ObjectId(req.body.civilianID)
      }, {
        $set: {
          'civilian.licenseStatus': '3',
          'civilian.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/civ-dashboard');
      })
    } else {
      var isValid = isValidObjectIdLength(req.body.civilianID, "cannot lookup invalid length civilianID, route: /updateOrDeleteCiv")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      Civilian.findByIdAndDelete({
        '_id': ObjectId(req.body.civilianID)
      }, function (err) {
        Ticket.deleteMany({
          'ticket.civID': req.body.civilianID
        }, function (err) {
          if (err) return console.error(err);
          ArrestReport.deleteMany({
            'arrest.accusedID': req.body.civilianID
          }, function (err) {
            if (err) return console.error(err);
            MedicalReport.deleteMany({
              'report.civilianID': req.body.civilianID
            }, function (err) {
              if (err) return console.error(err);
              Medication.deleteMany({
                'medication.civilianID': req.body.civilianID
              }, function (err) {
                if (err) return console.error(err);
                Condition.deleteMany({
                  'condition.civilianID': req.body.civilianID
                }, function (err) {
                  if (err) return console.error(err);
                  return res.redirect('/civ-dashboard');
                })
              })
            })
          })
        })
      })
    }
  })

  app.post('/deleteEms', auth, function (req, res) {
    var nameArray = req.body.removeEms.split(' ')
    var firstName = nameArray[0]
    var lastName = nameArray[1]
    Ems.deleteOne({
      'ems.firstName': firstName,
      'ems.lastName': lastName
    }, function (err) {
      if (err) return console.error(err);
      res.redirect('/ems-dashboard');
    })
  })

  app.post('/updateOrDeleteVeh', auth, function (req, res) {
    req.app.locals.specialContext = null;
    if (req.body.action === "update") {
      if (!exists(req.body.vehicleID)) {
        console.warn("cannot update vehicle with empty vehicleID, route: /updateOrDeleteVeh")
        return res.redirect('/civ-dashboard');
      }
      if (!exists(req.body.roVeh)) {
        req.body.roVeh = 'N/A'
      }
      if (req.body.vehicleID.length != 24) {
        console.warn("cannot delete vehicle with invalid vehicleID, route: /updateOrDeleteVeh", req.body.vehicleID)
        return res.redirect('/civ-dashboard');
      }
      var isValid = isValidObjectIdLength(req.body.vehicleID, "cannot lookup invalid length vehicleID, route: /updateOrDeleteVeh")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      if (!exists(req.body.vinVeh)) {
        req.body.vinVeh = ""
      }
      Vehicle.findByIdAndUpdate({
        '_id': ObjectId(req.body.vehicleID)
      }, {
        $set: {
          "vehicle.plate": req.body.plateVeh.trim().toUpperCase(),
          "vehicle.vin": req.body.vinVeh.trim().toUpperCase(),
          "vehicle.model": req.body.modelVeh.trim().charAt(0).toUpperCase() + req.body.modelVeh.trim().slice(1),
          'vehicle.color': req.body.colorView.trim().charAt(0).toUpperCase() + req.body.colorView.trim().slice(1),
          'vehicle.validRegistration': req.body.validRegView,
          'vehicle.validInsurance': req.body.validInsView,
          'vehicle.registeredOwner': req.body.roVeh.trim(),
          'vehicle.isStolen': req.body.stolenView,
          'vehicle.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/civ-dashboard');
      })
    } else {
      if (!exists(req.body.vehicleID)) {
        console.warn("cannot delete vehicle with empty vehicleID, route: /updateOrDeleteVeh")
        return res.redirect('/civ-dashboard');
      }
      if (req.body.vehicleID.length != 24) {
        console.warn("cannot delete vehicle with invalid vehicleID, route: /updateOrDeleteVeh", req.body.vehicleID)
        return res.redirect('/civ-dashboard');
      }
      var isValid = isValidObjectIdLength(req.body.vehicleID, "cannot lookup invalid length vehicleID, route: /updateOrDeleteVeh")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      Vehicle.findByIdAndDelete({
        '_id': ObjectId(req.body.vehicleID)
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/civ-dashboard');
      })
    }
  })

  app.post('/updateOrDeleteFirearm', auth, function (req, res) {
    // console.debug('update or delete firearm body: ', req.body)
    req.app.locals.specialContext = null;
    if (req.body.action === "update") {
      if (!exists(req.body.firearmID)) {
        console.warn("cannot update firearm with empty firearmID, route: /updateOrDeleteFirearm")
        return res.redirect('/civ-dashboard');
      }
      if (!exists(req.body.registeredOwner)) {
        req.body.registeredOwner = 'N/A'
      }
      // hacky af, goal here is to separate the person_id from the person name and dob.
      // example: 5eeaebb7e23cba396869becb+Rodger Pike | DOB: 2001-01-01
      // caveat here being that if the name includes a "+" then it will incorrectly split
      // and probably cause problems. TODO: fix this edge case.
      if (req.body.registeredOwner.includes("+")) {
        let idPlusRegisteredOwner = req.body.registeredOwner.split("+")
        if (idPlusRegisteredOwner.length == 2) {
          req.body.registeredOwner = idPlusRegisteredOwner[1];
          req.body.registeredOwnerID = idPlusRegisteredOwner[0];
        } else {
          console.error(`invalid split on 'req.body.registeredOwner': ${req.body.registeredOwner}. Does not contain an array of length 2. Split value: ${idPlusRegisteredOwner}`)
        }
      } else if (req.body.registeredOwner == 'N/A') {
        // do nothing, this is acceptable
      } else {
        console.error(`error on req.body.registeredOwner: ${req.body.registeredOwner}. Does not contain a '+'.`)
      }
      var isValid = isValidObjectIdLength(req.body.firearmID, "cannot lookup invalid length firearmID, route: /updateOrDeleteFirearm")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      Firearm.findOneAndUpdate({
        '_id': ObjectId(req.body.firearmID),
      }, {
        $set: {
          "firearm.serialNumber": req.body.serialNumber,
          "firearm.weaponType": req.body.weaponType,
          'firearm.registeredOwner': req.body.registeredOwner,
          'firearm.registeredOwnerID': req.body.registeredOwnerID,
          'firearm.isStolen': req.body.isStolen,
          'firearm.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/civ-dashboard');
      })
    } else {
      if (!exists(req.body.firearmID)) {
        console.warn("cannot delete firearm with empty firearmID, route: /updateOrDeleteFirearm")
        return res.redirect('/civ-dashboard');
      }
      var isValid = isValidObjectIdLength(req.body.firearmID, "cannot lookup invalid length firearmID, route: /updateOrDeleteFirearm")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('/civ-dashboard')
      }
      Firearm.deleteOne({
        '_id': ObjectId(req.body.firearmID),
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('/civ-dashboard');
      })
    }
  })

  app.post('/updateUserDispatchStatus', auth, function (req, res) {
    // console.debug(req.body)
    req.app.locals.specialContext = null;
    if (!exists(req.body.userID) || req.body.userID == '') {
      console.error('cannot update an empty userID')
      res.status(400)
      return res.redirect('back');
    } else if (!exists(req.body.status) || req.body.status == '') {
      console.error('cannot update an empty status')
      res.status(400)
      return res.redirect('back');
    }
    var isValid = isValidObjectIdLength(req.body.userID, "cannot delete vehicle with invalid userID, route: /updateUserDispatchStatus")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('back')
    }
    User.findByIdAndUpdate({
      '_id': ObjectId(req.body.userID)
    }, {
      $set: {
        'user.dispatchStatus': req.body.status,
        'user.dispatchStatusSetBy': 'dispatch'
      }
    }, function (err) {
      if (err) return console.error(err)
      return res.redirect('back')
    })
  })

  app.post('/deleteEmsVeh', auth, function (req, res) {
    // console.debug(req.body)
    var isValid = isValidObjectIdLength(req.body.vehicleID, "cannot lookup invalid length vehicleID, route: /deleteEmsVeh")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('back')
    }
    EmsVehicle.findByIdAndDelete({
      '_id': ObjectId(req.body.vehicleID)
    }, function (err) {
      if (err) return console.error(err);
      return res.redirect('/ems-dashboard');
    })
  })

  app.post('/community', auth, function (req, res) {
    // console.debug("community req: ", req.body)
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.body.memberID, "cannot lookup invalid length memberID, route: /community")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('back')
    }
    User.findByIdAndUpdate({
      '_id': ObjectId(req.body.memberID)
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      return res.redirect('back')
    })
  })

  app.post('/delete-community', auth, function (req, res) {
    req.app.locals.specialContext = null;
    User.updateMany({
      'user.activeCommunity': req.body.communityID
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      var isValid = isValidObjectIdLength(req.body.communityID, "cannot lookup invalid length communityID, route: /delete-community")
      if (!isValid) {
        req.app.locals.specialContext = "invalidRequest";
        return res.redirect('back')
      }
      Community.findByIdAndDelete({
        '_id': ObjectId(req.body.communityID)
      }, function (err) {
        if (err) return console.error(err);
        return res.redirect('back')
      })
    })
  })

  app.post('/updateCommunityName', auth, function (req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.body.communityID, "cannot lookup invalid length communityID, route: /updateCommunityName")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      return res.redirect('back')
    }
    Community.findByIdAndUpdate({
      '_id': ObjectId(req.body.communityID)
    }, {
      $set: {
        'community.name': req.body.updatedName
      }
    }, function (err) {
      if (err) return console.error(err);
      return res.redirect('back')
    })
  })

  app.post('/communities', auth, function (req, res) {
    req.session.communityID = req.body.communityID
    return res.redirect('communities')
  })

  var io = require('socket.io').listen(server);

  io.sockets.on('connection', (socket) => {

    socket.on("disconnect", function () {});

    socket.on('load_statuses', (user) => {
      if (user.user.activeCommunity != null && user.user.activeCommunity != undefined) {
        User.find({
          'user.activeCommunity': user.user.activeCommunity
        }, function (err, dbCommUsers) {
          if (err) return console.error(err);
          return socket.emit('load_status_result', dbCommUsers)
        });
      }
    })

    socket.on('load_dispatch_bolos', (user) => {
      if (user.user.activeCommunity != null && user.user.activeCommunity != undefined) {
        Bolo.find({
          'bolo.communityID': user.user.activeCommunity
        }, function (err, dbBolos) {
          if (err) return console.error(err);
          return socket.emit('load_dispatch_bolos_result', dbBolos)
        });
      }
    });

    socket.on('load_dispatch_calls', (user) => {
      if (user.user.activeCommunity != null && user.user.activeCommunity != undefined) {
        Call.find({
          'call.communityID': user.user.activeCommunity
        }, function (err, dbCalls) {
          if (err) return console.error(err);
          return socket.emit('load_dispatch_calls_result', dbCalls)
        });
      }
    });

    socket.on('get_call_by_id', (callID) => {
      if (!isValidObjectIdLength(callID)) {
        return console.error(`invalid call ID length for socket: get_call_by_id, callID: ${callID}`)
      }
      Call.findById({
        '_id': ObjectId(callID)
      }, function (err, dbCalls) {
        if (err) return console.error(err)
        return socket.emit('load_call_by_id_result', dbCalls);
      })
    })

    socket.on('load_police_bolos', (user) => {
      if (user.user.activeCommunity != null && user.user.activeCommunity != undefined) {
        Bolo.find({
          'bolo.communityID': user.user.activeCommunity
        }, function (err, dbBolos) {
          if (err) return console.error(err);
          return socket.emit('load_police_bolos_result', dbBolos)
        });
      }
    });

    socket.on('update_bolo_info', (req) => {
      // console.debug('update req backend: ', req)
      var boloType
      var location
      var description
      var boloID
      if (exists(req.boloType)) {
        boloType = req.boloType.trim().toLowerCase()
      }
      if (exists(req.location)) {
        location = req.location.trim()
      }
      if (exists(req.description)) {
        description = req.description.trim()
      }
      if (exists(req.boloID)) {
        boloID = req.boloID
      } else {
        return console.warn("cannot update or delete non-existent boloID: ", req.boloID);
      }
      var isValid = isValidObjectIdLength(boloID, "cannot lookup invalid length boloID, socket: update_bolo_info")
      if (!isValid) {
        return
      }
      Bolo.findOneAndUpdate({
        '_id': ObjectId(boloID)
      }, {
        $set: {
          'bolo.boloType': boloType,
          'bolo.location': location,
          'bolo.description': description,
          'bolo.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        return socket.broadcast.emit('updated_bolo', req)
      })

    })

    socket.on('delete_bolo_info', (req) => {
      // console.debug('delete req backend: ', req)
      var boloID
      if (exists(req.boloID) && req.boloID.length != 0) {
        boloID = req.boloID
      }
      var isValid = isValidObjectIdLength(boloID, "cannot lookup invalid length boloID, socket: delete_bolo_info")
      if (!isValid) {
        return

      }
      Bolo.findByIdAndDelete({
        '_id': ObjectId(boloID)
      }, function (err) {
        if (err) return console.error(err);
        return socket.broadcast.emit('deleted_bolo', req)
      })
    })

    socket.on('update_status', (req) => {
      // console.debug('update req: ', req)
      if (!exists(req.userID) || req.userID == '') {
        return console.error('cannot update an empty userID')
      } else if (!exists(req.status) || req.status == '') {
        return console.error('cannot update an empty status')
      }
      if (req.updateDuty) {
        var isValid = isValidObjectIdLength(req.userID, "cannot lookup invalid length userID, socket: update_status")
        if (!isValid) {
          return
        }
        User.findByIdAndUpdate({
          '_id': ObjectId(req.userID)
        }, {
          $set: {
            'user.dispatchStatus': req.status,
            'user.dispatchStatusSetBy': req.setBy,
            'user.dispatchOnDuty': req.onDuty
          }
        }, function (err) {
          if (err) return console.error(err)
          return socket.broadcast.emit('updated_status', req)
        })
      } else {
        var isValid = isValidObjectIdLength(req.userID, "cannot lookup invalid length userID, socket: update_status")
        if (!isValid) {
          return
        }
        User.findByIdAndUpdate({
          '_id': ObjectId(req.userID)
        }, {
          $set: {
            'user.dispatchStatus': req.status,
            'user.dispatchStatusSetBy': req.setBy,
          }
        }, function (err) {
          if (err) return console.error(err)
          return socket.broadcast.emit('updated_status', req)
        })
      }
    })

    socket.on('load_panic_statuses', (req) => {
      // console.debug('load panic status req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(req.activeCommunity, "cannot lookup invalid length activeCommunity, socket: load_panic_statuses")
        if (!isValid) {
          return
        }
        Community.findById({
          '_id': ObjectId(req.activeCommunity)
        }, function (err, resp) {
          if (err) return console.error(err)
          if (resp != null) {
            if (resp.community != null) {
              // console.debug("resp", resp)
              // console.debug("resp.community", resp.community)
              return socket.broadcast.emit('load_panic_status_update', resp.community.activePanics, resp.community.activeSignal100, req)
            }
          }
        })
      }
    })

    socket.on('panic_button_update', (req) => {
      // console.debug('panic button update req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var values = {
          userId: req.userID,
          username: req.userUsername,
          activeCommunityID: req.activeCommunity
        };
        var isValid = isValidObjectIdLength(req.activeCommunity, "cannot lookup invalid length activeCommunity, socket: panic_button_update")
        if (!isValid) {
          return
        }
        Community.findById({
          '_id': ObjectId(req.activeCommunity)
        }, function (err, resp) {
          if (err) return console.error(err)
          if (resp != null) {
            if (resp.community != null) {
              if (resp.community.activePanics == undefined || resp.community.activePanics == null) {
                var mapInsert = new Map();
                mapInsert.set(req.userID, values)
                var isValid = isValidObjectIdLength(req.activeCommunity, "cannot lookup invalid length activeCommunity, socket: panic_button_update")
                if (!isValid) {
                  return
                }
                Community.findByIdAndUpdate({
                  '_id': ObjectId(req.activeCommunity)
                }, {
                  $set: {
                    'community.activePanics': mapInsert
                  }
                }, function (err) {
                  if (err) return console.error(err)
                  return socket.broadcast.emit('panic_button_updated', mapInsert, req)
                })
              } else {
                if (resp.community.activePanics.get(req.userID) == undefined) {
                  resp.community.activePanics.set(req.userID, values)
                  var isValid = isValidObjectIdLength(req.activeCommunity, "cannot lookup invalid length activeCommunity, socket: panic_button_update")
                  if (!isValid) {
                    return
                  }
                  Community.findByIdAndUpdate({
                    '_id': ObjectId(req.activeCommunity)
                  }, {
                    $set: {
                      'community.activePanics': resp.community.activePanics
                    }
                  }, function (err) {
                    if (err) return console.error(err)
                    return socket.broadcast.emit('panic_button_updated', resp.community.activePanics, req)

                  })
                } else {
                  return socket.broadcast.emit('panic_button_updated', resp.community.activePanics, req)
                }

              }
            }
          }
        })
      }
    })

    socket.on('clear_panic', (req) => {
      // console.debug("clear req", req)
      if (req.communityID != null && req.communityID != undefined) {
        var isValid = isValidObjectIdLength(req.communityID, "cannot lookup invalid length communityID, socket: clear_panic")
        if (!isValid) {
          return
        }
        Community.findById({
          '_id': ObjectId(req.communityID)
        }, function (err, resp) {
          if (err) return console.error(err);
          if (resp != null) {
            if (resp.community != null) {
              if (resp.community.activePanics != null) {
                resp.community.activePanics.delete(req.userID)
                var isValid = isValidObjectIdLength(req.communityID, "cannot lookup invalid length communityID, socket: clear_panic")
                if (!isValid) {
                  return
                }
                Community.findByIdAndUpdate({
                  '_id': ObjectId(req.communityID)
                }, {
                  $set: {
                    'community.activePanics': resp.community.activePanics
                  }
                }, function (err) {
                  if (err) return console.error(err);
                  return socket.broadcast.emit('cleared_panic', req)
                })
              }
            }
          }
        })
      }
    })

    socket.on('signal_100_button_update', (req) => {
      // console.debug('signal 100 button update req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(req.activeCommunity, "cannot lookup invalid length activeCommunity, socket: signal_100_button_update")
        if (!isValid) {
          return
        }
        Community.findById({
          '_id': ObjectId(req.activeCommunity)
        }, function (err, resp) {
          if (err) return console.error(err)
          if (resp != null) {
            if (resp.community != null) {
              Community.findByIdAndUpdate({
                '_id': ObjectId(req.activeCommunity)
              }, {
                $set: {
                  'community.activeSignal100': true
                }
              }, function (err) {
                if (err) return console.error(err)
                return socket.broadcast.emit('signal_100_button_updated', req)
              })
            }
          }
        })
      }
    })

    socket.on('clear_signal_100', (activeCommunity) => {
      // console.debug('signal 100 clear button update req: ', activeCommunity)
      if (activeCommunity != null && activeCommunity != undefined) {
        var isValid = isValidObjectIdLength(activeCommunity, "cannot lookup invalid length activeCommunity, socket: clear_signal_100")
        if (!isValid) {
          return
        }
        Community.findById({
          '_id': ObjectId(activeCommunity)
        }, function (err, resp) {
          if (err) return console.error(err)
          if (resp != null) {
            if (resp.community != null) {
              Community.findByIdAndUpdate({
                '_id': ObjectId(activeCommunity)
              }, {
                $set: {
                  'community.activeSignal100': false
                }
              }, function (err) {
                if (err) return console.error(err)
                return socket.broadcast.emit('clear_signal_100_updated', activeCommunity)
              })
            }
          }
        })
      }
    })

    socket.on('create_bolo', (req) => {
      // console.debug('create bolo socket: ', req)
      var myBolo = new Bolo()
      myBolo.socketCreateBolo(req)
      myBolo.save(function (err, dbBolos) {
        if (err) return console.error(err);
        return socket.broadcast.emit('created_bolo', dbBolos)
      });
    })

    socket.on('create_call', (req) => {
      // console.debug('create call socket: ', req)
      var myCall = new Call()
      myCall.socketCreateCall(req)
      myCall.save(function (err, dbCalls) {
        if (err) return console.error(err);
        return socket.broadcast.emit('created_call', dbCalls)
      });
    })

    socket.on('create_911_call', (req) => {
      // console.debug('create new 911 call socket: ', req)
      var myNew911Call = new Call()
      myNew911Call.socketCreate911Call(req)
      myNew911Call.save(function (err, dbCalls) {
        if (err) return console.error(err);
        socket.broadcast.emit('created_call', dbCalls)
        return socket.emit('created_911_call', dbCalls)
      });
    })

    socket.on('clear_call', (req) => {
      // console.debug('clear call socket: ', req)
      return socket.broadcast.emit('cleared_call', req) //send to all listeners except the sender (ref https://stackoverflow.com/a/38026094/9392066)
    })

    socket.on('update_panic_btn_sound', (user) => {
      // console.debug('update panic button sound status: ', user)
      if (user != null && user != undefined) {
        if (user._id != null && user._id != undefined) {
          User.findById({
            '_id': ObjectId(user._id)
          }, function (err, dbUser) {
            if (err) return console.error(err);
            User.findByIdAndUpdate({
              '_id': ObjectId(user._id)
            }, {
              'user.panicButtonSound': !dbUser.user.panicButtonSound
            }, function (err, dbUserUpdtd) {
              if (err) return console.error(err);
              return socket.emit('load_panic_btn_result', dbUserUpdtd)
            })
          });
        }
      }
    });

    socket.on('update_drivers_license_status', (user) => {
      // console.debug('update revoke drivers license status: ', user._id)
      if (user != null && user != undefined) {
        if (user._id != null && user._id != undefined) {
          Civilian.findByIdAndUpdate({
            '_id': ObjectId(user._id)
          }, {
            'civilian.licenseStatus': user.status
          }, function (err, dbUser) {
            if (err) return console.error(err);
            return socket.emit('load_updated_drivers_license_status_result', dbUser)
          })
        }
      }
    });

    socket.on('get_reg_arm', (req) => {
      if (req.regOwnerID != null && req.regOwnerID != undefined) {
        if (req.communityID == '' || req.communityID == null) {
          // if they are not in a community, we don't allow them to use this functionality
        } else {
          Firearm.find({
            'firearm.registeredOwnerID': req.regOwnerID,
            'firearm.activeCommunityID': req.communityID
          }, function (err, dbFirearms) {
            // console.debug("returned from db, dbFirearms: ", dbFirearms)
            if (err) return console.error(err);
            return socket.emit('load_reg_arm_result', dbFirearms)
          });
        }
      }
    });

    socket.on('get_reg_veh', (req) => {
      // console.debug("inside get_reg_veh socket: ", req)
      if (req.regOwner != null && req.regOwner != undefined && req.regOwnerID != null && req.regOwnerID != undefined) {
        if (req.communityID == '' || req.communityID == null) {
          Vehicle.find({
            '$or': [{ // vehicles created after 1/30/2021 will be assigned to an ownerID, older records will have to use owner name and dob
              'vehicle.registeredOwnerID': req.regOwnerID
            }, {
              'vehicle.registeredOwner': req.regOwner
            }],
            '$or': [{ // some are stored as empty strings and others as null so we need to check for both
              'vehicle.activeCommunityID': ''
            }, {
              'vehicle.activeCommunityID': null
            }]
          }, function (err, dbVehicles) {
            if (err) return console.error(err);
            return socket.emit('load_reg_veh_result', dbVehicles)
          });
        } else {
          Vehicle.find({
            '$or': [{ // vehicles created after 1/30/2021 will be assigned to an ownerID, older records will have to use owner name and dob
              'vehicle.registeredOwnerID': req.regOwnerID
            }, {
              'vehicle.registeredOwner': req.regOwner
            }],
            'vehicle.activeCommunityID': req.communityID
          }, function (err, dbVehicles) {
            if (err) return console.error(err);
            return socket.emit('load_reg_veh_result', dbVehicles)
          });
        }
      }
    });

    socket.on('create_new_civ', (req) => {
      // console.debug('create new civ socket: ', req)
      var myNewCiv = new Civilian()
      myNewCiv.socketCreateCiv(req)
      myNewCiv.save(function (err, dbCivilians) {
        if (err) return console.error(err);
        return socket.emit('created_new_civ', dbCivilians)
      });
    })

    socket.on('lookup_civ_by_id', (req) => {
      // console.debug('lookup civ socket: ', req)
      if (exists(req.civID)) {
        Civilian.findById({
          '_id': ObjectId(req.civID)
        }, function (err, dbCiv) {
          if (err) return console.error(err);
          return socket.emit('load_civ_by_id_result', dbCiv) //send message only to sender-client (ref https://stackoverflow.com/a/38026094/9392066)
        })
      }
    });

  }); //end of sockets

}; //end of routes

function auth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401);
  return res.render('not-authorized');
}

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

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}

function isValidObjectIdLength(value, errorMessage) {
  if (value != null && value != undefined) {
    if (value.length != 24) {
      console.warn(errorMessage + ",", "id: " + value)
      return false
    } else {
      return true
    }
  } else {
    console.warn("cannot check length of null value: ", value)
    return false
  }
}

function generateHeight(heightFoot, heightInches) {
  if (exists(heightFoot) && !exists(heightInches)) {
    //if only foot exists, then just convert to inches and store in DB
    return parseInt(heightFoot) * 12;
  }
  if (exists(heightFoot) && exists(heightInches)) {
    //if foot and inches exist, we want to convert to inches to store in DB
    return parseInt(heightFoot) * 12 + parseInt(heightInches);
  }
  if (!exists(heightFoot) && exists(heightInches)) {
    //if foot doesn't exist but inches exists, simple maths
    return parseInt(heightInches)
  }
}