var User = require('../app/models/user');
var Civilian = require('../app/models/civilian');
var Vehicle = require('../app/models/vehicle');
var EmsVehicle = require('../app/models/emsVehicle');
var Ticket = require('../app/models/ticket');
var Ems = require('../app/models/ems');
var ObjectId = require('mongodb').ObjectID;
var nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

module.exports = function (app, passport, server) {

  app.get('/', function (request, response) {
    response.render('index', {
      message: request.flash('info')
    });
  });

  app.get('/release-log', function (request, response) {
    response.render('release-log');
  });

  app.get('/about', function (request, response) {
    response.render('about');
  });

  app.get('/rules', function (request, response) {
    response.render('rules');
  });

  app.get('/terms-and-conditions', function (request, response) {
    response.render('terms-and-conditions');
  });

  app.get('/privacy-policy', function (request, response) {
    response.render('privacy-policy');
  });

  app.get('/login', function (request, response) {
    response.redirect('/');
  });

  app.get('/login-civ', authCivilian, function (request, response) {
    response.redirect('/civ-dashboard');
  });

  app.get('/login-police', authPolice, function (request, response) {
    response.redirect('/police-dashboard')
  });

  app.get('/login-ems', authEms, function (request, response) {
    response.redirect('/ems-dashboard')
  });

  app.get('/signup-civ', function (request, response) {
    response.render('signup-civ', {
      message: request.flash('signuperror')
    });
  });

  app.get('/signup-police', function (request, response) {
    response.render('signup-police', {
      message: request.flash('signuperror')
    });
  });

  app.get('/signup-ems', function (request, response) {
    response.render('signup-ems', {
      message: request.flash('signuperror')
    });
  });

  app.get('/logout', function (request, response) {
    request.logout();
    response.redirect('/');
  });

  app.get('/forgot-password', function (request, response) {
    response.render('forgot-password', {
      user: request.user,
      message: request.flash('emailSend')
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

  app.get('/civ-dashboard', auth, function (request, response) {
    Civilian.find({
      'civilian.email': request.user.user.email.toLowerCase()
    }, function (err, dbPersonas) {
      Vehicle.find({
        'vehicle.email': request.user.user.email.toLowerCase()
      }, function (err, dbVehicles) {
        response.render('civ-dashboard', {
          user: request.user,
          personas: dbPersonas,
          vehicles: dbVehicles
        });
      });
    })
  });

  app.get('/ems-dashboard', auth, function (request, response) {
    Ems.find({
      'ems.email': request.user.user.email.toLowerCase()
    }, function (err, dbPersonas) {
      EmsVehicle.find({
        'emsVehicle.email': request.user.user.email.toLowerCase()
      }, function (err, dbVehicles) {
        response.render('ems-dashboard', {
          user: request.user,
          personas: dbPersonas,
          vehicles: dbVehicles
        });
      });
    })
  });

  app.get('/police-dashboard', auth, function (request, response) {
    response.render('police-dashboard', {
      user: request.user,
      vehicles: null,
      civilians: null,
      tickets: null
    });
  });

  app.get('/name-search', auth, function (request, response) {
    Civilian.find({
      'civilian.firstName': request.query.firstName.trim().charAt(0).toUpperCase() + request.query.firstName.trim().slice(1),
      'civilian.lastName': request.query.lastName.trim().charAt(0).toUpperCase() + request.query.lastName.trim().slice(1)
    }, function (err, dbCivilians) {
      Ticket.find({
        'ticket.civFirstName': request.query.firstName.trim().charAt(0).toUpperCase() + request.query.firstName.trim().slice(1),
        'ticket.civLastName': request.query.lastName.trim().charAt(0).toUpperCase() + request.query.lastName.trim().slice(1)
      }, function (err, dbTickets) {
        response.render('police-dashboard', {
          user: request.user,
          vehicles: null,
          civilians: dbCivilians,
          tickets: dbTickets
        });
      });
    });
  });

  app.get('/plate-search', auth, function (request, response) {
    Vehicle.find({
      'vehicle.plate': request.query.plateNumber.trim().toUpperCase()
    }, function (err, dbVehicles) {
      response.render('police-dashboard', {
        user: request.user,
        civilians: null,
        vehicles: dbVehicles,
        tickets: null
      });
    })
  });

  // Be sure to place all GET requests above this catchall
  app.get('*', function (request, response) {
    response.render('page-not-found');
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
            'vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 10px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 1px solid #BBBBBB;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div class="block-grid" style="Margin: 0 auto; min-width: 320px; max-width: 600px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: #FFFFFF;"><div style="border-collapse: collapse;display: table;width: 100%;background-color:#FFFFFF;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px"><tr class="layout-full-width" style="background-color:#FFFFFF"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="600" style="background-color:#FFFFFF;width:600px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px;"><![endif]--><div class="col num12" style="min-width: 320px; max-width: 600px; display: table-cell; vertical-align: top; width: 600px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 20px; padding-bottom: 10px; font-family: \'Trebuchet MS\', Tahoma, sans-serif"><![endif]--><div style="color:#0D0D0D;font-family:\'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif;line-height:150%;padding-top:20px;padding-right:10px;padding-bottom:10px;padding-left:10px;"><div style="font-size: 12px; line-height: 18px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; color: #0D0D0D;"><p style="font-size: 14px; line-height: 21px; text-align: center; margin: 0;">We\'ve received a request to reset your password. If you didn\'t make this request, just ignore this email. Otherwise, you can reset your password using this link:</p></div></div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="button-container" style="padding-top:25px;padding-right:10px;padding-bottom:10px;padding-left:10px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-spacing: 0; border-collapse: collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;"><tr><td style="padding-top: 25px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px" align="center"><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '" style="height:46.5pt; width:178.5pt; v-text-anchor:middle;" arcsize="7%" stroke="false" fillcolor="#00aced"><w:anchorlock/><v:textbox inset="0,0,0,0"><center style="color:#ffffff; font-family:\'Trebuchet MS\', Tahoma, sans-serif; font-size:16px"><![endif]--><a href="' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '" style="-webkit-text-size-adjust: none; text-decoration: none; display: inline-block; color: #ffffff; background-color: #00aced; border-radius: 4px; -webkit-border-radius: 4px; -moz-border-radius: 4px; width: auto; width: auto; border-top: 1px solid #00aced; border-right: 1px solid #00aced; border-bottom: 1px solid #00aced; border-left: 1px solid #00aced; padding-top: 15px; padding-bottom: 15px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; text-align: center; mso-border-alt: none; word-break: keep-all;" target="_blank"><span style="padding-left:15px;padding-right:15px;font-size:16px;display:inline-block;"><span style="font-size: 16px; line-height: 32px;">Click to reset your password</span></span></a><!--[if mso]></center></v:textbox></v:roundrect></td></tr></table><![endif]--></div><table border="0" cellpadding="0" cellspacing="0" class="divider" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td class="divider_inner" style="word-break: break-word; vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 30px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 0px solid transparent;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="divider" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td class="divider_inner" style="word-break: break-word; vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 10px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 1px solid #BBBBBB;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px; font-family: \'Trebuchet MS\', Tahoma, sans-serif"><![endif]--><div style="color:#555555;font-family:\'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif;line-height:150%;padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px;"><div style="font-size: 12px; line-height: 18px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; color: #555555;"><p style="font-size: 14px; line-height: 21px; text-align: center; margin: 0;">If you\'re having issues clicking the password reset button, copy and paste the URL below into your web browser:<br><span style="color: #a8bf6f; font-size: 14px; line-height: 21px;"><strong><br/></strong></span></p><p style="font-size: 14px; line-height: 21px; text-align: center; margin: 0;"><a href="' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '" rel="noopener" style="text-decoration: underline; color: #0068A5;" target="_blank">' + process.env.SITE_PROTOCOL + req.headers.host + '/reset/' + token + '</a></p></div></div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div class="block-grid three-up" style="Margin: 0 auto; min-width: 320px; max-width: 600px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: #525252;"><div style="border-collapse: collapse;display: table;width: 100%;background-color:#525252;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px"><tr class="layout-full-width" style="background-color:#525252"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="200" style="background-color:#525252;width:200px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:0px;"><![endif]--><div class="col num4" style="max-width: 320px; min-width: 200px; display: table-cell; vertical-align: top; width: 200px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:0px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td><td align="center" width="200" style="background-color:#525252;width:200px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px;"><![endif]--><div class="col num4" style="max-width: 320px; min-width: 200px; display: table-cell; vertical-align: top; width: 200px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top: 20px; padding-bottom: 0px; font-family: \'Trebuchet MS\', Tahoma, sans-serif"><![endif]--><div style="color:#00aced;font-family:\'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif;line-height:120%;padding-top:20px;padding-right:0px;padding-bottom:0px;padding-left:0px;"><div style="font-size: 12px; line-height: 14px; font-family: \'Montserrat\', \'Trebuchet MS\', \'Lucida Grande\', \'Lucida Sans Unicode\', \'Lucida Sans\', Tahoma, sans-serif; color: #00aced;"><p style="font-size: 12px; line-height: 14px; text-align: center; margin: 0;">Email <span style="color: #ffffff; font-size: 12px; line-height: 14px;">linespoliceserver@gmail.com</span></p></div></div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td><td align="center" width="200" style="background-color:#525252;width:200px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px;"><![endif]--><div class="col num4" style="max-width: 320px; min-width: 200px; display: table-cell; vertical-align: top; width: 200px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div class="block-grid" style="Margin: 0 auto; min-width: 320px; max-width: 600px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; background-color: transparent;"><div style="border-collapse: collapse;display: table;width: 100%;background-color:transparent;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px"><tr class="layout-full-width" style="background-color:transparent"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="600" style="background-color:transparent;width:600px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px;"><![endif]--><div class="col num12" style="min-width: 320px; max-width: 600px; display: table-cell; vertical-align: top; width: 600px;"><div style="width:100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><table border="0" cellpadding="0" cellspacing="0" class="divider" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td class="divider_inner" style="word-break: break-word; vertical-align: top; min-width: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top: 30px; padding-right: 30px; padding-bottom: 30px; padding-left: 30px;" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" class="divider_content" height="0" role="presentation" style="table-layout: fixed; vertical-align: top; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-top: 0px solid transparent; height: 0px;" valign="top" width="100%"><tbody><tr style="vertical-align: top;" valign="top"><td height="0" style="word-break: break-word; vertical-align: top; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;" valign="top"><span></span></td></tr></tbody></table></td></tr></tbody></table><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><!--[if (mso)|(IE)]></td></tr></table><![endif]--></td></tr></tbody></table><!--[if (IE)]></div><![endif]--></body></html>',
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
      myCiv.save(function (err, fluffy) {
        if (err) return console.error(err);
      });

    })
  });

  app.post('/create-ems', function (req, res) {
    User.findOne({
      'user.email': req.body.submitNewEms.toLowerCase()
    }, function (err, user) {

      var myEms = new Ems()
      myEms.updateEms(req, res)
      myEms.save(function (err, fluffy) {
        if (err) return console.error(err);
      });

    })
  });

  app.post('/create-vehicle', function (req, res) {
    User.findOne({
      'user.email': req.body.submitNewVeh.toLowerCase()
    }, function (err, user) {

      var myVeh = new Vehicle()
      myVeh.updateVeh(req, res)
      myVeh.save(function (err, fluffy) {
        if (err) return console.error(err);
      });
    })
  });

  app.post('/create-ems-vehicle', function (req, res) {
    User.findOne({
      'user.email': req.body.submitNewVeh.toLowerCase()
    }, function (err, user) {

      var myVeh = new EmsVehicle()
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
          'civilian.firearmLicense': firearmLicense
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
          'vehicle.isStolen': req.body.stolenView
        }
      }, function (err) {
        if (err) return console.error(err);
        res.redirect('/civ-dashboard');
      })
    } else {
      Vehicle.deleteOne({
        '_id': ObjectId(req.body.vehicleID),
        'vehicle.email': req.body.emailVeh.toLowerCase()
      }, function (err) {
        if (err) return console.error(err);
        res.redirect('/civ-dashboard');
      })
    }
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

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}