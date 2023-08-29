var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");
const { registerDecorator } = require("handlebars");

var civilianSchema = mongoose.Schema({
  civilian: {
    email: String, //deprecated 6/27/2020
    firstName: String,
    lastName: String,
    middleInitial: String,
    licenseStatus: String, //1: valid, 2: revoked, 3: none
    ticketCount: String,
    birthday: String,
    warrants: [
      {
        type: String,
      },
    ],
    gender: String,
    address: String,
    addressZip: String,
    deceased: Boolean, // true: yes (deceased), false: no (alive),
    race: String,
    hairColor: String,
    weight: String,
    weightClassification: String,
    height: String,
    heightClassification: String,
    eyeColor: String,
    organDonor: Boolean,
    veteran: Boolean,
    image: String,
    occupation: String,
    firearmLicense: String,
    age: String,
    activeCommunityID: String,
    userID: String,
    createdAt: Date,
    updatedAt: Date,
  },
});

civilianSchema.methods.socketCreateUpdateCiv = function (req) {
  // console.debug('req in db method: ', req.body)

  // we use this for updates, so if the civID is provided then we will treat this
  // as an upsert
  if (req.body.civID) {
    this._id = req.body.civID;
  }
  this.civilian.firstName = req.body.civFirstName.trim().toLowerCase();
  this.civilian.lastName = req.body.civLastName.trim().toLowerCase();
  this.civilian.licenseStatus = req.body.licenseStatus; //1: valid, modified 05/24/2021 to be hardcoded to valid on civ creation
  this.civilian.ticketCount = req.body.ticketCount;
  this.civilian.birthday = req.body.birthday;
  this.civilian.warrants = req.body.warrants;
  if (exists(req.body.address)) {
    this.civilian.address = req.body.address.trim();
  }
  if (exists(req.body.addressZip)) {
    this.civilian.addressZip = req.body.addressZip.trim();
  }
  if (exists(req.body.deceased)) {
    this.civilian.deceased = req.body.deceased;
  } else if (!exists(this.civilian.deceased)) {
    this.civilian.deceased = false;
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
  if (exists(req.body.gender)) {
    this.civilian.gender = req.body.gender;
  }
  if (exists(req.body.height)) {
    this.civilian.height = req.body.height.trim();
  }
  if (exists(req.body.weight)) {
    this.civilian.weight = req.body.weight.trim();
  }
  if (exists(req.body.eyeColor)) {
    this.civilian.eyeColor = req.body.eyeColor.trim();
  }
  if (exists(req.body.hairColor)) {
    this.civilian.hairColor = req.body.hairColor.trim();
  }
  if (exists(req.body.organDonor)) {
    this.civilian.organDonor = req.body.organDonor;
  }
  if (exists(req.body.veteran)) {
    this.civilian.veteran = req.body.veteran;
  }
  if (exists(req.body.age)) {
    this.civilian.age = req.body.age;
  }
  if (exists(req.body.civMiddleInitial)) {
    this.civilian.middleInitial = req.body.civMiddleInitial;
  }
  this.civilian.userID = req.body.userID; // we set this when submitting the form so it should not be null
  this.civilian.createdAt = new Date();
};

function exists(v) {
  if (v !== undefined) {
    return true;
  } else {
    return false;
  }
}

module.exports = mongoose.model("Civilian", civilianSchema);
