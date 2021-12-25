// local authentication
// For more details go to https://github.com/jaredhanson/passport-local
const DiscordStrategy = require('passport-discord').Strategy;
const LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user');

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
							newUser.user.callSign = req.body.callSign;
							newUser.user.email = email.toLowerCase();
							newUser.user.password = newUser.generateHash(password);
							newUser.user.name = '';
							newUser.user.address = '';
							newUser.user.discordConnected = false;
							newUser.user.resetPasswordToken = '';
							newUser.user.resetPasswordExpires = '';
							newUser.user.createdAt = new Date();
							newUser.save(function (err) {
								if (err)
									throw err;
								return done(null, newUser);
							});
						}
					});
				} else {
					var user = req.user;
					user.user.username = req.body.username;
					user.user.callSign = req.body.callSign;
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

		passport.use(new DiscordStrategy({
			passReqToCallback: true,
			clientID: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: '/auth/discord',
			scope: ['identify'],
		}, (req, accessToken, refreshToken, profile, done) => {
			let user = req.user
			user.user.discordConnected = true
			user.user.discord = {
				id: profile.id,
				username: profile.username,
				discriminator: profile.discriminator
			}
			user.save(function (err) {
				if (err) throw err;
				return done(null, user);
			});
		}));		
};