var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var civilianSchema = mongoose.Schema({
  civilian: {
    email: String, //deprecated 6/27/2020
    firstName: String,
    lastName: String,
    licenseStatus: String,
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

civilianSchema.methods.updateCiv = function (request, response) {

  this.civilian.firstName = request.body.civFirstName.trim().charAt(0).toUpperCase() + request.body.civFirstName.trim().slice(1);
  this.civilian.lastName = request.body.civLastName.trim().charAt(0).toUpperCase() + request.body.civLastName.trim().slice(1);
  this.civilian.licenseStatus = request.body.licenseStatus;
  this.civilian.ticketCount = request.body.ticketCount;
  this.civilian.birthday = request.body.birthday;
  this.civilian.warrants = request.body.warrants;
  if (exists(request.body.address)) {
    this.civilian.address = request.body.address.trim();
  }
  if (exists(request.body.occupation)) {
    this.civilian.occupation = request.body.occupation.trim();
  }
  if (exists(request.body.firearmLicense)) {
    this.civilian.firearmLicense = request.body.firearmLicense;
  }
  if (exists(request.body.activeCommunityID)) {
    this.civilian.activeCommunityID = request.body.activeCommunityID;
  }
  this.civilian.userID = request.body.userID; // we set this when submitting the from so it should not be null
  this.civilian.createdAt = new Date();
  response.redirect('/civ-dashboard');
};

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}

module.exports = mongoose.model('Civilian', civilianSchema);