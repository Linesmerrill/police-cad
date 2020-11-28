var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var civilianSchema = mongoose.Schema({
  civilian: {
    email: String, //deprecated 6/27/2020
    firstName: String,
    lastName: String,
    licenseStatus: String, //1: valid, 2: revoked, 3: none
    ticketCount: String,
    birthday: String,
    warrants: [{
      type: String
    }],
    gender: String,
    address: String,
    race: String,
    hairColor: String,
    weight: String,
    height: String,
    image: String,
    occupation: String,
    firearmLicense: String,
    activeCommunityID: String,
    userID: String,
    createdAt: Date,
    updatedAt: Date
  }
});

civilianSchema.methods.updateCiv = function (req, res) {
  // console.debug('req: ', req.body)
  this.civilian.firstName = req.body.civFirstName.trim().charAt(0).toUpperCase() + req.body.civFirstName.trim().slice(1);
  this.civilian.lastName = req.body.civLastName.trim().charAt(0).toUpperCase() + req.body.civLastName.trim().slice(1);
  this.civilian.licenseStatus = (req.body.licenseStatus ? '1' : '3');
  this.civilian.ticketCount = req.body.ticketCount;
  this.civilian.birthday = req.body.birthday;
  this.civilian.warrants = req.body.warrants;
  if (exists(req.body.address)) {
    this.civilian.address = req.body.address.trim();
  }
  if (exists(req.body.occupation)) {
    this.civilian.occupation = req.body.occupation.trim();
  }
  if (exists(req.body.firearmLicense)) {
    this.civilian.firearmLicense = req.body.firearmLicense;
  }
  if (exists(req.body.activeCommunityID)) {
    this.civilian.activeCommunityID = req.body.activeCommunityID;
  }
  this.civilian.userID = req.body.userID; // we set this when submitting the from so it should not be null
  this.civilian.createdAt = new Date();
  res.redirect('/civ-dashboard');
};

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}

module.exports = mongoose.model('Civilian', civilianSchema);