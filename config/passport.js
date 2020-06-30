// local authentication
// For more details go to https://github.com/jaredhanson/passport-local
var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user');
var Token = require('../app/models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');

module.exports = function (passport) {

	// Maintaining persistent login sessions
	// serialized  authenticated user to the session
	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	// deserialized when subsequent requests are made
	passport.deserializeUser(function (id, done) {
		User.findById(id, function (err, user) {
			done(err, user);
		});
	});

	passport.use('login', new LocalStrategy({
			usernameField: 'email',
			passReqToCallback: true
		},
		function (req, email, password, done) {
			process.nextTick(function () {
				User.findOne({
					'user.email': email.toLowerCase()
				}, function (err, user) {
					if (err) {
						return done(err);
					}
					if (!user)
						return done(null, false, req.flash('error', 'email address or password'));

					if (!user.verifyPassword(password))
						return done(null, false, req.flash('error', 'email address or password'));
					if (!user.isVerified) {
						return done(null, false, req.flash('error', 'account not verified'));
					}
					else
						return done(null, user);
				});
			});
		}));

	passport.use('signup', new LocalStrategy({
			usernameField: 'email',
			passReqToCallback: true
		},
		function (req, email, password, done) {
			process.nextTick(function () {
				if (!req.user) {
					User.findOne({
						'user.email': email.toLowerCase()
					}, function (err, user) {
						if (err) {
							return done(err);
						}
						if (user) {
							return done(null, false, req.flash('signuperror', 'that email address already exists'));
						} else {
							var newUser = new User();
							newUser.user.username = req.body.username;
							newUser.user.email = email.toLowerCase();
							newUser.user.password = newUser.generateHash(password);
							newUser.user.name = '';
							newUser.user.address = '';
							newUser.user.resetPasswordToken = '';
							newUser.user.resetPasswordExpires = '';
							newUser.user.createdAt = new Date();
							newUser.save(function (err) {
								if (err) throw err;

								// Create a verification token for this user
								var token = new Token({_userId: user._id, token: crypto.randomBytes(16).toString('hex')})

								token.save(function (err) {
									if (err) return done(null, false, req.flash('signuperror', 'error generating validation email, please try again.'));

									// send the email
									var transporter = nodemailer.createTransport({service: process.env.MAIL_SERVICE_NAME,
										auth: {
										  user: process.env.MAIL_USER,
										  pass: process.env.MAIL_PASS,
										}})
									var mailOptions = {from: process.env.FROM_EMAIL, to: user.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + token.token + '.\n' };
									transporter.sendMail(mailOptions, function (err) {
										if (err) { return res.status(500).send({ msg: err.message }); }
										// res.status(200).send('A verification email has been sent to ' + user.email + '.');
										console.debug('A verification email has been sent to ' + user.email + '.')
										return done(null, newUser);
									});
								})
							});
						}
					});
				} else {
					var user = req.user;
					user.user.username = req.body.username;
					user.user.email = email.toLowerCase();
					user.user.password = user.generateHash(password);
					user.user.name = ''
					user.user.address = ''
					user.resetPasswordToken = ''
					user.resetPasswordExpires = ''
					user.save(function (err) {
						if (err)
							throw err;
						return done(null, user);
					});
				}
			});
		}));
};