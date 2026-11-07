var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var userSchema = mongoose.Schema({
  user: {
    username: String,
    callSign: String,
    email: String,
    password: String,
    name: String,
    firstName: String,
    lastName: String,
    address: String,
    // Deprecated 2021/12/24 migrate to Discord Oauth2
    // discordLoginToken: String,
    discordConnected: Boolean,
    discord: {
      id: String,
      username: String,
      discriminator: String,
    },
    // sha256 of the token that goes in the reset link, never the token
    // itself. See app/reset-token.js.
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // What the admin console shows staff when a member says they cannot get
    // in. passwordChangedAt is stamped by every path that writes a password;
    // absent on accounts that have not changed one since the field existed,
    // which the console shows as not recorded rather than guessing from
    // updatedAt (any profile edit moves that). lastResetEmailAt is written
    // only after the send succeeds, and lastResetEmailBy is "Member" for a
    // self-service reset or the staff member's name for a console send.
    passwordChangedAt: Date,
    lastResetEmailAt: Date,
    lastResetEmailBy: String,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    emailVerified: Boolean,
    isDeactivated: Boolean,
    deactivatedAt: Date,
    restoreUntil: Date,
    activeCommunity: String,
    lastAccessedCommunity: {
      communityID: String,
      createdAt: Date,
    },
    dispatchStatus: String,
    dispatchStatusSetBy: String,
    dispatchOnDuty: Boolean,
    profilePicture: String,
    panicButtonSound: { type: Boolean, default: true },
    alertVolumeLevel: String,
    // Master switch for the CAD alert sounds (new-call / warrant / attach
    // tones). Separate from panicButtonSound and defaults OFF — users opt in.
    alertSoundsEnabled: { type: Boolean, default: false },
    // IDs of platform "What's New" changelog posts the user has dismissed, so
    // each post surfaces at most once. Persisted here (not on-device) so it
    // survives an app reinstall.
    seenAnnouncements: [String],
    subscription: {
      plan: String,
      active: Boolean,
    },
    createdAt: Date,
    updatedAt: Date,
  },
});

userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compareSync(password, this.user.password);
};

userSchema.methods.updateUser = function (request, response) {
  this.user.name = request.body.name;
  this.user.address = request.body.address;
  this.user.createdAt = new Date();
  response.redirect("/user");
};

module.exports = mongoose.model("User", userSchema);
