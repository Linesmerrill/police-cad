var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
const {
  registerDecorator
} = require('handlebars');

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
    activeCommunityID: String,
    userID: String,
    createdAt: Date,
    updatedAt: Date
  }
});

civilianSchema.methods.socketCreateUpdateCiv = function (req) {
  // console.debug('req in db method: ', req.body)

  // we use this for updates, so if the civID is provided then we will treat this
  // as an upsert
  if (req.body.civID) {
    this._id = req.body.civID
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
  if (exists(req.body.deceased)) {
    this.civilian.deceased = req.body.deceased;
  } else if (!exists(this.civilian.deceased)) {
    this.civilian.deceased = false
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
  if (exists(req.body.imperial) && exists(req.body.metric)) {
    // we have redundant boolean values for imperial and metric,
    //these will always be inverse values of one another.
    //
    // if user has selected 'imperial', then we should calculate USA maths for height
    // else just grab whatever value was passed in for height
    if (req.body.imperial) {
      this.civilian.heightClassification = 'imperial'
      // height classification: imperial or metric, imperial will have 2 inputs and metric will have one
      if (exists(req.body.heightFoot) || exists(req.body.heightInches)) {
        // because the USA is dumb, we gotta do some quick-maths to convert ft and inches to a single number :fml:
        this.civilian.height = generateHeight(req.body.heightFoot, req.body.heightInches)
      }
    } else {
      this.civilian.heightClassification = 'metric'
      if (exists(req.body.heightCentimeters)) {
        this.civilian.height = req.body.heightCentimeters;
      }
    }
  }
  if (exists(req.body.weightImperial) && exists(req.body.weightMetric)) {
    // we have redundant boolean values for imperial and metric,
    //these will always be inverse values of one another.
    if (req.body.weightImperial && exists(req.body.pounds)) {
      this.civilian.weight = req.body.pounds;
      this.civilian.weightClassification = 'imperial'
    } else if (req.body.weightMetric && exists(req.body.kilos)) {
      this.civilian.weight = req.body.kilos;
      this.civilian.weightClassification = 'metric'
    }
  }
  if (exists(req.body.eyeColor)) {
    this.civilian.eyeColor = req.body.eyeColor;
  }
  if (exists(req.body.hairColor)) {
    this.civilian.hairColor = req.body.hairColor;
  }
  if (exists(req.body.organDonor)) {
    this.civilian.organDonor = req.body.organDonor;
  }
  if (exists(req.body.veteran)) {
    this.civilian.veteran = req.body.veteran;
  }
  this.civilian.userID = req.body.userID; // we set this when submitting the form so it should not be null
  this.civilian.createdAt = new Date();
}

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
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

module.exports = mongoose.model('Civilian', civilianSchema);
