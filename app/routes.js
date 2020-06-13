var User = require('../app/models/user');
var Civilian = require('../app/models/civilian');
var Vehicle = require('../app/models/vehicle');
var EmsVehicle = require('../app/models/emsVehicle');
var Ticket = require('../app/models/ticket');
var Ems = require('../app/models/ems');
var ArrestReport = require('../app/models/arrestReport');
var Warrant = require('../app/models/warrants');
var Community = require('../app/models/community');
var Bolo = require('../app/models/bolos');
var ObjectId = require('mongodb').ObjectID;
var nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

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

  app.get('/ads.txt', (req, res) => {
    res.set('Content-Type', 'text');
    let message = 'google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0'
    return res.send(new Buffer.alloc(message.length, 'google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0'))
  })

  app.get('/login', function (req, res) {
    res.redirect('/');
  });

  app.get('/login-civ', authCivilian, function (req, res) {
    res.redirect('civ-dashboard');
  });

  app.get('/login-police', authPolice, function (req, res) {
    res.redirect('/police-dashboard')
  });

  app.get('/login-ems', authEms, function (req, res) {
    res.redirect('/ems-dashboard')
  });

  app.get('/login-dispatch', authDispatch, function (req, res) {
    res.redirect('/dispatch-dashboard')
  });

  app.get('/signup-civ', function (req, res) {
    res.render('signup-civ', {
      message: req.flash('signuperror')
    });
  });

  app.get('/signup-police', function (req, res) {
    res.render('signup-police', {
      message: req.flash('signuperror')
    });
  });

  app.get('/signup-ems', function (req, res) {
    res.render('signup-ems', {
      message: req.flash('signuperror')
    });
  });

  app.get('/signup-dispatch', function (req, res) {
    res.render('signup-dispatch', {
      message: req.flash('signuperror')
    });
  });

  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  app.get('/communities', auth, function (req, res) {
    if (!exists(req.session.communityID)) {
      console.warn("cannot render empty communityID, route: /communities")
      res.redirect('back')
      return
    }
    Community.findOne({
      '_id': ObjectId(req.session.communityID),
      'community.ownerID': req.session.passport.user
    }, function (err, dbCommunities) {
      if (!exists(dbCommunities)) {
        console.warn("cannot render empty communityID after searching community, route: /communities")
        res.redirect('back')
        return
      }
      User.find({
        'user.activeCommunity': req.session.communityID
      }, function (err, dbMembers) {
        if (err) return console.error(err);
        if (dbCommunities == null) {
          console.warn("cannot render empty communityID after searching users, route: /communities")
          res.redirect('back')
          return
        }
        res.render('communities', {
          members: dbMembers,
          communities: dbCommunities,
          userID: req.session.passport.user
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
        return res.redirect('back')
      }
      res.render('communities-owned', {
        communities: dbCommunities,
        userID: req.session.passport.user
      });
    })
  })

  app.get('/forgot-password', function (req, res) {
    res.render('forgot-password', {
      user: req.user,
      message: req.flash('emailSend')
    });
  });

  app.get('/reset/:token', function (req, res) {
    User.findOne({
      'user.resetPasswordToken': req.params.token,
      'user.resetPasswordExpires': {
        $gt: Date.now()
      }
    }, function (err, user) {
      if (!user) {
        req.flash('emailSend', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot-password');
      }
      res.render('reset', {
        user: req.user,
        message: req.flash('resetSend')
      });
    });
  });

  app.get('/civ-dashboard', auth, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
      Civilian.find({
        'civilian.email': req.user.user.email.toLowerCase(),
      }, function (err, dbPersonas) {
        Vehicle.find({
          'vehicle.email': req.user.user.email.toLowerCase(),
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            res.render('civ-dashboard', {
              user: req.user,
              personas: dbPersonas,
              vehicles: dbVehicles,
              communities: dbCommunities,
              context: context
            });
          });
        });
      });
    } else {
      Civilian.find({
        'civilian.email': req.user.user.email.toLowerCase(),
        'civilian.activeCommunityID': req.user.user.activeCommunity
      }, function (err, dbPersonas) {
        Vehicle.find({
          'vehicle.email': req.user.user.email.toLowerCase(),
          'vehicle.activeCommunityID': req.user.user.activeCommunity
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            res.render('civ-dashboard', {
              user: req.user,
              personas: dbPersonas,
              vehicles: dbVehicles,
              communities: dbCommunities,
              context: context
            });
          });
        });
      });
    }
  });

  app.get('/ems-dashboard', auth, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
      Ems.find({
        'ems.email': req.user.user.email.toLowerCase(),
      }, function (err, dbPersonas) {
        EmsVehicle.find({
          'emsVehicle.email': req.user.user.email.toLowerCase(),
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            res.render('ems-dashboard', {
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
        'ems.email': req.user.user.email.toLowerCase(),
        'ems.activeCommunityID': req.user.user.activeCommunity
      }, function (err, dbPersonas) {
        EmsVehicle.find({
          'emsVehicle.email': req.user.user.email.toLowerCase(),
          'emsVehicle.activeCommunityID': req.user.user.activeCommunity
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            res.render('ems-dashboard', {
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

  app.get('/police-dashboard', auth, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    Community.find({
      '$or': [{
        'community.ownerID': req.user._id
      }, {
        '_id': req.user.user.activeCommunity
      }]
    }, function (err, dbCommunities) {
      Bolo.find({
        'bolo.communityID': req.user.user.activeCommunity
      }, function (err, dbBolos) {
        res.render('police-dashboard', {
          user: req.user,
          vehicles: null,
          civilians: null,
          tickets: null,
          arrestReports: null,
          warrants: null,
          communities: dbCommunities,
          bolos: dbBolos,
          context: context
        });
      });
    });
  });

  app.get('/dispatch-dashboard', auth, function (req, res) {
    var context = req.app.locals.specialContext;
    req.app.locals.specialContext = null;
    Community.find({
      '$or': [{
        'community.ownerID': req.user._id
      }, {
        '_id': req.user.user.activeCommunity
      }]
    }, function (err, dbCommunities) {
      Bolo.find({
        'bolo.communityID': req.user.user.activeCommunity
      }, function (err, dbBolos) {
        if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
          res.render('dispatch-dashboard', {
            user: req.user,
            vehicles: null,
            civilians: null,
            tickets: null,
            arrestReports: null,
            warrants: null,
            communities: dbCommunities,
            bolos: dbBolos,
            commUsers: null,
            context: context
          });
        } else {
          User.find({
            'user.activeCommunity': req.user.user.activeCommunity
          }, function (err, dbCommUsers) {
            res.render('dispatch-dashboard', {
              user: req.user,
              vehicles: null,
              civilians: null,
              tickets: null,
              arrestReports: null,
              warrants: null,
              communities: dbCommunities,
              bolos: dbBolos,
              commUsers: dbCommUsers,
              context: context
            });
          });
        }
      });
    });
  });

  //This is gross and I know it :yolo:
  app.get('/name-search', auth, function (req, res) {
    if (req.query.route == 'dispatch-dashboard') {
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Civilian.find({
          'civilian.firstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
          'civilian.lastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
          'civilian.birthday': req.query.dateOfBirth,
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'civilian.activeCommunityID': ''
          }, {
            'civilian.activeCommunityID': null
          }]
        }, function (err, dbCivilians) {
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                Community.find({
                  '$or': [{
                    'community.ownerID': req.user._id
                  }, {
                    '_id': req.user.user.activeCommunity
                  }]
                }, function (err, dbCommunities) {
                  Bolo.find({
                    'bolo.communityID': req.user.user.activeCommunity
                  }, function (err, dbBolos) {
                    if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                      res.render('dispatch-dashboard', {
                        user: req.user,
                        vehicles: null,
                        civilians: dbCivilians,
                        tickets: dbTickets,
                        arrestReports: dbArrestReports,
                        warrants: dbWarrants,
                        communities: dbCommunities,
                        commUsers: null,
                        bolos: dbBolos,
                        context: null
                      });
                    } else {
                      User.find({
                        'user.activeCommunity': req.user.user.activeCommunity
                      }, function (err, dbCommUsers) {
                        res.render('dispatch-dashboard', {
                          user: req.user,
                          vehicles: null,
                          civilians: dbCivilians,
                          tickets: dbTickets,
                          arrestReports: dbArrestReports,
                          warrants: dbWarrants,
                          communities: dbCommunities,
                          commUsers: dbCommUsers,
                          bolos: dbBolos,
                          context: null
                        });
                      });
                    }
                  });
                })
              });
            });
          });
        });
      } else {
        Civilian.find({
          'civilian.firstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
          'civilian.lastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
          'civilian.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbCivilians) {
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                Community.find({
                  '$or': [{
                    'community.ownerID': req.user._id
                  }, {
                    '_id': req.user.user.activeCommunity
                  }]
                }, function (err, dbCommunities) {
                  Bolo.find({
                    'bolo.communityID': req.user.user.activeCommunity
                  }, function (err, dbBolos) {
                    if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                      res.render('dispatch-dashboard', {
                        user: req.user,
                        vehicles: null,
                        civilians: dbCivilians,
                        tickets: dbTickets,
                        arrestReports: dbArrestReports,
                        warrants: dbWarrants,
                        communities: dbCommunities,
                        commUsers: null,
                        bolos: dbBolos,
                        context: null
                      });
                    } else {
                      User.find({
                        'user.activeCommunity': req.user.user.activeCommunity
                      }, function (err, dbCommUsers) {
                        res.render('dispatch-dashboard', {
                          user: req.user,
                          vehicles: null,
                          civilians: dbCivilians,
                          tickets: dbTickets,
                          arrestReports: dbArrestReports,
                          warrants: dbWarrants,
                          communities: dbCommunities,
                          commUsers: dbCommUsers,
                          bolos: dbBolos,
                          context: null
                        });
                      });
                    }
                  });
                })
              });
            });
          });
        });
      }
    } else {
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Civilian.find({
          'civilian.firstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
          'civilian.lastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
          'civilian.birthday': req.query.dateOfBirth,
          '$or': [{ // some are stored as empty strings and others as null so we need to check for both
            'civilian.activeCommunityID': ''
          }, {
            'civilian.activeCommunityID': null
          }]
        }, function (err, dbCivilians) {
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                Community.find({
                  '$or': [{
                    'community.ownerID': req.user._id
                  }, {
                    '_id': req.user.user.activeCommunity
                  }]
                }, function (err, dbCommunities) {
                  Bolo.find({
                    'bolo.communityID': req.user.user.activeCommunity
                  }, function (err, dbBolos) {
                    res.render('police-dashboard', {
                      user: req.user,
                      vehicles: null,
                      civilians: dbCivilians,
                      tickets: dbTickets,
                      arrestReports: dbArrestReports,
                      warrants: dbWarrants,
                      communities: dbCommunities,
                      bolos: dbBolos,
                      context: null
                    });
                  });
                });
              });
            });
          });
        });
      } else {
        Civilian.find({
          'civilian.firstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
          'civilian.lastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
          'civilian.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbCivilians) {
          Ticket.find({
            'ticket.civFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
            'ticket.civLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
          }, function (err, dbTickets) {
            ArrestReport.find({
              'arrestReport.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
              'arrestReport.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1)
            }, function (err, dbArrestReports) {
              Warrant.find({
                'warrant.accusedFirstName': req.query.firstName.trim().charAt(0).toUpperCase() + req.query.firstName.trim().slice(1),
                'warrant.accusedLastName': req.query.lastName.trim().charAt(0).toUpperCase() + req.query.lastName.trim().slice(1),
                'warrant.status': true
              }, function (err, dbWarrants) {
                Community.find({
                  '$or': [{
                    'community.ownerID': req.user._id
                  }, {
                    '_id': req.user.user.activeCommunity
                  }]
                }, function (err, dbCommunities) {
                  Bolo.find({
                    'bolo.communityID': req.user.user.activeCommunity
                  }, function (err, dbBolos) {
                    res.render('police-dashboard', {
                      user: req.user,
                      vehicles: null,
                      civilians: dbCivilians,
                      tickets: dbTickets,
                      arrestReports: dbArrestReports,
                      warrants: dbWarrants,
                      communities: dbCommunities,
                      bolos: dbBolos,
                      context: null
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
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                res.render('dispatch-dashboard', {
                  user: req.user,
                  vehicles: dbVehicles,
                  civilians: null,
                  tickets: null,
                  arrestReports: null,
                  warrants: null,
                  communities: dbCommunities,
                  commUsers: null,
                  bolos: dbBolos,
                  context: null
                });
              } else {
                User.find({
                  'user.activeCommunity': req.user.user.activeCommunity
                }, function (err, dbCommUsers) {
                  res.render('dispatch-dashboard', {
                    user: req.user,
                    vehicles: dbVehicles,
                    civilians: null,
                    tickets: null,
                    arrestReports: null,
                    warrants: null,
                    communities: dbCommunities,
                    commUsers: dbCommUsers,
                    bolos: dbBolos,
                    context: null
                  });
                });
              }
            });
          });
        })
      } else {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
          'vehicle.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              if (req.user.user.activeCommunity == '' || req.user.user.activeCommunity == null) {
                res.render('dispatch-dashboard', {
                  user: req.user,
                  vehicles: dbVehicles,
                  civilians: null,
                  tickets: null,
                  arrestReports: null,
                  warrants: null,
                  communities: dbCommunities,
                  commUsers: null,
                  bolos: dbBolos,
                  context: null
                });
              } else {
                User.find({
                  'user.activeCommunity': req.user.user.activeCommunity
                }, function (err, dbCommUsers) {
                  res.render('dispatch-dashboard', {
                    user: req.user,
                    vehicles: dbVehicles,
                    civilians: null,
                    tickets: null,
                    arrestReports: null,
                    warrants: null,
                    communities: dbCommunities,
                    commUsers: dbCommUsers,
                    bolos: dbBolos,
                    context: null
                  });
                });
              }
            });
          });
        })
      }
    } else {
      if (req.query.activeCommunityID == '' || req.query.activeCommunityID == null) {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              res.render('police-dashboard', {
                user: req.user,
                civilians: null,
                vehicles: dbVehicles,
                tickets: null,
                arrestReports: null,
                warrants: null,
                communities: dbCommunities,
                bolos: dbBolos,
                context: null
              });
            });
          });
        })
      } else {
        Vehicle.find({
          'vehicle.plate': req.query.plateNumber.trim().toUpperCase(),
          'vehicle.activeCommunityID': req.query.activeCommunityID
        }, function (err, dbVehicles) {
          Community.find({
            '$or': [{
              'community.ownerID': req.user._id
            }, {
              '_id': req.user.user.activeCommunity
            }]
          }, function (err, dbCommunities) {
            Bolo.find({
              'bolo.communityID': req.user.user.activeCommunity
            }, function (err, dbBolos) {
              res.render('police-dashboard', {
                user: req.user,
                civilians: null,
                vehicles: dbVehicles,
                tickets: null,
                arrestReports: null,
                warrants: null,
                communities: dbCommunities,
                bolos: dbBolos,
                context: null
              });
            });
          });
        })
      }
    }
  });

  app.get('/tickets', function (req, res) {
    Ticket.find({
        'ticket.civID': req.query.civID
      },
      function (err, dbTickets) {
        res.send(dbTickets)
      });
  })

  app.get('/arrests', function (req, res) {
    ArrestReport.find({
        'arrestReport.accusedID': req.query.civID
      },
      function (err, dbArrests) {
        res.send(dbArrests)
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
        User.findOne({
          'user.email': req.body.email.toLowerCase()
        }, function (err, users) {
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
          to: users.user.email.toLowerCase(),
          from: process.env.FROM_EMAIL,
          subject: 'Reset your Password',
          text: 'We\'ve received a request to reset your password.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n',
          html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"' +
            '><html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:' +
            'vml"><head><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>' +
            '</xml><![endif]--><meta content="text/html; charset=utf-8" http-equiv="Content-Type"/><meta content="width=device-width" name="viewport"/>' +
            '<!--[if !mso]><!--><meta content="IE=edge" http-equiv="X-UA-Compatible"/><!--<![endif]--><title></title><!--[if !mso]><!-->' +
            '<link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet" type="text/css"/><!--<![endif]--><style type="text/css">' +
            '		body {			margin: 0;			padding: 0;		}		table,		td,		tr {			vertical-align: top;			border-collapse: collapse;		}		* ' +
            '{			line-height: inherit;		}		a[x-apple-data-detectors=true] {			color: inherit !important;			text-decoration: none !important;' +
            '		}	</style><style id="media-query" type="text/css">		@media (max-width: 620px) {			.block-grid,			.col {				min-width: 320px ' +
            '!important;				max-width: 100% !important;				display: block !important;			}			.block-grid {				width: 100% !important;			' +
            '}			.col {				width: 100% !important;			}			.col>div {				margin: 0 auto;			}			img.fullwidth,			img.fullwidthOnMobile' +
            ' {				max-width: 100% !important;			}			.no-stack .col {				min-width: 0 !important;				display: table-cell !important;			' +
            '}			.no-stack.two-up .col {				width: 50% !important;			}			.no-stack .col.num4 {				width: 33% !important;			}		' +
            '	.no-stack .col.num8 {				width: 66% !important;			}			.no-stack .col.num4 {				width: 33% !important;			}			.no-stack' +
            ' .col.num3 {				width: 25% !important;			}			.no-stack .col.num6 {				width: 50% !important;			}			.no-stack .col.num9 {	' +
            '			width: 75% !important;			}			.video-block {				max-width: none !important;			}			.mobile_hide {				min-height: 0px;' +
            '				max-height: 0px;				max-width: 0px;				display: none;				overflow: hidden;				font-size: 0px;			}			.desktop_hide ' +
            '{				display: block !important;				max-height: none !important;			}		}	</style></head><body class="clean-body" style="margin: 0;' +
            ' padding: 0; -webkit-text-size-adjust: 100%; background-color: #f5f5f5;"><!--[if IE]><div class="ie-browser"><![endif]--><table bgcolor="#f5f5f5"' +
            ' cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="table-layout: fixed; vertical-align: top; min-width: 320px; Margin:' +
            ' 0 auto; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f5f5f5; width: 100%;" ' +
            'valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td style="word-break: break-word; vertical-align: top;" valign=' +
            '"top"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color:#f5f5f5">' +
            '<![endif]--><div style="background-color:transparent;"><div class="block-grid" style="Margin: 0 auto; min-width: 320px; max-width: 600px; ' +
            'overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: transparent;"><div style="border-collapse: collapse;' +
            'display: table;width: 100%;background-color:transparent;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" ' +
            'style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px"><tr class="' +
            'layout-full-width" style="background-color:transparent"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="600" style="background-color:' +
            'transparent;width:600px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right:' +
            ' 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; ' +
            'padding-left: 0px; padding-top:5px; padding-bottom:0px;"><![endif]--><div class="col num12" style="min-width: 320px; max-width: 600px; display: ' +
            'table-cell; vertical-align: top; width: 600px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid ' +
            'transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:5px; ' +
            'padding-bottom:0px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->' +
            '</div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div>' +
            '</div></div><div style="background-color:transparent;"><div class="block-grid" style="Margin: 0 auto; min-width: 320px; max-width: 600px;' +
            ' overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: #FFFFFF;"><div style="border-collapse: ' +
            'collapse;display: table;width: 100%;background-color:#FFFFFF;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" ' +
            'border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:' +
            '600px"><tr class="layout-full-width" style="background-color:#FFFFFF"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="600" style' +
            '="background-color:#FFFFFF;width:600px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid ' +
            'transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td ' +
            'style="padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px;"><![endif]--><div class="col num12" style="min-width: ' +
            '320px; max-width: 600px; display: table-cell; vertical-align: top; width: 600px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]>' +
            '<!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px ' +
            'solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%"' +
            ' cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px; ' +
            'font-family: \'Trebuchet MS\', Tahoma, sans-serif"><![endif]--><div style="color:#555555;font-family:\'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\',' +
            ' \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif;line-height:200%;padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px;">' +
            '<div style="font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; ' +
            'font-size: 12px; line-height: 24px; color: #555555;"><p style="font-size: 14px; line-height: 84px; text-align: center; margin: 0;"><span ' +
            'style="font-size: 42px;"><strong>Lines Police Server</strong></span></p></div></div><!--[if mso]></td></tr></table><![endif]--><table ' +
            'border="0" cellpadding="0" cellspacing="0" class="divider" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing:' +
            ' 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust:' +
            ' 100%;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td class="divider_inner" style="word-break: break-word; ' +
            'vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 10px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 1px solid #BBBBBB;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div class="block-grid" style="Margin: 0 auto; min-width: 320px; max-width: 600px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: #FFFFFF;"><div style="border-collapse: collapse;display: table;width: 100%;background-color:#FFFFFF;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px"><tr class="layout-full-width" style="background-color:#FFFFFF"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="600" style="background-color:#FFFFFF;width:600px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px;"><![endif]--><div class="col num12" style="min-width: 320px; max-width: 600px; display: table-cell; vertical-align: top; width: 600px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 20px; padding-bottom: 10px; font-family: \'Trebuchet MS\', Tahoma, sans-serif"><![endif]--><div style="color:#0D0D0D;font-family:\'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif;line-height:150%;padding-top:20px;padding-right:10px;padding-bottom:10px;padding-left:10px;"><div style="font-size: 12px; line-height: 18px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; color: #0D0D0D;"><p style="font-size: 14px; line-height: 21px; text-align: center; margin: 0;">We\'ve received a request to reset your password. If you didn\'t make this request, just ignore this email. Otherwise, you can reset your password using this link:</p></div></div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="button-container" style="padding-top:25px;padding-right:10px;padding-bottom:10px;padding-left:10px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-spacing: 0; border-collapse: collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;"><tr><td style="padding-top: 25px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px" align="center"><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '" style="height:46.5pt; width:178.5pt; v-text-anchor:middle;" arcsize="7%" stroke="false" fillcolor="#00aced"><w:anchorlock/><v:textbox inset="0,0,0,0"><center style="color:#ffffff; font-family:\'Trebuchet MS\', Tahoma, sans-serif; font-size:16px"><![endif]--><a href="' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '" style="-webkit-text-size-adjust: none; text-decoration: none; display: inline-block; color: #ffffff; background-color: #00aced; border-radius: 4px; -webkit-border-radius: 4px; -moz-border-radius: 4px; width: auto; width: auto; border-top: 1px solid #00aced; border-right: 1px solid #00aced; border-bottom: 1px solid #00aced; border-left: 1px solid #00aced; padding-top: 15px; padding-bottom: 15px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; text-align: center; mso-border-alt: none; word-break: keep-all;" target="_blank"><span style="padding-left:15px;padding-right:15px;font-size:16px;display:inline-block;"><span style="font-size: 16px; line-height: 32px;">Click to reset your password</span></span></a><!--[if mso]></center></v:textbox></v:roundrect></td></tr></table><![endif]--></div><table border="0" cellpadding="0" cellspacing="0" class="divider" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td class="divider_inner" style="word-break: break-word; vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 30px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 0px solid transparent;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="divider" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td class="divider_inner" style="word-break: break-word; vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 10px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 1px solid #BBBBBB;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px; font-family: \'Trebuchet MS\', Tahoma, sans-serif"><![endif]--><div style="color:#555555;font-family:\'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif;line-height:150%;padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px;"><div style="font-size: 12px; line-height: 18px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; color: #555555;"><p style="font-size: 14px; line-height: 21px; text-align: center; margin: 0;">If you\'re having issues clicking the password reset button, copy and paste the URL below into your web browser:<br><span style="color: #a8bf6f; font-size: 14px; line-height: 21px;"><strong><br/></strong></span></p><p style="font-size: 14px; line-height: 21px; text-align: center; margin: 0;"><a href="' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '" rel="noopener" style="text-decoration: underline; color: #0068A5;" target="_blank">' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '</a></p></div></div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div class="block-grid three-up" style="Margin: 0 auto; min-width: 320px; max-width: 600px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: #525252;"><div style="border-collapse: collapse;display: table;width: 100%;background-color:#525252;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px"><tr class="layout-full-width" style="background-color:#525252"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="200" style="background-color:#525252;width:200px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:0px;"><![endif]--><div class="col num4" style="max-width: 320px; min-width: 200px; display: table-cell; vertical-align: top; width: 200px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:0px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td><td align="center" width="200" style="background-color:#525252;width:200px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px;"><![endif]--><div class="col num4" style="max-width: 320px; min-width: 200px; display: table-cell; vertical-align: top; width: 200px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top: 20px; padding-bottom: 0px; font-family: \'Trebuchet MS\', Tahoma, sans-serif"><![endif]--><div style="color:#00aced;font-family:\'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif;line-height:120%;padding-top:20px;padding-right:0px;padding-bottom:0px;padding-left:0px;"><div style="font-size: 12px; line-height: 14px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; color: #00aced;"><p style="font-size: 12px; line-height: 14px; text-align: center; margin: 0;">Email <span style="color: #ffffff; font-size: 12px; line-height: 14px;">support@linespolice-cad.com</span></p></div></div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td><td align="center" width="200" style="background-color:#525252;width:200px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px;"><![endif]--><div class="col num4" style="max-width: 320px; min-width: 200px; display: table-cell; vertical-align: top; width: 200px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div class="block-grid" style="Margin: 0 auto; min-width: 320px; max-width: 600px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: transparent;"><div style="border-collapse: collapse;display: table;width: 100%;background-color:transparent;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px"><tr class="layout-full-width" style="background-color:transparent"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="600" style="background-color:transparent;width:600px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px;"><![endif]--><div class="col num12" style="min-width: 320px; max-width: 600px; display: table-cell; vertical-align: top; width: 600px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><table border="0" cellpadding="0" cellspacing="0" class="divider" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td class="divider_inner" style="word-break: break-word; vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 30px; padding-right: 30px; padding-bottom: 30px; padding-left: 30px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" height="0" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 0px solid transparent; height: 0px;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td height="0" style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--></td></tr></tbody></table><!--[if (IE)]></div><![endif]--></body></html>',
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('emailSend', 'An e-mail has been sent to ' + users.user.email.toLowerCase() + ' with a link to change the password.');
          done(err, 'done');
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
    //this is a super gross way to grab the token.. :yolo:
    var token = req.headers.referer.split("/")[req.headers.referer.split("/").length - 1]
    async.waterfall([
      function (done) {
        User.findOne({
          'user.resetPasswordToken': token,
          'user.resetPasswordExpires': {
            $gt: Date.now()
          }
        }, function (err, users) {
          if (!users) {
            req.flash('resetSend', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          var user = users;
          user.user.password = user.generateHash(req.body.password);
          user.user.resetPasswordToken = undefined;
          user.user.resetPasswordExpires = undefined;

          user.save(function (err) {
            // req.logIn(user, function(err) {
            done(err, user);
            // });
          });
        });
      },
      function (users, done) {
        var smtpTransport = nodemailer.createTransport({
          service: process.env.MAIL_SERVICE_NAME,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          }
        });
        var mailOptions = {
          to: users.user.email.toLowerCase(),
          from: process.env.FROM_EMAIL,
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + users.user.email.toLowerCase() + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('info', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function (err) {
      res.redirect('/');
    });
  });

  app.post('/create-civ', function (req, res) {
    User.findOne({
      'user.email': req.body.submitNewCiv.toLowerCase()
    }, function (err, user) {

      var myCiv = new Civilian()
      myCiv.updateCiv(req, res)
      myCiv.save(function (err) {
        if (err) return console.error(err);
      });

    })
  });

  app.post('/create-ems', function (req, res) {
    var myEms = new Ems()
    myEms.create(req, res)
    myEms.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-vehicle', function (req, res) {
    var myVeh = new Vehicle()
    myVeh.createVeh(req, res)
    myVeh.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-ems-vehicle', function (req, res) {
    var myVeh = new EmsVehicle()
    myVeh.createVeh(req, res)
    myVeh.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-ticket', function (req, res) {
    var myTicket = new Ticket()
    myTicket.updateTicket(req, res)
    myTicket.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-arrest-report', function (req, res) {
    var myArrestReport = new ArrestReport()
    myArrestReport.updateArrestReport(req, res)
    myArrestReport.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/create-warrant', function (req, res) {
    var myWarrant = new Warrant()
    myWarrant.createWarrant(req, res)
    myWarrant.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/clear-warrant', function (req, res) {
    Warrant.findByIdAndUpdate({
      '_id': ObjectId(req.body.warrantID)
    }, {
      $set: {
        'warrant.updatedDate': req.body.updatedDate,
        'warrant.updatedTime': req.body.updatedTime,
        'warrant.clearingOfficer': req.body.clearingOfficer,
        'warrant.clearingOfficerEmail': req.body.clearingOfficerEmail,
        'warrant.status': false
      }
    }, function (err) {
      if (err) return console.error(err);
      res.redirect('/' + req.body.route);
    })
  });

  app.post('/create-bolo', function (req, res) {
    var myBolo = new Bolo()
    myBolo.createBolo(req, res)
    myBolo.save(function (err) {
      if (err) return console.error(err);
    });
  });

  app.post('/clear-bolo', function (req, res) {
    Bolo.findByIdAndDelete({
      '_id': ObjectId(req.body.boloID)
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "clearBoloSuccess"
      res.redirect('/' + req.body.route);
    })
  });

  app.post('/joinCommunity', function (req, res) {
    var communityCode = req.body.communityCode.trim()
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      res.redirect('/civ-dashboard');
      return
    }
    Community.findOne({
      'community.code': req.body.communityCode.toUpperCase()
    }, function (err, community) {
      if (community == null) {
        req.app.locals.specialContext = "noCommunityFound";
        res.redirect('/civ-dashboard');
        return
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
        res.redirect('/civ-dashboard');
      })
    })
  })

  app.post('/leaveActiveCommunity', function (req, res) {
    User.findOneAndUpdate({
      '_id': ObjectId(req.body.userID),
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "leaveCommunitySuccess";
      res.redirect('/civ-dashboard');
    })
  })

  app.post('/joinPoliceCommunity', function (req, res) {
    var communityCode = req.body.communityCode.trim()
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      res.redirect('/' + req.body.route)
      return
    }
    Community.findOne({
      'community.code': req.body.communityCode.toUpperCase()
    }, function (err, community) {
      if (community == null) {
        req.app.locals.specialContext = "noCommunityFound";
        res.redirect('/' + req.body.route);
        return
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
        res.redirect('/' + req.body.route);
      })
    })
  })

  app.post('/leavePoliceActiveCommunity', function (req, res) {
    User.findOneAndUpdate({
      '_id': ObjectId(req.body.userID),
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "leaveCommunitySuccess";
      res.redirect('/' + req.body.route);
    })
  })

  app.post('/joinEmsCommunity', function (req, res) {
    var communityCode = req.body.communityCode.trim()
    if (communityCode.length != 7) {
      req.app.locals.specialContext = "improperCommunityCodeLength";
      res.redirect('/ems-dashboard');
      return
    }
    Community.findOne({
      'community.code': req.body.communityCode.toUpperCase()
    }, function (err, community) {
      if (community == null) {
        req.app.locals.specialContext = "noCommunityFound";
        res.redirect('/ems-dashboard');
        return
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
        res.redirect('/ems-dashboard');
      })
    })
  })

  app.post('/leaveEmsActiveCommunity', function (req, res) {
    User.findOneAndUpdate({
      '_id': ObjectId(req.body.userID),
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      req.app.locals.specialContext = "leaveCommunitySuccess";
      res.redirect('/ems-dashboard');
    })
  })

  app.post('/createCommunity', function (req, res) {
    var myCommunity = new Community()
    myCommunity.createCommunity(req, res)
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': result._id
        }
      }, function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "createCommunitySuccess"
      })
    });
  })

  app.post('/createPoliceCommunity', function (req, res) {
    var myCommunity = new Community()
    myCommunity.createPoliceCommunity(req, res)
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': result._id
        }
      }, function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "createCommunitySuccess";
      })
    });
  })

  app.post('/createEmsCommunity', function (req, res) {
    var myCommunity = new Community()
    myCommunity.createEmsCommunity(req, res)
    myCommunity.save(function (err, result) {
      if (err) return console.error(err);
      User.findOneAndUpdate({
        '_id': ObjectId(req.body.userID),
      }, {
        $set: {
          'user.activeCommunity': result._id
        }
      }, function (err) {
        if (err) return console.error(err);
        req.app.locals.specialContext = "createCommunitySuccess";
      })
    });
  })

  app.post('/manageAccount', function (req, res) {
    var page = req.body.page;
    if (req.body.action === 'updateUsername') {
      var username
      if (exists(req.body.accountUsername)) {
        username = req.body.accountUsername.trim()
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
        res.redirect(page);
      })
    } else {
      res.redirect(page);
    }
  })

  app.post('/deleteAccount', function (req, res) {
    var page = req.body.page;
    // grab all civilians and delete arrest, tickets and warrants for each
    Civilian.find({
      'civilian.userID': req.body.userID
    }, function (err, cursor) {
      cursor.forEach(element => {
        ArrestReport.deleteMany({
          'arrestReport.accusedID': element._id
        }, function (err) {
          Ticket.deleteMany({
            'ticket.civID': element._id
          }, function (err) {
            Warrant.deleteMany({
              'warrant.accusedID': element._id
            }, function (err) {
              if (err) {
                console.error(err);
                res.redirect(page);
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
                User.findByIdAndDelete({
                  '_id': ObjectId(req.body.userID),
                }, function (err) {
                  if (err) {
                    console.error(err);
                    res.redirect(page);
                  }
                  res.redirect('/');
                })
              })
            })
          })
        })
      })
    })
  })

  app.post('/updateOrDeleteBolo', function (req, res) {
    if (req.body.action === "delete") {
      var boloID
      if (exists(req.body.boloID)) {
        boloID = req.body.boloID
      }
      Bolo.findByIdAndDelete({
        '_id': ObjectId(boloID)
      }, function (err) {
        if (err) return console.error(err);
        res.redirect('/' + req.body.route);
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
        res.redirect('/' + req.body.route);
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
        res.redirect('/' + req.body.route);
      })
    }
  })

  app.post('/updateOrDeleteCiv', function (req, res) {
    if (req.body.action === "update") {
      var address
      var occupation
      var firearmLicense
      if (exists(req.body.address)) {
        address = req.body.address.trim()
      }
      if (exists(req.body.occupation)) {
        occupation = req.body.occupation.trim()
      }
      if (exists(req.body.firearmLicense)) {
        firearmLicense = req.body.firearmLicense
      }
      Civilian.findOneAndUpdate({
        '_id': ObjectId(req.body.civilianID),
        'civilian.email': req.body.email.toLowerCase()
      }, {
        $set: {
          "civilian.firstName": req.body.firstName.trim().charAt(0).toUpperCase() + req.body.firstName.trim().slice(1),
          "civilian.lastName": req.body.lastName.trim().charAt(0).toUpperCase() + req.body.lastName.trim().slice(1),
          'civilian.birthday': req.body.birthday,
          'civilian.warrants': req.body.warrants,
          'civilian.licenseStatus': req.body.licenseStatus,
          'civilian.address': address,
          'civilian.occupation': occupation,
          'civilian.firearmLicense': firearmLicense,
          'civilian.updatedAt': new Date()
        }
      }, function (err) {
        if (err) return console.error(err);
        res.redirect('/civ-dashboard');
      })
    } else {
      Civilian.deleteOne({
        '_id': ObjectId(req.body.civilianID),
        'civilian.email': req.body.email.toLowerCase(),
      }, function (err) {
        Ticket.deleteMany({ // used to delete all the legacy tickets that don't have separate first/last names
          'ticket.civName': req.body.firstName + " " + req.body.lastName,
        }, function (err) {
          // the new future way to delete tickets, eventually we will have civEmail and
          // civID to only delete the specific tickets for that civ
          Ticket.deleteMany({
            'ticket.civFirstName': req.body.firstName,
            'ticket.civLastName': req.body.lastName
          }, function (err) {
            if (err) return console.error(err);
            res.redirect('/civ-dashboard');
          })
        })
      })
    }
  })

  app.post('/deleteEms', function (req, res) {
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

  app.post('/updateOrDeleteVeh', function (req, res) {
    if (req.body.action === "update") {
      if (!exists(req.body.vehicleID) || !exists(req.body.emailVeh)) {
        console.warn("cannot update vehicle with empty vehicleID or emailVeh, route: /updateOrDeleteVeh")
        res.redirect('/civ-dashboard');
        return
      }
      if (!exists(req.body.roVeh)) {
        req.body.roVeh = 'N/A'
      }
      Vehicle.findOneAndUpdate({
        '_id': ObjectId(req.body.vehicleID),
        'vehicle.email': req.body.emailVeh.toLowerCase()
      }, {
        $set: {
          "vehicle.plate": req.body.plateVeh.trim().toUpperCase(),
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
        res.redirect('/civ-dashboard');
      })
    } else {
      if (!exists(req.body.vehicleID)) {
        console.warn("cannot delete vehicle with empty vehicleID, route: /updateOrDeleteVeh")
        res.redirect('/civ-dashboard');
      }
      Vehicle.deleteOne({
        '_id': ObjectId(req.body.vehicleID),
        'vehicle.email': req.body.emailVeh.toLowerCase()
      }, function (err) {
        if (err) return console.error(err);
        res.redirect('/civ-dashboard');
      })
    }
  })

  app.post('/updateUserDispatchStatus', function (req, res) {
    // console.debug(req.body)
    if (!exists(req.body.userID) || req.body.userID == '') {
      console.error('cannot update an empty userID')
      return res.redirect('back');
    } else if (!exists(req.body.status) || req.body.status == '') {
      console.error('cannot update an empty status')
      return res.redirect('back');
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
      res.redirect('back')
    })
  })

  app.post('/deleteEmsVeh', function (req, res) {
    var roName = req.body.roVeh
    var modelName = req.body.modelVeh
    var emailName = req.body.emailVeh.toLowerCase()
    var plateName = req.body.plateVeh
    EmsVehicle.deleteOne({
      'emsVehicle.email': emailName.toLowerCase(),
      'emsVehicle.model': modelName,
      'emsVehicle.registeredOwner': roName,
      'emsVehicle.plate': plateName
    }, function (err) {
      if (err) return console.error(err);
      res.redirect('/ems-dashboard');
    })
  })

  app.post('/community', function (req, res) {
    User.findByIdAndUpdate({
      '_id': ObjectId(req.body.memberID)
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      if (err) return console.error(err);
      res.redirect('back')
    })
  })

  app.post('/delete-community', function (req, res) {
    User.updateMany({
      'user.activeCommunity': req.body.communityID
    }, {
      $set: {
        'user.activeCommunity': null
      }
    }, function (err) {
      Community.findByIdAndDelete({
        '_id': ObjectId(req.body.communityID)
      }, function (err) {
        if (err) return console.error(err);
        res.redirect('back')
      })
    })
  })

  app.post('/updateCommunityName', function (req, res) {
    Community.findByIdAndUpdate({
      '_id': ObjectId(req.body.communityID)
    }, {
      $set: {
        'community.name': req.body.updatedName
      }
    }, function (err) {
      if (err) return console.error(err);
      res.redirect('back')
    })
  })

  app.post('/communities', function (req, res) {
    req.session.communityID = req.body.communityID
    res.redirect('communities')
  })

  var io = require('socket.io').listen(server);

  io.sockets.on('connection', (socket) => {

    socket.on("disconnect", function () {});

    socket.on('load_statuses', (user) => {
      if (user.user.activeCommunity != null && user.user.activeCommunity != undefined) {
        User.find({
          'user.activeCommunity': user.user.activeCommunity
        }, function (err, dbCommUsers) {
          socket.emit('load_status_result', dbCommUsers)
        });
      }
    })

    socket.on('load_dispatch_bolos', (user) => {
      if (user.user.activeCommunity != null && user.user.activeCommunity != undefined) {
        Bolo.find({
          'bolo.communityID': user.user.activeCommunity
        }, function (err, dbBolos) {
          socket.emit('load_dispatch_bolos_result', dbBolos)
        });
      }
    });

    socket.on('load_police_bolos', (user) => {
      if (user.user.activeCommunity != null && user.user.activeCommunity != undefined) {
        Bolo.find({
          'bolo.communityID': user.user.activeCommunity
        }, function (err, dbBolos) {
          socket.emit('load_police_bolos_result', dbBolos)
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
        console.warn("cannot update or delete non-existent boloID: ", req.boloID);
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
        socket.broadcast.emit('updated_bolo', req)
        return
      })

    })

    socket.on('delete_bolo_info', (req) => {
      // console.debug('delete req backend: ', req)
      var boloID
      if (exists(req.boloID)) {
        boloID = req.boloID
      }
      Bolo.findByIdAndDelete({
        '_id': ObjectId(boloID)
      }, function (err) {
        if (err) return console.error(err);
        socket.broadcast.emit('deleted_bolo', req)
        return
      })
    })

    socket.on('update_status', (req) => {
      // console.debug('update req: ', req)
      if (!exists(req.userID) || req.userID == '') {
        console.error('cannot update an empty userID')
        return
      } else if (!exists(req.status) || req.status == '') {
        console.error('cannot update an empty status')
        return
      }
      if (req.updateDuty) {
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
          socket.broadcast.emit('updated_status', req)
        })
      } else {
        User.findByIdAndUpdate({
          '_id': ObjectId(req.userID)
        }, {
          $set: {
            'user.dispatchStatus': req.status,
            'user.dispatchStatusSetBy': req.setBy,
          }
        }, function (err) {
          if (err) return console.error(err)
          socket.broadcast.emit('updated_status', req)
        })
      }

    })

    socket.on('load_panic_statuses', (req) => {
      // console.debug('load panic status req: ', req)
      if (req.activeCommunity != null && req.activeCommunity != undefined) {
        Community.findById({
          '_id': ObjectId(req.activeCommunity)
        }, function (err, resp) {
          if (err) return console.error(err)
          socket.broadcast.emit('load_panic_status_update', resp.community.activePanics, req)
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


        Community.findById({
          '_id': ObjectId(req.activeCommunity)
        }, function (err, resp) {
          if (err) return console.error(err)
          if (resp.community.activePanics == undefined || resp.community.activePanics == null) {
            var mapInsert = new Map();
            mapInsert.set(req.userID, values)
            Community.findByIdAndUpdate({
              '_id': ObjectId(req.activeCommunity)
            }, {
              $set: {
                'community.activePanics': mapInsert
              }
            }, function (err) {
              if (err) return console.error(err)
              socket.broadcast.emit('panic_button_updated', mapInsert, req)
              return
            })
          } else {

            if (resp.community.activePanics.get(req.userID) == undefined) {
              resp.community.activePanics.set(req.userID, values)

              Community.findByIdAndUpdate({
                '_id': ObjectId(req.activeCommunity)
              }, {
                $set: {
                  'community.activePanics': resp.community.activePanics
                }
              }, function (err) {
                if (err) return console.error(err)
                socket.broadcast.emit('panic_button_updated', resp.community.activePanics, req)
                return
              })
            } else {
              socket.broadcast.emit('panic_button_updated', resp.community.activePanics, req)
              return
            }

          }
        })
      }
    })

    socket.on('clear_panic', (req) => {
      // console.debug("clear req", req)
      if (req.communityID != null && req.communityID != undefined) {
        Community.findById({
          '_id': ObjectId(req.communityID)
        }, function (err, resp) {
          if (err) return console.error(err);
          resp.community.activePanics.delete(req.userID)
          Community.findByIdAndUpdate({
            '_id': ObjectId(req.communityID)
          }, {
            $set: {
              'community.activePanics': resp.community.activePanics
            }
          }, function (err) {
            if (err) return console.error(err);
            socket.broadcast.emit('cleared_panic', req)
          })

        })
      }
    })

    socket.on('create_bolo', (req) => {
      // console.debug('create bolo server: ', req)
      var myBolo = new Bolo()
      myBolo.socketCreateBolo(req)
      myBolo.save(function (err, dbBolos) {
        if (err) return console.error(err);
        socket.broadcast.emit('created_bolo', dbBolos)
      });
    })

  });

}; //end of routes

function auth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login')
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